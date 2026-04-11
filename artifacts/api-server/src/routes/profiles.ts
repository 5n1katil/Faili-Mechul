import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { playerProfiles } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router: IRouter = Router();

const UUID_SCHEMA = z.string().uuid();

const upsertBodySchema = z.object({
  displayName: z.string().max(50).optional(),
  avatar: z.string().max(100).optional(),
  bio: z.string().max(160).optional(),
  totalScore: z.number().int().min(0).optional(),
  gamesPlayed: z.number().int().min(0).optional(),
  gamesWon: z.number().int().min(0).optional(),
  maxStreak: z.number().int().min(0).optional(),
  avgSolveTimeSeconds: z.number().min(0).optional(),
  badges: z.array(z.string()).optional(),
  isPremium: z.boolean().optional(),
  privacyShowStats: z.boolean().optional(),
  privacyShowBadges: z.boolean().optional(),
  privacyShowBio: z.boolean().optional(),
  privacyShowAvatar: z.boolean().optional(),
});

router.put("/profiles/:playerId", async (req, res) => {
  const uuidResult = UUID_SCHEMA.safeParse(req.params.playerId);
  if (!uuidResult.success) {
    res.status(400).json({ error: "Geçersiz oyuncu kimliği" });
    return;
  }
  const playerId = uuidResult.data;

  const bodyResult = upsertBodySchema.safeParse(req.body);
  if (!bodyResult.success) {
    res.status(400).json({ error: "Geçersiz istek gövdesi", details: bodyResult.error.flatten() });
    return;
  }

  const body = bodyResult.data;

  const upsertData: Partial<typeof playerProfiles.$inferInsert> & { playerId: string; updatedAt: Date } = {
    playerId,
    updatedAt: new Date(),
    ...(body.displayName !== undefined && { displayName: body.displayName }),
    ...(body.avatar !== undefined && { avatar: body.avatar }),
    ...(body.bio !== undefined && { bio: body.bio }),
    ...(body.totalScore !== undefined && { totalScore: body.totalScore }),
    ...(body.gamesPlayed !== undefined && { gamesPlayed: body.gamesPlayed }),
    ...(body.gamesWon !== undefined && { gamesWon: body.gamesWon }),
    ...(body.maxStreak !== undefined && { maxStreak: body.maxStreak }),
    ...(body.avgSolveTimeSeconds !== undefined && { avgSolveTimeSeconds: body.avgSolveTimeSeconds }),
    ...(body.badges !== undefined && { badges: JSON.stringify(body.badges) }),
    ...(body.isPremium !== undefined && { isPremium: body.isPremium }),
    ...(body.privacyShowStats !== undefined && { privacyShowStats: body.privacyShowStats }),
    ...(body.privacyShowBadges !== undefined && { privacyShowBadges: body.privacyShowBadges }),
    ...(body.privacyShowBio !== undefined && { privacyShowBio: body.privacyShowBio }),
    ...(body.privacyShowAvatar !== undefined && { privacyShowAvatar: body.privacyShowAvatar }),
  };

  try {
    await db
      .insert(playerProfiles)
      .values(upsertData)
      .onConflictDoUpdate({
        target: playerProfiles.playerId,
        set: upsertData,
      });

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to upsert player profile");
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

router.get("/profiles/:playerId", async (req, res) => {
  const uuidResult = UUID_SCHEMA.safeParse(req.params.playerId);
  if (!uuidResult.success) {
    res.status(400).json({ error: "Geçersiz oyuncu kimliği" });
    return;
  }
  const playerId = uuidResult.data;

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
