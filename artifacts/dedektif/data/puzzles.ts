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

export interface Clue {
  id: string;
  text: string;
  type: "direct" | "indirect" | "elimination" | "evidence" | "witness" | "forensic";
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
      { id: "s3", name: "Zeynep Hanım", description: "Genç yeğen", icon: "star" },
    ],
    weapons: [
      { id: "w1", name: "Bıçak", description: "Konak mutfağından alınan ince, uzun şef bıçağı", icon: "cut" },
      { id: "w2", name: "Zehir", description: "Renksiz, kokusuz bitkisel toksin karışımı", icon: "local-pharmacy" },
      { id: "w3", name: "Tabanca", description: "Tek mermi kalan eski model bir revolver", icon: "gps-not-fixed" },
    ],
    locations: [
      { id: "l1", name: "Kütüphane", description: "Deri ciltli kitaplarla dolu, meşe raflı tarihi oda", icon: "menu-book" },
      { id: "l2", name: "Mutfak", description: "Yemek hazırlığından hâlâ sıcak olan geniş konak mutfağı", icon: "restaurant" },
      { id: "l3", name: "Bahçe", description: "Fıskiyeli havuz ve asırlık çınarların bulunduğu loş bahçe", icon: "park" },
    ],
    clues: [
      {
        id: "c1",
        text: "Suikast konak içindeydi; kurban dışarıya çıkmamış, bahçede herhangi bir iz bulunamadı.",
        type: "evidence",
      },
      {
        id: "c2",
        text: "Nazik Hanım, gece boyunca yemek odasında misafirlerle birlikte kaldı. Düzinelerce kişi bunu doğrulayabilir.",
        type: "witness",
      },
      {
        id: "c3",
        text: "Otopsi raporu: vücutta kimyasal toksin izine rastlanmadı. Zehir kullanılmamış.",
        type: "forensic",
      },
      {
        id: "c4",
        text: "Zeynep Hanım gece boyunca odacının gözetiminde konakta kaldı; kapı kayıtları bunu doğruluyor.",
        type: "witness",
      },
      {
        id: "c5",
        text: "Gece boyunca hiç kimse silah sesi duymadı. Kullanılan alet sessizdi.",
        type: "witness",
      },
      {
        id: "c6",
        text: "Mutfak tezgahının altında kan izleri ve bıçak kını bulundu. Cinayet bu mekanda işlendi.",
        type: "evidence",
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
      { id: "w1", name: "Demir Çubuk", description: "Güverteden sökülen ağır metal çubuk", icon: "hardware" },
      { id: "w2", name: "İp", description: "Yelken bağlamak için kullanılan dayanıklı naylon ip", icon: "trip-origin" },
      { id: "w3", name: "Gaz Maskesi", description: "Soluk alma sistemini kilitleyen endüstriyel ekipman", icon: "air" },
    ],
    locations: [
      { id: "l1", name: "Güverte", description: "Boğaz rüzgarına açık, ıslak tekne güvertesi", icon: "waves" },
      { id: "l2", name: "Makine Dairesi", description: "Teknenin alt katında gürültülü, karanlık motor odası", icon: "settings" },
      { id: "l3", name: "VIP Salon", description: "Kristal aydınlatma ve kadife koltuklu özel salon", icon: "star" },
    ],
    clues: [
      {
        id: "c1",
        text: "Olay VIP salonda değil, kapalı ve ıssız bir bölgede gerçekleşti.",
        type: "elimination",
      },
      {
        id: "c2",
        text: "Levent Kaptan, olay anında köprüde olduğunu üç ayrı tanık doğruladı.",
        type: "witness",
      },
      {
        id: "c3",
        text: "Güvertedeki ıslak yüzey incelendi; tüm ayak izleri kaybolan güvenlik görevlisine ait — başka iz yok.",
        type: "evidence",
      },
      {
        id: "c4",
        text: "Adli rapor: maktul boğulmuş. Demir çubuk veya gaz maskesi kullanılmış olsaydı fiziksel iz kalırdı.",
        type: "forensic",
      },
      {
        id: "c5",
        text: "Dilek Hanım, mücevher kasasının yerini ve makine dairesine inişin kodunu biliyordu.",
        type: "direct",
      },
      {
        id: "c6",
        text: "Murat Aydın'ın o gece nerede olduğu sigorta şirketinin görevde log kayıtlarıyla doğrulandı; olay anında anakaradaydı.",
        type: "evidence",
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
      { id: "w1", name: "Ağır Terazi", description: "Kuyumcu terazisinin tunç kefesi, birkaç kilogram ağırlığında", icon: "balance" },
      { id: "w2", name: "Kimyasal Madde", description: "Altın eritme sürecinde kullanılan asit bazlı çözelti", icon: "science" },
      { id: "w3", name: "Pençe Anahtar", description: "Kilitlerde iz bırakan ağır çelik alet", icon: "build" },
    ],
    locations: [
      { id: "l1", name: "Dükkan İçi", description: "Vitrinlerin altın ışıltısıyla parlayan kuyumcu dükkânı", icon: "store" },
      { id: "l2", name: "Arka Depo", description: "Elektronik kilitli, penceresiz depolama odası", icon: "inventory" },
      { id: "l3", name: "Çarşı Koridoru", description: "Yüzlerce yıllık kıvrımlı taş koridorlar", icon: "directions-walk" },
    ],
    clues: [
      {
        id: "c1",
        text: "Olay kapalı bir mekanda gerçekleşti; çarşı koridorunda herhangi bir iz ya da tanık yok.",
        type: "elimination",
      },
      {
        id: "c2",
        text: "Güvenlik kamerası Selma Teyze'yi olay saatinde kasayı kapatırken dükkan dışında gösteriyor.",
        type: "evidence",
      },
      {
        id: "c3",
        text: "Kimyasal madde kullanılmış olsaydı, asit dumanı yangın alarmını tetiklerdi. Alarm çalmadı.",
        type: "forensic",
      },
      {
        id: "c4",
        text: "Kerem Genç, deponun elektronik kilit sistemini bizzat kurmuş ve kodu yalnızca o biliyordu.",
        type: "direct",
      },
      {
        id: "c5",
        text: "Kilit incelemesinde tipik pençe anahtar çizikleri tespit edildi; bu aletle açılmış.",
        type: "evidence",
      },
      {
        id: "c6",
        text: "Kerem Genç'in bilgisayarında depo kasası şifresini değiştirdiğine dair log bulundu; değişiklik olay gecesi yapılmıştı.",
        type: "evidence",
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
      { id: "w1", name: "Elektrik Çarpması", description: "Laboratuvar kablosunun kasıtlı olarak sabote edilmesi", icon: "flash-on" },
      { id: "w2", name: "Kimyasal Gaz", description: "Kapalı ortamda birikebilen tehlikeli kimyasal bileşik", icon: "cloud" },
      { id: "w3", name: "Keskin Nesne", description: "Laboratuvar cam bölmesinin kırık parçası", icon: "cut" },
    ],
    locations: [
      { id: "l1", name: "Laboratuvar", description: "Çeşitli deney düzeneklerinin bulunduğu araştırma laboratuvarı", icon: "science" },
      { id: "l2", name: "Ofis", description: "Yığın yığın dosya ve ekran ışığıyla dolu akademisyen ofisi", icon: "business" },
      { id: "l3", name: "Koridorlar", description: "Gece yarısı ıssız, uzun üniversite koridorları", icon: "directions-walk" },
    ],
    clues: [
      {
        id: "c1",
        text: "Vücut ofiste bulundu; ancak adli izler laboratuvara işaret ediyor. Cinayet orada gerçekleşti.",
        type: "forensic",
      },
      {
        id: "c2",
        text: "Güvenlik görevlisi gece boyunca güvenlik odasında oturmuş; kameralar bunu kayıt altına almış.",
        type: "evidence",
      },
      {
        id: "c3",
        text: "Kimyasal gaz sensörleri gece boyunca hiç tepki vermedi. Gaz sızıntısı yok.",
        type: "forensic",
      },
      {
        id: "c4",
        text: "Elif, laboratuvar anahtarına sahip tek doktora öğrencisiydi ve gece geç saate kadar çalışıyordu.",
        type: "direct",
      },
      {
        id: "c5",
        text: "Laboratuvarda sabote edilmiş bir elektrik kablosu bulundu; bu tür müdahale uzmanlık gerektirir.",
        type: "evidence",
      },
      {
        id: "c6",
        text: "Prof. Kahraman'ın o gece uçuşu vardı; bilet ve havalimanı güvenlik kaydı şehri terk ettiğini teyit ediyor.",
        type: "evidence",
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
      { id: "w1", name: "Zehirli Baklava", description: "İçine gizlice zehir karıştırılmış tatlı baklava", icon: "cake" },
      { id: "w2", name: "Darbe", description: "Elle ya da sert bir cisimle uygulanan güçlü vurma", icon: "pan-tool" },
      { id: "w3", name: "Boğulma", description: "Boyuna uygulanan iki elle güçlü baskı", icon: "water" },
    ],
    locations: [
      { id: "l1", name: "Tatlı Tezgahı", description: "Çeşit çeşit baklavanın sergilendiği pazar tezgahı", icon: "store" },
      { id: "l2", name: "Ara Sokak", description: "Pazar gürültüsünden uzak, dar ve sakin ara sokak", icon: "map" },
      { id: "l3", name: "Park Alanı", description: "Araçların park ettiği, tenha ve ıssız bir alan", icon: "local-parking" },
    ],
    clues: [
      {
        id: "c1",
        text: "Kurban tezgahının tam başında yere yığıldı; ara sokak veya park alanına geçmemişti.",
        type: "witness",
      },
      {
        id: "c2",
        text: "Müşteri Hanım o sabah hiç tatlı almadı, diyet yapıyordu. Bunu tezgah arkadaşı doğruluyor.",
        type: "witness",
      },
      {
        id: "c3",
        text: "Tedarikçi malları bırakıp hemen ayrıldı; pazar kamerasına çıkış saati kaydedilmiş.",
        type: "evidence",
      },
      {
        id: "c4",
        text: "Adli tıp raporu: vücutta baklava kökenli bitkisel toksin tespit edildi. Zehirleme kesin.",
        type: "forensic",
      },
      {
        id: "c5",
        text: "Komşu satıcı, kurbanın tezgahına ayrılmadan önce baklava tabağını tazeledi; tezgah kamerası bu temaşı kaydetti.",
        type: "direct",
      },
      {
        id: "c6",
        text: "Komşu satıcı ile kurban arasında geçen ay ciddi ticari anlaşmazlık yaşanmıştı; pazar esnafından üç kişi bunu doğruluyor.",
        type: "witness",
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
      { id: "w1", name: "Uyutucu İğne", description: "Deriye hızla etki eden anestezik enjeksiyon", icon: "vaccines" },
      { id: "w2", name: "Sergi Kaidesi", description: "Ağır mermer kaide, vitrinlerin altındaki taş destek", icon: "construction" },
      { id: "w3", name: "Kimyasal Sprey", description: "Geçici felç etkisi yaratan kimyasal karışım", icon: "air" },
    ],
    locations: [
      { id: "l1", name: "Sergi Salonu", description: "Bizans ve Osmanlı eserlerinin sergilendiği aydınlık salon", icon: "art-track" },
      { id: "l2", name: "Depolama Odası", description: "Restorasyon bekleyen eserlerin bulunduğu kilitli oda", icon: "storage" },
      { id: "l3", name: "Güvenlik Odası", description: "Kamera görüntülerinin izlendiği kontrol merkezi", icon: "security" },
    ],
    clues: [
      {
        id: "c1",
        text: "Bekçi, depolama odasında bulundu. Orada dövüşe ilişkin izler vardı.",
        type: "evidence",
      },
      {
        id: "c2",
        text: "Rehber, tur grubuyla birlikte sergi salonundaydı; 20 ziyaretçi bunu teyit ediyor.",
        type: "witness",
      },
      {
        id: "c3",
        text: "Güvenlik kamerası kimyasal sprey kullanımını tespit ederdi; kayıtlarda böyle bir görüntü yok.",
        type: "evidence",
      },
      {
        id: "c4",
        text: "Restoratör Hanım, depolama odasına erişim kodu bilen tek kişiydi ve gece mesaisi vardı.",
        type: "direct",
      },
      {
        id: "c5",
        text: "Adli analiz: bekçinin kolunda ince iğne izi tespit edildi. Uyutucu madde enjekte edilmiş.",
        type: "forensic",
      },
      {
        id: "c6",
        text: "Küratör Bey, ziyaret defterini imzalayan grupla birlikte sergi salonundaydı; kayıtlı çıkış saati sabahı işaret ediyor.",
        type: "witness",
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
      { id: "w1", name: "Av Tüfeği", description: "Emekli albayın dolabında sakladığı çift namlulu tüfek", icon: "sports" },
      { id: "w2", name: "Zehir", description: "Doğal bitkilerden elde edilen güçlü bitki toksini", icon: "science" },
      { id: "w3", name: "Bıçak", description: "Balık ayıklamak için kullanılan uzun mutfak bıçağı", icon: "cut" },
      { id: "w4", name: "Boğma", description: "El gücüyle boyuna uygulanan güçlü basınç", icon: "pan-tool" },
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
        text: "Kurban villa içinde değil, açık havada ve villa çevresinde bulundu.",
        type: "elimination",
      },
      {
        id: "c2",
        text: "Emekli Albay sabah komşular tarafından düzenli sporu yaparken görüldü; o saatte bahçeden uzaktaydı.",
        type: "witness",
      },
      {
        id: "c3",
        text: "Ressam Leyla'nın kayalıkları hiç ziyaret etmediği, tuvali ve gözlemevi başka yerdeydi.",
        type: "witness",
      },
      {
        id: "c4",
        text: "Aşçı Mehmet sabahtan beri mutfaktan çıkmadı; yemek hazırlık kayıtları bunu teyit ediyor.",
        type: "evidence",
      },
      {
        id: "c5",
        text: "Adli rapor: kurbanın boynunda parmak izi şeklinde morluklar var. Boğulma kesinleşti.",
        type: "forensic",
      },
      {
        id: "c6",
        text: "Genç Yatçı sahil şeridinde görülmüş olsa da villa bahçesinin kamera açısı dışında dolaştığı biliniyor.",
        type: "witness",
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
      { id: "w1", name: "Zehirli İçecek", description: "Şişeye karıştırılan renksiz ve tatsız zehir", icon: "local-bar" },
      { id: "w2", name: "Kesici Silah", description: "Hareketli trende saklanmış küçük çakı bıçağı", icon: "cut" },
      { id: "w3", name: "Boğma Halatı", description: "Bavuldan çıkabilecek ince naylon halat", icon: "trip-origin" },
    ],
    locations: [
      { id: "l1", name: "Kompartıman", description: "Dar, dört kişilik ahşap bölmeli tren kompartımanı", icon: "train" },
      { id: "l2", name: "Yemekli Vagon", description: "Beyaz örtülü masalar ve garsonlarla yemekli vagon", icon: "restaurant" },
      { id: "l3", name: "Tuvalet", description: "Trenin arka bölümündeki küçük, kilitlenebilir tuvalet", icon: "wc" },
    ],
    clues: [
      {
        id: "c1",
        text: "Kurban tuvalet değil, oturma alanında bulundu. Hiç oraya geçmemişti.",
        type: "elimination",
      },
      {
        id: "c2",
        text: "Öğrenci bütün yolculuk boyunca koridorda müzik dinledi; birden fazla yolcu bunu gördü.",
        type: "witness",
      },
      {
        id: "c3",
        text: "Hareket halindeki trende halat saklamak ve kulanmak imkansız; tanıklar tüm hareketi görmüş olurdu.",
        type: "elimination",
      },
      {
        id: "c4",
        text: "Emekli Doktor kurbanla yemekli vagonda içki içmişti; kursun kokteylin içine karışmıştı.",
        type: "direct",
      },
      {
        id: "c5",
        text: "Adli tıp: kanda standart zehir bileşiği tespit edildi. İçecek yoluyla alınmış.",
        type: "forensic",
      },
      {
        id: "c6",
        text: "İş kadını kompartımanından çıkmadı; kondüktör kapı kontrolü sırasında onu uyurken gördü. Yemekli vagona hiç geçmedi.",
        type: "witness",
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
      { id: "w1", name: "Zehirli Sabun", description: "Sabun köpüğüne karıştırılan toksik kimyasal madde", icon: "soap" },
      { id: "w2", name: "Boğma", description: "Islak havluyla ya da elle gerçekleştirilen boğma", icon: "pan-tool" },
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
        text: "Kurban masaj odasında bulundu ve adli izler de orada hayatını kaybettiğini doğruluyor.",
        type: "forensic",
      },
      {
        id: "c2",
        text: "Kasiyer o sırada dışarıda bekleme listesiyle meşguldü; güvenlik kamerası bunu kayıt altına almış.",
        type: "evidence",
      },
      {
        id: "c3",
        text: "Kimyasal analiz: sabun köpüğünde toksin izi bulunamadı. Zehirli sabun hipotezi reddedildi.",
        type: "forensic",
      },
      {
        id: "c4",
        text: "Kese ustası masaj boyunca kurbanla temas halindeydi. Masaj odasına başka kimse girmedi.",
        type: "direct",
      },
      {
        id: "c5",
        text: "Yönetici, mali raporları gözden geçiriyordu; ofisindeki güvenlik kamerası onu tüm süre boyunca kayıt altına aldı.",
        type: "evidence",
      },
      {
        id: "c6",
        text: "Adli inceleme: boğma izleri kuvvetli el baskısı gerektiriyor. Kese ustasının deneyimi ve fizik yapısıyla örtüşüyor.",
        type: "forensic",
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
        text: "Saldırı sergi salonunda değil; arka bölümlerde gerçekleşti. Salon kameraları normal gösteriyor.",
        type: "evidence",
      },
      {
        id: "c2",
        text: "Nakliyeci, gala başlamadan malları teslim edip ayrılmıştı. Çıkış saati loglanmış.",
        type: "evidence",
      },
      {
        id: "c3",
        text: "Kimyasal sprey kullanılmış olsaydı gala misafirleri de etkilenirdi; hiç şikayet yok.",
        type: "elimination",
      },
      {
        id: "c4",
        text: "Galeri Direktörü her misafirle fotoğraf çektirdi; salon boyunca tanıkları var, tek başına kalmadı.",
        type: "witness",
      },
      {
        id: "c5",
        text: "Ünlü Sanatçı, güvenlik merkezine özel geçiş izni almış ve sistemin kapandığı anda orada görülmüş.",
        type: "direct",
      },
      {
        id: "c6",
        text: "Adli rapor: koordinatörde elektrik deşarjından kaynaklanan yanık izleri bulundu.",
        type: "forensic",
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
      { id: "w1", name: "Ağır Kağıt Ağırlığı", description: "Masanın üzerindeki süslü ağır cam kağıt ağırlığı", icon: "square" },
      { id: "w2", name: "Zehirli Kahve", description: "Her sabah hazırlanan kahvenin içine karıştırılan toksin", icon: "coffee" },
      { id: "w3", name: "Elektrik Çarpması", description: "Ofis ekipmanının kasıtlı olarak sabote edilmesi", icon: "flash-on" },
    ],
    locations: [
      { id: "l1", name: "Belediye Ofisi", description: "Belediye başkanının kullandığı büyük ve gösterişli ofis", icon: "business" },
      { id: "l2", name: "Toplantı Odası", description: "Uzun oval masalı resmi toplantı odası", icon: "groups" },
      { id: "l3", name: "Koridor", description: "Ofisin önündeki güvenlik kameralı geniş koridor", icon: "directions-walk" },
    ],
    clues: [
      {
        id: "c1",
        text: "Güvenlik kamerası koridorda herhangi bir olay olmadığını gösteriyor; cinayet kapalı bir odada.",
        type: "evidence",
      },
      {
        id: "c2",
        text: "Muhalefet adayı, seçim kampanyası toplantısındaydı; 50 kişi bunu doğruluyor.",
        type: "witness",
      },
      {
        id: "c3",
        text: "Elektrik altyapısı o gün arızalıydı; teknik servis kayıtları bunu belgeler.",
        type: "evidence",
      },
      {
        id: "c4",
        text: "Adli tıp: kahvede kimyasal toksin tespit edildi. Zehirleme yöntemi kesinleşti.",
        type: "forensic",
      },
      {
        id: "c5",
        text: "Sekreter Bayan her sabah belediye başkanına kahve hazırlardı; o gün da bu rutin yaşandı.",
        type: "direct",
      },
      {
        id: "c6",
        text: "İnşaat müteahhidi o gün ilçe dışında bir şantiyedeydi; müdürü ve iki işçi orada olduğunu doğruluyor.",
        type: "witness",
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
      "Ankara'daki yıllık folklor festivalinde, organizasyonun baş koordinatörü sahnede aniden yere yığıldı.",
    suspects: [
      { id: "s1", name: "Rakip Sanatçı", description: "Aynı gruba üye olmak istiyordu", icon: "music-note" },
      { id: "s2", name: "Ses Teknikeri", description: "Sahne arkasında çalışıyor", icon: "headphones" },
      { id: "s3", name: "Sponsorların Temsilcisi", description: "Bütçe tartışması yaşanmıştı", icon: "monetization-on" },
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
        text: "Kurban soyunma odasından sonra direkt sahneye çıktı. Kontrol odasına uğramadı.",
        type: "elimination",
      },
      {
        id: "c2",
        text: "Rakip sanatçının soyunma odasına girişi yoktu; kapı kayıtları bunu doğruluyor.",
        type: "evidence",
      },
      {
        id: "c3",
        text: "Adli tıp: zehir veya iğne izi bulunamadı. Elektrik kökenli travma tespit edildi.",
        type: "forensic",
      },
      {
        id: "c4",
        text: "Ses teknikeri sahne elektriğini kontrol ediyordu; daha sonra mikrofon kasıtlı olarak modifiye edilmişti.",
        type: "direct",
      },
      {
        id: "c5",
        text: "Sahne sisteminin teknik bakım kaydı incelendi; ses teknisyeninin imzasıyla onaylanan son müdahale olay günü yapılmıştı.",
        type: "evidence",
      },
      {
        id: "c6",
        text: "Sponsorların temsilcisi mali tartışmadan sonra mekandan erken ayrıldı; çıkış saati güvenlik loglarında kayıtlı.",
        type: "evidence",
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
        text: "El yazmaları bölümünde bozulmuş kilit ve dağınık raf görüntülendi. Suç burada işlendi.",
        type: "evidence",
      },
      {
        id: "c2",
        text: "Temizlik görevlisi 02.00-04.00 arasında tüm katlarda dolaştı; kameralar her adımı kaydetti.",
        type: "evidence",
      },
      {
        id: "c3",
        text: "Kütüphaneci 30 yıldır el yazmalarına ulaşmak istiyordu ama erişim izni hiçbir zaman verilmemişti.",
        type: "elimination",
      },
      {
        id: "c4",
        text: "Doktora öğrencisi, el yazmaları bölümünde tek izinli araştırmacıydı ve kodu biliyordu.",
        type: "direct",
      },
      {
        id: "c5",
        text: "Adli inceleme: kurbanın kafasında ağır, düz kenarlı cisimle vurulmuş iz. Ağır kitap profiliyle örtüşüyor.",
        type: "forensic",
      },
      {
        id: "c6",
        text: "Gece nöbetçisi, el yazmaları bölümünün önünden geçerken doktora öğrencisini çıkarken gördü; saat tam 03.15'ti.",
        type: "witness",
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
      { id: "w1", name: "Balıkçı Bıçağı", description: "Balık ayıklamak için kullanılan uzun ve dar bıçak", icon: "cut" },
      { id: "w2", name: "Kayalık", description: "Sahil kayalıklarından kopan parça ya da duvara çarpma", icon: "terrain" },
      { id: "w3", name: "Zehirli İçki", description: "Yerel rakıya karıştırılan tehlikeli kimyasal madde", icon: "local-bar" },
      { id: "w4", name: "İp", description: "Teknelerde kullanılan kalın ve dayanıklı bağlama ipi", icon: "trip-origin" },
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
        text: "Kurban mutfakta ya da lobide değil, dışarıda bulundu.",
        type: "elimination",
      },
      {
        id: "c2",
        text: "Aşçı gece boyunca otel sahibiyle çalıştı; lobi kamerası ve lobideki misafirler bunu doğruluyor.",
        type: "witness",
      },
      {
        id: "c3",
        text: "Tur Rehberi geceyi kasabada değil, şehirde geçirmişti; otobüs bileti bunu kanıtlıyor.",
        type: "evidence",
      },
      {
        id: "c4",
        text: "Balıkçı sahil kenarında gece boyunca ağlarını onarıyordu; komşu bunu teyit ediyor.",
        type: "witness",
      },
      {
        id: "c5",
        text: "Adli tıp: toksin ya da kesik izi yok. Travma; kayadan düşmeyle ya da çarpmayla oluşmuş.",
        type: "forensic",
      },
      {
        id: "c6",
        text: "Kayalık burunda kan izleri ve mülk sahibinin ayak izi tespit edildi. Kıyafetinde toprak izi var.",
        type: "evidence",
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
        text: "Müdür kontrol odasında değil, üretim alanında bulundu. Adli izler de bölgeyle örtüşüyor.",
        type: "forensic",
      },
      {
        id: "c2",
        text: "Muhasebe müdürü akşam bütçe toplantısı için şehir dışındaydı; geri dönüş biletinin saati bunu kanıtlıyor.",
        type: "evidence",
      },
      {
        id: "c3",
        text: "Fabrikada zehirli kimyasal hiç stoklanmamış; tedarik kayıtları temiz.",
        type: "evidence",
      },
      {
        id: "c4",
        text: "İşçi Başı, gece vardiyasında fabrikada bulunuyordu; erişim kartı kaydı gece boyunca üretim alanındaydı.",
        type: "evidence",
      },
      {
        id: "c5",
        text: "Adli inceleme: kafada düz yüzeyli ağır cisimle darbe. Çekiç profiliyle tam örtüşüyor.",
        type: "forensic",
      },
      {
        id: "c6",
        text: "Gece vardiyasındaki iki işçi, sendika müzakeresi sırasında İşçi Başı ile müdürün yüksek sesle tartıştığını duyduklarını beyan etti.",
        type: "witness",
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
      { id: "w1", name: "Su Altında Boğma", description: "Suya bastırarak solunum yolunu kapama", icon: "water" },
      { id: "w2", name: "Uyku Hapı", description: "İçeceğe karıştırılan güçlü uyku ilacı", icon: "medication" },
      { id: "w3", name: "Bıçak", description: "Spa malzemeleri arasına saklanmış küçük katlanır bıçak", icon: "cut" },
    ],
    locations: [
      { id: "l1", name: "Havuz Başı", description: "Termal suyun aktığı açık yüzme havuzu kenarı", icon: "pool" },
      { id: "l2", name: "Spa Odası", description: "Aromaterapi ve masaj yapılan özel kabin", icon: "spa" },
      { id: "l3", name: "Sauna", description: "Yüksek sıcaklıkta tutulan, dışarıdan kilitlenebilen sauna", icon: "whatshot" },
    ],
    clues: [
      {
        id: "c1",
        text: "Kurban havuz başında değil, kapalı bir kabinde bulundu.",
        type: "elimination",
      },
      {
        id: "c2",
        text: "Rakip şarkıcı o gece sahne performansı için şehirdeydi; binlerce izleyici ve video kayıtları kanıt.",
        type: "witness",
      },
      {
        id: "c3",
        text: "Adli tıp: bıçak izi ya da ilaç izi yok. Boğulma; akciğerlere su dolmuş.",
        type: "forensic",
      },
      {
        id: "c4",
        text: "Eski hayranı, sauna kapısını dışarıdan kilitleyebilecek konumdaydı ve saunanın yerini biliyordu.",
        type: "direct",
      },
      {
        id: "c5",
        text: "Otel giriş kayıtları, eski hayranının sauna kabinine kurbanla birlikte girdiğini ve tek başına çıktığını gösteriyor.",
        type: "evidence",
      },
      {
        id: "c6",
        text: "Otel müdürü gece boyunca resepsiyon bölgesindeydi; güvenlik kamerası onu spa alanına hiç gitmeyen olarak kaydetti.",
        type: "evidence",
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
        text: "Gazeteci içeride oturuyordu; terasa ya da tuvalete hiç çıkmadı. Tanıklar bunu doğruluyor.",
        type: "witness",
      },
      {
        id: "c2",
        text: "Müşteri o gün yeni geldi; garsonla ya da kafe sahibiyle daha önce hiç iletişimi yoktu.",
        type: "elimination",
      },
      {
        id: "c3",
        text: "Kafede hiç patlama ya da ses olmadı. Gürültü bombası hipotezi dışlandı.",
        type: "elimination",
      },
      {
        id: "c4",
        text: "Adli tıp: kanda hızlı etkili toksin tespit edildi. Çayla birlikte alınmış.",
        type: "forensic",
      },
      {
        id: "c5",
        text: "Garson çayı bizzat hazırladı ve masaya taşıdı; tek temas noktasıydı.",
        type: "direct",
      },
      {
        id: "c6",
        text: "Kafe sahibi ödeme kasasında kesintisiz oturuyordu; ödeme terminali kayıtları ve kamera onu hiç terk etmediğini gösteriyor.",
        type: "evidence",
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
      { id: "w1", name: "Zehirli İğne", description: "Küçük, hızlı etki eden nörotoksin enjeksiyonu", icon: "vaccines" },
      { id: "w2", name: "Bilgisayar Şoku", description: "Bilgisayar kasasına yerleştirilen elektrik deşarjı", icon: "computer" },
      { id: "w3", name: "Kimyasal Madde", description: "Araştırma laboratuvarından alınan tehlikeli kimyasal", icon: "science" },
      { id: "w4", name: "Boğma", description: "Güçlü el baskısıyla boyuna uygulanan basınç", icon: "pan-tool" },
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
        text: "Kurban toplantı odasında bulundu; adli izler de orada hayatını kaybettiğini doğruluyor.",
        type: "forensic",
      },
      {
        id: "c2",
        text: "Yazılım Mühendisi sistemi güncellemek için sunucu odasındaydı; erişim logu bunu doğruluyor.",
        type: "evidence",
      },
      {
        id: "c3",
        text: "Kimyasal madde analizi: toplantı odasının hava örneğinde kimyasal iz bulunmadı.",
        type: "forensic",
      },
      {
        id: "c4",
        text: "Bilgisayar şoku için özel adaptör gerekir; toplantı odasında böyle bir ekipman yoktu.",
        type: "elimination",
      },
      {
        id: "c5",
        text: "Adli tıp: boyunda parmak izi şeklinde morluklar. Boğulma kesinleşti.",
        type: "forensic",
      },
      {
        id: "c6",
        text: "Baş Araştırmacı, kurbanla toplantı öncesinde tartıştı; iki çalışan bunu duydu.",
        type: "witness",
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
      { id: "w1", name: "Zehirli Şarap", description: "Kadehe dökülen nadide şaraba karıştırılan arsen", icon: "wine-bar" },
      { id: "w2", name: "Zehirli Yemek", description: "Servis sırasında tabağa eklenen kokusuz toksin", icon: "dinner-dining" },
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
        text: "Elçi yemek salonunda zehirlendi; bahçeye ya da kütüphaneye hiç çıkmadı.",
        type: "witness",
      },
      {
        id: "c2",
        text: "Kütüphaneci kütüphanede oturuyordu; davete katılmadığı güvenlik loglarında kayıtlı.",
        type: "evidence",
      },
      {
        id: "c3",
        text: "Yabancı Diplomat perhiz yapıyordu ve yemek yemedi; protokol şefi bunu teyit ediyor.",
        type: "witness",
      },
      {
        id: "c4",
        text: "Saray laboratuvarı: sentetik kimyasal ya da alkol bazlı toksin izi bulunamadı. Organik kaynaklı.",
        type: "forensic",
      },
      {
        id: "c5",
        text: "Protokol Şefi yemek siparişini verdi ama tabakları hiç taşımadı; personel bunu doğruluyor.",
        type: "witness",
      },
      {
        id: "c6",
        text: "Özel Aşçı mutfakta tek kişi olarak tabakları hazırladı ve servis etti.",
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
      { id: "w1", name: "Av Tüfeği", description: "Köyde yaygın olarak kullanılan uzun namlulu av tüfeği", icon: "sports" },
      { id: "w2", name: "Bıçak", description: "Köylülerin taşıdığı tipik kemer bıçağı", icon: "cut" },
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
        text: "Silah sesi çadır uzağında duyuldu; düğün çadırı ve meydan dışında bir yerde.",
        type: "witness",
      },
      {
        id: "c2",
        text: "Adli tıp: kurban ateşli silahla öldürülmüş. Bıçak ya da zehir izi yok.",
        type: "forensic",
      },
      {
        id: "c3",
        text: "Fotoğrafçı çadırın önünde fotoğraf çekiyordu; birden fazla kişi bunu gördü.",
        type: "witness",
      },
      {
        id: "c4",
        text: "Damat düğün çadırındaydı; kadınlar ve erkekler bölümünden ayrılmadı.",
        type: "witness",
      },
      {
        id: "c5",
        text: "Muhtar, arazi davasını kazanmak için her yolu denemiş; ahır arkasına gittiğini gören bir tanık var.",
        type: "direct",
      },
      {
        id: "c6",
        text: "Ahır arkasında muhtara ait av tüfeğinin boş kartuşu bulundu; parmak izi analizi muhtarı son tutan kişi olarak doğruladı.",
        type: "evidence",
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
