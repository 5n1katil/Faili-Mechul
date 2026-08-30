/*
 * simulator_engine.js
 *
 * Verbatim extraction of the scoring/logic core from:
 *   "Faili Mechul · Vaka Simulatoru v29.4 · Otomasyon Temeli"
 *   (source HTML: d2352b78-Faili_Mechul_Vaka_Simulatoru_v29_4_Otomasyon_Temeli.html)
 *
 * Every function body below is copied byte-for-byte from the original
 * <script> block (no paraphrasing, no "cleanup"). Only UI/DOM-bound code
 * (render(), openEnt(), buildMatrix(), runQA(), clipboard/export helpers,
 * document.addEventListener, etc.) and two dead/unused helpers
 * (extractClueConstraints - only ever called from the DOM-bound peekClue(),
 * and patternClash() - a no-op with zero call sites) were excluded because
 * computeQA() does not transitively depend on them.
 *
 * One intentional patch is marked inline below with a comment beginning
 * "PATCHED for unattended n8n automation (2026-08-27)".
 *
 * Original line-range provenance (for audit):
 *   normalize()                         : 636-798
 *   fmFindAsset..fmAudioDeliveryState    : 801-826
 *   entIcon, nm()                       : 829-832
 *   mentionsAny(), resolveId()          : 1698-1775
 *   permutations(), solvabilityCheck(),
 *     norm(), normSolution()            : 1811-2328  (PATCHED inside solvabilityCheck)
 *   spoilerCheck() .. consistencyCheck() : 2330-3483
 *   fmSemanticAudit helpers, semanticAudit,
 *     strictCoreNecessityCheck, etc.    : 3486-3846
 *   contentDepthAndNameCheck .. buildReportText : 3856-4618
 */

function normalize(d){
  const g=(...keys)=>{for(const k of keys){if(d[k]!==undefined)return d[k];}return undefined;};

  // --- entity normalizer: -> {id,name,icon,description,detail,fp} ---
  function normEnt(arr,prefix,fallbackIcon){
    return (arr||[]).map((e,i)=>{
      if(typeof e==='string') return {id:prefix+(i+1),name:e,icon:fallbackIcon,description:'',detail:'',fp:''};
      return {
        id:e.id||prefix+(i+1),
        name:e.name||e.isim||e.ad||String(e),
        icon:cleanIcon(e.icon,fallbackIcon),
        description:e.description||e.aciklama||'',
        detail:e.detail||e.detay||'',
        fp:e.parmakIziDeseni||e.fp||e.fingerprint||''
      };
    });
  }
  // emoji ise kullan; dosya adı/boşsa fallback
  function cleanIcon(ic,fb){
    if(!ic||typeof ic!=='string') return fb;
    if(/\.(png|jpg|jpeg|svg|webp|gif)$/i.test(ic.trim())) return fb; // dosya adı -> fallback
    return ic.trim()||fb;
  }

  const suspects=normEnt(g('suspects','supheliler'),'s','👤');
  const weapons =normEnt(g('weapons','silahlar'),'w','🗡️');
  const locations=normEnt(g('locations','mekanlar'),'l','📍');
  // Üretim varlık manifesti: ses/görsel dosyalarını ipuçlarına güvenli biçimde bağlar.
  const assetManifest=Array.isArray(g('assetManifest','assets','varlikManifesti')) ? g('assetManifest','assets','varlikManifesti') : [];
  const assetById=id=>assetManifest.find(a=>a && (a.assetId===id||a.id===id))||null;

  // id -> name çözücü
  const byId=(arr,id)=>{const m=arr.find(x=>x.id===id);return m?m.name:id;};

  // Standart ipucu türlerini mekanik sanma: type=adli/tanik/kanit -> mechanicType=text.
  // Gemini bazı şemalarda mini oyunu yalnızca `type` ya da `miniGame.type` ile verir; onları güvenli biçimde eşleriz.
  function normalizeMechanic(c){
    const raw=String(c.mechanicType||c.mekanik||c.miniGameType||(c.miniGame&&c.miniGame.type)||'').toLowerCase().trim();
    const typ=String(c.type||c.tur||'').toLowerCase().trim();
    const cipher=['sifreli','sifreli_mesaj','kriptogram','anagram','akrostis','akrostiş','sifre'];
    const fp=['parmak_izi','parmakizi'];
    const profile=['profil_sentezi','profil_eslestirme','profil_eşleştirme','rutin_imzasi','rutin_imzası'];
    if(fp.includes(raw)||fp.includes(typ)) return 'parmak_izi';
    if(profile.includes(raw)||profile.includes(typ)||(c.miniGame&&(profile.includes(String(c.miniGame.type||'').toLowerCase().trim())||c.miniGame.profilSenteziVerisi))) return 'profil_sentezi';
    if(cipher.includes(raw)||cipher.includes(typ)||(c.miniGame&&(c.miniGame.puzzleText||c.miniGame.sifrelenmis))) return 'sifreli_mesaj';
    if(['gorsel_ipucu','ses_kaydi'].includes(raw)) return raw;
    return 'text';
  }

  const clues=(g('clues','ipuclari')||[]).map((c,i)=>{
    const audioAssetId=c.audioAssetId||(c.sesKaydi&&c.sesKaydi.assetId)||(c.miniGame&&c.miniGame.audioAssetId)||'';
    const audioAsset=audioAssetId?assetById(audioAssetId):null;
    return {
    id:c.id||('c'+(i+1)),
    title:c.title||c.baslik||'',
    type:String(c.type||c.tur||'kanit').toLowerCase(),
    text:(c.text||c.metin||'').replace(/^\s*(bonus|ek ipucu|ek)\s*[:：\-–—]\s*/i,''),
    deductionHint:c.deductionHint||c.cikarim||c.deduction||'',
    isBonus:c.isBonus===true||c.bonus===true,
    isCrimeAnchor:c.isCrimeAnchor===true||c.cinayetCapasi===true,
    mechanicType:normalizeMechanic(c),
    pointCost:c.pointCost!=null?c.pointCost:((c.isBonus===true||c.bonus===true)?60:0),
    revealOrder:c.revealOrder!=null?c.revealOrder:(i+1),
    isRevealed:c.isRevealed===true||c.acik===true,
    qaRationale:c.qaRationale||c.qaGerekce||c.mantikGerekcesi||null,
    // QA-only: oyuncunun metinden çıkarabileceği suç bileşenleri.
    // Örn. clue seviyesinde [{kind:"crime_component",component:"location",entityId:"l3",evidence:"..."}]
    qaSemanticFacts:c.qaSemanticFacts||c.semanticFacts||c.visibleFacts||c.oyuncuGorunenOlgular||[],
    // YENİ: yapısal mantık kuralları (solver'ın tek gerçek kaynağı)
    logicRules:Array.isArray(c.logicRules)?c.logicRules:(Array.isArray(c.mantikKurallari)?c.mantikKurallari:null),
    // şifre mini oyun: hem legacy {sifrelenmis,cozulmus,cozumIpucu,aciklama}
    // HEM de Gemini'nin yeni {type,puzzleText,hint,resolvedText,answer} formatı (miniGame objesi)
    sifre:(()=>{
      if(c.sifre) return c.sifre;
      const mg=c.miniGame||c.mini_oyun||null;
      if(mg && (mg.type==='kriptogram'||mg.type==='anagram'||mg.type==='sifreli'||mg.type==='akrostis'||mg.puzzleText||mg.sifrelenmis)){
        return {
          sifrelenmis: mg.puzzleText||mg.sifrelenmis||mg.metin||'',
          sifreleTuru: mg.type||mg.sifreleTuru||'kriptogram',
          cozumIpucu: mg.hint||mg.cozumIpucu||mg.ipucu||'',
          cozulmus: mg.answer||mg.cozulmus||mg.cevap||mg.solution||'',
          aciklama: mg.resolvedText||mg.aciklama||mg.cozumMetni||''
        };
      }
      return null;
    })(),
    // parmak izi: hem legacy {patternType,sahneGorseli} hem yeni {aciklama,izler,sonuc,sahneGorseli}
    parmak_izi:c.parmak_izi||c.parmakIzi||null,
    parmakIziVerisi:c.parmakIziVerisi||(c.miniGame&&(c.miniGame.type==='parmak_izi'||c.miniGame.izler)?c.miniGame:null)||null,
    // profil sentezi: şüpheli kartlarının Tanım/Detay alanlarıyla çoklu işaret eşleştirme
    profilSenteziVerisi:c.profilSenteziVerisi||c.profilSentezi||c.profileSynthesis||(c.miniGame&&(c.miniGame.type==='profil_sentezi'||c.miniGame.evidenceCards||c.miniGame.delilKartlari)?c.miniGame:null)||null,
    // ses kaydı: oyun içi oynatma varlığı + erişilebilir transcript + manifest kimliği
    sesMetni:c.sesMetni||c.ses_metni||(c.sesKaydi&&c.sesKaydi.metin)||(c.miniGame&&c.miniGame.transcript)||'',
    // Ses dosyası daha üretilmemiş olsa bile transcript + hedef yol varsa vaka QA'da
    // içerik bakımından değerlendirilebilir. `audioPlanned` isteğe bağlıdır; pending manifest
    // kaydı da planlı teslim niyeti sayılır (eski JSON'larla tam uyumluluk).
    audioPlanned:c.audioPlanned===true||c.planliSes===true||c.sesPlanlandi===true||!!(audioAsset&&['pending_upload','planned','to_be_recorded','recording'].includes(String(audioAsset.status||'').toLowerCase().replace(/[\s-]/g,'_'))),
    audioFileName:c.audioFileName||c.sesDosyaAdi||(c.sesKaydi&&c.sesKaydi.fileName)||(audioAsset&&audioAsset.fileName)||'',
    audioAssetId,
    audioUrl:c.audioUrl||c.sesUrl||c.sesDosyasi||(c.sesKaydi&&(c.sesKaydi.audioUrl||c.sesKaydi.url))||(c.miniGame&&c.miniGame.audioUrl)||((audioAsset&&((audioAsset.audioUrl)||(audioAsset.publicPath)))||''),
    // Özel ses mini oyunu verisi: örn. telephone_switchboard.
    // Sadece renderer kullanır; ses metni ise QA'da oyuncu-görünür kanıt olarak kalır.
    audioPuzzle:c.audioPuzzle||c.sesHatti||c.ses_hatti||(c.miniGame&&c.miniGame.audioPuzzle)||null,
    // QA-only mekanik sınırı: özel ipucun üst metni, etkileşimin taşıması gereken kanıtı tekrar edemez.
    qaMechanicBoundary:c.qaMechanicBoundary||c.qaMechanicEvidenceBoundary||null,
    // ham miniGame objesini de sakla (mini oyun türü tespiti için)
    miniGame:c.miniGame||c.mini_oyun||null,
    miniGameType:c.miniGameType||(c.miniGame&&c.miniGame.type)||null
  };
  });

  // solution: id-bazlı veya isim-bazlı
  const rawSol=g('solution','cozum')||{};
  let solution=null;
  if(rawSol && Object.keys(rawSol).length){
    if(rawSol.suspectId||rawSol.weaponId||rawSol.locationId){
      solution={
        suspect:byId(suspects,rawSol.suspectId),
        weapon:byId(weapons,rawSol.weaponId),
        location:byId(locations,rawSol.locationId)
      };
    } else {
      solution={
        suspect:rawSol.suspect||rawSol.katil,
        weapon:rawSol.weapon||rawSol.silah,
        location:rawSol.location||rawSol.mekan
      };
    }
  }

  // sayısal zorluk seviyesi: difficulty sayıysa onu, değilse stars'taki dolu yıldız sayısını al
  const rawDiff=g('difficultyLevel','zorlukSeviyesi','difficulty','zorluk');
  const starsStr=g('stars')||'';
  let difficultyLevel=null;
  if(typeof rawDiff==='number') difficultyLevel=rawDiff;
  else if(typeof rawDiff==='string' && /^\d+$/.test(rawDiff.trim())) difficultyLevel=parseInt(rawDiff,10);
  else if(starsStr){ const filled=(starsStr.match(/★/g)||[]).length; if(filled) difficultyLevel=filled; }

  return {
    puzzleId:g('puzzleId','id','vakaId','caseId')||'',
    // v29.4: Vaka tipi normalize sırasında KAYBOLMAZ. Premium/standart kararı
    // zorluk, yıldız veya mini oyun varlığından türetilmez.
    caseTier:g('caseTier','caseType','accessTier','tier','packageTier','monetizationTier')||'',
    isPremium:g('isPremium','premium','paid','isPaid'),
    title:g('title','baslik','isim')||'İsimsiz Vaka',
    subtitle:g('subtitle','altBaslik')||'',
    difficulty:g('difficultyLabel','difficulty','zorluk')||'',
    difficultyLevel,
    specialMechanic:g('specialMechanic','ozelMekanik')||'',
    stars:starsStr,
    story:g('story','olay','hikaye','senaryo')||'',
    atmosphere:g('atmosphere','atmosfer')||'',
    suspects,weapons,locations,clues,solution,assetManifest,
    // QA-only semantic sözleşme: hikâye/atmosferden doğrudan çıkarılabilen kesin suç bilgileri.
    qaSemanticFacts:g('qaSemanticFacts','semanticFacts','visibleFacts','oyuncuGorunenOlgular')||[],
    qaPolicy:g('qaPolicy','qaPolitikasi')||{},
    // V25 QA-only: patern yönetişimi ve kabul edilmiş vaka imzaları.
    qaPattern:g('qaPattern','patternPlan','paternPlani')||null,
    qaPortfolioRegistry:g('qaPortfolioRegistry','portfolioRegistry','portfoyKayitlari')||null,
    qaAiReview:g('qaAiReview','aiReview','yapayZekaDenetimi')||null,
    solutionNarrative:g('solutionNarrative','cozumAnlatimi')||''
  };
}

function fmFindAsset(c,id){
  if(!c||!id||!Array.isArray(c.assetManifest)) return null;
  return c.assetManifest.find(a=>a&&(a.assetId===id||a.id===id))||null;
}
function fmAudioAssetPath(asset){
  return asset ? String(asset.audioUrl||asset.publicPath||asset.url||'').trim() : '';
}
function fmAssetState(asset){
  return fmNorm(asset&&asset.status||'pending_upload').replace(/[\s-]/g,'_');
}
/* Planlı medya: Transcript ve hedef dosya sözleşmesi mevcutsa, MP3 henüz yüklenmemiş olsa
   bile içerik QA'sı gerçek bir ses kaydı varmış gibi değerlendirilir. Yalnız fiziksel teslim
   listesinde hatırlatılır. İstisnai olarak `qaPolicy.blockOnPendingMedia:true` ile ekip,
   medya dosyası teslim edilmeden export'u tekrar kilitleyebilir. */
function fmAudioDeliveryState(c,cl,asset){
  const state=fmAssetState(asset);
  const ready=['ready','uploaded','verified'].includes(state);
  const transcript=String(cl&&cl.sesMetni||'').trim();
  const path=String((cl&&cl.audioUrl)||fmAudioAssetPath(asset)||'').trim();
  const fileName=String((cl&&cl.audioFileName)||(asset&&asset.fileName)||'').trim();
  const explicit=!!(cl&&(cl.audioPlanned===true||cl.planliSes===true||cl.sesPlanlandi===true));
  const manifestPlanned=['pending_upload','planned','to_be_recorded','recording'].includes(state);
  const planned=!ready && (explicit||manifestPlanned) && !!transcript && !!path;
  const blocks=!!(c&&c.qaPolicy&&c.qaPolicy.blockOnPendingMedia===true) && !ready;
  return {state,ready,planned,blocks,transcript:!!transcript,path,fileName};
}

const ICON_S='👤', ICON_L='📍';
// artık her entity objesi kendi .icon'unu taşıyor; bu sadece güvenli erişim
function entIcon(e,fb){return (e&&e.icon)?e.icon:fb;}
function nm(e){return typeof e==='string'?e:(e&&e.name)||'';}

/* ---- yardımcı: bir metinde herhangi bir varlık adı geçiyor mu ---- */
/* V25.2: Rol/unvan sözcükleri (örn. "yönetmen") tek başına kişi adı eşleşmesi sayılmaz.
   Böylece "ödüllü yönetmen" gibi dolaylı metinler Sofia Reyes adı verilmiş gibi yanlış raporlanmaz. */
function mentionsAny(text, names){
  const t=(text||'').toLocaleLowerCase('tr');
  const hits=[];
  // tek başına ayırt edici olmayan jenerik sözcükler (çok-kelimeli adların parçasıyken atlanır)
  const GENERIC=['uşak','komşu','torun','genç','bey','hanım','efendi','rakip','koleksiyoncu',
    'oda','arka','ana','alan','köşe','yapı','kulübe','asmalık','orta','antikacı','hanim',
    'ağır','antika','ipek','tunç','zehirli','sahibi','misafir','çırak','usta',
    'baş','paşa','hafiye','yaver','nöbetçi','muhafız','bekçi','kadın','adam','bay','sayın',
    'reis','ağa','kalfa','hekim','doktor','subay','komutan','uzman','hazinedar','kâtip','katip',
    // milliyet / kurum / mekan / meslek sıfatları (tek başına ayırt edici DEĞİL — bir ADIN parçası olabilir)
    'alman','ingiliz','i̇ngiliz','osmanlı','fransız','rus','avrupalı','yabancı','yerli',
    'tersane','donanma','saray','konak','köşk','daire','ofis','depo','ambar','rıhtım','güverte',
    'mühendis','diplomat','temsilci','tüccar','müteahhit','işçi','asker','memur','görevli',
    // modern kurgu / meslek rolü etiketleri: tek başına karakter adı sayılmaz
    'yönetmen','yonetmen','yapımcı','yapimci','oyuncu','aktris','aktör','aktor','senarist','sunucu','avukat','manken','şarkıcı','sarkici','müzisyen','muzisyen','asistan','makyöz','makyoz','garson','güvenlik','koruma','patron','başrol','basrol','yıldız','yildiz',
    // malzeme/sıfat ön-ekleri (silah ADININ ayırt edici çekirdeği DEĞİL — örn "Deniz Halatı"nda "deniz")
    'deniz','demir','çelik','altın','gümüş','kristal','cam','tahta','gümüşi','tel','kalın','sert',
    'asidik','asit','kimyasal','sıvı','yakıcı','paslı','devasa',
    // yaygın niteleme sıfatları (tek başına bir adı ayırt etmez — "Gizli Mahzen"deki "gizli" gibi)
    'gizli','eski','yeni','karanlık','büyük','küçük','ana','antik','kadim','kutsal','loş','dar','geniş','derin','yüksek','alçak','uzak','yakın'];
  // Türkçe ünsüz yumuşaması: kök sonundaki sert ünsüz, ek alınca yumuşayabilir (k→ğ, p→b, ç→c, t→d).
  const softenStem=(p)=>{
    const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    const last=p.slice(-1);
    const soft={'k':'[kğ]','p':'[pb]','ç':'[çc]','t':'[td]'};
    if(soft[last]) return esc(p.slice(0,-1))+soft[last];
    return esc(p);
  };
  const validSuffix=(sfx)=>{
    if(sfx==='') return true;
    if(sfx.length>3) return false;
    return /^(d[ae]|t[ae]|[ıiuü]n|n[ıi]n|[ıiuü]|y?[ae]|d[ae]n|t[ae]n|y?l[ae]|d[ıi]|t[ıi]|ki|l[ıi]|s[ıi]|n[ıi]|n[ıiuü]n?|y[ıiuü])$/.test(sfx);
  };
  const partHits=(t,p)=>{ // parça metinde geçiyor mu (yumuşama + geçerli ek)
    const re=new RegExp('(?<![\\p{L}\\p{N}])'+softenStem(p)+'([\\p{L}]{0,3})(?![\\p{L}\\p{N}])','u');
    const m=t.match(re);
    return !!(m && validSuffix(m[1]||''));
  };
  names.forEach(n=>{
    if(!n) return;
    const whole=String(n).toLocaleLowerCase('tr');
    // 1) tam ad eşleşmesi (kelime sınırlı + yumuşama + geçerli ek)
    if(whole.length>=4){
      const reW=new RegExp('(?<![\\p{L}\\p{N}])'+softenStem(whole)+'([\\p{L}]{0,3})(?![\\p{L}\\p{N}])','u');
      const mW=t.match(reW);
      if(mW && validSuffix(mW[1]||'')){ hits.push(n); return; }
    }
    const parts=whole.split(/\s+/).filter(x=>x.length>=3);
    const multiWord=parts.length>1;
    if(!multiWord){
      // tek kelimelik ad: parça eşleşmesi yeter
      if(parts[0] && partHits(t,parts[0])) hits.push(n);
      return;
    }
    // ÇOK KELİMELİ AD: tek bir yaygın parça (örn "baş", "paşa") YETMEZ — halüsinasyon önlemi.
    // Ayırt edici (GENERIC olmayan) parçalar arasından en az biri geçmeli;
    // hiç ayırt edici parça yoksa, en az 2 parça birden geçmeli.
    const distinctive=parts.filter(p=>!GENERIC.includes(p));
    if(distinctive.length){
      if(distinctive.some(p=>partHits(t,p))) hits.push(n);
    } else {
      const matchCount=parts.filter(p=>partHits(t,p)).length;
      if(matchCount>=2) hits.push(n);
    }
  });
  return [...new Set(hits)];
}

/* id -> {cat,name} çözücü (s1->Şüpheli, w1->Silah, l1->Mekan) */
function resolveId(c,id){
  let m=c.suspects.find(e=>e.id===id); if(m) return {cat:'S',name:m.name,id};
  m=c.weapons.find(e=>e.id===id);      if(m) return {cat:'W',name:m.name,id};
  m=c.locations.find(e=>e.id===id);    if(m) return {cat:'L',name:m.name,id};
  return null;
}

/* ---- KRİTER 1: ÇÖZÜLEBİLİRLİK SOLVER (40) — KESİN MOD ----
   logicRules'tan okunan matematiksel kısıtlarla ızgarayı çözer.
   Tüm ipuçları açık varsayılır; tek çözüm kalıyorsa 40/40. */
/* ---- KRİTER 1: ÇÖZÜLEBİLİRLİK SOLVER (40) — TAM IZGARA / MURDLE MODU ----
   Çözümü tek bir (katil,silah,mekan) üçlüsü değil, ızgaranın TAMAMINI modelleriz.
   Bir "dünya (world)": her şüpheliye bir silah ve bir mekan atayan eksiksiz eşleştirme.
   3 şüpheli için: silah ataması 3! ve mekan ataması 3! → 6×6 = 36 dünya.
   Her dünya üç üçlüye (triplet) bölünür: {şüpheli, silah, mekan}.
   logicRules bu dünyalar üzerinde test edilir:
     confirm[X,Y]   → X ve Y AYNI üçlüde değilse dünya elenir.
     eliminate[X,Y] → X ve Y AYNI üçlüdeyse dünya elenir.
   Bu sayede masumlara ait eşleşmeler (örn. w3↔l2) çelişki sayılmaz; katili bulmaya yardım eder. */
function permutations(arr){
  if(arr.length<=1) return [arr.slice()];
  const out=[];
  arr.forEach((x,i)=>{
    const rest=arr.slice(0,i).concat(arr.slice(i+1));
    permutations(rest).forEach(p=>out.push([x].concat(p)));
  });
  return out;
}

function solvabilityCheck(c){
  const S=c.suspects, W=c.weapons, L=c.locations;
  const all=c.clues;
  const findings=[];
  let score=0; // güvenli başlangıç; aşağıdaki kod yolları yeniden atar (climax-sonrası kırpması NaN olmasın)

  const sIds=S.map(e=>e.id), wIds=W.map(e=>e.id), lIds=L.map(e=>e.id);
  const nameById=id=>{
    let m=S.find(e=>e.id===id)||W.find(e=>e.id===id)||L.find(e=>e.id===id);
    return m?m.name:id;
  };
  const catById=id=>{
    if(S.find(e=>e.id===id))return 'S';
    if(W.find(e=>e.id===id))return 'W';
    if(L.find(e=>e.id===id))return 'L';
    return null;
  };

  // logicRules'tan kuralları topla — TEMEL (core) ve BONUS ayrı + kaynak meta (revealOrder, isMini)
  const coreRules=[], bonusRules=[];
  let usesLogic=false;
  // X = ÖZEL MEKANİK ipucu (mechanicType "text" değil). climax bu olmalı.
  let specialClue=null, specialIdx=-1;
  // GERÇEK mini oyun mekanikleri (type değerleri DEĞİL — normalize mechanicType'ı type'tan doldurabiliyor)
  const MINI_MECH=['parmak_izi','profil_sentezi','profil_eslestirme','sifreli_mesaj','anagram','gorsel_ipucu','ses_kaydi','sifreli','kriptogram','minigame'];
  const MINI_TYPE=['parmak_izi','profil_sentezi','profil_eslestirme','sifreli','minigame','anagram','kriptogram'];
  all.forEach((cl,idx)=>{
    const mt=(cl.mechanicType||'').toLowerCase();
    const ty=(cl.type||'').toLowerCase();
    const isMini=MINI_MECH.includes(mt)||MINI_TYPE.includes(ty)||!!cl.parmakIziVerisi||!!cl.profilSenteziVerisi||!!cl.sifre||!!cl.miniGameType;
    // Bonus mini oyunlar doğrulayıcıdır; temel çözümün climax'i veya zorunlu anahtarı olamaz.
    if(isMini && !cl.isBonus && !specialClue){ specialClue=cl; specialIdx=idx; }
    if(Array.isArray(cl.logicRules)&&cl.logicRules.length){
      usesLogic=true;
      cl.logicRules.forEach(r=>{
        const action=(r.action||'').toLowerCase();
        const pair=r.pair||r.cift||[];
        if(pair.length===2 && (action==='confirm'||action==='eliminate'||action==='eslesme_yok')){
          const rule={action:action==='eslesme_yok'?'eliminate':action, a:pair[0], b:pair[1],
                      reveal:(cl.revealOrder!=null?cl.revealOrder:idx+1), isMini, isBonus:!!cl.isBonus,
                      clueId:(cl.id||`c${idx+1}`)};
          (cl.isBonus?bonusRules:coreRules).push(rule);
        }
      });
    }
  });
  const allRules=[...coreRules,...bonusRules];

  // 36 dünya üret
  const wPerms=permutations(wIds), lPerms=permutations(lIds);
  const worlds=[];
  wPerms.forEach(wp=>lPerms.forEach(lp=>{
    worlds.push(sIds.map((sid,i)=>({S:sid,W:wp[i],L:lp[i]})));
  }));
  const totalWorlds=worlds.length;

  const sameTriplet=(world,idA,idB)=>{
    const cA=catById(idA), cB=catById(idB);
    if(!cA||!cB) return null;
    return world.some(t=> t[cA]===idA && t[cB]===idB);
  };
  const filterWorlds=(rules)=>worlds.filter(world=>{
    for(const r of rules){
      const same=sameTriplet(world,r.a,r.b);
      if(same===null) continue;
      if(r.action==='confirm' && !same) return false;
      if(r.action==='eliminate' && same) return false;
    }
    return true;
  });
  // geçerli dünyalarda katilin üçlüsünün benzersiz çözüm kümesi
  const sol=c.solution?normSolution(c.solution):null;
  const killerId=sol&&sol.S?(S.find(e=>norm(e.name)===norm(sol.S))||{}).id:null;
  const solutionSet=(vws)=>{
    const set=new Set();
    vws.forEach(world=>{
      if(!world||!world.length) return;
      let t=killerId?world.find(x=>x&&x.S===killerId):null;
      if(!t) t=world[0];
      if(t) set.add(`${t.S}|${t.W}|${t.L}`);
    });
    return set;
  };

  let badRule=null;
  allRules.forEach(r=>{ if(catById(r.a)===null||catById(r.b)===null) badRule=badRule||`${r.a}/${r.b}`; });

  // PATCHED for unattended n8n automation (2026-08-27): no free pass when logicRules is absent
  if(!usesLogic){
    findings.push('HATA: Hiçbir ipucunda "logicRules" yok; tam-ızgara solver çalışamadı. Otomatik/insansız QA denetiminde bu artık 40/40 ön-kabul ALMAZ — çözülebilirlik makine tarafından doğrulanamadı (NO_LOGIC_RULES_UNVERIFIED_BY_AUTOMATION). Vaka otomasyon hattına gönderilmeden önce logicRules eklenmeli.');
    return {score:0,findings,validWorlds:0,totalWorlds,coreWorlds:0,distinctSolutions:0,usesLogic:false,noLogicRules:true,flags:['NO_LOGIC_RULES_UNVERIFIED_BY_AUTOMATION']};
  }

  // ====== DİNAMİK DEDÜKSİYON EKONOMİSİ ======
  // X = özel mekanik (mini oyun) ipucu. Varsa: climax X olmalı.
  //   - X'ten ÖNCEKİ kurallar matrisi tek çözüme DÜŞÜRMEMELİ (Erken Çöküş engeli).
  //   - X dahil edilince matris TEK çözüme ulaşmalı (X zorunlu ve değerli).
  // X yoksa: klasik çift-aşamalı test (temel çözmeli, bonus bozmamalı).
  // (score yukarıda fonksiyon başında tanımlandı)

  // ====== KURAL 0: CİNAYET ÇAPASI (isCrimeAnchor) ZORUNLU ======
  // Matris yalnızca EŞLEŞMELERİ verir (kim-nerede, silah-nerede). Hangi üçlünün CİNAYETE
  // ait olduğunu bilmek için en az bir temel ipucu, cinayet silahını/mekanını/şüphelisini
  // doğrudan suça bağlamalı. Bu, JSON'da "isCrimeAnchor": true ile işaretlenir.
  if(usesLogic){
    const anchors=c.clues.filter(cl=>!cl.isBonus && (cl.isCrimeAnchor===true||cl.cinayetCapasi===true));
    const CRIME_SEMANTIC=/(ölüm|öldür|öldürül|cinayet|maktul|can ver|can çek|son nefes|hayat[ıi]n[ıi] kaybet|katled|kurban|öldürücü|ölümcül|zehirlen|cesedi?|nâ?aş|telef|katlin|suç aleti|cinayet silah|ölüm sebeb|asıl sebep|öldüğü|öldürdü|işlendiği|infaz|suikast|boğul|boğarak|bıçaklan|vurularak|ecel|son buldu|hayatına son|öldürme|faili|sustur)/i;

    if(anchors.length===0){
      // HİKAYE-İÇİ ÇAPA (esneklik): clues'ta isCrimeAnchor yoksa, story metni cinayeti somut bir
      // çözüm öğesine (katil mekanı/silahı/şüphelisi) bağlıyor mu? Bağlıyorsa geçerli sayılır.
      // (Gemini'nin haklı noktası: çapa her zaman bir ipucu olmak zorunda değil.)
      const story=((c.story||'')+' '+(c.atmosphere||'')+' '+(c.subtitle||'')).trim();
      const sl=normSolution(c.solution||{});
      const byName=nm=>{ if(!nm) return null; const e=[...S,...W,...L].find(x=>norm(x.name)===norm(nm)); return e?e.id:null; };
      const kIds=[byName(sl.S)||c.solution?.suspectId, byName(sl.W)||c.solution?.weaponId, byName(sl.L)||c.solution?.locationId].filter(Boolean);
      const kEnts=kIds.map(id=>[...S,...W,...L].find(e=>e.id===id)).filter(Boolean);
      const storyHasCrime=CRIME_SEMANTIC.test(story);
      const storyAnchorsToElement=kEnts.some(e=>mentionsAny(story,[e.name]).length>0);
      if(storyHasCrime && storyAnchorsToElement){
        findings.push(`ⓘ HİKAYE-İÇİ ÇAPA: Hiçbir ipucu "isCrimeAnchor" taşımıyor ama hikaye (story) metni cinayeti somut bir çözüm öğesine bağlıyor — bu geçerli kabul edildi. (Çapa her vakada bir ipucu olmak zorunda değil; bazen hikayede kurulabilir.) Yine de oyuncunun matris çözümünden katili AYIRT edebildiğinden emin ol.`);
        // çapa story'de kuruldu — clue-anchor zorunluluğunu geç, çözülebilirlik analizine devam
      } else {
        findings.push(`HATA: Cinayet Çapası Eksik! Oyuncunun hangi üçlünün katile ait olduğunu bilmesi için cinayet öğesi (silah/mekan/şüpheli) suça bağlanmalı. Bunu YA bir temel ipucuda "isCrimeAnchor": true ile YA da hikaye (story) metninde cinayeti somut bir çözüm öğesine bağlayarak yap. Şu an ne ipuçlarında çapa var ne de hikaye cinayeti bir çözüm öğesine net bağlıyor.`);
        return {score:0,findings,validWorlds:0,totalWorlds,coreWorlds:0,distinctSolutions:0,usesLogic:true,noCrimeAnchor:true};
      }
    }
    // ÇAPA ANLAMSAL DENETİMİ: clue-çapası varsa, metni cinayet semantiği taşımalı.
    if(anchors.length>0){
    const weakAnchor=anchors.find(cl=>!CRIME_SEMANTIC.test(cl.text||''));
    if(weakAnchor){
      const idx=c.clues.indexOf(weakAnchor)+1;
      findings.push(`HATA: Zayıf Çapa Metni! "isCrimeAnchor" ipucusu (İpucu ${idx}), oyuncuya bu eşleşmenin cinayet eylemi olduğunu şüpheye yer bırakmayacak şekilde bildirmek zorundadır. Şu an metin yalnızca iki objeyi bağlıyor ama bunun BİZZAT ölüm/cinayet sebebi olduğunu söylemiyor. Metne olayı suça bağlayan vurucu bir ifade ekle (örn. "maktulün can verdiği", "ölümcül darbenin vurulduğu", "zehirin içirildiği", "cinayetin işlendiği").`);
      return {score:0,findings,validWorlds:0,totalWorlds,coreWorlds:0,distinctSolutions:0,usesLogic:true,weakAnchor:true};
    }
    } // anchors.length>0 sonu

    // NOT: "Muğlak çapa" (cinayet sahnesinin net kurulup kurulmadığı) bir DİL/ANLATIM kalitesi
    // meselesidir; regex ile güvenilir ölçülemez (ya kaçırır ya yanlış-pozitif üretir). Bu yüzden
    // simülatör bunu denetlemez — bunun yerine Gemini üretim promptunda "çapa cinayet sahnesini
    // net kursun" talimatı verilir. Çapanın cinayet SEMANTİĞİ taşıması (yukarıda) zaten şart.

    // ÇAPA METNİ ÇİFT İFŞASI (METİN TABANLI): logicRules kontrolü, çapanın METNİNDE yaptığı
    // ifşayı göremiyor. v7 örneği: çapa metni HEM "cinayetin işlendiği [mekan]" (mekanı olumlu
    // kesinler) HEM "ölüm [silah/yöntem] ile gerçekleşti" (silahı olumlu kesinler) diyor —
    // logicRules sadece bir şüpheli elese de, oyuncu metinden cinayet mekanı+silahını öğreniyor.
    // İyi bir çapa cinayet öğelerinden EN FAZLA BİRİNİ olumlu verir; diğerini elemece bırakır.
    anchors.forEach(cl=>{
      const txt=(cl.text||'');
      const lvl=c.difficultyLevel;
      // (A) cinayet MEKANINI olumlu kuran kalıp: "cinayetin işlendiği ...", "cinayet mahalli",
      //     "cesedi/bedeni ... bulundu", "olay yeri olan ...", "burada öldürüldü/can verdi"
      const SCENE_POS=/(cinayetin (tam olarak )?işlendiği|cinayet mahall|olay (yeri|mahall)i olan|(cansız (bedeni|cesedi)|maktulün (bedeni|cesedi)|ceset).{0,40}(bulundu|yatıyordu|keşfedildi)|burada (öldürül|can ver|katledil|cinayet işlen))/i;
      // (B) cinayet SİLAHINI/yöntemini olumlu kuran kalıp: "ölüm ... ile gerçekleşti/oldu",
      //     "... ile öldürüldü", "ölüm sebebi/silahı ...", "... kullanılarak öldürül/sustur"
      const WEAPON_POS=/(ölüm(ün|ün asıl)?.{0,40}(ile|sıvısıyla|aletiyle|silahıyla|yöntemiyle|kullanılarak|sayesinde).{0,15}(gerçekleş|ol(du|muş)|işlen|netleş)|ile (öldürül|katledil|sustur|zehirlen)|ölüm (sebebi|silahı|nedeni).{0,40}(o |bu |şu )|(kullanılarak|aracılığıyla) (öldürül|sustur|katledil)|deriyi yakan.{0,30}(sıvı|çözücü|asit).{0,20}(gerçekleş|ile|sustur|öldür))/i;
      const scenePos=SCENE_POS.test(txt);
      const weaponPos=WEAPON_POS.test(txt);
      if(scenePos && weaponPos){
        const idx=c.clues.indexOf(cl)+1;
        const isHard=(lvl==null||lvl>=3);
        if(isHard){
          findings.push(`HATA: Çapa Metni Çift İfşası! Çapa ipucunuzun (İpucu ${idx}) METNİ, cinayetin HEM nerede işlendiğini (cinayet mekanını olumlu kuruyor) HEM de hangi silah/yöntemle işlendiğini (cinayet silahını olumlu kuruyor) aynı anda açıkça söylüyor. logicRules tek bir şüpheli elese bile, oyuncu sadece bu metni okuyarak cinayet mekanını ve silahını birden öğreniyor — bu, dedüksiyonun büyük kısmını tek hamlede bitirir. KURAL: Çapa, cinayetle ilişkili öğelerden YALNIZCA BİRİNİ olumlu versin (ya mekanı: "cinayetin işlendiği X"; ya da silahı/yöntemi: "ölüm Y ile gerçekleşti") — diğerini elemece ya da sonraki ipuçlara bırak. Şu an ikisi birden veriliyor; birini çıkar.`);
          return {weak:true};
        } else {
          findings.push(`ⓘ NOT (Kolay Vaka): Çapa metni (İpucu ${idx}) hem cinayet mekanını hem silahını olumlu veriyor. Zorluk ${lvl}★ bir vakada kabul edilebilir, ama premium his için çapanın yalnızca birini olumlu vermesi (diğerini elemece bırakması) dedüksiyonu derinleştirir.`);
        }
      }
    });
    // metin çift ifşası FATAL tetiklendiyse skoru sıfırla
    if(findings.some(f=>/Çapa Metni Çift İfşası/.test(f))){
      return {score:0,findings,validWorlds:0,totalWorlds,coreWorlds:0,distinctSolutions:0,usesLogic:true,anchorTextLeak:true};
    }


    // ÇİFT İFŞA YASAĞI (Kural 2): Çapa ipucu, cinayetle ilişkili bir öğeyi verirken
    // AYNI ipucunun logicRules'u triadın İKİ öğesini birbirine kesin bağlamamalı —
    // ister doğrudan confirm'le, İSTER birden çok eliminate'in tek seçenek bırakmasıyla.
    // Örn: eliminate[w1,l1]+eliminate[w3,l1] -> l1'de tek silah w2 kalır = w2-l1 kesinleşir (gizli confirm).
    const sl=normSolution(c.solution||{});
    const byName=nm=>{ if(!nm) return null; const e=[...S,...W,...L].find(x=>norm(x.name)===norm(nm)); return e?e.id:null; };
    const triadIds=[byName(sl.S),byName(sl.W),byName(sl.L)].filter(Boolean);
    const triad=new Set(triadIds);
    if(triad.size>=2){
      let leak=null;
      anchors.forEach(cl=>{
        if(leak||!Array.isArray(cl.logicRules)||!cl.logicRules.length) return;
        // bu çapanın KENDİ kurallarıyla 36 dünyayı filtrele
        const aRules=cl.logicRules.map(r=>{
          const a=(r.action||'').toLowerCase();
          const pair=r.pair||r.cift||[];
          return pair.length===2?{action:a==='eslesme_yok'?'eliminate':a,a:pair[0],b:pair[1]}:null;
        }).filter(Boolean);
        if(!aRules.length) return;
        const aw=filterWorlds(aRules);
        if(!aw.length) return;
        // triadın her ikili kombinasyonu: tüm geçerli dünyalarda HER ZAMAN birlikte mi? (=kesinleşmiş eşleşme)
        const pairsToCheck=[];
        for(let i=0;i<triadIds.length;i++) for(let j=i+1;j<triadIds.length;j++) pairsToCheck.push([triadIds[i],triadIds[j]]);
        for(const [x,y] of pairsToCheck){
          const alwaysTogether=aw.every(world=>{
            const ox=world.find(o=>o.S===x||o.W===x||o.L===x);
            return ox && (ox.S===y||ox.W===y||ox.L===y);
          });
          if(alwaysTogether){ leak={id:cl.id, pair:[x,y]}; break; }
        }
      });
      if(leak){
        const idx=c.clues.findIndex(cl=>cl.id===leak.id)+1;
        const lvl=c.difficultyLevel;
        // GÜVENLİ VARSAYIM: zorluk belirtilmemişse (null) ZOR kabul et — çift ifşa fatal kalsın.
        // Yalnızca açıkça kolay (1-2) işaretlenmiş vakalar bu kuraldan muaf.
        const isHard = (lvl==null || lvl>=3);
        if(isHard){
          // ZOR/PREMIUM veya zorluğu belirtilmemiş vaka: çapa fazla açık veriyor → FATAL
          const lvlTxt = lvl==null ? 'zorluk belirtilmemiş — premium varsayıldı' : `${lvl}★`;
          findings.push(`HATA: Çift İfşa Sızıntısı! Çapa ipucunuz (İpucu ${idx}), tek başına cinayet triadının iki öğesini (${leak.pair.map(nameById).join(' + ')}) kesin olarak birbirine bağlıyor — ister doğrudan confirm'le, ister birden çok elemenin tek seçenek bırakmasıyla. (${lvlTxt}) Bu, bulmaca örüntüsünü yok eder: cinayeti tek hamlede çözer. Çapa SADECE cinayetle ilişkili TEK bir öğeyi versin (ya mekanı, ya silahı, ya şüpheliyi); o öğeyi başka bir eksene bağlama işini diğer ipuçlara, tercihen ters-çapraz çıkarıma bırak. NOT: Bu vaka gerçekten kolaysa (Çaylak), JSON'a "difficulty": 1 veya 2 ekle — kolay vakalarda çapanın iki öğe vermesi serbesttir.`);
          return {score:0,findings,validWorlds:0,totalWorlds,coreWorlds:0,distinctSolutions:0,usesLogic:true,dualLeak:true};
        } else {
          // AÇIKÇA kolay vaka (zorluk 1-2): çapanın iki öğeyi vermesi kabul edilebilir.
          findings.push(`ⓘ NOT (Kolay Vaka): Çapa ipucu (İpucu ${idx}) cinayet triadının iki öğesini (${leak.pair.map(nameById).join(' + ')}) birden veriyor. Bu, zorluk ${lvl}★ bir vakada kabul edilebilir (kolay vakalar daha doğrudan olabilir). Daha zor/premium bir vaka hedefliyorsan, çapayı tek öğeye indirip kalan bağı diğer ipuçlara yayman dedüksiyonu derinleştirir — ama bu zorunlu değil.`);
        }
      }
    }

    // KURAL 1 + AŞIRI BİLGİ YÜKÜ (tüm STANDART ipuçlar): tek bir temel ipucu, kendi kurallarıyla
    // aynı anda BİRDEN FAZLA ayrı eksen-çiftini (S-W / S-L / W-L) kesinleştirmemeli.
    // (1 çift = sağlıklı dedüksiyon adımı; 2+ çift = aşırı bilgi, örüntü çöker.) Bonus muaf.
    const AX=(id)=> id&&id[0]==='s'?'S':id&&id[0]==='w'?'W':id&&id[0]==='l'?'L':null;
    let overload=null;
    c.clues.forEach(cl=>{
      if(overload||cl.isBonus||!Array.isArray(cl.logicRules)||cl.logicRules.length<2) return;
      const rls=cl.logicRules.map(r=>{
        const a=(r.action||'').toLowerCase(); const pr=r.pair||r.cift||[];
        return pr.length===2?{action:a==='eslesme_yok'?'eliminate':a,a:pr[0],b:pr[1]}:null;
      }).filter(Boolean);
      if(rls.length<2) return;
      const cw=filterWorlds(rls);
      if(!cw.length) return;
      // bu ipucunun kuralları sonrası HANGİ eksen-çiftleri kesinleşti? (tüm dünyalarda hep birlikte)
      const allIds=[...S,...W,...L].map(e=>e.id);
      const lockedAxisPairs=new Set();
      for(let i=0;i<allIds.length;i++) for(let j=i+1;j<allIds.length;j++){
        const x=allIds[i], y=allIds[j];
        if(AX(x)===AX(y)) continue; // aynı kategori değil
        // bu çift, BU ipucunun kurallarında doğrudan/dolaylı geçiyor mu? (sadece kuralın dokunduğu entity'ler)
        const touches=rls.some(r=>[r.a,r.b].includes(x)||[r.a,r.b].includes(y));
        if(!touches) continue;
        const together=cw.every(world=>{ const ox=world.find(o=>o.S===x||o.W===x||o.L===x); return ox&&(ox.S===y||ox.W===y||ox.L===y); });
        if(together){ const axPair=[AX(x),AX(y)].sort().join('-'); lockedAxisPairs.add(axPair); }
      }
      if(lockedAxisPairs.size>=2){ overload={id:cl.id, axes:[...lockedAxisPairs]}; }
    });
    if(overload){
      const idx=c.clues.findIndex(cl=>cl.id===overload.id)+1;
      const axName={'S-W':'şüpheli-silah','L-S':'şüpheli-mekan','L-W':'silah-mekan'};
      const lvl=c.difficultyLevel;
      const isHard=(lvl==null || lvl>=3); // belirtilmemiş = premium varsay
      if(isHard){
        const lvlTxt = lvl==null ? 'zorluk belirtilmemiş — premium varsayıldı' : `${lvl}★`;
        findings.push(`HATA: Aşırı Bilgi Yükü! Temel ipucu ${idx}, tek başına birden fazla ayrı eşleşmeyi (${overload.axes.map(a=>axName[a]||a).join(' + ')}) aynı anda kesinleştiriyor. (${lvlTxt}) Bir temel ipucu en fazla TEK bir eksen eşleşmesi vermeli; iki çift birden vermek vakayı aşırı kolaylaştırır ve dedüksiyon örüntüsünü bozar. Fazla eşleşmeyi ayrı bir ipucuna taşı. (Ek/bonus ipuçları muaf.) NOT: Vaka gerçekten kolaysa "difficulty": 1 veya 2 ekle.`);
        return {score:0,findings,validWorlds:0,totalWorlds,coreWorlds:0,distinctSolutions:0,usesLogic:true,overload:overload.id};
      } else {
        findings.push(`ⓘ NOT (Kolay Vaka): Temel ipucu ${idx} tek başına birden fazla eşleşmeyi (${overload.axes.map(a=>axName[a]||a).join(' + ')}) veriyor. Zorluk ${lvl}★ bir vakada kabul edilebilir. Daha derin dedüksiyon için bu eşleşmeleri ayrı ipuçlara bölebilirsin (zorunlu değil).`);
      }
    }
  }

  // ====== KURAL 1a: (KALDIRILDI) CLIMAX SONRASI STANDART İPUCU YASAĞI ======
  // ESKİDEN: mini oyun standart ipuçların EN SONUNDA olmalı, sonrasında çözüm-kritik standart
  // ipucu varsa -6 puan kesiliyordu. BU KURAL KALDIRILDI çünkü:
  //  (1) "Mini oyunu çeşitlilik için ortaya al" tavsiyesiyle DOĞRUDAN çelişiyordu (paradoks);
  //  (2) Murdle mantığında mini oyun matrisin ortasında olabilir — climax'tan sonra gelen
  //      standart ipuçları kalan belirsizliği çözebilir. "Climax son kilidi açmalı" varsayımı
  //      gereksiz katıydı. Asıl önemli olan: TÜM standart ipuçlar birlikte katil üçlüsünü tek
  //      çözüme indirsin (bunu coreSols zaten kontrol ediyor). Mini oyunun KONUMU serbest.
  // Böylece mini oyun 2., 3., 4. ya da herhangi bir sırada olabilir; puan kırılmaz.

  const coreValid=filterWorlds(coreRules);
  const coreSols=solutionSet(coreValid);

  if(coreValid.length===0){
    score=10;
    findings.push(`ÇELİŞKİ: TEMEL ipuçlarının kuralları birbiriyle çelişiyor — ${totalWorlds} senaryodan 0 geçerli kaldı. Kuralları ve id'leri gözden geçir.`);
    return {score,findings,validWorlds:0,totalWorlds,coreWorlds:0,distinctSolutions:0,usesLogic:true};
  }

  // ====== KURAL 1b: MANTIKSAL FAZLALIK (leave-one-out, TÜM MATRİS bazlı) ======
  // Bir standart ipucu ÇIKARILDIĞINDA ızgarada KESİNLEŞMİŞ (✓/✕) hücre sayısı HİÇ
  // azalmıyorsa, o ipucu hiçbir hücreye katkı yapmıyor demektir → fazlalık (0 puan).
  // ÖNEMLİ: Matrisin TAMAMEN çözülmesi şart DEĞİL. Bir ipucu tek bir masum hücresini bile
  // (kim nerede, hangi silah kimde) netleştiriyorsa DEĞERLİDİR — katili değiştirmese bile.
  // Yalnızca ızgaraya sıfır hücre katan ipucu yakalanır.
  // Climax (mini oyun) ve cinayet çapası (isCrimeAnchor) MUAF.
  if(usesLogic){
    // bir kural kümesinin kesinleştirdiği TÜM hücreleri (3 blok: S-W, S-L, W-L) say
    const decidedCellCount=(rules)=>{
      const vws=filterWorlds(rules);
      if(!vws.length) return -1; // çelişki
      let count=0;
      const pairs=[['S',sIds,'W',wIds],['S',sIds,'L',lIds],['W',wIds,'L',lIds]];
      pairs.forEach(([cA,idsA,cB,idsB])=>{
        idsA.forEach(ia=>idsB.forEach(ib=>{
          let together=0;
          vws.forEach(world=>{ if(world.some(t=>t[cA]===ia&&t[cB]===ib)) together++; });
          // hep birlikte (✓) ya da hiç birlikte değil (✕) = kesinleşmiş hücre
          if(together===vws.length || together===0) count++;
        }));
      });
      return count;
    };
    const fullDecided=decidedCellCount(coreRules); // tüm standart ipuçlarıyla kesinleşen hücre sayısı
    const coreByClue={};
    coreRules.forEach(r=>{ (coreByClue[r.clueId]=coreByClue[r.clueId]||{id:r.clueId,rules:[],isMini:r.isMini}).rules.push(r); });
    const anchorIds=new Set(c.clues.filter(cl=>cl.isCrimeAnchor===true||cl.cinayetCapasi===true).map(cl=>cl.id));
    const testable=Object.values(coreByClue).filter(cc=>!cc.isMini && !anchorIds.has(cc.id));
    let redundant=null;
    for(const cc of testable){
      const without=coreRules.filter(r=>r.clueId!==cc.id);
      const withoutDecided=decidedCellCount(without);
      // bu ipucu çıkınca kesinleşen hücre sayısı AYNI kalıyorsa -> hiç katkı yok -> fazlalık
      if(withoutDecided!==-1 && withoutDecided>=fullDecided){ redundant=cc.id; break; }
    }
    if(redundant){
      // Madde 2: ARTIK FATAL DEĞİL. Matris çözülüyorsa fazlalık 0 puanı hak etmez; puan kır + uyarı ver.
      score=Math.max(0,score-8);
      findings.push(`UYARI: Olası İpucu Fazlalığı. Standart ipucu ${redundant} çıkarıldığında ızgaradaki kesinleşmiş hücre sayısı azalmıyor gibi görünüyor — diğer ipuçları onun bilgisini çapraz elemeyle veriyor olabilir. Vaka yine de çözülüyor; istersen bu ipucunu farklı bir eksene yönelt veya "isBonus: true" yaparak doğrulayıcı/derinlik ipucuna çevir (zorunlu değil).`);
      // not: return YOK — diğer kontroller devam etsin, vaka reddedilmesin
    }

    // ====== KURAL 1c: ÇÖZÜME KATKI (katil üçlüsü bazlı) — TAVSİYE, puan kırmaz ======
    // 1b "ızgaradaki herhangi bir hücreye" katkıyı ölçer. Ama asıl önemli olan: ipucu CEVABI
    // (katil üçlüsünü) bulmaya katkı yapıyor mu? Bir ipucu yalnızca MASUM hücreleri netleştirip
    // katil üçlüsüne hiç dokunmuyorsa, oyuncuyu çözüme yaklaştırmaz (kullanıcı ilkesi: "ızgarayı
    // doldurmak değil, cevabı bulmak"). ANCAK bu, PUAN KIRMAYAN bir TAVSİYEDİR — çünkü "gerçek
    // fazlalık" ile "masum-eleme yoluyla dolaylı katkı yapan meşru ipucu" güvenilir ayrılamıyor;
    // ikisi de katil üçlüsünü tek bırakır. Puan kırarsak meşru çapraz-eleme tasarımları cezalanır.
    // O yüzden: simülatör işaret eder, Gemini değerlendirir; asıl ilke promptta öğretilir.
    if(usesLogic && coreSols && coreSols.size===1){
      const noContrib=[];
      testable.forEach(cc=>{
        const without=coreRules.filter(r=>r.clueId!==cc.id);
        const sols=solutionSet(filterWorlds(without));
        if(sols.size===1) noContrib.push(cc.id);
      });
      if(noContrib.length){
        const lvl=c.difficultyLevel;
        const hard=(lvl==null||lvl>=4);
        const vurgu = hard ? ' Bu ZOR bir vaka (difficulty '+(lvl??'?')+'); zorlukta her standart ipucunun çözüme katkı yapması özellikle önemlidir.' : '';
        // Zor vakada: prefix YOK → realAdvisory olur, "⚙ Geliştirilebilir" tetikler (puan kırmaz ama
        // "kusursuz değil, geliştir" mesajı verir). Kolay vakada: "ⓘ" prefix → sadece bilgi.
        const prefix = hard ? 'TAVSİYE (Çözüme Katkı):' : 'ⓘ ÇÖZÜME KATKI (bilgi):';
        findings.push(`${prefix} ${noContrib.join(', ')} ipucu(su) çıkarılsa da katil üçlüsü (${[...coreSols][0].split('|').map(nameById).join(' · ')}) DEĞİŞMEDEN tek çözüm kalıyor — yani yalnızca masum/yan hücreleri netleştiriyor, cevabı bulmaya doğrudan katkı yapmıyor olabilir.${vurgu} İlke: standart ipuçları cevabı bulmak için gerekli ve yeterli olmalı (ızgarayı doldurmak için değil). İstersen ${noContrib.join(', ')} ipucunu (a) katil üçlüsünü daraltan farklı bir eksene yönelt, VEYA (b) "isBonus": true yaparak ek/derinlik ipucuna çevir. NOT: Bu puan KIRMAZ — bazen masum-eleme yoluyla dolaylı katkı meşrudur; vaka-bazlı değerlendir.`);
      }
    }
  }

  // ====== KURAL 2: NİHAİ SUÇ BAĞLANTISI (katil üçlüsü izole edilmeli) ======
  // Tüm temel ipuçları uygulandığında katilin ÜÇ ekseni de (kim+silah+mekan) tek değere
  // kilitlenmeli. Doğrudan confirm ya da dolaylı eleme fark etmez; önemli olan izolasyon.
  if(usesLogic && c.solution){
    const sol2=normSolution(c.solution);
    const killerId=sol2.S?(S.find(e=>norm(e.name)===norm(sol2.S))||{}).id:null;
    if(killerId){
      // temel-geçerli dünyalarda katilin silahı ve mekanı tek mi?
      const killerWeapons=new Set(), killerLocs=new Set();
      coreValid.forEach(world=>{
        const t=world.find(x=>x.S===killerId);
        if(t){ killerWeapons.add(t.W); killerLocs.add(t.L); }
      });
      const wIso=killerWeapons.size===1, lIso=killerLocs.size===1;
      // not: bu test mini-oyunlu vakalarda climax'ı da kapsasın diye TÜM temel üzerinden bakar;
      // erken çöküş ayrı kuralla zaten denetleniyor. Burada amaç: katil eksenleri açıkta kalmasın.
      if(!wIso || !lIso){
        // sadece bilgi: tek başına temel yetersizse aşağıdaki ana akış zaten kırar.
        // ama katil eksenleri HİÇ izole olmuyorsa (silah ya da mekan birden çok) bu nihai bağ eksik.
        const missing=[!wIso?'cinayet silahı':null,!lIso?'suç mahalli':null].filter(Boolean).join(' ve ');
        findings.push(`ⓘ NİHAİ BAĞ UYARISI: Temel ipuçları katili ${missing} ile kesin izole etmiyor (${!wIso?killerWeapons.size+' silah olasılığı':''}${!wIso&&!lIso?', ':''}${!lIso?killerLocs.size+' mekan olasılığı':''} açık). İpuçları masumların yerini bulmanın ötesinde, katili silahı ve mekanıyla kilitlemeli.`);
      }
    }
  }

  const hasSpecial = specialClue && coreRules.some(r=>r.clueId===specialClue.id);
  if(hasSpecial){
    // X'in reveal sırası
    const xReveal=(specialClue.revealOrder!=null?specialClue.revealOrder:specialIdx+1);
    // Bonus kurallar bu ekonomiye ASLA dahil edilmez: bonus, temel çözüm için gerekli olamaz.
    // Birden fazla mini oyun varsa yalnızca seçilen standart mekanik X'in kendi kuralları uygulanır.
    const beforeX=coreRules.filter(r=>r.clueId!==specialClue.id && r.reveal<xReveal);
    const withX=coreRules.filter(r=>r.clueId===specialClue.id || (r.clueId!==specialClue.id && r.reveal<xReveal));
    const beforeValid=filterWorlds(beforeX);
    const beforeSols=solutionSet(beforeValid);
    const withValid=filterWorlds(withX);
    const withSols=solutionSet(withValid);

    const xName=`#${xReveal} (${(specialClue.mechanicType||'mini oyun')})`;

    // 1) ERKEN ÇÖKÜŞ: X'ten önce katil üçlüsü çözülmüş mü? ARTIK FATAL DEĞİL, PUAN DA KIRMAZ — bilgi.
    if(beforeX.length && beforeSols.size===1){
      // mini oyun, cinayet üçlüsünü değil bir masumu/yan detayı çözüyor olabilir; bu kötü değil.
      // Puanı düşürmüyoruz: mini oyunun konumu serbest, çözülebilirlik korunuyorsa sorun yok.
      findings.push(`ⓘ Mini oyun ${xName}, cinayet üçlüsü temel ipuçlarıyla zaten daraltıldıktan sonra geliyor. Eğer mini oyunu asıl kırılma noktası (climax) yapmak istiyorsan, ondan önceki ipuçların katili tek başına ifşa etmemesini sağla. Ama mini oyun bir masumu mazeretliyor / yan detay veriyor / atmosfer katıyorsa bu tamamen kabul edilebilir — vaka çözülüyor, puan kırılmaz.`);
    }

    // 2) X dahil edilince katil üçlüsü TEK çözüme ulaşıyor mu? (X zorunlu)
    if(withSols.size===1){
      score=40;
      const only=[...withSols][0].split('|');
      const extra = withValid.length>1 ? ` (${withValid.length} tam-düzen var ama hepsi aynı katil üçlüsü — masum dağılımı serbest)` : '';
      findings.push(`DEDÜKSİYON EKONOMİSİ ✓: Özel mekanik ipucu ${xName} matrisin kırılma noktası (climax). Ondan önce ${beforeSols.size} katil-üçlüsü olasılığı açık kalıyor, o çözülünce cinayet üçlüsü tek çözüme iniyor → ${only.map(nameById).join(' · ')}${extra}.`);
    } else if(withSols.size>1){
      // X dahil tek inmiyor AMA tüm standart ipuçlarla (sıra gözetmeksizin) üçlü TEK mi?
      if(coreSols.size===1){
        // ÇÖZÜLEBİLİR ve TAM PUAN: Mini oyun matrisin ortasında olabilir; climax'tan sonra gelen
        // standart ipuçları kalan belirsizliği çözer. "Climax mutlaka son kilit olmalı" varsayımı
        // KALDIRILDI (çeşitlilikle çelişiyordu). Tüm standart ipuçlar birlikte üçlüyü tek çözüme
        // indirdiği sürece mini oyunun konumu serbesttir → tam puan.
        score=40;
        findings.push(`DEDÜKSİYON EKONOMİSİ ✓: Mini oyun ${xName} matrisin ortasında konumlanmış; tek başına üçlüyü kilitlemiyor ama tüm standart ipuçlar BİRLİKTE cinayet üçlüsünü TEK çözüme indiriyor → ${[...coreSols][0].split('|').map(nameById).join(' · ')}. Mini oyunun konumu serbest — climax illa en sonda olmak zorunda değil; bu vaka çözülebilir ve dengeli.`);
      } else {
        score=14;
        findings.push(`İHLAL: Özel mekanik ${xName} dahil edilse bile cinayet üçlüsü tek çözüme inmiyor (tüm standart ipuçlarıyla bile ${coreSols.size} olası katil üçlüsü). Çözüm-kritik bir eşleşme eksik — katili silahı ve mekanıyla kilitleyen bir ipucu ekle.`);
      }
    } else {
      score=12;
      findings.push(`ÇELİŞKİ: Özel mekanik ${xName} kuralları öncekilerle çelişiyor (0 geçerli senaryo).`);
    }

    // bonus doğrulaması (X'ten sonra gelen bonuslar çözümü bozmamalı)
    if(bonusRules.length){
      const allValid=filterWorlds(allRules);
      const allSols=solutionSet(allValid);
      if(allValid.length===0){ score=Math.min(score,12); findings.push(`İHLAL: Bonus kuralları çözümle ÇELİŞİYOR (hepsi eklenince 0 senaryo).`); }
      else if(withSols.size===1 && !(allSols.size===1 && allSols.has([...withSols][0]))){
        score=Math.min(score,16); findings.push(`İHLAL: Bonus kuralları climax çözümünü DEĞİŞTİRİYOR. Bonuslar yalnızca doğrulayıcı olmalı.`);
      } else if(withSols.size===1){ findings.push(`BONUS DOĞRULAMASI ✓: bonuslar climax çözümünü bozmuyor.`); }
    }

  } else {
    // ===== X YOK: klasik çift-aşamalı test =====
    // DOĞRU ÖLÇÜ: katil ÜÇLÜSÜ (katil+silah+mekan) temel ipuçlarla TEK olmalı.
    // Masumların hangi silah/mekanı taşıdığı belirsiz kalabilir — bu bir dedüksiyon
    // boşluğudur, ihlal değil (Murdle "sudoku tamamlama" zorunluluğu yok).
    if(coreSols.size===1){
      score=40;
      const only=[...coreSols][0].split('|');
      const extra = coreValid.length>1 ? ` (matriste ${coreValid.length} olası tam-düzen var ama hepsi aynı katil üçlüsünü veriyor — masum dağılımı oyuncuya bırakılmış, sorun değil)` : '';
      findings.push(`TEMEL ÇÖZÜLEBİLİRLİK ✓: Temel ipuçlarıyla (${coreRules.length} kural) cinayet üçlüsü TEK çözüme iniyor → ${only.map(nameById).join(' · ')}${extra}. Bonuslar gerekmeden katil/silah/mekan kesinleşiyor.`);
    } else {
      // katil üçlüsü hâlâ birden fazla: ASIL bonus bağımlılığı / yetersizlik
      score=20;
      findings.push(`İHLAL: Bonus Bağımlılığı! Temel ipuçları cinayet üçlüsünü (katil+silah+mekan) tek çözüme indirmiyor — ${coreSols.size} farklı katil üçlüsü mümkün. Oyuncu cinayeti ancak CEZALI bonus açarak çözebilir; bu yasak. Bonus kurallarından en az birini standart (isBonus:false) ipucuna taşı ki temel iskelet katili tek başına bulsun.`);
    }
    if(bonusRules.length){
      const allValid=filterWorlds(allRules);
      const allSols=solutionSet(allValid);
      if(allValid.length===0){ score=Math.min(score,12); findings.push(`İHLAL: Bonus kuralları temel çözümle ÇELİŞİYOR.`); }
      else if(coreSols.size===1 && !(allSols.size===1 && allSols.has([...coreSols][0]))){
        score=Math.min(score,16); findings.push(`İHLAL: Bonus kuralları katil üçlüsünü DEĞİŞTİRİYOR.`);
      } else if(coreSols.size===1){ findings.push(`BONUS DOĞRULAMASI ✓: bonuslar katil üçlüsünü bozmuyor, sadece doğruluyor/derinlik katıyor.`); }
    }
  }

  findings.push('✓ Dinamik tam-ızgara (Murdle) solver: özel mekanik climax testi + masum eşleşmeler dahil.');
  if(badRule) findings.push(`⚠ Bir kuralda tanımsız id var (${badRule}); o kural yok sayıldı. id'leri kontrol et.`);

  // --- KURAL 3: ZORLUK DERECESİNE GÖRE DOĞRUDANLIK ---
  // 1 yıldız (Çaylak) vakalarda oyuncu karmaşık çapraz çıkarıma zorlanmamalı:
  // temel ipuçlarında en az 2 doğrudan pozitif eşleşme (confirm) bulunmalı.
  if(c.difficultyLevel===1){
    const coreConfirms=coreRules.filter(r=>r.action==='confirm').length;
    if(coreConfirms<2){
      score=Math.max(0,score-6);
      findings.push(`İHLAL: Çaylak (1★) Doğrudanlık. Bu zorlukta oyuncu karmaşık çapraz çıkarım yapmaya zorlanmamalı; temel ipuçlarında şu an ${coreConfirms} doğrudan eşleşme (confirm) var. En az 2-3 'confirm' (Şüpheli=Mekan / Silah=Mekan gibi) ekleyerek ızgaranın akıcı çözülmesini sağla.`);
    } else {
      findings.push(`✓ Çaylak doğrudanlık: temel ipuçlarında ${coreConfirms} doğrudan eşleşme (confirm) var, 1★ için akıcı.`);
    }
  }

  // çözüm anahtarı tutarlılığı (temel çözüm üzerinden)
  if(sol && coreSols.size===1){
    const only=[...coreSols][0].split('|');
    const gotS=nameById(only[0]), gotW=nameById(only[1]), gotL=nameById(only[2]);
    const mismatch=[];
    if(sol.S && norm(sol.S)!==norm(gotS)) mismatch.push(`katil (anahtar: ${sol.S} / kurallar: ${gotS})`);
    if(sol.W && norm(sol.W)!==norm(gotW)) mismatch.push(`silah (anahtar: ${sol.W} / kurallar: ${gotW})`);
    if(sol.L && norm(sol.L)!==norm(gotL)) mismatch.push(`mekan (anahtar: ${sol.L} / kurallar: ${gotL})`);
    if(mismatch.length){
      score=Math.min(score,18);
      findings.push(`TUTARSIZLIK: solution anahtarı solver'ın bulduğundan farklı → ${mismatch.join('; ')}.`);
    }
  }

  return {score,findings,validWorlds:coreValid.length,totalWorlds,coreWorlds:coreValid.length,distinctSolutions:coreSols.size,usesLogic:true};
}
function norm(s){return String(s||'').toLocaleLowerCase('tr').trim();}
function normSolution(sol){return {S:sol.suspect||sol.katil,W:sol.weapon||sol.silah,L:sol.location||sol.mekan};}

/* ---- KRİTER 2: SPOILER (20) ---- */
function spoilerCheck(c){
  const findings=[]; let penalty=0;
  const sol=c.solution?normSolution(c.solution):{};
  // mini oyunun ÇÖZDÜĞÜ ekseni bul (parmak izi genelde şüpheliyi çözer)
  // ve hangi eksenlerin zaten standart düz-metin ipucunda açıkça verildiğini çıkar
  const revealedByText={S:false,W:false,L:false};
  c.clues.forEach(cl=>{
    const isMiniClue = cl.parmakIziVerisi||cl.parmak_izi||cl.profilSenteziVerisi||cl.sifre;
    if(isMiniClue) return; // mini oyunlar değil, düz ipuçları
    const basis=(cl.deductionHint||'')+' '+(cl.text||'');
    if(sol.W && mentionsAny(basis,[sol.W]).length && /silah|alet|vazo|kanıtl|açıkça/i.test(basis)) revealedByText.W=true;
    if(sol.L && mentionsAny(basis,[sol.L]).length && /mekan|oda|alan|yer|işlend|koptu/i.test(basis)) revealedByText.L=true;
  });

  const isMini=cl=> cl.parmakIziVerisi||cl.parmak_izi||cl.profilSenteziVerisi||cl.sifre;
  c.clues.forEach((cl,i)=>{
    if(!isMini(cl)) return;
    if(cl.isBonus) return; // BONUS İSTİSNASI: cezalı açılan ek ipuçları cevabı net verebilir
    const pv=cl.parmakIziVerisi;
    const ps=cl.profilSenteziVerisi;
    // parmak izi / profil sentezi hangi ekseni çözüyor? hedef şüpheli profildir.
    const solvesAxis = (pv||ps) ? 'S' : null;
    const fields={
      'sifre.aciklama':cl.sifre&&cl.sifre.aciklama,
      'sifre.cozumIpucu':cl.sifre&&cl.sifre.cozumIpucu,
      'parmakIziVerisi.aciklama':pv&&pv.aciklama,
      'parmakIziVerisi.sonuc':pv&&pv.sonuc,
      'parmakIziVerisi.iz.ipucu':pv&&pv.izler&&pv.izler.map(z=>z.ipucu).join(' '),
      'profilSenteziVerisi.aciklama':ps&&ps.aciklama,
      'profilSenteziVerisi.successText':ps&&ps.successText,
      'profilSenteziVerisi.failureText':ps&&ps.failureText,
      'profilSenteziVerisi.delilKartlari':ps&&((ps.delilKartlari||ps.evidenceCards||[]).map(z=>(z.baslik||z.title||'')+' '+(z.metin||z.text||'')).join(' '))
    };
    Object.entries(fields).forEach(([fname,val])=>{
      if(!val)return;
      // çözümün her eksenini kontrol et; ama:
      //  - mini oyunun ÇÖZDÜĞÜ ekseni ele vermek = gerçek spoiler (ağır ceza)
      //  - zaten düz ipuçunda verilmiş ekseni tekrar anmak = spoiler değil
      [['S',sol.S],['W',sol.W],['L',sol.L]].forEach(([ax,name])=>{
        if(!name||!mentionsAny(val,[name]).length) return;
        if(ax===solvesAxis){
          penalty+=10;
          findings.push(`İpucu ${i+1} (${cl.type}) · "${fname}" alanı, mini oyunun ÇÖZMESİ gereken cevabı (${name}) doğrudan ele veriyor. Anayasa md.2 ihlali.`);
        } else if(!revealedByText[ax]){
          penalty+=4;
          findings.push(`İpucu ${i+1} · "${fname}" çözüm öğesi "${name}"i anıyor; bu eksen başka standart ipucuyla netleşmediyse erken bilgi sızdırabilir.`);
        }
        // revealedByText[ax]===true ise: zaten açıkça verilmiş, ceza yok
      });
    });
    // parmak izi 'sonuc' eşleşen deseni doğrudan yazıyor mu?
    if(pv && pv.sonuc && pv.sahneGorseli && norm(pv.sonuc).includes(norm(pv.sahneGorseli))){
      penalty+=8;
      findings.push(`İpucu ${i+1}: parmak izi "sonuc" alanı eşleşen deseni (${pv.sahneGorseli}) açıkça yazıyor — oyuncu eşleştirmeyi yapmadan cevabı görür. "Eşleşme tespit edildi" gibi nötr üslup kullan, desen kodunu yazma.`);
    }
    // şifre cevabı açıklamada/ipucunda mı (ayraç-toleranslı: "S-E-L-İ-M" de yakalanır)
    if(cl.sifre){
      const stripAll=s=>norm(s).replace(/[\s\-_.()]/g,'');
      const ans=cl.sifre.cozulmus?stripAll(cl.sifre.cozulmus):'';
      if(ans && ans.length>=3){
        if(cl.sifre.aciklama && stripAll(cl.sifre.aciklama).includes(ans)){
          penalty+=12;
          findings.push(`İHLAL: Mini Oyun Cevabı Açık. İpucu ${i+1}'in şifre "aciklama" alanı çözümü ("${cl.sifre.cozulmus}") doğrudan veriyor (tireli/boşluklu yazım da sayılır). Açıklama cevabı vermemeli; sadece atmosfer/hikaye detayı içermeli, oyuncu şifreyi kendisi çözmeli.`);
        }
        if(cl.sifre.cozumIpucu && stripAll(cl.sifre.cozumIpucu).includes(ans)){
          penalty+=10;
          findings.push(`İHLAL: Mini Oyun Cevabı Açık. İpucu ${i+1}'in "cozumIpucu" alanı çözümü ("${cl.sifre.cozulmus}") doğrudan içeriyor. İpucu yönlendirici olmalı ama cevabı yazmamalı.`);
        }
      }
      // YENİ: aciklama, bu ipucunun KENDİ logicRules eşleşmesinin entity ADLARINI ele veriyor mu?
      // (akrostiş "ZEKİ KÖŞKTE" çözülmeden, aciklama "Zeki Paşa Çamlık Köşkü'ndeydi" diyorsa = spoiler)
      // Çünkü aciklama oyuncu bulmacayı ÇÖZÜNCE gösterilmeli; çözümün taraflarını önceden anması yasak.
      if(cl.sifre.aciklama && Array.isArray(cl.logicRules)){
        const acik=cl.sifre.aciklama;
        const involvedIds=new Set();
        cl.logicRules.forEach(r=>{ const p=r.pair||r.cift||[]; p.forEach(id=>involvedIds.add(id)); });
        const entById=id=>[...c.suspects,...c.weapons,...c.locations].find(e=>e.id===id);
        const leaked=[];
        involvedIds.forEach(id=>{ const e=entById(id); if(e&&mentionsAny(acik,[e.name]).length) leaked.push(e.name); });
        if(leaked.length){
          penalty+=12;
          findings.push(`İHLAL: Mini Oyun Açıklaması Cevabı Sızdırıyor! İpucu ${i+1}'in şifre "aciklama" alanı, bu bulmacanın çözünce ortaya çıkacak eşleşmesinin taraflarını (${leaked.join(', ')}) ADIYLA yazıyor. Ekran görüntüsünde bu açıklama bulmacanın hemen altında, oyuncu şifreyi çözmeden görünüyor — yani cevabı ele veriyor. "aciklama" alanı yalnızca atmosferik/hikayesel bir kapanış olmalı; çözümün taraflarının (${leaked.join(', ')}) adını ANMAMALI. Örn. "Karanlık koridorların sırrı çözüldü ve gece yaşananlar aydınlandı" gibi nötr bir kapanış kullan; ismi/mekanı yazma. (Alternatif: aciklama'yı yalnızca cevap DOĞRU girildiğinde göster — ama metin yine de ismi içermemeli, güvenli olması için.)`);
        }
      }
    }

    // --- MİNİ OYUN GİZLİLİĞİ: text alanı cevabı ele veriyor mu? ---
    // mechanicType "text" harici (parmak_izi/sifreli_mesaj vb.) ipuçlarının
    // hikaye/text alanı, mini oyunun çözeceği şüpheliyi belli etmemeli.
    const mt=(cl.mechanicType||'').toLowerCase();
    const isRealMini = mt && mt!=='text';
    if(isRealMini && cl.text){
      // mini oyunun işaret ettiği şüpheli: önce eslesme, yoksa solution şüphelisi
      let targetSuspect=null;
      if(pv && pv.izler && pv.izler.length && pv.izler[0].eslesme){
        const m=c.suspects.find(s=>s.id===pv.izler[0].eslesme);
        if(m) targetSuspect=m;
      }
      if(!targetSuspect && ps && ps.answerSuspectId){
        const m=c.suspects.find(s=>s.id===ps.answerSuspectId);
        if(m) targetSuspect=m;
      }
      if(!targetSuspect && sol.S){
        targetSuspect=c.suspects.find(s=>norm(s.name)===norm(sol.S))||null;
      }
      if(targetSuspect){
        const low=norm(cl.text);
        const hit=[];
        // 1) isim kelimeleri (word-boundary, özel isimler yumuşamaz)
        String(targetSuspect.name||'').split(/\s+/).forEach(wd=>{
          if(wd.length<3) return;
          const re=new RegExp('\\b'+norm(wd).replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'i');
          if(re.test(low)) hit.push(wd);
        });
        // 2) meslek/sıfat kökleri — Türkçe ünsüz yumuşamasına dayanıklı (kök prefix, \b'siz son harf)
        // her kök için yumuşayabilen son ünsüzü esnek bırak: çırak->çıra(k|ğ), uşak->uşa(k|ğ)
        const roleStems=['çıra','uşa','antikacı','komşu','torun','koleksiyoncu','hizmetçi','bahçıvan','aşçı','şoför','kâhya','kahya','sekreter','hemşire','doktor','avukat','tüccar','misafir','bekçi','garson'];
        const prof=norm((targetSuspect.description||'')+' '+(targetSuspect.detail||''));
        roleStems.forEach(stem=>{
          // hem profilde hem text'te geçiyorsa = ayırt edici betimleme sızıntısı
          if(prof.includes(stem) && low.includes(stem)) hit.push(stem);
        });
        const uniq=[...new Set(hit)];
        if(uniq.length){
          penalty+=12;
          findings.push(`İHLAL: Mini oyun (${mt}) içeren İpucu ${i+1}'in "text" alanı, bulmacanın sonucunu önceden ele veriyor (geçen ifade: "${uniq.join(', ')}"). Metin sadece oyuncuyu mini oyuna yönlendiren gizemli bir kurgu içermelidir; cevabı oyuncu mini oyunu oynayarak kendi bulmalıdır.`);
        }
      }
      // META-YÖNLENDİRME: text "ne bulacağını" söyleyip gizemi/atmosferi bozuyor mu?
      // (örn. "kişinin adı netleşecek", "ismini ortaya çıkar", "kim olduğu anlaşılacak")
      const metaRe=/(ad[ıi]|ismini?|kim olduğu|kimliği|fail|katil|şüpheli)\s*\w*\s*(netleş|ortaya çıkar|belli ol|anlaşıl|açığa çık|bul|tespit|çözül)/i;
      const metaRe2=/(şüphelinin|failin|katilin)\s+(ad[ıi]|ismi|kimliği)/i;
      if(metaRe.test(cl.text||'')||metaRe2.test(cl.text||'')){
        penalty+=5;
        findings.push(`ATMOSFER: İpucu ${i+1}'in mini oyun metni "ne bulacağını" açıkça söylüyor (örn. "adı netleşecek/ortaya çıkacak"). Bu gerilimi düşürür. Metin sadece hikaye/atmosfer detayı vermeli; oyuncu ne bulacağını mini oyunu oynayarak keşfetmeli. Mekaniğin kendi arayüzü zaten ne yapılacağını gösteriyor.`);
      }
      // cozumIpucu fazla "cevabı tarif eden" mi (şifrelerde)
      if(cl.sifre&&cl.sifre.cozumIpucu){
        if(/(şüphelinin|failin|katilin)\s+(ad[ıi]|ismi)/i.test(cl.sifre.cozumIpucu)){
          penalty+=4;
          findings.push(`ATMOSFER: İpucu ${i+1}'in "cozumIpucu" alanı doğrudan "şüphelinin adını" hedef gösteriyor. İpucu, çözme tekniğini (örn. "eksik harfleri sırayla birleştir") tarif etmeli; ne çıkacağını söylememeli.`);
        }
      }
    }
  });
  const score=Math.max(0,20-penalty);
  if(!findings.length) findings.push('Mini oyun alanlarında çözümü erken ele veren ifade bulunamadı. Temiz.');
  return {score,findings};
}

/* ---- KRİTER 3: ÇEŞİTLİLİK & KALİTE (20) ---- */
/* ---- SOMUT NEDENSELLİK: Tembel/Desteksiz Kanıt Reddi (FATAL) ----
   İKİ KATMANLI:
   1) Bir ipucu metninde AÇIK tembel kalıp ("imkansızdı", "asla yapmazdı", "mümkün değil")
      VARSA ve aynı metinde somut kanıt sinyali (test, rapor, tanık, kayıt, analiz, iz...)
      YOKSA → vaka REDDEDİLİR (fatal, 0 puan).
   2) Tembel kalıp içermeyen özgün edebi metinler dokunulmaz (false positive önleme). */
const _LAZY_RE=[
  /imkans[ıi]zd[ıi]/i, /imkâns[ıi]zd[ıi]/i, /mümkün değild?i/i, /olanaks[ıi]z/i,
  /asla\s+\w*\s*(yapmaz|gitmez|kullanmaz|girmez|dokunmaz|olmaz)/i,
  /(oraya|oray[ıi])\s+(asla\s+)?gitmezdi/i, /asla\s+oraya/i,
  /o silah[ıi]\s+(asla\s+)?kullan[ad]?maz/i, /olmas[ıi]\s+imkâ?ns[ıi]z/i,
  /kesinlikle\s+\w*\s*(yapmaz|gitmez|olmaz|kullanmaz)/i
];
const _CONCRETE_RE=/(test|laboratuvar|laboratuar|analiz|rapor|inceleme|muhaf[ıi]z|bek[çc]i|kay[ıi]t|kamera|tan[ıi]k|şahit|şahid|yeminli|adli|otopsi|balistik|parmak iz|ayak iz|kan iz|partikül|kal[ıi]nt[ıi]|numune|delil|bulgu|teşhis|tespit edil|saptan|doğrulad[ıi]|gözlemlen)/i;

function lazyEvidenceCheck(c){
  const flags=[];
  c.clues.forEach((cl,i)=>{
    if(cl.isBonus) return; // BONUS İSTİSNASI: ek ipuçları doğrudan/net olabilir
    const txt=cl.text||'';
    if(!txt) return;
    // sadece eleme yapan ya da eleme niyetli ipuçlarına odaklan; ama tembel kalıp her yerde sorun
    const lazyHit=_LAZY_RE.map(re=>(txt.match(re)||[])[0]).find(Boolean);
    if(lazyHit){
      const hasConcrete=_CONCRETE_RE.test(txt);
      if(!hasConcrete){
        flags.push(`HATA: Desteksiz ve Tembel Kanıt! İpucu ${i+1}'de "${lazyHit}" gibi soyut/kesinlik kılıfı var ama somut bir adli dayanak (rapor, tanık, analiz, kayıt, iz...) belirtilmemiş. 'İmkansızdı/Asla' gibi ifadeler somut bir bulguya dayandırılmadan kullanılamaz — bir şeyin matriste bir yerde olmaması keyfi yorumla geçiştirilemez.`);
      }
    }
  });
  return {flags,fatal:flags.length>0};
}

/* ---- MİNİ OYUN BÜTÜNLÜĞÜ (FATAL): "ben mini oyunum" diyen ipucu gerçekten oynanabilir veri içermeli ----
   Bir ipucu type/mechanicType/miniGameType ile kriptogram/anagram/şifre/parmak izi vb. iddia ediyorsa,
   o türe ait oynanabilir veri (şifre objesi, parmak izi verisi, çözüm + cevap girişi) ZORUNLUDUR.
   İçi boşsa = sahte mini oyun: premium ekran render edilemez, oyuncuya boş bulmaca gider. */
function miniGameIntegrityCheck(c){
  const flags=[];
  const warnings=[];
  const CIPHER_TYPES=['kriptogram','sifreli','sifreli_mesaj','anagram','akrostis','akrostiş','sifre'];
  const FP_TYPES=['parmak_izi','parmakizi'];
  const PROFILE_TYPES=['profil_sentezi','profil_eslestirme','profil_eşleştirme','rutin_imzasi','rutin_imzası'];
  c.clues.forEach((cl,i)=>{
    const ty=(cl.type||'').toLowerCase();
    const mt=(cl.mechanicType||'').toLowerCase();
    const mgt=(cl.miniGameType||'').toLowerCase();
    const tags=[ty,mt,mgt];
    const claimsMini = tags.includes('minigame')||tags.some(t=>CIPHER_TYPES.includes(t))||tags.some(t=>FP_TYPES.includes(t))||tags.some(t=>PROFILE_TYPES.includes(t))||['gorsel_ipucu','ses_kaydi'].some(t=>tags.includes(t));
    if(!claimsMini) return;

    // hangi tür? ve o türe ait veri var mı?
    const isCipher = tags.some(t=>CIPHER_TYPES.includes(t)) || mgt==='kriptogram';
    const isFp = tags.some(t=>FP_TYPES.includes(t));
    const isProfile = tags.some(t=>PROFILE_TYPES.includes(t));
    const sifre=cl.sifre||cl.sifreVerisi||cl.cipher;
    const fp=cl.parmakIziVerisi||cl.parmakiziVerisi||cl.fingerprintData;
    const ps=cl.profilSenteziVerisi||cl.profilSentezi||cl.profileSynthesis;

    // ortak: cevap girişi için bir çözüm alanı var mı?
    const cozum=(sifre&&(sifre.cozulmus||sifre.cozum||sifre.cevap||sifre.answer))||cl.cozum||cl.cevap||cl.answer||cl.solution;

    if(isProfile){
      const cards=ps&&(ps.delilKartlari||ps.evidenceCards||[]);
      const options=ps&&(ps.optionSuspectIds||ps.options||[]);
      const answer=ps&&(ps.answerSuspectId||ps.eslesme||ps.matchSuspectId);
      if(!ps || !Array.isArray(cards) || cards.length<2 || !Array.isArray(options) || options.length<2 || !answer){
        flags.push(`HATA: Sahte Profil Sentezi! İpucu ${i+1} "profil_sentezi" olarak işaretli ama oynanabilir veri eksik. ZORUNLU: profilSenteziVerisi.delilKartlari (en az 2), optionSuspectIds ve answerSuspectId. Oyuncu şüpheli kartlarındaki Tanım/Detay bilgilerini karşılaştırarak seçim yapabilmelidir.`);
      } else {
        const ids=new Set(c.suspects.map(s=>s.id));
        if(!ids.has(answer) || !options.every(id=>ids.has(typeof id==='string'?id:(id.id||'')))){
          flags.push(`HATA: Profil Sentezi İpucu ${i+1} geçersiz şüpheli kimliği içeriyor. answerSuspectId ve optionSuspectIds yalnız bu vakanın şüpheli id'lerinden oluşmalı.`);
        }
        const target=c.suspects.find(s=>s.id===answer);
        const signals=ps.answerProfileSignals||ps.profileSignals||[];
        if(target && Array.isArray(signals) && signals.length){
          const profile=norm((target.description||'')+' '+(target.detail||''));
          const missing=signals.filter(sig=>!profile.includes(norm(sig)));
          if(missing.length){
            flags.push(`HATA: Profil Sentezi İpucu ${i+1} için answerProfileSignals, hedef şüphelinin oyuncu-görünür profilinde bulunmuyor: ${missing.join(', ')}. Bulmaca kart detaylarından çözülebilmeli; gizli JSON bilgisine dayanamaz.`);
          }
        } else {
          warnings.push(`İpucu ${i+1}: Profil Sentezi answerProfileSignals alanı eksik. Mini oyun oynanabilir; ancak QA, işaretlerin hedef şüpheli kartındaki görünür bilgilerle gerçekten örtüştüğünü otomatik doğrulayamaz.`);
        }
      }
      return;
    }
    if(isFp){
      if(!fp || !(fp.izler||fp.sahneGorseli||fp.eslesme)){
        flags.push(`HATA: Sahte Mini Oyun! İpucu ${i+1} parmak izi mini oyunu olduğunu belirtiyor ama "parmakIziVerisi" (izler/eslesme/sahneGorseli) içermiyor. Oyun motoru parmak izi eşleştirme ekranını render edemez. Ya gerçek parmakIziVerisi ekle (her şüphelinin parmakIziDeseni + sahne izi), ya da bu ipucunu düz metin ipucuna (type: adli/kanit) çevir.`);
      }
      return;
    }
    if(isCipher){
      // şifre objesi VE şifrelenmiş metin gerekli (fatal); çözüm/cevap eksikse fatal değil ama uyarı
      const enc=(sifre&&(sifre.sifrelenmis||sifre.encrypted||sifre.metin))||null;
      if(!sifre || !enc){
        flags.push(`HATA: Sahte Mini Oyun! İpucu ${i+1} "${mgt||'şifre/anagram'}" bulmacası olduğunu iddia ediyor ama oynanabilir bulmaca metni yok (sifre.sifrelenmis / miniGame.puzzleText boş). Şu an sadece düz bir cümle var — oyuncu çözecek bir bulmaca göremez. ZORUNLU: "sifre": { "sifrelenmis": "<bulmaca metni>", "cozulmus": "<doğru cevap>", "cozumIpucu": "<cezalı ipucu>", "aciklama": "<cevap bulununca anlatılan hikaye>" }. Bulmaca eklemeyeceksen type'ı düz ipucuna (adli/kanit/tanik) çevir.`);
      } else if(!cozum){
        // bulmaca metni var, ekran render olur — ama cevap alanı eksik (cevap kontrolü çalışmaz)
        warnings.push(`İpucu ${i+1}: mini oyun bulmacası ("${(enc||'').slice(0,30)}...") var ama DOĞRU CEVAP alanı eksik (sifre.cozulmus / miniGame.answer). Premium ekran görünür ama oyuncunun girdiği cevap doğrulanamaz. Çözülmüş kelimeyi ekle — örn. "cozulmus": "KÖŞK" (oyuncunun yazması gereken cevap).`);
      }
      return;
    }
    // ses kaydı: transcript, bulmacanın erişilebilir içeriğidir; oynatılabilir asset zorunluluğu
    // v15 mechanicContractCheck tarafından production seviyesinde ayrıca denetlenir.
    if(tags.includes('ses_kaydi')){
      const transcript=cl.sesMetni||cl.ses_metni||(cl.sesKaydi&&cl.sesKaydi.metin)||'';
      const media=cl.audioUrl||cl.sesUrl||cl.sesDosyasi||cl.ses||cl.sesVerisi||cl.media;
      if(!transcript && !media){
        flags.push(`HATA: Sahte Ses Kaydı! İpucu ${i+1} ses kaydı olarak işaretli ama ne transcript (sesMetni) ne de ses varlığı tanımlı. Gerçek ses/tutanak verisi ekle ya da düz ipucuna çevir.`);
      }
      return;
    }
    // görsel: en azından bir medya ya da çözüm verisi taşımalı
    if(tags.includes('gorsel_ipucu')){
      const media=cl.gorsel||cl.gorselVerisi||cl.media;
      if(!media && !cozum){
        flags.push(`HATA: Sahte Mini Oyun! İpucu ${i+1} görsel mini oyun olduğunu belirtiyor ama ilgili medya verisi veya çözüm alanı içermiyor. Gerçek veri ekle ya da düz ipucuna çevir.`);
      }
      return;
    }
    // type/mechanicType "miniGame" ama hangi tür belirsiz ve hiç veri yok
    if(tags.includes('minigame') && !sifre && !fp && !ps){
      flags.push(`HATA: Sahte Mini Oyun! İpucu ${i+1} "miniGame" olarak işaretli ama ne şifre (sifre) ne parmak izi (parmakIziVerisi) ne de başka oynanabilir veri içeriyor; sadece düz metin var. Mini oyunun türünü belirt (miniGameType) ve o türe ait oynanabilir veriyi ekle, ya da bu ipucunu düz metin ipucuna çevir.`);
    }
  });
  return {flags,warnings,fatal:flags.length>0};
}

/* ---- PATERN İMZASI: bir vakanın action dizilimi (sıralı, standart ipuçları) ---- */
function patternSignature(c){
  // standart ipuçlarını revealOrder sırasıyla al, her birinin BİRİNCİ action'ını diz
  const std=c.clues.filter(cl=>!cl.isBonus).slice().sort((a,b)=>(a.revealOrder||0)-(b.revealOrder||0));
  const actions=std.map(cl=>{
    const lr=Array.isArray(cl.logicRules)?cl.logicRules:[];
    const a=(lr[0]&&(lr[0].action||'').toLowerCase())||'';
    return a==='eslesme_yok'?'eliminate':a;
  }).filter(Boolean);
  return actions;
}

/* ---- TEK-VAKA MONOTONLUK & RİTİM (stateless) ----
   flags = FATAL (aynı action/type art arda 3+); advisories = tekdüzelik tavsiyeleri (puan kırmaz).
   Amaç: her vakanın kendi içinde çeşitli bir ipucu ritmi olması — "her oyun farklı patern" hedefi. */
function monotonyCheck(c){
  const flags=[];
  const advisories=[];
  const std=c.clues.filter(cl=>!cl.isBonus).slice().sort((a,b)=>(a.revealOrder||0)-(b.revealOrder||0));
  // 1) aynı action art arda 3 kez (FATAL)
  const acts=patternSignature(c);
  let run=1;
  for(let i=1;i<acts.length;i++){
    if(acts[i]===acts[i-1]){ run++; if(run>=3){ flags.push(`HATA: Vaka İçi Monotonluk! Aynı işlem ("${acts[i]}") art arda 3 kez kullanılmış (ipucu dizilimi tekdüze). Matrisi kırma stratejisini çeşitlendir: confirm ve eliminate adımlarını harmanla.`); break; } }
    else run=1;
  }
  // 2) aynı type art arda 3+ (FATAL)
  let trun=1;
  for(let i=1;i<std.length;i++){
    const t=(std[i].type||'').toLowerCase(), p=(std[i-1].type||'').toLowerCase();
    if(t&&t===p){ trun++; if(trun>=3){ flags.push(`HATA: Vaka İçi Monotonluk! Aynı ipucu tipi ("${t}") art arda 3 kez kullanılmış. İpucu tiplerini (adli/kanit/tanik/eleme/sifreli...) organik olarak karıştır.`); break; } }
    else trun=1;
  }
  // 3) ACTION ÇEŞİTLİLİĞİ (tavsiye): standart ipuçların tamamı tek tür action ise ritim düz.
  if(acts.length>=4 && !flags.length){
    const uniqActs=new Set(acts);
    if(uniqActs.size===1){
      advisories.push(`TAVSİYE (Ritim Çeşitliliği): Tüm standart ipuçların aynı işlemi ("${[...uniqActs][0]}") kullanıyor. Sadece confirm ya da sadece eliminate zinciri oyuncuya tekdüze gelir; confirm (doğrudan kilitleme) ile eliminate (eleyerek daraltma) adımlarını harmanlamak dedüksiyon ritmini canlandırır.`);
    }
  }
  // 4) TYPE ÇEŞİTLİLİĞİ (tavsiye): standart ipuçlarda 2'den az farklı tip varsa.
  if(std.length>=4 && !flags.length){
    const uniqTypes=new Set(std.map(cl=>(cl.type||'').toLowerCase()).filter(Boolean));
    if(uniqTypes.size<=1){
      advisories.push(`TAVSİYE (Tip Çeşitliliği): Standart ipuçların neredeyse tek tip ("${[...uniqTypes][0]||'?'}"). Adli rapor + tanık ifadesi + fiziksel kanıt + mini oyun karışımı, her vakaya farklı bir doku verir ve "her oyun benzersiz" hissini güçlendirir.`);
    }
  }
  // V25.2: Vakalar-arası patern özgünlüğü artık patternGovernanceCheck() tarafından
  // kayıt defteri üzerinden ZORUNLU denetlenir. Bu eski yerel öneri, gerçek profil
  // yerine varsayılan "çapa/climax" tahmini üretip yanlış pozitif yaratmamalıdır.
  return {flags,advisories,fatal:flags.length>0};
}

/* ---- 🎭 EDEBİ KALİTE VE KARAKTER DERİNLİĞİ ---- */
// 1) (RET) Robotik/negatif-liste biyografi: description+detail negatif-eleme kalıbı yoğunsa.
// 2) (UYARI) Metin-profil bağı: ipucu metni somut/nadir fiziksel özellik anıyor ama o şüphelinin
//    profilinde geçmiyorsa -> 'olası tutarsızlık' (REDDETME, sadece uyarı).
const _NEG_BIO_RE=[
  /tamamen uzak/i, /hiç (bilmez|bilmeyen|anlamaz|anlamayan|yapmaz|yapmayan)/i,
  /asla (yapmaz|yapmayan|kullanmaz|gitmez|dokunmaz|bilmez)/i,
  /(hiçbir|hiç) (yeteneği|bilgisi|fikri|alakası|ilgisi) (yok|olmayan|bulunmayan)/i,
  /-?den anlamaz/i, /-?e dair hiçbir/i, /beceriksiz/i, /yetersiz/i, /habersiz/i,
  /\bbilmezdi\b/i, /\byapamazd[ıi]\b/i, /\bgitmezdi\b/i, /uzakt[ıi]r\b/i
];
const _PHYS_TRAITS=['bıyık','sakal','topal','kör','şişman','zayıf','uzun boylu','kısa boylu','kel','kambur','tek göz','tek kol','tek bacak','protez','gözlük','peruk','dövme','yara izi','çopur','aksak','sağır','dilsiz','kekeme','şaşı','benli','çilli'];
function literaryQualityCheck(c){
  const flags=[];   // RET
  const warnings=[]; // yumuşak uyarı
  // --- 1) robotik / negatif-liste biyografi ---
  c.suspects.forEach(s=>{
    const bio=((s.description||'')+' '+(s.detail||'')).trim();
    if(!bio) return;
    let neg=0; const samples=[];
    _NEG_BIO_RE.forEach(re=>{ const m=bio.match(re); if(m){ neg++; samples.push(m[0]); } });
    // yoğunluk eşiği: 2+ negatif-eleme kalıbı = robotik liste (tek bir "X'ten korkar" cezalanmaz)
    if(neg>=2){
      flags.push(`${s.name||s.id}: biyografi negatif-eleme listesi gibi yazılmış (${samples.slice(0,2).map(x=>`"${x}"`).join(', ')}...). Karakter, neyi YAPAMADIĞının listesi değil; organik bir kişilik olarak betimlenmeli — zaafları/yetenekleri hikaye içinde hissettirilmeli.`);
    }
  });
  // --- 2) metin-profil bağı (yumuşak): somut fiziksel özellik ipucuda var ama profilde yok ---
  c.clues.forEach((cl,i)=>{
    if(cl.isBonus) return; // bonus muaf (risk/ödül)
    const txt=norm(cl.text||'');
    if(!txt) return;
    _PHYS_TRAITS.forEach(trait=>{
      const tn=norm(trait);
      // ünsüz yumuşamasına dayanıklı arama: "bıyık" -> "bıyığ" da yakalansın (k→ğ, p→b, ç→c, t→d)
      const last=tn.slice(-1);
      const soft={'k':'[kğ]','p':'[pb]','ç':'[çc]','t':'[td]'}[last];
      const stem=soft ? tn.slice(0,-1).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+soft : tn.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
      const re=new RegExp('\\b'+stem,'u');
      if(!re.test(txt)) return;
      const inAnyProfile=c.suspects.some(s=>re.test(norm((s.description||'')+' '+(s.detail||''))));
      if(!inAnyProfile){
        warnings.push(`İpucu ${i+1}: metinde "${trait}" fiziksel özelliği anılıyor ama hiçbir şüphelinin profilinde (description/detail) bu özellik geçmiyor — olası tutarsızlık. İpucu, profile dayanan bir göndermeyse özelliği ilgili şüphelinin biyografisine de ekle.`);
      }
    });
  });
  return {flags,warnings,fatal:flags.length>0};
}
/* NOT: Vakalar-arası localStorage patern geçmişi KALDIRILDI (oturum/cihaz/incognito'da
   güvenilmez çalışıyordu ve JSDOM testlerinde tutarsızdı). Yerine her vakanın KENDİ İÇİNDE
   tekdüze olup olmadığı monotonyCheck + ritimCheck ile güçlü biçimde denetlenir (stateless). */
function patternClash(c){ return null; } // geriye dönük uyumluluk için no-op

/* ---- V25: SUÇ BİLGİSİ KAPSAMI + PORTFÖY BENZERSİZLİK KAPISI ----
   V24'te bazı kalite notları yalnız tavsiye olarak kalıyordu. V25'te:
   1) Tek bir standart ipucu ölüm mahallini ve ölüm yöntemi/silahına dair pozitif ya da
      negatif adli bilgiyi birlikte veremez.
   2) Her yeni vaka, kendi ritim imzasını açıkça beyan eder ve önceki kabul edilmiş
      vakaların portföy defteriyle karşılaştırılır.
   Bunlar artık "kusursuz" etiketi için zorunlu üretim kapılarıdır. */

function fmPatternAxis(c, rule){
  const p=(rule&& (rule.pair||rule.cift)) || [];
  if(!Array.isArray(p)||p.length!==2) return '?';
  const a=fmEntityCategory(c,p[0]), b=fmEntityCategory(c,p[1]);
  const map={suspect:'S',weapon:'W',location:'L'};
  if(!map[a]||!map[b]||a===b) return '?';
  return [map[a],map[b]].sort().join('-');
}
function fmPatternAction(cl){
  const acts=[...new Set(((cl&&cl.logicRules)||[]).map(r=>fmNorm(r.action||'').replace(/[\s-]/g,'_')).filter(Boolean).map(a=>a==='eslesme_yok'?'eliminate':a))];
  if(!acts.length) return '?';
  if(acts.length>1) return 'M';
  return acts[0]==='confirm'?'C':acts[0]==='eliminate'?'E':'?';
}
function fmPatternPrimaryAxis(c,cl){
  const axes=[...new Set(((cl&&cl.logicRules)||[]).map(r=>fmPatternAxis(c,r)).filter(x=>x!=='?'))];
  return axes.length===1?axes[0]:(axes.length?axes.join('+'):'?');
}
function fmStoryCrimeAnchor(c){
  const root=(c.qaSemanticFacts||[]).map(f=>fmNormalizeSemanticFact(c,f,'story')).filter(Boolean);
  const fact=root.find(f=>!f.invalid && f.kind==='crime_component' && String(f.source||'')==='story');
  if(fact) return {source:'story',component:fact.component,entityId:fact.entityId};
  const story=`${c.story||''}\n${c.atmosphere||''}`;
  const crime=/(ölüm|öldür|öldürül|cinayet|maktul|cansız beden|ceset|hayatını kaybet|hareketsiz (?:buldu|bulundu)|kurban)/i.test(story);
  if(!crime) return null;
  const sol=fmExpectedSolutionIds(c);
  const candidates=[
    ['suspect',sol.S],
    ['weapon',sol.W],
    ['location',sol.L]
  ];
  for(const [component,id] of candidates){
    const ent=fmFindEntity(c,id);
    if(ent && fmNorm(ent.name).length>=3 && fmNorm(story).includes(fmNorm(ent.name))) return {source:'story',component,entityId:id};
  }
  return null;
}
function fmPatternProfile(c){
  const core=(c.clues||[]).filter(cl=>!cl.isBonus).slice().sort((a,b)=>(a.revealOrder||0)-(b.revealOrder||0));
  const clueAnchor=core.find(cl=>cl.isCrimeAnchor===true||cl.cinayetCapasi===true);
  let anchor=null;
  if(clueAnchor){
    const facts=(clueAnchor.qaSemanticFacts||[]).map(f=>fmNormalizeSemanticFact(c,f,`clue:${clueAnchor.id}`)).filter(Boolean);
    const f=facts.find(x=>!x.invalid && x.kind==='crime_component');
    anchor={source:`clue:${clueAnchor.id}`,component:f?f.component:'?',entityId:f?f.entityId:''};
  } else {
    anchor=fmStoryCrimeAnchor(c)||{source:'none',component:'?',entityId:''};
  }
  const miniIdx=core.findIndex(cl=>{
    const mt=fmNorm(cl.mechanicType||'').replace(/[\s-]/g,'_');
    return !!cl.parmakIziVerisi||!!cl.profilSenteziVerisi||!!cl.sifre||['parmak_izi','profil_sentezi','profil_eslestirme','sifreli_mesaj','anagram','gorsel_ipucu','ses_kaydi'].includes(mt);
  });
  const mini=miniIdx>=0?core[miniIdx]:null;
  const actions=core.map(fmPatternAction).join('');
  const axes=core.map(cl=>fmPatternPrimaryAxis(c,cl)).join('|');
  const first=core[0]||null;
  const firstSig=first?`${fmNorm(first.type||'?')}:${fmPatternAction(first)}:${fmPatternPrimaryAxis(c,first)}`:'none';
  const miniType=mini?fmNorm(mini.mechanicType||mini.type||'?').replace(/[\s-]/g,'_'):'none';
  const miniSig=mini?`${miniType}@${miniIdx+1}`:'none';
  const anchorSig=`${anchor.source==='story'?'story':anchor.source.startsWith('clue:')?'clue':'none'}:${anchor.component||'?'}`;
  return {
    core,anchor,anchorSig,actions,axes,firstSig,miniSig,
    miniIndex:miniIdx>=0?miniIdx+1:0,miniType,
    skeletonKey:[anchorSig,firstSig,actions,axes,miniSig].join(' | ')
  };
}
function fmRegistryVector(entry){
  const s=(entry&&entry.signature)||entry||{};
  return {
    anchorSig:String(s.anchorSig||s.anchor||'').trim(),
    firstSig:String(s.firstSig||s.first||'').trim(),
    actions:String(s.actions||s.rhythm||'').trim(),
    axes:String(s.axes||'').trim(),
    miniSig:String(s.miniSig||s.mini||'').trim()
  };
}
function fmProfileVector(profile){
  return {anchorSig:profile.anchorSig,firstSig:profile.firstSig,actions:profile.actions,axes:profile.axes,miniSig:profile.miniSig};
}
function crimeScopeCheck(c){
  const flags=[],warnings=[],findings=[];
  const core=(c.clues||[]).filter(cl=>!cl.isBonus);
  const checkVisible=(source,label,text)=>{
    const t=String(text||'');
    // Olay mahallini olumlu kuran cümleler.
    const scene=/(cinayet mahall|olay (yeri|mahall)|maktul(?:ün)? (?:bedeni|cesedi)|cansız beden|ceset|bedeni.{0,45}(bulundu|yatıyordu|keşfedildi)|burada (öldürül|can ver|katledil)|son nefesini.{0,35}(verdi|vermiş))/i.test(t);
    // Pozitif YA DA negatif yöntem bilgisi: "boyunda iz yoktu", "boğulma dışlandı",
    // "zehirlenme tespit edildi" vb. Bir mahallin yanında bu eksen aynı ipucuda verilmemeli.
    const method=/(boynunda.{0,70}(iz|baskı|sürtünme|morluk|ezilme|travma)|(?:bağ|kordon|boğulma|mekanik (?:araç|saldırı)|ateşli silah|kesici|delici|bıçak|ilaç|kapsül|farmakolojik|kimyasal|zehirlenme|zehirli).{0,80}(yok|bulunmadı|saptanmadı|görülmedi|dışlandı|tespit|iz|neden|sebep|araç|yöntem|kullan)|(?:ölüm|öldürül).{0,80}(bağ|kordon|boğulma|ateşli|kesici|ilaç|farmakolojik|kimyasal|zehir))/i.test(t);
    if(scene&&method){
      flags.push(`HATA: Tek İpucuda Çift Suç Bileşeni — ${label}, ölüm/suç mahallini olumlu kurarken aynı görünür metinde ölüm yöntemi veya silahına dair adli bilgi de veriyor. “Nerede oldu?” ile “nasıl/neyle oldu?” ayrı temel ipuçlarına bölünmeli; silahı dışlayan negatif bulgu da ikinci bileşendir.`);
    }
  };
  // Hikâye de oyuncunun gördüğü metindir; aynı çift ifşa hikâyede olursa da engellenir.
  checkVisible('story','Hikâye / atmosfer',`${c.story||''}\n${c.atmosphere||''}`);
  core.forEach((cl,i)=>checkVisible(`clue:${cl.id}`,`İpucu ${i+1}${cl.title?' · '+cl.title:''}`,fmVisibleClueText(cl)));

  // Çapa bir clue üzerinde kuruluyorsa, qaSemanticFacts tam olarak TEK suç bileşeni
  // beyan etmelidir. Böylece "çapa" etiketiyle çoklu ifşa gizlenemez.
  core.filter(cl=>cl.isCrimeAnchor===true||cl.cinayetCapasi===true).forEach((cl)=>{
    const facts=(cl.qaSemanticFacts||[]).map(f=>fmNormalizeSemanticFact(c,f,`clue:${cl.id}`)).filter(f=>f&&!f.invalid&&f.kind==='crime_component');
    const components=[...new Set(facts.map(f=>f.component))];
    if(components.length!==1){
      flags.push(`HATA: Çapa Kapsamı Belirsiz — ${fmSourceLabel(c,`clue:${cl.id}`)} isCrimeAnchor taşıyor ancak qaSemanticFacts içinde tam olarak BİR suç bileşeni (katil, silah veya mekan) beyan etmiyor. Çapa yalnız tek ekseni açmalıdır.`);
    }
  });
  if(!flags.length) findings.push('✓ Suç bilgisi bütçesi: hiçbir görünür metin aynı anda ölüm mahallini ve ölüm yöntemi/silahı eksenini vermiyor.');
  return {flags,warnings,findings};
}

/* ---- v29.4 VAKA TİPİ POLİTİKASI ----
   Standart/ücretsiz vakalarda gelişmiş mekanik zorunlu değildir.
   Premium/ücretli vakalarda en az 1 oynanabilir gelişmiş mekanik zorunludur.
   Benzersizlik bütün oyunun kalite koşuludur: qaPattern + qaPortfolioRegistry her iki tipte de zorunludur.
   Varsayılan: vaka kendini premium ilan etmiyorsa standart kabul edilir.
   KRİTİK: Zorluk, yıldız, specialMechanic veya puzzleId premiumluk kanıtı değildir. */
function fmCaseTier(c){
  const policy=(c&&c.qaPolicy)||{};
  const raw=String(
    policy.caseTier || policy.tier || c.caseTier || c.accessTier || c.tier || c.packageTier || c.monetizationTier || ''
  ).toLocaleLowerCase('tr').trim();
  const normRaw=raw.normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const boolPremium = policy.isPremium===true || c.isPremium===true || c.premium===true || c.paid===true || c.isPaid===true;
  const boolStandard = policy.isPremium===false || c.isPremium===false || c.premium===false || c.paid===false || c.isPaid===false;
  if(boolPremium) return 'premium';
  if(boolStandard) return 'standard';
  if(/premium|paid|ucretli|ücretli|parali|paralı|vip|pro/.test(normRaw)) return 'premium';
  if(/standard|standart|free|ucretsiz|ücretsiz|basic|starter|caylak|çaylak|normal/.test(normRaw)) return 'standard';
  return 'standard';
}
function fmCaseTierLabel(c){ return fmCaseTier(c)==='premium' ? 'Premium / Ücretli' : 'Standart / Ücretsiz'; }
function fmRequiresAdvancedMechanic(c){
  const policy=(c&&c.qaPolicy)||{};
  if(fmCaseTier(c)==='premium') return true;
  if(policy.requireAdvancedMechanic===true||policy.requireMiniGame===true) return true;
  return false;
}
function fmHasAdvancedMechanic(c){
  return (c&&c.clues||[]).some(cl=>{
    const mt=fmNorm(cl.mechanicType||'').replace(/[\s-]/g,'_');
    const ty=fmNorm(cl.type||'').replace(/[\s-]/g,'_');
    return !!cl.parmakIziVerisi || !!cl.profilSenteziVerisi || !!cl.sifre || !!cl.miniGameType ||
      ['parmak_izi','profil_sentezi','profil_eslestirme','sifreli_mesaj','anagram','gorsel_ipucu','ses_kaydi','sifreli','kriptogram','minigame'].includes(mt) ||
      ['parmak_izi','profil_sentezi','profil_eslestirme','sifreli','minigame','anagram','kriptogram'].includes(ty);
  });
}

function patternGovernanceCheck(c){
  const flags=[],warnings=[],findings=[];
  const policy=c.qaPolicy||{};
  const tier=fmCaseTier(c);
  const requireAdvanced=fmRequiresAdvancedMechanic(c);
  const require=true;
  const requireRegistry=true;
  const profile=fmPatternProfile(c);
  const declared=c.qaPattern||null;

  if(requireAdvanced && !fmHasAdvancedMechanic(c)){
    flags.push('HATA: Premium Gelişmiş Mekanik Eksik — Premium/ücretli vakalarda en az 1 oynanabilir gelişmiş ipucu zorunludur (parmak_izi, sifreli_mesaj, ses_kaydi, gorsel_ipucu, profil_sentezi veya özel mini oyun). Standart/ücretsiz vakalarda bu zorunluluk yoktur.');
  } else if(!requireAdvanced && !fmHasAdvancedMechanic(c)){
    findings.push('ⓘ Standart mod: gelişmiş mini mekanik zorunlu değil; vaka yalnız metin tabanlı ipuçlarıyla da tam puan alabilir.');
  }
  if(tier==='standard' && !require && !declared){
    findings.push('ⓘ Özel politika: qaPattern kapısı bu vakada açıkça devre dışı bırakılmıştır. Üretim otomasyonunda tüm vakalar için etkin tutulmalıdır.');
  }
  if(tier==='standard' && !requireRegistry){
    findings.push('ⓘ Özel politika: portföy imza defteri bu vakada açıkça devre dışı bırakılmıştır. Üretim otomasyonunda tüm vakalar için etkin tutulmalıdır.');
  }

  if(require && (!declared||typeof declared!=='object')){
    flags.push('HATA: Patern Yönetişimi Eksik — qaPattern nesnesi yok. Her üretim vakası; çapa kaynağını, ilk ipucu rolünü, varsa mini oyun konumunu ve benzersiz tasarım niyetini beyan etmelidir.');
  } else if(declared){
    const source=String(declared.anchorSource||declared.anchor?.source||'').trim();
    const component=fmCanonicalComponent(declared.anchorComponent||declared.anchor?.component||'');
    const miniId=String(declared.miniGameClueId||declared.miniGame?.clueId||'').trim();
    const role=String(declared.miniGameRole||declared.miniGame?.role||'').trim();
    const intent=String(declared.designIntent||declared.intent||'').trim();
    if(source && source!==(profile.anchor.source==='story'?'story':profile.anchor.source)){
      flags.push(`HATA: qaPattern çapa kaynağı "${source}" diyor; gerçek profil "${profile.anchor.source}" üretiyor. Beyan ile görünür vaka yapısı aynı olmalı.`);
    }
    if(component && component!==profile.anchor.component){
      flags.push(`HATA: qaPattern çapa bileşeni "${component}" diyor; gerçek profil "${profile.anchor.component}" üretiyor.`);
    }
    if(profile.miniIndex && !miniId) flags.push('HATA: qaPattern.miniGameClueId eksik. Mini oyunun ritimdeki yeri açıkça belgelenmeli.');
    if(miniId && !(c.clues||[]).some(cl=>cl.id===miniId)) flags.push(`HATA: qaPattern.miniGameClueId="${miniId}" tanımlı bir ipucu değil.`);
    if(miniId && profile.miniIndex && ((c.clues||[]).filter(cl=>!cl.isBonus).findIndex(cl=>cl.id===miniId)+1)!==profile.miniIndex){
      flags.push(`HATA: qaPattern mini oyun kimliği "${miniId}" gerçek mini oyunla eşleşmiyor.`);
    }
    if(profile.miniIndex && !/^(pivot|climax|misdirection|reversal|verification)$/i.test(role)){
      flags.push('HATA: qaPattern.miniGameRole geçersiz veya eksik. pivot / climax / misdirection / reversal / verification değerlerinden biri olmalı.');
    }
    if(intent.length<24) flags.push('HATA: qaPattern.designIntent çok kısa. Bu vakanın önceki vakalardan nasıl ayrıştığını en az bir net cümleyle belgeleyin.');
  }

  // Tekdüze "güvenli iskelet" artık tavsiye değil: ilk ipucu adli, çapa clue üzerinde
  // eleme, mini oyun son standart ipucunda. Bu kombinasyon portföyde bir kez bile yeterince
  // tanıdık; yeni vakalarda otomatik kabul edilmez.
  const first=profile.core[0];
  const clueAnchor=profile.anchor.source.startsWith('clue:');
  const defaultSafe=!!first && clueAnchor && fmPatternAction(first)==='E' &&
    fmNorm(first.type||'')==='adli' && profile.miniIndex===profile.core.length && profile.miniIndex>0;
  if(defaultSafe){
    flags.push('HATA: Yasak Şablon — ilk ipucu adli/eleme çapasına dayanıyor ve mini oyun son standart ipucuda geliyor. Bu “güvenli iskelet” artık yalnız tavsiye değil; yeni vakalarda çapa, açılış veya mini oyun konumu değiştirilmelidir.');
  }

  const registryRaw=c.qaPortfolioRegistry||c.qaPortfolio||null;
  const entries=Array.isArray(registryRaw)?registryRaw:(registryRaw&&Array.isArray(registryRaw.entries)?registryRaw.entries:[]);
  if(requireRegistry && !entries.length){
    flags.push('HATA: Portföy İmza Defteri Eksik — qaPortfolioRegistry.entries olmadan bu vakanın önceki kabul edilmiş vakalara göre benzersizliği doğrulanamaz. 100/100 ve üretim export’u için kayıt defteri zorunludur.');
  } else if(entries.length){
    const vec=fmProfileVector(profile);
    let checked=0;
    entries.forEach((entry,idx)=>{
      if(!entry||typeof entry!=='object') return;
      if(String(entry.puzzleId||'')===String(c.puzzleId||'')) return;
      const old=fmRegistryVector(entry);
      const fields=['anchorSig','firstSig','actions','axes','miniSig'];
      const same=fields.filter(k=>old[k]&&old[k]===vec[k]);
      if(!old.anchorSig||!old.firstSig||!old.actions||!old.axes||!old.miniSig){
        warnings.push(`Portföy defteri giriş ${idx+1} eksik imza alanı taşıyor; benzersizlik karşılaştırması sınırlı.`);
        return;
      }
      checked++;
      if(same.length===5){
        flags.push(`HATA: Portföy Patern Çakışması — "${entry.title||entry.puzzleId||'önceki vaka'}" ile çapa, açılış, action ritmi, eksen sırası ve mini oyun konumu tamamen aynı. Yeni vaka farklı bir dedüksiyon mimarisi kurmalıdır.`);
      } else if(same.length>=4){
        flags.push(`HATA: Portföy Yakın-Çakışma — "${entry.title||entry.puzzleId||'önceki vaka'}" ile 5 ana patern ekseninin ${same.length}/5’i aynı (${same.join(', ')}). Oyuncu bunu aynı şablonun yeniden giydirilmiş hâli olarak algılar; açılış, ritim, mini oyun slotu veya çapa biçimini değiştir.`);
      }
    });
    if(checked) findings.push(`✓ Portföy benzersizlik kontrolü: ${checked} kabul edilmiş vaka imzasıyla karşılaştırıldı; çakışma yok.`);
  }

  findings.push(`ⓘ V25.2 patern profili: çapa=${profile.anchorSig} · açılış=${profile.firstSig} · ritim=[${profile.actions}] · eksenler=[${profile.axes}] · mini=${profile.miniSig}.`);
  return {flags,warnings,findings,profile};
}

/* ---- İPUCU → KURAL İZLENEBİLİRLİĞİ ----
   NLP ile edebî metnin niyetini güvenilir biçimde 'okumak' yerine, yazarın her kural için
   kanıt köprüsünü açıkça beyan etmesini isteriz. Bu alan oyuncuya/export'a gitmez; QA denetimidir. */
function traceabilityCheck(c){
  const findings=[], warnings=[];
  let mapped=0, ruleCount=0;
  c.clues.forEach((cl,i)=>{
    const rules=Array.isArray(cl.logicRules)?cl.logicRules:[];
    if(!rules.length) return;
    ruleCount+=rules.length;
    const q=cl.qaRationale;
    if(!q || typeof q!=='object'){
      warnings.push(`İpucu ${i+1}: logicRules var ancak qaRationale yok. Bu ipucunun metniyle matristeki etkisi arasındaki köprü insan denetiminde izlenemiyor. Eklenmeli: { matrixEffect, evidenceLink }.`);
      return;
    }
    const effect=String(q.matrixEffect||'').trim();
    const bridge=String(q.evidenceLink||'').trim();
    if(effect.length<8 || bridge.length<18){
      warnings.push(`İpucu ${i+1}: qaRationale eksik/yetersiz. matrixEffect (matriste ne işaretlenir) ve evidenceLink (metindeki somut dayanak) açık yazılmalı.`);
      return;
    }
    const involved=[];
    rules.forEach(r=>(r.pair||r.cift||[]).forEach(id=>{ const ent=resolveId(c,id); if(ent) involved.push(ent.name); }));
    const missing=[...new Set(involved)].filter(name=>!mentionsAny(effect,[name]).length);
    if(missing.length){
      warnings.push(`İpucu ${i+1}: qaRationale.matrixEffect, kuralın taraflarını açıkça adlandırmıyor (${missing.join(', ')}). QA izlenebilirliği için etkiyi 'A ↔ B doğrulanır' ya da 'A ≠ B elenir' biçiminde yaz.`);
      return;
    }
    mapped++;
  });
  if(ruleCount && !warnings.length) findings.push(`✓ İpucu→matris izlenebilirliği: ${mapped}/${mapped} kurallı ipucunun kanıt köprüsü qaRationale ile açık biçimde belgelendi.`);
  else if(ruleCount) findings.push(`ⓘ İpucu→matris izlenebilirliği: ${mapped} kurallı ipucu belgelendi, ${warnings.length} ipucu için yazar denetim notu eksik.`);
  return {findings,warnings};
}

function diversityCheck(c){
  const findings=[]; let score=20;
  const types=c.clues.map(cl=>cl.type);
  const dist={}; types.forEach(t=>dist[t]=(dist[t]||0)+1);
  const uniq=Object.keys(dist).length;
  const hasMech=c.clues.some(cl=>cl.parmakIziVerisi||cl.profilSenteziVerisi||cl.sifre||['parmak_izi','profil_sentezi','sifreli_mesaj','anagram','gorsel_ipucu','ses_kaydi'].includes((cl.mechanicType||'').toLowerCase()));

  findings.push('Tip dağılımı: '+Object.entries(dist).map(([t,n])=>`${t}×${n}`).join(', ')+(hasMech?' (+ mini oyun)':''));

  if(uniq<=1){score-=8;findings.push('Tüm ipuçları aynı tipte — adli / tanık / kanıt harmanı yok, monoton.');}
  else if(uniq===2 && !hasMech){score-=3;findings.push('Sadece 2 ipucu tipi var; bir mini oyun veya üçüncü tip çeşitliliği artırır.');}
  // baskın tip
  const maxT=Math.max(...Object.values(dist));
  if(maxT/c.clues.length>0.7){score-=4;findings.push(`Bir tip (${Object.entries(dist).find(([k,v])=>v===maxT)[0]}) ipuçların %${Math.round(maxT/c.clues.length*100)}'ini oluşturuyor — denge zayıf.`);}

  // tembel/negatif eleme tespiti
  const lazy=[/\bmasum\b/i,/dokunmad[ıi]/i,/suçsuz/i,/\bo yapmad[ıi]\b/i,/katil değil/i,/\bgitmedi\b/i,/\borada değildi\b/i,/yapmam[ıi]ş/i];
  let lazyCount=0;
  c.clues.forEach((cl,i)=>{
    const txt=cl.text||'';
    lazy.forEach(re=>{ if(re.test(txt)){lazyCount++;findings.push(`İpucu ${i+1}: tembel/doğrudan eleme kalıbı ("${(txt.match(re)||[''])[0]}"). Anayasa md.1 ihlali — dolaylı/çevresel anlatım gerek.`);} });
  });
  if(lazyCount) score-=Math.min(8,lazyCount*4);

  // --- YENİ KURAL: SOMUT DELİL İLKESİ ---
  // "Yasaktı", "izin verilmezdi", "sevmezdi" gibi sosyal/psikolojik kurallar delil değildir;
  // katiller kuralları çiğner. Eleme yalnızca fiziksel/tıbbi/uzamsal/adli kanıtla yapılmalı.
  const abstractRules=[
    /yasakt[ıi]/i, /yasaklanm[ıi]ş/i, /kurallara ayk[ıi]r[ıi]/i,
    /izin verilmez/i, /izin verilmiyordu/i, /izni yoktu/i, /müsaade edilmez/i,
    /\bsevmezdi\b/i, /\bistemezdi\b/i, /hoşlanmazd[ıi]/i, /tercih etmezdi/i,
    /adet değildi/i, /görgü kural/i, /ay[ıi]p say[ıi]l/i
  ];
  let abstractCount=0;
  c.clues.forEach((cl,i)=>{
    if(cl.isBonus) return; // BONUS İSTİSNASI
    const txt=cl.text||'';
    abstractRules.forEach(re=>{
      if(re.test(txt)){
        abstractCount++;
        findings.push(`İHLAL: Somut Delil Eksikliği. İpucu ${i+1}'de sosyal/soyut kısıt delil olarak sunulmuş ("${(txt.match(re)||[''])[0]}"). 'Yasaktı', 'izin yoktu' gibi sosyal kuralları delil olarak sunamazsınız — katiller kuralları çiğner. Bir şüpheliyi elemek için fiziksel imkansızlık (boy/kilo/engel), tıbbi durum (alerji/fobi) veya adli kanıt (ayak izi yokluğu, turnike kaydı, kamera) gibi somut deliller kullanın.`);
      }
    });
  });
  if(abstractCount) score-=Math.min(8,abstractCount*4);

  // çok kısa = düşük edebi doku
  const shortOnes=c.clues.filter(cl=>(cl.text||'').length<40).length;
  if(shortOnes){score-=Math.min(4,shortOnes*2);findings.push(`${shortOnes} ipucu çok kısa (<40 karakter) — atmosferik/edebi doku zayıf.`);}

  // --- YENİ KURAL: deductionHint SOKRATİK olmalı, cevabı ele vermemeli ---
  // deductionHint içinde silah/şüpheli/mekan adı geçerse ihlal.
  const allNames=[...c.suspects.map(nm),...c.weapons.map(nm),...c.locations.map(nm)];
  let socraticViol=0, socraticOk=0, hintTooLong=0;
  c.clues.forEach((cl,i)=>{
    if(cl.isBonus) return; // BONUS İSTİSNASI: ek ipuçları cezalı açıldığı için doğrudan isim verebilir
    const hint=cl.deductionHint||'';
    if(!hint.trim()) return;
    const named=mentionsAny(hint,allNames);
    if(named.length){
      socraticViol++;
      findings.push(`İpucu ${i+1}: deductionHint cevabı ele veriyor — "${named.join(', ')}" adı açıkça geçiyor. Yeni kural: çıkarım, ismi söylemek yerine oyuncuyu düşündüren Sokratik soru olmalı (örn. "Listedeki silahlardan hangisi bu kadar ağır olabilir?"). (Not: bu kural yalnızca STANDART ipuçları için; bonus ipuçları doğrudan isim verebilir.)`);
    } else if(/[?]/.test(hint)){
      socraticOk++; // soru içeren, isimsiz: ideal Sokratik biçim
    }
    // Madde 3: aşırı uzun/yönlendirici Sokratik soru cevabı fazla ima eder (zorluğu öldürür)
    const wc=hint.split(/\s+/).filter(Boolean).length;
    if(wc>22){
      hintTooLong++;
      findings.push(`İpucu ${i+1}: deductionHint çok uzun (${wc} kelime). Sokratik soru kısa ve düşündürücü olmalı; uzun, betimleme yüklü sorular cevabı fazlasıyla ima edip zorluğu düşürür. Tek vurucu soruya indir (örn. "Bu kütle hangi silahla taşınabilir?").`);
    }
  });
  if(hintTooLong) score-=Math.min(6,hintTooLong*2);
  if(socraticViol){
    // her ihlal başına 4 puan, bu kriterden en çok 12 puan kır
    score-=Math.min(12,socraticViol*4);
  } else if(c.clues.some(cl=>(cl.deductionHint||'').trim())){
    findings.push(`✓ Tüm deductionHint alanları isim sızdırmıyor (Sokratik kurala uygun)${socraticOk?`, ${socraticOk}'i doğrudan soru biçiminde`:''}.`);
  }

  // --- YENİ KURAL: TEMATİK ÇEŞİTLİLİK ---
  // Bir mini oyun belirli bir temayı (örn. parmak izi) zaten sahipleniyorsa,
  // diğer DÜZ text ipuçları aynı temayı tekrar etmemeli (edebi tekrar + tek-yönlü çıkarım).
  const themeMap={
    'parmak_izi':{ad:'iz/temas',re:/(parmak iz|temas iz|el iz|avuç iz|ayak iz|terlik iz|iz bırak|parmak ucu|elin izi|ayak izine|parmak izine)/i},
    'sifreli_mesaj':{ad:'şifre/kod',re:/(şifre|kod çöz|şifreli mesaj|gizli mesaj|anagram)/i}
  };
  // vakada hangi mini oyun mekanikleri kullanılmış?
  const activeMechs=new Set();
  c.clues.forEach(cl=>{
    const mt=(cl.mechanicType||'').toLowerCase();
    if(mt && mt!=='text' && themeMap[mt]) activeMechs.add(mt);
    if(cl.parmakIziVerisi) activeMechs.add('parmak_izi');
    if(cl.sifre) activeMechs.add('sifreli_mesaj');
  });
  let themeViol=0;
  activeMechs.forEach(mech=>{
    const theme=themeMap[mech]; if(!theme) return;
    c.clues.forEach((cl,i)=>{
      if(cl.isBonus) return; // BONUS İSTİSNASI
      const mt=(cl.mechanicType||'').toLowerCase();
      const isThisMini=(mt===mech)||(mech==='parmak_izi'&&cl.parmakIziVerisi)||(mech==='sifreli_mesaj'&&cl.sifre);
      if(isThisMini) return; // mini oyunun KENDİ metni temayı içerebilir, normal
      if(theme.re.test(cl.text||'')){
        themeViol++;
        findings.push(`İHLAL: Tematik Tekrar. Vakada zaten bir ${theme.ad} mekaniği (mini oyun) var. İpucu ${i+1} aynı temayı tekrar kullanıyor ("${((cl.text||'').match(theme.re)||[''])[0]}") — bu yaratıcılığı düşürür. Alerji, fobiler, boy uzunluğu, fiziksel engeller veya mesleki özellikler gibi farklı ve yenilikçi çıkarım yöntemleri kullanın.`);
      }
    });
  });
  if(themeViol) score-=Math.min(10,themeViol*5);
  else if(activeMechs.size){
    findings.push(`✓ Tematik çeşitlilik korunmuş: mini oyun teması (${[...activeMechs].join(', ')}) düz ipuçlarında tekrarlanmamış.`);
  }

  // --- YENİ KURAL: ŞİFRE KALİTESİ (Cryptic Quality) ---
  // sifreli ipuçlarda şifrelenmiş metin çok kısaysa (basit anagram) yetersiz.
  let cipherViol=0;
  c.clues.forEach((cl,i)=>{
    if(cl.isBonus) return; // BONUS İSTİSNASI
    const isCipher=(cl.type==='sifreli')||(cl.mechanicType||'')==='sifreli_mesaj'||(cl.mechanicType||'')==='anagram'||cl.sifre;
    if(!isCipher) return;
    const enc=(cl.sifre&&cl.sifre.sifrelenmis)||cl.sifrelenmis||'';
    // ayraçları (-, boşluk) çıkarıp gerçek karakter sayısını ölç
    const realLen=String(enc).replace(/[\s\-_.]/g,'').length;
    if(enc && realLen<10){
      cipherViol++;
      findings.push(`İHLAL: Şifre Çok Basit. İpucu ${i+1}'in şifrelenmiş metni yalnızca ${realLen} karakter ("${enc}"). Premium oyunlarda sadece 5 harfi karıştırıp anagram yapmak yetersizdir. Eksik harfler içeren gizemli cümleler, akrostişler veya daha yaratıcı metinsel şifreler kullanın.`);
    }
  });
  if(cipherViol) score-=Math.min(8,cipherViol*5);

  // --- YENİ KURAL: CEZALI İPUCU KALİTESİ (cozumIpucu fazla basit/çocukça olmamalı) ---
  // cozumIpucu artık cezalı bir yardım (UI'da -60sn). Bu yüzden cevabı vermemeli ve
  // "eksik harfleri birleştir" gibi mekaniği aşikar kılan çocukça ifade olmamalı.
  let childishHint=0;
  const CHILDISH=[
    /eksik harfler[ıi]?n?[ıi]?\s*(sırayla\s*)?(birleştir|bir araya getir|yan yana)/i,
    /harfler[ıi]\s*(sırayla\s*)?(birleştir|diz|sırala)/i,
    /baş harfler[ıi]n[ıi]\s*(oku|birleştir|al)/i,
    /tahmin et\b/i, /kolayca\b/i, /sadece\s+\w+\s*birleştir/i,
    /anagram[ıi]?\s*çöz/i, /düz\s*oku/i
  ];
  c.clues.forEach((cl,i)=>{
    if(cl.isBonus) return; // BONUS İSTİSNASI
    if(!cl.sifre||!cl.sifre.cozumIpucu) return;
    const ci=cl.sifre.cozumIpucu;
    const hit=CHILDISH.map(re=>(ci.match(re)||[])[0]).find(Boolean);
    // çok kısa ipucu da çocukça sayılır (< 15 karakter anlamlı içerik)
    const tooShort=ci.replace(/\s/g,'').length<15;
    if(hit||tooShort){
      childishHint++;
      findings.push(`İHLAL: Cezalı İpucu Çok Basit. İpucu ${i+1}'in "cozumIpucu" alanı (${hit?`"${hit}"`:'çok kısa'}) bulmaca mekaniğini fazla aşikar kılıyor. Bu alan artık CEZALI bir yardım (oyuncu -60sn karşılığı açıyor); bu yüzden cevabı kolayca vermemeli, yalnızca düşünme yönünü gösteren sınırlı/üstü kapalı bir destek olmalı. Örn. "eksik harfleri birleştir" yerine "boşluklar, gece yarısı çalınan bir nesnenin sahibini fısıldıyor — dize tamamlanınca isim belirir".`);
    }
  });
  if(childishHint) score-=Math.min(6,childishHint*4);

  // --- YENİ KURAL: METİN AKICILIĞI (Readability) ---
  // Aşırı uzun/ağdalı cümleler oyuncuyu yorar. Cümle başına kelime + sıfat yığını ölç.
  let heavyViol=0;
  c.clues.forEach((cl,i)=>{
    if(cl.isBonus) return; // BONUS İSTİSNASI
    const txt=(cl.text||'').trim();
    if(!txt) return;
    // cümlelere böl
    const sentences=txt.split(/[.!?]+/).map(s=>s.trim()).filter(Boolean);
    const words=txt.split(/\s+/).filter(Boolean);
    const longestSentence=Math.max(0,...sentences.map(s=>s.split(/\s+/).filter(Boolean).length));
    // Edebi/adli dile esneklik: tek cümlede 40+ kelime ağdalı sayılır (35-40 bandı serbest).
    // VEYA ipucu toplam 55+ kelime ve tek soluk (hiç noktayla bölünmemiş).
    const tooLongSentence=longestSentence>40;
    const tooLongTotal=words.length>=55 && sentences.length<=1;
    if(tooLongSentence||tooLongTotal){
      heavyViol++;
      findings.push(`İHLAL: Metin Dili Ağır. İpucu ${i+1} ${tooLongSentence?`tek cümlede ${longestSentence} kelime`:`${words.length} kelimelik tek soluk`} içeriyor (40 kelime üstü). Profesyonel/adli dile izin var ama bu cümle nefes almayı zorlaştıracak kadar uzun — gereksiz sıfat yığınını azalt, cümleyi böl.`);
    }
  });
  if(heavyViol) score-=Math.min(8,heavyViol*4);

  // --- SOFT KURAL: DOLAYLI BETİMLEME (Lore-Based Deduction) ---
  // İpuçlarında şüpheli/silah/mekan adı DOĞRUDAN geçiyorsa: bu bir HATA değildir,
  // çözülebilirliği etkilemez. Yalnızca Kalite/Atmosfer tavsiyesidir (zorluk 3+ için daha önemli).
  // İsim hiç kullanılmamışsa ÖVÜLÜR.
  {
    const lvl=c.difficultyLevel;
    const allNames=[...c.suspects,...c.weapons,...c.locations].map(e=>e.name).filter(Boolean);
    let directCount=0; const directList=[];
    c.clues.forEach((cl,i)=>{
      if(cl.isBonus) return; // BONUS İSTİSNASI: ek ipuçları doğrudan isim verebilir
      // mini oyunların kendi text'i ayrı kuralda denetleniyor; burada düz metne bakıyoruz
      const hits=mentionsAny(cl.text||'', allNames);
      if(hits.length){ directCount++; directList.push(`İpucu ${i+1}: "${hits[0]}"`); }
    });
    if(directCount===0 && c.clues.length){
      // hiç isim yok -> ödüllendir (puan kırma)
      findings.push(`✓ DOLAYLI BETİMLEME (KALİTE): İpuçlarının hiçbiri şüpheli/silah/mekan adını doğrudan vermiyor; çıkarım profil betimlemelerine (lore) dayandırılmış. Premium dedüksiyon kalitesi — tam not.`);
    } else if(directCount>0){
      // zorluk 3+ ise hafif puan kır (en çok -4), düşük zorlukta sadece tavsiye
      if(lvl!=null && lvl>=3){
        score-=Math.min(4,directCount*2);
      }
      const seviye = (lvl!=null&&lvl>=3) ? '(Dedektif+ zorlukta önerilir)' : '(opsiyonel)';
      findings.push(`💡 TAVSİYE ${seviye}: ${directList.slice(0,3).join(', ')}${directList.length>3?` ve ${directList.length-3} ipucu daha`:''} adı doğrudan veriyor. Oyuncu eforunu ve atmosferi artırmak için ismi doğrudan yazmak yerine profil kartındaki betimlemelere atıfta bulunan dolaylı ifadeler tercih edilebilir (örn. "Hazinedar Hüseyin" yerine "kayıp altın meselesinin gölgesindeki adam"). Bu bir kalite önerisidir; çözülebilirliği etkilemez.`);
    }
  }

  // --- SOFT KURAL: İLERİ DEDÜKSİYON (Kategori-Bazlı Dolaylılık) ---
  // YENİLİKÇİ TARZ: Bir ipucu, bir öğenin AYIRT EDİCİ ÇEKİRDEK özelliğini doğrudan vermek yerine
  // (örn. "devasa paslı demir kütle" ≈ silahın adını söylemek), SOYUT bir KATEGORİ kullanır
  // (örn. "ağır bir cisim") ve oyuncuyu profilleri okuyup hangi öğenin o kategoriye girdiğini
  // BULMAYA yönlendirir. Bu, zor vakalarda iki katmanlı dedüksiyon yaratır: önce "hangi öğe bu
  // kategoriye uyar?" (profil okuma) sonra eleme/doğrulama. Premium his verir — AMA yalnızca
  // kategori profillerde TEK bir öğeye ayırt edici şekilde uyuyorsa çözülebilir.
  {
    const lvl=c.difficultyLevel;
    // kategori eksenleri: her biri (ipucu-tetikleyici regex, profil-eşleştirici regex, eksen adı)
    const AXES=[
      {trig:/(ağır|devasa|hantal|kütle|kaldıram|taşıyam|oynatam|güç gerek)/i, prof:/(ağır|devasa|paslı|metal|kütle|demir|taş|mermer|hantal)/i, ad:'ağırlık'},
      {trig:/(yüksek|tırman|merdiven|kat çık|yukarı|zirve|tepe)/i, prof:/(yüksek|tepe|kat|merdiven|tırman|zirve|çatı|platform|kule)/i, ad:'yükseklik'},
      {trig:/(keskin|kes(ic|ik)|sivri|delici|bıçak|batır)/i, prof:/(keskin|kesici|sivri|bıçak|hançer|delici|jilet|kılıç)/i, ad:'keskinlik'},
      {trig:/(sıvı|kimyasal|içil|yutul|solun|buhar|zehir|damla)/i, prof:/(sıvı|kimyasal|çözücü|asit|zehir|içil|damla|şişe|buhar)/i, ad:'kimyasal/sıvı'},
      {trig:/(dar|sıkış|küçük alan|geçit|tünel|delik)/i, prof:/(dar|sıkış|küçük|geçit|tünel|delik|oyuk|hücre)/i, ad:'darlık'},
    ];
    const stdClues=c.clues.filter(cl=>!cl.isBonus);
    let advancedCount=0; let ambiguousAxis=null;
    // her öğenin profilinden AYIRT EDİCİ çekirdek kelimeleri çıkar (3+ harf, ortak kelimeler hariç)
    const STOP=/^(için|olan|olarak|gibi|daha|çok|bir|bu|şu|o|ve|ile|ya|de|da|ki|the|and|ama|fakat|ancak|hem|her|tüm|kadar)$/i;
    const coreWords=e=>{
      const t=((e.name||'')+' '+(e.description||'')).toLocaleLowerCase('tr');
      return [...new Set(t.split(/[^a-zçğıöşü]+/i).filter(wd=>wd.length>=4 && !STOP.test(wd)))];
    };
    stdClues.forEach(cl=>{
      const txt=(cl.text||'').toLocaleLowerCase('tr');
      AXES.forEach(ax=>{
        if(!ax.trig.test(cl.text||'')) return;
        const matching=[...c.weapons,...c.locations].filter(e=>ax.prof.test(e.description||'')||ax.prof.test(e.name||''));
        if(matching.length===1){
          const ent=matching[0];
          // ipucu, bu öğenin profil ÇEKİRDEK kelimelerinden kaçını içeriyor?
          const cores=coreWords(ent);
          const coreHits=cores.filter(wd=>txt.includes(wd)).length;
          // ayırt edici çekirdek kelimeleri AZ içeriyorsa (≤1) = gerçekten soyut kategori kullanmış = İLERİ
          // çok içeriyorsa (2+) = öğeyi doğrudan betimlemiş = dolaylılık DEĞİL
          if(coreHits<=1 && !mentionsAny(cl.text||'',[ent.name]).length){
            advancedCount++;
          }
        } else if(matching.length>1){
          ambiguousAxis=ambiguousAxis||{ad:ax.ad,ents:matching.map(e=>e.name)};
        }
      });
    });
    if(advancedCount>0){
      findings.push(`✓ İLERİ DEDÜKSİYON (PREMIUM): ${advancedCount} ipucu, bir öğenin adını/ayırt edici çekirdeğini doğrudan vermek yerine soyut bir KATEGORİ ("ağır cisim", "yüksek yer" vb.) kullanıp oyuncuyu profilleri okuyup eşleştirmeye yönlendiriyor. Bu, çok katmanlı bir dedüksiyon zinciri yaratır — özellikle zor vakalarda aranan premium kalite. Tam not.`);
      // küçük bir teşvik puanı DEĞİL (zaten 40 tavan); sadece övgü + ⚙ tetiklemez (✓ ile başlıyor).
    }
    if(ambiguousAxis && lvl!=null && lvl>=4){
      findings.push(`ⓘ NOT (Kategori Netliği): "${ambiguousAxis.ad}" kategorisi profillerde birden fazla öğeye uyuyor olabilir (${ambiguousAxis.ents.join(', ')}). Kategori-bazlı dolaylı ipucu kullanıyorsan, o kategorinin profillerde TEK bir öğeye işaret ettiğinden emin ol — yoksa oyuncu hangi öğeyi kastettiğini ayırt edemez. (Çözülebilirlik logicRules'tan korunuyor; bu yalnızca oyuncu-deneyimi notu.)`);
    }
  }

  score=Math.max(0,score);
  return {score,findings};
}

/* ---- KRİTER 4: BONUS DENETİMİ (20) ---- */
function bonusCheck(c){
  const findings=[]; let score=20;
  const bonus=(c.clues||[]).filter(cl=>cl.isBonus);
  const n=bonus.length;
  if(n===0){score=10;findings.push('Hiç bonus (isBonus:true) ipucu yok. Oyuncuya ceza karşılığında doğrudan yardım veren en az 1 ek ipucu beklenir.');}
  else if(n>=1 && n<=3){findings.push(`${n} bonus ipucu var — sayı uygundur; tam puanı işlevsellik belirler.`);}
  else {score=16;findings.push(`${n} bonus ipucu çok fazla; cezalı yardım akışı ana bulmacanın önüne geçebilir.`);}

  /* V24 — BONUS İŞLEVSELLİĞİ
     Ek ipucu yalnız saik/atmosfer anlatmamalı; oyuncunun matriste kullanacağı
     en az bir confirm veya eliminate etkisi vermeli. Saik açıklaması güzel bir
     katmandır ama tek başına "yardımcı ipucu" sayılmaz. */
  const coreRuleKeys=new Set();
  (c.clues||[]).filter(cl=>!cl.isBonus).forEach(cl=>{
    (cl.logicRules||[]).forEach(r=>{
      const p=r.pair||r.cift||[];
      if(Array.isArray(p)&&p.length===2) coreRuleKeys.add(`${String(r.action||'').toLowerCase()}|${p.slice().sort().join('|')}`);
    });
  });
  let inert=[];
  let duplicateOnly=[];
  bonus.forEach(cl=>{
    const usable=(cl.logicRules||[]).filter(r=>{
      const p=r.pair||r.cift||[];
      return Array.isArray(p)&&p.length===2&&['confirm','eliminate','eslesme_yok'].includes(String(r.action||'').toLowerCase());
    });
    const idx=(c.clues||[]).indexOf(cl)+1;
    if(!usable.length){
      inert.push(idx);
      return;
    }
    const allDuplicate=usable.every(r=>{
      const p=r.pair||r.cift||[];
      const key=`${String(r.action||'').toLowerCase()}|${p.slice().sort().join('|')}`;
      return coreRuleKeys.has(key);
    });
    if(allDuplicate) duplicateOnly.push(idx);
  });
  if(inert.length){
    score=Math.min(score,10);
      findings.push(`İHLAL: Matris Etkisi Olmayan Ek İpucu — ${inert.map(i=>'İpucu '+i).join(', ')} yalnız saik/atmosfer anlatıyor; oyuncuya yeni bir ✓ veya ✕ hücresi vermiyor. Her ek ipucu, ana zinciri zorunlu kılmadan çözümü kolaylaştıran en az bir logicRules bağlantısı taşımalıdır.`);
  }
  if(duplicateOnly.length){
    score=Math.min(score,14);
    findings.push(`UYARI: Tekrarlayan Ek İpucu — ${duplicateOnly.map(i=>'İpucu '+i).join(', ')} yalnızca standart ipuçlarında zaten bulunan aynı hücreyi tekrar ediyor. Ek ipucu farklı bir masum eşleşme, silah–mekân bağı veya ek eleme vermelidir.`);
  }
  if(!inert.length&&!duplicateOnly.length&&n>0){
    findings.push('✓ Matris yardımı: her ek ipucu, ana çözümü zorunlu kılmadan oyuncunun ızgarasında kullanılabilir yeni bir çıkarım veriyor.');
  }

  return {score,findings};
}
/* ---- TÜM MOTORU TOPLA ---- */
/* ---- BAŞKOMİSER: MANTIKSAL TUTARLILIK TESTİ ---- 
   Profil bir şüpheliyi/öğeyi olumsuzluyorsa (hiç girmemiş, bilmez, dokunmamış)
   ama bir ipucu onu o eylemle/mekanla ilişkilendiriyorsa -> tutarsızlık (kırmızı bayrak). */
/* ---- YAPISAL BÜTÜNLÜK TARAMASI (FATAL) — üretim güvenlik ağı ----
   Gemini'nin sık yapabileceği, vakayı oyunda ÇÖKERTECEK teknik hataları topluca yakalar:
   geçersiz id referansı, solution-logicRules çelişkisi, eksik icon, duplicate id, revealOrder çakışması.
   Bunlar "kalite" değil "bütünlük" sorunlarıdır — biri varsa vaka oyuna giremez. */
function structuralCheck(c){
  const flags=[];
  const S=c.suspects||[], W=c.weapons||[], L=c.locations||[];
  const allIds=new Set([...S,...W,...L].map(e=>e.id));
  const sIds=new Set(S.map(e=>e.id)), wIds=new Set(W.map(e=>e.id)), lIds=new Set(L.map(e=>e.id));

  // 1) Boş/eksik temel yapı
  if(S.length<3||W.length<3||L.length<3){
    flags.push(`YAPISAL HATA: Eksik ızgara — ${S.length} şüpheli / ${W.length} silah / ${L.length} mekan var. En az 3'er tane (3x3) gerekir.`);
  }
  // Eşleme solver'ı kare Murdle ızgarası varsayar: her eksen aynı sayıda öğe taşımalı.
  if(!(S.length===W.length && W.length===L.length)){
    flags.push(`YAPISAL HATA: Kare olmayan ızgara — ${S.length} şüpheli / ${W.length} silah / ${L.length} mekan. Bu simülatörde her kategori aynı sayıda öğe taşımalıdır (3×3, 4×4 vb.).`);
  }
  const gs=String(c.gridSize||'').trim();
  if(gs){
    const gm=gs.match(/^(\d+)\s*[x×]\s*(\d+)$/i);
    if(!gm) flags.push(`YAPISAL HATA: gridSize="${gs}" okunamadı. "3x3" veya "4x4" biçimini kullan.`);
    else {
      const a=+gm[1],b=+gm[2];
      if(a!==b) flags.push(`YAPISAL HATA: gridSize="${gs}" kare değil. Şüpheli, silah ve mekan eksenleri eş sayıda olmalıdır.`);
      else if(a!==S.length||a!==W.length||a!==L.length) flags.push(`YAPISAL HATA: gridSize="${gs}" ancak veri ${S.length}/${W.length}/${L.length}. gridSize ile üç kategori sayısı aynı olmalı.`);
    }
  }
  // 2) Duplicate id
  const seen=new Set(), dups=new Set();
  [...S,...W,...L].forEach(e=>{ if(seen.has(e.id)) dups.add(e.id); seen.add(e.id); });
  if(dups.size) flags.push(`YAPISAL HATA: Tekrarlanan id'ler: ${[...dups].join(', ')}. Her şüpheli/silah/mekan benzersiz id taşımalı (s1,s2.../w1.../l1...).`);
  // 3) (icon kontrolü kaldırıldı — normalize() eksik icon'a otomatik fallback atadığı için
  //     normalize edilmiş veride bu hiç tetiklenmez; ham doğrulama gereksiz gürültü üretirdi.)
  // 4) logicRules'ta GEÇERSİZ id referansı
  const badRefs=new Set();
  (c.clues||[]).forEach((cl,i)=>{
    if(!Array.isArray(cl.logicRules)) return;
    cl.logicRules.forEach(r=>{ (r.pair||r.cift||[]).forEach(id=>{ if(id&&!allIds.has(id)) badRefs.add(`${id} (İpucu ${i+1})`); }); });
  });
  if(badRefs.size) flags.push(`YAPISAL HATA: logicRules'ta tanımsız id referansı: ${[...badRefs].slice(0,4).join(', ')}. Bir kural, listede olmayan bir id'ye atıfta bulunuyor — yazım hatası ya da eksik tanım. Solver bu kuralı işleyemez.`);
  // 5) logicRules pair AYNI eksende mi? (örn iki silah birbiriyle confirm — anlamsız)
  (c.clues||[]).forEach((cl,i)=>{
    if(!Array.isArray(cl.logicRules)) return;
    cl.logicRules.forEach(r=>{
      const p=r.pair||r.cift||[]; if(p.length!==2) return;
      const ax=id=>sIds.has(id)?'S':wIds.has(id)?'W':lIds.has(id)?'L':'?';
      if(ax(p[0])!=='?' && ax(p[0])===ax(p[1])){
        flags.push(`YAPISAL HATA: İpucu ${i+1}'de bir kural aynı eksenden iki öğeyi (${p.join(', ')}) eşleştiriyor. confirm/eliminate yalnızca FARKLI eksenler arası olur (şüpheli↔silah, şüpheli↔mekan, silah↔mekan).`);
      }
    });
  });
  // 6) solution geçerli mi + logicRules ile çelişmiyor mu
  if(c.solution){
    const byName=nm=>{ if(!nm) return null; const e=[...S,...W,...L].find(x=>norm(x.name)===norm(nm)); return e?e.id:null; };
    // normalize sonrası solution {suspect:isim} olabilir; ham JSON'da {suspectId:'s1'} olabilir — ikisini de çöz
    const sl=normSolution(c.solution);
    const kS=c.solution.suspectId||byName(sl.S)||byName(c.solution.suspect);
    const kW=c.solution.weaponId||byName(sl.W)||byName(c.solution.weapon);
    const kL=c.solution.locationId||byName(sl.L)||byName(c.solution.location);
    if(!kS||!sIds.has(kS)) flags.push(`YAPISAL HATA: solution.suspectId geçersiz ya da tanımsız (${kS||'?'}). Çözüm geçerli bir şüpheliyi işaret etmeli.`);
    if(!kW||!wIds.has(kW)) flags.push(`YAPISAL HATA: solution.weaponId geçersiz ya da tanımsız (${kW||'?'}).`);
    if(!kL||!lIds.has(kL)) flags.push(`YAPISAL HATA: solution.locationId geçersiz ya da tanımsız (${kL||'?'}).`);
    // çözüm çifti, herhangi bir ipucunun ELIMINATE'i ile çelişiyor mu? (katil üçlüsünü eleyen kural = ölümcül çelişki)
    if(kS&&kW&&kL){
      const triadPairs=[[kS,kW],[kS,kL],[kW,kL]];
      (c.clues||[]).forEach((cl,i)=>{
        if(!Array.isArray(cl.logicRules)) return;
        cl.logicRules.forEach(r=>{
          const a=(r.action||'').toLowerCase(); if(a!=='eliminate'&&a!=='eslesme_yok') return;
          const p=r.pair||r.cift||[]; if(p.length!==2) return;
          const hit=triadPairs.some(tp=>(tp[0]===p[0]&&tp[1]===p[1])||(tp[0]===p[1]&&tp[1]===p[0]));
          if(hit) flags.push(`YAPISAL HATA: İpucu ${i+1} cinayet çözümünün bir parçasını (${p.join('-')}) ELER — yani çözümün kendisiyle çelişir. Çözüm üçlüsü hiçbir ipucuyla elenmemeli; bu kuralı düzelt ya da çözümü gözden geçir.`);
        });
      });
    }
  } else {
    flags.push(`YAPISAL HATA: "solution" alanı yok. Vakanın katil+silah+mekan çözümü tanımlı olmalı.`);
  }
  // 7) revealOrder çakışması (aynı sıra numarası birden çok ipucuda)
  const orders={};
  (c.clues||[]).forEach(cl=>{ if(cl.revealOrder!=null){ orders[cl.revealOrder]=(orders[cl.revealOrder]||0)+1; } });
  const clash=Object.entries(orders).filter(([k,v])=>v>1);
  if(clash.length) flags.push(`YAPISAL HATA: revealOrder çakışması — ${clash.map(([k,v])=>`sıra ${k}: ${v} ipucu`).join(', ')}. Her ipucu benzersiz bir revealOrder taşımalı (1,2,3...).`);

  return {flags,fatal:flags.length>0};
}

function consistencyCheck(c){
  const flags=[];
  const sol=c.solution?normSolution(c.solution):{};
  // profilde "hiç ...mamış" tarzı olumsuzlama + bir mekan adı geçiyor mu?
  c.suspects.forEach(s=>{
    const prof=((s.description||'')+' '+(s.detail||'')).toLocaleLowerCase('tr');
    if(!prof.trim()) return;
    const negation=/(hiç|asla).{0,40}(adım atmamış|girmemiş|gitmemiş|dokunmamış|bilmez|bihaber|yabancı)|adım atmamış|hiç girmemiş|bihaber/i.test(prof);
    if(!negation) return;
    // profilde hangi mekanlar olumsuzlanıyor?
    const negatedLocs=c.locations.filter(l=>mentionsAny(prof,[l.name]).length || /arka oda|gizli|değerleme/i.test(prof) && /arka oda|gizli|değerleme/i.test(l.name.toLocaleLowerCase('tr')));
    // bu şüpheli çözümde o mekana atanmış mı? (en ağır tutarsızlık)
    if(sol.S && norm(sol.S)===norm(s.name)){
      negatedLocs.forEach(l=>{
        if(sol.L && norm(sol.L)===norm(l.name)){
          flags.push(`🚩 KIRMIZI BAYRAK: "${s.name}" profili "${l.name}"a hiç girmediğini söylüyor, ama çözüm onu KATİL olarak tam orada konumlandırıyor. Mantıksal tutarsızlık — profil ya da çözüm düzeltilmeli.`);
        }
      });
    }
    // ipuçları bu şüpheliyi olumsuzlanan mekândaki bir eylemle bağlıyor mu?
    c.clues.forEach((cl,i)=>{
      const txt=(cl.text||'').toLocaleLowerCase('tr');
      if(mentionsAny(txt,[s.name]).length){
        negatedLocs.forEach(l=>{
          if(mentionsAny(txt,[l.name]).length && /(girdi|içeri|oradayd|bulundu|işledi|yakaland)/i.test(txt)){
            flags.push(`🚩 KIRMIZI BAYRAK: İpucu ${i+1}, "${s.name}"i profilinde girmediği söylenen "${l.name}" ile bir eylemde ilişkilendiriyor. Profil-ipucu çelişkisi.`);
          }
        });
      }
    });
  });

  // --- KURAL 1: UI-MEKANİK UYUMU (hayalet buton) ---
  // specialMechanic parmak_izi_mini_oyun DEĞİLSE hiçbir şüphelide parmakIziDeseni olmamalı.
  const sm=(c.specialMechanic||'').toLowerCase();
  const fpClueVar=c.clues.some(cl=>(cl.mechanicType||'')==='parmak_izi'||cl.parmakIziVerisi);
  const isFpMechanic=(sm==='parmak_izi_mini_oyun')||fpClueVar;
  if(!isFpMechanic){
    const ghosts=c.suspects.filter(s=>s.fp||s.parmakIziDeseni);
    if(ghosts.length){
      flags.push(`🚩 HATA: Vaka mekaniği parmak izi olmadığı halde ${ghosts.length} şüpheliye parmak izi verisi (parmakIziDeseni) atanmış, arayüzde hayalet buton oluşuyor! Ya specialMechanic'i "parmak_izi_mini_oyun" yap ya da şüphelilerden parmakIziDeseni alanını kaldır.`);
    }
  }

  // --- KURAL 2: MEKANSAL KURGU DOĞRULUĞU (SEZGİSEL TAVSİYE — statü/puan bozmaz) ---
  // Bir ipucunun metninde bir mekan adı geçip logicRules'u BAŞKA mekana confirm ediyorsa,
  // oyuncuda yanlış lokasyon algısı DOĞABİLİR. Ama bu sezgisel bir gözlem: metinler kasıtlı
  // edebî/dolaylı olduğundan ("çamurlu çalışma alanı"=Kazı Çadırı) çoğu zaman yanlış-pozitiftir.
  // O yüzden FATAL/tutarsızlık DEĞİL, yalnızca tavsiye. Ayrıca mekan adının AYIRT EDİCİ
  // (sadece sıfat değil) bir biçimde geçtiğinden emin olmak için tam-ad eşleşmesi şartı eklendi.
  const advisories=[];
  c.clues.forEach((cl,i)=>{
    if(!Array.isArray(cl.logicRules)||!cl.logicRules.length) return;
    const txt=(cl.text||'').toLocaleLowerCase('tr');
    // metinde mekanın TAM adı (tüm kelimeleriyle) geçiyor mu? (sadece tek sıfat eşleşmesi yetmez)
    const mentionedLocs=c.locations.filter(l=>{
      const full=norm(l.name);
      // tam ad birebir geçiyor mu (boşluk toleranslı)?
      if(norm(txt).includes(full)) return true;
      // ya da ad tek kelimeyse mentionsAny ile (çok-kelimeli adlar için tam-ad şartı zaten yukarıda)
      const words=l.name.trim().split(/\s+/);
      return words.length===1 && mentionsAny(txt,[l.name]).length>0;
    });
    if(!mentionedLocs.length) return;
    cl.logicRules.forEach(r=>{
      if((r.action||'').toLowerCase()!=='confirm') return;
      const ids=r.pair||r.cift||[];
      const locId=ids.find(id=>c.locations.some(l=>l.id===id));
      if(!locId) return;
      const confirmedLoc=c.locations.find(l=>l.id===locId);
      mentionedLocs.forEach(ml=>{
        if(norm(ml.name)!==norm(confirmedLoc.name)){
          advisories.push(`TAVSİYE (Mekansal Algı): İpucu ${i+1} metninde "${ml.name}" mekanının tam adı geçiyor ama logicRules onu "${confirmedLoc.name}" ile eşleştiriyor. Eğer kasıtlı bir edebî gönderme değilse, oyuncu yanlış mekana yönelebilir — metin ile kuralın mekanını hizalamayı düşün. (Puan/statü kırmaz; vaka-bazlı değerlendir.)`);
        }
      });
    });
  });

  return {flags,advisories};
}

/* ============================================================
   v8 · OYUNCU-GÖRÜNÜR ANLAM KATMANI + SIKI TEMEL İPUCU TESTİ
   ------------------------------------------------------------
   Grid solver yalnızca logicRules'u görür. Oyuncu ise hikâye,
   atmosfer, profil ve mini oyun metninden suç silahını veya
   mahallini çıkarabilir. Bu katman, görünür semantiği ayrıca
   modelleyerek iki kritik soruyu yanıtlar:
   1) Metin, logicRules'tan önce cevabı kısmen sızdırıyor mu?
   2) Her standart ipucu çıkarıldığında cevap gerçekten kayboluyor mu?

   Tam doğal dil muhakemesi tarayıcıda güvenilir biçimde yapılamaz.
   Bu yüzden qaSemanticFacts, yazar/AI'nin denetlenebilir "oyuncu
   görünür bilgi sözleşmesi"dir. Heuristik algılayıcı, belgelenmemiş
   olası sızıntıları yakalar; üretim kapısı bunları onaysız bırakmaz.
============================================================ */
const FM_SEMANTIC_STOP=new Set([
  'olan','olarak','gibi','için','ile','ve','ama','fakat','ancak','bir','bu','şu','o','da','de','ki','çok','daha','her','tüm','kadar','üzeri','altı','içinde','dışında','gece','olay','yeri','alanı','alan','eski','yeni','karanlık','ağır','ince','sinsi','tarihi','mabedin','mabet','başındaki','başında','çalışma','restorasyon','kurban','maktul','cinayet','ölüm','öldü','bulundu','olduğu','olarak','yıllardır','asırlar','metrelerce'
]);
const FM_CRIME_SIGNAL=/(cinayet|maktul|kurban|ceset|cansız beden|son nefes|öldür|öldü|ölüm|sustur|olay yeri|cinayet mahall|bulunduğu alan|bulunduğu yer|katled|boğul|zehir|darbenin|infaz)/i;

function fmNorm(s){ return String(s||'').toLocaleLowerCase('tr').replace(/[’']/g,'').trim(); }
function fmSourceLabel(c,source){
  if(!source || source==='story') return 'Hikâye / atmosfer';
  const id=String(source).replace(/^clue:/,'');
  const idx=(c.clues||[]).findIndex(cl=>cl.id===id);
  return idx>=0?`İpucu ${idx+1}${c.clues[idx].title?' · '+c.clues[idx].title:''}`:String(source);
}
function fmComponentLabel(comp){ return ({suspect:'katil',weapon:'cinayet silahı',location:'suç mahalli'})[comp]||comp; }
function fmCanonicalComponent(v){
  const x=fmNorm(v).replace(/[\s_\-]/g,'');
  if(['suspect','katil','fail','killer','şüpheli','supheli'].includes(x)) return 'suspect';
  if(['weapon','silah','method','yöntem','yontem','murderweapon','cinayetsilahi'].includes(x)) return 'weapon';
  if(['location','mekan','mahall','crimescene','suçmahalli','sucmahalli','scene'].includes(x)) return 'location';
  return '';
}
function fmFindEntity(c,id){ return [...(c.suspects||[]),...(c.weapons||[]),...(c.locations||[])].find(e=>e.id===id)||null; }
function fmEntityCategory(c,id){
  if((c.suspects||[]).some(e=>e.id===id)) return 'suspect';
  if((c.weapons||[]).some(e=>e.id===id)) return 'weapon';
  if((c.locations||[]).some(e=>e.id===id)) return 'location';
  return '';
}
function fmNormalizeSemanticFact(c,raw,defaultSource){
  if(!raw || typeof raw!=='object') return null;
  const kind=fmNorm(raw.kind||raw.type||raw.tur||'crime_component').replace(/[\s\-]/g,'_');
  const component=fmCanonicalComponent(raw.component||raw.axis||raw.bilesen||raw.role||raw.rol);
  const entityId=raw.entityId||raw.entity||raw.targetId||raw.target||raw.id||raw.deger||'';
  const source=raw.source||raw.kaynak||defaultSource||'story';
  const evidence=String(raw.evidence||raw.daynak||raw.gerekce||raw.text||raw.metin||'').trim();
  if(!['crime_component','crimecomponent','suç_bileşeni','suc_bileseni','crime_component_fact'].includes(kind)) return null;
  if(!component || !entityId || !fmFindEntity(c,entityId)) return {invalid:true,raw,source,evidence,component,entityId};
  const expected=fmEntityCategory(c,entityId);
  if(expected!==component) return {invalid:true,raw,source,evidence,component,entityId,expected};
  return {kind:'crime_component',component,entityId,source:String(source),evidence,provided:true};
}
function fmTokens(s){
  return [...new Set(fmNorm(s).split(/[^a-zçğıöşü0-9]+/i).filter(w=>w.length>=5&&!FM_SEMANTIC_STOP.has(w)))];
}
function fmEntityTokens(e){ return fmTokens(`${e.name||''} ${e.description||''} ${e.detail||''}`); }
// Semantik kaçak taraması için yalnızca ayırt edici materyal/mekân işaretleri.
// Profildeki genel betimleme kelimeleri doğrudan suç bilgisi değildir.
function fmSemanticMarkers(component,e){
  const raw=fmNorm(`${e.name||''} ${e.description||''} ${e.detail||''}`);
  if(component==='weapon'){
    if(/hançer|bıçak|kesici|jilet|kılıç/.test(raw)) return ['hançer','bıçak','kesici','jilet','kılıç','derin kesik'];
    if(/kimyasal|asit|çözücü|sıvı|buhar|şişe/.test(raw)) return ['kimyasal','asit','çözücü','sıvı','buhar','şişe'];
    if(/anahtar|demir|ezici|kafatas|travma/.test(raw)) return ['demir anahtar','anahtar','ezici','kafatas','travma'];
  }
  if(component==='location'){
    if(/mahzen|dehliz|yeraltı|rutubet|küf/.test(raw)) return ['mahzen','dehliz','yeraltı','rutubet','küf'];
    if(/iskele|platform|kubb|rüzgarlı|ahşap/.test(raw)) return ['iskele','platform','kubbe','rüzgarlı','ahşap'];
    if(/çadır|çadir|dış avlu|dış çalışma/.test(raw)) return ['çadır','çadir','dış avlu','dış çalışma'];
  }
  return fmTokens(e.name||'').filter(x=>x.length>=5);
}
function fmInferFactsFromText(c,text,source){
  const out=[];
  // Yalnızca suç/ölüm bağlamı taşıyan AYNI cümledeki ayırt edici isim veya
  // materyal işaretlerinden çıkarım yap. Profildeki genel atmosfer sözcüklerini
  // (yağmur, çizim, avlu vb.) tek başına suç bilgisi saymak yanlış pozitiftir.
  const sentences=String(text||'').split(/(?<=[.!?])\s+|\n+/).map(x=>x.trim()).filter(Boolean);
  sentences.forEach(sentence=>{
    if(!FM_CRIME_SIGNAL.test(sentence)) return;
    const low=fmNorm(sentence);
    [['weapon',c.weapons||[]],['location',c.locations||[]]].forEach(([component,arr])=>{
      const scored=arr.map(e=>{
        const full=fmNorm(e.name||'');
        const nameHit=full.length>=4 && low.includes(full);
        const hits=fmSemanticMarkers(component,e).filter(m=>low.includes(fmNorm(m)));
        // Bir varlığın doğrudan adı veya en az iki AYIRT EDİCİ işaret birlikte geçmedikçe
        // bu yalnızca atmosfer olabilir; semantik gerçek olarak kaydetme.
        const score=(nameHit?6:0)+hits.length*2;
        return {e,nameHit,hits,score};
      }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score);
      if(!scored.length) return;
      const top=scored[0], next=scored[1];
      const explicit=top.nameHit || top.hits.length>=2;
      const separated=!next || top.score>=next.score+2;
      if(explicit && separated){
        out.push({kind:'crime_component',component,entityId:top.e.id,source,evidence:`[Heuristik] “${top.nameHit?(top.e.name||''):top.hits.slice(0,3).join(', ')}” ifadesi ${top.e.name} için suç bağlamında tekil görünür.`,provided:false,inferred:true});
      }
    });
  });
  return out;
}

/* ---- V24: OYUNCU-GÖRÜNÜR İPUCU KAPSAMI + BONUS İŞLEVSELLİĞİ ----
   Solver yalnız logicRules'ı değil, oyuncunun gerçekten okuduğu/dinlediği metni de
   denetlemelidir. Özellikle ses kayıtlarında transcript, düz yazılı ipucu kadar
   kanıttır. Bir ipucu declared logicRules dışında başka bir şüpheli/silah/mekânı
   güçlü biçimde çağrıştırıyorsa, sonraki temel ipucunu görünürde tekrarlayabilir.
*/
function fmVisibleClueText(cl){
  const mini=cl.parmakIziVerisi||{};
  const parts=[
    cl.text||'', cl.deductionHint||'', cl.sesMetni||'',
    mini.aciklama||'',
    ...(Array.isArray(mini.izler)?mini.izler.map(z=>`${z.ipucu||''} ${z.konum||''}`):[]),
    (cl.sifre&&cl.sifre.aciklama)||'',
    (cl.sifre&&cl.sifre.cozulmus)||''
  ];
  return parts.filter(Boolean).join('\n');
}
function fmVisibleMarkers(c,e){
  const cat=fmEntityCategory(c,e.id);
  const raw=fmNorm(`${e.name||''} ${e.description||''} ${e.detail||''}`);
  const nameRaw=fmNorm(e.name||'');
  const out=[];
  const add=(...xs)=>xs.forEach(x=>{x=fmNorm(x); if(x&&x.length>=3)out.push(x);});
  // Varlığın kendi adı ve kişi adının son parçası.
  if(e.name) add(e.name);
  const nameWords=nameRaw.split(/[^a-zçğıöşü0-9]+/i).filter(Boolean);
  const last=nameWords[nameWords.length-1]||'';
  if(last.length>=4 && !/^(bey|hanım|pasa|paşa|efendi)$/.test(last)) add(last);

  if(cat==='location'){
    if(/rıhtım|kıyı|deniz|liman|iskele|dalga/.test(raw)) add('rıhtım','rıhtım kenarı','kıyı','kıyı hattı','deniz hattı','iskele başı','dalga');
    if(/ambar|depo|katran|zincir|sürgü/.test(raw)) add('ambar','depo','katran','çapa zinciri','sürgü');
    if(/ofis|idari|evrak|servis dolabı/.test(raw)) add('ofis','idari oda','servis dolabı','evrak dolabı');
    if(/güverte|martı|vinç/.test(raw)) add('güverte','martı','vinç');
    // Hollywood / set bağlamı
    if(/kostüm|kıyafet|askı|kumaş tozu|ayna/.test(raw)) add('kostüm odası','kıyafet deposu','askı','kumaş tozu','ayna duvarı');
    if(/ana set|çekim meydanı|figüran|flaş|ışık/.test(raw)) add('ana set','çekim meydanı','yağmur sahnesi','set ışıkları','ham çekim');
    if(/prodüksiyon|senaryo kasası|bütçe|idari yönetim/.test(raw)) add('prodüksiyon ofisi','senaryo kasası','bütçe odası','manyetik ofis kapısı');
  } else if(cat==='weapon'){
    if(/halat|kenevir|bağlama/.test(raw)) add('deniz halatı','halat','kenevir','bağlama halatı');
    if(/zehir|arsenik|kadeh|şişe|renk/.test(raw)) add('zehirli içki','kristal kadeh','kadeh','renk değiştirmez','arsenik','şişe');
    if(/çekiç|dövme demir|travma|paslı/.test(raw)) add('çekiç','dövme demir','paslı başlık','ağır travma');
    if(/tabanca|barut|namlu|mühimmat/.test(raw)) add('tabanca','barut','namlu','askerî mühimmat');
    // Hollywood / set bağlamı
    if(/tripod|kamera ayağı|alüminyum/.test(raw)) add('tripod','kamera ayağı','alüminyum ayak','üç ayaklı rig');
    if(/elektrik kablosu|yüksek voltaj|k-12|yağmur makinesi/.test(raw)) add('elektrik kablosu','yüksek voltaj','k-12','yağmur makinesi kablosu');
    if(/sahte silah|prop|gerçek mermi/.test(raw)) add('prop tabanca','sahte silah','gerçek mermi','prop dolabı');
  } else if(cat==='suspect'){
    // Milliyet/meslek işaretleri yalnız AD alanından alınır. Profil açıklamasında
    // "İngilizlere karşı" gibi bir motivasyon geçmesi, kişiyi İngiliz yapmaz.
    if(/ingiliz/.test(nameRaw)) add('ingiliz','ingiliz temsilci','ingiliz şirketi');
    if(/alman/.test(nameRaw)) add('alman','alman temsilci','alman şirketi');
    if(/bekçi|nöbet/.test(nameRaw)) add('bekçi','nöbetçi');
    if(/subay/.test(nameRaw)) add('subay','subay bey');
    // Hollywood / set bağlamı — rol unvanı tek başına isim değildir; yalnız açık
    // role dayalı kanıtla birlikte bir eşleştirme sinyali olarak değerlendirilir.
    if(/baş oyuncu|başrol|oyuncu/.test(nameRaw)) add('başrol oyuncusu','başrol','188 santimetrelik yıldız','stunt kartı');
    if(/yardımcı yönetmen/.test(nameRaw)) add('yardımcı yönetmen','yönlendirme tableti','çekim akışı');
    if(/güvenlik/.test(nameRaw)) add('gece nöbetçisi','set güvenliği','vardiya rozeti');
  }
  return [...new Set(out)];
}
function fmVisibleEntitySignals(c,text){
  const low=fmNorm(text||'');
  const all=[...(c.suspects||[]),...(c.weapons||[]),...(c.locations||[])];
  const out=[];
  all.forEach(e=>{
    const cat=fmEntityCategory(c,e.id);
    const name=fmNorm(e.name||'');
    const direct=!!(name&&low.includes(name));
    const markers=fmVisibleMarkers(c,e).filter(m=>low.includes(m));
    const distinct=[...new Set(markers)];
    // Tek, kısa ve genel işaret (örn. sadece "bekçi") yeterli değildir. Bir varlık
    // metinde ya adıyla, ya çok kelimeli/uzun belirteçle, ya da iki bağımsız belirteçle görünmelidir.
    const strongMarker=distinct.some(m=>m.includes(' ')||m.length>=8);
    const strong=direct||strongMarker||distinct.length>=2;
    if(strong) out.push({id:e.id,category:cat,name:e.name,direct,markers:distinct});
  });
  return out;
}
function visibleEvidenceScopeCheck(c){
  const flags=[],warnings=[],findings=[];
  const policy=c.qaPolicy||{};
  const strict=policy.requireVisibleEvidenceScope!==false && (fmAdvancedCase(c)||policy.enforceVisibleEvidenceScope===true);
  (c.clues||[]).forEach((cl,i)=>{
    if(cl.isBonus) return;
    const visible=fmVisibleClueText(cl);
    const rules=Array.isArray(cl.logicRules)?cl.logicRules:[];
    const declared=new Set();
    rules.forEach(r=>(r.pair||r.cift||[]).forEach(id=>declared.add(id)));
    const signals=fmVisibleEntitySignals(c,visible);
    const extras=signals.filter(s=>!declared.has(s.id));
    if((cl.mechanicType||'')==='ses_kaydi'){
      if(String(cl.sesMetni||'').trim()) findings.push(`✓ İpucu ${i+1} ses transkripti, yazılı ipucu gibi oyuncu-görünür kanıt denetimine dahil edildi.`);
    }
    if(!extras.length) return;
    const declaredLabel=[...declared].map(id=>(fmFindEntity(c,id)||{}).name||id).join(' ↔ ')||'tanımlı kural yok';
    extras.forEach(ex=>{
      const evidence=ex.direct?`adı doğrudan geçiyor`:`“${ex.markers.slice(0,2).join(' / ')}” ifadesi güçlü biçimde çağrışıyor`;
      const msg=`İpucu ${i+1}${cl.title?' · '+cl.title:''} metni ${ex.category==='location'?'mekân':ex.category==='weapon'?'silah':'şüpheli'} olarak “${ex.name}” sonucunu da ${evidence}; ancak logicRules yalnız ${declaredLabel} etkisini tanımlıyor. Oyuncu bu ek hücreyi işaretlerse sonraki temel ipucu tekrara düşebilir.`;
      if(strict) flags.push(`HATA: Oyuncu-Görünür Kural Taşkını — ${msg}`);
      else warnings.push(`UYARI: ${msg}`);
    });
  });
  if(!flags.length && findings.length) findings.push('✓ Sesli delillerde transcript, logicRules ile birlikte yazılı kanıt olarak değerlendirildi.');
  return {flags,warnings,findings,strict};
}

function semanticAudit(c){
  const findings=[],warnings=[],flags=[];
  const policy=(c.qaPolicy||{});
  const requireContract=policy.requireSemanticContract!==false && (((c.difficultyLevel==null)||c.difficultyLevel>=3)||policy.enforceSemanticContract===true);
  const provided=[],invalid=[];
  const rootFacts=Array.isArray(c.qaSemanticFacts)?c.qaSemanticFacts:[];
  rootFacts.forEach(f=>{ const n=fmNormalizeSemanticFact(c,f,'story'); if(n){ if(n.invalid)invalid.push(n); else provided.push(n); } });
  (c.clues||[]).forEach(cl=>{
    const arr=Array.isArray(cl.qaSemanticFacts)?cl.qaSemanticFacts:[];
    arr.forEach(f=>{ const n=fmNormalizeSemanticFact(c,f,`clue:${cl.id}`); if(n){ if(n.invalid)invalid.push(n); else provided.push(n); } });
  });
  invalid.forEach(f=>flags.push(`HATA: Geçersiz qaSemanticFacts kaydı (${fmSourceLabel(c,f.source)}). crime_component için component (suspect/weapon/location) ile entityId aynı kategoriye ait olmalı.`));

  const inferred=[];
  const texts=[{source:'story',text:`${c.story||''}\n${c.atmosphere||''}`}];
  (c.clues||[]).forEach(cl=>{
    if(cl.isBonus) return;
    // V24: ses transkripti ve diğer oynanabilir alanlar da oyuncunun gördüğü metindir.
    texts.push({source:`clue:${cl.id}`,text:fmVisibleClueText(cl)});
  });
  texts.forEach(x=>inferred.push(...fmInferFactsFromText(c,x.text,x.source)));
  const key=f=>`${f.source}|${f.component}|${f.entityId}`;
  const seen=new Set();
  const compactInferred=inferred.filter(f=>{ const k=key(f); if(seen.has(k))return false; seen.add(k); return true; });
  const pkeys=new Set(provided.map(key));
  const undocumented=compactInferred.filter(f=>!pkeys.has(key(f)));
  if(provided.length){
    findings.push(`✓ Oyuncu-görünür semantik sözleşme: ${provided.length} açık suç bileşeni belgelenmiş.`);
  }
  if(undocumented.length){
    undocumented.forEach(f=>{
      const ent=fmFindEntity(c,f.entityId);
      const msg=`${fmSourceLabel(c,f.source)} metni, oyuncuya ${fmComponentLabel(f.component)} olarak “${ent?ent.name:f.entityId}” sonucunu çağrıştırıyor. Bu bilgi qaSemanticFacts ile belgelenmemiş; grid dışı erken çözüm/sızıntı denetlenemiyor.`;
      if(requireContract) flags.push(`HATA: Semantik Sözleşme Eksik — ${msg}`); else warnings.push(`UYARI: Semantik Sözleşme — ${msg}`);
    });
  }
  (c.clues||[]).forEach(cl=>{
    if(cl.isBonus||!cl.isCrimeAnchor) return;
    const source=`clue:${cl.id}`;
    const hasAnchor=provided.some(f=>f.source===source&&f.kind==='crime_component');
    if(!hasAnchor){
      const msg=`İpucu ${c.clues.indexOf(cl)+1} isCrimeAnchor taşıyor ama hangi cevap bileşenini (silah/mekan/katil) kesinleştirdiği qaSemanticFacts ile açıkça kayıtlı değil.`;
      if(requireContract) flags.push(`HATA: Suç Çapası Semantik Olarak Belgelenmemiş — ${msg}`); else warnings.push(`UYARI: ${msg}`);
    }
  });
  const all=[...provided,...compactInferred];
  return {facts:all,provided,inferred:compactInferred,undocumented,findings,warnings,flags,requireContract};
}
function fmAllWorlds(c){
  const S=(c.suspects||[]).map(e=>e.id), W=(c.weapons||[]).map(e=>e.id), L=(c.locations||[]).map(e=>e.id);
  const worlds=[];
  permutations(W).forEach(wp=>{
    permutations(L).forEach(lp=>{
      worlds.push(S.map((sid,i)=>({S:sid,W:wp[i],L:lp[i]})));
    });
  });
  return worlds;
}
function fmValidWorlds(c,dropClueId){
  const worlds=fmAllWorlds(c); const rules=[];
  (c.clues||[]).forEach(cl=>{
    if(cl.isBonus || cl.id===dropClueId || !Array.isArray(cl.logicRules)) return;
    cl.logicRules.forEach(r=>{
      const a=(r.action||'').toLowerCase(); const p=r.pair||r.cift||[];
      if(p.length===2 && (a==='confirm'||a==='eliminate'||a==='eslesme_yok')) rules.push({action:a==='eslesme_yok'?'eliminate':a,a:p[0],b:p[1]});
    });
  });
  const cat=id=>fmEntityCategory(c,id);
  const same=(world,a,b)=>{ const ca=cat(a),cb=cat(b); if(!ca||!cb)return null; return world.some(t=>t[ca[0].toUpperCase()]===a && t[cb[0].toUpperCase()]===b); };
  return worlds.filter(world=>rules.every(r=>{ const together=same(world,r.a,r.b); return together===null?true:(r.action==='confirm'?together:!together); }));
}
function fmExpectedSolutionIds(c){
  const sol=c.solution||{};
  const find=(arr,n)=>{ const x=(arr||[]).find(e=>fmNorm(e.name)===fmNorm(n)); return x?x.id:''; };
  const idOrName=(arr,id,name)=>((arr||[]).some(e=>e.id===id)?id:find(arr,name));
  return {
    S:idOrName(c.suspects,sol.suspectId,sol.suspect||sol.katil),
    W:idOrName(c.weapons,sol.weaponId,sol.weapon||sol.silah),
    L:idOrName(c.locations,sol.locationId,sol.location||sol.mekan)
  };
}
function fmSemanticAnswerCandidates(c,sem,dropClueId){
  const worlds=fmValidWorlds(c,dropClueId);
  const sourceRemoved=s=>String(s||'')===`clue:${dropClueId}`;
  const facts=(sem.facts||[]).filter(f=>!sourceRemoved(f.source) && !String(f.source||'').startsWith('clue:bonus:'));
  const direct={suspect:new Set(),weapon:new Set(),location:new Set()};
  facts.forEach(f=>{ if(f.kind==='crime_component'&&direct[f.component]) direct[f.component].add(f.entityId); });
  const hasSemantic=direct.suspect.size||direct.weapon.size||direct.location.size;
  const out=new Set();
  if(!hasSemantic){
    const expected=fmExpectedSolutionIds(c);
    worlds.forEach(w=>{ const t=w.find(x=>x.S===expected.S)||w[0]; if(t)out.add(`${t.S}|${t.W}|${t.L}`); });
    return {candidates:out,worlds,direct,mode:'grid'};
  }
  // Oyuncu metinden bir ekseni kesin biliyorsa, diğer eksenleri O DÜNYADAKİ aynı
  // şüphelinin eşleşmesinden almalıdır. Önceki sürüm bunları tüm listeye açıyor,
  // doğru ızgara çözümünü yanlışlıkla çoklu aday yapıyordu.
  worlds.forEach(world=>{
    let suspects=[];
    if(direct.suspect.size) suspects=[...direct.suspect];
    else if(direct.weapon.size){
      direct.weapon.forEach(w=>{ const t=world.find(x=>x.W===w); if(t)suspects.push(t.S); });
    } else if(direct.location.size){
      direct.location.forEach(l=>{ const t=world.find(x=>x.L===l); if(t)suspects.push(t.S); });
    } else suspects=world.map(t=>t.S);
    [...new Set(suspects)].forEach(si=>{
      const row=world.find(t=>t.S===si);
      if(!row) return;
      const ws=direct.weapon.size?[...direct.weapon]:[row.W];
      const ls=direct.location.size?[...direct.location]:[row.L];
      ws.forEach(wi=>ls.forEach(li=>out.add(`${si}|${wi}|${li}`)));
    });
  });
  return {candidates:out,worlds,direct,mode:'semantic'};
}
function strictCoreNecessityCheck(c,sem){
  const findings=[],flags=[],warnings=[];
  const policy=(c.qaPolicy||{});
  const strict=policy.strictCoreNecessity!==false;
  const expected=fmExpectedSolutionIds(c), expectedKey=`${expected.S}|${expected.W}|${expected.L}`;
  const full=fmSemanticAnswerCandidates(c,sem,null);
  const fullOk=full.candidates.size===1&&full.candidates.has(expectedKey);
  if(!fullOk){
    flags.push(`HATA: Oyuncu-Görünür Çözüm Başarısız. Tüm standart ipuçları ve belgelenen/anlaşılan anlatı bilgileri birlikteyken cevap tek kalmıyor (${full.candidates.size} olası cevap). Bonus açmadan ${expectedKey} üçlüsüne zorunlu olarak ulaşılmalı.`);
  } else {
    const names=expectedKey.split('|').map(id=>(fmFindEntity(c,id)||{}).name||id).join(' · ');
    findings.push(`✓ Oyuncu-görünür cevap modeli (${full.mode}) tek sonuca ulaşıyor: ${names}.`);
  }
  const core=(c.clues||[]).filter(cl=>!cl.isBonus);
  if(core.length<4) flags.push(`HATA: Temel ipucu sayısı ${core.length}. Faili Meçhul üretim standardında çözüm zinciri en az 4 anlamlı standart ipucuna yayılmalıdır; sayı doldurmak için gereksiz ipucu eklenemez.`);
  const redundant=[];
  core.forEach(cl=>{
    const test=fmSemanticAnswerCandidates(c,sem,cl.id);
    const stillSolved=test.candidates.size===1&&test.candidates.has(expectedKey);
    const idx=(c.clues||[]).indexOf(cl)+1;
    if(stillSolved){
      redundant.push({cl,idx,mode:test.mode});
      flags.push(`HATA: Zorunlu Olmayan Temel İpucu — İpucu ${idx}${cl.title?' ('+cl.title+')':''} çıkarıldığında oyuncu hâlâ aynı tek cevaba ulaşır. Bu ipucu ızgarayı dolduruyor olabilir ama cevap zincirinde gerekli değil; bonusa dönüştürülmeli veya diğer temel ipuçlarıyla kesişen yeni bir bilgi vermeli.`);
    } else {
      const state=test.candidates.size===0?'çelişkili hale geliyor':`${test.candidates.size} olası cevap bırakıyor`;
      findings.push(`✓ İpucu ${idx} zorunlu: çıkarılınca çözüm ${state}.`);
    }
  });
  if(strict && redundant.length===0 && fullOk) findings.push('✓ Sıkı temel ipucu ekonomisi: her standart ipucu çıkarıldığında cevap kayboluyor; ana zincirde fazlalık yok.');
  if(!strict && redundant.length) warnings.push('ⓘ strictCoreNecessity=false olduğu için fazlalık uyarı olarak tutuldu; üretim için true önerilir.');
  return {findings,flags,warnings,full,expectedKey,redundant,passed:fullOk&&(!strict||redundant.length===0)};
}

/* ---- v29.4 İSİM + İÇERİK DERİNLİĞİ DENETİMİ ----
   Kelime bantları dolgu kotası değildir. Çok kısa/boş profili ve aynı vakadaki
   aşırı dengesizliği yakalar; kimlik değiştirmeyi değil, doğal Türkçe ve tutarlı
   içerik derinliğini ister. */
function fmQaWordCount(value){
  return String(value||'').trim().split(/\s+/u).filter(Boolean).length;
}
function contentDepthAndNameCheck(c){
  const flags=[],warnings=[],findings=[];
  const tier=fmCaseTier(c);
  const premium=tier==='premium';
  const generic=/^(?:şüpheli|supheli|silah|mek[aâ]n|yer|nesne|obje|kişi|kisi|adam|kadın|kadin|suspect|weapon|location)\s*\d*$/iu;
  const fileLike=/\.(?:png|jpe?g|webp|svg|gif)$/iu;
  const malformed=/_|\s{2,}/u;
  const semanticNouns={
    'Silah':/(?:bıçak|bıçağ|bıça|hançer|kama|neşter|sustalı|tabanca|revolver|tüfek|şişe|zehir|toksin|ilaç|afyon|arsenik|siyanür|iğne|şırınga|ip|halat|kordon|kemer|çengel|makas|çekiç|balta|sopa|levye|şamdan|heykel|kablo|modül|anahtar|tornavida|taş|kül tablası|bardak|kadeh|şiş|pense|çapa|zincir|yastık|kumaş|alet|çubuk|çubu|kanca)/u,
    'Mekân':/(?:oda|salon|koridor|güverte|kaptan köşkü|köprüüstü|kabin|mutfak|bahçe|koru|zeytinlik|bağ|sokak|cadde|meydan|depo|ambar|ofis|büro|çalışma alanı|lobi|köprü|sahne|koordinasyon|arşiv|atölye|laboratuvar|stüdyo|park|iskele|teras|geçit|mahzen|bodrum|çatı|kule|otel|ev|konak|saray|müze|galeri|restoran|bar|garaj|liman|yat|tekne)/iu
  };
  const categories=[['Şüpheli',c.suspects||[]],['Silah',c.weapons||[]],['Mekân',c.locations||[]]];

  categories.forEach(([label,arr])=>{
    const seen=new Map();
    arr.forEach((e,i)=>{
      const name=String(e&&e.name||'').trim();
      const key=fmNorm(name);
      if(!name||name.length<2) flags.push(`HATA: ${label} ${i+1} için anlamlı bir görünen ad yok.`);
      else {
        if(generic.test(name)) flags.push(`HATA: ${label} ${i+1} adı "${name}" yer tutucu/jenerik. Vaka kimliğine uygun doğal bir Türkçe adlandırma gerekir.`);
        if(fileLike.test(name)||malformed.test(name)) flags.push(`HATA: ${label} ${i+1} adı "${name}" oyuncuya gösterilecek doğal bir ad değil; dosya/teknik anahtar görünümü taşıyor.`);
        const words=name.split(/\s+/u).filter(Boolean);
        if(label==='Şüpheli'&&words.length<2) warnings.push(`${label} ${i+1} adı "${name}" tek sözcük. Bu bilinçli bir lakap/sahne adı değilse doğal ad-soyadla tamamla.`);
        if((label==='Silah'||label==='Mekân')&&(words.some(w=>/^[A-ZÇĞİÖŞÜ]$/u.test(w))||words.some(w=>/^\d+$/u.test(w)))){
          flags.push(`HATA: ${label} ${i+1} adı "${name}" kod/koordinat gibi görünüyor. Oyuncunun anlayacağı vaka-içi doğal adı kullan.`);
        }
        if((label==='Silah'||label==='Mekân')&&!semanticNouns[label].test(fmNorm(name))){
          warnings.push(`${label} ${i+1} adı "${name}" yaygın bir tür sözcüğüyle doğrulanamadı. Yaratıcı/özel ad olabilir; dilsel anlamı ve vaka bağlamını AI editör incelemesinde doğrula, yalnız gerçekten bozuksa aynı görsel ve semantik kimliği koruyarak düzelt.`);
        }
        if(words.some((w,j)=>j>0&&fmNorm(w)===fmNorm(words[j-1]))) flags.push(`HATA: ${label} ${i+1} adında yinelenen sözcük var: "${name}".`);
        if(seen.has(key)) flags.push(`HATA: ${label} adları yineleniyor: "${name}".`); else seen.set(key,i);
        const maxWords=label==='Şüpheli'?10:(label==='Silah'?7:9);
        if(words.length>maxWords) warnings.push(`${label} ${i+1} adı ${words.length} kelime; mobil kartta anlaşılır ve doğal kalacak biçimde sadeleştir.`);
      }
    });
  });

  const storyWords=fmQaWordCount(c.story);
  const storyMin=premium?110:60, storyMax=premium?360:220;
  if(storyWords<25) flags.push(`HATA: Hikâye yalnız ${storyWords} kelime; olay, gerilim ve soruşturma bağlamı kurulmamış.`);
  else if(storyWords<storyMin) warnings.push(`${fmCaseTierLabel(c)} hikâyesi ${storyWords} kelime; hedef derinlik yaklaşık ${storyMin}-${storyMax} kelime. Kimlikleri değiştirmeden olay ve atmosfer bağını güçlendir.`);
  else if(storyWords>storyMax) warnings.push(`Hikâye ${storyWords} kelime; mobil okumada ağırlaşabilir. Tekrarları azalt, gizem ve gerekli bağlamı koru.`);

  const inspectProfiles=(label,arr,min,max)=>{
    const counts=[];
    arr.forEach((e,i)=>{
      const n=fmQaWordCount(`${e&&e.description||''} ${e&&e.detail||''}`);
      counts.push(n);
      if(n<3) flags.push(`HATA: ${label} ${i+1} (${e&&e.name||'?'}) profili ${n} kelime; oyuncuya anlamlı bilgi vermiyor.`);
      else if(n<min) warnings.push(`${label} ${i+1} (${e&&e.name||'?'}) profili ${n} kelime; ${tier} vaka için kısa. Mevcut görsel kimliği değiştirmeden işlev, bağlam veya motivasyon ekle.`);
      else if(n>max) warnings.push(`${label} ${i+1} (${e&&e.name||'?'}) profili ${n} kelime; aynı kategorideki kartlarla dengeli olacak biçimde sıkılaştır.`);
    });
    const positive=counts.filter(n=>n>0);
    if(positive.length>1){
      const lo=Math.min(...positive),hi=Math.max(...positive);
      if(hi-lo>=16&&hi/Math.max(1,lo)>2.4) warnings.push(`${label} profilleri aynı vakada dengesiz (${lo}-${hi} kelime). Bir kart birkaç kelimeyken diğerinin paragraf olmasına izin verme.`);
    }
  };
  inspectProfiles('Şüpheli',c.suspects||[],premium?22:12,premium?95:65);
  inspectProfiles('Silah',c.weapons||[],premium?10:6,premium?75:50);
  inspectProfiles('Mekân',c.locations||[],premium?12:7,premium?80:55);

  const ai=c.qaAiReview||null;
  if(ai&&Array.isArray(ai.nameIssues)&&ai.nameIssues.length){
    ai.nameIssues.forEach(issue=>flags.push(`HATA: AI İsim Denetimi — ${String(issue)}`));
  }
  if(!flags.length&&!warnings.length) findings.push(`✓ İsimler doğal/ayırt edici; ${tier} içerik derinliği ve vaka-içi profil dengesi uygun.`);
  return {flags,warnings,findings,tier,storyWords};
}

/* ---- v20: ÜRETİM SÖZLEŞMELERİ ----
   Bu katman, yalnızca ızgaranın çözülmesini değil, içerik ile kuralın
   gerçekten birbirini gerektirip gerektirmediğini ve mekanik varlığın
   oyunda render edilebilir olup olmadığını denetler. */
function fmAdvancedCase(c){ return c.difficultyLevel==null || c.difficultyLevel>=3; }

function traceabilityPolicyCheck(c,trace){
  const flags=[],warnings=[];
  const policy=c.qaPolicy||{};
  const required=policy.requireTraceability!==false && fmAdvancedCase(c);
  if(required && trace && trace.warnings && trace.warnings.length){
    flags.push(`HATA: QA İzlenebilirlik Sözleşmesi Eksik — bu zorlukta logicRules taşıyan her ipucu qaRationale {matrixEffect, evidenceLink, evidenceKind} ile belgelenmelidir. ${trace.warnings.length} ipucuda eksik/yetersiz köprü var.`);
  } else if(!required && trace && trace.warnings && trace.warnings.length){
    warnings.push(`ⓘ qaPolicy.requireTraceability=false olduğu için ${trace.warnings.length} izlenebilirlik eksiği export'u engellemedi; premium vakalarda true önerilir.`);
  }
  return {flags,warnings,required};
}

function ruleEntailmentCheck(c){
  const flags=[],warnings=[];
  const MOTIVE=/(borç|tefeci|haciz|terfi|miras|intikam|kıskanç|öfke|hırs|rüşvet|şantaj|mali yıkım|fon|para aktarım)/i;
  const CONCRETE=/(rapor|kayıt|defter|imza|mühür|kamera|vardiya|tanık|şahit|ifade|ses kayd|görüntü|iz|parmak|numune|analiz|test|otopsi|balistik|teslim|emanet|bulundu|tespit|saptan|doğrula|ölçüm|fiziksel|tıbbi)/i;
  const allowed=new Set(['forensic','documentary','record','witness','mechanical','medical','physical','audio','digital','transaction','inventory','chain_of_custody']);
  const advanced=fmAdvancedCase(c);
  (c.clues||[]).forEach((cl,i)=>{
    const rules=Array.isArray(cl.logicRules)?cl.logicRules:[];
    if(!rules.length) return;
    const q=cl.qaRationale||{};
    const kind=fmNorm(q.evidenceKind||q.kind||q.kanitTuru||'').replace(/[\s-]/g,'_');
    // Ses kaydı transcripti de kanıt metnidir; yalnız başlık/asset varlığı üzerinden kural üretilemez.
    const txt=`${cl.text||''} ${cl.sesMetni||''} ${q.evidenceLink||''}`;
    const hasConfirm=rules.some(r=>fmNorm(r.action)==='confirm');
    const motiveOnly=MOTIVE.test(txt) && !CONCRETE.test(txt);
    if(advanced && !kind){
      flags.push(`HATA: İpucu ${i+1} için qaRationale.evidenceKind eksik. Her matrissel action'ın dayanağı forensic/documentary/record/witness/mechanical/medical/audio gibi bir kanıt sınıfıyla belirtilmeli; "motive" tek başına action üretemez.`);
    } else if(kind==='motive'){
      flags.push(`HATA: İpucu ${i+1} "motive" kanıt sınıfıyla ${hasConfirm?'confirm':'grid'} action üretiyor. Saik, oyuncuya NEDEN sorusunu anlatır; şüpheliyi silaha/mekana matematiksel olarak bağlayamaz. Bu ipucunun logicRules'unu kaldırıp bonus anlatısı yap veya fiziksel/belgesel bir temas kaydı ekle.`);
    } else if(kind && !allowed.has(kind)){
      warnings.push(`İpucu ${i+1}: qaRationale.evidenceKind="${kind}" tanınmıyor. Standart sınıflardan birini kullan (forensic, documentary, record, witness, mechanical, medical, physical, audio, digital, transaction, inventory, chain_of_custody).`);
    }
    if(motiveOnly && rules.length){
      flags.push(`HATA: Saikten Kurala Atlama — İpucu ${i+1}'in metni yalnız borç/terfi/öfke gibi saik anlatıyor; buna rağmen ızgarada ${hasConfirm?'pozitif bir eşleşme':'bir action'} kuruyor. Motif, silah veya mekana ilişkin kanıt değildir. Eylem için somut temas, kayıt, iz, teslim veya tanık dayanağı ekle.`);
    }
  });
  return {flags,warnings};
}

function fmDeclaredMechanics(c){
  const raw=Array.isArray(c.specialMechanic)?c.specialMechanic.join('_ve_'):String(c.specialMechanic||'');
  const n=fmNorm(raw).replace(/[\s-]/g,'_');
  const out=new Set();
  if(/parmak_izi|parmakizi/.test(n)) out.add('parmak_izi');
  if(/profil_sentezi|profil_eslestirme|profil_eşleştirme|rutin_imzasi|rutin_imzası/.test(n)) out.add('profil_sentezi');
  if(/sifre|kriptogram|anagram|akrost/.test(n)) out.add('sifreli_mesaj');
  if(/ses_kaydi|ses/.test(n)) out.add('ses_kaydi');
  if(/gorsel_ipucu|görsel_ipucu/.test(n)) out.add('gorsel_ipucu');
  return out;
}
function mechanicContractCheck(c){
  const flags=[],warnings=[],assetRows=[];
  const policy=c.qaPolicy||{};
  // v20: transcriptli ve yolu tanımlı planlı ses kaydı, içerik QA/export için geçerlidir.
  // Yalnız blockOnPendingMedia:true açıkça istenirse fiziksel dosya teslimi export'u kilitler.
  const blockOnPendingMedia=policy.blockOnPendingMedia===true;
  const requireManifest=policy.requireAssetManifest!==false;
  const declared=fmDeclaredMechanics(c);
  const actual=new Set();
  const manifest=Array.isArray(c.assetManifest)?c.assetManifest:[];
  const assetIds=new Set();
  manifest.forEach((asset,ai)=>{
    if(!asset||typeof asset!=='object'){ flags.push(`HATA: assetManifest[${ai}] geçerli bir varlık objesi değil.`); return; }
    const id=String(asset.assetId||asset.id||'').trim();
    if(!id){ flags.push(`HATA: assetManifest[${ai}] için assetId eksik.`); return; }
    if(assetIds.has(id)) flags.push(`HATA: assetManifest içinde yinelenen assetId: "${id}".`);
    assetIds.add(id);
  });
  (c.clues||[]).forEach((cl,i)=>{
    const mt=fmNorm(cl.mechanicType||'').replace(/[\s-]/g,'_');
    const isAudio=mt==='ses_kaydi'||!!cl.sesMetni||!!cl.audioUrl||!!cl.audioAssetId;
    if(mt==='profil_sentezi'||mt==='profil_eslestirme'||!!cl.profilSenteziVerisi){
      actual.add('profil_sentezi');
      const ps=cl.profilSenteziVerisi||{};
      const boundary=cl.qaMechanicBoundary||{};
      const strictBoundary=policy.requireMechanicEvidenceBoundary!==false;
      const wrapper=String(cl.text||'').trim();
      const cards=ps.delilKartlari||ps.evidenceCards||[];
      const answer=String(ps.answerSuspectId||ps.eslesme||ps.matchSuspectId||'').trim();
      const optionIds=ps.optionSuspectIds||ps.options||[];
      if(!Array.isArray(cards)||cards.length<2||!answer||!Array.isArray(optionIds)||optionIds.length<2){
        flags.push(`HATA: İpucu ${i+1} Profil Sentezi için render edilebilir delil kartları, seçenek kimlikleri veya answerSuspectId eksik. Oyun ekranı en az iki işaret kartı ve şüpheli seçimi sunmalıdır.`);
      }
      if(strictBoundary){
        if(boundary.primaryEvidence!=='profilSenteziVerisi'||boundary.wrapperTextRole!=='context_only'){
          flags.push(`HATA: İpucu ${i+1} Profil Sentezinde qaMechanicBoundary eksik/geçersiz. primaryEvidence:"profilSenteziVerisi" ve wrapperTextRole:"context_only" tanımla; kritik çıkarımın kart eşleştirmesinde kaldığı QA tarafından denetlenebilir.`);
        }
        if(!wrapper){
          flags.push(`HATA: İpucu ${i+1} Profil Sentezinin text alanı boş. Üst metin yalnızca olay yerindeki işaretlerin kısa keşif bağlamını taşımalı.`);
        } else {
          if(wrapper.length>240) flags.push(`HATA: İpucu ${i+1} Profil Sentezinin üst metni ${wrapper.length} karakter; context_only üst metin en fazla 240 karakter olmalı.`);
          const conclusionRe=/(eşleş|doğrula|kanıtla|tespit|belirle|göster(di|iyor)|açığa çıkar|ortaya çıkar)/i;
          const ruleIds=new Set();
          (cl.logicRules||[]).forEach(r=>(r.pair||r.cift||[]).forEach(id=>ruleIds.add(id)));
          const ruleNames=[...ruleIds].map(id=>{
            const ent=[...(c.suspects||[]),...(c.weapons||[]),...(c.locations||[])].find(e=>e.id===id);
            return ent&&ent.name;
          }).filter(Boolean);
          const leakedNames=mentionsAny(wrapper,ruleNames);
          const problems=[];
          if(conclusionRe.test(wrapper)) problems.push('sonuç dili');
          if(leakedNames.length) problems.push(`kural tarafının adı (${leakedNames.join(', ')})`);
          if(problems.length) flags.push(`HATA: İpucu ${i+1} Profil Sentezinin text alanı ${problems.join(' + ')} içeriyor. Üst metin yalnızca üç işaretin bulunma bağlamını anlatmalı; şüpheli–mekân çıkarımı yalnız profil kartları karşılaştırılarak yapılmalı.`);
        }
      }
    }
    if(mt==='parmak_izi'||cl.parmakIziVerisi){
      actual.add('parmak_izi');
      const pv=cl.parmakIziVerisi||{};
      const match=pv.izler&&pv.izler[0]&&pv.izler[0].eslesme;
      const sol=fmExpectedSolutionIds(c);
      if(match && sol.S && match!==sol.S && pv.allowNonKillerMatch!==true){
        flags.push(`HATA: İpucu ${i+1} parmak izini katil olmayan "${match}" şüphelisine eşliyor ama allowNonKillerMatch:true ile tasarım niyeti belgelenmemiş. Bu, premium çapraz-eleme için geçerlidir; ancak yanlış eşleşme sanılmaması için açık onay zorunlu.`);
      }
    }
    if(mt==='sifreli_mesaj'||cl.sifre){
      actual.add('sifreli_mesaj');
      /* v25.4 — ŞİFRENİN KANIT DEĞERİ
         Kartın üst metni yalnızca şifrenin bulunduğu bağlamı taşıyabilir. Şifrenin
         çözülmüş mesajını, bağladığı şüpheli–silah/mekân sonucunu veya çözme
         sonucunu özetlerse oyuncu mini oyunu açmadan cevabı alır; şifre dekorlaşır. */
      const boundary=cl.qaMechanicBoundary||{};
      const strictBoundary=policy.requireMechanicEvidenceBoundary!==false;
      const wrapper=String(cl.text||'').trim();
      const cipher=cl.sifre||{};
      if(strictBoundary){
        if(boundary.primaryEvidence!=='sifre'||boundary.wrapperTextRole!=='context_only'){
          flags.push(`HATA: İpucu ${i+1} şifreli mesajında qaMechanicBoundary eksik/geçersiz. primaryEvidence:"sifre" ve wrapperTextRole:"context_only" tanımla; kritik çıkarım şifrenin çözümünde kalmalı.`);
        }
        if(!wrapper){
          flags.push(`HATA: İpucu ${i+1} şifreli mesajının text alanı boş. Üst metin yalnızca şifrenin nerede/nasıl bulunduğunu anlatan kısa bir bağlam taşımalı.`);
        } else {
          if(wrapper.length>240){
            flags.push(`HATA: İpucu ${i+1} şifreli mesajının üst metni ${wrapper.length} karakter; context_only şifre kartı en fazla 240 karakter olmalı. Uzun özet, çözme eylemini gereksizleştirir.`);
          }
          const conclusionRe=/(çözül|deşifre|açığa çıkar|göster(di|iyor)|kanıtla|doğrula|eşleş|tespit|ifşa)/i;
          const payloadRe=/(şüpheli|katil|fail|silah|tripod|kablo|tabanca|kostüm odası|ana set|prodüksiyon ofisi|teslim aldı|vardiya raporu)/i;
          const ruleIds=new Set();
          (cl.logicRules||[]).forEach(r=>(r.pair||r.cift||[]).forEach(id=>ruleIds.add(id)));
          const ruleNames=[...ruleIds].map(id=>{
            const ent=[...(c.suspects||[]),...(c.weapons||[]),...(c.locations||[])].find(e=>e.id===id);
            return ent&&ent.name;
          }).filter(Boolean);
          const leakedNames=mentionsAny(wrapper,ruleNames);
          const resolved=String(cipher.cozulmus||cipher.answer||cipher.cevap||'').trim();
          const resolvedLeak=resolved && fmNorm(wrapper).includes(fmNorm(resolved));
          const problems=[];
          if(conclusionRe.test(wrapper)) problems.push('çözüm/sonuç dili');
          if(payloadRe.test(wrapper)) problems.push('şifrenin taşıması gereken kanıt ayrıntısı');
          if(leakedNames.length) problems.push(`kural tarafının adı (${leakedNames.join(', ')})`);
          if(resolvedLeak) problems.push('çözülmüş mesajın kendisi');
          if(problems.length){
            flags.push(`HATA: İpucu ${i+1} şifreli mesajının text alanı ${problems.join(' + ')} içeriyor. Şifre kartının üst metni yalnızca keşif bağlamı olmalı; şüpheli–silah/mekân çıkarımı sadece sifre alanı çözülünce açılmalı.`);
          }
        }
      }
    }
    if(isAudio){
      actual.add('ses_kaydi');
      const transcript=String(cl.sesMetni||'').trim();

      /* v25.3 — ETKİLEŞİMİN KANIT DEĞERİ
         Ses kaydı kartındaki üst metin yalnızca kaydın BULUNMA bağlamını verebilir.
         Şüpheli/yöntem bağını, ses eşleştirmesini veya kaydın sonucunu bu metin özetliyorsa
         oyuncu Play düğmesine basmadan cevabı alır; mekanik dekorlaşır. Bu artık üretim engelidir. */
      const boundary=cl.qaMechanicBoundary||{};
      const strictBoundary=policy.requireMechanicEvidenceBoundary!==false;
      const wrapper=String(cl.text||'').trim();
      if(strictBoundary){
        if(boundary.primaryEvidence!=='sesMetni'||boundary.wrapperTextRole!=='context_only'){
          flags.push(`HATA: İpucu ${i+1} ses kaydında qaMechanicBoundary eksik/geçersiz. primaryEvidence:"sesMetni" ve wrapperTextRole:"context_only" tanımla; böylece kritik çıkarımın ses kaydının kendisinde kaldığı QA tarafından denetlenebilir.`);
        }
        if(!wrapper){
          flags.push(`HATA: İpucu ${i+1} ses kaydının text alanı boş. Metin yalnızca kaydın nerede/nasıl bulunduğunu anlatan kısa bir bağlam taşımalı.`);
        } else {
          if(wrapper.length>240){
            flags.push(`HATA: İpucu ${i+1} ses kaydının üst metni ${wrapper.length} karakter; context_only ses kartı en fazla 240 karakter olmalı. Uzun özet, dinleme eylemini gereksizleştirir.`);
          }
          const conclusionRe=/(ses\s*(eşleş|biyometri|analiz)|eşleş(ti|me)|doğrula|sabit(le|liyor)|tespit|kanıtla|karşılaştır|incelem(e|esi)|göster(di|iyor))/i;
          const payloadRe=/(blister|kapsül|tablet|reçete|sağlık\s+çant|mühür|seri\s+numara|şampanya|kadeh|kordon|zehir|boğma)/i;
          const ruleIds=new Set();
          (cl.logicRules||[]).forEach(r=>(r.pair||r.cift||[]).forEach(id=>ruleIds.add(id)));
          const ruleNames=[...ruleIds].map(id=>{
            const ent=[...(c.suspects||[]),...(c.weapons||[]),...(c.locations||[])].find(e=>e.id===id);
            return ent&&ent.name;
          }).filter(Boolean);
          const leakedNames=mentionsAny(wrapper,ruleNames);
          const problems=[];
          if(conclusionRe.test(wrapper)) problems.push('analiz/sonuç dili');
          if(payloadRe.test(wrapper)) problems.push('etkileşimin taşıması gereken kanıt ayrıntısı');
          if(leakedNames.length) problems.push(`kural tarafının adı (${leakedNames.join(', ')})`);
          if(problems.length){
            flags.push(`HATA: İpucu ${i+1} ses kaydının text alanı ${problems.join(' + ')} içeriyor. Ses kartının üst metni yalnızca keşif bağlamı olmalı; şüpheli–yöntem/mekân çıkarımı sadece sesMetni içinde oyuncunun dinlemesiyle açılmalı.`);
          }
        }
        if(transcript && transcript.length<100){
          flags.push(`HATA: İpucu ${i+1} ses kaydının transcripti çok kısa (${transcript.length} karakter). Mekanik, bağımsız bir çıkarım taşıyacak kadar içerik sunmalı.`);
        }
      }

      const directUrl=String(cl.audioUrl||'').trim();
      const assetId=String(cl.audioAssetId||'').trim();
      const asset=fmFindAsset(c,assetId);
      const path=directUrl||fmAudioAssetPath(asset);
      const delivery=fmAudioDeliveryState(c,cl,asset);
      const row={
        clueId:cl.id||`c${i+1}`, clueNo:i+1, title:cl.title||'', assetId,
        fileName:delivery.fileName||'', publicPath:asset&&asset.publicPath||path||'',
        mimeType:asset&&asset.mimeType||'', status:delivery.state, transcript:!!transcript,
        ready:delivery.ready, planned:delivery.planned, path
      };
      assetRows.push(row);
      if(!transcript) flags.push(`HATA: İpucu ${i+1} ses kaydı olarak işaretli ancak "sesMetni"/transcript yok. Oyuncu duyduğu içeriği erişilebilir biçimde okuyabilmeli.`);
      if(requireManifest && !assetId){
        flags.push(`HATA: İpucu ${i+1} ses kaydı için audioAssetId eksik. İlgili ipucunda ses varlığının kimliği ve hedef yolu tanımlanmalı.`);
      }
      if(requireManifest && assetId && !asset){
        flags.push(`HATA: İpucu ${i+1} audioAssetId="${assetId}" kullanıyor ama assetManifest içinde karşılığı yok.`);
      }
      if(asset){
        const kind=fmNorm(asset.kind||'');
        const linked=String(asset.clueId||'').trim();
        const fileName=String(asset.fileName||'').trim();
        const publicPath=String(asset.publicPath||'').trim();
        const mime=String(asset.mimeType||'').trim();
        if(kind!=='audio') flags.push(`HATA: Ses ipucu ${i+1}'in assetManifest kaydı kind:"audio" olmalı; şu an "${asset.kind||'?'}".`);
        if(linked!==String(cl.id||'')) flags.push(`HATA: assetManifest "${assetId}" kaydındaki clueId="${linked||'?'}", ses ipucu "${cl.id||`c${i+1}` }" ile eşleşmiyor.`);
        if(!fileName) flags.push(`HATA: assetManifest "${assetId}" için fileName eksik.`);
        if(!publicPath || !/^\/assets\//.test(publicPath) || /\.\./.test(publicPath)) flags.push(`HATA: assetManifest "${assetId}" için publicPath güvenli ve mutlak bir oyun yolu olmalı (örn. /assets/cases/vaka/audio/kayit.mp3).`);
        if(!/^audio\//.test(mime)) flags.push(`HATA: assetManifest "${assetId}" için audio/* biçiminde mimeType eksik/geçersiz.`);
        if(!path) flags.push(`HATA: assetManifest "${assetId}" için audioUrl/publicPath bulunmuyor.`);
        if(directUrl && publicPath && directUrl!==publicPath) flags.push(`HATA: İpucu ${i+1} audioUrl="${directUrl}", manifest publicPath="${publicPath}". Tek bir kanonik yol kullan; ikisi aynı olmalı.`);
        if(!delivery.ready){
          const msg=`PLANLI SES TESLİMİ: İpucu ${i+1} · "${cl.title||cl.id||'?'}" için transcript ve hedef dosya sözleşmesi tamam. MP3 dosyasını daha sonra "${publicPath||path||'belirtilen oyun yolu'}" konumuna ekle. Bu teslim notu içerik QA'sını ve export'u durdurmaz.`;
          if(delivery.blocks||blockOnPendingMedia) flags.push(`HATA: ${msg} qaPolicy.blockOnPendingMedia:true olduğu için fiziksel ses dosyası yüklenmeden export kapalı.`);
          else warnings.push(msg);
        }
      } else if(!directUrl){
        flags.push(`HATA: İpucu ${i+1} ses kaydı için oynatılabilir hedef yol eksik. audioUrl ve/veya assetManifest.publicPath tanımla.`);
      }
    }
  });
  declared.forEach(m=>{ if(!actual.has(m)) flags.push(`HATA: specialMechanic "${c.specialMechanic}" içinde ${m} ilan edilmiş ama bu mekaniği taşıyan render edilebilir bir ipucu yok.`); });
  actual.forEach(m=>{ if(declared.size && !declared.has(m)) warnings.push(`İpucu verisinde ${m} mekaniği var ancak specialMechanic bunu ilan etmiyor. Başlık/entegrasyon talimatı eksik kalabilir.`); });
  return {flags,warnings,declared:[...declared],actual:[...actual],requireAssets:false,requireManifest,blockOnPendingMedia,assetRows};
}
function solutionNarrativeCheck(c){
  const flags=[],warnings=[];
  const narrative=String(c.solutionNarrative||'');
  if(!narrative.trim()) return {flags,warnings};
  const sol=fmExpectedSolutionIds(c);
  const ACTION=/(kullan|den(e|edi|em)|içir|zehirle|vur|boğ|saldır|öldür|işini bitir|sustur|başaram|uygula)/i;
  (c.weapons||[]).forEach(w=>{
    if(w.id===sol.W) return;
    if(mentionsAny(narrative,[w.name]).length && ACTION.test(narrative)){
      flags.push(`HATA: Çözüm Anlatısı Kapsam Taşkını — nihai anlatı, çözüm silahı olmayan "${w.name}" için aktif bir saldırı/deneme eylemi anlatıyor. Tek cinayet silahı sözleşmesini bulandırır ve bu ikinci yöntem ipuçlarında kanıtlanmamış olabilir. Bu bölümü kaldır veya ayrı, kanıtlanmış bir olay zinciri olarak tasarla.`);
    }
  });
  return {flags,warnings};
}

/* ---- v17: İPUCU BAŞINA BİLGİ BÜTÇESİ ----
   solver ilk aşırı bilgi yükünde durur; bu ek tarama bütün temel ipuçlarını
   topluca raporlar, böylece yazar yalnızca ilk hatayı değil tüm tıkanıklıkları görür. */
function perClueDisclosureCheck(c){
  const flags=[],warnings=[];
  const level=c.difficultyLevel;
  const hard=level==null||level>=3;
  const cat=id=>fmEntityCategory(c,id);
  (c.clues||[]).forEach((cl,i)=>{
    if(cl.isBonus||!Array.isArray(cl.logicRules)||cl.logicRules.length<2) return;
    const axes=new Set();
    cl.logicRules.forEach(r=>{
      const action=(r.action||'').toLowerCase();
      const p=r.pair||r.cift||[];
      if(p.length!==2||!['confirm','eliminate','eslesme_yok'].includes(action)) return;
      const a=cat(p[0]),b=cat(p[1]);
      if(!a||!b||a===b) return;
      axes.add([a,b].sort().join('-'));
    });
    if(axes.size>=2){
      const labels={
        'location-suspect':'şüpheli–mekan',
        'suspect-weapon':'şüpheli–silah',
        'location-weapon':'silah–mekan'
      };
      const description=[...axes].map(a=>labels[a]||a).join(' + ');
      const msg=`İpucu ${i+1}${cl.title?' · '+cl.title:''}, tek metinde ${description} olmak üzere ${axes.size} ayrı eksende kesin kural kuruyor. Bir temel ipucu en fazla TEK ekseni ilerletmeli; aksi halde oyuncu iki düğümü tek hamlede çözer.`;
      if(hard) flags.push(`HATA: Çok Eksenli İfşa — ${msg}`);
      else warnings.push(`UYARI: ${msg}`);
    }
  });
  return {flags,warnings};
}

function computeQA(c){
  const structural=structuralCheck(c);
  const k1=solvabilityCheck(c);
  const k2=spoilerCheck(c);
  const k3=diversityCheck(c);
  const k4=bonusCheck(c);
  const consistency=consistencyCheck(c);
  const lazyEvidence=lazyEvidenceCheck(c);
  const miniGame=miniGameIntegrityCheck(c);
  const monotony=monotonyCheck(c);
  const literary=literaryQualityCheck(c);
  const traceability=traceabilityCheck(c);
  const traceabilityPolicy=traceabilityPolicyCheck(c,traceability);
  const ruleEntailment=ruleEntailmentCheck(c);
  const mechanicContract=mechanicContractCheck(c);
  const narrativeScope=solutionNarrativeCheck(c);
  const disclosure=perClueDisclosureCheck(c);
  const semantic=semanticAudit(c);
  const visibleEvidenceScope=visibleEvidenceScopeCheck(c);
  const coreNecessity=strictCoreNecessityCheck(c,semantic);
  const crimeScope=crimeScopeCheck(c);
  const patternGovernance=patternGovernanceCheck(c);
  const contentQuality=contentDepthAndNameCheck(c);
  let total=k1.score+k2.score+k3.score+k4.score;

  // FATAL'ler: yapısal bütünlük / tembel kanıt / sahte mini oyun / robotik biyografi.
  // (ikili ifşa & çapa & çözülebilirlik k1'de fataldir; monotonluk tavsiyedir.)
  const fatalFlags=[...structural.flags.map(f=>'🏗️ YAPI: '+f),...lazyEvidence.flags,...miniGame.flags,...literary.flags.map(f=>'🎭 EDEBİ KALİTE: '+f),...traceabilityPolicy.flags.map(f=>'🧭 İZLENEBİLİRLİK: '+f),...ruleEntailment.flags.map(f=>'⚖️ KANIT→KURAL: '+f),...mechanicContract.flags.map(f=>'🎮 MEKANİK SÖZLEŞMESİ: '+f),...narrativeScope.flags.map(f=>'📜 ÇÖZÜM ANLATISI: '+f),...disclosure.flags.map(f=>'🧩 İPUCU BİLGİ BÜTÇESİ: '+f),...semantic.flags.map(f=>'🧠 SEMANTİK: '+f),...visibleEvidenceScope.flags.map(f=>'👁️ GÖRÜNÜR KANIT: '+f),...coreNecessity.flags.map(f=>'🔗 TEMEL ZİNCİR: '+f),...crimeScope.flags.map(f=>'🧷 SUÇ BİLGİSİ KAPSAMI: '+f),...patternGovernance.flags.map(f=>'🧬 PORTFÖY PATERNİ: '+f),...contentQuality.flags.map(f=>'✍️ İSİM/İÇERİK: '+f)];
  const isFatal=fatalFlags.length>0;
  if(isFatal){ total=0; }

  // monotonluk & patern: tavsiye (puan kırmaz, ret etmez)
  const advisories=[];
  monotony.flags.forEach(f=>advisories.push(f.replace(/^HATA: Vaka İçi Monotonluk!/,'TAVSİYE (Monotonluk):')));
  if(monotony.advisories&&monotony.advisories.length) monotony.advisories.forEach(a=>advisories.push(a));
  if(consistency.advisories&&consistency.advisories.length) consistency.advisories.forEach(a=>advisories.push(a));
  if(traceability.warnings&&traceability.warnings.length) traceability.warnings.forEach(w=>advisories.push('TAVSİYE (İpucu→Matris İzlenebilirliği): '+w));
  if(traceabilityPolicy.warnings&&traceabilityPolicy.warnings.length) traceabilityPolicy.warnings.forEach(w=>advisories.push(w));
  if(ruleEntailment.warnings&&ruleEntailment.warnings.length) ruleEntailment.warnings.forEach(w=>advisories.push('TAVSİYE (Kanıt→Kural): '+w));
  if(mechanicContract.warnings&&mechanicContract.warnings.length) mechanicContract.warnings.forEach(w=>{
    const planned=/^PLANLI (SES|MEDYA) TESLİMİ:/i.test(w);
    advisories.push(planned ? 'ⓘ '+w : 'TAVSİYE (Mekanik Sözleşmesi): '+w);
  });
  if(narrativeScope.warnings&&narrativeScope.warnings.length) narrativeScope.warnings.forEach(w=>advisories.push('TAVSİYE (Çözüm Anlatısı): '+w));
  if(disclosure.warnings&&disclosure.warnings.length) disclosure.warnings.forEach(w=>advisories.push('TAVSİYE (İpucu Bilgi Bütçesi): '+w));
  if(semantic.warnings&&semantic.warnings.length) semantic.warnings.forEach(w=>advisories.push(w));
  if(visibleEvidenceScope.warnings&&visibleEvidenceScope.warnings.length) visibleEvidenceScope.warnings.forEach(w=>advisories.push('TAVSİYE (Oyuncu-Görünür Kanıt): '+w));
  if(coreNecessity.warnings&&coreNecessity.warnings.length) coreNecessity.warnings.forEach(w=>advisories.push(w));
  if(crimeScope.warnings&&crimeScope.warnings.length) crimeScope.warnings.forEach(w=>advisories.push('TAVSİYE (Suç Bilgisi Kapsamı): '+w));
  if(patternGovernance.warnings&&patternGovernance.warnings.length) patternGovernance.warnings.forEach(w=>advisories.push('TAVSİYE (Portföy Paterni): '+w));
  if(contentQuality.warnings&&contentQuality.warnings.length) contentQuality.warnings.forEach(w=>advisories.push('TAVSİYE (İsim/İçerik Derinliği): '+w));
  // KURAL 1c: zor vakada "çözüme katkı" tavsiyesi k1.findings'ten advisory listesine taşınır
  // (⚙ Geliştirilebilir tetiklesin diye — puan kırmaz ama "kusursuz değil" mesajı verir).
  (k1.findings||[]).forEach(f=>{ if(/^TAVSİYE \(Çözüme Katkı\):/.test(f)) advisories.push(f); });

  // MİNİ OYUN İŞLEVSEL YÖNLENDİRME (tavsiye — puan kırmaz):
  // Parmak izi/şifre mini oyununun "aciklama" alanı, oyuncu mini oyunu oynamadan ÖNCE iz/şifre
  // kartlarının üstünde görünür. Bu alan TAMAMEN atmosferikse (ne kazanılacağına dair hiçbir
  // işlevsel ipucu yoksa), oyuncu "bunu neden yapıyorum?" diye kalabilir. İdeal denge: atmosfer +
  // "bu eşleşme seni çözüme/silaha/mekana bağlayacak" gibi SOMUT AD içermeyen işlevsel bir ima.
  // Spoiler kuralıyla çelişmez: ad/çözüm vermek yasak; "bir bağ kazanacaksın" demek serbest.
  c.clues.forEach((cl,i)=>{
    const pv=cl.parmakIziVerisi; const sf=cl.sifre;
    const aciklama = (pv&&pv.aciklama) || (sf&&sf.aciklama) || '';
    if(!aciklama || cl.isBonus) return;
    const isMini = (pv && Array.isArray(pv.izler)) || (sf && sf.sifrelenmis);
    if(!isMini) return;
    // işlevsel yönlendirme sinyali: eşleştir/çöz/bağla/tamamla/açığa çıkar/ortaya koy/yönlendir/halka/ipucu...
    const FUNC=/(eşleştir|eşleşme|çöz|çözül|bağla|bağlan|tamamla|halka|zincir|kilid|aç[ıi]ğa|ortaya|yönlendir|işaret ed|kanıtla|ele ver|teşhis|kim olduğu|sahibini?|sahibiyle|kullanan)/i;
    if(!FUNC.test(aciklama)){
      advisories.push(`TAVSİYE (Mini Oyun Yönlendirmesi): İpucu ${i+1}'in mini oyun açıklaması tamamen atmosferik — oyuncu, bu izi/şifreyi çözünce NE kazanacağını (örn. "katili silaha bağlayan halkayı tamamlayacak") açıklamadan anlamıyor; yalnızca "Yönlendirici Soru" butonuna basarsa görüyor. Gizemi bozmadan işlevsel bir ima ekleyebilirsin: somut ad/çözüm VERME ama "bu eşleşme seni çözüme yaklaştıracak / katili silahına bağlayacak" gibi bir cümleyle oyuncuya neden oynadığını hissettir. (Puan kırmaz; oyuncu deneyimi için önerilir.)`);
    }
  });
  // Madde 2: ipucu başına kural sayısı — 2'ye kadar serbest (stratejik karmaşıklık),
  // 3+ kuralı OLAN ipucu için yalnızca tavsiye (ceza yok).
  c.clues.forEach((cl,i)=>{
    const n=Array.isArray(cl.logicRules)?cl.logicRules.length:0;
    if(n>2) advisories.push(`TAVSİYE (Kural Yoğunluğu): İpucu ${i+1} ${n} logicRule içeriyor. 2'ye kadar "stratejik karmaşıklık" olarak ideal; daha fazlası tek hamlede çok şey çözebilir. Bölmeyi düşünebilirsin (zorunlu değil).`);
  });
  // v29.4: Sayı sabit değildir. 4-6 doğal banttır; zor vakalarda 7 kabul edilir.
  // Asıl kapı strictCoreNecessityCheck'tir: her temel ipucu tek tek zorunlu olmalıdır.
  const coreCount=c.clues.filter(cl=>!cl.isBonus).length;
  if(coreCount<4){
    advisories.push(`TAVSİYE (İpucu Ekonomisi): ${coreCount} standart ipucu çözüm akışını fazla kısa bırakıyor. Çözümü 4 veya daha fazla, birbirinden farklı ve tek tek zorunlu ipucuna yay.`);
  } else if(coreCount===7 && Number(c.difficultyLevel||0)<4){
    advisories.push(`TAVSİYE (İpucu Ekonomisi): 7 standart ipucu yalnız gerçekten zor vakalarda kullanılmalı. Bu vakanın zorluk seviyesi ${c.difficultyLevel||'?'}; akışı 4-6 tek tek zorunlu ipucuda sıkılaştır veya zorluk tasarımını açıkça gerekçelendir.`);
  } else if(coreCount>7){
    advisories.push(`TAVSİYE (İpucu Ekonomisi): ${coreCount} standart ipucu mobil akışı gereksiz uzatabilir. 4-6 doğal, gerçekten zor vakalarda 7 üst sınırdır; yalnız zorunlu olmayanları kaldır.`);
  }
  // solvabilityCheck zaten redundant ipucu yakaladıysa onu vaka-bazlı tavsiyeye çevir
  if(k1.findings.some(f=>/İpucu Fazlalığı/.test(f))){
    advisories.push(`TAVSİYE (İpucu Uyumu): Bir temel ipucu, diğer ipuçlarının zaten verdiği bilgiyi tekrarlıyor olabilir (çıkarıldığında çözüm değişmiyor). Her temel ipucu ızgaraya yeni bir şey katmalı; aksi halde oyuncu onu gereksiz bulur. İlgili ipucunu farklı bir eksene yönelt ya da bonusa çevir. (Vaka-bazlı değerlendir — bazen tematik tekrar kabul edilebilir.)`);
  }
  // mini oyun cevap-alanı eksikliği gibi uyarılar (fatal değil, geliştirme)
  if(miniGame.warnings&&miniGame.warnings.length) miniGame.warnings.forEach(wn=>advisories.push('TAVSİYE (Mini Oyun Cevabı): '+wn));
  // Madde d: mini oyun (anagram/şifre/parmak izi) TEŞVİKİ
  const hasMini=c.clues.some(cl=>{
    const mt=(cl.mechanicType||'').toLowerCase(), ty=(cl.type||'').toLowerCase();
    return cl.parmakIziVerisi||cl.profilSenteziVerisi||cl.sifre||!!cl.miniGameType||['parmak_izi','profil_sentezi','profil_eslestirme','sifreli_mesaj','anagram','gorsel_ipucu','ses_kaydi','sifreli','kriptogram','minigame'].includes(mt)||['parmak_izi','profil_sentezi','profil_eslestirme','sifreli','minigame','anagram','kriptogram'].includes(ty);
  });
  const qaTier=fmCaseTier(c);
  const advancedRequired=fmRequiresAdvancedMechanic(c);
  if(!hasMini){
    if(advancedRequired){
      advisories.push(`TAVSİYE (Premium Mekanik): Premium his için değil, premium standart için en az bir oynanabilir gelişmiş ipucu zorunlu. Bir anagram, şifreli not, ses kaydı, profil sentezi veya parmak izi mini oyunu ekle; mantık zincirine gerçek bir katkı vermeli ve cevabı sızdırmamalı.`);
    } else {
      advisories.push(`ⓘ Standart mod: Bu vaka metin tabanlı ilerliyor; ücretsiz/standart vakalarda gelişmiş mini oyun zorunlu değildir. Mantık zinciri ve oynanabilirlik güçlüyse 100/100 alabilir.`);
    }
  } else if(!miniGame.fatal){
    // sadece GERÇEK (oynanabilir veri dolu) mini oyun varsa öv
    advisories.push(`✓ Mini oyun mevcut — ${qaTier==='premium'?'premium standardı':'standart vakada opsiyonel zenginlik'} için artı. Mekaniğin temel mantık zincirine gerçek bir katkı verdiğinden ve cevabı sızdırmadığından emin ol.`);
  }

  // --- BAŞKOMİSER EŞİĞİ ---
  let statusLabel,statusClass;
  const hasRedFlag=consistency.flags.length>0||isFatal||crimeScope.flags.length>0||patternGovernance.flags.length>0||contentQuality.flags.length>0;
  // 100 alındığında bile geliştirilecek nokta var mı?
  // V25.2 KURAL: Raporun herhangi bir kalite bölümü oyuncu deneyimi için "TAVSİYE"/"UYARI"
  // üretiyorsa vaka "Kusursuz" etiketi alamaz. Böylece puan 100 olsa bile kullanıcıdan
  // gizli kalan ikinci bir manuel kalite kontrol ihtiyacı doğmaz.
  const realAdvisories=advisories.filter(a=>!/^✓/.test(a) && !/^ⓘ/.test(a));
  const embeddedQualityAdvisories=[k1,k2,k3,k4]
    .flatMap(section=>Array.isArray(section&&section.findings)?section.findings:[])
    .filter(f=>/^(?:💡\s*)?TAVSİYE|^UYARI/i.test(String(f)));
  const hasImprovements=(literary&&literary.warnings.length>0)
    ||realAdvisories.length>0
    ||embeddedQualityAdvisories.length>0;
  if(isFatal){statusLabel='REDDEDİLDİ';statusClass='fail';}
  else if(total>=100 && !hasRedFlag){
    if(hasImprovements){ statusLabel='ONAYLANDI ⚙ (Geliştirilebilir)'; statusClass='okimprove'; }
    else { statusLabel='ONAYLANDI ✦ (Kusursuz)'; statusClass='ok'; }
  }
  else if(total>=90){statusLabel=hasRedFlag?'TUTARSIZLIK — DÜZELT':'GELİŞTİRİLMELİ';statusClass='fix';}
  else if(total>=70){statusLabel='DÜZELTME GEREKİYOR';statusClass='fix';}
  else if(total>=50){statusLabel='ZAYIF';statusClass='fail';}
  else {statusLabel='REDDEDİLDİ';statusClass='fail';}

  // gemini düzeltme önerileri
  const fixes=[];
  if(structural.flags.length){
    fixes.push('YAPISAL HATALAR (önce bunlar): '+structural.flags.map(f=>f.replace(/^YAPISAL HATA: /,'')).join(' || ')+' — Bu teknik hatalar vakayı oyunda çökertir; logicRules id\'lerini, solution alanını, icon\'ları ve revealOrder\'ı düzelt.');
  }
  if(traceabilityPolicy.flags.length){
    fixes.push('İZLENEBİLİRLİK SÖZLEŞMESİ: Her logicRules taşıyan ipucuya QA-only qaRationale ekle: {"matrixEffect":"A ↔ B doğrulanır / A ≠ B elenir","evidenceLink":"metindeki somut dayanak","evidenceKind":"forensic|documentary|record|witness|mechanical|medical|physical|audio"}. Bu alan exportta temizlenir; oyuncuya görünmez.');
  }
  if(ruleEntailment.flags.length){
    fixes.push('KANIT→KURAL BAĞI: Saik (borç, terfi, öfke, intikam) tek başına confirm/eliminate üretemez. Saik ipuçlarını bonus anlatısı yap; silah/mekan eşleşmesi için ayrı bir fiziksel iz, teslim kaydı, vardiya belgesi, tanık veya ses/görüntü kaydı ekle.');
  }
  if(mechanicContract.flags.length){
    fixes.push('MEKANİK VARLIK SÖZLEŞMESİ: Parmak izi/şifre/ses gibi ilan edilen her mini oyun, simülatörde ve oyunda render edilebilir veri taşımalı. Ses kaydı için zorunlu üretim sözleşmesi: clue.audioAssetId + clue.audioUrl + clue.sesMetni VE top-level assetManifest kaydı {assetId,kind:"audio",clueId,fileName,publicPath,mimeType,status:"ready"}. Dosyayı publicPath yoluna yükle; audioUrl ve publicPath birebir aynı olsun. QA-only üretim notlarını qaAssetBrief altında tut; export bunları temizler.');
  }
  if(narrativeScope.flags.length){
    fixes.push('ÇÖZÜM ANLATISI: Nihai anlatı yalnızca solver ve ipuçlarıyla kanıtlanmış tek cinayet silahı/yöntemi üzerinden ilerlemeli. Kanıtlanmamış ikinci zehir/hançer/tabanca denemelerini çıkar veya bunları ayrı, belgelenmiş bir olay zinciri haline getir.');
  }
  if(disclosure.flags.length){
    fixes.push('İPUCU BİLGİ BÜTÇESİ: Aynı standart ipucunda iki farklı eşleşme eksenini (şüpheli–silah + şüpheli–mekan gibi) kesinleştirme. Bu bilgileri iki ayrı temel ipucuna böl; her birinin çıkarılmasıyla çözüm yeniden belirsizleşsin.');
  }
  if(semantic.flags.length){
    fixes.push('OYUNCU-GÖRÜNÜR SEMANTİK: Hikâye ve her standart ipucunun oyuncuya kesin olarak verdiği katil/silah/mekan bilgisini qaSemanticFacts ile kaynak bazında belgeleyin. Ardından metinden doğan erken çözüm yolunu kapatın veya bulmaca zincirini yeniden dağıtın.');
  }
  if(visibleEvidenceScope.flags.length){
    fixes.push('OYUNCU-GÖRÜNÜR KURAL KAPSAMI: Her standart ipucunun metni, deductionHint’i ve varsa ses transkripti yalnızca kendi logicRules hücresini desteklemeli. Metinde başka bir şüpheli/silah/mekânı güçlü biçimde çağrıştıran ama rule’a yazılmamış ifadeleri kaldır; aksi hâlde sonraki temel ipucu oyuncu açısından tekrara düşer.');
  }
  if(coreNecessity.flags.length){
    fixes.push('SIKI TEMEL İPUCU EKONOMİSİ: Her isBonus:false ipucu çıkarıldığında katil+silah+mekan cevabı belirsiz kalmalıdır. Cevabı değiştirmeyen temel ipuçlarını bonusa taşıyın ya da onları eksik olan cevap bileşenini daraltacak biçimde yeniden yazın.');
  }
  if(miniGame.flags.length){
    fixes.push('SAHTE MİNİ OYUN: Bir ipucu mini oyun (kriptogram/anagram/parmak izi) olduğunu belirtiyor ama oynanabilir veri içermiyor — sadece düz cümle var. Bu premium bulmaca ekranını çökertir. ÇÖZÜM: şifre/anagram için "sifre": {"sifrelenmis":"<bulmaca>", "cozulmus":"<cevap>", "cozumIpucu":"<cezalı ipucu>", "aciklama":"<cevap bulununca anlatılan hikaye>"} ekle; parmak izi için "parmakIziVerisi" ekle. Bulmaca eklemeyeceksen ipucunun type/miniGameType\'ını düz ipucuna (adli/kanit/tanik) çevir — sahte etiket bırakma.');
  }
  if(k1.findings.some(f=>/Çift İfşa Sızıntısı/.test(f))){
    fixes.push('ÇİFT İFŞA (Çapa): Çapa ipucunun logicRules\'u tek başına cinayet triadının iki öğesini bağlamamalı — ne tek confirm\'le ne de bir mekandan/şüpheliden birden çok öğeyi eleyip tek seçenek bırakarak. Çapa SADECE cinayetle ilişkili tek bir öğeyi sabitlesin (örn. yalnızca cinayet mekanını: tek bir confirm ya da o mekana dair tek bir bilgi). Silah-mekan/katil-silah bağını ayrı ipuçlara, mümkünse ters-çapraz çıkarıma bırak.');
  }
  if(k1.findings.some(f=>/Aşırı Bilgi Yükü/.test(f))){
    fixes.push('AŞIRI BİLGİ (Standart İpucu): Bir temel ipucu aynı anda iki ayrı eksen-çiftini (örn. hem silah-mekan hem şüpheli-mekan) kesinleştiriyor ya da tek seferde üç ekseni birden bağlıyor. Her temel ipucu en fazla TEK bir eşleşme versin; fazlasını ayrı ipuçlara böl ki dedüksiyon örüntüsü korunsun. (İstisna: ek/bonus ipuçları.)');
  }
  if(k1.findings.some(f=>/İkili İfşa Sızıntısı/.test(f))){
    fixes.push('İKİLİ İFŞA: Çapa ipucunun logicRules\'unu düzelt — cinayet triadının iki öğesini (silah+mekan, katil+silah, katil+mekan) aynı confirm ile bağlama. Bunun yerine çapada eliminate kullan, ya da bir tarafı masum olan eşleşme ver. Triadın iki öğesini birbirine bağlama işini standart ipuçlara dağıt ki oyuncu adım adım çözsün.');
  }
  if(k1.findings.some(f=>/Zayıf Çapa Metni/.test(f))){
    fixes.push('ZAYIF ÇAPA: isCrimeAnchor ipucusunun metnine, eşleşmenin bizzat cinayet/ölüm olayı olduğunu söyleyen vurucu bir ifade ekle. Örn. "Yatak odasında afyonla zehirlenen maktul son nefesini verdi" — sadece "afyon yatak odasındaydı" yetmez; oyuncu bunun cinayet anı olduğunu net anlamalı.');
  }
  if(k1.findings.some(f=>/Cinayet Çapası Eksik/.test(f))){
    fixes.push('CİNAYET ÇAPASI: Temel ipuçlarından en az birine "isCrimeAnchor": true ekle ve o ipucu cinayet üçlüsünden birini (silah/mekan/katil) doğrudan suça bağlasın. Örn: "Maktul yatak odasında afyonla zehirlenmişti" — bu, oyuncunun ızgaradaki eşleşmelerden hangisinin CİNAYET olduğunu bilmesini sağlar. Çapa doğrudan ifade de olabilir, bir mini oyun/şifre sonucu da.');
  }
  // (CLIMAX SIRASI fix'i kaldırıldı — mini oyun artık herhangi bir sırada olabilir, bu bir hata değil.)
  if(k1.findings.some(f=>/İpucu Tekrarı/.test(f))){
    fixes.push('İPUCU TEKRARI: Hiçbir yeni hücre doldurmayan ipucuyu ya kaldır ya da farklı bir eksene yönelt. Her temel ipucu matriste benzersiz bir X/✓ üretmeli — örn. zaten elenmiş bir mekanı tekrar elemek yerine, henüz dokunulmamış bir silah-şüpheli bağını kur.');
  }
  if(k1.findings.some(f=>/Erken Çöküş/.test(f))){
    fixes.push('ERKEN ÇÖKÜŞ: Özel mekanik (parmak izi/şifre) ipucundan ÖNCEKİ ipuçları matrisi tek çözüme indirmemeli. O ipuçlarından birini, ancak mini oyun çözülünce tamamlanacak bir eksen bırakacak şekilde zayıflat — climax mini oyun olsun. Örn: mini oyun katil-silah bağını verecekse, önceki ipuçları yalnızca mekan eksenini netleştirsin, katili açıkça confirm etmesin.');
  }
  if(k1.findings.some(f=>/Temel İpuçları Yetersiz/.test(f))){
    fixes.push('TEMEL ÇÖZÜLEBİLİRLİK: isBonus:false ipuçlarının logicRules kısıtlarını güçlendir — oyuncu hiç bonus açmadan tek çözüme inebilmeli. Eksik ekseni kapatacak bir confirm/eliminate çifti ekle (örn. katil-mekan veya silah-mekan bağı).');
  }
  if(k1.findings.some(f=>/Bonus .*(ÇELİŞİYOR|DEĞİŞTİRİYOR)/.test(f))){
    fixes.push('BONUS TUTARLILIĞI: Bonus ipuçlarının logicRules kuralları temel çözümle çelişiyor. Bonusları, temel ipuçların bulduğu çözümü DOĞRULAYAN (aynı yöne işaret eden) kurallara çevir.');
  }
  if(k1.findings.some(f=>/Çaylak.*Doğrudanlık/.test(f))){
    fixes.push('ÇAYLAK DOĞRUDANLIK: 1★ vaka için temel ipuçlarına en az 2-3 doğrudan "confirm" ekle (örn. katili mekanıyla, silahı mekanıyla eşleştir). Çaylak oyuncu karmaşık çapraz çıkarıma değil, akıcı pozitif eşleşmelere ihtiyaç duyar.');
  }
  if(k2.findings.some(f=>/Açıklaması Cevabı Sızdırıyor/.test(f))) fixes.push('MİNİ OYUN AÇIKLAMASI SPOILER: Şifre/bulmaca ipucunun "sifre.aciklama" alanı, bulmacanın çözünce ortaya çıkacak eşleşmesinin taraflarını (şüpheli/mekan/silah) ADIYLA yazıyor — ve bu açıklama ekranda bulmacanın hemen altında, oyuncu çözmeden görünüyor. "aciklama" alanını isimden arındır: yalnızca atmosferik kapanış olsun (örn. "Karanlık koridorların sırrı çözüldü, gece yaşananlar aydınlandı"). Çözümün şüpheli/mekan/silah adını ASLA yazma — oyuncu cevabı bulmacayı çözerek öğrenmeli.');
  if(k2.score<20) fixes.push('Mini oyunların aciklama/cozumIpucu/deductionHint/sahneGorseli alanlarından katil-silah-mekan adlarını çıkar; "şifre çözülünce ortaya çıkacak" üslubuna geç.');
  if(k2.findings.some(f=>/Mini oyun .* "text" alanı/.test(f))) fixes.push('Mini oyun ipuçlarının "text" alanını yeniden yaz: şüphelinin adını/mesleğini/bariz betimlemesini çıkar. Metin yalnızca sahneyi ve bulmacayı kuran gizemli bir kurgu olmalı (örn. "Vazonun sapında yağa bulanmış taze bir iz parlıyordu"), kime ait olduğunu oyuncu mini oyunu oynayarak bulmalı.');
  if(k3.score<16){
    fixes.push('İpucu tiplerini çeşitlendir (adli + tanık + kanıt + mini oyun harmanı; hiçbir tip toplamın %70\'ini geçmesin).');
    fixes.push('Tembel/doğrudan eleme cümlelerini ("X orada değildi") çevresel/adli/dolaylı anlatıma çevir ("X\'in ayakkabısında o bölgeye ait kil yoktu").');
  }
  if(k3.findings.some(f=>/deductionHint cevabı ele veriyor/.test(f))){
    fixes.push('SPOILER RİSKİ: deductionHint alanlarında geçen isimleri kaldır, Sokratik soruya çevir. Soru, oyuncuyu ızgarada belirli bir X/✓ işaretine yönlendirmeli. Örn. "Listedeki silahlardan hangisi bir kafatasını bu kütleyle parçalayabilir?"');
  }
  if(k3.findings.some(f=>/Tematik Tekrar/.test(f))){
    fixes.push('TEMATİK TEKRAR: Mini oyunun temasını (örn. parmak/temas izi) düz text ipuçlarında tekrarlama. O ipuçlarını farklı çıkarım eksenlerine taşı: alerji/koku, fobi, boy-erişim, fiziksel engel, mesleki alışkanlık, ayakkabı/giysi izi, ses/aksan gibi benzersiz yöntemler kullan.');
  }
  if(k3.findings.some(f=>/Somut Delil Eksikliği/.test(f))){
    fixes.push('SOMUT DELİL: "Yasaktı / izin verilmezdi / sevmezdi" gibi sosyal-psikolojik kısıtları delil yapan ipuçlarını yeniden yaz. Eleme fiziksel imkansızlığa dayanmalı: örn. "kapı turnike kaydında o saatte giriş yok", "dar geçitten geniş omuzlarıyla sığamazdı", "ağır polen alerjisi o çiçekli odada nöbet geçirmesine yol açardı", "kamera kaydı koridoru boş gösteriyor".');
  }
  if(k3.findings.some(f=>/Cezalı İpucu Çok Basit/.test(f))){
    fixes.push('CEZALI İPUCU: cozumIpucu artık -60sn cezayla açılan bir yardım. "Eksik harfleri birleştir" gibi mekaniği ele veren ifadeyi kaldır; yerine sadece düşünme yönü veren üstü kapalı bir destek yaz (cevabı ya da tam yöntemi verme).');
  }
  if(k3.findings.some(f=>/Şifre Çok Basit/.test(f))){
    fixes.push('ŞİFRE KALİTESİ: Şifreyi zenginleştir — 5 harflik basit anagram yerine eksik-harfli gizemli bir cümle, akrostiş ya da çok katmanlı bir bulmaca kullan (sifrelenmis ≥10 anlamlı karakter).');
  }
  if(k3.findings.some(f=>/Metin Dili Ağır/.test(f))){
    fixes.push('METİN AKICILIĞI: Adli/edebi uzun cümlelere izin var ama tek cümlede 40 kelimeyi aşma. Gereksiz sıfat yığınını azalt, çok uzun cümleyi ikiye böl — gizem korunsun ama bir solukta okunabilsin.');
  }
  if(k4.score<20) fixes.push('En az 1 işlevsel isBonus:true ipucu kullan; cezasının karşılığında standart zinciri zorunlu kılmadan yeni ve doğrudan bir ✓/✕ matris yardımı versin. Sayıyı doldurmak için gereksiz bonus ekleme.');
  if(k4.findings.some(f=>/Pozitif|sadece eleme/i.test(f)&&/İHLAL/.test(f))) fixes.push('POZİTİF YÖNLENDİRME: Düşük/orta zorlukta en az bir bonus ipucuna "action: confirm" ekle — örn. katili silahı veya mekanıyla doğrudan eşleştir ki oyuncu net bir "neyin olduğu" bilgisiyle tatmin olsun.');
  if(crimeScope.flags.length) fixes.push('SUÇ BİLGİSİ BÜTÇESİ: Ölüm mahallini ve ölüm yöntemine dair pozitif/negatif adli bilgiyi aynı görünür metinden ayır. Cinayet sahnesi hikâyede ya da tek bir çapada kurulabilir; silah/yöntem bulgusu ise başka bir temel ipucunda gelmeli.');
  if(patternGovernance.flags.length) fixes.push('PORTFÖY BENZERSİZLİĞİ: qaPattern beyanını ve qaPortfolioRegistry.entries defterini ekle; çakışan ritimde açılışı, action dizisini, eksen sırasını, çapa biçimini veya mini oyun slotunu değiştir. 100/100 için bu kontrol artık zorunlu.');
  if(contentQuality.flags.length) fixes.push('İSİM VE İÇERİK KALİTESİ: Bozuk/jenerik şüpheli-silah-mekân adlarını aynı varlık kimliğini koruyan doğal Türkçeyle düzelt; boş veya anlamsız profilleri mevcut avatarın görünüşünü değiştirmeden işlev, bağlam ve motivasyonla tamamla. ID, görsel tür, fiziksel kimlik ve avatar anahtarlarını değiştirme.');
  consistency.flags.forEach(f=>fixes.push('TUTARLILIK: '+f.replace(/^🚩 KIRMIZI BAYRAK:\s*/,'')));
  if(lazyEvidence.fatal){
    fixes.push('TEMBEL KANIT: "İmkansızdı / asla / mümkün değil" gibi kesinlik kılıflarını somut bir adli dayanağa bağla. Örn. "asla giremezdi" yerine "kapı muhafızı o saatte kimsenin geçmediğini yeminle bildirdi" ya da "yapılan partikül analizinde eşyalarında hiçbir iz çıkmadı". Bulgu olmadan kesinlik iddiası kabul edilmez.');
  }
  if(literary.flags.length){
    fixes.push('EDEBİ KALİTE: Şüpheli biyografilerini negatif-eleme listesi olmaktan çıkar. "X\'ten anlamaz, asla yapmaz" yığını yerine karakteri organik betimle — mesleği, geçmişi, huyu, çelişkileri hikaye içinde hissettirilsin; zaafları bir özelliğin doğal sonucu olarak çıksın.');
  }
  if(literary.warnings.length){
    fixes.push('PROFİL TUTARLILIĞI: İpucunda anılan fiziksel özelliği (bıyık, topal vb.) ilgili şüphelinin biyografisine de işle ki gönderme tutarlı olsun.');
  }
  // Tavsiyeler ARTIK fixes'e EKLENMİYOR. Sebep: fixes "puanı 100'e çıkarmak için yapılması
  // gerekenler" listesidir; çeşitlilik tavsiyeleri ise puan kırmaz, zorunlu değildir ve yalnızca
  // SONRAKİ vakalar için hatırlatmadır. Bunlar KARAR bölümünde "sonraki vaka için" notu olarak
  // ayrıca gösteriliyor. fixes'e karıştırmak, 100 puanlık vakada Gemini'ye "hâlâ düzeltmem var"
  // hissi veriyordu (kısır döngünün bir sebebi). Sadece puanı <100 yapan gerçek düzeltmeler fixes'te.

  const topFlags=[...structural.flags, ...traceabilityPolicy.flags, ...ruleEntailment.flags, ...mechanicContract.flags, ...narrativeScope.flags, ...disclosure.flags, ...visibleEvidenceScope.flags,
                  ...crimeScope.flags, ...patternGovernance.flags, ...contentQuality.flags,
                  ...consistency.flags,
                  ...lazyEvidence.flags, ...literary.flags.map(f=>'🎭 '+f),
                  ...literary.warnings, ...contentQuality.warnings,
                  ...k2.findings.filter(f=>/ele veriyor|anlamsız|İHLAL/i.test(f)),
                  ...k3.findings.filter(f=>/ihlal|tembel|cevabı ele veriyor|tematik tekrar|somut delil|şifre çok basit|metin dili ağır|cezalı ipucu çok basit/i.test(f))];

  const productionReady=total>=100 && !hasRedFlag && !hasImprovements && semantic.flags.length===0 && visibleEvidenceScope.flags.length===0 && coreNecessity.passed && traceabilityPolicy.flags.length===0 && ruleEntailment.flags.length===0 && mechanicContract.flags.length===0 && narrativeScope.flags.length===0 && disclosure.flags.length===0 && crimeScope.flags.length===0 && patternGovernance.flags.length===0 && contentQuality.flags.length===0;
  return {k1,k2,k3,k4,structural,consistency,lazyEvidence,miniGame,monotony,literary,traceability,traceabilityPolicy,ruleEntailment,mechanicContract,narrativeScope,disclosure,semantic,visibleEvidenceScope,coreNecessity,crimeScope,patternGovernance,contentQuality,advisories,hasRedFlag,total,statusLabel,statusClass,fixes,topFlags,productionReady};
}

/* ---- RAPOR İÇİN VAKA İMZASI ---- */
function fmCaseFingerprint(c){
  const clues=Array.isArray(c.clues)?c.clues:[];
  const core=clues.filter(x=>!x.isBonus);
  const bonus=clues.filter(x=>x.isBonus);
  const audio=clues.filter(x=>(x.mechanicType||'')==='ses_kaydi').map(x=>x.id).join(', ')||'yok';
  const fp=clues.filter(x=>(x.mechanicType||'')==='parmak_izi'||x.parmakIziVerisi).map(x=>x.id).join(', ')||'yok';
  return `puzzleId: ${c.puzzleId||'tanımsız'} · ana mekanik: ${c.specialMechanic||'tanımsız'} · standart: ${core.length} · bonus: ${bonus.length} · ses: ${audio} · parmak izi: ${fp}`;
}

/* ---- RAPOR METNİ (kopyalanabilir) ---- */
function buildReportText(c,q){
  const line='==================================================';
  let r=`=== FAİLİ MEÇHUL VAKA QA RAPORU ===\n`;
  r+=`Vaka: ${c.title}\n`;
  r+=`Vaka İmzası: ${fmCaseFingerprint(c)}\n`;
  r+=`Vaka Tipi: ${fmCaseTierLabel(c)} · Gelişmiş Mekanik Zorunluluğu: ${fmRequiresAdvancedMechanic(c)?'evet':'hayır'}\n`;
  r+=`Genel Puan: ${q.total}/100  ·  Durum: ${q.statusLabel}\n`;
  r+=`${line}\n\n`;

  // ===== EN ÜSTTE: GEMINI İÇİN KARAR ÖZETİ =====
  const blockers=[];
  q.structural&&q.structural.flags.forEach(f=>blockers.push({sev:'KRİTİK',tag:'Yapı',msg:f}));
  q.traceabilityPolicy&&q.traceabilityPolicy.flags.forEach(f=>blockers.push({sev:'KRİTİK',tag:'İzlenebilirlik',msg:f}));
  q.ruleEntailment&&q.ruleEntailment.flags.forEach(f=>blockers.push({sev:'KRİTİK',tag:'Kanıt→Kural',msg:f}));
  q.mechanicContract&&q.mechanicContract.flags.forEach(f=>blockers.push({sev:'KRİTİK',tag:'Mekanik',msg:f}));
  q.narrativeScope&&q.narrativeScope.flags.forEach(f=>blockers.push({sev:'KRİTİK',tag:'Çözüm Anlatısı',msg:f}));
  q.disclosure&&q.disclosure.flags.forEach(f=>blockers.push({sev:'KRİTİK',tag:'Bilgi Bütçesi',msg:f}));
  q.k1.findings.forEach(f=>{ if(/HATA|İHLAL/.test(f)) blockers.push({sev:'KRİTİK',tag:'Mantık',msg:f}); else if(/UYARI/.test(f)) blockers.push({sev:'UYARI',tag:'Mantık',msg:f}); });
  if(q.semantic){ q.semantic.flags.forEach(f=>blockers.push({sev:'KRİTİK',tag:'Semantik',msg:f})); q.semantic.warnings.forEach(f=>blockers.push({sev:'UYARI',tag:'Semantik',msg:f})); }
  if(q.visibleEvidenceScope){ q.visibleEvidenceScope.flags.forEach(f=>blockers.push({sev:'KRİTİK',tag:'Görünür Kanıt',msg:f})); q.visibleEvidenceScope.warnings.forEach(f=>blockers.push({sev:'UYARI',tag:'Görünür Kanıt',msg:f})); }
  if(q.coreNecessity){ q.coreNecessity.flags.forEach(f=>blockers.push({sev:'KRİTİK',tag:'Temel Zincir',msg:f})); }
  if(q.crimeScope){ q.crimeScope.flags.forEach(f=>blockers.push({sev:'KRİTİK',tag:'Suç Bilgisi',msg:f})); }
  if(q.patternGovernance){ q.patternGovernance.flags.forEach(f=>blockers.push({sev:'KRİTİK',tag:'Portföy Paterni',msg:f})); }
  if(q.contentQuality){ q.contentQuality.flags.forEach(f=>blockers.push({sev:'KRİTİK',tag:'İsim/İçerik',msg:f})); q.contentQuality.warnings.forEach(f=>blockers.push({sev:'UYARI',tag:'İsim/İçerik',msg:f})); }
  if(q.literary){ q.literary.flags.forEach(f=>blockers.push({sev:'KRİTİK',tag:'Edebi',msg:f})); q.literary.warnings.forEach(f=>blockers.push({sev:'UYARI',tag:'Profil',msg:f})); }
  q.lazyEvidence&&q.lazyEvidence.flags.forEach(f=>blockers.push({sev:'KRİTİK',tag:'Kanıt',msg:f}));
  q.miniGame&&q.miniGame.flags.forEach(f=>blockers.push({sev:'KRİTİK',tag:'Mini Oyun',msg:f}));
  q.consistency.flags.forEach(f=>blockers.push({sev:'KRİTİK',tag:'Tutarlılık',msg:f}));
  q.k2.findings.forEach(f=>{ if(/İHLAL|ele veriyor/.test(f)) blockers.push({sev:'KRİTİK',tag:'Spoiler',msg:f}); });
  q.k3.findings.forEach(f=>{ if(/İHLAL/.test(f)) blockers.push({sev:'UYARI',tag:'Kalite',msg:f}); });

  if(q.total>=100 && /Kusursuz/.test(q.statusLabel)){
    r+=`✅ KARAR: ONAYLANDI ✦ (Kusursuz) — Üretime/oyuna hazır. Zorunlu ve kalite kapılarında açık madde yok.\n\n`;
  } else if(q.total>=100 && /Geliştirilebilir/.test(q.statusLabel)){
    r+=`✅⚙ KARAR: ONAYLANDI — 100/100, OYUNA HAZIR; ancak aşağıdaki kalite önerileri çözülmeden "Kusursuz" etiketi verilemez.\n`;
    const impr=[];
    if(q.literary&&q.literary.warnings.length) q.literary.warnings.forEach(f=>impr.push('[Profil] '+f));
    q.advisories.filter(a=>!/^✓/.test(a)&&!/^ⓘ/.test(a)).forEach(a=>impr.push(a));
    [q.k1,q.k2,q.k3,q.k4].forEach(section=>(section&&section.findings||[]).forEach(f=>{
      if(/^(?:💡\s*)?TAVSİYE|^UYARI/i.test(String(f))) impr.push(f);
    }));
    [...new Set(impr)].slice(0,5).forEach((m,i)=>r+=`  ⚙ ${m}\n`);
    r+=`\n${line}\n\n`;
  } else {
    const krit=blockers.filter(b=>b.sev==='KRİTİK');
    const uyar=blockers.filter(b=>b.sev==='UYARI');
    r+=`📋 GEMINI İÇİN KARAR ÖZETİ — Bu vaka ${q.total}/100. Aşağıdakiler düzeltilince 100 alır.\n`;
    if(krit.length){ r+=`\n🔴 ÖNCE BUNLAR (puanı en çok düşürenler):\n`; krit.slice(0,4).forEach((b,i)=>r+=`  ${i+1}. [${b.tag}] ${b.msg}\n`); }
    if(uyar.length){ r+=`\n🟡 SONRA BUNLAR (küçük puan kırıcılar):\n`; uyar.slice(0,4).forEach((b,i)=>r+=`  ${i+1}. [${b.tag}] ${b.msg}\n`); }
    r+=`\n${line}\n\n`;
  }

  r+=`PUAN DÖKÜMÜ\n`;
  r+=`🔍 Mantık: ${q.k1.score}/40   🚫 Spoiler: ${q.k2.score}/20   🧩 Kalite: ${q.k3.score}/20   ⭐ Bonus: ${q.k4.score}/20\n`;
  if(q.k1.usesLogic){
    r+=`(Solver: ${q.k1.totalWorlds} senaryodan ${q.k1.validWorlds}'i kurala uyuyor; katil üçlüsü ${q.k1.distinctSolutions===1?'TEK ✓':q.k1.distinctSolutions+' olası — SORUN'})\n`;
  }
  r+=`\n`;

  const sec=(title,findings)=>{ if(!findings||!findings.length) return; r+=`${title}\n`; findings.forEach(f=>r+=`  • ${f}\n`); r+=`\n`; };
  sec(`🔍 MANTIK VE ÇÖZÜLEBİLİRLİK — ${q.k1.score}/40`, q.k1.findings);
  if(q.semantic){ sec(`🧠 OYUNCU-GÖRÜNÜR ANLAM KATMANI`, [...(q.semantic.findings||[]), ...(q.semantic.warnings||[]), ...(q.semantic.flags||[])]); }
  if(q.visibleEvidenceScope){ sec(`👁️ OYUNCU-GÖRÜNÜR İPUCU KAPSAMI`, [...(q.visibleEvidenceScope.findings||[]), ...(q.visibleEvidenceScope.warnings||[]), ...(q.visibleEvidenceScope.flags||[])]); }
  if(q.coreNecessity){ sec(`🔗 SIKI TEMEL İPUCU ZORUNLULUK TESTİ`, [...(q.coreNecessity.findings||[]), ...(q.coreNecessity.flags||[])]); }
  if(q.crimeScope){ sec(`🧷 SUÇ BİLGİSİ BÜTÇESİ`, [...(q.crimeScope.findings||[]), ...(q.crimeScope.warnings||[]), ...(q.crimeScope.flags||[])]); }
  if(q.patternGovernance){ sec(`🧬 PORTFÖY PATERNİ VE BENZERSİZLİK`, [...(q.patternGovernance.findings||[]), ...(q.patternGovernance.warnings||[]), ...(q.patternGovernance.flags||[])]); }
  if(q.contentQuality){ sec(`✍️ İSİM VE İÇERİK DERİNLİĞİ`, [...(q.contentQuality.findings||[]), ...(q.contentQuality.warnings||[]), ...(q.contentQuality.flags||[])]); }
  sec(`🚫 SPOILER — ${q.k2.score}/20`, q.k2.findings);
  sec(`🧩 İPUCU ÇEŞİTLİLİĞİ VE KALİTE — ${q.k3.score}/20`, q.k3.findings);
  sec(`⭐ EK İPUÇLARI (BONUS) — ${q.k4.score}/20`, q.k4.findings);
  if(q.traceability) { sec(`🧭 İPUCU → MATRİS İZLENEBİLİRLİĞİ`, [...(q.traceability.findings||[]), ...(q.traceability.warnings||[]), ...(q.traceabilityPolicy&&q.traceabilityPolicy.flags||[])]); }
  if(q.ruleEntailment) { sec(`⚖️ KANIT → KURAL DOĞRULUĞU`, [...(q.ruleEntailment.flags||[]), ...(q.ruleEntailment.warnings||[])]); }
  if(q.mechanicContract) { sec(`🎮 MİNİ OYUN / VARLIK SÖZLEŞMESİ`, [...(q.mechanicContract.flags||[]), ...(q.mechanicContract.warnings||[])]); }
  if(q.mechanicContract&&q.mechanicContract.assetRows&&q.mechanicContract.assetRows.length){
    r+=`🎧 PLANLANMIŞ MEDYA TESLİM NOTU
`;
    r+=`Transcript ve hedef yol tanımlı sesli deliller, içerik QA'sında gerçek ses varmış gibi değerlendirilir. MP3/WAV fiziksel dosyası ayrıca oyuna eklenmelidir; bu not QA puanını veya export'u durdurmaz.
`;
    q.mechanicContract.assetRows.forEach(row=>{
      const state=row.ready?'HAZIR':row.planned?'PLANLI — DOSYA EKLENECEK':'TESLİM BİLGİSİ EKSİK';
      r+=`  • İpucu ${row.clueNo} (${row.clueId}) → assetId: ${row.assetId||'EKSİK'} · durum: ${state}
`;
      r+=`    dosya: ${row.fileName||'EKSİK'} · oyun yolu: ${row.publicPath||'EKSİK'} · mime: ${row.mimeType||'EKSİK'} · transcript: ${row.transcript?'var':'EKSİK'}
`;
      if(!row.ready && row.planned) r+=`    teslim adımı: MP3/WAV dosyasını aynı adla belirtilen oyun yoluna ekle. JSON'u değiştirme; runtime zaten clue.audioUrl üzerinden dosyayı bulacak.
`;
    });
    r+=`
`;
  }
  if(q.narrativeScope) { sec(`📜 ÇÖZÜM ANLATISI SINIR DENETİMİ`, [...(q.narrativeScope.flags||[]), ...(q.narrativeScope.warnings||[])]); }
  if(q.disclosure) { sec(`🧩 İPUCU BİLGİ BÜTÇESİ`, [...(q.disclosure.flags||[]), ...(q.disclosure.warnings||[])]); }
  if(q.consistency.flags.length) sec(`🚩 MANTIKSAL TUTARLILIK`, q.consistency.flags);
  if(q.literary && (q.literary.flags.length||q.literary.warnings.length)){
    r+=`🎭 EDEBİ KALİTE VE KARAKTER DERİNLİĞİ\n`;
    q.literary.flags.forEach(f=>r+=`  ⛔ ${f}\n`); q.literary.warnings.forEach(f=>r+=`  ⚠ ${f}\n`); r+=`\n`;
  }
  if(q.advisories && q.advisories.length) sec(`💡 TAVSİYELER (puan kırmaz — opsiyonel)`, q.advisories);

  // ===== EN ALTTA: NUMARALI NET EYLEM LİSTESİ =====
  r+=`${line}\n`;
  r+=`🛠️ GEMINI İÇİN NET DÜZELTME TALİMATLARI\n`;
  if(q.fixes.length){
    r+=`Şu adımları uygula, sonra vakayı tekrar gönder:\n`;
    q.fixes.forEach((f,i)=>r+=`  ${i+1}. ${f}\n`);
  } else if(q.total>=100){
    r+=`  Düzeltme gerekmiyor. Vaka kurallara uygun ve oyuna hazır.\n`;
  } else {
    r+=`  Yukarıdaki KARAR ÖZETİ'ndeki maddeleri uygula.\n`;
  }
  r+=`${line}\n`;
  return r;
}

module.exports = { normalize, computeQA, buildReportText };
