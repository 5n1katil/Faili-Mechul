# Case QA v5 — One-Click Sequential Production

## Delivery status

This is an implementation and tested rollout candidate, **not a completed 105-case campaign**.
It builds on PR #70 / v4.9 without changing the exact v29.4 HTML or the avatar pipeline.
No paid model calls were made while developing or testing this delivery.

Read-only audit on 2026-08-30:

| Source | Standard | Premium | Total ready | Unresolved |
| --- | ---: | ---: | ---: | ---: |
| main `b5c1fc10a4754f91aec06fde8273437efc322cda` | 0/45 | 2/60 | 2/105 | 103 |
| v4.9 `bc085a75395ff7f5143115c8480cae6644632912` (v5 starting point) | 1/45 | 2/60 | 3/105 | 102 |

The first incomplete case in both snapshots is `konakta-gece-yarisi-cinayeti`.
The extra completed standard case on v4.9 is Termal; it has not been merged to main.

## Implemented behavior

- Read all 105 current main cases and sidecars, verify the exact HTML Git blob
  `cb53e6613d6379de097599634de26524f4510fbc`, scan deterministically, and select the
  active unfinished case or the first failing case in source order.
- Completion requires score 100, productionReady, all required gates, identity,
  no pre-clue leakage and complete authoring. A progress flag never overrides QA.
- Revalidate checkpoints against the current case source, sidecar and simulator;
  normalize existing rule labels before any model call. No invented evidence.
- Two Luna attempts, then at most one Terra attempt only when the remaining
  authoring/logic gates fail. A near-ready diversity/prose issue does not force Terra.
- Send the selected case with actual K1–K4 findings and recent rejection reasons;
  remove the 105-case portfolio and immutable asset payloads from model input.
  Further per-field context reduction is not claimed: deduction repairs need
  the current clue chain and readable entity profiles.
- Reject lower scores, newly failed previously-passed gates, identity changes,
  policy/portfolio suppression and broad near-ready rewrites. Preserve best candidate.
- Persist the candidate and spending journal on `automation/case-qa-v5-state`.
  Persist a conservative reservation BEFORE each paid HTTP request. Network
  uncertainty is charged conservatively and never automatically retried.
- Stage only the selected case and sidecar, re-import through the real app
  projection, rerun exact QA, and prohibit regressions in previously-complete cases.
- Validate icons, fingerprints, solvability, TypeScript and web build before PR.
- Create/reuse one candidate PR, explicitly dispatch independent CI on the exact
  candidate commit, wait for that correlated run, then squash through GitHub's PR
  API with head SHA and strict branch protection. Verify merged ancestry and QA on
  fresh main. Only then report CASE_COMPLETED, or COMPLETE when all 105 pass.
- Infrastructure changes and avatar production never come from a case patch.

## Spending limits

`policy.json` sets at most 3 calls / $0.25 per Execute, $2 per case across Executes,
and $10 across the campaign. These are safety limits, not a forecast or promise
that all cases can be repaired within that amount. Case and campaign caps do not
reset on the next click. Changing them requires a deliberate policy review.

Prices are inherited from the repository: Luna input/output $0.20/$1.20 per million,
Terra $2/$12. **These prices and model availability have not been independently
verified against the account in this session.** Dollar accounting is an estimate
at configured rates, with actual response token usage when available. It excludes
GitHub Actions and n8n fees. No-retry and call-count limits apply independently.

The first two calls stay Luna; unfinished logic can use Terra if the remaining
budget can reserve its worst-case output. If insufficient, the case stays active.
Repeated identical or uncertain requests are blocked rather than blindly retried.
Protocol/auth/model failures stop safely and require diagnosis, not repeated clicks.

## One-time deployment prerequisites (not yet completed)

1. Review the v5 PR including the v4.9 changes. Do not treat PR #70 alone as v5.
   This delivery does not merge either infrastructure PR automatically.
2. Configure a **classic branch protection rule for main**: require status check
   `Case QA v5 production gates`, require branches up to date, and include admins
   / disallow bypass. Keep squash merge enabled. The repository's native auto-merge
   toggle can remain off; the orchestrator uses an explicit guarded squash merge.
   Do not require manual review unless intentionally willing to pause every case.
   On inspection, main protection was disabled and the repository ruleset list empty.
3. Add Actions secret `CASE_QA_GITHUB_TOKEN` as a fine-grained token restricted to
   this repository: Contents read/write, Pull requests read/write, Actions read/write,
   Administration **read-only** (to inspect protection), Metadata read. The standard
   GITHUB_TOKEN fallback may not read protection; the workflow then stops BEFORE AI.
   Never paste tokens into chat, workflow JSON, source files or command arguments.
   Existing `OPENAI_API_KEY` remains only in the repair step, never candidate CI.
4. After infrastructure CI passes and v5 reaches main, run the new workflow once
   with `audit_only=true` to validate source selection at zero API cost. Then perform
   a bounded live acceptance run through repair, PR, CI, merge and main verification.
   A second Execute must select the next case, or resume the same incomplete case.
5. Import `Faili_Mechul_Case_QA_v5_CONTROL_TOWER_n8n.json` and select the existing
   GitHub OAuth credential on its HTTP nodes once. No credential is embedded.
   It targets main automatically and has no case ID / case limit input.
   Do not replace the working live Control Tower until backend prerequisites pass.

The n8n export has validated JSON, embedded JavaScript, graph and mocked correlation/
evidence checks. **It has not been imported or executed in n8n Cloud in this session**;
no direct n8n connector was available. Its final node reads actual result.json from
the matching Actions artifact and refuses success on budget stops, timeout, missing
evidence or a mere green GitHub request. It never auto-redispatches after polling timeout.

## Validation

```sh
node .case-qa/v5/test.mjs
node .case-qa/v5/control-tower-test.mjs
node .case-qa/fm_case_qa_repair_state_test.mjs
node .case-qa/fm_case_qa_termal_regression_test.mjs
node .case-qa/fm_case_qa_certify.mjs
FM_QA_V5_AUDIT=true node .case-qa/v5/run.mjs
```

Local application validation, fingerprint validation, solvability, TypeScript and
web export passed on the v5 worktree. Runtime pnpm 11 initially stopped because of
its esbuild install-script policy; no policy was weakened. The installed package
entry points were used directly for the checks. CI remains pinned to pnpm 10.34.5.

Real-model repair effectiveness for the other 102 cases and live CI-to-merge
operation are **not yet proven**. QA 100 certifies the implemented structural gates;
it cannot guarantee fun, prose quality, historical accuracy or flawless mobile UX.
