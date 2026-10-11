import { pathToFileURL } from 'node:url';
import { read, write, clone } from './core.mjs';
import { openStore } from './state.mjs';
import { modelPreflight, requestBody, requestKey, reserveRequest, settleRequest, providerErrorDetails, Stop } from './provider.mjs';

const caseId = 'provider-diagnostic-v1';
const schema = { type: 'object', properties: { answer: { type: 'string', enum: ['ok'] } }, required: ['answer'] };
export function diagnosticStages(policy) {
  const make = model => {
    const body = requestBody(policy, model, 'Return exactly {"answer":"ok"}.',
      { schema, system: 'This is an API connection test. Return the requested short answer.' });
    body.generationConfig.maxOutputTokens = 1024;
    return body;
  };
  const full = make(policy.models.first_pass), basic = clone(full), structured = clone(full);
  delete basic.generationConfig.responseFormat; delete basic.generationConfig.thinkingConfig;
  delete structured.generationConfig.thinkingConfig;
  return [
    { name: 'lite_basic', model: policy.models.first_pass, body: basic, structured: false },
    { name: 'lite_json', model: policy.models.first_pass, body: structured, structured: true },
    { name: 'lite_thinking', model: policy.models.first_pass, body: full, structured: true },
    { name: 'reviewer_full', model: policy.models.reviewer, body: make(policy.models.reviewer), structured: true },
    { name: 'repair_contract', model: policy.models.first_pass, structured: 'patch',
      body: requestBody(policy, policy.models.first_pass,
        'This is a connection test, not a real case. Return exactly {"case_id":"provider-diagnostic-v1","assessment":"connection test","operations":[]}.') }
  ];
}
export async function diagnosticCall(store, policy, run, stage, transport) {
  const key = requestKey(caseId, stage.model, stage.body, 'player');
  const prior = store.state.requests[key];
  if (prior?.status === 'completed' && prior.plan?.accepted === true) return { ...prior.plan, cached: true };
  if (prior) throw new Stop('REPEATED_OR_UNCERTAIN_REQUEST', prior.provider_error);
  const request = reserveRequest(store, policy, run, caseId, stage.model, stage.body, 'player');
  let http, payload;
  try {
    http = await transport('https://generativelanguage.googleapis.com/v1beta/models/' + stage.model + ':generateContent', {
      method: 'POST', headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(policy.sequential.http_timeout_ms), body: JSON.stringify(stage.body)
    });
    payload = await http.json();
  } catch { throw new Stop('TRANSPORT_UNCERTAIN'); }
  if (!http.ok) {
    const details = providerErrorDetails(payload, http.status);
    settleRequest(store, run, request, [400, 401, 403, 404, 429].includes(http.status) ? 0 : request.projected,
      { status: 'failed', http_status: http.status, provider_error: details });
    throw new Stop('GEMINI_HTTP_' + http.status, details);
  }
  const usage = payload.usageMetadata, rate = policy.models.pricing_usd_per_million_tokens[stage.model];
  const validUsage = [usage?.promptTokenCount, usage?.candidatesTokenCount, usage?.thoughtsTokenCount ?? 0]
    .every(n => Number.isFinite(n) && n >= 0);
  const amount = validUsage ? (usage.promptTokenCount * rate.input +
    (usage.candidatesTokenCount + (usage.thoughtsTokenCount || 0)) * rate.output) / 1e6 : request.projected;
  const candidate = payload.candidates?.[0];
  const text = (candidate?.content?.parts || []).filter(p => p.thought !== true).map(p => p.text || '').join('');
  let accepted = candidate?.finishReason === 'STOP' && !!text.trim();
  if (accepted && stage.structured) {
    try {
      const parsed = JSON.parse(text);
      accepted = stage.structured === 'patch' ? parsed.case_id === caseId &&
        typeof parsed.assessment === 'string' && Array.isArray(parsed.operations) && parsed.operations.length === 0
        : parsed.answer === 'ok';
    } catch { accepted = false; }
  }
  const plan = { stage: stage.name, model: stage.model, accepted, finish_reason: candidate?.finishReason || null };
  settleRequest(store, run, request, amount, { status: accepted ? 'completed' : 'invalid_response', usage,
    ...(accepted ? { plan } : {}) });
  if (amount > request.projected) throw new Stop('COST_ESTIMATE_EXCEEDED');
  if (!accepted) throw new Stop('DIAGNOSTIC_OUTPUT_INVALID:' + (plan.finish_reason || 'NONE'));
  return plan;
}
export async function diagnose(store, policy, { transport = fetch, preflight = modelPreflight } = {}) {
  const bounded = clone(policy);
  bounded.sequential.max_calls_per_execute = Math.min(4, policy.sequential.max_calls_per_execute);
  bounded.sequential.max_requests_per_case = Math.min(6, policy.sequential.max_requests_per_case);
  bounded.sequential.execute_budget_usd = Math.min(0.03, policy.sequential.execute_budget_usd);
  bounded.sequential.case_budget_usd = Math.min(0.03, policy.sequential.case_budget_usd);
  const run = { calls: 0, spent: 0 }, stages = [];
  const report = { schema: 'fm_provider_diagnostic_v1', status: 'running', game_files_changed: false,
    execute_budget_usd: bounded.sequential.execute_budget_usd, stages };
  try {
    report.model_preflight = await preflight(bounded, { transport });
    store.state.cases[caseId] ||= { spent: 0 }; store.save();
    for (const stage of diagnosticStages(bounded)) {
      report.active_stage = stage.name;
      const prior = store.state.requests[requestKey(caseId, stage.model, stage.body, 'player')];
      if (run.calls >= bounded.sequential.max_calls_per_execute && !prior) {
        report.status = 'diagnostic_checkpoint';
        return { ...report, api_calls: run.calls, execute_cost_usd: run.spent, campaign_cost_usd: store.state.campaign_spent };
      }
      stages.push(await diagnosticCall(store, bounded, run, stage, transport));
    }
    report.status = 'provider_verified';
  } catch (error) { report.status = error.message; report.provider_error = error.provider_error || null; }
  return { ...report, api_calls: run.calls, execute_cost_usd: run.spent, campaign_cost_usd: store.state.campaign_spent };
}
async function main() {
  if (process.env.GITHUB_ACTIONS !== 'true') throw new Error('DIAGNOSTIC_REQUIRES_ACTIONS');
  const policy = read('.case-qa/pipeline/policy.json'), store = openStore(process.cwd(), policy);
  const report = await diagnose(store, policy);
  write('.case-qa-output/provider-diagnostic/result.json', report);
  console.log(JSON.stringify(report, null, 2));
  if (!['provider_verified', 'diagnostic_checkpoint'].includes(report.status)) process.exitCode = 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
