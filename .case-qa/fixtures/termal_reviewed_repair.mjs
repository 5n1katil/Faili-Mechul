// Reviewed repair for the captured production failure. Test fixture only: the
// runner does not silently substitute this case or trust its previous score.
export function repairTermal(input) {
const candidate=structuredClone(input);
Object.assign(candidate.clues[2], {
 text:'Aromaterapi kabinindeki masaj hazırlığı tepsisinden alınan bardakta, laboratuvar reçeteli sedatif kalıntısı saptadı. Mühürlü teslim kaydı, incelenen bardağın kokulu yağların kullanıldığı bu bölüme ait olduğunu doğruluyordu.',
 type:'forensic',
 logicRules:[{action:'confirm',pair:['w2','l2']}],
 qaSemanticFacts:[],
 qaRationale:{matrixEffect:'Uyku Hapı ↔ Spa Odası doğrulanır', evidenceLink:'Aromaterapi kabinindeki tepsiden alınan bardakta reçeteli sedatif kalıntısı saptandı; mühürlü teslim kaydı numunenin kaynağını doğruluyor.',evidenceKind:'medical'}
});
candidate.clues[0].text='Ahşap terleme kabininin bankındaki taze deri ve kan transferi, saldırının burada gerçekleştiğini gösteriyordu. Aynı saate ait kart kaydı, tesisin idaresinden sorumlu kişinin bu bölümün kapısından geçmediğini doğruladı.';
candidate.clues[1].text='Dijital geçiş kaydında, kurbanla müzik listelerinde rekabet eden kişinin kartı buharlı terleme bölümünün kapısını hiç açmamıştı. Güvenlik görevlisi, ilgili saat aralığında bu kapıdan kartsız giriş yapılmadığını da ifadesinde doğruladı.';
candidate.clues[3].text='Ahşap terleme bölümündeki kurbanın giysilerinde kesik, delik ya da metal izine rastlanmadı. Adli muayene, kesici bir aletin bu odada kullanılmış olamayacağını gösterdi.';
candidate.clues[1].qaSemanticFacts=[];
candidate.qaSemanticFacts=candidate.qaSemanticFacts.filter(f=>!['clue:c2','clue:c3'].includes(f.source));
for (const i of [0,1,3]) candidate.clues[i].qaRationale.evidenceLink=candidate.clues[i].text;
for (const fact of [...candidate.qaSemanticFacts,...candidate.clues.flatMap(c=>c.qaSemanticFacts||[])]) {
 if(fact.source==='clue:c1') fact.evidence='Ahşap terleme kabininin bankındaki taze deri ve kan transferi saldırının burada gerçekleştiğini gösteriyor.';
 if(fact.source==='clue:c4') fact.evidence='Adli muayene ahşap terleme bölümündeki kurbanın giysileri üzerinde yapılıyor.';
}
candidate.qaPattern.designIntent='Fiziksel bulgular olay yerini belirler; iki erişim kaydı şüphelileri daraltır. Aromaterapi kabinindeki numune yanlış bir silahı başka mekana bağlar, son adli inceleme diğer yanlış silahı dışlar. Dört ana ipucu tek tek zorunludur; bonuslar ek matris yardımıdır.';
return candidate;
}
