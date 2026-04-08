import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  getDailyPuzzle,
  PUZZLES,
  type GridMark,
  type Location,
  type Puzzle,
  type Suspect,
  type Weapon,
} from "@/data/puzzles";

function getSameRowKeys(
  rowId: string,
  colId: string,
  suspects: Suspect[],
  weapons: Weapon[],
  locations: Location[]
): string[] {
  const isWeaponRow = weapons.some((w) => w.id === rowId);
  const colIsLocation = locations.some((l) => l.id === colId);
  let colIds: string[];
  if (isWeaponRow) {
    colIds = colIsLocation ? locations.map((l) => l.id) : suspects.map((s) => s.id);
  } else {
    colIds = suspects.map((s) => s.id);
  }
  return colIds.filter((c) => c !== colId).map((c) => `${rowId}_${c}`);
}

function getSameColKeys(
  colId: string,
  rowId: string,
  suspects: Suspect[],
  weapons: Weapon[],
  locations: Location[]
): string[] {
  const isSuspectCol = suspects.some((s) => s.id === colId);
  const rowIsLocation = locations.some((l) => l.id === rowId);
  let rowIds: string[];
  if (isSuspectCol) {
    rowIds = rowIsLocation ? locations.map((l) => l.id) : weapons.map((w) => w.id);
  } else {
    rowIds = weapons.map((w) => w.id);
  }
  return rowIds.filter((r) => r !== rowId).map((r) => `${r}_${colId}`);
}

export interface GameRecord {
  puzzleId: string;
  date: string;
  score: number;
  timeSeconds: number;
  wrongGuesses: number;
  penaltySeconds: number;
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
  wrongGuesses: number;
  date: string;
  puzzleId: string;
}

export type GridState = { [key: string]: GridMark };

export interface GameState {
  puzzle: Puzzle | null;
  gridState: GridState;
  autoCrossGroups: { [checkKey: string]: string[] };
  autoCrossOwners: { [crossedKey: string]: string[] };
  cluesRevealed: number[];
  timeElapsed: number;
  wrongGuesses: number;
  wrongGuessPenaltySeconds: number;
  isComplete: boolean;
  finalScore: number | null;
  selectedSuspect: string | null;
  selectedWeapon: string | null;
  selectedLocation: string | null;
}

export interface BestResult {
  score: number;
  timeSeconds: number;
}

interface GameContextType {
  profile: PlayerProfile;
  gameHistory: GameRecord[];
  leaderboard: LeaderboardEntry[];
  gameState: GameState | null;
  completedPuzzleIds: Set<string>;
  bestScoreForPuzzle: (id: string) => BestResult | null;
  startDailyPuzzle: () => void;
  startPuzzle: (puzzle: Puzzle) => void;
  setGridMark: (key: string, mark: GridMark) => void;
  revealNextClue: () => void;
  submitAnswer: (suspectId: string, weaponId: string, locationId: string) => boolean;
  recordTimeout: () => void;
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
  timeElapsed: number,
  wrongGuessPenaltySeconds: number,
  cluesRevealedCount: number,
  difficulty: string
): number {
  const extraClues = Math.max(0, cluesRevealedCount - 2);
  const cluePenaltySeconds = extraClues * 30;
  const effectiveTime = timeElapsed + wrongGuessPenaltySeconds + cluePenaltySeconds;
  const rawScore = 10000 - effectiveTime * 5;
  let difficultyBonus = 0;
  if (difficulty === "dedektif") difficultyBonus = 2000;
  if (difficulty === "baskomiser") difficultyBonus = 5000;
  return Math.max(100, rawScore) + difficultyBonus;
}

function migrateRecord(raw: Record<string, unknown>): GameRecord {
  return {
    puzzleId: String(raw.puzzleId ?? ""),
    date: String(raw.date ?? ""),
    score: Number(raw.score ?? 0),
    timeSeconds: Number(raw.timeSeconds ?? 0),
    wrongGuesses: typeof raw.wrongGuesses === "number" ? raw.wrongGuesses : Number(raw.mistakes ?? 0),
    penaltySeconds: Number(raw.penaltySeconds ?? 0),
    completed: Boolean(raw.completed),
    solution: raw.solution as GameRecord["solution"] ?? null,
  };
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
  if (history.some((h) => h.wrongGuesses === 0 && h.completed) && !badges.includes("hatasiz")) {
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
      if (historyStr) {
        const raw: Record<string, unknown>[] = JSON.parse(historyStr);
        setGameHistory(raw.map(migrateRecord));
      }
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
    const bestPerPlayerPuzzle = Object.values(
      lb.reduce<Record<string, LeaderboardEntry>>((acc, e) => {
        const key = `${e.name}__${e.puzzleId}`;
        if (!acc[key] || e.score > acc[key].score) {
          acc[key] = e;
        }
        return acc;
      }, {})
    );
    const allEntries = bestPerPlayerPuzzle
      .sort((a, b) => b.score - a.score)
      .slice(0, 50);
    await AsyncStorage.setItem(LEADERBOARD_KEY, JSON.stringify(allEntries));
    setLeaderboard(allEntries);
  };

  const completedPuzzleIds = useMemo(
    () => new Set(gameHistory.filter((h) => h.completed).map((h) => h.puzzleId)),
    [gameHistory]
  );

  const bestScoreForPuzzle = useCallback(
    (id: string): BestResult | null => {
      const wins = gameHistory.filter((h) => h.puzzleId === id && h.completed);
      if (wins.length === 0) return null;
      const best = wins.reduce((a, b) => (b.score > a.score ? b : a));
      return { score: best.score, timeSeconds: best.timeSeconds };
    },
    [gameHistory]
  );

  const startPuzzle = useCallback((puzzle: Puzzle) => {
    setGameState({
      puzzle,
      gridState: {},
      autoCrossGroups: {},
      autoCrossOwners: {},
      cluesRevealed: [0],
      timeElapsed: 0,
      wrongGuesses: 0,
      wrongGuessPenaltySeconds: 0,
      isComplete: false,
      finalScore: null,
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
      if (!gameState || gameState.isComplete) return;
      setGameState((prev) => {
        if (!prev || !prev.puzzle) return prev;
        const { suspects, weapons, locations } = prev.puzzle;
        const parts = key.split("_");
        const rowId = parts[0];
        const colId = parts[1];

        const newGrid = { ...prev.gridState };
        const newGroups = { ...prev.autoCrossGroups };
        const newOwners: { [k: string]: string[] } = {};
        for (const [k, v] of Object.entries(prev.autoCrossOwners)) {
          newOwners[k] = [...v];
        }

        if (prev.gridState[key] === "check" && newGroups[key]) {
          for (const k of newGroups[key]) {
            const owners = newOwners[k] ? newOwners[k].filter((o) => o !== key) : [];
            if (owners.length === 0) {
              delete newOwners[k];
              if (newGrid[k] === "cross") {
                delete newGrid[k];
              }
            } else {
              newOwners[k] = owners;
            }
          }
          delete newGroups[key];
        }

        if (mark === "none") {
          delete newGrid[key];
        } else {
          newGrid[key] = mark;
        }

        if (mark === "check") {
          const sameRow = getSameRowKeys(rowId, colId, suspects, weapons, locations);
          const sameCol = getSameColKeys(colId, rowId, suspects, weapons, locations);
          const autoCrossed: string[] = [];
          for (const k of [...sameRow, ...sameCol]) {
            const current = newGrid[k];
            const isAlreadyAutoCrossed = newOwners[k] && newOwners[k].length > 0;
            if (!current || current === "none") {
              newGrid[k] = "cross";
              autoCrossed.push(k);
              newOwners[k] = [key];
            } else if (current === "cross" && isAlreadyAutoCrossed) {
              autoCrossed.push(k);
              if (!newOwners[k].includes(key)) {
                newOwners[k] = [...newOwners[k], key];
              }
            }
          }
          newGroups[key] = autoCrossed;
        }

        return {
          ...prev,
          gridState: newGrid,
          autoCrossGroups: newGroups,
          autoCrossOwners: newOwners,
        };
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
          gameState.wrongGuessPenaltySeconds,
          gameState.cluesRevealed.length,
          gameState.puzzle.difficulty
        );

        const record: GameRecord = {
          puzzleId: gameState.puzzle.id,
          date: new Date().toISOString().split("T")[0],
          score,
          timeSeconds: gameState.timeElapsed,
          wrongGuesses: gameState.wrongGuesses,
          penaltySeconds: gameState.wrongGuessPenaltySeconds,
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
          wrongGuesses: gameState.wrongGuesses,
          date: today,
          puzzleId: gameState.puzzle.id,
        };

        saveHistory(newHistory);
        saveProfile(newProfile);
        saveLeaderboard([...leaderboard, newLeaderEntry]);

        setGameState((prev) => {
          if (!prev) return prev;
          return { ...prev, isComplete: true, finalScore: score };
        });
        return true;
      } else {
        setGameState((prev) => {
          if (!prev) return prev;
          const newWrongGuesses = prev.wrongGuesses + 1;
          const penaltySeconds = 30 * Math.pow(2, newWrongGuesses - 1);
          return {
            ...prev,
            wrongGuesses: newWrongGuesses,
            wrongGuessPenaltySeconds: prev.wrongGuessPenaltySeconds + penaltySeconds,
          };
        });
        return false;
      }
    },
    [gameState, profile, gameHistory, leaderboard]
  );

  const recordTimeout = useCallback(() => {
    if (!gameState?.puzzle) return;
    const record: GameRecord = {
      puzzleId: gameState.puzzle.id,
      date: new Date().toISOString().split("T")[0],
      score: 0,
      timeSeconds: gameState.timeElapsed,
      wrongGuesses: gameState.wrongGuesses,
      penaltySeconds: gameState.wrongGuessPenaltySeconds,
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
  }, [gameState, profile, gameHistory]);

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
      if (!prev || prev.isComplete) return prev;
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
        completedPuzzleIds,
        bestScoreForPuzzle,
        startDailyPuzzle,
        startPuzzle,
        setGridMark,
        revealNextClue,
        submitAnswer,
        recordTimeout,
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
