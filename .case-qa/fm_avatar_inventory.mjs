#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.env.FM_QA_ROOT || process.cwd());
const outputDir = path.resolve(root, process.env.FM_QA_OUTPUT_DIR || '.case-qa-output');
const standardPath = path.join(root, 'artifacts/dedektif/data/puzzles.ts');
const premiumPath = path.join(root, 'artifacts/dedektif/data/puzzles_database.json');
const assetMapPath = path.join(root, 'artifacts/dedektif/utils/puzzleAssetMap.ts');
const assetDir = path.join(root, 'artifacts/dedektif/assets/images/puzzle_assets');
const registryPath = path.join(root, '.case-qa/fm_avatar_asset_registry_v1.json');
const releasePath = path.join(outputDir, 'fm_case_qa_release_manifest.json');
const manifestPath = path.join(outputDir, 'fm_avatar_refresh_manifest.json');
const requireCertified = String(process.env.FM_AVATAR_REQUIRE_CERTIFIED || 'false').toLowerCase() === 'true';

function sha(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function locateStandardArray(source) {
  const marker = source.indexOf('export const PUZZLES');
  const eq = source.indexOf('=', marker);
  const start = source.indexOf('[', eq);
  if (marker < 0 || eq < 0 || start < 0) throw new Error('PUZZLES array not found');
  let depth = 0;
  let quote = '';
  let escaped = false;
  let line = false;
  let block = false;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (line) { if (char === '\n') line = false; continue; }
    if (block) { if (char === '*' && next === '/') { block = false; index += 1; } continue; }
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === '/' && next === '/') { line = true; index += 1; continue; }
    if (char === '/' && next === '*') { block = true; index += 1; continue; }
    if (char === '"' || char === "'" || char === '`') { quote = char; continue; }
    if (char === '[') depth += 1;
    if (char === ']' && --depth === 0) return source.slice(start, index + 1);
  }
  throw new Error('PUZZLES array end not found');
}

function parsePng(file) {
  if (!fs.existsSync(file)) return { exists: false, valid_png: false, width: null, height: null, bytes: 0, sha256: null };
  const data = fs.readFileSync(file);
  const validPng = data.length >= 24 && data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  return {
    exists: true,
    valid_png: validPng,
    width: validPng ? data.readUInt32BE(16) : null,
    height: validPng ? data.readUInt32BE(20) : null,
    bytes: data.length,
    sha256: sha(data)
  };
}

function caseId(item) {
  return String(item.puzzleId || item.id || '');
}

const standardSource = fs.readFileSync(standardPath, 'utf8');
const standard = Function(`"use strict"; return (${locateStandardArray(standardSource)});`)();
const premiumDb = JSON.parse(fs.readFileSync(premiumPath, 'utf8'));
const premium = (premiumDb.packs || []).flatMap((pack) => (pack.puzzles || []).map((raw) => ({ raw, pack_id: pack.packId })));
const cases = [
  ...standard.map((raw) => ({ raw, tier: 'standard', pack_id: null })),
  ...premium.map(({ raw, pack_id }) => ({ raw, tier: 'premium', pack_id }))
];
if (cases.length !== 105) throw new Error(`AVATAR_INVENTORY: case count is ${cases.length}/105`);

const assetMapSource = fs.readFileSync(assetMapPath, 'utf8');
const mapped = new Map();
for (const match of assetMapSource.matchAll(/^\s*([A-Za-z0-9_]+):\s*require\("\.\.\/assets\/images\/puzzle_assets\/([^"\n]+)"\),?$/gm)) {
  mapped.set(match[1], match[2]);
}
const registry = fs.existsSync(registryPath)
  ? JSON.parse(fs.readFileSync(registryPath, 'utf8'))
  : { schema_version: 'fm_avatar_asset_registry_v1', assets: {} };
const release = fs.existsSync(releasePath) ? JSON.parse(fs.readFileSync(releasePath, 'utf8')) : null;
const changedCases = new Set(release?.changed_case_ids || []);

const assets = [];
for (const entry of cases) {
  const id = caseId(entry.raw);
  for (const [category, values] of [['suspect', entry.raw.suspects], ['weapon', entry.raw.weapons], ['location', entry.raw.locations]]) {
    for (const entity of values || []) {
      const icon = String(entity.icon || '');
      const key = icon.startsWith('pa:') ? icon.slice(3) : null;
      const mappedFile = key ? mapped.get(key) || null : null;
      const relativeFile = mappedFile ? `artifacts/dedektif/assets/images/puzzle_assets/${mappedFile}` : null;
      const image = mappedFile ? parsePng(path.join(assetDir, mappedFile)) : { exists: false, valid_png: false, width: null, height: null, bytes: 0, sha256: null };
      const contentFingerprint = sha(JSON.stringify({
        case_id: id,
        story: String(entry.raw.story || ''),
        category,
        entity_id: String(entity.id || ''),
        name: String(entity.name || ''),
        description: String(entity.description || ''),
        detail: String(entity.detail || '')
      }));
      const registered = key ? registry.assets?.[key] : null;
      const registryContractFailures = [];
      if (registered) {
        if (registered.visual_certified !== true) registryContractFailures.push('visual_certified_not_true');
        if (registered.validator?.result !== 'pass') registryContractFailures.push('validator_result_not_pass');
        if (!registered.validator?.model) registryContractFailures.push('validator_model_missing');
        if (registered.content_fingerprint !== contentFingerprint) registryContractFailures.push('content_fingerprint_stale');
        if (registered.asset_sha256 !== image.sha256) registryContractFailures.push('asset_sha256_stale');
        if (category === 'suspect' && registered.source === 'generated') {
          if (registered.generation?.model !== 'Nano Banana 2') registryContractFailures.push('suspect_generation_model_not_locked');
          if (registered.generation?.resolution !== '1K') registryContractFailures.push('suspect_generation_resolution_not_1k');
          if (registered.generation?.aspect_ratio !== '1:1') registryContractFailures.push('suspect_generation_aspect_ratio_not_1_1');
          if (!Array.isArray(registered.generation?.reference_media_ids) || registered.generation.reference_media_ids.length !== 3) {
            registryContractFailures.push('suspect_reference_media_count_not_3');
          }
        }
      }
      const structuralFailures = [];
      if (key && !mappedFile) structuralFailures.push('asset_map_entry_missing');
      if (key && !image.exists) structuralFailures.push('asset_file_missing');
      if (image.exists && !image.valid_png) structuralFailures.push('not_png');
      if (image.valid_png && (image.width !== image.height || image.width < 512)) structuralFailures.push('not_square_512_or_larger');
      const warnings = [];
      if (image.exists && image.bytes < 10_000) warnings.push('small_file_requires_visual_validation');
      let action = key ? 'vision_validate' : 'preserve_native_icon';
      if (structuralFailures.length) action = image.exists ? 'regenerate' : 'generate';
      else if (registered && registryContractFailures.length === 0) action = 'preserve';
      else if (changedCases.has(id)) action = 'vision_validate_changed_case';
      assets.push({
        asset_key: key,
        case_id: id,
        case_title: String(entry.raw.title || ''),
        tier: entry.tier,
        pack_id: entry.pack_id,
        category,
        entity_id: String(entity.id || ''),
        name: String(entity.name || ''),
        description: String(entity.description || ''),
        detail: String(entity.detail || ''),
        icon,
        file: relativeFile,
        image,
        content_fingerprint: contentFingerprint,
        registry_status: registered ? 'registered' : 'unregistered',
        registry_contract_failures: registryContractFailures,
        structural_failures: structuralFailures,
        warnings,
        action
      });
    }
  }
}

const duplicateGroups = [...Map.groupBy(assets.filter((item) => item.image.sha256), (item) => item.image.sha256).entries()]
  .filter(([, group]) => group.length > 1)
  .map(([asset_sha256, group]) => ({ asset_sha256, asset_keys: group.map((item) => item.asset_key), semantic_names: group.map((item) => `${item.category}:${item.name}`) }));
const byAction = Object.fromEntries([...new Set(assets.map((item) => item.action))].sort().map((action) => [action, assets.filter((item) => item.action === action).length]));
const manifest = {
  schema_version: 'fm_avatar_refresh_manifest_v1',
  generated_at: new Date().toISOString(),
  source_run_id: release?.run_id || process.env.GITHUB_RUN_ID || null,
  source_release_production_ready: release?.production_ready === true,
  registry_campaign_status: registry.campaign_status || 'unknown',
  strict_certification_required: requireCertified,
  strategy: 'validate_all_regenerate_only_missing_stale_or_invalid',
  exact_case_count: cases.length,
  counts: {
    total_assets: assets.length,
    suspects: assets.filter((item) => item.category === 'suspect').length,
    weapons: assets.filter((item) => item.category === 'weapon').length,
    locations: assets.filter((item) => item.category === 'location').length,
    by_action: byAction,
    structurally_invalid: assets.filter((item) => item.structural_failures.length).length,
    certified_preserved: assets.filter((item) => item.action === 'preserve').length,
    visual_validation_required: assets.filter((item) => item.action.startsWith('vision_validate')).length,
    generation_required: assets.filter((item) => item.action === 'generate' || item.action === 'regenerate').length,
    registry_contract_failures: assets.filter((item) => item.registry_contract_failures.length).length,
    exact_duplicate_groups: duplicateGroups.length
  },
  generation_contract: {
    suspects: {
      provider_model: 'Nano Banana 2',
      resolution: '1K',
      aspect_ratio: '1:1',
      reference_media_count: 3,
      reference_media_shape: { type: 'image', role: 'image_references', value: '<media_id>' },
      style: 'premium 2D, thick black contours, flat color blocks, limited cel shading, no text',
      framing: 'readable head, shoulders and upper torso; no diamond or triangular lower-body crop'
    },
    weapons_and_locations: {
      preserve_verified_recovery_assets: true,
      regenerate_only_after_structural_or_visual_rejection: true
    }
  },
  duplicate_groups: duplicateGroups,
  assets
};

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify(manifest.counts, null, 2));
if (requireCertified && assets.some((item) => !['preserve', 'preserve_native_icon'].includes(item.action))) {
  console.error('AVATAR_CERTIFICATION: one or more puzzle assets are not visually certified against current case content.');
  process.exitCode = 1;
} else if (assets.some((item) => item.action === 'generate' || item.action === 'regenerate')) {
  process.exitCode = 2;
}
