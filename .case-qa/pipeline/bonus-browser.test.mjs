#!/usr/bin/env node
// Clicks the real simulator HTML. CASE, OPENED_BONUS and TEST_PENALTY stay
// top-level let bindings; this test never assigns window.CASE.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import test from 'node:test';
import { buildPlaySite, repoRoot, servePlaySite, writePlaySite } from './play-preview.mjs';

const repo = repoRoot(path.dirname(new URL(import.meta.url).pathname));
const CASE_ID = 'tren-yolculugunda-cinayet';
const CLOSING = 'yolculuk bitmeden çözülmesi gereken sır artık aydınlanmıştı';

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

async function waitFor(url, attempts = 50) {
  let last;
  for (let i = 0; i < attempts; i += 1) {
    try { return await fetch(url); }
    catch (error) { last = error; await new Promise(resolve => setTimeout(resolve, 100)); }
  }
  throw last;
}

function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let seq = 0;
  const pending = new Map();
  const listeners = [];
  const ready = new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve);
    ws.addEventListener('error', reject);
  });
  ws.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(JSON.stringify(message.error)));
      else resolve(message.result);
    } else if (message.method) {
      for (const listener of listeners) listener(message);
    }
  });
  return {
    ready,
    send(method, params = {}) {
      const id = ++seq;
      ws.send(JSON.stringify({ id, method, params }));
      return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
    },
    on(method, fn) { listeners.push(message => { if (message.method === method) fn(message.params); }); },
    close() { ws.close(); }
  };
}

async function evaluate(session, expression) {
  const result = await session.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'BROWSER_EXCEPTION');
  return result.result.value;
}

test('real HTML bonus buttons use the simulator lets and charge 30, 60 and 90', { timeout: 90000 }, async () => {
  const source = fs.readFileSync(new URL(import.meta.url), 'utf8');
  assert.equal(/window\.(?:CASE|OPENED_BONUS|TEST_PENALTY)\s*=[^=]/.test(source), false);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fm-bonus-browser-'));
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'fm-chrome-'));
  writePlaySite(dir, buildPlaySite({ repo }));
  const server = servePlaySite(dir, 0);
  const sitePort = await new Promise((resolve, reject) => {
    server.once('error', reject);
    if (server.listening) resolve(server.address().port);
    else server.once('listening', () => resolve(server.address().port));
  });
  const debugPort = await freePort();
  const chrome = spawn('google-chrome', [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage',
    `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profile}`, 'about:blank'
  ], { stdio: 'ignore', detached: true });
  let session;
  let browserSession;
  try {
    const version = await waitFor(`http://127.0.0.1:${debugPort}/json/version`);
    const browser = await version.json();
    browserSession = connect(browser.webSocketDebuggerUrl);
    await browserSession.ready;
    const created = await browserSession.send('Target.createTarget', {
      url: `http://127.0.0.1:${sitePort}/oyna/?case=${CASE_ID}`
    });
    const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
    const page = targets.find(item => item.id === created.targetId);
    session = connect(page.webSocketDebuggerUrl);
    await session.ready;
    await session.send('Page.enable');
    await session.send('Runtime.enable');
    let acceptDialog = false;
    session.on('Page.javascriptDialogOpening', () => {
      session.send('Page.handleJavaScriptDialog', { accept: acceptDialog }).catch(() => {});
    });
    const read = () => evaluate(session, `(() => ({
      bridge: ['CASE','OPENED_BONUS','TEST_PENALTY'].every(name => typeof Object.getOwnPropertyDescriptor(window, name).get === 'function'),
      penalty: window.TEST_PENALTY,
      tracker: document.getElementById('penaltyTracker') ? document.getElementById('penaltyTracker').textContent : '',
      locked4: document.getElementById('clue4').classList.contains('locked'),
      locked5: document.getElementById('clue5').classList.contains('locked'),
      cost4: (document.querySelector('#clue4 .cost') || {}).textContent || '',
      cost5: (document.querySelector('#clue5 .cost') || {}).textContent || '',
      c2: document.getElementById('clue1').innerText,
      closing: document.body.innerText.includes(${JSON.stringify(CLOSING)}),
      point4: Number(window.CASE.clues[4].pointCost || 0),
      point5: Number(window.CASE.clues[5].pointCost || 0)
    }))()`);
    await evaluate(session, `new Promise(resolve => { const timer = setInterval(() => {
      if (document.querySelector('#clue5 .lock-overlay')) { clearInterval(timer); resolve(true); }
    }, 50); })`);
    const initial = await read();
    assert.equal(initial.bridge, true);
    assert.equal(initial.locked4, true);
    assert.equal(initial.locked5, true);
    assert.equal(initial.penalty, 0);
    assert.match(initial.cost4, /\+30 sn/);
    assert.match(initial.cost5, /\+90/);
    assert.match(initial.c2, /çakı bıçağının bu salonda asla yer almadığını/);
    assert.equal(initial.c2.includes('servis personeli vardiya dökümü'), false);
    assert.equal(initial.c2.includes('tek hamlede derin yara açan'), false);
    assert.equal(initial.closing, false);
    acceptDialog = false;
    await evaluate(session, `document.querySelector('#clue5 .lock-overlay').click()`);
    const cancelled = await read();
    assert.equal(cancelled.locked4, true);
    assert.equal(cancelled.locked5, true);
    assert.equal(cancelled.penalty, 0);
    assert.match(cancelled.tracker, /0 sn/);
    acceptDialog = true;
    await evaluate(session, `document.querySelector('#clue5 .lock-overlay').click()`);
    const bundled = await read();
    assert.equal(bundled.locked4, false);
    assert.equal(bundled.locked5, false);
    assert.equal(bundled.penalty, 90);
    assert.equal(bundled.point4, 30);
    assert.equal(bundled.point5, 60);
    assert.match(bundled.tracker, /90 sn/);
    await evaluate(session, `[...document.querySelectorAll('button')].find(button => button.textContent === 'Yeniden başlat').click()`);
    const restarted = await read();
    assert.equal(restarted.locked4, true);
    assert.equal(restarted.locked5, true);
    assert.equal(restarted.penalty, 0);
    await evaluate(session, `document.querySelector('#clue4 .lock-overlay').click()`);
    const light = await read();
    assert.equal(light.locked4, false);
    assert.equal(light.locked5, true);
    assert.equal(light.penalty, 30);
    assert.equal(light.point4, 30);
    assert.match(light.tracker, /30 sn/);
    await session.send('Page.reload', { ignoreCache: true });
    await evaluate(session, `new Promise(resolve => { const timer = setInterval(() => {
      const card = document.getElementById('clue4');
      if (card && !card.classList.contains('locked') && Object.is(window.TEST_PENALTY, 30)) { clearInterval(timer); resolve(true); }
    }, 50); })`);
    const restored = await read();
    assert.equal(restored.locked4, false);
    assert.equal(restored.locked5, true);
    assert.equal(restored.penalty, 30);
    assert.match(restored.tracker, /30 sn/);
    assert.equal(restored.closing, false);
    await evaluate(session, `document.querySelector('#clue5 .lock-overlay').click()`);
    const both = await read();
    assert.equal(both.locked4, false);
    assert.equal(both.locked5, false);
    assert.equal(both.penalty, 90);
    assert.equal(both.point5, 60);
    assert.match(both.tracker, /90 sn/);
  } finally {
    await stopChrome(chrome, browserSession, session);
    server.close();
    fs.rmSync(dir, { recursive: true, force: true });
    removeTree(profile);
  }
});

function signalChrome(chrome, signal) {
  try {
    process.kill(-chrome.pid, signal);
  } catch {
    try { chrome.kill(signal); } catch { /* already exited */ }
  }
}

function chromeExited(chrome) {
  if (chrome.exitCode !== null || chrome.signalCode !== null) return Promise.resolve();
  return new Promise(resolve => {
    chrome.once('exit', () => resolve());
    if (chrome.exitCode !== null || chrome.signalCode !== null) resolve();
  });
}

async function stopChrome(chrome, browserSession, session) {
  if (session) {
    try { session.close(); } catch { /* socket already closed */ }
  }
  const exited = chromeExited(chrome);
  if (browserSession) {
    try { await browserSession.send('Browser.close'); } catch { /* browser already gone */ }
    try { browserSession.close(); } catch { /* socket already closed */ }
  }
  if (chrome.exitCode === null && chrome.signalCode === null) signalChrome(chrome, 'SIGTERM');
  const finished = (limit) => Promise.race([
    exited.then(() => true),
    new Promise(resolve => setTimeout(resolve, limit, false))
  ]);
  if (!(await finished(5000))) signalChrome(chrome, 'SIGKILL');
  if (!(await finished(5000))) throw new Error('CHROME_STILL_RUNNING');
}

function removeTree(target) {
  let last;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      fs.rmSync(target, { recursive: true, force: true });
      return;
    } catch (error) {
      last = error;
      if (error.code === 'ENOENT') return;
      if (!['ENOTEMPTY', 'EBUSY', 'EPERM'].includes(error.code)) throw error;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50 * (attempt + 1));
    }
  }
  throw last;
}
