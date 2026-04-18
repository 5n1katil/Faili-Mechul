export interface AIDetective {
  name: string;
  avatar: string;
  totalScore: number;
  gamesWon: number;
  maxStreak: number;
  avgSolveTimeSeconds: number;
}

export const AI_DETECTIVES: AIDetective[] = [
  { name: "Komiser Kemal",    avatar: "d02", totalScore: 142300, gamesWon: 22, maxStreak: 14, avgSolveTimeSeconds: 238 },
  { name: "Ajan Sevda",       avatar: "h09", totalScore: 118700, gamesWon: 18, maxStreak: 11, avgSolveTimeSeconds: 294 },
  { name: "Araştırmacı Mert", avatar: "h04", totalScore: 97500,  gamesWon: 15, maxStreak: 8,  avgSolveTimeSeconds: 327 },
  { name: "Dr. Ayşe Nur",     avatar: "u02", totalScore: 85200,  gamesWon: 13, maxStreak: 9,  avgSolveTimeSeconds: 361 },
  { name: "Muhabir Can",      avatar: "u04", totalScore: 72400,  gamesWon: 11, maxStreak: 6,  avgSolveTimeSeconds: 408 },
  { name: "Yargıç Bülent",    avatar: "d03", totalScore: 61800,  gamesWon: 10, maxStreak: 7,  avgSolveTimeSeconds: 453 },
  { name: "Hayalet Zeynep",   avatar: "e05", totalScore: 49300,  gamesWon: 8,  maxStreak: 5,  avgSolveTimeSeconds: 497 },
  { name: "Dedektif Tarık",   avatar: "d01", totalScore: 38100,  gamesWon: 6,  maxStreak: 4,  avgSolveTimeSeconds: 543 },
  { name: "Ajan X",           avatar: "d06", totalScore: 24700,  gamesWon: 4,  maxStreak: 3,  avgSolveTimeSeconds: 631 },
  { name: "Acemi Polis",      avatar: "d09", totalScore: 11200,  gamesWon: 2,  maxStreak: 1,  avgSolveTimeSeconds: 718 },
];
