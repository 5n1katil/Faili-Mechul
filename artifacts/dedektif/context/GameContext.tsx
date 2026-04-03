import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { getDailyPuzzle, PUZZLES, type GridMark, type Puzzle } from "@/data/puzzles";

export interface GameRecord {
  puzzleId: string;
  date: string;
  score: number;
  timeSeconds: number;
  mistakes: number;
  completed: boolean;
  solution: {
    suspectId: string;
    weaponId: string;
    locationId: string;
  } | null;
}

export interface PlayerProfile {
  name: string;
  totalScore: number;
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  lastPlayedDate: string | null;
  badges: string[];
}

export interface LeaderboardEntry {
  name: string;
  score: number;
  time: number;
  mistakes: number;
  date: string;
}

export type GridState = { [key: string]: GridMark };

export interface GameState {
  puzzle: Puzzle | null;
  gridState: GridState;
  cluesRevealed: number[];
  timeElapsed: number;
  mistakes: number;
  maxMistakes: number;
  isComplete: boolean;
  isGameOver: boolean;
  selectedSuspect: string | null;
  selectedWeapon: string | null;
  selectedLocation: string | null;
}

interface GameContextType {
  profile: PlayerProfile;
  gameHistory: GameRecord[];
  leaderboard: LeaderboardEntry[];
  gameState: GameState | null;
  startDailyPuzzle: () => void;
  startPuzzle: (puzzle: Puzzle) => void;
  setGridMark: (key: string, mark: GridMark) => void;
  revealNextClue: () => void;
  submitAnswer: (suspectId: string, weaponId: string, locationId: string) => boolean;
  updateProfile: (name: string) => void;
  resetCurrentGame: () => void;
  tickTimer: () => void;
}

const GameContext = createContext<GameContextType | null>(null);

const PROFILE_KEY = "@dedektif_profile";
const HISTORY_KEY = "@dedektif_history";
const LEADERBOARD_KEY = "@dedektif_leaderboard";

const DEFAULT_PROFILE: PlayerProfile = {
  name: "Dedektif",
  totalScore: 0,
  gamesPlayed: 0,
  gamesWon: 0,
  currentStreak: 0,
  maxStreak: 0,
  lastPlayedDate: null,
  badges: [],
};

function computeScore(
  timeSeconds: number,
  mistakes: number,
  cluesRevealed: number,
  difficulty: string
): number {
  let baseScore = 1000;
  const timePenalty = Math.floor(timeSeconds / 10) * 5;
  const mistakePenalty = mistakes * 100;
  const cluePenalty = cluesRevealed * 20;
  let difficultyBonus = 0;
  if (difficulty === "dedektif") difficultyBonus = 200;
  if (difficulty === "baskomiser") difficultyBonus = 500;
  return Math.max(
    100,
    baseScore - timePenalty - mistakePenalty - cluePenalty + difficultyBonus
  );
}

function getBadges(profile: PlayerProfile, history: GameRecord[]): string[] {
  const badges: string[] = [...profile.badges];
  if (history.filter((h) => h.completed).length >= 1 && !badges.includes("ilk_cozum")) {
    badges.push("ilk_cozum");
  }
  if (history.filter((h) => h.completed).length >= 5 && !badges.includes("bes_cozum")) {
    badges.push("bes_cozum");
  }
  if (profile.currentStreak >= 7 && !badges.includes("hafta_serisi")) {
    badges.push("hafta_serisi");
  }
  if (history.some((h) => h.mistakes === 0 && h.completed) && !badges.includes("hatasiz")) {
    badges.push("hatasiz");
  }
  return badges;
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<PlayerProfile>(DEFAULT_PROFILE);
  const [gameHistory, setGameHistory] = useState<GameRecord[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [gameState, setGameState] = useState<GameState | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [profileStr, historyStr, leaderboardStr] = await Promise.all([
        AsyncStorage.getItem(PROFILE_KEY),
        AsyncStorage.getItem(HISTORY_KEY),
        AsyncStorage.getItem(LEADERBOARD_KEY),
      ]);
      if (profileStr) setProfile(JSON.parse(profileStr));
      if (historyStr) setGameHistory(JSON.parse(historyStr));
      if (leaderboardStr) setLeaderboard(JSON.parse(leaderboardStr));
    } catch {}
  };

  const saveProfile = async (p: PlayerProfile) => {
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(p));
    setProfile(p);
  };

  const saveHistory = async (h: GameRecord[]) => {
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(h));
    setGameHistory(h);
  };

  const saveLeaderboard = async (lb: LeaderboardEntry[]) => {
    const today = new Date().toISOString().split("T")[0];
    const todayEntries = lb.filter((e) => e.date === today);
    const otherEntries = lb.filter((e) => e.date !== today);
    const bestPerPlayerToday = Object.values(
      todayEntries.reduce<Record<string, LeaderboardEntry>>((acc, e) => {
        if (!acc[e.name] || e.score > acc[e.name].score) {
          acc[e.name] = e;
        }
        return acc;
      }, {})
    );
    const topToday = bestPerPlayerToday.sort((a, b) => b.score - a.score).slice(0, 10);
    const allEntries = [...topToday, ...otherEntries]
      .sort((a, b) => b.score - a.score)
      .slice(0, 50);
    await AsyncStorage.setItem(LEADERBOARD_KEY, JSON.stringify(allEntries));
    setLeaderboard(allEntries);
  };

  const startPuzzle = useCallback((puzzle: Puzzle) => {
    setGameState({
      puzzle,
      gridState: {},
      cluesRevealed: [0],
      timeElapsed: 0,
      mistakes: 0,
      maxMistakes: 3,
      isComplete: false,
      isGameOver: false,
      selectedSuspect: null,
      selectedWeapon: null,
      selectedLocation: null,
    });
  }, []);

  const startDailyPuzzle = useCallback(() => {
    const puzzle = getDailyPuzzle();
    startPuzzle(puzzle);
  }, [startPuzzle]);

  const setGridMark = useCallback(
    (key: string, mark: GridMark) => {
      if (!gameState || gameState.isComplete || gameState.isGameOver) return;
      setGameState((prev) => {
        if (!prev) return prev;
        const newGrid = { ...prev.gridState, [key]: mark };
        return { ...prev, gridState: newGrid };
      });
    },
    [gameState]
  );

  const revealNextClue = useCallback(() => {
    setGameState((prev) => {
      if (!prev || !prev.puzzle) return prev;
      const maxClues = prev.puzzle.clues.length - 1;
      const lastRevealed = prev.cluesRevealed[prev.cluesRevealed.length - 1];
      if (lastRevealed >= maxClues) return prev;
      return {
        ...prev,
        cluesRevealed: [...prev.cluesRevealed, lastRevealed + 1],
      };
    });
  }, []);

  const submitAnswer = useCallback(
    (suspectId: string, weaponId: string, locationId: string): boolean => {
      if (!gameState || !gameState.puzzle) return false;
      const { solution } = gameState.puzzle;
      const isCorrect =
        suspectId === solution.suspectId &&
        weaponId === solution.weaponId &&
        locationId === solution.locationId;

      if (isCorrect) {
        const score = computeScore(
          gameState.timeElapsed,
          gameState.mistakes,
          gameState.cluesRevealed.length - 1,
          gameState.puzzle.difficulty
        );

        const record: GameRecord = {
          puzzleId: gameState.puzzle.id,
          date: new Date().toISOString().split("T")[0],
          score,
          timeSeconds: gameState.timeElapsed,
          mistakes: gameState.mistakes,
          completed: true,
          solution: { suspectId, weaponId, locationId },
        };

        const today = new Date().toISOString().split("T")[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
        const newStreak =
          profile.lastPlayedDate === today
            ? profile.currentStreak
            : profile.lastPlayedDate === yesterday
            ? profile.currentStreak + 1
            : 1;
        const newHistory = [record, ...gameHistory];
        const newProfile = {
          ...profile,
          totalScore: profile.totalScore + score,
          gamesPlayed: profile.gamesPlayed + 1,
          gamesWon: profile.gamesWon + 1,
          currentStreak: newStreak,
          maxStreak: Math.max(profile.maxStreak, newStreak),
          lastPlayedDate: today,
        };
        newProfile.badges = getBadges(newProfile, newHistory);

        const newLeaderEntry: LeaderboardEntry = {
          name: profile.name,
          score,
          time: gameState.timeElapsed,
          mistakes: gameState.mistakes,
          date: today,
        };

        saveHistory(newHistory);
        saveProfile(newProfile);
        saveLeaderboard([...leaderboard, newLeaderEntry]);

        setGameState((prev) => {
          if (!prev) return prev;
          return { ...prev, isComplete: true };
        });
        return true;
      } else {
        const newMistakes = gameState.mistakes + 1;
        const isGameOver = newMistakes >= gameState.maxMistakes;

        if (isGameOver) {
          const record: GameRecord = {
            puzzleId: gameState.puzzle.id,
            date: new Date().toISOString().split("T")[0],
            score: 0,
            timeSeconds: gameState.timeElapsed,
            mistakes: newMistakes,
            completed: false,
            solution: null,
          };
          const newHistory = [record, ...gameHistory];
          const newProfile = {
            ...profile,
            gamesPlayed: profile.gamesPlayed + 1,
            currentStreak: 0,
            lastPlayedDate: new Date().toISOString().split("T")[0],
          };
          saveHistory(newHistory);
          saveProfile(newProfile);
        }

        setGameState((prev) => {
          if (!prev) return prev;
          return { ...prev, mistakes: newMistakes, isGameOver };
        });
        return false;
      }
    },
    [gameState, profile, gameHistory, leaderboard]
  );

  const updateProfile = useCallback(
    (name: string) => {
      saveProfile({ ...profile, name });
    },
    [profile]
  );

  const resetCurrentGame = useCallback(() => {
    setGameState(null);
  }, []);

  const tickTimer = useCallback(() => {
    setGameState((prev) => {
      if (!prev || prev.isComplete || prev.isGameOver) return prev;
      return { ...prev, timeElapsed: prev.timeElapsed + 1 };
    });
  }, []);

  return (
    <GameContext.Provider
      value={{
        profile,
        gameHistory,
        leaderboard,
        gameState,
        startDailyPuzzle,
        startPuzzle,
        setGridMark,
        revealNextClue,
        submitAnswer,
        updateProfile,
        resetCurrentGame,
        tickTimer,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used inside GameProvider");
  return ctx;
}
