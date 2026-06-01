---
name: Parmak izi e2e navigation
description: Navigation patterns and gotchas for e2e testing the fingerprint mini-game in the Faili Meçhul app
---

## Bonus clue reveal (revealOrder > 4)
`isBonus: c.revealOrder > 4` in adaptPackPuzzle (packs.ts). Clues at revealOrder=5 or 6 are locked. On web, clicking "Açmak için dokun" triggers `globalThis.confirm()`. In Playwright: `page.once("dialog", d => d.accept())` before clicking the button.

**Why:** ott_002, hw_005, sf_002 all have parmak_izi at revealOrder=5, so the ParmakIziBlock never renders unless the bonus clue is revealed first.

**How to apply:** Before calling `expectFingerprintBlock()` for puzzles with revealOrder=5 parmak_izi clues, call `revealFirstBonusClue()` which auto-accepts the dialog and clicks "Açmak için dokun".

## Pack tab puzzle click
Paketler tab puzzles don't have `data-testid="puzzle-card"`. Use rnClick tabindex traversal:
```js
for (const el of querySelectorAll("*")) {
  if (el.textContent?.trim() === title) {
    let p = el.parentElement;
    while (p && !p.hasAttribute("tabindex")) p = p.parentElement;
    if (p) { p.click(); return true; }
  }
}
```

## Decoy fingerprint for wrong-selection test
rc_002 now has iz3 (`isDecoy: true`, eslesme: "s2" not in sonuc). The validate script skips the sonuc-match check for decoys and instead verifies decoys DON'T match. Select "Kadeh tabanı" → click confirm → "Yanlış iz — tekrar dene" appears.

## Standart tab navigation
"Premium Vaka Arşivi" accordion is ALREADY expanded by default. Clicking collapses it. Only click the difficulty sub-accordion (last instance of "Çaylak"/"Dedektif"/"Baş Komiser").
