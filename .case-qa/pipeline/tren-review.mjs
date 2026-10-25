#!/usr/bin/env node
// One entry for the new Tren candidate. It calls the existing reviewCandidate
// path and never the recorded-review candidate, a repair, or publication.
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { loadSnapshot, read } from './core.mjs';
import { stableHash, stripAuthoring } from '../fm_case_qa_runner.mjs';
import { candidateContentHash, TREN_C4_TEXT } from './recorded-recovery.mjs';
import { closingNarrative, reviewCandidate, reviewHash, reviewTransport } from './review.mjs';
import { callPaid, Stop } from './provider.mjs';
import { openStore } from './state.mjs';

export const TREN_REVIEW_CASE = 'tren-yolculugunda-cinayet';
export const TREN_REVIEW_COMMIT = '99a6b33965861beeae032628031e8351b62268be';
export const TREN_REVIEW_CONTENT_HASH = 'ca62c0494d65d6a2dddcc3dc6279af2f4332634bdd53c42a5d765b2655d1e218';
export const TREN_REVIEW_SOURCE_HASH = 'a252062c8d4326f21bd48bcaaab64029070cdd78c44ca1d7f25f1b058a7a269d';
const RECORDED_CONTENT_HASH = 'a084f84420e8e67d7eae702e8a3f839f34e27e00b3a6874c25d15eb487933e3a';
const CONTENT_PATHS = [
  'artifacts/dedektif/data/puzzles.ts',
  'artifacts/dedektif/qa/case_qa_sidecars_v29_5.json'
];

export function trenReviewCommand() {
  return 'FM_TREN_REVIEW=call FM_TREN_REVIEW_CONFIRM=' + TREN_REVIEW_COMMIT + ':' + TREN_REVIEW_CONTENT_HASH +
    ' node .case-qa/pipeline/tren-review.mjs';
}

function git(root, args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function contentTreeMatches(root) {
  try {
    execFileSync('git', ['merge-base', '--is-ancestor', TREN_REVIEW_COMMIT, 'HEAD'], { cwd: root, stdio: 'ignore' });
    execFileSync('git', ['diff', '--exit-code', TREN_REVIEW_COMMIT, '--', ...CONTENT_PATHS], { cwd: root, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// The pin is the current Tren candidate. A different puzzles.ts or sidecar
// stops the review before any call; the previous commit is not loaded instead.
export function loadPinnedTrenReview(root = process.cwd()) {
  if (process.env.FM_PIPELINE_MODE === 'recorded-review') throw new Error('TREN_REVIEW_RECORDED_MODE');
  if (!contentTreeMatches(root)) throw new Error('TREN_REVIEW_CONTENT');
  const policy = read(root + '/.case-qa/pipeline/policy.json');
  const snapshot = loadSnapshot(root, policy);
  const entry = snapshot.entries.find(item => item.id === TREN_REVIEW_CASE);
  if (!entry) throw new Error('TREN_REVIEW_CASE');
  const candidate = entry.candidate;
  const contentHash = candidateContentHash(candidate);
  const sourceHash = stableHash(stripAuthoring(entry.raw));
  if (contentHash !== TREN_REVIEW_CONTENT_HASH || contentHash === RECORDED_CONTENT_HASH) throw new Error('TREN_REVIEW_CONTENT');
  if (sourceHash !== TREN_REVIEW_SOURCE_HASH) throw new Error('TREN_REVIEW_CONTENT');
  const c4 = candidate.clues.find(item => item.id === 'c4')?.text || '';
  if (!c4.includes('çantasına geri koydu') || c4.includes(TREN_C4_TEXT) || c4.includes('mühürlü teslim defteri'))
    throw new Error('TREN_REVIEW_RECORDED');
  const closing = closingNarrative(candidate);
  if (!closing.includes('bardağına zehirli sıvıyı damlatmıştı') || closing.includes('bildiği')) throw new Error('TREN_REVIEW_CLOSING');
  const transport = reviewTransport(snapshot, entry, candidate);
  if (!transport.pre.passed) throw new Error('TREN_REVIEW_MEDIA');
  const player = JSON.stringify(transport.playerBody);
  const judge = JSON.stringify(transport.judgeBody);
  if (player.includes(closing) || player.includes('closing_narrative') || player.includes('solutionNarrative'))
    throw new Error('TREN_REVIEW_PLAYER_LEAK');
  if (!judge.includes(closing) || !judge.includes('closing_narrative')) throw new Error('TREN_REVIEW_JUDGE');
  const currentHash = reviewHash(snapshot, candidate, transport.pre.evidence);
  const without = { ...candidate };
  delete without.solutionNarrative;
  if (currentHash === reviewHash(snapshot, without, transport.pre.evidence)) throw new Error('TREN_REVIEW_HASH');
  return {
    snapshot, entry, candidate, contentHash, sourceHash, closing, transport,
    head: git(root, ['rev-parse', 'HEAD']),
    cleanup() {}
  };
}

export async function reviewTrenCandidate({ root = process.cwd(), paid = false, confirm = '', store = null, caller = callPaid } = {}) {
  const pinned = loadPinnedTrenReview(root);
  try {
  const report = {
    schema: 'fm_tren_review_v1',
    mode: paid ? 'call' : 'offline',
    published: false,
    case_id: TREN_REVIEW_CASE,
    commit: TREN_REVIEW_COMMIT,
    head: pinned.head,
    candidate_content_hash: pinned.contentHash,
    source_content_hash: pinned.sourceHash,
    model: pinned.snapshot.policy.models.reviewer,
    requests: ['player', 'judge'],
    recorded_candidate: false,
    closing_in_player: false,
    closing_in_judge: true,
    publication: 'not_performed',
    calls: 0,
    command: trenReviewCommand(),
    status: 'offline_ready'
  };
  if (!paid) return report;
  if (confirm !== TREN_REVIEW_COMMIT + ':' + TREN_REVIEW_CONTENT_HASH) throw new Error('TREN_REVIEW_CONFIRM');
  const live = store || openStore(root, pinned.snapshot.policy);
  const record = live.state.cases?.[TREN_REVIEW_CASE];
  if (!record) throw new Error('CASE_LEDGER_MISSING');
  const statusBefore = record.status;
  const spentBefore = record.spent;
  const requestIds = Object.keys(live.state.requests);
  const run = { calls: 0, spent: 0, attempts: [] };
  let review;
  try {
    review = await reviewCandidate(pinned.snapshot, pinned.entry, pinned.candidate, live, run, caller);
  } catch (error) {
    if (!(error instanceof Stop)) throw error;
    return { ...report, published: false, publication: 'not_performed', calls: run.calls, status: error.message,
      failures: [error.message] };
  }
  if (live.state.cases[TREN_REVIEW_CASE].status !== statusBefore) throw new Error('TREN_REVIEW_LEDGER');
  if (live.state.cases[TREN_REVIEW_CASE].spent + 1e-9 < spentBefore) throw new Error('TREN_REVIEW_LEDGER');
  if (requestIds.some(id => !Object.prototype.hasOwnProperty.call(live.state.requests, id))) throw new Error('TREN_REVIEW_LEDGER');
  return {
    ...report,
    published: false,
    publication: 'not_performed',
    calls: run.calls,
    status: review.passed ? 'reviewed' : 'rejected',
    failures: review.failures || [],
    certificate: review.passed ? review.certificate : null
  };
  } finally {
    pinned.cleanup();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  reviewTrenCandidate({
    paid: process.env.FM_TREN_REVIEW === 'call',
    confirm: process.env.FM_TREN_REVIEW_CONFIRM || ''
  }).then(report => {
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
    if (report.status !== 'offline_ready' && report.status !== 'reviewed') process.exitCode = report.status === 'rejected' ? 2 : 1;
  }).catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
