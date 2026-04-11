import { pgTable, text, integer, boolean, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const playerProfiles = pgTable("player_profiles", {
  playerId: text("player_id").primaryKey(),
  displayName: text("display_name").notNull().default(""),
  avatar: text("avatar").notNull().default(""),
  bio: text("bio").notNull().default(""),
  totalScore: integer("total_score").notNull().default(0),
  gamesPlayed: integer("games_played").notNull().default(0),
  gamesWon: integer("games_won").notNull().default(0),
  maxStreak: integer("max_streak").notNull().default(0),
  avgSolveTimeSeconds: real("avg_solve_time_seconds").notNull().default(0),
  badges: text("badges").notNull().default("[]"),
  isPremium: boolean("is_premium").notNull().default(false),
  privacyShowStats: boolean("privacy_show_stats").notNull().default(true),
  privacyShowBadges: boolean("privacy_show_badges").notNull().default(true),
  privacyShowBio: boolean("privacy_show_bio").notNull().default(true),
  privacyShowAvatar: boolean("privacy_show_avatar").notNull().default(true),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPlayerProfileSchema = createInsertSchema(playerProfiles, {
  bio: (s) => s.max(160),
});

export const selectPlayerProfileSchema = createSelectSchema(playerProfiles);

export type InsertPlayerProfile = z.infer<typeof insertPlayerProfileSchema>;
export type PlayerProfile = typeof playerProfiles.$inferSelect;
