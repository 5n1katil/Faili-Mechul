# Case QA v4.8 — güvenli, kaldığı yerden devam eden onarım

## Ne değişti?

- v4.6/v4.7 yanıt önbellekleri varsa eski yama zincirleri **ücret ödenmeden** yeniden uygulanır ve gerçek HTML motorunda ölçülür. Önbelleğin hâlâ bulunması gerekir; bulunmuyorsa geçmiş 97 puanlık adayın kurtarıldığı iddia edilmez.
- En iyi aday, prompt sürümünden bağımsız bir checkpoint olarak tutulur. Kaynak vaka veya HTML değiştiyse eski checkpoint kullanılmaz. Aday her yüklemede yeniden ölçülür; kayıtlı puan kabul belgesi değildir.
- Reddedilen son iki adayın gerçek QA hataları sonraki modele verilir. Reddedilen içerik çalışma adayının üzerine yazılmaz.
- `qaRationale.matrixEffect` mevcut kurallar ve mevcut varlık adlarından oluşturulur. `evidenceLink`, görünür kanıt, semantik bilgi ve kural bu işlemle değiştirilmez.
- Güvenlik kapıları geçmiş 90+ puanlık aday genel yeniden yazım yerine tam-puan temizleme talimatını alır.
- Pilotun 5 onarım çağrısı sınırı aynı kaynak ve strateji için önbellekte tutulur. Yeniden tıklamak sınırı sıfırlamaz. Mevcut $1 çalışma bütçesi de korunur. Bu korumalar GitHub önbelleğinin kalıcılığına bağlıdır; önbelleği silmek ilerlemeyi ve sayaçları siler.
- En iyi aday puanı ve yayınlanan aday puanı ayrı raporlanır. Karantina adayları yalnız artifact içindeki `repair-checkpoints` klasöründe tutulur; uygulamaya gönderilmez.

## n8n ayarları

Mevcut Control Tower değiştirilmez. M02:

| Alan | Tek vaka | 3–5 vaka |
|---|---|---|
| mode | pilot | pilot |
| allow_ai | true | true |
| case_limit | 1 | 3 veya 5 |
| case_ids | Tam vaka ID'si | Virgülle ayrılmış tam ID'ler |
| publish_draft_pr | true | true |
| poll_seconds | 20 | 20 |
| max_poll_attempts | 120 | 120 |

Pilot $1 sınırı **vaka başına değil, tüm çalıştırma içindir**; 3–5 vaka bu bütçeye sığmayabilir. Önce tek vaka sonucu doğrulanmalıdır. 40 dakikalık n8n bekleme sınırı aşılırsa GitHub işinin durumuna bakılmadan yeni iş başlatılmamalıdır.

`auto_merge` eklemeyin: pilot her zaman taslak PR'dır. Avatar manifesti/üretimi pilotta çalışmaz. Mevcut avatar üretim otomasyonu bu sürümde değiştirilmez.

## Sonuç nerede görülür?

GitHub Actions run sayfasının Summary bölümünde başlangıç, geri yüklenen, en iyi aday ve yayın QA puanları; API çağrı/maliyet sayısı; kalan hatalar görünür.

İndirilebilir artifact içinde:

- `case_qa_summary.md`: okunabilir özet.
- `fm_case_qa_run_report.json`: vaka başına tam QA ve deneme sonuçları.
- `repair-checkpoints/*.json`: henüz yayınlanmamış en iyi adaylar, kaynak kimlikleri ve ölçümleri.
- Sertifikasyon ve uygulama kontrol raporları.

`completed_successfully` tek başına 105 vakanın tamamlandığı anlamına gelmez. Pilot seçiminin bütün vakaları 100/100 ve production-ready olmalı; kimlik, sızıntı ve uygulama kapıları da geçmelidir. Başarısız aday için puan eşiği düşürülmez ve PR açılmaz.

## Ücretsiz doğrulama

```sh
node .case-qa/fm_case_qa_repair_state_test.mjs
node .case-qa/fm_case_qa_contract_recovery_test.mjs
node .case-qa/fm_case_qa_behavioral_calibration_test.mjs
node .case-qa/fm_case_qa_gold_fixture_test.mjs
node .case-qa/fm_case_qa_production_gate_test.mjs
node .case-qa/fm_case_qa_certify.mjs
```

Yeni regresyon testi modeli taklit eder ve bütün ağ çağrılarını engeller. Gerçek v29.4 HTML motoruyla ret geri bildirimi, 100-puan adayın sıfır-çağrı ile geri yüklenmesi, eski yanıt zincirinin kurtarılması ve tekrar çalıştırmada çağrı sınırı test edilir. Bu testler canlı AI'ın her vakayı kesin olarak 100'e çıkaracağını veya oyunda hiç hata olmayacağını garanti etmez.

Kaynak HTML, eşikler, vaka verileri ve avatar otomasyonu bu altyapı sürümünde değiştirilmemiştir.
