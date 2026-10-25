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
