import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Platform } from "react-native";
import { generateUUID, syncProfileToBackend, type PrivacySettings } from "@/utils/apiClient";
import {
  getDailyPuzzle,
  getStandardClueIndices,
  isBonusClue,
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
  ranked?: boolean;
  solution: {
    suspectId: string;
    weaponId: string;
    locationId: string;
  } | null;
}

export { type PrivacySettings } from "@/utils/apiClient";

export interface PlayerProfile {
  name: string;
  avatar: string;
  bio: string;
  totalScore: number;
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  lastPlayedDate: string | null;
  badges: string[];
  avgSolveTimeSeconds: number;
  privacySettings: PrivacySettings;
}

export interface LeaderboardEntry {
  name: string;
  avatar: string;
  score: number;
  time: number;
  wrongGuesses: number;
  date: string;
  puzzleId: string;
  avgSolveTimeSeconds?: number;
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
  isComplete: boolean;
  finalScore: number | null;
  appliedStreak: number | null;
  selectedSuspect: string | null;
  selectedWeapon: string | null;
  selectedLocation: string | null;
  timerActive: boolean;
  isRanked: boolean;
  solvedMechanics: string[];
}

export interface BestResult {
  score: number;
  timeSeconds: number;
}

export interface PlayStats {
  firstPlay: { score: number; timeSeconds: number; date: string };
  latestPlay: { score: number; timeSeconds: number; date: string } | null;
  playCount: number;
}

interface GameContextType {
  profile: PlayerProfile;
  playerId: string;
  gameHistory: GameRecord[];
  leaderboard: LeaderboardEntry[];
  gameState: GameState | null;
  completedPuzzleIds: Set<string>;
  bestScoreForPuzzle: (id: string) => BestResult | null;
  playStatsForPuzzle: (id: string) => PlayStats | null;
  startDailyPuzzle: () => void;
  startPuzzle: (puzzle: Puzzle) => void;
  activateTimer: () => void;
  invalidateGame: () => void;
  setGridMark: (key: string, mark: GridMark) => void;
  revealBonusClue: (index: number) => void;
  solveMechanic: (clueId: string) => void;
  submitAnswer: (suspectId: string, weaponId: string, locationId: string) => boolean;
  updateProfile: (updates: { name?: string; avatar?: string; bio?: string; privacySettings?: PrivacySettings }) => void;
  addBonusPoints: (points: number) => void;
  resetCurrentGame: () => void;
  tickTimer: () => void;
}

const GameContext = createContext<GameContextType | null>(null);

const PROFILE_KEY = "@dedektif_profile";
const HISTORY_KEY = "@dedektif_history";
const LEADERBOARD_KEY = "@dedektif_leaderboard";
const DRAFT_KEY = "@dedektif_draft";
const PLAYER_ID_KEY = "@dedektif_player_id";

const DEFAULT_PRIVACY: PrivacySettings = {
  showStats: true,
  showBadges: true,
  showBio: true,
  showAvatar: true,
};

interface SavedDraft {
  puzzleId: string;
  gridState: GridState;
  autoCrossGroups: { [checkKey: string]: string[] };
  autoCrossOwners: { [crossedKey: string]: string[] };
  cluesRevealed: number[];
  timeElapsed: number;
  wrongGuesses: number;
  solvedMechanics?: string[];
}

const DEFAULT_PROFILE: PlayerProfile = {
  name: "Dedektif",
  avatar: "",
  bio: "",
  totalScore: 0,
  gamesPlayed: 0,
  gamesWon: 0,
  currentStreak: 0,
  maxStreak: 0,
  lastPlayedDate: null,
  badges: [],
  avgSolveTimeSeconds: 0,
  privacySettings: DEFAULT_PRIVACY,
};

function computeScore(
  timeElapsed: number,
  wrongGuesses: number,
  bonusCluesRevealedCount: number,
  difficulty: string,
  currentStreak: number = 0
): number {
  const rawScore = 10000 - timeElapsed * 10 - wrongGuesses * 500 - bonusCluesRevealedCount * 300;
  let difficultyBonus = 0;
  if (difficulty === "dedektif") difficultyBonus = 2000;
  if (difficulty === "baskomiser") difficultyBonus = 5000;
  const streakBonus = Math.min(currentStreak * 50, 500);
  return Math.max(100, rawScore) + difficultyBonus + streakBonus;
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
  const completed = history.filter((h) => h.completed);
  const completedCount = completed.length;

  if (completedCount >= 1 && !badges.includes("ilk_cozum"))
    badges.push("ilk_cozum");
  if (completedCount >= 5 && !badges.includes("bes_cozum"))
    badges.push("bes_cozum");
  if (completedCount >= 10 && !badges.includes("on_cozum"))
    badges.push("on_cozum");
  if (completedCount >= 20 && !badges.includes("yirmi_cozum"))
    badges.push("yirmi_cozum");
  if (completedCount >= 30 && !badges.includes("uzman_dedektif"))
    badges.push("uzman_dedektif");
  if (profile.currentStreak >= 3 && !badges.includes("soguk_iz"))
    badges.push("soguk_iz");
  if (profile.currentStreak >= 7 && !badges.includes("hafta_serisi"))
    badges.push("hafta_serisi");
  if (profile.currentStreak >= 10 && !badges.includes("on_seri"))
    badges.push("on_seri");
  if (completed.some((h) => h.wrongGuesses === 0) && !badges.includes("hatasiz"))
    badges.push("hatasiz");
  if (completed.some((h) => h.timeSeconds < 180) && !badges.includes("hizli_dedektif"))
    badges.push("hizli_dedektif");

  return badges;
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<PlayerProfile>(DEFAULT_PROFILE);
  const [playerId, setPlayerId] = useState<string>("");
  const [gameHistory, setGameHistory] = useState<GameRecord[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [pendingDraft, setPendingDraft] = useState<SavedDraft | null>(null);
  const tickCount = useRef(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [profileStr, historyStr, leaderboardStr, draftStr, storedPlayerId] = await Promise.all([
        AsyncStorage.getItem(PROFILE_KEY),
        AsyncStorage.getItem(HISTORY_KEY),
        AsyncStorage.getItem(LEADERBOARD_KEY),
        AsyncStorage.getItem(DRAFT_KEY),
        AsyncStorage.getItem(PLAYER_ID_KEY),
      ]);

      let pid = storedPlayerId;
      if (!pid) {
        pid = generateUUID();
        await AsyncStorage.setItem(PLAYER_ID_KEY, pid);
      }
      setPlayerId(pid);

      let parsedProfile: Record<string, unknown> | null = null;
      if (profileStr) {
        parsedProfile = JSON.parse(profileStr);
        setProfile({
          avatar: "",
          bio: "",
          avgSolveTimeSeconds: 0,
          privacySettings: DEFAULT_PRIVACY,
          ...parsedProfile,
        });
      }
      if (historyStr) {
        const raw: Record<string, unknown>[] = JSON.parse(historyStr);
        setGameHistory(raw.map(migrateRecord));
      }
      if (leaderboardStr) {
        const rawLb: Record<string, unknown>[] = JSON.parse(leaderboardStr);
        setLeaderboard(rawLb.map((e) => ({ avatar: "", ...e } as LeaderboardEntry)));
      }
      if (draftStr) {
        const draft = JSON.parse(draftStr) as SavedDraft;
        setPendingDraft(draft);
      }

      cleanupOrphanedAvatars(typeof parsedProfile?.avatar === "string" ? parsedProfile.avatar : undefined);
    } catch {}
  };

  const cleanupOrphanedAvatars = async (currentAvatar?: string) => {
    try {
      if (!FileSystem.documentDirectory) return;
      const avatarDir = `${FileSystem.documentDirectory}avatars/`;
      const dirInfo = await FileSystem.getInfoAsync(avatarDir);
      if (!dirInfo.exists) return;

      const files = await FileSystem.readDirectoryAsync(avatarDir);
      if (files.length === 0) return;

      let activeFileName: string | null = null;
      if (typeof currentAvatar === "string" && currentAvatar.startsWith("gallery:")) {
        const filePath = currentAvatar.slice("gallery:".length);
        const parts = filePath.split("/");
        activeFileName = parts[parts.length - 1];
      }

      for (const file of files) {
        if (file !== activeFileName) {
          await FileSystem.deleteAsync(`${avatarDir}${file}`, { idempotent: true });
        }
      }
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

  const saveDraft = async (gs: GameState) => {
    if (!gs.puzzle || gs.isComplete) return;
    const draft: SavedDraft = {
      puzzleId: gs.puzzle.id,
      gridState: gs.gridState,
      autoCrossGroups: gs.autoCrossGroups,
      autoCrossOwners: gs.autoCrossOwners,
      cluesRevealed: gs.cluesRevealed,
      timeElapsed: gs.timeElapsed,
      wrongGuesses: gs.wrongGuesses,
      solvedMechanics: gs.solvedMechanics,
    };
    await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    setPendingDraft(draft);
  };

  const clearDraft = async () => {
    await AsyncStorage.removeItem(DRAFT_KEY);
    setPendingDraft(null);
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

  const playStatsForPuzzle = useCallback(
    (id: string): PlayStats | null => {
      const allWins = gameHistory
        .filter((h) => h.puzzleId === id && h.completed)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      if (allWins.length === 0) return null;

      // ranked !== false covers: ranked=true (new records) and ranked=undefined (migrated old records)
      const rankedWins = allWins.filter((h) => h.ranked !== false);
      const firstRanked = rankedWins[0] ?? allWins[0]; // fallback to first win if no ranked record

      const lastAny = allWins[allWins.length - 1];
      // Use object reference equality: same object means only one play exists
      const isSameRecord = firstRanked === lastAny;

      return {
        firstPlay: { score: firstRanked.score, timeSeconds: firstRanked.timeSeconds, date: firstRanked.date },
        latestPlay: isSameRecord ? null : { score: lastAny.score, timeSeconds: lastAny.timeSeconds, date: lastAny.date },
        playCount: allWins.length,
      };
    },
    [gameHistory]
  );

  const startPuzzle = useCallback((puzzle: Puzzle) => {
    const standardIndices = getStandardClueIndices(puzzle);
    const isRanked = !completedPuzzleIds.has(puzzle.id);

    const matchingDraft = pendingDraft?.puzzleId === puzzle.id ? pendingDraft : null;
    const draft = isRanked ? matchingDraft : null;

    if (matchingDraft && !isRanked) {
      clearDraft();
    }

    tickCount.current = 0;

    setGameState({
      puzzle,
      gridState: draft?.gridState ?? {},
      autoCrossGroups: draft?.autoCrossGroups ?? {},
      autoCrossOwners: draft?.autoCrossOwners ?? {},
      cluesRevealed: draft?.cluesRevealed ?? standardIndices,
      timeElapsed: draft?.timeElapsed ?? 0,
      wrongGuesses: draft?.wrongGuesses ?? 0,
      isComplete: false,
      finalScore: null,
      appliedStreak: null,
      selectedSuspect: null,
      selectedWeapon: null,
      selectedLocation: null,
      timerActive: false,
      isRanked,
      solvedMechanics: draft?.solvedMechanics ?? [],
    });

    if (matchingDraft) setPendingDraft(null);
  }, [completedPuzzleIds, pendingDraft]);

  const startDailyPuzzle = useCallback(() => {
    const puzzle = getDailyPuzzle();
    startPuzzle(puzzle);
  }, [startPuzzle]);

  const activateTimer = useCallback(() => {
    setGameState((prev) => {
      if (!prev) return prev;
      return { ...prev, timerActive: true };
    });
  }, []);

  const invalidateGame = useCallback(() => {
    setGameState((prev) => {
      if (!prev) return prev;
      return { ...prev, isRanked: false, timerActive: false };
    });
  }, []);

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

        if (prev.gridState[key] === "question" && mark === "none") {
          const sameRow = getSameRowKeys(rowId, colId, suspects, weapons, locations);
          const sameCol = getSameColKeys(colId, rowId, suspects, weapons, locations);
          const checkOwners: string[] = [];
          for (const k of [...sameRow, ...sameCol]) {
            if (newGrid[k] === "check") checkOwners.push(k);
          }
          if (checkOwners.length > 0) {
            newGrid[key] = "cross";
            newOwners[key] = checkOwners;
            for (const ck of checkOwners) {
              if (!newGroups[ck]) newGroups[ck] = [];
              if (!newGroups[ck].includes(key)) newGroups[ck] = [...newGroups[ck], key];
            }
            const nextState = {
              ...prev,
              gridState: newGrid,
              autoCrossGroups: newGroups,
              autoCrossOwners: newOwners,
            };
            saveDraft(nextState);
            return nextState;
          }
        }

        if (newOwners[key] && newOwners[key].length > 0) {
          for (const ownerKey of newOwners[key]) {
            if (newGroups[ownerKey]) {
              newGroups[ownerKey] = newGroups[ownerKey].filter((k) => k !== key);
            }
          }
          delete newOwners[key];
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

        const nextState = {
          ...prev,
          gridState: newGrid,
          autoCrossGroups: newGroups,
          autoCrossOwners: newOwners,
        };
        saveDraft(nextState);
        return nextState;
      });
    },
    [gameState]
  );

  const revealBonusClue = useCallback((index: number) => {
    setGameState((prev) => {
      if (!prev || !prev.puzzle) return prev;
      if (prev.cluesRevealed.includes(index)) return prev;
      if (!isBonusClue(prev.puzzle, index)) return prev;
      const nextState = {
        ...prev,
        cluesRevealed: [...prev.cluesRevealed, index],
        timeElapsed: prev.timeElapsed + 30,
      };
      saveDraft(nextState);
      return nextState;
    });
  }, []);

  const solveMechanic = useCallback((clueId: string) => {
    setGameState((prev) => {
      if (!prev) return prev;
      if (prev.solvedMechanics.includes(clueId)) return prev;
      const nextState = {
        ...prev,
        solvedMechanics: [...prev.solvedMechanics, clueId],
      };
      saveDraft(nextState);
      return nextState;
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
        const bonusCluesRevealedCount = gameState.cluesRevealed.filter((idx) =>
          isBonusClue(gameState.puzzle!, idx)
        ).length;

        const today = new Date().toISOString().split("T")[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
        const newStreak =
          profile.lastPlayedDate === today
            ? profile.currentStreak
            : profile.lastPlayedDate === yesterday
            ? profile.currentStreak + 1
            : 1;

        const score = computeScore(
          gameState.timeElapsed,
          gameState.wrongGuesses,
          bonusCluesRevealedCount,
          gameState.puzzle.difficulty,
          newStreak
        );

        const record: GameRecord = {
          puzzleId: gameState.puzzle.id,
          date: today,
          score,
          timeSeconds: gameState.timeElapsed,
          wrongGuesses: gameState.wrongGuesses,
          penaltySeconds: 0,
          completed: true,
          ranked: gameState.isRanked,
          solution: { suspectId, weaponId, locationId },
        };

        const newHistory = [record, ...gameHistory];
        saveHistory(newHistory);

        if (gameState.isRanked) {
          const wins = newHistory.filter((h) => h.completed);
          const avgSolveTimeSeconds =
            wins.length > 0
              ? Math.round(wins.reduce((acc, h) => acc + h.timeSeconds, 0) / wins.length)
              : 0;

          const newProfile = {
            ...profile,
            totalScore: profile.totalScore + score,
            gamesPlayed: profile.gamesPlayed + 1,
            gamesWon: profile.gamesWon + 1,
            currentStreak: newStreak,
            maxStreak: Math.max(profile.maxStreak, newStreak),
            lastPlayedDate: today,
            avgSolveTimeSeconds,
          };
          newProfile.badges = getBadges(newProfile, newHistory);

          const newLeaderEntry: LeaderboardEntry = {
            name: profile.name,
            avatar: profile.avatar,
            score,
            time: gameState.timeElapsed,
            wrongGuesses: gameState.wrongGuesses,
            date: today,
            puzzleId: gameState.puzzle.id,
            avgSolveTimeSeconds,
          };

          saveProfile(newProfile);
          saveLeaderboard([...leaderboard, newLeaderEntry]);
        }

        clearDraft();
        setGameState((prev) => {
          if (!prev) return prev;
          return { ...prev, isComplete: true, finalScore: score, appliedStreak: newStreak };
        });
        return true;
      } else {
        setGameState((prev) => {
          if (!prev) return prev;
          const nextState = {
            ...prev,
            wrongGuesses: prev.wrongGuesses + 1,
            timeElapsed: prev.timeElapsed + 30,
          };
          saveDraft(nextState);
          return nextState;
        });
        return false;
      }
    },
    [gameState, profile, gameHistory, leaderboard]
  );

  const updateProfile = useCallback(
    (updates: { name?: string; avatar?: string; bio?: string; privacySettings?: PrivacySettings }) => {
      if (
        Platform.OS !== "web" &&
        updates.avatar !== undefined &&
        updates.avatar !== profile.avatar &&
        profile.avatar.startsWith("gallery:") &&
        FileSystem.documentDirectory
      ) {
        const oldPath = profile.avatar.slice("gallery:".length);
        const avatarDir = `${FileSystem.documentDirectory}avatars/`;
        if (oldPath.startsWith(avatarDir)) {
          FileSystem.deleteAsync(oldPath, { idempotent: true }).catch(() => {});
        }
      }
      const updated = { ...profile, ...updates };
      saveProfile(updated);
      if (playerId) {
        syncProfileToBackend(playerId, {
          displayName: updated.name,
          avatar: updated.avatar,
          bio: updated.bio,
          totalScore: updated.totalScore,
          gamesPlayed: updated.gamesPlayed,
          gamesWon: updated.gamesWon,
          maxStreak: updated.maxStreak,
          avgSolveTimeSeconds: updated.avgSolveTimeSeconds,
          badges: updated.badges,
          isPremium: false,
          privacyShowStats: updated.privacySettings.showStats,
          privacyShowBadges: updated.privacySettings.showBadges,
          privacyShowBio: updated.privacySettings.showBio,
          privacyShowAvatar: updated.privacySettings.showAvatar,
        }).catch(() => {});
      }
    },
    [profile, playerId]
  );

  const addBonusPoints = useCallback(
    (points: number) => {
      setProfile((prev) => {
        const updated = { ...prev, totalScore: prev.totalScore + points };
        AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(updated)).catch(() => {});
        if (playerId) {
          syncProfileToBackend(playerId, {
            displayName: updated.name,
            avatar: updated.avatar,
            bio: updated.bio,
            totalScore: updated.totalScore,
            gamesPlayed: updated.gamesPlayed,
            gamesWon: updated.gamesWon,
            maxStreak: updated.maxStreak,
            avgSolveTimeSeconds: updated.avgSolveTimeSeconds,
            badges: updated.badges,
            isPremium: false,
            privacyShowStats: updated.privacySettings.showStats,
            privacyShowBadges: updated.privacySettings.showBadges,
            privacyShowBio: updated.privacySettings.showBio,
            privacyShowAvatar: updated.privacySettings.showAvatar,
          }).catch(() => {});
        }
        return updated;
      });
    },
    [playerId]
  );

  const resetCurrentGame = useCallback(() => {
    clearDraft();
    tickCount.current = 0;
    setGameState(null);
  }, []);

  const tickTimer = useCallback(() => {
    setGameState((prev) => {
      if (!prev || prev.isComplete || !prev.timerActive) return prev;
      const next = { ...prev, timeElapsed: prev.timeElapsed + 1 };
      tickCount.current += 1;
      if (tickCount.current % 30 === 0) saveDraft(next);
      return next;
    });
  }, []);

  return (
    <GameContext.Provider
      value={{
        profile,
        playerId,
        gameHistory,
        leaderboard,
        gameState,
        completedPuzzleIds,
        bestScoreForPuzzle,
        playStatsForPuzzle,
        startDailyPuzzle,
        startPuzzle,
        activateTimer,
        invalidateGame,
        setGridMark,
        revealBonusClue,
        solveMechanic,
        submitAnswer,
        updateProfile,
        addBonusPoints,
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
