# Case QA v4.9 — gerçek Termal vakasıyla doğrulanan teslim

## Somut sonuç

`termal-otelde-supheli-vaka` gerçek v29.4 HTML motorunda **100/100, productionReady=true**.
105 vakanın tümünün 100 olduğu iddia edilmiyor. Bu teslim bir standart vakayı ve onarım altyapısını kapsıyor.
Vaka verisi `artifacts/dedektif/data/puzzles.ts`, QA metadata'sı `artifacts/dedektif/qa/case_qa_sidecars_v29_5.json` içindedir.
Değişiklik PR birleşene kadar main/oyuna geçmiş sayılmaz.

## Neden önceki denemeler sonuç vermiyordu?

Run `33305310409` eski adayı 97 puanda kurtardı; yeni beş öneriyi kötüleşme nedeniyle reddetti.
Kısa rapor k1–k4 bulgularını taşımıyordu. Gerçek eksik puan k3 çeşitlilik puanıydı (17/20): yalnız iki ipucu türü vardı.
Monotonluk ayrıca açık bir kalite uyarısıydı, **3 puanın nedeni değildi**.
Doğrudan isim kullanımıyla ilgili gömülü kalite uyarısı da kısa raporda yoktu.
Model eksik teşhisle geniş yamalar üretiyor; zorunlu ipuçlarını veya bonus/çapa rollerini bozabiliyordu.

## Bu teslimde değişenler

- K1–K4 puanları, azami puanları ve tam bulguları artık rapora/model girdisine taşınır.
- Gömülü kalite uyarıları ret geri bildiriminde ve insan-okunur özette gösterilir.
- İlk CI denemesi uygulamanın `Puzzle` tipinde bulunmayan `deductionSummary` alanını yakaladı. Bu yazar notu runtime çıktısından çıkarıldı; standart vaka aktarımına alan sözleşmesi ve aktarım sonrası yeniden QA kontrolü eklendi. Kanıt testinde bu uyumsuzluk tekrar denetlenir.
- Güvenlik kapıları geçen 90+ adayda kodla uygulanan dar onarım sınırı vardır: en fazla bir ipucunun mantık kuralı değişebilir.
- Diğer ipuçlarının metin/kanıt açıklamaları düzeltilebilir; kimlikler, sıra, bonus/çapa rolleri, hikâye, varlıklar, mini oyun yükleri ve QA politikası kilitlidir.
- Değişen ipucunun yerel ve üst-seviye semantik kayıtları birlikte tutarlı tutulmalıdır. İlgisiz kaynakların kayıtları değiştirilemez.
- Türetilmiş patern imzası gerçek motor profilinden yenilenir; eski EEEE gibi etiketler yeni içeriğe yapışıp kalmaz.
- Prompt v4.9; mevcut $1 pilot bütçesi ve önbelleğe bağlı toplam deneme sayacı korunur. Yeni sürüm yeni strateji sayacıdır, fakat bu teslimin testleri ücretli çağrı yapmaz.

## Termal vakasında yapılan onarım

Kurtarılan 97 puanlık adaydan bir ana ipucunun kuralı değişti: adli numune, yanlış silahlardan birini başka mekana bağlar.
Ana zincir E-E-C-E olur; dört ana ipucunun her biri hâlâ gereklidir. İki bonus çözüm için zorunlu değildir.
Adli bulgu gerçekten forensic türündedir; puan almak için içeriğe aykırı etiket kullanılmaz.
Ana metinler profil kartlarından açıkça anlaşılabilir betimlemelere dönüştürülür. Semantik kayıtlar yeni metinlerle eşleştirilir.
Şüpheli/silah/mekan kimlikleri, profilleri, ikonları, çözüm üçlüsü ve vaka zorluğu korunur.
Eski main sürümüne göre hikâye ve ipuçlarında önceki kurtarılan adayın içerik iyileştirmeleri de vardır.

## Kanıt ve test

```sh
node .case-qa/fm_case_qa_termal_regression_test.mjs
node .case-qa/fm_case_qa_repair_state_test.mjs
node .case-qa/fm_case_qa_certify.mjs
```

Termal testi ağ erişimini engeller; boş önbellekle pilotu çalıştırır: 1/1 kabul, 0 API çağrısı, $0 API maliyeti.
Ayrı bir 3×3 permütasyon çözücüsü tek cevabı ve her ana ipucunu çıkarınca cevap belirsizliğini doğrular.
10 olumsuz test; çoklu mantık değişimini, politika gevşetmeyi, rol/sıra/kimlik/ikon değişimini ve ilgisiz semantik eklemeyi reddeder.
CI artifact: `fm_termal_regression_v4_9.json`. Sertifikasyon ayrıca tüm 105 kaynağı HTML/wrapper paritesi bakımından kontrol eder.
CI uygulama kapısı: validate, parmak izi, solvability, typecheck ve web build.

## Nasıl ilerleyeceğiz?

Bu PR testleri geçip birleştirildiğinde Termal için yeni ücretli onarım gerekmemelidir; zaten 100 olan vaka korunur.
Mevcut n8n otomasyonu değiştirilmez: pilot, case_limit=1, kesin case_ids, allow_ai=true, publish_draft_pr=true.
Önce farklı bir vakada yeni teşhis/yama sınırını doğrulamak gerekir. Tek Termal başarısı AI'ın kalan 104 vakayı güvenle onardığını kanıtlamaz.
Sonra aynı ayarlarla açıkça seçilmiş 3–5 vakaya geçilebilir; $1 bütçe vaka başına değil bütün çalıştırma içindir.
Başarısız vakalar yayımlanmaz; kör tekrar yerine artifact içindeki kalan bulgular incelenir.

Kullanıcı katkısının en değerlisi yeniden run başlatmak değil, birleşim sonrası kısa bir mobil oynanış denemesidir:
metinler anlaşılır mı, doğru ilişki ızgaraya aktarılabiliyor mu, bonuslar uygun yardım sağlıyor mu?
100/100 yapısal kalite kanıtıdır; eğlence, özgünlük ve cihazdaki kusursuz deneyim için tek başına garanti değildir.

Avatar üretimi başlatılmadı ve mevcut kaliteli avatar hattı yeniden kurulmadı. Vaka içeriği kesinleştikten sonra yalnız değişen/eksik varlıklar o hatta verilecek.
