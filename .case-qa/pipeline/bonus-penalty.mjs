// Escalating bonus-clue time cost. The first open is +30s and the second is
// +60s, whichever clue is chosen. Reopening or restoring a save adds nothing.
// The separate 300-point deduction is unchanged; each added second also costs
// 10 points through the existing time term.
export const BONUS_POINT_COST = 300;
export const TIME_POINT_COST = 10;
export const BONUS_OPEN_SECONDS = [30, 60];
export const LEGACY_BONUS_SECONDS = 30;

export function bonusSecondsForOpen(alreadyOpened) {
  const index = Math.max(0, Math.floor(Number(alreadyOpened) || 0));
  return BONUS_OPEN_SECONDS[Math.min(index, BONUS_OPEN_SECONDS.length - 1)];
}

export function cumulativeBonusSeconds(openedCount) {
  let total = 0;
  const count = Math.max(0, Math.floor(Number(openedCount) || 0));
  for (let index = 0; index < count; index += 1) total += bonusSecondsForOpen(index);
  return total;
}

export function bonusUnlockCopy(alreadyOpened) {
  const seconds = bonusSecondsForOpen(alreadyOpened);
  const cumulative = cumulativeBonusSeconds(Math.max(0, Math.floor(Number(alreadyOpened) || 0)) + 1);
  const timePoints = seconds * TIME_POINT_COST;
  const both = BONUS_OPEN_SECONDS[0] + BONUS_OPEN_SECONDS[1];
  const message = alreadyOpened <= 0
    ? `İlk ek ipucu süreye +${seconds} saniye ekler. İkinci ek ipucu +${BONUS_OPEN_SECONDS[1]} saniye ekler; ikisi birlikte +${both} saniye. Her ek ipucu ayrıca ${BONUS_POINT_COST} puan düşer. Eklenen her saniye, süre hesabında ${TIME_POINT_COST} puan daha düşürür.`
    : `Bu açılış süreye +${seconds} saniye ekler. Toplam süre cezası +${cumulative} saniye olur. Her ek ipucu ayrıca ${BONUS_POINT_COST} puan düşer. Süre etkisi süre satırındadır: saniye başına ${TIME_POINT_COST} puan (bu açılış ${timePoints} puan).`;
  return {
    seconds, cumulative, pointCost: BONUS_POINT_COST, timePoints,
    title: `Aç (+${seconds} sn)`, message
  };
}

// alreadyOpened counts bonuses opened before this click. bonusPenaltySeconds
// is omitted on saves written before the schedule existed; those opens stay at
// the old flat 30 seconds and are not rewritten.
export function applyBonusOpen({ alreadyOpened, timeElapsed, bonusPenaltySeconds }) {
  const seconds = bonusSecondsForOpen(alreadyOpened);
  const known = Number.isFinite(bonusPenaltySeconds)
    ? bonusPenaltySeconds
    : Math.max(0, Math.floor(Number(alreadyOpened) || 0)) * LEGACY_BONUS_SECONDS;
  return {
    seconds,
    timeElapsed: timeElapsed + seconds,
    bonusPenaltySeconds: known + seconds
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
