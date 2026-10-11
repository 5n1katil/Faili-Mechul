'use strict';

const fs = require('fs');
const vm = require('vm');

const RESULT_SCHEMA_VERSION = 'fm_case_qa_result_v29_4';
const IDENTITY_SCHEMA_VERSION = 'fm_case_identity_guard_v1';

function deepClone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function browserStub() {
  const element = () => ({
    style: {},
    classList: { add() {}, remove() {}, toggle() {} },
    appendChild() {}, removeChild() {}, remove() {}, focus() {}, select() {},
    scrollIntoView() {}, insertAdjacentHTML() {}, setAttribute() {},
    querySelector() { return null; }, querySelectorAll() { return []; },
    getContext() { return null; },
    value: '', textContent: '', innerHTML: '', outerHTML: ''
  });
  const document = {
    body: element(),
    addEventListener() {},
    removeEventListener() {},
    getElementById() { return element(); },
    createElement() { return element(); },
    querySelector() { return element(); },
    querySelectorAll() { return []; },
    execCommand() { return true; }
  };
  const window = { scrollTo() {}, addEventListener() {}, removeEventListener() {}, document };
  return { document, window };
}

function extractSimulatorScript(html) {
  const matches = [...String(html).matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
  if (!matches.length) throw new Error('Simülatörde çalıştırılabilir <script> bloğu bulunamadı.');
  return matches.map(match => match[1]).join('\n');
}

function loadEngine(simulatorPath) {
  const html = fs.readFileSync(simulatorPath, 'utf8');
  const script = extractSimulatorScript(html);
  const { document, window } = browserStub();
  const context = {
    console,
    document,
    window,
    navigator: { clipboard: { writeText: async () => {} } },
    Blob: class Blob {},
    URL: { createObjectURL() { return 'blob:qa'; }, revokeObjectURL() {} },
    FileReader: class FileReader {},
    setTimeout() { return 0; },
    clearTimeout() {},
    prompt() { return null; },
    alert() {},
    atob(value) { return Buffer.from(String(value), 'base64').toString('binary'); },
    btoa(value) { return Buffer.from(String(value), 'binary').toString('base64'); }
  };
  context.globalThis = context;
  vm.createContext(context);
  const expose = `\n;globalThis.__FM_QA_API={
    normalize,
    computeQA,
    fmCaseTier,
    fmRequiresAdvancedMechanic,
    buildCanonicalProduction,
    buildReportText,
    strictCoreNecessityCheck,
    patternGovernanceCheck,
    contentDepthAndNameCheck,
    fmPatternProfile,
    fmProfileVector
  };`;
  new vm.Script(script + expose, { filename: simulatorPath }).runInContext(context, { timeout: 10000 });
  return context.__FM_QA_API;
}

function arrayAlias(source, names) {
  for (const name of names) if (Array.isArray(source && source[name])) return source[name];
  return [];
}

function entityId(entity, prefix, index) {
  return entity && typeof entity === 'object' ? String(entity.id || `${prefix}${index + 1}`) : `${prefix}${index + 1}`;
}

function entityName(entity) {
  if (typeof entity === 'string') return entity;
  return String((entity && (entity.name || entity.isim || entity.ad)) || '');
}

const IMMUTABLE_VISUAL_FIELDS = [
  'icon', 'avatar', 'avatarKey', 'avatarId', 'image', 'imageKey', 'imageId',
  'assetId', 'assetKey', 'sprite', 'spriteKey', 'visualType', 'visualIdentity',
  'appearance', 'gorunum', 'parmakIziDeseni', 'fp', 'fingerprint'
];

function comparableValue(value) {
  return value == null ? '' : JSON.stringify(value);
}

function classifyWeapon(name) {
  const n = String(name || '').toLocaleLowerCase('tr-TR');
  const groups = [
    ['knife', /bıçak|bıçağ|bıça|hançer|kama|neşter|sustalı/],
    ['firearm', /tabanca|revolver|tüfek|silah/],
    ['poison', /zehir|toksin|ilaç|şişe|afyon|arsenik|siyanür/],
    ['blunt', /çekiç|balta|sopa|levye|heykel|şamdan|ağırlık/],
    ['rope', /halat|ip|kordon|kemer|boğma/],
    ['scissors', /makas/],
    ['water', /su|deniz|boğul/]
  ];
  return (groups.find(([, rx]) => rx.test(n)) || [null])[0];
}

function classifyLocation(name) {
  const n = String(name || '').toLocaleLowerCase('tr-TR');
  const groups = [
    ['deck', /güverte|teras|iskele/],
    ['salon', /salon|oturma odası|lobi/],
    ['bridge', /kaptan köşkü|kumanda|köprüüstü/],
    ['bedroom', /yatak odası|kabin/],
    ['kitchen', /mutfak/],
    ['office', /ofis|çalışma odası|büro/],
    ['garden', /bahçe|koru|zeytinlik|bağ/],
    ['warehouse', /depo|ambar/],
    ['street', /sokak|cadde|meydan/]
  ];
  return (groups.find(([, rx]) => rx.test(n)) || [null])[0];
}

function resolveSolutionIds(raw) {
  const categories = [
    ['suspect', 'suspectId', ['suspects', 'supheliler'], 's'],
    ['weapon', 'weaponId', ['weapons', 'silahlar'], 'w'],
    ['location', 'locationId', ['locations', 'mekanlar'], 'l']
  ];
  const solution = (raw && (raw.solution || raw.cozum)) || {};
  const result = {};
  for (const [nameKey, idKey, aliases, prefix] of categories) {
    if (solution[idKey]) {
      result[nameKey] = String(solution[idKey]);
      continue;
    }
    const wanted = String(solution[nameKey] || (nameKey === 'suspect' ? solution.katil : '') || '');
    const entities = arrayAlias(raw, aliases);
    const index = entities.findIndex(entity => entityName(entity) === wanted);
    result[nameKey] = index >= 0 ? entityId(entities[index], prefix, index) : wanted;
  }
  return result;
}

function identityGuard(baseline, candidate) {
  if (!baseline) {
    return {
      schemaVersion: IDENTITY_SCHEMA_VERSION,
      status: 'not_compared',
      passed: true,
      identityReviewRequired: false,
      blockers: [],
      allowedTextChanges: []
    };
  }

  const blockers = [];
  const allowedTextChanges = [];
  const definitions = [
    { category: 'suspect', aliases: ['suspects', 'supheliler'], prefix: 's' },
    { category: 'weapon', aliases: ['weapons', 'silahlar'], prefix: 'w' },
    { category: 'location', aliases: ['locations', 'mekanlar'], prefix: 'l' }
  ];

  for (const def of definitions) {
    const before = arrayAlias(baseline, def.aliases);
    const after = arrayAlias(candidate, def.aliases);
    if (before.length !== after.length) {
      blockers.push(`${def.category}: varlık sayısı ${before.length} → ${after.length} değişti.`);
      continue;
    }
    const afterById = new Map(after.map((entity, index) => [entityId(entity, def.prefix, index), entity]));
    before.forEach((oldEntity, index) => {
      const id = entityId(oldEntity, def.prefix, index);
      const newEntity = afterById.get(id);
      if (!newEntity) {
        blockers.push(`${def.category}:${id}: kimlik/ID kaldırıldı veya değiştirildi.`);
        return;
      }
      const oldObject = typeof oldEntity === 'object' && oldEntity ? oldEntity : {};
      const newObject = typeof newEntity === 'object' && newEntity ? newEntity : {};
      for (const field of IMMUTABLE_VISUAL_FIELDS) {
        if (comparableValue(oldObject[field]) !== comparableValue(newObject[field])) {
          blockers.push(`${def.category}:${id}: görsel kimlik alanı '${field}' değişti.`);
        }
      }
      const oldName = entityName(oldEntity);
      const newName = entityName(newEntity);
      if (oldName !== newName) {
        const oldClass = def.category === 'weapon' ? classifyWeapon(oldName) : def.category === 'location' ? classifyLocation(oldName) : null;
        const newClass = def.category === 'weapon' ? classifyWeapon(newName) : def.category === 'location' ? classifyLocation(newName) : null;
        if (oldClass && newClass && oldClass !== newClass) {
          blockers.push(`${def.category}:${id}: ad düzeltmesi varlık sınıfını '${oldClass}' → '${newClass}' değiştirdi.`);
        } else {
          allowedTextChanges.push({ category: def.category, id, field: 'name', before: oldName, after: newName });
        }
      }
    });
  }

  const beforeSolution = resolveSolutionIds(baseline);
  const afterSolution = resolveSolutionIds(candidate);
  for (const key of ['suspect', 'weapon', 'location']) {
    if (beforeSolution[key] !== afterSolution[key]) {
      blockers.push(`solution.${key}: çözüm kimliği '${beforeSolution[key]}' → '${afterSolution[key]}' değişti.`);
    }
  }

  return {
    schemaVersion: IDENTITY_SCHEMA_VERSION,
    status: blockers.length ? 'blocked' : 'passed',
    passed: blockers.length === 0,
    identityReviewRequired: blockers.length > 0,
    blockers,
    allowedTextChanges
  };
}

function cleanList(value) {
  return Array.isArray(value) ? value.map(String) : [];
}

function sectionGate(section) {
  const flags = cleanList(section && section.flags);
  const warnings = cleanList(section && section.warnings);
  return { passed: flags.length === 0, flags, warnings };
}

function evaluateCase(engine, rawCase, options = {}) {
  const normalized = engine.normalize(deepClone(rawCase));
  const qa = engine.computeQA(normalized);
  const identity = identityGuard(options.baseline || null, rawCase);
  const simulatorReady = qa.productionReady === true;
  const productionReady = simulatorReady && identity.passed;
  const caseId = String(rawCase.puzzleId || rawCase.id || normalized.puzzleId || 'unknown_case');
  const blockers = [
    ...cleanList(qa.topFlags),
    ...identity.blockers.map(message => `KİMLİK KORUMASI: ${message}`)
  ];
  const result = {
    schemaVersion: RESULT_SCHEMA_VERSION,
    simulatorVersion: '29.4',
    caseId,
    title: String(rawCase.title || normalized.title || ''),
    caseTier: engine.fmCaseTier(normalized),
    advancedMechanicRequired: engine.fmRequiresAdvancedMechanic(normalized),
    patternSignature: deepClone(engine.fmProfileVector(engine.fmPatternProfile(normalized))),
    score: Number(qa.total || 0),
    status: productionReady ? 'production_ready' : (qa.statusClass === 'okimprove' ? 'improvement_required' : 'blocked'),
    statusLabel: qa.statusLabel,
    simulatorProductionReady: simulatorReady,
    productionReady,
    blockers,
    fixes: cleanList(qa.fixes),
    advisories: cleanList(qa.advisories),
    // These sections contribute to total and productionReady independently of
    // top-level fixes/advisories. Never hide them from the repair model.
    scoreBreakdown: Object.fromEntries(['k1', 'k2', 'k3', 'k4'].map((key, index) => [key, {
      score: Number(qa[key]?.score || 0), maximum: index === 0 ? 40 : 20,
      findings: cleanList(qa[key]?.findings)
    }])),
    qualityFindings: [...new Set([
      ...['k1', 'k2', 'k3', 'k4'].flatMap(key => cleanList(qa[key]?.findings))
        .filter(finding => /^(?:💡\s*)?TAVSİYE|^UYARI/i.test(finding)),
      ...cleanList(qa.literary?.warnings), ...cleanList(qa.consistency?.flags)
    ])],
    gates: {
      coreNecessity: sectionGate(qa.coreNecessity),
      patternGovernance: sectionGate(qa.patternGovernance),
      contentAndNames: sectionGate(qa.contentQuality),
      semanticContract: sectionGate(qa.semantic),
      visibleEvidence: sectionGate(qa.visibleEvidenceScope),
      mechanicContract: sectionGate(qa.mechanicContract),
      bonusFunctionality: {
        passed: Number(qa.k4 && qa.k4.score) >= 20,
        score: Number((qa.k4 && qa.k4.score) || 0),
        findings: cleanList(qa.k4 && qa.k4.findings)
      }
    },
    identityGuard: identity,
    metrics: {
      suspects: normalized.suspects.length,
      weapons: normalized.weapons.length,
      locations: normalized.locations.length,
      coreClues: normalized.clues.filter(clue => !clue.isBonus).length,
      bonusClues: normalized.clues.filter(clue => clue.isBonus).length
    }
  };
  if (options.includeNormalized) result.normalizedCase = deepClone(normalized);
  if (options.includeFullQa) result.fullQa = deepClone(qa);
  return result;
}

module.exports = {
  RESULT_SCHEMA_VERSION,
  IDENTITY_SCHEMA_VERSION,
  loadEngine,
  evaluateCase,
  identityGuard
};
