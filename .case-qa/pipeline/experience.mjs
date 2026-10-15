export const EXPERIENCE_VERSION = 'fm-player-experience-v1';
// Five stored premium levels are grouped without changing the game's raw level.
// 1-2: novice, 3: detective, 4-5: chief. Explicit named levels take precedence.
export function difficultyBand(candidate) {
  const value = candidate.difficulty ?? candidate.difficultyLevel;
  if (typeof value === 'number') return value >= 1 && value <= 5 ? value <= 2 ? 'caylak' : value === 3 ? 'dedektif' : 'baskomiser' : null;
  const key = String(value || '').toLocaleLowerCase('tr').replace(/[\s_-]/g, '');
  return ({ caylak: 'caylak', 'çaylak': 'caylak', dedektif: 'dedektif', baskomiser: 'baskomiser', 'başkomiser': 'baskomiser' })[key] || null;
}
export const EXPERIENCE_PROFILES = {
  standard_caylak: { story: [25,55], core: [12,30], bonus: [8,22], suspect: [12,20], intent: 'Brief cinematic mystery with a case-specific hook and immediately readable Turkish; one clear fact per clue. Shorter reading, never weaker atmosphere or bureaucratic filler.' },
  standard_dedektif: { story: [35,75], core: [18,42], bonus: [12,30], suspect: [12,24], intent: 'Concise narrative with moderate linked deduction; complexity comes from evidence, not convoluted sentences.' },
  standard_baskomiser: { story: [45,95], core: [22,55], bonus: [15,38], suspect: [12,28], intent: 'Richer reasoning and layered connections, still economical mobile reading.' },
  premium_caylak: { story: [40,125], core: [18,42], bonus: [12,30], suspect: [12,40], intent: 'More room to develop cinematic atmosphere and the incident, with easy orientation and accessible deductions; free cases also need a strong hook and detail must earn its place.' },
  premium_dedektif: { story: [55,145], core: [24,58], bonus: [15,40], suspect: [12,48], intent: 'Developed incident and connected evidence with meaningful, varied deduction and justified mechanics.' },
  premium_baskomiser: { story: [70,180], core: [28,70], bonus: [18,48], suspect: [12,60], intent: 'Deep connected mystery; sophisticated reasoning, purposeful atmosphere and mechanics, never padding.' }
};
export function experienceProfile(candidate, tier = candidate.qaPolicy?.caseTier || 'standard') {
  const difficulty = difficultyBand(candidate), key = tier + '_' + difficulty;
  const profile = EXPERIENCE_PROFILES[key];
  if (!profile) throw new Error('EXPERIENCE_CATEGORY_UNKNOWN:' + key);
  return { version: EXPERIENCE_VERSION, key, tier, difficulty, ...profile,
    lengths: 'Word bands are writing targets. Upper limits prevent mobile overload; do not pad to hit a lower target.',
    narrative: 'Story, suspect/item/place cards, all core and bonus clues form one event in one shared interval. Introduce meaningful background settings before using them. Do not invent a workshop or office solely to host evidence. Never claim a lethal method is already known before its designated evidence. Opening tells what happened and what the player seeks, not the solution. Every category needs a vivid, cinematic, intriguing incident in fluent natural Turkish; standard cases are shorter and less dense, never sterile summaries. Do not repeat the universal one-person/one-weapon/one-place matching rule already shown by the game. Explain only a genuinely case-specific exception. Avoid copied opening rhythms and stock rhetorical hooks across cases.',
    novelty: 'A different clue order, name, evidence label or positive/negative phrasing is not a new logical pattern. Compare the actual dependency graph and deduction route. Short novice cases must still have their own reasoning structure.' };
}
export const wordCount = value => (String(value || '').trim().match(/\S+/gu) || []).length;
const fold = value => String(value || '').toLocaleLowerCase('tr').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ı/g,'i');
export function experienceCheck(candidate, tier) {
  let profile;
  try { profile = experienceProfile(candidate, tier); } catch (error) { return { passed: false, issues: [error.message] }; }
  const issues = [], counts = { story: wordCount(candidate.story), clues: [], suspects: [] };
  if (counts.story > profile.story[1]) issues.push('EXPERIENCE_STORY_TOO_LONG:' + counts.story + '>' + profile.story[1]);
  for (const clue of candidate.clues || []) {
    const n = wordCount(clue.text), max = (clue.isBonus ? profile.bonus : profile.core)[1];
    counts.clues.push({ id: clue.id, words: n, maximum: max });
    if (n > max) issues.push('EXPERIENCE_CLUE_TOO_LONG:' + clue.id + ':' + n + '>' + max);
  }
  for (const suspect of candidate.suspects || []) {
    const n = wordCount(suspect.description || suspect.detail); counts.suspects.push({ id: suspect.id, words: n });
    if (n > profile.suspect[1]) issues.push('EXPERIENCE_PROFILE_TOO_LONG:' + suspect.id + ':' + n + '>' + profile.suspect[1]);
  }
  const context = fold([candidate.story, ...['suspects','weapons','locations'].flatMap(a => (candidate[a] || []).map(e => [e.name,e.description,e.detail].filter(Boolean).join(' ')))].join(' '));
  // A narrow, auditable check for unintroduced scene locations. Semantic
  // continuity and unfamiliar named people still require the independent editor.
  for (const clue of candidate.clues || []) for (const term of ['atölye','laboratuvar','koridor','mahzen','mutfak','arşiv','gözetleme istasyonu']) {
    const root = fold(term), text = fold(clue.text);
    const forensicInstitution = term === 'laboratuvar' && /^\s*adli\s+laboratuvar[, ]+.{0,100}(?:saptadı|analiz|tespit|rapor)/iu.test(clue.text || '');
    if (text.includes(root) && !context.includes(root) && !forensicInstitution) issues.push('EXPERIENCE_UNINTRODUCED_SETTING:' + clue.id + ':' + term);
  }
  if (/ölümcül\s+yöntem.{0,30}kesinleş|yöntemin\s+kesinleşti/iu.test(candidate.story || ''))
    issues.push('EXPERIENCE_PREMATURE_METHOD_ASSERTION');
  return { passed: issues.length === 0, profile, counts, issues };
}
