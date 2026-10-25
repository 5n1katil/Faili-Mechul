import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  BONUS_OPEN_SECONDS, BONUS_POINT_COST, BUNDLED_BONUS_CONFIRM, applyBonusOpen,
  bonusOpenPlan, bonusScoreNote, bonusUnlockCopy, resumeSavedGame
} from './bonus-penalty.mjs';

const CLUES = [
  { id: 'c1' }, { id: 'c2' }, { id: 'c3' }, { id: 'c4' },
  { id: 'c5', isBonus: true },
  { id: 'c6', isBonus: true }
];

function open(target, state) {
  const plan = bonusOpenPlan({ clues: CLUES, targetIndex: target, revealed: state.revealed });
  if (!plan.indices.length) return { plan, state };
  const next = applyBonusOpen({
    seconds: plan.seconds,
    timeElapsed: state.timeElapsed,
    bonusPenaltySeconds: state.bonusPenaltySeconds,
    alreadyOpened: state.revealed.filter(index => CLUES[index]?.isBonus).length
  });
  return {
    plan,
    state: {
      revealed: [...state.revealed, ...plan.indices],
      timeElapsed: next.timeElapsed,
      bonusPenaltySeconds: next.bonusPenaltySeconds
    }
  };
}

test('the light bonus is +30s and the strong bonus is +60s only after it', () => {
  let state = { revealed: [], timeElapsed: 100, bonusPenaltySeconds: undefined };
  const light = open(4, state);
  assert.equal(light.plan.bundled, false);
  assert.deepEqual(light.plan.indices, [4]);
  assert.equal(light.plan.seconds, 30);
  assert.equal(light.plan.pointCount, 1);
  state = light.state;
  const again = bonusOpenPlan({ clues: CLUES, targetIndex: 4, revealed: state.revealed });
  assert.deepEqual(again.indices, []);
  const strong = open(5, state);
  assert.equal(strong.plan.bundled, false);
  assert.deepEqual(strong.plan.indices, [5]);
  assert.equal(strong.plan.seconds, 60);
  assert.equal(strong.plan.pointCount, 1);
  assert.equal(strong.state.timeElapsed, 190);
  assert.equal(strong.state.bonusPenaltySeconds, 90);
  assert.deepEqual(strong.state.revealed, [4, 5]);
  assert.deepEqual(BONUS_OPEN_SECONDS, [30, 60]);
});

test('pressing the strong bonus first opens both helps for +90s and two deductions', () => {
  const direct = open(5, { revealed: [], timeElapsed: 100, bonusPenaltySeconds: undefined });
  assert.equal(direct.plan.bundled, true);
  assert.deepEqual(direct.plan.indices, [4, 5]);
  assert.equal(direct.plan.seconds, 90);
  assert.equal(direct.plan.pointCount, 2);
  assert.equal(direct.state.timeElapsed, 190);
  assert.equal(direct.state.bonusPenaltySeconds, 90);
  assert.equal(direct.plan.pointCount * BONUS_POINT_COST, 600);
  const copy = bonusUnlockCopy({ tier: 'strong', lightOpen: false });
  assert.equal(copy.message, BUNDLED_BONUS_CONFIRM);
  assert.match(copy.message, /İki yardımı aç: toplam \+90 saniye ve iki bonusun puan kesintisi/);
  assert.equal(copy.chargeSeconds, 90);
  assert.equal(copy.pointCount, 2);
  const light = bonusUnlockCopy({ tier: 'light', lightOpen: false });
  assert.equal(light.seconds, 30);
  assert.equal(light.bundled, false);
  assert.match(light.message, /\+30 saniye/);
  const later = bonusUnlockCopy({ tier: 'strong', lightOpen: true });
  assert.equal(later.seconds, 60);
  assert.equal(later.chargeSeconds, 60);
  assert.match(later.message, /toplam süre cezası \+90 saniye/i);
  assert.match(later.message, /300 puan/);
});

test('reopening, restoring and a legacy cheap strong open do not reprice', () => {
  const opened = open(4, { revealed: [], timeElapsed: 40, bonusPenaltySeconds: undefined });
  const saved = resumeSavedGame({
    revealed: opened.state.revealed,
    timeElapsed: opened.state.timeElapsed,
    bonusPenaltySeconds: opened.state.bonusPenaltySeconds
  });
  const restored = resumeSavedGame(saved);
  assert.equal(restored.timeElapsed, 70);
  assert.equal(restored.bonusPenaltySeconds, 30);
  assert.deepEqual(restored.revealed, [4]);
  const legacy = resumeSavedGame({ revealed: [5], timeElapsed: 200 });
  assert.equal(legacy.timeElapsed, 200);
  assert.equal(legacy.bonusPenaltySeconds, undefined);
  const lightAfterLegacyStrong = open(4, { revealed: [5], timeElapsed: 200, bonusPenaltySeconds: undefined });
  assert.deepEqual(lightAfterLegacyStrong.plan.indices, [4]);
  assert.equal(lightAfterLegacyStrong.plan.seconds, 30);
  assert.equal(lightAfterLegacyStrong.state.timeElapsed, 230);
  assert.equal(lightAfterLegacyStrong.state.bonusPenaltySeconds, 60);
  const fresh = bonusScoreNote(2, 90);
  assert.match(fresh, /2 × 300 = 600/);
  assert.match(fresh, /\+90 sn/);
  assert.match(fresh, /900 puan/);
  const oldSave = bonusScoreNote(1, undefined);
  assert.match(oldSave, /geriye dönük değiştirilmez/);
  assert.equal(bonusScoreNote(0, 30), '');
});

test('the app and the preview client share the tier schedule, not the open count', () => {
  const app = fs.readFileSync(new URL('../../artifacts/dedektif/utils/bonusPenalty.ts', import.meta.url), 'utf8');
  const client = fs.readFileSync(new URL('./play-client.js', import.meta.url), 'utf8');
  const game = fs.readFileSync(new URL('../../artifacts/dedektif/context/GameContext.tsx', import.meta.url), 'utf8');
  assert.match(app, /BONUS_OPEN_SECONDS = \[30, 60\]/);
  assert.match(app, /İki yardımı aç: toplam \+90 saniye ve iki bonusun puan kesintisi/);
  assert.match(client, /İki yardımı aç: toplam \+90 saniye ve iki bonusun puan kesintisi/);
  assert.equal(client.includes('already <= 0 ? 30 : 60'), false);
  assert.match(client, /pointCost = 0/);
  assert.match(client, /seconds: 30/);
  assert.match(client, /seconds: 60/);
  assert.match(client, /pointCost = step\.seconds/);
  assert.match(client, /bonus_penalty_seconds/);
  assert.match(game, /bonusOpenPlan/);
  assert.match(game, /plan\.indices/);
  const screen = fs.readFileSync(new URL('../../artifacts/dedektif/components/ResultScreen.tsx', import.meta.url), 'utf8');
  const share = screen.slice(screen.indexOf('function buildShareText'), screen.indexOf('const CONFETTI_COLORS'));
  assert.equal(share.includes('solutionNarrative'), false);
  assert.equal(share.includes('closingNarrative'), false);
  assert.match(screen, /puzzle\.solutionNarrative/);
});

test('the preview unlock charges the strong bonus as both helps and keeps a legacy save', async () => {
  const direct = await bootPreview();
  direct.confirmQueue.push(false);
  assert.match(direct.cost(4), /\+30 sn/);
  assert.match(direct.cost(5), /iki yardım \+90/);
  direct.window.unlock(5);
  assert.equal(direct.confirms[0].startsWith('İki yardımı aç: toplam +90 saniye ve iki bonusun puan kesintisi'), true);
  assert.equal(direct.window.TEST_PENALTY, 0);
  assert.equal(direct.locked(4), true);
  assert.equal(direct.locked(5), true);
  direct.confirmQueue.push(true);
  direct.window.unlock(5);
  assert.deepEqual(direct.charges, [30, 60]);
  assert.equal(direct.window.TEST_PENALTY, 90);
  assert.equal(direct.locked(4), false);
  assert.equal(direct.locked(5), false);
  const ordered = await bootPreview();
  ordered.confirmQueue.push(true, true);
  ordered.window.unlock(4);
  ordered.window.unlock(5);
  assert.match(ordered.confirms[0], /hafif yardım süreye \+30 saniye/i);
  assert.match(ordered.confirms[1], /güçlü yardım süreye \+60 saniye/i);
  assert.deepEqual(ordered.charges, [30, 60]);
  assert.equal(ordered.window.TEST_PENALTY, 90);
  const legacy = await bootPreview({
    bonuses: ['c6'],
    bonus_penalty_seconds: undefined
  });
  assert.equal(legacy.window.TEST_PENALTY, 30);
  assert.equal(legacy.locked(4), true);
  assert.equal(legacy.locked(5), false);
  assert.deepEqual(legacy.charges, []);
  legacy.confirmQueue.push(true);
  legacy.window.unlock(4);
  assert.deepEqual(legacy.charges, [30]);
  assert.equal(legacy.window.TEST_PENALTY, 60);
});

async function bootPreview(saved) {
  const { createContext, runInContext } = await import('node:vm');
  const confirms = [];
  const confirmQueue = [];
  const charges = [];
  const elements = new Map();
  class ClassList {
    constructor(el) { this.el = el; this.values = new Set(); }
    set(value) { this.values = new Set(String(value || '').split(/\s+/).filter(Boolean)); }
    contains(name) { return this.values.has(name); }
    add(...names) { for (const name of names) this.values.add(name); }
    remove(...names) { for (const name of names) this.values.delete(name); }
  }
  class El {
    constructor(tag) {
      this.tag = tag;
      this.id = '';
      this.classList = new ClassList(this);
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
    }
    set className(value) { this.classList.set(value); }
    get className() { return [...this.classList.values].join(' '); }
    set textContent(value) {
      this._text = String(value ?? '');
      this.children = [];
    }
    get textContent() {
      return this._text + this.children.map(child => child.textContent).join('');
    }
    get innerHTML() { return this._html ?? ''; }
    set innerHTML(value) { this._html = String(value ?? ''); }
    append(...nodes) { for (const node of nodes) this.appendChild(node); }
    prepend(...nodes) {
      for (const node of nodes.reverse()) {
        node.remove();
        node.parentElement = this;
        this.children.unshift(node);
        if (node.id) elements.set(node.id, node);
      }
    }
    appendChild(node) {
      node.remove();
      node.parentElement = this;
      this.children.push(node);
      if (node.id) elements.set(node.id, node);
      return node;
    }
    remove() {
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
  }
  function walk(node, visit) {
    for (const child of node.children || []) { visit(child); walk(child, visit); }
  }
  function matchesSimple(el, selector) {
    if (selector.startsWith('#')) {
      const [id, ...classes] = selector.slice(1).split('.');
      return el.id === id && classes.every(name => el.classList.contains(name));
    }
    if (selector.startsWith('.')) return selector.slice(1).split('.').every(name => el.classList.contains(name));
    const named = selector.match(/^\[name="(.*)"\]$/);
    if (named) return el.name === named[1];
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
    title: '',
    head: new El('head'),
    body: new El('body'),
    createElement(tag) { return new El(tag); },
    createTextNode(text) {
      const node = new El('#text');
      node.textContent = text;
      return node;
    },
    getElementById(id) { return elements.get(id) || null; },
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; },
    querySelectorAll(selector) { return queryAll({ children: [this.head, this.body] }, selector); },
    addEventListener() {}
  };
  function mount(id, tag, className) {
    const node = document.createElement(tag);
    node.id = id;
    if (className) node.className = className;
    document.body.appendChild(node);
    elements.set(id, node);
    return node;
  }
  mount('fm-play-manifest', 'script');
  mount('wrap', 'div', 'wrap');
  const game = mount('game', 'div');
  mount('jsonIn', 'textarea');
  const err = mount('err', 'p');
  err.style.display = 'none';
  mount('solBox', 'div');
  mount('ptResult', 'div');
  mount('penaltyTracker', 'p');
  const entry = {
    id: 'tren-yolculugunda-cinayet',
    title: 'Tren Yolculuğunda Cinayet',
    tier: 'standard',
    difficulty: 'dedektif',
    difficulty_label: 'Dedektif',
    playable: true,
    content_hash: 'abc123',
    closing: 'Kapanış oyuncu paketine girmez.',
    payload: {
      clues: [
        { id: 'c1' }, { id: 'c2' }, { id: 'c3' }, { id: 'c4' },
        { id: 'c5', isBonus: true }, { id: 'c6', isBonus: true }
      ]
    }
  };
  document.getElementById('fm-play-manifest').textContent = JSON.stringify({
    commit: 'test', cases: [entry], simulator: { sha256: 'x', git_blob_sha: 'y' },
    matching_rules: { statements: [] }
  });
  const storage = new Map();
  if (saved) storage.set('fm-play:' + entry.id + ':' + entry.content_hash, JSON.stringify(saved));
  const window = {
    confirm(message) { confirms.push(message); return confirmQueue.shift(); },
    loadCase() {
      window.CASE = {
        clues: entry.payload.clues.map(clue => ({ ...clue }))
      };
      window.OPENED_BONUS = new Set();
      window.TEST_PENALTY = 0;
      for (const index of [4, 5]) {
        const clue = document.createElement('div');
        clue.id = 'clue' + index;
        clue.className = 'clue bonus locked';
        const cost = document.createElement('span');
        cost.className = 'cost';
        clue.append(cost);
        game.append(clue);
      }
    },
    render() {},
    cycleCell() {},
    unlock(index) {
      const clue = window.CASE.clues[index];
      if (!window.OPENED_BONUS.has(index)) {
        if (clue.pointCost) charges.push(clue.pointCost);
        window.TEST_PENALTY += Number(clue.pointCost || 30);
        window.OPENED_BONUS.add(index);
      }
      document.getElementById('clue' + index).classList.remove('locked');
    },
    checkPlaytest() {},
    openEnt() {},
    setCell() {},
    applyAutoCross() {}
  };
  const context = createContext({
    document, window, location: { search: '?case=' + entry.id },
    localStorage: {
      getItem: key => storage.has(key) ? storage.get(key) : null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: key => storage.delete(key)
    },
    navigator: {}, URLSearchParams, URL, FormData, Blob, console, JSON, Number, Set, Math, Object, Array, String, Boolean,
    setTimeout, clearTimeout
  });
  context.globalThis = context;
  runInContext(fs.readFileSync(new URL('./play-client.js', import.meta.url), 'utf8'), context, { filename: 'play-client.js' });
  return {
    window, confirms, confirmQueue, charges,
    locked: index => document.getElementById('clue' + index).classList.contains('locked'),
    cost: index => document.getElementById('clue' + index).querySelector('.cost').textContent
  };
}
