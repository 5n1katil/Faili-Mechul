// Keep the numbers aligned with .case-qa/pipeline/bonus-penalty.mjs.
// The light bonus is +30s. A stronger bonus is +60s after the light one.
// Pressing the strong bonus first opens both: +90s and both 300-point deductions.
// Restoring a save does not add the cost again. An old strong open charged at
// 30s is not repriced. Added seconds also reduce the score by 10 points each.

export const BONUS_POINT_COST = 300;
export const TIME_POINT_COST = 10;
export const BONUS_OPEN_SECONDS = [30, 60] as const;
export const LIGHT_BONUS_SECONDS = BONUS_OPEN_SECONDS[0];
export const STRONG_BONUS_SECONDS = BONUS_OPEN_SECONDS[1];
export const LEGACY_BONUS_SECONDS = 30;
export const BUNDLED_BONUS_CONFIRM =
  "İki yardımı aç: toplam +90 saniye ve iki bonusun puan kesintisi. Hafif yardım +30 saniye, güçlü yardım +60 saniye. İki kesinti 2 × 300 = 600 puan. Eklenen 90 saniye, süre hesabında 900 puan daha düşürür (10 puan/sn).";

type BonusClue = { isBonus?: boolean };

export function bonusClueOrder(clues: BonusClue[]): number[] {
  return clues.reduce<number[]>((order, clue, index) => {
    if (clue?.isBonus) order.push(index);
    return order;
  }, []);
}

export function bonusOpenPlan(input: {
  clues: BonusClue[];
  targetIndex: number;
  revealed: number[];
}): { indices: number[]; seconds: number; pointCount: number; bundled: boolean; tier: "light" | "strong" | null } {
  const order = bonusClueOrder(input.clues);
  const opened = new Set(input.revealed);
  const target = Math.floor(input.targetIndex);
  if (!order.includes(target) || opened.has(target)) {
    return { indices: [], seconds: 0, pointCount: 0, bundled: false, tier: null };
  }
  const light = order[0];
  if (target === light) {
    return { indices: [target], seconds: LIGHT_BONUS_SECONDS, pointCount: 1, bundled: false, tier: "light" };
  }
  if (!opened.has(light)) {
    return {
      indices: [light, target],
      seconds: LIGHT_BONUS_SECONDS + STRONG_BONUS_SECONDS,
      pointCount: 2,
      bundled: true,
      tier: "strong",
    };
  }
  return { indices: [target], seconds: STRONG_BONUS_SECONDS, pointCount: 1, bundled: false, tier: "strong" };
}

export function bonusUnlockCopy(input: { tier: "light" | "strong"; lightOpen: boolean }): {
  seconds: number;
  chargeSeconds: number;
  cumulative: number;
  pointCost: number;
  pointCount: number;
  timePoints: number;
  bundled: boolean;
  tag: string;
  title: string;
  message: string;
} {
  const bundled = input.tier === "strong" && !input.lightOpen;
  const seconds = input.tier === "light" ? LIGHT_BONUS_SECONDS : STRONG_BONUS_SECONDS;
  const chargeSeconds = bundled ? LIGHT_BONUS_SECONDS + STRONG_BONUS_SECONDS : seconds;
  const pointCount = bundled ? 2 : 1;
  const pointCost = pointCount * BONUS_POINT_COST;
  const timePoints = chargeSeconds * TIME_POINT_COST;
  const message = input.tier === "light"
    ? `Bu hafif yardım süreye +${seconds} saniye ekler. Güçlü yardım ancak bu açıldıktan sonra kullanılabilir ve +${STRONG_BONUS_SECONDS} saniye ekler. Her ek ipucu ayrıca ${BONUS_POINT_COST} puan düşer. Eklenen her saniye, süre hesabında ${TIME_POINT_COST} puan daha düşürür.`
    : bundled
      ? BUNDLED_BONUS_CONFIRM
      : `Bu güçlü yardım süreye +${seconds} saniye ekler. Toplam süre cezası +${LIGHT_BONUS_SECONDS + STRONG_BONUS_SECONDS} saniye olur. Bu açılış ayrıca ${BONUS_POINT_COST} puan düşer. Süre etkisi süre satırındadır: saniye başına ${TIME_POINT_COST} puan (bu açılış ${timePoints} puan).`;
  return {
    seconds,
    chargeSeconds,
    cumulative: chargeSeconds,
    pointCost,
    pointCount,
    timePoints,
    bundled,
    tag: bundled ? `+${STRONG_BONUS_SECONDS} sn · iki yardım +${chargeSeconds}` : `+${seconds} sn`,
    title: `Aç (+${chargeSeconds} sn)`,
    message,
  };
}

export function applyBonusOpen(input: {
  seconds: number;
  timeElapsed: number;
  bonusPenaltySeconds?: number;
  alreadyOpened: number;
}): { seconds: number; timeElapsed: number; bonusPenaltySeconds: number } {
  const add = Math.max(0, Math.floor(input.seconds || 0));
  const known = typeof input.bonusPenaltySeconds === "number"
    ? input.bonusPenaltySeconds
    : Math.max(0, Math.floor(input.alreadyOpened || 0)) * LEGACY_BONUS_SECONDS;
  return {
    seconds: add,
    timeElapsed: input.timeElapsed + add,
    bonusPenaltySeconds: known + add,
  };
}

export function bonusScoreNote(bonusCount: number, bonusPenaltySeconds?: number): string {
  const count = Math.max(0, Math.floor(bonusCount || 0));
  if (!count) return "";
  const points = count * BONUS_POINT_COST;
  if (typeof bonusPenaltySeconds !== "number") {
    return `Ek ipucu kesintisi ${count} × ${BONUS_POINT_COST} = ${points} puan. Süre satırı kayıtlı kronometreyi kullanır. Eski kayıtlarda ek saniyeler ayrı tutulmaz ve geriye dönük değiştirilmez.`;
  }
  const timePoints = bonusPenaltySeconds * TIME_POINT_COST;
  return `Ek ipucu kesintisi ${count} × ${BONUS_POINT_COST} = ${points} puan. Ek ipuçları süreye +${bonusPenaltySeconds} sn ekledi; bu da süre satırında ${timePoints} puan daha düşürür (${TIME_POINT_COST} puan/sn).`;
}
