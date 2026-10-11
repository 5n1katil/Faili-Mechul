// Offline editorial candidate. This fixture is not substituted by the pilot
// and is not a player/editor certificate or a production case update.
export function repairKonak(input) {
  const candidate = structuredClone(input);
  // The original profile already identifies this as a hemp rope. Expand only
  // the display label; preserve its ID, asset and physical identity.
  candidate.weapons[2].name = 'Kenevir İpi';
  candidate.story = 'Tarihi konaktaki gece daveti, ev sahibinin yardımcısı Selma’nın ölümüyle sona erdi. Adli tıp saldırıyı 23:30 ile 00:00 arasına yerleştiriyor. Fırtına yolu kapattığından, bu aralıkta konaktan kimse ayrılmadı. Selma’nın davet hesaplarında bir tutarsızlık bulduğu söyleniyor; fakat defterin son sayfası kayıp. Misafirlerin ifadeleri, eşyaların teslim kayıtları ve olaydan kalan izler ayrı ayrı inceleniyor. Üç şüphelinin her biri o sırada farklı bir yerdeydi ve listedeki üç eşyadan farklı birini taşıyordu. Hangi ifade masum bir ayrıntı, hangisi saldırının izini saklıyor?';
  const definitions = [
    {
      text: 'Adli muayene, öldürücü yaranın listedeki ağır kesici aletin iki ağzıyla uyumlu olduğunu doğruladı. Aynı aletin teslim çizelgesi ve kesintisiz görüntüler birlikte incelendi: konağın en yaşlı misafiri, olay aralığında bu aleti ne aldı ne de taşıdı.',
      type: 'forensic', pair: ['s1', 'w1'], action: 'eliminate',
      hint: 'Yara hangi aleti işaret ediyor ve teslim kaydı bu aleti kimin taşımasını dışlıyor?',
      effect: 'Nazik Hanım ≠ Makas',
      facts: [{ kind: 'crime_component', component: 'weapon', entityId: 'w1', source: 'clue:c1', evidence: 'öldürücü yaranın listedeki ağır kesici aletin iki ağzıyla uyumlu' }]
    },
    {
      text: 'Ağır kesici aletin olay aralığındaki kesintisiz teslim kaydında ev sahibinin uzaktan akrabasının adı yoktu. Görüntüler, kayıttaki teslimlerin dışında el değiştirme olmadığını da doğruluyor. Böylece onun bu aleti taşıdığı ihtimali dışlandı.',
      type: 'record', pair: ['s2', 'w1'], action: 'eliminate',
      hint: 'Doğrulanmış teslim kaydı, hangi şüpheli ile alet arasındaki bağı dışlıyor?',
      effect: 'Cem Bey ≠ Makas', facts: []
    },
    {
      text: 'Ağır meşe kapısı bulunan izole çalışma alanının giriş görüntülerinde taşınan şişenin etiketi okunuyor. Olay aralığında buraya getirilen eşya, envanterdeki renksiz endüstriyel çözücüydü. Etiket ile teslim fişinin aynı seri numarasını taşıdığı doğrulandı.',
      type: 'evidence', pair: ['w2', 'l1'], action: 'confirm',
      hint: 'Şişenin doğrulanan kimliği ile bulunduğu yer arasında hangi eşleşme kurulabilir?',
      effect: 'Kimyasal ↔ Kütüphane', facts: []
    },
    {
      text: 'Konağı çevreleyen açık alandaki görevli, olay aralığında buraya getirilen eşyanın perdeleri asmakta kullanılan kalın örgülü halat olduğunu söyledi. Teslim fişindeki örgü numarası, fotoğraftaki halatla eşleşiyordu; böylece tanığın eşyanın kimliğini doğru hatırladığı doğrulandı.',
      type: 'witness', pair: ['w3', 'l2'], action: 'confirm',
      hint: 'Tanık anlatımı ve teslim fişi, hangi eşyanın hangi yerde olduğunu birlikte doğruluyor?',
      effect: 'Kenevir İpi ↔ Bahçe doğrulanır', facts: []
    },
    {
      text: 'Ek geçiş dökümünde Nazik Hanım’ın olay aralığı boyunca Kütüphanede kaldığı görülüyor. Giriş ve çıkış saatleri, kapı görevlisinin imzalı kayıtlarıyla da örtüşüyor.',
      type: 'record', pair: ['s1', 'l1'], action: 'confirm',
      hint: 'Ek geçiş dökümü, henüz boş kalan hangi şüpheli ve yer hücresini dolduruyor?',
      effect: 'Nazik Hanım ↔ Kütüphane', facts: []
    },
    {
      text: 'Bahçedeki ıslak zeminde alınan ayakkabı izinin kalıp kusuru, Cem Bey’in teslim ettiği ayakkabıyla eşleşti. İz tabakasının zamanı olay aralığına uyuyordu; bu ek bulgu onun orada bulunduğunu doğruladı.',
      type: 'forensic', pair: ['s2', 'l2'], action: 'confirm',
      hint: 'Zamanı ve kimliği doğrulanan iz, hangi şüpheliyi bir yere bağlar?',
      effect: 'Cem Bey ↔ Bahçe', facts: []
    }
  ];
  candidate.clues = candidate.clues.map((clue, index) => {
    const d = definitions[index];
    return { ...clue, text: d.text, type: d.type, deductionHint: d.hint,
      isCrimeAnchor: index === 0, logicRules: [{ action: d.action, pair: d.pair }],
      qaSemanticFacts: d.facts,
      qaRationale: { matrixEffect: d.effect, evidenceLink: d.text,
        evidenceKind: d.type === 'evidence' ? 'physical' : d.type } };
  });
  candidate.qaSemanticFacts = structuredClone(definitions[0].facts);
  candidate.qaPattern = { anchorSource: 'clue:c1', designIntent: 'Adli bulgu cinayet aletini belirler. İki bağımsız teslim dışlaması taşıyıcıyı daraltır; diğer iki eşyanın doğrulanan yerleri olay yerini çapraz eşleşmeyle belirler. Dört temel ipucunun her biri zorunludur. Bonuslar masumların açık kalan yerlerini doldurur.' };
  candidate.qaAuthoringVersion = 'fm_konak_offline_candidate_v1';
  return candidate;
}
