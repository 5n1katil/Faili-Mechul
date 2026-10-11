# Faili Meçhul — güvenli vaka geliştirme akışı

Bu klasör yeni ücretli vaka akışının tek giriş noktasıdır. Eski Gemini autofix,
v3 kampanya ve avatar otomatik birleştirme workflow'ları emekliye ayrılmıştır.
Uyumluluk için eski motor yardımcıları ve ücretsiz regresyon testleri korunur.
Bu teslim altyapıdır; 105 vakanın tamamlandığı veya canlı pilotun geçtiği anlamına gelmez.

## Kalite kapıları

1. Kaynaklar `inventory.json` ile birebir eşleşir; tekrar eden/kayıtsız ID durdurur.
2. Gerçek v29.4 HTML Git blob'u sabittir: `cb53e6613d6379de097599634de26524f4510fbc`.
3. Puan 100, productionReady, zorunlu kapılar, kimlik, ön-ipucu güvenliği ve
   authoring sözleşmesi geçmelidir. Eşik düşürülmez; politika model tarafından değiştirilemez.
4. Medya/etkileşimli ipuçları, insan tarafından doğrulanmış oyuncu metni ve dosya
   SHA-256 kayıtları olmadan ücretli işleme alınmaz. `type` delil kategorisidir;
   `mechanicType` oyun mekaniğidir. Kayıt: `media-evidence.json`.
5. Ayrı oyuncu çağrısı yalnızca ana oyuncu metnini görür; cevap, hint, logicRules,
   mechanic cevapları ve QA alanları gönderilmez. Doğru tek çözüm, yüksek güven ve
   en az iki gerçek ipucundan alıntı gerekir. Ayrı editör çağrısı adalet, açıklık,
   tutarlılık, özgünlük ve eğlence boyutlarının her birinde en az 4/5 ister.
6. Yalnızca seçilen vaka ve kanonik sidecar değişebilir. Yeniden içe aktarma,
   diğer vakaların korunması, ikon, parmak izi, çözülebilirlik, TypeScript ve web
   derlemesi kontrol edilir. Sonuç yalnızca **taslak PR** olur; otomatik merge yoktur.

AI değerlendirmeleri insan oyun testinin yerine geçmez. Editör özgünlüğü en yakın
sekiz hikâye üzerinden değerlendirir; tam portföy özgünlük garantisi değildir.
Deterministik QA ile `content_locked` ayrı raporlanır. Mevcut iki altın QA vakası
bağımsız oyuncu/editör sertifikası olmadığından içerik kilitli sayılmaz.

## Girişler ve kayıtlar

| İş | Komut / konum | Sonuç |
| --- | --- | --- |
| Ücretsiz güvenlik testleri | `node .case-qa/pipeline/test.mjs` | Ağ kapalı, sahte yanıtlar; ücret yok |
| HTML/kaynak paritesi | `node .case-qa/fm_case_qa_certify.mjs` | Her vaka iki kez, doğrudan HTML ile wrapper aynı |
| Ücretsiz envanter | `node .case-qa/pipeline/run.mjs` | `.case-qa-output/pipeline/result.json` |
| Canlı tek vaka | Actions → Reviewed Case Pipeline → `mode=pilot` | En fazla bir vaka; başarılıysa taslak PR |
| Yeni vaka ön kontrolü | `node .case-qa/pipeline/intake.mjs CASE.json standard` | `.case-qa/intake/ID.json`, yalnız taslak |
| Standart / premium içerik | `artifacts/dedektif/data/puzzles.ts` / `puzzles_database.json` | Oyunun mevcut veri kaynakları |
| Kanonik QA kayıtları | `artifacts/dedektif/qa/case_qa_sidecars_v29_5.json` | Authoring + içerik özeti + review sertifikası |
| Kalıcı harcama/checkpoint | `automation/case-pipeline-state` Git dalı | Non-force push; bozuk kayıtta durur |

Workflow varsayılanı `audit`tir. Pull request kontrollerinde AI anahtarı ve yazma
yetkisi yoktur. GITHUB_TOKEN ile açılan PR için ayrıca kesin commit üzerinde ücretsiz
`certify` workflow'u başlatılır. Yeşil dispatch veya açık PR, tamamlanmış vaka sayılmaz.
Merge sonrası güncel main yeniden tarandığında geçerli içerik sertifikası sayılır.

## Harcama ve devam etme

`policy.json`: en fazla 4 çağrı/çalıştırma; vaka ömrü boyunca 2 repair denemesi;
çalıştırma ve vaka başına $0.25, UTC gün başına $2, kampanya toplamı $10.
Repair Gemini 3.5 Flash-Lite; oyuncu/editör Gemini 3.8 Flash kullanır. Fiyatlar
2026-10-11 Google resmi sayfasından kontrol edilmiştir: milyon token başına
repair input/output $0.30/$2.50; reviewer $0.75/$3.75. Reviewer kampanya fiyatı
2026-12-31 sonuna kadar geçerlidir; sonrasında politika güncellenmeden yeni ücretli
istek yapılmaz. Gemini 3 için `thinkingLevel: LOW` ve varsayılan sıcaklık 1 kullanılır.
Model değişikliği gözden geçirilen politika PR'ı ister; otomatik model fallback yoktur.

İlk pilotta Gemini 2.5 Flash-Lite HTTP 404 döndürdü: bir reddedilmiş istek,
kayıtlı token maliyeti $0, oyun değişikliği yok. Google 2.5 erişimini geçmişte
kullanan hesaplarla sınırlandırıyor (https://ai.google.dev/gemini-api/docs/deprecations).
Yeni pilot, vaka içeriği göndermeden önce iki modelin metadata'sını GET ile kontrol
eder; `generateContent` desteği veya çıkış kapasitesi eksikse üretim başlamaz.
Bu kontrol başarılı üretim veya kota garantisi değildir. Eski 404 kaydı korunur;
deneme/bütçe sayacı sıfırlanmaz. Hesapta yeni modellerin canlı üretimi henüz doğrulanmadı.

Maliyet sağlayıcı faturası değildir: yapılandırılmış oranlarla token kullanımı
(thinking dahil), kullanım bilinmiyorsa muhafazakâr rezervasyon hesaplanır. GitHub
Actions maliyeti hariçtir. İlk HTTP isteğinden **önce** rezervasyon Git'e kaydedilir.
Ağ belirsizliğinde rezervasyon korunur; aynı istek otomatik tekrarlanmaz. Başarılı
yanıt aynı hash ile ücretsiz kullanılır. Limitler yeni çalıştırmada sıfırlanmaz.

Eksik medya, başarısız review veya tükenen repair denemesi `quarantined` olur;
bekleyen PR `awaiting_review` olur. Kuyruk bunları atlar. Elle teşhis sonrası
`case_id` ile seçmek mümkündür; bu harcama/deneme limitlerini sıfırlamaz. Auth,
HTTP, bütçe veya belirsiz istek hatasında art arda pilot başlatmayın; raporu inceleyin.
Kayıt dalını silmeyin veya force-push yapmayın; kayıp kayıt bütçe güvenliğini bozar.

## Sıralı uygulama planı

1. **Altyapı PR'ı:** ücretsiz CI ve kod incelemesi; main'e birleştirme ayrı karardır.
   Bu değişiklik üretim vakası/avatar dosyası değiştirmez.
2. **Tek vaka canlı kabul:** altyapı main'deyken Actions'ın PR açma izni ve
   `GEMINI_API_KEY` secret'ı gerekir. Secret sohbet/kod içine yazılmaz. Pilot ayrıca
   açıkça başlatılmalıdır. İlk vaka `konakta-gece-yarisi-cinayeti`; başarısızlığa
   göre prompt/authoring iyileştirilir, sayısal kapılar gevşetilmez.
3. **Gerçek oyun kontrolü:** taslak vaka PR'ının kesin commit'inde CI, mobil oyun
   testi, tüm ipuçları, bonuslar ve son çözüm kontrol edilir. Ancak sonra içerik kilitlenir.
4. **Mevcut vakalar:** sırayla aynı kapılardan geçer; karantina nedenleri ayrı
   incelenir. Medya kayıtları için cevap anahtarından türetilmeyen oyuncu kanıtı gerekir.
5. **Görseller:** içerik kilitlendikten sonra stil referansı ve entity bilgileriyle
   şüpheli/silah/mekân üretimi; ayrı görsel PR'ı, mevcut avatar sertifikasyonu ve
   telefonda okunabilirlik kontrolü. #75 bu teslimin dışında korunmuştur.
6. **Yeni vaka kabulü:** intake şu an güvenli taslak/ön kontrol üretir. Üretime
   ekleme, premium pack/dayIndex kuralları, envanter güncellemesi ve uçtan uca
   draft PR kabulü sonraki aşamada uygulanacaktır. Kayıtlı 106+ vakayı motor zaten
   destekler; intake dosyası tek başına yayına giremez.
7. **Sürüm:** iOS cihaz/TestFlight, satın alma/kayıt/geri yükleme ve performans
   kontrolleri sonrası App Store yayın süreci ayrı değerlendirilir.

Eski #70/#71'den yalnız güvenli kod/fixture parçaları alınmıştır; #72/#73 vaka
çıktıları içeri aktarılmamıştır. Eski n8n kontrol paneli yeni backend'e henüz bağlı
değildir. Canlı kabul geçmeden toplu kampanya veya görsel üretimi başlatılmaz.
