'use strict';
/* ============================================================================
 * LLM ISTEMCISI
 * Varsayilan saglayici: Google Gemini (responseSchema ile yapisal cikti).
 * Ikinci saglayici: OpenAI uyumlu uc nokta (strict json_schema).
 *
 * Arastirmadan gelen ve buraya yansitilan zorunlu onlemler:
 *  - finish_reason / truncation AYRI bir hata olarak ele alinir (yoksa ayni
 *    kesik cevap icin sonsuz retry yapilir),
 *  - dusunme (thinking) butcesi sinirlanir; dusunme tokenlari cikti
 *    fiyatindan faturalanir,
 *  - 429/5xx icin ustel geri cekilme,
 *  - her cagrinin token kullanimi kaydedilir (gercek maliyet raporu icin).
 * ==========================================================================*/

const DEFAULTS = {
  gemini: {
    model: process.env.FM_MODEL || 'gemini-flash-lite-latest',
    endpoint: m => `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`,
    maxOutputTokens: 16384,
    thinkingBudget: Number(process.env.FM_THINKING_BUDGET || 2048)
  },
  openai: {
    model: process.env.FM_MODEL || 'gpt-5-mini',
    endpoint: process.env.FM_OPENAI_BASE || 'https://api.openai.com/v1/chat/completions',
    maxOutputTokens: 16384
  }
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

class TruncationError extends Error {
  constructor(msg) { super(msg); this.name = 'TruncationError'; this.truncated = true; }
}

async function postJson(url, headers, body, { retries = 4 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
      if (res.status === 429 || res.status >= 500) {
        const wait = Math.min(60000, 2000 * Math.pow(2, attempt)) + Math.floor(Math.random() * 1000);
        lastErr = new Error(`HTTP ${res.status}`);
        if (attempt < retries) { await sleep(wait); continue; }
      }
      const text = await res.text();
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 500)}`);
      return JSON.parse(text);
    } catch (e) {
      lastErr = e;
      if (attempt < retries) { await sleep(Math.min(60000, 2000 * Math.pow(2, attempt))); continue; }
    }
  }
  throw lastErr || new Error('istek basarisiz');
}

/* Gemini: responseSchema ile sema zorlamasi. */
async function callGemini({ systemText, userText, schema, apiKey, cfg }) {
  const body = {
    systemInstruction: { parts: [{ text: systemText }] },
    contents: [{ role: 'user', parts: [{ text: userText }] }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: cfg.maxOutputTokens,
      responseMimeType: 'application/json',
      responseSchema: schema
    }
  };
  if (cfg.thinkingBudget >= 0) {
    body.generationConfig.thinkingConfig = { thinkingBudget: cfg.thinkingBudget };
  }
  const json = await postJson(
    cfg.endpoint(cfg.model) + '?key=' + encodeURIComponent(apiKey),
    { 'Content-Type': 'application/json' },
    body
  );
  const cand = (json.candidates || [])[0];
  if (!cand) throw new Error('Gemini bos yanit dondu: ' + JSON.stringify(json).slice(0, 300));
  const finish = String(cand.finishReason || '');
  const parts = ((cand.content || {}).parts || []).map(p => p.text || '').join('');
  if (finish === 'MAX_TOKENS') throw new TruncationError('Cikti maxOutputTokens sinirinda kesildi.');
  if (!parts) throw new Error('Gemini metin dondurmedi (finishReason=' + finish + ')');
  const usage = json.usageMetadata || {};
  return {
    text: parts,
    usage: {
      input: usage.promptTokenCount || 0,
      output: usage.candidatesTokenCount || 0,
      thinking: usage.thoughtsTokenCount || 0,
      total: usage.totalTokenCount || 0
    }
  };
}

/* OpenAI uyumlu: strict json_schema. */
async function callOpenAI({ systemText, userText, schema, apiKey, cfg }) {
  const body = {
    model: cfg.model,
    messages: [
      { role: 'system', content: systemText },
      { role: 'user', content: userText }
    ],
    response_format: { type: 'json_schema', json_schema: { name: 'repaired_case', strict: true, schema } },
    max_completion_tokens: cfg.maxOutputTokens
  };
  const json = await postJson(cfg.endpoint, {
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + apiKey
  }, body);
  const choice = (json.choices || [])[0];
  if (!choice) throw new Error('OpenAI bos yanit: ' + JSON.stringify(json).slice(0, 300));
  if (choice.finish_reason === 'length') throw new TruncationError('Cikti token sinirinda kesildi.');
  const content = (choice.message || {}).content || '';
  if (!content) throw new Error('OpenAI icerik dondurmedi (finish_reason=' + choice.finish_reason + ')');
  const u = json.usage || {};
  return {
    text: content,
    usage: { input: u.prompt_tokens || 0, output: u.completion_tokens || 0, thinking: 0, total: u.total_tokens || 0 }
  };
}

async function callModel(opts) {
  const provider = (process.env.FM_PROVIDER || 'gemini').toLowerCase();
  if (provider === 'gemini') {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error('GEMINI_API_KEY tanimli degil.');
    return callGemini({ ...opts, apiKey: key, cfg: DEFAULTS.gemini });
  }
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY tanimli degil.');
  return callOpenAI({ ...opts, apiKey: key, cfg: DEFAULTS.openai });
}

module.exports = { callModel, TruncationError, DEFAULTS };
