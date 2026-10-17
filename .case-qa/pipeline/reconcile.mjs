import { clone } from './core.mjs';
import { stableHash } from '../fm_case_qa_runner.mjs';

export function pullNumber(url) {
  const match = String(url || '').match(/^https:\/\/github\.com\/5n1katil\/Faili-Mechul\/pull\/(\d+)$/);
  return match ? Number(match[1]) : null;
}
export function normalizePull(body) {
  const number = body?.number;
  if (!Number.isInteger(number) || number < 1) throw new Error('PR_LOOKUP_INVALID');
  if (body.state !== 'open' && body.state !== 'closed') throw new Error('PR_LOOKUP_INVALID');
  const merged = typeof body.merged_at === 'string' && body.merged_at.length > 0;
  if (merged && !/^[a-f0-9]{40}$/.test(body.merge_commit_sha || '')) throw new Error('PR_LOOKUP_INVALID');
  return {
    number, state: body.state, merged, merged_at: merged ? body.merged_at : null,
    merge_commit_sha: merged ? body.merge_commit_sha : null,
    html_url: `https://github.com/5n1katil/Faili-Mechul/pull/${number}`,
    draft: body.draft === true,
    head_sha: /^[a-f0-9]{40}$/.test(body.head?.sha || '') ? body.head.sha : null,
    title: typeof body.title === 'string' ? body.title.slice(0, 140) : ''
  };
}
function assertPull(pull) {
  if (!pull || !Number.isInteger(pull.number) || pull.number < 1) throw new Error('PR_LOOKUP_INVALID');
  if (!['open', 'closed'].includes(pull.state)) throw new Error('PR_LOOKUP_INVALID');
  if (pull.merged !== true && pull.merged !== false) throw new Error('PR_LOOKUP_INVALID');
  if (pull.merged && !/^[a-f0-9]{40}$/.test(pull.merge_commit_sha || '')) throw new Error('PR_LOOKUP_INVALID');
}
function archiveEvent(record, event) {
  record.publication_history ||= [];
  if (record.publication_history.some(item => item.pr_number === event.pr_number && item.event === event.event)) return;
  record.publication_history.push(event);
}
function preserveCheckpoint(record, sourceChanged) {
  if (sourceChanged && record.candidate && !record.archived_candidate) {
    record.archived_candidate = clone(record.candidate);
    record.archived_candidate_hash = record.candidate_hash || null;
  }
  if (sourceChanged && record.review && !record.archived_review) record.archived_review = clone(record.review);
  if (sourceChanged) delete record.review;
}
export function blockingOpenReview(snapshot, cases) {
  return snapshot.entries.some(entry => {
    const record = cases[entry.id];
    return record?.status === 'awaiting_review' && record.source_hash === entry.sourceHash;
  });
}
// Classify recorded pull requests. Never copy a stored candidate back onto
// the case source; requests and spent amounts stay on the original ledger.
export function reconcileQueue(state, snapshot, pulls) {
  for (const pull of pulls) assertPull(pull);
  const next = clone(state);
  const byNumber = new Map(pulls.map(pull => [pull.number, pull]));
  const notes = [];
  const tracked = new Set();
  for (const [id, record] of Object.entries(next.cases)) {
    const number = pullNumber(record.pr_url);
    if (!number) continue;
    tracked.add(number);
    const entry = snapshot.entries.find(item => item.id === id);
    const sourceChanged = !!(entry && record.source_hash && record.source_hash !== entry.sourceHash);
    const pull = byNumber.get(number);
    if (!pull) {
      notes.push({ id, action: 'pr_unknown', pr_number: number, queue_status: record.status || null, source_changed: sourceChanged, blocking: record.status === 'awaiting_review' && !sourceChanged });
      continue;
    }
    const prior = record.status || null;
    if (pull.merged) {
      archiveEvent(record, { event: 'merged', pr_number: pull.number, pr_url: pull.html_url, merge_commit_sha: pull.merge_commit_sha,
        merged_at: pull.merged_at, source_hash: record.source_hash || null });
      preserveCheckpoint(record, sourceChanged);
      record.pr_state = 'merged';
      record.merge_commit_sha = pull.merge_commit_sha;
      record.status = sourceChanged ? 'source_revised' : 'merged';
    } else if (pull.state === 'closed') {
      archiveEvent(record, { event: 'closed', pr_number: pull.number, pr_url: pull.html_url, source_hash: record.source_hash || null });
      preserveCheckpoint(record, sourceChanged);
      record.pr_state = 'closed';
      record.status = 'review_closed';
    } else {
      record.pr_state = 'open';
      if (sourceChanged) {
        archiveEvent(record, { event: 'stale_open_draft', pr_number: pull.number, pr_url: pull.html_url, source_hash: record.source_hash || null });
        preserveCheckpoint(record, true);
        record.status = 'stale_open_draft';
      } else record.status = 'awaiting_review';
    }
    notes.push({ id, action: record.status, previous_status: prior, pr_number: pull.number, pr_state: record.pr_state,
      source_changed: sourceChanged, blocking: record.status === 'awaiting_review' && !sourceChanged });
  }
  const untracked_open_prs = pulls.filter(pull => pull.state === 'open' && !tracked.has(pull.number)).map(pull => ({
    number: pull.number, html_url: pull.html_url, draft: pull.draft === true, title: pull.title || '', role: 'untracked_open_pr'
  }));
  return { state: next, changed: stableHash(next.cases) !== stableHash(state.cases), notes, untracked_open_prs };
}
export function applyQueueReconciliation(store, snapshot, pulls) {
  const result = reconcileQueue(store.state, snapshot, pulls);
  if (result.changed) {
    store.state.cases = result.state.cases;
    store.save();
  }
  return result;
}
export function summarizeQueue(state) {
  return {
    active_id: state.active_id ?? null,
    campaign_spent: state.campaign_spent,
    cases: Object.entries(state.cases).map(([id, record]) => ({
      id, status: record.status || null, spent: record.spent,
      requests: Object.values(state.requests).filter(item => item.case_id === id).length,
      source_hash: record.source_hash || null, pr_url: record.pr_url || null, pr_state: record.pr_state || null
    }))
  };
}
export function queueAuditReport(snapshot, state, pulls) {
  const fingerprint = stableHash(state);
  const preview = reconcileQueue(state, snapshot, pulls);
  if (stableHash(state) !== fingerprint) throw new Error('AUDIT_MUTATED_STATE');
  return {
    applied: false, queue_reconciled: false, durable_store_updated: false,
    durable_queue: summarizeQueue(state), reconciliation_preview: preview.notes,
    untracked_open_prs: preview.untracked_open_prs
  };
}
export function queueNeedsLookup(state) {
  return Object.values(state.cases).some(record => record && (record.status === 'awaiting_review' || record.pr_url));
}
async function getJson(transport, url) {
  const headers = { accept: 'application/vnd.github+json', 'user-agent': 'faili-mechul-pipeline' };
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (token) headers.authorization = 'Bearer ' + token;
  const response = await transport(url, { headers, signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error('PR_LOOKUP_FAILED');
  return response.json();
}
export async function fetchQueuePulls(state, { transport = fetch, repo = '5n1katil/Faili-Mechul' } = {}) {
  const numbers = new Set();
  for (const record of Object.values(state.cases || {})) {
    const number = pullNumber(record?.pr_url);
    if (number) numbers.add(number);
  }
  const open = await getJson(transport, `https://api.github.com/repos/${repo}/pulls?state=open&per_page=100`);
  if (!Array.isArray(open)) throw new Error('PR_LOOKUP_INVALID');
  const pulls = open.map(normalizePull);
  const seen = new Set(pulls.map(pull => pull.number));
  for (const number of numbers) {
    if (seen.has(number)) continue;
    pulls.push(normalizePull(await getJson(transport, `https://api.github.com/repos/${repo}/pulls/${number}`)));
  }
  return pulls;
}
