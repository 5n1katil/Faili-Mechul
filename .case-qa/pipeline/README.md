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
6. Yalnızca raporda seçilen vaka/vakalar ve kanonik sidecar değişebilir. Yeniden içe aktarma,
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

`policy.json`: en fazla 4 üretim isteği/tek-vaka çalıştırması; eski patch yöntemi için
vaka ömrü boyunca 2 repair, `verified_text_v1` için ayrıca en fazla 2 repair ve
her iki yöntem birlikte toplam 6 üretim isteği (repair + review + HTTP reddi dahil);
çalıştırma ve vaka başına $0.25, UTC gün başına $2, kampanya toplamı $10.
Repair Gemini 3.5 Flash-Lite; oyuncu/editör Gemini 3.8 Flash kullanır. Fiyatlar
2026-10-11 Google resmi sayfasından kontrol edilmiştir: milyon token başına
repair input/output $0.30/$2.50; reviewer $0.75/$3.75. Reviewer kampanya fiyatı
2026-12-31 sonuna kadar geçerlidir; sonrasında politika güncellenmeden yeni ücretli
istek yapılmaz. Gemini 3 için `thinkingLevel: LOW` ve varsayılan sıcaklık 1 kullanılır.
Model değişikliği gözden geçirilen politika PR'ı ister; otomatik model fallback yoktur.

## Doğrulanmış metin onarımı — verified_text_v1

Tamamen metinsel, standart 3 şüpheli × 3 eşya/yöntem × 3 mekân, dört temel ve
iki bonus ipuculu vakalarda ciddi mantık hataları için yeni yol kullanılır.
Premium, medya/etkileşim, farklı boyutlar ve neredeyse hazır dar düzeltmeler
önceki yolda kalır. Model matematik veya JSON patch üretmez:

1. Kod 36 olası tam eşleşmeyi tarar. Değişmez cevap tek kalmalı; dört temel
   ipucundan herhangi biri çıkarıldığında cevap belirsizleşmelidir.
2. Çapa bileşeni, açılış, ipucu sırası ve eşleşme ritmi için alternatifler mevcut
   portföy imzalarıyla karşılaştırılır. Aynı/yakın imza kabul edilmez. Bu kontrol
   hikâyelerin benzersizliği ve eğlencesinin garantisi değildir.
3. Modele doğrulanmış ilişkiler, her ipucunun yalnız iki öğesi, özgün kurgu ve
   somut kanıt örnekleri verilir. Dar çıktı sözleşmesi hikâye, üç karakter
   açıklaması ve altı ipucunun metin/soru alanlarından oluşur.
4. Kod logicRules, tek çapa, eşleşen QA kanıtı ve imzayı derler. Metnin ilişkiyi
   gerçekten desteklemesi yine mevcut HTML ve bağımsız oyuncu/editör kapılarına
   tabidir; otomatik metadata derlemek bir onay sertifikası değildir.
5. Birinci yazım Flash-Lite, ikinci düzeltme Flash'tır. Eski istek ve maliyetler
   silinmez. Eski yöntemle karantinaya alınmış uyumlu vakalar yalnız dört yeni
   istek için toplam altı istek sınırında yer varsa ve yeni yöntem denenmemişse
   yeniden kuyruğa girer. Belirsiz transport, erişim/kota hataları, inceleme
   başarısızlığı ve daha önce denenmiş yeni yöntem tekrar açılmaz.

Canlı başarısız kampanya `38151436437` çıktıları regresyon fixture'ında tutulur.
Üç vakada elle hazırlanmış yeni anlatı fixture'ları değişmeyen HTML'de 100/100,
productionReady ve kimlik kontrollerini geçer. Bunlar **canlı Gemini çıktısı,
oyuncu/editör sertifikası veya üretim vakası değildir**. Canlı kabul oranı ayrıca
ölçülmelidir. Ücretli çağrı yapmadan test: `node .case-qa/pipeline/test.mjs`.

### Simülatörde doğrulanan sınırlar

Sabit v29.4 HTML, doğrudan isim kullanımını bazı zorluklarda “opsiyonel” tavsiye
olarak yazsa da bu bulgu `hasImprovements` üzerinden productionReady'yi engeller.
`mentionsAny` çok sözcüklü isimlerin bazı tek sözcüklerini de isim eşleşmesi
sayar; örneğin “Gemi Halatı” için “gemi”, “Makine Dairesi” için “makine”.
Bu davranış kalite raporunun açıklamasıyla tutarsızdır. Ayrıca suç kapsamı
regex'i genel “olay yeri incelemesi” ve “bağlantılı” gibi sözleri iki suç bileşeni
ifşası sanabilir. Bu PR sabit simülatörü veya eşikleri değiştirmez; rapor,
adlandırma ve suç kapsamı semantiği sonraki sürümde karşı-örneklerle düzeltilmelidir.
Yeni onarımın matematik ve anlatı sözleşmesi bu kusurlardan bağımsız test edilir.

### Yanıt yapısı ve metin kalitesi ayrı kontrollerdir

Kampanya `38154743650`, tek yeni-yöntem çağrısından sonra `INVALID_MODEL_RESPONSE`
ile durdu (yaklaşık $0.0029765). O sürüm kesin ret alanını kaydetmediği için
yanıtın hangi kontrolde başarısız olduğu geriye dönük kesinleştirilemez.
Doğrulayıcıda ayrıca hikâye/alan uzunluklarının JSON yapısı gibi ele alınması
hatası bulundu: bu kalite eksikleri ikinci onarıma gidemiyordu.

Yapı doğrulaması yalnız alanlar, türler ve kimlikleri kontrol eder. Kısa hikâye,
profil, ipucu veya soru `TEXT_CONTENT` geri bildirimi olur; aday tutulmadan aynı
vaka üzerinde mevcut ikinci-model hakkıyla düzeltilebilir. Eşikler ve bütçeler
değişmez. Gerçek yapısal hata, kesik yanıt veya bozuk JSON kampanyayı yine durdurur;
bu kez hata türü, finishReason, güvenli alan yolları ve hikâye kelime sayısı
kalıcı kayda/rapora yazılır. Keyfi model metni ve anahtar kayda eklenmez.

İlk pilotta Gemini 2.5 Flash-Lite HTTP 404 döndürdü: bir reddedilmiş istek,
kayıtlı token maliyeti $0, oyun değişikliği yok. Google 2.5 erişimini geçmişte
kullanan hesaplarla sınırlandırıyor (https://ai.google.dev/gemini-api/docs/deprecations).
Yeni pilot, vaka içeriği göndermeden önce iki modelin metadata'sını GET ile kontrol
eder; `generateContent` desteği veya çıkış kapasitesi eksikse üretim başlamaz.
Bu kontrol başarılı üretim veya kota garantisi değildir. Eski 404 kaydı korunur;
deneme/bütçe sayacı sıfırlanmaz. Hesapta yeni modellerin metadata erişimi ikinci pilotta
doğrulandı; üretim isteği HTTP 400 döndü ve içerik üretilmedi. Bu ikinci reddin kesin
nedeni eski raporda hata açıklaması saklanmadığı için bilinmiyor. Güncel generateContent
sözleşmesindeki `responseFormat.text` kullanılır (https://ai.google.dev/api/generate-content).
Bu uyarlama tek başına canlı başarının kanıtı değildir. Yeni HTTP retlerinde sağlayıcı
durumu ve anahtarları temizlenmiş, 1000 karakterle sınırlı hata açıklaması rapora ve
kalıcı kayda eklenir; otomatik tekrar yapılmaz.

Yalnızca `failed`, HTTP 400/404 ve kayıtlı maliyet $0 koşullarının tamamını taşıyan
istekler gerçek repair sayısına dahil edilmez. Geçmiş kayıtlar silinmez: bu retler
vaka başına toplam 6 istek sınırına dahildir ve aynı request hash tekrar gönderilemez.
Belirsiz istek, geçersiz yanıt, auth/kota ve diğer HTTP hataları repair sınırını tüketir.

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

### Otomatik küçük kampanya

Actions → **Faili Mechul — Reviewed Case Pipeline**, branch `main`, mode
`campaign`, `case_limit=3`; case_id/base_sha/head_sha boş. Tek başlatma sıradaki
üç tamamlanmamış vakayı sırayla işler. Üst sınır beş vaka, 12 yeni çağrı ve
$0.75/çalıştırmadır; çağrı/bütçe sınırında kalan vakalar sonraki çalıştırmaya kalır.
Vaka başına iki gerçek repair, dört çağrı, $0.25 ve altı toplam istek sınırları;
UTC günlük $2 ve kalıcı kampanya $10 sınırları değişmez.

İlk repair Lite, ikinci gerçek repair gerektiğinde Flash kullanır. Yeniden
başlatılan vakada daha önce yapılmış gerçek repair sayısı da dikkate alınır.
Onarım yanıtı puan ve kapılarla değerlendirilir; iyileşmeyen yama uygulanmaz.
100/productionReady sonrası ayrı bağlamlarda kör oyuncu ve editör incelemesi
zorunludur. Her kabul edilen aday dosyaya yansıtılıp yeniden içeri alınarak
önceden geçen vakalara zarar vermediği doğrulanır. Kabul edilen vakalar tek
taslak PR'da toplanır; CI seçilen **her** vakayı ve seçilmeyen dosya kapsamını
denetler. İnsan PR'ı inceledikten sonra merge eder; otomatik merge yoktur.

İçerik/medya sorunu olan vaka karantinaya alınır, sıra ilerler. HTTP, anahtar,
kota, belirsiz taşıma, bütçe veya altyapı hatası kalan çağrıları durdurur.
Kısmi kabul raporda görünür. Bekleyen, henüz main'e birleşmemiş kampanya PR'ı
varken yeni kampanya sıfır üretim çağrısıyla bekler; rakip dosya değişiklikleri
oluşturmaz. Merge sonrası sertifikası geçerli vakalar atlanır ve sıradakiler
seçilir. Başarısız adaylar ve harcama kayıtları korunur; PR bazında maliyet,
vaka sonuçları ve durma nedeni artifact/result.json içinde bulunur.

Bu akış canlı kampanyada henüz doğrulanmamıştır; ilk üç vakalık çalışma kabul
testidir. Mode=campaign mevcut karantinadaki Konak'ı kendiliğinden açmaz veya
çevrimdışı fixture'ı kullanmaz. Her vaka için elle onarım normal akış değildir.

### Konak çevrimdışı adayının durumu

Pilot 38140789134 iki gerçek repair çağrısı yaptı ($0.0182071) ve karantinaya
alındı; aynı vaka yeniden ücretli repair için başlatılmamalıdır. Harcama kaydı
korunur. `.case-qa/fixtures/konak_reviewed_repair.mjs` bağımsız inceleme bekleyen
editoryal bir aday üretir; runner bunu otomatik kullanmaz ve oyun verisi değişmez.
Tam HTML 100/100, productionReady=true ve bütün gerekli kapılar geçer.
HTML'den ayrı 36 olası tam eşleşmenin taranması, ana ipuçlarında aynı cinayet
üçlüsünü veren iki düzen, bonuslarla bir düzen kaldığını doğrular. Her temel
ipucu çıkarıldığında cinayet üçlüsü belirsizleşir.

İki harfli `İp` etiketi HTML mentionsAny tarafından tanınmadığı için, mevcut
profilindeki malzemeyi belirten `Kenevir İpi` adı kullanılır. ID, ikon, fiziksel
kimlik ve çözüm değişmez; identity guard bu metin netleştirmesini kabul eder.
Bu, kısa ad algılayıcısının düzeltildiği anlamına gelmez; HTML değiştirilmemiştir.

Bu adayın oyuncu/editör sertifikası **yoktur**. Testte üretilmiş sahte inceleme
üretim sertifikası yerine geçmez. Beş eski vaka isteği kalıcı kayıttadır; altı
toplam istek sınırında iki yeni bağımsız incelemeye yeterli alan yoktur. İnceleme
akışı için açıkça kayıtlı, sınırlı bir kurtarma yolu hazırlanıp test edilmeden
pilotla yeniden deneme veya maliyet kaydını sıfırlama yapılmamalıdır.

Üretimden önce açıklamasız HTTP 400 tekrar ederse yeni vaka pilotu başlatmayın.
`diagnose` modu yalnızca kısa bir bağlantı metni gönderir: Lite temel istek → JSON
biçimi → thinking ayarı → reviewer tam ayarı → repair sözleşmesi. İlk hatada durur; aynı başarısız veya
belirsiz istek tekrarlanmaz. Başarılı aşamalar kalıcı kayıttan kullanılır. En fazla
çalıştırma başına 4 yeni üretim isteği, ilk dört aşamada istek başına 1024 output token ve teşhis kaydı/çalıştırma başına
$0.03 sınırı vardır; kampanya ve UTC günlük bütçeden düşer. Oyun vakası göndermez,
oyun dosyası veya PR oluşturmaz. Yalnızca maliyet dalına checkpoint yazar.
`provider_verified` vaka kalitesini veya tam vaka payload uyumunu kanıtlamaz.
İlk dört aşama canlı olarak run 38138945007'de geçti; kayıtlı maliyet $0.00009255.
Yeni beşinci `repair_contract` aşaması gerçek repair sistem talimatı, patch şeması
ve 6000 output sınırını gerçek vaka göndermeden, boş yama cevabıyla kontrol eder.
Patch şemasındaki `maxItems:80` yalnızca sağlayıcıya gönderilen kopyadan çıkarılır;
yerel uygulama 81+ operasyonu reddetmeye devam eder. Bu şema uyarlaması olası bir
uyumsuzluğu azaltır; 400'ün kesin sebebi olarak henüz doğrulanmamıştır.
Yeni kayıtta dört çağrı sınırına gelince `diagnostic_checkpoint` yazılır; sonraki
manuel diagnose başarılı dört aşamayı cache'den alıp beşinci aşamaya devam eder.
Mevcut başarılı dört aşama için yeni harcama yoktur. Toplam teşhis kaydı/çalıştırma
$0.03 sınırı, vaka başına 6 toplam istek ve tüm kampanya/günlük sınırlar korunur.
`case_id`, base/head SHA bu modda kullanılmaz. Sonuç artifact/log'da
`fm_provider_diagnostic_v1` raporudur. Sağlayıcının fieldViolations alanları da
anahtarları temizlenmiş biçimde saklanır.

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
