export interface AIDetective {
  name: string;
  avatar: string;
  totalScore: number;
  gamesWon: number;
  maxStreak: number;
}

export const AI_DETECTIVES: AIDetective[] = [
  { name: "Komiser Kemal",    avatar: "sheriff",    totalScore: 142300, gamesWon: 22, maxStreak: 14 },
  { name: "Ajan Sevda",       avatar: "spy",        totalScore: 118700, gamesWon: 18, maxStreak: 11 },
  { name: "Araştırmacı Mert", avatar: "magnifier",  totalScore: 97500,  gamesWon: 15, maxStreak: 8  },
  { name: "Dr. Ayşe Nur",     avatar: "scientist",  totalScore: 85200,  gamesWon: 13, maxStreak: 9  },
  { name: "Muhabir Can",      avatar: "journalist", totalScore: 72400,  gamesWon: 11, maxStreak: 6  },
  { name: "Yargıç Bülent",    avatar: "judge",      totalScore: 61800,  gamesWon: 10, maxStreak: 7  },
  { name: "Hayalet Zeynep",   avatar: "ghost",      totalScore: 49300,  gamesWon: 8,  maxStreak: 5  },
  { name: "Dedektif Tarık",   avatar: "detective",  totalScore: 38100,  gamesWon: 6,  maxStreak: 4  },
  { name: "Ajan X",           avatar: "spy",        totalScore: 24700,  gamesWon: 4,  maxStreak: 3  },
  { name: "Acemi Polis",      avatar: "sheriff",    totalScore: 11200,  gamesWon: 2,  maxStreak: 1  },
];
