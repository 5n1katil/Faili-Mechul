# Faili Meçhul Deploy Flow

## Branch Model
- `main`: production kaynak branch'i (Vercel Production + App Store release adayı).
- `develop`: staging/entegrasyon branch'i (Vercel preview testleri).
- `feature/*`: puzzle veya teknik iyileştirme branch'leri.

## Vercel Environments
- `Preview`: PR ve `develop` için otomatik deploy.
- `Production`: sadece `main` merge sonrası deploy.

## Required Variables (Vercel)
- `EXPO_PUBLIC_REVENUECAT_IOS_KEY`
- `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`

Bu değişkenler `Preview` ve `Production` scope'larında ayrı yönetilmelidir.

## Monorepo Build Target
- Build command: `pnpm --filter @workspace/dedektif build:web`
- Output directory: `artifacts/dedektif/dist`
- Config file: `vercel.json` (repo root)

## PR Gate Checklist
- `pnpm --filter @workspace/dedektif typecheck`
- `pnpm --filter @workspace/dedektif validate`
- `pnpm --filter @workspace/dedektif check:solvability`
- Vercel preview URL smoke test
