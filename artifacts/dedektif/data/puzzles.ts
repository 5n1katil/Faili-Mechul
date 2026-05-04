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
  type: "direct" | "indirect" | "elimination" | "evidence" | "witness" | "forensic";
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
    id: "p001",
    title: "Konakta Gece Yarısı Cinayeti",
    difficulty: "caylak",
    dayIndex: 1,
    story:
      "Tarihi bir konakta şık bir yemek daveti vardı. Sabah erkenden ev sahibinin yardımcısı, kütüphanede cesedi buldu. Katil gecenin karanlığında kaybolmuştu.",
    suspects: [
      { id: "s1", name: "Nazik Hanım", description: "Ev sahibinin eski dostu", icon: "elderly" },
      { id: "s2", name: "Rıfat Bey", description: "Avukat ve iş ortağı", icon: "badge" },
      { id: "s3", name: "Zeynep Hanım", description: "Genç yeğen", icon: "face" },
    ],
    weapons: [
      { id: "w1", name: "Bıçak", description: "Konak mutfağından alınan ince, uzun şef bıçağı", icon: "content-cut" },
      { id: "w2", name: "Zehir", description: "Renksiz, kokusuz bitkisel toksin karışımı", icon: "local-pharmacy" },
      { id: "w3", name: "Tabanca", description: "Tek mermi kalan eski model bir revolver", icon: "gps-fixed" },
    ],
    locations: [
      { id: "l1", name: "Kütüphane", description: "Deri ciltli kitaplarla dolu, meşe raflı tarihi oda", icon: "menu-book" },
      { id: "l2", name: "Mutfak", description: "Yemek hazırlığından hâlâ sıcak olan geniş konak mutfağı", icon: "restaurant" },
      { id: "l3", name: "Bahçe", description: "Fıskiyeli havuz ve asırlık çınarların bulunduğu loş bahçe", icon: "park" },
    ],
    clues: [
      {
        id: "c1",
        text: "mutfak tezgahının altında kan izleri ve bıçağa ait deri kını bulundu; keskin nesne burada kullanılmış, cinayet bu mekanda gerçekleşti.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c2",
        text: "nazik hanım tüm geceyi bahçede geçirdi; fıskiyeli havuz başında konuklarla vakit geçirdiği düzinelerce kişi tarafından doğrulanabiliyor.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c3",
        text: "zeynep hanım tüm geceyi kütüphanede geçirdi; raflar arasında oturduğu ve oradan hiç ayrılmadığı çoklu tanık ifadesiyle belgelendi.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c4",
        text: "kütüphanenin tozlu rafında küçük bir cam şişe bulundu; kimyasal analiz, içindeki sıvının bitkisel toksin karışımı olduğunu doğruladı.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c5",
        text: "otopsi raporu bıçak yaralanmasını kesin olarak gösterdi; vücutta toksin ya da mermi izi bulunmadı.",
        type: "forensic",
        isBonus: true,
      },
      {
        id: "c6",
        text: "rıfat bey o gece mutfak kapısından defalarca geçti; lobi kamerası onu mutfak bölgesinde kaydetti.",
        type: "evidence",
        isBonus: true,
      },
    ],
    solvabilityMeta: {
      freeEliminations: ["l3", "l1", "s1", "s3", "w2", "w3"],
      bonusEliminations: [],
    },
    solution: { suspectId: "s2", weaponId: "w1", locationId: "l2" },
  },
  {
    id: "p002",
    title: "Boğaz'da Kayıp Elmas",
    difficulty: "caylak",
    dayIndex: 2,
    story:
      "İstanbul Boğazı'nda lüks bir yatta gece partisi yapılırken, efsanevi 'Boğaz Elması' çalındı ve güvenlik görevlisi hayatını kaybetti.",
    suspects: [
      { id: "s1", name: "Levent Kaptan", description: "Yat kaptanı, 20 yıllık denizci", icon: "engineering" },
      { id: "s2", name: "Dilek Hanım", description: "Mücevher koleksiyoncusu", icon: "account-circle" },
      { id: "s3", name: "Murat Aydın", description: "Sigorta şirketi temsilcisi", icon: "badge" },
    ],
    weapons: [
      { id: "w1", name: "Demir Çubuk", description: "Güverteden sökülen ağır metal çubuk", icon: "hardware" },
      { id: "w2", name: "İp", description: "Yelken bağlamak için kullanılan dayanıklı naylon ip", icon: "fiber-manual-record" },
      { id: "w3", name: "Gaz Maskesi", description: "Soluk alma sistemini kilitleyen endüstriyel ekipman", icon: "air" },
    ],
    locations: [
      { id: "l1", name: "Güverte", description: "Boğaz rüzgarına açık, ıslak tekne güvertesi", icon: "waves" },
      { id: "l2", name: "Makine Dairesi", description: "Teknenin alt katında gürültülü, karanlık motor odası", icon: "precision-manufacturing" },
      { id: "l3", name: "VIP Salon", description: "Kristal aydınlatma ve kadife koltuklu özel salon", icon: "star" },
    ],
    clues: [
      {
        id: "c1",
        text: "makine dairesinin zemin neminde, çekilmiş ipten geriye kalan lif izi vardı; boğma burada, ipin yardımıyla gerçekleşti.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c2",
        text: "levent kaptan gece boyunca köprüde kaldı; üç ayrı tayfa onu köprüden hiç ayrılmadığı için doğrulayabilir — makine dairesine inmedi.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c3",
        text: "güvertede demir çubuğa ait yağ lekesi ve pas izi yan yana bulundu; ağır cisim güvertede bırakılmıştı.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c4",
        text: "murat aydın vıp salonda müşterileriyle görüşüyordu; konuk defteri ve salon personeli onu o bölgeye kilitledi, makine dairesine inmedi.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c5",
        text: "adli rapor: maktul boğulmuş; demir çubuk ya da gaz maskesi kullanılmış olsaydı farklı iz kalırdı.",
        type: "forensic",
        isBonus: true,
      },
      {
        id: "c6",
        text: "dilek hanım'ın mücevher kasasının yerini ve makine dairesine iniş kodunu bildiği, gemi planını incelediği kayıtlara geçmiş.",
        type: "direct",
        isBonus: true,
      },
    ],
    solvabilityMeta: {
      freeEliminations: ["l3", "l1", "s1", "s3", "w1", "w3"],
      bonusEliminations: [],
    },
    solution: { suspectId: "s2", weaponId: "w2", locationId: "l2" },
  },
  {
    id: "p003",
    title: "Kapalıçarşı'da Gizem",
    difficulty: "dedektif",
    dayIndex: 3,
    story:
      "Kapalıçarşı'nın labirent gibi sokaklarında bir kuyumcu dükkanı yağmalandı. Dükkan sahibi hayatını kaybetti ve değerli altınlar ortadan kayboldu.",
    suspects: [
      { id: "s1", name: "Ahmet Usta", description: "Komşu bakırcı, 30 yıllık esnaf", icon: "person" },
      { id: "s2", name: "Selma Teyze", description: "Çarşının muhasebecisi", icon: "elderly" },
      { id: "s3", name: "Kerem Genç", description: "Stajyer, son ay işe başladı", icon: "face" },
    ],
    weapons: [
      { id: "w1", name: "Ağır Terazi", description: "Kuyumcu terazisinin tunç kefesi, birkaç kilogram ağırlığında", icon: "balance" },
      { id: "w2", name: "Kimyasal Madde", description: "Altın eritme sürecinde kullanılan asit bazlı çözelti", icon: "science" },
      { id: "w3", name: "Pençe Anahtar", description: "Kilitlerde iz bırakan ağır çelik alet", icon: "build" },
    ],
    locations: [
      { id: "l1", name: "Dükkan İçi", description: "Vitrinlerin altın ışıltısıyla parlayan kuyumcu dükkânı", icon: "store" },
      { id: "l2", name: "Arka Depo", description: "Elektronik kilitli, penceresiz depolama odası", icon: "inventory" },
      { id: "l3", name: "Çarşı Koridoru", description: "Yüzlerce yıllık kıvrımlı taş koridorlar", icon: "route" },
    ],
    clues: [
      {
        id: "c1",
        text: "olay kapalı ve kilitli bir mekanda gerçekleşti; açık dükkan içi ya da çarşı koridorunda herhangi bir kan izi ya da mücadele izi bulunamadı.",
        type: "elimination",
        isBonus: false,
      },
      {
        id: "c2",
        text: "güvenlik kamerası selma teyze'yi olay saatinde kasayı kapatırken dükkan dışında gösteriyor.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c3",
        text: "kimyasal madde kullanılmış olsaydı, asit dumanı yangın alarmını tetiklerdi. alarm çalmadı.",
        type: "forensic",
        isBonus: false,
      },
      {
        id: "c4",
        text: "kerem genç, deponun elektronik kilit sistemini bizzat kurmuş ve kodu yalnızca o biliyordu. komşu ahmet usta ise o gece dükkânını çok önceden kapatmış ve evine gitmişti; çarşı güvenlik kamerası çıkışını kayıt altına almış.",
        type: "direct",
        isBonus: false,
      },
      {
        id: "c5",
        text: "kilit incelemesinde tipik pençe anahtar çizikleri tespit edildi; bu aletle açılmış.",
        type: "evidence",
        isBonus: true,
      },
      {
        id: "c6",
        text: "kerem genç'in bilgisayarında depo kasası şifresini değiştirdiğine dair log bulundu; değişiklik olay gecesi yapılmıştı.",
        type: "evidence",
        isBonus: true,
      },
    ],
    solvabilityMeta: {
      freeEliminations: ["l1", "l3", "s2", "w2", "s1"],
      bonusEliminations: ["w1"],
    },
    solution: { suspectId: "s3", weaponId: "w3", locationId: "l2" },
  },
  {
    id: "p004",
    title: "Üniversitede Karanlık Sır",
    difficulty: "dedektif",
    dayIndex: 4,
    story:
      "İstanbul'un köklü üniversitelerinden birinde, laboratuvar yöneticisi ölü bulundu. Araştırma projesindeki kritik veriler de kaybolmuştu.",
    suspects: [
      { id: "s1", name: "Prof. Kahraman", description: "Rekabetçi akademisyen", icon: "account-circle" },
      { id: "s2", name: "Asistan Elif", description: "Doktora öğrencisi", icon: "face" },
      { id: "s3", name: "Güvenlik Görevlisi", description: "Gece vardiyası çalışanı", icon: "local-police" },
    ],
    weapons: [
      { id: "w1", name: "Elektrik Çarpması", description: "Laboratuvar kablosunun kasıtlı olarak sabote edilmesi", icon: "flash-on" },
      { id: "w2", name: "Kimyasal Gaz", description: "Kapalı ortamda birikebilen tehlikeli kimyasal bileşik", icon: "air" },
      { id: "w3", name: "Keskin Nesne", description: "Laboratuvar cam bölmesinin kırık parçası", icon: "content-cut" },
    ],
    locations: [
      { id: "l1", name: "Laboratuvar", description: "Çeşitli deney düzeneklerinin bulunduğu araştırma laboratuvarı", icon: "science" },
      { id: "l2", name: "Ofis", description: "Yığın yığın dosya ve ekran ışığıyla dolu akademisyen ofisi", icon: "business" },
      { id: "l3", name: "Koridorlar", description: "Gece yarısı ıssız, uzun üniversite koridorları", icon: "route" },
    ],
    clues: [
      {
        id: "c1",
        text: "vücut ofiste bulundu; ancak adli izler laboratuvara işaret ediyor. cinayet orada gerçekleşti.",
        type: "forensic",
        isBonus: false,
      },
      {
        id: "c2",
        text: "güvenlik görevlisi gece boyunca güvenlik odasında oturmuş; kameralar bunu kayıt altına almış.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c3",
        text: "kimyasal gaz sensörleri gece boyunca hiç tepki vermedi. gaz sızıntısı yok.",
        type: "forensic",
        isBonus: false,
      },
      {
        id: "c4",
        text: "elif, laboratuvar anahtarına sahip tek doktora öğrencisiydi ve gece geç saate kadar çalışıyordu.",
        type: "direct",
        isBonus: false,
      },
      {
        id: "c5",
        text: "laboratuvarda sabote edilmiş bir elektrik kablosu bulundu; bu tür müdahale uzmanlık gerektirir.",
        type: "evidence",
        isBonus: true,
      },
      {
        id: "c6",
        text: "prof. kahraman'ın o gece uçuşu vardı; bilet ve havalimanı güvenlik kaydı şehri terk ettiğini teyit ediyor.",
        type: "evidence",
        isBonus: true,
      },
    ],
    solvabilityMeta: {
      freeEliminations: ["l2", "l3", "s3", "w2"],
      bonusEliminations: ["w3", "s1"],
    },
    solution: { suspectId: "s2", weaponId: "w1", locationId: "l1" },
  },
  {
    id: "p005",
    title: "Pazar Yerinde Şüpheli Ölüm",
    difficulty: "caylak",
    dayIndex: 5,
    story:
      "Pazar sabahı, kalabalık İstanbul pazarında tatlı satıcısı baygın bulundu ve sonradan hayatını kaybetti. Herkes birbirini şüpheyle süzüyordu.",
    suspects: [
      { id: "s1", name: "Komşu Satıcı", description: "Zeytinli bölümde çalışıyor", icon: "person" },
      { id: "s2", name: "Müşteri Hanım", description: "Her sabah pazar alışverişi yapıyor", icon: "account-circle" },
      { id: "s3", name: "Tedarikçi", description: "Malları sabah erkenden teslim etti", icon: "engineering" },
    ],
    weapons: [
      { id: "w1", name: "Zehirli Baklava", description: "İçine gizlice zehir karıştırılmış tatlı baklava", icon: "cake" },
      { id: "w2", name: "Darbe", description: "Elle ya da sert bir cisimle uygulanan güçlü vurma", icon: "front-hand" },
      { id: "w3", name: "Boğulma", description: "Boyuna uygulanan iki elle güçlü baskı", icon: "pan-tool" },
    ],
    locations: [
      { id: "l1", name: "Tatlı Tezgahı", description: "Çeşit çeşit baklavanın sergilendiği pazar tezgahı", icon: "store" },
      { id: "l2", name: "Ara Sokak", description: "Pazar gürültüsünden uzak, dar ve sakin ara sokak", icon: "map" },
      { id: "l3", name: "Park Alanı", description: "Araçların park ettiği, tenha ve ıssız bir alan", icon: "local-parking" },
    ],
    clues: [
      {
        id: "c1",
        text: "kurban tezgahının tam başında yere yığıldı; ara sokak veya park alanına geçmemişti.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c2",
        text: "müşteri hanım o sabah hiç tatlı almadı ve tezgaha hiç yaklaşmadı; hem tezgah kamerası hem de komşu satıcılar bunu doğruluyor.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c3",
        text: "tedarikçi malları bırakıp hemen ayrıldı; pazar kamerasına çıkış saati kaydedilmiş.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c4",
        text: "adli tıp raporu: vücutta baklava kökenli bitkisel toksin tespit edildi. zehirleme kesin.",
        type: "forensic",
        isBonus: false,
      },
      {
        id: "c5",
        text: "komşu satıcı, kurbanın tezgahına ayrılmadan önce baklava tabağını tazeledi; tezgah kamerası bu temaşı kaydetti.",
        type: "direct",
        isBonus: true,
      },
      {
        id: "c6",
        text: "komşu satıcı ile kurban arasında geçen ay ciddi ticari anlaşmazlık yaşanmıştı; pazar esnafından üç kişi bunu doğruluyor.",
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
    id: "p006",
    title: "Müzede Kayıp Eser",
    difficulty: "dedektif",
    dayIndex: 6,
    story:
      "Ankara'daki tarihi müzede, Bizans dönemine ait değerli bir broş kayboldu. Müze bekçisi odasında yaralı bulundu.",
    suspects: [
      { id: "s1", name: "Küratör Bey", description: "15 yıldır müzede çalışıyor", icon: "badge" },
      { id: "s2", name: "Restoratör Hanım", description: "Eserleri onarıyor", icon: "face" },
      { id: "s3", name: "Ziyaretçi Rehber", description: "Müzede turlar düzenliyor", icon: "support-agent" },
    ],
    weapons: [
      { id: "w1", name: "Uyutucu İğne", description: "Deriye hızla etki eden anestezik enjeksiyon", icon: "vaccines" },
      { id: "w2", name: "Sergi Kaidesi", description: "Ağır mermer kaide, vitrinlerin altındaki taş destek", icon: "construction" },
      { id: "w3", name: "Kimyasal Sprey", description: "Geçici felç etkisi yaratan kimyasal karışım", icon: "air" },
    ],
    locations: [
      { id: "l1", name: "Sergi Salonu", description: "Bizans ve Osmanlı eserlerinin sergilendiği aydınlık salon", icon: "museum" },
      { id: "l2", name: "Depolama Odası", description: "Restorasyon bekleyen eserlerin bulunduğu kilitli oda", icon: "storage" },
      { id: "l3", name: "Güvenlik Odası", description: "Kamera görüntülerinin izlendiği kontrol merkezi", icon: "security" },
    ],
    clues: [
      {
        id: "c1",
        text: "bekçi, depolama odasında bulundu. orada dövüşe ilişkin izler vardı.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c2",
        text: "rehber, tur grubuyla birlikte sergi salonundaydı; 20 ziyaretçi bunu teyit ediyor.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c3",
        text: "güvenlik kamerası kimyasal sprey kullanımını tespit ederdi; kayıtlarda böyle bir görüntü yok.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c4",
        text: "restoratör hanım, depolama odasına erişim kodu bilen tek kişiydi ve gece mesaisi vardı.",
        type: "direct",
        isBonus: false,
      },
      {
        id: "c5",
        text: "adli analiz: bekçinin kolunda ince iğne izi tespit edildi. uyutucu madde enjekte edilmiş.",
        type: "forensic",
        isBonus: true,
      },
      {
        id: "c6",
        text: "küratör bey, ziyaret defterini imzalayan grupla birlikte sergi salonundaydı; kayıtlı çıkış saati sabahı işaret ediyor.",
        type: "witness",
        isBonus: true,
      },
    ],
    solvabilityMeta: {
      freeEliminations: ["l1", "l3", "s3", "w3"],
      bonusEliminations: ["w2", "s1"],
    },
    solution: { suspectId: "s2", weaponId: "w1", locationId: "l2" },
  },
  {
    id: "p007",
    title: "Adada Haftalık Gizem",
    difficulty: "baskomiser",
    dayIndex: 7,
    story:
      "Büyükada'da bir villa, yaz tatilinde kanlı bir sırra ev sahipliği yaptı. Ada sakinleri feribot seferlerinin kesilmesi nedeniyle mahsur kaldı.",
    suspects: [
      { id: "s1", name: "Emekli Albay", description: "Vilayla komşu", icon: "elderly" },
      { id: "s2", name: "Ressam Leyla", description: "Yaz boyunca adada yaşıyor", icon: "face" },
      { id: "s3", name: "Genç Yatçı", description: "Özel teknesiyle yeni geldi", icon: "person-outline" },
      { id: "s4", name: "Aşçı Mehmet", description: "Villa aşçısı", icon: "engineering" },
    ],
    weapons: [
      { id: "w1", name: "Av Tüfeği", description: "Emekli albayın dolabında sakladığı çift namlulu tüfek", icon: "sports" },
      { id: "w2", name: "Zehir", description: "Doğal bitkilerden elde edilen güçlü bitki toksini", icon: "science" },
      { id: "w3", name: "Bıçak", description: "Balık ayıklamak için kullanılan uzun mutfak bıçağı", icon: "content-cut" },
      { id: "w4", name: "Boğma", description: "El gücüyle boyuna uygulanan güçlü basınç", icon: "back-hand" },
    ],
    locations: [
      { id: "l1", name: "Villa Bahçesi", description: "Akdeniz bitkileri ve yüzme havuzuyla süslü villa bahçesi", icon: "park" },
      { id: "l2", name: "Sahil Şeridi", description: "Ada kıyısındaki kayalık sahil yolu", icon: "waves" },
      { id: "l3", name: "Kayalık", description: "Adanın güney ucundaki sarp, yüksek kayalık", icon: "terrain" },
      { id: "l4", name: "Villa İçi", description: "Ahşap zeminli, antika mobilyalı villa içi", icon: "home" },
    ],
    clues: [
      {
        id: "c1",
        text: "kurban villa içinde değil, açık havada ve villa çevresinde bulundu.",
        type: "elimination",
        isBonus: false,
      },
      {
        id: "c2",
        text: "emekli albay, o sabah komşu adada akrabalarıyla olduğu feribot kayıtları ve iki tanıkla belgelendi; villaya gün boyunca hiç uğramadı.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c3",
        text: "ressam leyla, olay saatinde adanın karşı yakasındaki sanat galerisinde sergi açılışında bulunuyordu; onlarca misafir ve fotoğraflar bunu teyit ediyor.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c4",
        text: "aşçı mehmet sabahtan beri mutfaktan çıkmadı; yemek hazırlık kayıtları ve diğer personel bunu teyit ediyor.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c5",
        text: "adli rapor: kurbanın boynunda parmak izi şeklinde morluklar var. boğulma kesinleşti; av tüfeği, zehir ya da bıçak kullanılmamış.",
        type: "forensic",
        isBonus: true,
      },
      {
        id: "c6",
        text: "villa bahçesinin havuz çevresinde el izi ve mücadele izleri tespit edildi; bahçe kapısı yakınında genç yatçı'ya ait tekne ipinin bir parçası bulundu.",
        type: "evidence",
        isBonus: true,
      },
    ],
    solvabilityMeta: {
      freeEliminations: ["l4", "s1", "s2", "s4"],
      bonusEliminations: ["w1", "w2", "w3", "l2", "l3"],
    },
    solution: { suspectId: "s3", weaponId: "w4", locationId: "l1" },
  },
  {
    id: "p008",
    title: "Tren Yolculuğunda Cinayet",
    difficulty: "dedektif",
    dayIndex: 8,
    story:
      "Ankara-İstanbul ekspresinde, hareket eden trende bir iş adamı ölü bulundu. Tren istasyona varmadan katil tespiti yapılmalıydı.",
    suspects: [
      { id: "s1", name: "İş Kadını", description: "Birinci mevki yolcusu", icon: "badge" },
      { id: "s2", name: "Üniversite Öğrencisi", description: "Ucuz bilet almıştı", icon: "face" },
      { id: "s3", name: "Emekli Doktor", description: "Kaplıcaya gidiyordu", icon: "elderly" },
    ],
    weapons: [
      { id: "w1", name: "Zehirli İçecek", description: "Şişeye karıştırılan renksiz ve tatsız zehir", icon: "local-bar" },
      { id: "w2", name: "Kesici Silah", description: "Hareketli trende saklanmış küçük çakı bıçağı", icon: "content-cut" },
      { id: "w3", name: "Boğma Halatı", description: "Bavuldan çıkabilecek ince naylon halat", icon: "fiber-manual-record" },
    ],
    locations: [
      { id: "l1", name: "Kompartıman", description: "Dar, dört kişilik ahşap bölmeli tren kompartımanı", icon: "train" },
      { id: "l2", name: "Yemekli Vagon", description: "Beyaz örtülü masalar ve garsonlarla yemekli vagon", icon: "restaurant" },
      { id: "l3", name: "Tuvalet", description: "Trenin arka bölümündeki küçük, kilitlenebilir tuvalet", icon: "wc" },
    ],
    clues: [
      {
        id: "c1",
        text: "kurban tuvalet değil, oturma alanında bulundu. hiç oraya geçmemişti.",
        type: "elimination",
        isBonus: false,
      },
      {
        id: "c2",
        text: "öğrenci bütün yolculuk boyunca koridorda müzik dinledi; birden fazla yolcu bunu gördü.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c3",
        text: "hareket halindeki trende halat saklamak ve kulanmak imkansız; tanıklar tüm hareketi görmüş olurdu.",
        type: "elimination",
        isBonus: false,
      },
      {
        id: "c4",
        text: "emekli doktor kurbanla yemekli vagonda içki içmişti; zehir kokteylin içine karışmıştı.",
        type: "direct",
        isBonus: false,
      },
      {
        id: "c5",
        text: "adli tıp: kanda standart zehir bileşiği tespit edildi. içecek yoluyla alınmış.",
        type: "forensic",
        isBonus: true,
      },
      {
        id: "c6",
        text: "iş kadını kompartımanından çıkmadı; kondüktör kapı kontrolü sırasında onu uyurken gördü. yemekli vagona hiç geçmedi.",
        type: "witness",
        isBonus: true,
      },
    ],
    solvabilityMeta: {
      freeEliminations: ["l3", "s2", "w3", "l1", "w2"],
      bonusEliminations: ["s1"],
    },
    solution: { suspectId: "s3", weaponId: "w1", locationId: "l2" },
  },
  {
    id: "p009",
    title: "Tarihi Hamamda Cinayet",
    difficulty: "caylak",
    dayIndex: 9,
    story:
      "Sultanahmet'teki tarihi bir hamamda, tanınmış bir iş insanı masaj sırasında hayatını kaybetti. Hamam personeli şokta.",
    suspects: [
      { id: "s1", name: "Kese Ustası", description: "20 yıllık deneyim", icon: "person" },
      { id: "s2", name: "Yönetici", description: "Hamamı yeni satın almıştı", icon: "account-circle" },
      { id: "s3", name: "Kasiyer", description: "Genç çalışan", icon: "face" },
    ],
    weapons: [
      { id: "w1", name: "Zehirli Sabun", description: "Sabun köpüğüne karıştırılan toksik kimyasal madde", icon: "soap" },
      { id: "w2", name: "Boğma", description: "Islak havluyla ya da elle gerçekleştirilen boğma", icon: "back-hand" },
      { id: "w3", name: "Uyku İlacı", description: "Çaya karıştırılan güçlü sedatif madde", icon: "medication" },
    ],
    locations: [
      { id: "l1", name: "Masaj Odası", description: "Mermer göbek taşıyla ısınan özel masaj kabini", icon: "spa" },
      { id: "l2", name: "Soğukluk", description: "Hamamın giriş bölümündeki serinletici soğukluk", icon: "ac-unit" },
      { id: "l3", name: "Kasa", description: "Hamamın girişindeki ödeme ve bekleme kasası", icon: "point-of-sale" },
    ],
    clues: [
      {
        id: "c1",
        text: "kurban masaj odasında bulundu ve adli izler de orada hayatını kaybettiğini doğruluyor.",
        type: "forensic",
        isBonus: false,
      },
      {
        id: "c2",
        text: "kasiyer o sırada dışarıda bekleme listesiyle meşguldü; güvenlik kamerası bunu kayıt altına almış.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c3",
        text: "kimyasal analiz: sabun köpüğünde toksin izi bulunamadı. zehirli sabun hipotezi reddedildi.",
        type: "forensic",
        isBonus: false,
      },
      {
        id: "c4",
        text: "kese ustası masaj boyunca kurbanla temas halindeydi. masaj odasına başka kimse girmedi.",
        type: "direct",
        isBonus: false,
      },
      {
        id: "c5",
        text: "yönetici, mali raporları gözden geçiriyordu; ofisindeki güvenlik kamerası onu tüm süre boyunca kayıt altına aldı.",
        type: "evidence",
        isBonus: true,
      },
      {
        id: "c6",
        text: "adli inceleme: boğma izleri kuvvetli el baskısı gerektiriyor. kese ustasının deneyimi ve fizik yapısıyla örtüşüyor.",
        type: "forensic",
        isBonus: true,
      },
    ],
    solvabilityMeta: {
      freeEliminations: ["l2", "l3", "s3", "w1"],
      bonusEliminations: ["s2", "w3"],
    },
    solution: { suspectId: "s1", weaponId: "w2", locationId: "l1" },
  },
  {
    id: "p010",
    title: "Sabancı Müzesi Gasp",
    difficulty: "baskomiser",
    dayIndex: 10,
    story:
      "Sabancı Müzesi'ndeki bir özel galada, Osmanlı dönemine ait nadide bir mücevher koleksiyonu çalındı. Güvenlik koordinatörü saldırıya uğradı.",
    suspects: [
      { id: "s1", name: "Galeri Direktörü", description: "Organizasyonu yönetti", icon: "badge" },
      { id: "s2", name: "Ünlü Sanatçı", description: "Gala konuğu", icon: "face" },
      { id: "s3", name: "Güvenlik Şefi", description: "Müze güvenliğinden sorumlu", icon: "local-police" },
      { id: "s4", name: "Nakliyeci", description: "Eserleri taşıdı", icon: "engineering" },
    ],
    weapons: [
      { id: "w1", name: "Elektrik Sopası", description: "Yüksek voltajlı elektrik deşarjı yapan sopa", icon: "flash-on" },
      { id: "w2", name: "Kimyasal Sprey", description: "Bilinç kaybına neden olan biber gazı karışımı", icon: "air" },
      { id: "w3", name: "Demir Çubuk", description: "Güvenlik kapılarını kırmak için kullanılan ağır çubuk", icon: "hardware" },
      { id: "w4", name: "Uyutucu", description: "Damar içi enjeksiyonla hızla etkisini gösteren sedatif", icon: "vaccines" },
    ],
    locations: [
      { id: "l1", name: "Sergi Salonu", description: "Osmanlı mücevherlerinin vitrinlerde sergilendiği ana salon", icon: "museum" },
      { id: "l2", name: "Güvenlik Merkezi", description: "Kamera panellerinin ve alarm sisteminin bulunduğu oda", icon: "security" },
      { id: "l3", name: "Depo", description: "Sergilenmeyecek eserlerin muhafaza edildiği arka depo", icon: "inventory" },
      { id: "l4", name: "Çıkış Noktası", description: "Müzenin arka kapısına açılan güvenlik çıkışı", icon: "exit-to-app" },
    ],
    clues: [
      {
        id: "c1",
        text: "saldırı sergi salonunda değil; arka bölümlerde gerçekleşti. salon kameraları normal gösteriyor.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c2",
        text: "nakliyeci, gala başlamadan malları teslim edip ayrılmıştı. çıkış saati loglanmış.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c3",
        text: "kimyasal sprey kullanılmış olsaydı gala misafirleri de etkilenirdi; hiç şikayet yok.",
        type: "elimination",
        isBonus: false,
      },
      {
        id: "c4",
        text: "galeri direktörü her misafirle fotoğraf çektirdi; salon boyunca tanıkları var, tek başına kalmadı.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c5",
        text: "ünlü sanatçı, güvenlik merkezine özel geçiş izni almış ve sistemin kapandığı anda orada görülmüş.",
        type: "direct",
        isBonus: true,
      },
      {
        id: "c6",
        text: "adli rapor: koordinatörde elektrik deşarjından kaynaklanan yanık izleri bulundu. güvenlik şefi o gece resmi izin kullandığından görevde değildi; insan kaynakları kaydı bunu teyit ediyor.",
        type: "forensic",
        isBonus: true,
      },
    ],
    solvabilityMeta: {
      freeEliminations: ["l1", "s4", "w2", "s1"],
      bonusEliminations: ["l3", "l4", "w3", "w4", "s3"],
    },
    solution: { suspectId: "s2", weaponId: "w1", locationId: "l2" },
  },
  {
    id: "p011",
    title: "Çarşamba Suikastı",
    difficulty: "dedektif",
    dayIndex: 11,
    story:
      "Küçük bir kasaba olan Çarşamba'da, belediye başkanı ofisinde ölü bulundu. Kasaba halkı şoke olmuştu.",
    suspects: [
      { id: "s1", name: "Muhalefet Adayı", description: "Seçimlerde rakip", icon: "badge" },
      { id: "s2", name: "Sekreter Bayan", description: "Yıllardır yanında çalışıyor", icon: "support-agent" },
      { id: "s3", name: "İnşaat Müteahhit", description: "Belediyeyle anlaşmazlık yaşıyor", icon: "engineering" },
    ],
    weapons: [
      { id: "w1", name: "Ağır Kağıt Ağırlığı", description: "Masanın üzerindeki süslü ağır cam kağıt ağırlığı", icon: "square" },
      { id: "w2", name: "Zehirli Kahve", description: "Her sabah hazırlanan kahvenin içine karıştırılan toksin", icon: "coffee" },
      { id: "w3", name: "Elektrik Çarpması", description: "Ofis ekipmanının kasıtlı olarak sabote edilmesi", icon: "flash-on" },
    ],
    locations: [
      { id: "l1", name: "Belediye Ofisi", description: "Belediye başkanının kullandığı büyük ve gösterişli ofis", icon: "business" },
      { id: "l2", name: "Toplantı Odası", description: "Uzun oval masalı resmi toplantı odası", icon: "groups" },
      { id: "l3", name: "Koridor", description: "Ofisin önündeki güvenlik kameralı geniş koridor", icon: "route" },
    ],
    clues: [
      {
        id: "c1",
        text: "adli tıp: belediye başkanının kahve fincanında kimyasal toksin tespit edildi; zehirleme belediye ofisinde, masasının başında gerçekleşti.",
        type: "forensic",
        isBonus: false,
      },
      {
        id: "c2",
        text: "muhalefet adayı sabah seçim kampanyası toplantısındaydı; kayıtlar onu o sabah toplantı odasına yerleştiriyor, belediye ofisine hiç gelmedi.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c3",
        text: "güvenlik kamerası inşaat müteahhidini koridorda gördü; belediye odasına girmedi, koridorda bekledi.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c4",
        text: "toplantı odasındaki kağıt ağırlığı yerinden kaymıştı; muhalefet adayı ve ağır cam nesne aynı mekânda buluşmuştu.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c5",
        text: "sekreter bayan her sabah başkana kahve hazırlardı; o gün de bu rutin yaşandı ve belediye ofisindeydi.",
        type: "direct",
        isBonus: true,
      },
      {
        id: "c6",
        text: "elektrik altyapısı o gün tamamen arızalıydı; teknik servis kayıtları panoya mühür vurduğunu belgeler — elektrik yolu o gün kullanılamaz.",
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
    id: "p012",
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
    id: "p013",
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
    id: "p014",
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
    id: "p015",
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
    id: "p016",
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
    id: "p017",
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
    id: "p018",
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
    id: "p019",
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
    id: "p020",
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
    id: "p021",
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
    id: "p022",
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
    id: "p023",
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
    id: "p024",
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
    id: "p025",
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
    id: "p026",
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
    id: "p027",
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
    id: "p028",
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
    id: "p029",
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
    id: "p030",
    title: "Karaköy'de Neon Gece",
    difficulty: "caylak",
    dayIndex: 30,
    story:
      "Karaköy'ün neon ışıklı gece kulübünde müzik durduğunda, servis çıkışında bayılmış bir müşteri bulundu. Gece herkesin sahte güldüğü bir yerdi.",
    suspects: [
      { id: "s1", name: "DJ Mete", description: "Kulübün sahibi ve sahne DJ'i", icon: "face" },
      { id: "s2", name: "Kasiyer Deniz", description: "Giriş kasasında çalışan genç kasiyer", icon: "person" },
      { id: "s3", name: "Güvenlik Hakan", description: "Kapı ve servis çıkışı güvenlik görevlisi", icon: "local-police" },
    ],
    weapons: [
      { id: "w1", name: "Bozuk İçki", description: "Bardan alınan, içine yabancı madde karıştırılmış kokteyl", icon: "local-bar" },
      { id: "w2", name: "Elektrik Akımı", description: "Servis koridorundaki hasarlı kablo tesisatından iletilen elektrik", icon: "electrical-services" },
      { id: "w3", name: "Sert Cisim", description: "Servis geçidinde bulunan, parmak izi barındıran ağır plastik nesne", icon: "sports-baseball" },
    ],
    locations: [
      { id: "l1", name: "Dans Pisti", description: "Stroboskop ve lazer ışıklarıyla kaplı kalabalık dans alanı", icon: "nightlife" },
      { id: "l2", name: "VIP Lounge", description: "Yarı özel, kadife perdeli ayrıcalıklı oturma alanı", icon: "star" },
      { id: "l3", name: "Servis Çıkışı", description: "Arka taraftaki depo ve mutfağa bağlanan karanlık çıkış koridoru", icon: "door-back" },
    ],
    clues: [
      {
        id: "c1",
        text: "adli tıp: kafa travması, künt cisimle darbe; içki ya da elektrik yaralanması bulgusu yok. sert cisim servis çıkışında kullanılmış.",
        type: "forensic",
        isBonus: false,
      },
      {
        id: "c2",
        text: "dans pistinin duvar panellerinde hasar ve elektrik kablosu sıyrığı tespit edildi; akım iletimi dans alanında gerçekleşebiliyordu.",
        type: "evidence",
        isBonus: false,
      },
      {
        id: "c3",
        text: "dj mete gece boyunca sahne arkasında dans pisti üzerinde müzik yönetti; çok sayıda müşteri ve teknik ekip bunu doğruluyor.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c4",
        text: "kasiyer deniz tüm gece vıp lounge'da özel müşterilere hizmet verdi; kasa kaydı vıp bölgede olduğunu gösteriyor.",
        type: "witness",
        isBonus: false,
      },
      {
        id: "c5",
        text: "hakan kurbanla servis çıkışında tartıştığını gösteren kamera görüntüsü mevcut; ses seviyesi yüzünden dövüşe döndü.",
        type: "direct",
        isBonus: true,
      },
      {
        id: "c6",
        text: "servis geçidinde bulunan nesne üzerinde hakan'a ait parmak izleri belirlendi.",
        type: "evidence",
        isBonus: true,
      },
    ],
    solvabilityMeta: {
      freeEliminations: ["l1", "l2", "s1", "s2", "w1", "w2"],
      bonusEliminations: [],
    },
    solution: { suspectId: "s3", weaponId: "w3", locationId: "l3" },
  },
  {
    id: "p031",
    title: "Konakta Gece Vakti",
    difficulty: "caylak",
    dayIndex: 31,
    story:
      "Bursa'nın eski bir konağında yemek daveti düzenlendi. Sabah erkenden konağın uşağı Fuat Bey'i çalışma odasında bıçaklanmış hâlde buldu. Davettekilerin yalnızca üçü konakta gecelemişti. Sen bölge jandarmasının genç dedektifi olarak olayı çözmek için sabahın ilk ışıklarında kapıya dayandın.",
    suspects: [
      { id: "s1", name: "Tüccar Haluk Bey", description: "Fuat Bey'e büyük borcu olan varlıklı kumaş tüccarı.", icon: "store" },
      { id: "s2", name: "Yeğen Semiha Hanım", description: "Merhum Fuat Bey'in tek varisi olan yeğeni; miras meselesinde beklentisi yüksek.", icon: "face-3" },
      { id: "s3", name: "Emekli Yüzbaşı Cemil", description: "Fuat Bey'in eski askeri arkadaşı; aralarında geçmişten gelen bir hesap var.", icon: "military-tech" },
    ],
    weapons: [
      { id: "w1", name: "Saplı Bıçak", description: "Mutfaktan alınmış uzun saplı et bıçağı.", icon: "content-cut" },
      { id: "w2", name: "Hançer", description: "Duvarda asılı süs amaçlı eski Osmanlı hançeri.", icon: "construction" },
      { id: "w3", name: "Kâğıt Bıçağı", description: "Masanın üzerindeki zarif gümüş kâğıt açacağı.", icon: "edit" },
    ],
    locations: [
      { id: "l1", name: "Çalışma Odası", description: "Konağın zemin katındaki kilitli çalışma odası.", icon: "menu-book" },
      { id: "l2", name: "Kütüphane", description: "Üst kattaki kitaplıklı oda; penceresi bahçeye bakıyor.", icon: "history-edu" },
      { id: "l3", name: "Mutfak", description: "Konağın arka tarafındaki geniş mutfak bölümü.", icon: "restaurant" },
    ],
    clues: [
      { id: "c1", text: "Fuat Bey çalışma masasının önünde bulundu; etrafında mücadele izi var, kapı içeriden kilitliydi ve anahtar masanın üzerindeydi. Ölüm burada gerçekleşti.", type: "evidence", isBonus: false },
      { id: "c2", text: "Uşak, gece yarısı Emekli Yüzbaşı Cemil'in üst kattaki odasından yüksek sesle horlamasını duyduğunu söylüyor. Oda kapısını sabah 7'de bizzat kendisi açtı; Cemil içeride derin uykudaydı.", type: "witness", isBonus: false },
      { id: "c3", text: "Yara izi dar ve düzgün kesilmiş; kâğıt bıçağı gibi ince ve küçük bir aletle yapılmış olamaz. Darbe uzun ve güçlü bir bıçaktan gelmiş.", type: "forensic", isBonus: false },
      { id: "c4", text: "Duvardaki hançer askısında toz birikmiş ve hançer sıkıca yerinde duruyor; yıllar içinde paslanan menteşesi açılmamış.", type: "evidence", isBonus: false },
      { id: "c5", text: "Sabah mutfağı kontrol eden uşak, uzun saplı et bıçaklarından birinin eksik olduğunu fark etti. Semiha Hanım'ın odasına giden koridorda küçük bir kan lekesi bulundu.", type: "witness", isBonus: true },
      { id: "c6", text: "Semiha Hanım'ın bavulunda sakladığı gecelik kıyafetin kolunda kan lekesi bulundu. Bıçak ise konağın arka bahçesinde çiçek tarhının altına gömülmüş hâlde çıktı.", type: "direct", isBonus: true },
    ],
    solvabilityMeta: {
      freeEliminations: ["l2", "l3", "s3", "w2", "w3"],
      bonusEliminations: ["s1"],
    },
    solution: { suspectId: "s2", weaponId: "w1", locationId: "l1" },
  },
  {
    id: "p032",
    title: "Pazar Sabahı Baskını",
    difficulty: "caylak",
    dayIndex: 32,
    story:
      "Gaziantep'in eski çarşısında bakırcı Niyazi Usta, sabah erken saatlerde dükkanının deposunda ağır yaralı halde bulundu ve kısa süre sonra hayatını kaybetti. Dükkan henüz açılmamıştı. Ön kapı dışarıdan kilitliydi; depoda dağınıklık ve mücadele izleri vardı. Kasadan para ve bazı bakır eşyalar kayıptı. O sabah çarşıda üç kişi bulunuyordu: rakip esnaf Vahap, çırak Selim ve kargo görevlisi Murat.",
    suspects: [
      { id: "s1", name: "Rakip Esnaf Vahap", description: "Hemen karşısındaki dükkânda bakır satan eski rakip; son aylarda maddi sıkıntı yaşıyor, müşteri kaybını Niyazi'ye bağlıyor.", icon: "elderly" },
      { id: "s2", name: "Çırak Selim", description: "Niyazi Usta'nın üç yıldır yanında çalışan çırağı; son haftalarda ustasıyla sık sık tartışıyor, dükkân anahtarına erişimi var.", icon: "person" },
      { id: "s3", name: "Kargo Görevlisi Murat", description: "Her sabah çarşıya teslimat yapan kargo görevlisi; o gün erken saatte çarşıda görülmüş.", icon: "local-shipping" },
    ],
    weapons: [
      { id: "w1", name: "Bakır Sürahi", description: "Dükkanın vitrinindeki ağır, yuvarlak yüzeyli bakır sürahi; sapı rahatlıkla kavranabilir.", icon: "wine-bar" },
      { id: "w2", name: "Demir Çubuk", description: "Depoda bulunan uzun ve köşeli demir destek çubuğu.", icon: "build" },
      { id: "w3", name: "Taş", description: "Arka sokakta bulunabilecek düzensiz ve pürüzlü yüzeyli moloz taşı.", icon: "lens" },
    ],
    locations: [
      { id: "l1", name: "Depo", description: "Dükkanın arka bölümündeki kapalı depo; arka kapıdan erişilebilir, ön kapıdan görünmez.", icon: "warehouse" },
      { id: "l2", name: "Dükkan İç Alanı", description: "Vitrin ve tezgahın bulunduğu ana satış alanı; ön kapıdan doğrudan girilir.", icon: "storefront" },
      { id: "l3", name: "Arka Sokak", description: "Dükkanın arka kapısına açılan dar sokak; çarşı esnafının mal girişi için kullandığı geçit.", icon: "directions-walk" },
    ],
    clues: [
      { id: "c1", text: "Niyazi Usta deponun tam ortasında bulundu; etrafındaki kırık kutular ve devrilmiş raflar mücadelenin burada yaşandığını gösteriyor. Dükkan ön kapısı dışarıdan kilitliydi.", type: "evidence", isBonus: false },
      { id: "c2", text: "Çarşının başındaki çay ocağı sahibi, Rakip Esnaf Vahap'ın o sabah çay içmek için ocakta oturduğunu, dükkânına ancak saat 08:30'da gittiğini söylüyor. Cinayet en geç 07:45'te gerçekleşmiş.", type: "witness", isBonus: false },
      { id: "c3", text: "Baş yarası yuvarlak ve pürüzsüz bir cisimle oluşmuş. Köşeli ve uzun bir çubuk bu izi bırakamaz; pürüzlü ve düzensiz bir taş da bu kadar temiz bir iz bırakmaz.", type: "forensic", isBonus: false },
      { id: "c4", text: "Vitrininden alınan bakır sürahinin sapında küçük bir kan izi ve kıl parçası bulundu. Sürahi depoya yakın bir rafa bırakılmış.", type: "evidence", isBonus: false },
      { id: "c5", text: "Çırak Selim, usta erken açtığında kendisinin henüz gelmediğini söylüyor. Ancak komşu dükkan sahibi Selim'i sabah 07:00'de dükkanın arka kapısından girdiğini gördüğünü belirtiyor.", type: "witness", isBonus: true },
    ],
    solvabilityMeta: {
      freeEliminations: ["l2", "l3", "s1", "w2", "w3"],
      bonusEliminations: ["s3"],
    },
    solution: { suspectId: "s2", weaponId: "w1", locationId: "l1" },
  },
  {
    id: "p033",
    title: "Akşam Vapurunda Gizem",
    difficulty: "caylak",
    dayIndex: 33,
    story:
      "İstanbul Boğazı'nı geçen akşam vapurunda emekli hâkim Nafiz Bey, güverte altındaki kapalı yolcu salonunda ölü bulundu. Vapur iskeleye yanaşmadan önce kaptan oturumu durdurdu. Salonda yalnızca üç yolcu kalmıştı. Sen deniz polisi dedektifi olarak vapura çıktın.",
    suspects: [
      { id: "s1", name: "Avukat Kerem Bey", description: "Nafiz Bey'in davasında karşı tarafı temsil eden genç avukat; mahkûm olmuştu.", icon: "badge" },
      { id: "s2", name: "Hemşire Feriha Hanım", description: "Nafiz Bey'in eski bir tanığı; aleyhinde ifade verilmesine kin beslediği biliniyor.", icon: "medical-services" },
      { id: "s3", name: "Öğrenci Tarık", description: "Nafiz Bey'in oğlunun yakın arkadaşı; miras davasında tanıklık etmesi bekleniyor.", icon: "person" },
    ],
    weapons: [
      { id: "w1", name: "Zehirli İlaç", description: "Yüksek dozda karıştırılmış uyku ilacı; fark edilmeden içki içine katılabilir.", icon: "medication" },
      { id: "w2", name: "İp Parçası", description: "Vapurun güvertesinde bulunan kalın halat parçası.", icon: "link" },
      { id: "w3", name: "Cam Kırığı", description: "Salondaki kırık bardaktan elde edilen keskin cam.", icon: "broken-image" },
    ],
    locations: [
      { id: "l1", name: "Yolcu Salonu", description: "Güverte altındaki kapalı yolcu bekleme salonu.", icon: "weekend" },
      { id: "l2", name: "Açık Güverte", description: "Vapurun üst katındaki açık hava güverte alanı.", icon: "directions-boat" },
      { id: "l3", name: "Makine Dairesi", description: "Alt kattaki makine ve pompa odası; yolculara kapalı.", icon: "engineering" },
    ],
    clues: [
      { id: "c1", text: "Nafiz Bey'in üzerinde hiçbir darp veya kesik izi yok. Yanındaki bardakta çözünmüş toz kalıntısı var; ölüm zehirlenmeyle gerçekleşmiş. Cesedi yolcu salonunda bulundu.", type: "forensic", isBonus: false },
      { id: "c2", text: "Kaptan, Öğrenci Tarık'ın yolculuk boyunca açık güvertede oturduğunu ve iskele yaklaşınca aşağı indiğini söylüyor. Nafiz Bey'in bulunduğu salon güverteden görünmüyor.", type: "witness", isBonus: false },
      { id: "c3", text: "Bilet görevlisi Kerem Bey'in vapura binişinin kaydedildiği saatin, Nafiz Bey'in son görüldüğü saatten 20 dakika sonra olduğunu söylüyor; yani Kerem Bey salondan önce üst güverteye çıkmıştı.", type: "witness", isBonus: false },
      { id: "c4", text: "Hemşire Feriha Hanım'ın tıbbi çantasında standart doz üzerinde bir uyku ilacı şişesi bulundu; şişede eksilen miktar bardaktaki kalıntıyla örtüşüyor.", type: "evidence", isBonus: false },
      { id: "c5", text: "Nafiz Bey'in bardağında iki farklı kişinin parmak izi var; biri Nafiz Bey'e ait, diğeri hemşire eldiveninin bıraktığı pudra izine benziyor.", type: "indirect", isBonus: true },
      { id: "c6", text: "Feriha Hanım'ın çantasının iç cebinde Nafiz Bey'e yazılmış yırtık bir mektup bulundu: mahkemede verdiği ifadeden dolayı ona hesap soracağını yazan kendi el yazısıyla.", type: "direct", isBonus: true },
    ],
    solvabilityMeta: {
      freeEliminations: ["l2", "l3", "w2", "w3", "s3", "s1"],
      bonusEliminations: [],
    },
    solution: { suspectId: "s2", weaponId: "w1", locationId: "l1" },
  },
  {
    id: "p034",
    title: "Bağda Kanlı Bıçak",
    difficulty: "caylak",
    dayIndex: 34,
    story:
      "İzmir'in Bornova ilçesinde bir zeytinlik ve bağ sahibi Hüsnü Ağa, hasat dönemi sabahında bağın içinde bıçaklanmış bulundu. Etrafındaki üzüm sepetleri devrilmişti. O sabah erken bağa giren üç kişi tespit edildi. Bölge jandarması seni olayı çözmeye davet etti.",
    suspects: [
      { id: "s1", name: "Uşak Mehmet", description: "Hüsnü Ağa'nın bağında yıllardır çalışan yaşlı uşak; son zamanlarda kovulma söylentisi çıkmış.", icon: "agriculture" },
      { id: "s2", name: "Komşu Tarla Sahibi Nevzat", description: "Hüsnü Ağa ile tarla sınırı yüzünden mahkemelik olan komşu.", icon: "elderly" },
      { id: "s3", name: "Torun Kız Nermin", description: "Hüsnü Ağa'nın genç torunu; büyükbabasının bağı satma kararına şiddetle karşı çıkıyor.", icon: "face-3" },
    ],
    weapons: [
      { id: "w1", name: "Bağ Bıçağı", description: "Üzüm kesmede kullanılan kısa ve keskin bağ bıçağı.", icon: "content-cut" },
      { id: "w2", name: "Balta", description: "Bağ kulübesinde saklanan odun baltası.", icon: "carpenter" },
      { id: "w3", name: "Demir Kazma", description: "Toprak işlemeye yarayan ağır demir kazma.", icon: "construction" },
    ],
    locations: [
      { id: "l1", name: "Bağ İçi", description: "Asmaların sık yetiştiği bağın orta kısmı.", icon: "grass" },
      { id: "l2", name: "Bağ Kulübesi", description: "Bağın girişindeki küçük taş kulübe; aletler burada saklanıyor.", icon: "cottage" },
      { id: "l3", name: "Tarla Sınırı", description: "Hüsnü Ağa ile komşu Nevzat'ın tarlasını ayıran taş duvar hattı.", icon: "terrain" },
    ],
    clues: [
      { id: "c1", text: "Hüsnü Ağa bağın tam ortasında, asmaların arasında bulundu. Devrilmiş sepetler ve kırık dallar mücadelenin bağ içinde olduğunu kanıtlıyor.", type: "evidence", isBonus: false },
      { id: "c2", text: "Köy muhtarı, Torun Nermin'i sabah namazı vakti köy çeşmesinde ağlarken gördüğünü söylüyor. Çeşme bağdan 3 km uzakta; oraya gidip gelmesi cinayet saatini karşılamıyor.", type: "witness", isBonus: false },
      { id: "c3", text: "Yaranın biçimi dar, kısa ve düzgün kesilmiş; balta veya kazma gibi büyük ve ağır aletlerin bıraktığı geniş yara bu değil.", type: "forensic", isBonus: false },
      { id: "c4", text: "Uşak Mehmet'in beline bağlı bıçak kını boş; kında taze kan izi var. Mehmet bıçağın sabah düştüğünü öne sürdü ama bağ içinde arama yapıldığında bıçak Nevzat'ın tarlasına doğru uzanan patikada bulundu.", type: "evidence", isBonus: false },
      { id: "c5", text: "Tarla sınırındaki işçi Ahmet, sabah çok erken Nevzat'ın taş duvarın yanında beklediğini ama bağa girmediğini söylüyor. Nevzat sadece sınır kontrolü yaptığını doğruluyor.", type: "witness", isBonus: true },
      { id: "c6", text: "Hüsnü Ağa'nın cebinden imzalanmamış bir kâğıt çıktı: Uşak Mehmet'i bu hafta sonu işten çıkardığını belirten yazılı bildirim. Mehmet'in bu kâğıttan haberi olduğu, dün akşam tartıştıkları komşu tarafından doğrulandı.", type: "direct", isBonus: true },
    ],
    solvabilityMeta: {
      freeEliminations: ["l2", "l3", "s3", "w2", "w3"],
      bonusEliminations: ["s2"],
    },
    solution: { suspectId: "s1", weaponId: "w1", locationId: "l1" },
  },
  {
    id: "p035",
    title: "Kervansarayda Son Gece",
    difficulty: "caylak",
    dayIndex: 35,
    story:
      "Konya'nın tarihi kervansarayından dönüştürülmüş han binasında tüccar Raşit Efendi, sabah odasında boğulmuş hâlde bulundu. Hanın sadece üç konuğu vardı; diğerleri bir gün önce ayrılmıştı. Kapı ne kilitli ne de zorlanmış; katil Raşit Efendi'nin tanıdığı biri olmalı. Sen şehir polisi dedektifi olarak sorgulamayı yürütüyorsun.",
    suspects: [
      { id: "s1", name: "Tüccar Ortak Sabri Bey", description: "Raşit Efendi'nin on yıllık iş ortağı; ortaklıktan ayrılmak istediği duyulmuş.", icon: "store" },
      { id: "s2", name: "Hizmetçi Kadın Hacer", description: "Hanın tek hizmetçisi; Raşit Efendi'nin odasını düzenlemek için anahtara sahip.", icon: "face-3" },
      { id: "s3", name: "Gezgin Derviş Salih", description: "Handa gecelemekte olan yaşlı derviş; Raşit Efendi ile yemekte tartıştığı görülmüş.", icon: "self-improvement" },
    ],
    weapons: [
      { id: "w1", name: "Atkı", description: "Uzun ve kalın yün atkı; boyunda boğulma izi bırakmış.", icon: "link" },
      { id: "w2", name: "Kemer", description: "Raşit Efendi'nin odadaki deri kemeri.", icon: "build" },
      { id: "w3", name: "Halat", description: "Han ambarında bulunan kalın kendir halat.", icon: "anchor" },
    ],
    locations: [
      { id: "l1", name: "Konak Odası", description: "Raşit Efendi'nin kaldığı birinci kattaki geniş oda.", icon: "castle" },
      { id: "l2", name: "Han Avlusu", description: "Hanın ortasındaki açık avlu; gece boyunca bekçi dolaşıyor.", icon: "park" },
      { id: "l3", name: "Ambar", description: "Alt kattaki kilitli ambar; yalnızca hizmetçi ve han sahibinin anahtarı var.", icon: "warehouse" },
    ],
    clues: [
      { id: "c1", text: "Raşit Efendi yatağının yanında, boyunda atkı izi olan hâlde bulundu. Odada mücadele izi var; ölüm burada gerçekleşmiş.", type: "evidence", isBonus: false },
      { id: "c2", text: "Boyundaki iz kalın ve yumuşak; deri kemer bu izi bırakamazdı çünkü kemer tokalı ve dar kenarlıdır, iz geniş ve eşit basınçlı.", type: "forensic", isBonus: false },
      { id: "c3", text: "Han bekçisi gece boyunca avluyu dolaştı; halat her zaman ambardaydı ve ambar kilidi sabah kontrol edildiğinde açılmamıştı.", type: "witness", isBonus: false },
      { id: "c4", text: "Caminin imamı, Gezgin Derviş Salih'in sabah namazı için tekkeye çok erkenden geldiğini ve namaz boyunca ayrılmadığını doğruluyor. Ölüm vakti namaz saatiyle örtüşüyor.", type: "witness", isBonus: false },
      { id: "c5", text: "Boyundaki atkı koyu mavi yün; hizmetçi Hacer'in üzerindeki şalın rengi ve dokusu bire bir uyuşuyor. Hacer atkının kendisine ait olduğunu inkâr etmiyor ama 'düşürmüş' olduğunu söylüyor.", type: "indirect", isBonus: true },
      { id: "c6", text: "Raşit Efendi'nin odasından altın kese kayıp; sabah Hacer'in odasında yastık altında bulundu. Hacer'in Raşit Efendi'ye geçen ay kişisel borcu olduğu han sahibi tarafından doğrulandı.", type: "direct", isBonus: true },
    ],
    solvabilityMeta: {
      freeEliminations: ["l2", "l3", "s3", "w2", "w3"],
      bonusEliminations: ["s1"],
    },
    solution: { suspectId: "s2", weaponId: "w1", locationId: "l1" },
  },
  {
    id: "p036",
    title: "Fotoğrafçının Son Karesi",
    difficulty: "dedektif",
    dayIndex: 36,
    story:
      "Ankara'nın eski Ulus semtinde tanınmış bir fotoğrafçı olan Faruk Bey, stüdyosunda ölü bulundu. Karanlık odanın lambası yanık, banyo teknelerinde yarı işlenmiş filmler hâlâ duruyor. Üç kişinin gün içinde stüdyoya geldiği bilinmekte; ama her biri diğerini suçluyor. Sen polis müdürlüğünün deneyimli dedektifi olarak dosyayı devraldın.",
    suspects: [
      { id: "s1", name: "Gazeteci Selda Hanım", description: "Faruk Bey'in bir süre önce fotoğraflarını izinsiz yayımlayan muhalif gazeteci.", icon: "face-3" },
      { id: "s2", name: "Asistan Cumhur", description: "Faruk Bey'in stüdyo asistanı; patron kendisini terfi ettirmemekle suçluyordu.", icon: "face" },
      { id: "s3", name: "Koleksiyoner Münir Bey", description: "Faruk Bey'den satın almak istediği nadir fotoğraflar için uzun süredir baskı yapan koleksiyoner.", icon: "elderly" },
    ],
    weapons: [
      { id: "w1", name: "Tripod Bacağı", description: "Metal tripoddan sökülen uzun ve ağır alüminyum bacak.", icon: "straighten" },
      { id: "w2", name: "Kimyasal Banyo", description: "Karanlık odadaki yüksek asitli film banyosu çözeltisi.", icon: "science" },
      { id: "w3", name: "Cam Negatif Kutusu", description: "İçi cam negatif dolu ağır metal kutu.", icon: "inventory-2" },
    ],
    locations: [
      { id: "l1", name: "Karanlık Oda", description: "Stüdyonun arka tarafındaki kırmızı lambalı film banyosu odası.", icon: "camera-roll" },
      { id: "l2", name: "Stüdyo Salonu", description: "Fotoğraf çekimlerinin yapıldığı geniş ön oda.", icon: "photo-camera" },
      { id: "l3", name: "Depo Odası", description: "Malzemelerin ve arşiv kutularının saklandığı arka oda.", icon: "warehouse" },
    ],
    clues: [
      { id: "c1", text: "Faruk Bey karanlık odanın içinde, banyo teknesinin yanında baş yarası ve kimyasal yanıkla bulundu. Ölüm karanlık odada gerçekleşmiş; kapısı içeriden sürgülüydü ama sürgü kırılmış hâlde.", type: "evidence", isBonus: false },
      { id: "c2", text: "Aşağıdaki kırtasiyeci, Koleksiyoner Münir Bey'in öğleden sonra saat 14:00'te stüdyoya girdiğini ve 14:20'de çıktığını söylüyor. Faruk Bey'in ölüm saati 15:30-16:00 arası olarak tahmin ediliyor.", type: "witness", isBonus: false },
      { id: "c3", text: "Baş yarası künt bir darbeyle oluşmuş; tripod bacağı gibi uzun ve boru biçimli bir nesnenin izi. Kimyasal yanıklar ise darbeden sonra oluşmuş; yani kimyasal birincil silah değil, örtbas için kullanılmış.", type: "forensic", isBonus: false },
      { id: "c4", text: "Stüdyo salonundaki tripodun bir bacağı yerinden sökülmüş; sökülen yerde taze metal çizik var. Karanlık odada bulunan metal çubuk bu tripoda ait.", type: "indirect", isBonus: false },
      { id: "c5", text: "Gazete arşivi kayıtları, Selda Hanım'ın o gün saat 15:00-17:00 arasında başka bir muhabir ile röportaj yaptığını gösteriyor. Röportajı yapılan kişi de bunu doğruluyor.", type: "witness", isBonus: true },
      { id: "c6", text: "Karanlık odanın rafında bulunan tek kullanımlık lastik eldivende Cumhur'un parmak izi var; eldivenin içi terle ıslanmış. Cumhur karanlık odada iş yaparken eldiven giydiğini söylese de o gün banyoda film yoktu.", type: "direct", isBonus: true },
    ],
    solvabilityMeta: {
      freeEliminations: ["l2","l3","s3","w2","w3"],
      bonusEliminations: ["s1"],
    },
    solution: { suspectId: "s2", weaponId: "w1", locationId: "l1" },
  },
  {
    id: "p037",
    title: "Termal Otelde Ölüm",
    difficulty: "dedektif",
    dayIndex: 37,
    story:
      "Bursa'nın Çekirge semtindeki köklü termal otelde muhasebeci Münibe Hanım havuz kenarında boğulmuş hâlde bulundu. Gece geç saatte otelde yalnızca üç misafir kalmaktaydı. Her biri farklı bir kat iddiasıyla kapıda bekliyordu. Sen bölge polis dedektifi olarak sabah erkenden otele ulaştın.",
    suspects: [
      { id: "s1", name: "Emekli Doktor Vedat Bey", description: "Münibe Hanım'ın babasının eski dostu; miras verasetinde tanık olması bekleniyor ve buna karşı çıkıyordu.", icon: "medical-services" },
      { id: "s2", name: "İş Kadını Perihan Hanım", description: "Münibe Hanım'ın şirket ortağı; aralarında hesap anlaşmazlığı çıktığı biliniyor.", icon: "face-3" },
      { id: "s3", name: "Genç Sporcu Erdal", description: "Otelde kamp yapan milli takım sporcusu; Münibe Hanım'ın şirketiyle sponsorluk anlaşmazlığı yaşıyor.", icon: "directions-run" },
    ],
    weapons: [
      { id: "w1", name: "Havlu", description: "Kalın otel havlusu; boğmaya yetecek uzunlukta.", icon: "dry-cleaning" },
      { id: "w2", name: "Kimyasal Temizleyici", description: "Havuz bakımında kullanılan klorlu temizleyici şişe.", icon: "science" },
      { id: "w3", name: "Metal Trabzan", description: "Havuz merdiveninin sökülebilir metal trabzan borusu.", icon: "construction" },
    ],
    locations: [
      { id: "l1", name: "Termal Havuz", description: "Otelin alt katındaki kapalı termal havuz alanı.", icon: "pool" },
      { id: "l2", name: "Koridor", description: "Oda katlarını birbirine bağlayan uzun otel koridoru.", icon: "meeting-room" },
      { id: "l3", name: "Lobi", description: "Girişin hemen önündeki resepsiyon ve oturma alanı.", icon: "hotel" },
    ],
    clues: [
      { id: "c1", text: "Münibe Hanım termal havuzun sığ kenarında, basamakların dibinde bulundu. Akciğerleri su dolu; boğulma burada gerçekleşmiş. Havuz kapısı o gece kilitsiz bırakılmıştı.", type: "evidence", isBonus: false },
      { id: "c2", text: "Boynunda ince ama uzun bir sürtünme izi var; bu iz sert metal ya da sıvı temasından değil, kumaş baskısından oluşmuş.", type: "forensic", isBonus: false },
      { id: "c3", text: "Gece görevli resepsiyonisti, Emekli Doktor Vedat Bey'in baston olmadan hareketsiz kaldığını ve gece saat 22:00'den sonra odasından çıkmadığını söylüyor. Odanın numaralı kilidi o saatten sonra açılmamış.", type: "witness", isBonus: false },
      { id: "c4", text: "Sporcu Erdal'ın antrenman günlüğü incelendiğinde sabah 05:00 alarmı kurulu; havuza erken gittiği doğru ama güvenlik kamerası kaydı onu havuza 05:15'te girdiğini gösteriyor. Cinayet en geç 04:30'da gerçekleşmiş.", type: "witness", isBonus: false },
      { id: "c5", text: "Havuzdaki suda normalin üzerinde parfüm kokusu var; Perihan Hanım'ın kullandığı pahalı parfümle birebir aynı. Otel görevlisi Perihan Hanım'ın gece yarısı havuz yönünde yürüdüğünü gördüğünü söylüyor.", type: "indirect", isBonus: true },
      { id: "c6", text: "Münibe Hanım'ın boynuna sarılı havlu kendi odasına ait değil; 312 numaralı odanın monogramını taşıyor. 312 numaralı oda Perihan Hanım'a kayıtlı.", type: "direct", isBonus: true },
    ],
    solvabilityMeta: {
      freeEliminations: ["l2","l3","w2","w3","s1","s3"],
      bonusEliminations: [],
    },
    solution: { suspectId: "s2", weaponId: "w1", locationId: "l1" },
  },
  {
    id: "p038",
    title: "Mektup Gelmedi",
    difficulty: "dedektif",
    dayIndex: 38,
    story:
      "Samsun'un liman mahallelerinden birinde postacı Cafer Bey, dağıtım çantası yanında akşam erken saatte bir arka sokakta bıçaklanmış bulundu. Çantasındaki birkaç mektup kayıp. O gün üç farklı kişiyle tartıştığı tanıklarca doğrulanıyor. Sen liman bölgesi dedektifi olarak soruşturmayı yürütüyorsun.",
    suspects: [
      { id: "s1", name: "Bakkal Necati", description: "Cafer Bey'in teslim etmediği bir koli için şikâyette bulunan mahallenin bakkalı.", icon: "store" },
      { id: "s2", name: "Liman İşçisi Tahsin", description: "Cafer Bey'in kaybolduğunu söylediği önemli bir belgeyi bekleyen liman işçisi.", icon: "engineering" },
      { id: "s3", name: "Ev Hanımı Hatice Teyze", description: "Cafer Bey'in yıllardır mektuplarını geç dağıttığını şikâyet eden kalabalık ailenin annesi.", icon: "elderly-woman" },
    ],
    weapons: [
      { id: "w1", name: "Çakı", description: "Küçük, tek taraflı keskin katlanır çakı.", icon: "content-cut" },
      { id: "w2", name: "Kanca", description: "Liman işçilerinin kullandığı demir yük kancası.", icon: "anchor" },
      { id: "w3", name: "Cam Parçası", description: "Sokaktaki kırık şişe camından elde edilmiş keskin parça.", icon: "broken-image" },
    ],
    locations: [
      { id: "l1", name: "Arka Sokak", description: "Bakkalın hemen arkasındaki dar ve issiz sokak.", icon: "place" },
      { id: "l2", name: "Liman Rıhtımı", description: "Gemilerin yanaştığı açık rıhtım alanı.", icon: "directions-boat" },
      { id: "l3", name: "Posta Deposu", description: "Mektupların sınıflandırıldığı küçük depo binası.", icon: "local-post-office" },
    ],
    clues: [
      { id: "c1", text: "Cafer Bey bakkalın arkasındaki dar sokakta, çantası açık ve bir kısım mektup dağılmış hâlde bulundu. Kan izi yalnızca o sokakta; olay burada gerçekleşmiş.", type: "evidence", isBonus: false },
      { id: "c2", text: "Yara izi ince, düzgün ve tek hamleli; ucu sivri ama geniş olmayan bir kesici ile yapılmış. Geniş kancayla ya da düzensiz cam kenarıyla bu kadar temiz bir iz bırakmak mümkün değil.", type: "forensic", isBonus: false },
      { id: "c3", text: "Komşu, Hatice Teyze'nin o saatlerde evin balkonundan ipe çamaşır astığını gördüğünü söylüyor. Balkon sokağa bakıyor; Hatice Teyze aşağıdaki olayı duyuyor olurdu, ama oraya inemezdi o sürede.", type: "witness", isBonus: false },
      { id: "c4", text: "Liman İşçisi Tahsin, o saatte rıhtımda gemi yüklemekte olduğunu söylüyor. Ancak gemi kaptanının tutanağına göre yükleme ekibi o gün üç saat erken tamamladı; Tahsin serbest bırakılmıştı.", type: "witness", isBonus: false },
      { id: "c5", text: "Cafer Bey'in çantasından eksik mektuplar arasında Tahsin'in iş akdi belgesi de var. Tahsin'in evinde yapılan aramada zarf bulundu; üzerinde kan izi, içindeki belge ise boydan boya yırtılmış.", type: "indirect", isBonus: true },
      { id: "c6", text: "Tahsin'in kemerindeki çakı kılıfı boş; kılıfın içi henüz kurumamış kan izleriyle kaplı. Tahsin bıçağın düştüğünü öne sürse de arka sokak dahil çevre tarandığında bıçak bulunamadı.", type: "direct", isBonus: true },
    ],
    solvabilityMeta: {
      freeEliminations: ["l2","l3","w2","w3","s3"],
      bonusEliminations: ["s1"],
    },
    solution: { suspectId: "s2", weaponId: "w1", locationId: "l1" },
  },
  {
    id: "p039",
    title: "Zeytinyağı Fabrikasında Kâbus",
    difficulty: "baskomiser",
    dayIndex: 39,
    story:
      "Ayvalık'ın en büyük zeytinyağı fabrikasının sahibi Rıfat Ağa, fabrika içinde preslerin arasında ezilmiş hâlde bulundu. Ama adli inceleme ölümün pres kazasından değil, öncesinde verilen zehirli bir içecekten kaynaklandığını ortaya koydu. Üç kişi o gün fabrikada çalışıyordu. Dedektif olarak sana verilen dosya çelişkilerle dolu; tanıklar birbirini suçluyor.",
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
      { id: "c1", text: "Rıfat Ağa presler arasında bulundu; ancak adli hekim kanında yüksek doz sedatif tespit etti. Ağa önce ilaçlanıp baygınken presler arasına bırakılmış. Ölüm pres odasında gerçekleşti.", type: "forensic", isBonus: false },
      { id: "c2", text: "Fabrika kapı görevlisi, Satış Temsilcisi Orhan Bey'in ziyaretçi kartı ile geldiğini ve yalnızca ofis katına erişim izni olduğunu söylüyor. Pres odasına giriş ziyaretçilere kapalı; kayıtlar Orhan'ın pres odası turnike kapısını geçmediğini doğruluyor.", type: "witness", isBonus: false },
      { id: "c3", text: "Rıfat Ağa'nın yanında bulunan çay bardağı standart fabrika bardağı değil; ofis mutfağında kullanılan ince belli özel bardak. Bu bardakları yalnızca ofis çalışanları kullanıyor; Ustabaşı Cevdet ofis mutfağına giremez.", type: "indirect", isBonus: false },
      { id: "c4", text: "Muhasebeci Şükran, öğleden sonra boyunca ofisten çıkmadığını söylüyor. Ancak fabrika içi telefon kayıtları, pres odasındaki dahili telefonu öğleden sonra saat 14:10'da birinin kullandığını gösteriyor; o saatte pres odasında yalnızca Rıfat Ağa ve Cevdet olması gerekiyordu.", type: "witness", isBonus: false },
      { id: "c5", text: "Ofis masasının alt çekmecesinde reçetesiz uyku ilacı kutusu bulundu; kutunun içindeki miktarla bardaktaki sedatif dozu örtüşüyor. Çekmece Şükran'ın masasına ait; üzerinde parmak izi var.", type: "evidence", isBonus: true },
      { id: "c6", text: "Şükran'ın muhasebe defterinde Rıfat Ağa'nın aleyhine olan kayıtlar özenle silinmiş; silinti taze. Şükran bu kayıtları gün içinde imha etmeye çalıştığında Rıfat Ağa onu suçüstü yakalamış ve işten çıkaracağını söylemiş; komşu iş arkadaşı bu tartışmayı duymuş.", type: "direct", isBonus: true },
    ],
    solvabilityMeta: {
      freeEliminations: ["l2","l3","w2","w3","s3","s1"],
      bonusEliminations: [],
    },
    solution: { suspectId: "s2", weaponId: "w1", locationId: "l1" },
  },
  {
    id: "p040",
    title: "Dağ Yolunda Pusu",
    difficulty: "baskomiser",
    dayIndex: 40,
    story:
      "Trabzon ile Rize arasındaki dağ yolundan geçen minibüs bir barikata takıldı; şoför Ahmet Bey yol kenarında bıçaklanmış bulundu. Minibüste yalnızca üç yolcu vardı; diğerleri önceki durakta inmişti. Yol üç saat boyunca kapandı ve hiç araç geçmedi. Katil bu üç kişiden biri. Sen jandarma komutanı olarak timinizle olay yerine ulaştın.",
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
      { id: "c1", text: "Ahmet Bey minibüsün birkaç metre ilerisinde, taş duvarın dibinde bulundu. Kan izi yalnızca yol kenarında; sürükleme izi yok, cinayet burada gerçekleşmiş.", type: "evidence", isBonus: false },
      { id: "c2", text: "Yara geniş, derin ve tek hamleli; sivri taşla bu kadar temiz ve derin bir kesik olmaz. Levye künt olduğundan kesici iz bırakmaz. Yara uzun ve geniş bir bıçakla uyumlu.", type: "forensic", isBonus: false },
      { id: "c3", text: "Jandarma eri, Ahmet Bey'in oldukça iri yapılı ve sağlıklı bir adam olduğunu belirtiyor. Öğretmen adayı Levent'in bu adamı tek hamlede devirmesi için gereken fiziksel güce sahip olmadığı aşikâr.", type: "witness", isBonus: false },
      { id: "c4", text: "Safiye Hanım minibüsten hiç inmediğini söylüyor. Levent de bunu doğruluyor; Safiye Hanım büyük çantaları nedeniyle dar kapıdan çabuk çıkamazdı ve pencereden görünür olurdu. Ahmet Bey dışarı çıktığında yalnızca bir kişi peşinden indi.", type: "witness", isBonus: false },
      { id: "c5", text: "Orman İşçisi Bayram'ın büyük çantasındaki orman bıçağı kılıfı ıslak ve kılıfın iç derisi taze kan kokusuyor. Bayram bıçağı sabah kullandıktan sonra temizlediğini söylüyor; ama kılıf içi hâlâ ıslak.", type: "indirect", isBonus: true },
      { id: "c6", text: "Levent'in ifadesinde Bayram'ın yolculuk başında Ahmet Bey'e 'parayı geri vermezsen pişman olursun' dediğini duyduğu ortaya çıktı. Ahmet Bey'in cebindeki para bölmesi boş; yolcu listesinde Bayram adına kayıtlı ödeme tutarı eksik.", type: "direct", isBonus: true },
    ],
    solvabilityMeta: {
      freeEliminations: ["l2","l3","w2","w3","s2","s1"],
      bonusEliminations: [],
    },
    solution: { suspectId: "s3", weaponId: "w1", locationId: "l1" },
  },
  {
    id: "p041",
    title: "Ramazan Gecesi Cinayeti",
    difficulty: "baskomiser",
    dayIndex: 41,
    story:
      "Konya'nın tarihi çarşısına yakın bir hanın sahibi Lütfi Bey, Ramazan gecesi sahur sonrasında odası önündeki koridorda bıçaklanmış bulundu. Handa yalnızca üç misafir gecelemekteydi. Kandil ışıkları hâlâ yanıyor, müezzin sesi uzaktan geliyor. Sen emniyet müdürünün özel atadığı baş komiser olarak sabah erkenden olaydayken izler henüz taze.",
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
      { id: "c1", text: "Lütfi Bey odasının tam önünde, koridor zeminine yüz üstü devrilmiş hâlde bulundu. Kan yalnızca koridorda; cesedin buraya taşınmadığı belli. Cinayet koridorda yaşandı.", type: "evidence", isBonus: false },
      { id: "c2", text: "İki yara izi var; her ikisi de ince, uzun ve her iki kenarı keskin bir bıçakla uyumlu. Künt pirinç direk ya da halat bu kesik izleri bırakamazdı.", type: "forensic", isBonus: false },
      { id: "c3", text: "Han bekçisi sahur sonrası avluyu iki kez dolaştı; her seferinde kimseyi görmedi. Avluya açılan koridordan ışık sızmadığını belirtiyor; yani koridor kapısı kapalıydı ve olay içeride yaşandı.", type: "witness", isBonus: false },
      { id: "c4", text: "Adnan, sahur sonrası koridorda Hacı Rüstem'in odasından tespih sesini sürekli duyduğunu söylüyor. Sabah ezanı bitene kadar oda kapısı açılmadı; gürültülü tespih bırakmayan biri o sürede koridora çıkamazdı.", type: "witness", isBonus: false },
      { id: "c5", text: "Zümrüt Hanım başlangıçta koridora çıkmadığını söyledi. Ama Adnan, sahurda masada Zümrüt Hanım'ın elinde küçük bir bıçak olduğunu hatırladığını belirtti; sofra bıçağından farklı, süslüydü. Zümrüt bunu inkâr edemedi.", type: "indirect", isBonus: true },
      { id: "c6", text: "Zümrüt Hanım'ın odasında yastığın altına sarılı bezde Şam bıçağı bulundu; üzerinde kan var, taze temizlenmiş ama bez kanlı. Zümrüt o gece Lütfi Bey'in odasına geldiğini ve kendisine yönelik tacizi durdurmak zorunda kaldığını kabul etti.", type: "direct", isBonus: true },
    ],
    solvabilityMeta: {
      freeEliminations: ["l2","l3","w2","w3","s1"],
      bonusEliminations: ["s2"],
    },
    solution: { suspectId: "s3", weaponId: "w1", locationId: "l1" },
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
