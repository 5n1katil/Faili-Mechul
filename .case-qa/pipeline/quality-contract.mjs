import { experienceProfile } from './experience.mjs';
export const QUALITY_VERSION = 'fm-narrative-quality-v2';
const LEGACY_QUALITY_VERSION = 'fm-narrative-quality-v1';
export const REVIEW_VERSION = 'fm-player-review-v3';

export function legacyQualityContract(candidate, tier = candidate.qaPolicy?.caseTier || 'standard') {
  return {
    version: LEGACY_QUALITY_VERSION, tier, difficulty: candidate.difficulty ?? candidate.difficultyLevel ?? null,
    format: 'deduction mystery: infer the crime triple from core evidence; bonus clues are optional',
    scale: '0-5: 3 has a concrete readiness defect; 4 is strong and ready for its declared tier/difficulty; 5 exceptional',
    dimensions: {
      fairness: 'Core evidence permits one crime triple without guesses, hidden facts or bonus dependence. Elimination is a legitimate proof; no direct positive clue for every solution component is required.',
      clarity: 'Card-grounded references, readable Turkish and one shared investigation interval. Distinguish the exact listed place from its surroundings; nearby is not at, but vague distance/time that changes interpretation is a defect.',
      consistency: 'Visible evidence supports each intended relation. Story, profiles and optional clues agree. Ordinary items have a credible general lethal mechanism without revealing the solution early. Do not invent medical precision or implausible causal claims.',
      originality: 'Specific setting, incident and human stakes distinguish this case from the comparison sample. A familiar 3x3 elimination structure is allowed for a novice; generic interchangeable prose or copied narrative is a defect.',
      engagement: 'A concrete opening question, recognizable people with neutral personal stakes, varied tangible evidence and a satisfying deduction. Concise novice gameplay can be engaging; cinematic length, extra mechanics or direct culprit evidence are not requirements.'
    },
    writer_requirements: [
      'Build one case-specific hook and concrete human stake, not generic panic and official-report filler.',
      'Give each suspect a brief personal concern consistent with existing role/visual identity; none proves guilt, innocence, unique access, ability or a listed item/place relation.',
      'Preserve all deduction constraints. Never add an extra crime component or redundant core clue to satisfy an editorial preference.',
      'Check all bonus text against core statements in the same time window; do not introduce vague near/at or before/during contradictions.',
      'Use naturally varied evidence presentation and grounded details. No unsupported toxicology, medical mechanism or invented identifying card traits.'
    ],
    editor_requirements: [
      'Assess the actual prose against every dimension; neither QA scores nor this contract guarantee a pass.',
      'Every score below 4 must have a concrete corresponding issue: cite clue/profile or short passage, the player impact and a feasible correction.',
      'Separate readiness defects from optional stylistic improvements. Optional suggestions belong in summary and must not masquerade as contradictions.',
      'Do not request extra positive culprit/weapon/place facts when the existing core proves the unique triple. Report actual ambiguity, unsupported evidence, contradictions or weak narrative instead.',
      'Keep all real defects in issues and retain independent judgment; do not inflate scores to match the writer.'
    ]
  };
}

export function qualityContract(candidate, tier = candidate.qaPolicy?.caseTier || 'standard') {
  const value = legacyQualityContract(candidate, tier);
  value.version = QUALITY_VERSION;
  value.experience = experienceProfile(candidate, tier);
  value.dimensions.clarity += ' Assess reading load against the selected experience category. Free novice clarity requires short direct phrasing; professional jargon or long clues are not difficulty.';
  value.dimensions.consistency += ' Read story, all cards and all clues as one event. An unintroduced workshop/office, a jump in what investigators already know or disconnected evidence is a readiness defect even if the grid solves.';
  value.dimensions.originality = 'Compare the actual dependency graph and reasoning route with the supplied portfolio signatures. Reordered clues, renamed entities or different evidence labels are not new logical patterns. Require a distinct route appropriate to this category; familiar elementary deductions are allowed, a repeated full template is not.';
  value.writer_requirements[1] = 'Give succinct recognizable people grounded in their existing cards. A neutral personal concern can enrich advanced/premium cases; appearance and manner are enough for a free novice. Never invent a motive or pad every profile merely for length.';
  value.dimensions.engagement = 'A concrete opening question, recognizable people and a satisfying deduction appropriate to this category. Free novice cases need quick orientation and clarity; do not demand cinematic length, elaborate motives or premium atmosphere.';
  value.writer_requirements.push(value.experience.narrative, value.experience.novelty,
    'Follow the category word bands, favour useful concision, and never add filler to meet a minimum. For free novice cases avoid routine claims of panic, official thoroughness and bureaucratic logs. Each clue should support one clear necessary step.');
  value.editor_requirements.push('Assess every category by the same correctness/fairness standard but by its OWN density and complexity expectations. A short free novice case is not inferior because it lacks premium atmosphere.',
    'Flag undefined settings and premature knowledge explicitly. Cite the exact passage and how it disrupts player understanding. Do not assume a mathematically correct clue is narratively grounded.');
  return value;
}
