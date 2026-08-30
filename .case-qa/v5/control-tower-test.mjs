import assert from 'node:assert/strict';
import fs from 'node:fs';
const workflow=JSON.parse(fs.readFileSync('.case-qa/v5/Faili_Mechul_Case_QA_v5_CONTROL_TOWER_n8n.json'));
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
const byName=new Map(workflow.nodes.map(n=>[n.name,n]));
for(const n of workflow.nodes)if(n.type.endsWith('.code'))new AsyncFunction(n.parameters.jsCode);
for(const [name,connection] of Object.entries(workflow.connections)){
 assert.ok(byName.has(name));for(const branch of connection.main)for(const edge of branch)assert.ok(byName.has(edge.node));
}
assert.equal(workflow.active,false);
assert.ok(!JSON.stringify(workflow).includes('$getWorkflowStaticData'));
const prepare=new AsyncFunction('$execution',byName.get('M02 Prepare').parameters.jsCode);
const cfg=(await prepare({id:'test-execution'}))[0].json;
assert.deepEqual(Object.keys(JSON.parse(cfg.dispatch_body).inputs).sort(),['audit_only','request_id']);
const correlate=new AsyncFunction('$','$json',byName.get('M06 Correlate').parameters.jsCode);
const $=name=>({first:()=>({json:cfg}),last:()=>({json:{run_id:123,conclusion:'success',run_url:'https://github.com/test/run/123'}})});
const unrelated={id:999,display_title:'v5-other',event:'workflow_dispatch',head_branch:'main',status:'completed'};
assert.equal((await correlate($,{workflow_runs:[unrelated]}))[0].json.run_id,null);
const matching={id:123,display_title:'v5-'+cfg.request_id,event:'workflow_dispatch',head_branch:'main',status:'completed',conclusion:'success'};
assert.equal((await correlate($,{workflow_runs:[unrelated,matching]}))[0].json.run_id,123);
await assert.rejects(correlate($,{workflow_runs:[matching,matching]}),/Ambiguous/);
const expired=name=>({first:()=>({json:{...cfg,deadline:0}})});
await assert.rejects(correlate(expired,{workflow_runs:[]}),/POLL_TIMEOUT/);
const final=new AsyncFunction('$','$input',byName.get('M13 Verified Result').parameters.jsCode);
const input={all:()=>[{binary:{file_0:{fileName:'v5/result.json'}}}]};
const result={schema:'fm_case_qa_v5_result',status:'CASE_COMPLETED',main_synchronized:true};
const context={helpers:{getBinaryDataBuffer:async()=>Buffer.from(JSON.stringify(result))}};
assert.equal((await final.call(context,$,input))[0].json.status,'CASE_COMPLETED');
for(const change of [{status:'ready_for_gates'},{main_synchronized:false},{schema:'wrong'}]){
 const bad={helpers:{getBinaryDataBuffer:async()=>Buffer.from(JSON.stringify({...result,...change}))}};
 await assert.rejects(final.call(bad,$,input));
}
const failure=name=>({last:()=>({json:{run_id:123,conclusion:'failure'}})});
await assert.rejects(final.call(context,failure,input));
await assert.rejects(final.call(context,$,{all:()=>[{binary:{}}]}),/missing/);
console.log('PASS: Control Tower JavaScript/graph, unique dispatch correlation, delayed run, timeout, evidence verification and false-success rejection (offline; not an n8n Cloud execution).');
