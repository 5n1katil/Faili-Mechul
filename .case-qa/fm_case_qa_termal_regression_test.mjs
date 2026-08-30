import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {loadEngine, evaluateCase} from './fm_case_qa_core.cjs';
import {normalizeCandidateMetadata, authoringContract, authoringCompleteness, buildPrompt, stripAuthoring, parseStandard} from './fm_case_qa_runner.mjs';
import {assertNearReadyCleanup} from './fm_case_qa_cleanup_guard.mjs';
import {evaluatePreclueLeakage} from './case_qa_preclue_guard.mjs';
import {repairTermal} from './fixtures/termal_reviewed_repair.mjs';

if (process.env.FM_QA_TEST_NO_NETWORK === 'true') {
  globalThis.fetch=async()=>{throw new Error('OFFLINE TEST: network prohibited');};
} else {
  const fixture=JSON.parse(fs.readFileSync('.case-qa/fixtures/termal-97-run-33305310409.json','utf8'));
  const html='.case-qa/Faili_Mechul_Vaka_Simulatoru_v29_4_Otomasyon_Temeli.html';
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(html)).digest('hex'),fixture.identity.simulator_hash);
  const engine=loadEngine(html);
  const before=evaluateCase(engine,fixture.candidate,{includeFullQa:true});
  assert.equal(before.score,97);
  assert.equal(before.scoreBreakdown.k3.score,17);
  assert.match(before.scoreBreakdown.k3.findings.join('\n'),/Sadece 2 ipucu tipi/);
  assert.ok(before.qualityFindings.some(f=>f.includes('adı doğrudan')));
  for(const key of ['k1','k2','k3','k4']) assert.equal(JSON.stringify(before.scoreBreakdown[key].findings), JSON.stringify(before.fullQa[key].findings));
  const prompt=buildPrompt({caseData:fixture.candidate,baselineResult:before,leakage:evaluatePreclueLeakage(fixture.candidate),phase:'exact_score_cleanup'});
  assert.match(prompt,/Sadece 2 ipucu tipi/);
  assert.match(prompt,/adı doğrudan/);
  assert.doesNotMatch(prompt,/at least 2 direct confirm rules/);

  const repaired=repairTermal(fixture.candidate);
  assert.equal(assertNearReadyCleanup(fixture.candidate,repaired).changed_rule_clues,1);
  for(const mutate of [
    x=>{x.story='rewritten';}, x=>{x.qaPolicy.suppressOptionalNameAdvice=true;},
    x=>{x.clues[0].isBonus=true;}, x=>{x.clues[0].isCrimeAnchor=false;},
    x=>{x.clues[0].id='changed';}, x=>{x.suspects[0].icon='changed';},
    x=>{x.clues[0].logicRules=[{action:'confirm',pair:['s1','l1']}];},
    x=>{x.qaSemanticFacts.push({source:'story',kind:'crime_component',component:'location',entityId:'l3'});},
    x=>{x.clues.reverse();}, x=>{x.clues[0].sifre={sifrelenmis:'invented'};}
  ]) {const bad=structuredClone(repaired);mutate(bad);assert.throws(()=>assertNearReadyCleanup(fixture.candidate,bad),/NEAR_READY_SCOPE/);}
  const candidate=normalizeCandidateMetadata(engine,repaired);
  const evaluated=evaluateCase(engine,candidate,{baseline:fixture.candidate,includeFullQa:true});
  assert.equal(evaluated.score,100);
  assert.equal(evaluated.productionReady,true);
  assert.equal(evaluated.fullQa.productionReady,true);
  assert.deepEqual(evaluated.qualityFindings,[]);
  assert.ok(Object.values(evaluated.gates).every(g=>g.passed));
  assert.ok(authoringContract(candidate).passed&&authoringCompleteness(candidate).complete);
  assert.ok(evaluatePreclueLeakage(candidate).passed);
  assert.deepEqual(candidate.qaPolicy,fixture.candidate.qaPolicy);
  assert.deepEqual(candidate.solution,fixture.candidate.solution);
  for(const axis of ['suspects','weapons','locations']) assert.deepEqual(candidate[axis],fixture.candidate[axis]);

  // Independent 3x3 permutation solver: no HTML scoring functions are reused.
  const permutations=items=>items.length?items.flatMap((v,i)=>permutations(items.filter((_,j)=>j!==i)).map(t=>[v,...t])):[[]];
  const core=candidate.clues.filter(c=>!c.isBonus);
  const solve=clues=>{
    const solutions=new Set();
    for(const weapons of permutations(candidate.weapons.map(x=>x.id))) for(const locations of permutations(candidate.locations.map(x=>x.id))) {
      const row=new Map(candidate.suspects.flatMap((s,i)=>[[s.id,i],[weapons[i],i],[locations[i],i]]));
      if(!clues.flatMap(c=>c.logicRules).every(r=>r.action==='confirm'?row.get(r.pair[0])===row.get(r.pair[1]):row.get(r.pair[0])!==row.get(r.pair[1]))) continue;
      const index=locations.indexOf('l3'); // Explicit crime-location evidence in c1/c4.
      solutions.add([candidate.suspects[index].id,weapons[index],locations[index]].join('|'));
    }
    return [...solutions].sort();
  };
  assert.deepEqual(solve(core),['s2|w1|l3']);
  const ablations=core.map((clue,i)=>({clue_id:clue.id,possible_answers:solve(core.filter((_,j)=>i!==j)).length}));
  assert.ok(ablations.every(x=>x.possible_answers>1));
  assert.deepEqual(solve(candidate.clues),['s2|w1|l3']);

  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'fm-termal-'));
  const run=spawnSync(process.execPath,['--import',fileURLToPath(import.meta.url),'.case-qa/fm_case_qa_runner.mjs'],{
    encoding:'utf8',timeout:120000,env:{...process.env,FM_QA_TEST_NO_NETWORK:'true',OPENAI_API_KEY:'offline-blocked',
      FM_QA_MODE:'pilot',FM_QA_ALLOW_AI:'true',FM_QA_APPLY_TO_WORKTREE:'false',FM_QA_CASE_LIMIT:'1',
      FM_QA_CASE_IDS:fixture.identity.case_id,FM_QA_OUTPUT_DIR:temp,FM_QA_CACHE_DIR:path.join(temp,'empty-cache')}
  });
  assert.equal(run.status,0,run.stdout+'\n'+run.stderr);
  const report=JSON.parse(fs.readFileSync(path.join(temp,'fm_case_qa_run_report.json'),'utf8'));
  assert.equal(report.summary.final_campaign_passed,1,JSON.stringify(report.cases));
  assert.equal(report.summary.api_calls,0);
  assert.equal(report.summary.actual_or_conservative_cost_usd,0);
  const sourceCases=parseStandard(fs.readFileSync('artifacts/dedektif/data/puzzles.ts','utf8')).cases;
  const outputCases=parseStandard(fs.readFileSync(path.join(temp,'puzzles.ts'),'utf8')).cases;
  assert.deepEqual(outputCases,sourceCases);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(temp,'puzzles_database.json'),'utf8')),JSON.parse(fs.readFileSync('artifacts/dedektif/data/puzzles_database.json','utf8')));
  assert.deepEqual(stripAuthoring(sourceCases.find(c=>c.id===fixture.identity.case_id)),stripAuthoring(candidate));
  const evidence={schema_version:'fm_termal_regression_v4_9',source_run:33305310409,simulator_sha256:fixture.identity.simulator_hash,
    baseline:97,final:100,production_ready:true,score_breakdown:evaluated.scoreBreakdown,quality_findings:evaluated.qualityFindings,
    gates:evaluated.gates,independent_solver:{answer:solve(core),ablations},api_calls:0,api_cost_usd:0,
    pilot_result:report.summary,scope_guard_negative_tests:10};
  const output=process.env.FM_QA_OUTPUT_DIR||'.case-qa-output';fs.mkdirSync(output,{recursive:true});
  fs.writeFileSync(path.join(output,'fm_termal_regression_v4_9.json'),JSON.stringify(evidence,null,2)+'\n');
  console.log('Termal production regression PASS: 97→100, exact HTML + independent solver, 4/4 necessary clues, 10 guard tests, zero-call pilot, no source mutations.');
}
