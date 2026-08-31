import { execFileSync } from 'node:child_process';
export function api(endpoint, method = 'GET', body) {
  const args = ['api', endpoint, '--method', method];
  if (body !== undefined) args.push('--input', '-');
  const raw = execFileSync('gh', args, { encoding: 'utf8', input: body === undefined ? undefined : JSON.stringify(body),
    stdio: ['pipe', 'pipe', 'pipe'], timeout: 60000 });
  return raw.trim() ? JSON.parse(raw) : null;
}
export function assertProtection(protection, context) {
  const status = protection?.required_status_checks;
  const contexts = [...(status?.contexts || []), ...(status?.checks || []).map(c => c.context)];
  if (status?.strict !== true || !contexts.includes(context) || protection.enforce_admins?.enabled !== true)
    throw new Error(`SETUP_REQUIRED: main must require strict up-to-date '${context}' check, including administrators`);
}
export function preflight(policy) {
  const repo = policy.source.repository;
  const info = api(`repos/${repo}`);
  if (!info.allow_squash_merge) throw new Error('SETUP_REQUIRED: squash merge disabled');
  // Fail closed if protection cannot be read. A pre-merge GET alone cannot
  // prevent a concurrent main push between the check and GitHub's merge call.
  assertProtection(api(`repos/${repo}/branches/main/protection`), policy.sequential.required_ci_context);
}
export function assertPr(pr, expectedHead, expectedBase) {
  if (pr.state !== 'open' || pr.draft || pr.head.sha !== expectedHead || pr.base.sha !== expectedBase ||
      pr.base.ref !== 'main' || pr.mergeable !== true || pr.mergeable_state !== 'clean')
    throw new Error('PR_NOT_MERGEABLE_AT_CERTIFIED_REVISIONS');
}
export function certifiedRun(runs, { head, nonce, workflowId }) {
  return runs.filter(r => r.head_sha === head && r.display_title === `v5-cert-${nonce}` &&
    r.event === 'workflow_dispatch' && r.workflow_id === workflowId).sort((a, b) => b.id - a.id)[0] || null;
}
