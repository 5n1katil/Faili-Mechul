import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { playerProfiles } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.put("/profiles/:playerId", async (req, res) => {
  const { playerId } = req.params;

  if (!playerId || !/^[0-9a-f-]{36}$/i.test(playerId)) {
    res.status(400).json({ error: "Geçersiz oyuncu kimliği" });
    return;
  }

  const body = req.body as Record<string, unknown>;

  const upsertData = {
    playerId,
    displayName: typeof body.displayName === "string" ? body.displayName.slice(0, 50) : undefined,
    avatar: typeof body.avatar === "string" ? body.avatar.slice(0, 100) : undefined,
    bio: typeof body.bio === "string" ? body.bio.slice(0, 160) : undefined,
    totalScore: typeof body.totalScore === "number" ? body.totalScore : undefined,
    gamesPlayed: typeof body.gamesPlayed === "number" ? body.gamesPlayed : undefined,
    gamesWon: typeof body.gamesWon === "number" ? body.gamesWon : undefined,
    maxStreak: typeof body.maxStreak === "number" ? body.maxStreak : undefined,
    avgSolveTimeSeconds: typeof body.avgSolveTimeSeconds === "number" ? body.avgSolveTimeSeconds : undefined,
    badges: Array.isArray(body.badges) ? JSON.stringify(body.badges) : undefined,
    isPremium: typeof body.isPremium === "boolean" ? body.isPremium : undefined,
    privacyShowStats: typeof body.privacyShowStats === "boolean" ? body.privacyShowStats : undefined,
    privacyShowBadges: typeof body.privacyShowBadges === "boolean" ? body.privacyShowBadges : undefined,
    privacyShowBio: typeof body.privacyShowBio === "boolean" ? body.privacyShowBio : undefined,
    privacyShowAvatar: typeof body.privacyShowAvatar === "boolean" ? body.privacyShowAvatar : undefined,
    updatedAt: new Date(),
  };

  const cleanData = Object.fromEntries(
    Object.entries(upsertData).filter(([, v]) => v !== undefined)
  ) as typeof upsertData;

  try {
    await db
      .insert(playerProfiles)
      .values({ ...cleanData, playerId })
      .onConflictDoUpdate({
        target: playerProfiles.playerId,
        set: cleanData,
      });

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to upsert player profile");
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

router.get("/profiles/:playerId", async (req, res) => {
  const { playerId } = req.params;

  if (!playerId || !/^[0-9a-f-]{36}$/i.test(playerId)) {
    res.status(400).json({ error: "Geçersiz oyuncu kimliği" });
    return;
  }

  try {
    const rows = await db
      .select()
      .from(playerProfiles)
      .where(eq(playerProfiles.playerId, playerId))
      .limit(1);

    if (rows.length === 0) {
      res.status(404).json({ error: "Oyuncu bulunamadı" });
      return;
    }

    const profile = rows[0]!;

    const publicProfile: Record<string, unknown> = {
      playerId: profile.playerId,
      displayName: profile.displayName,
      isPremium: profile.isPremium,
      updatedAt: profile.updatedAt,
      privacy: {
        showStats: profile.privacyShowStats,
        showBadges: profile.privacyShowBadges,
        showBio: profile.privacyShowBio,
        showAvatar: profile.privacyShowAvatar,
      },
    };

    if (profile.privacyShowAvatar) {
      publicProfile.avatar = profile.avatar;
    }

    if (profile.privacyShowBio) {
      publicProfile.bio = profile.bio;
    }

    if (profile.privacyShowStats) {
      publicProfile.stats = {
        totalScore: profile.totalScore,
        gamesPlayed: profile.gamesPlayed,
        gamesWon: profile.gamesWon,
        maxStreak: profile.maxStreak,
        avgSolveTimeSeconds: profile.avgSolveTimeSeconds,
      };
    }

    if (profile.privacyShowBadges) {
      try {
        publicProfile.badges = JSON.parse(profile.badges) as string[];
      } catch {
        publicProfile.badges = [];
      }
    }

    res.json(publicProfile);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch player profile");
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

export default router;
