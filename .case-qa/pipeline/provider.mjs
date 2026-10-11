import { PATCH_SCHEMA, SYSTEM_PROMPT, stableHash } from '../fm_case_qa_runner.mjs';

export class Stop extends Error {
  constructor(message, providerError) { super(message); this.provider_error = providerError; }
}
export function providerErrorDetails(payload, httpStatus) {
  let message = String(payload?.error?.message || '').replace(/[\x00-\x1f\x7f]/g, ' ');
  const key = process.env.GEMINI_API_KEY;
  if (key) message = message.split(key).join('[REDACTED]');
  message = message.replace(/AIza[A-Za-z0-9_-]{20,}/g, '[REDACTED]')
    .replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]')
    .replace(/([?&](?:key|api_key)=)[^\s&"']+/gi, '$1[REDACTED]');
  return { http_status: httpStatus,
    status: /^[A-Z_]{1,64}$/.test(payload?.error?.status || '') ? payload.error.status : null,
    message: message.slice(0, 1000),
    field_violations: (payload?.error?.details || []).slice(0, 5).flatMap(d =>
      (Array.isArray(d.fieldViolations) ? d.fieldViolations : []).slice(0, 5).map(v => ({
        field: /^[a-zA-Z0-9_.\[\]-]{1,200}$/.test(v.field || '') ? v.field : null,
        description: providerErrorDetails({ error: { message: v.description } }, httpStatus).message
      }))) };
}
export function countsAsRepair(request) {
  return request.purpose === 'repair' && !(request.status === 'failed' &&
    request.charged === 0 && [400, 404].includes(request.http_status));
}
export async function modelPreflight(policy, { transport = fetch } = {}) {
  if (!process.env.GEMINI_API_KEY) throw new Stop('GEMINI_API_KEY_MISSING');
  const checked = [];
  for (const model of new Set([policy.models.first_pass, policy.models.reviewer])) {
    requestBody(policy, model, ''); // Validate the allowlist before constructing a URL.
    let http, metadata;
    try {
      http = await transport('https://generativelanguage.googleapis.com/v1beta/models/' + model, {
        method: 'GET', signal: AbortSignal.timeout(policy.sequential.http_timeout_ms),
        headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY }
      });
      metadata = await http.json();
    } catch { throw new Stop('MODEL_PREFLIGHT_UNAVAILABLE:' + model); }
    if (!http.ok) throw new Stop('MODEL_PREFLIGHT_HTTP_' + http.status + ':' + model);
    if (metadata.name !== 'models/' + model ||
        !metadata.supportedGenerationMethods?.includes('generateContent') ||
        !(metadata.outputTokenLimit >= policy.sequential.max_output_tokens))
      throw new Stop('MODEL_PREFLIGHT_UNSUPPORTED:' + model);
    checked.push(model);
  }
  return { checked, generation_calls: 0 };
}
export function requestBody(policy, model, prompt, { schema = PATCH_SCHEMA, system = SYSTEM_PROMPT } = {}) {
  if (!policy.models.pricing_usd_per_million_tokens[model] || !/^gemini-[a-z0-9.-]+$/.test(model))
    throw new Stop('MODEL_NOT_ALLOWED');
  const wireSchema = structuredClone(schema);
  // Keep the 80-operation limit in the local patch validator; avoid expanding
  // a bounded nested array in the provider's constrained-decoding grammar.
  if (schema === PATCH_SCHEMA) delete wireSchema.properties.operations.maxItems;
  return {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 1, maxOutputTokens: policy.sequential.max_output_tokens,
      responseFormat: { text: { mimeType: 'APPLICATION_JSON', schema: wireSchema } },
      thinkingConfig: { thinkingLevel: policy.sequential.thinking_level }
    }
  };
}
export function reserveCost(policy, model, body) {
  const rate = policy.models.pricing_usd_per_million_tokens[model];
  if (!rate || ![rate.input, rate.output].every(n => Number.isFinite(n) && n > 0))
    throw new Stop('MODEL_RATE_MISSING');
  return ((Buffer.byteLength(JSON.stringify(body)) + 4096) * rate.input +
    body.generationConfig.maxOutputTokens * rate.output) / 1e6;
}
export function requestKey(caseId, model, body, purpose) {
  return stableHash({ version: 1, provider: 'gemini', caseId, model, purpose, body });
}
export function reserveRequest(store, policy, run, caseId, model, body, purpose = 'repair', now = new Date()) {
  const key = requestKey(caseId, model, body, purpose);
  const previous = store.state.requests[key];
  if (previous?.status === 'completed' && previous.plan) return { key, cached: previous.plan };
  if (previous) throw new Stop('REPEATED_OR_UNCERTAIN_REQUEST');
  const config = policy.sequential, record = store.state.cases[caseId];
  if (!record) throw new Stop('CASE_LEDGER_MISSING');
  const day = now.toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(policy.models.pricing_valid_through || '') ||
      day > policy.models.pricing_valid_through) throw new Stop('PRICING_REVIEW_REQUIRED');
  const daily = Object.values(store.state.requests).filter(r => r.day === day).reduce((s, r) => s + r.charged, 0);
  const projected = reserveCost(policy, model, body);
  const caseRequests = Object.values(store.state.requests).filter(r => r.case_id === caseId);
  if (!Number.isInteger(config.max_requests_per_case) || config.max_requests_per_case < 1)
    throw new Stop('REQUEST_LIMIT_MISSING');
  if (caseRequests.length >= config.max_requests_per_case) throw new Stop('CASE_REQUEST_LIMIT');
  const repairs = caseRequests.filter(countsAsRepair).length;
  if (purpose === 'repair' && repairs >= config.max_repairs_per_case) throw new Stop('REPAIR_LIMIT');
  if (run.calls >= config.max_calls_per_execute || run.spent + projected > config.execute_budget_usd ||
      record.spent + projected > config.case_budget_usd || daily + projected > config.daily_budget_usd ||
      store.state.campaign_spent + projected > config.campaign_budget_usd) throw new Stop('BUDGET_STOP');
  store.state.requests[key] = { case_id: caseId, model, purpose, day, status: 'reserved', charged: projected };
  record.spent += projected; store.state.campaign_spent += projected;
  run.spent += projected; run.calls++;
  store.save(); // A failed durable reservation prevents transport.
  return { key, projected };
}
export function settleRequest(store, run, request, amount, extra) {
  const ledger = store.state.requests[request.key];
  const delta = amount - ledger.charged;
  store.state.cases[ledger.case_id].spent += delta;
  store.state.campaign_spent += delta; run.spent += delta;
  Object.assign(ledger, extra, { charged: amount }); store.save();
}
export async function callPaid({ store, policy, run, caseId, model, prompt, purpose = 'repair',
  schema, system, validate = value => value && typeof value === 'object',
  transport = fetch, now = new Date() }) {
  const body = requestBody(policy, model, prompt, { schema, system });
  const key = requestKey(caseId, model, body, purpose);
  const previous = store.state.requests[key];
  if (previous?.status === 'completed' && previous.plan) {
    if (!validate(previous.plan)) throw new Stop('INVALID_CACHED_RESPONSE');
    return { plan: previous.plan, cached: true };
  }
  if (previous) throw new Stop('REPEATED_OR_UNCERTAIN_REQUEST');
  if (!process.env.GEMINI_API_KEY) throw new Stop('GEMINI_API_KEY_MISSING');
  const request = reserveRequest(store, policy, run, caseId, model, body, purpose, now);
  let payload, http;
  try {
    http = await transport('https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent', {
      method: 'POST', signal: AbortSignal.timeout(policy.sequential.http_timeout_ms),
      headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    payload = await http.json();
  } catch {
    throw new Stop('TRANSPORT_UNCERTAIN'); // No retry; retain conservative reservation.
  }
  if (!http.ok) {
    const definitive = [400, 401, 403, 404, 429].includes(http.status);
    const details = providerErrorDetails(payload, http.status);
    settleRequest(store, run, request, definitive ? 0 : request.projected,
      { status: 'failed', http_status: http.status, provider_error: details });
    throw new Stop('GEMINI_HTTP_' + http.status, details);
  }
  const usage = payload.usageMetadata;
  const validUsage = [usage?.promptTokenCount, usage?.candidatesTokenCount, usage?.thoughtsTokenCount ?? 0]
    .every(n => Number.isFinite(n) && n >= 0);
  const rate = policy.models.pricing_usd_per_million_tokens[model];
  const actual = validUsage ? (usage.promptTokenCount * rate.input +
    (usage.candidatesTokenCount + (usage.thoughtsTokenCount || 0)) * rate.output) / 1e6 : request.projected;
  let plan;
  const candidate = payload.candidates?.[0];
  try {
    if (candidate?.finishReason !== 'STOP') throw new Error('INCOMPLETE');
    const text = (candidate.content?.parts || []).filter(p => p.thought !== true).map(p => p.text || '').join('');
    plan = JSON.parse(text);
    if (!validate(plan)) throw new Error('SCHEMA');
  } catch {
    settleRequest(store, run, request, actual, { status: 'invalid_response', usage });
    throw new Stop('INVALID_MODEL_RESPONSE');
  }
  settleRequest(store, run, request, actual, { status: 'completed', usage, plan });
  if (actual > request.projected) throw new Stop('COST_ESTIMATE_EXCEEDED');
  return { plan, cached: false };
}
