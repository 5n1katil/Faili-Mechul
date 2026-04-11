import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { PUZZLES } from "@/data/puzzles";
import {
  ALL_MISSIONS,
  DAILY_MISSIONS,
  WEEKLY_MISSIONS,
  type Mission,
} from "@/data/missions";
import { useGame, type GameRecord, type PlayerProfile } from "@/context/GameContext";

const MISSION_STATE_KEY = "@dedektif_mission_state";

interface StoredMissionState {
  awardedIds: string[];
  seenIds: string[];
  lastDailyDate: string;
  lastWeeklyMonday: string;
}

interface MissionProgress {
  missionId: string;
  current: number;
  target: number;
  completed: boolean;
}

interface MissionContextType {
  getMissionProgress: (missionId: string) => MissionProgress;
  isAwarded: (missionId: string) => boolean;
  isSeen: (missionId: string) => boolean;
  unseenCompletedCount: number;
  markAllSeen: () => void;
  dailyTimeLeft: string;
  weeklyTimeLeft: string;
}

const MissionContext = createContext<MissionContextType | null>(null);

const PUZZLE_DIFFICULTY_MAP = new Map(PUZZLES.map((p) => [p.id, p.difficulty]));

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

function getCurrentWeekMonday(): string {
  const d = new Date();
  const day = d.getDay() || 7;
  const monday = new Date(d);
  monday.setDate(d.getDate() - day + 1);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split("T")[0];
}

function isThisWeek(dateStr: string): boolean {
  const monday = new Date(getCurrentWeekMonday());
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  const d = new Date(dateStr);
  return d >= monday && d <= sunday;
}

function computeProgress(
  mission: Mission,
  gameHistory: GameRecord[],
  profile: PlayerProfile
): number {
  const completed = gameHistory.filter((h) => h.completed);
  const today = getToday();

  switch (mission.type) {
    case "daily": {
      const todayRecords = completed.filter((h) => h.date === today);
      return _computeForPeriod(mission, todayRecords, profile);
    }
    case "weekly": {
      const weekRecords = completed.filter((h) => isThisWeek(h.date));
      return _computeForPeriod(mission, weekRecords, profile);
    }
    case "achievement": {
      return _computeAchievement(mission, completed, profile);
    }
  }
}

function _computeForPeriod(
  mission: Mission,
  records: GameRecord[],
  profile: PlayerProfile
): number {
  const req = mission.requirement;
  switch (req.type) {
    case "solve_count":
      return records.length;
    case "perfect_solve":
      return records.filter((h) => h.wrongGuesses === 0).length;
    case "speed_solve": {
      const limit = req.timeLimit ?? 300;
      return records.filter((h) => h.timeSeconds < limit && h.timeSeconds > 0).length;
    }
    case "solve_difficulty": {
      if (!req.difficulty) return 0;
      return records.filter((h) => {
        const diff = PUZZLE_DIFFICULTY_MAP.get(h.puzzleId);
        if (req.difficulty === "dedektif") {
          return diff === "dedektif" || diff === "baskomiser";
        }
        return diff === req.difficulty;
      }).length;
    }
    case "high_score_once":
      return records.some((h) => h.score >= req.value) ? req.value : 0;
    case "streak_days":
      return Math.min(profile.maxStreak, req.value);
    default:
      return 0;
  }
}

function _computeAchievement(
  mission: Mission,
  allCompleted: GameRecord[],
  profile: PlayerProfile
): number {
  const req = mission.requirement;
  switch (req.type) {
    case "total_solved":
      return allCompleted.length;
    case "total_perfect":
      return allCompleted.filter((h) => h.wrongGuesses === 0).length;
    case "speed_solve": {
      const limit = req.timeLimit ?? 180;
      return allCompleted.filter((h) => h.timeSeconds < limit && h.timeSeconds > 0).length;
    }
    case "solve_difficulty": {
      if (!req.difficulty) return 0;
      return allCompleted.filter(
        (h) => PUZZLE_DIFFICULTY_MAP.get(h.puzzleId) === req.difficulty
      ).length;
    }
    case "streak_days":
      return profile.maxStreak;
    case "high_score_once":
      return allCompleted.some((h) => h.score >= req.value) ? req.value : 0;
    case "total_score":
      return profile.totalScore;
    default:
      return 0;
  }
}

function getSecondsUntilMidnight(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return Math.floor((midnight.getTime() - now.getTime()) / 1000);
}

function getSecondsUntilNextMonday(): number {
  const now = new Date();
  const day = now.getDay() || 7;
  const daysUntilMonday = 8 - day;
  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() + daysUntilMonday);
  nextMonday.setHours(0, 0, 0, 0);
  return Math.floor((nextMonday.getTime() - now.getTime()) / 1000);
}

function formatCountdown(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function MissionProvider({ children }: { children: React.ReactNode }) {
  const { gameHistory, profile, addBonusPoints } = useGame();

  const [awardedIds, setAwardedIds] = useState<string[]>([]);
  const [seenIds, setSeenIds] = useState<string[]>([]);
  const [lastDailyDate, setLastDailyDate] = useState<string>("");
  const [lastWeeklyMonday, setLastWeeklyMonday] = useState<string>("");
  const [loaded, setLoaded] = useState(false);

  const [dailySeconds, setDailySeconds] = useState(getSecondsUntilMidnight);
  const [weeklySeconds, setWeeklySeconds] = useState(getSecondsUntilNextMonday);

  const prevHistoryLength = useRef(0);

  useEffect(() => {
    const id = setInterval(() => {
      setDailySeconds(getSecondsUntilMidnight());
      setWeeklySeconds(getSecondsUntilNextMonday());
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    loadState();
  }, []);

  const loadState = async () => {
    try {
      const raw = await AsyncStorage.getItem(MISSION_STATE_KEY);
      const today = getToday();
      const monday = getCurrentWeekMonday();

      if (raw) {
        const parsed: StoredMissionState = JSON.parse(raw);
        let { awardedIds: aids, seenIds: sids, lastDailyDate: ldd, lastWeeklyMonday: lwm } = parsed;

        if (ldd !== today) {
          const dailyIds = new Set(DAILY_MISSIONS.map((m) => m.id));
          aids = aids.filter((id) => !dailyIds.has(id));
          sids = sids.filter((id) => !dailyIds.has(id));
          ldd = today;
        }

        if (lwm !== monday) {
          const weeklyIds = new Set(WEEKLY_MISSIONS.map((m) => m.id));
          aids = aids.filter((id) => !weeklyIds.has(id));
          sids = sids.filter((id) => !weeklyIds.has(id));
          lwm = monday;
        }

        setAwardedIds(aids);
        setSeenIds(sids);
        setLastDailyDate(ldd);
        setLastWeeklyMonday(lwm);
      } else {
        setLastDailyDate(today);
        setLastWeeklyMonday(monday);
      }
    } catch {}
    setLoaded(true);
  };

  const saveState = useCallback(
    async (aids: string[], sids: string[], ldd: string, lwm: string) => {
      try {
        const state: StoredMissionState = {
          awardedIds: aids,
          seenIds: sids,
          lastDailyDate: ldd,
          lastWeeklyMonday: lwm,
        };
        await AsyncStorage.setItem(MISSION_STATE_KEY, JSON.stringify(state));
      } catch {}
    },
    []
  );

  useEffect(() => {
    if (!loaded) return;
    if (gameHistory.length === prevHistoryLength.current) return;
    prevHistoryLength.current = gameHistory.length;

    const newlyCompleted: string[] = [];
    let totalBonus = 0;

    for (const mission of ALL_MISSIONS) {
      if (awardedIds.includes(mission.id)) continue;
      const progress = computeProgress(mission, gameHistory, profile);
      if (progress >= mission.requirement.value) {
        newlyCompleted.push(mission.id);
        totalBonus += mission.reward.points;
      }
    }

    if (newlyCompleted.length > 0) {
      const newAwardedIds = [...awardedIds, ...newlyCompleted];
      setAwardedIds(newAwardedIds);
      saveState(newAwardedIds, seenIds, lastDailyDate, lastWeeklyMonday);
      if (totalBonus > 0) {
        addBonusPoints(totalBonus);
      }
    }
  }, [gameHistory, loaded]);

  useEffect(() => {
    if (!loaded) return;
    const today = getToday();
    const monday = getCurrentWeekMonday();

    let changed = false;
    let newAids = [...awardedIds];
    let newSids = [...seenIds];
    let newLdd = lastDailyDate;
    let newLwm = lastWeeklyMonday;

    if (lastDailyDate && lastDailyDate !== today) {
      const dailyIds = new Set(DAILY_MISSIONS.map((m) => m.id));
      newAids = newAids.filter((id) => !dailyIds.has(id));
      newSids = newSids.filter((id) => !dailyIds.has(id));
      newLdd = today;
      changed = true;
    }

    if (lastWeeklyMonday && lastWeeklyMonday !== monday) {
      const weeklyIds = new Set(WEEKLY_MISSIONS.map((m) => m.id));
      newAids = newAids.filter((id) => !weeklyIds.has(id));
      newSids = newSids.filter((id) => !weeklyIds.has(id));
      newLwm = monday;
      changed = true;
    }

    if (changed) {
      setAwardedIds(newAids);
      setSeenIds(newSids);
      setLastDailyDate(newLdd);
      setLastWeeklyMonday(newLwm);
      saveState(newAids, newSids, newLdd, newLwm);
    }
  }, [loaded]);

  const progressMap = useMemo(() => {
    const map = new Map<string, MissionProgress>();
    for (const mission of ALL_MISSIONS) {
      const current = computeProgress(mission, gameHistory, profile);
      const target = mission.requirement.value;
      map.set(mission.id, {
        missionId: mission.id,
        current: Math.min(current, target),
        target,
        completed: current >= target,
      });
    }
    return map;
  }, [gameHistory, profile]);

  const getMissionProgress = useCallback(
    (missionId: string): MissionProgress => {
      return (
        progressMap.get(missionId) ?? {
          missionId,
          current: 0,
          target: 1,
          completed: false,
        }
      );
    },
    [progressMap]
  );

  const isAwarded = useCallback(
    (missionId: string) => awardedIds.includes(missionId),
    [awardedIds]
  );

  const isSeen = useCallback(
    (missionId: string) => seenIds.includes(missionId),
    [seenIds]
  );

  const unseenCompletedCount = useMemo(() => {
    return awardedIds.filter((id) => !seenIds.includes(id)).length;
  }, [awardedIds, seenIds]);

  const markAllSeen = useCallback(() => {
    const newSeenIds = [...new Set([...seenIds, ...awardedIds])];
    setSeenIds(newSeenIds);
    saveState(awardedIds, newSeenIds, lastDailyDate, lastWeeklyMonday);
  }, [awardedIds, seenIds, lastDailyDate, lastWeeklyMonday, saveState]);

  const dailyTimeLeft = formatCountdown(dailySeconds);
  const weeklyTimeLeft = formatCountdown(weeklySeconds);

  return (
    <MissionContext.Provider
      value={{
        getMissionProgress,
        isAwarded,
        isSeen,
        unseenCompletedCount,
        markAllSeen,
        dailyTimeLeft,
        weeklyTimeLeft,
      }}
    >
      {children}
    </MissionContext.Provider>
  );
}

export function useMission() {
  const ctx = useContext(MissionContext);
  if (!ctx) throw new Error("useMission must be used inside MissionProvider");
  return ctx;
}
