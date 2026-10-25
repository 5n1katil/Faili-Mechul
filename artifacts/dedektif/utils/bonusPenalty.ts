// Keep the numbers aligned with .case-qa/pipeline/bonus-penalty.mjs.
// First opened bonus is +30s, second is +60s, independent of which clue.
// Restoring a save does not add the cost again. The 300-point deduction stays;
// added seconds also reduce the score by 10 points each through the time term.

export const BONUS_POINT_COST = 300;
export const TIME_POINT_COST = 10;
export const BONUS_OPEN_SECONDS = [30, 60] as const;
export const LEGACY_BONUS_SECONDS = 30;

export function bonusSecondsForOpen(alreadyOpened: number): number {
  const index = Math.max(0, Math.floor(alreadyOpened || 0));
  return BONUS_OPEN_SECONDS[Math.min(index, BONUS_OPEN_SECONDS.length - 1)];
}

export function cumulativeBonusSeconds(openedCount: number): number {
  let total = 0;
  const count = Math.max(0, Math.floor(openedCount || 0));
  for (let index = 0; index < count; index += 1) total += bonusSecondsForOpen(index);
  return total;
}

export function bonusUnlockCopy(alreadyOpened: number): {
  seconds: number;
  cumulative: number;
  pointCost: number;
  timePoints: number;
  title: string;
  message: string;
} {
  const seconds = bonusSecondsForOpen(alreadyOpened);
  const cumulative = cumulativeBonusSeconds(Math.max(0, Math.floor(alreadyOpened || 0)) + 1);
  const timePoints = seconds * TIME_POINT_COST;
  const both = BONUS_OPEN_SECONDS[0] + BONUS_OPEN_SECONDS[1];
  const message = alreadyOpened <= 0
    ? `İlk ek ipucu süreye +${seconds} saniye ekler. İkinci ek ipucu +${BONUS_OPEN_SECONDS[1]} saniye ekler; ikisi birlikte +${both} saniye. Her ek ipucu ayrıca ${BONUS_POINT_COST} puan düşer. Eklenen her saniye, süre hesabında ${TIME_POINT_COST} puan daha düşürür.`
    : `Bu açılış süreye +${seconds} saniye ekler. Toplam süre cezası +${cumulative} saniye olur. Her ek ipucu ayrıca ${BONUS_POINT_COST} puan düşer. Süre etkisi süre satırındadır: saniye başına ${TIME_POINT_COST} puan (bu açılış ${timePoints} puan).`;
  return {
    seconds,
    cumulative,
    pointCost: BONUS_POINT_COST,
    timePoints,
    title: `Aç (+${seconds} sn)`,
    message,
  };
}

export function applyBonusOpen(input: {
  alreadyOpened: number;
  timeElapsed: number;
  bonusPenaltySeconds?: number;
}): { seconds: number; timeElapsed: number; bonusPenaltySeconds: number } {
  const seconds = bonusSecondsForOpen(input.alreadyOpened);
  const known = typeof input.bonusPenaltySeconds === "number"
    ? input.bonusPenaltySeconds
    : Math.max(0, Math.floor(input.alreadyOpened || 0)) * LEGACY_BONUS_SECONDS;
  return {
    seconds,
    timeElapsed: input.timeElapsed + seconds,
    bonusPenaltySeconds: known + seconds,
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
