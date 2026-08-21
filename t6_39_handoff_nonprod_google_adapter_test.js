'use strict';
const fs=require('fs'),assert=require('assert');
const source=fs.readFileSync(__dirname+'/apps-script-money-mission-tracker-v2_5.gs','utf8');
const manifest=JSON.parse(fs.readFileSync(__dirname+'/apps-script-money-mission-tracker-v2_5.appsscript.json','utf8'));
const block=source.slice(source.indexOf('/* T639_CANONICAL_HANDOFF_NONPROD_GOOGLE_ADAPTER_V1_START */'),source.indexOf('/* T639_CANONICAL_HANDOFF_NONPROD_GOOGLE_ADAPTER_V1_END */'));
let passed=0;function test(name,fn){fn();passed++;console.log('PASS',name);}
test('self-only execution API',()=>assert.strictEqual(manifest.executionApi.access,'MYSELF'));
test('existing anonymous webapp unchanged',()=>assert.deepStrictEqual(manifest.webapp,{executeAs:'USER_DEPLOYING',access:'ANYONE_ANONYMOUS'}));
test('exact 13 tabs and audit separation',()=>{assert.match(block,/T635_HANDOFF_TABS_V1\.forEach/);assert.match(block,/Audit Events/);assert.match(block,/separate_audit_workbook/);});
test('restricted nonproduction identities',()=>{for(const token of ['NONPROD','EXPECTED','QUARANTINE','STAGING','CANONICAL'])assert.ok(block.includes(token));});
test('trusted principal server clock lock and CAS',()=>{for(const token of ['t639HandoffResolvePrincipalV1','new Date().toISOString','LockService.getScriptLock','stale_conflict'])assert.ok(block.includes(token));assert.doesNotMatch(block,/Session\.getEffectiveUser/);});
test('idempotency and readback',()=>{for(const token of ['identical_replay','idempotency_conflict','record_digest_mismatch','readback_mismatch'])assert.ok(block.includes(token));});
test('recipient message reads and lifecycle isolation',()=>{assert.match(block,/recipient_principal_id:'prn_a1xx-nonprod'/);assert.match(block,/read_does_not_move_lifecycle/);});
test('audit and production routes remain off',()=>{assert.match(block,/audit_emission_enabled:false/);assert.match(block,/production_route_enabled:false/);assert.doesNotMatch(block,/doGet\s*\(|doPost\s*\(/);});
test('accepted service boundary is internally bound',()=>{assert.match(block,/function coordinateT639HandoffNonprodServiceV1/);for(const route of ['read_current','list_messages','read_historical','read_commit','execute_command'])assert.ok(source.includes(route));});
test('temporary admin route and credential removed',()=>{assert.doesNotMatch(source,/t639_nonprod_admin_candidate|7d13a0ef98914c92/);});
test('no provider model agent or activity promotion',()=>{for(const re of [/UrlFetchApp/,/openai/i,/model_calls\s*:\s*[1-9]/,/agent_runs\s*:\s*[1-9]/,/activity_ledger_promoted\s*:\s*true/])assert.doesNotMatch(block,re);});
console.log('RESULT '+passed+'/'+passed+' PASS');
