/**
 * Puzzle data for Faili Meçhul — 30 Turkish detective puzzles.
 *
 * SOLVABILITY INVARIANTS (enforced per puzzle):
 *   1. Free clues (isBonus: false) together eliminate ≥ 2 options across
 *      suspects / weapons / locations.
 *   2. Free + bonus clues together uniquely determine exactly one
 *      suspect, one weapon, and one location (matching the solution).
 *
 * Validation script: scripts/validate-puzzles.js
 */
export type GridMark = "none" | "cross" | "check" | "question";

export interface Suspect {
  id: string;
  name: string;
  description: string;
  detail?: string;
  icon: string;
  parmakIziDeseni?: string;
}

export interface Weapon {
  id: string;
  name: string;
  description: string;
  detail?: string;
  icon: string;
}

export interface Location {
  id: string;
  name: string;
  description: string;
  detail?: string;
  icon: string;
}

export type ClueMechanicType =
  | "text"
  | "gorsel_ipucu"
  | "ses_kaydi"
  | "tanik_yuzlesme"
  | "sifreli_mesaj"
  | "phone_chain"
  | "anagram"
  | "dna_match"
  | "timeline_sort"
  | "parmak_izi"
  | "face_match"
  | "profil_sentezi";

export interface ClueYuzlesmeDialog {
  soru: string;
  cevap: string;
  yalan: boolean;
}

export interface ClueSifreKomutAlani {
  etiket: string;
  secenekler: string[];
  cevap: string;
}

export interface ClueSifreThermalCard {
  id: string;
  temperatureC: number;
  glyph: string;
  note: string;
}

export interface ClueSifrejGridInteraction {
  mode?: string;
  inputLabel?: string;
  submitLabel?: string;
  successMessage?: string;
  failureMessage?: string;
}

export interface ClueSifrePresentation {
  mode?: string;
  style?: string;
  answerFormat?: string;
  orderRule?: string;
  cards?: ClueSifreThermalCard[];
  rowSymbols?: string[];
  columnSymbols?: string[];
  cells?: string[][];
  cipherSymbols?: string[];
  cipherDisplay?: string;
  answerAliases?: string[];
  interaction?: ClueSifrejGridInteraction;
  purposeHint?: string;
  title?: string;
  subtitle?: string;
  mobile?: { minCellPx?: number };
  [key: string]: unknown;
}

export interface ClueSifre {
  sifrelenmis: string;
  sifreleTuru: string;
  cozumIpucu: string;
  cozulmus: string;
  aciklama: string;
  komutAlanlari?: ClueSifreKomutAlani[];
  presentation?: ClueSifrePresentation;
}

export interface CluePhoneMessage {
  id: string;
  gonderen: string;
  alici: string;
  icerik: string;
  saat: string;
}

export interface CluePhoneVerisi {
  aciklama: string;
  mesajlar: CluePhoneMessage[];
  sonuc: string;
}

export interface ClueAnagramData {
  karisik: string;
  dogru: string;
  aciklama: string;
  ipucu: string;
}

export interface ClueDNAProfile {
  lokus1: string;
  lokus2: string;
  lokus3: string;
}

export interface ClueDNASuspect extends ClueDNAProfile {
  suspectId: string;
  eslesme: boolean;
}

export interface ClueDnaVerisi {
  aciklama: string;
  ornekProfil: ClueDNAProfile;
  supheliProfiller: ClueDNASuspect[];
  sonuc: string;
}

export interface ClueTimelineEvent {
  id: string;
  metin: string;
  dogruSira: number;
}

export interface ClueTimelineVerisi {
  aciklama: string;
  olaylar: ClueTimelineEvent[];
  sonuc: string;
}

export interface ClueParmakIziIz {
  izId: string;
  konum: string;
  eslesme: string;
  ipucu: string;
}

export interface ClueParmakIziVerisi {
  aciklama: string;
  izler: ClueParmakIziIz[];
  sonuc: string;
  sahneGorseli?: string;
}

export interface ClueProfilSenteziDelilKarti {
  id: string;
  baslik: string;
  metin: string;
}

export interface ClueProfilSenteziPresentation {
  style?: string;
  sceneLabel?: string;
  reflectionNote?: string;
  physicalEvidenceLabel?: string;
  purposeHint?: string;
  [key: string]: unknown;
}

export interface ClueProfilSenteziVerisi {
  baslik: string;
  aciklama: string;
  delilKartlari: ClueProfilSenteziDelilKarti[];
  optionSuspectIds: string[];
  answerSuspectId: string;
  answerProfileSignals: string[];
  successText: string;
  failureText: string;
  presentation?: ClueProfilSenteziPresentation;
}

export interface ClueFotoSupheli {
  suspectId: string;
  eslesme: boolean;
  [key: string]: string | boolean;
}

export interface ClueFotoVerisi {
  aciklama: string;
  olayYeriIzi: Record<string, string>;
  supheliAyakkabilari: ClueFotoSupheli[];
  sonuc: string;
}

export interface Clue {
  id: string;
  text: string;
  type: "direct" | "indirect" | "elimination" | "evidence" | "witness" | "forensic" | "record";
  isBonus: boolean;
  mechanicType?: ClueMechanicType;
  deductionHint?: string;
  gorselAciklama?: string;
  sesMetni?: string;
  audioUrl?: string;
  audioAssetId?: string;
  audioPlanned?: boolean;
  audioFileName?: string;
  audioPuzzle?: {
    style?: string;
    title?: string;
    subtitle?: string;
    purposeHint?: string;
    segments?: { id: string; label?: string; audioAssetId?: string; startSec?: number; endSec?: number }[];
    question?: string;
    options?: { id: string; label?: string }[];
    correctOptionId?: string;
    successMessage?: string;
    failureMessage?: string;
    hint?: string;
    hintPenaltySeconds?: number;
    interaction?: { mode?: string; submitLabel?: string; showTranscriptOnDemand?: boolean };
    [key: string]: unknown;
  };
  yuzlesmeDialogu?: ClueYuzlesmeDialog[];
  sifre?: ClueSifre;
  phoneVerisi?: CluePhoneVerisi;
  anagramVerisi?: ClueAnagramData;
  dnaVerisi?: ClueDnaVerisi;
  timelineVerisi?: ClueTimelineVerisi;
  parmakIziVerisi?: ClueParmakIziVerisi;
  fotoVerisi?: ClueFotoVerisi;
  profilSenteziVerisi?: ClueProfilSenteziVerisi;
}

export interface SolvabilityMeta {
  freeEliminations: string[];
  bonusEliminations: string[];
}

export interface Solution {
  suspectId: string;
  weaponId: string;
  locationId: string;
}

export type Difficulty = "caylak" | "dedektif" | "baskomiser";

export function titleToSlug(title: string): string {
  const tr: Record<string, string> = {
    "ğ": "g", "ü": "u", "ş": "s", "ı": "i", "ö": "o", "ç": "c",
    "â": "a", "Â": "a",
  };
  let s = title.toLowerCase();
  for (const [k, v] of Object.entries(tr)) s = s.split(k).join(v);
  return s
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export interface Puzzle {
  id: string;
  title: string;
  story: string;
  suspects: Suspect[];
  weapons: Weapon[];
  locations: Location[];
  clues: Clue[];
  solution: Solution;
  difficulty: Difficulty;
  dayIndex: number;
  solvabilityMeta: SolvabilityMeta;
}

export const PUZZLES: Puzzle[] = [
  {
    id: "konakta-gece-yarisi-cinayeti",
    title: "Konakta Gece Yarısı Cinayeti",
    difficulty: "caylak",
    dayIndex: 1,
    story:
      "Tarihi konaktaki gece davetinin ardından ev sahibinin sadık yardımcısı Selma, kan içinde bulundu. Adli tıp, cinayetin 23:30 ile 00:00 arasında işlendiğini tahmin ediyor. Fırtına nedeniyle kimsenin ayrılamadığı bu konakta, katil hala aramızda.",
    suspects: [
      { id: "s1", name: "Nazik Hanım", description: "Konağın en yaşlı misafiri. Fiziksel olarak güçsüz olsa da etrafında olan bitene karşı son derece dikkatli ve gözlemci.", icon: "pa:konakta_s1" },
      { id: "s2", name: "Cem Bey", description: "Ev sahibinin uzaktan akrabası. Boylu poslu, ağır fiziksel işleri kolayca yapabilecek kuvvette bir yapıya sahip.", icon: "pa:konakta_s2" },
      { id: "s3", name: "Zeynep Hanım", description: "Genç ve hırslı bir davetli. Atik yapısıyla dikkat çekiyor, stres altında çok hızlı ve fevri hareket edebiliyor.", icon: "pa:konakta_s3" },
    ],
    weapons: [
      { id: "w1", name: "Makas", description: "Et ve kemik parçalamak için tasarlanmış, tek hamlede derin yara açabilen ağır ve keskin mutfak aleti.", icon: "pa:konakta_w1" },
      { id: "w2", name: "Kimyasal", description: "Renksiz ve kokusuz bir endüstriyel çözücü. Yiyecek veya içeceklere karıştırıldığında fark edilmesi imkansız.", icon: "pa:konakta_w2" },
      { id: "w3", name: "İp", description: "Ağır perdeleri ve dekorasyonları asmak için kullanılan, kalın ve oldukça sağlam kenevir halat.", icon: "pa:konakta_w3" },
    ],
    locations: [
      { id: "l1", name: "Kütüphane", description: "Kalın duvarları ve ağır meşe kapısı sayesinde dışarıya veya içeriye hiçbir sesin sızmadığı izole çalışma alanı.", icon: "pa:konakta_l1" },
      { id: "l2", name: "Bahçe", description: "Konağın etrafını saran açık alan. Loş aydınlatması sayesinde kuytu köşelerde rahatça gizlenme imkanı sunuyor.", icon: "pa:konakta_l2" },
      { id: "l3", name: "Mutfak", description: "Yerleri genellikle nemli ve kaygan olan, içinde onlarca tehlikeli aletin bulunduğu arka cephedeki hazırlık alanı.", icon: "pa:konakta_l3" },
    ],
    clues: [
      { id: "c1", text: "Kurban zehirlenmemiş veya iple boğulmamış; derin bir kesici alet darbesiyle hayatını kaybetmiş.", type: "forensic", isBonus: false },
      { id: "c2", text: "Nazik Hanım gece boyunca Bahçe'de çayını yudumlayarak kitap okuduğunu belirtti ve bu durum doğrulandı.", type: "witness", isBonus: false },
      { id: "c3", text: "Cem Bey'in gece boyunca Kütüphane'den çıkmadığı ve dekorasyonlarla uğraştığı rapor edildi.", type: "witness", isBonus: false },
      { id: "c4", text: "Kan izleri ve boğuşma kanıtları yalnızca arkadaki hazırlık alanında bulunuyor.", type: "evidence", isBonus: false },
      { id: "c5", text: "Koridor kameraları, Zeynep Hanım'ın 23:38'de Mutfağa giriş yaptığını ve 00:15'te telaşla çıktığını gösteriyor.", type: "record", isBonus: true },
      { id: "c6", text: "Ağır mutfak makasının sap kısmında, Zeynep Hanım'a ait net parmak izleri tespit edildi.", type: "forensic", isBonus: true },
    ],
    solvabilityMeta: {
      freeEliminations: ["s1", "s2", "w2", "w3", "l1", "l2"],
      bonusEliminations: [],
    },
    solution: { suspectId: "s3", weaponId: "w1", locationId: "l3" },
  },
  {
    id: "bogazda-kayip-elmas",
    title: "Boğaz'da Kayıp Elmas",
    difficulty: "dedektif",
    dayIndex: 2,
    story:
      "İstanbul Boğazı'nın serin sularında süzülen lüks yatta düzenlenen o gösterişli sergi, kanlı bir geceyle son buldu. Paha biçilemez 'Boğaz Elması'nın çalındığı anlaşıldığında, geminin güvenlik şefi Orhan cansız yatıyordu. Dalgaların sesi yatı döverken, katil ve çaldığı elmas hala bu lüks kafesin içinde saklanıyor.",
    suspects: [
      { id: "s1", name: "Kaptan Levent", description: "Geminin deneyimli kaptanı. Fiziksel olarak oldukça yapılı ve ağır nesneleri kolayca savurabilecek kuvvette.", icon: "pa:bogaz_s1" },
      { id: "s2", name: "Sponsor Murat", description: "Partinin zengin finansörü. İnce yapılı; ağır fiziksel güç gerektiren işlere ve kirli ortamlara hiç alışkın değil.", icon: "pa:bogaz_s2" },
      { id: "s3", name: "Organizatör Eda", description: "Serginin sorumlusu. Çevik, esnek ve geminin en dar, gizli alanlarında bile rahatça hareket edebilecek fiziksel yapıda.", icon: "pa:bogaz_s3" },
    ],
    weapons: [
      { id: "w1", name: "Gemi Halatı", description: "Gemiyi iskeleye bağlamak için kullanılan kalın sentetik ip. Çok sağlam ve kıvrılabilen esnek bir yapıya sahip.", icon: "pa:bogaz_w1" },
      { id: "w2", name: "Demir Çekiç", description: "Ağır bakım ve onarım aleti. Ciddi bir fiziksel kütleye sahip, tek vuruşta kemik kırabilen paslanmaz çelik donanım.", icon: "pa:bogaz_w2" },
      { id: "w3", name: "Gaz Tüpü", description: "Basınçlı endüstriyel tüp. Kapalı bir alanda sızıntı yapması durumunda ortamdaki oksijeni tüketerek zehirleyici olabilir.", icon: "pa:bogaz_w3" },
    ],
    locations: [
      { id: "l1", name: "Makine Dairesi", description: "Geminin en alt katında yer alan, zemini makine yağıyla kaplı, gürültülü, dar ve gözden uzak teknik alan.", icon: "pa:bogaz_l1" },
      { id: "l2", name: "Seyir Köprüsü", description: "En üst katta yer alan, geminin yönlendirildiği sürekli kameralarla izlenen aydınlık ve güvenli yönetim merkezi.", icon: "pa:bogaz_l2" },
      { id: "l3", name: "VIP Salon", description: "Misafirlerin ağırlandığı, beyaz halılarla kaplı, aydınlık, temiz ve oldukça geniş eğlence alanı.", icon: "pa:bogaz_l3" },
    ],
    clues: [
      { id: "c1", text: "Gemi mühendislerinin raporuna göre, cinayet mahallindeki ağır makine yağı kokusu, olayın üst katlardaki temiz alanlarda yaşanmadığını kanıtlıyordu.", type: "evidence", isBonus: false },
      { id: "c2", text: "Kaptan Levent'in, telsiz odasından gelen acil bir çağrı üzerine gece boyunca misafirlerin yanından ayrılmadığı ve alt katlara hiç inmediği anlaşıldı.", type: "witness", isBonus: false },
      { id: "c3", text: "Otopsi sonuçları oldukça ilginçti; kurbanın boynundaki iz, soğuk bir demir veya sızan bir gazdan ziyade, pürüzlü ve esnek bir dokunun eseriydi.", type: "forensic", isBonus: false },
      { id: "c4", text: "Sponsor Murat'ın lüks İtalyan kesim takım elbisesinde tek bir toz zerresi bile yoktu; o karanlık ve kirli alana adım atmadığı çok açıktı.", type: "evidence", isBonus: false },
      { id: "c5", text: "Sergi hazırlıkları sırasında esnek gemi ekipmanlarını taşıyan tek kişinin, dar alanlarda rahatça hareket edebilen Eda olduğu lojistik defterine işlenmişti.", type: "record", isBonus: true },
      { id: "c6", text: "Kurbanın elleri arasında sıkışıp kopan kalın sentetik lifler, Eda'nın erişiminde olan bağlama ekipmanlarıyla birebir aynı kimyasal yapıdaydı.", type: "forensic", isBonus: true },
    ],
    solvabilityMeta: {
      freeEliminations: ["s1", "s2", "w2", "w3", "l2", "l3"],
      bonusEliminations: [],
    },
    solution: { suspectId: "s3", weaponId: "w1", locationId: "l1" },
  },
  {
    id: "kapalicarsida-gizem",
    title: "Kapalıçarşı'da Gizem",
    difficulty: "dedektif",
    dayIndex: 3,
    story:
      "Kapalıçarşı'nın yüzlerce yıllık labirent gibi sokaklarına çöken akşam karanlığı, bir cinayeti örtbas etmeye yetmedi. Çarşının en eski kuyumcularından biri, kepenkler indikten hemen sonra dükkanında vahşice katledildi. Katil, çarşının tanıdık simalarından birisiydi.",
    suspects: [
      { id: "s1", name: "Ahmet Usta", description: "Komşu bakırcı esnaf. Otuz yıllık tecrübesiyle çarşının her köşesini ezbere bilen, kendi dükkanından çıkmayan geleneksel usta.", icon: "pa:kcarsi_s1" },
      { id: "s2", name: "Selma Teyze", description: "Çarşının saygın ve yaşlı muhasebecisi. Rakamlar konusunda hata yapmaz ancak teknolojik cihazlar ve şifrelerle arası hiç iyi değildir.", icon: "pa:kcarsi_s2" },
      { id: "s3", name: "Kerem Genç", description: "Stajyer olarak son ay işe başlayan, dijital şifreleme ve kilit teknolojilerine son derece yatkın, meraklı genç çalışan.", icon: "pa:kcarsi_s3" },
    ],
    weapons: [
      { id: "w1", name: "Ağır Terazi", description: "Kuyumcu terazisinin tunç kefesi, hassas ölçümler için kullanılan ancak birkaç kilogram ağırlığında katı bir cisim.", icon: "pa:kcarsi_w1" },
      { id: "w2", name: "Kimyasal Madde", description: "Altın eritme sürecinde kullanılan, deriyle temas halinde ölümcül yanıklara yol açan asit bazlı aşındırıcı çözelti.", icon: "pa:kcarsi_w2" },
      { id: "w3", name: "Pençe Anahtar", description: "Kalın çelik kapıları ve kilitleri zorlamak, bükmek için kullanılan, kilit mekanizmalarında derin izler bırakan ağır alet.", icon: "pa:kcarsi_w3" },
    ],
    locations: [
      { id: "l1", name: "Dükkan İçi", description: "Vitrinlerin ve kasanın bulunduğu, doğrudan sokağı ve dışarıdan geçenleri gören geniş aydınlık müşteri alanı.", icon: "pa:kcarsi_l1" },
      { id: "l2", name: "Arka Depo", description: "Sadece karmaşık elektronik bir şifreyle girilebilen, altınların saklandığı penceresiz, yalıtımlı güvenlik odası.", icon: "pa:kcarsi_l2" },
      { id: "l3", name: "Çarşı Koridoru", description: "Kepenkler kapandıktan sonra sadece gece bekçilerinin devriye gezdiği, yüzlerce yıllık kıvrımlı taş yürüyüş yolları.", icon: "pa:kcarsi_l3" },
    ],
    clues: [
      { id: "c1", text: "Çarşı kapısındaki gece bekçisi kayıtları, Ahmet Usta'nın dükkanını erkenden kilitleyip ana cadde tarafındaki aydınlık vitrinlerle uğraştığını gösteriyor.", type: "record", isBonus: false },
      { id: "c2", text: "Kafatasındaki derin travma izinin çapı, hassas bir terazinin bırakabileceğinden çok daha geniş ve kilitleri zorlayacak kadar kaba bir metale aitti.", type: "forensic", isBonus: false },
      { id: "c3", text: "Kan izleri, dışarıdan geçenlerin rahatça görebileceği müşteri alanında değil, elektronik şifreyle korunan arka bölmeye doğru yoğunlaşıyordu.", type: "evidence", isBonus: false },
      { id: "c4", text: "Selma Teyze, olay saatinde muhasebe defterlerini çarşının öbür ucundaki çay ocağında incelediğini iki esnafa doğrulattı.", type: "witness", isBonus: false },
      { id: "c5", text: "Penceresiz güvenlik odasının dijital şifre paneli, çarşıda teknolojiyle arası en iyi olan genç çalışanın sık kullandığı kombinasyonla açılmıştı.", type: "evidence", isBonus: true },
      { id: "c6", text: "Stajyer Kerem'in önlüğünün astarında, cinayette kullanılan ağır çelik aletten sıçrayan ve maktule ait olan taze kan damlaları bulundu.", type: "forensic", isBonus: true },
    ],
    solvabilityMeta: {
      freeEliminations: ["l1", "l3", "s2", "w2", "s1"],
      bonusEliminations: ["w1"],
    },
    solution: { suspectId: "s3", weaponId: "w3", locationId: "l2" },
  },
  {
    id: "universitede-karanlik-sir",
    title: "Üniversitede Karanlık Sır",
    difficulty: "dedektif",
    dayIndex: 4,
    story:
      "İstanbul'un köklü üniversitesindeki sessiz gece, çığır açacak bir araştırma projesinin kana bulanmasıyla yırtıldı. Laboratuvar yöneticisi, masasının başında ölü bulundu ve paha biçilemez kritik araştırma verileri şifreli sunuculardan kalıcı olarak silindi.",
    suspects: [
      { id: "s1", name: "Prof. Kahraman", description: "Son derece rekabetçi ve sert mizaçlı, tüm gününü sadece evrak dolu odasında makale yazarak geçiren kıdemli akademisyen.", icon: "pa:uni_s1" },
      { id: "s2", name: "Asistan Elif", description: "Gecelerini araştırmalara adayan, projenin tüm teknik altyapısına ve voltaj düzeneklerine hakim hırslı doktora öğrencisi.", icon: "pa:uni_s2" },
      { id: "s3", name: "Güvenlik Görevlisi", description: "Sadece gece vardiyasında çalışan, teknik bilgisi olmayan, binaların fiziksel devriye kontrollerini yapan personel.", icon: "pa:uni_s3" },
    ],
    weapons: [
      { id: "w1", name: "Elektrik Çarpması", description: "Deney cihazlarının yüksek voltajlı kablolarının kasıtlı olarak birleştirilmesiyle oluşturulan ani ve ölümcül kısa devre.", icon: "pa:uni_w1" },
      { id: "w2", name: "Kimyasal Gaz", description: "Tüplerden sızdırıldığında kapalı ortamda birikebilen, solunum yollarını tahrip eden tehlikeli ve boğucu bileşik.", icon: "pa:uni_w2" },
      { id: "w3", name: "Keskin Nesne", description: "Masanın üzerindeki cam bölmelerden koparılmış, damarları tek hamlede kesebilecek kadar sivri kırık bir parça.", icon: "pa:uni_w3" },
    ],
    locations: [
      { id: "l1", name: "Laboratuvar", description: "Çeşitli deney düzeneklerinin, yüksek voltajlı prizlerin ve kimyasal tüplerin bulunduğu tam donanımlı araştırma odası.", icon: "pa:uni_l1" },
      { id: "l2", name: "Ofis", description: "Yığınla dosya, basılı evrak ve standart bilgisayar ekranlarıyla dolu olan klasik, tehlikesiz akademisyen çalışma odası.", icon: "pa:uni_l2" },
      { id: "l3", name: "Koridorlar", description: "Gece yarısı tamamen ıssızlaşan, sadece devriye personelinin geçtiği, güvenlik kameralarıyla izlenen uzun geçitler.", icon: "pa:uni_l3" },
    ],
    clues: [
      { id: "c1", text: "Olay yerindeki gelişmiş analiz cihazlarının kasıtlı olarak devreden çıkarılması, cinayetin sıradan evrakların bulunduğu bir ofiste işlenmediğini açıkça gösteriyordu.", type: "evidence", isBonus: false },
      { id: "c2", text: "Gece vardiyasındaki güvenlik görevlisi, uzun geçitlerde devriye atarken kilitli kapıları hiç zorlamadığını ve sadece dış koridorları kontrol ettiğini kamera kayıtlarıyla kanıtladı.", type: "witness", isBonus: false },
      { id: "c3", text: "Maktulün üzerinde hiçbir cam kesiği veya solunum yolunu tahrip eden boğucu madde kalıntısı bulunmadı; ölüm ani bir şokla, dışarıdan bir müdahale olmadan gerçekleşmiş gibi görünüyordu.", type: "forensic", isBonus: false },
      { id: "c4", text: "Prof. Kahraman'ın bilgisayarından, olay saatinde kesintisiz olarak üniversite sunucusuna makale verisi yüklendiği ve ofisinden çıkmadığı anlaşıldı.", type: "record", isBonus: false },
      { id: "c5", text: "Yüksek voltajlı cihazların sigorta kutusunda, sadece teknik altyapıya hakim doktora öğrencisinin bildiği gizli bir baypas işlemi yapılmıştı.", type: "evidence", isBonus: true },
      { id: "c6", text: "Asistan Elif'in laboratuvar eldivenlerinin uçlarındaki yanık izleri, kasıtlı olarak yaratılan o ölümcül kısa devrenin kıvılcımlarıyla tamamen eşleşiyordu.", type: "forensic", isBonus: true },
    ],
    solvabilityMeta: {
      freeEliminations: ["l2", "l3", "s3", "w2", "w3", "s1"],
      bonusEliminations: [],
    },
    solution: { suspectId: "s2", weaponId: "w1", locationId: "l1" },
  },
  {
    id: "pazar-yerinde-supheli-olum",
    title: "Pazar Yerinde Şüpheli Ölüm",
    difficulty: "caylak",
    dayIndex: 5,
    story:
      "İstanbul'un kalabalık ve gürültülü çarşısında ünlü tatlıcı Halit Usta, tezgahının başında altın sarısı tatlıların üzerine yığılarak son nefesini verdi. Geriye üç şüpheli ve zehirli bir sır kaldı.",
    suspects: [
      { id: "s1", name: "Müşteri Hanım", description: "Yıllardır her pazar alışverişe gelen, elindeki bastonuyla çarşıyı adımlayan yaşlı müdavim.", icon: "pa:pazar_s1" },
      { id: "s2", name: "Tedarikçi Genç", description: "Ağır tepsileri taşıyan, yorgunluktan gözleri kanlanmış, aceleci depo görevlisi.", icon: "pa:pazar_s2" },
      { id: "s3", name: "Komşu Satıcı", description: "Kendi alanında müşteri beklerken gözlerini yan taraftan ayırmayan rakip esnaf.", icon: "pa:pazar_s3" },
    ],
    weapons: [
      { id: "w1", name: "Baklava", description: "Üzeri fıstıklarla süslenmiş, taze görünümüyle iştah açan ünlü pazar tatlısı.", icon: "pa:pazar_w1" },
      { id: "w2", name: "Şerbet", description: "Büyük bakır güğümde kaynatılmış, berrak ve yoğun şekerli geleneksel sıvı.", icon: "pa:pazar_w2" },
      { id: "w3", name: "Kimyasal Madde", description: "Zemin temizliğinde kullanılan, keskin kokulu endüstriyel çözücü.", icon: "pa:pazar_w3" },
    ],
    locations: [
      { id: "l1", name: "Tezgah", description: "Tepsilerin dizildiği, şerbetin damladığı ve müşterilerin alışveriş yaptığı ana satış noktası.", icon: "pa:pazar_l1" },
      { id: "l2", name: "Ara Sokak", description: "Müşterilerin kestirme olarak kullandığı, dükkanların arka kapılarına açılan loş yaya geçidi.", icon: "pa:pazar_l2" },
      { id: "l3", name: "Park", description: "Sabah erken saatlerde araçların mal indirdiği, satış alanlarına oldukça uzak nokta.", icon: "pa:pazar_l3" },
    ],
    clues: [
      { id: "c1", text: "Adli tıp, maktulün ne şerbetten ne de temizlik maddesinden zehirlenmediğini, ölümün fıstıklı tatlıdan kaynaklandığını kesinleştirdi.", type: "forensic", isBonus: false },
      { id: "c2", text: "Olay yeri inceleme ekipleri, cinayetin arka sokakta veya park alanında değil, doğrudan tepsilerin dizildiği kendi satış alanında işlendiğini belirledi.", type: "evidence", isBonus: false },
      { id: "c3", text: "Müşteri Hanım'ın o sabah elindeki bastonuyla sadece arka geçitteki aktarlarda dolaştığı ve tatlıcıya hiç uğramadığı doğrulandı.", type: "witness", isBonus: false },
      { id: "c4", text: "Tedarikçi Genç, mesaisini malları indirdiği uzak araç alanında tamamladı ve kalabalık satış alanına adım bile atmadı.", type: "witness", isBonus: false },
      { id: "c5", text: "Güvenlik kameraları, Komşu Satıcı'nın olay anında Halit Usta'nın tezgahının tam önünde dikildiğini saptadı.", type: "record", isBonus: true },
      { id: "c6", text: "Kıskanç rakibin kendi elleriyle zehirli tatlıyı kurbanın tepsisine yerleştirdiği gizli bir kameraya yansıdı.", type: "record", isBonus: true },
    ],
    solvabilityMeta: {
      freeEliminations: ["s1", "s2", "w2", "w3", "l2", "l3"],
      bonusEliminations: [],
    },
    solution: { suspectId: "s3", weaponId: "w1", locationId: "l1" },
  },
  {
    id: "muzede-kayip-eser",
    title: "Müzede Kayıp Eser",
    difficulty: "dedektif",
    dayIndex: 6,
    story:
      "Ankara'daki asırlık müzenin loş koridorlarında, tarihin sessizliği kanla bozuldu. Bizans dönemine ait eşsiz bir broşun çalındığı fırtınalı gecede, gece bekçisi görev yerinde ağır yaralı olarak bulundu. Sırlar müze çalışanlarının arasında gizli.",
    suspects: [
      { id: "s1", name: "Küratör Bey", description: "Müzenin yöneticisi. Eserlerin tarihini çok iyi bilir ancak pratik restorasyon işlemleri ve kimyasallar konusunda hiçbir yetkinliği yoktur.", icon: "pa:muze_s1" },
      { id: "s2", name: "Restoratör Hanım", description: "Hasar görmüş eserleri hassas sivri aletler ve sıvılarla onaran, depolara giriş izni olan kapalı kapılar ardında çalışan uzman.", icon: "pa:muze_s2" },
      { id: "s3", name: "Ziyaretçi Rehberi", description: "Gündüzleri vitrinlerin önünde turlar düzenleyen, güvenli alanların dışına çıkma yetkisi olmayan sosyal alan görevlisi.", icon: "pa:muze_s3" },
    ],
    weapons: [
      { id: "w1", name: "Uyutucu İğne", description: "Deriye temas ettiği an hızla kana karışıp anında etki eden güçlü anestezik sıvı içeren medikal şırınga.", icon: "pa:muze_w1" },
      { id: "w2", name: "Sergi Kaidesi", description: "Vitrinlerin altında bulunan, kafaya isabet ettiğinde felaket yaratan ancak yerinden kıpırdatması çok zor olan ağır mermer destek.", icon: "pa:muze_w2" },
      { id: "w3", name: "Kimyasal Sprey", description: "Havaya sıkıldığında nefes borusunu yakarak geçici felç ve körlük yaratan, genze dolan yoğun kimyasal gaz karışımı.", icon: "pa:muze_w3" },
    ],
    locations: [
      { id: "l1", name: "Sergi Salonu", description: "Bizans ve Osmanlı eserlerinin ziyaretçilere sunulduğu, cam vitrinlerin bulunduğu, oldukça aydınlık ve geniş salon.", icon: "pa:muze_l1" },
      { id: "l2", name: "Depolama Odası", description: "Sadece özel yetkili personelin şifreyle girebildiği, restorasyon bekleyen eserlerin tutulduğu penceresiz kilitli oda.", icon: "pa:muze_l2" },
      { id: "l3", name: "Güvenlik Odası", description: "Tüm müzenin kamera görüntülerinin canlı izlendiği, monitörlerle ve telsizlerle dolu, sürekli personelin bulunduğu kontrol merkezi.", icon: "pa:muze_l3" },
    ],
    clues: [
      { id: "c1", text: "Müzenin turnike sistemi, Ziyaretçi Rehberi'nin tüm gece boyunca sadece aydınlık sergi salonu etrafında turlar attığını elektronik olarak doğruladı.", type: "record", isBonus: false },
      { id: "c2", text: "Mücadele izleri, kameraların canlı izlendiği personel merkezinde değil; dışarıdan yetkisiz kimsenin giremeyeceği penceresiz bir odada toplanmıştı.", type: "evidence", isBonus: false },
      { id: "c3", text: "Kurbanın ensesindeki mikroskobik giriş deliği, ağır bir mermer kaidenin eziği veya havaya sıkılan bir gazın tahribatı değildi; kana karışan sinsi bir yöntemi işaret ediyordu.", type: "forensic", isBonus: false },
      { id: "c4", text: "Küratör Bey'in, restorasyon işlemleri için gerekli özel şifrelere sahip olmadığı ve o gece üst kattaki odasından çıkmadığı asistanları tarafından onaylandı.", type: "witness", isBonus: false },
      { id: "c5", text: "Hasarlı eserlerin onarıldığı gizli deponun kapı şifresi, sadece hassas sıvılarla çalışan uzmanın bildiği bir kombinasyonla geçilmişti.", type: "evidence", isBonus: true },
      { id: "c6", text: "Restoratör Hanım'ın çekmecesinde bulunan medikal şırınganın içindeki sıvı kalıntısı, kurbanın kanında bulunan güçlü anestezikle moleküler olarak aynıydı.", type: "forensic", isBonus: true },
    ],
    solvabilityMeta: {
      freeEliminations: ["l1", "l3", "s3", "w3", "w2", "s1"],
      bonusEliminations: [],
    },
    solution: { suspectId: "s2", weaponId: "w1", locationId: "l2" },
  },
  {
    id: "adada-buyuk-gizem",
    title: "Adada Büyük Gizem",
    difficulty: "caylak",
    dayIndex: 7,
    story:
      "Büyükada'da yaz tatilinin huzuru, lüks bir villada işlenen cinayetle paramparça oldu. Adayı anakaraya bağlayan feribot seferleri iptal edilince, katil kurbanıyla aynı adada mahsur kaldı.",
    suspects: [
      { id: "s1", name: "Emekli Albay", description: "Sabahları erken uyanıp yürüyüş yapan, disiplinli ve sert mizaçlı villa komşusu.", icon: "pa:adada_s1" },
      { id: "s2", name: "Ressam Leyla", description: "Bütün yazını adada manzara resimleri çizerek geçiren, sessiz ve içine kapanık sanatçı.", icon: "pa:adada_s2" },
      { id: "s3", name: "Genç Yatçı", description: "Özel sürat teknesiyle adaya yeni gelen, fevri hareketleri olan gizemli misafir.", icon: "pa:adada_s3" },
    ],
    weapons: [
      { id: "w1", name: "Av Tüfeği", description: "Dolapta saklanan, yakından ateşlendiğinde korkunç ses çıkaran çift namlulu ateşli silah.", icon: "pa:adada_w1" },
      { id: "w2", name: "Zehir", description: "Doğal bitkilerden elde edilen, yiyeceklere karıştırılan sinsi bitki toksini.", icon: "pa:adada_w2" },
      { id: "w3", name: "Gemi Halatı", description: "Tekneleri iskeleye bağlamak için kullanılan, son derece sağlam ve kalın denizci ipi.", icon: "pa:adada_w3" },
    ],
    locations: [
      { id: "l1", name: "Villa Bahçesi", description: "Akdeniz bitkileri ve yüzme havuzuyla süslü, dışarıdan izole edilmiş geniş peyzaj alanı.", icon: "pa:adada_l1" },
      { id: "l2", name: "Sahil Şeridi", description: "Deniz dalgalarının vurduğu, insanların yürüyüş yaptığı uzun sahil yolu.", icon: "pa:adada_l2" },
      { id: "l3", name: "Kayalık", description: "Adanın güney ucundaki, manzarası güzel ancak uçurum kenarında yer alan sarp alan.", icon: "pa:adada_l3" },
    ],
    clues: [
      { id: "c1", text: "Cinayet sahil şeridinde veya sarp kayalıklarda işlenmedi; kurbanın bedeni villanın dışa kapalı peyzaj alanında bulundu.", type: "evidence", isBonus: false },
      { id: "c2", text: "Emekli Albay'ın sabah yürüyüşünü deniz dalgalarının vurduğu sahil yolunda yaptığı ve villaya hiç yaklaşmadığı anlaşıldı.", type: "witness", isBonus: false },
      { id: "c3", text: "Ressam Leyla, tüm sabahı uçurum kenarındaki sarp kayalıklarda resim çizerek geçirdiğini taslaklarıyla kanıtladı.", type: "witness", isBonus: false },
      { id: "c4", text: "Otopsi raporu, kurbanın bir ateşli silahla vurulmadığını veya bitkisel bir toksinle zehirlenmediğini açıkça ortaya koydu.", type: "forensic", isBonus: false },
      { id: "c5", text: "Olay yerindeki kalın denizci ipinin, adaya yeni gelen gizemli misafirin teknesinden söküldüğü tespit edildi.", type: "evidence", isBonus: true },
      { id: "c6", text: "Villa havuzunun kenarındaki çamurlu izler, Genç Yatçı'nın özel tasarım ayakkabılarıyla kusursuz bir eşleşme sağladı.", type: "forensic", isBonus: true },
    ],
    solvabilityMeta: {
      freeEliminations: ["w1", "w2", "s1", "l2", "s2", "l3"],
      bonusEliminations: [],
    },
    solution: { suspectId: "s3", weaponId: "w3", locationId: "l1" },
  },
  {
    id: "tren-yolculugunda-cinayet",
    title: "Tren Yolculuğunda Cinayet",
    difficulty: "dedektif",
    dayIndex: 8,
    story:
      "Ankara-İstanbul ekspresinin ritmik tekerlek sesleri, sessiz bir cinayeti gizlemeye yetmedi. Tren yoğun sis altında ilerlerken, birinci mevkide seyahat eden tanınmış bir iş insanı koltuğunda son nefesini vermişti. Tren istasyona varmadan katili bulmalısın.",
    suspects: [
      { id: "s1", name: "İş Kadını", description: "Sürekli evrak çantasıyla gezen, gergin, sabırsız ve hassas işlemlere eli hiç yatkın olmayan birinci mevki yolcusu.", icon: "pa:tren_s1" },
      { id: "s2", name: "Üniversite Öğrencisi", description: "Kulağında kulaklıkla kendi odasından hiç çıkmayan, etrafındaki insanlarla sıfır etkileşim kuran ucuz biletli genç yolcu.", icon: "pa:tren_s2" },
      { id: "s3", name: "Emekli Doktor", description: "Anatomik bilgiye sahip, yanında sürekli çeşitli sıvılar ve aletlerin bulunduğu küçük tıbbi çantalar taşıyan sakin yaşlı yolcu.", icon: "pa:tren_s3" },
    ],
    weapons: [
      { id: "w1", name: "Zehirli İçecek", description: "Bardağa damlatıldığında doğrudan kalp krizini tetikleyen, fark edilmesi imkansız renksiz ve tatsız tıbbi sıvı.", icon: "pa:tren_w1" },
      { id: "w2", name: "Kesici Silah", description: "Hareketli trende saklaması kolay, doğru açıdan vurulduğunda tek hamlede derin yara açan küçük çakı bıçağı.", icon: "pa:tren_w2" },
      { id: "w3", name: "Boğma Halatı", description: "Bavuldan çıkarılan, kurbanın arkasından boyuna dolandığında mekanik baskıyla nefesi anında kesen ince naylon ip.", icon: "pa:tren_w3" },
    ],
    locations: [
      { id: "l1", name: "Kompartıman", description: "Sadece kendi biletli yolcusunun girebildiği dar, dört kişilik ahşap bölmeli, kapısı kapalı özel konaklama odası.", icon: "pa:tren_l1" },
      { id: "l2", name: "Yemekli Vagon", description: "Beyaz örtülü masaların bulunduğu, çay servisinin yapıldığı, herkesin girip çıkabildiği ortak ve geniş oturma alanı.", icon: "pa:tren_l2" },
      { id: "l3", name: "Tuvalet", description: "Trenin en arka bölümünde yer alan, içeriden mandalla kilitlenebilen, oldukça küçük ve dar ihtiyaç alanı.", icon: "pa:tren_l3" },
    ],
    clues: [
      { id: "c1", text: "Bilet kondüktörü, gergin iş kadınının tüm yolculuk boyunca trenin arka tarafındaki küçük kilitli tuvalette mahsur kaldığını ve panik atak geçirdiğini teyit etti.", type: "witness", isBonus: false },
      { id: "c2", text: "Cinayet, sadece bir kişinin sığabileceği kilitli dar odalarda değil; beyaz örtülü masaların bulunduğu geniş ve herkesin erişimine açık bir alanda işlenmişti.", type: "evidence", isBonus: false },
      { id: "c3", text: "Maktulün boynunda hiçbir mekanik baskı izi yoktu; ayrıca hareket halindeki bir trende küçük bir bıçakla arkada hiç kan izi bırakmadan bu cinayeti işlemek imkansızdı.", type: "forensic", isBonus: false },
      { id: "c4", text: "Üniversite Öğrencisi'nin kulaklığını takıp kendi ahşap kompartımanından adımını bile atmadığı, koridor kamerasının kesintisiz kaydıyla ispatlandı.", type: "record", isBonus: false },
      { id: "c5", text: "Ortak yemek alanındaki çay bardağının dibinde, sadece ileri derecede anatomik bilgiye sahip birinin dozajını ayarlayabileceği renksiz bir tıbbi madde bulundu.", type: "evidence", isBonus: true },
      { id: "c6", text: "Emekli Doktor'un sürekli yanında taşıdığı küçük çantadaki tıbbi şişelerden birinin eksik olduğu ve kurbandaki toksinle aynı profili taşıdığı ortaya çıktı.", type: "forensic", isBonus: true },
    ],
    solvabilityMeta: {
      freeEliminations: ["l3", "s2", "w3", "l1", "w2", "s1"],
      bonusEliminations: [],
    },
    solution: { suspectId: "s3", weaponId: "w1", locationId: "l2" },
  },
  {
    id: "tarihi-hamamda-cinayet",
    title: "Tarihi Hamamda Cinayet",
    difficulty: "caylak",
    dayIndex: 9,
    story:
      "Sultanahmet'in asırlık kubbeleri altında yankılanan huzur verici su sesleri, dehşet dolu bir çığlıkla bıçak gibi kesildi. Tanınmış bir tüccar, tarihi hamamın yoğun buharlı sıcak odasında, göbek taşının hemen yanında cansız yatıyordu. Kapıların içeriden sürgülü olması ve dışarıdan kimsenin girmemiş olması, katilin hala o nefes kesici sisin ardında, peştamalların arasında gezindiğini kanıtlıyordu.",
    suspects: [
      { id: "s1", name: "Veznedar", description: "Hamamın girişinden, soyunma dolaplarından ve hesaplardan sorumlu genç görevli.", icon: "pa:hamam_s1" },
      { id: "s2", name: "Hamam Ağası", description: "Tarihi hamamın işletmecisi. Önemli konuklarla ve hamamın genel düzeniyle bizzat ilgilenen otoriter figür.", icon: "pa:hamam_s2" },
      { id: "s3", name: "Tellak", description: "Yılların tecrübesine sahip, göbek taşında kese atan, son derece güçlü kollara sahip emektar çalışan.", icon: "pa:hamam_s3" },
    ],
    weapons: [
      { id: "w1", name: "Acı Sabun", description: "Ağır kimyasallar içeren, yanlış kullanımda solunum yollarını tıkayıp zehirleyebilen özel yapım sabun.", icon: "pa:hamam_w1" },
      { id: "w2", name: "Zehirli Şerbet", description: "Maktulün dinlenirken içtiği, içine kalbi anında durduran güçlü bir bitkisel zehir karıştırılmış içecek.", icon: "pa:hamam_w2" },
      { id: "w3", name: "Çıplak El", description: "Hiçbir alet kullanmadan, acımasız ve doğrudan uygulanan ölümcül fiziksel boğma gücü.", icon: "pa:hamam_w3" },
    ],
    locations: [
      { id: "l1", name: "Sıcak Oda", description: "Yoğun buharlı, göbek taşının bulunduğu, göz gözü görmeyen ve nefes almanın zor olduğu mermer yıkanma alanı.", icon: "pa:hamam_l1" },
      { id: "l2", name: "Soğuk Oda", description: "Müşterilerin hamam sonrası peştamallarla uzanıp dinlendiği, şerbet servisinin yapıldığı serin bölüm.", icon: "pa:hamam_l2" },
      { id: "l3", name: "Giriş Salonu", description: "Hamamın ana kapısı, ahşap soyunma kabinlerinin ve kasanın bulunduğu aydınlık alan.", icon: "pa:hamam_l3" },
    ],
    clues: [
      { id: "c1", text: "Veznedar'ın vardiyası boyunca kasanın bulunduğu aydınlık giriş salonundan bir an olsun ayrılmadığı şahitlerle sabitlendi.", type: "witness", isBonus: false },
      { id: "c2", text: "Hamam Ağası'nın şerbet servisinin yapıldığı serin odada derin bir uykuya daldığı ve cinayet saatinde uyanmadığı kanıtlandı.", type: "witness", isBonus: false },
      { id: "c3", text: "Cinayetin aydınlık giriş salonunda veya serin dinlenme bölümünde değil, buharın göz gözü görmez ettiği mermer yıkanma alanında işlendiği kesinleşti.", type: "evidence", isBonus: false },
      { id: "c4", text: "Maktulün kanında bitkisel zehir veya kimyasal sabun kalıntısına rastlanmadı; ölüm doğrudan nefessiz bırakılma sonucu gerçekleşmişti.", type: "forensic", isBonus: false },
      { id: "c5", text: "Yoğun buharlı sıcaklık bölümünde kurbanla aynı anda bulunan tek kişi, göbek taşının emektar çalışanıydı.", type: "evidence", isBonus: true },
      { id: "c6", text: "Kurbanın boynundaki o korkunç baskı izleri, Tellak'ın yıllarca kese atmaktan güçlenmiş devasa elleriyle birebir örtüşüyordu.", type: "forensic", isBonus: true },
    ],
    solvabilityMeta: {
      freeEliminations: ["s1", "s2", "w1", "w2", "l2", "l3"],
      bonusEliminations: [],
    },
    solution: { suspectId: "s3", weaponId: "w3", locationId: "l1" },
  },
  {
    id: "sabanci-muzesi-gasp",
    title: "Sabancı Müzesi Gasp",
    difficulty: "baskomiser",
    dayIndex: 10,
    story:
      "Sabancı Müzesi'ndeki özel galada, Osmanlı dönemine ait nadide bir mücevher çalındı ve güvenlik koordinatörü ağır yaralı bulundu. Güvenlik sistemlerinin içeriden kapatılmış olması, bu kusursuz soygunun arkasında galadaki dört elit isimden birinin olduğunu kanıtlıyor.",
    suspects: [
      { id: "s1", name: "Galeri Direktörü", description: "Tüm organizasyonu yöneten, güvenlik protokollerini teorik olarak bilen ancak fiziksel müdahale yeteneği olmayan yönetici.", icon: "pa:sabanci_s1" },
      { id: "s2", name: "Ünlü Sanatçı", description: "Gala konuğu. Kaprisli, şımarık görünen ancak teknolojik sanat enstalasyonları sayesinde elektronik sistemlere son derece hakim figür.", icon: "pa:sabanci_s2" },
      { id: "s3", name: "Güvenlik Şefi", description: "Müze güvenliğinden sorumlu, kaslı ve iri yarı eski bir asker. Kameraların kör noktalarını ezbere biliyor.", icon: "pa:sabanci_s3" },
      { id: "s4", name: "Nakliyeci", description: "Eserleri taşıyan lojistik sorumlusu. Sadece yükleme alanlarına erişimi olan, kaba kuvvet gerektiren işlere alışkın işçi.", icon: "pa:sabanci_s4" },
    ],
    weapons: [
      { id: "w1", name: "Elektrik Sopası", description: "Yüksek voltajlı deşarj yaparak kurbanı anında felç eden ve bayıltan, teknolojik ve sessiz bir silah.", icon: "pa:sabanci_w1" },
      { id: "w2", name: "Kimyasal Sprey", description: "Geniş alanlarda bile herkesi etkileyen, havaya karıştığında gözleri kör eden yoğun biber gazı karışımı.", icon: "pa:sabanci_w2" },
      { id: "w3", name: "Demir Çubuk", description: "Güvenlik kapılarını kanırtmak ve kırmak için kullanılan, ağır, kaba ve son derece gürültülü levye.", icon: "pa:sabanci_w3" },
      { id: "w4", name: "Uyutucu", description: "Sadece damar içi enjeksiyonla verilebilen, kurbanın kollarında iğne izi bırakan medikal sedatif.", icon: "pa:sabanci_w4" },
    ],
    locations: [
      { id: "l1", name: "Sergi Salonu", description: "Osmanlı mücevherlerinin sergilendiği, kalabalık, aydınlık ve her köşesi izlenen ana etkinlik alanı.", icon: "pa:sabanci_l1" },
      { id: "l2", name: "Güvenlik Merkezi", description: "Kamera panellerinin ve alarm sunucularının bulunduğu, sadece yetkili elektronik kartla girilebilen izole oda.", icon: "pa:sabanci_l2" },
      { id: "l3", name: "Depo", description: "Sergilenmeyecek eserlerin muhafaza edildiği, tozlu, loş ve kaba kuvvetle açılabilen arka saklama alanı.", icon: "pa:sabanci_l3" },
      { id: "l4", name: "Çıkış Noktası", description: "Müzenin arkasında nakliye araçlarının yanaştığı, rüzgarlı ve açık havaya bakan mal kabul alanı.", icon: "pa:sabanci_l4" },
    ],
    clues: [
      { id: "c1", text: "Kurbanın sinir sistemi tamamen kilitlenmişti; olay yerinde ne bir gaz bulutu ne de zor kullanılmış bir şırınga vardı. Saldırgan sessiz bir teknoloji kullanmıştı.", type: "forensic", isBonus: false },
      { id: "c2", text: "Kanıtlar, hırsızlığın rüzgar alan dış cephede veya eserlerin sergilendiği ana alanda değil, tüm kameraları kör eden merkezi ve kapalı bir odada gerçekleştiğini gösteriyor.", type: "evidence", isBonus: false },
      { id: "c3", text: "Kaba kuvvet gerektiren işlere alışkın olan lojistik ekibinin, galadan çok önce yüklemeyi bitirip müzeden ayrıldığı güvenlik loglarına yansıdı.", type: "record", isBonus: false },
      { id: "c4", text: "Galeri Direktörü, gece boyunca kalabalık sanatsever kafilesine bizzat rehberlik ettiğini onlarca şahitle doğrulattı.", type: "witness", isBonus: false },
      { id: "c5", text: "Asker kökenli güvenlik şefi, olay gecesi Ankara'daki bir kolluk kuvvetleri seminerinde olduğuna dair ıslak imzalı belge sundu.", type: "record", isBonus: true },
      { id: "c6", text: "Kaprisli tavırlarıyla dikkat çeken elit konuğun, aslında modern sanat enstalasyonları sayesinde ileri düzey elektronik bilgisine sahip olduğu ve izole odaya giren tek kişi olduğu tespit edildi.", type: "evidence", isBonus: true },
    ],
    solvabilityMeta: {
      freeEliminations: ["l1", "s4", "w2", "s1"],
      bonusEliminations: ["l3", "l4", "w3", "w4", "s3"],
    },
    solution: { suspectId: "s2", weaponId: "w1", locationId: "l2" },
  },
  {
    id: "carsamba-suikasti",
    title: "Çarşamba Suikastı",
    difficulty: "dedektif",
    dayIndex: 11,
    story:
      "Çarşamba kasabasının o sakin ve durağan yapısı, belediye başkanının kendi makam odasında, deri koltuğunda ölü bulunmasıyla temelinden sarsıldı. Kasaba halkı şoktayken, cinayetin dışarıdan gelen biri tarafından değil, o kalın ahşap kapıların ardındaki en yakın yüzlerden biri tarafından işlendiği ortaya çıktı.",
    suspects: [
      { id: "s1", name: "Muhalefet Adayı", description: "Yıllardır başkanın koltuğunda gözü olan, belediye binasına sadece resmi davetlerle, protokol kapısından giriş yapabilen hırslı politikacı.", icon: "👨" },
      { id: "s2", name: "Sekreter Bayan", description: "Başkanın ajandasını, sırlarını ve kahve saatlerini ezbere bilen; makam odasının kalın kapılarından sorgusuz sualsiz geçebilen yegane kişi.", icon: "👩" },
      { id: "s3", name: "İnşaat Müteahhit", description: "İptal edilen ihaleler yüzünden iflasın eşiğine gelmiş, öfke kontrolü olmayan ve görüşme talepleri sürekli güvenlikli koridorlarda reddedilen iş adamı.", icon: "👷" },
    ],
    weapons: [
      { id: "w1", name: "Ağır Kağıt Ağırlığı", description: "Başkanın masasında duran, kafatasına savrulduğunda derin ve kanamalı çatlaklar oluşturacak ağırlıktaki paha biçilemez kristal obje.", icon: "square" },
      { id: "w2", name: "Zehirli Kahve", description: "Kana karıştığı anda mide duvarını kilitleyen, kokusuz, renksiz ve tamamen içeceklerle vücuda zerk edilen sinsi bir kimyasal.", icon: "coffee" },
      { id: "w3", name: "Elektrik Çarpması", description: "Makam odasındaki elektronik aletlerin fişlerine ustaca kurulan, temas halinde deride kavurucu yanıklar bırakan yüksek voltaj tuzağı.", icon: "flash-on" },
    ],
    locations: [
      { id: "l1", name: "Belediye Ofisi", description: "Sadece özel kartlarla girilebilen, deri koltukların ve ahşap panellerin bulunduğu, dışarıya tamamen yalıtılmış makam odası.", icon: "business" },
      { id: "l2", name: "Toplantı Odası", description: "Çok sayıda delegasyonun ağırlandığı, devasa oval masanın bulunduğu ve sürekli insan sirkülasyonu olan halka açık salon.", icon: "groups" },
      { id: "l3", name: "Koridor", description: "Kameraların 7/24 kayıtta olduğu, deri bekleme koltuklarının yer aldığı ve ziyaretçilerin adım saydığı geniş güvenlik geçidi.", icon: "route" },
    ],
    clues: [
      { id: "c1", text: "Adli tabip, kurbanın derisinde kavurucu bir voltaj yanığı veya kafatasında kristal bir göçük bulamadı; midesindeki şiddetli asit reaksiyonu, ölümün sıvı ve yutulabilir bir formda geldiğini kanıtlıyordu.", type: "forensic", isBonus: false },
      { id: "c2", text: "Kurbanın son nefesini verdiği yerdeki taze mürekkep lekeleri ve ağır deri döşeme kokusu, cinayetin insan sirkülasyonu olan oval masalarda değil, tamamen yalıtılmış şahsi bir alanda yaşandığını mühürledi.", type: "evidence", isBonus: false },
      { id: "c3", text: "Güvenlik kameraları, ihaleleri iptal edilen o öfkeli adamın, cinayet saatleri boyunca sadece deri bekleme koltuklarının bulunduğu alanda volta attığını saniye saniye kaydetmişti.", type: "record", isBonus: false },
      { id: "c4", text: "Siyasi rakibin, o kritik dakikalarda belediye binasının çok uzağında, bir televizyon kanalında canlı yayında olduğu yayın kayıtlarıyla kanıtlanarak onu tamamen akladı.", type: "evidence", isBonus: false },
      { id: "c5", text: "Makam odasının o kalın ahşap kapılarından, elinde şık bir tepsiyle sorgusuz sualsiz geçen o ince silüet, cinayetin zaman çizelgesindeki tek hareketli parçaydı.", type: "evidence", isBonus: true },
      { id: "c6", text: "Porselen fincanın dibinde kristalleşen toksin ile, sağ kol olarak bilinen kadının şahsi çekmecesinden eksilen nadir temizlik solventinin kimyasal izleri mikroskop altında birbirini tamamladı.", type: "forensic", isBonus: true },
    ],
    solvabilityMeta: {
      freeEliminations: ["l2", "l3", "s1", "s3", "w1", "w3"],
      bonusEliminations: [],
    },
    solution: { suspectId: "s2", weaponId: "w2", locationId: "l1" },
  },
  {
    id: "folklor-festivalinde-olum",
    title: "Folklor Festivalinde Ölüm",
    difficulty: "caylak",
    dayIndex: 12,
    story:
      "Ankara'nın serin bir sonbahar akşamında, binlerce kişinin coşkuyla izlediği folklor festivalinin baş koordinatörü sahnede aniden yere yığıldı. Rengarenk sahne ışıklarının altında yaşanan bu trajedi, alkış seslerini keserken sahne arkasındaki karanlık rekabetin de üzerindeki perdeyi kaldırdı.",
    suspects: [
      { id: "s1", name: "Rakip Sanatçı", description: "Ana kadroya alınmadığı için alev alev bir kinle yanan, sahnede olmak için her yolu mubah gören hırslı ve dışlanmış sanatçı.", icon: "noun-folklor-rakip-sanatci-avatar.png" },
      { id: "s2", name: "Ses Teknikeri", description: "Festivalin tüm devasa ve karmaşık elektriksel altyapısını, şalterleri ve ölümcül voltaj hatlarını santim santim bilen tecrübeli teknisyen.", icon: "noun-folklor-ses-teknikeri-avatar.png" },
      { id: "s3", name: "Sponsorların Temsilcisi", description: "Festivalin bütçesi yüzünden maktulle ciddi krizler yaşayan, yatırımlarını çekmekle tehdit eden takım elbiseli, soğukkanlı yönetici.", icon: "noun-folklor-sponsor-temsilcisi-avatar.png" },
    ],
    weapons: [
      { id: "w1", name: "Zehirli Su", description: "Kişisel su şişelerine damlatıldığında kalp ritmini saniyeler içinde geri dönülmez şekilde durduran, renksiz ve kokusuz sentetik zehir.", icon: "water-drop" },
      { id: "w2", name: "Elektrik Darbesi", description: "Sahne zeminindeki metal plakalara özel bir mühendislikle yönlendirilen ve dokunulduğunda kasları kilitleyip ölümcül şok yaratan ana akım.", icon: "flash-on" },
      { id: "w3", name: "Gizli Enjeksiyon", description: "Kalabalık arasında fark edilmeden deriye temas ettirilebilen, ucunda sinsi bir toksin barındıran ince uçlu medikal iğne.", icon: "vaccines" },
    ],
    locations: [
      { id: "l1", name: "Sahne", description: "Binlerce gözün üzerinde olduğu, devasa hoparlörler ve açıkta duran yüksek voltajlı güç kablolarıyla çevrili açık hava performans platformu.", icon: "theater-comedy" },
      { id: "l2", name: "Soyunma Odası", description: "Sanatçıların kostüm değiştirdiği, dışarıya kapalı, güvenli ve elektronik kilit sistemiyle korunan izole arka oda.", icon: "room" },
      { id: "l3", name: "Kontrol Odası", description: "Ses ve ışık düzeneklerinin yönetildiği, sahneyi uzaktan gören, dar ve elektronik cihazlarla dolu teknik kontrol odası.", icon: "settings" },
    ],
    clues: [
      {
        id: "c1",
        text: "Adli tabip, kurbanın vücudunda geniş çaplı doku yanıkları ve kas spazmları tespit etti; bu bulgular, doğrudan ana şebekeden çekilen kontrolsüz bir yüksek voltaj akımını işaret ediyordu.",
        type: "forensic",
        isBonus: false,
      },
      {
        id: "c2",
        text: "Kriminal inceleme, güç kablolarındaki kasıtlı kesiklerin sadece dışarıdaki açık hava performans platformunda yapıldığını, kapalı odaların temiz olduğunu belirledi.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c3",
        text: "Gösteri boyunca sahne arkası logları, rakip sanatçının sadece mikser ve ışık panellerinin bulunduğu teknik odada tutulduğunu ve dışarı adım atmadığını kanıtladı.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c4",
        text: "Sponsor temsilcisinin VIP çadırında imzaladığı faturaların saat damgaları, onun trajedi anında sahne alanından çok uzakta, müzisyenlerle kilitli bir toplantıda olduğunu doğruladı.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c5",
        text: "Açık sahneye giden ana akım hattında kurulan o kusursuz ve ölümcül 'kısa devre' köprüsü, amatör birinin yapamayacağı kadar ileri düzey bir mühendislik gerektiriyordu.",
        type: "evidence",
        isBonus: true,
      },
      {
        id: "c6",
        text: "Ana şalter kutusunun iç kapağında, festivalin tüm teknik işleyişinden sorumlu olan o kişinin izole eldivenlerine ait taze yanık ve erime izleri bulundu.",
        type: "evidence",
        isBonus: true,
      },
    ],
    solvabilityMeta: {
      freeEliminations: ["l2", "l3", "s1", "s3", "w1", "w3"],
      bonusEliminations: [],
    },
    solution: { suspectId: "s2", weaponId: "w2", locationId: "l1" },
  },
  {
    id: "kutuphanede-sessiz-suc",
    title: "Kütüphanede Sessiz Suç",
    difficulty: "dedektif",
    dayIndex: 13,
    story:
      "Üniversitenin asırlık kütüphanesinde, gece bekçisi sabahın ilk ışıklarıyla sessiz okuma salonunda kan donduran bir manzarayla karşılaştı. Yüzlerce yıllık çok değerli el yazmaları yok olmuş, geriye sadece tozlu raflar ve bir akademisyenin cansız bedeni kalmıştı.",
    suspects: [
      { id: "s1", name: "Kütüphaneci", description: "30 yılını eski kağıtlara adamış, kütüphanenin labirent gibi raflarını gözü kapalı bilen ancak gece yarısından önce mesaisini mutlaka bitiren emektar.", icon: "👴" },
      { id: "s2", name: "Doktora Öğrencisi", description: "Kayıp el yazmaları üzerine takıntılı araştırmalar yapan, akademik kariyerini kurtarmak için o belgelere çaresizce ihtiyaç duyan hırslı araştırmacı.", icon: "👨" },
      { id: "s3", name: "Temizlik Görevlisi", description: "Gece saat 02.00'de mesaiye başlayan, sadece genel alanları temizleme yetkisi olan ve özel şifreli bölmelere erişimi bulunmayan personel.", icon: "👷" },
    ],
    weapons: [
      { id: "w1", name: "Ağır Kitap", description: "Yaklaşık iki kilogram ağırlığında olan, deri ciltli ve köşeleri pirinç kaplamalı, kafaya savrulduğunda pürüzsüz ve devasa bir göçük açan ansiklopedi.", icon: "menu-book" },
      { id: "w2", name: "Kimyasal Madde", description: "Cilt restorasyonunda kullanılan, kapalı alanda solunduğunda ciğerleri dakikalar içinde eriten yüksek asitli ve keskin kokulu güçlü solüsyon.", icon: "science" },
      { id: "w3", name: "Baskı Aleti", description: "Sayfaları kopyalamak için kullanılan, ağırlığı nedeniyle yerinden oynatılması neredeyse imkansız olan, keskin demir kenarlı antika pres makinesi.", icon: "print" },
    ],
    locations: [
      { id: "l1", name: "Okuma Salonu", description: "Uzun meşe masaların ve yeşil okuma lambalarının bulunduğu, herkesin kullanımına açık, sessizliğin hakim olduğu devasa ana salon.", icon: "library-books" },
      { id: "l2", name: "El Yazmaları Bölümü", description: "Yüzlerce yıllık parşömenlerin iklimlendirilmiş cam fanuslarda tutulduğu, sadece özel izinle girilebilen kısıtlı ve şifreli depolama alanı.", icon: "history-edu" },
      { id: "l3", name: "Katalog Odası", description: "Arşiv indekslerinin ve kartoteks dolaplarının bulunduğu, genelde personelin temizlik malzemelerini de bıraktığı penceresiz dar oda.", icon: "folder" },
    ],
    clues: [

      {
        id: "c1",
        text: "Kan sıçrama analizlerinin o loş ve özel korumalı asırlık belgelerin raflarını kızıla boyaması, saldırının açık salonlarda değil, tam da o yasak bölgenin kalbinde gerçekleştiğini mühürledi.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c2",
        text: "Kafatasındaki derin, pürüzsüz ve pirinç izleri taşıyan o küt göçük, sabit bir antika makineden veya havaya karışan bir asitten değil, savrulabilen devasa ağırlıktaki bir nesneden kaynaklanıyordu.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c3",
        text: "Otuz yıllık emektar kütüphanecinin elektronik yaka kartı ve turnike logları, onun cinayet işlenmeden çok önce, saat tam 23.00'te binadan tamamen ayrıldığını sisteme kazımıştı.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c4",
        text: "Temizlik arabasının tekerleklerindeki kimyasal izler, personelin gece 02.00'de sadece kartoteks dolaplarının bulunduğu o dar ve penceresiz odayı paspasladığını doğruluyordu.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c5",
        text: "Takıntılı akademisyenin sürekli çalıştığı masada, her zaman baş köşede duran o iki kilogramlık pirinç köşeli devasa cildin yerinde yeller esiyordu.",
        type: "forensic",
        isBonus: true,
      },
      {
        id: "c6",
        text: "Gece nöbetçisinin fener ışığı, şifreli deponun hemen çıkışında, elinde ağır bir yükle nefes nefese karanlığa karışan o hırslı araştırmacının silüetini yakalamıştı.",
        type: "witness",
        isBonus: true,
      },
    ],
    solvabilityMeta: {
      freeEliminations: ["l1", "l3", "s1", "s3", "w2", "w3"],
      bonusEliminations: [],
    },
    solution: { suspectId: "s2", weaponId: "w1", locationId: "l2" },
  },
  {
    id: "sahil-kasabasinda-gece",
    title: "Sahil Kasabasında Gece",
    difficulty: "baskomiser",
    dayIndex: 14,
    story:
      "Ege'nin tuzlu rüzgarlarının dövdüğü küçük bir balıkçı köyünde, turistik otel sahibinin cesedi bulundu. Ay ışığının bile bulutların ardına saklandığı bu zifiri karanlık gecede, kurbanın geçmişindeki düşmanlıklar bir bir su yüzüne çıkıyor.",
    suspects: [
      { id: "s1", name: "Yerli Balıkçı", description: "Otelin inşasıyla balık yollarının kapandığını savunan, teknesini bir savaş gemisi gibi koruyan, ağlarla ve kesici aletlerle bütünleşmiş yaşlı denizci.", icon: "👴" },
      { id: "s2", name: "Tur Rehberi", description: "Maktulün kurduğu otel yüzünden kendi tur acentesi iflasın eşiğine gelen, bölgedeki tüm otobüs ve rota loglarına hakim, her yeri karış karış bilen öfkeli rehber.", icon: "👨" },
      { id: "s3", name: "Mülk Sahibi", description: "Otelin inşa edildiği arazinin gerçek sahibi olduğunu iddia eden, maktulle yıllardır süren davalar yüzünden toprak sınırlarını karış karış çitlemiş varlıklı adam.", icon: "👨‍💼" },
      { id: "s4", name: "Aşçı", description: "Lüks otelin mutfak masraflarından sorumlu olan, usulsüzlükleri maktul tarafından keşfedildiği için kovulma ve hapis korkusu yaşayan gergin başaşçı.", icon: "👨‍🍳" },
    ],
    weapons: [
      { id: "w1", name: "Balıkçı Bıçağı", description: "Denizcilerin ağları temizlemek ve balık ayıklamak için kullandığı, deriye saplandığında ince, düz ve son derece derin yırtıklar bırakan paslı çelik.", icon: "content-cut" },
      { id: "w2", name: "Kayalık", description: "İnsan bedeni metrelerce yüksekten boşluğa bırakılıp doğanın o sarp ve acımasız kütlesine çarptığında oluşan, kemikleri un ufak eden doğa olayı.", icon: "landscape" },
      { id: "w3", name: "Zehirli İçki", description: "Yerel ikramların içine şırıngayla karıştırılan, mide asidiyle buluştuğunda kalbi saniyeler içinde felç eden ancak iz bırakmayan sinsi sıvı.", icon: "local-bar" },
      { id: "w4", name: "İp", description: "Tekneleri fırtınada sabit tutmak için örülmüş, bir insanın boynuna tam güçle dolandığında pürüzlü, ağsı ve kalın sürtünme yanıkları bırakan naylon kordon.", icon: "fiber-manual-record" },
    ],
    locations: [
      { id: "l1", name: "Sahil Kenarı", description: "Dalgaların tahta iskeleleri dövdüğü, eski ahşap teknelerin birbirine sürtündüğü, deniz yosunu ve zift kokusunun birbirine karıştığı ıssız liman.", icon: "waves" },
      { id: "l2", name: "Otel Mutfağı", description: "Devasa endüstriyel fırınların hiç sönmediği, taze deniz ürünlerinin temizlendiği, sürekli gürültülü ve personelle dolu sıcak otel mutfağı.", icon: "restaurant" },
      { id: "l3", name: "Kayalık Burun", description: "Köyün en karanlık ucunda yer alan, zemini kaygan, rüzgarın insanı dengesizleştirdiği ve kilometrelerce aşağıya bakan o tehlikeli sarp uçurum.", icon: "terrain" },
      { id: "l4", name: "Otel Lobisi", description: "Deniz manzarasını boydan boya gören camlarla kaplı, sürekli kamera kaydı altında olan ve personelin sabaha kadar nöbet tuttuğu aydınlık ana giriş.", icon: "hotel" },
    ],
    clues: [
      {
        id: "c1",
        text: "Kurbanın ayakkabı tabanlarındaki derin çizikler ve ceketine bulaşan keskin deniz yosunu sporları, son anların ahşap zeminlerde değil, adanın sarp ve yıpratıcı ucunda yaşandığını fısıldıyordu.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c2",
        text: "Maktulün kafatasındaki devasa ve düzensiz ezilme, elde taşınabilen bir aletten ziyade, yüksek hızla ivmelenerek doğadaki sert, sabit ve yosunlu bir kütleye çarpmanın sonucuydu.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c3",
        text: "Otel mutfağındaki fırınların gece boyunca hiç kapanmadığı ve peş peşe çıkan sipariş fişlerinin altındaki ıslak imzalar, alevlerin başındaki ustanın terli mesaisini kanıtlıyordu.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c4",
        text: "Rehberin otobüs biletindeki zaman damgası ve valizindeki şehir tozu, onun o kritik saatlerde adanın çamurlu ve sarp arazilerine henüz adım atmadığını doğruluyordu.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c5",
        text: "Kıyıdaki eski ahşap teknenin yanında bulunan yırtık ağlar ve taze zift lekeleri, yaşlı denizcinin tüm geceyi kendi ekmek teknesini onarmaya adadığını belgeliyordu.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c6",
        text: "Kurbanın tırnak diplerinde, otel inşaatı yüzünden davalık olduğu o arsanın sınırlarını belirleyen özel mülk çitlerine ait paslı demir tozları bulundu.",
        type: "forensic",
        isBonus: true,
      },
      {
        id: "c7",
        text: "Uçurumun kenarındaki kaygan zemin, bir anlık öfke krizinin, bir adamı metrelerce aşağıya nasıl itebileceğinin en net tablosuydu.",
        type: "evidence",
        isBonus: true,
      },
    ],
    solvabilityMeta: {
      freeEliminations: ["l1", "l2", "l4", "s1", "s2", "s4", "w1"],
      bonusEliminations: ["w3", "w4"],
    },
    solution: { suspectId: "s3", weaponId: "w2", locationId: "l3" },
  },
  {
    id: "saat-fabrikasinda-gizem",
    title: "Saat Fabrikasında Gizem",
    difficulty: "dedektif",
    dayIndex: 15,
    story:
      "Eskişehir'in pas ve çelik kokan tarihi saat fabrikasında, dişlilerin ritmik sesi sabah saatlerinde çalan sirenlerle kesildi. Fabrika müdürü, kendi makinesinin çarkları arasında ölü bulundu. İşçi tulumlarının ardında dönen dolaplar artık sır değildi.",
    suspects: [
      { id: "s1", name: "İşçi Başı", description: "Fabrikanın ağır metal işçilerini örgütleyen, sendika hakları için müdürle sürekli omuz omuza kavgaya giren, iri yarı ve nasırlı ellere sahip lider.", icon: "👷" },
      { id: "s2", name: "Muhasebe Müdürü", description: "Fabrikanın batmak üzere olan mali tablolarından sorumlu olan, usulsüzlükleri yüzünden müdürle kriz yaşayan takım elbiseli beyaz yakalı.", icon: "🕵️" },
      { id: "s3", name: "Makine Mühendisi", description: "Fabrikanın tüm elektronik otomasyonunu tasarlayan, insanlardan ziyade kodlarla ve ekranlarla vakit geçiren, izole çalışan zeki tasarımcı.", icon: "👨" },
    ],
    weapons: [
      { id: "w1", name: "Çekiç", description: "Kaba metal parçalarını dövmek için kullanılan, sapı yağlı, kafa tasına indiğinde paslı demir oksit kalıntıları bırakan devasa balyoz.", icon: "hardware" },
      { id: "w2", name: "Zehirli Kimyasal", description: "Endüstriyel makine yağlarına karıştırıldığında buharlaşarak solunum yollarını felç eden, sinsi ve görünmez solvent gazı.", icon: "science" },
      { id: "w3", name: "Makine Parçası", description: "Üretim bandından zorlukla sökülebilen, üzerinde keskin çark dişlileri bulunan, ağır ve sivri uçlu mekanik bileşen.", icon: "settings" },
    ],
    locations: [
      { id: "l1", name: "Üretim Alanı", description: "Dev çarkların döndüğü, yağ kokusunun genzi yaktığı, metal seslerinin kulakları sağır ettiği aktif fabrika atölyesi.", icon: "factory" },
      { id: "l2", name: "Müdür Odası", description: "Fabrikanın yüksek bir noktasında bulunan, aşağıyı gören cam bölmelere sahip, evraklar ve dosyalarla dolu sessiz idari ofis.", icon: "business" },
      { id: "l3", name: "Kontrol Odası", description: "Tüm otomasyonun izlendiği, dev ekranların ve klimaların bulunduğu, sadece yetkililerin parmak iziyle girebildiği steril teknoloji merkezi.", icon: "dashboard" },
    ],
    clues: [

      {
        id: "c1",
        text: "Kurbanın yarasındaki o paslı demir oksit zerreleri ve küt travma izi, narin bir dişliden veya görünmez bir gazdan ziyade, kaba kuvvetle savrulan bir balyozun imzasını taşıyordu.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c2",
        text: "Etrafa saçılan yoğun endüstriyel yağ ve devrilmiş sanayi tezgahları, bu ölümcül boğuşmanın cam bölmeli sessiz ofislerde değil, doğrudan gürültülü çarkların arasında koptuğunu fısıldadı.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c3",
        text: "Şirketin mali tablolarından sorumlu adamın o akşamki uçağına ait biniş kartı, onu bu yağlı metal cehenneminden millerce uzağa yerleştirerek aklıyordu.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c4",
        text: "Ağ erişim logları ve retina okuyucu kayıtları, mühendisin o kritik saatler boyunca sadece klimalı ve ekranlarla dolu o steril odada kod derlediğini mühürledi.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c5",
        text: "Fabrika sirenleri çalmadan hemen önce, müdür ile sendika liderinin o sağır edici üretim bantlarının hemen dibinde hararetli bir kavgaya tutuştuklarını onlarca işçi teyit etti.",
        type: "forensic",
        isBonus: true,
      },
      {
        id: "c6",
        text: "Siyah makine yağının tam ortasında yatan o ağır demir çekicin yağlı sapında, işçi başının nasırlı ve güçlü ellerine ait taze deri döküntüleri laboratuvarı aydınlattı.",
        type: "witness",
        isBonus: true,
      },
    ],
    solvabilityMeta: {
      freeEliminations: ["l2", "l3", "s2", "s3", "w2", "w3"],
      bonusEliminations: [],
    },
    solution: { suspectId: "s1", weaponId: "w1", locationId: "l1" },
  },
  {
    id: "termal-otelde-supheli-vaka",
    title: "Termal Otelde Şüpheli Vaka",
    difficulty: "caylak",
    dayIndex: 16,
    story:
      "Bursa'nın ormanlarla çevrili lüks termal otelinde, suların huzur veren şırıltısı ünlü bir şarkıcının son çığlığıyla kesildi. Yoğun buharın göz gözü görmez ettiği spa alanında, ihtişamlı bir hayat karanlık bir sırla son buldu.",
    suspects: [
      { id: "s1", name: "Otel Müdürü", description: "Otelin biriken borçları yüzünden köşeye sıkışan ve ünlü misafirlerin skandallarından korkan, sürekli güvenlik kameralarını izleyen gergin otel müdürü.", icon: "noun-termal-otel-muduru-avatar.png" },
      { id: "s2", name: "Eski Hayranı", description: "Maktulün her adımını gölgelerden takip eden, reddedilmeyi asla hazmedemeyen ve gözlerini ondan ayırmayan takıntılı eski hayran.", icon: "noun-termal-kapici-avatar.png" },
      { id: "s3", name: "Rakip Şarkıcı", description: "Aynı gece otelin devasa açık hava sahnesinde performans sergileyen, kurbanın gölgesinde kalmaktan nefret eden hırslı rakip şarkıcı.", icon: "noun-termal-gazeteci-avatar.png" },
    ],
    weapons: [
      { id: "w1", name: "Boğma", description: "Kurbanı yoğun buhar ve sıcaklığın olduğu ıslak bir zeminde, savunmasız bir anında çıplak ellerle nefessiz bırakan vahşi bir güç.", icon: "back-hand" },
      { id: "w2", name: "Uyku Hapı", description: "Kişisel içeceklere karıştırıldığında bedeni saniyeler içinde uyuşturan ve kalbi yavaşlatan ağır reçeteli uyku ilacı.", icon: "medication" },
      { id: "w3", name: "Bıçak", description: "Havlu ve spa malzemeleri arasına ustaca saklanmış, tek bir pürüzsüz hamleyle hayati organları delebilecek küçük katlanır bıçak.", icon: "content-cut" },
    ],
    locations: [
      { id: "l1", name: "Havuz Başı", description: "Termal suyun devir daim yaptığı, etrafı şezlonglarla çevrili, açık havada bulunan aydınlık ve geniş yüzme havuzu kenarı.", icon: "pool" },
      { id: "l2", name: "Spa Odası", description: "Kokulu yağların ve masaj yataklarının bulunduğu, yumuşak müziklerin çaldığı, dışarıdan rahatça girilebilen aromaterapi kabini.", icon: "spa" },
      { id: "l3", name: "Sauna", description: "Ahşap duvarlı, içeriden kilitlenebilen, nefes almayı zorlaştıran yoğun buhar ve yüksek sıcaklıkta tutulan izole terleme odası.", icon: "whatshot" },
    ],
    clues: [
      {
        id: "c1",
        text: "İçeriden kilitlenmiş yoğun buharlı ahşap odanın duvarlarında tespit edilen çırpınış ve el baskısı izleri, kurbanın o dar ve cehennem gibi sıcak alanda nefessiz bırakıldığını kanıtlıyordu.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c2",
        text: "Açık yüzme havuzunun ıslak kenarlarında suya karışmadan kalmış mikroskobik sedatif tozları, bu sinsi planın kimyasal bir eylemden mekanik bir cinayete dönüştüğünü gösterdi.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c3",
        text: "Otel müdürünün olay gecesi boyunca ön bürodaki operasyonları yönettiği ve POS cihazlarından alınan kesintisiz işlem kayıtlarıyla resepsiyondan hiç ayrılmadığı saptandı.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c4",
        text: "Otel sistemindeki dijital kart logları, rakip şarkıcının cinayet saatinden çok önce aromaterapi kabinine girdiğini ve sadece o alanda kaldığını teyit etti.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c5",
        text: "Lobideki güvenlik kameraları, gözleri kurbanı arayan takıntılı hayranın doğrudan en sıcak ve kilitlenebilir ahşap kabine yöneldiğini saniye saniye kaydetmişti.",
        type: "evidence",
        isBonus: true,
      },
      {
        id: "c6",
        text: "Rakip şarkıcının o akşam binlerce kişinin izlediği açık hava konserinde sahne aldığı magazin basınının canlı yayınlarıyla belgelenerek şüpheleri ondan tamamen uzaklaştırdı.",
        type: "witness",
        isBonus: true,
      },
    ],
    solvabilityMeta: {
      freeEliminations: ["l1", "l2", "s1", "s3", "w2", "w3"],
      bonusEliminations: [],
    },
    solution: { suspectId: "s2", weaponId: "w1", locationId: "l3" },
  },
  {
    id: "sehrin-kalbi-kadikoy",
    title: "Şehrin Kalbi Kadıköy",
    difficulty: "dedektif",
    dayIndex: 17,
    story:
      "Kadıköy'ün bohem tarzı, işlek bir kafesinde daktilo sesleri kesildi. Sivri dilli politik eleştirileriyle tanınan gazeteci, demli çayını yudumlarken aniden masaya yığıldı. Etraftaki onlarca insana rağmen, kimse o sessiz suikastı fark edememişti.",
    suspects: [
      { id: "s1", name: "Kafe Sahibi", description: "Maktulün gazetede yazdığı sert eleştiriler yüzünden müşteri kaybeden, sürekli kasanın başında hesap kitap yapan mekanın sahibi.", icon: "👨" },
      { id: "s2", name: "Garson", description: "İşe henüz o sabah başlamış, müşterilerle iletişim kurmaktan çekinen, sadece mutfakla masalar arasında sipariş taşıyan toy ve sessiz çalışan.", icon: "👦" },
      { id: "s3", name: "Müşteri", description: "Uzun süredir dışarıdaki masada tek başına oturan, maktulü uzaktan kesen ancak içeriye hiç girmemiş olan şüpheli pardösülü adam.", icon: "🧑" },
    ],
    weapons: [
      { id: "w1", name: "Zehirli Çay", description: "Özel demliklerin içine kasıtlı olarak damlatılan, yutulduğu anda midede şiddetli asit reaksiyonu yaratan kokusuz ve renksiz toksin.", icon: "local-cafe" },
      { id: "w2", name: "Gizli Enjeksiyon", description: "Kalabalık arasında kurbana hissettirilmeden batırılabilecek, deride mikroskobik bir kızarıklık bırakan ince uçlu suikast iğnesi.", icon: "vaccines" },
      { id: "w3", name: "Gürültü Bombası", description: "Kafede büyük bir panik yaratmak ve hedef şaşırtmak için kullanılan, patladığında kulakları sağır eden küçük kimyasal kapsül.", icon: "crisis-alert" },
    ],
    locations: [
      { id: "l1", name: "Kafe İçi", description: "Duvarları tablolarla dolu, loş ışıklı, kahve makinesi seslerinin hiç susmadığı ve müşterilerin dip dibe oturduğu sıcak iç mekan.", icon: "coffee" },
      { id: "l2", name: "Tuvalet", description: "Kafenin en arka kısmında yer alan, uzun ve dar bir koridorun sonundaki, kameranın görmediği tek kişilik izole alan.", icon: "wc" },
      { id: "l3", name: "Dış Terasa", description: "Caddenin gürültüsüyle iç içe olan, rüzgar alan, yaya trafiğinin yoğun olduğu açık hava oturma düzeni.", icon: "outdoor-grill" },
    ],
    clues: [
      {
        id: "c1",
        text: "Hastaneden gelen acil toksikoloji raporu, kurbanın derisinde bir iğne deliği veya mekanda bir patlama izi bulamadı; midedeki anlık asit reaksiyonu, zehrin koyu renkli bir yudumla geldiğini kanıtlıyordu.",
        type: "forensic",
        isBonus: false,
      },
      {
        id: "c2",
        text: "Masaya devrilen iskemle ve yere saçılan porselen kırıkları, kurbanın son nefesini rüzgarlı sokaklarda değil, doğrudan o sıcak ve loş tabloların altında verdiğini gösterdi.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c3",
        text: "Kafe sahibinin üzerindeki yoğun yazar kasa fişi kokusu ve tezgah açısı, onun tüm trajediyi sadece uzaktan, paraların başından izlediğini doğruladı.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c4",
        text: "Pardösülü müşterinin omuzlarındaki sokak tozu ve dış mekan kamerasındaki silüeti, onun caddenin gürültüsünden ayrılıp içeriye bir saniye bile adım atmadığını teyit etti.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c5",
        text: "Kurbanın o özel porselen demliğine mutfaktayken tek dokunan ve onu masaya kadar kimsenin yaklaşmasına izin vermeden getiren kişi, o gün işe başlayan o sessiz çocuktu.",
        type: "direct",
        isBonus: true,
      },
      {
        id: "c6",
        text: "Genç çalışanın önlüğünün sol cebinde unutulmuş o minik cam şişedeki son damla, kurbanın demliğinden alınan ölümcül sıvıyla birebir aynı kimyasal imzaya sahipti.",
        type: "evidence",
        isBonus: true,
      },
    ],
    solvabilityMeta: {
      freeEliminations: ["l2", "l3", "s1", "s3", "w2", "w3"],
      bonusEliminations: [],
    },
    solution: { suspectId: "s2", weaponId: "w1", locationId: "l1" },
  },
  {
    id: "beyin-takimi-sirri",
    title: "Beyin Takımı Sırrı",
    difficulty: "baskomiser",
    dayIndex: 18,
    story:
      "Türkiye'nin en sıkı korunan araştırma kurumunun steril koridorlarında, milyarlarca liralık bir projenin ekip başkanı ölü bulundu. Şifreli kapıların ve güvenlik kameralarının ardında işlenen bu cinayet, bilimin karanlık yüzünü aydınlatıyor.",
    suspects: [
      { id: "s1", name: "Baş Araştırmacı", description: "Hayatını bu projeye adayan, milyonluk buluşun başkalarıyla paylaşılma ihtimalini dahi duyduğunda sinir krizleri geçiren, güçlü ellere sahip hırslı lider.", icon: "👨" },
      { id: "s2", name: "Veri Analisti", description: "Tüm gizli araştırmaların algoritmalarını tek bir sunucuda toplayan, verileri çalınmaktan koruyan ama maktulle erişim hakları yüzünden çatışan analist.", icon: "👩" },
      { id: "s3", name: "Etik Komite Üyesi", description: "İnsan deneylerine karşı çıktığı için projenin finansmanını kesmekle tehdit eden, kurallara sıkı sıkıya bağlı ve toplantılarda sürekli masayı terk eden ihtiyar.", icon: "👴" },
      { id: "s4", name: "Yazılım Mühendisi", description: "Kurumun tüm güvenlik altyapısını ve şifreli kapılarını bizzat yazan, sürekli steril laboratuvar ortamında ekranların başında sabahlayan zeki mühendis.", icon: "🕵️" },
    ],
    weapons: [
      { id: "w1", name: "Zehirli İğne", description: "Vücuda zerk edildiğinde saatler içinde değil, saniyeler içinde sinir sistemini donduran, geride sadece mikroskobik bir giriş izi bırakan nörotoksin.", icon: "vaccines" },
      { id: "w2", name: "Bilgisayar Şoku", description: "İşlemciler üzerinde çalışırken ana panele yönlendirildiğinde insan kalbini durduracak boyutta kavurucu bir elektrik deşarjı sağlayan tuzak.", icon: "computer" },
      { id: "w3", name: "Kimyasal Madde", description: "Havaya karıştığında ciğerlerde kristalleşerek nefes borusunu paramparça eden, araştırma laboratuvarına ait yüksek konsantreli sentetik asit gazı.", icon: "biotech" },
      { id: "w4", name: "Boğma", description: "Beden gücünün acımasızca kullanıldığı, kurbanın boynunda koyu kırmızı parmak ve avuç içi izleri bırakarak oksijenini kesen ilkel yöntem.", icon: "back-hand" },
    ],
    locations: [
      { id: "l1", name: "Toplantı Odası", description: "Ortasında devasa bir meşe masanın bulunduğu, akustik panellerle yalıtılmış, hararetli tartışmaların ve sunumların yapıldığı geniş alan.", icon: "groups" },
      { id: "l2", name: "Sunucu Odası", description: "Dev soğutucu fanların sağır edici bir uğultuyla çalıştığı, içerisi devasa veri diskleriyle dolu, giriş çıkışların manyetik kartlarla sağlandığı soğuk oda.", icon: "storage" },
      { id: "l3", name: "Araştırma Laboratuvarı", description: "Kimyasalların ve biyolojik deney tüplerinin bulunduğu, dışarıdan hava almayan, beyaz floresan ışıklarla aydınlatılan steril ve tehlikeli laboratuvar.", icon: "science" },
      { id: "l4", name: "Güvenli Alan", description: "Tüm binanın kalbi sayılan, biyometrik retina tarayıcılarıyla girilebilen, sadece en üst düzey yetkililerin erişebildiği kısıtlı ve güvenli bölge.", icon: "lock" },
    ],
    clues: [
      {
        id: "c1",
        text: "Kurbanın boynundaki peteşiyal kanamalar ve cilt altı morarmaları, sinsi bir kimyasaldan çok, nefesi kesmek için uygulanan uzun süreli ve acımasız bir kaba kuvvetin eseriydi.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c2",
        text: "Mücadele esnasında devrilen ağır meşe sandalyeler ve parçalanan projeksiyon perdesi, kaosun kurumun en büyük ve geniş salonunda yaşandığını kanıtlıyordu.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c3",
        text: "Yazılım mühendisinin terminalinde sabaha kadar süren kesintisiz kod derleme işlemi, onun steril laboratuvar ortamından bir saniye bile ayrılmadığını mühürlüyordu.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c4",
        text: "Sunucu odasında duyulan fan gürültüleri arasında, veri analistinin manyetik kartının gece boyunca içerideki verileri kopyalamak için kullanıldığı saptandı.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c5",
        text: "Etik kurul üyesinin paltosunda bulunan dışarıya ait polenler ve turnike logları, onun tartışmadan hemen sonra binayı tamamen terk ettiğini doğruladı.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c6",
        text: "Kurbanın tırnak aralarından çıkan deri döküntüleri, projeyi her şeyin üstünde tutan o hırslı liderin genetik profiliyle kusursuzca eşleşti.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c7",
        text: "Odanın akustik panelleri, projeyi kendi tekeline almak isteyen baş araştırmacının kurbanı köşeye sıkıştırdığı o son anların boğuk seslerini emmişti.",
        type: "forensic",
        isBonus: true,
      },
      {
        id: "c8",
        text: "Maktulün ceket yakasındaki derin kırışıklıklar ve ter izleri, saldırganın onu iki eliyle ne kadar vahşice kavradığının adli bir belgesiydi.",
        type: "forensic",
        isBonus: true,
      },
    ],
    solvabilityMeta: {
      freeEliminations: ["l2", "l3", "l4", "s2", "s3", "s4", "w1", "w2", "w3"],
      bonusEliminations: [],
    },
    solution: { suspectId: "s1", weaponId: "w4", locationId: "l1" },
  },
  {
    id: "sarayli-seref-daveti",
    title: "Saraylı Şeref Daveti",
    difficulty: "baskomiser",
    dayIndex: 19,
    story:
      "Dolmabahçe Sarayı'nın altın varaklı tavanları altında düzenlenen diplomatik şölen, değerli bir elçinin kadehi dudaklarına götürmesiyle zehirli bir kaosa dönüştü. Tarihin tanıklık ettiği bu salonda, ihtişam ve ölüm aynı masada oturdu.",
    suspects: [
      { id: "s1", name: "Protokol Şefi", description: "Tüm diplomatik kuralları saniye saniye yöneten, ziyafetin kusursuz işlemesi için mutfak ile salon arasında telsiziyle sürekli koşturan gergin yönetici.", icon: "🕵️" },
      { id: "s2", name: "Özel Aşçı", description: "Sarayın ihtişamlı tabaklarına lezzet ve şatafat katan, kendi tenceresine kimsenin dokunmasına izin vermeyen, keskin ve gizli tariflerin ustası.", icon: "👨‍🍳" },
      { id: "s3", name: "Yabancı Diplomat", description: "Kurbanla arasında yıllardır süren bir soğuk savaş bulunan, kalabalıktan kaçıp her fırsatta sarayın dış alanlarında purolarını tüketen yabancı konuk.", icon: "👨" },
      { id: "s4", name: "Saray Kütüphanecisi", description: "Sarayın loş koridorlarındaki binlerce kitabın bekçiliğini yapan, şölenin gürültüsünden nefret eden ve geceyi sadece tozlu sayfalarla geçiren ihtiyar.", icon: "👴" },
    ],
    weapons: [
      { id: "w1", name: "Zehirli Şarap", description: "Osmanlı döneminden kalma kristal kadehlere doldurulan, içine zerk edilen ağır metaller sayesinde kana karıştığında saniyeler içinde bedeni felç eden kırmızı sıvı.", icon: "wine-bar" },
      { id: "w2", name: "Zehirli Yemek", description: "Gümüş tepsilerde sunulan sıcak lokmaların tam merkezine gizlenmiş, ancak mide enzimleriyle karşılaştığında aktifleşip iç organları yakan sinsi macun.", icon: "room-service" },
      { id: "w3", name: "Kimyasal Madde", description: "Sadece laboratuvar ortamında bulunabilen, havaya karıştığında ciğerlerde cam kesikleri yaratan ve saray restorasyonlarında kullanılan ağır endüstriyel asit.", icon: "science" },
      { id: "w4", name: "Zehirli İçecek", description: "Yemek sonrası hazmı kolaylaştırsın diye ikram edilen, ancak içine güçlü bir alkaloit damlatıldığında boğazı anında düğümleyen renksiz meyve suyu.", icon: "local-bar" },
    ],
    locations: [
      { id: "l1", name: "Yemek Salonu", description: "Tavana asılı devasa kristal avizelerin aydınlattığı, metrelerce uzanan ağır masaların ve yüzlerce soylunun yer aldığı görkemli şölen alanı.", icon: "dinner-dining" },
      { id: "l2", name: "Mutfak", description: "Ateşlerin hiç sönmediği, bakır kazanların kaynadığı, gümüş tepsilerin dizildiği ve onlarca aşçının bağırış çağırış çalıştığı devasa ve sıcak üretim merkezi.", icon: "restaurant" },
      { id: "l3", name: "Bahçe Terası", description: "Boğaz'ın serin sularına bakan, içerideki ihtişamdan uzak, taş korkulukların ve çiçeklerin sardığı dış mekan, rüzgarlı açık alan.", icon: "park" },
      { id: "l4", name: "Kütüphane", description: "Yüksek raflara dizilmiş binlerce tarihi kitabın nem koktuğu, sessizliğin ve loş ışığın hakim olduğu, ana salondan tamamen izole edilmiş eski koridor.", icon: "library-books" },
    ],
    clues: [
      {
        id: "c1",
        text: "Toksikoloji laboratuvarı, kurbanın kanına karışan arseniğin sadece mide asidiyle ve katı gıda enzimleriyle reaksiyona girdiğini raporladı.",
        type: "forensic",
        isBonus: false,
      },
      {
        id: "c2",
        text: "Cinayetin izleri, devasa kristal avizelerin aydınlattığı ve yüzlerce soylunun ağırlandığı o devasa şölen masasının tam ortasında gizliydi.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c3",
        text: "Yabancı diplomatın kıyafetine sinen yoğun puro dumanı ve bahçe terasındaki ayak izleri, onun iç mekanlardaki şatafattan tamamen izole olduğunu gösteriyordu.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c4",
        text: "Kalın ahşap kapıların ardından gece boyunca sadece sayfa hışırtıları geldi; ihtiyar muhafızın feneri sabaha kadar sadece eski haritaların üzerinde gezindi.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c5",
        text: "Protokol şefinin takım elbisesindeki yoğun sos kokuları ve elindeki telsiz, onun tüm gece boyunca devasa saray mutfağındaki trafiği yönettiğini belgeliyordu.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c6",
        text: "Kurbanın önündeki o özel porselen tabağın sırrını bilen tek kişi, yemeği dışarıdan hiç kimsenin müdahalesine izin vermeden bizzat hazırlayan ellerin sahibiydi.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c7",
        text: "Tabağın alt kenarına ustaca sürülmüş olan toksin macunu, yemeğin sıcaklığıyla eriyip gıdaya karışacak kadar kusursuz bir zekanın eseriydi.",
        type: "direct",
        isBonus: true,
      },
      {
        id: "c8",
        text: "Sarayın mutfak şefinin önlük astarında bulunan o mikroskobik arsenik tozu tanecikleri, lezzetin ardındaki o acımasız ihaneti kesin olarak kanıtlıyordu.",
        type: "forensic",
        isBonus: true,
      },
    ],
    solvabilityMeta: {
      freeEliminations: ["l2", "l3", "l4", "s1", "s3", "s4", "w1", "w3", "w4"],
      bonusEliminations: [],
    },
    solution: { suspectId: "s2", weaponId: "w2", locationId: "l1" },
  },
  {
    id: "koy-dugununde-trajedi",
    title: "Köy Düğününde Trajedi",
    difficulty: "caylak",
    dayIndex: 20,
    story:
      "Doğu Anadolu'nun etrafı karlı dağlarla çevrili şenlikli bir köyünde, davul ve zurna sesleri geceyi delerken gelinin babası kanlar içinde bulundu. Halayların coşkusu, yıllanmış bir intikamın yankısını bastırmak için mükemmel bir kamuflajdı.",
    suspects: [
      { id: "s1", name: "Damat", description: "Maktulle düğün öncesi büyük bir aile krizi yaşayan, yüzlerce akrabasıyla birlikte eğlencenin merkezinde olması beklenen gergin damat.", icon: "noun-koy-dugunu-damat-avatar.png" },
      { id: "s2", name: "Köy Muhtarı", description: "Kurbanla sınır tarlaları yüzünden yıllardır kan davalı olan, evinde uzun namlulu silahlar bulunduran, otoriter ve öfkeli ihtiyar köy yöneticisi.", icon: "noun-koy-dugunu-muhtar-avatar.png" },
      { id: "s3", name: "Düğün Fotoğrafçısı", description: "Köyün yabancısı olan, sürekli dijital ekipmanlarıyla anı yakalayan ve kalabalıktan uzak durmayı tercih eden sessiz fotoğrafçı.", icon: "noun-koy-dugunu-fotografci-avatar.png" },
    ],
    weapons: [
      { id: "w1", name: "Av Tüfeği", description: "Uzak mesafeden hedefini bulduğunda göğüs kafesinde devasa ve geri dönülmez saçma tahribatları yaratan ağır namlulu av tüfeği.", icon: "sports" },
      { id: "w2", name: "Bıçak", description: "Köylülerin günlük hayatta kemerlerinde taşıdığı, yakın mesafeden sessizce kullanılabilecek keskin ve ağır çelik bıçak.", icon: "content-cut" },
      { id: "w3", name: "Zehir", description: "Bitkisel kökenli, yiyecek veya içeceklere karıştırıldığında saatler sonra kurbanı yavaş yavaş içeriden çürüten yöresel bir toksin.", icon: "science" },
    ],
    locations: [
      { id: "l1", name: "Düğün Çadırı", description: "Rengarenk ampullerle süslenmiş, davul zurna seslerinin hiç susmadığı, yüzlerce kişinin dip dibe eğlendiği devasa ve aydınlık çadır.", icon: "festival" },
      { id: "l2", name: "Köy Meydanı", description: "Büyük ateşlerin yakıldığı, halayların çekildiği ve köyün tam kalbinde yer alan, herkesin birbirini net görebildiği açık meydan.", icon: "location-city" },
      { id: "l3", name: "Ahır Arkası", description: "Işıkların ulaşmadığı, kerpiç duvarların ardında kalan, ayak basıldığında sadece çamur ve karanlık sunan ıssız hayvan barınağının arkası.", icon: "agriculture" },
    ],
    clues: [
      {
        id: "c1",
        text: "Maktulün bedeninde sinsi bir toksin belirtisi veya yakın mesafeli bir kesik izi yoktu; göğüs kafesindeki geniş ve ağır saçma tahribatı, tetiğin metrelerce uzaktan çekildiğini kanıtlıyordu.",
        type: "forensic",
        isBonus: false,
      },
      {
        id: "c2",
        text: "Jandarma incelemesi, kan izlerinin ve barut kokusunun aydınlık köy meydanında değil; köyün en karanlık, en ıssız noktası olan kerpiç yapılı hayvan barınağının hemen arkasında toplandığını gösterdi.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c3",
        text: "Husumetli olduğu bilinen damadın, olay saatinde yüzlerce akrabasıyla birlikte devasa ışıklı çadırda halay başı çektiği ve oradan bir an olsun ayrılmadığı sayısız şahitle doğrulandı.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c4",
        text: "Şehirden gelen yabancı fotoğrafçının, o kritik dakikalarda sadece meydandaki ateşin etrafında portre çekimleri yaptığı dijital makinesindeki silinmez zaman damgalarıyla kesinleşti.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c5",
        text: "Köyün yaşlıları, maktulle yıllardır kan davalı bir arazi kavgası olan ihtiyar adamın, düğün alanından gizlice sıvışıp karanlık ahır bölgesine doğru tek başına ilerlediğini yeminle itiraf ettiler.",
        type: "direct",
        isBonus: true,
      },
      {
        id: "c6",
        text: "Ahırın arkasındaki çamurlu zeminde bulunan boş kovanın ateşleme izi, köyün o yaşlı yöneticisinin evindeki duvarda asılı duran uzun namlulu silahın balistik raporuyla %100 eşleşti.",
        type: "evidence",
        isBonus: true,
      },
    ],
    solvabilityMeta: {
      freeEliminations: ["l1", "l2", "s1", "s3", "w2", "w3"],
      bonusEliminations: [],
    },
    solution: { suspectId: "s2", weaponId: "w1", locationId: "l3" },
  },
  {
    id: "galata-kulesinde-son-gece",
    title: "Galata Kulesi'nde Son Gece",
    difficulty: "dedektif",
    dayIndex: 21,
    story:
      "Yüzyıllara meydan okuyan Galata Kulesi'nde, gece turu sırasında rüzgarın uğultusuna bir çığlık karıştı. Sabah kapılar açıldığında kule tepesinde bir ceset bulundu. Katil, o dar geçitlerde ve karanlıkta izini kaybettirmişti.",
    suspects: [
      { id: "s1", name: "Serhat Dönmez", description: "Yıllarını bu kuleye adamış, turist gruplarını yönlendiren ve eksik olduğunda grubun peşinden giden tecrübeli ve sorumluluk sahibi tur rehberi.", icon: "👨" },
      { id: "s2", name: "Nilgün Arslan", description: "Yükseklik korkusu nedeniyle asansöre bile binemeyen, elinde sürekli fotoğraf makinesiyle sadece zemin seviyesinde takılan turist.", icon: "👩‍💼" },
      { id: "s3", name: "Bekir Yıldız", description: "Kulenin tüm asma kilitlerinin ve kısıtlı alanlarının anahtarlarını kemerinde taşıyan, gece devriyelerinden sorumlu iri yarı güvenlik görevlisi.", icon: "👮" },
    ],
    weapons: [
      { id: "w1", name: "Yüksekten Düşürme", description: "Kurbanı tarihi parmaklıklardan boşluğa doğru amansızca iterek, yerçekiminin o acımasız ve ölümcül ivmesiyle parçalanmasını sağlamak.", icon: "arrow-downward" },
      { id: "w2", name: "Halat", description: "Genellikle teknik odada saklanan, insan boynuna dolandığında pürüzlü yanık izleri bırakan son derece kalın ve çelik iplikli örgülü ip.", icon: "link" },
      { id: "w3", name: "Demir Boru", description: "Çatı katındaki eski tesisattan sökülmüş, kafa tasına indirildiğinde derin ve paslı yaralar açan içi boş, küt paslı metal.", icon: "hardware" },
    ],
    locations: [
      { id: "l1", name: "Kule Tepesi", description: "İstanbul'un rüzgarlarını doğrudan alan, tarihi demir parmaklıklarla çevrili, baş döndürücü bir yüksekliğe sahip açık panoramik seyir terası.", icon: "filter-hdr" },
      { id: "l2", name: "Tünel Girişi", description: "Kulenin en alt kısmında yer alan, kafelerin bulunduğu, rüzgardan korunaklı ve turistlerin toplandığı güvenli zemin alanı.", icon: "subway" },
      { id: "l3", name: "Teknik Oda", description: "Sadece personelin girebildiği, içerisi tesisat boruları, halatlar ve şalterlerle dolu, bodrum katındaki karanlık ve izole depo.", icon: "settings" },
    ],
    clues: [
      {
        id: "c1",
        text: "Kurbanın omurgasındaki devasa kırıklar ve zemindeki krater ivmesi, bedenin hiçbir silahla dövülmediğini; yalnızca yerçekiminin o amansız ve yüksekten düşürücü gücüne maruz kaldığını gösteriyordu.",
        type: "forensic",
        isBonus: false,
      },
      {
        id: "c2",
        text: "Tarihi taşların üzerindeki kan sıçramaları ve korkuluklara takılmış ceket düğmeleri, arbedenin kapalı odalarda değil, İstanbul'u kuşbakışı gören o rüzgarlı terasta koptuğunu mühürledi.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c3",
        text: "Fotoğrafçı kadının cebindeki panik atak ilaçları ve tünel kafesindeki uzun adisyonu, onun o baş döndürücü yüksekliklere adım dahi atmadığını ispatladı.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c4",
        text: "Tur rehberinin telsiz frekans logları ve kafiledeki otuz kişinin yeminli beyanı, onun o kritik dakikalarda sadece bodrum kattaki teknik odada kayıp bir eşyayı aradığını kesinleştirdi.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c5",
        text: "O fırtınalı saatte seyir terasına açılan ve ağır asma kilitlerle korunan o demir kapıyı açabilecek tek master anahtar, yalnızca vardiyadaki o iri yarı adamın kemerinde şıngırdıyordu.",
        type: "direct",
        isBonus: true,
      },
      {
        id: "c6",
        text: "Maktulün karanlığa bırakıldığı o son korkuluk demirinin hemen altında, güvenlik üniformasına ait kopmuş bir apolet parçası ve taze çamurlu bot izleri adaleti aydınlattı.",
        type: "forensic",
        isBonus: true,
      },
    ],
    solvabilityMeta: {
      freeEliminations: ["l2", "l3", "s1", "s2", "w2", "w3"],
      bonusEliminations: [],
    },
    solution: { suspectId: "s3", weaponId: "w1", locationId: "l1" },
  },
  {
    id: "dolmabahcede-protokol-cinayeti",
    title: "Dolmabahçe'de Protokol Cinayeti",
    difficulty: "baskomiser",
    dayIndex: 22,
    story:
      "Dolmabahçe Sarayı'nda yüksek profilli bir diplomatik zirve sırasında, resmi kabul odalarından birinde bir misafir hayatını kaybetti. Protokol kurallarının saniye saniye işlediği bu düzende, katil de planını bir saat gibi işletmişti.",
    suspects: [
      { id: "s1", name: "Nazife Hanım", description: "Sarayın en gizli dehlizlerinden çay odalarına kadar her yeri ezbere bilen, ikram tepsilerini hazırlarken kurbanı uzaktan izleyen ve hiçbir detayı atlamayan titiz kadın.", icon: "👩‍💼" },
      { id: "s2", name: "İdris Bey", description: "Etrafı her saniye sivil korumalarla çevrili olan, atacağı her adım önceden diplomatik bir zaman çizelgesiyle belirlenmiş, protokol kurallarına sıkı sıkıya bağlı yaşlı elçi.", icon: "👴" },
      { id: "s3", name: "Hanzade", description: "Kulaklığından gelen kelimeleri anında çevirmek zorunda olan, odadaki konuşmaları saniye saniye takip ederken camlı bir çeviri kabinine saatlerce hapsolan yetenekli uzman.", icon: "👩" },
    ],
    weapons: [
      { id: "w1", name: "Zehirli Çay", description: "Sadece sıcak suyla temas ettiğinde aktifleşip renksiz ve kokusuz bir şekilde sıvıya karışan, yutulduğunda boğazı anında dondurup nefesi kesen ölümcül bir alkaloid.", icon: "local-cafe" },
      { id: "w2", name: "İnce Bıçak", description: "Büyükelçilerin törenlerde taktığı üniformaların kılıfında gizlenebilecek incelikte, tek bir hamlede hayati organlara ulaşıp sessizce işini bitiren ince çelik stileto.", icon: "content-cut" },
      { id: "w3", name: "Cep Tabancası", description: "Sarayın güvenlik noktalarından geçirilmesi neredeyse imkansız olan, susturucu takılı ancak patladığında ciddi barut izi ve balistik yara bırakan yakın mesafe silahı.", icon: "my-location" },
    ],
    locations: [
      { id: "l1", name: "Kristal Merdiven", description: "Sarayın ana girişinde yer alan, devasa avizelerin ışıklarını yansıtan, üzerinde onlarca korumanın nöbet tuttuğu geniş, yankılı ve tamamen açık basamaklar.", icon: "stairs" },
      { id: "l2", name: "Selamlık Salonu", description: "Kalın Hereke halılarıyla kaplı, kapıları dışarıdan izole edilmiş, sadece devletin en üst düzey erkek misafirlerinin gümüş tepsilerde ağırlandığı o ağır ve kapalı kabul odası.", icon: "meeting-room" },
      { id: "l3", name: "Boğaz Balkonu", description: "Toplantı odalarının dışına açılan, rüzgarın sürekli estiği, dış dünyayla bağlantısı olan ve tercümanların kabinlerinin bulunduğu geniş Boğaz manzaralı teras.", icon: "deck" },
    ],
    clues: [
      {
        id: "c1",
        text: "Kurbanın boğazında ve yemek borusunda, sadece sıcak, demlenmiş bir bitki özüyle reaksiyona giren renksiz bir alkaloidin sinsi tahribatı mevcuttu.",
        type: "forensic",
        isBonus: false,
      },
      {
        id: "c2",
        text: "Trajedinin yaşandığı mekan, rüzgarlı teraslar veya yankılı kristal basamaklar değil; kalın Hereke halılarıyla kaplı, devletin en tepe erkek misafirlerinin ağırlandığı o ağır ve kapalı kabul odasıydı.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c3",
        text: "Büyükelçi İdris Bey'in deri ayakkabılarının gıcırtısı ve etrafındaki koruma ordusu, onun kristal merdivenler çevresindeki karşılama hattından hiç sapmadığını teyit ediyordu.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c4",
        text: "Resmi tercümanın kulaklıklarından gelen kesintisiz çeviri sesleri, onun tüm gece Boğaz balkonundaki dar kabininde izole bir şekilde çalıştığını ispatladı.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c5",
        text: "O gösterişli resmi kabul odasındaki gümüş tepsileri ve asırlık porselenleri taşıma yetkisine sahip olan tek kişi, sarayın ikram protokolünü ezbere bilen kadındı.",
        type: "direct",
        isBonus: true,
      },
      {
        id: "c6",
        text: "Zehirli alkaloidin tortusu tam da kurbanın fincanının dibinde çökelmişti; kulpta ise sadece o özel pudranın mikroskobik kalıntıları vardı.",
        type: "forensic",
        isBonus: true,
      },
      {
        id: "c7",
        text: "Tören alanında bulunması imkansız olan o sinsi toksin, çay servis arabasının gizli bir bölmesinde şık bir mendille birlikte ele geçirildi.",
        type: "evidence",
        isBonus: true,
      },
    ],
    solvabilityMeta: {
      freeEliminations: ["l1", "l3", "s2", "s3", "w2", "w3"],
      bonusEliminations: [],
    },
    solution: { suspectId: "s1", weaponId: "w1", locationId: "l2" },
  },
  {
    id: "uskudarda-kayip-vapur",
    title: "Üsküdar'da Kayıp Vapur",
    difficulty: "caylak",
    dayIndex: 23,
    story:
      "Boğaz'ın buz gibi gri sisleri arasına karışan ilk sabah vapurunda, üst düzey bir yönetici bir daha inmemek üzere ortadan kayboldu. Dalgaların sesi ve martıların çığlıkları, denizin ortasında işlenen bu kusursuz cinayetin tek sessiz tanığıydı.",
    suspects: [
      { id: "s1", name: "Fatma Reis", description: "Yirmi yıldır bu sularda dümen sallayan, vapurun rotasından ve seyir defterinden sorumlu olan, köşkünden dışarıyı izleyen tecrübeli kadın kaptan.", icon: "sailing" },
      { id: "s2", name: "Muzaffer", description: "Alt katlardaki kilitli alanların şifrelerini bilen, elleri halat çekmekten nasırlaşmış, öfkeli biletçi ve güverte görevlisi.", icon: "person" },
      { id: "s3", name: "İrem Şen", description: "Şık pardösüsüyle dikkat çeken, sis yüzünden deniz yolculuğundan çekinen, sürekli saatiyle oynayan telaşlı iş kadını yolcu.", icon: "account-circle" },
    ],
    weapons: [
      { id: "w1", name: "Duman Bombası", description: "Acil durumlarda yeri belli etmek için kullanılan, kapalı alanda patlatıldığında nefesi anında kesen endüstriyel kırmızı duman tüpü.", icon: "cloud" },
      { id: "w2", name: "Gemi Halatı", description: "Gemileri iskeleye bağlamak için kullanılan, insan boynuna dolandığında derin ve pürüzlü yanık izleri bırakan kalın naylon örgü halat.", icon: "link" },
      { id: "w3", name: "Deniz Feneri", description: "Sinyalizasyon için kullanılan, kafa tasına indirildiğinde ağır ve küt bir hasar yaratacak olan masif metal el feneri.", icon: "light-mode" },
    ],
    locations: [
      { id: "l1", name: "Üst Güverte", description: "Yolcuların çay içip martılara simit attığı, denizin soğuk rüzgarlarını doğrudan alan geniş ve açık hava seyir terası.", icon: "waves" },
      { id: "l2", name: "Motor Dairesi", description: "Yalnızca şifreli çelik bir kapıyla inilebilen, devasa pistonların sağır edici bir gürültüyle çalıştığı yağ kokulu kapalı makine dairesi.", icon: "engineering" },
      { id: "l3", name: "İskele", description: "Turnikelerin ve bekleme salonlarının bulunduğu, karayla denizin birleştiği yolcu kabul ve bindirme alanı.", icon: "directions-boat" },
    ],
    clues: [
      {
        id: "c1",
        text: "Kurbanın boynundaki derin ve kalın sürtünme izleri, endüstriyel bir duman zehirlenmesini veya ağır metal darbesini değil; gemileri iskeleye sabitleyen son derece kalın ve pürüzlü bir sentetik kordon baskısını işaret ediyordu.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c2",
        text: "Güvenlik kameraları, mücadelenin yolcuların doluştuğu iskelede veya deniz manzaralı açık teraslarda değil; yalnızca yetkili personelin girebildiği, sağır edici motor sesleriyle dolu alt katmanlarda yaşandığını saptadı.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c3",
        text: "Kaptanın seyir defteri ve köprü üstü güvenlik logları, yılların emektar kaptanının yolculuk boyunca dümen başından bir saniye bile ayrılmadığını kesin olarak teyit etti.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c4",
        text: "İş seyahati yapan yolcu İrem'in, turnikelerden geçtikten sonra deniz tutması endişesiyle vapura hiç binmeyip iskeledeki bekleme salonunda kaldığı güvenlik kayıtlarıyla ispatlandı.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c5",
        text: "Alt kattaki gürültülü teknik odaya inen çelik kapının elektronik kilidini açan dijital kod, yalnızca o sabah güvertede bilet kesen ve yolcuları yönlendiren o personele zimmetliydi.",
        type: "direct",
        isBonus: true,
      },
      {
        id: "c6",
        text: "Makine dairesinin yağlı zemininde kopmuş olarak bulunan kalın naylon lifleri ve biletçi Muzaffer'in avuç içlerindeki taze kenevir yanıkları, karanlık gerçeği su yüzüne çıkardı.",
        type: "evidence",
        isBonus: true,
      },
    ],
    solvabilityMeta: {
      freeEliminations: ["l1", "l3", "s1", "s3", "w1", "w3"],
      bonusEliminations: [],
    },
    solution: { suspectId: "s2", weaponId: "w2", locationId: "l2" },
  },
  {
    id: "beyoglu-pasajinda-santaj",
    title: "Beyoğlu Pasajında Şantaj",
    difficulty: "dedektif",
    dayIndex: 24,
    story:
      "Art Nouveau mimarisiyle süslü tarihi Beyoğlu pasajında, loş bir antikacının arka deposunda gizli bir anlaşma kanla mühürlendi. Etrafı paha biçilemez eşyalarla dolu bu odada, pasajın karmaşık insan ağının çürük bir ipi koptu.",
    suspects: [
      { id: "s1", name: "Orhan Aras", description: "Pasajın en eski esnafı, şifreli deposunda milyonluk antika eserler saklayan, karanlık anlaşmalarını yaldızlı dükkanında gizleyen kurnaz antikacı.", icon: "👴" },
      { id: "s2", name: "Suna Çakır", description: "Hukuk bürosundaki toplantılarından sonra yorgunluğunu atmak için çatı katındaki restoranda kadeh tokuşturan, lüks giyimli elit avukat.", icon: "👩‍💼" },
      { id: "s3", name: "Talip Uzun", description: "Pasajın ana kapısında sebze tezgahı olan, bütün gün bağıra çağıra satış yapan, içeriye ve lüks dükkanlara adım atmayan manav.", icon: "👷" },
    ],
    weapons: [
      { id: "w1", name: "Zehirli Şarap", description: "Antikacının özel koleksiyonundaki asırlık bir şişeye zerk edilmiş, yutulduğunda boğazı yakan sinsi kimyasal.", icon: "wine-bar" },
      { id: "w2", name: "Elektrik Kablosu", description: "Tarihi duvarlardaki prizlerden sökülmüş, kurbanın boynunda kavurucu ve çizgisel yanıklar bırakacak olan eski hasarlı tel.", icon: "electrical-services" },
      { id: "w3", name: "Antika Heykel", description: "Raflardan alınan, kafatasını un ufak edecek ağırlıkta ve sertlikte olan, çanta boyundaki som mermer tarihi büst.", icon: "museum" },
    ],
    locations: [
      { id: "l1", name: "Pasaj Koridoru", description: "Yüksek tavanlı, Art Nouveau işlemelerle süslü, vitrinlerin sokağa taştığı ve insanların sürekli gelip geçtiği aydınlık geçit.", icon: "store" },
      { id: "l2", name: "Arka Depo", description: "Antikacının dükkanının arka tarafında bulunan, kalın çelik kapılı, penceresiz, nefes kesici ve tozlu kilitli mahzen.", icon: "inventory" },
      { id: "l3", name: "Çatı Katı", description: "Pasajın en üstünde yer alan, İstanbul'un panoramik manzarasını sunan, elit misafirlerin ağırlandığı açık hava teras restoranı.", icon: "roofing" },
    ],
    clues: [
      {
        id: "c1",
        text: "Kurbanın kafatasındaki o geniş, beyaz tozlar bırakan ve kemiği un ufak eden devasa yara, elektrikli bir telin değil, sanat eseri ağırlığındaki küt bir mermer bloğun ölümcül darbesini fısıldıyordu.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c2",
        text: "Olay yerindeki kırık porselen vazolar ve havada asılı kalan asırlık toz bulutu, cinayetin pasajın aydınlık geçitlerinde değil, o penceresiz ve havasız kilitli mahzende işlendiğini kanıtladı.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c3",
        text: "Avukat kadının HTS sinyalleri ve restoranın güvenlik kameraları, onun pasajın en üst katında, manzaraya karşı şarabını yudumladığını ve aşağıya hiç inmediğini mühürledi.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c4",
        text: "Manavın ellerindeki taze çilek lekeleri ve komşu esnafın kesintisiz beyanları, onun giriş kapısındaki sergisinden bir an olsun ayrılıp o karanlık depoya inmediğini doğruladı.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c5",
        text: "Milyonluk antika koleksiyonunun saklandığı o penceresiz arka deponun karmaşık yerleşim planını ve devasa çelik kapısının şifresini sadece mekanın kendi efendisi biliyordu.",
        type: "direct",
        isBonus: true,
      },
      {
        id: "c6",
        text: "Dükkan sahibinin şahsi envanterinde 'En Değerli Parçalar' listesinde yer alan o devasa mermer büst kayıptı; kurbanın başucundaki kaidede ise doğrudan antikacının DNA'sı parlıyordu.",
        type: "forensic",
        isBonus: true,
      },
    ],
    solvabilityMeta: {
      freeEliminations: ["l1", "l3", "s2", "s3", "w1", "w2"],
      bonusEliminations: [],
    },
    solution: { suspectId: "s1", weaponId: "w3", locationId: "l2" },
  },
  {
    id: "ciragan-sarayinda-maskeli-balo",
    title: "Çırağan Sarayı'nda Maskeli Balo",
    difficulty: "baskomiser",
    dayIndex: 25,
    story:
      "Çırağan Sarayı'nın büyüleyici maskeli balosunda kimse gerçek yüzünü göstermiyordu. Gecenin ilerleyen saatlerinde loş bir köşede düşen kanlı bir maske, sahte gülücüklerin ardındaki vahşi gerçeği ortaya çıkardı.",
    suspects: [
      { id: "s1", name: "Prens Hüseyin", description: "Şölenin ev sahibi olan, üzerinde ağır parfümü ve altın işlemeli ceketüyle sürekli devasa salonun tam ortasında misafirlerin kadehlerini dolduran gösterişli organizatör.", icon: "👨" },
      { id: "s2", name: "Madam Silvana", description: "Sahnede fırtınalar estiren, ağır kadife elbiseler giyen ve alkış tufanı bittikten hemen sonra sarayın gösterişli salonlarını tamamen terk edip karanlığa karışan ünlü sanatçı.", icon: "🎤" },
      { id: "s3", name: "Teğmen Ferhat", description: "Sarayın en gizli şifrelerini, elektronik geçitlerini ve askeriyenin soğuk yüzünü temsil eden, üniformasının altında hep bir sır taşıyan karanlık bakışlı protokol subayı.", icon: "💂" },
    ],
    weapons: [
      { id: "w1", name: "Zehirli Şampanya", description: "Işıltılı kadehlerin arasında bekleyen, içine damlatıldığında kabarcıklara karışıp kokusunu gizleyen, yutulduğu an kalbi felç eden renksiz ve ölümcül balo içkisi.", icon: "wine-bar" },
      { id: "w2", name: "Stileto Bıçak", description: "Subayların tören üniformalarında taşıdığı kılıflara sığabilen, pürüzsüz ve sessiz bir hamleyle hayati organları delip geçen incecik, çelik suikast bıçağı.", icon: "content-cut" },
      { id: "w3", name: "İpek Eşarp", description: "Baloya katılan asilzadelerin boyunlarında taşıdığı, güçlü kollarla sıkıldığında nefesi anında kesen, ancak kan veya kesik izi bırakmayan zarif, ipekli dokuma kumaş.", icon: "style" },
    ],
    locations: [
      { id: "l1", name: "Balo Salonu", description: "Binlerce mumun ve kristal avizenin aydınlattığı, müzik sesinin hiç dinmediği, yüzlerce maskeli insanın durmaksızın dans ettiği geniş ve ihtişamlı kutlama alanı.", icon: "nightlife" },
      { id: "l2", name: "Gizli Geçit", description: "Sarayın kalın taş duvarları arasına gizlenmiş, sadece askeri güvenlik şifreleriyle açılan, zemininde çamur ve harç kalıntıları bulunan rutubetli ve dar tarihi geçit.", icon: "door-back" },
      { id: "l3", name: "Boğaz İskelesi", description: "Boğaz'ın dalgalarının dövdüğü, VIP misafirlerin lüks teknelere binmek için beklediği, açık havanın ve tuzlu rüzgarın hakim olduğu deniz yanaşma platformu.", icon: "anchor" },
    ],
    clues: [
      {
        id: "c1",
        text: "Otopsi raporu, kurbanın hayati organlarını tek bir pürüzsüz hamleyle delen, askeri nizama ve yakın dövüşe uygun ince bir çeliğin gazabını belgeledi.",
        type: "forensic",
        isBonus: false,
      },
      {
        id: "c2",
        text: "Kurbanın ayakkabılarındaki rutubetli harç tozları ve kıyafetindeki örümcek ağları, son nefesin sarayın unutulmuş, havasız ve karanlık taş geçitlerinde verildiğini gösteriyordu.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c3",
        text: "Prens Hüseyin'in kıyafetindeki yoğun parfüm kokuları ve yüzlerce davetlinin şahitliği, onun devasa avizelerin altından bir an olsun ayrılmadığını teyit etti.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c4",
        text: "İtalyan sopranonun kadife elbisesine sinen deniz tuzu ve iskeledeki flaş patlamaları, onun performans sonrası saraydan yatla ayrıldığını kanıtladı.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c5",
        text: "Sarayın o karanlık ve rutubetli dehlizine giden elektronik şifreli kapı, sadece güvenlik protokollerini yöneten rütbeli ellerin bildiği taktiksel bir kodla açılmıştı.",
        type: "direct",
        isBonus: true,
      },
      {
        id: "c6",
        text: "Gizli geçidin çamurlu zeminindeki sert ve köşeli postal izleri, ordu envanterine kayıtlı botların taban deseniyle milimetrik olarak uyuşuyordu.",
        type: "evidence",
        isBonus: true,
      },
      {
        id: "c7",
        text: "Tören üniformasındaki gizli kılıf boştu; sağ manşetine sıçrayan ve alelacele silinmeye çalışılan leke ise doğrudan maktulün genetik şifresini taşıyordu.",
        type: "forensic",
        isBonus: true,
      },
    ],
    solvabilityMeta: {
      freeEliminations: ["l1", "l3", "s1", "s2", "w1", "w3"],
      bonusEliminations: [],
    },
    solution: { suspectId: "s3", weaponId: "w2", locationId: "l2" },
  },
  {
    id: "sultanahmette-turist-tuzagi",
    title: "Sultanahmet'te Turist Tuzağı",
    difficulty: "caylak",
    dayIndex: 26,
    story:
      "Tarihi yarımadanın binlerce yıllık sırlarını barındıran taş sokaklarında, yalnız bir turist ağlayan sütunların dibinde bilincini kaybetmiş halde bulundu. Değerli eşyaları yerindeydi; bu sıradan bir gasp değil, hedefe yönelik ve son derece sinsi bir hamleydi.",
    suspects: [
      { id: "s1", name: "Rüzgar", description: "Bölgedeki tüm çıkmaz sokakları bilen, anıtların etrafında tezgah açan ancak turistlerle arası bozuk olan genç ve asabi sokak satıcısı.", icon: "person" },
      { id: "s2", name: "Ayşen Demir", description: "Tarihi yapıların dehlizlerine özel erişim izni olan, güler yüzlü maskesinin ardında profesyonel bir soğukkanlılık taşıyan resmi tur rehberi.", icon: "support-agent" },
      { id: "s3", name: "Haluk Çiçek", description: "Kalabalığa karışıp uzaktan kurbanlarını izleyen, tarihi binaların çatılarından yüksek çözünürlüklü kareler yakalayan bağımsız fotoğrafçı.", icon: "face" },
    ],
    weapons: [
      { id: "w1", name: "Biber Gazı", description: "Turistlerin el çantalarında taşıdığı, sıkıldığında gözleri ve solunum yollarını anında kör eden basınçlı savunma gazı.", icon: "air" },
      { id: "w2", name: "Ağır Demir Parçası", description: "Yüz yıllardır toprak altında yatan, kafaya vurulduğunda kaba ve ezici bir yara açacak olan paslı ve ağır tarihi demir cıvata.", icon: "hardware" },
      { id: "w3", name: "Uyuşturucu Şişe", description: "İçeceklere karıştırıldığında hiçbir tat bırakmayan, ancak saniyeler içinde sinir sistemini donduran güçlü bir medikal uyuşturucu sıvısı.", icon: "local-bar" },
    ],
    locations: [
      { id: "l1", name: "Hipodrom Meydanı", description: "Antik dikilitaşların çevrelediği, binlerce turistin her saniye fotoğraf çektiği, güneş altında kavrulan geniş ve açık meydan.", icon: "location-city" },
      { id: "l2", name: "Yerebatan Sarnıcı", description: "Yerin metrelerce altında, devasa sütunların arasından suların damladığı, yankılı, loş ve son derece klostrofobik tarihi sarnıç.", icon: "water" },
      { id: "l3", name: "Eski Bedesten", description: "Yüzlerce dükkanın labirent gibi iç içe geçtiği, baharat kokularının ve kumaşların birbirine karıştığı kapalı tarihi pazar.", icon: "storefront" },
    ],
    clues: [
      {
        id: "c1",
        text: "Hastaneden alınan kan tahlillerinde biber gazı veya künt bir demir travması bulgusuna rastlanmadı; kurban doğrudan sıvısına karıştırılan, kokusuz ve anında felç eden bir medikal çözeltiyle etkisiz hale getirilmişti.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c2",
        text: "Polis köpekleri ve olay yeri inceleme, olayın açık havadaki anıtların etrafında veya tarihi bedestenin vitrinli geçitlerinde değil; doğrudan yerin altındaki o rutubetli, loş ve ıslak taş yapının içinde gerçekleştiğini belirledi.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c3",
        text: "Hipodrom meydanını gören MOBESE kameraları, genç sokak satıcısının tüm gün boyunca anıtların etrafındaki arabasından hiç ayrılmadığını mühürlü kayıtlarla doğruladı.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c4",
        text: "Bağımsız fotoğrafçının olay saatlerinde Eski Bedesten'in çatısında panoramik çekimler yaptığı, makinesindeki silinemez RAW formatlı zaman damgalarıyla şüpheye yer bırakmayacak şekilde kanıtlandı.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c5",
        text: "Rehberlik acentesinin rotasına göre, turistin o kritik saatlerde sadece yetkili tur rehberiyle birlikte yeraltı yapılarını gezmek üzere bilet kullandığı ve yalnız olmadığı tespit edildi.",
        type: "direct",
        isBonus: true,
      },
      {
        id: "c6",
        text: "Sarnıcın buz gibi sularının hemen kenarında, loş ışıkta parlayan o küçük şüpheli şişenin üzerinde, turu yönlendiren profesyonel rehberin işaret parmağına ait taze bir ter izi bulundu.",
        type: "forensic",
        isBonus: true,
      },
    ],
    solvabilityMeta: {
      freeEliminations: ["l1", "l3", "s1", "s3", "w1", "w2"],
      bonusEliminations: [],
    },
    solution: { suspectId: "s2", weaponId: "w3", locationId: "l2" },
  },
  {
    id: "adalarda-yalniz-fayton",
    title: "Adalar'da Yalnız Fayton",
    difficulty: "dedektif",
    dayIndex: 27,
    story:
      "Büyükada'da motorlu araçların giremediği o dik tepe yolunda, sabahın erken saatlerinde bir fayton kontrolden çıkarak parçalandı. Başta trajik bir kaza gibi görünen bu olay, at arabasının mekanizmasındaki o sinsi dokunuşla bir cinayete dönüştü.",
    suspects: [
      { id: "s1", name: "Hayriye", description: "Arabacı, faytonların bakımından sorumlu", icon: "👵" },
      { id: "s2", name: "Fikret Bey", description: "Konak sahibi, Ada'nın en zengin sakini", icon: "🕵️" },
      { id: "s3", name: "Sevim", description: "Konağın aşçısı, on yıldır adada çalışıyor", icon: "👨‍🍳" },
    ],
    weapons: [
      { id: "w1", name: "Zehirli Muhallebi", description: "Sabah kahvaltısı için hazırlanan özel muhallebi", icon: "icecream" },
      { id: "w2", name: "Ağır Taş", description: "Yolun kenarından alınan keskin köşeli kaya parçası", icon: "landscape" },
      { id: "w3", name: "Fren Sabotajı", description: "Fayton freninin vida bağlantıları kasıtlı olarak gevşetilmiş", icon: "build" },
    ],
    locations: [
      { id: "l1", name: "Konak Bahçesi", description: "Gölgeli, çiçekli, tahta çit çevreli büyük konak bahçesi", icon: "park" },
      { id: "l2", name: "Plaj Kulübesi", description: "Sahil şeridindeki ahşap, çatısız plaj barınağı", icon: "beach-access" },
      { id: "l3", name: "Dik Tepe Yolu", description: "Adanın en yüksek noktasına çıkan dar, taşlı yol", icon: "terrain" },
    ],
    clues: [
      {
        id: "c1",
        text: "Otopside kurbanın midesinde zehirli muhallebi veya kafasında ağır taş travması bulunmadı; kurban doğrudan hızla yokuş aşağı inen bir aracın kasten frenlerinin boşaltılmasıyla ölüme sürüklenmişti.",
        type: "forensic",
        isBonus: false,
      },
      {
        id: "c2",
        text: "Kaza alanı konak bahçesinde veya ahşap plaj kulübesinde değil; adanın en yüksek noktasına çıkan o dar, taşlı ve tehlikeli yolun tam virajında yer alıyordu.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c3",
        text: "Ada'nın zengin sakini Fikret Bey'in, o kritik sabah saatlerinde konak bahçesinde İstanbul'dan gelen misafirleriyle çay içtiği onlarca tanıkla ispatlandı.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c4",
        text: "Aşçı Sevim'in, sabahın erken saatlerinde mutfaktan çıkıp sadece sahil şeridindeki plaj barınağına gittiği ve tepe yoluna hiç tırmanmadığı kamera kayıtlarıyla doğrulandı.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c5",
        text: "Faytonların yola çıkmadan önceki son güvenlik kontrollerini ve bakımını yapmakla yetkili olan kişi, o sabah o kritik fren vidalarına tek dokunan şahıstı.",
        type: "direct",
        isBonus: true,
      },
      {
        id: "c6",
        text: "Arabacının atölyesinde bulunan anahtar setindeki yağ lekeleri, gevşetilen fren somunlarındaki metal sürtünmeleriyle tam olarak eşleşiyordu.",
        type: "evidence",
        isBonus: true,
      },
    ],
    solvabilityMeta: {
      freeEliminations: ["l1", "l2", "s2", "s3", "w1", "w2"],
      bonusEliminations: [],
    },
    solution: { suspectId: "s1", weaponId: "w3", locationId: "l3" },
  },
  {
    id: "arnavutkoyde-balikci-sirri",
    title: "Arnavutköy'de Balıkçı Sırrı",
    difficulty: "dedektif",
    dayIndex: 28,
    story:
      "Arnavutköy'ün iyot ve anason kokan tarihi meyhanesinde, ahşap masalardan birine yığılmış bir müdavim bulundu. Önündeki kadeh doluydu ama kokusu her zamankinden çok daha karanlık, çok daha sinsiydi.",
    suspects: [
      { id: "s1", name: "Bora Deniz", description: "Limanın en eski denizcisi olan, kaba saba yapısıyla bilinen ve teknesini bir kale gibi koruyan, sürekli halat ve ağlarla uğraşan yaşlı balıkçı.", icon: "👨‍✈️" },
      { id: "s2", name: "Esma Hanım", description: "Meyhanenin tüm özel şifrelerini ve antika dolaplarını bilen, müşterilerine kendi elleriyle hazırladığı özel ikramlar sunan zarif ve gizemli sahibe.", icon: "👵" },
      { id: "s3", name: "Taner Öz", description: "Acil servis nöbetleri yüzünden gözaltları morarmış, tıbbi toksinlere ve insan anatomisine hakim, mahallenin sessiz ve yorgun doktoru.", icon: "👨‍⚕️" },
    ],
    weapons: [
      { id: "w1", name: "Zıpkın", description: "Ucundaki paslı kancaları sayesinde hedefe saplandığında derin, yırtıcı ve kaba yaralar açan uzun çelik balıkçı zıpkını.", icon: "sports" },
      { id: "w2", name: "Balık Ağı", description: "Sentetik ve kopmaz liflerden örülmüş, bir insanın boynuna dolandığında keskin, pürüzlü ve ağsı yanık izleri bırakan kalın balık ağı.", icon: "grid-on" },
      { id: "w3", name: "Zehirli Rakı", description: "Sadece alkol molekülleriyle birleştiğinde aktifleşen, midede şiddetli bir kalp krizini simüle ederek kurbanı saniyeler içinde felç eden nadir bir sıvı.", icon: "local-bar" },
    ],
    locations: [
      { id: "l1", name: "Balıkçı Barınağı", description: "Ahşap teknelerin birbirine sürtündüğü, rüzgarın dondurduğu, deniz suyu ve yosun kokan, zemini tahta paletlerle kaplı kıyı barınağı.", icon: "directions-boat" },
      { id: "l2", name: "Meyhane İç Salonu", description: "Taş duvarlarına anason ve tütün kokusunun sindiği, loş ışıklarla aydınlatılan, kapalı ve gürültülü tarihi meyhane iç salonu.", icon: "nightlife" },
      { id: "l3", name: "Boğaz Kıyısı", description: "Dalgaların beton zemini dövdüğü, açık havada yürüyüş yapanların geçtiği, ıslak ve tehlikeli dar sahil şeridi.", icon: "waves" },
    ],
    clues: [
      {
        id: "c1",
        text: "Adli toksikoloji laboratuvarı, kurbanın midesindeki yüksek alkol oranıyla reaksiyona giren ve kasları anında kilitleyen o sinsi sıvının kimyasal haritasını kusursuzca çıkardı.",
        type: "forensic",
        isBonus: false,
      },
      {
        id: "c2",
        text: "Masaya devrilen meze tabakları ve duvara sinen o ağır tütün kokusu, son nefesin açık havadaki rüzgarlı teknelerde değil, tam da o izole ve loş taş duvarların arasında verildiğini kanıtladı.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c3",
        text: "Deneyimli balıkçı Bora'nın, yaklaşan fırtına yüzünden geceyi tamamen kıyı barınağındaki teknesini halatlarla sağlamlaştırarak geçirdiği liman kayıtlarıyla mühürlendi.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c4",
        text: "Mahalle doktoru Taner'in hastane acil servisindeki imza logları ve nöbetçi çizelgesi, onun meyhane kapısından içeri adım bile atmadan sadece arabasıyla sahil yolundan geçtiğini kesinleştirdi.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c5",
        text: "Maktulün masasında duran o antika şişe, yalnızca meyhane sahibesinin boynunda taşıdığı şahsi pirinç anahtarla açılabilen o özel vitrinin baş köşesine aitti.",
        type: "direct",
        isBonus: true,
      },
      {
        id: "c6",
        text: "Zehirli rakı şişesinin mantar tıpasında, sadece meyhane sahibesi Esma Hanım'ın o gece ellerine sürdüğü o nadide gül yağlı kremin mikroskobik doku kalıntıları bulundu.",
        type: "evidence",
        isBonus: true,
      },
    ],
    solvabilityMeta: {
      freeEliminations: ["l1", "l3", "s1", "s3", "w1", "w2"],
      bonusEliminations: [],
    },
    solution: { suspectId: "s2", weaponId: "w3", locationId: "l2" },
  },
  {
    id: "topkapida-kayip-hancer",
    title: "Topkapı'da Kayıp Hançer",
    difficulty: "baskomiser",
    dayIndex: 29,
    story:
      "Topkapı Sarayı Müzesi'nin yüksek güvenlikli koridorlarında, asırlık bir Osmanlı hançeri vitrininden sırra kadem bastı. Sabah vardiyası geldiğinde, hırsızlık vakası, yerde yatan bir cesetle paha biçilemez bir cinayete dönüştü.",
    suspects: [
      { id: "s1", name: "Müdür Altan", description: "Tüm müzenin vitrin anahtarlarına ve kamera sistemlerine hakim olan, yıllarını bürokrasiye adamış, sürekli basın önünde olan şık giyimli yetkili.", icon: "👨" },
      { id: "s2", name: "Dr. Pervin", description: "Geceleri Topkapı'nın altındaki gizli tünellerde toprağı kazan, tulumu sürekli toz ve çamur içinde olan, tarihi eserlere saplantılı kadın akademisyen.", icon: "👩" },
      { id: "s3", name: "Restoratör Cemil", description: "Kırık porselenleri ve paslı kılıçları laboratuvarında kimyasallarla hayata döndüren, cebinde her zaman hassas aletler ve şırıngalar taşıyan usta zanaatkar.", icon: "👷" },
    ],
    weapons: [
      { id: "w1", name: "Osmanlı Hançeri", description: "Vitrinlerin en karanlık köşesinde saklanan, orijinaline birebir benzeyen, kemiğe kadar dayanabilecek keskinlikte ve ağırlıkta çelikten dövülmüş tarihi bir obje kopyası.", icon: "content-cut" },
      { id: "w2", name: "Uyuşturucu İğne", description: "Hassas kimyasalları eserlere zerk etmek için kullanılan, ucu son derece ince olan ve içine kuvvetli bir anestezi doldurulduğunda kurbanı anında felç eden tıbbi alet.", icon: "vaccines" },
      { id: "w3", name: "Kimyasal Duman", description: "Ağır restorasyon işlemlerinde pas sökücü olarak kullanılan, şişesi devrildiğinde odayı kaplayıp ciğerleri saniyeler içinde kanatan ağır, selülozik ve ölümcül gaz.", icon: "science" },
    ],
    locations: [
      { id: "l1", name: "Hazine Odası", description: "Zırhlı camlarla, ısı sensörleriyle ve göz alıcı spot ışıklarıyla korunan, paha biçilemez padişah eserlerinin bulunduğu ve sürekli kamerayla izlenen gösterişli merkez.", icon: "lock" },
      { id: "l2", name: "Restorasyon Atölyesi", description: "Sadece özel personel kartıyla girilebilen, masaları neşterler, şırıngalar ve tiner şişeleriyle dolu, havasız, ağır kokulu ve loş çalışma odası.", icon: "engineering" },
      { id: "l3", name: "Harem Koridoru", description: "Sarayın derinliklerinde yer alan, turistlere kapalı, toprağın ve tarihin rutubetli kokusunu taşıyan, aydınlatması zayıf ve uzun tarihi geçit.", icon: "route" },
    ],
    clues: [
      {
        id: "c1",
        text: "Maktulün ense kökündeki mikroskobik giriş deliği ve kanındaki ani pıhtılaşma, doğrudan damara zerk edilen son derece hızlı ve güçlü bir tıbbi sedatifin eseriydi.",
        type: "forensic",
        isBonus: false,
      },
      {
        id: "c2",
        text: "Olay mahallindeki yoğun selülozik tiner ve yaşlı ahşap kokusu, bedenin gözden ırak, kapalı kapılar ardındaki o loş ve tozlu onarım odasında yığıldığını kanıtlıyordu.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c3",
        text: "Müze müdürünün tüm gece flaşların altında, zırhlı camların ve güvenlik lazerlerinin bulunduğu teşhir salonunda kameralara röportaj verdiği canlı yayın kayıtlarıyla onaylandı.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c4",
        text: "Arkeologun tulumundaki yoğun toprak ve tarihi toz tabakası, onun gece boyunca loş dehlizlerdeki kazı alanında ekibiyle çalıştığını gösteriyordu.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c5",
        text: "Paha biçilemez eserlerin hayata döndürüldüğü o odadaki hassas yapıştırıcı şırıngalarına, sadece oranın kadrolu uzmanının şifreli erişimi vardı.",
        type: "direct",
        isBonus: true,
      },
      {
        id: "c6",
        text: "Kıdemli personelin önlüğünün cebinden düşen kullanılmış şırıngada sedatif kalıntıları bulunurken, çalınan eserin birebir kopyası da onun şahsi kilitli dolabından çıktı.",
        type: "evidence",
        isBonus: true,
      },
      {
        id: "c7",
        text: "Eserin karaborsadaki satışını planlayan hain, suçüstü yakalanmamak için maktulü kendi ustalık alanında, kendi cerrahi aletleriyle sonsuz bir uykuya yatırmıştı.",
        type: "direct",
        isBonus: true,
      },
    ],
    solvabilityMeta: {
      freeEliminations: ["l1", "l3", "s1", "s2", "w1", "w3"],
      bonusEliminations: [],
    },
    solution: { suspectId: "s3", weaponId: "w2", locationId: "l2" },
  },
  {
    id: "karakoyde-neon-gece",
    title: "Karaköy'de Neon Gece",
    difficulty: "caylak",
    dayIndex: 30,
    story:
      "Karaköy'ün neon ışıklarıyla aydınlanan en popüler kulübünde bas sesleri duvarları titretiyordu. Ancak arka taraftaki loş ve soğuk servis koridorunda, müziğin ritmine kan karıştı. Partinin en şatafatlı anında işlenen bu cinayetin faili, hala kulübün karanlık köşelerinde geziniyor.",
    suspects: [
      { id: "s1", name: "DJ Mete", description: "Kulübün müziklerinden sorumlu, yüksek platformdaki kabininde tüm gece performans sergileyen kibirli sanatçı.", icon: "pa:neon_s1" },
      { id: "s2", name: "Organizatör Deniz", description: "VIP müşterilerin her isteğiyle ilgilenen, elinden şampanya kadehini hiç düşürmeyen güler yüzlü organizatör.", icon: "pa:neon_s2" },
      { id: "s3", name: "Güvenlik Tarık", description: "Kapı kontrolünü ve içerideki taşkınlıkları önlemeyi sağlayan, sürekli telsiziyle talimat alan iri yarı güvenlik.", icon: "pa:neon_s3" },
    ],
    weapons: [
      { id: "w1", name: "Ahşap Cop", description: "Güvenlik personelinin taşıdığı kısa saplı ağır ahşap teçhizat; küt ucuyla tek darbede kafatasını çatlatabilecek yapıda.", icon: "pa:neon_w1" },
      { id: "w2", name: "Şampanya Kadehi", description: "VIP locasında servis edilen, kırıldığında boyun bölgesini kesebilecek ölümcül bir silaha dönüşen ince cam eşya.", icon: "pa:neon_w2" },
      { id: "w3", name: "Telsiz", description: "Personelin haberleştiği, boyna dolanıp boğmaya müsait kalın kordonlu ağır elektronik cihaz.", icon: "pa:neon_w3" },
    ],
    locations: [
      { id: "l1", name: "Servis Çıkışı", description: "Kameranın görmediği, personelin molaya çıktığı, çöp konteynerlerinin bulunduğu arka taraftaki loş ve soğuk geçit.", icon: "pa:neon_l1" },
      { id: "l2", name: "DJ Kabini", description: "Devasa ses sisteminin merkezi olan, tüm kulübe tepeden bakan ve her an göz önünde olan aydınlık platform.", icon: "pa:neon_l2" },
      { id: "l3", name: "VIP Loca", description: "Özel misafirlerin ağırlandığı, kadife koltuklu, ana salondan kısmen yalıtılmış lüks eğlence bölümü.", icon: "pa:neon_l3" },
    ],
    clues: [
      { id: "c1", text: "Adli tabip, ölümün ince bir cam kesiğiyle veya kalın bir elektronik kordonla boğularak değil, ağır ve küt bir ahşap darbesiyle gerçekleştiğini raporladı.", type: "forensic", isBonus: false },
      { id: "c2", text: "DJ Mete'nin olay sırasında tüm kulübün gözü önünde yüksek platformdaki kabininde performans sergilediği doğrulandı.", type: "witness", isBonus: false },
      { id: "c3", text: "Organizatör Deniz'in elinde şampanya kadehiyle sadece kadife koltuklu lüks bölümde misafir ağırladığı kameralara yansıdı.", type: "record", isBonus: false },
      { id: "c4", text: "Cinayet, devasa ses sisteminin olduğu aydınlık alanda veya misafirlerin ağırlandığı lüks locada işlenmemişti.", type: "evidence", isBonus: false },
      { id: "c5", text: "Güvenlik Tarık'ın, cinayet saatinde çöp konteynerlerinin bulunduğu karanlık arka geçide doğru yürüdüğü saptandı.", type: "record", isBonus: true },
      { id: "c6", text: "Kurbanın başındaki ölümcül yara izi, Tarık'ın kemerinde taşıdığı kısa saplı teçhizatla milimetrik olarak eşleşti.", type: "forensic", isBonus: true },
    ],
    solvabilityMeta: {
      freeEliminations: ["s1", "s2", "w2", "w3", "l2", "l3"],
      bonusEliminations: [],
    },
    solution: { suspectId: "s3", weaponId: "w1", locationId: "l1" },
  },
  {
    id: "konakta-gece-vakti",
    title: "Konakta Gece Vakti",
    difficulty: "caylak",
    dayIndex: 31,
    story:
      "Bursa'nın eteklerindeki asırlık konakta verilen o ihtişamlı yemek daveti, gece yarısı kopan fırtınayla kabusa dönüştü. Konağın kırk yıllık sadık kâhyası Fuat Bey, sabahın ilk ışıklarında kanlar içinde bulundu. Gecenin karanlık sırları, davette konaklayan misafirlerin üzerine çoktan çökmüştü.",
    suspects: [
      { id: "s1", name: "Tüccar Vehbi", description: "Sürekli eski evrak ve tapuları inceleyen, cinayet gecesi kilitli kapılar ardında belgelerle uğraşan şüpheli antika tüccarı.", icon: "pa:konvak_s1" },
      { id: "s2", name: "Semiha Hanım", description: "Konağın asıl varisi; mirasın bölünmesinden son derece rahatsız olan ve gece yarısı gizlice kütüphaneye sızan asilzade.", icon: "pa:konvak_s2" },
      { id: "s3", name: "Yüzbaşı Cemil", description: "Sürekli anılarını yazan, disiplinli ve sert mizaçlı emekli subay; geceyi yalnız başına masasında geçirmiş.", icon: "pa:konvak_s3" },
    ],
    weapons: [
      { id: "w1", name: "Bahçe Makası", description: "Konağın bahçesinden gizlice içeri alınmış, ağır, paslı ve son derece keskin devasa demir makas.", icon: "pa:konvak_w1" },
      { id: "w2", name: "İngiliz Anahtarı", description: "Alt kattaki tesisat onarımı için bırakılmış, kafaya vurulduğunda anında ölümcül travma yaratan paslanmaz çelik alet.", icon: "pa:konvak_w2" },
      { id: "w3", name: "Mektup Açacağı", description: "Yazı masasında duran, ince, sivri ve kalbe tek seferde saplanabilecek keskinlikte gümüş bıçak.", icon: "pa:konvak_w3" },
    ],
    locations: [
      { id: "l1", name: "Kütüphane", description: "Deri kaplı kitapların bulunduğu, kalın perdelerle örtülü, loş, sessiz ve tozlu okuma odası.", icon: "pa:konvak_l1" },
      { id: "l2", name: "Arşiv Odası", description: "Konağa ait yüz yıllık tapuların ve evrakların saklandığı, sadece özel anahtarla girilebilen kilitli bölüm.", icon: "pa:konvak_l2" },
      { id: "l3", name: "Yemek Salonu", description: "Uzun ahşap masaların bulunduğu, davetlilere hizmet veren geniş ve aydınlık ana salon.", icon: "pa:konvak_l3" },
    ],
    clues: [
      { id: "c1", text: "Kan izleri, cinayetin kilitli tapu odasında veya yemek yenilen ana salonda değil, deri kaplı kitapların bulunduğu sessiz odada işlendiğini gösteriyor.", type: "evidence", isBonus: false },
      { id: "c2", text: "Yüzbaşı Cemil, sabaha kadar aydınlık yemek salonunda oturup anılarını yazdığını ve yerinden kalkmadığını ispatladı.", type: "witness", isBonus: false },
      { id: "c3", text: "Tüccar Vehbi'nin tüm geceyi yüz yıllık evrakların saklandığı arşiv odasında geçirdiği, kapının içeriden kilitli olmasıyla doğrulandı.", type: "witness", isBonus: false },
      { id: "c4", text: "Cinayette paslanmaz çelikten küt bir alet veya ince uçlu gümüş bıçak kullanılmadığı kesinleşti; yaralar paslı ve büyük bir kesici aleti işaret ediyordu.", type: "forensic", isBonus: false },
      { id: "c5", text: "Konağın varisi Semiha Hanım'ın gece yarısı gizlice kütüphaneye girdiği bir hizmetçi tarafından görüldü.", type: "witness", isBonus: true },
      { id: "c6", text: "Kütüphanede bulunan o ağır demir makasın sapında, Semiha Hanım'a ait parmak izleri açıkça parlıyordu.", type: "forensic", isBonus: true },
    ],
    solvabilityMeta: {
      freeEliminations: ["s1", "s3", "w2", "w3", "l2", "l3"],
      bonusEliminations: [],
    },
    solution: { suspectId: "s2", weaponId: "w1", locationId: "l1" },
  },
  {
    id: "pazar-sabahi-baskini",
    title: "Pazar Sabahı Baskını",
    difficulty: "caylak",
    dayIndex: 32,
    story:
      "Gaziantep'in asırlık Bakırcılar Çarşısı'nda şafak vakti, çekiç sesleri yerine bir feryat yankılandı. Niyazi Usta, sabah dükkanını açmaya geldiğinde kendi deposunda cansız halde yatıyordu. Kasadan eksilen bakır eşyalar ve karanlıkta kaybolan ayak izleri, katilin çok uzağa gitmediğini söylüyor.",
    suspects: [
      { id: "s1", name: "Vahap Amca", description: "Bacaklarındaki şiddetli ağrılar nedeniyle merdiven inip çıkamayan, sürekli oturduğu yerden etrafı izleyen yaşlı komşu esnaf.", icon: "pa:pbaski_s1" },
      { id: "s2", name: "Çırak Selim", description: "Dükkanın genç ve telaşlı çalışanı; son günlerde acil paraya ihtiyacı olduğu biliniyor ve cinayet mahallinde görülmüş.", icon: "pa:pbaski_s2" },
      { id: "s3", name: "Kurye Murat", description: "Ağır yükleri taşımaya alışkın, dükkana sürekli mal getiren nakliyeci; elinden alet çantasını düşürmüyor.", icon: "pa:pbaski_s3" },
    ],
    weapons: [
      { id: "w1", name: "Cam Kadeh", description: "Çay ocağından alınmış, kırıldığında şah damarını kesebilecek ölümcül ve ince içecek bardağı.", icon: "pa:pbaski_w1" },
      { id: "w2", name: "İngiliz Anahtarı", description: "Nakliye araçlarını tamir etmekte kullanılan, üzeri gres yağı lekeleriyle dolu ağır metal tamir aleti.", icon: "pa:pbaski_w2" },
      { id: "w3", name: "Bakır Ağırlık", description: "Kuyumcu ve bakırcı terazilerinde kullanılan, avuç içine tam oturan ölümcül kütleli tartı dirhemi.", icon: "pa:pbaski_w3" },
    ],
    locations: [
      { id: "l1", name: "Depo", description: "Malların istiflendiği, güneş ışığı almayan, merdivenle inilen loş ve havasız alt kat; cinayetin işlendiği yer.", icon: "pa:pbaski_l1" },
      { id: "l2", name: "Dükkan İçi", description: "Vitrinlerin ve kasanın bulunduğu, sokağı doğrudan gören aydınlık müşteri karşılama alanı.", icon: "pa:pbaski_l2" },
      { id: "l3", name: "Arka Sokak", description: "Sadece nakliye araçlarının yanaştığı, çamurlu ve kimsenin geçmediği dar mal yükleme geçidi.", icon: "pa:pbaski_l3" },
    ],
    clues: [
      { id: "c1", text: "Yaşlı Vahap Amca'nın o sabah sadece kendi dükkanının önünde ince cam bir bardakla oturduğu ve merdiven inmediği anlaşıldı.", type: "witness", isBonus: false },
      { id: "c2", text: "Kurye Murat'ın tüm sabahı sokağı gören müşteri alanında geçirdiği ve alet çantasındaki İngiliz anahtarını hiç kullanmadığı kanıtlandı.", type: "witness", isBonus: false },
      { id: "c3", text: "Olay yeri incelemesi, cinayetin müşteri karşılama alanında veya dışarıdaki dar sokakta değil, havasız ve loş alt katta gerçekleştiğini tespit etti.", type: "evidence", isBonus: false },
      { id: "c4", text: "Adli rapor, kurbanın başındaki yaranın cam kırığı veya metal tamir aletiyle değil, kütleli bir tartı dirhemiyle açıldığını doğruladı.", type: "forensic", isBonus: false },
      { id: "c5", text: "Malların istiflendiği loş alt kattan telaşla yukarı koşan tek kişi, acil paraya ihtiyacı olan Çırak Selim'di.", type: "record", isBonus: true },
      { id: "c6", text: "Cinayette kullanılan avuç içine tam oturan kütleli dirhem, Çırak Selim'in önlüğünün cebinde kan lekeleriyle bulundu.", type: "forensic", isBonus: true },
    ],
    solvabilityMeta: {
      freeEliminations: ["s1", "s3", "w1", "w2", "l2", "l3"],
      bonusEliminations: [],
    },
    solution: { suspectId: "s2", weaponId: "w3", locationId: "l1" },
  },
  {
    id: "aksam-vapurunda-gizem",
    title: "Akşam Vapurunda Gizem",
    difficulty: "caylak",
    dayIndex: 33,
    story:
      "Boğaz'ın hırçın sularını yaran akşam vapurunda ışıklar aniden kesildiğinde, herkes bunun sıradan bir arıza olduğunu düşündü. Ancak jeneratörler devreye girip salon aydınlandığında, Nafiz Bey koltuğunda son nefesini vermişti. Dalgaların sesi, vapurda mahsur kalan katilin ayak seslerini gizlemeye yetmeyecekti.",
    suspects: [
      { id: "s1", name: "Tarık", description: "Yolculuk boyunca dondurucu soğuğa rağmen içeri girmeyip dışarıda manzarayı izlediğini iddia eden şüpheli yolcu.", icon: "pa:vapur_s1" },
      { id: "s2", name: "Feriha", description: "Elektrik kesintisinde kurbanın hemen yanındaki koltukta oturan, çantası çeşitli ilaçlarla dolu tedirgin kadın.", icon: "pa:vapur_s2" },
      { id: "s3", name: "Kerem", description: "Vapurun motor arızalarıyla ilgilenen, üstü başı yağ içindeki makine dairesi görevlisi; cinayet anında aşağıda olduğunu söylüyor.", icon: "pa:vapur_s3" },
    ],
    weapons: [
      { id: "w1", name: "Zehirli İçecek", description: "Sıcak çaya karıştırıldığında saniyeler içinde kalbi durduran renksiz, kokusuz ve hızlı etkili ölümcül sıvı.", icon: "pa:vapur_w1" },
      { id: "w2", name: "İngiliz Anahtarı", description: "Motor parçalarını sıkmak için kullanılan, üzeri gres yağına bulanmış devasa ve ağır demir alet.", icon: "pa:vapur_w2" },
      { id: "w3", name: "Cam Parçası", description: "Vapurun kırık küpeştesinden koparılmış, boynu tek hamlede kesebilecek kadar sivri ve tehlikeli cam.", icon: "pa:vapur_w3" },
    ],
    locations: [
      { id: "l1", name: "Kapalı Yolcu Salonu", description: "Ahşap bankların bulunduğu, elektrik kesintisinde tamamen zifiri karanlığa gömülen ve kurbanın bulunduğu iç alan.", icon: "pa:vapur_l1" },
      { id: "l2", name: "Açık Güverte", description: "Dondurucu rüzgarın estiği, yolcuların martılara simit attığı ve ıssız olan dış kısım.", icon: "pa:vapur_l2" },
      { id: "l3", name: "Makine Bölümü", description: "Devasa dizel motorların sağır edici bir gürültüyle çalıştığı, personelin girdiği yağ kokulu alt kat.", icon: "pa:vapur_l3" },
    ],
    clues: [
      { id: "c1", text: "Tarık'ın dondurucu soğuğa rağmen vapurun dış kısmından hiç ayrılmadığı ve içeriye adım atmadığı şahitlerle onaylandı.", type: "witness", isBonus: false },
      { id: "c2", text: "Makinist Kerem, elektrik kesintisi boyunca gürültülü dizel motorların olduğu alt katta ağır demir aletlerle çalıştığını ispatladı.", type: "witness", isBonus: false },
      { id: "c3", text: "Maktulün bedeninde ağır demir bir aletle veya sivri cam parçasıyla açılmış herhangi bir yara yoktu; ölüm sinsi bir sıvıyla olmuştu.", type: "forensic", isBonus: false },
      { id: "c4", text: "Zehrin saniyeler içinde etki etmesi, cinayetin açık havada veya motor dairesinde değil, kurbanın oturduğu iç alanda işlendiğini kanıtlıyordu.", type: "evidence", isBonus: false },
      { id: "c5", text: "Elektrikler kesildiği anda kurbanın oturduğu ahşap bankta hemen yanına yanaşan kişi Feriha Hanım'dı.", type: "witness", isBonus: true },
      { id: "c6", text: "Tedirgin kadının çantasından çıkan o renksiz sıvı, kurbanın içeceğine karıştırılan hızlı etkili maddeyle milimetrik olarak eşleşti.", type: "forensic", isBonus: true },
    ],
    solvabilityMeta: {
      freeEliminations: ["s1", "s3", "w2", "w3", "l2", "l3"],
      bonusEliminations: [],
    },
    solution: { suspectId: "s2", weaponId: "w1", locationId: "l1" },
  },
  {
    id: "bagda-kanli-bicak",
    title: "Bağda Kanlı Bıçak",
    difficulty: "caylak",
    dayIndex: 34,
    story:
      "Bornova'nın asırlık zeytinliklerinde şafak vakti, çiğ damlalarına kan karıştı. Yılların toprak ağası Hüsnü Bey, kendi bağının ortasında, devrilmiş sepetlerin arasında acımasızca katledilmiş halde bulundu. Toprak kana doyarken, o puslu serinlikte bağa giren üç kişinin ayak izleri sırrını koruyordu.",
    suspects: [
      { id: "s1", name: "Uşak Mehmet", description: "Hüsnü Ağa'nın bağında yıllardır çalışan, yaşlılığı nedeniyle kovulma korkusuyla yaşayan emektar uşak.", icon: "pa:bagda_s1" },
      { id: "s2", name: "Komşu Tarla Sahibi Nevzat", description: "Hüsnü Ağa ile tarla sınırı yüzünden davalık olan, sınırı ihlal etmediğini savunan öfkeli komşu.", icon: "pa:bagda_s2" },
      { id: "s3", name: "Torun Kız Nermin", description: "Büyükbabasının arazileri satma kararına şiddetle karşı çıkan, sabah erkenden bağ kulübesinde ağlarken görülen mirasçı.", icon: "pa:bagda_s3" },
    ],
    weapons: [
      { id: "w1", name: "Bağ Bıçağı", description: "Üzüm salkımlarını tek hamlede kesmek için özel olarak ustalar tarafından bileyenmiş kısa ve ölümcül bıçak.", icon: "pa:bagda_w1" },
      { id: "w2", name: "Balta", description: "Kışlık odun kırmak için bağ evinde bulundurulan, kemikleri bile parçalayabilen ağır ve paslı alet.", icon: "pa:bagda_w2" },
      { id: "w3", name: "Demir Kazma", description: "Sert toprağı işlemek için kullanılan, kafatasına isabet ettiğinde geniş tahribat yaratan kütleli kazma.", icon: "pa:bagda_w3" },
    ],
    locations: [
      { id: "l1", name: "Bağ İçi", description: "Asmaların sıklaştığı, yapraklardan dolayı görüş mesafesinin çok düştüğü tarlanın en izole orta kısmı.", icon: "pa:bagda_l1" },
      { id: "l2", name: "Bağ Kulübesi", description: "Aletlerin saklandığı, girişin hemen yanındaki karanlık, penceresiz taş yapı.", icon: "pa:bagda_l2" },
      { id: "l3", name: "Tarla Sınırı", description: "Hüsnü Ağa ile komşusunun arazisini bölen, üzerinden atlaması zor alçak taş duvar hattı.", icon: "pa:bagda_l3" },
    ],
    clues: [
      { id: "c1", text: "Adli tabip, maktulün bedeninde ağır bir balta tahribatı veya demir kazma eziği bulunmadığını, pürüzsüz ve usta işi bir kesik açıldığını belirtti.", type: "forensic", isBonus: false },
      { id: "c2", text: "Genç torun Nermin'in sabahın erken saatlerinden beri aletlerin saklandığı karanlık taş yapıda ağladığı ve dışarı çıkmadığı kanıtlandı.", type: "witness", isBonus: false },
      { id: "c3", text: "Komşu Nevzat, jandarma gelene kadar arazileri bölen taş duvar hattının kendi tarafında beklediğini köylülerle doğruladı.", type: "witness", isBonus: false },
      { id: "c4", text: "Cinayet, girişin yanındaki kulübede veya komşu sınırında değil, görüş mesafesinin düştüğü izole orta asmalık alanda işlenmişti.", type: "evidence", isBonus: false },
      { id: "c5", text: "Kovulma korkusu yaşayan Uşak Mehmet, asmaların arasındaki o izole bölgede maktulle tek başına kalmıştı.", type: "evidence", isBonus: true },
      { id: "c6", text: "Uşak Mehmet'in belindeki kınından düşen o kısa tarım bıçağı, kurbanın boynundaki kusursuz kesikle tamamen örtüşüyordu.", type: "forensic", isBonus: true },
    ],
    solvabilityMeta: {
      freeEliminations: ["s2", "s3", "w2", "w3", "l2", "l3"],
      bonusEliminations: [],
    },
    solution: { suspectId: "s1", weaponId: "w1", locationId: "l1" },
  },
  {
    id: "kervansarayda-son-gece",
    title: "Kervansarayda Son Gece",
    difficulty: "caylak",
    dayIndex: 35,
    story:
      "Konya'nın kalın taş duvarlı tarihi kervansarayında fırtınalı bir gecenin sabahı ölümle uyandı. Zengin tüccar Raşit Efendi, sürgüsü çekilmemiş odasında nefessiz bırakılmıştı. Hanın devasa ahşap kapıları gece boyu kilitliydi; katil bu loş koridorlarda gezinen, tanıdık bir silüetten başkası değildi.",
    suspects: [
      { id: "s1", name: "Tüccar Ortak Sabri Bey", description: "Raşit Efendi'nin ortaklıktan ayrılmak isteyen, gece boyu uykusuzluk çekip avluda volta atan iş ortağı.", icon: "pa:kervan_s1" },
      { id: "s2", name: "Hizmetçi Kadın Hacer", description: "Odaları temizleyen, kışlık üniforması eksik olan ve hanın tüm kapı anahtarlarına sınırsız erişimi olan tek çalışan.", icon: "pa:kervan_s2" },
      { id: "s3", name: "Gezgin Derviş Salih", description: "Maktulle akşam yemeğinde sert şekilde tartışan, ardından geceyi kilitli ambarda zikir çekerek geçiren yaşlı gezgin.", icon: "pa:kervan_s3" },
    ],
    weapons: [
      { id: "w1", name: "Atkı", description: "Kış aylarında personelin soğuktan korunmak için taktığı uzun, kalın ve sessizce boğmaya çok müsait esnek yün atkı.", icon: "pa:kervan_w1" },
      { id: "w2", name: "Kemer", description: "Tüccarların altın keselerini bağladığı, deri tokalı, boyunda farklı bir boğma izi bırakan sağlam bel kemeri.", icon: "pa:kervan_w2" },
      { id: "w3", name: "Halat", description: "Ambardaki çuvalları bağlamak için kullanılan, deriyi tahriş eden kalın ve pürüzlü kendir halat.", icon: "pa:kervan_w3" },
    ],
    locations: [
      { id: "l1", name: "Konak Odası", description: "Maktulün uyuduğu, ahşap yataklı, cinayet gecesi sürgüsü içeriden çekilmemiş birinci kat odası.", icon: "pa:kervan_l1" },
      { id: "l2", name: "Han Avlusu", description: "Geceleri rüzgarın uğuldadığı, sütunlarla çevrili, bekçilerin devriye gezdiği geniş açık orta alan.", icon: "pa:kervan_l2" },
      { id: "l3", name: "Ambar", description: "Alt katta bulunan, ticaret çuvallarının istiflendiği, kapısı dışarıdan asma kilitli depolama alanı.", icon: "pa:kervan_l3" },
    ],
    clues: [
      { id: "c1", text: "Ceset, rüzgarlı açık orta alanda veya çuvalların olduğu kilitli depolama alanında değil, doğrudan kurbanın uyuduğu birinci kat odasındaydı.", type: "evidence", isBonus: false },
      { id: "c2", text: "Yaşlı Derviş Salih, tüm geceyi çuvalların bulunduğu kilitli alt kat ambarında zikir çekerek geçirdiğini kanıtladı.", type: "witness", isBonus: false },
      { id: "c3", text: "Tüccar Sabri Bey, uykusuzluğu nedeniyle gece boyunca sütunlarla çevrili açık orta alanda volta attı ve üst katlara hiç çıkmadı.", type: "witness", isBonus: false },
      { id: "c4", text: "Boyundaki izlerin sert deri bir tokayla veya pürüzlü kendir halatla değil, esnek ve yumuşak dokunmuş bir kumaşla yapıldığı anlaşıldı.", type: "forensic", isBonus: false },
      { id: "c5", text: "Hanın tüm kapı anahtarlarına sınırsız erişimi olan tek kişi, o gece odaları düzenleyen Hizmetçi Hacer'di.", type: "evidence", isBonus: true },
      { id: "c6", text: "Maktulün yatağının altında bulunan o esnek yün atkı, Hacer'in eksik olan kışlık üniformasının bir parçasıydı.", type: "forensic", isBonus: true },
    ],
    solvabilityMeta: {
      freeEliminations: ["s1", "s3", "w2", "w3", "l2", "l3"],
      bonusEliminations: [],
    },
    solution: { suspectId: "s2", weaponId: "w1", locationId: "l1" },
  },
  {
    id: "fotografcinin-son-karesi",
    title: "Fotoğrafçının Son Karesi",
    difficulty: "dedektif",
    dayIndex: 36,
    story:
      "Ankara'nın eski Ulus semtinde tanınmış bir fotoğrafçı olan Faruk Bey, stüdyosunda ölü bulundu. Kırmızı lamba yanık, banyo teknelerinde yarı işlenmiş filmler hâlâ duruyordu. Gün içinde gelen üç şüphelinin her biri diğerini suçlarken gerçek karanlıkta gizli.",
    suspects: [
      { id: "s1", name: "Gazeteci Selda Hanım", description: "Fotoğrafları izinsiz yayımlayan muhalif muhabir. Sadece ön ofisteki açık alanlara ve çekim ekipmanlarına erişimi vardı.", icon: "pa:foto_s1" },
      { id: "s2", name: "Asistan Cumhur", description: "Fotoğrafçının stüdyo çalışanı. Terfi alamadığı için öfkeli; banyo sıvıları dahil stüdyonun tüm teknik alanlarını kullanma yetkisine sahip.", icon: "pa:foto_s2" },
      { id: "s3", name: "Koleksiyoner Münir Bey", description: "Nadir eserler için baskı yapan yaşlı koleksiyoner. Sadece depolanmış eski kutularla ilgilenir, güncel çekim alanlarına hiç uğramaz.", icon: "pa:foto_s3" },
    ],
    weapons: [
      { id: "w1", name: "Tripod Bacağı", description: "Kamera sehpasından sökülmüş uzun ve ağır alüminyum boru; kafaya küt bir darbe vurulduğunda anında ölümcül olabilir.", icon: "pa:foto_w1" },
      { id: "w2", name: "Kimyasal Banyo", description: "Filmleri yıkamakta kullanılan, zorla içirildiğinde iç organları saniyeler içinde eriten yüksek asitli zehirli çözelti.", icon: "pa:foto_w2" },
      { id: "w3", name: "Cam Negatif Kutusu", description: "İçi eski cam filmlerle dolu, kaldırıp atıldığında ezici tahribat yaratan son derece ağır ve köşeli metal kutu.", icon: "pa:foto_w3" },
    ],
    locations: [
      { id: "l1", name: "Karanlık Oda", description: "Sadece kırmızı lambanın yandığı, filmlerin yıkandığı banyo teknelerinin bulunduğu stüdyonun en kapalı ve loş arka alanı.", icon: "pa:foto_l1" },
      { id: "l2", name: "Stüdyo Salonu", description: "Müşterilerin poz verdiği, kamera ve flaşların bulunduğu oldukça geniş, aydınlık ve ferah ön çekim alanı.", icon: "pa:foto_l2" },
      { id: "l3", name: "Depo Odası", description: "Kullanılmayan malzemelerin ve geçmiş yıllara ait arşiv kutularının üst üste yığıldığı tozlu ve dar arka oda.", icon: "pa:foto_l3" },
    ],
    clues: [
      { id: "c1", text: "Kriminal inceleme, asit banyosu yanıklarının kurbana ölümünden sonra yapıldığını; gerçek ölüm nedeninin kafatasına indirilen silindirik ve ağır bir alüminyum obje olduğunu saptadı.", type: "forensic", isBonus: false },
      { id: "c2", text: "Ortalıkta hiç kırık cam veya devrilmiş eski arşiv kutusu yoktu; kurbanın bedeni, sadece kırmızı lambanın aydınlattığı loş ve kimyasalların bulunduğu bir teknenin yanındaydı.", type: "evidence", isBonus: false },
      { id: "c3", text: "Alt kattaki esnaf, Koleksiyoner Münir Bey'in sadece arka depodaki eski fotoğraflara bakıp erkenden binayı terk ettiğini yeminli ifadesinde belirtti.", type: "witness", isBonus: false },
      { id: "c4", text: "Muhalif gazetecinin ziyaretçi kartı, sadece müşterilerin ağırlandığı ön ofiste yetkiliydi ve teknik banyo odalarının kapısını açmıyordu.", type: "record", isBonus: false },
      { id: "c5", text: "Karanlık odada bulunan küt alüminyum boru, stüdyonun teknik donanımlarına sınırsız erişimi olan çalışanın kameraman setinden sökülmüştü.", type: "evidence", isBonus: true },
      { id: "c6", text: "Terfi alamadığı için ustasına kin güden Cumhur'un banyo önlüğünde, kurbanın kan sıçramaları asit lekeleriyle birbirine karışmış halde bulundu.", type: "forensic", isBonus: true },
    ],
    solvabilityMeta: {
      freeEliminations: ["s1", "s3", "w2", "w3", "l2", "l3"],
      bonusEliminations: [],
    },
    solution: { suspectId: "s2", weaponId: "w1", locationId: "l1" },
  },
  {
    id: "termal-otelde-olum",
    title: "Termal Otelde Ölüm",
    difficulty: "dedektif",
    dayIndex: 37,
    story:
      "Bursa'nın köklü termal otelinde, muhasebeci Münibe Hanım havuz kenarında boğulmuş hâlde bulundu. Gece geç saatte otelde yalnızca üç misafir kalmaktaydı. Sular bu kez şifa değil, mükemmel tasarlanmış bir alibi getirdi.",
    suspects: [
      { id: "s1", name: "Emekli Doktor Vedat Bey", description: "Miras verasetinde tanık olan, bastonuyla zor yürüyen, güçlü fiziksel eylemlerden kaçınan yaşlı adam.", icon: "pa:termol_s1" },
      { id: "s2", name: "İş Kadını Perihan Hanım", description: "Hesap anlaşmazlığı yaşadığı ortağına karşı kin güden, lüks kıyafetlere ve monogramlı şahsi eşyalara düşkün hırslı kadın.", icon: "pa:termol_s2" },
      { id: "s3", name: "Genç Sporcu Erdal", description: "Milli takım sporcusu. Fiziksel kondisyonu zirvede olan, sürekli lobide veya dış alanlarda telefonla konuşarak sponsor arayan genç.", icon: "pa:termol_s3" },
    ],
    weapons: [
      { id: "w1", name: "Havlu", description: "Odalardan alınmış, boyna sıkıca dolandığında sessizce ve etkili biçimde nefesi kesen esnek, kalın otel kumaşı.", icon: "pa:termol_w1" },
      { id: "w2", name: "Kimyasal Temizleyici", description: "Su bakımında kullanılan, içilmesi veya solunması halinde ciğerleri parçalayan aşırı dozda klorlu zehirli sıvı.", icon: "pa:termol_w2" },
      { id: "w3", name: "Metal Trabzan", description: "Merdiven kenarından sökülmüş, sert bir şekilde kafaya vurulduğunda açık yara ve kırık yaratan ağır metal boru.", icon: "pa:termol_w3" },
    ],
    locations: [
      { id: "l1", name: "Termal Havuz", description: "Otelin alt katında yer alan, sıcak su buharıyla kaplı, sığ kenarları olan ve zeminleri her daim ıslak kapalı alan.", icon: "pa:termol_l1" },
      { id: "l2", name: "Koridor", description: "Oda katlarını birbirine bağlayan, uzun halılarla kaplı, aydınlık ve güvenlik kamerasının kısmen gördüğü sessiz geçit.", icon: "pa:termol_l2" },
      { id: "l3", name: "Lobi", description: "Otelin ana girişinin bulunduğu, resepsiyon görevlisinin durduğu, geniş oturma gruplarına sahip ana karşılama alanı.", icon: "pa:termol_l3" },
    ],
    clues: [
      { id: "c1", text: "Otel halılarında veya geniş lobi koltuklarında hiçbir su damlası yoktu; kurban tamamen ıslak bir zeminde, yoğun buharın olduğu bir alanda can vermişti.", type: "evidence", isBonus: false },
      { id: "c2", text: "Resepsiyonist, genç sporcunun o saatlerde lobideki ankesörlü telefonda sponsorlarıyla bağırarak tartıştığını ve oradan hiç ayrılmadığını kayıtlara geçirdi.", type: "witness", isBonus: false },
      { id: "c3", text: "Kurbanın solunum yollarında klor tahribatı veya kafasında ağır bir metal kırığı yoktu; boynundaki iz, geniş ve esnek bir kumaşın sertçe sıkılmasıyla oluşmuştu.", type: "forensic", isBonus: false },
      { id: "c4", text: "Emekli Doktor'un oda kapısı gece saat 22:00'de kilitlenmiş ve sabah 08:00'e kadar açılmamıştı; zaten o kaygan zeminde kaba kuvvetle boğuşması imkansızdı.", type: "record", isBonus: false },
      { id: "c5", text: "Olay yerinde kurbanın boynuna dolanmış olarak bulunan kalın otel kumaşının üzerinde, maktule değil, otelin lüks odalarından birine ait özel bir monogram vardı.", type: "evidence", isBonus: true },
      { id: "c6", text: "Ortağıyla hesap kavgası yaşayan Perihan Hanım'ın 312 numaralı odasından eksilen o özel işlemeli eşya, tam da kurbanın boynunu sıkan cinayet silahıydı.", type: "forensic", isBonus: true },
    ],
    solvabilityMeta: {
      freeEliminations: ["s1", "s3", "w2", "w3", "l2", "l3"],
      bonusEliminations: [],
    },
    solution: { suspectId: "s2", weaponId: "w1", locationId: "l1" },
  },
  {
    id: "mektup-gelmedi",
    title: "Mektup Gelmedi",
    difficulty: "dedektif",
    dayIndex: 38,
    story:
      "Samsun'un liman mahallelerinden birinde postacı Cafer Bey, akşam erken saatte bir arka sokakta bıçaklanmış bulundu. Çantasındaki birkaç mektup kayıp. Gün içinde tartışma yaşadığı üç kişiden birisi, zarfın içindeki sırları korumak için cinayeti işledi.",
    suspects: [
      { id: "s1", name: "Bakkal Necati", description: "Koli şikayeti bulunan mahalle esnafı. Sürekli dükkanının önünde bekleyen, kendi bölgesinden pek ayrılmayan tanıdık yüz.", icon: "pa:mektup_s1" },
      { id: "s2", name: "Liman İşçisi Tahsin", description: "İşten çıkarılma belgesinin postalanmasından korkan, üzerinde her daim ağır iş aletleri taşıyan öfkeli tersane işçisi.", icon: "pa:mektup_s2" },
      { id: "s3", name: "Ev Hanımı Hatice Teyze", description: "Postaların geç gelmesinden şikayetçi olan ev hanımı. Fiziksel olarak yavaş hareket eden, kargoları için depo binalarını aşındıran kadın.", icon: "pa:mektup_s3" },
    ],
    weapons: [
      { id: "w1", name: "Çakı", description: "Küçük, katlanabilir, yakından yapılan tek bir pürüzsüz hamleyle ince ve derin bir kesik açabilen cep aleti.", icon: "pa:mektup_w1" },
      { id: "w2", name: "Kanca", description: "Ağır yükleri kavramak için kullanılan, saplandığında geniş ve parçalı derin tahribat yaratan paslı demir alet.", icon: "pa:mektup_w2" },
      { id: "w3", name: "Cam Parçası", description: "Sokaktaki kırık bir şişeden alınmış, boynu düzensiz ve tırtıklı şekilde parçalayan rastgele kesici alet.", icon: "pa:mektup_w3" },
    ],
    locations: [
      { id: "l1", name: "Arka Sokak", description: "Esnaf dükkanlarının arka tarafına düşen, görüş açısı kapalı, dar, ıssız ve kimsenin geçmediği taşlı yol.", icon: "pa:mektup_l1" },
      { id: "l2", name: "Liman Rıhtımı", description: "Devasa gemilerin yanaştığı, yükleme işlemlerinin yapıldığı geniş ve rüzgarlı açık sahil alanı.", icon: "pa:mektup_l2" },
      { id: "l3", name: "Posta Deposu", description: "Gelen mektupların sınıflandırıldığı, kargoların yığıldığı dört duvar arası küçük resmi bina.", icon: "pa:mektup_l3" },
    ],
    clues: [
      { id: "c1", text: "Postane amirinin tutanakları, Hatice Teyze'nin tüm akşamüstünü kargoların sınıflandırıldığı ana resmi binada memurlarla tartışarak geçirdiğini kesinleştirdi.", type: "record", isBonus: false },
      { id: "c2", text: "Maktulün yarasında paslı bir demirin yırtığı veya düzensiz cam kesikleri yoktu; katil, son derece keskin, pürüzsüz ve tek hamlelik bir alet kullanmıştı.", type: "forensic", isBonus: false },
      { id: "c3", text: "Cinayet rüzgarlı rıhtımda veya resmi binalarda değil, kimsenin görmediği, dükkanların arka tarafına düşen kuytu bir taşlıkta işlenmişti.", type: "evidence", isBonus: false },
      { id: "c4", text: "Bakkal Necati'nin o akşamüstü dükkanına gelen toptancılarla mal sayımı yaptığı ve kendi dükkanının önünden bir an olsun ayrılmadığı kanıtlandı.", type: "witness", isBonus: false },
      { id: "c5", text: "Kurbanın dağılmış postaları arasında eksilen tek zarfın, bir liman işçisinin hayatını karartacak olan işten çıkarılma tebligatı olduğu anlaşıldı.", type: "evidence", isBonus: true },
      { id: "c6", text: "Tersane işçisi Tahsin'in kemerinde taşıdığı küçük ve katlanabilir cep aletinin mekanizması arasında, maktulün kan grubuna ait taze kurumuş kan hücreleri bulundu.", type: "forensic", isBonus: true },
    ],
    solvabilityMeta: {
      freeEliminations: ["s1", "s3", "w2", "w3", "l2", "l3"],
      bonusEliminations: [],
    },
    solution: { suspectId: "s2", weaponId: "w1", locationId: "l1" },
  },
  {
    id: "zeytinyagi-fabrikasinda-kabus",
    title: "Zeytinyağı Fabrikasında Kâbus",
    difficulty: "baskomiser",
    dayIndex: 39,
    story:
      "Ayvalık'ın en büyük fabrikasının sahibi Rıfat Ağa, preslerin arasında ölü bulundu. Başta bir endüstriyel kaza sanılsa da, adli inceleme bunun kusursuz planlanmış bir zehirleme vakası olduğunu ortaya çıkardı.",
    suspects: [
      { id: "s1", name: "Fabrika Ustabaşı Cevdet", description: "On beş yıldır fabrikada çalışan ustabaşı; Rıfat Ağa'nın onu ortaklıktan mahrum bıraktığını öğrendi.", icon: "pa:zeytin_s1" },
      { id: "s2", name: "Muhasebeci Bayan Şükran", description: "Fabrikanın muhasebecisi; usulsüz kayıtları Rıfat Ağa'ya bildirmekten çekindiği için baskı altındaydı.", icon: "pa:zeytin_s2" },
      { id: "s3", name: "Satış Temsilcisi Orhan Bey", description: "İstanbul'dan gelen satış temsilcisi; Rıfat Ağa ile anlaşma görüşmesi bozulmuş.", icon: "pa:zeytin_s3" },
    ],
    weapons: [
      { id: "w1", name: "Zehirli Çay", description: "İçine yüksek doz sedatif karıştırılmış çay bardağı.", icon: "pa:zeytin_w1" },
      { id: "w2", name: "Pres Kolu", description: "Zeytinyağı presinin metal kumanda kolu.", icon: "pa:zeytin_w2" },
      { id: "w3", name: "Zincir", description: "Pres makinasına bağlı güvenlik zinciri.", icon: "pa:zeytin_w3" },
    ],
    locations: [
      { id: "l1", name: "Pres Odası", description: "Büyük zeytinyağı preslerinin bulunduğu gürültülü ana oda.", icon: "pa:zeytin_l1" },
      { id: "l2", name: "Ofis", description: "Fabrikanın üst katındaki muhasebe ve yönetim ofisi.", icon: "pa:zeytin_l2" },
      { id: "l3", name: "Depo", description: "Dolu yağ varillerin istiflendiği geniş depo.", icon: "pa:zeytin_l3" },
    ],
    clues: [
      { id: "c1", text: "Ölümcül hasar pres makinelerinden gelse de, adli tıp maktulün kanında yüksek oranda sinsi bir uyutucu buldu; kurban makineye atılmadan önce çoktan bilincini kaybetmişti.", type: "forensic", isBonus: false },
      { id: "c2", text: "Olay yeri inceleme, cinayetin sessiz idari katlarda veya varillerin yığıldığı sakin depoda değil, tam da devasa çarkların kulak sağır eden gürültüsü altında işlendiğini belirledi.", type: "evidence", isBonus: false },
      { id: "c3", text: "İstanbul'dan gelen misafirin güvenlik kartı, sadece giriş lobisinde ve idari ofislerde işlem görmüş, üretim sahasına hiç geçmemişti.", type: "record", isBonus: false },
      { id: "c4", text: "Fabrikanın deneyimli ustabaşısı, kurbanın sadece idari katta bulunan ince belli özel fincanlarla çay içtiğini, kendisinin o mutfağa girmesinin yasak olduğunu kanıtladı.", type: "evidence", isBonus: false },
      { id: "c5", text: "Toksikoloji raporundaki sedatif maddenin, masasında usulsüz kayıtlar barındıran personelin kilitli çekmecesindeki reçetesiz ilaçla aynı seriden olduğu saptandı.", type: "forensic", isBonus: true },
      { id: "c6", text: "Muhasebe defterlerindeki alelacele kazınmış rakamlar, zimmetine para geçiren idari çalışanın, kendisini kovan patronunu susturmak için hazırladığı o sinsi kadehi açıklıyordu.", type: "evidence", isBonus: true },
    ],
    solvabilityMeta: {
      freeEliminations: ["s1", "s3", "w2", "w3", "l2", "l3"],
      bonusEliminations: [],
    },
    solution: { suspectId: "s2", weaponId: "w1", locationId: "l1" },
  },
  {
    id: "dag-yolunda-pusu",
    title: "Dağ Yolunda Pusu",
    difficulty: "baskomiser",
    dayIndex: 40,
    story:
      "Trabzon-Rize arasındaki dağ yolunda bir minibüs barikata takıldı ve şoför vahşice katledildi. Yol üç saat kapalı kaldı, dışarıdan kimse gelemezdi. Katil, araçtaki üç yolcudan başkası değildi.",
    suspects: [
      { id: "s1", name: "Tüccar Kadın Safiye Hanım", description: "Rize'ye mal götüren yaşlı kadın tüccar; Ahmet Bey'in geç kaldığı için kendisini zor durumda bıraktığını söylüyor.", icon: "noun-dag-yasli-kadin-avatar.png" },
      { id: "s2", name: "Öğretmen Adayı Levent", description: "Atama için Rize'ye giden genç öğretmen adayı; yanında tayin belgeleri var.", icon: "noun-dag-ogretmen-avatar.png" },
      { id: "s3", name: "Orman İşçisi Bayram", description: "Orman bölgesinden dönen deneyimli orman işçisi; yanında kesici aletler taşıyan büyük bir çanta var.", icon: "noun-dag-oduncu-avatar.png" },
    ],
    weapons: [
      { id: "w1", name: "Orman Bıçağı", description: "Ağaç budama ve kesme işleri için kullanılan büyük, ağır orman bıçağı.", icon: "content-cut" },
      { id: "w2", name: "Taş", description: "Yol kenarındaki duvarda gevşek duran sivri köşeli büyük taş.", icon: "terrain" },
      { id: "w3", name: "Demir Levye", description: "Minibüsün araç gereç bölümündeki demir levye.", icon: "construction" },
    ],
    locations: [
      { id: "l1", name: "Yol Kenarı", description: "Minibüsün durduğu noktanın hemen yanındaki taş duvarlı yol kenarı.", icon: "place" },
      { id: "l2", name: "Orman İçi", description: "Yolun solundaki sık çam ormanı; görüş mesafesi çok kısa.", icon: "park" },
      { id: "l3", name: "Minibüs İçi", description: "Yolculuk minibüsünün iç kabini.", icon: "directions-bus" },
    ],
    clues: [
      { id: "c1", text: "Minibüsün iç kabininde hiçbir kan damlasına rastlanmadı ve ormanın içlerine doğru giden bir sürüklenme izi yoktu; kurban aracın hemen yanındaki taşlık bölgede pusuya düşürülmüştü.", type: "evidence", isBonus: false },
      { id: "c2", text: "Maktulün boynundaki yara, doğada bulunan rastgele kaba bir taşın veya küt bir metalin aksine, tek hamlede kesip atacak kadar ustaca bilenmiş bir alete aitti.", type: "forensic", isBonus: false },
      { id: "c3", text: "Yanında taşıdığı ağır ticari mallar nedeniyle dar kapıdan çıkması dakikalar sürecek olan yaşlı kadının, olay anında yerinden dahi kıpırdamadığı anlaşıldı.", type: "witness", isBonus: false },
      { id: "c4", text: "Kurbanın boyu ve cüssesi düşünüldüğünde, sadece tayin evraklarıyla seyahat eden çelimsiz bir gencin bu profesyonel kesiği açacak fiziksel gücü olamazdı.", type: "evidence", isBonus: false },
      { id: "c5", text: "Dağlık arazide çalışmaya alışkın olan yolcunun büyük çantasından sızan taze kan kokusu, kullandığı ağır teçhizatın kısa süre önce aceleyle yıkandığını ele veriyordu.", type: "forensic", isBonus: true },
      { id: "c6", text: "Şoförün boşaltılmış nakit cüzdanı, yolculuk başında 'paramı geri ver' diye bağıran iri yarı işçinin çamurlu botlarının hemen dibinde bulundu.", type: "evidence", isBonus: true },
    ],
    solvabilityMeta: {
      freeEliminations: ["s1", "s2", "w2", "w3", "l2", "l3"],
      bonusEliminations: [],
    },
    solution: { suspectId: "s3", weaponId: "w1", locationId: "l1" },
  },
  {
    id: "ramazan-gecesi-cinayeti",
    title: "Ramazan Gecesi Cinayeti",
    difficulty: "baskomiser",
    dayIndex: 41,
    story:
      "Konya'da tarihi bir hanın sahibi Lütfi Bey, sahur sonrasında odasının hemen önünde ölü bulundu. Kandiller yanıyor, kapılar kilitliydi. Katil, geceyi handa geçiren misafirlerden birisiydi.",
    suspects: [
      { id: "s1", name: "Hacı Efendi Rüstem", description: "Hac dönüşü Konya'ya uğrayan yaşlı tüccar; Lütfi Bey'den yıllar önce borç almış ama geri ödememiş.", icon: "noun-ramazan-tesbihli-adam-avatar.png" },
      { id: "s2", name: "Genç Mühendis Adnan", description: "Konya'ya iş için gelen altyapı mühendisi; Lütfi Bey'in otelini yıkımdan kurtarma talebini reddetmiş.", icon: "noun-ramazan-kapici-avatar.png" },
      { id: "s3", name: "Dul Kadın Zümrüt Hanım", description: "Konya'ya akraba ziyaretine gelen dul; Lütfi Bey'in kendisine yönelik taciz girişimini yaşadığını söylüyor.", icon: "noun-ramazan-hizmetci-kadin-avatar.png" },
    ],
    weapons: [
      { id: "w1", name: "Şam Bıçağı", description: "İnce, uzun ve her iki tarafı keskin süslü Şam bıçağı.", icon: "content-cut" },
      { id: "w2", name: "Kandil Direği", description: "Koridorda asılı kandillerden birinin ağır pirinç direği.", icon: "wb-incandescent" },
      { id: "w3", name: "Halat", description: "Han çatı katında bulunan kalın sarma halat.", icon: "link" },
    ],
    locations: [
      { id: "l1", name: "Koridor", description: "Odaların önündeki loş kandil ışıklı uzun koridor.", icon: "meeting-room" },
      { id: "l2", name: "Avlu", description: "Hanın ortasındaki açık avlu; gece boyunca bekçi dolaşıyor.", icon: "park" },
      { id: "l3", name: "Çatı Katı", description: "Han eşyalarının depolandığı üst çatı katı.", icon: "roofing" },
    ],
    clues: [
      { id: "c1", text: "Kan sıçrama desenleri, kurbanın açık hava avlusunda veya üst çatı katında saldırıya uğramadığını, doğrudan odaların dizili olduğu loş hattın tam ortasında yığıldığını gösteriyordu.", type: "evidence", isBonus: false },
      { id: "c2", text: "Yaraların derinliği ve kusursuz simetrisi, ağır bir pirinç darbesinin veya halat yanığının aksine, her iki tarafı da ustaca dövülmüş tarihi bir çeliğin eseriydi.", type: "forensic", isBonus: false },
      { id: "c3", text: "Yaşlı hacının odasından yankılanan zikir ve tespih seslerinin, sahurdan sabah ezanına kadar bir saniye bile duraksamadığı yan odadaki misafirlerce doğrulandı.", type: "witness", isBonus: false },
      { id: "c4", text: "Oteli yıkımdan kurtarma projesiyle uğraşan mühendisin kanında yüksek dozda uyku ilacı bulundu; gece boyunca derin bir uykuda olduğu tıbben kesinleşti.", type: "forensic", isBonus: false },
      { id: "c5", text: "Akşam yemeği sırasında, akraba ziyaretine gelen dul kadının masada normal bir sofra aletinden ziyade, çok daha zarif ve tehlikeli bir metali çevirdiği garsonun dikkatini çekmişti.", type: "witness", isBonus: true },
      { id: "c6", text: "Kadının yastığının altına aceleyle sıkıştırılmış bezi inceleyen polisler, kurbanın kanıyla kaplanmış o ince süslü çeliği bularak taciz iddiasının ardındaki kanlı gerçeği aydınlattı.", type: "forensic", isBonus: true },
    ],
    solvabilityMeta: {
      freeEliminations: ["s1", "s2", "w2", "w3", "l2", "l3"],
      bonusEliminations: [],
    },
    solution: { suspectId: "s3", weaponId: "w1", locationId: "l1" },
  },
  {
    id: "karanlik-senfoni",
    title: "Karanlık Senfoni",
    difficulty: "baskomiser",
    dayIndex: 42,
    story:
      "Devlet operasında sergilenen büyük eserin prömiyer gecesinde, başkemancı odasında korkunç bir şekilde can verdi. Müzik susmadı, gösteri devam etti ancak kuliste ölümcül bir oyun oynandı.",
    suspects: [
      { id: "s1", name: "Baş Soprano", description: "Gösterinin yıldızı. Narsist, sesiyle herkesi büyüleyen ancak kuliste herkesle kavgalı olan başrol.", icon: "noun-senfoni-soprano-avatar.png" },
      { id: "s2", name: "Orkestra Şefi", description: "Disiplinli ve katı. Müzikal mükemmellik için her şeyi yapabilecek takıntılı bir otorite.", icon: "noun-senfoni-seref-avatar.png" },
      { id: "s3", name: "Işık Teknisyeni", description: "Tavan arasındaki loş odalarda çalışan, sistemleri yöneten sessiz teknik personel.", icon: "noun-senfoni-teknik-avatar.png" },
      { id: "s4", name: "Eski Aktör", description: "Yıllar önce sahnelerden men edilen, tiyatro hilelerini ve sahne arkasını avucunun içi gibi bilen kin dolu oyuncu.", icon: "noun-senfoni-yonetmen-avatar.png" },
    ],
    weapons: [
      { id: "w1", name: "Tiyatro Hançeri", description: "Sahnede kullanılan ancak ucu sonradan keskinleştirilmiş dekoratif bıçak.", icon: "content-cut" },
      { id: "w2", name: "Zehirli Çiçek", description: "Tebrik için gönderilen, koklandığında solunum yollarını felç eden nadir bir botanik zehir.", icon: "science" },
      { id: "w3", name: "Piyano Teli", description: "Son derece ince, görünmez ve boyna dolandığında kemiğe kadar kesen çelik tel.", icon: "straighten" },
      { id: "w4", name: "Kum Torbası", description: "Sahne dekorlarını dengeleyen, yüksekten düşürüldüğünde anında ezerek öldüren devasa ağırlık.", icon: "fitness-center" },
    ],
    locations: [
      { id: "l1", name: "Ana Sahne", description: "Binlerce kişinin izlediği, aydınlık, devasa performans alanı.", icon: "theater-comedy" },
      { id: "l2", name: "Orkestra Çukuru", description: "Müzisyenlerin sıkışık halde çaldığı, sahnenin hemen altındaki dar platform.", icon: "music-note" },
      { id: "l3", name: "Soyunma Odası", description: "Oyuncuların hazırlandığı, aynalarla kaplı, kapısı kilitlenebilen özel kulis odası.", icon: "meeting-room" },
      { id: "l4", name: "Tavan Arası", description: "Sadece teknisyenlerin çıktığı, makaraların ve kabloların olduğu karanlık üst alan.", icon: "settings" },
    ],
    clues: [
      { id: "c1", text: "Otopsi masasında sanatçının bedeninde hiçbir zehir veya dekoratif bıçak kesiği bulunamadı; boynunda sadece kemiğe kadar inen, gözle görülmesi imkansız incelikte mikroskobik bir çelik kesiği vardı.", type: "forensic", isBonus: false },
      { id: "c2", text: "Olayın binlerce kişinin izlediği devasa performans alanında veya teknisyenlerin dolaştığı üst katlarda değil, dışarıya ses sızdırmayan kilitli ve aynalı bir odada gerçekleştiği saptandı.", type: "evidence", isBonus: false },
      { id: "c3", text: "Gösterinin narsist yıldızının, cinayet saatinde devasa sahnede arya söylediği ve binlerce çift gözün onun üzerinde olduğu reddedilemez bir gerçekti.", type: "witness", isBonus: false },
      { id: "c4", text: "Müzikal mükemmelliğe takıntılı olan eserin yöneticisi, performansın başından sonuna kadar çukurdaki platformunda baget sallamaya devam etmişti.", type: "witness", isBonus: false },
      { id: "c5", text: "Tavan arasındaki panoda çıkan sürpriz yangın alarmı yüzünden, sessiz teknik personelin tüm gece o üst odada mahsur kaldığı itfaiye loglarıyla doğrulandı.", type: "record", isBonus: true },
      { id: "c6", text: "Aynalı odanın kapı kolundaki izler, tiyatro hilelerini ve görünmez mekanizmaları kullanmakta usta olan o kin dolu eski sahne sanatçısını işaret ediyordu.", type: "forensic", isBonus: true },
    ],
    solvabilityMeta: {
      freeEliminations: ["l1", "l4", "s1", "s2", "w1", "w2", "w4"],
      bonusEliminations: ["l2", "s3"],
    },
    solution: { suspectId: "s4", weaponId: "w3", locationId: "l3" },
  },
  {
    id: "kanli-rota",
    title: "Kanlı Rota",
    difficulty: "baskomiser",
    dayIndex: 43,
    story:
      "Kapadokya'da sabahın ilk ışıklarıyla havalanan turist balonu iniş yaptığında, sepetin içinde dehşet verici bir manzara vardı. Bölgenin en büyük turizm acentası sahibi kanlar içindeydi.",
    suspects: [
      { id: "s1", name: "Rakip Pilot", description: "Maktulün en büyük ticari rakibi olan, havacılık donanımlarına çok iyi hakim agresif pilot.", icon: "noun-kanli-pilot-avatar.png" },
      { id: "s2", name: "Turist Kadın", description: "Sadece fotoğraf çekmek için orada olan, yükseklik korkusu olan sıradan bir misafir.", icon: "noun-kanli-rehber-kadin-avatar.png" },
      { id: "s3", name: "Balon Mekanikçisi", description: "Gaz tüplerinden sorumlu, elleri sürekli yağlı ve kirli olan bakım personeli.", icon: "noun-kanli-tamirci-avatar.png" },
      { id: "s4", name: "Fotoğrafçı", description: "Turistleri karadan takip eden, sürekli kamerasıyla çekim yapan güler yüzlü çalışan.", icon: "noun-kanli-fotograf-avatar.png" },
    ],
    weapons: [
      { id: "w1", name: "İşaret Fişeği", description: "Acil durumlarda gökyüzüne sıkılan, yakından ateşlendiğinde ağır yanıklar bırakan piroteknik silah.", icon: "flash-on" },
      { id: "w2", name: "Pürmüz Alevi", description: "Balonu şişirmek için kullanılan, insan bedenini saniyeler içinde kömüre çevirebilen devasa ateşleyici.", icon: "local-fire-department" },
      { id: "w3", name: "Sabotaj Bıçağı", description: "Halatları kesmek için özel tasarlanmış, tırtıklı ve son derece keskin taktiksel bıçak.", icon: "content-cut" },
      { id: "w4", name: "Paraşüt İpi", description: "Kopan parçaları bağlamak için bulunan esnek ancak boğucu ince kordon.", icon: "link" },
    ],
    locations: [
      { id: "l1", name: "Havalanma Alanı", description: "Düzinelerce balonun aynı anda kalktığı kalabalık, düz ve açık arazi.", icon: "place" },
      { id: "l2", name: "Balon Sepeti", description: "Gökyüzünde süzülen, hareket alanının santimetrelerle ölçüldüğü dar hasır sepet.", icon: "explore" },
      { id: "l3", name: "Vadi Kayalıkları", description: "Balonların alçalarak teğet geçtiği, ıssız ve sivri peri bacalarının bulunduğu arazi.", icon: "terrain" },
      { id: "l4", name: "Yakıt Deposu", description: "Yedek propan tüplerinin kilit altında tutulduğu, kimsenin uğramadığı küçük taş kulübe.", icon: "inventory" },
    ],
    clues: [
      { id: "c1", text: "Kurbanın vücudunda hiçbir alev yanığı veya piroteknik fişek izi yoktu; cinayet, kalın halatları tek hamlede biçebilecek kadar keskin, tırtıklı bir yüzeyle işlenmişti.", type: "forensic", isBonus: false },
      { id: "c2", text: "Sepet havadayken işlenen bir cinayetin kan sıçramaları hasır dokuda bulunurdu; oysa tüm adli bulgular, karadaki kilitli ve izole bir taş yapıyı işaret ediyordu.", type: "evidence", isBonus: false },
      { id: "c3", text: "Yükseklik korkusu olan sıradan misafirin, uçuş boyunca sepetin zeminine çöküp sadece fotoğraf çektiği ve hiç dışarı çıkmadığı kamera kayıtlarıyla sabitti.", type: "record", isBonus: false },
      { id: "c4", text: "Ellerinden yağ eksik olmayan bakım personelinin, olay saatinde kalabalık düzlükte başka bir turist kafilesinin sepetini onardığı düzinelerce şahitle doğrulandı.", type: "witness", isBonus: false },
      { id: "c5", text: "Yerdeki aracıyla karadan takip yapan çalışanın, GPS verilerine göre sadece sivri kayalıkların olduğu uç bölgede dolaştığı teyit edildi.", type: "record", isBonus: true },
      { id: "c6", text: "Yedek propanların tutulduğu o ıssız kulübenin kilidindeki zorlama izleri ve içerideki taktiksel teçhizat parçaları, havacılık donanımlarına hakim olan agresif rakip pilotu ele verdi.", type: "evidence", isBonus: true },
    ],
    solvabilityMeta: {
      freeEliminations: ["l1", "l2", "l3", "s2", "s3", "w1", "w2", "w4"],
      bonusEliminations: ["s4"],
    },
    solution: { suspectId: "s1", weaponId: "w3", locationId: "l4" },
  },
  {
    id: "derinlerdeki-sir",
    title: "Derinlerdeki Sır",
    difficulty: "baskomiser",
    dayIndex: 44,
    story:
      "Antalya açıklarında bir Roma batığını inceleyen dalış ekibi yüzeye çıktığında baş arkeolog aralarında yoktu. Denizin metrelerce altındaki karanlık, kusursuz bir cinayete sahne olmuştu.",
    suspects: [
      { id: "s1", name: "Kaptan", description: "Tekneyi yöneten, suya hiç girmeyen ve dalış teçhizatlarını kullanmayı bilmeyen denizci.", icon: "noun-derin-kaptan-avatar.png" },
      { id: "s2", name: "Asistan Arkeolog", description: "Maktulün bulgularını kendine mal etmek isteyen, hırslı ancak tüplü dalışta acemi araştırmacı.", icon: "noun-derin-teknisyen-avatar.png" },
      { id: "s3", name: "Usta Dalgıç", description: "Ekibin güvenliğinden sorumlu, denizin dibinde saatlerce kalabilen ve tüm ekipmanlara hakim profesyonel.", icon: "noun-derin-dalgic-avatar.png" },
      { id: "s4", name: "Tarihçi", description: "Yaşı gereği sadece güvertede not tutan, fiziksel efor gerektiren hiçbir işe karışmayan ihtiyar.", icon: "noun-derin-arkeolog-avatar.png" },
    ],
    weapons: [
      { id: "w1", name: "Zıpkın", description: "Su altında köpekbalıklarına karşı bulundurulan, fırlatıldığında vücudu delip geçen mızraklı tüfek.", icon: "sports" },
      { id: "w2", name: "Oksijen Kesintisi", description: "Tüplerdeki valfin gizlice kapatılarak kurbanın yavaşça ve acı çekerek boğulmasını sağlayan sinsi yöntem.", icon: "air" },
      { id: "w3", name: "Deniz Bıçağı", description: "Ağlara takılmamak için dalgıçların bacağına bağladığı son derece keskin alet.", icon: "content-cut" },
      { id: "w4", name: "Ağırlık Kemeri", description: "Fazladan takıldığında kurbanı hızla dibe çeken ve yüzeye çıkmasını engelleyen kurşun bloklar.", icon: "fitness-center" },
    ],
    locations: [
      { id: "l1", name: "Araştırma Teknesi", description: "Su üstündeki ana üs. Tüm personelin toplandığı geniş güverte.", icon: "directions-boat" },
      { id: "l2", name: "Kaptan Köşkü", description: "Sadece tekneyi süren kişinin bulunduğu, telsiz cihazlarıyla dolu aydınlık kamara.", icon: "explore" },
      { id: "l3", name: "Dalış Platformu", description: "Teknenin arka kısmında, suya atlanılan ve malzemelerin giyildiği ıslak metal alan.", icon: "pool" },
      { id: "l4", name: "Batık İçerisi", description: "Denizin 40 metre altındaki, zifiri karanlık, klostrofobik ve ahşap enkaz alanı.", icon: "waves" },
    ],
    clues: [
      { id: "c1", text: "Baş arkeologun dalış giysisinde zıpkın deliği veya kesik yoktu; kurbanın ciğerlerinin durumu, valflerden gelen havanın yavaş yavaş, sinsi bir şekilde kesildiğini gösteriyordu.", type: "forensic", isBonus: false },
      { id: "c2", text: "Güvertedeki tüm teçhizatlar eksiksiz ve temizdi; cinayet suyun yüzeyinde değil, denizin 40 metre altındaki o klostrofobik, zifiri karanlık ahşap enkazın içinde gerçekleşmişti.", type: "evidence", isBonus: false },
      { id: "c3", text: "Suya girmeyi hiç bilmeyen denizcinin, dalış operasyonu boyunca sadece telsiz sistemlerinin başında beklediği ve tekneyi sabit tuttuğu kanıtlandı.", type: "witness", isBonus: false },
      { id: "c4", text: "Fiziksel efordan kaçınan ihtiyar araştırmacının, oksijen tüplerini kaldıracak gücü dahi olmadığı ve tüm gün sadece not tuttuğu biliniyordu.", type: "record", isBonus: false },
      { id: "c5", text: "Henüz tüplü dalış eğitimlerini tamamlamamış olan asistanın, sadece su yüzeyindeki metal platformda ekipmanları duruladığı dalış loglarında açıkça görülüyordu.", type: "evidence", isBonus: true },
      { id: "c6", text: "Suyun 40 metre altındaki o karmaşık ve tehlikeli enkaz alanında, kurbanın arkasından sessizce süzülüp oksijen valflerini hissettirmeden kapatabilecek tek profesyonel o usta dalgıçtı.", type: "evidence", isBonus: true },
    ],
    solvabilityMeta: {
      freeEliminations: ["l1", "l2", "l3", "s1", "s4", "w1", "w3", "w4"],
      bonusEliminations: ["s2"],
    },
    solution: { suspectId: "s3", weaponId: "w2", locationId: "l4" },
  },
  {
    id: "zehirli-tuval",
    title: "Zehirli Tuval",
    difficulty: "baskomiser",
    dayIndex: 45,
    story:
      "Galata'daki ünlü bir sanat atölyesinde, ülkenin en büyük ressamı şaheserini tamamlarken ölü bulundu. Boyaların kokusuna bu kez ihanet karışmıştı.",
    suspects: [
      { id: "s1", name: "Kıskanç Çırak", description: "Ustasının gölgesinde kalmaktan nefret eden, her yeri boya içinde genç sanat öğrencisi.", icon: "noun-tuval-ressam-avatar.png" },
      { id: "s2", name: "Sanat Eleştirmeni", description: "Ressamın eserlerini sürekli kötüleyen, ellerini kirletmekten nefret eden titiz ve şık adam.", icon: "noun-tuval-galeri-avatar.png" },
      { id: "s3", name: "Model", description: "Tablo için saatlerce hareketsiz poz veren, güzel ve dikkat çekici genç kadın.", icon: "noun-tuval-koleksiyoner-avatar.png" },
      { id: "s4", name: "Galeri Sahibi", description: "Tablonun satışından milyonlar kazanacak olan, sürekli hesap kitap yapan otoriter kadın.", icon: "noun-tuval-asistan-avatar.png" },
    ],
    weapons: [
      { id: "w1", name: "Heykeltıraş Çekici", description: "Mermer yontmak için kullanılan, kafatasına vurulduğunda anında öldüren ağır tahta tokmak.", icon: "hardware" },
      { id: "w2", name: "Boya Çözücü", description: "İçkisine karıştırıldığında kalp krizini tetikleyen, tiner bazlı son derece toksik şeffaf kimyasal.", icon: "science" },
      { id: "w3", name: "Palet Bıçağı", description: "Boyaları karıştırmak için kullanılan esnek ancak boğaza saplandığında ölümcül olan ince alet.", icon: "content-cut" },
      { id: "w4", name: "Tel Çerçeve", description: "Tuvalleri asmak için kullanılan, boyna dolandığında nefesi kesen ince çelik tel.", icon: "straighten" },
    ],
    locations: [
      { id: "l1", name: "Ana Atölye", description: "Şövalyelerin bulunduğu, her tarafı boya kokan, bol ışıklı geniş çalışma alanı.", icon: "palette" },
      { id: "l2", name: "Boya Deposu", description: "Kimyasalların ve tuvallerin istiflendiği, havalandırması olmayan kilitli loş oda.", icon: "science" },
      { id: "l3", name: "Dinlenme Odası", description: "Ressamın kahvesini içtiği, deri koltukların bulunduğu temiz ve izole arka oda.", icon: "weekend" },
      { id: "l4", name: "Sergi Girişi", description: "Müşterilerin karşılandığı, resepsiyon bankosunun olduğu giriş bölümü.", icon: "store" },
    ],
    clues: [
      { id: "c1", text: "Maktulün kafatasında ezilme veya boğazında kesik yoktu; kanında tespit edilen tiner bazlı şeffaf toksin, çok güçlü bir endüstriyel çözücünün içkisine karıştırıldığını gösteriyordu.", type: "forensic", isBonus: false },
      { id: "c2", text: "Olay yeri inceleme ekipleri, cinayetin boya lekeleriyle dolu çalışma alanlarında değil, deri koltukların bulunduğu son derece temiz ve izole arka odada işlendiğini raporladı.", type: "evidence", isBonus: false },
      { id: "c3", text: "Saatlerce hareketsiz poz veren genç kadının, ressamın dikkatini dağıtmamak için şövalyelerin önünden bir saniye bile ayrılmadığı atölye asistanlarınca doğrulandı.", type: "witness", isBonus: false },
      { id: "c4", text: "Her yeri boya içindeki sanat öğrencisinin, olay saatinde havalandırması bozuk olan kilitli depoda malzemeleri düzenlediği kamera kayıtlarıyla teyit edildi.", type: "record", isBonus: false },
      { id: "c5", text: "Tablonun satışını bekleyen otoriter kadının, o saatlerde giriş bölümündeki resepsiyonda potansiyel müşterilerle hararetli bir fiyat pazarlığı yaptığı anlaşıldı.", type: "witness", isBonus: true },
      { id: "c6", text: "Temiz dinlenme odasındaki kahve fincanında bulunan şeffaf toksin damlalarının üzerinde, ellerini kirletmekten nefret eden o titiz ve şık adamın parmak izleri parlıyordu.", type: "forensic", isBonus: true },
    ],
    solvabilityMeta: {
      freeEliminations: ["l1", "l4", "s3", "s1", "w1", "w3", "w4"],
      bonusEliminations: ["l2", "s4"],
    },
    solution: { suspectId: "s2", weaponId: "w2", locationId: "l3" },
  },
];

export function getPuzzleByDayIndex(dayIndex: number): Puzzle | undefined {
  return PUZZLES.find((p) => p.dayIndex === dayIndex);
}

export function getDailyPuzzle(): Puzzle {
  const today = new Date();
  const startDate = new Date("2024-01-01");
  const daysSinceStart = Math.floor(
    (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  const puzzleIndex = daysSinceStart % PUZZLES.length;
  return PUZZLES[puzzleIndex];
}

export function getDifficultyLabel(difficulty: Difficulty): string {
  switch (difficulty) {
    case "caylak":
      return "Çaylak";
    case "dedektif":
      return "Dedektif";
    case "baskomiser":
      return "Baş Komiser";
  }
}

export function getDifficultyColor(difficulty: Difficulty): string {
  switch (difficulty) {
    case "caylak":
      return "#4CAF50";
    case "dedektif":
      return "#D4A843";
    case "baskomiser":
      return "#C8372D";
  }
}

export function getStandardClueIndices(puzzle: Puzzle): number[] {
  return puzzle.clues
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => !c.isBonus)
    .map(({ i }) => i);
}

export function isBonusClue(puzzle: Puzzle, clueIndex: number): boolean {
  return puzzle.clues[clueIndex]?.isBonus === true;
}
