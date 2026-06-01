/**
 * Parmak İzi Mini-Oyun E2E Testleri
 *
 * Kapsam:
 *   - Tekli eşleşme doğrulaması (yeni_c03, ott_002, ott_004, hw_003, hw_004, hw_005, sf_002)
 *   - Çift eşleşme: aynı şüpheli, iki iz (fen_004)
 *   - Çift eşleşme: iki farklı suçlu (rc_002 — iz1 ve iz2)
 *   - Yanlış iz seçimi → "Yanlış iz — tekrar dene" (rc_002 iz3/decoy)
 *   - Seçim yapılmadan onayla butonu çalışmaz
 *
 * Navigasyon notları:
 *   - Standart tab: "Premium Vaka Arşivi" accordion varsayılan açık gelir —
 *     tıklamak KAPATIR. Sadece zorluk sub-accordion'ını tıkla.
 *   - Paketler tab: Pack kartına tıklayınca bulmaca listesi satır içi açılır.
 *   - clickPuzzleCard: önce data-testid="puzzle-card" arar; bulamazsa
 *     rnClick tabindex traversal yapar.
 */

import { test, expect, Page } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:22971";

// ---------------------------------------------------------------------------
// Yardımcı fonksiyonlar
// ---------------------------------------------------------------------------

/**
 * Premium erişimi localStorage'a simüle et.
 * @react-native-async-storage/async-storage web'de localStorage'ı doğrudan kullanır.
 */
async function unlockPremium(page: Page) {
  await page.addInitScript(() => {
    const packs = [
      "pack_001", "pack_002", "pack_003", "pack_004", "pack_005",
      "pack_fenomen", "pack_mitoloji", "pack_dijital", "pack_edebi",
      "pack_caylik", "pack_dedektif", "pack_komiser",
    ];
    localStorage.setItem("@dedektif_is_premium", "1");
    for (const id of packs) {
      localStorage.setItem(`@dedektif_pack_${id}`, "1");
    }
  });
}

/** Oyun sekmesine git ve temel renderı bekle. */
async function goToVakalar(page: Page) {
  await page.goto(`${BASE}/oyun`, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(2500);
}

/**
 * Premium Vaka Arşivi (Standart tab) altındaki zorluk grubunu aç.
 * "Premium Vaka Arşivi" varsayılan açık — tıklama onu KAPATIR.
 * Sadece difficulty sub-accordion (son örnek) tıklanır.
 */
async function expandPremiumDifficulty(page: Page, difficulty: string) {
  const els = await page.getByText(difficulty, { exact: true }).all();
  expect(els.length).toBeGreaterThan(0);
  await els[els.length - 1].click({ force: true });
  await page.waitForTimeout(800);
}

/**
 * Paketler sekmesine geç ve belirtilen paketi satır içi aç.
 */
async function expandPackInPaketler(page: Page, packName: string) {
  await page.getByText("Paketler", { exact: true }).first().click({ force: true });
  await page.waitForTimeout(800);
  await page.getByText(packName, { exact: false }).first().click({ force: true });
  await page.waitForTimeout(1000);
}

/**
 * Bulmaca kartını tıkla.
 * 1) data-testid="puzzle-card" içinde başlıkla ara (Standart tab)
 * 2) Bulamazsa rnClick tarzı tabindex traversal (Paketler tab)
 */
async function clickPuzzleCard(page: Page, title: string) {
  const clicked = await page.evaluate((t: string) => {
    const cards = document.querySelectorAll('[data-testid="puzzle-card"]');
    for (const card of Array.from(cards)) {
      if (card.textContent?.includes(t)) {
        (card as HTMLElement).click();
        return true;
      }
    }
    for (const el of Array.from(document.querySelectorAll("*"))) {
      if (el.textContent?.trim() === t) {
        let p: Element | null = el.parentElement;
        while (p && !p.hasAttribute("tabindex")) p = p.parentElement;
        if (p) { (p as HTMLElement).click(); return true; }
      }
    }
    return false;
  }, title);
  expect(clicked).toBe(true);
  await page.waitForTimeout(800);
}

/** Oyunu başlat. */
async function startGame(page: Page) {
  const btn = page.getByTestId("start-game-btn");
  await expect(btn).toBeVisible({ timeout: 8000 });
  await btn.click({ force: true });
  await page.waitForTimeout(1500);
}

/** Parmak izi bloğunun yüklendiğini doğrula. */
async function expectFingerprintBlock(page: Page) {
  await expect(page.getByText("PARMAK İZİ ANALİZİ").first()).toBeVisible({ timeout: 8000 });
  await expect(page.getByText("Kanıt izini seç:").first()).toBeVisible({ timeout: 5000 });
}

/**
 * Kilitli (bonus) parmak izi ipucunu aç.
 * Web'de globalThis.confirm() dialog gelir — otomatik kabul edilir.
 * Sayfada birden fazla "Açmak için dokun" butonu olabilir;
 * nth(0) = parmak_izi ipucu (revealOrder=5, ilk bonus ipucu).
 */
async function revealFirstBonusClue(page: Page) {
  page.once("dialog", (dialog) => dialog.accept());
  const buttons = page.getByText("Açmak için dokun");
  await expect(buttons.first()).toBeVisible({ timeout: 8000 });
  await buttons.first().click({ force: true });
  await page.waitForTimeout(1000);
}

/**
 * Belirtilen konum etiketine sahip iz kartını seç ve "Eşleşmeyi Onayla" butonuna tıkla.
 * "Eşleşmeyi Onayla" butonu tabindex yok — metin traversal ile tıklanır.
 */
async function selectAndConfirmFingerprint(page: Page, konumText: string) {
  const izCard = page.getByText(konumText).first();
  await expect(izCard).toBeVisible({ timeout: 5000 });
  await izCard.click({ force: true });
  await page.waitForTimeout(400);

  await page.evaluate(() => {
    for (const el of Array.from(document.querySelectorAll("*"))) {
      if (el.textContent?.trim() === "Eşleşmeyi Onayla") {
        let p: Element | null = el.parentElement;
        while (p && !p.hasAttribute("tabindex")) p = p.parentElement;
        if (p) { (p as HTMLElement).click(); return; }
      }
    }
  });
  await page.waitForTimeout(600);
}

// ---------------------------------------------------------------------------
// STANDART TAB — Premium Çaylak (pack_caylik)
// ---------------------------------------------------------------------------

test("yeni_c03: tekli parmak izi — doğru seçim 'Parmak İzi Eşleşti!' gösterir", async ({ page }) => {
  await unlockPremium(page);
  await goToVakalar(page);

  await expandPremiumDifficulty(page, "Çaylak");
  await clickPuzzleCard(page, "Kuyumcunun Altın Sırrı");
  await startGame(page);

  await expect(page.getByText("ŞÜPHELİLER").first()).toBeVisible({ timeout: 8000 });
  await expectFingerprintBlock(page);

  await selectAndConfirmFingerprint(page, "Kefe alt yüzey");

  await expect(page.getByText("Parmak İzi Eşleşti!").first()).toBeVisible({ timeout: 5000 });
});

// ---------------------------------------------------------------------------
// PAKETLER TAB — Osmanlı Gizemleri (pack_001)
// ---------------------------------------------------------------------------

test("ott_002: Büyük Çarşı'da Kayıp Mühür — vazo sapı izini onayla (bonus ipucu açılır)", async ({ page }) => {
  await unlockPremium(page);
  await goToVakalar(page);

  await expandPackInPaketler(page, "Osmanlı Gizemleri");
  await clickPuzzleCard(page, "Büyük Çarşı'da Kayıp Mühür");
  await startGame(page);

  await expect(page.getByText("ŞÜPHELİLER").first()).toBeVisible({ timeout: 8000 });

  // Parmak izi ipucu kilitli (revealOrder=5) — önce bonus açılmalı
  await revealFirstBonusClue(page);
  await expectFingerprintBlock(page);

  await selectAndConfirmFingerprint(page, "Vazo Sapı");

  await expect(page.getByText("Parmak İzi Eşleşti!").first()).toBeVisible({ timeout: 5000 });
});

test("ott_004: Tersane Komutanının Sonu — kadeh tabanı izini onayla", async ({ page }) => {
  await unlockPremium(page);
  await goToVakalar(page);

  await expandPackInPaketler(page, "Osmanlı Gizemleri");
  await clickPuzzleCard(page, "Tersane Komutanının Sonu");
  await startGame(page);

  await expect(page.getByText("ŞÜPHELİLER").first()).toBeVisible({ timeout: 8000 });
  await expectFingerprintBlock(page);

  await selectAndConfirmFingerprint(page, "Kadeh Tabanı");

  await expect(page.getByText("Parmak İzi Eşleşti!").first()).toBeVisible({ timeout: 5000 });
});

// ---------------------------------------------------------------------------
// PAKETLER TAB — Hollywood Cinayetleri (pack_002)
// ---------------------------------------------------------------------------

test("hw_003: Cannes'da Kırmızı — küpeşte izini onayla (Kaptan Nikos)", async ({ page }) => {
  await unlockPremium(page);
  await goToVakalar(page);

  await expandPackInPaketler(page, "Hollywood Cinayetleri");
  await clickPuzzleCard(page, "Cannes'da Kırmızı");
  await startGame(page);

  await expect(page.getByText("ŞÜPHELİLER").first()).toBeVisible({ timeout: 8000 });
  await expectFingerprintBlock(page);

  await selectAndConfirmFingerprint(page, "İskele Küpeştesi");

  await expect(page.getByText("Parmak İzi Eşleşti!").first()).toBeVisible({ timeout: 5000 });
});

test("hw_004: Senaryo Hırsızı — şoför kapısı izini onayla (Rachel Kim)", async ({ page }) => {
  await unlockPremium(page);
  await goToVakalar(page);

  await expandPackInPaketler(page, "Hollywood Cinayetleri");
  await clickPuzzleCard(page, "Senaryo Hırsızı");
  await startGame(page);

  await expect(page.getByText("ŞÜPHELİLER").first()).toBeVisible({ timeout: 8000 });
  await expectFingerprintBlock(page);

  await selectAndConfirmFingerprint(page, "Şoför Kapısı");

  await expect(page.getByText("Parmak İzi Eşleşti!").first()).toBeVisible({ timeout: 5000 });
});

test("hw_005: Efsanenin Sonu — kristal şişe sapı izini onayla (Grace Lee, bonus ipucu açılır)", async ({ page }) => {
  await unlockPremium(page);
  await goToVakalar(page);

  await expandPackInPaketler(page, "Hollywood Cinayetleri");
  await clickPuzzleCard(page, "Efsanenin Sonu");
  await startGame(page);

  await expect(page.getByText("ŞÜPHELİLER").first()).toBeVisible({ timeout: 8000 });

  // Parmak izi ipucu kilitli (revealOrder=5) — önce bonus açılmalı
  await revealFirstBonusClue(page);
  await expectFingerprintBlock(page);

  await selectAndConfirmFingerprint(page, "Kristal Şişe Sapı");

  await expect(page.getByText("Parmak İzi Eşleşti!").first()).toBeVisible({ timeout: 5000 });
});

// ---------------------------------------------------------------------------
// PAKETLER TAB — Galaksinin Katili (pack_003)
// ---------------------------------------------------------------------------

test("sf_002: Yapay Zeka Mahkemesi — masa yüzeyi izini onayla (Viktor Crane, bonus ipucu açılır)", async ({ page }) => {
  await unlockPremium(page);
  await goToVakalar(page);

  await expandPackInPaketler(page, "Galaksinin Katili");
  await clickPuzzleCard(page, "Yapay Zeka Mahkemesi");
  await startGame(page);

  await expect(page.getByText("ŞÜPHELİLER").first()).toBeVisible({ timeout: 8000 });

  // Parmak izi ipucu kilitli (revealOrder=5) — önce bonus açılmalı
  await revealFirstBonusClue(page);
  await expectFingerprintBlock(page);

  await selectAndConfirmFingerprint(page, "Masa yüzeyi");

  await expect(page.getByText("Parmak İzi Eşleşti!").first()).toBeVisible({ timeout: 5000 });
});

// ---------------------------------------------------------------------------
// PAKETLER TAB — Gerçek Dosyalar (pack_004) — rc_002 çift eşleşme + decoy
// rc_002 "Mansiyonda Karlar": sonuc = "(s1) (s3)"
//   iz1: Kadeh sapı    → eslesme s1  ✓ doğru
//   iz2: Kadeh gövdesi → eslesme s3  ✓ doğru
//   iz3: Kadeh tabanı  → eslesme s2  ✗ yanıltıcı (decoy, isDecoy: true)
// ---------------------------------------------------------------------------

test("rc_002 iz1: Mansiyonda Karlar — kadeh sapı (s1/Rothwick) çözüm üretir", async ({ page }) => {
  await unlockPremium(page);
  await goToVakalar(page);

  await expandPackInPaketler(page, "Gerçek Dosyalar");
  await clickPuzzleCard(page, "Mansiyonda Karlar");
  await startGame(page);

  await expect(page.getByText("ŞÜPHELİLER").first()).toBeVisible({ timeout: 8000 });
  await expectFingerprintBlock(page);

  await selectAndConfirmFingerprint(page, "Kadeh sapı");

  await expect(page.getByText("Parmak İzi Eşleşti!").first()).toBeVisible({ timeout: 5000 });
});

test("rc_002 iz2: Mansiyonda Karlar — kadeh gövdesi (s3/Archie) çözüm üretir", async ({ page }) => {
  await unlockPremium(page);
  await goToVakalar(page);

  await expandPackInPaketler(page, "Gerçek Dosyalar");
  await clickPuzzleCard(page, "Mansiyonda Karlar");
  await startGame(page);

  await expect(page.getByText("ŞÜPHELİLER").first()).toBeVisible({ timeout: 8000 });
  await expectFingerprintBlock(page);

  await selectAndConfirmFingerprint(page, "Kadeh gövdesi");

  await expect(page.getByText("Parmak İzi Eşleşti!").first()).toBeVisible({ timeout: 5000 });
});

test("rc_002 iz3 (decoy): yanlış iz seçimi 'Yanlış iz — tekrar dene' gösterir", async ({ page }) => {
  await unlockPremium(page);
  await goToVakalar(page);

  await expandPackInPaketler(page, "Gerçek Dosyalar");
  await clickPuzzleCard(page, "Mansiyonda Karlar");
  await startGame(page);

  await expect(page.getByText("ŞÜPHELİLER").first()).toBeVisible({ timeout: 8000 });
  await expectFingerprintBlock(page);

  // Yanıltıcı iz (iz3, eslesme s2 — sonuçta yok)
  await selectAndConfirmFingerprint(page, "Kadeh tabanı");

  // Hata mesajı görünmeli; çözüm ekranı GELMEMELİ
  await expect(page.getByText("Yanlış iz — tekrar dene").first()).toBeVisible({ timeout: 5000 });
  await expect(page.getByText("Parmak İzi Eşleşti!")).not.toBeVisible({ timeout: 2000 });

  // Seçim sıfırlandıktan sonra doğru izi seçip çözebilmeli
  await selectAndConfirmFingerprint(page, "Kadeh sapı");
  await expect(page.getByText("Parmak İzi Eşleşti!").first()).toBeVisible({ timeout: 5000 });
});

// ---------------------------------------------------------------------------
// PAKETLER TAB — Fenomen Cinayetler (pack_fenomen) — fen_004 çift eşleşme (aynı şüpheli)
// fen_004 "Viyana Valsi": sonuc içinde Viktor Salko (s2)
//   iz1: Şişe boynu — sağ taraf → eslesme s2  ✓
//   iz2: Şişe boynu — sol taraf → eslesme s2  ✓
// ---------------------------------------------------------------------------

test("fen_004 iz1: Viyana Valsi çift iz — sağ taraf seçimi çözüm üretir (Viktor Salko)", async ({ page }) => {
  await unlockPremium(page);
  await goToVakalar(page);

  await expandPackInPaketler(page, "Fenomen Cinayetler");
  await clickPuzzleCard(page, "Viyana Valsi");
  await startGame(page);

  await expect(page.getByText("ŞÜPHELİLER").first()).toBeVisible({ timeout: 8000 });
  await expectFingerprintBlock(page);

  await selectAndConfirmFingerprint(page, "Şişe boynu — sağ taraf");

  await expect(page.getByText("Parmak İzi Eşleşti!").first()).toBeVisible({ timeout: 5000 });
  await expect(page.getByText(/Viktor Salko/i).first()).toBeVisible({ timeout: 3000 });
});

test("fen_004 iz2: Viyana Valsi çift iz — sol taraf seçimi de çözüm üretir (Viktor Salko)", async ({ page }) => {
  await unlockPremium(page);
  await goToVakalar(page);

  await expandPackInPaketler(page, "Fenomen Cinayetler");
  await clickPuzzleCard(page, "Viyana Valsi");
  await startGame(page);

  await expect(page.getByText("ŞÜPHELİLER").first()).toBeVisible({ timeout: 8000 });
  await expectFingerprintBlock(page);

  await selectAndConfirmFingerprint(page, "Şişe boynu — sol taraf");

  await expect(page.getByText("Parmak İzi Eşleşti!").first()).toBeVisible({ timeout: 5000 });
  await expect(page.getByText(/Viktor Salko/i).first()).toBeVisible({ timeout: 3000 });
});

// ---------------------------------------------------------------------------
// Devre dışı buton davranışı
// ---------------------------------------------------------------------------

test("iz seçimi yapılmadan 'Eşleşmeyi Onayla' tıklanması çözüm üretmez", async ({ page }) => {
  await unlockPremium(page);
  await goToVakalar(page);

  await expandPremiumDifficulty(page, "Çaylak");
  await clickPuzzleCard(page, "Kuyumcunun Altın Sırrı");
  await startGame(page);

  await expect(page.getByText("ŞÜPHELİLER").first()).toBeVisible({ timeout: 8000 });
  await expectFingerprintBlock(page);

  const confirmBtn = page.getByText("Eşleşmeyi Onayla").first();
  await expect(confirmBtn).toBeVisible({ timeout: 5000 });

  // Force tıklama bile çözümü tetiklememeli (disabled)
  await confirmBtn.click({ force: true });
  await page.waitForTimeout(600);

  await expect(page.getByText("Parmak İzi Eşleşti!")).not.toBeVisible({ timeout: 2000 });
});
