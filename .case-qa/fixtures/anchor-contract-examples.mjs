// Handwritten offline prose for the corrected verified-text plan. These strings
// are not model outputs, review certificates, or game-source updates. A passing
// compile does not prove that a live repair call would write the same text.
export const anchorContractExamples = {
  'tren-yolculugunda-cinayet': {
    story: 'Ankara-İstanbul gece ekspresi yoğun sis altında son kilometresini alırken birinci mevki koltuğunda bir yolcu hareketsiz bulundu. Tren perona yanaşmadan önce her yolcu ayrı bir noktadaydı ve ayrı bir nesneye ulaşabiliyordu. İnceleme, bu kısa aralıkta kimin nerede olduğunu ve hangi nesneye dokunduğunu kayıtlarla ayırıyor. Açılış, suçun geçtiği yeri veya kullanılan nesneyi söylemez. Görev, aynı aralığın izlerini birleştirmektir.',
    suspect_descriptions: {
      s1: 'Koyu takım elbise ve hiç bırakmadığı evrak çantasıyla dolaşan, kolundaki saate sık bakan telaşlı bir birinci mevki yolcusu.',
      s2: 'Kapüşonu başında, boynunda kulaklık ve sırtında çantayla koridorda dalgın yürüyen genç bir yolcu.',
      s3: 'Gözlüğünün üzerinden etrafı süzen, cebinde küçük not defteri taşıyan, beyaz saçlı ve soğukkanlı yaşlı bir yolcu.'
    },
    clues: {
      c1: { text: 'Seferin son dakikalarında çekilen envanter fotoğrafında, bavuldan çıkarılmış ince naylon ip trenin en arka bölümündeki mandallı dar ihtiyaç yerinde duruyor. İpin teslim saati, aynı yerin kilit çizelgesiyle örtüşüyor. İki kayıt bu nesnenin o aralıkta orada bulunduğunu gösteriyor.', deductionHint: 'Fotoğraf ve kilit çizelgesi hangi nesneyi hangi dar yerde bırakılmış gösteriyor?' },
      c2: { text: 'Cinayet, çay servisinin yapıldığı beyaz örtülü masaların bulunduğu ortak oturma salonunda işlendi. Aynı aralığın mühürlü servis dökümü, tek hamlede iz bırakan küçük çakının bu salonda hiç bulunmadığını belgeliyor. Döküm bütün servis turlarını kapsıyor.', deductionHint: 'Suçun geçtiği ortak salonda hangi küçük nesnenin izi hiç yok?' },
      c3: { text: 'Kondüktör, kulaklığı boynunda ve sırt çantası omzunda olan genç yolcuyu seferin son dakikalarında en arka bölümdeki mandallı dar ihtiyaç yerinde gördüğünü anlattı. Anlattığı saat, kapı açılış çizelgesiyle aynı. Tanık ile çizelge bu kişinin o yerde olduğunu doğruluyor.', deductionHint: 'Kulaklıklı gencin son dakikalarda görüldüğü dar yer hangisi?' },
      c4: { text: 'Parmak izi taraması, küçük çakının kabzasında beyaz saçlı soğukkanlı yolcuya ait hiçbir temas izi bulmadı. Tarama aynı nesnenin bütün yüzeyini kapsıyor ve saat kaydı inceleme aralığına ait. Bu sonuç, o yolcunun bu nesneyi kullandığını dışlıyor.', deductionHint: 'Tarama hangi yolcunun küçük çakıya temas etmediğini gösteriyor?' },
      c5: { text: 'Vagon amirinin ek tutanağı, evrak çantalı telaşlı yolcunun yolculuk boyunca küçük çakıyı çantasının gözünde taşıdığını yazıyor. Tutanaktaki saat, çantadaki zimmet fişiyle aynı.', deductionHint: 'Ek tutanak çantalı yolcuyu hangi nesneyle birlikte kaydediyor?' },
      c6: { text: 'Kompartıman görevlisinin ek ifadesi, kulaklıklı genç yolcunun bagajında ince naylon ip bulunduğunu belirtiyor. İfade, bagaj açılış fişinin saatiyle örtüşüyor.', deductionHint: 'Ek ifade kulaklıklı gencin bagajında hangi ipi gösteriyor?' }
    }
  },
  'tarihi-hamamda-cinayet': {
    story: 'Kubbeli hamamın buharı içinde varlıklı bir tüccar, kilitli sıcaklığın altında son nefesini verdi. Olay anında içerideki üç kişiden her biri ayrı bir bölmedeydi ve ayrı bir vasıtaya uzanabiliyordu. Kısa okuma, bu dağılımı kayıt ve izlerle sorar.',
    suspect_descriptions: {
      s1: 'Müşterilerin emanetlerini ve para keselerini teslim alan, solgun yüzlü, genç ve dikkatli bir görevli.',
      s2: 'Tesisi idare eden, kaşları çatık, sert bakışlı ve çalışanlara sürekli emir veren otoriter patron.',
      s3: 'Kese işinde uzman, terden parıldayan pazıları ve nasırlı bilekleriyle görünen güçlü emektar çalışan.'
    },
    clues: {
      c1: { text: 'Cinayet, göbek taşının bulunduğu yoğun buharlı mermer yıkanma bölümünde işlendi. Olay tutanağı, dinlenme içeceğinin bu buharlı bölümde hiç servis edilmediğini yazıyor.', deductionHint: 'Suçun geçtiği buharlı bölümde hangi servis hiç yok?' },
      c2: { text: 'Islak terlik izleri, kaşları çatık otoriter patronu olay vaktinde dış kapıdaki kasanın durduğu aydınlık alanda gösteriyor. İzler, kapı çizelgesindeki saatle aynı.', deductionHint: 'Terlik izi otoriter patronu hangi aydınlık alanda gösteriyor?' },
      c3: { text: 'Nöbet defteri, emanetleri alan solgun yüzlü genci olay boyunca buharlı mermer yıkanma bölümüne hiç yazmıyor. Satır bütün aralığı kapsıyor.', deductionHint: 'Defter solgun genç görevliyi hangi buharlı yerden dışlıyor?' },
      c4: { text: 'Numune taraması, göbek taşının çevresindeki buharlı mermer bölümde keskin kokulu yıkama kalıbına ait hiçbir kalıntı bulmuyor. Tarama bütün çevreyi kapsıyor.', deductionHint: 'Tarama buharlı bölümde hangi keskin kokulu kalıbı bulamıyor?' },
      c5: { text: 'Teslim fişi, emanet görevlisinin olay saatinden hemen önce ağır kimyasal sabun paketini aldığını gösteriyor.', deductionHint: 'Fiş emanet görevlisini hangi paketle bağlıyor?' },
      c6: { text: 'Tanık, otoriter patronun ikram tepsisinde dinlenme içeceğini taşıdığını gördüğünü söylüyor.', deductionHint: 'Tanık patronun tepside ne taşıdığını söylüyor?' }
    }
  }
};

// The verified-text compiler preserves source names. These two expansions are a
// separate handwritten edit used only to show that the mononym advisory, not
// the corrected plan, blocks simulator production readiness.
export const hamamSourceNameCompletion = { s1: 'Genç Veznedar', s3: 'Kıdemli Tellak' };
