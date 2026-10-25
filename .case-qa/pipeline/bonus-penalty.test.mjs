import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  BONUS_OPEN_SECONDS, BONUS_POINT_COST, applyBonusOpen, bonusScoreNote,
  bonusSecondsForOpen, bonusUnlockCopy, resumeSavedGame
} from './bonus-penalty.mjs';

test('bonus time depends on open order, not which clue is clicked', () => {
  const open = (order) => {
    let state = { revealed: [], timeElapsed: 100, bonusPenaltySeconds: undefined };
    const costs = [];
    for (const index of order) {
      assert.equal(state.revealed.includes(index), false);
      const next = applyBonusOpen({
        alreadyOpened: state.revealed.length,
        timeElapsed: state.timeElapsed,
        bonusPenaltySeconds: state.bonusPenaltySeconds
      });
      costs.push(next.seconds);
      state = {
        revealed: [...state.revealed, index],
        timeElapsed: next.timeElapsed,
        bonusPenaltySeconds: next.bonusPenaltySeconds
      };
      const again = applyBonusOpen({
        alreadyOpened: state.revealed.length - 1,
        timeElapsed: state.timeElapsed,
        bonusPenaltySeconds: state.bonusPenaltySeconds
      });
      assert.equal(state.revealed.includes(index), true);
      assert.equal(again.seconds, bonusSecondsForOpen(state.revealed.length - 1));
    }
    return { costs, timeElapsed: state.timeElapsed, bonusPenaltySeconds: state.bonusPenaltySeconds };
  };
  const forward = open(['c5', 'c6']);
  const reverse = open(['c6', 'c5']);
  assert.deepEqual(forward.costs, [30, 60]);
  assert.deepEqual(reverse.costs, [30, 60]);
  assert.equal(forward.timeElapsed, 190);
  assert.equal(reverse.timeElapsed, 190);
  assert.equal(forward.bonusPenaltySeconds, 90);
  assert.equal(reverse.bonusPenaltySeconds, 90);
  assert.deepEqual(BONUS_OPEN_SECONDS, [30, 60]);
});

test('reopening and restoring a save do not add the penalty again', () => {
  const opened = applyBonusOpen({ alreadyOpened: 0, timeElapsed: 40, bonusPenaltySeconds: undefined });
  const saved = resumeSavedGame({
    revealed: [5], timeElapsed: opened.timeElapsed, bonusPenaltySeconds: opened.bonusPenaltySeconds
  });
  const restored = resumeSavedGame(saved);
  assert.equal(restored.timeElapsed, 70);
  assert.equal(restored.bonusPenaltySeconds, 30);
  assert.deepEqual(restored.revealed, [5]);
  const legacy = resumeSavedGame({ revealed: [4, 5], timeElapsed: 200 });
  assert.equal(legacy.timeElapsed, 200);
  assert.equal(legacy.bonusPenaltySeconds, undefined);
  const continued = applyBonusOpen({
    alreadyOpened: 1, timeElapsed: 80, bonusPenaltySeconds: undefined
  });
  assert.equal(continued.seconds, 60);
  assert.equal(continued.timeElapsed, 140);
  assert.equal(continued.bonusPenaltySeconds, 90);
});

test('the second open shows the cumulative cost and the score note keeps both penalties', () => {
  const first = bonusUnlockCopy(0);
  const second = bonusUnlockCopy(1);
  assert.equal(first.seconds, 30);
  assert.equal(second.seconds, 60);
  assert.equal(second.cumulative, 90);
  assert.match(second.message, /toplam süre cezası \+90 saniye/i);
  assert.match(first.message, /300 puan/);
  assert.match(second.message, /10 puan/);
  assert.equal(first.pointCost, BONUS_POINT_COST);
  const fresh = bonusScoreNote(2, 90);
  assert.match(fresh, /2 × 300 = 600/);
  assert.match(fresh, /\+90 sn/);
  assert.match(fresh, /900 puan/);
  const oldSave = bonusScoreNote(1, undefined);
  assert.match(oldSave, /geriye dönük değiştirilmez/);
  assert.equal(bonusScoreNote(0, 30), '');
});

test('the app, the preview client and this module share the 30/60 schedule', () => {
  const app = fs.readFileSync(new URL('../../artifacts/dedektif/utils/bonusPenalty.ts', import.meta.url), 'utf8');
  const client = fs.readFileSync(new URL('./play-client.js', import.meta.url), 'utf8');
  assert.match(app, /BONUS_OPEN_SECONDS = \[30, 60\]/);
  assert.match(client, /already <= 0 \? 30 : 60/);
  assert.match(client, /pointCost = 0/);
  assert.match(client, /bonus_penalty_seconds/);
  const screen = fs.readFileSync(new URL('../../artifacts/dedektif/components/ResultScreen.tsx', import.meta.url), 'utf8');
  const share = screen.slice(screen.indexOf('function buildShareText'), screen.indexOf('const CONFETTI_COLORS'));
  assert.equal(share.includes('solutionNarrative'), false);
  assert.equal(share.includes('closingNarrative'), false);
  assert.match(screen, /puzzle\.solutionNarrative/);
});
