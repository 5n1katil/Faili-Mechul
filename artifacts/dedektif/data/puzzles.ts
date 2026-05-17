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
      { id: "c1", text: "Adli rapor: Kurban zehirlenmemiş veya iple boğulmamış; derin bir kesici alet darbesiyle hayatını kaybetmiş.", type: "forensic", isBonus: false },
      { id: "c2", text: "Nazik Hanım gece boyunca Bahçe'de çayını yudumlayarak kitap okuduğunu belirtti ve bu durum doğrulandı.", type: "witness", isBonus: false },
      { id: "c3", text: "Cem Bey'in gece boyunca Kütüphane'den çıkmadığı ve dekorasyonlarla uğraştığı rapor edildi.", type: "witness", isBonus: false },
      { id: "c4", text: "Kan izleri ve boğuşma kanıtları yalnızca arkadaki hazırlık alanında (Mutfak) bulunuyor.", type: "evidence", isBonus: false },
      { id: "c5", text: "Koridor kameraları, Zeynep Hanım'ın olay saatinde Mutfak'tan telaşla çıktığını gösteriyor.", type: "record", isBonus: true },
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
      { id: "s1", name: "Kaptan Levent", description: "Geminin deneyimli kaptanı. Fiziksel olarak oldukça yapılı ve ağır nesneleri kolayca savurabilecek kuvvette.", icon: "solid-captain" },
      { id: "s2", name: "Sponsor Murat", description: "Partinin zengin finansörü. İnce yapılı; ağır fiziksel güç gerektiren işlere ve kirli ortamlara hiç alışkın değil.", icon: "solid-man-tie" },
      { id: "s3", name: "Organizatör Eda", description: "Serginin sorumlusu. Çevik, esnek ve geminin en dar, gizli alanlarında bile rahatça hareket edebilecek fiziksel yapıda.", icon: "solid-woman-elegant" },
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
      { id: "c1", text: "Kurbanın bedeninde hiçbir zehirlenme veya kafatası kırığı izine rastlanmadı; ölüm esnek dokulu bir nesneyle boğularak gerçekleşmişti.", type: "forensic", isBonus: false },
      { id: "c2", text: "Olay yeri inceleme ekipleri, cinayetin aydınlık, temiz veya kameralarla izlenen bir alanda işlenmediğini kesin olarak raporladı.", type: "evidence", isBonus: false },
      { id: "c3", text: "Kaptan Levent'in olay saati boyunca misafirlerle birlikte sürekli geniş ve temiz eğlence alanında olduğu kameralarca doğrulandı.", type: "witness", isBonus: false },
      { id: "c4", text: "İnce yapılı finansörün, fiziksel güç gerektirecek boğuşmalara giremeyeceği ve zemini yağlı alanlara o gece hiç inmediği biliniyor.", type: "evidence", isBonus: false },
      { id: "c5", text: "Sergi sorumlusunun dar alanlara girme yeteneği, onun teknik ekipmanların bulunduğu alt katta gizlice hareket etmesini sağlamıştı.", type: "evidence", isBonus: true },
      { id: "c6", text: "Kurbanın boynundaki kusursuz düğüm izi, esnek gemi ekipmanlarını iyi tanıyan birinin elinden çıkmıştı.", type: "forensic", isBonus: true },
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
      { id: "s1", name: "Ahmet Usta", description: "Komşu bakırcı esnaf. Otuz yıllık tecrübesiyle çarşının her köşesini ezbere bilen, kendi dükkanından çıkmayan geleneksel usta.", icon: "solid-man-worker" },
      { id: "s2", name: "Selma Teyze", description: "Çarşının saygın ve yaşlı muhasebecisi. Rakamlar konusunda hata yapmaz ancak teknolojik cihazlar ve şifrelerle arası hiç iyi değildir.", icon: "solid-woman-old" },
      { id: "s3", name: "Kerem Genç", description: "Stajyer olarak son ay işe başlayan, dijital şifreleme ve kilit teknolojilerine son derece yatkın, meraklı genç çalışan.", icon: "solid-man-boy" },
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
      { id: "c1", text: "Olay yerinde asit yanığı veya tunç kefe izi yoktu; kurbanın başındaki ölümcül yara, kilitleri zorlamak için de kullanılan ağır bir aletle açılmıştı.", type: "forensic", isBonus: false },
      { id: "c2", text: "Cinayet, bekçilerin gezdiği dış alanlarda veya doğrudan sokağı gören aydınlık müşteri alanında gerçekleşmemişti.", type: "evidence", isBonus: false },
      { id: "c3", text: "Komşu esnaf Ahmet Usta, olay saatinde kendi dükkanının aydınlık müşteri alanında vitrinleri düzenliyordu.", type: "witness", isBonus: false },
      { id: "c4", text: "Elektronik şifreli güvenlik odasına girebilmek için teknolojik cihazlara hakim olmak gerekiyordu; yaşlı muhasebeci bu şifreleri bilmiyordu.", type: "evidence", isBonus: false },
      { id: "c5", text: "Stajyer çalışanın dijital yetkinliği, o penceresiz depoya sessizce girmesini sağlamıştı.", type: "evidence", isBonus: true },
      { id: "c6", text: "Kilitlerdeki zorlama izleri ve aletteki kan örneği, çelik aletin doğrudan genç stajyer tarafından kullanıldığını kanıtladı.", type: "forensic", isBonus: true },
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
      { id: "s1", name: "Prof. Kahraman", description: "Son derece rekabetçi ve sert mizaçlı, tüm gününü sadece evrak dolu odasında makale yazarak geçiren kıdemli akademisyen.", icon: "solid-man-glasses" },
      { id: "s2", name: "Asistan Elif", description: "Gecelerini araştırmalara adayan, projenin tüm teknik altyapısına ve voltaj düzeneklerine hakim hırslı doktora öğrencisi.", icon: "solid-woman-glasses" },
      { id: "s3", name: "Güvenlik Görevlisi", description: "Sadece gece vardiyasında çalışan, teknik bilgisi olmayan, binaların fiziksel devriye kontrollerini yapan personel.", icon: "solid-police" },
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
      { id: "c1", text: "Kurbanın vücudunda boğucu gaz tahribatı veya açık bir kesici alet yarası yoktu; ölüm ani bir akım şokuyla gerçekleşmişti.", type: "forensic", isBonus: false },
      { id: "c2", text: "Cinayet, sadece fiziksel devriyelerin atıldığı geçitlerde veya yığınla standart evrak bulunan çalışma odasında işlenmemişti.", type: "evidence", isBonus: false },
      { id: "c3", text: "Kıdemli akademisyenin, olay saati boyunca yığınla dosyanın bulunduğu kendi odasında çalıştığı log kayıtlarıyla kanıtlandı.", type: "record", isBonus: false },
      { id: "c4", text: "Deney cihazlarının bulunduğu odadaki sistemleri sabote etmek, sıradan bir devriye personelinin yapabileceği bir iş değildi; yüksek teknik bilgi şarttı.", type: "evidence", isBonus: false },
      { id: "c5", text: "Tüm voltaj düzeneklerine hakim olan doktora öğrencisinin, o kritik gece deney odasına giren tek kişi olduğu anlaşıldı.", type: "evidence", isBonus: true },
      { id: "c6", text: "Cinayet mahallindeki kasıtlı kısa devre izleri, asistanın eldivenlerindeki yanıklarla birebir örtüşüyordu.", type: "forensic", isBonus: true },
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
      { id: "c1", text: "Adli rapor, kurbanın şerbetten veya temizlik sıvısından değil, fıstıklı bir tatlıya (Baklava) zerk edilen toksinden öldüğünü kanıtladı.", type: "forensic", isBonus: false },
      { id: "c2", text: "Tedarikçi genç, sabah mesaisini sadece malların indirildiği uzak araç yanaşma alanında (Park) geçirdiğini kanıtladı.", type: "witness", isBonus: false },
      { id: "c3", text: "Müşteri Hanım, olay saati boyunca sadece loş arka geçitteki (Ara Sokak) dükkanlardan alışveriş yapıyordu.", type: "witness", isBonus: false },
      { id: "c4", text: "Güvenlik kameraları, cinayetin doğrudan tepsilerin dizildiği Tezgah'ta işlendiğini gösteriyor.", type: "evidence", isBonus: false },
      { id: "c5", text: "Halit Usta'nın tezgahına olay anında yaklaşan tek kişi, yıllardır onu kıskanan Komşu Satıcı'ydı.", type: "evidence", isBonus: true },
      { id: "c6", text: "Komşu Satıcı'nın, zehirli tatlıyı doğrudan kurbanın sergi alanına yerleştirdiği kesinleşti.", type: "record", isBonus: true },
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
      { id: "s1", name: "Küratör Bey", description: "Müzenin yöneticisi. Eserlerin tarihini çok iyi bilir ancak pratik restorasyon işlemleri ve kimyasallar konusunda hiçbir yetkinliği yoktur.", icon: "solid-man-tie" },
      { id: "s2", name: "Restoratör Hanım", description: "Hasar görmüş eserleri hassas sivri aletler ve sıvılarla onaran, depolara giriş izni olan kapalı kapılar ardında çalışan uzman.", icon: "solid-woman-glasses" },
      { id: "s3", name: "Ziyaretçi Rehber", description: "Gündüzleri vitrinlerin önünde turlar düzenleyen, güvenli alanların dışına çıkma yetkisi olmayan sosyal alan görevlisi.", icon: "solid-man-smile" },
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
      { id: "c1", text: "Kurbanın vücudunda ağır bir mermer ezilmesi veya solunum yolunu yakan sprey gazına rastlanmadı; küçük bir sıvı enjeksiyon izi bulundu.", type: "forensic", isBonus: false },
      { id: "c2", text: "Olay mahalli, ziyaretçilere açık aydınlık alanlar veya kamera ekranlarının bulunduğu personel merkezi değildi.", type: "evidence", isBonus: false },
      { id: "c3", text: "Ziyaretçi rehberinin o gece sadece vitrinlerin bulunduğu aydınlık salonda sayım yaptığı turnike loglarıyla kesinleşti.", type: "record", isBonus: false },
      { id: "c4", text: "Yetkisiz personelin giremediği kilitli odaya girmek ve hassas enjeksiyonları kullanmak, sadece teori bilen bir yöneticinin yapabileceği bir iş değildi.", type: "evidence", isBonus: false },
      { id: "c5", text: "Onarım bekleyen eserlerin tutulduğu kilitli odaya cinayet saati yetkili şifresiyle giren tek kişi Restoratör Hanım'dı.", type: "evidence", isBonus: true },
      { id: "c6", text: "Kurbanın ensesindeki o sinsi sıvı, restoratörün özel alet çantasından çalınan anestezik tüple birebir aynıydı.", type: "forensic", isBonus: true },
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
      { id: "c1", text: "Adli rapor, kurbanın ateşli silahla vurulmadığını veya zehirlenmediğini; boynuna dolanan kalın bir gemi halatıyla boğulduğunu kanıtladı.", type: "forensic", isBonus: false },
      { id: "c2", text: "Emekli Albay, o sabah Sahil Şeridi'nde yürüyüş yaptığını ve olay yerine hiç gelmediğini tanıklarla doğruladı.", type: "witness", isBonus: false },
      { id: "c3", text: "Ressam Leyla'nın olay saatinde sarp ve yüksek Kayalık'ta manzara resmi çizdiği tespit edildi.", type: "witness", isBonus: false },
      { id: "c4", text: "Olay yeri incelemesi, cinayetin doğrudan havuzla süslü Villa Bahçesi'nde işlendiğini kesinleştirdi.", type: "evidence", isBonus: false },
      { id: "c5", text: "Genç Yatçı'nın teknesinden eksilen halat parçasının, cinayet silahı ile birebir aynı olduğu anlaşıldı.", type: "evidence", isBonus: true },
      { id: "c6", text: "Villa bahçesindeki çamurlu ayak izleri, Genç Yatçı'nın özel yapım tekne ayakkabılarıyla tam olarak eşleşiyordu.", type: "forensic", isBonus: true },
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
      { id: "s1", name: "İş Kadını", description: "Sürekli evrak çantasıyla gezen, gergin, sabırsız ve hassas işlemlere eli hiç yatkın olmayan birinci mevki yolcusu.", icon: "solid-woman-suit" },
      { id: "s2", name: "Üniversite Öğrencisi", description: "Kulağında kulaklıkla kendi odasından hiç çıkmayan, etrafındaki insanlarla sıfır etkileşim kuran ucuz biletli genç yolcu.", icon: "solid-man-boy" },
      { id: "s3", name: "Emekli Doktor", description: "Anatomik bilgiye sahip, yanında sürekli çeşitli sıvılar ve aletlerin bulunduğu küçük tıbbi çantalar taşıyan sakin yaşlı yolcu.", icon: "solid-man-old" },
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
      { id: "c1", text: "Adli tabip, ölümün kesici bir yarayla veya boyna uygulanan mekanik bir halat baskısıyla değil, içsel bir şokla gerçekleştiğini raporladı.", type: "forensic", isBonus: false },
      { id: "c2", text: "Olay, sadece biletli yolcunun girdiği dar konaklama odalarında veya kapısı içeriden kilitlenebilir küçük arka alanlarda işlenmemişti.", type: "evidence", isBonus: false },
      { id: "c3", text: "Genç yolcunun yolculuk boyunca sadece kendi biletli dar odasında kulaklıkla oturduğu bilet kondüktörü tarafından teyit edildi.", type: "witness", isBonus: false },
      { id: "c4", text: "Ortak servis alanında sinsi bir sıvıyı hissettirmeden bardağa damlatmak titiz bir el alışkanlığı gerektirirdi; sabırsız ve gergin birinin yapabileceği iş değildi.", type: "evidence", isBonus: false },
      { id: "c5", text: "Tıbbi anatomi bilgisine sahip yaşlı yolcunun, beyaz örtülü masaların bulunduğu vagonda maktulün karşısına oturduğu doğrulandı.", type: "witness", isBonus: true },
      { id: "c6", text: "Maktulün çay bardağındaki renksiz sıvı, doktorun çantasından çıkan o tehlikeli maddenin ta kendisiydi.", type: "forensic", isBonus: true },
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
      { id: "c1", text: "Adli rapor: Maktulün şerbetle veya acı sabunla zehirlenmediği, doğrudan çıplak ellerle boğulduğu doğrulandı.", type: "forensic", isBonus: false },
      { id: "c2", text: "Veznedar'ın, olay gecesi vardiyası boyunca aydınlık Giriş Salonu'ndan hiç ayrılmadığı çalışanlarca doğrulandı.", type: "witness", isBonus: false },
      { id: "c3", text: "Hamam Ağası'nın gece boyunca dinlenme alanı olan Soğuk Oda'da uyuyakaldığı tespit edildi.", type: "witness", isBonus: false },
      { id: "c4", text: "Boğuşma izlerinin sadece yüksek nemli ve buharlı Sıcak Oda'da olduğu saptandı.", type: "evidence", isBonus: false },
      { id: "c5", text: "Olay saatinde Sıcak Oda'da kurbanla yalnız kalan tek kişi, güçlü kollara sahip Tellak'tı.", type: "evidence", isBonus: true },
      { id: "c6", text: "Kurbanın boynundaki ekimoz izlerinin çapı ve baskı şiddeti, Tellak'ın devasa elleriyle birebir eşleşiyordu.", type: "forensic", isBonus: true },
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
      { id: "s1", name: "Galeri Direktörü", description: "Tüm organizasyonu yöneten, güvenlik protokollerini teorik olarak bilen ancak fiziksel müdahale yeteneği olmayan yönetici.", icon: "badge" },
      { id: "s2", name: "Ünlü Sanatçı", description: "Gala konuğu. Kaprisli, şımarık görünen ancak teknolojik sanat enstalasyonları sayesinde elektronik sistemlere son derece hakim figür.", icon: "face" },
      { id: "s3", name: "Güvenlik Şefi", description: "Müze güvenliğinden sorumlu, kaslı ve iri yarı eski bir asker. Kameraların kör noktalarını ezbere biliyor.", icon: "local-police" },
      { id: "s4", name: "Nakliyeci", description: "Eserleri taşıyan lojistik sorumlusu. Sadece yükleme alanlarına erişimi olan, kaba kuvvet gerektiren işlere alışkın işçi.", icon: "engineering" },
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
      { id: "c1", text: "Kurbanın vücudunda iğne izi, kanama veya gaz tahribatı yoktu; ani bir voltaj şokuyla sinir sistemi kilitlenmişti.", type: "forensic", isBonus: false },
      { id: "c2", text: "Saldırı kalabalık salonlarda, rüzgarlı dış çıkış noktalarında veya tozlu eski depolarda gerçekleşmemişti.", type: "evidence", isBonus: false },
      { id: "c3", text: "Ağır kasaları taşıyan nakliye görevlisinin, olaydan saatler önce müzeden ayrıldığı dış kamera loglarıyla kanıtlandı.", type: "record", isBonus: false },
      { id: "c4", text: "Galeri direktörünün gece boyunca sergi salonunda VIP misafirlerle röportaj verdiği onlarca tanıkla teyit edildi.", type: "witness", isBonus: false },
      { id: "c5", text: "Güvenlik şefinin o gece resmi izinli olduğu ve şehir dışında bir seminerde bulunduğu İK kayıtlarıyla kesinleşti.", type: "record", isBonus: true },
      { id: "c6", text: "Elektronik sistemlere hakim olan Ünlü Sanatçı'nın özel izinle girdiği o kapalı izole odada sistemi çökerttiği ortaya çıktı.", type: "evidence", isBonus: true },
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
      "Çarşamba kasabasının o sakin ve durağan yapısı, belediye başkanının kendi makam odasında ölü bulunmasıyla temelinden sarsıldı. Kasaba halkı şoktayken, cinayetin dışarıdan gelen biri tarafından değil, en yakınındaki yüzlerden biri tarafından işlendiği ortaya çıktı.",
    suspects: [
      { id: "s1", name: "Muhalefet Adayı", description: "Başkanın siyasi rakibi. Makam odasına girmesi yasak olan, sadece resmi toplantılarda binaya adım atabilen figür.", icon: "badge" },
      { id: "s2", name: "Sekreter Bayan", description: "Yıllardır başkanın sağ kolu olan, içecek servisinden randevulara kadar makam odasına sürekli girip çıkma yetkisi olan çalışan.", icon: "support-agent" },
      { id: "s3", name: "İnşaat Müteahhit", description: "Belediyeyle ihale anlaşmazlığı yaşayan, başkanla özel görüşme talep eden ancak ofis alanlarına alınmayan öfkeli iş adamı.", icon: "engineering" },
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
      { id: "c1", text: "Maktulde elektrik yanığı veya kafatası travması yaratan ağır bir nesne izi yoktu; ölüm hazırlanmış bir sıvının içilmesiyle gerçekleşmişti.", type: "forensic", isBonus: false },
      { id: "c2", text: "Cinayet, kameralarla izlenen geniş bekleme geçitlerinde veya oval masalı kalabalık toplanma alanında değil, doğrudan kurbanın kendi alanında işlenmişti.", type: "evidence", isBonus: false },
      { id: "c3", text: "Öfkeli iş adamının o sabah bina içine hiç alınmadığı ve dışarıdaki geniş bekleme alanında beklediği kameralarla doğrulandı.", type: "record", isBonus: false },
      { id: "c4", text: "Olayın gerçekleştiği özel deri koltuklu odaya girmesi yasak olan siyasi rakiplerin o sabah odaya kesinlikle yaklaşmadığı anlaşıldı.", type: "evidence", isBonus: false },
      { id: "c5", text: "O özel makam odasına kendi elleriyle sinsi bir içecek götürebilecek tek kişi, yıllardır orada çalışan sağ koluydu.", type: "evidence", isBonus: true },
      { id: "c6", text: "Fincanın dibindeki toksin, bu suikastın makam odasına sınırsız erişimi olan Sekreter tarafından kusursuzca planlandığını kanıtlıyordu.", type: "forensic", isBonus: true },
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
      "Ankara'daki yıllık folklor festivalinde, organizasyonun baş koordinatörü sahnede aniden yere yığıldı.",
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
        text: "adli tıp kurbanın sahne ekipmanından kaynaklanan elektrik travması yaşadığını tespit etti; elektrikleme sahne üzerinde gerçekleşti.",
        type: "forensic",
        isBonus: false,
      },
      {
        id: "c2",
        text: "rakip sanatçı festival sahasında yalnızca kontrol odası bölgesinde bulundu; festival yönetimi bunu kamera kayıtlarıyla doğrulayabilir.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c3",
        text: "sponsorların temsilcisi soyunma odasında müzisyenlerle bekledi; çoklu kamera ve tanık onu o bölgeden ayrılmadan gösteriyor.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c4",
        text: "soyunma odasında açılmamış zehirli su şişesi bulundu; şişe o mekâna ait, oraya bırakılmıştı.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c5",
        text: "sahne elektriğinin son bağlantı kaydı, ses teknisyeninin imzasıyla yapılan müdahaleye işaret ediyor.",
        type: "evidence",
        isBonus: true,
      },
      {
        id: "c6",
        text: "sponsorların temsilcisi mali görüşmeden sonra mekandan erken ayrıldı; güvenlik loglarında çıkış saati kayıtlı.",
        type: "witness",
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
      "Üniversite kütüphanesinde, gece bekçisi sabah sessiz okuma salonunda bir akademisyen buldu. Çok değerli el yazmaları yok olmuştu.",
    suspects: [
      { id: "s1", name: "Kütüphaneci", description: "30 yıllık emektarı", icon: "elderly" },
      { id: "s2", name: "Doktora Öğrencisi", description: "El yazmalarını araştırıyordu", icon: "face" },
      { id: "s3", name: "Temizlik Görevlisi", description: "Gece 02.00'de çalışıyor", icon: "person" },
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
        text: "el yazmaları bölümünün rafında kan izleri ve ansiklopedik bir cildin bıraktığı keskin kenar izi bulundu; ağır kitap burada kullanılmış.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c2",
        text: "okuma salonunda antika baskı presi yerinden hiç kımıldamamıştı; geceleri oradan taşınmaz, orada durmaya devam ediyor.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c3",
        text: "kütüphaneci o gece okuma salonunda raf toparlaması yapıyordu; gece bekçisi saat 23.00'e dek onu orada gördüğünü beyan etti.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c4",
        text: "katalog odasında temizlik malzemeleri ve taze kimyasal solüsyon izi bulundu; temizlik görevlisi araçlarını buraya bırakmıştı.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c5",
        text: "adli inceleme: kurbanın kafasında ağır, düz kenarlı cisimle darbe izi; ağır kitap profiliyle tam örtüşüyor.",
        type: "forensic",
        isBonus: true,
      },
      {
        id: "c6",
        text: "gece nöbetçisi el yazmaları bölümünün önünden geçerken doktora öğrencisini çıkarken gördü; saat 03.15'ti.",
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
      "Ege kıyısındaki küçük bir balıkçı köyünde, turistik bir otel sahibi öldürüldü. Gece yarısı küçük köy karanlığa gömülüydü.",
    suspects: [
      { id: "s1", name: "Yerli Balıkçı", description: "Otelin açılmasına karşıydı", icon: "elderly" },
      { id: "s2", name: "Tur Rehberi", description: "Konukseverlik sektörü rakibi", icon: "support-agent" },
      { id: "s3", name: "Mülk Sahibi", description: "Arazi anlaşmazlığı var", icon: "account-circle" },
      { id: "s4", name: "Aşçı", description: "Kovulma korkusu yaşıyordu", icon: "person" },
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
        text: "kayalık burundaki çatlak yüzeyde taze çarpma izi ve kan örneği bulundu; kurban oraya itilip düşmüş.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c2",
        text: "aşçı tüm gece otel mutfağında çalıştı; hem mutfak personeli hem lobi kamerası bunu baştan sona doğruluyor.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c3",
        text: "tur rehberi o gece kasabada değildi; şehirden dönen otobüste bilet kontrolü onu takip ediyor — otele lobi girişinden girdi.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c4",
        text: "balıkçı tüm gece sahil kenarında ağlarını onarıyordu; komşu balıkçı ve kıyı güvenlik kamerası bunu teyit ediyor.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c5",
        text: "sahil kenarında uzun balıkçı bıçağı yağ bezi içinde sarılı bulundu; kıyı aletleri deposuna ait, taşınmamıştı.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c6",
        text: "adli tıp: kayadan düşme travması kesin; bıçak, zehir ya da ip izi bulunmadı.",
        type: "forensic",
        isBonus: true,
      },
      {
        id: "c7",
        text: "otel mutfağında sarımlı ip ve bağlama düğümü tespit edildi; mutfak rafına ait ekipman.",
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
      "Eskişehir'deki tarihi saat fabrikasında, fabrika müdürü öldürüldü. İşçiler sabah bunu öğrenince şoke oldu.",
    suspects: [
      { id: "s1", name: "İşçi Başı", description: "Sendika temsilcisi", icon: "engineering" },
      { id: "s2", name: "Muhasebe Müdürü", description: "Mali anlaşmazlık vardı", icon: "badge" },
      { id: "s3", name: "Makine Mühendisi", description: "Fabrikayı tasarlamıştı", icon: "account-circle" },
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
        text: "üretim alanında dökülen yağ birikintisinin yanı başında çekiç izi ve kan sıçraması tespit edildi; alet burada kullanılmış.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c2",
        text: "müdür odasında makine parçaları envanterle uyumlu düzende duruyordu; müdür masasının hemen yanında yerli yerindeydi.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c3",
        text: "muhasebe müdürü akşam bütçe toplantısı için şehir dışındaydı; dönüş biletinin saati onu müdür odasında konumlandırıyor.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c4",
        text: "kontrol odasında zehirli kimyasal solüsyon izi bulundu; penceresiz ortamda birikim oluşmuştu ve makine mühendisi buradan çalışıyordu.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c5",
        text: "adli inceleme: kafada düz yüzeyli ağır cisimle darbe izi; çekiç profiliyle tam örtüşüyor.",
        type: "forensic",
        isBonus: true,
      },
      {
        id: "c6",
        text: "gece vardiyasındaki iki işçi, işçi başı ile fabrika müdürünün yüksek sesle tartıştığını duydu — tam da olay gecesi.",
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
      "Kadıköy'ün işlek bir kafesinde, tanınmış bir gazeteci çay içerken aniden yere düştü. Yanındaki dizüstü bilgisayarı da kaybolmuştu.",
    suspects: [
      { id: "s1", name: "Kafe Sahibi", description: "Politika eleştirilerinden rahatsızdı", icon: "elderly" },
      { id: "s2", name: "Garson", description: "Genç ve yeni işe başlamış", icon: "person" },
      { id: "s3", name: "Müşteri", description: "Masanın bitişiğinde oturuyordu", icon: "face" },
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
        text: "kanda hızlı etkili toksin tespit edildi; içecekle alındığı kesinleşti. çay demliğinde kimyasal kalıntı bulundu, olay kafe içinde gerçekleşti.",
        type: "forensic",
        isBonus: false,
      },
      {
        id: "c2",
        text: "dış terasın zemin taşlarında şırınga kılıfı bulundu; enjeksiyon maddesine ait miktar açık havada kullanılmışlıkla uyumlu.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c3",
        text: "kafe sahibi tüm gece kasada oturdu; ödeme kayıtları ve kamera onu tuvalet koridorunda gösteriyor — kafe içine pek geçmedi.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c4",
        text: "müşteri tüm oturumu boyunca dış terastaki masasında kaldı; içeriye girmedi, çaya hiç dokunmadı.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c5",
        text: "garson çayı bizzat hazırladı ve masaya taşıdı; tezgah kamerası bu anı kayıt altına almış.",
        type: "direct",
        isBonus: true,
      },
      {
        id: "c6",
        text: "kafede herhangi bir patlama ya da ani ses yaşanmadı; gürültü bombası ihtimali tamamen dışlandı.",
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
      "Türkiye'nin en seçkin araştırma kurumunda, bir ekip başkanı araştırma toplantısında ölü bulundu. Yeni keşfedilen proje verileri de yok olmuştu.",
    suspects: [
      { id: "s1", name: "Baş Araştırmacı", description: "Kariyerini projeye adamıştı", icon: "badge" },
      { id: "s2", name: "Veri Analisti", description: "Verilere tek erişimi olan", icon: "account-circle" },
      { id: "s3", name: "Etik Komite Üyesi", description: "Projeye itiraz etmişti", icon: "elderly" },
      { id: "s4", name: "Yazılım Mühendisi", description: "Güvenlik sistemini tasarladı", icon: "engineering" },
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
        text: "toplantı odasındaki sandalye devrilmiş ve boyun hizasında el baskısı izleri bırakmış; boğma burada gerçekleşti.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c2",
        text: "sunucu odasındaki kablo düzeneğine müdahale kaydı bulundu; sistem erişim logu bilgisayar şokuna işaret ediyor.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c3",
        text: "yazılım mühendisi sistemi güncellemek için tüm gece araştırma laboratuvarındaydı; erişim logu bunu doğruluyor.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c4",
        text: "etik komite üyesi toplantı iki saat önce binayı terk etmişti; çıkış turnike kaydı onu güvenli alana yerleştirmiş.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c5",
        text: "güvenli alanda zehirli iğne kutusunu anımsatan plastik kılıf bulundu; kimyasal analize göre nörotoksin izleri taşıyor.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c6",
        text: "veri analistinin giriş kartı sunucu odasında gece geç saate kadar aktif kaldığı kayıt altına alındı; güvenlik log kaydı bunu doğruluyor.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c7",
        text: "toplantı odasında baş araştırmacı'ya ait dna örneği kurbanın yakınında tespit edildi; iki çalışan toplantı öncesi tartışmayı duyduğunu beyan etti.",
        type: "forensic",
        isBonus: true,
      },
      {
        id: "c8",
        text: "baş araştırmacı'nın montunda kurbanın saç teli ve boyun bölgesine ait doku örneği bulundu; el baskısıyla oluşan terleme kalıntısı mevcut.",
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
      "Dolmabahçe Sarayı'nda özel bir gala yemeğinde, değerli bir elçi zehirlendi. Sarayın prestiji tehlikedeydi.",
    suspects: [
      { id: "s1", name: "Protokol Şefi", description: "Daveti organize etti", icon: "badge" },
      { id: "s2", name: "Özel Aşçı", description: "Yemekleri hazırladı", icon: "person" },
      { id: "s3", name: "Yabancı Diplomat", description: "Elçiyle tartışma yaşandı", icon: "account-circle" },
      { id: "s4", name: "Saray Kütüphanecisi", description: "Davette geziniyordu", icon: "elderly" },
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
        text: "saray kimya laboratuvarı: kanda toksin yalnızca katı gıdayla uyumlu; şarapta, suda ya da diğer içeceklerde iz yok. toksin yalnızca yemek tabağına aitti — olay yemek salonunda gerçekleşti.",
        type: "forensic",
        isBonus: false,
      },
      {
        id: "c2",
        text: "kütüphanede limon kabuğu rakısı ve şişe bulundu; içecek orada saklanmaktaydı.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c3",
        text: "kütüphaneci tüm gece kütüphanede kitap tasnif etti; güvenlik logları o odadan çıkmadığını gösteriyor.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c4",
        text: "yabancı diplomat perhiz yapıyordu; kendi talebiyle bahçe terasında ayrı sofra kuruldu, yemek salonuna girmedi.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c5",
        text: "mutfakta zehirli şarap kadehi ve şişe kalıntısı bulundu; şarap mutfak rafında saklanmaktaydı.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c6",
        text: "protokol şefi yemek siparişini verdi; kamera kaydı onu mutfakta gösteriyor.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c7",
        text: "özel aşçı mutfakta tek kişi olarak tabakları hazırladı ve bizzat servis etti; yemek salonundaydı.",
        type: "direct",
        isBonus: true,
      },
      {
        id: "c8",
        text: "türk saray kimyacısı toksinin organik kökenli olduğunu belirtti; yemek tabağıyla tam uyumlu.",
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
      "Doğu Anadolu'nun şenlikli bir köyünde, düğün gecesi gelinin babası hayatını kaybetti. Müzik susmuş, şenlik kana bulanmıştı.",
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
        text: "adli tıp: kurban ateşli silahla öldürülmüş; bıçak ya da zehir izi yok. silah sesi ahır arkası yönünden geldiği tanıklar tarafından bildirildi.",
        type: "forensic",
        isBonus: false,
      },
      {
        id: "c2",
        text: "damat düğün çadırında eşiyle el ele durdu; yüzlerce misafir onu çadırdan ayrılmadığı için doğrulayabilir.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c3",
        text: "fotoğrafçı köy meydanında saatlerce fotoğraf çekti; dijital çekim saatleri ve birden fazla kişi onu orada gördüğünü doğruluyor.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c4",
        text: "köy meydanında yarım içilmiş, bitkisel kökenli zehir şişesi bulundu; fotoğrafçının çantasının yanında bırakılmıştı.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c5",
        text: "muhtar arazi davasını kazanmak için her yola başvurmuştu; ahır arkasına gittiği bir tanık tarafından görüldü.",
        type: "direct",
        isBonus: true,
      },
      {
        id: "c6",
        text: "ahır arkasında muhtara ait av tüfeğinin boş kartuşu bulundu; parmak izi analizi muhtarı son kullanan kişi olarak gösteriyor.",
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
      "Gece turu sırasında Galata Kulesi'nde bir rehber gözden kayboldu. Sabah kapılar açıldığında kule tepesinde bir ceset bulundu. Katil, karanlıkta izini kaybettirmişti.",
    suspects: [
      { id: "s1", name: "Serhat Dönmez", description: "Deneyimli şehir turu rehberi", icon: "support-agent" },
      { id: "s2", name: "Nilgün Arslan", description: "Fotoğraf tutkunu turist", icon: "account-circle" },
      { id: "s3", name: "Bekir Yıldız", description: "Kule güvenlik görevlisi", icon: "local-police" },
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
        text: "adli tıp: kurban yüksekten düşme travmasıyla hayatını kaybetmiş; kesici ya da künt cisim yaralanması yok. kan izleri kule tepesinde başlıyor.",
        type: "forensic",
        isBonus: false,
      },
      {
        id: "c2",
        text: "tünel girişindeki halat deposunda ip izleri ve düğüm izi bulundu; kalın naylon halat buraya ait, taşınmamıştı.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c3",
        text: "nilgün arslan giriş güvenlik kamerasında görüntülendi; kuleye hiç çıkmadığı, yalnızca tünel girişinde beklediği kayıt altında.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c4",
        text: "serhat dönmez grubu erken bırakıp teknik odada beklediğini söyledi; grubun her üyesi onu teknik odada gördüğünü doğruladı.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c5",
        text: "kule tepesine erişim yalnızca güvenlik yetkilisinin master anahtarıyla mümkündü; son giriş kaydı bekir yıldız'a ait.",
        type: "direct",
        isBonus: true,
      },
      {
        id: "c6",
        text: "kule tepesindeki parmaklık çevresinden alınan dna örneği bekir yıldız ile eşleşti.",
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
      "Yüksek profilli bir diplomatik ziyaret sırasında sarayın selamlık bölümünde misafirlerden biri hayatını kaybetti. Protokol gereği herkes yerini biliyordu; katil de.",
    suspects: [
      { id: "s1", name: "Nazife Hanım", description: "Uzun süreli protokol sorumlusu", icon: "badge" },
      { id: "s2", name: "İdris Bey", description: "Büyükelçi, diplomatik dokunulmazlık sahibi", icon: "elderly" },
      { id: "s3", name: "Hanzade", description: "Resmi tercüman, dil uzmanı", icon: "face" },
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
        text: "adli tıp: zehirleme kesinleşti; bıçak ya da ateşli silah yaralanması yok. çay fincanında toksin ve olay selamlık salonunda gerçekleşti.",
        type: "forensic",
        isBonus: false,
      },
      {
        id: "c2",
        text: "boğaz balkonunda ince bıçak kılıfı bulundu; tören protokolüne ait kılıf balkona bırakılmıştı.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c3",
        text: "idris bey, ziyareti boyunca protokol subayları eşliğinde kristal merdivenin çevresinde hareket etti; selamlık salonuna hiç girmedi.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c4",
        text: "hanzade diplomatik konuşmaları tercüme ederken boğaz balkonu'ndaydı; selamlık salonuna girmediğine dair kamera kaydı var.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c5",
        text: "nazife hanım her misafir için ayrı çay hazırladı; selamlık salonuna o gün birden fazla çay tepsisi taşıdı.",
        type: "direct",
        isBonus: true,
      },
      {
        id: "c6",
        text: "kurbanın çay fincanı üzerinde yalnızca nazife hanım'ın parmak izleri belirlendi; zehir çay içindeydi.",
        type: "forensic",
        isBonus: true,
      },
      {
        id: "c7",
        text: "selamlık salonunun özel demlik rafında nazife'ye ait ilaç tozu kalıntıları bulundu.",
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
      "Sis içindeki Boğaz'da sabah vapuruna binen bir yolcu hiçbir zaman karşı yakaya çıkmadı. Seyahat kayıtları tutuyordu ama bir kişi gerçeği gizlemişti.",
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
        text: "motor dairesinin zemin bordürüne sıkışmış halat lifi bulundu; boğma bu alt katta, halatla gerçekleşti.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c2",
        text: "üst güvertede ağır metal sinyalizasyon feneri konuşlandırılmıştı; fener o bölgeye ait, taşınmamıştı.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c3",
        text: "fatma reis yolculuk boyunca üst güvertede denizci yardımcısıyla birlikte görüntülendi; kameralar onu oradan ayrılmadığını gösteriyor.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c4",
        text: "irem şen biletini gösterdi ve kurbanı en son görenlerden biriydi; iskele bölgesinde beklediğini kendisi de ifade etti.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c5",
        text: "motor dairesine erişmek için kapı kodu gerekiyor; kod yalnızca personelde kayıtlı, muzaffer'in kodu bildiği göreve başlarken imzalattırıldı.",
        type: "direct",
        isBonus: true,
      },
      {
        id: "c6",
        text: "motor dairesinin kapı çerçevesinde muzaffer'e ait parmak izleri ve halat lifi bulundu.",
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
      "Art Nouveau Beyoğlu pasajında, bir antikacının arka deposunda gizli bir toplantı kan içinde bitti. Dedektif, pasajın karmaşık insan ağını çözmeliydi.",
    suspects: [
      { id: "s1", name: "Orhan Aras", description: "Antikacı, kırk yıllık pasaj esnafı", icon: "elderly" },
      { id: "s2", name: "Suna Çakır", description: "Hukuk bürosu ortağı avukat", icon: "badge" },
      { id: "s3", name: "Talip Uzun", description: "Pasaj girişinde sebze ve meyve satan manav", icon: "person" },
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
        text: "arka deponun raflarından devrilmiş mermer büst bulundu; büstün kenarında kan izi vardı — künt cisimle darbe burada gerçekleşti.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c2",
        text: "çatı katındaki eski kablo tesisatından sökülen hasar görmüş tel uzun süredir orada duruyordu; çatı katına aitti.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c3",
        text: "suna çakır baro toplantısından sonra çatı katına çıktığını söyledi; güvenlik logu bunu doğruluyor.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c4",
        text: "talip uzun tüm öğleden sonra pasaj koridorundaki tezgâhında olduğunu birden fazla komşu satıcı doğruladı.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c5",
        text: "orhan aras'ın deposundaki envanter defterinde kayıtlı mermer büstün eksik olduğu belirlendi; olay yerinde benzer boyut ve ağırlıkta iz mevcut.",
        type: "direct",
        isBonus: true,
      },
      {
        id: "c6",
        text: "depodaki kan izleri üzerinde yapılan analiz orhan aras'ın dna'sıyla örtüştü.",
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
      "Boğaz kıyısındaki sarayda düzenlenen maskeli baloda kimse kimseyi tanımıyordu. Sabahleyin bir maske yerde bulundu, altında ise bir gerçek.",
    suspects: [
      { id: "s1", name: "Prens Hüseyin", description: "Saraylı ev sahibi ve organizatör", icon: "account-circle" },
      { id: "s2", name: "Madam Silvana", description: "İtalyan soprano, gecenin yıldız sanatçısı", icon: "face" },
      { id: "s3", name: "Teğmen Ferhat", description: "Saraya yakın protokol subayı", icon: "local-police" },
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
        text: "adli tıp: bıçak yaralanmasına bağlı iç kanama; kan izleri gizli geçitte başlıyor, kurban orada vurulmuş.",
        type: "forensic",
        isBonus: false,
      },
      {
        id: "c2",
        text: "balo salonundaki şampanya masasında özel kadeh ve şişe koleksiyonu teşhir edilmekteydi; şampanya oraya aitti.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c3",
        text: "prens hüseyin gecenin tamamında balo salonunda misafirlere eşlik etti; onu her on dakikada bir gören düzinelerce tanık var.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c4",
        text: "madam silvana sahne performansını tamamladıktan sonra resmi alkışlarla boğaz iskelesi'ne uğurlandı; kayıt cihazları onu sahneden iskeleye geçişiyle belgeler.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c5",
        text: "gizli geçidin giriş noktasına yalnızca saray subaylarına ait özel bir kartla erişilebiliyor; teğmen ferhat'ın kartı son giriş kaydını taşıyor.",
        type: "direct",
        isBonus: true,
      },
      {
        id: "c6",
        text: "geçitte bulunan çizme izi boyutu ve şekli teğmen ferhat'ın askeri botlarıyla örtüşüyor; kılıf parçası da ona ait.",
        type: "evidence",
        isBonus: true,
      },
      {
        id: "c7",
        text: "ferhat'ın kıyafetinde bıçakla uyumlu kesik ve olay yerine ait kan grubu tespit edildi.",
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
      "Tarihi yarımadanın kalbinde, bir turist sarnıç içinde baygın halde bulundu. Yanında ne değerli eşyası ne de anıları kalmıştı.",
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
        text: "yerebatan sarnıcı girişinde devrilmiş masa ile küçük cam şişe bulundu; şişe kalıntısı sersemletici madde içeriyordu — olay burada gerçekleşti.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c2",
        text: "hipodrom meydanı'nın çevre taşlarında boş biber gazı kılıfı bulundu; hipodrom bölgesine ait malzeme.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c3",
        text: "rüzgar, simitçi tezgâhından ayrılmadığını hipodrom güvenlik kamerasıyla belgeledi; tüm gün orada kaldı.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c4",
        text: "haluk çiçek eski bedesten'deki fotoğraf çekimini exif verisiyle kanıtladı; tüm fotoğraflar aynı saate damgalı, oradan ayrılmadı.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c5",
        text: "ayşen demir kurbanla o gün tur kapsamında yerebatan sarnıcı'nı ziyaret etti; son yarım saati ikisi baş başa geçirdi.",
        type: "direct",
        isBonus: true,
      },
      {
        id: "c6",
        text: "sarnıçtaki şişenin üzerinde ayşen demir'e ait parmak izleri tespit edildi.",
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
      "Büyükada'da motorlu araç olmaz; at arabaları hükmeder. O sabah dik tepe yolunda bir fayton frensiz yokuş aşağı gitti ve geri dönmedi.",
    suspects: [
      { id: "s1", name: "Hayriye", description: "Arabacı, faytonların bakımından sorumlu", icon: "elderly" },
      { id: "s2", name: "Fikret Bey", description: "Konak sahibi, Ada'nın en zengin sakini", icon: "account-circle" },
      { id: "s3", name: "Sevim", description: "Konağın aşçısı, on yıldır adada çalışıyor", icon: "face" },
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
        text: "teknik inceleme: fayton fren mekanizması kasıtlı olarak sabote edilmiş; vida yuvaları elle gevşetilmiş ve kaza dik tepe yolunda gerçekleşti.",
        type: "forensic",
        isBonus: false,
      },
      {
        id: "c2",
        text: "konak bahçesinin depo köşesinde zehirli muhallebi kabı bulundu; mutfaktan ayrılan pişirme kâsesiyle uyumlu.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c3",
        text: "fikret bey kazanın gerçekleştiği saat aralığında konakta misafirleriyle çay içiyordu; dört kişi konak bahçesinde olduğunu doğruladı.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c4",
        text: "sevim sabah erkenden plaj kulübesine koştu; mutfak personeli onu kulübeye giderken gördü ve sabah saatlerinde orada kaldı.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c5",
        text: "fayton bakım defterleri ve araç envanter kayıtları, fren sistemine son el atan kişinin hayriye olduğunu gösteriyor.",
        type: "direct",
        isBonus: true,
      },
      {
        id: "c6",
        text: "hayriye'nin banka hesabına anonim bir hesaptan nakit aktarım yapıldığı tespit edildi.",
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
      "Boğaz kıyısı meyhanesinde bir müdavim sabah masasında baygın halde bulundu. Önündeki kadeh doluydu ama bir şeyler farklıydı.",
    suspects: [
      { id: "s1", name: "Bora Deniz", description: "Çeyrek asrı geçkin deneyimli balıkçı", icon: "engineering" },
      { id: "s2", name: "Esma Hanım", description: "Meyhane sahibesi, mahalle simgesi", icon: "elderly" },
      { id: "s3", name: "Taner Öz", description: "Mahalle doktoru, ara sıra meyhanede misafir", icon: "badge" },
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
        text: "adli tıp: alkol bazlı zehirleme kesinleşti; şişenin içeriği meyhanedeki özel koleksiyona ait rakı şişesiyle eşleşti — olay iç salondaydı.",
        type: "forensic",
        isBonus: false,
      },
      {
        id: "c2",
        text: "balıkçı barınağında uzun metal zıpkın tekne konteynırına dayanmış bulundu; barınağa ait alet, taşınmamıştı.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c3",
        text: "bora deniz gece boyunca teknede bakım yaptığını balıkçı barınağındaki iki komşu onayladı; barınaktan ayrılmadı.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c4",
        text: "taner öz'ün o gece nöbetçi doktor olduğu hastane kayıtlarıyla kesinleşti; gece boyunca boğaz kıyısından kontrol geçişi yaptı.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c5",
        text: "garson ifadesine göre esma hanım kurbana kendi özel koleksiyonundan ayrı bir şişeyle servis yaptı.",
        type: "direct",
        isBonus: true,
      },
      {
        id: "c6",
        text: "zehirlenen şişe esma hanım'ın kişisel dolabından çıktı; parmak izleri de yalnızca ona ait.",
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
      "Topkapı Müzesi'nde hafıza tazeleme çalışması sırasında yüzyıllık bir Osmanlı hançeri kayboldu. Sabah vardiyası geldiğinde, hazine odasında bir ceset bekliyordu.",
    suspects: [
      { id: "s1", name: "Müdür Altan", description: "Müze direktörü, otuz yıllık bürokrat", icon: "badge" },
      { id: "s2", name: "Dr. Pervin", description: "Arkeolog, gece kazı ekibini yönetiyor", icon: "account-circle" },
      { id: "s3", name: "Restoratör Cemil", description: "Eser onarımıyla sorumlu kıdemli restoratör", icon: "handyman" },
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
        text: "adli tıp: sedatif etkili madde enjeksiyonu kesinleşti; kesici alet ya da kimyasal gaz yaralanması yok. atölye köşesinde enjektör kalıntısı bulundu.",
        type: "forensic",
        isBonus: false,
      },
      {
        id: "c2",
        text: "hazine odasında yüzyıllık hançer reprodüksiyonu teşhirlik koleksiyonda sergileniyordu; originine en yakın kopya orada muhafaza ediliyordu.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c3",
        text: "müdür altan o gece uluslararası basın brifingini hazine odasında verdi; kayıt sistemleri onu orada baştan sona gösteriyor.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c4",
        text: "dr. pervin harem koridoru'ndaki kazı çalışmasını gece boyunca ekibiyle sürdürdü; hiçbir zaman atölyeye geçmedi.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c5",
        text: "restorasyon atölyesindeki ilaç dolabına yalnızca cemil'in erişim kartı açıyor; giriş logu geceyi belgeler.",
        type: "direct",
        isBonus: true,
      },
      {
        id: "c6",
        text: "hançer cemil'in kişisel çantasında ele geçirildi; enjektörün üzerinde cemil'in parmak izleri ve dna'sı tespit edildi.",
        type: "evidence",
        isBonus: true,
      },
      {
        id: "c7",
        text: "cemil'in eski bir özel koleksiyoncuyla yazışmaları bulundu; hançerin yüksek fiyata satışı planlanıyordu.",
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
      { id: "c1", text: "Kurbanın cesedi, yüksek sesli müziğin duyulmadığı ve güvenlik kamerasının kör noktası olan tek alanda bulundu.", type: "evidence", isBonus: false },
      { id: "c2", text: "Kasiyer Deniz, gece boyunca kadife koltuklu özel alandan hiç ayrılmadı ve elindeki ince belli cam eşyayı yanından ayırmadı.", type: "witness", isBonus: false },
      { id: "c3", text: "Haberleşme telsizi, olay saatinde DJ Mete ile birlikte yüksekteki müzik kontrol alanındaydı.", type: "evidence", isBonus: false },
      { id: "c4", text: "Kurban cam kesiğiyle değil, kafatasına inen ağır ve küt bir darbeyle öldürüldü.", type: "forensic", isBonus: false },
      { id: "c5", text: "Güvenlik Tarık'ın, olay mahallindeki kan izleriyle eşleşen ahşap teçhizatı kayıptı.", type: "evidence", isBonus: true },
      { id: "c6", text: "DJ Mete ve Kasiyer Deniz'in ifadeleri, olay saatinde birbirlerinin çalıştıkları alanlarda olduklarını doğruluyordu.", type: "witness", isBonus: true },
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
      { id: "c1", text: "Olay yeri inceleme ekipleri, tozlu evrak deposunda ve uzun ahşap masalı salonda hiçbir mücadele izine rastlamadı.", type: "evidence", isBonus: false },
      { id: "c2", text: "Cinayette paslanmaz çelikten yapılmış alet veya ince uçlu bıçak kullanılmadığı anlaşıldı.", type: "forensic", isBonus: false },
      { id: "c3", text: "Tüccar Vehbi'nin tüm gece boyunca kilitli bir odada tek başına evrak incelediği kanıtlandı.", type: "witness", isBonus: false },
      { id: "c4", text: "Yüzbaşı Cemil, sabaha kadar ana yemek salonunda oturup anılarını yazdı ve kimseyle temas kurmadı.", type: "witness", isBonus: false },
      { id: "c5", text: "Konağın varisi Semiha Hanım'ın, ağır kesici metal aleti olay mahallinde bıraktığı tespit edildi.", type: "evidence", isBonus: true },
      { id: "c6", text: "Deri kaplı kitapların bulunduğu odanın pencere pervazında, Semiha Hanım'ın elbisesinden kopmuş siyah bir kumaş parçası bulundu.", type: "evidence", isBonus: true },
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
      { id: "c1", text: "Görgü tanıkları, yaşlı komşu Vahap Amca'nın o sabah elinde sadece ince camdan yapılmış kırılgan bir içecek bardağı taşıdığını doğruladı.", type: "witness", isBonus: false },
      { id: "c2", text: "Kargo nakliyecisi Murat'ın tüm sabahı sadece vitrinlerin ve kasanın bulunduğu aydınlık karşılama alanında bekleyerek geçirdiği anlaşıldı.", type: "witness", isBonus: false },
      { id: "c3", text: "Adli tıp incelemeleri, cinayetin nakliye araçlarının yanaştığı arka sokakta işlenmediğini ve suç aleti olarak kırılgan cam eşyaların kullanılmadığını kesinleştirdi.", type: "forensic", isBonus: false },
      { id: "c4", text: "Kurye Murat'a ait olan uzun metal alet üzerinde yapılan kriminal incelemede, bu aletin cinayette kesinlikle kullanılmadığı netlik kazandı.", type: "evidence", isBonus: false },
      { id: "c5", text: "Ek Kanıt: Çırak Selim'in, cinayetin işlendiği malların istiflendiği loş alt kattan telaşla çıkarken görüldüğü kamera kayıtlarına yansıdı.", type: "evidence", isBonus: true },
      { id: "c6", text: "Kesin Rapor: Maktulün başındaki ölümcül yaranın, terazilerde kullanılan avuç içine tam oturan ağır bir metal dirhemle yapıldığı kanıtlandı.", type: "forensic", isBonus: true },
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
      { id: "c1", text: "Maktulün sadece içeceğine karıştırılan sinsi bir maddeyle öldürüldüğü anlaşıldı; vücudunda hiçbir darp veya kesik yoktu.", type: "forensic", isBonus: false },
      { id: "c2", text: "Makinist Kerem'in motor arızasını gidermek için tüm gece ağır paslı aletlerle devasa motorların bulunduğu alt katta çalıştığı teyit edildi.", type: "witness", isBonus: false },
      { id: "c3", text: "Vapurun dış kısmında dondurucu rüzgara karşı manzarayı izleyen Tarık'ın, elektrik kesintisi sırasında içeri hiç girmediği anlaşıldı.", type: "witness", isBonus: false },
      { id: "c4", text: "Zehrin etkisini saniyeler içinde göstermesi, kurbanın o an bulunduğu ahşap banklı iç alanda öldüğünü kesinleştirdi.", type: "forensic", isBonus: false },
      { id: "c5", text: "Tüllü şapkalı kadının çantasında, zehrin bulunduğu küçük bir cam şişe ele geçirildi.", type: "evidence", isBonus: true },
      { id: "c6", text: "Feriha Hanım'ın, elektrik kesintisi anında kurbanın hemen yanındaki koltukta oturduğu diğer yolcularca doğrulandı.", type: "witness", isBonus: true },
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
      { id: "c1", text: "Cinayet silahının odun kırma baltası veya paslı demir kazma gibi geniş tahribat yaratan aletler olmadığı tespit edildi.", type: "forensic", isBonus: false },
      { id: "c2", text: "Cesedin bulunduğu sık asmalarla kaplı orta alan, cinayetin işlendiği tek ve kesin yerdi.", type: "evidence", isBonus: false },
      { id: "c3", text: "Genç torun Nermin'in, o sabah sadece karanlık taş yapının içinde oturup ağladığı anlaşıldı.", type: "witness", isBonus: false },
      { id: "c4", text: "Komşu Nevzat, jandarma gelene kadar arazileri ayıran taş duvar hattının kendi tarafında beklediğini kanıtladı.", type: "witness", isBonus: false },
      { id: "c5", text: "Uşak Mehmet'in belinde taşıdığı kısa tarım bıçağının kını, olay yerinde asmaların arasına düşmüş halde bulundu.", type: "evidence", isBonus: true },
      { id: "c6", text: "Yaşlı uşağın ellerindeki taze kesik izleri, cinayet sırasında yaşanan boğuşmayı açıkça gösteriyordu.", type: "forensic", isBonus: true },
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
      { id: "c1", text: "Tüccar Raşit Efendi'nin, kendi konak odasındaki ahşap yatağında nefessiz bırakılarak öldürüldüğü kesinleşti.", type: "evidence", isBonus: false },
      { id: "c2", text: "Boyundaki izin, demir tokalı bir kemerle veya sert pürüzlü bir halatla değil, yumuşak dokunmuş kışlık bir eşyayla yapıldığı anlaşıldı.", type: "forensic", isBonus: false },
      { id: "c3", text: "Yaşlı derviş Salih, tüm geceyi çuvalların istiflendiği alt kattaki kilitli depoda zikir çekerek geçirdi.", type: "witness", isBonus: false },
      { id: "c4", text: "İpek kaftanlı Ortak Sabri Bey, uykusuzluğu nedeniyle gece boyu sütunlarla çevrili açık alanda dolaştı ve üst katlara hiç çıkmadı.", type: "witness", isBonus: false },
      { id: "c5", text: "Hizmetçi Hacer'in kışlık üniformasının bir parçası olan esnek koyu renkli örtü, maktulün yatağının altında bulundu.", type: "evidence", isBonus: true },
      { id: "c6", text: "Hacer'in telaşlı halleri ve maktule ait altın kesesinin kendi odasında çıkması, cinayetin ardındaki gerçeği doğrudan ortaya koydu.", type: "evidence", isBonus: true },
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
      { id: "s1", name: "Gazeteci Selda Hanım", description: "Fotoğrafları izinsiz yayımlayan muhalif muhabir. Sadece ön ofisteki açık alanlara ve çekim ekipmanlarına erişimi vardı.", icon: "face-3" },
      { id: "s2", name: "Asistan Cumhur", description: "Fotoğrafçının stüdyo çalışanı. Terfi alamadığı için öfkeli; banyo sıvıları dahil stüdyonun tüm teknik alanlarını kullanma yetkisine sahip.", icon: "face" },
      { id: "s3", name: "Koleksiyoner Münir Bey", description: "Nadir eserler için baskı yapan yaşlı koleksiyoner. Sadece depolanmış eski kutularla ilgilenir, güncel çekim alanlarına hiç uğramaz.", icon: "elderly" },
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
      { id: "c1", text: "Kurban yüksek asitli sıvılarla zehirlenmemiş veya köşeli ağır bir kutuyla ezilmemişti; kafatasına uzun ve boru biçimli alüminyum bir nesneyle vurulmuştu.", type: "forensic", isBonus: false },
      { id: "c2", text: "Olay mahalli, aydınlık flaşların patladığı geniş ön çekim alanı veya tozlu arşiv kutularının bulunduğu arka bölüm değildi.", type: "evidence", isBonus: false },
      { id: "c3", text: "Yaşlı koleksiyonerin olay saatinde sadece geçmiş yıllara ait belgelerin bulunduğu tozlu arşiv odasında vakit geçirdiği anlaşıldı.", type: "witness", isBonus: false },
      { id: "c4", text: "Sadece kırmızı ışığın yandığı özel teknik odaya girmeye yetkisi olan ve cihazların metal parçalarını sökebilecek kişi sıradan bir muhabir değildi.", type: "evidence", isBonus: false },
      { id: "c5", text: "Terfi alamayan Asistan'ın, o kapalı alanda patronuna sökülmüş uzun bir kameraman ekipmanıyla saldırdığı ortaya çıktı.", type: "evidence", isBonus: true },
      { id: "c6", text: "Sökülmüş o uzun alüminyum çubuğun üzerindeki terli eldiven izleri, asistanın suçu işlediğini kesin olarak belgeliyordu.", type: "forensic", isBonus: true },
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
      { id: "s1", name: "Emekli Doktor Vedat Bey", description: "Miras verasetinde tanık olan, bastonuyla zor yürüyen, güçlü fiziksel eylemlerden kaçınan yaşlı adam.", icon: "medical-services" },
      { id: "s2", name: "İş Kadını Perihan Hanım", description: "Hesap anlaşmazlığı yaşadığı ortağına karşı kin güden, lüks kıyafetlere ve monogramlı şahsi eşyalara düşkün hırslı kadın.", icon: "face-3" },
      { id: "s3", name: "Genç Sporcu Erdal", description: "Milli takım sporcusu. Fiziksel kondisyonu zirvede olan, sürekli lobide veya dış alanlarda telefonla konuşarak sponsor arayan genç.", icon: "directions-run" },
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
      { id: "c1", text: "Boyundaki derin izin incelenmesi, sert bir metal darbesi veya klor tahribatı olmadığını, kurbanın esnek ve kalın bir kumaşla boğulduğunu gösterdi.", type: "forensic", isBonus: false },
      { id: "c2", text: "Cinayetin oda katlarını birbirine bağlayan uzun geçitlerde veya geniş oturma gruplu ana giriş alanında işlenmediği, cesedin konumundan kesinleşti.", type: "evidence", isBonus: false },
      { id: "c3", text: "Genç sporcunun olay anında sadece ana girişin bulunduğu oturma alanında telefonla sponsor görüşmesi yaptığı güvenlik loglarından teyit edildi.", type: "record", isBonus: false },
      { id: "c4", text: "O kapalı ve buharlı alanda, güçlü bir kumaşla kurbanı boğabilecek fiziksel kararlılığa sahip kişi yaşlı ve bastonlu bir adam olamazdı.", type: "evidence", isBonus: false },
      { id: "c5", text: "Hesap anlaşmazlığı yaşayan İş Kadını'nın, alt kattaki sıcak suyla kaplı buharlı alanda kurbanı sıkıştırdığı anlaşıldı.", type: "evidence", isBonus: true },
      { id: "c6", text: "Boyna dolanan cinayet silahı olan o kalın kumaşın üzerinde, doğrudan Perihan Hanım'ın odasına ait bir monogram işlenmişti.", type: "forensic", isBonus: true },
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
      { id: "s1", name: "Bakkal Necati", description: "Koli şikayeti bulunan mahalle esnafı. Sürekli dükkanının önünde bekleyen, kendi bölgesinden pek ayrılmayan tanıdık yüz.", icon: "store" },
      { id: "s2", name: "Liman İşçisi Tahsin", description: "İşten çıkarılma belgesinin postalanmasından korkan, üzerinde her daim ağır iş aletleri taşıyan öfkeli tersane işçisi.", icon: "engineering" },
      { id: "s3", name: "Ev Hanımı Hatice Teyze", description: "Postaların geç gelmesinden şikayetçi olan ev hanımı. Fiziksel olarak yavaş hareket eden, kargoları için depo binalarını aşındıran kadın.", icon: "elderly-woman" },
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
      { id: "c1", text: "Yara izinin ince, düzgün ve tek hamleli olması, geniş demir bir kancanın veya düzensiz kırık bir camın değil, küçük katlanabilir bir kesicinin kullanıldığını kanıtladı.", type: "forensic", isBonus: false },
      { id: "c2", text: "Cinayet, gemilerin yanaştığı rüzgarlı açık alanlarda veya kargoların sınıflandırıldığı resmi binada işlenmemişti; kan izleri izole ve dar bir yeri işaret ediyordu.", type: "evidence", isBonus: false },
      { id: "c3", text: "Ev hanımı Hatice Teyze'nin olay saatinde sadece kargoların yığıldığı o küçük resmi binada mektup aradığı tanıklarca doğrulandı.", type: "witness", isBonus: false },
      { id: "c4", text: "Dar ve ıssız o arka yolda kurbanın yolunu kesip o pürüzsüz kesik açan aleti çıkaran kişi, kendi dükkanının önünden ayrılmayan mahalle esnafı değildi.", type: "evidence", isBonus: false },
      { id: "c5", text: "Beklediği işten atılma belgesini yok etmek isteyen Liman İşçisi Tahsin'in, o ıssız taşlı yolda postacıyı kıstırdığı anlaşıldı.", type: "evidence", isBonus: true },
      { id: "c6", text: "İşçinin kemerindeki kılıfın içinden sızan taze kan izleri, o küçük ve temiz kesik açan aletin sahibini açıkça ele veriyordu.", type: "forensic", isBonus: true },
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
      { id: "s1", name: "Fabrika Ustabaşı Cevdet", description: "On beş yıldır fabrikada çalışan ustabaşı; Rıfat Ağa'nın onu ortaklıktan mahrum bıraktığını öğrendi.", icon: "engineering" },
      { id: "s2", name: "Muhasebeci Bayan Şükran", description: "Fabrikanın muhasebecisi; usulsüz kayıtları Rıfat Ağa'ya bildirmekten çekindiği için baskı altındaydı.", icon: "calculate" },
      { id: "s3", name: "Satış Temsilcisi Orhan Bey", description: "İstanbul'dan gelen satış temsilcisi; Rıfat Ağa ile anlaşma görüşmesi bozulmuş.", icon: "work" },
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
      { id: "c1", text: "Adli tıp, ölümün mekanik bir ezilme veya boğulma ile değil, kan dolaşımına karışan sinsi bir kimyasalla gerçekleştiğini raporladı.", type: "forensic", isBonus: false },
      { id: "c2", text: "Olay, halı kaplı ofis katlarında veya varillerin yığıldığı sessiz depoda değil; doğrudan devasa makinelerin bulunduğu alanda gerçekleşmişti.", type: "evidence", isBonus: false },
      { id: "c3", text: "Ziyaretçi kartıyla gelen satış temsilcisinin güvenlik turnikelerinden içeri hiç geçmediği ve lobide beklediği sistem kayıtlarında açıkça görülüyor.", type: "record", isBonus: false },
      { id: "c4", text: "Fabrika ustabaşısının özel ofis mutfağına girme yetkisi ve zehri koyabileceği o ince cam fincanlara erişimi kesinlikle yoktu.", type: "evidence", isBonus: false },
      { id: "c5", text: "Sedatif ilaç kutusu, doğrudan muhasebecinin kilitli çekmecesinde, kendi parmak izleriyle bulundu.", type: "forensic", isBonus: true },
      { id: "c6", text: "Defterdeki taze silintiler, muhasebecinin örtbas etmeye çalıştığı zimmet suçunun ortasında yakalandığını kanıtlıyordu.", type: "evidence", isBonus: true },
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
      { id: "s1", name: "Tüccar Kadın Safiye Hanım", description: "Rize'ye mal götüren yaşlı kadın tüccar; Ahmet Bey'in geç kaldığı için kendisini zor durumda bıraktığını söylüyor.", icon: "shopping-bag" },
      { id: "s2", name: "Öğretmen Adayı Levent", description: "Atama için Rize'ye giden genç öğretmen adayı; yanında tayin belgeleri var.", icon: "school" },
      { id: "s3", name: "Orman İşçisi Bayram", description: "Orman bölgesinden dönen deneyimli orman işçisi; yanında kesici aletler taşıyan büyük bir çanta var.", icon: "agriculture" },
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
      { id: "c1", text: "Kan izleri minibüsün içinde veya ormanın derinliklerinde değildi; her şey açık alanda, taş duvarın dibinde olup bitmişti.", type: "evidence", isBonus: false },
      { id: "c2", text: "Yara son derece nizami ve derin bir kesikti; künt bir demir levyeyle veya kaba bir taşla yapılması imkansızdı.", type: "forensic", isBonus: false },
      { id: "c3", text: "Yaşlı tüccar kadının dar minibüs kapısından çıkıp maktulü takip etmediği ve koltuğundan hiç kalkmadığı diğer yolcularca doğrulandı.", type: "witness", isBonus: false },
      { id: "c4", text: "Kurban oldukça iri yarıydı; genç ve çelimsiz bir öğretmen adayının onu tek hamlede devirmesi fiziksel olarak mümkün değildi.", type: "evidence", isBonus: false },
      { id: "c5", text: "Orman işçisinin çantasındaki büyük kesici aletin kılıfı, taze ve yoğun kan kokuyordu.", type: "forensic", isBonus: true },
      { id: "c6", text: "Maktulün kayıp olan nakit parası, borç tartışması yaşadığı orman işçisinin gizli cebinden çıktı.", type: "evidence", isBonus: true },
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
      { id: "s1", name: "Hacı Efendi Rüstem", description: "Hac dönüşü Konya'ya uğrayan yaşlı tüccar; Lütfi Bey'den yıllar önce borç almış ama geri ödememiş.", icon: "elderly" },
      { id: "s2", name: "Genç Mühendis Adnan", description: "Konya'ya iş için gelen altyapı mühendisi; Lütfi Bey'in otelini yıkımdan kurtarma talebini reddetmiş.", icon: "engineering" },
      { id: "s3", name: "Dul Kadın Zümrüt Hanım", description: "Konya'ya akraba ziyaretine gelen dul; Lütfi Bey'in kendisine yönelik taciz girişimini yaşadığını söylüyor.", icon: "face-3" },
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
      { id: "c1", text: "Ceset açık avluda veya tozlu çatı katında değildi; odaların hemen önündeki uzun loş geçitte yatıyordu.", type: "evidence", isBonus: false },
      { id: "c2", text: "Maktulün bedeninde boğulma veya ezilme izi yoktu; son derece simetrik ve usta işi, iki tarafı keskin bir alet yarası vardı.", type: "forensic", isBonus: false },
      { id: "c3", text: "Yaşlı hacının odasından gece boyunca yüksek sesli zikir ve tespih sesleri hiç kesilmedi; odasından çıkmadığı kesinleşti.", type: "witness", isBonus: false },
      { id: "c4", text: "Genç mühendisin olay saatinde ağır bir uyku hapı alıp derin uykuya daldığı, odasındaki çay bardağı analiziyle kanıtlandı.", type: "forensic", isBonus: false },
      { id: "c5", text: "Dul kadının akşam yemeğinde elinde çevirdiği o ince, süslü alet sıradan bir sofra eşyası değildi.", type: "evidence", isBonus: true },
      { id: "c6", text: "Kadının odasında yastığın altına gizlenmiş ve alelacele silinmiş kanlı Şam çeliği, her şeyi aydınlatıyordu.", type: "forensic", isBonus: true },
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
      { id: "s1", name: "Baş Soprano", description: "Gösterinin yıldızı. Narsist, sesiyle herkesi büyüleyen ancak kuliste herkesle kavgalı olan başrol.", icon: "solid-woman-elegant" },
      { id: "s2", name: "Orkestra Şefi", description: "Disiplinli ve katı. Müzikal mükemmellik için her şeyi yapabilecek takıntılı bir otorite.", icon: "solid-man-suit" },
      { id: "s3", name: "Işık Teknisyeni", description: "Tavan arasındaki loş odalarda çalışan, sistemleri yöneten sessiz teknik personel.", icon: "solid-man-worker" },
      { id: "s4", name: "Eski Aktör", description: "Yıllar önce sahnelerden men edilen, tiyatro hilelerini ve sahne arkasını avucunun içi gibi bilen kin dolu oyuncu.", icon: "solid-man-glasses" },
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
      { id: "c1", text: "Cesette ezilme, zehirlenme veya bıçak yarası yoktu; boynunda son derece ince ve derin bir çelik kesiği vardı.", type: "forensic", isBonus: false },
      { id: "c2", text: "Cinayet, binlerce kişinin izlediği açık alanlarda veya tozlu kablo odalarında değil, kapalı özel bir alanda işlenmişti.", type: "evidence", isBonus: false },
      { id: "c3", text: "Baş Soprano'nun olay saatinde Ana Sahne'de arya söylediği binlerce seyirci tarafından canlı olarak görüldü.", type: "witness", isBonus: false },
      { id: "c4", text: "Orkestra Şefi, tüm performans boyunca Orkestra Çukuru'ndan bir saniye bile ayrılmamıştı.", type: "witness", isBonus: false },
      { id: "c5", text: "Işık teknisyeni, elektrik panosu arızası nedeniyle tüm gece Tavan Arası'nda mahsur kaldığını telsiz loglarıyla kanıtladı.", type: "record", isBonus: true },
      { id: "c6", text: "Otelden alınan parmak izleri, o görünmez çelik teli ustalıkla kullanan kişinin yılların Eski Aktör'ü olduğunu doğruladı.", type: "forensic", isBonus: true },
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
      { id: "s1", name: "Rakip Pilot", description: "Maktulün en büyük ticari rakibi olan, havacılık donanımlarına çok iyi hakim agresif pilot.", icon: "solid-man-coat" },
      { id: "s2", name: "Turist Kadın", description: "Sadece fotoğraf çekmek için orada olan, yükseklik korkusu olan sıradan bir misafir.", icon: "solid-woman-bag" },
      { id: "s3", name: "Balon Mekanikçisi", description: "Gaz tüplerinden sorumlu, elleri sürekli yağlı ve kirli olan bakım personeli.", icon: "solid-man-mechanic" },
      { id: "s4", name: "Fotoğrafçı", description: "Turistleri karadan takip eden, sürekli kamerasıyla çekim yapan güler yüzlü çalışan.", icon: "solid-man-smile" },
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
      { id: "c1", text: "Cesette yanık, ateş izi veya boğulma belirtisi yoktu; derin ve tırtıklı bir kesici alet kullanılmıştı.", type: "forensic", isBonus: false },
      { id: "c2", text: "Cinayet, gökyüzündeki dar alanda, kalabalık düzlükte veya açık vadilerde değil, karadaki kapalı bir kapı ardında işlenmişti.", type: "evidence", isBonus: false },
      { id: "c3", text: "Turist Kadın'ın uçuş boyunca Balon Sepeti'nden hiç inmediği video kayıtlarıyla kanıtlandı.", type: "record", isBonus: false },
      { id: "c4", text: "Mekanikçinin tüm sabah Havalanma Alanı'nda arızalı bir sepeti tamir ettiği onlarca kişi tarafından görüldü.", type: "witness", isBonus: false },
      { id: "c5", text: "Karadan takip yapan Fotoğrafçı'nın sadece Vadi Kayalıkları'nda çekim yaptığı GPS verileriyle doğrulandı.", type: "record", isBonus: true },
      { id: "c6", text: "Gözden uzak taş kulübedeki kilitleri zorlayıp o taktiksel aletle cinayeti işleyen kişi, ticari Rakip Pilot'tan başkası değildi.", type: "evidence", isBonus: true },
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
      { id: "s1", name: "Kaptan", description: "Tekneyi yöneten, suya hiç girmeyen ve dalış teçhizatlarını kullanmayı bilmeyen denizci.", icon: "solid-captain" },
      { id: "s2", name: "Asistan Arkeolog", description: "Maktulün bulgularını kendine mal etmek isteyen, hırslı ancak tüplü dalışta acemi araştırmacı.", icon: "solid-woman-glasses" },
      { id: "s3", name: "Usta Dalgıç", description: "Ekibin güvenliğinden sorumlu, denizin dibinde saatlerce kalabilen ve tüm ekipmanlara hakim profesyonel.", icon: "solid-man-worker" },
      { id: "s4", name: "Tarihçi", description: "Yaşı gereği sadece güvertede not tutan, fiziksel efor gerektiren hiçbir işe karışmayan ihtiyar.", icon: "solid-man-old" },
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
      { id: "c1", text: "Kurbanın bedeninde zıpkın deliği, bıçak kesiği veya fazla kurşun ağırlık yoktu; ciğerleri oksijensizlikten iflas etmişti.", type: "forensic", isBonus: false },
      { id: "c2", text: "Cinayet, su üstündeki güvertelerde, platformlarda veya kamaralarda değil, doğrudan denizin karanlık dibinde gerçekleşmişti.", type: "evidence", isBonus: false },
      { id: "c3", text: "Kaptan'ın tüm gün boyunca sadece telsizlerin bulunduğu Kaptan Köşkü'nde tekneyi sabitlediği doğrulandı.", type: "witness", isBonus: false },
      { id: "c4", text: "İhtiyar Tarihçi'nin, sağlık sorunları nedeniyle Araştırma Teknesi güvertesinden hiç ayrılmadığı biliniyordu.", type: "record", isBonus: false },
      { id: "c5", text: "Acemi Asistan Arkeolog'un sadece yüzeye yakın Dalış Platformu'nda ekipmanları yıkadığı güvenlik kamerasıyla teyit edildi.", type: "evidence", isBonus: true },
      { id: "c6", text: "Denizin dibindeki o tehlikeli enkaz alanında, oksijen valflerini hissettirmeden kapatabilecek tek yetkin kişi Usta Dalgıç'tı.", type: "evidence", isBonus: true },
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
      { id: "s1", name: "Kıskanç Çırak", description: "Ustasının gölgesinde kalmaktan nefret eden, her yeri boya içinde genç sanat öğrencisi.", icon: "solid-man-boy" },
      { id: "s2", name: "Sanat Eleştirmeni", description: "Ressamın eserlerini sürekli kötüleyen, ellerini kirletmekten nefret eden titiz ve şık adam.", icon: "solid-man-tie" },
      { id: "s3", name: "Model", description: "Tablo için saatlerce hareketsiz poz veren, güzel ve dikkat çekici genç kadın.", icon: "solid-woman-elegant" },
      { id: "s4", name: "Galeri Sahibi", description: "Tablonun satışından milyonlar kazanacak olan, sürekli hesap kitap yapan otoriter kadın.", icon: "solid-woman-suit" },
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
      { id: "c1", text: "Maktulün vücudunda darbe, kesik veya tel boğma izi yoktu; kanında yüksek oranda toksik çözücü tespit edildi.", type: "forensic", isBonus: false },
      { id: "c2", text: "Cinayet, boya lekeli çalışma alanlarında veya giriş kapısında değil, kurbanın kahvesini içtiği temiz bir odada gerçekleşmişti.", type: "evidence", isBonus: false },
      { id: "c3", text: "Model'in tüm gün boyunca Ana Atölye'de hareket etmeden poz verdiği kanıtlandı.", type: "witness", isBonus: false },
      { id: "c4", text: "Çırağın bütün gün kilitli Boya Deposu'nda temizlik yaptığı ve oradan çıkmadığı kameralarca teyit edildi.", type: "record", isBonus: false },
      { id: "c5", text: "Galeri Sahibi'nin olay saati boyunca Sergi Girişi'nde misafirlerle ilgilendiği onlarca kişi tarafından doğrulandı.", type: "witness", isBonus: true },
      { id: "c6", text: "Titiz eleştirmenin, temiz Dinlenme Odası'nda kurbanın kahvesine o şeffaf çözücüyü damlattığı parmak izleriyle kesinleşti.", type: "forensic", isBonus: true },
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
