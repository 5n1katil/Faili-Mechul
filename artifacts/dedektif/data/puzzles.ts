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
  icon: string;
}

export interface Weapon {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface Location {
  id: string;
  name: string;
  description: string;
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
  | "face_match";

export interface ClueYuzlesmeDialog {
  soru: string;
  cevap: string;
  yalan: boolean;
}

export interface ClueSifre {
  sifrelenmis: string;
  sifreleTuru: string;
  cozumIpucu: string;
  cozulmus: string;
  aciklama: string;
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
  yuzlesmeDialogu?: ClueYuzlesmeDialog[];
  sifre?: ClueSifre;
  phoneVerisi?: CluePhoneVerisi;
  anagramVerisi?: ClueAnagramData;
  dnaVerisi?: ClueDnaVerisi;
  timelineVerisi?: ClueTimelineVerisi;
  parmakIziVerisi?: ClueParmakIziVerisi;
  fotoVerisi?: ClueFotoVerisi;
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
      { id: "s1", name: "Nazik Hanım", description: "Konağın en yaşlı misafiri. Fiziksel olarak güçsüz olsa da etrafında olan bitene karşı son derece dikkatli ve gözlemci.", icon: "noun-nazik-hanim-avatar.png" },
      { id: "s2", name: "Cem Bey", description: "Ev sahibinin uzaktan akrabası. Boylu poslu, ağır fiziksel işleri kolayca yapabilecek kuvvette bir yapıya sahip.", icon: "noun-cem-bey-avatar.png" },
      { id: "s3", name: "Zeynep Hanım", description: "Genç ve hırslı bir davetli. Atik yapısıyla dikkat çekiyor, stres altında çok hızlı ve fevri hareket edebiliyor.", icon: "noun-zeynep-hanim-avatar.png" },
    ],
    weapons: [
      { id: "w1", name: "Makas", description: "Et ve kemik parçalamak için tasarlanmış, tek hamlede derin yara açabilen ağır ve keskin mutfak aleti.", icon: "content-cut" },
      { id: "w2", name: "Kimyasal", description: "Renksiz ve kokusuz bir endüstriyel çözücü. Yiyecek veya içeceklere karıştırıldığında fark edilmesi imkansız.", icon: "science" },
      { id: "w3", name: "İp", description: "Ağır perdeleri ve dekorasyonları asmak için kullanılan, kalın ve oldukça sağlam kenevir halat.", icon: "gesture" },
    ],
    locations: [
      { id: "l1", name: "Kütüphane", description: "Kalın duvarları ve ağır meşe kapısı sayesinde dışarıya veya içeriye hiçbir sesin sızmadığı izole çalışma alanı.", icon: "menu-book" },
      { id: "l2", name: "Bahçe", description: "Konağın etrafını saran açık alan. Loş aydınlatması sayesinde kuytu köşelerde rahatça gizlenme imkanı sunuyor.", icon: "yard" },
      { id: "l3", name: "Mutfak", description: "Yerleri genellikle nemli ve kaygan olan, içinde onlarca tehlikeli aletin bulunduğu arka cephedeki hazırlık alanı.", icon: "soup-kitchen" },
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
      { id: "s1", name: "Kaptan Levent", description: "Geminin deneyimli kaptanı. Fiziksel olarak oldukça yapılı ve ağır nesneleri kolayca savurabilecek kuvvette.", icon: "noun-kaptan-levent-avatar.png" },
      { id: "s2", name: "Sponsor Murat", description: "Partinin zengin finansörü. İnce yapılı; ağır fiziksel güç gerektiren işlere ve kirli ortamlara hiç alışkın değil.", icon: "noun-sponsor-murat-avatar.png" },
      { id: "s3", name: "Organizatör Eda", description: "Serginin sorumlusu. Çevik, esnek ve geminin en dar, gizli alanlarında bile rahatça hareket edebilecek fiziksel yapıda.", icon: "noun-organizator-eda-avatar.png" },
    ],
    weapons: [
      { id: "w1", name: "Gemi Halatı", description: "Gemiyi iskeleye bağlamak için kullanılan kalın sentetik ip. Çok sağlam ve kıvrılabilen esnek bir yapıya sahip.", icon: "all-inclusive" },
      { id: "w2", name: "Demir Çekiç", description: "Ağır bakım ve onarım aleti. Ciddi bir fiziksel kütleye sahip, tek vuruşta kemik kırabilen paslanmaz çelik donanım.", icon: "hardware" },
      { id: "w3", name: "Gaz Tüpü", description: "Basınçlı endüstriyel tüp. Kapalı bir alanda sızıntı yapması durumunda ortamdaki oksijeni tüketerek zehirleyici olabilir.", icon: "propane-tank" },
    ],
    locations: [
      { id: "l1", name: "Makine Dairesi", description: "Geminin en alt katında yer alan, zemini makine yağıyla kaplı, gürültülü, dar ve gözden uzak teknik alan.", icon: "settings" },
      { id: "l2", name: "Seyir Köprüsü", description: "En üst katta yer alan, geminin yönlendirildiği sürekli kameralarla izlenen aydınlık ve güvenli yönetim merkezi.", icon: "explore" },
      { id: "l3", name: "VIP Salon", description: "Misafirlerin ağırlandığı, beyaz halılarla kaplı, aydınlık, temiz ve oldukça geniş eğlence alanı.", icon: "star" },
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
      { id: "s1", name: "Ahmet Usta", description: "Komşu bakırcı esnaf. Otuz yıllık tecrübesiyle çarşının her köşesini ezbere bilen, kendi dükkanından çıkmayan geleneksel usta.", icon: "noun-ahmet-usta-avatar.png" },
      { id: "s2", name: "Selma Teyze", description: "Çarşının saygın ve yaşlı muhasebecisi. Rakamlar konusunda hata yapmaz ancak teknolojik cihazlar ve şifrelerle arası hiç iyi değildir.", icon: "noun-selma-teyze-avatar.png" },
      { id: "s3", name: "Kerem Genç", description: "Stajyer olarak son ay işe başlayan, dijital şifreleme ve kilit teknolojilerine son derece yatkın, meraklı genç çalışan.", icon: "noun-kerem-genc-avatar.png" },
    ],
    weapons: [
      { id: "w1", name: "Ağır Terazi", description: "Kuyumcu terazisinin tunç kefesi, hassas ölçümler için kullanılan ancak birkaç kilogram ağırlığında katı bir cisim.", icon: "balance" },
      { id: "w2", name: "Kimyasal Madde", description: "Altın eritme sürecinde kullanılan, deriyle temas halinde ölümcül yanıklara yol açan asit bazlı aşındırıcı çözelti.", icon: "science" },
      { id: "w3", name: "Pençe Anahtar", description: "Kalın çelik kapıları ve kilitleri zorlamak, bükmek için kullanılan, kilit mekanizmalarında derin izler bırakan ağır alet.", icon: "build" },
    ],
    locations: [
      { id: "l1", name: "Dükkan İçi", description: "Vitrinlerin ve kasanın bulunduğu, doğrudan sokağı ve dışarıdan geçenleri gören geniş aydınlık müşteri alanı.", icon: "store" },
      { id: "l2", name: "Arka Depo", description: "Sadece karmaşık elektronik bir şifreyle girilebilen, altınların saklandığı penceresiz, yalıtımlı güvenlik odası.", icon: "inventory" },
      { id: "l3", name: "Çarşı Koridoru", description: "Kepenkler kapandıktan sonra sadece gece bekçilerinin devriye gezdiği, yüzlerce yıllık kıvrımlı taş yürüyüş yolları.", icon: "route" },
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
      { id: "s1", name: "Prof. Kahraman", description: "Son derece rekabetçi ve sert mizaçlı, tüm gününü sadece evrak dolu odasında makale yazarak geçiren kıdemli akademisyen.", icon: "noun-prof-kahraman-avatar.png" },
      { id: "s2", name: "Asistan Elif", description: "Gecelerini araştırmalara adayan, projenin tüm teknik altyapısına ve voltaj düzeneklerine hakim hırslı doktora öğrencisi.", icon: "noun-asistan-elif-avatar.png" },
      { id: "s3", name: "Güvenlik Görevlisi", description: "Sadece gece vardiyasında çalışan, teknik bilgisi olmayan, binaların fiziksel devriye kontrollerini yapan personel.", icon: "noun-guvenlik-gorevlisi-avatar.png" },
    ],
    weapons: [
      { id: "w1", name: "Elektrik Çarpması", description: "Deney cihazlarının yüksek voltajlı kablolarının kasıtlı olarak birleştirilmesiyle oluşturulan ani ve ölümcül kısa devre.", icon: "flash-on" },
      { id: "w2", name: "Kimyasal Gaz", description: "Tüplerden sızdırıldığında kapalı ortamda birikebilen, solunum yollarını tahrip eden tehlikeli ve boğucu bileşik.", icon: "air" },
      { id: "w3", name: "Keskin Nesne", description: "Masanın üzerindeki cam bölmelerden koparılmış, damarları tek hamlede kesebilecek kadar sivri kırık bir parça.", icon: "content-cut" },
    ],
    locations: [
      { id: "l1", name: "Laboratuvar", description: "Çeşitli deney düzeneklerinin, yüksek voltajlı prizlerin ve kimyasal tüplerin bulunduğu tam donanımlı araştırma odası.", icon: "science" },
      { id: "l2", name: "Ofis", description: "Yığınla dosya, basılı evrak ve standart bilgisayar ekranlarıyla dolu olan klasik, tehlikesiz akademisyen çalışma odası.", icon: "business" },
      { id: "l3", name: "Koridorlar", description: "Gece yarısı tamamen ıssızlaşan, sadece devriye personelinin geçtiği, güvenlik kameralarıyla izlenen uzun geçitler.", icon: "route" },
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
      { id: "s1", name: "Müşteri Hanım", description: "Yıllardır her pazar alışverişe gelen, elindeki bastonuyla çarşıyı adımlayan yaşlı müdavim.", icon: "noun-pazar-musteri-hanim" },
      { id: "s2", name: "Tedarikçi Genç", description: "Ağır tepsileri taşıyan, yorgunluktan gözleri kanlanmış, aceleci depo görevlisi.", icon: "noun-pazar-tedarikci-genc" },
      { id: "s3", name: "Komşu Satıcı", description: "Kendi alanında müşteri beklerken gözlerini yan taraftan ayırmayan rakip esnaf.", icon: "noun-pazar-komsu-satici" },
    ],
    weapons: [
      { id: "w1", name: "Baklava", description: "Üzeri fıstıklarla süslenmiş, taze görünümüyle iştah açan ünlü pazar tatlısı.", icon: "cake" },
      { id: "w2", name: "Şerbet", description: "Büyük bakır güğümde kaynatılmış, berrak ve yoğun şekerli geleneksel sıvı.", icon: "local-drink" },
      { id: "w3", name: "Kimyasal Madde", description: "Zemin temizliğinde kullanılan, keskin kokulu endüstriyel çözücü.", icon: "science" },
    ],
    locations: [
      { id: "l1", name: "Tezgah", description: "Tepsilerin dizildiği, şerbetin damladığı ve müşterilerin alışveriş yaptığı ana satış noktası.", icon: "store" },
      { id: "l2", name: "Ara Sokak", description: "Müşterilerin kestirme olarak kullandığı, dükkanların arka kapılarına açılan loş yaya geçidi.", icon: "turn-right" },
      { id: "l3", name: "Park", description: "Sabah erken saatlerde araçların mal indirdiği, satış alanlarına oldukça uzak nokta.", icon: "local-parking" },
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
      { id: "s1", name: "Küratör Bey", description: "Müzenin yöneticisi. Eserlerin tarihini çok iyi bilir ancak pratik restorasyon işlemleri ve kimyasallar konusunda hiçbir yetkinliği yoktur.", icon: "noun-muzede-kurat-avatar.png" },
      { id: "s2", name: "Restoratör Hanım", description: "Hasar görmüş eserleri hassas sivri aletler ve sıvılarla onaran, depolara giriş izni olan kapalı kapılar ardında çalışan uzman.", icon: "noun-muzede-rehber-avatar.png" },
      { id: "s3", name: "Ziyaretçi Rehberi", description: "Gündüzleri vitrinlerin önünde turlar düzenleyen, güvenli alanların dışına çıkma yetkisi olmayan sosyal alan görevlisi.", icon: "noun-muzede-bekci-avatar.png" },
    ],
    weapons: [
      { id: "w1", name: "Uyutucu İğne", description: "Deriye temas ettiği an hızla kana karışıp anında etki eden güçlü anestezik sıvı içeren medikal şırınga.", icon: "vaccines" },
      { id: "w2", name: "Sergi Kaidesi", description: "Vitrinlerin altında bulunan, kafaya isabet ettiğinde felaket yaratan ancak yerinden kıpırdatması çok zor olan ağır mermer destek.", icon: "construction" },
      { id: "w3", name: "Kimyasal Sprey", description: "Havaya sıkıldığında nefes borusunu yakarak geçici felç ve körlük yaratan, genze dolan yoğun kimyasal gaz karışımı.", icon: "air" },
    ],
    locations: [
      { id: "l1", name: "Sergi Salonu", description: "Bizans ve Osmanlı eserlerinin ziyaretçilere sunulduğu, cam vitrinlerin bulunduğu, oldukça aydınlık ve geniş salon.", icon: "museum" },
      { id: "l2", name: "Depolama Odası", description: "Sadece özel yetkili personelin şifreyle girebildiği, restorasyon bekleyen eserlerin tutulduğu penceresiz kilitli oda.", icon: "storage" },
      { id: "l3", name: "Güvenlik Odası", description: "Tüm müzenin kamera görüntülerinin canlı izlendiği, monitörlerle ve telsizlerle dolu, sürekli personelin bulunduğu kontrol merkezi.", icon: "security" },
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
      { id: "s1", name: "Emekli Albay", description: "Sabahları erken uyanıp yürüyüş yapan, disiplinli ve sert mizaçlı villa komşusu.", icon: "noun-emekli-albay-avatar" },
      { id: "s2", name: "Ressam Leyla", description: "Bütün yazını adada manzara resimleri çizerek geçiren, sessiz ve içine kapanık sanatçı.", icon: "noun-ressam-leyla-avatar" },
      { id: "s3", name: "Genç Yatçı", description: "Özel sürat teknesiyle adaya yeni gelen, fevri hareketleri olan gizemli misafir.", icon: "noun-genc-yatci-avatar" },
    ],
    weapons: [
      { id: "w1", name: "Av Tüfeği", description: "Dolapta saklanan, yakından ateşlendiğinde korkunç ses çıkaran çift namlulu ateşli silah.", icon: "sports" },
      { id: "w2", name: "Zehir", description: "Doğal bitkilerden elde edilen, yiyeceklere karıştırılan sinsi bitki toksini.", icon: "science" },
      { id: "w3", name: "Gemi Halatı", description: "Tekneleri iskeleye bağlamak için kullanılan, son derece sağlam ve kalın denizci ipi.", icon: "all-inclusive" },
    ],
    locations: [
      { id: "l1", name: "Villa Bahçesi", description: "Akdeniz bitkileri ve yüzme havuzuyla süslü, dışarıdan izole edilmiş geniş peyzaj alanı.", icon: "park" },
      { id: "l2", name: "Sahil Şeridi", description: "Deniz dalgalarının vurduğu, insanların yürüyüş yaptığı uzun sahil yolu.", icon: "waves" },
      { id: "l3", name: "Kayalık", description: "Adanın güney ucundaki, manzarası güzel ancak uçurum kenarında yer alan sarp alan.", icon: "terrain" },
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
      { id: "s1", name: "İş Kadını", description: "Sürekli evrak çantasıyla gezen, gergin, sabırsız ve hassas işlemlere eli hiç yatkın olmayan birinci mevki yolcusu.", icon: "noun-tren-kadin-yolcu-avatar.png" },
      { id: "s2", name: "Üniversite Öğrencisi", description: "Kulağında kulaklıkla kendi odasından hiç çıkmayan, etrafındaki insanlarla sıfır etkileşim kuran ucuz biletli genç yolcu.", icon: "noun-tren-genc-yolcu-avatar.png" },
      { id: "s3", name: "Emekli Doktor", description: "Anatomik bilgiye sahip, yanında sürekli çeşitli sıvılar ve aletlerin bulunduğu küçük tıbbi çantalar taşıyan sakin yaşlı yolcu.", icon: "noun-tren-doktor-avatar.png" },
    ],
    weapons: [
      { id: "w1", name: "Zehirli İçecek", description: "Bardağa damlatıldığında doğrudan kalp krizini tetikleyen, fark edilmesi imkansız renksiz ve tatsız tıbbi sıvı.", icon: "local-bar" },
      { id: "w2", name: "Kesici Silah", description: "Hareketli trende saklaması kolay, doğru açıdan vurulduğunda tek hamlede derin yara açan küçük çakı bıçağı.", icon: "content-cut" },
      { id: "w3", name: "Boğma Halatı", description: "Bavuldan çıkarılan, kurbanın arkasından boyuna dolandığında mekanik baskıyla nefesi anında kesen ince naylon ip.", icon: "fiber-manual-record" },
    ],
    locations: [
      { id: "l1", name: "Kompartıman", description: "Sadece kendi biletli yolcusunun girebildiği dar, dört kişilik ahşap bölmeli, kapısı kapalı özel konaklama odası.", icon: "train" },
      { id: "l2", name: "Yemekli Vagon", description: "Beyaz örtülü masaların bulunduğu, çay servisinin yapıldığı, herkesin girip çıkabildiği ortak ve geniş oturma alanı.", icon: "restaurant" },
      { id: "l3", name: "Tuvalet", description: "Trenin en arka bölümünde yer alan, içeriden mandalla kilitlenebilen, oldukça küçük ve dar ihtiyaç alanı.", icon: "wc" },
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
      { id: "s1", name: "Veznedar", description: "Hamamın girişinden, soyunma dolaplarından ve hesaplardan sorumlu genç görevli.", icon: "noun-receptionist-1574384" },
      { id: "s2", name: "Hamam Ağası", description: "Tarihi hamamın işletmecisi. Önemli konuklarla ve hamamın genel düzeniyle bizzat ilgilenen otoriter figür.", icon: "noun-teacher-1908918-avatar.png" },
      { id: "s3", name: "Tellak", description: "Yılların tecrübesine sahip, göbek taşında kese atan, son derece güçlü kollara sahip emektar çalışan.", icon: "noun-driver-1574358-avatar.png" },
    ],
    weapons: [
      { id: "w1", name: "Acı Sabun", description: "Ağır kimyasallar içeren, yanlış kullanımda solunum yollarını tıkayıp zehirleyebilen özel yapım sabun.", icon: "wash" },
      { id: "w2", name: "Zehirli Şerbet", description: "Maktulün dinlenirken içtiği, içine kalbi anında durduran güçlü bir bitkisel zehir karıştırılmış içecek.", icon: "medication" },
      { id: "w3", name: "Çıplak El", description: "Hiçbir alet kullanmadan, acımasız ve doğrudan uygulanan ölümcül fiziksel boğma gücü.", icon: "front-hand" },
    ],
    locations: [
      { id: "l1", name: "Sıcak Oda", description: "Yoğun buharlı, göbek taşının bulunduğu, göz gözü görmeyen ve nefes almanın zor olduğu mermer yıkanma alanı.", icon: "spa" },
      { id: "l2", name: "Soğuk Oda", description: "Müşterilerin hamam sonrası peştamallarla uzanıp dinlendiği, şerbet servisinin yapıldığı serin bölüm.", icon: "ac-unit" },
      { id: "l3", name: "Giriş Salonu", description: "Hamamın ana kapısı, ahşap soyunma kabinlerinin ve kasanın bulunduğu aydınlık alan.", icon: "point-of-sale" },
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
      { id: "s1", name: "Galeri Direktörü", description: "Tüm organizasyonu yöneten, güvenlik protokollerini teorik olarak bilen ancak fiziksel müdahale yeteneği olmayan yönetici.", icon: "noun-sabanci-erkek-misafir-avatar.png" },
      { id: "s2", name: "Ünlü Sanatçı", description: "Gala konuğu. Kaprisli, şımarık görünen ancak teknolojik sanat enstalasyonları sayesinde elektronik sistemlere son derece hakim figür.", icon: "noun-sabanci-kadin-misafir-avatar.png" },
      { id: "s3", name: "Güvenlik Şefi", description: "Müze güvenliğinden sorumlu, kaslı ve iri yarı eski bir asker. Kameraların kör noktalarını ezbere biliyor.", icon: "noun-sabanci-guvenlik-avatar.png" },
      { id: "s4", name: "Nakliyeci", description: "Eserleri taşıyan lojistik sorumlusu. Sadece yükleme alanlarına erişimi olan, kaba kuvvet gerektiren işlere alışkın işçi.", icon: "noun-sabanci-sergi-gorevlisi-avatar.png" },
    ],
    weapons: [
      { id: "w1", name: "Elektrik Sopası", description: "Yüksek voltajlı deşarj yaparak kurbanı anında felç eden ve bayıltan, teknolojik ve sessiz bir silah.", icon: "flash-on" },
      { id: "w2", name: "Kimyasal Sprey", description: "Geniş alanlarda bile herkesi etkileyen, havaya karıştığında gözleri kör eden yoğun biber gazı karışımı.", icon: "air" },
      { id: "w3", name: "Demir Çubuk", description: "Güvenlik kapılarını kanırtmak ve kırmak için kullanılan, ağır, kaba ve son derece gürültülü levye.", icon: "hardware" },
      { id: "w4", name: "Uyutucu", description: "Sadece damar içi enjeksiyonla verilebilen, kurbanın kollarında iğne izi bırakan medikal sedatif.", icon: "vaccines" },
    ],
    locations: [
      { id: "l1", name: "Sergi Salonu", description: "Osmanlı mücevherlerinin sergilendiği, kalabalık, aydınlık ve her köşesi izlenen ana etkinlik alanı.", icon: "museum" },
      { id: "l2", name: "Güvenlik Merkezi", description: "Kamera panellerinin ve alarm sunucularının bulunduğu, sadece yetkili elektronik kartla girilebilen izole oda.", icon: "security" },
      { id: "l3", name: "Depo", description: "Sergilenmeyecek eserlerin muhafaza edildiği, tozlu, loş ve kaba kuvvetle açılabilen arka saklama alanı.", icon: "inventory" },
      { id: "l4", name: "Çıkış Noktası", description: "Müzenin arkasında nakliye araçlarının yanaştığı, rüzgarlı ve açık havaya bakan mal kabul alanı.", icon: "exit-to-app" },
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
      { id: "s1", name: "Muhalefet Adayı", description: "Başkanın siyasi rakibi. Makam odasına girmesi yasak olan, sadece resmi toplantılarda binaya adım atabilen figür.", icon: "👨" },
      { id: "s2", name: "Sekreter Bayan", description: "Yıllardır başkanın sağ kolu olan, içecek servisinden randevulara kadar makam odasına sürekli girip çıkma yetkisi olan çalışan.", icon: "👩" },
      { id: "s3", name: "İnşaat Müteahhit", description: "Belediyeyle ihale anlaşmazlığı yaşayan, başkanla özel görüşme talep eden ancak ofis alanlarına alınmayan öfkeli iş adamı.", icon: "👷" },
    ],
    weapons: [
      { id: "w1", name: "Ağır Kağıt Ağırlığı", description: "Masanın üzerindeki süslü ağır cam ağırlık; kafaya vurulduğunda kanamalı kafa travması yaratacak kütleye sahip.", icon: "square" },
      { id: "w2", name: "Zehirli Kahve", description: "Her sabah hazırlanan kişisel içeceğin içine karıştırılan, yutulduğu anda mideyi kilitleyen sinsi ve kokusuz toksin.", icon: "coffee" },
      { id: "w3", name: "Elektrik Çarpması", description: "Ofis ekipmanının fişlerinde yapılan kasıtlı sabotaj; dokunan kişide ağır deri yanıkları ve ani kalp durması yaratır.", icon: "flash-on" },
    ],
    locations: [
      { id: "l1", name: "Belediye Ofisi", description: "Sadece başkanın ve en yakın personelinin erişebildiği, büyük deri koltukların bulunduğu gösterişli özel makam odası.", icon: "business" },
      { id: "l2", name: "Toplantı Odası", description: "Kalabalık delegasyonların ağırlandığı, uzun oval masalı, çok sayıda insanın girip çıktığı resmi toplanma alanı.", icon: "groups" },
      { id: "l3", name: "Koridor", description: "Ofislerin önünde yer alan, güvenlik kameralarıyla 7/24 izlenen, ziyaretçilerin bekletildiği geniş bekleme geçidi.", icon: "route" },
    ],
    clues: [
      { id: "c1", text: "Adli tabip raporu, maktulde ağır bir cam objeyle yaratılabilecek kafatası travması veya elektrik panosundan kaynaklı bir yanık olmadığını; ölümün sinsi ve kokusuz bir toksinin yutulmasıyla gerçekleştiğini kanıtladı.", type: "forensic", isBonus: false },
      { id: "c2", text: "Kriminal inceleme, cinayetin güvenlik kameralarıyla izlenen geniş koridorlarda veya kalabalık delegasyonların ağırlandığı toplantı odasında değil; doğrudan kurbanın özel deri koltuğunda işlendiğini belirledi.", type: "evidence", isBonus: false },
      { id: "c3", text: "Belediyeyle ihale anlaşmazlığı yaşayan öfkeli müteahhitin, o sabah ofis katına hiç alınmadığı ve sadece bekleme geçidinde volta attığı turnike loglarıyla doğrulandı.", type: "record", isBonus: false },
      { id: "c4", text: "Siyasi rakiplerin odaya yaklaşmasının yasak olduğu bilindiğinden, muhalefet adayının o kritik saatlerde binanın dışında gazetecilere demeç verdiği canlı yayın kayıtlarıyla ispatlandı.", type: "evidence", isBonus: false },
      { id: "c5", text: "Başkanın özel odasına her sabah rutin olarak kişisel içecek getirme yetkisine ve güvenine sahip olan tek kişi, onun yıllardır sağ kolu olan kadındı.", type: "evidence", isBonus: true },
      { id: "c6", text: "Başkanın masasındaki o şık fincanın dibinde kalan toksin kalıntıları ile sekreterin masasından eksilen temizlik solventinin kimyasal profili birebir eşleşiyordu.", type: "forensic", isBonus: true },
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
      "Ankara'nın serin bir sonbahar akşamında, binlerce kişinin coşkuyla izlediği folklor festivalinin baş koordinatörü sahnede aniden yere yığıldı. Rengarenk ışıkların altında yaşanan bu trajedi, sahne arkasındaki karanlık rekabetin üzerindeki perdeyi kaldırdı.",
    suspects: [
      { id: "s1", name: "Rakip Sanatçı", description: "Aynı gruba üye olmak istiyordu", icon: "face" },
      { id: "s2", name: "Ses Teknikeri", description: "Sahne arkasında çalışıyor", icon: "support-agent" },
      { id: "s3", name: "Sponsorların Temsilcisi", description: "Bütçe tartışması yaşanmıştı", icon: "account-circle" },
    ],
    weapons: [
      { id: "w1", name: "Zehirli Su", description: "Su şişesine karıştırılan renksiz kimyasal madde", icon: "water-drop" },
      { id: "w2", name: "Elektrik Darbesi", description: "Sahne ekipmanı üzerinden iletilen yüksek voltaj", icon: "flash-on" },
      { id: "w3", name: "Gizli Enjeksiyon", description: "İnce iğneyle kalabalıkta fark edilmeden uygulanan enjeksiyon", icon: "vaccines" },
    ],
    locations: [
      { id: "l1", name: "Sahne", description: "Festival meydanındaki açık hava performans sahnesi", icon: "theater-comedy" },
      { id: "l2", name: "Soyunma Odası", description: "Sanatçıların kostüm değiştirdiği arka oda", icon: "room" },
      { id: "l3", name: "Kontrol Odası", description: "Ses ve ışık düzeneklerinin yönetildiği teknik oda", icon: "settings" },
    ],
    clues: [
      {
        id: "c1",
        text: "Kriminal ekiplerin raporuna göre; cesette hiçbir zehir veya iğne izine rastlanmadı, kurbanın kasları devasa bir voltaj dalgasıyla kasılarak kilitlenmişti.",
        type: "forensic",
        isBonus: false,
      },
      {
        id: "c2",
        text: "Açık hava sahnesindeki tüm kablo ve jeneratör bağlantılarının kasıtlı olarak soyulduğu, cinayetin soyunma odaları veya kontrol merkezinde değil, doğrudan performans alanında işlendiği saptandı.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c3",
        text: "Aynı gruba üye olmak için yanıp tutuşan rakip sanatçının, festival boyunca sadece ses ve ışık panellerinin bulunduğu teknik odada bekletildiği kameralarca doğrulandı.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c4",
        text: "Bütçe tartışmaları yüzünden öfkeli olan sponsor temsilcisinin, olay saatinden çok önce VIP soyunma odasında müzisyenlerle toplantı yapıp mekândan ayrıldığı log kayıtlarıyla kesinleşti.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c5",
        text: "Sahneye giden ana akım hattında, sadece profesyonel bir teknik personelin yapabileceği kusursuz bir 'kısa devre' köprüsü kurulmuştu.",
        type: "evidence",
        isBonus: true,
      },
      {
        id: "c6",
        text: "Elektrik panosunun iç yüzeyinde, sahne arkasının tüm teknik işleyişinden sorumlu olan teknisyenin izole eldivenlerine ait taze yanık izleri tespit edildi.",
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
      { id: "s1", name: "Kütüphaneci", description: "30 yıllık emektarı", icon: "👴" },
      { id: "s2", name: "Doktora Öğrencisi", description: "El yazmalarını araştırıyordu", icon: "👨" },
      { id: "s3", name: "Temizlik Görevlisi", description: "Gece 02.00'de çalışıyor", icon: "👷" },
    ],
    weapons: [
      { id: "w1", name: "Ağır Kitap", description: "Ansiklopedik cilt, yaklaşık iki kilogram ağırlığında", icon: "menu-book" },
      { id: "w2", name: "Kimyasal Madde", description: "Cilt restorasyon sürecinde kullanılan güçlü solüsyon", icon: "science" },
      { id: "w3", name: "Baskı Aleti", description: "El yazması kopyalamak için kullanılan antika baskı presi", icon: "print" },
    ],
    locations: [
      { id: "l1", name: "Okuma Salonu", description: "Ahşap uzun masalar ve okuma lambalarıyla dolu sessiz salon", icon: "library-books" },
      { id: "l2", name: "El Yazmaları Bölümü", description: "Yüzlerce yıllık belgelerin özel korumalı depolandığı bölüm", icon: "history-edu" },
      { id: "l3", name: "Katalog Odası", description: "Kütüphane kataloğunun ve arşiv dosyalarının tutulduğu oda", icon: "folder" },
    ],
    clues: [

      {
        id: "c1",
        text: "Kan sıçrama analizleri, saldırının okuma lambalarıyla dolu salonda veya arşiv dosyalarının tutulduğu odada değil, doğrudan özel korumalı asırlık belgelerin bulunduğu bölümde yapıldığını gösterdi.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c2",
        text: "Maktulün kafatasındaki derin ve geniş ezilme izi, keskin bir antika baskı aleti veya bir kimyasal tahribatı değil; kütlesi çok ağır ve düz yüzeyli devasa bir nesneyi işaret ediyordu.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c3",
        text: "Otuz yıllık emektar kütüphanecinin, gece boyunca sadece okuma salonunda raf toparlaması yaptığı ve saat 23.00'te binadan ayrıldığı elektronik kart okuyucularıyla doğrulandı.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c4",
        text: "Temizlik görevlisinin olay gecesi saat 02.00 civarında sadece katalog odasında çalıştığı ve el yazmaları bölümünün şifresine sahip olmadığı güvenlik loglarında teyit edildi.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c5",
        text: "Kayıp el yazmalarını haftalardır takıntılı bir şekilde araştıran akademisyenin masasındaki yaklaşık iki kilogramlık ansiklopedik cilt kayıptı.",
        type: "forensic",
        isBonus: true,
      },
      {
        id: "c6",
        text: "Gece nöbetçisi, el yazmaları bölümünün önünden geçerken doktora öğrencisini panik halinde çıkarken gördüğünü yeminli ifadesinde kayda geçirdi.",
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
      { id: "s1", name: "Yerli Balıkçı", description: "Otelin açılmasına karşıydı", icon: "👴" },
      { id: "s2", name: "Tur Rehberi", description: "Konukseverlik sektörü rakibi", icon: "👨" },
      { id: "s3", name: "Mülk Sahibi", description: "Arazi anlaşmazlığı var", icon: "👨‍💼" },
      { id: "s4", name: "Aşçı", description: "Kovulma korkusu yaşıyordu", icon: "👨‍🍳" },
    ],
    weapons: [
      { id: "w1", name: "Balıkçı Bıçağı", description: "Balık ayıklamak için kullanılan uzun ve dar bıçak", icon: "content-cut" },
      { id: "w2", name: "Kayalık", description: "Sahil kayalıklarından kopan parça ya da duvara çarpma", icon: "landscape" },
      { id: "w3", name: "Zehirli İçki", description: "Yerel rakıya karıştırılan tehlikeli kimyasal madde", icon: "local-bar" },
      { id: "w4", name: "İp", description: "Teknelerde kullanılan kalın ve dayanıklı bağlama ipi", icon: "fiber-manual-record" },
    ],
    locations: [
      { id: "l1", name: "Sahil Kenarı", description: "Küçük ahşap teknelerin bağlı olduğu ıssız sahil", icon: "waves" },
      { id: "l2", name: "Otel Mutfağı", description: "Taze deniz ürünleriyle dolu, daima işlek mutfak", icon: "restaurant" },
      { id: "l3", name: "Kayalık Burun", description: "Adanın burnunda uzanan, sarp ve tehlikeli kayalık", icon: "terrain" },
      { id: "l4", name: "Otel Lobisi", description: "Deniz manzaralı pencerelerin bulunduğu ahşap dekorlu lobi", icon: "hotel" },
    ],
    clues: [
      {
        id: "c1",
        text: "Kurbanın ayakkabı tabanlarındaki derin çizikler ve ceketine bulaşan keskin deniz yosunu sporları, olayın ahşap zeminli kapalı alanlarda değil, adanın sarp ve yıpratıcı ucunda yaşandığını fısıldıyordu.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c2",
        text: "Maktulün kafatasındaki devasa ve düzensiz ezilme, elde taşınabilen bir aletten ziyade, yüksek hızla ivmelenerek doğadaki sert ve sabit bir kütleye çarpmanın sonucuydu.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c3",
        text: "Otel mutfağındaki fırınların gece boyunca hiç kapanmadığı ve peş peşe çıkan sipariş fişlerinin altındaki ıslak imzalar, o ateşin başındaki kişinin dışarı adım atamayacağını gösteriyordu.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c4",
        text: "Rehberin otobüs biletindeki zaman damgası ve valizindeki şehir tozu, onun o kritik saatlerde adanın çamurlu ve sarp arazilerine henüz ulaşmadığını kanıtlıyordu.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c5",
        text: "Kıyıdaki eski ahşap teknenin yanında bulunan yırtık ağlar ve taze zift lekeleri, yaşlı balıkçının tüm gece boyunca kendi ekmek teknesini onarmakla meşgul olduğunu belgeliyordu.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c6",
        text: "Kurbanın tırnak diplerinde, sadece otel inşaatı yüzünden davalık olduğu o arsanın sınırlarını belirleyen özel mülk çitlerine ait paslı demir tozları bulundu.",
        type: "forensic",
        isBonus: true,
      },
      {
        id: "c7",
        text: "Uçurumun kenarındaki kaygan zemin, bir anlık öfke krizinin, bir adamı metrelerce aşağıya nasıl itebileceğinin en net resmiydi.",
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
      { id: "s1", name: "İşçi Başı", description: "Sendika temsilcisi", icon: "👷" },
      { id: "s2", name: "Muhasebe Müdürü", description: "Mali anlaşmazlık vardı", icon: "🕵️" },
      { id: "s3", name: "Makine Mühendisi", description: "Fabrikayı tasarlamıştı", icon: "👨" },
    ],
    weapons: [
      { id: "w1", name: "Çekiç", description: "Metal parçaları işlemek için kullanılan ağır demir çekiç", icon: "hardware" },
      { id: "w2", name: "Zehirli Kimyasal", description: "Makine yağıyla karıştırılan endüstriyel solvent", icon: "science" },
      { id: "w3", name: "Makine Parçası", description: "Üretim bandından sökülen ağır metal bileşen", icon: "settings" },
    ],
    locations: [
      { id: "l1", name: "Üretim Alanı", description: "Saat mekanizmalarının üretildiği büyük atölye", icon: "factory" },
      { id: "l2", name: "Müdür Odası", description: "Fabrika direktörünün kullandığı cam bölmeli ofis", icon: "business" },
      { id: "l3", name: "Kontrol Odası", description: "Üretim sürecinin izlendiği elektronik panelli oda", icon: "dashboard" },
    ],
    clues: [

      {
        id: "c1",
        text: "Adli inceleme, kurbanın zehirli bir endüstriyel kimyasalla boğulmadığını veya üretim bandından sökülen bir mekanizmayla ezilmediğini; kafatasına kaba ve ağır bir demirle vurulduğunu saptadı.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c2",
        text: "Olay yeri kanıtları, cinayetin cam bölmeli ofislerde veya elektronik panelli odada değil, doğrudan saat mekanizmalarının üretildiği gürültülü atölyenin kalbinde işlendiğini kanıtladı.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c3",
        text: "Mali kriz yüzünden maktulle anlaşmazlık yaşayan muhasebe müdürünün, olay akşamı bütçe toplantısı için şehir dışına uçtuğu havayolu loglarıyla ispatlandı.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c4",
        text: "Fabrikayı tasarlayan makine mühendisinin, cinayet saati boyunca sadece izole kontrol odasında yazılım güncellediği ağ erişim kayıtlarıyla doğrulandı.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c5",
        text: "Gece vardiyasındaki işçiler, sendika hakları yüzünden işçi başı ile fabrika müdürü arasında tam da o gürültülü üretim alanında sert bir kavga koptuğunu duyduklarını itiraf ettiler.",
        type: "forensic",
        isBonus: true,
      },
      {
        id: "c6",
        text: "Dökülen makine yağının hemen yanında bulunan ve metal işlemek için kullanılan o ağır demir çekicin sapında, işçi başına ait taze deri döküntüleri bulundu.",
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
      "Bursa'nın ünlü kaplıcalarından birinde lüks bir thermal otelde, ünlü bir şarkıcı spa alanında ölü bulundu.",
    suspects: [
      { id: "s1", name: "Otel Müdürü", description: "Finansal baskılar altında", icon: "badge" },
      { id: "s2", name: "Eski Hayranı", description: "Takıntılı bir hayran", icon: "person" },
      { id: "s3", name: "Rakip Şarkıcı", description: "Aynı gecede performans vardı", icon: "face" },
    ],
    weapons: [
      { id: "w1", name: "Boğma", description: "Islak zeminli saunada elle boyuna uygulanan güçlü baskı", icon: "back-hand" },
      { id: "w2", name: "Uyku Hapı", description: "İçeceğe karıştırılan güçlü uyku ilacı", icon: "medication" },
      { id: "w3", name: "Bıçak", description: "Spa malzemeleri arasına saklanmış küçük katlanır bıçak", icon: "content-cut" },
    ],
    locations: [
      { id: "l1", name: "Havuz Başı", description: "Termal suyun aktığı açık yüzme havuzu kenarı", icon: "pool" },
      { id: "l2", name: "Spa Odası", description: "Aromaterapi ve masaj yapılan özel kabin", icon: "spa" },
      { id: "l3", name: "Sauna", description: "Yüksek sıcaklıkta tutulan, dışarıdan kilitlenebilen sauna", icon: "whatshot" },
    ],
    clues: [
      {
        id: "c1",
        text: "sauna kapısı içeriden kilitlenmiş halde bulundu; içerideki el baskısı izi ve nem izleri cinayetin burada gerçekleştiğini, boğulmanın sauna sıcağında olduğunu gösteriyor.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c2",
        text: "havuz başının kenarında uyku hapı tozu kalıntısına rastlandı; dağılmış toz izleri kıyının yüzeyleriyle bütünleşmiş.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c3",
        text: "otel müdürü gece boyunca resepsiyondaydı; ödeme terminali ve güvenlik kamerası onu spa alanına hiç gitmeyen olarak kayıt altına aldı.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c4",
        text: "rakip şarkıcı spa odasında masaj randevusu aldırdı; giriş kartı kaydı onu o bölgeye yerleştiriyor.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c5",
        text: "otel giriş kayıtları eski hayranının sauna kabinine girdiğini ve tek başına çıktığını gösteriyor.",
        type: "evidence",
        isBonus: true,
      },
      {
        id: "c6",
        text: "rakip şarkıcı o akşam sahne programına katılmıştı; binlerce izleyici bunu doğruluyor.",
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
      { id: "s1", name: "Kafe Sahibi", description: "Politika eleştirilerinden rahatsızdı", icon: "👨" },
      { id: "s2", name: "Garson", description: "Genç ve yeni işe başlamış", icon: "👦" },
      { id: "s3", name: "Müşteri", description: "Masanın bitişiğinde oturuyordu", icon: "🧑" },
    ],
    weapons: [
      { id: "w1", name: "Zehirli Çay", description: "Demliğin içine kasıtlı olarak karıştırılan renksiz toksin", icon: "local-cafe" },
      { id: "w2", name: "Gizli Enjeksiyon", description: "Kalabalıkta fark edilmeden uygulanan ince iğne", icon: "vaccines" },
      { id: "w3", name: "Gürültü Bombası", description: "Panik yaratmak amacıyla tasarlanmış küçük patlayıcı", icon: "crisis-alert" },
    ],
    locations: [
      { id: "l1", name: "Kafe İçi", description: "Bohem tarzı dekorla süslü, müşterilerle dolu kafe", icon: "coffee" },
      { id: "l2", name: "Tuvalet", description: "Kafenin arka koridorundaki tek kişilik tuvalet", icon: "wc" },
      { id: "l3", name: "Dış Terasa", description: "Caddeden görülen açık hava oturma alanı", icon: "outdoor-grill" },
    ],
    clues: [
      {
        id: "c1",
        text: "Hastaneden gelen acil toksikoloji raporu, kurbanın derisinde bir iğne girişi olmadığını ve mekanda bir gürültü bombası patlamadığını; ölümün içeceğe katılan kokusuz bir toksinle gerçekleştiğini doğruladı.",
        type: "forensic",
        isBonus: false,
      },
      {
        id: "c2",
        text: "Cinayetin arka koridordaki izole tuvaletlerde veya dış terasta değil; müşterilerle dolu, kahve kokan iç mekanda, tam da maktulün masasında işlendiği belirlendi.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c3",
        text: "Maktulün yazılarından rahatsız olan kafe sahibinin, tüm gece boyunca sadece kasa arkasında hesaplarla uğraştığı ve servis alanına girmediği POS makinesi kayıtlarıyla onaylandı.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c4",
        text: "Bitişik masada oturan müşterinin tüm oturumu boyunca dış terasta kendi kahvesiyle ilgilendiği ve maktulün masasına hiç yaklaşmadığı dış kameralarca saptandı.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c5",
        text: "O akşam siparişleri doğrudan hazırlayan ve kurbanın demliğine dışarıdan müdahale edilmesine izin vermeden bizzat masaya taşıyan tek kişi o yeni çalışandı.",
        type: "direct",
        isBonus: true,
      },
      {
        id: "c6",
        text: "Genç garsonun mutfaktaki önlüğünde bulunan mikro toksin damlaları, o renksiz maddenin demliğe servis sırasında damlatıldığını kesin olarak kanıtlıyordu.",
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
      { id: "s1", name: "Baş Araştırmacı", description: "Kariyerini projeye adamıştı", icon: "👨" },
      { id: "s2", name: "Veri Analisti", description: "Verilere tek erişimi olan", icon: "👩" },
      { id: "s3", name: "Etik Komite Üyesi", description: "Projeye itiraz etmişti", icon: "👴" },
      { id: "s4", name: "Yazılım Mühendisi", description: "Güvenlik sistemini tasarladı", icon: "🕵️" },
    ],
    weapons: [
      { id: "w1", name: "Zehirli İğne", description: "Küçük, hızlı etki eden nörotoksin enjeksiyonu", icon: "vaccines" },
      { id: "w2", name: "Bilgisayar Şoku", description: "Bilgisayar kasasına yerleştirilen elektrik deşarjı", icon: "computer" },
      { id: "w3", name: "Kimyasal Madde", description: "Araştırma laboratuvarından alınan tehlikeli kimyasal", icon: "biotech" },
      { id: "w4", name: "Boğma", description: "Güçlü el baskısıyla boyuna uygulanan basınç", icon: "back-hand" },
    ],
    locations: [
      { id: "l1", name: "Toplantı Odası", description: "Uzun ahşap masa ve projeksiyon ekranlı sunum odası", icon: "groups" },
      { id: "l2", name: "Sunucu Odası", description: "Soğutma sistemli, kilitli veri merkezi odası", icon: "storage" },
      { id: "l3", name: "Araştırma Laboratuvarı", description: "Çeşitli bilimsel cihazların bulunduğu steril lab", icon: "science" },
      { id: "l4", name: "Güvenli Alan", description: "Biyometrik giriş sistemli üst güvenlik bölgesi", icon: "lock" },
    ],
    clues: [
      {
        id: "c1",
        text: "Kurbanın boynundaki peteşiyal kanamalar ve cilt altı morarmaları, sinsi bir kimyasaldan çok, nefesi kesmek için uygulanan uzun süreli ve acımasız bir kaba kuvveti işaret ediyordu.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c2",
        text: "Mücadele esnasında devrilen ağır meşe sandalyeler ve parçalanan projeksiyon perdesi, olayın soğutucu fan sesleriyle dolu odalarda değil, kurumun en büyük ve geniş salonunda koptuğunu kanıtlıyordu.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c3",
        text: "Yazılım mühendisinin terminalinde sabaha kadar süren kesintisiz bir kod derleme işlemi vardı; biyometrik sistemler onun steril laboratuvardan hiç çıkmadığını onayladı.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c4",
        text: "Soğutma sistemlerinin çalıştığı sunucu odasında duyulan fan gürültüleri arasında, veri analistinin manyetik kartının gece boyunca içerideki verileri kopyalamak için kullanıldığı saptandı.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c5",
        text: "Etik kurul üyesinin paltosunda bulunan dışarıya ait polenler ve turnike logları, onun toplantıdaki ilk tartışmadan hemen sonra binayı terk ettiğini mühürledi.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c6",
        text: "Kurbanın tırnak aralarından çıkan deri döküntüleri, projeyi her şeyin üstünde tutan ve o odaya son giren ekip liderinin genetik profiliyle %100 eşleşti.",
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
        text: "Maktulün ceket yakasındaki derin kırışıklıklar ve ter izleri, saldırganın onu iki eliyle ne kadar vahşice kavradığının adli bir kanıtıydı.",
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
      { id: "s1", name: "Protokol Şefi", description: "Daveti organize etti", icon: "🕵️" },
      { id: "s2", name: "Özel Aşçı", description: "Yemekleri hazırladı", icon: "👨‍🍳" },
      { id: "s3", name: "Yabancı Diplomat", description: "Elçiyle tartışma yaşandı", icon: "👨" },
      { id: "s4", name: "Saray Kütüphanecisi", description: "Davette geziniyordu", icon: "👴" },
    ],
    weapons: [
      { id: "w1", name: "Zehirli Şarap", description: "Kadehe dökülen nadide şaraba karıştırılan arsen", icon: "wine-bar" },
      { id: "w2", name: "Zehirli Yemek", description: "Servis sırasında tabağa eklenen kokusuz toksin", icon: "room-service" },
      { id: "w3", name: "Kimyasal Madde", description: "Yiyeceklere karıştırılan sentetik kimyasal bileşik", icon: "science" },
      { id: "w4", name: "Zehirli İçecek", description: "Su ya da meyve suyuna karıştırılan tehlikeli madde", icon: "local-bar" },
    ],
    locations: [
      { id: "l1", name: "Yemek Salonu", description: "Kristal avizeli, Osmanlı motifleriyle süslü şölen salonu", icon: "dinner-dining" },
      { id: "l2", name: "Mutfak", description: "Saray aşçılarının tabakları hazırladığı devasa mutfak", icon: "restaurant" },
      { id: "l3", name: "Bahçe Terası", description: "Boğaz manzaralı saray bahçesine açılan teras", icon: "park" },
      { id: "l4", name: "Kütüphane", description: "Nadir kitaplarla dolu saraya ait özel kütüphane", icon: "library-books" },
    ],
    clues: [
      {
        id: "c1",
        text: "Toksikoloji laboratuvarı, kurbanın kanına karışan arseniğin sadece mide asidiyle ve katı enzimlerle reaksiyona girdiğini; sıvı bir formda alınmasının imkansız olduğunu raporladı.",
        type: "forensic",
        isBonus: false,
      },
      {
        id: "c2",
        text: "Cinayetin izleri, rutubet kokan nadir kitapların arasında veya Boğaz esintisini alan dış mekanlarda değil; devasa kristal avizelerin aydınlattığı şölen masasının tam ortasındaydı.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c3",
        text: "Yabancı diplomatın kıyafetine sinen yoğun puro dumanı ve bahçe terasındaki ayak izleri, onun iç mekanlardaki şatafattan uzakta, kendi izole masasında kaldığını gösteriyordu.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c4",
        text: "Kütüphanenin kalın ahşap kapılarından gece boyunca sadece sayfa hışırtıları geldi; ihtiyar kütüphanecinin feneri sabaha kadar sadece eski haritaların üzerinde gezindi.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c5",
        text: "Protokol şefinin takım elbisesindeki yoğun sos ve baharat kokuları ile sürekli telsizle konuşması, onun tüm gece boyunca devasa mutfakta trafiği yönettiğini belgeliyordu.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c6",
        text: "Kurbanın önündeki porselen tabağın sırrını bilen tek kişi, o yemeği dışarıdan hiç kimsenin müdahalesine izin vermeden bizzat hazırlayıp salona taşıyan usta ellerdi.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c7",
        text: "Tabağın alt kenarına ustaca sürülmüş olan toksin macunu, yemeğin sıcaklığıyla eriyip yemeğe karışacak kadar şeytani bir mutfak zekasının eseriydi.",
        type: "direct",
        isBonus: true,
      },
      {
        id: "c8",
        text: "Aşçının önlüğünün iç astarında bulunan o mikroskobik arsenik tozu tanecikleri, lezzetin ardındaki o acımasız ihaneti kesin olarak kanıtlıyordu.",
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
      "Doğu Anadolu'nun etrafı dağlarla çevrili şenlikli bir köyünde, davul ve zurna seslerinin geceyi deldiği o anlarda gelinin babası kanlar içinde bulundu. Halayların coşkusu, karanlık bir intikamın sesini bastırmak için kullanılmıştı.",
    suspects: [
      { id: "s1", name: "Damat", description: "Aile anlaşmazlığı yaşanmıştı", icon: "person" },
      { id: "s2", name: "Köy Muhtarı", description: "Arazi davası vardı", icon: "elderly" },
      { id: "s3", name: "Düğün Fotoğrafçısı", description: "Dışarıdan gelen yabancı", icon: "face" },
    ],
    weapons: [
      { id: "w1", name: "Av Tüfeği", description: "Köyde yaygın olarak kullanılan uzun namlulu av tüfeği", icon: "sports" },
      { id: "w2", name: "Bıçak", description: "Köylülerin taşıdığı tipik kemer bıçağı", icon: "content-cut" },
      { id: "w3", name: "Zehir", description: "Bitkisel kökenli, yavaş etkili güçlü zehir", icon: "science" },
    ],
    locations: [
      { id: "l1", name: "Düğün Çadırı", description: "Rengarenk süslemeli, davul zurnalı büyük düğün çadırı", icon: "festival" },
      { id: "l2", name: "Köy Meydanı", description: "Halayların çekildiği aydınlatılmış köy meydanı", icon: "location-city" },
      { id: "l3", name: "Ahır Arkası", description: "Köyün kenarında, ıssız ve karanlık ahır arka bölümü", icon: "agriculture" },
    ],
    clues: [
      {
        id: "c1",
        text: "Adli tabip, maktulün bedeninde sinsi bir zehir veya yakın dövüşü gösteren bir bıçak kesiği olmadığını; ölümün uzak mesafeden ateşlenen ağır bir saçma tahribatıyla gerçekleştiğini raporladı.",
        type: "forensic",
        isBonus: false,
      },
      {
        id: "c2",
        text: "Jandarma incelemesi, kan izlerinin aydınlık köy meydanında veya kalabalık düğün çadırında değil; köyün en karanlık ve ıssız noktası olan kerpiç ahırın arkasında toplandığını kanıtladı.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c3",
        text: "Husumetli olduğu bilinen damadın, olay saatinde yüzlerce akrabasıyla birlikte devasa düğün çadırında halay çektiği sayısız şahitle doğrulandı.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c4",
        text: "Köy dışından gelen yabancı fotoğrafçının, o kritik dakikalarda meydandaki ateşin etrafında portre çekimleri yaptığı dijital kameraların zaman damgalarıyla kesinleşti.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c5",
        text: "Köyün yaşlıları, maktulle yıllardır süren bir arazi davası olan muhtarın, düğün alanından gizlice ayrılıp karanlık hayvan barınaklarına doğru yöneldiğini gördüklerini itiraf ettiler.",
        type: "direct",
        isBonus: true,
      },
      {
        id: "c6",
        text: "Ahırın arkasındaki çamurlu zeminde bulunan boş kovan ile köy muhtarının evinde ele geçirilen uzun namlulu tüfeğin balistik eşleşmesi %100 örtüştü.",
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
      { id: "s1", name: "Serhat Dönmez", description: "Deneyimli şehir turu rehberi", icon: "👨" },
      { id: "s2", name: "Nilgün Arslan", description: "Fotoğraf tutkunu turist", icon: "👩‍💼" },
      { id: "s3", name: "Bekir Yıldız", description: "Kule güvenlik görevlisi", icon: "👮" },
    ],
    weapons: [
      { id: "w1", name: "Yüksekten Düşürme", description: "Kule tepesindeki demir parmaklıktan öne doğru itilme", icon: "arrow-downward" },
      { id: "w2", name: "Halat", description: "Teknik odada saklanan kalın çelik halat", icon: "link" },
      { id: "w3", name: "Demir Boru", description: "Çatı bakım odası rafından alınan pas tutmuş boru", icon: "hardware" },
    ],
    locations: [
      { id: "l1", name: "Kule Tepesi", description: "Dar geçitli, rüzgârlı panoramik seyir terası", icon: "filter-hdr" },
      { id: "l2", name: "Tünel Girişi", description: "Kule altındaki tarihi çarşı tünelinin girişi", icon: "subway" },
      { id: "l3", name: "Teknik Oda", description: "Kulenin bodrum katındaki bakım ve depo odası", icon: "settings" },
    ],
    clues: [
      {
        id: "c1",
        text: "Adli tıp uzmanları, kurbanın bir halatla boğulmadığını veya demir boruyla dövülmediğini; bedendeki tüm hasarın kulenin en yüksek noktasından aşağıya doğru şiddetli itilme sonucu oluştuğunu raporladı.",
        type: "forensic",
        isBonus: false,
      },
      {
        id: "c2",
        text: "Kan izlerinin ve kopan düğmelerin tünel girişinde veya teknik odada değil; rüzgarlı ve panoramik seyir terasının korkuluk dibinde yoğunlaştığı saptandı.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c3",
        text: "Fotoğraf tutkunu turist Nilgün'ün, yükseklik korkusu nedeniyle kuleye hiç çıkmadığı ve geceyi sadece tünel girişindeki kafede geçirdiği güvenlik kameralarıyla doğrulandı.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c4",
        text: "Tur rehberinin, grubun arka kısmını toparlamak için bodrum katındaki teknik odada beklediği ve cinayet saatinde yukarıda olmadığı tüm turist kafilesince onaylandı.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c5",
        text: "O saatte seyir terasına giden kilitli parmaklık kapılarını sadece master anahtara sahip olan bir personel açabilirdi.",
        type: "direct",
        isBonus: true,
      },
      {
        id: "c6",
        text: "Maktulün parmaklıkların üzerinden itildiği o son noktada, kule güvenliğinden sorumlu olan kişinin botlarına ait taze çamur izleri ve korkulukta DNA'sı ele geçirildi.",
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
      { id: "s1", name: "Nazife Hanım", description: "Uzun süreli protokol sorumlusu", icon: "👩‍💼" },
      { id: "s2", name: "İdris Bey", description: "Büyükelçi, diplomatik dokunulmazlık sahibi", icon: "👴" },
      { id: "s3", name: "Hanzade", description: "Resmi tercüman, dil uzmanı", icon: "👩" },
    ],
    weapons: [
      { id: "w1", name: "Zehirli Çay", description: "Özel demlenmiş, renksiz zehir karıştırılmış Türk çayı", icon: "local-cafe" },
      { id: "w2", name: "İnce Bıçak", description: "Protokol töreninde tören kılıfına benzer, ince stileto bıçak", icon: "content-cut" },
      { id: "w3", name: "Cep Tabancası", description: "Gizli bölüme saklanmış küçük kalibreli tabanca", icon: "my-location" },
    ],
    locations: [
      { id: "l1", name: "Kristal Merdiven", description: "Sarayın ünlü kristal basamaklı ana merdivenler", icon: "stairs" },
      { id: "l2", name: "Selamlık Salonu", description: "Erkek misafirlere ayrılmış resmi kabul salonu", icon: "meeting-room" },
      { id: "l3", name: "Boğaz Balkonu", description: "Boğaz manzaralı açık balkon, dışarıya bakan geniş teras", icon: "deck" },
    ],
    clues: [
      {
        id: "c1",
        text: "Kurbanın vücudunda hiçbir delici aletin veya balistik çekirdeğin girişi yoktu; ancak boğazında, sadece sıcak bir demlikle reaksiyona giren renksiz bir alkaloidin tahribatı mevcuttu.",
        type: "forensic",
        isBonus: false,
      },
      {
        id: "c2",
        text: "Olayın yaşandığı alan, rüzgarlı teraslar veya yankılı kristal basamaklar değil; kalın Hereke halılarıyla kaplı, erkek misafirlerin ağırlandığı o ağır ve kapalı resmi kabul odasıydı.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c3",
        text: "Büyükelçi İdris Bey'in deri ayakkabılarının gıcırtısı ve etrafındaki koruma ordusu, onun kristal merdivenler çevresindeki protokol hattından bir milim bile sapmadığını teyit ediyordu.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c4",
        text: "Tercüman Hanzade'nin kulaklıklarından gelen kesintisiz ses kayıtları, onun tüm gece Boğaz balkonundaki çeviri kabininde izole bir şekilde çalıştığını ispatladı.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c5",
        text: "O gösterişli resmi kabul odasındaki gümüş tepsileri ve asırlık fincanları taşıma yetkisine sahip olan tek kişi, yıllardır sarayın ikram protokolünü ezbere bilen kadındı.",
        type: "direct",
        isBonus: true,
      },
      {
        id: "c6",
        text: "Zehirli alkaloidin tortusu tam da kurbanın fincanının dibinde çökelmişti; fincanın kulpunda ise sadece Nazife Hanım'ın o gece sürdüğü özel pudranın izleri vardı.",
        type: "forensic",
        isBonus: true,
      },
      {
        id: "c7",
        text: "Tören alanında bulunması imkansız olan o sinsi toksin, çay servis arabasının gizli bir bölmesinde, Nazife Hanım'ın mendiliyle birlikte ele geçirildi.",
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
      "Boğaz'ın buz gibi gri sisleri arasına karışan sabah vapurunda, üst düzey bir yönetici bir daha inmemek üzere kamaradan kayboldu. Dalgaların sesi ve martıların çığlıkları, denizin ortasında işlenen bu kusursuz cinayeti gizlemeye yetmedi.",
    suspects: [
      { id: "s1", name: "Fatma Reis", description: "20 yıllık tecrübeli vapur kaptanı", icon: "sailing" },
      { id: "s2", name: "Muzaffer", description: "Biletçi ve güverte görevlisi", icon: "person" },
      { id: "s3", name: "İrem Şen", description: "İş seyahati yapan yolcu", icon: "account-circle" },
    ],
    weapons: [
      { id: "w1", name: "Duman Bombası", description: "Depo odasında saklanan endüstriyel duman tüpü", icon: "cloud" },
      { id: "w2", name: "Gemi Halatı", description: "Güvertede bağlama için kullanılan kalın naylon halat", icon: "link" },
      { id: "w3", name: "Deniz Feneri", description: "Sinyalizasyon için kullanılan ağır metal fener", icon: "light-mode" },
    ],
    locations: [
      { id: "l1", name: "Üst Güverte", description: "Açık hava seyir güvertesi, deniz manzaralı", icon: "waves" },
      { id: "l2", name: "Motor Dairesi", description: "Alt katta gürültülü, personele özel motor odası", icon: "engineering" },
      { id: "l3", name: "İskele", description: "Kalkış iskelesinin bekleme ve yükleme alanı", icon: "directions-boat" },
    ],
    clues: [
      {
        id: "c1",
        text: "Kurbanın boynundaki derin ve kalın sürtünme izleri, endüstriyel bir duman veya ağır metal ezilmesini değil; boğucu ve esnek bir kordon baskısını işaret ediyordu.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c2",
        text: "Güvenlik kameraları, cinayetin yolcuların bulunduğu kalkış iskelesinde veya açık deniz manzaralı güvertede değil, yalnızca personelin girebildiği gürültülü alt katmanlarda yaşandığını saptadı.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c3",
        text: "Kaptanın seyir defteri ve yardımcı personelin yeminli ifadeleri, Fatma Reis'in yolculuk boyunca dümen başından bir saniye bile ayrılmadığını teyit etti.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c4",
        text: "İş seyahati yapan İrem Şen'in, turnikelerden geçtikten sonra yoğun sis yüzünden vapurun içine girmeyip iskeledeki bekleme salonunda kaldığı güvenlik loglarıyla ispatlandı.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c5",
        text: "Alt kattaki gürültülü teknik odaya girmek için gereken dijital kodun, yalnızca o sabah vardiyasında olan biletçi personeline zimmetli olduğu ortaya çıktı.",
        type: "direct",
        isBonus: true,
      },
      {
        id: "c6",
        text: "Motor dairesinin zemininde bulunan kalın naylon lifleri ve biletçi Muzaffer'in ellerindeki taze kenevir yanıkları, kurbanın nasıl ve kim tarafından susturulduğunu kesinleştirdi.",
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
      { id: "s1", name: "Orhan Aras", description: "Antikacı, kırk yıllık pasaj esnafı", icon: "👴" },
      { id: "s2", name: "Suna Çakır", description: "Hukuk bürosu ortağı avukat", icon: "👩‍💼" },
      { id: "s3", name: "Talip Uzun", description: "Pasaj girişinde sebze ve meyve satan manav", icon: "👷" },
    ],
    weapons: [
      { id: "w1", name: "Zehirli Şarap", description: "Antika koleksiyona ait özel şişede sunulan şarap", icon: "wine-bar" },
      { id: "w2", name: "Elektrik Kablosu", description: "Duvar prizinden sökülen eski ve hasarlı kablo", icon: "electrical-services" },
      { id: "w3", name: "Antika Heykel", description: "Raftan alınan ağır mermer büst, boyutu çanta bezi kadar", icon: "museum" },
    ],
    locations: [
      { id: "l1", name: "Pasaj Koridoru", description: "Yüksek tavanlı, yaldızlı Art Nouveau pasaj koridoru", icon: "store" },
      { id: "l2", name: "Arka Depo", description: "Antikacının kilitli, penceresiz arka deposu", icon: "inventory" },
      { id: "l3", name: "Çatı Katı", description: "Pasajın üstündeki terk edilmiş manzaralı çatı katı", icon: "roofing" },
    ],
    clues: [
      {
        id: "c1",
        text: "Kurbanın vücudunda elektrik kablosu yanığı veya zehirli şarap bulgusu yoktu; kafatasındaki yara, boyutu çanta bezi kadar olan küt ve son derece ağır mermer bir objeyle örtüşüyordu.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c2",
        text: "Olay yeri şeridi yaldızlı pasaj koridoruna veya terk edilmiş çatı katına değil, doğrudan antikacının dışarıdan görünmeyen kilitli ve penceresiz arka deposuna çekildi.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c3",
        text: "Baro toplantısından çıkan avukat Suna Çakır'ın, olay saatlerinde sadece manzaralı çatı katındaki restoranda bulunduğu HTS kayıtlarıyla kanıtlandı.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c4",
        text: "Manav Talip Uzun'un, pasaj girişindeki sebze tezgahından o akşamüstü bir an bile ayrılmadığı ve kilitli depo odasına hiç inmediği komşu esnaflarca doğrulandı.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c5",
        text: "Olayın yaşandığı penceresiz deponun anahtarına ve içerideki antika koleksiyonun yerleşim planına sadece dükkanın kendi sahibi hakimdi.",
        type: "direct",
        isBonus: true,
      },
      {
        id: "c6",
        text: "Dükkan sahibinin envanterinden eksilen o ağır mermer büstün kaidesi kurbanın hemen yanında bulundu ve üzerindeki kan izleri dükkan sahibinin DNA'sıyla %100 örtüştü.",
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
      { id: "s1", name: "Prens Hüseyin", description: "Saraylı ev sahibi ve organizatör", icon: "👨" },
      { id: "s2", name: "Madam Silvana", description: "İtalyan soprano, gecenin yıldız sanatçısı", icon: "🎤" },
      { id: "s3", name: "Teğmen Ferhat", description: "Saraya yakın protokol subayı", icon: "💂" },
    ],
    weapons: [
      { id: "w1", name: "Zehirli Şampanya", description: "Şampanya masasından alınan, içine madde karıştırılmış kadeh", icon: "wine-bar" },
      { id: "w2", name: "Stileto Bıçak", description: "Dar ve uzun, askeri kılıfa benzer gizlenebilir bıçak", icon: "content-cut" },
      { id: "w3", name: "İpek Eşarp", description: "Balo kostümüne ait uzun, sağlam ipek eşarp", icon: "style" },
    ],
    locations: [
      { id: "l1", name: "Balo Salonu", description: "Avize ışıklarıyla parlayan, kalabalık balo salonu", icon: "nightlife" },
      { id: "l2", name: "Gizli Geçit", description: "Sarayın duvarları arasındaki dar, karanlık tarihi koridor", icon: "door-back" },
      { id: "l3", name: "Boğaz İskelesi", description: "Sarayın bahçesine açılan özel Boğaz yanaşma iskelesi", icon: "anchor" },
    ],
    clues: [
      {
        id: "c1",
        text: "Otopsi raporu kurbanın bir içecekle sızmadığını veya boğulmadığını; hayati organlarını tek bir pürüzsüz hamleyle delen, askeri nizama uygun ince bir çelikle vurulduğunu gösterdi.",
        type: "forensic",
        isBonus: false,
      },
      {
        id: "c2",
        text: "Kurbanın ayakkabılarındaki rutubetli harç tozları ve kıyafetindeki örümcek ağları, cinayetin şatafatlı salonlarda değil; sarayın unutulmuş, havasız ve karanlık taş koridorlarında işlendiğini belgeliyordu.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c3",
        text: "Prens Hüseyin'in kıyafetindeki yoğun parfüm kokuları ve yüzlerce davetlinin yeminli şahitliği, onun devasa avizelerin altından bir an olsun ayrılmadığını teyit etti.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c4",
        text: "İtalyan sopranonun kadife elbisesine sinen iyot kokusu ve iskeledeki flaş patlamaları, onun performans sonrası saraydan deniz yoluyla, kalabalığın gözü önünde ayrıldığını kanıtladı.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c5",
        text: "Sarayın o karanlık ve rutubetli dehlizine giden elektronik şifreli kapı, sadece güvenlik protokollerini yöneten subayların bildiği taktiksel bir kodla açılmıştı.",
        type: "direct",
        isBonus: true,
      },
      {
        id: "c6",
        text: "Gizli geçidin çamurlu zeminindeki sert ve köşeli postal izleri, Teğmen Ferhat'ın askeri botlarının taban deseniyle milimetrik olarak uyuşuyordu.",
        type: "evidence",
        isBonus: true,
      },
      {
        id: "c7",
        text: "Teğmenin tören üniformasındaki gizli kılıf boştu; dahası, sağ manşetine sıçrayan ve alelacele silinmeye çalışılan leke, doğrudan maktulün kan grubuydu.",
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
      "Tarihi yarımadanın binlerce yıllık sırlarını barındıran taş sokaklarında, yalnız bir turist ağlayan sütunların dibinde bilincini kaybetmiş halde bulundu. Değerli eşyaları yerindeydi; bu sıradan bir gasp değil, hedefe yönelik karanlık bir hamleydi.",
    suspects: [
      { id: "s1", name: "Rüzgar", description: "Hipodrom yakınında simit satan genç satıcı", icon: "person" },
      { id: "s2", name: "Ayşen Demir", description: "Yetkili tur şirketi rehberi", icon: "support-agent" },
      { id: "s3", name: "Haluk Çiçek", description: "Bölgede çalışan bağımsız fotoğrafçı", icon: "face" },
    ],
    weapons: [
      { id: "w1", name: "Biber Gazı", description: "El çantasında taşınan kişisel savunma spreyi", icon: "air" },
      { id: "w2", name: "Ağır Demir Parçası", description: "Tarihi alandan çıkan bakım artığı parça", icon: "hardware" },
      { id: "w3", name: "Uyuşturucu Şişe", description: "İçine sersemletici madde karıştırılmış küçük şişe", icon: "local-bar" },
    ],
    locations: [
      { id: "l1", name: "Hipodrom Meydanı", description: "Antik sütunların çevrelediği açık meydan", icon: "location-city" },
      { id: "l2", name: "Yerebatan Sarnıcı", description: "Tarihi yeraltı sarnıcının loş, sütunlu iç mekânı", icon: "water" },
      { id: "l3", name: "Eski Bedesten", description: "Tarihi kapalı pazar yapısının dar geçitleri", icon: "storefront" },
    ],
    clues: [
      {
        id: "c1",
        text: "Hastaneye kaldırılan turistin kan tahlilinde biber gazı veya künt bir demir travması bulunmadı; kurban doğrudan içeceğine katılan sersemletici bir kimyasalla etkisiz hale getirilmişti.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c2",
        text: "Polis köpekleri, olayın açık havadaki Antik Meydan'da veya tarihi bedestenin dar geçitlerinde değil, doğrudan yerin altındaki loş ve ıslak taş yapının içinde gerçekleştiğini belirledi.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c3",
        text: "Hipodrom kameraları, genç simitçi Rüzgar'ın tüm gün boyunca anıtların etrafındaki tezgahından hiç ayrılmadığını mühürlü kayıtlarla doğruladı.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c4",
        text: "Bağımsız fotoğrafçı Haluk'un olay saatlerinde Eski Bedesten'in çatısında panoramik çekimler yaptığı, makinesindeki silinmez RAW zaman damgalarıyla kanıtlandı.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c5",
        text: "Rehberlik acentesinin rotasına göre, turistin o saatlerde sadece yetkili tur rehberiyle birlikte yeraltı yapılarını gezmek üzere bilet kullandığı tespit edildi.",
        type: "direct",
        isBonus: true,
      },
      {
        id: "c6",
        text: "Ağlayan sütunların hemen dibinde bulunan o küçük ve sinsi şişenin üzerinde, tur rehberi Ayşen Demir'in işaret parmağına ait taze bir ter izi bulundu.",
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
      { id: "s1", name: "Bora Deniz", description: "Çeyrek asrı geçkin deneyimli balıkçı", icon: "👨‍✈️" },
      { id: "s2", name: "Esma Hanım", description: "Meyhane sahibesi, mahalle simgesi", icon: "👵" },
      { id: "s3", name: "Taner Öz", description: "Mahalle doktoru, ara sıra meyhanede misafir", icon: "👨‍⚕️" },
    ],
    weapons: [
      { id: "w1", name: "Zıpkın", description: "Balıkçı teknesinden alınan uzun metal zıpkın", icon: "sports" },
      { id: "w2", name: "Balık Ağı", description: "Bükülebilir sentetik liften yapılan dayanıklı ağ", icon: "grid-on" },
      { id: "w3", name: "Zehirli Rakı", description: "Şahsi koleksiyondan alınan, içine madde karıştırılmış rakı şişesi", icon: "local-bar" },
    ],
    locations: [
      { id: "l1", name: "Balıkçı Barınağı", description: "Köhnemiş ahşap teknelerin çektiği kıyı barınağı", icon: "directions-boat" },
      { id: "l2", name: "Meyhane İç Salonu", description: "Alçak tavanlı, duman kokulu tarihi meyhane iç mekânı", icon: "nightlife" },
      { id: "l3", name: "Boğaz Kıyısı", description: "Meyhane önündeki dar, taşlı sahil şeridi", icon: "waves" },
    ],
    clues: [
      {
        id: "c1",
        text: "Adli tabip raporu, kurbanın vücudunda balık ağı boğması veya bir zıpkın deliği olmadığını; doğrudan yuttuğu kadehin içindeki kimyasal bir kokteylle kalbinin durduğunu saptadı.",
        type: "forensic",
        isBonus: false,
      },
      {
        id: "c2",
        text: "Polis incelemesi, olayın teknelerin çekildiği barınakta veya rüzgarlı boğaz kıyısında değil; doğrudan alçak tavanlı, duman kokulu meyhanenin iç salonunda yaşandığını kesinleştirdi.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c3",
        text: "Deneyimli balıkçı Bora'nın, fırtına uyarısı nedeniyle tüm gece sadece kıyı barınağındaki teknesinde ağ ördüğü diğer denizciler tarafından yeminle doğrulandı.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c4",
        text: "Mahalle doktoru Taner'in olay gecesi nöbetçi olduğu ve meyhaneye girmeyip sadece arabasıyla boğaz kıyısından geçtiği hastane loglarında mevcuttu.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c5",
        text: "Maktulün masasındaki o özel şişenin, barın arkasındaki kilitli şahsi koleksiyondan çıkarıldığı ve sadece meyhane sahibesinin erişiminde olduğu belirlendi.",
        type: "direct",
        isBonus: true,
      },
      {
        id: "c6",
        text: "İçine zehir zerk edilmiş o özel rakı şişesinin boynunda, meyhane sahibesi Esma Hanım'a ait o geceki taze el kreminin kalıntıları bulundu.",
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
      { id: "s1", name: "Müdür Altan", description: "Müze direktörü, otuz yıllık bürokrat", icon: "👨" },
      { id: "s2", name: "Dr. Pervin", description: "Arkeolog, gece kazı ekibini yönetiyor", icon: "👩" },
      { id: "s3", name: "Restoratör Cemil", description: "Eser onarımıyla sorumlu kıdemli restoratör", icon: "👷" },
    ],
    weapons: [
      { id: "w1", name: "Osmanlı Hançeri", description: "Kayıp eserin tıpatıp kopyası, reprodüksiyon hançer", icon: "content-cut" },
      { id: "w2", name: "Uyuşturucu İğne", description: "Sedatif dolu tıbbi enjektör, hızla etkili", icon: "vaccines" },
      { id: "w3", name: "Kimyasal Duman", description: "Restorasyon kimyasallarının karışımından oluşan zehirli gaz", icon: "science" },
    ],
    locations: [
      { id: "l1", name: "Hazine Odası", description: "En değerli eserlerin bulunduğu yüksek güvenlikli oda", icon: "lock" },
      { id: "l2", name: "Restorasyon Atölyesi", description: "Eserlerin onarıldığı, kimyasal koku sinmiş atölye", icon: "engineering" },
      { id: "l3", name: "Harem Koridoru", description: "Tarihi, uzun ve aydınlatması az olan harem geçit koridoru", icon: "route" },
    ],
    clues: [
      {
        id: "c1",
        text: "Maktulün ense kökündeki mikroskobik giriş deliği ve kanındaki ani donma, ağır bir metal darbesini veya gaz solunmasını değil; doğrudan kana zerk edilen güçlü bir tıbbi sedatifi işaret ediyordu.",
        type: "forensic",
        isBonus: false,
      },
      {
        id: "c2",
        text: "Olay mahallindeki yoğun vernik, tiner ve eski ahşap kokusu, cinayetin basın mensuplarının gezdiği hazine odasında değil; gözden ırak, kapalı kapılar ardındaki onarım atölyesinde yaşandığını kanıtlıyordu.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c3",
        text: "Müze müdürü Altan'ın tüm gece flaşların altında, zırhlı camların bulunduğu hazine odasında kameralara röportaj verdiği canlı yayın kayıtlarıyla onaylandı.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c4",
        text: "Arkeolog Dr. Pervin'in tulumundaki yoğun toprak ve toz tabakası, onun gece boyunca harem geçitlerindeki nemli hafriyat alanında ekibiyle çalıştığını gösteriyordu.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c5",
        text: "Onarım atölyesinde bulunan ve hassas yapıştırıcıları zerk etmekte kullanılan özel ince uçlu şırıngalara sadece o odanın kadrolu uzmanının erişimi vardı.",
        type: "direct",
        isBonus: true,
      },
      {
        id: "c6",
        text: "Restoratör Cemil'in önlüğünün cebinden düşen kullanılmış şırıngada sedatif kalıntıları bulunurken, kayıp hançerin replikası da onun şahsi kilitli dolabından çıktı.",
        type: "evidence",
        isBonus: true,
      },
      {
        id: "c7",
        text: "Eserin karaborsadaki satışını planlayan Cemil, suçüstü yakalanmamak için maktulü kendi ustalık alanında, kendi aletleriyle sonsuz bir uykuya yatırmıştı.",
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
      { id: "s1", name: "DJ Mete", description: "Kulübün müziklerinden sorumlu, yüksek platformdaki kabininde tüm gece performans sergileyen kibirli sanatçı.", icon: "noun-dj-1908911" },
      { id: "s2", name: "Organizatör Deniz", description: "VIP müşterilerin her isteğiyle ilgilenen, elinden şampanya kadehini hiç düşürmeyen güler yüzlü organizatör.", icon: "noun-teacher-1908919-avatar.png" },
      { id: "s3", name: "Güvenlik Tarık", description: "Kapı kontrolünü ve içerideki taşkınlıkları önlemeyi sağlayan, sürekli telsiziyle talimat alan iri yarı güvenlik.", icon: "noun-police-1574386" },
    ],
    weapons: [
      { id: "w1", name: "Ahşap Cop", description: "Güvenlik personelinin taşıdığı kısa saplı ağır ahşap teçhizat; küt ucuyla tek darbede kafatasını çatlatabilecek yapıda.", icon: "gavel" },
      { id: "w2", name: "Şampanya Kadehi", description: "VIP locasında servis edilen, kırıldığında boyun bölgesini kesebilecek ölümcül bir silaha dönüşen ince cam eşya.", icon: "wine-bar" },
      { id: "w3", name: "Telsiz", description: "Personelin haberleştiği, boyna dolanıp boğmaya müsait kalın kordonlu ağır elektronik cihaz.", icon: "radio" },
    ],
    locations: [
      { id: "l1", name: "Servis Çıkışı", description: "Kameranın görmediği, personelin molaya çıktığı, çöp konteynerlerinin bulunduğu arka taraftaki loş ve soğuk geçit.", icon: "door-front" },
      { id: "l2", name: "DJ Kabini", description: "Devasa ses sisteminin merkezi olan, tüm kulübe tepeden bakan ve her an göz önünde olan aydınlık platform.", icon: "speaker" },
      { id: "l3", name: "VIP Loca", description: "Özel misafirlerin ağırlandığı, kadife koltuklu, ana salondan kısmen yalıtılmış lüks eğlence bölümü.", icon: "star" },
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
      { id: "s1", name: "Tüccar Vehbi", description: "Sürekli eski evrak ve tapuları inceleyen, cinayet gecesi kilitli kapılar ardında belgelerle uğraşan şüpheli antika tüccarı.", icon: "noun-tuccar-vehbi-avatar.png" },
      { id: "s2", name: "Semiha Hanım", description: "Konağın asıl varisi; mirasın bölünmesinden son derece rahatsız olan ve gece yarısı gizlice kütüphaneye sızan asilzade.", icon: "noun-semiha-hanim-avatar.png" },
      { id: "s3", name: "Yüzbaşı Cemil", description: "Sürekli anılarını yazan, disiplinli ve sert mizaçlı emekli subay; geceyi yalnız başına masasında geçirmiş.", icon: "noun-soldier-1574347" },
    ],
    weapons: [
      { id: "w1", name: "Bahçe Makası", description: "Konağın bahçesinden gizlice içeri alınmış, ağır, paslı ve son derece keskin devasa demir makas.", icon: "content-cut" },
      { id: "w2", name: "İngiliz Anahtarı", description: "Alt kattaki tesisat onarımı için bırakılmış, kafaya vurulduğunda anında ölümcül travma yaratan paslanmaz çelik alet.", icon: "build" },
      { id: "w3", name: "Mektup Açacağı", description: "Yazı masasında duran, ince, sivri ve kalbe tek seferde saplanabilecek keskinlikte gümüş bıçak.", icon: "edit" },
    ],
    locations: [
      { id: "l1", name: "Kütüphane", description: "Deri kaplı kitapların bulunduğu, kalın perdelerle örtülü, loş, sessiz ve tozlu okuma odası.", icon: "menu-book" },
      { id: "l2", name: "Arşiv Odası", description: "Konağa ait yüz yıllık tapuların ve evrakların saklandığı, sadece özel anahtarla girilebilen kilitli bölüm.", icon: "archive" },
      { id: "l3", name: "Yemek Salonu", description: "Uzun ahşap masaların bulunduğu, davetlilere hizmet veren geniş ve aydınlık ana salon.", icon: "restaurant" },
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
      { id: "s1", name: "Vahap Amca", description: "Bacaklarındaki şiddetli ağrılar nedeniyle merdiven inip çıkamayan, sürekli oturduğu yerden etrafı izleyen yaşlı komşu esnaf.", icon: "noun-vahap-amca-avatar.png" },
      { id: "s2", name: "Çırak Selim", description: "Dükkanın genç ve telaşlı çalışanı; son günlerde acil paraya ihtiyacı olduğu biliniyor ve cinayet mahallinde görülmüş.", icon: "noun-cirak-selim-avatar.png" },
      { id: "s3", name: "Kurye Murat", description: "Ağır yükleri taşımaya alışkın, dükkana sürekli mal getiren nakliyeci; elinden alet çantasını düşürmüyor.", icon: "noun-kurye-murat-pazar-avatar.png" },
    ],
    weapons: [
      { id: "w1", name: "Cam Kadeh", description: "Çay ocağından alınmış, kırıldığında şah damarını kesebilecek ölümcül ve ince içecek bardağı.", icon: "wine-bar" },
      { id: "w2", name: "İngiliz Anahtarı", description: "Nakliye araçlarını tamir etmekte kullanılan, üzeri gres yağı lekeleriyle dolu ağır metal tamir aleti.", icon: "build" },
      { id: "w3", name: "Bakır Ağırlık", description: "Kuyumcu ve bakırcı terazilerinde kullanılan, avuç içine tam oturan ölümcül kütleli tartı dirhemi.", icon: "radio-button-checked" },
    ],
    locations: [
      { id: "l1", name: "Depo", description: "Malların istiflendiği, güneş ışığı almayan, merdivenle inilen loş ve havasız alt kat; cinayetin işlendiği yer.", icon: "warehouse" },
      { id: "l2", name: "Dükkan İçi", description: "Vitrinlerin ve kasanın bulunduğu, sokağı doğrudan gören aydınlık müşteri karşılama alanı.", icon: "storefront" },
      { id: "l3", name: "Arka Sokak", description: "Sadece nakliye araçlarının yanaştığı, çamurlu ve kimsenin geçmediği dar mal yükleme geçidi.", icon: "directions-walk" },
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
      { id: "s1", name: "Tarık", description: "Yolculuk boyunca dondurucu soğuğa rağmen içeri girmeyip dışarıda manzarayı izlediğini iddia eden şüpheli yolcu.", icon: "noun-yolcu-tarik-avatar.png" },
      { id: "s2", name: "Feriha", description: "Elektrik kesintisinde kurbanın hemen yanındaki koltukta oturan, çantası çeşitli ilaçlarla dolu tedirgin kadın.", icon: "noun-yolcu-feriha-avatar.png" },
      { id: "s3", name: "Kerem", description: "Vapurun motor arızalarıyla ilgilenen, üstü başı yağ içindeki makine dairesi görevlisi; cinayet anında aşağıda olduğunu söylüyor.", icon: "noun-makinist-kerem-avatar.png" },
    ],
    weapons: [
      { id: "w1", name: "Zehirli İçecek", description: "Sıcak çaya karıştırıldığında saniyeler içinde kalbi durduran renksiz, kokusuz ve hızlı etkili ölümcül sıvı.", icon: "local-bar" },
      { id: "w2", name: "İngiliz Anahtarı", description: "Motor parçalarını sıkmak için kullanılan, üzeri gres yağına bulanmış devasa ve ağır demir alet.", icon: "build" },
      { id: "w3", name: "Cam Parçası", description: "Vapurun kırık küpeştesinden koparılmış, boynu tek hamlede kesebilecek kadar sivri ve tehlikeli cam.", icon: "wine-bar" },
    ],
    locations: [
      { id: "l1", name: "Kapalı Yolcu Salonu", description: "Ahşap bankların bulunduğu, elektrik kesintisinde tamamen zifiri karanlığa gömülen ve kurbanın bulunduğu iç alan.", icon: "chair" },
      { id: "l2", name: "Açık Güverte", description: "Dondurucu rüzgarın estiği, yolcuların martılara simit attığı ve ıssız olan dış kısım.", icon: "deck" },
      { id: "l3", name: "Makine Bölümü", description: "Devasa dizel motorların sağır edici bir gürültüyle çalıştığı, personelin girdiği yağ kokulu alt kat.", icon: "precision-manufacturing" },
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
      { id: "s1", name: "Uşak Mehmet", description: "Hüsnü Ağa'nın bağında yıllardır çalışan, yaşlılığı nedeniyle kovulma korkusuyla yaşayan emektar uşak.", icon: "noun-usak-mehmet-avatar.png" },
      { id: "s2", name: "Komşu Tarla Sahibi Nevzat", description: "Hüsnü Ağa ile tarla sınırı yüzünden davalık olan, sınırı ihlal etmediğini savunan öfkeli komşu.", icon: "noun-komsu-nevzat-avatar.png" },
      { id: "s3", name: "Torun Kız Nermin", description: "Büyükbabasının arazileri satma kararına şiddetle karşı çıkan, sabah erkenden bağ kulübesinde ağlarken görülen mirasçı.", icon: "noun-torun-nermin-avatar.png" },
    ],
    weapons: [
      { id: "w1", name: "Bağ Bıçağı", description: "Üzüm salkımlarını tek hamlede kesmek için özel olarak ustalar tarafından bileyenmiş kısa ve ölümcül bıçak.", icon: "content-cut" },
      { id: "w2", name: "Balta", description: "Kışlık odun kırmak için bağ evinde bulundurulan, kemikleri bile parçalayabilen ağır ve paslı alet.", icon: "carpenter" },
      { id: "w3", name: "Demir Kazma", description: "Sert toprağı işlemek için kullanılan, kafatasına isabet ettiğinde geniş tahribat yaratan kütleli kazma.", icon: "construction" },
    ],
    locations: [
      { id: "l1", name: "Bağ İçi", description: "Asmaların sıklaştığı, yapraklardan dolayı görüş mesafesinin çok düştüğü tarlanın en izole orta kısmı.", icon: "grass" },
      { id: "l2", name: "Bağ Kulübesi", description: "Aletlerin saklandığı, girişin hemen yanındaki karanlık, penceresiz taş yapı.", icon: "cottage" },
      { id: "l3", name: "Tarla Sınırı", description: "Hüsnü Ağa ile komşusunun arazisini bölen, üzerinden atlaması zor alçak taş duvar hattı.", icon: "terrain" },
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
      { id: "s1", name: "Tüccar Ortak Sabri Bey", description: "Raşit Efendi'nin ortaklıktan ayrılmak isteyen, gece boyu uykusuzluk çekip avluda volta atan iş ortağı.", icon: "noun-ortak-sabri-bey-avatar.png" },
      { id: "s2", name: "Hizmetçi Kadın Hacer", description: "Odaları temizleyen, kışlık üniforması eksik olan ve hanın tüm kapı anahtarlarına sınırsız erişimi olan tek çalışan.", icon: "noun-hizmetci-hacer-avatar.png" },
      { id: "s3", name: "Gezgin Derviş Salih", description: "Maktulle akşam yemeğinde sert şekilde tartışan, ardından geceyi kilitli ambarda zikir çekerek geçiren yaşlı gezgin.", icon: "noun-gezgin-dervis-salih-avatar.png" },
    ],
    weapons: [
      { id: "w1", name: "Atkı", description: "Kış aylarında personelin soğuktan korunmak için taktığı uzun, kalın ve sessizce boğmaya çok müsait esnek yün atkı.", icon: "link" },
      { id: "w2", name: "Kemer", description: "Tüccarların altın keselerini bağladığı, deri tokalı, boyunda farklı bir boğma izi bırakan sağlam bel kemeri.", icon: "build" },
      { id: "w3", name: "Halat", description: "Ambardaki çuvalları bağlamak için kullanılan, deriyi tahriş eden kalın ve pürüzlü kendir halat.", icon: "anchor" },
    ],
    locations: [
      { id: "l1", name: "Konak Odası", description: "Maktulün uyuduğu, ahşap yataklı, cinayet gecesi sürgüsü içeriden çekilmemiş birinci kat odası.", icon: "castle" },
      { id: "l2", name: "Han Avlusu", description: "Geceleri rüzgarın uğuldadığı, sütunlarla çevrili, bekçilerin devriye gezdiği geniş açık orta alan.", icon: "park" },
      { id: "l3", name: "Ambar", description: "Alt katta bulunan, ticaret çuvallarının istiflendiği, kapısı dışarıdan asma kilitli depolama alanı.", icon: "warehouse" },
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
      { id: "s1", name: "Gazeteci Selda Hanım", description: "Fotoğrafları izinsiz yayımlayan muhalif muhabir. Sadece ön ofisteki açık alanlara ve çekim ekipmanlarına erişimi vardı.", icon: "noun-foto-kadin-muhabir-avatar.png" },
      { id: "s2", name: "Asistan Cumhur", description: "Fotoğrafçının stüdyo çalışanı. Terfi alamadığı için öfkeli; banyo sıvıları dahil stüdyonun tüm teknik alanlarını kullanma yetkisine sahip.", icon: "noun-foto-stajyer-avatar.png" },
      { id: "s3", name: "Koleksiyoner Münir Bey", description: "Nadir eserler için baskı yapan yaşlı koleksiyoner. Sadece depolanmış eski kutularla ilgilenir, güncel çekim alanlarına hiç uğramaz.", icon: "noun-foto-koleksiyoner-avatar.png" },
    ],
    weapons: [
      { id: "w1", name: "Tripod Bacağı", description: "Kamera sehpasından sökülmüş uzun ve ağır alüminyum boru; kafaya küt bir darbe vurulduğunda anında ölümcül olabilir.", icon: "straighten" },
      { id: "w2", name: "Kimyasal Banyo", description: "Filmleri yıkamakta kullanılan, zorla içirildiğinde iç organları saniyeler içinde eriten yüksek asitli zehirli çözelti.", icon: "science" },
      { id: "w3", name: "Cam Negatif Kutusu", description: "İçi eski cam filmlerle dolu, kaldırıp atıldığında ezici tahribat yaratan son derece ağır ve köşeli metal kutu.", icon: "inventory-2" },
    ],
    locations: [
      { id: "l1", name: "Karanlık Oda", description: "Sadece kırmızı lambanın yandığı, filmlerin yıkandığı banyo teknelerinin bulunduğu stüdyonun en kapalı ve loş arka alanı.", icon: "camera-roll" },
      { id: "l2", name: "Stüdyo Salonu", description: "Müşterilerin poz verdiği, kamera ve flaşların bulunduğu oldukça geniş, aydınlık ve ferah ön çekim alanı.", icon: "photo-camera" },
      { id: "l3", name: "Depo Odası", description: "Kullanılmayan malzemelerin ve geçmiş yıllara ait arşiv kutularının üst üste yığıldığı tozlu ve dar arka oda.", icon: "warehouse" },
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
      { id: "s1", name: "Emekli Doktor Vedat Bey", description: "Miras verasetinde tanık olan, bastonuyla zor yürüyen, güçlü fiziksel eylemlerden kaçınan yaşlı adam.", icon: "noun-termal-yasli-bey-avatar.png" },
      { id: "s2", name: "İş Kadını Perihan Hanım", description: "Hesap anlaşmazlığı yaşadığı ortağına karşı kin güden, lüks kıyafetlere ve monogramlı şahsi eşyalara düşkün hırslı kadın.", icon: "noun-termal-kadin-misafir-avatar.png" },
      { id: "s3", name: "Genç Sporcu Erdal", description: "Milli takım sporcusu. Fiziksel kondisyonu zirvede olan, sürekli lobide veya dış alanlarda telefonla konuşarak sponsor arayan genç.", icon: "noun-termal-genc-adam-avatar.png" },
    ],
    weapons: [
      { id: "w1", name: "Havlu", description: "Odalardan alınmış, boyna sıkıca dolandığında sessizce ve etkili biçimde nefesi kesen esnek, kalın otel kumaşı.", icon: "dry-cleaning" },
      { id: "w2", name: "Kimyasal Temizleyici", description: "Su bakımında kullanılan, içilmesi veya solunması halinde ciğerleri parçalayan aşırı dozda klorlu zehirli sıvı.", icon: "science" },
      { id: "w3", name: "Metal Trabzan", description: "Merdiven kenarından sökülmüş, sert bir şekilde kafaya vurulduğunda açık yara ve kırık yaratan ağır metal boru.", icon: "construction" },
    ],
    locations: [
      { id: "l1", name: "Termal Havuz", description: "Otelin alt katında yer alan, sıcak su buharıyla kaplı, sığ kenarları olan ve zeminleri her daim ıslak kapalı alan.", icon: "pool" },
      { id: "l2", name: "Koridor", description: "Oda katlarını birbirine bağlayan, uzun halılarla kaplı, aydınlık ve güvenlik kamerasının kısmen gördüğü sessiz geçit.", icon: "meeting-room" },
      { id: "l3", name: "Lobi", description: "Otelin ana girişinin bulunduğu, resepsiyon görevlisinin durduğu, geniş oturma gruplarına sahip ana karşılama alanı.", icon: "hotel" },
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
      { id: "s1", name: "Bakkal Necati", description: "Koli şikayeti bulunan mahalle esnafı. Sürekli dükkanının önünde bekleyen, kendi bölgesinden pek ayrılmayan tanıdık yüz.", icon: "noun-mektup-mahalle-adami-avatar.png" },
      { id: "s2", name: "Liman İşçisi Tahsin", description: "İşten çıkarılma belgesinin postalanmasından korkan, üzerinde her daim ağır iş aletleri taşıyan öfkeli tersane işçisi.", icon: "noun-mektup-tamirci-avatar.png" },
      { id: "s3", name: "Ev Hanımı Hatice Teyze", description: "Postaların geç gelmesinden şikayetçi olan ev hanımı. Fiziksel olarak yavaş hareket eden, kargoları için depo binalarını aşındıran kadın.", icon: "noun-mektup-komsu-kadin-avatar.png" },
    ],
    weapons: [
      { id: "w1", name: "Çakı", description: "Küçük, katlanabilir, yakından yapılan tek bir pürüzsüz hamleyle ince ve derin bir kesik açabilen cep aleti.", icon: "content-cut" },
      { id: "w2", name: "Kanca", description: "Ağır yükleri kavramak için kullanılan, saplandığında geniş ve parçalı derin tahribat yaratan paslı demir alet.", icon: "anchor" },
      { id: "w3", name: "Cam Parçası", description: "Sokaktaki kırık bir şişeden alınmış, boynu düzensiz ve tırtıklı şekilde parçalayan rastgele kesici alet.", icon: "broken-image" },
    ],
    locations: [
      { id: "l1", name: "Arka Sokak", description: "Esnaf dükkanlarının arka tarafına düşen, görüş açısı kapalı, dar, ıssız ve kimsenin geçmediği taşlı yol.", icon: "place" },
      { id: "l2", name: "Liman Rıhtımı", description: "Devasa gemilerin yanaştığı, yükleme işlemlerinin yapıldığı geniş ve rüzgarlı açık sahil alanı.", icon: "directions-boat" },
      { id: "l3", name: "Posta Deposu", description: "Gelen mektupların sınıflandırıldığı, kargoların yığıldığı dört duvar arası küçük resmi bina.", icon: "local-post-office" },
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
      { id: "s1", name: "Fabrika Ustabaşı Cevdet", description: "On beş yıldır fabrikada çalışan ustabaşı; Rıfat Ağa'nın onu ortaklıktan mahrum bıraktığını öğrendi.", icon: "noun-fabrika-makinist-avatar.png" },
      { id: "s2", name: "Muhasebeci Bayan Şükran", description: "Fabrikanın muhasebecisi; usulsüz kayıtları Rıfat Ağa'ya bildirmekten çekindiği için baskı altındaydı.", icon: "noun-fabrika-muhasebeci-avatar.png" },
      { id: "s3", name: "Satış Temsilcisi Orhan Bey", description: "İstanbul'dan gelen satış temsilcisi; Rıfat Ağa ile anlaşma görüşmesi bozulmuş.", icon: "noun-fabrika-ortak-avatar.png" },
    ],
    weapons: [
      { id: "w1", name: "Zehirli Çay", description: "İçine yüksek doz sedatif karıştırılmış çay bardağı.", icon: "local-cafe" },
      { id: "w2", name: "Pres Kolu", description: "Zeytinyağı presinin metal kumanda kolu.", icon: "settings" },
      { id: "w3", name: "Zincir", description: "Pres makinasına bağlı güvenlik zinciri.", icon: "link" },
    ],
    locations: [
      { id: "l1", name: "Pres Odası", description: "Büyük zeytinyağı preslerinin bulunduğu gürültülü ana oda.", icon: "factory" },
      { id: "l2", name: "Ofis", description: "Fabrikanın üst katındaki muhasebe ve yönetim ofisi.", icon: "business-center" },
      { id: "l3", name: "Depo", description: "Dolu yağ varillerin istiflendiği geniş depo.", icon: "warehouse" },
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
      { id: "s1", name: "Kaptan", description: "Tekneyi yöneten, suya hiç girmeyen ve dalış teçhizatlarını kullanmayı bilmeyen denizci.", icon: "👨‍✈️" },
      { id: "s2", name: "Asistan Arkeolog", description: "Maktulün bulgularını kendine mal etmek isteyen, hırslı ancak tüplü dalışta acemi araştırmacı.", icon: "👩" },
      { id: "s3", name: "Usta Dalgıç", description: "Ekibin güvenliğinden sorumlu, denizin dibinde saatlerce kalabilen ve tüm ekipmanlara hakim profesyonel.", icon: "👷" },
      { id: "s4", name: "Tarihçi", description: "Yaşı gereği sadece güvertede not tutan, fiziksel efor gerektiren hiçbir işe karışmayan ihtiyar.", icon: "👴" },
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
      { id: "s1", name: "Kıskanç Çırak", description: "Ustasının gölgesinde kalmaktan nefret eden, her yeri boya içinde genç sanat öğrencisi.", icon: "👦" },
      { id: "s2", name: "Sanat Eleştirmeni", description: "Ressamın eserlerini sürekli kötüleyen, ellerini kirletmekten nefret eden titiz ve şık adam.", icon: "🕵️" },
      { id: "s3", name: "Model", description: "Tablo için saatlerce hareketsiz poz veren, güzel ve dikkat çekici genç kadın.", icon: "👩" },
      { id: "s4", name: "Galeri Sahibi", description: "Tablonun satışından milyonlar kazanacak olan, sürekli hesap kitap yapan otoriter kadın.", icon: "👩‍💼" },
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
