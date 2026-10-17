import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { read, clone } from './core.mjs';
import { stableHash } from '../fm_case_qa_runner.mjs';
import { reserveRequest, requestKey } from './provider.mjs';
import { validateState } from './state.mjs';

// A revision grant is one reviewed player/judge pair for one case and one
// content hash. It is not a higher lifetime cap and cannot buy repairs.
const GRANT_KEYS = ['case_id', 'content_hash', 'id', 'merge_sha', 'purposes', 'reason', 'uses'];
export function validateGrant(grant) {
  if (!grant || typeof grant !== 'object' || Array.isArray(grant)) throw new Error('REVISION_GRANT_INVALID');
  const keys = Object.keys(grant).sort();
  if (keys.length !== GRANT_KEYS.length || keys.some(key => !GRANT_KEYS.includes(key))) throw new Error('REVISION_GRANT_INVALID');
  if (!/^[a-z0-9-]{8,80}$/.test(grant.id) || !/^[a-z0-9-]{3,80}$/.test(grant.case_id)) throw new Error('REVISION_GRANT_INVALID');
  if (!/^[a-f0-9]{64}$/.test(grant.content_hash) || !/^[a-f0-9]{40}$/.test(grant.merge_sha)) throw new Error('REVISION_GRANT_INVALID');
  if (grant.uses !== 1) throw new Error('REVISION_GRANT_UNLIMITED');
  if (!Array.isArray(grant.purposes) || grant.purposes.length !== 2 || grant.purposes[0] !== 'player' || grant.purposes[1] !== 'judge')
    throw new Error('REVISION_GRANT_PURPOSE');
  if (typeof grant.reason !== 'string' || grant.reason.length < 8 || grant.reason.length > 240) throw new Error('REVISION_GRANT_INVALID');
  return grant;
}
export function loadRevisionGrants(root, policy) {
  const relative = policy.review_revision?.grants_path;
  if (typeof relative !== 'string' || !relative || relative.includes('..') || path.isAbsolute(relative))
    throw new Error('REVISION_GRANT_SCHEMA');
  if (policy.review_revision.max_pair_uses !== 1) throw new Error('REVISION_GRANT_UNLIMITED');
  const data = read(path.join(root, relative));
  if (data.schema !== 'fm_review_revision_grant_v1' || !Array.isArray(data.grants) || data.grants.length > 20)
    throw new Error('REVISION_GRANT_SCHEMA');
  const ids = new Set();
  for (const grant of data.grants) {
    validateGrant(grant);
    if (ids.has(grant.id)) throw new Error('REVISION_GRANT_INVALID');
    ids.add(grant.id);
  }
  return data.grants;
}
export function mergeShaIsAncestor(root, sha) {
  if (!/^[a-f0-9]{40}$/.test(sha || '')) return false;
  try {
    execFileSync('git', ['merge-base', '--is-ancestor', sha, 'HEAD'], { cwd: root, stdio: 'ignore' });
    return true;
  } catch { return false; }
}
// Same allowlist as the player card. Authoring prompts are not part of the target.
const playerCard = entity => Object.fromEntries(['id', 'name', 'description', 'detail']
  .filter(key => typeof entity?.[key] === 'string').map(key => [key, entity[key]]));
export function reviewTarget(candidate) {
  return stableHash({
    story: candidate?.story || '',
    solution: candidate?.solution || null,
    clues: (candidate?.clues || []).map(clue => ({ id: clue.id, text: clue.text || '', bonus: clue.isBonus === true })),
    suspects: (candidate?.suspects || []).map(playerCard),
    weapons: (candidate?.weapons || []).map(playerCard),
    locations: (candidate?.locations || []).map(playerCard)
  });
}
export function sameReviewTarget(source, candidate) {
  return !!source && !!candidate && reviewTarget(source) === reviewTarget(candidate);
}
export function revisionGrantFor(snapshot, entry, candidate = entry.candidate) {
  if (!snapshot.policy.review_revision || !sameReviewTarget(entry.candidate, candidate)) return null;
  const grant = loadRevisionGrants(snapshot.root, snapshot.policy).find(item =>
    item.case_id === entry.id && item.content_hash === entry.sourceHash && mergeShaIsAncestor(snapshot.root, item.merge_sha));
  return grant || null;
}
export function completedRequest(store, caseId, model, body, purpose) {
  const previous = store.state.requests[requestKey(caseId, model, body, purpose)];
  if (previous?.status === 'completed' && previous.plan) return previous;
  return null;
}
// Reserve the whole pair against a discardable copy. A missing second slot
// or an uncertain earlier call fails before the live ledger or transport.
export function assertReviewPairReservable(store, policy, run, caseId, specs, now = new Date()) {
  const trialState = clone(store.state);
  const trialRun = { calls: run.calls, spent: run.spent };
  const trial = { state: trialState, save() { validateState(trialState); } };
  let projected = 0, calls = 0;
  for (const spec of specs) {
    const before = trialRun.calls;
    const result = reserveRequest(trial, policy, trialRun, caseId, spec.model, spec.body, spec.purpose, now, 'legacy_patch', spec.revisionGrant || null);
    if (!result.cached) {
      projected += result.projected || 0;
      calls += trialRun.calls - before;
    }
  }
  return { projected, calls };
}
