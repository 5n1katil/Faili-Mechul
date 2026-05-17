import { AI_DETECTIVES } from "@/data/aiDetectives";
import type { LeaderboardEntry } from "@/context/GameContext";
import type { Difficulty } from "@/data/puzzles";

export function computeScoreForRank(
  timeElapsed: number,
  wrongGuesses: number,
  bonusCluesRevealedCount: number,
  difficulty: Difficulty,
  currentStreak = 0
): number {
  const rawScore = 10000 - timeElapsed * 10 - wrongGuesses * 500 - bonusCluesRevealedCount * 300;
  const difficultyBonus = difficulty === "baskomiser" ? 5000 : difficulty === "dedektif" ? 2000 : 0;
  const streakBonus = Math.min(currentStreak * 50, 500);
  return Math.max(100, rawScore) + difficultyBonus + streakBonus;
}

function stableHash(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function npcScoreForPuzzle(puzzleId: string, difficulty: Difficulty, npcName: string, npcIndex: number): number {
  const h = stableHash(`${puzzleId}-${npcName}-${npcIndex}`);
  const jitter = (h % 121) - 60;
  const baseTime = Math.max(90, AI_DETECTIVES[npcIndex].avgSolveTimeSeconds + jitter);
  const wrongGuesses = h % 3;
  const bonusClues = (h >> 3) % 2;
  const streak = Math.min(10, Math.max(1, Math.floor(AI_DETECTIVES[npcIndex].maxStreak / 2)));
  return computeScoreForRank(baseTime, wrongGuesses, bonusClues, difficulty, streak);
}

/** Rank for this puzzle score among players who attempted the same case (incl. NPC pool). */
export function computeCaseRank(
  estimatedScore: number,
  puzzleId: string,
  difficulty: Difficulty,
  leaderboard: LeaderboardEntry[]
): { rank: number; totalPlayers: number } {
  const samePuzzleScores = leaderboard.filter((e) => e.puzzleId === puzzleId).map((e) => e.score);
  const npcScores = AI_DETECTIVES.map((npc, idx) => npcScoreForPuzzle(puzzleId, difficulty, npc.name, idx));
  const allScores = [...samePuzzleScores, ...npcScores, estimatedScore];
  const rank = allScores.filter((s) => s > estimatedScore).length + 1;
  return { rank: Math.max(1, rank), totalPlayers: allScores.length };
}

/** Rank by projected lifetime total score (Dedektif Sıralaması / totalScore), aligned with Liderlik tab. */
export function computeOverallRank(
  projectedTotalScore: number,
  apiTotalScores: number[] = []
): { rank: number; totalPlayers: number } {
  const apiScores = apiTotalScores.filter((s) => Number.isFinite(s));
  const totals = [...AI_DETECTIVES.map((d) => d.totalScore), ...apiScores, projectedTotalScore];
  const rank = totals.filter((s) => s > projectedTotalScore).length + 1;
  return { rank: Math.max(1, rank), totalPlayers: totals.length };
}
