#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  applyPatchPlanSafely,
  buildPrompt,
  isRecoverablePatchContractError
} from './fm_case_qa_runner.mjs';

const caseData = {
  puzzleId: 'mit_005',
  suspects: [{ id: 's1', name: 'Loki' }],
  weapons: [{ id: 'w1', name: 'Rün' }],
  locations: [{ id: 'l1', name: 'Salon' }],
  clues: [{ id: 'c1', title: 'İpucu', logicRules: [] }]
};

const invalidPlan = {
  case_id: 'mit_005',
  assessment: 'invalid out-of-range probe',
  operations: [{
    op: 'replace',
    path: '/clues/7/logicRules',
    value_json: '[]',
    reason: 'regression fixture'
  }]
};

let rejectedMessage = '';
try {
  applyPatchPlanSafely(caseData, invalidPlan);
} catch (error) {
  rejectedMessage = String(error?.message || error);
}

assert.match(rejectedMessage, /^PATCH_CONTRACT:/);
assert.match(rejectedMessage, /\/clues\/7\/logicRules/);
assert.equal(isRecoverablePatchContractError(rejectedMessage), true);

const prompt = buildPrompt({
  caseData,
  baselineResult: {
    score: 0,
    productionReady: false,
    blockers: ['fixture blocker'],
    fixes: [],
    advisories: [],
    gates: {
      coreNecessity: { passed: false },
      patternGovernance: { passed: true },
      contentAndNames: { passed: true },
      semanticContract: { passed: true },
      visibleEvidence: { passed: true },
      mechanicContract: { passed: true },
      bonusFunctionality: { passed: true }
    }
  },
  leakage: {
    status: 'blocked_pending_content_repair',
    severity: 'critical',
    avatar_prompt_risk: true,
    solution_triple_exposed: true,
    findings: [],
    required_actions: []
  },
  phase: 'terra_escalation',
  previousAttemptError: rejectedMessage
});

assert.match(prompt, /PREVIOUS PATCH WAS REJECTED BEFORE EVALUATION/);
assert.match(prompt, /\/clues\/7\/logicRules/);
assert.match(prompt, /Do not repeat that invalid path/);

const validPlan = {
  case_id: 'mit_005',
  assessment: 'valid recovery probe',
  operations: [{
    op: 'replace',
    path: '/clues/0/logicRules',
    value_json: '[]',
    reason: 'existing index fixture'
  }]
};
const recovered = applyPatchPlanSafely(caseData, validPlan);
assert.deepEqual(recovered.clues[0].logicRules, []);

console.log('✓ Invalid patch paths are rejected, classified as recoverable, and fed into the next bounded prompt.');
