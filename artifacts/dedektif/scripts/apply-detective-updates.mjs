#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUZZLES_PATH = path.join(ROOT, "data/puzzles.ts");

const UPDATES = {
  "Boğaz'da Kayıp Elmas": {
    story:
      "İstanbul Boğazı'nın serin sularında süzülen lüks yatta düzenlenen o gösterişli sergi, kanlı bir geceyle son buldu. Paha biçilemez 'Boğaz Elması'nın çalındığı anlaşıldığında, geminin güvenlik şefi Orhan alt katta cansız yatıyordu. Dalgaların sesi yatı döverken, katil ve çaldığı elmas hala bu lüks kafesin içinde, üç şüpheliden birinin ardında saklanıyor.",
    clues: [
      { id: "c1", text: "Olay yeri inceleme ekipleri, cinayetin aydınlık VIP Salon'da veya kameralarla izlenen Seyir Köprüsü'nde işlenmediğini kesin olarak raporladı.", type: "forensic", isBonus: false },
      { id: "c2", text: "Kaptan Levent'in olay saatinde ne o kalın sentetik ipe ne de basınçlı gaz tüpüne dokunmadığı, elindeki tek aletin ağır bakım çekici olduğu anlaşıldı.", type: "witness", isBonus: false },
      { id: "c3", text: "İnce yapılı Sponsor Murat'ın, zemini yağlı ve gürültülü makine dairesine adım bile atmadığı kanıtlandı.", type: "evidence", isBonus: false },
      { id: "c4", text: "Ağır demir çekicin makine dairesine hiç indirilmediği ve o karanlık alanda kesinlikle kullanılmadığı tespit edildi.", type: "forensic", isBonus: false },
      { id: "c5", text: "Organizatör Eda'nın, basınçlı gaz tüplerinin bulunduğu depolama alanına erişimi olmadığı ve bu tüpleri kullanamayacağı doğrulandı.", type: "evidence", isBonus: true },
      { id: "c6", text: "Maktulün boynundaki kusursuz düğüm izi, katilin esnek nesneleri kullanmada çok usta olduğunu gösteriyordu.", type: "forensic", isBonus: true },
    ],
  },
  "Kapalıçarşı'da Gizem": {
    story:
      "Kapalıçarşı'nın yüzlerce yıllık labirent gibi sokaklarına çöken akşam karanlığı, bir cinayeti örtbas etmeye yetmedi. Çarşının en eski kuyumcularından biri, kepenkler indikten hemen sonra dükkanında vahşice katledildi ve en nadide altınlar sırra kadem bastı. Kepenklerin dışarıdan kilitli olması, katilin çarşının kendi içinden biri olduğunu acı bir şekilde fısıldıyor.",
    clues: [
      { id: "c1", text: "Kurban, asit bazlı bir çözeltiyle zehirlenmemiş veya tunç kefeli bir ağırlıkla darp edilmemişti.", type: "forensic", isBonus: false },
      { id: "c2", text: "30 yıllık esnaf Ahmet Usta'nın, cinayet saatinde vitrinlerin parladığı dükkan içinde olduğu güvenlik kamerasından kanıtlandı.", type: "witness", isBonus: false },
      { id: "c3", text: "Cinayetin işlendiği mekan, yüzlerce yıllık kıvrımlı taş koridorlar veya vitrinli müşteri alanı değildi.", type: "evidence", isBonus: false },
      { id: "c4", text: "Olay yerinde bulunan ağır çelik aletin üzerindeki parmak izleri, muhasebeci Selma Teyze'ye veya Ahmet Usta'ya ait değildi.", type: "forensic", isBonus: false },
      { id: "c5", text: "Selma Teyze, olay sırasında taş koridorlarda devriye gezen bekçilerle sohbet ediyordu.", type: "witness", isBonus: true },
      { id: "c6", text: "Elektronik kilitli depoda işlenen cinayetin faili, kilitlerde iz bırakan ağır aleti ustalıkla kullanan genç stajyerden başkası değildi.", type: "evidence", isBonus: true },
    ],
  },
  "Üniversitede Karanlık Sır": {
    story:
      "İstanbul'un köklü üniversitesindeki sessiz gece, çığır açacak bir araştırma projesinin kana bulanmasıyla yırtıldı. Laboratuvar yöneticisi, aylar süren çalışmaların en kritik gecesinde masasının başında ölü bulundu. Şifreli sunuculardan silinen kritik veriler, bu cinayetin basit bir öfkeden ziyade, soğukkanlı bir ihanet olduğunu gösteriyor.",
    clues: [
      { id: "c1", text: "Maktulün cesedinde herhangi bir kesici alet yarası veya solunum yollarında kimyasal bir tahribat tespit edilmedi.", type: "forensic", isBonus: false },
      { id: "c2", text: "Prof. Kahraman'ın olay saati boyunca yığınla dosyanın bulunduğu ofisinde bilgisayar başında olduğu sunucu kayıtlarıyla kanıtlandı.", type: "evidence", isBonus: false },
      { id: "c3", text: "Güvenlik Görevlisi'nin, ıssız ve uzun üniversite geçitlerinde devriye attığı güvenlik kameralarınca doğrulandı.", type: "evidence", isBonus: false },
      { id: "c4", text: "Kasıtlı bir kablo sabotajıyla gerçekleştirilen bu cinayet, gece vardiyası çalışanı veya ofisteki profesör tarafından işlenmemişti.", type: "evidence", isBonus: false },
      { id: "c5", text: "Deney düzeneklerinin bulunduğu araştırma odasının kapı logları, sadece bir asistanın o saatte içeride olduğunu gösteriyordu.", type: "evidence", isBonus: true },
      { id: "c6", text: "Asistan Elif'in, yüksek voltajlı laboratuvar kablolarını deney odasında zekice manipüle ederek bu kusursuz cinayeti işlediği açığa çıktı.", type: "evidence", isBonus: true },
    ],
  },
  "Müzede Kayıp Eser": {
    story:
      "Ankara'daki asırlık müzenin loş koridorlarında, tarihin sessizliği kanla bozuldu. Bizans dönemine ait eşsiz bir broşun çalındığı o fırtınalı gecede, gece bekçisi görev yerinde ağır yaralı olarak bulundu. Güvenlik sistemlerinin içeriden devre dışı bırakılması, şüphe oklarını doğrudan müzenin saygın çalışanlarına çeviriyor.",
    clues: [
      { id: "c1", text: "Güvenlik kameraları, Ziyaretçi Rehber'in tüm gece boyunca eserlerin bulunduğu aydınlık salondan hiç ayrılmadığını doğruladı.", type: "evidence", isBonus: false },
      { id: "c2", text: "Küratör Bey'in, kamera görüntülerinin izlendiği kontrol merkezinde olduğu ve olay yerine hiç gitmediği anlaşıldı.", type: "witness", isBonus: false },
      { id: "c3", text: "Maktulün üzerinde ağır bir mermer darbesi veya geçici felç yaratan kimyasal bir sprey bulgusuna rastlanmadı.", type: "forensic", isBonus: false },
      { id: "c4", text: "Eser onarımı yapan uzmanın, anestezik enjeksiyonlara doğrudan erişimi olan tek müze çalışanı olduğu tespit edildi.", type: "evidence", isBonus: false },
      { id: "c5", text: "Ağır mermer kaidenin ve kimyasal karışımların bulunduğu sergi salonunda veya kontrol odasında hiçbir arbede yaşanmamıştı.", type: "evidence", isBonus: true },
      { id: "c6", text: "Restoratör Hanım'ın, kilitli eser onarım odasında bekçiye hızla etki eden o sinsi enjeksiyonu yaptığı kesinleşti.", type: "evidence", isBonus: true },
    ],
  },
  "Tren Yolculuğunda Cinayet": {
    story:
      "Ankara-İstanbul ekspresinin ritmik tekerlek sesleri, kompartımanda işlenen sessiz bir cinayeti gizlemeye yetmedi. Tren yoğun sis altında yoluna devam ederken, birinci mevkide seyahat eden tanınmış bir iş insanı koltuğunda son nefesini vermişti. Tren bir sonraki istasyona varmadan ve katil kalabalığa karışmadan önce bu düğüm çözülmeli.",
    clues: [
      { id: "c1", text: "Adli tıp incelemesi, maktulde herhangi bir kesik veya ince bir iple boğulma izi olmadığını, ölümün hücresel bir şokla gerçekleştiğini belirledi.", type: "forensic", isBonus: false },
      { id: "c2", text: "Üniversite öğrencisinin yolculuk boyunca sadece ahşap bölmeli dar odasında oturduğu doğrulandı.", type: "witness", isBonus: false },
      { id: "c3", text: "İş Kadını'nın, olay anında trenin arka bölümündeki küçük kilitli alanda mahsur kaldığı görevlilerce teyit edildi.", type: "witness", isBonus: false },
      { id: "c4", text: "Cinayetin işlendiği yer, dar kompartıman veya kilitlenebilir tuvalet değildi; beyaz örtülü masaların olduğu bir alandı.", type: "evidence", isBonus: false },
      { id: "c5", text: "Emekli doktorun tıbbi bilgisi, o renksiz ve tatsız maddeyi kurbanın bardağına hissettirmeden damlatmasını sağlamıştı.", type: "evidence", isBonus: true },
      { id: "c6", text: "Yemekli vagonda maktulün karşısında oturan doktorun, soğukkanlılıkla bu sinsi cinayeti işlediği açığa çıktı.", type: "evidence", isBonus: true },
    ],
  },
  "Çarşamba Suikastı": {
    story:
      "Çarşamba kasabasının o sakin ve durağan yapısı, belediye başkanının kendi makam odasında ölü bulunmasıyla temelinden sarsıldı. Kasaba halkı bu şokla çalkalanırken olay yerindeki incelemeler, cinayetin dışarıdan gelen biri tarafından değil, başkanın en yakınındaki yüzlerden biri tarafından ustaca planlanarak işlendiğini gösteriyordu.",
    clues: [
      { id: "c1", text: "Maktulün bedeninde elektrik yanığı veya ağır camla oluşabilecek kafa travması yoktu; ölüm sinsi ve içsel bir yolla gerçekleşmişti.", type: "forensic", isBonus: false },
      { id: "c2", text: "Muhalefet Adayı, cinayet sabahı uzun oval masalı odada basına kapalı bir görüşmedeydi ve hiç çıkmadı.", type: "witness", isBonus: false },
      { id: "c3", text: "İnşaat Müteahhidi'nin sadece güvenlik kameralı geniş geçitte beklediği ve içeri hiç adım atmadığı kanıtlandı.", type: "evidence", isBonus: false },
      { id: "c4", text: "Cinayetin, güvenlik kameralarının kaydettiği geçitte veya resmi toplantı alanında işlenmediği olay yeri incelemesiyle sabitlendi.", type: "evidence", isBonus: false },
      { id: "c5", text: "Her sabah hazırlanan içeceğe erişimi olan tek kişi, başkanın ofisindeki en yakın çalışanıydı.", type: "evidence", isBonus: true },
      { id: "c6", text: "Yılların sekreteri, gösterişli makam odasında başkanın kahvesine o ölümcül toksini karıştırarak bu kusursuz ihaneti planlamıştı.", type: "evidence", isBonus: true },
    ],
  },
  "Fotoğrafçının Son Karesi": {
    story:
      "Ankara'nın eski Ulus semtindeki loş fotoğraf stüdyosu, bu kez kurgusal bir kareye değil gerçek bir trajediye sahne oldu. Tanınmış fotoğraf sanatçısı Faruk Bey, stüdyosunun arka taraflarında cansız yatıyordu. Karanlık odanın kırmızı ışığı yanıp sönerken, katilin bıraktığı izler o odada yıkanmayı bekleyen son film rulosunun içinde gizliydi.",
    clues: [
      { id: "c1", text: "Adli tabip raporu, kurbanın ağır metal bir kutuyla darp edilmediğini ve yüksek asitli kimyasallarla zehirlenmediğini doğruladı.", type: "forensic", isBonus: false },
      { id: "c2", text: "Koleksiyoner Münir Bey'in olay saati boyunca sadece malzemelerin tutulduğu arşiv odasında nadir fotoğrafları incelediği anlaşıldı.", type: "witness", isBonus: false },
      { id: "c3", text: "Cinayetin çekimlerin yapıldığı geniş ön salonda veya arşivlerin bulunduğu arka depoda işlenmediği olay yeri ekiplerince kanıtlandı.", type: "evidence", isBonus: false },
      { id: "c4", text: "Uzun metal alüminyum parçası üzerinde gazeteci Selda Hanım'a veya koleksiyonere ait hiçbir parmak izi bulunamadı.", type: "forensic", isBonus: false },
      { id: "c5", text: "Gazeteci Selda Hanım, cinayet sırasında geniş çekim salonunda fotoğraf ekipmanlarını inceliyordu.", type: "witness", isBonus: true },
      { id: "c6", text: "Terfi alamayan asistanın, kırmızı lambalı film odasında patronunu o sökülmüş uzun alüminyum bacakla katlettiği kesinleşti.", type: "evidence", isBonus: true },
    ],
  },
  "Termal Otelde Ölüm": {
    story:
      "Bursa'nın şifalı sularıyla ünlü köklü termal otelinde, sular bu kez şifa değil ölüm getirdi. Otelin daimi misafirlerinden Münibe Hanım, havuz kenarında boğulmuş halde bulundu. Gece yarısı otelde sadece üç misafir kalmıştı ve katil, bu sıcak ve buharlı duvarların ardında mükemmel bir alibi uydurmaya çalışıyordu.",
    clues: [
      { id: "c1", text: "Otopsi raporu, kurbanın metal bir trabzanla kafasına vurulmadığını ve klorlu bir temizleyiciyle zehirlenmediğini açıkça ortaya koydu.", type: "forensic", isBonus: false },
      { id: "c2", text: "Genç Sporcu Erdal'ın, olay anında sadece girişin hemen önündeki resepsiyon alanında telefonla konuştuğu güvenlik loglarından teyit edildi.", type: "evidence", isBonus: false },
      { id: "c3", text: "Cinayetin oda katlarını bağlayan uzun geçitlerde veya resepsiyonun bulunduğu oturma alanında işlenmediği kesinleşti.", type: "evidence", isBonus: false },
      { id: "c4", text: "Boğma izi bırakan kalın otel eşyasının üzerinde Emekli Doktor'a veya Genç Sporcu'ya ait herhangi bir DNA örneği bulunamadı.", type: "forensic", isBonus: false },
      { id: "c5", text: "Doktor Vedat Bey, olay saatinde oda katlarını birbirine bağlayan uzun koridorda yürüyüş yapıyordu.", type: "witness", isBonus: true },
      { id: "c6", text: "Hesap anlaşmazlığı yaşayan şirket ortağı iş kadınının, alt kattaki buharlı kapalı alanda o kalın otel örtüsüyle kurbanın nefesini kestiği anlaşıldı.", type: "evidence", isBonus: true },
    ],
  },
  "Mektup Gelmedi": {
    story:
      "Samsun limanının o rüzgarlı ve iyot kokulu sokaklarında, yılların emektar postacısı Cafer Bey'in son teslimatı ölüm oldu. Çantası sokağa saçılmış, kendisi ise dağıtım güzergahında cansız bulunmuştu. Eksik olan birkaç mektup, bu cinayetin basit bir gasp değil, hedefine ulaşmamış bir intikam mektubunun sonucu olduğunu gösteriyordu.",
    clues: [
      { id: "c1", text: "Kurbanın vücudunda demir bir yük aletiyle veya kırık bir cam şişeyle açılmış herhangi bir derin yara izine rastlanmadı.", type: "forensic", isBonus: false },
      { id: "c2", text: "Ev Hanımı Hatice Teyze'nin olay saatinde mektupların sınıflandırıldığı küçük depo binasında kendi kargosunu aradığı kanıtlandı.", type: "witness", isBonus: false },
      { id: "c3", text: "Cinayetin gemilerin yanaştığı açık rıhtım alanında veya mektupların depolandığı küçük binada işlenmediği olay yeri incelemesiyle sabitlendi.", type: "evidence", isBonus: false },
      { id: "c4", text: "Cinayette kullanılan küçük katlanır aletin üzerinde Bakkal Necati'ye veya Hatice Teyze'ye ait hiçbir parmak izi yoktu.", type: "forensic", isBonus: false },
      { id: "c5", text: "Bakkal Necati, olay sırasında gemilerin yanaştığı açık rıhtım alanında eksik kolilerini bekliyordu.", type: "witness", isBonus: true },
      { id: "c6", text: "Belgesini bekleyen liman işçisinin, bakkalın hemen arkasındaki ıssız sokakta o küçük katlanır bıçakla postacının hayatına son verdiği kesinleşti.", type: "evidence", isBonus: true },
    ],
  },
};

function formatClues(clues) {
  return clues
    .map(
      (c) => `      {
        id: "${c.id}",
        text: ${JSON.stringify(c.text)},
        type: "${c.type}",
        isBonus: ${c.isBonus},
      }`
    )
    .join(",\n");
}

let content = fs.readFileSync(PUZZLES_PATH, "utf8");

for (const [title, update] of Object.entries(UPDATES)) {
  const esc = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const storyRe = new RegExp(
    `(title: "${esc}"[\\s\\S]*?story:)\\s*\\n\\s*"[^"]*"(\\s*,\\s*\\n\\s*suspects:)`
  );
  if (!storyRe.test(content)) {
    console.error("Story block not found:", title);
    process.exit(1);
  }
  content = content.replace(
    storyRe,
    `$1\n      ${JSON.stringify(update.story)}$2`
  );

  const cluesRe = new RegExp(
    `(title: "${esc}"[\\s\\S]*?clues: \\[)[\\s\\S]*?(\\],\\s*\\n\\s*solvabilityMeta:)`
  );
  if (!cluesRe.test(content)) {
    console.error("Clues block not found:", title);
    process.exit(1);
  }
  content = content.replace(
    cluesRe,
    `$1\n${formatClues(update.clues)},\n    $2`
  );
}

fs.writeFileSync(PUZZLES_PATH, content);
console.log("Updated", Object.keys(UPDATES).length, "puzzles.");
