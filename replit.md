# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Faili Meçhul — Dedektif Bulmaca Oyunu (Mobile App)

Turkish Murdle-style detective deduction puzzle game built with Expo React Native.

### App Identifiers

- **iOS Bundle ID**: `com.failimechul.dedektif`
- **Android Package**: `com.failimechul.dedektif`
- **Expo Slug**: `dedektif`
- **App Name**: Faili Meçhul
- **Version**: 1.0.0 (iOS buildNumber: 1, Android versionCode: 1)

### EAS Build

- Config: `artifacts/dedektif/eas.json`
- Profiles: `development` (internal), `preview` (internal), `production` (autoIncrement)
- To build for production: `cd artifacts/dedektif && eas build --profile production --platform ios`
- To submit to App Store: `eas submit --profile production --platform ios`

### Key App Files

- `artifacts/dedektif/app/(tabs)/` — screens: index (home), oyun (game), liderlik (leaderboard), profil (profile)
- `artifacts/dedektif/components/DetectiveGrid.tsx` — L-shaped Murdle deduction grid
- `artifacts/dedektif/context/GameContext.tsx` — game state, scoring, streak, badges
- `artifacts/dedektif/data/puzzles.ts` — 20 Turkish puzzles, daily puzzle system
- `artifacts/dedektif/app.json` — Expo config with full App Store metadata
- `artifacts/dedektif/eas.json` — EAS build configuration

### Design System

- Background: `#0F1117`, Primary gold: `#D4A843`, Accent red: `#C8372D`, Card: `#1A1F2E`
- Suspect color: `#A855F7` (purple), Weapon: `#C8372D` (red), Location: `#D4A843` (gold)
- Full dark mode only (`userInterfaceStyle: "dark"`)

### App Store Requirements

- Privacy Policy URL needed: `https://failimechul.app/gizlilik` (placeholder — create before submission)
- No data is collected from users (all storage is local AsyncStorage only)
- No analytics, no network requests
