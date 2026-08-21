'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync(__dirname+'/apps-script-money-mission-tracker-v2_5.gs','utf8');
const start=source.indexOf('/* T635_CANONICAL_HANDOFF_DURABLE_SERVICE_V1_START */'),end=source.indexOf('/* T635_CANONICAL_HANDOFF_DURABLE_SERVICE_V1_END */');
assert.ok(start>=0&&end>start,'T6.35 source block exists');
const block=source.slice(start,end+'/* T635_CANONICAL_HANDOFF_DURABLE_SERVICE_V1_END */'.length),ctx={console};vm.createContext(ctx);vm.runInContext(block,ctx);
let passed=0;function test(name,fn){fn();passed++;console.log('PASS',name);}
function sheetIds(){const out={};ctx.T635_HANDOFF_TABS_V1.forEach((tab,i)=>out[tab]=1000+i);return out;}
function config(overrides){return Object.assign({service_enabled:true,writes_enabled:true,audit_emission_enabled:false,operations_workbook_id:'ops',expected_operations_workbook_id:'ops',audit_workbook_id:'audit',expected_audit_workbook_id:'audit',vault_root_id:'vault',expected_vault_root_id:'vault',quarantine_root_id:'quarantine',sheet_ids:sheetIds()},overrides||{});}
function adapters(configValue){return ctx.createT635HandoffProductionAdaptersV1({config:{read:()=>configValue},auth:{resolve:()=>({principal_id:'prn_a1xx-fixture',role:'A1XX',active:true,capabilities:['confirm_routing','mark_message_read']})},clock:{nowIso:()=> '2026-08-21T05:00:00.000Z'}});}
function read(){return {route:'read_current',assertion_ref:'assert_a1xx-fixture',handoff_id:'hof_content-plan-fixture'};}
test('source remains unexposed and zero effect',()=>{const state=ctx.getT635HandoffSourceStateV1();assert.strictEqual(state.route_exposed,false);assert.strictEqual(state.wrapper_exposed,false);assert.strictEqual(state.tabs.length,13);assert.deepStrictEqual(JSON.parse(JSON.stringify(state.effects)),{writes:0,network_calls:0,provider_calls:0,model_calls:0,agent_runs:0,audit_emissions:0,external_actions:0});});
test('default adapters fail closed',()=>assert.strictEqual(ctx.coordinateT635HandoffServiceV1(read()).code,'adapter_unavailable'));
test('service and writes must be explicitly enabled',()=>{assert.strictEqual(ctx.coordinateT635HandoffServiceV1(read(),adapters(config({service_enabled:false}))).code,'service_disabled');assert.strictEqual(ctx.coordinateT635HandoffServiceV1(read(),adapters(config({writes_enabled:false}))).code,'writes_disabled');});
test('audit emission must remain disabled',()=>assert.strictEqual(ctx.coordinateT635HandoffServiceV1(read(),adapters(config({audit_emission_enabled:true}))).code,'audit_emission_enabled'));
test('workbook audit vault and unique tab identities fail closed',()=>{for(const c of [config({expected_operations_workbook_id:'x'}),config({expected_audit_workbook_id:'x'}),config({expected_vault_root_id:'x'})])assert.strictEqual(ctx.validateT635HandoffConfigV1(c).ok,false);const duplicate=config();duplicate.sheet_ids.Outbox=duplicate.sheet_ids.Handoffs;assert.strictEqual(ctx.validateT635HandoffConfigV1(duplicate).code,'sheet_identity_duplicate');});
test('routes are exact and closed',()=>{assert.strictEqual(ctx.validateT635HandoffEnvelopeV1(read()).ok,true);assert.strictEqual(ctx.validateT635HandoffEnvelopeV1(Object.assign(read(),{commit_id:'cmt_extra-field'})).ok,false);assert.strictEqual(ctx.validateT635HandoffEnvelopeV1({route:'read_historical',assertion_ref:'assert_a1xx-fixture',handoff_id:'hof_content-plan-fixture'}).ok,false);});
test('valid injected boundary still stops before store',()=>{const result=ctx.coordinateT635HandoffServiceV1(read(),adapters(config()));assert.strictEqual(result.code,'store_adapter_unbound');assert.strictEqual(result.read_only,true);assert.strictEqual(result.effects.writes,0);});
test('no route wrapper or live Google call added',()=>{assert.strictEqual(/function\s+(doGet|doPost)T635|google\.script\.run/.test(block),false);assert.strictEqual(/SpreadsheetApp\.|DriveApp\.|UrlFetchApp\./.test(block),false);});
console.log('RESULT '+passed+'/'+passed+' PASS');
