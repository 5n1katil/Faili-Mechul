export type GridMark = "none" | "check" | "cross";

export interface Suspect {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface Weapon {
  id: string;
  name: string;
  icon: string;
}

export interface Location {
  id: string;
  name: string;
  icon: string;
}

export interface Clue {
  id: string;
  text: string;
  type: "direct" | "indirect" | "elimination";
}

export interface Solution {
  suspectId: string;
  weaponId: string;
  locationId: string;
}

export type Difficulty = "caylik" | "dedektif" | "baskomiser";

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
}

export const PUZZLES: Puzzle[] = [
  {
    id: "p001",
    title: "Konakta Gece Yarısı Cinayeti",
    difficulty: "caylik",
    dayIndex: 1,
    story:
      "Tarihi bir konakta şık bir yemek daveti vardı. Sabah erkenden ev sahibinin yardımcısı, kütüphanede cesedi buldu. Katil gecenin karanlığında kaybolmuştu.",
    suspects: [
      { id: "s1", name: "Nazik Hanım", description: "Ev sahibinin eski dostu", icon: "person" },
      { id: "s2", name: "Rıfat Bey", description: "Avukat ve iş ortağı", icon: "briefcase" },
      { id: "s3", name: "Zeynep Hanim", description: "Genç yeğen", icon: "star" },
    ],
    weapons: [
      { id: "w1", name: "Bıçak", icon: "cut" },
      { id: "w2", name: "Zehir", icon: "local-pharmacy" },
      { id: "w3", name: "Tabanca", icon: "gps-not-fixed" },
    ],
    locations: [
      { id: "l1", name: "Kütüphane", icon: "menu-book" },
      { id: "l2", name: "Mutfak", icon: "restaurant" },
      { id: "l3", name: "Bahçe", icon: "park" },
    ],
    clues: [
      {
        id: "c1",
        text: "Suikast kütüphanede gerçekleşmedi. Kurban, orada sadece bulundu.",
        type: "elimination",
      },
      {
        id: "c2",
        text: "Nazik Hanım, gece boyunca yemek odasında misafirlerle birlikte olduğunu kanıtlayabildi.",
        type: "elimination",
      },
      {
        id: "c3",
        text: "Rıfat Bey, çok güçlü bir koku olan zehire erişimi olmadığını söyledi ve bu doğrulandı.",
        type: "elimination",
      },
      {
        id: "c4",
        text: "Katil, bahçede birileri tarafından görüldü. Zeynep Hanım gece yarısı dışarı çıkmamıştı.",
        type: "elimination",
      },
      {
        id: "c5",
        text: "Tabanca sesi kimse tarafından duyulmadı. Silah sessiz bir aletti.",
        type: "elimination",
      },
    ],
    solution: { suspectId: "s2", weaponId: "w1", locationId: "l2" },
  },
  {
    id: "p002",
    title: "Boğaz'da Kayıp Elmas",
    difficulty: "caylik",
    dayIndex: 2,
    story:
      "İstanbul Boğazı'nda lüks bir yatta gece partisi yapılırken, efsanevi 'Boğaz Elması' çalındı ve güvenlik görevlisi hayatını kaybetti.",
    suspects: [
      { id: "s1", name: "Levent Kaptan", description: "Yat kaptanı, 20 yıllık denizci", icon: "sailing" },
      { id: "s2", name: "Dilek Hanım", description: "Mücevher koleksiyoncusu", icon: "diamond" },
      { id: "s3", name: "Murat Aydın", description: "Sigorta şirketi temsilcisi", icon: "business" },
    ],
    weapons: [
      { id: "w1", name: "Demir Çubuk", icon: "hardware" },
      { id: "w2", name: "İp", icon: "trip-origin" },
      { id: "w3", name: "Gaz Maskesi", icon: "air" },
    ],
    locations: [
      { id: "l1", name: "Güverte", icon: "waves" },
      { id: "l2", name: "Makine Dairesi", icon: "settings" },
      { id: "l3", name: "VIP Salon", icon: "star" },
    ],
    clues: [
      {
        id: "c1",
        text: "Güvenlik görevlisi VIP salonda değil, kapalı bir alanda son nefesini vermişti.",
        type: "elimination",
      },
      {
        id: "c2",
        text: "Levent Kaptan, olay anında köprüde olduğunu üç tanık doğruladı.",
        type: "elimination",
      },
      {
        id: "c3",
        text: "Murat Aydın'ın elleri temizdi, fiziksel güç gerektiren bir silah kullanmamıştı.",
        type: "elimination",
      },
      {
        id: "c4",
        text: "Güverte o gece ıslaktı ve tekne boyunca ayak izleri vardı - ama kayıp kişiye aitti.",
        type: "elimination",
      },
      {
        id: "c5",
        text: "Dilek Hanım, mücevher kasasının yerini biliyordu ve makine dairesine girişi vardı.",
        type: "direct",
      },
    ],
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
      { id: "s1", name: "Ahmet Usta", description: "Komşu bakırcı, 30 yıllık esnaf", icon: "storefront" },
      { id: "s2", name: "Selma Teyze", description: "Çarşının muhasebecisi", icon: "calculate" },
      { id: "s3", name: "Kerem Genç", description: "Stajyer, son ay işe başladı", icon: "school" },
    ],
    weapons: [
      { id: "w1", name: "Ağır Terazi", icon: "balance" },
      { id: "w2", name: "Kimyasal Madde", icon: "science" },
      { id: "w3", name: "Pençe Anahtar", icon: "build" },
    ],
    locations: [
      { id: "l1", name: "Dükkan İçi", icon: "store" },
      { id: "l2", name: "Arka Depo", icon: "inventory" },
      { id: "l3", name: "Çarşı Koridoru", icon: "directions-walk" },
    ],
    clues: [
      {
        id: "c1",
        text: "Olay çarşı koridorunda değil, kapalı bir mekanda gerçekleşti.",
        type: "elimination",
      },
      {
        id: "c2",
        text: "Selma Teyze, o saatlerde kasayı kapatırken güvenlik kamerasına yakalandı.",
        type: "elimination",
      },
      {
        id: "c3",
        text: "Kimyasal madde kullanılmış olsaydı, dumandan alarm devreye girerdi.",
        type: "elimination",
      },
      {
        id: "c4",
        text: "Kerem Genç, deponun kilit sistemini çok iyi biliyordu - onu bizzat kurmuştu.",
        type: "direct",
      },
      {
        id: "c5",
        text: "Kırık kilidi incelendiğinde, pençe anahtar izi bulundu.",
        type: "direct",
      },
    ],
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
      { id: "s1", name: "Prof. Kahraman", description: "Rekabetçi akademisyen", icon: "school" },
      { id: "s2", name: "Asistan Elif", description: "Doktora öğrencisi", icon: "person" },
      { id: "s3", name: "Güvenlik Görevlisi", description: "Gece vardiyası çalışanı", icon: "security" },
    ],
    weapons: [
      { id: "w1", name: "Elektrik Çarpması", icon: "flash-on" },
      { id: "w2", name: "Kimyasal Gaz", icon: "cloud" },
      { id: "w3", name: "Keskin Nesne", icon: "cut" },
    ],
    locations: [
      { id: "l1", name: "Laboratuvar", icon: "science" },
      { id: "l2", name: "Ofis", icon: "business" },
      { id: "l3", name: "Koridorlar", icon: "directions-walk" },
    ],
    clues: [
      {
        id: "c1",
        text: "Vücut ofiste bulundu, ancak orada hayatını kaybetmedi.",
        type: "elimination",
      },
      {
        id: "c2",
        text: "Güvenlik görevlisi gece boyunca güvenlik odasında oturmuş, kameralar bunu gösteriyordu.",
        type: "elimination",
      },
      {
        id: "c3",
        text: "Kimyasal gaz sızıntısı tespit edilebilir olurdu - sensörler tetiklenmedi.",
        type: "elimination",
      },
      {
        id: "c4",
        text: "Elif laboratuvar anahtarına sahipti ve gece geç saate kadar çalışıyordu.",
        type: "direct",
      },
    ],
    solution: { suspectId: "s2", weaponId: "w1", locationId: "l1" },
  },
  {
    id: "p005",
    title: "Pazar Yerinde Şüpheli Ölüm",
    difficulty: "caylik",
    dayIndex: 5,
    story:
      "Pazar sabahı, kalabalık İstanbul pazarında tatlı satıcısı baygın bulundu ve sonradan hayatını kaybetti. Herkes birbirini şüpheyle süzüyordu.",
    suspects: [
      { id: "s1", name: "Komşu Satıcı", description: "Zeytinli bölümde çalışıyor", icon: "storefront" },
      { id: "s2", name: "Müşteri Hanım", description: "Her sabah pazar alışverişi yapıyor", icon: "shopping-bag" },
      { id: "s3", name: "Tedarikçi", description: "Malları sabah erkenden teslim etti", icon: "local-shipping" },
    ],
    weapons: [
      { id: "w1", name: "Zehirli Baklava", icon: "cake" },
      { id: "w2", name: "Darbe", icon: "pan-tool" },
      { id: "w3", name: "Boğulma", icon: "water" },
    ],
    locations: [
      { id: "l1", name: "Tatlı Tezgahı", icon: "store" },
      { id: "l2", name: "Ara Sokak", icon: "map" },
      { id: "l3", name: "Park Alanı", icon: "local-parking" },
    ],
    clues: [
      {
        id: "c1",
        text: "Olay tezgahın hemen başında gerçekleşti, uzak bir yerde değil.",
        type: "direct",
      },
      {
        id: "c2",
        text: "Müşteri Hanım o sabah hiç tatı almadı - diyet yapıyordu.",
        type: "elimination",
      },
      {
        id: "c3",
        text: "Tedarikçi malları bırakıp hemen ayrıldı, bölgede değildi.",
        type: "elimination",
      },
      {
        id: "c4",
        text: "Adli tıp raporu: kurban yediği yiyecekten zehirlendi.",
        type: "direct",
      },
    ],
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
      { id: "s1", name: "Küratör Bey", description: "15 yıldır müzede çalışıyor", icon: "museum" },
      { id: "s2", name: "Restoratör Hanım", description: "Eserleri onarıyor", icon: "brush" },
      { id: "s3", name: "Ziyaretçi Rehber", description: "Müzede turlar düzenliyor", icon: "tour" },
    ],
    weapons: [
      { id: "w1", name: "Uyutucu İğne", icon: "vaccines" },
      { id: "w2", name: "Sergi Kaidesi", icon: "construction" },
      { id: "w3", name: "Kimyasal Sprey", icon: "air" },
    ],
    locations: [
      { id: "l1", name: "Sergi Salonu", icon: "art-track" },
      { id: "l2", name: "Depolama Odası", icon: "storage" },
      { id: "l3", name: "Güvenlik Odası", icon: "security" },
    ],
    clues: [
      {
        id: "c1",
        text: "Bekçi güvenlik odasında değil, depolama odasında bulundu.",
        type: "elimination",
      },
      {
        id: "c2",
        text: "Rehber, turla birlikte sergi salonundaydı - 20 tanık var.",
        type: "elimination",
      },
      {
        id: "c3",
        text: "Kimyasal sprey kullanılmış olsaydı, güvenlik kameraları hareketi tespit ederdi.",
        type: "elimination",
      },
      {
        id: "c4",
        text: "Restoratör Hanım depolama odasına erişim kodunu biliyordu.",
        type: "direct",
      },
    ],
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
      { id: "s1", name: "Emekli Albay", description: "Vilayla komşu", icon: "military-tech" },
      { id: "s2", name: "Ressam Leyla", description: "Yaz boyunca adada yaşıyor", icon: "palette" },
      { id: "s3", name: "Genç Yatçı", description: "Özel teknesiyle yeni geldi", icon: "sailing" },
      { id: "s4", name: "Aşçı Mehmet", description: "Villa aşçısı", icon: "restaurant" },
    ],
    weapons: [
      { id: "w1", name: "Av Tüfeği", icon: "sports" },
      { id: "w2", name: "Zehir", icon: "science" },
      { id: "w3", name: "Bıçak", icon: "cut" },
      { id: "w4", name: "Boğma", icon: "pan-tool" },
    ],
    locations: [
      { id: "l1", name: "Villa Bahçesi", icon: "park" },
      { id: "l2", name: "Sahil Şeridi", icon: "waves" },
      { id: "l3", name: "Kayalık", icon: "terrain" },
      { id: "l4", name: "Villa İçi", icon: "home" },
    ],
    clues: [
      {
        id: "c1",
        text: "Kurban villa içinde değil, açık havada bulundu.",
        type: "elimination",
      },
      {
        id: "c2",
        text: "Emekli Albay, olay saatinde sabah sporu yapıyordu - komşular gördü.",
        type: "elimination",
      },
      {
        id: "c3",
        text: "Ressam Leyla, kayalıkların üzerinde hiç çalışmamıştı.",
        type: "elimination",
      },
      {
        id: "c4",
        text: "Aşçı Mehmet, mutfaktan çıkmadı - yemek hazırlıyordu.",
        type: "elimination",
      },
      {
        id: "c5",
        text: "Kurbanın boynunda parmak izi izleri vardı.",
        type: "direct",
      },
      {
        id: "c6",
        text: "Genç Yatçı, sahil şeridinde yürüyüş yapıyordu - tanıklar var.",
        type: "elimination",
      },
    ],
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
      { id: "s1", name: "İş Kadını", description: "Birinci mevki yolcusu", icon: "business" },
      { id: "s2", name: "Üniversite Öğrencisi", description: "Ucuz bilet almıştı", icon: "school" },
      { id: "s3", name: "Emekli Doktor", description: "Kaplıcaya gidiyordu", icon: "medical-services" },
    ],
    weapons: [
      { id: "w1", name: "Zehirli İçecek", icon: "local-bar" },
      { id: "w2", name: "Kesici Silah", icon: "cut" },
      { id: "w3", name: "Boğma Halatı", icon: "trip-origin" },
    ],
    locations: [
      { id: "l1", name: "Kompartıman", icon: "train" },
      { id: "l2", name: "Yemekli Vagon", icon: "restaurant" },
      { id: "l3", name: "Tuvalet", icon: "wc" },
    ],
    clues: [
      {
        id: "c1",
        text: "Kurban tuvalette değil, oturma alanında bulundu.",
        type: "elimination",
      },
      {
        id: "c2",
        text: "Öğrenci bütün yolculuk boyunca koridorda müzik dinledi - diğer yolcular gördü.",
        type: "elimination",
      },
      {
        id: "c3",
        text: "Boğma halatı o kadar kısa trende saklanamaz - bir tanık görürdü.",
        type: "elimination",
      },
      {
        id: "c4",
        text: "Emekli Doktor kurbanla yemekli vagonda içki içmişti.",
        type: "direct",
      },
    ],
    solution: { suspectId: "s3", weaponId: "w1", locationId: "l2" },
  },
  {
    id: "p009",
    title: "Tarihi Hamamda Cinayet",
    difficulty: "caylik",
    dayIndex: 9,
    story:
      "Sultanahmet'teki tarihi bir hamamda, tanınmış bir iş insanı masaj sırasında hayatını kaybetti. Hamam personeli şokta.",
    suspects: [
      { id: "s1", name: "Kese Ustası", description: "20 yıllık deneyim", icon: "person" },
      { id: "s2", name: "Yönetici", description: "Hamamı yeni satın almıştı", icon: "manage-accounts" },
      { id: "s3", name: "Kasiyer", description: "Genç çalışan", icon: "point-of-sale" },
    ],
    weapons: [
      { id: "w1", name: "Zehirli Sabun", icon: "soap" },
      { id: "w2", name: "Boğma", icon: "pan-tool" },
      { id: "w3", name: "Uyku İlacı", icon: "medication" },
    ],
    locations: [
      { id: "l1", name: "Masaj Odası", icon: "spa" },
      { id: "l2", name: "Soğukluk", icon: "ac-unit" },
      { id: "l3", name: "Kasa", icon: "point-of-sale" },
    ],
    clues: [
      {
        id: "c1",
        text: "Kurban masaj odasında bulundu ve orada hayatını kaybetti.",
        type: "direct",
      },
      {
        id: "c2",
        text: "Kasiyer, o sırada dışarıda bekleme listesiyle meşguldü.",
        type: "elimination",
      },
      {
        id: "c3",
        text: "Zehirli sabun hipotezi reddedildi - kimyasal iz bulunamadı.",
        type: "elimination",
      },
      {
        id: "c4",
        text: "Kese ustası her an kurbanla temas halindeydi.",
        type: "direct",
      },
    ],
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
      { id: "s1", name: "Galeri Direktörü", description: "Organizasyonu yönetti", icon: "manage-accounts" },
      { id: "s2", name: "Ünlü Sanatçı", description: "Gala konuğu", icon: "palette" },
      { id: "s3", name: "Güvenlik Şefi", description: "Müze güvenliğinden sorumlu", icon: "security" },
      { id: "s4", name: "Nakliyeci", description: "Eserleri taşıdı", icon: "local-shipping" },
    ],
    weapons: [
      { id: "w1", name: "Elektrik Sopası", icon: "flash-on" },
      { id: "w2", name: "Kimyasal Sprey", icon: "air" },
      { id: "w3", name: "Demir Çubuk", icon: "hardware" },
      { id: "w4", name: "Uyutucu", icon: "vaccines" },
    ],
    locations: [
      { id: "l1", name: "Sergi Salonu", icon: "museum" },
      { id: "l2", name: "Güvenlik Merkezi", icon: "security" },
      { id: "l3", name: "Depo", icon: "inventory" },
      { id: "l4", name: "Çıkış Noktası", icon: "exit-to-app" },
    ],
    clues: [
      {
        id: "c1",
        text: "Saldırı sergi salonunda değil, arka bölümlerde gerçekleşti.",
        type: "elimination",
      },
      {
        id: "c2",
        text: "Nakliyeci, gala başlamadan malları teslim edip ayrılmıştı.",
        type: "elimination",
      },
      {
        id: "c3",
        text: "Kimyasal sprey kullanılmış olsaydı, gala misafirleri de etkilenirdi.",
        type: "elimination",
      },
      {
        id: "c4",
        text: "Güvenlik Şefi güvenlik merkezinde tek başınaydı - birisinin içeriden yardım etmesi gerekiyor.",
        type: "direct",
      },
      {
        id: "c5",
        text: "Galeri Direktörü, her misafirle fotoğraf çektiriyordu - alibi var.",
        type: "elimination",
      },
      {
        id: "c6",
        text: "Ünlü Sanatçı güvenlik merkezine geçiş izni istemişti.",
        type: "direct",
      },
    ],
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
      { id: "s1", name: "Muhalefet Adayı", description: "Seçimlerde rakip", icon: "how-to-vote" },
      { id: "s2", name: "Sekreter Bayan", description: "Yıllardır yanında çalışıyor", icon: "person" },
      { id: "s3", name: "İnşaat Müteahhit", description: "Belediyeyle anlaşmazlık yaşıyor", icon: "construction" },
    ],
    weapons: [
      { id: "w1", name: "Ağır Kağıt Ağırlığı", icon: "square" },
      { id: "w2", name: "Zehirli Kahve", icon: "coffee" },
      { id: "w3", name: "Elektrik Çarpması", icon: "flash-on" },
    ],
    locations: [
      { id: "l1", name: "Belediye Ofisi", icon: "business" },
      { id: "l2", name: "Toplantı Odası", icon: "groups" },
      { id: "l3", name: "Koridor", icon: "directions-walk" },
    ],
    clues: [
      {
        id: "c1",
        text: "Cinayet koridorda değil, kapalı bir odada gerçekleşti.",
        type: "elimination",
      },
      {
        id: "c2",
        text: "Muhalefet adayı, seçim kampanyası toplantısındaydı - 50 kişi bunu doğrular.",
        type: "elimination",
      },
      {
        id: "c3",
        text: "Elektrik altyapısı o gün arızalıydı - elektrik kullanılamazdı.",
        type: "elimination",
      },
      {
        id: "c4",
        text: "Sekreter Bayan her sabah belediye başkanına kahve getirirdi.",
        type: "direct",
      },
    ],
    solution: { suspectId: "s2", weaponId: "w2", locationId: "l1" },
  },
  {
    id: "p012",
    title: "Folklor Festivalinde Ölüm",
    difficulty: "caylik",
    dayIndex: 12,
    story:
      "Ankara'daki yıllık folklar festivalinde, organizasyonun baş koordinatörü sahnede aniden yere yığıldı.",
    suspects: [
      { id: "s1", name: "Rakip Sanatçı", description: "Aynı gruba üye olmak istiyordu", icon: "music-note" },
      { id: "s2", name: "Ses Teknikeri", description: "Sahne arkasında çalışıyor", icon: "headphones" },
      { id: "s3", name: "Sponsorların Temsilcisi", description: "Bütçe tartışması yaşanmıştı", icon: "monetization-on" },
    ],
    weapons: [
      { id: "w1", name: "Zehirli Su", icon: "water-drop" },
      { id: "w2", name: "Elektrik Darbesi", icon: "flash-on" },
      { id: "w3", name: "Gizli Enjeksiyon", icon: "vaccines" },
    ],
    locations: [
      { id: "l1", name: "Sahne", icon: "theater-comedy" },
      { id: "l2", name: "Soyunma Odası", icon: "room" },
      { id: "l3", name: "Kontrol Odası", icon: "settings" },
    ],
    clues: [
      {
        id: "c1",
        text: "Kurban soyunma odasına girerken son görüldü - sonraki an sahneye çıktı.",
        type: "elimination",
      },
      {
        id: "c2",
        text: "Rakip sanatçı, soyunma odasına girişi yoktu.",
        type: "elimination",
      },
      {
        id: "c3",
        text: "Zehirli su ya da enjeksiyon iz bırakır - adli tıp doğruladı.",
        type: "elimination",
      },
      {
        id: "c4",
        text: "Ses teknikeri sahne elektriğini kontrol ediyordu - mikrofon kasıtlı olarak modifiye edilmişti.",
        type: "direct",
      },
    ],
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
      { id: "s1", name: "Kütüphaneci", description: "30 yıllık emektarı", icon: "menu-book" },
      { id: "s2", name: "Doktora Öğrencisi", description: "El yazmalarını araştırıyordu", icon: "person" },
      { id: "s3", name: "Temizlik Görevlisi", description: "Gece 02.00'de çalışıyor", icon: "cleaning-services" },
    ],
    weapons: [
      { id: "w1", name: "Ağır Kitap", icon: "menu-book" },
      { id: "w2", name: "Kimyasal Madde", icon: "science" },
      { id: "w3", name: "Baskı Aleti", icon: "print" },
    ],
    locations: [
      { id: "l1", name: "Okuma Salonu", icon: "library-books" },
      { id: "l2", name: "El Yazmaları Bölümü", icon: "history-edu" },
      { id: "l3", name: "Katalog Odası", icon: "folder" },
    ],
    clues: [
      {
        id: "c1",
        text: "Suç el yazmaları bölümünde işlendi - orada iz bırakıldı.",
        type: "direct",
      },
      {
        id: "c2",
        text: "Temizlik görevlisi 02.00-04.00 arasında katlarda dolaşıyordu - kameralar kayıt aldı.",
        type: "elimination",
      },
      {
        id: "c3",
        text: "Kütüphaneci, el yazmalarını yıllardır çalışmak istiyordu ama erişim izni yoktu.",
        type: "elimination",
      },
      {
        id: "c4",
        text: "Doktora öğrencisi el yazmaları bölümünde tek izinli kişiydi.",
        type: "direct",
      },
    ],
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
      { id: "s1", name: "Yerli Balıkçı", description: "Otelin açılmasına karşıydı", icon: "sailing" },
      { id: "s2", name: "Tur Rehberi", description: "Konukseverlik sektörü rakibi", icon: "tour" },
      { id: "s3", name: "Mülk Sahibi", description: "Arazi anlaşmazlığı var", icon: "home" },
      { id: "s4", name: "Aşçı", description: "Kovulma korkusu yaşıyordu", icon: "restaurant" },
    ],
    weapons: [
      { id: "w1", name: "Balıkçı Bıçağı", icon: "cut" },
      { id: "w2", name: "Kayalık", icon: "terrain" },
      { id: "w3", name: "Zehirli İçki", icon: "local-bar" },
      { id: "w4", name: "İp", icon: "trip-origin" },
    ],
    locations: [
      { id: "l1", name: "Sahil Kenarı", icon: "waves" },
      { id: "l2", name: "Otel Mutfağı", icon: "restaurant" },
      { id: "l3", name: "Kayalık Burun", icon: "terrain" },
      { id: "l4", name: "Otel Lobisi", icon: "hotel" },
    ],
    clues: [
      {
        id: "c1",
        text: "Kurban mutfakta ya da lobide değil, dışarıda bulundu.",
        type: "elimination",
      },
      {
        id: "c2",
        text: "Aşçı otel sahibiyle mesai yapmıştı - lobi kamerasına yansıdı.",
        type: "elimination",
      },
      {
        id: "c3",
        text: "Tur Rehberi geceyi kasabada değil, şehirde geçirmişti.",
        type: "elimination",
      },
      {
        id: "c4",
        text: "Zehirli içki izleri bulunamadı - kurban çarpma sonucu yaralanmış.",
        type: "elimination",
      },
      {
        id: "c5",
        text: "Kayalık burnda kan izleri bulundu ve mülk sahibinin ayak izleri eşleşti.",
        type: "direct",
      },
    ],
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
      { id: "s2", name: "Muhasebe Müdürü", description: "Mali anlaşmazlık vardı", icon: "calculate" },
      { id: "s3", name: "Makine Mühendisi", description: "Fabrikayı tasarlamıştı", icon: "precision-manufacturing" },
    ],
    weapons: [
      { id: "w1", name: "Çekiç", icon: "hardware" },
      { id: "w2", name: "Zehirli Kimyasal", icon: "science" },
      { id: "w3", name: "Makine Parçası", icon: "settings" },
    ],
    locations: [
      { id: "l1", name: "Üretim Alanı", icon: "factory" },
      { id: "l2", name: "Müdür Odası", icon: "business" },
      { id: "l3", name: "Kontrol Odası", icon: "dashboard" },
    ],
    clues: [
      {
        id: "c1",
        text: "Müdür kontrol odasında değil, üretim alanında bulundu.",
        type: "elimination",
      },
      {
        id: "c2",
        text: "Muhasebe müdürü akşam bütçe toplantısında şehir dışındaydı.",
        type: "elimination",
      },
      {
        id: "c3",
        text: "Zehirli kimyasal fabrikada hiç kullanılmıyordu.",
        type: "elimination",
      },
      {
        id: "c4",
        text: "İşçi Başı, gece vardiyasında fabrikadaydı - erişim kaydı var.",
        type: "direct",
      },
    ],
    solution: { suspectId: "s1", weaponId: "w1", locationId: "l1" },
  },
  {
    id: "p016",
    title: "Termal Otelde Şüpheli Vaka",
    difficulty: "caylik",
    dayIndex: 16,
    story:
      "Bursa'nın ünlü kaplıcalarından birinde lüks bir thermal otelde, ünlü bir şarkıcı spa alanında ölü bulundu.",
    suspects: [
      { id: "s1", name: "Otel Müdürü", description: "Finansal baskılar altında", icon: "hotel" },
      { id: "s2", name: "Eski Hayranı", description: "Takıntılı bir hayran", icon: "person" },
      { id: "s3", name: "Rakip Şarkıcı", description: "Aynı gecede performans vardı", icon: "music-note" },
    ],
    weapons: [
      { id: "w1", name: "Su Altında Boğma", icon: "water" },
      { id: "w2", name: "Uyku Hapı", icon: "medication" },
      { id: "w3", name: "Bıçak", icon: "cut" },
    ],
    locations: [
      { id: "l1", name: "Havuz Başı", icon: "pool" },
      { id: "l2", name: "Spa Odası", icon: "spa" },
      { id: "l3", name: "Sauna", icon: "whatshot" },
    ],
    clues: [
      {
        id: "c1",
        text: "Kurban havuz başında değil, kapalı bir odada bulundu.",
        type: "elimination",
      },
      {
        id: "c2",
        text: "Rakip şarkıcı sahne performansı için şehirdeydi - binlerce tanık var.",
        type: "elimination",
      },
      {
        id: "c3",
        text: "Bıçak izi yoktu - kurban boğularak hayatını kaybetti.",
        type: "elimination",
      },
      {
        id: "c4",
        text: "Eski hayranı sauna kapısını dışarıdan kilitleyebilirdi.",
        type: "direct",
      },
    ],
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
      { id: "s1", name: "Kafe Sahibi", description: "Politika eleştirilerinden rahatsızdı", icon: "coffee" },
      { id: "s2", name: "Garson", description: "Genç ve yeni işe başlamış", icon: "room-service" },
      { id: "s3", name: "Müşteri", description: "Masanın bitişiğinde oturuyordu", icon: "person" },
    ],
    weapons: [
      { id: "w1", name: "Zehirli Çay", icon: "local-cafe" },
      { id: "w2", name: "Gizli Enjeksiyon", icon: "vaccines" },
      { id: "w3", name: "Gürültü Bombası", icon: "crisis-alert" },
    ],
    locations: [
      { id: "l1", name: "Kafe İçi", icon: "coffee" },
      { id: "l2", name: "Tuvalet", icon: "wc" },
      { id: "l3", name: "Dış Terasa", icon: "outdoor-grill" },
    ],
    clues: [
      {
        id: "c1",
        text: "Gazeteci içeride oturuyordu, terasa çıkmadı.",
        type: "elimination",
      },
      {
        id: "c2",
        text: "Müşteri o gün yeni geldi, garsonun kim olduğunu bilmiyordu.",
        type: "elimination",
      },
      {
        id: "c3",
        text: "Gürültü bombası kamuya açık yerde kaosa yol açardı - kimse bir şey duymadı.",
        type: "elimination",
      },
      {
        id: "c4",
        text: "Garson çayı bizzat hazırladı ve masaya taşıdı - tek temas noktası buydu.",
        type: "direct",
      },
    ],
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
      { id: "s1", name: "Baş Araştırmacı", description: "Kariyerini projeye adamıştı", icon: "biotech" },
      { id: "s2", name: "Veri Analisti", description: "Verilere tek erişimi olan", icon: "data-usage" },
      { id: "s3", name: "Etik Komite Üyesi", description: "Projeye itiraz etmişti", icon: "gavel" },
      { id: "s4", name: "Yazılım Mühendisi", description: "Güvenlik sistemini tasarladı", icon: "code" },
    ],
    weapons: [
      { id: "w1", name: "Zehirli İğne", icon: "vaccines" },
      { id: "w2", name: "Bilgisayar Şoku", icon: "computer" },
      { id: "w3", name: "Kimyasal Madde", icon: "science" },
      { id: "w4", name: "Boğma", icon: "pan-tool" },
    ],
    locations: [
      { id: "l1", name: "Toplantı Odası", icon: "groups" },
      { id: "l2", name: "Sunucu Odası", icon: "storage" },
      { id: "l3", name: "Araştırma Laboratuvarı", icon: "science" },
      { id: "l4", name: "Güvenli Alan", icon: "lock" },
    ],
    clues: [
      {
        id: "c1",
        text: "Kurban toplantı odasında bulundu ve orada hayatını kaybetti.",
        type: "direct",
      },
      {
        id: "c2",
        text: "Yazılım Mühendisi, sistemi güncelliyordu - sunucu odasından çıkmadı.",
        type: "elimination",
      },
      {
        id: "c3",
        text: "Kimyasal iz bulunamadı - fiziksel temas yöntemi kullanıldı.",
        type: "elimination",
      },
      {
        id: "c4",
        text: "Bilgisayar şoku için özel ekipman gerekir - toplantı odasında yoktu.",
        type: "elimination",
      },
      {
        id: "c5",
        text: "Etik Komite Üyesi toplantıya geç geldi - 30 dakika boşluk var.",
        type: "direct",
      },
      {
        id: "c6",
        text: "Baş araştırmacı, kurbanla toplantı öncesi tartıştı - tanıklar duydu.",
        type: "direct",
      },
    ],
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
      { id: "s1", name: "Protokol Şefi", description: "Daveti organize etti", icon: "event" },
      { id: "s2", name: "Özel Aşçı", description: "Yemekleri hazırladı", icon: "restaurant" },
      { id: "s3", name: "Yabancı Diplomat", description: "Elçiyle tartışma yaşandı", icon: "flag" },
      { id: "s4", name: "Saray Kütüphanecisi", description: "Davette geziniyordu", icon: "menu-book" },
    ],
    weapons: [
      { id: "w1", name: "Zehirli Şarap", icon: "wine-bar" },
      { id: "w2", name: "Zehirli Yemek", icon: "dinner-dining" },
      { id: "w3", name: "Kimyasal Madde", icon: "science" },
      { id: "w4", name: "Zehirli İçecek", icon: "local-bar" },
    ],
    locations: [
      { id: "l1", name: "Yemek Salonu", icon: "dinner-dining" },
      { id: "l2", name: "Mutfak", icon: "restaurant" },
      { id: "l3", name: "Bahçe Terası", icon: "park" },
      { id: "l4", name: "Kütüphane", icon: "library-books" },
    ],
    clues: [
      {
        id: "c1",
        text: "Elçi yemek salonunda zehirlendi - bahçeye hiç çıkmadı.",
        type: "elimination",
      },
      {
        id: "c2",
        text: "Kütüphaneci kütüphanede oturuyordu - davete katılmadı.",
        type: "elimination",
      },
      {
        id: "c3",
        text: "Yabancı Diplomat yemek yemedi - perhizdeydi.",
        type: "elimination",
      },
      {
        id: "c4",
        text: "Kimyasal madde, saray gibi kontrollü bir alanda tespit edilirdi.",
        type: "elimination",
      },
      {
        id: "c5",
        text: "Protokol Şefi yemek siparişini bizzat verdi ama teslim etmedi.",
        type: "elimination",
      },
      {
        id: "c6",
        text: "Özel Aşçı tek kişi olarak mutfakta tabakları hazırladı.",
        type: "direct",
      },
    ],
    solution: { suspectId: "s2", weaponId: "w2", locationId: "l1" },
  },
  {
    id: "p020",
    title: "Köy Düğününde Trajedi",
    difficulty: "caylik",
    dayIndex: 20,
    story:
      "Doğu Anadolu'nun şenlikli bir köyünde, düğün gecesi gelinin babası hayatını kaybetti. Müzik susmuş, şenlik kana bulanmıştı.",
    suspects: [
      { id: "s1", name: "Damat", description: "Aile anlaşmazlığı yaşanmıştı", icon: "person" },
      { id: "s2", name: "Köy Muhtarı", description: "Arazi davası vardı", icon: "home" },
      { id: "s3", name: "Düğün Fotoğrafçısı", description: "Dışarıdan gelen yabancı", icon: "camera-alt" },
    ],
    weapons: [
      { id: "w1", name: "Av Tüfeği", icon: "sports" },
      { id: "w2", name: "Bıçak", icon: "cut" },
      { id: "w3", name: "Zehir", icon: "science" },
    ],
    locations: [
      { id: "l1", name: "Düğün Çadırı", icon: "festival" },
      { id: "l2", name: "Köy Meydanı", icon: "location-city" },
      { id: "l3", name: "Ahır Arkası", icon: "agriculture" },
    ],
    clues: [
      {
        id: "c1",
        text: "Silah sesi duyuldu - tüfek kullanıldı.",
        type: "direct",
      },
      {
        id: "c2",
        text: "Fotoğrafçı, çadırın önünde fotoğraf çekiyordu - gözler üzerindeydi.",
        type: "elimination",
      },
      {
        id: "c3",
        text: "Damat düğün çadırındaydı, köy meydanında değildi.",
        type: "elimination",
      },
      {
        id: "c4",
        text: "Muhtar, arazi davasını kazanmak için elinden geleni yapardı.",
        type: "direct",
      },
    ],
    solution: { suspectId: "s2", weaponId: "w1", locationId: "l3" },
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
    case "caylik":
      return "Çaylak";
    case "dedektif":
      return "Dedektif";
    case "baskomiser":
      return "Baş Komiser";
  }
}

export function getDifficultyColor(difficulty: Difficulty): string {
  switch (difficulty) {
    case "caylik":
      return "#4CAF50";
    case "dedektif":
      return "#D4A843";
    case "baskomiser":
      return "#C8372D";
  }
}
