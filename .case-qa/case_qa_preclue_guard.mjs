const STOP_WORDS = new Set([
  'acik','ait','alan','alani','alt','altin','ama','ana','arac','ardindan','ayni','baska','bir','biri','bunu','bu',
  'buyuk','cok','daha','da','de','diger','diye','en','eski','etmek','icin','ile','ise','kendi','kucuk','mekan','mekani',
  'mekân','mekânı','nesne','olan','olarak','oldugu','olur','oda','odasi','onun','sonra','silah','supheli','şüpheli',
  'tarafindan','tek','uzerinde','ve','veya','yer','yerde','yeni','yok','gece','sabah','olay','olayi','vaka','kullanilan',
  'kullandigi','tuttugu','sakladigi','bulunan','bulundu','kutsal','dev','ince','agir','keskin','tas','tasi','icinde',
  'oldukca','sadece','fiziksel','son','derece','her','tum','tüm','eden','dolu','surekli','sürekli','uzun','yillik','yıllık',
  'ofis','salon','koridor','koridorlar','guvenlik','güvenlik','toplanti','toplantı','bahce','bahçe','kapi','kapı'
]);

const ROLE_WORDS = new Set([
  'usta','bey','hanim','hanım','kaptan','sponsor','organizatör','organizator','prof','profesor','profesör','doktor','dr',
  'direktor','direktör','sefi','şefi','gorevlisi','görevlisi','muduru','müdürü','temsilcisi','gozlemcisi','gözlemcisi',
  'avukat','sekreter','müvekkil','muvekkil','ortagi','ortağı','ceo','ressam','albay','amiri','muhendisi','mühendisi'
]);

const ROOT_SUFFIXES = [
  'lerinden','larından','larinda','lerinde','larinin','lerinin','lariyla','leriyle','lardan','lerden','larini','lerini',
  'larina','lerine','lar','ler','ları','leri','nin','nın','nun','nün','in','ın','un','ün','dan','den','tan','ten','dir','dır',
  'dur','dür','tir','tır','tur','tür','yla','yle','yi','yı','yu','yü','ye','ya','si','sı','su','sü','i','ı','u','ü'
];

function text(value) {
  return String(value ?? '').trim();
}

function norm(value) {
  return text(value)
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9çğıöşü]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function rootToken(token) {
  let value = norm(token);
  for (const suffix of ROOT_SUFFIXES) {
    if (value.length - suffix.length >= 4 && value.endsWith(suffix)) {
      value = value.slice(0, -suffix.length);
      break;
    }
  }
  return value;
}

function tokenSet(value, excluded = new Set()) {
  const output = new Set();
  for (const token of norm(value).split(' ')) {
    const root = rootToken(token);
    if (root.length < 3 || STOP_WORDS.has(token) || STOP_WORDS.has(root) || excluded.has(root)) continue;
    output.add(root);
  }
  return output;
}

function intersection(left, right) {
  return [...left].filter((token) => right.has(token));
}

function visibleEntityText(entity) {
  return [
    entity?.description,
    entity?.detail,
    entity?.info,
    entity?.profile,
    entity?.visualDefinition,
    entity?.visualProfile,
    entity?.generationPrompt,
    entity?.avatarPrompt
  ].map(text).filter(Boolean).join(' ');
}

function axisText(entity) {
  return [entity?.name, entity?.description, entity?.detail, entity?.info].map(text).filter(Boolean).join(' ');
}

function suspectAliases(suspect) {
  const normalizedName = norm(suspect?.name);
  const tokens = normalizedName.split(' ').filter((token) => token.length >= 3);
  const finalToken = tokens.at(-1) || '';
  const identityTokens = tokens.length === 1
    ? tokens
    : ROLE_WORDS.has(finalToken) || ROLE_WORDS.has(rootToken(finalToken))
      ? []
      : [finalToken];
  return { normalizedName, tokens, identityTokens, roots: new Set(tokens.map(rootToken)) };
}

function nameOwnsAxis(suspect, axisEntity) {
  const aliases = suspectAliases(suspect);
  const axisName = norm(axisEntity?.name);
  if (!aliases.normalizedName || !axisName) return false;
  if (axisName === aliases.normalizedName) return true;
  if (axisName.startsWith(`${aliases.normalizedName} `) || axisName.includes(` ${aliases.normalizedName} `)) return true;
  return aliases.identityTokens.some((alias) => axisName.split(' ').slice(0, 2).includes(alias));
}

function buildPairFinding(caseId, suspect, axisKind, axisEntity) {
  const aliases = suspectAliases(suspect);
  const suspectProfile = visibleEntityText(suspect);
  const targetText = axisText(axisEntity);
  const profileTokens = tokenSet(suspectProfile, aliases.roots);
  const targetTokens = tokenSet(targetText, aliases.roots);
  const axisNameTokens = tokenSet(axisEntity?.name, aliases.roots);
  const overlap = intersection(profileTokens, targetTokens);
  const nameOverlap = intersection(profileTokens, axisNameTokens);
  const directOwner = nameOwnsAxis(suspect, axisEntity);
  const fullAxisName = norm(axisEntity?.name);
  const exactAxisNameInProfile = fullAxisName.length >= 5 && norm(suspectProfile).includes(fullAxisName);
  const distinctiveOverlap = nameOverlap.length >= 1 || overlap.length >= 3;
  const reviewOverlap = !distinctiveOverlap && overlap.length >= 2;
  const strength = directOwner || exactAxisNameInProfile
    ? 'direct'
    : distinctiveOverlap
      ? 'strong_semantic'
      : reviewOverlap
        ? 'review_semantic'
        : 'none';
  if (strength === 'none') return null;
  const reasons = [];
  if (directOwner) reasons.push('axis_name_contains_suspect_identity');
  if (exactAxisNameInProfile) reasons.push('suspect_profile_contains_full_axis_name');
  if (nameOverlap.length) reasons.push(`axis_name_profile_overlap:${nameOverlap.join(',')}`);
  if (overlap.length) reasons.push(`distinctive_profile_overlap:${overlap.join(',')}`);
  return {
    case_id: caseId,
    suspect_id: text(suspect?.id),
    suspect_name: text(suspect?.name),
    axis_kind: axisKind,
    axis_id: text(axisEntity?.id),
    axis_name: text(axisEntity?.name),
    strength,
    direct_owner_binding: directOwner,
    profile_exact_axis_name: exactAxisNameInProfile,
    distinctive_overlap_tokens: overlap,
    axis_name_overlap_tokens: nameOverlap,
    avatar_prompt_risk: exactAxisNameInProfile || distinctiveOverlap || (directOwner && overlap.length >= 1),
    reasons
  };
}

function uniqueDirectMapping(findings, suspects, axisKind, entities) {
  const direct = findings.filter((item) => item.axis_kind === axisKind && item.direct_owner_binding);
  const bySuspect = new Map();
  const byAxis = new Map();
  for (const item of direct) {
    if (!bySuspect.has(item.suspect_id)) bySuspect.set(item.suspect_id, new Set());
    if (!byAxis.has(item.axis_id)) byAxis.set(item.axis_id, new Set());
    bySuspect.get(item.suspect_id).add(item.axis_id);
    byAxis.get(item.axis_id).add(item.suspect_id);
  }
  const mappedSuspects = [...bySuspect.values()].filter((set) => set.size === 1).length;
  const mappedAxes = [...byAxis.values()].filter((set) => set.size === 1).length;
  const size = Math.min(suspects.length, entities.length);
  return {
    axis_kind: axisKind,
    mapped_suspects: mappedSuspects,
    mapped_axes: mappedAxes,
    grid_size: size,
    perfect_mapping: size > 1 && mappedSuspects === size && mappedAxes === size,
    substantial_mapping: size > 1 && Math.min(mappedSuspects, mappedAxes) >= Math.max(2, size - 1)
  };
}

export function evaluatePreclueLeakage(caseData) {
  const caseId = text(caseData?.puzzleId || caseData?.id);
  const suspects = Array.isArray(caseData?.suspects) ? caseData.suspects : [];
  const weapons = Array.isArray(caseData?.weapons) ? caseData.weapons : [];
  const locations = Array.isArray(caseData?.locations) ? caseData.locations : [];
  const findings = [];
  for (const suspect of suspects) {
    for (const weapon of weapons) {
      const finding = buildPairFinding(caseId, suspect, 'weapon', weapon);
      if (finding) findings.push(finding);
    }
    for (const location of locations) {
      const finding = buildPairFinding(caseId, suspect, 'location', location);
      if (finding) findings.push(finding);
    }
  }
  const directFindings = findings.filter((item) => item.strength === 'direct');
  const avatarFindings = findings.filter((item) => item.avatar_prompt_risk);
  const weaponMapping = uniqueDirectMapping(findings, suspects, 'weapon', weapons);
  const locationMapping = uniqueDirectMapping(findings, suspects, 'location', locations);
  const solution = caseData?.solution || {};
  const solutionWeapon = findings.find((item) => item.suspect_id === text(solution.suspectId) && item.axis_kind === 'weapon' && item.axis_id === text(solution.weaponId) && item.strength !== 'review_semantic');
  const solutionLocation = findings.find((item) => item.suspect_id === text(solution.suspectId) && item.axis_kind === 'location' && item.axis_id === text(solution.locationId) && item.strength !== 'review_semantic');
  const solutionTripleExposed = Boolean(solutionWeapon && solutionLocation);
  const critical = solutionTripleExposed || weaponMapping.perfect_mapping || locationMapping.perfect_mapping;
  const high = !critical && (weaponMapping.substantial_mapping || locationMapping.substantial_mapping || directFindings.length >= 2);
  const review = !critical && !high && findings.length > 0;
  const severity = critical ? 'critical' : high ? 'high' : review ? 'review' : 'none';
  const status = critical || high ? 'blocked_pending_content_repair' : review ? 'manual_review_required' : 'passed';
  const requiredActions = [];
  if (directFindings.length) requiredActions.push('remove_direct_suspect_identity_from_weapon_or_location_names_and_visible_profiles');
  if (avatarFindings.length) requiredActions.push('rewrite_avatar_source_profiles_to_non_grid_visual_traits');
  if (solutionTripleExposed) requiredActions.push('restore_clue_dependency_before_solution_is_player_visible');
  if (weaponMapping.perfect_mapping || locationMapping.perfect_mapping) requiredActions.push('break_preclue_one_to_one_axis_mapping');
  return {
    schema_version: 'fm_preclue_association_leakage_guard_v1',
    status,
    passed: status === 'passed',
    severity,
    direct_binding_count: directFindings.length,
    semantic_review_count: findings.length - directFindings.length,
    avatar_prompt_risk: avatarFindings.length > 0,
    avatar_prompt_risk_count: avatarFindings.length,
    solution_triple_exposed: solutionTripleExposed,
    solution_exposure: {
      suspect_id: text(solution.suspectId),
      weapon_id: text(solution.weaponId),
      location_id: text(solution.locationId),
      suspect_weapon_visible: Boolean(solutionWeapon),
      suspect_location_visible: Boolean(solutionLocation)
    },
    direct_mapping: { weapon: weaponMapping, location: locationMapping },
    findings,
    required_actions: [...new Set(requiredActions)],
    policy: {
      generic_role_or_era_traits_allowed: true,
      non_grid_visual_props_allowed: true,
      direct_suspect_weapon_location_identity_binding_allowed: false,
      unique_solution_visible_before_clues_allowed: false
    }
  };
}

export const legacyN8nGuardSource = String.raw`
const FM_PRECLUE_STOP_WORDS=new Set(${JSON.stringify([...STOP_WORDS])});
const FM_PRECLUE_SUFFIXES=${JSON.stringify(ROOT_SUFFIXES)};
function fmLeakText(value){return String(value==null?'':value).trim();}
function fmLeakNorm(value){return fmLeakText(value).toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9çğıöşü]+/gi,' ').replace(/\s+/g,' ').trim();}
function fmLeakRoot(token){let value=fmLeakNorm(token);for(const suffix of FM_PRECLUE_SUFFIXES){if(value.length-suffix.length>=4&&value.endsWith(suffix)){value=value.slice(0,-suffix.length);break;}}return value;}
function fmLeakTokens(value,excluded){const output=new Set();for(const token of fmLeakNorm(value).split(' ')){const root=fmLeakRoot(token);if(root.length<3||FM_PRECLUE_STOP_WORDS.has(token)||FM_PRECLUE_STOP_WORDS.has(root)||(excluded&&excluded.has(root)))continue;output.add(root);}return output;}
function fmLeakVisible(entity){return [entity&&entity.description,entity&&entity.detail,entity&&entity.info,entity&&entity.profile,entity&&entity.visualDefinition,entity&&entity.visualProfile,entity&&entity.generationPrompt,entity&&entity.avatarPrompt].map(fmLeakText).filter(Boolean).join(' ');}
function fmLeakAxisText(entity){return [entity&&entity.name,entity&&entity.description,entity&&entity.detail,entity&&entity.info].map(fmLeakText).filter(Boolean).join(' ');}
function fmLeakAliases(suspect){const normalizedName=fmLeakNorm(suspect&&suspect.name),tokens=normalizedName.split(' ').filter(x=>x.length>=3);return {normalizedName,tokens,roots:new Set(tokens.map(fmLeakRoot))};}
function fmLeakNameOwns(suspect,axis){const aliases=fmLeakAliases(suspect),axisName=fmLeakNorm(axis&&axis.name);if(!aliases.normalizedName||!axisName)return false;if(axisName===aliases.normalizedName||axisName.startsWith(aliases.normalizedName+' ')||axisName.includes(' '+aliases.normalizedName+' '))return true;const head=axisName.split(' ').slice(0,2);return aliases.tokens.some(alias=>head.includes(alias));}
function fmLeakPair(caseId,suspect,axisKind,axis){const aliases=fmLeakAliases(suspect),profile=fmLeakVisible(suspect),target=fmLeakAxisText(axis),pt=fmLeakTokens(profile,aliases.roots),tt=fmLeakTokens(target,aliases.roots),overlap=[...pt].filter(x=>tt.has(x)),direct=fmLeakNameOwns(suspect,axis),axisName=fmLeakNorm(axis&&axis.name),exact=axisName.length>=5&&fmLeakNorm(profile).includes(axisName),distinctive=overlap.length>=2,strongSingle=overlap.length===1&&overlap[0].length>=6,strength=direct||exact?'direct':distinctive?'strong_semantic':strongSingle?'review_semantic':'none';if(strength==='none')return null;const reasons=[];if(direct)reasons.push('axis_name_contains_suspect_identity');if(exact)reasons.push('suspect_profile_contains_full_axis_name');if(overlap.length)reasons.push('distinctive_profile_overlap:'+overlap.join(','));return {case_id:caseId,suspect_id:fmLeakText(suspect&&suspect.id),suspect_name:fmLeakText(suspect&&suspect.name),axis_kind:axisKind,axis_id:fmLeakText(axis&&axis.id),axis_name:fmLeakText(axis&&axis.name),strength,direct_owner_binding:direct,profile_exact_axis_name:exact,distinctive_overlap_tokens:overlap,avatar_prompt_risk:exact||distinctive||strongSingle,reasons};}
function fmLeakMapping(findings,suspects,axisKind,entities){const direct=findings.filter(x=>x.axis_kind===axisKind&&x.direct_owner_binding),byS=new Map(),byA=new Map();for(const item of direct){if(!byS.has(item.suspect_id))byS.set(item.suspect_id,new Set());if(!byA.has(item.axis_id))byA.set(item.axis_id,new Set());byS.get(item.suspect_id).add(item.axis_id);byA.get(item.axis_id).add(item.suspect_id);}const mappedSuspects=[...byS.values()].filter(x=>x.size===1).length,mappedAxes=[...byA.values()].filter(x=>x.size===1).length,size=Math.min(suspects.length,entities.length);return {axis_kind:axisKind,mapped_suspects:mappedSuspects,mapped_axes:mappedAxes,grid_size:size,perfect_mapping:size>1&&mappedSuspects===size&&mappedAxes===size,substantial_mapping:size>1&&Math.min(mappedSuspects,mappedAxes)>=Math.max(2,size-1)};}
function fmPreclueLeakage(c){const caseId=fmLeakText(c&&((c.puzzleId||c.id))),suspects=Array.isArray(c&&c.suspects)?c.suspects:[],weapons=Array.isArray(c&&c.weapons)?c.weapons:[],locations=Array.isArray(c&&c.locations)?c.locations:[],findings=[];for(const suspect of suspects){for(const weapon of weapons){const f=fmLeakPair(caseId,suspect,'weapon',weapon);if(f)findings.push(f);}for(const location of locations){const f=fmLeakPair(caseId,suspect,'location',location);if(f)findings.push(f);}}const direct=findings.filter(x=>x.strength==='direct'),avatar=findings.filter(x=>x.avatar_prompt_risk),weaponMap=fmLeakMapping(findings,suspects,'weapon',weapons),locationMap=fmLeakMapping(findings,suspects,'location',locations),sol=c.solution||{},solutionWeapon=findings.find(x=>x.suspect_id===fmLeakText(sol.suspectId)&&x.axis_kind==='weapon'&&x.axis_id===fmLeakText(sol.weaponId)&&x.strength!=='review_semantic'),solutionLocation=findings.find(x=>x.suspect_id===fmLeakText(sol.suspectId)&&x.axis_kind==='location'&&x.axis_id===fmLeakText(sol.locationId)&&x.strength!=='review_semantic'),solutionTriple=!!(solutionWeapon&&solutionLocation),critical=solutionTriple||weaponMap.perfect_mapping||locationMap.perfect_mapping,high=!critical&&(weaponMap.substantial_mapping||locationMap.substantial_mapping||direct.length>=2),review=!critical&&!high&&findings.length>0,severity=critical?'critical':high?'high':review?'review':'none',status=critical||high?'blocked_pending_content_repair':review?'manual_review_required':'passed',actions=[];if(direct.length)actions.push('remove_direct_suspect_identity_from_weapon_or_location_names_and_visible_profiles');if(avatar.length)actions.push('rewrite_avatar_source_profiles_to_non_grid_visual_traits');if(solutionTriple)actions.push('restore_clue_dependency_before_solution_is_player_visible');if(weaponMap.perfect_mapping||locationMap.perfect_mapping)actions.push('break_preclue_one_to_one_axis_mapping');return {schema_version:'fm_preclue_association_leakage_guard_v1',status,passed:status==='passed',severity,direct_binding_count:direct.length,semantic_review_count:findings.length-direct.length,avatar_prompt_risk:avatar.length>0,avatar_prompt_risk_count:avatar.length,solution_triple_exposed:solutionTriple,solution_exposure:{suspect_id:fmLeakText(sol.suspectId),weapon_id:fmLeakText(sol.weaponId),location_id:fmLeakText(sol.locationId),suspect_weapon_visible:!!solutionWeapon,suspect_location_visible:!!solutionLocation},direct_mapping:{weapon:weaponMap,location:locationMap},findings,required_actions:[...new Set(actions)],policy:{generic_role_or_era_traits_allowed:true,non_grid_visual_props_allowed:true,direct_suspect_weapon_location_identity_binding_allowed:false,unique_solution_visible_before_clues_allowed:false}};}
`;

export const n8nGuardSource = [
  `const STOP_WORDS=new Set(${JSON.stringify([...STOP_WORDS])});`,
  `const ROLE_WORDS=new Set(${JSON.stringify([...ROLE_WORDS])});`,
  `const ROOT_SUFFIXES=${JSON.stringify(ROOT_SUFFIXES)};`,
  text.toString(),
  norm.toString(),
  rootToken.toString(),
  tokenSet.toString(),
  intersection.toString(),
  visibleEntityText.toString(),
  axisText.toString(),
  suspectAliases.toString(),
  nameOwnsAxis.toString(),
  buildPairFinding.toString(),
  uniqueDirectMapping.toString(),
  evaluatePreclueLeakage.toString().replace('function evaluatePreclueLeakage', 'function fmPreclueLeakage')
].join('\n');
