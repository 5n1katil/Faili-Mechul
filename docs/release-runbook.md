# Faili Meçhul Release Runbook

## 1) Release Candidate Hazirligi
1. Tum ilgili degisiklikleri `develop` branch'inde birlestir.
2. Asagidaki kapilari gec:
   - `pnpm --filter @workspace/dedektif typecheck`
   - `pnpm --filter @workspace/dedektif validate`
   - `pnpm --filter @workspace/dedektif check:solvability`
   - `pnpm --filter @workspace/dedektif build:web`
3. Vercel preview URL uzerinden smoke test yap:
   - onboarding
   - puzzle listesi
   - temel cozum akisi
   - bonus clue davranisi
   - premium/paywall ekranlari

## 2) Production Web Deployment
1. Release adayini `main` branch'ine merge et.
2. Vercel production deployment tamamlanmasini bekle.
3. Production URL smoke test yap.

## 3) iOS Build ve ASC Submit
1. `artifacts/dedektif` altinda version/build numarasini guncelle.
2. Kendi terminalinden calistir:
   - `eas build --platform ios --profile production`
3. Build tamamlandiktan sonra submit et:
   - `eas submit --platform ios --profile production`
4. App Store Connect'te metadata ve release notes guncelle.

## 4) Hedef Sureler (KPI)
- Puzzle degisikligi -> preview test: ayni gun
- Release adayi -> ASC submit: 1 gun
- Review sonrasi hotfix submit: 24 saat icinde
