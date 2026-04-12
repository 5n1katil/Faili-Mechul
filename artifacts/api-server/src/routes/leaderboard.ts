import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { playerProfiles } from "@workspace/db/schema";
import { and, eq, ne, asc, desc } from "drizzle-orm";
import { z } from "zod";

const router: IRouter = Router();

const VALID_SORT_KEYS = ["totalScore", "gamesWon", "maxStreak", "avgSolveTimeSeconds"] as const;
type SortKey = (typeof VALID_SORT_KEYS)[number];

const querySchema = z.object({
  sortBy: z.enum(VALID_SORT_KEYS).default("totalScore"),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

function getOrderExpr(sortBy: SortKey) {
  switch (sortBy) {
    case "gamesWon":
      return desc(playerProfiles.gamesWon);
    case "maxStreak":
      return desc(playerProfiles.maxStreak);
    case "avgSolveTimeSeconds":
      return asc(playerProfiles.avgSolveTimeSeconds);
    default:
      return desc(playerProfiles.totalScore);
  }
}

router.get("/leaderboard", async (req, res) => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Geçersiz parametreler", details: parsed.error.flatten() });
    return;
  }

  const { sortBy, limit } = parsed.data;

  try {
    const rows = await db
      .select({
        playerId: playerProfiles.playerId,
        displayName: playerProfiles.displayName,
        avatar: playerProfiles.avatar,
        isPremium: playerProfiles.isPremium,
        totalScore: playerProfiles.totalScore,
        gamesWon: playerProfiles.gamesWon,
        maxStreak: playerProfiles.maxStreak,
        avgSolveTimeSeconds: playerProfiles.avgSolveTimeSeconds,
        privacyShowAvatar: playerProfiles.privacyShowAvatar,
      })
      .from(playerProfiles)
      .where(
        and(
          eq(playerProfiles.privacyShowStats, true),
          ne(playerProfiles.displayName, "")
        )
      )
      .orderBy(getOrderExpr(sortBy))
      .limit(limit);

    const result = rows.map((r) => ({
      playerId: r.playerId,
      displayName: r.displayName,
      avatar: r.privacyShowAvatar ? r.avatar : "",
      isPremium: r.isPremium,
      totalScore: r.totalScore,
      gamesWon: r.gamesWon,
      maxStreak: r.maxStreak,
      avgSolveTimeSeconds: r.avgSolveTimeSeconds,
    }));

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch leaderboard");
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

export default router;
