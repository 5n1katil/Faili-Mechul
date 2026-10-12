# Faili Meçhul — güvenli vaka geliştirme akışı

Bu klasör yeni ücretli vaka akışının tek giriş noktasıdır. Eski Gemini autofix,
v3 kampanya ve avatar otomatik birleştirme workflow'ları emekliye ayrılmıştır.
Uyumluluk için eski motor yardımcıları ve ücretsiz regresyon testleri korunur.
Bu teslim altyapıdır; 105 vakanın tamamlandığı veya canlı pilotun geçtiği anlamına gelmez.

### Ortak ara sözcüğü yanlış eşleşmesi (38164243995)

Canlı editoryal çağrı $0.00545925 harcadı. Yeni metinde “Ara Sokak” adı yoktu;
“kestirme ara hat” ifadesindeki tek “ara” sözcüğü doğrudan isim sayıldı. HTML'nin
mevcut çok kelimeli ad/ortak sözcük listesine yalnız “ara” eklenmiştir. Tam ad,
Türkçe ekli tam ad ve ayırt edici “sokak” kökü yakalanmaya devam eder. Sayısal
eşikler, doğrudan ad kalite kapısı, anlamsal veya bağımsız inceleme kapıları değişmez.

Yeni HTML blob: `0e27218c7817862f371febb6b7bb865821d9e5da`.
Eski `04352c0a4ce07097cb752a1980b144fa00722e78` checkpoint yalnız değişmemiş
kaynak/aday kimliği ve bütün güncel kapılar doğrulanarak taşınabilir. Bu tek
geçişte, eski başarısız editör incelemesi ve adayından orijinal editoryal prompt,
şema ve system yeniden kurulur; tam request hash ile bulunan tamamlanmış yanıt
yeniden derlenir ve bütün yeni kapılardan geçerse ücretsiz kullanılır. Başka
hash, kaynak, model veya belirsiz/başarısız yanıtlar kullanılamaz. Eski onaylar
taşınmaz: yalnız iki yeni oyuncu/editör çağrısı yapılır. Yedi istek sınırı ve
önceki tüm harcamalar korunur. Canlı editör kabulü henüz doğrulanmış değildir.

### Editör geri beslemesi (38159952807)

Pazar adayı gerçek HTML'de 100 aldı; bağımsız oyuncu doğru cevabı %100 güvenle
buldu. Editör adalet/açıklık/tutarlılık için 5/4/4, özgünlük/eğlence için 3/3
verdi: gündelik tatlının ölümcül mekanizması açıklanmıyor, anlatı tutanak gibi.
Bu gerçek ret `pazar-editorial-rejection-38159952807.json` ile test edilir.
Fixture ve testteki sahte değerlendirme cevapları canlı kabul kanıtı değildir.

Başarısız inceleme artık state ve raporda saklanır. Tam HTML'yi ve kör oyuncuyu
geçen desteklenen metin vakasına, bu eleştirilerle en fazla bir editoryal çağrı
verilir. AI yalnız hikâye ve altı ipucunun metin/ipuçlarını döndürür; kod kuralları,
çapayı, kartları, profilleri, çözümü ve varlık kimliklerini değiştiremez. Kod
yalnız mevcut birebir kanıt alıntılarını yeniler. Aday tekrar tüm kapılardan
geçer ve yeni metin için oyuncu ve editör yeniden çalışır. İkinci editör reddi,
kalite kapısı reddi veya tek editoryal hakkın tüketilmesi karantinada bırakır.
Üç çağrı için çalışma kotası kalmamışsa `editorial_pending` kaydedilir; kampanya
sonraki çalışmada devam eder. Para veya belirsiz istekler sıfırlanmaz.

Eski Pazar incelemesi state'te yalnız istek önbelleğinde olduğundan, ilk yeni
pilot aynı iki inceleme sonucunu ücretsiz geri okur; ardından en fazla üç yeni
çağrı yapar. Bu özellik inceleme prompt sürümü ve aday içeriği eşleştiğinde geçerlidir.

### Canlı metin geri bildirimi ve bağlam kalibrasyonu (38156344466)

Son canlı tur 5 çağrı / yaklaşık $0.023062 ile üç vakayı karantinaya aldı.
Kapalıçarşı adayı tam HTML'de 100 ve bütün zorunlu kapıları gördü; doğrudan isim
kalite önerisi ve profil sözcük eşleşmeleri yüzünden kabul edilmedi. Bu gerçek
yanıtlar `failed-text-campaign-38156344466.json` ile çevrimdışı yeniden oynatılır;
oyuna veya bağımsız değerlendirme sertifikasına dönüştürülmez.

Yazar artık önceki retlerin kalite önerilerini, kapı ayrıntılarını ve profil
bulgularını da görür. Hikâye hedefi 95–130, profil hedefi 20–30 kelimedir;
profilin simülatördeki 12 kelimelik minimumu derleyicide de ölçülür. Temel
ipuçlarında bütün varlıkların doğrudan adları yerine karttan doğrulanabilir
betimler istenir. Bonuslar açık isim kullanabilir. Bu prompt iyileştirmesi canlı
üretimin başarılı olacağının kanıtı değildir; canlı kabul ve iki bağımsız inceleme
hâlâ zorunludur.

Ön-ipucu denetimi, birden çok kişinin profilindeki ortak sözcüğü tek kişiye özgü
bağ gibi değerlendirmez. “Dükkanlar arasında” gibi çoğul bir geçiş ifadesi de
tek yer ataması değildir. Tam varlık adı, açık sahiplik ve kalan ayırt edici
eşleşmeler korunur. Aynı uygulama oluşturulan n8n kaynağında da kullanılır.
Gerçek Kapalıçarşı profili ve açık mekân/sahiplik karşı örnekleri test edilir.
HTML'nin doğrudan isim kalite önerisi değiştirilmez veya bastırılmaz.

Bu değişiklik yöntem numarasını, harcama geçmişini veya vaka başına deneme
haklarını yenilemez. Eski üç vaka onarım sınırına ulaşmıştır. Bir sonraki canlı
doğrulama, önce ücretsiz audit ardından henüz çağrı yapılmamış tek vaka üzerinde
`pilot` olmalıdır; üçlü kampanya başarı kanıtından sonra genişletilir.

## Kalite kapıları

Pazar canlı pilotu `38158353700`, $0.009551 / iki onarım çağrısından sonra
karantinaya alındı. Son adayın tek engeli, simülatörün “olay yeri inceleme
ekipleri” unvanını ölüm mahalli beyanı olarak yorumlamasıydı. Kaydedilmiş gerçek
aday eski HTML'de 0, yalnız bu unvan ayrımının düzeltildiği HTML'de 100 ve
productionReady verir. Sayısal eşik veya çift suç bileşeni yasağı değişmez;
ceset/gerçek suç mahalli ile pozitif veya negatif yöntem bilgisi karşı örnekleri
engellenmeye devam eder. Her iki sertifikasyon politikası yeni HTML blob'una
kilitlenir; wrapper ile doğrudan HTML yine karşılaştırılır.

Yalnız eski `cb53e6613d6379de097599634de26524f4510fbc` → yeni
`04352c0a4ce07097cb752a1980b144fa00722e78` geçişinde, kaynak ve aday hash'leri
aynı kalan bir checkpoint bütün yeni kontrolleri geçiyorsa yeniden kullanılabilir.
Kimlik/politika kontrolü ve güncel portföy korunur. Eski inceleme sertifikası
taşınmaz: oyuncu ve editör yeniden bağımsız inceleme yapmalıdır. Harcamalar,
istekler, yöntem numarası ve onarım hakları sıfırlanmaz. Pazar için bir sonraki
main/pilot aynı case_id ile mevcut metni yeniden üretmeden incelemeleri çalıştırır.
Bu çevrimdışı 100 sonucu bağımsız canlı incelemenin veya yayın kabulünün yerine geçmez.

1. Kaynaklar `inventory.json` ile birebir eşleşir; tekrar eden/kayıtsız ID durdurur.
2. Gerçek v29.4 HTML Git blob'u sabittir: `04352c0a4ce07097cb752a1980b144fa00722e78`.
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

`policy.json`: en fazla 7 üretim isteği/tek-vaka çalıştırması; eski patch yöntemi için
vaka ömrü boyunca 2 repair, `verified_text_v1` için ayrıca en fazla 2 repair ve
vaka ömrü boyunca toplam 7 üretim isteği (repair + review + editoryal düzeltme + HTTP reddi dahil);
çalıştırma ve vaka başına $0.25, UTC gün başına $2, kampanya toplamı $10.
En fazla bir editoryal düzeltme yapılır; amaçlanan yol 2 repair + oyuncu/editör +
1 düzeltme + tamamen yeni oyuncu/editör = 7 çağrıdır. Geçmiş istekler veya
harcamalar sıfırlanmaz. Kampanya hâlâ toplam 12 çağrı / $0.75 ile sınırlıdır.
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
vaka başına toplam 7 istek sınırına dahildir ve aynı request hash tekrar gönderilemez.
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
   açıkça başlatılmalıdır. Doğrulama pilotu `muzede-kayip-eser`; başarısızlığa
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

### Ortak anlatı ölçütleri ve sınırlı profil eklemeleri

Run 38165586423'te Pazar vakası kesin motor ve kör oyuncudan geçti; editör
özgünlük/eğlenceyi 3/5 vererek reddetti. Toplam yedi isteği kullanılmıştır.
Pazar yeniden çalıştırılmaz ve hiçbir prompt sürümü çağrı hakkını yenilemez.

`quality-contract.mjs` ilk yazar, editoryal yazar ve bağımsız editör için aynı
beş boyutu, vaka seviyesi ve zorluk beklentisini tanımlar. Eleme geçerli bir
çözüm yöntemidir; ekstra pozitif suç ilişkisi zorunlu değildir. Gerçek anlatı
zayıflığı, belirsizlik ve çelişkiler yine reddedilir. Editörden düşük puanın
somut pasajını, oyuncuya etkisini ve uygulanabilir düzeltmesini belirtmesi
istenir; değerlendirme çıktısı kodla silinmez veya puanları yükseltilmez.

`fm-player-review-v2` yeni ölçütleri değerlendirme hash'ine bağlar; eski
sertifikalar yeni akışa kabul olarak taşınmaz. Kör oyuncuya hâlâ yalnız
oyuncunun gördüğü çekirdek içerik gider, ölçütler ve cevap anahtarı gitmez.
Geçmiş v1 ücretli cache fixture testleri orijinal wire sürümünü açıkça kullanır;
üretim v2 akışı ayrı testlerle doğrulanır.

Tek izinli editoryal onarım `fm-editorial-revision-v2` ile `profile_additions`
alabilir: her şüpheli için boş metin veya 8–20 kelimelik tarafsız motivasyon.
Mevcut profil metni aynen korunur; ekleme görünüş/meslek/ilişki değiştirmemeli,
özel erişim, alibi ya da nesne/mekân bağlantısı vermemelidir. Derleyici kesin
şemayı, uzunluğu, değişmez kimlikleri ve tüm mevcut motor/sızıntı kapılarını
yeniden kontrol eder. Eklenen anlamın tutarlılığını bağımsız editör değerlendirir;
eski profilin aynen tutulması tek başına anlamsal doğruluğun kanıtı değildir.
Her görünür değişiklikten sonra yeni kör oyuncu ve editör gerekir.

Kabul eşiği her boyutta en az 4/5 ve boş sorun listesi; motor eşiği 100'dür.
Onarım yöntemi `verified_text_v1`, tek editoryal hak, yedi yaşam boyu istek ve
tüm dolar sınırları değişmez. Testlerdeki editör cevapları mock'tur; gerçek
içerik kabulü değildir. Sonraki adım main'de `pilot`, `case_id=muzede-kayip-eser`
ile tek canlı doğrulamadır. Bu başarılı olmadan toplu kampanya başlatılmaz.

### 96 puandan sonra yalnız yönlendirme metni onarımı

Run 38167302955'te Müze ilk tam metin onarımında 96 aldı. Tek engel çekirdek
`deductionHint` isim sızıntısıydı. İkinci çağrı tam metin yazımı istediği için
model hikâye ve profilleri de değiştirdi; mevcut near-ready kapsam kontrolü
bunu doğru olarak reddetti. Modelin kalan küçük hataya uygun bir şema alması
gerekiyordu; kontrol gevşetilmez.

`hint-cleanup.mjs` yalnız mevcut motor kapıları ve sızıntı kontrolü geçerken,
kalite bulgusu yokken ve bütün engeller `deductionHint` kaynaklıyken devreye
girer. İkinci istek yalnız çekirdek hint metinlerini kabul eden kesin bir şema
kullanır. Hikâye, profiller, kanıt metinleri, kurallar, bonuslar ve tüm diğer
alanlar derleyici tarafından korunur. Sonuç tam değerlendirmeden tekrar geçer.
İstek mevcut onarım yöntemi ve iki onarım hakkından sayılır; yeni hak açılmaz.

Ödenmiş eski ikinci cevaptan yalnız hint metinleri kurtarılabilir. Bunun için
değişmemiş kaynak, motor ve aday hash'iyle orijinal prompt/şema/sistem/model
birlikte yeniden oluşturulup birebir istek anahtarı aranır. Yalnız tamamlanmış
`verified_text_v1` cevabı kullanılabilir; yanlış/eksik/belirsiz kayıt reddedilir.
Tam metin cevabındaki reddedilmiş hikâye, profil ve kanıt değişiklikleri alınmaz.
Kurtarma ancak mevcut kesin kapılarda 100/100 üretirse tutulur. Önceki maliyet
ve istekler aynen kalır; kurtarma yeni ücretli onarım çağrısı yapmaz.

Gerçek Müze fixture'ındaki iki çağrı maliyeti $0.0102746'dır. Kayıtlı ikinci
cevabın hintleri çevrimdışı 96 → 100 sonucu verdi; bu editoryal kabul değildir.
Bir sonraki manuel pilot aynı Müze kaydını kullanıp yeni kör oyuncu/editör
kontrolüne ilerler. Gerekirse kalan tek editoryal hak ve toplam yedi istek
sınırı içinde anlatı düzeltilir. Bu PR oyun içeriği yayımlamaz.

### Kalıcı maliyet kaydı ve gönderilmemiş rezervasyon

Run 38168144752'de Müze canlı motor kontrolünde 100 aldı; kör oyuncu doğru
üçlüyü %100 güvenle buldu. Editör isteğinin rezervasyon commit'i push sırasında
hata verdi. `callPaid` bu save tamamlanmadan sağlayıcıya gitmediği için editör
çağrısı yapılmadı; $0.03724125 yalnız muhafazakâr rezervasyondur. Fiilen
tamamlanmış Müze çağrılarının toplamı $0.01217435'tır; editoryal kabul yoktur.

Journal yazımı aynı commit için uzak ref'i doğrular. Kaybolmuş onayda ref zaten
o commit ise işlem tamamlanmıştır. Ref eski beklenen commit'teyse aynı commit
en fazla iki push denemesiyle yazılır. Başka yazar, okunamayan ref veya kalıcı
hata durumunda durur; force push veya eski kaydı ezme yoktur. Başarısız push
sonrası yerelde değişiklik olmaması artık kaydedilmemiş commit'i atlamaz.

Rezervasyon save hatası sağlayıcı transport'u başlamadan oluşursa bu durum
`transport_not_started` olarak kaydedilir. Yalnız projeksiyon serbest bırakılır;
gerçek API harcaması, belirsiz transport ve tamamlanmış cevaplar değiştirilmez.
Sonraki manuel execute aynı hiç gönderilmemiş isteği başlatabilir; önceki
rezervasyon denemeleri `reservation_failures` içinde korunur. Aynı execute'da
model otomatik tekrar çağrılmaz, deneme execute sınırından sayılmaya devam eder.

Eski run'daki eksik işaret yalnız `reservation-recovery.mjs` içindeki denetlenmiş
vaka/kaynak/motor ve tam kayıt+istek hash eşleşmesiyle tamamlanır. Diğer reserved
kayıtlar hâlâ belirsiz sayılır ve tekrar gönderilmez. Kanıt: run'ın tam push
hatası, reserved kayıt ve transport öncesi save çağrısı; commit
`b5eafec94ecccc1c3efe1fe783ae23190249ebe0`. Para/istek geçmişi silinmez ve
yaşam boyu sınırlar artırılmaz. Sonraki Müze pilotu önceki oyuncu cevabını
cache'den alıp henüz yapılmamış editör kontrolüne ilerler.

### Canlı editoryal ret ve alan koruma

Run 38169382703'te rezervasyon kurtarma çalıştı. Müze için oyuncu doğru üçlüyü
%100 güvenle buldu; editör puanları 5/4/4/3/3 oldu. Kanlı ölüm ile uyutucu iğne
uyumsuzluğu, bonusların mekân anlatımı ve bir yazım hatası raporlandı. Tek izinli
editoryal cevap yardım metinlerinde isim verdi ve yeni profil ekinde eksen adı
örtüşmesi oluşturdu. Bu run yalnız $0.010032 gerçek üretim maliyeti ekledi;
Müze toplamı $0.02220635, kampanya toplamı $0.179299'dur. Henüz kabul yoktur.

Yeni editoryal istek, geçerli core deductionHint'leri birebir taşır; entity
etiketleriyle birlikte çekirdek isim parçalarından ve profil bağlantılarından
kaçınmayı açıkça ister. Tek revizyon hakkı ve tüm yaşam boyu sınırlar aynıdır.
Compiler gerekirse yalnız önceki geçerli core hint'leri korur ve sızıntı guard'ının
işaretlediği isteğe bağlı profil eklerini atar. Hikâye ve kanıt metinlerini
yeniden yazmaz; atılan alanları raporlar. Ardından aynı strict compiler ve tüm
100/productionReady kapıları tekrar çalışır. Başarılı görünür içerik değişikliği
her zaman iki yeni bağımsız değerlendirme gerektirir.

Tamamlanmış editoryal cevap yalnız değişmeyen kaynak/motor/aday ve başarısız
review hash'i, exact request body/key, purpose ve model eşleşmesiyle yeniden
derlenebilir. Bu yeni bir yazım hakkı açmaz. Gerçek Müze cevabı bu alan koruma
sonrasında da core metinlerde isim kullanımı bulguları nedeniyle reddedilir;
fixture testi bunu özellikle korur. Aynı Müze pilotunu tekrar çalıştırmak onu
düzeltmez veya yeni editoryal çağrı yapmaz. Yeni talimatın gerçek üretim kalitesi
henüz canlı test edilmemiştir; sıradaki harcanmamış pilotla doğrulanmalıdır.
