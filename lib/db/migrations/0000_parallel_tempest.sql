CREATE TABLE "player_profiles" (
	"player_id" text PRIMARY KEY NOT NULL,
	"display_name" text DEFAULT '' NOT NULL,
	"avatar" text DEFAULT '' NOT NULL,
	"bio" text DEFAULT '' NOT NULL,
	"total_score" integer DEFAULT 0 NOT NULL,
	"games_played" integer DEFAULT 0 NOT NULL,
	"games_won" integer DEFAULT 0 NOT NULL,
	"max_streak" integer DEFAULT 0 NOT NULL,
	"avg_solve_time_seconds" real DEFAULT 0 NOT NULL,
	"badges" text DEFAULT '[]' NOT NULL,
	"is_premium" boolean DEFAULT false NOT NULL,
	"privacy_show_stats" boolean DEFAULT true NOT NULL,
	"privacy_show_badges" boolean DEFAULT true NOT NULL,
	"privacy_show_bio" boolean DEFAULT true NOT NULL,
	"privacy_show_avatar" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
