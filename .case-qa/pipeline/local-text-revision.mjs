// Local play-preview text revisions. A package can be checked against the
// source commit and the previous text. A match is still unreviewed: text can
// change logic, and this module does not grant approval or publish.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { parseStandard, stableHash, stripAuthoring } from '../fm_case_qa_runner.mjs';

export const LOCAL_REVISION_LABEL = 'Yerel düzenleme — yeniden değerlendirilmedi';
export const LOCAL_REVISION_SCHEMA = 'fm_local_text_revision_v1';
export const LOCAL_DRAFT_SCHEMA = 'fm_local_text_draft_v1';
const CONTENT_PATHS = [
  'artifacts/dedektif/data/puzzles.ts',
  'artifacts/dedektif/qa/case_qa_sidecars_v29_5.json'
];
const TEXT_PATH = /^(story|closing|(?:suspects|weapons|locations)\.[A-Za-z0-9_-]+\.description|clues\.[A-Za-z0-9_-]+\.(?:text|deductionHint))$/;

export function playContentHash(record, closing) {
  return stableHash({ record, closing: closing || '' });
}

export function textPathAllowed(fieldPath) {
  return TEXT_PATH.test(fieldPath || '');
}

function text(value) { return typeof value === 'string' ? value : ''; }

export function sourceField(candidate, fieldPath) {
  if (!textPathAllowed(fieldPath)) return null;
  if (fieldPath === 'story') return text(candidate.story);
  if (fieldPath === 'closing')
    return text(candidate.solutionNarrative || candidate.closingNarrative || candidate.cozumAnlatimi);
  const card = fieldPath.match(/^(suspects|weapons|locations)\.([^.]+)\.description$/);
  if (card) {
    const entity = (candidate[card[1]] || []).find(item => item && item.id === card[2]);
    return entity ? text(entity.description) : null;
  }
  const clue = fieldPath.match(/^clues\.([^.]+)\.(text|deductionHint)$/);
  const item = (candidate.clues || []).find(entry => entry && entry.id === clue[1]);
  return item ? text(item[clue[2]]) : null;
}

function setField(candidate, fieldPath, value) {
  if (fieldPath === 'story') { candidate.story = value; return; }
  if (fieldPath === 'closing') { candidate.solutionNarrative = value; return; }
  const card = fieldPath.match(/^(suspects|weapons|locations)\.([^.]+)\.description$/);
  if (card) {
    const entity = (candidate[card[1]] || []).find(item => item && item.id === card[2]);
    if (entity) entity.description = value;
    return;
  }
  const clue = fieldPath.match(/^clues\.([^.]+)\.(text|deductionHint)$/);
  const item = (candidate.clues || []).find(entry => entry && entry.id === clue[1]);
  if (item) item[clue[2]] = value;
}

function jsLiteral(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r?\n/g, '\\n');
}

export function assessLocalTextRevision(candidate, revision, identity) {
  const failures = [];
  const refuse = code => { if (!failures.includes(code)) failures.push(code); };
  if (!revision || revision.schema !== LOCAL_REVISION_SCHEMA) refuse('REVISION_SCHEMA');
  if (revision && revision.approval && revision.approval !== 'not_reviewed') refuse('APPROVAL_CLAIM');
  if (revision && revision.logic_safety && revision.logic_safety !== 'not_assessed') refuse('LOGIC_CLAIM');
  if (!revision || revision.case_id !== identity.case_id) refuse('REVISION_CASE');
  if (!revision || revision.content_hash !== identity.content_hash) refuse('SOURCE_HASH');
  if (!revision || !/^[0-9a-f]{40}$/.test(revision.commit || '')) refuse('SOURCE_COMMIT');
  else if (identity.root && sourceCommitDrift(identity.root, revision.commit)) refuse('SOURCE_COMMIT');
  const changes = revision && Array.isArray(revision.changes) ? revision.changes : null;
  if (!changes || !changes.length) refuse('EMPTY_REVISION');
  const seen = new Set();
  for (const change of changes || []) {
    if (!change || !textPathAllowed(change.path) || typeof change.before !== 'string' || typeof change.after !== 'string') {
      refuse('PATH_NOT_TEXT');
      continue;
    }
    if (seen.has(change.path)) refuse('DUPLICATE_PATH');
    seen.add(change.path);
    if (change.after === change.before) refuse('UNCHANGED_FIELD');
    if (!change.after.trim()) refuse('EMPTY_TEXT');
    const current = sourceField(candidate, change.path);
    if (current == null || current !== change.before) refuse('OLD_TEXT_MISMATCH');
  }
  return {
    schema: 'fm_local_text_revision_check_v1',
    status: failures.length ? 'refused' : 'applicable_unreviewed',
    approval: 'not_reviewed',
    logic_safety: 'not_assessed',
    publication: 'not_performed',
    case_id: identity.case_id,
    commit: identity.commit,
    content_hash: identity.content_hash,
    paths: failures.length ? [] : [...seen],
    failures
  };
}

function sourceCommitDrift(root, commit) {
  try {
    execFileSync('git', ['merge-base', '--is-ancestor', commit, 'HEAD'], { cwd: root, stdio: 'ignore' });
    execFileSync('git', ['diff', '--exit-code', commit, 'HEAD', '--', ...CONTENT_PATHS], { cwd: root, stdio: 'ignore' });
    return false;
  } catch {
    return true;
  }
}

export function applyLocalTextRevision(candidate, revision, identity) {
  const check = assessLocalTextRevision(candidate, revision, identity);
  if (check.status !== 'applicable_unreviewed')
    return { ...check, applied: false, candidate: null };
  const next = JSON.parse(JSON.stringify(candidate));
  for (const change of revision.changes) setField(next, change.path, change.after);
  return { ...check, applied: true, candidate: next };
}

export function caseSourceSpan(source, caseId) {
  const marker = `id: "${caseId}"`;
  const start = source.indexOf(marker);
  if (start < 0) return null;
  const nextCase = source.indexOf('\n  {', start + marker.length);
  const arrayEnd = source.indexOf('\n];', start + marker.length);
  const end = [nextCase, arrayEnd].filter(index => index >= 0).sort((a, b) => a - b)[0] ?? source.length;
  return { start, end };
}

export function patchPuzzleSource(source, caseId, changes) {
  const span = caseSourceSpan(source, caseId);
  if (!span) throw new Error('CASE_BLOCK_MISSING');
  let block = source.slice(span.start, span.end);
  for (const change of changes) {
    if (!textPathAllowed(change.path)) throw new Error('PATH_NOT_TEXT');
    const literal = jsLiteral(change.before);
    const count = block.split(literal).length - 1;
    if (count !== 1) throw new Error(count === 0 ? 'OLD_TEXT_MISMATCH' : 'OLD_TEXT_AMBIGUOUS');
    block = block.replace(literal, jsLiteral(change.after));
  }
  return source.slice(0, span.start) + block + source.slice(span.end);
}

function flag(args, name) {
  const index = args.indexOf(name);
  if (index < 0) return null;
  const value = args[index + 1];
  return value && !value.startsWith('--') ? value : true;
}

function syncVerbatimQuotes(node, changes) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const item of node) syncVerbatimQuotes(item, changes);
    return;
  }
  for (const [key, value] of Object.entries(node)) {
    if ((key === 'evidence' || key === 'evidenceLink') && typeof value === 'string') {
      const change = changes.find(item => item.before === value);
      if (change) node[key] = change.after;
    } else syncVerbatimQuotes(value, changes);
  }
}

export async function applyRevisionFile(root, revision) {
  const { loadSnapshot, read } = await import('./core.mjs');
  const { playContentRecord } = await import('./play-preview.mjs');
  const policy = read(pathJoin(root, '.case-qa/pipeline/policy.json'));
  const snapshot = loadSnapshot(root, policy);
  const entry = snapshot.entries.find(item => item.id === revision.case_id);
  if (!entry) throw new Error('REVISION_CASE');
  const closing = text(entry.candidate.solutionNarrative || entry.candidate.closingNarrative || entry.candidate.cozumAnlatimi);
  const contentHash = playContentHash(playContentRecord(entry.candidate), closing);
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  const check = assessLocalTextRevision(entry.candidate, revision, {
    root, case_id: entry.id, commit, content_hash: contentHash
  });
  if (check.status !== 'applicable_unreviewed') return { ...check, applied: false };
  const puzzlesPath = pathJoin(root, policy.source.standard_path);
  const patched = patchPuzzleSource(fs.readFileSync(puzzlesPath, 'utf8'), entry.id, revision.changes);
  const raw = parseStandard(patched).cases.find(item => (item.puzzleId || item.id) === entry.id);
  if (!raw) throw new Error('CASE_BLOCK_MISSING');
  const sidecarPath = pathJoin(root, policy.source.sidecar_path);
  const sidecar = JSON.parse(fs.readFileSync(sidecarPath, 'utf8'));
  const caseEntry = sidecar.cases && sidecar.cases[entry.id];
  if (caseEntry && caseEntry.overlay) syncVerbatimQuotes(caseEntry.overlay, revision.changes);
  if (caseEntry) caseEntry.source_content_hash = stableHash(stripAuthoring(raw));
  if (caseEntry && caseEntry.manual_content_revision) caseEntry.manual_content_revision.certificate = null;
  fs.writeFileSync(puzzlesPath, patched);
  fs.writeFileSync(sidecarPath, JSON.stringify(sidecar, null, 2) + '\n');
  return { ...check, applied: true, publication: 'not_performed' };
}

function pathJoin(root, rel) {
  return root.replace(/\/$/, '') + '/' + rel;
}

async function main() {
  const args = process.argv.slice(2);
  const checkFile = flag(args, '--check');
  const applyFile = flag(args, '--apply');
  const file = typeof applyFile === 'string' ? applyFile : checkFile;
  if (typeof file !== 'string') throw new Error('REVISION_FILE_MISSING');
  const revision = JSON.parse(fs.readFileSync(file, 'utf8'));
  const { repoRoot } = await import('./play-preview.mjs');
  const root = repoRoot();
  if (typeof applyFile === 'string') {
    const result = await applyRevisionFile(root, revision);
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    if (!result.applied) process.exitCode = 2;
    return;
  }
  const { loadSnapshot, read } = await import('./core.mjs');
  const { playContentRecord } = await import('./play-preview.mjs');
  const policy = read(root + '/.case-qa/pipeline/policy.json');
  const snapshot = loadSnapshot(root, policy);
  const entry = snapshot.entries.find(item => item.id === revision.case_id);
  if (!entry) throw new Error('REVISION_CASE');
  const record = playContentRecord(entry.candidate);
  const closing = text(entry.candidate.solutionNarrative || entry.candidate.closingNarrative || entry.candidate.cozumAnlatimi);
  const contentHash = playContentHash(record, closing);
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  const check = assessLocalTextRevision(entry.candidate, revision, {
    root, case_id: entry.id, commit, content_hash: contentHash
  });
  process.stdout.write(JSON.stringify(check, null, 2) + '\n');
  if (check.status !== 'applicable_unreviewed') process.exitCode = 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
