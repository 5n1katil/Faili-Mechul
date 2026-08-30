---
name: Expo dependency hizalama
description: Dinamik Expo config kullanılan projelerde SDK uyumluluk güncellemesinin güvenli tamamlanma kuralı
---

Dinamik `app.config.ts` kullanılan Expo projelerinde `expo install --fix`, bir config pluginini otomatik yazamadığında hata ile durmadan önce bazı paketleri ve lockfile'ı güncellemiş olabilir. Komutu atomik kabul etme.

**Why:** Expo SDK uyumluluk turunda komut bağımlılıkların bir bölümünü başarıyla kurduktan sonra dinamik config'e plugin ekleyemediği için durdu; kalan paketler eski sürümde kaldı.

**How to apply:** Hata sonrası package diff'ini ve gerçek kurulu sürümleri incele. Gereksiz plugin eklemek yerine Expo'nun beklediği sürümleri açıkça pinle, lockfile'ı yeniden üret ve son olarak `expo install --check` ile temiz sonucu doğrula.