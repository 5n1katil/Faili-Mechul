#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import { loadSnapshot, read } from './core.mjs';
import {
  applyLocalTextRevision, assessLocalTextRevision, patchPuzzleSource, playContentHash, sourceField
} from './local-text-revision.mjs';
import { buildPlaySite, playContentRecord, repoRoot } from './play-preview.mjs';

const repo = repoRoot(path.dirname(new URL(import.meta.url).pathname));
const policy = read(path.join(repo, '.case-qa/pipeline/policy.json'));
const puzzlesPath = path.join(repo, policy.source.standard_path);
const LABEL = 'Yerel düzenleme — yeniden değerlendirilmedi';

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

test('Tren c2 wording can be checked and applied without treating it as approved', () => {
  const beforeHash = sha256(puzzlesPath);
  const site = buildPlaySite({ repo });
  const snapshot = loadSnapshot(repo, policy);
  const entry = snapshot.entries.find(item => item.id === 'tren-yolculugunda-cinayet');
  const preview = site.manifest.cases.find(item => item.id === entry.id);
  const closing = entry.candidate.solutionNarrative || '';
  const contentHash = playContentHash(playContentRecord(entry.candidate), closing);
  assert.equal(preview.content_hash, contentHash);
  assert.equal(JSON.stringify(preview.payload).includes(closing), false);
  const shipped = 'Cinayet masası, ölümün çay servisi yapılan beyaz örtülü masaların bulunduğu salonda gerçekleştiğini kesinleştirdi; servis personeli vardiya dökümü ise tek hamlede derin yara açan çakı bıçağının bu salonda asla yer almadığını belgeledi.';
  const shippedClosing = 'Gece ekspresi sisin içinden istasyona yaklaşırken, yemekli vagondaki ölümün ardındaki gerçek ortaya çıktı. Emekli Doktor, çay servisinin yapıldığı salonda kurbanın bardağına zehirli sıvıyı damlatmıştı. Evrak çantasından düşen çakı şüpheleri telaşlı yolcuya çekse de bu bıçak cinayet yerinde bulunmamıştı. Mandallı kabinde unutulan naylon kordon ve orada görülen kulaklıklı genç ise soruşturmanın diğer parçalarını tamamladı. Silahlarla yolcular arasındaki bağlantılar kurulduğunda geriye tek bir eşleşme kaldı: yemekli vagon, zehirli içecek ve Emekli Doktor. Tren perona yanaşırken, yolculuk bitmeden çözülmesi gereken sır artık aydınlanmıştı.';
  assert.equal(sourceField(entry.candidate, 'clues.c2.text'), shipped);
  assert.equal(closing, shippedClosing);
  assert.equal(JSON.stringify(preview.payload).includes(shippedClosing), false);
  assert.deepEqual(entry.candidate.clues.find(clue => clue.id === 'c2').logicRules, [{ action: 'eliminate', pair: ['w2', 'l2'] }]);
  const before = sourceField(entry.candidate, 'clues.c2.text');
  const after = before.replace('servis personeli', 'servis ekibi');
  assert.notEqual(after, before);
  assert.match(after, /çakı bıçağının bu salonda asla yer almadığını/);
  assert.equal(/çakı[\s\S]*bulundu/.test(after), false);
  assert.equal(after.includes('kompartıman'), false);
  assert.equal(after.includes('tuvalet'), false);
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim();
  const identity = { root: repo, case_id: entry.id, commit: head, content_hash: contentHash };
  const revision = {
    schema: 'fm_local_text_revision_v1',
    approval: 'not_reviewed',
    logic_safety: 'not_assessed',
    publication: 'not_performed',
    case_id: entry.id,
    commit: head,
    content_hash: contentHash,
    changes: [{ path: 'clues.c2.text', before, after }]
  };
  const applied = applyLocalTextRevision(entry.candidate, revision, identity);
  assert.equal(applied.status, 'applicable_unreviewed');
  assert.equal(applied.applied, true);
  assert.equal(applied.approval, 'not_reviewed');
  assert.equal(applied.logic_safety, 'not_assessed');
  assert.equal(applied.publication, 'not_performed');
  const original = entry.candidate.clues.find(clue => clue.id === 'c2');
  const next = applied.candidate.clues.find(clue => clue.id === 'c2');
  assert.equal(next.text, after);
  assert.match(next.text, /bu salonda asla yer almadığını/);
  assert.equal(next.isBonus, original.isBonus);
  assert.equal(next.deductionHint, original.deductionHint);
  assert.deepEqual(next.logicRules, original.logicRules);
  assert.deepEqual(applied.candidate.solution, entry.candidate.solution);
  assert.equal(applied.candidate.story, entry.candidate.story);
  const source = fs.readFileSync(puzzlesPath, 'utf8');
  const patched = patchPuzzleSource(source, entry.id, revision.changes);
  assert.equal(sha256(puzzlesPath), beforeHash);
  assert.equal(patched.includes(after), true);
  assert.equal(patched.includes(before), false);
  assert.match(patched, /çakı bıçağının bu salonda asla yer almadığını/);
  const wrongText = { ...revision, changes: [{ path: 'clues.c2.text', before: before + ' değil', after }] };
  assert.equal(assessLocalTextRevision(entry.candidate, wrongText, identity).status, 'refused');
  assert.equal(assessLocalTextRevision(entry.candidate, wrongText, identity).failures.includes('OLD_TEXT_MISMATCH'), true);
  assert.throws(() => patchPuzzleSource(source, entry.id, wrongText.changes), /OLD_TEXT_MISMATCH/);
  const wrongHash = { ...revision, content_hash: 'ab'.repeat(32) };
  assert.deepEqual(assessLocalTextRevision(entry.candidate, wrongHash, identity).failures, ['SOURCE_HASH']);
  const wrongCommit = { ...revision, commit: 'a'.repeat(40) };
  assert.equal(assessLocalTextRevision(entry.candidate, wrongCommit, identity).failures.includes('SOURCE_COMMIT'), true);
  const claimed = { ...revision, approval: 'approved', logic_safety: 'safe' };
  const claim = assessLocalTextRevision(entry.candidate, claimed, identity);
  assert.equal(claim.failures.includes('APPROVAL_CLAIM'), true);
  assert.equal(claim.failures.includes('LOGIC_CLAIM'), true);
  assert.equal(claim.publication, 'not_performed');
  for (const fieldPath of ['solution.suspectId', 'clues.c2.isBonus', 'clues.c2.logicRules', 'suspects.s1.id']) {
    const blocked = assessLocalTextRevision(entry.candidate, {
      ...revision, changes: [{ path: fieldPath, before, after }]
    }, identity);
    assert.equal(blocked.failures.includes('PATH_NOT_TEXT'), true, fieldPath);
    assert.equal(blocked.applied, undefined);
  }
  assert.throws(() => patchPuzzleSource(source, entry.id, [{ path: 'clues.c2.isBonus', before: 'false', after: 'true' }]), /PATH_NOT_TEXT/);
  const file = path.join(os.tmpdir(), 'fm-tren-c2-revision.json');
  fs.writeFileSync(file, JSON.stringify(revision));
  const checked = execFileSync(process.execPath, [path.join(repo, '.case-qa/pipeline/local-text-revision.mjs'), '--check', file], {
    cwd: repo, encoding: 'utf8'
  });
  assert.match(checked, /applicable_unreviewed/);
  assert.match(checked, /not_assessed/);
  assert.equal(checked.includes(entry.candidate.solution.suspectId), false);
  fs.writeFileSync(file, JSON.stringify(wrongHash));
  assert.throws(() => execFileSync(process.execPath, [path.join(repo, '.case-qa/pipeline/local-text-revision.mjs'), '--check', file], {
    cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']
  }), error => error.status === 2 && String(error.stdout).includes('SOURCE_HASH'));
  assert.equal(sha256(puzzlesPath), beforeHash);
  assert.equal(fs.readFileSync(new URL('./play-client.js', import.meta.url), 'utf8').includes('generativelanguage'), false);
  assert.equal(fs.readFileSync(new URL('./play-client.js', import.meta.url), 'utf8').includes('api.github.com'), false);
});

test('the preview editor keeps a hash-bound draft and exports only the changed text', async () => {
  const client = fs.readFileSync(new URL('./play-client.js', import.meta.url), 'utf8');
  const checker = fs.readFileSync(new URL('./local-text-revision.mjs', import.meta.url), 'utf8');
  const pattern = client.match(/const TEXT_PATH = (\/.+\/);/)[1];
  assert.equal(checker.includes('const TEXT_PATH = ' + pattern + ';'), true);
  assert.match(client, /Yerel düzenleme — yeniden değerlendirilmedi/);
  const { createContext, runInContext } = await import('node:vm');
  const id = 'tren-yolculugunda-cinayet';
  const contentHash = 'c'.repeat(64);
  const commit = 'b'.repeat(40);
  const before = 'Servis dökümü, çakı bıçağının bu salonda asla yer almadığını belgeledi.';
  const after = 'Vardiya dökümü, çakı bıçağının bu salonda asla yer almadığını belgeledi.';
  const copied = [];
  const confirms = [];
  const elements = new Map();
  class ClassList {
    constructor() { this.values = new Set(); }
    set(value) { this.values = new Set(String(value || '').split(/\s+/).filter(Boolean)); }
    contains(name) { return this.values.has(name); }
    add(...names) { for (const name of names) this.values.add(name); }
    remove(...names) { for (const name of names) this.values.delete(name); }
  }
  class El {
    constructor(tag) {
      this.tag = tag;
      this.id = '';
      this.classList = new ClassList();
      this.children = [];
      this.parentElement = null;
      this.style = { display: '' };
      this.hidden = false;
      this.value = '';
      this.type = '';
      this.name = '';
      this.checked = false;
      this.listeners = {};
      this._text = '';
      this._dataset = {};
    }
    set className(value) { this.classList.set(value); }
    get className() { return [...this.classList.values].join(' '); }
    get dataset() { return this._dataset; }
    set textContent(value) { this._text = String(value ?? ''); this.children = []; }
    get textContent() { return this._text + this.children.map(child => child.textContent).join(''); }
    get innerHTML() { return this._html ?? ''; }
    set innerHTML(value) { this._html = String(value ?? ''); }
    append(...nodes) { for (const node of nodes) this.appendChild(node); }
    prepend(node) {
      node.remove();
      node.parentElement = this;
      this.children.unshift(node);
      if (node.id) elements.set(node.id, node);
    }
    appendChild(node) {
      node.remove();
      node.parentElement = this;
      this.children.push(node);
      if (node.id) elements.set(node.id, node);
      return node;
    }
    after(node) {
      const parent = this.parentElement;
      const index = parent.children.indexOf(this);
      node.remove();
      node.parentElement = parent;
      parent.children.splice(index + 1, 0, node);
      if (node.id) elements.set(node.id, node);
    }
    remove() {
      if (this.id && elements.get(this.id) === this) elements.delete(this.id);
      if (!this.parentElement) return;
      this.parentElement.children = this.parentElement.children.filter(child => child !== this);
      this.parentElement = null;
    }
    addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
    setAttribute(name, value) { this[name] = value; }
    getAttribute(name) { return this[name] || ''; }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    querySelectorAll(selector) { return queryAll(this, selector); }
    closest(selector) {
      let node = this;
      while (node) {
        if (matchesSimple(node, selector)) return node;
        node = node.parentElement;
      }
      return null;
    }
    reset() {
      walk(this, el => {
        if (el.type === 'radio' || el.type === 'checkbox') el.checked = false;
        if (el.tag === 'textarea') el.value = '';
      });
    }
  }
  function walk(node, visit) {
    for (const child of node.children || []) { visit(child); walk(child, visit); }
  }
  function matchesSimple(el, selector) {
    if (selector.startsWith('#')) {
      const [itemId, ...classes] = selector.slice(1).split('.');
      return el.id === itemId && classes.every(name => el.classList.contains(name));
    }
    if (selector.startsWith('.')) return selector.slice(1).split('.').every(name => el.classList.contains(name));
    return el.tag === selector;
  }
  function matchesChain(el, chain) {
    if (!matchesSimple(el, chain.at(-1))) return false;
    let node = el.parentElement;
    for (let index = chain.length - 2; index >= 0; index -= 1) {
      while (node && !matchesSimple(node, chain[index])) node = node.parentElement;
      if (!node) return false;
      node = node.parentElement;
    }
    return true;
  }
  function queryAll(root, selector) {
    const found = [];
    for (const part of selector.split(',').map(item => item.trim())) {
      const chain = part.split(/\s+/);
      walk(root, el => { if (matchesChain(el, chain)) found.push(el); });
    }
    return found;
  }
  const document = {
    title: '', head: new El('head'), body: new El('body'), listeners: {},
    createElement(tag) { return new El(tag); },
    createTextNode(text) { const node = new El('#text'); node.textContent = text; return node; },
    getElementById(itemId) { return elements.get(itemId) || null; },
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; },
    querySelectorAll(selector) { return queryAll({ children: [this.head, this.body] }, selector); },
    addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  };
  function mount(itemId, tag, className) {
    const node = document.createElement(tag);
    node.id = itemId;
    if (className) node.className = className;
    document.body.appendChild(node);
    elements.set(itemId, node);
    return node;
  }
  mount('fm-play-manifest', 'script');
  mount('wrap', 'div', 'wrap');
  const game = mount('game', 'div');
  mount('jsonIn', 'textarea');
  const err = mount('err', 'p');
  err.style.display = 'none';
  const sol = mount('solBox', 'div', 'sol');
  mount('ptResult', 'div');
  mount('penaltyTracker', 'p');
  const modal = mount('entModal', 'div');
  const modalBox = document.createElement('div');
  modalBox.className = 'modal-box';
  modal.append(modalBox);
  const entry = {
    id, title: 'Tren', tier: 'standard', difficulty: 'dedektif', difficulty_label: 'Dedektif',
    playable: true, content_hash: contentHash, closing: 'Kapanış çözümü burada.',
    payload: {
      id, title: 'Tren', story: 'Gece treninde bir yolcu bulundu.',
      suspects: [{ id: 's1', name: 'İş Kadını', description: 'Evrak çantalı yolcu.' }],
      weapons: [], locations: [],
      clues: [{ id: 'c2', text: before, deductionHint: 'Hangi nesne bu salonda yoktu?', isBonus: false }],
      solution: { suspectId: 's3', weaponId: 'w1', locationId: 'l2' }
    }
  };
  document.getElementById('fm-play-manifest').textContent = JSON.stringify({
    commit, cases: [entry], simulator: { sha256: 'sim', git_blob_sha: 'blob' }, matching_rules: { statements: [] },
    assets: {}
  });
  const storage = new Map();
  storage.set('fm-play-draft:' + id + ':' + 'd'.repeat(64), JSON.stringify({
    schema: 'fm_local_text_draft_v1', case_id: id, content_hash: 'd'.repeat(64), commit,
    fields: { story: 'ESKİ TASLAK UYGULANMASIN' }
  }));
  storage.set('fm-play-draft:' + id + ':' + contentHash, JSON.stringify({
    schema: 'fm_local_text_draft_v1', case_id: id, content_hash: 'e'.repeat(64), commit,
    fields: { story: 'YANLIŞ HASH UYGULANMASIN' }
  }));
  const window = {
    confirm(message) { confirms.push(message); return confirmQueue.shift(); },
    loadCase() {
      const data = JSON.parse(document.getElementById('jsonIn').value);
      window.CASE = data;
      game.textContent = '';
      const olay = document.createElement('div');
      olay.className = 'olay';
      const story = document.createElement('div');
      story.className = 'story-copy';
      story.textContent = data.story;
      olay.append(story);
      game.append(olay);
      data.clues.forEach((clue, index) => {
        const card = document.createElement('div');
        card.id = 'clue' + index;
        card.className = 'clue';
        const body = document.createElement('div');
        body.className = 'clue-text';
        body.textContent = clue.text;
        card.append(body);
        if (clue.deductionHint) {
          const hint = document.createElement('div');
          hint.id = 'ded' + index;
          hint.textContent = clue.deductionHint;
          card.append(hint);
        }
        game.append(card);
      });
      window.OPENED_BONUS = new Set();
      window.TEST_PENALTY = 0;
      window.render();
    },
    render() {}, cycleCell() {}, unlock() {}, checkPlaytest() {},
    openEnt(cat, itemId) {
      modalBox.textContent = '';
      const section = document.createElement('div');
      section.className = 'modal-sec';
      const name = document.createElement('div');
      name.className = 'modal-lbl';
      name.textContent = 'Tanım';
      const paragraph = document.createElement('p');
      paragraph.textContent = window.CASE[cat].find(item => item.id === itemId).description;
      section.append(name, paragraph);
      modalBox.append(section);
    },
    closeEnt() { modalBox.textContent = ''; },
    setCell() {}, applyAutoCross() {}
  };
  const confirmQueue = [];
  const context = createContext({
    document, window, location: { search: '?case=' + id },
    localStorage: {
      getItem: key => storage.has(key) ? storage.get(key) : null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: key => storage.delete(key)
    },
    navigator: { clipboard: { writeText(text) { copied.push(text); return Promise.resolve(); } } },
    URLSearchParams, URL: { createObjectURL() { return 'blob:preview'; }, revokeObjectURL() {} },
    FormData, Blob, console, JSON, Number, Set, Math, Object, Array, String, Boolean,
    setTimeout, clearTimeout
  });
  context.globalThis = context;
  runInContext(client, context, { filename: 'play-client.js' });
  const story = () => document.querySelector('.story-copy').textContent;
  const clue = () => document.querySelector('.clue-text').textContent;
  assert.equal(story(), entry.payload.story);
  assert.equal(story().includes('ESKİ TASLAK'), false);
  assert.equal(story().includes('YANLIŞ HASH'), false);
  assert.equal(clue(), before);
  function findEdit(fieldPath) {
    let found = null;
    walk(document.body, el => { if (el.dataset && el.dataset.fmEdit === fieldPath) found = el; });
    return found;
  }
  function findText(label) {
    let found = null;
    walk(document.body, el => { if (el.tag === 'button' && el.textContent === label) found = el; });
    return found;
  }
  async function click(el) {
    assert.ok(el, 'button missing');
    const event = { target: el, preventDefault() {}, stopPropagation() {} };
    await Promise.all((el.listeners.click || []).map(fn => fn(event)));
  }
  assert.equal(findEdit('solution.suspectId'), null);
  assert.equal(findEdit('clues.c2.isBonus'), null);
  await click(findEdit('clues.c2.text'));
  const area = document.querySelector('textarea.fm-editor, .fm-editor textarea') || document.querySelector('.fm-editor').querySelector('textarea');
  assert.equal(area.value, before);
  area.value = '   ';
  await click(findText('Kaydet'));
  assert.match(document.getElementById('fm-play-draft-status').textContent, /boş bırakılamaz/);
  assert.equal(clue(), before);
  await click(findText('Vazgeç'));
  assert.equal(document.querySelector('.fm-editor'), null);
  await click(findEdit('clues.c2.text'));
  document.querySelector('.fm-editor textarea').value = after;
  await click(findText('Kaydet'));
  assert.equal(clue(), after);
  assert.match(clue(), /bu salonda asla yer almadığını/);
  assert.equal(document.getElementById('fm-play-draft-banner').textContent, LABEL);
  assert.match(document.body.textContent, new RegExp(LABEL));
  const saved = JSON.parse(storage.get('fm-play-draft:' + id + ':' + contentHash));
  assert.equal(saved.content_hash, contentHash);
  assert.equal(saved.case_id, id);
  assert.equal(saved.fields['clues.c2.text'], after);
  const played = JSON.parse(document.getElementById('jsonIn').value);
  assert.equal(played.clues[0].isBonus, false);
  assert.deepEqual(played.solution, entry.payload.solution);
  await click(findText('Değişiklikleri kopyala'));
  const pack = JSON.parse(copied.at(-1));
  assert.equal(pack.schema, 'fm_local_text_revision_v1');
  assert.equal(pack.approval, 'not_reviewed');
  assert.equal(pack.logic_safety, 'not_assessed');
  assert.equal(pack.publication, 'not_performed');
  assert.equal(pack.case_id, id);
  assert.equal(pack.commit, commit);
  assert.equal(pack.content_hash, contentHash);
  assert.deepEqual(pack.changes, [{ path: 'clues.c2.text', before, after }]);
  assert.equal(pack.solution, undefined);
  assert.equal(JSON.stringify(pack).includes('suspectId'), false);
  assert.equal(JSON.stringify(pack).includes('logicRules'), false);
  const checked = assessLocalTextRevision({
    id, story: entry.payload.story, clues: [{ id: 'c2', text: before, isBonus: false }]
  }, pack, { case_id: id, commit, content_hash: contentHash });
  assert.equal(checked.status, 'applicable_unreviewed');
  await click(findText('Yeniden başlat'));
  assert.equal(clue(), after);
  assert.equal(storage.has('fm-play:' + id + ':' + contentHash), false);
  assert.equal(JSON.parse(storage.get('fm-play-draft:' + id + ':' + contentHash)).fields['clues.c2.text'], after);
  await click(findEdit('clues.c2.text'));
  await click(findText('Alanı kaynak sürüme döndür'));
  assert.equal(clue(), before);
  assert.equal(document.getElementById('fm-play-draft-banner'), null);
  window.openEnt('suspects', 's1');
  await click(findEdit('suspects.s1.description'));
  document.querySelector('.fm-editor textarea').value = 'Saatine bakan telaşlı yolcu.';
  await click(findText('Kaydet'));
  window.openEnt('suspects', 's1');
  assert.equal(modalBox.querySelector('p').textContent, 'Saatine bakan telaşlı yolcu.');
  assert.equal(JSON.parse(document.getElementById('jsonIn').value).suspects[0].id, 's1');
  confirmQueue.push(false);
  await click(findText('Bütün yerel değişiklikleri sıfırla'));
  assert.match(confirms.at(-1), /Kaynağa yazılmaz/);
  assert.equal(JSON.parse(document.getElementById('jsonIn').value).suspects[0].description, 'Saatine bakan telaşlı yolcu.');
  confirmQueue.push(true);
  await click(findText('Bütün yerel değişiklikleri sıfırla'));
  assert.equal(storage.has('fm-play-draft:' + id + ':' + contentHash), false);
  assert.equal(JSON.parse(document.getElementById('jsonIn').value).suspects[0].description, 'Evrak çantalı yolcu.');
  sol.style.display = 'block';
  const reveal = document.createElement('button');
  reveal.textContent = 'Çözümü Göster (Spoiler)';
  game.append(reveal);
  const seen = { target: reveal, preventDefault() {}, stopPropagation() {} };
  for (const fn of game.listeners.click || []) fn(seen);
  for (const fn of document.listeners.click || []) fn(seen);
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.match(document.getElementById('fm-play-closing').textContent, /Kapanış çözümü/);
  const state = JSON.parse(storage.get('fm-play:' + id + ':' + contentHash));
  assert.equal(state.spoiler_fields.includes('closing'), true);
  assert.equal(state.solution_revealed, true);
  await click(findEdit('closing'));
  document.querySelector('.fm-editor textarea').value = 'Kapanış çözümü yeniden yazıldı.';
  await click(findText('Kaydet'));
  copied.length = 0;
  await click(findText('Değişiklikleri kopyala'));
  const closingPack = JSON.parse(copied.at(-1));
  assert.deepEqual(closingPack.changes.map(change => change.path), ['closing']);
  assert.equal(JSON.stringify(closingPack).includes('suspectId'), false);
  assert.equal(closingPack.approval, 'not_reviewed');
});
