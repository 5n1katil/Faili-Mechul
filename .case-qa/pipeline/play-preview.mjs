#!/usr/bin/env node
// Browser play preview. Copies the pinned simulator and fills it from the
// checkout that is actually being built. Does not edit that HTML file, the
// simulator pin, certificates, the queue, or spend.
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { loadSnapshot, read } from './core.mjs';
import { playerMatchingRules } from './review.mjs';
import { stableHash } from '../fm_case_qa_runner.mjs';

const TYPE_LABELS = {
  witness: 'tanik', evidence: 'kanit', forensic: 'adli', record: 'kanit',
  direct: 'dogrudan', indirect: 'kanit', elimination: 'eleme',
  tanik: 'tanik', kanit: 'kanit', adli: 'adli', dogrudan: 'dogrudan', eleme: 'eleme'
};
const DIFFICULTY_LABELS = { caylak: 'Çaylak', dedektif: 'Dedektif', baskomiser: 'Başkomiser' };
const BANNED_KEYS = ['logicRules', 'qaRationale', 'qaSemanticFacts', 'qaPortfolioRegistry', 'qaPolicy', 'qaPattern', 'qaAiReview', 'solutionNarrative'];

export function repoRoot(start = process.cwd()) {
  let dir = path.resolve(start);
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, '.case-qa', 'pipeline', 'policy.json'))) return dir;
    dir = path.dirname(dir);
  }
  throw new Error('PLAY_REPO_ROOT_MISSING');
}

function gitBlobSha(bytes) {
  return crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes])).digest('hex');
}
function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}
function gitBytes(repo, sha, rel) {
  return execFileSync('git', ['show', `${sha}:${rel}`], { cwd: repo, maxBuffer: 32 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
}
function assertCommit(repo, sha) {
  if (!/^[0-9a-f]{40}$/.test(sha || '')) throw new Error('PLAY_COMMIT_INVALID');
  execFileSync('git', ['cat-file', '-e', `${sha}^{commit}`], { cwd: repo, stdio: 'pipe' });
}

function text(value) { return typeof value === 'string' ? value : ''; }
function difficultyOf(value) {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}
export function playContentRecord(candidate) {
  const card = entity => ({
    id: text(entity.id), name: text(entity.name), description: text(entity.description),
    detail: text(entity.detail), icon: text(entity.icon)
  });
  const mechanic = clue => {
    const raw = clue.mechanicType || clue.miniGameType || (clue.miniGame && clue.miniGame.type) || 'text';
    return String(raw || 'text').toLowerCase();
  };
  return {
    id: text(candidate.puzzleId || candidate.id),
    title: text(candidate.title),
    story: text(candidate.story),
    difficulty: difficultyOf(candidate.difficulty),
    suspects: (candidate.suspects || []).map(card),
    weapons: (candidate.weapons || []).map(card),
    locations: (candidate.locations || []).map(card),
    clues: (candidate.clues || []).map(clue => ({
      id: text(clue.id), text: text(clue.text), type: text(clue.type),
      isBonus: clue.isBonus === true, deductionHint: text(clue.deductionHint), mechanicType: mechanic(clue)
    })),
    solution: {
      suspectId: text(candidate.solution && candidate.solution.suspectId),
      weaponId: text(candidate.solution && candidate.solution.weaponId),
      locationId: text(candidate.solution && candidate.solution.locationId)
    }
  };
}

export function assertPlayMatchesCandidate(candidate) {
  const record = playContentRecord(candidate);
  const sameCard = (entity, card) => ['id', 'name', 'description', 'detail', 'icon']
    .every(key => card[key] === (typeof entity[key] === 'string' ? entity[key] : ''));
  const axes = ['suspects', 'weapons', 'locations'];
  const mismatch = record.id !== text(candidate.puzzleId || candidate.id) ||
    record.title !== text(candidate.title) || record.story !== text(candidate.story) ||
    record.difficulty !== difficultyOf(candidate.difficulty) ||
    axes.some(axis => (candidate[axis] || []).length !== record[axis].length ||
      (candidate[axis] || []).some((entity, index) => !sameCard(entity, record[axis][index]))) ||
    (candidate.clues || []).length !== record.clues.length ||
    (candidate.clues || []).some((clue, index) => {
      const copy = record.clues[index];
      return copy.id !== text(clue.id) || copy.text !== text(clue.text) ||
        copy.isBonus !== (clue.isBonus === true) || copy.deductionHint !== text(clue.deductionHint);
    }) ||
    record.solution.suspectId !== text(candidate.solution && candidate.solution.suspectId) ||
    record.solution.weaponId !== text(candidate.solution && candidate.solution.weaponId) ||
    record.solution.locationId !== text(candidate.solution && candidate.solution.locationId);
  if (mismatch) throw new Error('PLAY_CONTENT_MISMATCH');
  return record;
}

export function simulatorPayload(record) {
  const payload = {
    id: record.id, title: record.title, story: record.story,
    difficulty: DIFFICULTY_LABELS[record.difficulty] || record.difficulty,
    suspects: record.suspects, weapons: record.weapons, locations: record.locations,
    clues: record.clues.map(clue => ({
      id: clue.id, text: clue.text, type: TYPE_LABELS[clue.type] || 'kanit',
      isBonus: clue.isBonus, deductionHint: clue.deductionHint
    })),
    solution: record.solution
  };
  assertPayloadIsPlayerSafe(payload);
  return payload;
}

export function assertPayloadIsPlayerSafe(payload) {
  const seen = [];
  JSON.stringify(payload, (key, value) => { seen.push(key); return value; });
  if (BANNED_KEYS.some(key => seen.includes(key))) throw new Error('PLAY_QA_LEAK');
}

function playability(entry, record) {
  if (entry.tier !== 'standard')
    return ['Premium vaka bu önizlemede oynatılamaz. Mini oyun çalıştırılmaz.'];
  const gaps = [];
  for (const axis of ['suspects', 'weapons', 'locations'])
    if (!record[axis].length) gaps.push(`${axis} kartı yok.`);
  if (!record.solution.suspectId || !record.solution.weaponId || !record.solution.locationId)
    gaps.push('Çözüm kimliği eksik.');
  for (const clue of record.clues)
    if (clue.mechanicType !== 'text')
      gaps.push(`İpucu ${clue.id} mekaniği (${clue.mechanicType}) bu önizlemede çalışmıyor.`);
  return gaps;
}

function iconPath(icon) {
  if (typeof icon !== 'string') return null;
  const trimmed = icon.trim();
  if (trimmed.startsWith('pa:')) {
    const key = trimmed.slice(3);
    if (!/^[A-Za-z0-9_-]+$/.test(key)) return null;
    return { rel: `artifacts/dedektif/assets/images/puzzle_assets/${key}.png`, name: `${key}.png` };
  }
  if (/^noun-/i.test(trimmed) || /\.(png|webp|svg|jpe?g|gif)$/i.test(trimmed)) {
    const file = /\.(png|webp|svg|jpe?g|gif)$/i.test(trimmed) ? trimmed : `${trimmed}.svg`;
    if (file.includes('/') || file.includes('..')) return null;
    return { rel: `artifacts/dedektif/public/avatars/${file}`, name: file };
  }
  return null;
}

function readAsset(repo, contentSha, rel) {
  try {
    if (contentSha) return gitBytes(repo, contentSha, rel);
    const file = path.join(repo, rel);
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return null;
    return fs.readFileSync(file);
  } catch {
    return null;
  }
}

function materializeRoot(repo, policy, contentSha) {
  if (!contentSha) return { root: repo, cleanup() {} };
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fm-play-'));
  const overlay = new Set([policy.source.standard_path, policy.source.sidecar_path]);
  const files = [policy.source.standard_path, policy.source.premium_path, policy.source.sidecar_path,
    policy.source.inventory_path, policy.simulator.path];
  for (const rel of files) {
    const bytes = overlay.has(rel) ? gitBytes(repo, contentSha, rel) : fs.readFileSync(path.join(repo, rel));
    const dest = path.join(dir, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, bytes);
  }
  return { root: dir, cleanup() { fs.rmSync(dir, { recursive: true, force: true }); } };
}

export function buildPlaySite({ repo = repoRoot(), contentSha = null } = {}) {
  const policy = read(path.join(repo, '.case-qa', 'pipeline', 'policy.json'));
  if (contentSha) assertCommit(repo, contentSha);
  const commit = contentSha || execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim();
  const simulatorBytes = fs.readFileSync(path.join(repo, policy.simulator.path));
  const simulatorSha256 = sha256(simulatorBytes);
  const simulatorBlob = gitBlobSha(simulatorBytes);
  if (simulatorBlob !== policy.simulator.git_blob_sha) throw new Error('EXACT_HTML_HASH_MISMATCH');
  const materialized = materializeRoot(repo, policy, contentSha);
  const previous = process.cwd();
  let snapshot, rules;
  try {
    process.chdir(repo);
    snapshot = loadSnapshot(materialized.root, policy);
    rules = playerMatchingRules();
  } finally {
    process.chdir(previous);
    materialized.cleanup();
  }
  if (snapshot.simulatorHash !== policy.simulator.git_blob_sha) throw new Error('EXACT_HTML_HASH_MISMATCH');
  const cases = [];
  const assetFiles = new Map();
  const assetUrls = {};
  for (const entry of snapshot.entries) {
    const record = assertPlayMatchesCandidate(entry.candidate);
    const gaps = playability(entry, record);
    const contentHash = stableHash(record);
    const item = {
      id: record.id, title: record.title, tier: entry.tier, difficulty: record.difficulty,
      difficulty_label: DIFFICULTY_LABELS[record.difficulty] || record.difficulty,
      playable: gaps.length === 0, content_hash: contentHash, gaps
    };
    const closing = text(entry.candidate.solutionNarrative || entry.candidate.closingNarrative || entry.candidate.cozumAnlatimi);
    if (item.playable) {
      item.payload = simulatorPayload(record);
      if (closing && JSON.stringify(item.payload).includes(closing)) throw new Error('PLAY_CLOSING_LEAK');
      if (closing) item.closing = closing;
      for (const card of [...record.suspects, ...record.weapons, ...record.locations]) {
        const located = iconPath(card.icon);
        if (!located || Object.prototype.hasOwnProperty.call(assetUrls, card.icon)) continue;
        const bytes = readAsset(repo, contentSha, located.rel);
        if (!bytes) { assetUrls[card.icon] = null; continue; }
        const filename = `${sha256(bytes).slice(0, 12)}-${located.name}`;
        assetFiles.set(filename, bytes);
        assetUrls[card.icon] = `assets/${filename}`;
      }
    }
    cases.push(item);
  }
  const manifest = {
    schema: 'fm_play_preview_v1',
    approval: 'playtest_only',
    commit,
    content_source: contentSha ? 'commit' : 'worktree',
    simulator: {
      path: policy.simulator.path,
      git_blob_sha: simulatorBlob,
      sha256: simulatorSha256
    },
    matching_rules: rules,
    cases,
    assets: assetUrls
  };
  const html = injectShell(simulatorBytes.toString('utf8'), manifest);
  const client = fs.readFileSync(new URL('./play-client.js', import.meta.url));
  return { manifest, html, client, assetFiles, simulatorSha256, simulatorBlob };
}

function injectShell(html, manifest) {
  const at = html.lastIndexOf('</body>');
  if (at < 0) throw new Error('PLAY_HTML_BODY_MISSING');
  const json = JSON.stringify(manifest).replace(/</g, '\\u003c');
  const shell = `\n<script type="application/json" id="fm-play-manifest">${json}</script>\n<script src="play-client.js"></script>\n`;
  return html.slice(0, at) + shell + html.slice(at);
}

export function writePlaySite(dir, site) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(path.join(dir, 'assets'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), site.html);
  fs.writeFileSync(path.join(dir, 'play-client.js'), site.client);
  for (const [name, bytes] of site.assetFiles) fs.writeFileSync(path.join(dir, 'assets', name), bytes);
  return dir;
}

export function playPreviewPaths(caseIds) {
  return caseIds.map(id => '/oyna/?case=' + encodeURIComponent(id));
}
export function playPreviewBody(caseIds) {
  const links = playPreviewPaths(caseIds)
    .map(link => 'Simülatörde oyna: bu PR önizlemesinin adresine şu yolu ekle: ' + link).join('\n');
  return links + '\n\nSayfa, önizlemenin üretildiği commit’teki adayı yükler. main’deki eski vaka gösterilmez. Doğru tahmin kalite onayı, sertifika veya birleştirme değildir. Otomatik birleştirme yoktur.';
}

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif'
};
export function servePlaySite(dir, port) {
  const root = path.resolve(dir);
  const server = http.createServer((req, res) => {
    const url = new URL(req.url || '/', 'http://127.0.0.1');
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === '/' || pathname === '/oyna' || pathname === '/oyna/') pathname = '/oyna/index.html';
    if (!pathname.startsWith('/oyna/')) { res.writeHead(404); res.end(); return; }
    const rel = pathname.slice('/oyna/'.length);
    const target = path.resolve(root, rel);
    if (target !== root && !target.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
    if (!fs.existsSync(target) || !fs.statSync(target).isFile()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(target).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    if (req.method === 'HEAD') { res.end(); return; }
    fs.createReadStream(target).pipe(res);
  });
  server.listen(port, '0.0.0.0');
  return server;
}

function flag(args, name) {
  const index = args.indexOf(name);
  if (index < 0) return null;
  const value = args[index + 1];
  return value && !value.startsWith('--') ? value : true;
}

function main() {
  const args = process.argv.slice(2);
  const repo = repoRoot();
  const contentSha = flag(args, '--content-sha');
  const site = buildPlaySite({ repo, contentSha: contentSha === true ? null : contentSha });
  if (args.includes('--check')) {
    const tren = site.manifest.cases.find(item => item.id === 'tren-yolculugunda-cinayet');
    console.log(JSON.stringify({
      commit: site.manifest.commit, simulator_sha256: site.simulatorSha256,
      playable: site.manifest.cases.filter(item => item.playable).length,
      tren_playable: Boolean(tren && tren.playable),
      tren_content_hash: tren && tren.content_hash
    }, null, 2));
    return;
  }
  const dir = args.includes('--write-public')
    ? path.join(repo, 'artifacts', 'dedektif', 'public', 'oyna')
    : fs.mkdtempSync(path.join(os.tmpdir(), 'fm-play-site-'));
  writePlaySite(dir, site);
  if (args.includes('--serve')) {
    const port = Number(flag(args, '--port') || 41731);
    servePlaySite(dir, port);
    console.log(JSON.stringify({ url: `http://127.0.0.1:${port}/oyna/`, commit: site.manifest.commit, dir }));
    return;
  }
  if (!args.includes('--write-public')) console.log(dir);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
