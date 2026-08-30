import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const clone = (value) => JSON.parse(JSON.stringify(value));
const digest = (value) => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const read = (file) => {
  if (!fs.existsSync(file) || fs.statSync(file).size > 4_000_000) return null;
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
};

// Prompt versions deliberately do not participate in this key. Every restored
// candidate is re-evaluated against today's exact engine and publication gates.
export function checkpointPath(directory, identity) {
  return path.join(directory, 'checkpoints', `${digest(identity)}.json`);
}

export function saveCheckpoint(directory, identity, candidate) {
  const file = checkpointPath(directory, identity);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify({ schema: 'fm_qa_checkpoint_v1', identity,
    candidate_hash: digest(candidate), candidate }));
  fs.renameSync(temporary, file);
}

export function readCheckpoint(directory, identity) {
  const record = read(checkpointPath(directory, identity));
  if (record?.schema !== 'fm_qa_checkpoint_v1' ||
      JSON.stringify(record.identity) !== JSON.stringify(identity) ||
      !record.candidate || record.candidate_hash !== digest(record.candidate)) return null;
  return record.candidate;
}

// Reconstruct old candidates from already-paid patches, not their claimed score.
// Each old version follows its own original chain; a rejected patch does not
// alter the input hash for that chain's next phase.
export function replayCachedRepairs({ directory, initial, versions, attempts, keyFor, apply, assess, better }) {
  let best = clone(initial);
  let bestAssessment = assess(best);
  let recovered = 0;
  for (const version of versions) {
    let current = clone(initial);
    let currentAssessment = assess(current);
    for (const attempt of attempts) {
      const key = keyFor(version, attempt, current);
      const record = read(path.join(directory, `${key}.json`));
      if (record?.key !== key || !record.plan) continue;
      try {
        const candidate = apply(current, record.plan);
        const evaluation = assess(candidate);
        recovered++;
        if (better(candidate, evaluation, current, currentAssessment)) {
          current = candidate;
          currentAssessment = evaluation;
        }
        if (better(current, currentAssessment, best, bestAssessment)) {
          best = clone(current);
          bestAssessment = currentAssessment;
        }
      } catch { /* Invalid legacy patches remain quarantined. */ }
    }
  }
  return { candidate: best, assessment: bestAssessment, recovered };
}

// This is a mechanical rendering of existing rules, never invented evidence.
export function normalizeRuleLabels(candidate) {
  const output = clone(candidate);
  const byId = new Map(['suspects', 'weapons', 'locations'].flatMap((field) =>
    (output[field] || []).map((item) => [String(item.id), { name: item.name, field }])));
  for (const clue of output.clues || []) {
    if (!clue.qaRationale || typeof clue.qaRationale !== 'object' || Array.isArray(clue.qaRationale)) continue;
    const rules = clue.logicRules;
    if (!Array.isArray(rules) || !rules.length || !rules.every((rule) =>
      ['confirm', 'eliminate'].includes(rule.action) && Array.isArray(rule.pair) && rule.pair.length === 2 &&
      rule.pair.every((id) => byId.get(String(id))?.name) &&
      byId.get(String(rule.pair[0])).field !== byId.get(String(rule.pair[1])).field)) continue;
    clue.qaRationale.matrixEffect = rules.map((rule) => {
      const names = rule.pair.map((id) => byId.get(String(id)).name);
      return rule.action === 'confirm' ? `${names[0]} ↔ ${names[1]} doğrulanır` : `${names[0]} ≠ ${names[1]} elenir`;
    }).join('; ');
  }
  return output;
}

export function rejectionFeedback({ phase, plan, assessment, completeness, contract, unsafe }) {
  const result = assessment.result;
  return {
    phase,
    attempted_paths: [...new Set((plan.operations || []).map((op) => op.path))],
    score: result.score,
    immutable_identity_rejected: unsafe,
    blockers: result.blockers,
    failed_gates: Object.fromEntries(Object.entries(result.gates || {}).filter(([, gate]) => gate.passed !== true)),
    fixes: result.fixes,
    advisories: result.advisories,
    missing_authoring: completeness.missing,
    authoring_errors: contract.errors,
    leakage: assessment.leakage.required_actions || []
  };
}

export function formatRunSummary(report) {
  const cell = (value) => String(value ?? '—').replace(/\|/g, '/').replace(/[\r\n]+/g, ' ');
  const lines = ['## Vaka onarım sonucu', '',
    `- Seçilen: ${report.summary.selected_cases}; yayın koşullarını geçen: ${report.summary.final_campaign_passed}.`,
    `- API çağrısı: ${report.summary.api_calls}; raporlanan maliyet: $${report.summary.actual_or_conservative_cost_usd}.`,
    '- En iyi aday puanı, uygulamaya yayınlandığı anlamına gelmez. Yayın kapısı ayrıca geçmelidir.', '',
    '| Vaka | Başlangıç | Geri yüklenen | En iyi aday | Yayın QA | Durum |',
    '|---|---:|---:|---:|---:|---|'];
  for (const row of report.cases) lines.push(`| ${cell(row.case_id)} | ${cell(row.baseline?.score)} | ${cell(row.recovery?.resumed_score)} | ${cell(row.best_candidate_result?.score ?? row.baseline?.score)} | ${cell(row.final_campaign?.result?.score)} | ${cell(row.status)} |`);
  if (report.summary.quarantined || report.summary.budget_stopped) {
    lines.push('', 'Başarısız vakalar yayınlanmadı. Yeniden ücretli çalıştırmadan önce aşağıdaki kalan bulguları inceleyin.');
    for (const row of report.cases.filter((item) => !item.final_campaign?.passed)) {
      const result = row.best_candidate_result || row.baseline || {};
      const findings = [...(result.blockers || []),
        ...Object.values(result.gates || {}).filter((gate) => !gate.passed).flatMap((gate) => gate.flags || gate.findings || []),
        ...(result.advisories || []).filter((item) => !/^[✓ⓘ]/.test(item))];
      lines.push('', `### ${cell(row.case_id)}`, '', ...[...new Set(findings)].slice(0, 8).map((item) => `- ${cell(item)}`));
    }
  }
  return lines.join('\n') + '\n';
}
