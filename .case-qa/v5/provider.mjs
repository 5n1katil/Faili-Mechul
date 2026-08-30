import { PATCH_SCHEMA, SYSTEM_PROMPT, extractOutputText, stableHash } from '../fm_case_qa_runner.mjs';

export class Stop extends Error {}
export function requestBody(policy, model, prompt) {
  return { model, reasoning: { effort: 'medium' }, max_output_tokens: policy.sequential.max_output_tokens,
    input: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: prompt }],
    text: { format: { type: 'json_schema', name: 'fm_case_patch', strict: true, schema: PATCH_SCHEMA } } };
}
export function reserveCost(policy, model, body) {
  const rate = policy.models.pricing_usd_per_million_tokens[model];
  if (!rate || ![rate.input, rate.output].every(n => Number.isFinite(n) && n > 0)) throw new Error('MODEL_RATE_MISSING');
  // UTF-8 bytes upper-bound text tokens; include system/schema and framing.
  return ((Buffer.byteLength(JSON.stringify(body)) + 4096) * rate.input + body.max_output_tokens * rate.output) / 1e6;
}
export function reserveRequest(store, policy, run, caseId, model, body) {
  const key = stableHash({ version: 5, body });
  const previous = store.state.requests[key];
  if (previous?.status === 'completed' && previous.plan) return { key, cached: previous.plan };
  if (previous) throw new Stop('REPEATED_OR_UNCERTAIN_REQUEST: exact request already attempted; no duplicate charge');
  const projected = reserveCost(policy, model, body);
  const config = policy.sequential;
  const record = store.state.cases[caseId];
  if (run.calls >= config.max_calls_per_execute || run.spent + projected > config.execute_budget_usd ||
      record.spent + projected > config.case_budget_usd || store.state.campaign_spent + projected > config.campaign_budget_usd)
    throw new Stop('BUDGET_STOP');
  store.state.requests[key] = { case_id: caseId, model, status: 'reserved', charged: projected };
  record.spent += projected;
  store.state.campaign_spent += projected;
  run.spent += projected;
  run.calls++;
  store.save(); // Must durably succeed BEFORE contacting the paid service.
  return { key, projected };
}
export function settleRequest(store, run, request, amount, extra) {
  const ledger = store.state.requests[request.key];
  const delta = amount - ledger.charged;
  store.state.cases[ledger.case_id].spent += delta;
  store.state.campaign_spent += delta;
  run.spent += delta;
  Object.assign(ledger, extra, { charged: amount });
  store.save();
}
export async function callPaid({ store, policy, run, caseId, model, prompt, transport = fetch }) {
  if (!process.env.OPENAI_API_KEY) throw new Stop('OPENAI_API_KEY_MISSING');
  const body = requestBody(policy, model, prompt);
  const request = reserveRequest(store, policy, run, caseId, model, body);
  if (request.cached) return { plan: request.cached, cached: true };
  let payload, http;
  try {
    http = await transport('https://api.openai.com/v1/responses', { method: 'POST',
      signal: AbortSignal.timeout(policy.sequential.http_timeout_ms),
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': request.key },
      body: JSON.stringify(body) });
    payload = await http.json();
  } catch {
    // Unknown outcome retains the full reservation and is never auto-retried.
    throw new Stop('TRANSPORT_UNCERTAIN: reserved cost retained; no automatic retry');
  }
  if (!http.ok) {
    const definitiveRejection = [400, 401, 403, 404, 429].includes(http.status);
    settleRequest(store, run, request, definitiveRejection ? 0 : request.projected,
      { status: 'failed', http_status: http.status });
    throw new Stop(`OPENAI_HTTP_${http.status}: no automatic retry`);
  }
  const usage = payload.usage;
  const hasUsage = Number.isFinite(usage?.input_tokens) && usage.input_tokens >= 0 &&
    Number.isFinite(usage?.output_tokens) && usage.output_tokens >= 0;
  const rate = policy.models.pricing_usd_per_million_tokens[model];
  const actual = hasUsage ? (usage.input_tokens * rate.input + usage.output_tokens * rate.output) / 1e6 : request.projected;
  let plan;
  try { plan = JSON.parse(extractOutputText(payload)); } catch {
    settleRequest(store, run, request, actual, { status: 'invalid_response', usage });
    throw new Error('INVALID_PATCH_JSON');
  }
  settleRequest(store, run, request, actual, { status: 'completed', usage, plan });
  if (actual > request.projected) throw new Stop('COST_ESTIMATE_EXCEEDED: stopped before further calls');
  return { plan, cached: false };
}
