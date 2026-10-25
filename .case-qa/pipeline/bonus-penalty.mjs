// Bonus time cost follows the help tier, not the click order.
// The light bonus (the first bonus clue in the puzzle) is +30s.
// A later, stronger bonus is +60s and is usable after the light one.
// Pressing a strong bonus while the light one is still locked opens both:
// +90s and both point deductions. Reopening or restoring a save adds nothing.
// The separate 300-point deduction is unchanged; each added second also costs
// 10 points through the existing time term. An already-open strong clue that
// was charged 30s under the old flat policy is not repriced.
export const BONUS_POINT_COST = 300;
export const TIME_POINT_COST = 10;
export const BONUS_OPEN_SECONDS = [30, 60];
export const LIGHT_BONUS_SECONDS = BONUS_OPEN_SECONDS[0];
export const STRONG_BONUS_SECONDS = BONUS_OPEN_SECONDS[1];
export const LEGACY_BONUS_SECONDS = 30;
export const BUNDLED_BONUS_CONFIRM = 'İki yardımı aç: toplam +90 saniye ve iki bonusun puan kesintisi. Hafif yardım +30 saniye, güçlü yardım +60 saniye. İki kesinti 2 × 300 = 600 puan. Eklenen 90 saniye, süre hesabında 900 puan daha düşürür (10 puan/sn).';

export function bonusClueOrder(clues) {
  return (clues || []).reduce((order, clue, index) => {
    if (clue && clue.isBonus) order.push(index);
    return order;
  }, []);
}

export function bonusOpenPlan({ clues, targetIndex, revealed }) {
  const order = bonusClueOrder(clues);
  const opened = new Set(revealed || []);
  const target = Math.floor(Number(targetIndex));
  if (!order.includes(target) || opened.has(target)) {
    return { indices: [], seconds: 0, pointCount: 0, bundled: false, tier: null };
  }
  const light = order[0];
  if (target === light) {
    return { indices: [target], seconds: LIGHT_BONUS_SECONDS, pointCount: 1, bundled: false, tier: 'light' };
  }
  if (!opened.has(light)) {
    return {
      indices: [light, target],
      seconds: LIGHT_BONUS_SECONDS + STRONG_BONUS_SECONDS,
      pointCount: 2,
      bundled: true,
      tier: 'strong'
    };
  }
  return { indices: [target], seconds: STRONG_BONUS_SECONDS, pointCount: 1, bundled: false, tier: 'strong' };
}

export function bonusUnlockCopy({ tier, lightOpen }) {
  const bundled = tier === 'strong' && !lightOpen;
  const seconds = tier === 'light' ? LIGHT_BONUS_SECONDS : STRONG_BONUS_SECONDS;
  const chargeSeconds = bundled ? LIGHT_BONUS_SECONDS + STRONG_BONUS_SECONDS : seconds;
  const pointCount = bundled ? 2 : 1;
  const pointCost = pointCount * BONUS_POINT_COST;
  const timePoints = chargeSeconds * TIME_POINT_COST;
  const message = tier === 'light'
    ? `Bu hafif yardım süreye +${seconds} saniye ekler. Güçlü yardım ancak bu açıldıktan sonra kullanılabilir ve +${STRONG_BONUS_SECONDS} saniye ekler. Her ek ipucu ayrıca ${BONUS_POINT_COST} puan düşer. Eklenen her saniye, süre hesabında ${TIME_POINT_COST} puan daha düşürür.`
    : bundled
      ? BUNDLED_BONUS_CONFIRM
      : `Bu güçlü yardım süreye +${seconds} saniye ekler. Toplam süre cezası +${LIGHT_BONUS_SECONDS + STRONG_BONUS_SECONDS} saniye olur. Bu açılış ayrıca ${BONUS_POINT_COST} puan düşer. Süre etkisi süre satırındadır: saniye başına ${TIME_POINT_COST} puan (bu açılış ${timePoints} puan).`;
  return {
    seconds, chargeSeconds, cumulative: chargeSeconds, pointCost, pointCount, timePoints, bundled,
    tag: bundled ? `+${STRONG_BONUS_SECONDS} sn · iki yardım +${chargeSeconds}` : `+${seconds} sn`,
    title: `Aç (+${chargeSeconds} sn)`,
    message
  };
}

// seconds is the tier charge for this click. bonusPenaltySeconds is omitted on
// saves written before the schedule existed; those opens stay at the old flat
// 30 seconds and are not rewritten.
export function applyBonusOpen({ seconds, timeElapsed, bonusPenaltySeconds, alreadyOpened }) {
  const add = Math.max(0, Math.floor(Number(seconds) || 0));
  const known = Number.isFinite(bonusPenaltySeconds)
    ? bonusPenaltySeconds
    : Math.max(0, Math.floor(Number(alreadyOpened) || 0)) * LEGACY_BONUS_SECONDS;
  return {
    seconds: add,
    timeElapsed: timeElapsed + add,
    bonusPenaltySeconds: known + add
  };
}

export function resumeSavedGame(saved) {
  return {
    revealed: [...(saved.revealed || [])],
    timeElapsed: saved.timeElapsed,
    bonusPenaltySeconds: Number.isFinite(saved.bonusPenaltySeconds) ? saved.bonusPenaltySeconds : undefined
  };
}

export function bonusScoreNote(bonusCount, bonusPenaltySeconds) {
  const count = Math.max(0, Math.floor(Number(bonusCount) || 0));
  if (!count) return '';
  const points = count * BONUS_POINT_COST;
  if (!Number.isFinite(bonusPenaltySeconds)) {
    return `Ek ipucu kesintisi ${count} × ${BONUS_POINT_COST} = ${points} puan. Süre satırı kayıtlı kronometreyi kullanır. Eski kayıtlarda ek saniyeler ayrı tutulmaz ve geriye dönük değiştirilmez.`;
  }
  const timePoints = bonusPenaltySeconds * TIME_POINT_COST;
  return `Ek ipucu kesintisi ${count} × ${BONUS_POINT_COST} = ${points} puan. Ek ipuçları süreye +${bonusPenaltySeconds} sn ekledi; bu da süre satırında ${timePoints} puan daha düşürür (${TIME_POINT_COST} puan/sn).`;
}
