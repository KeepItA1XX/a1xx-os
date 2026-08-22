'use strict';

const assert=require('assert');
const fs=require('fs');
const path=require('path');
const html=fs.readFileSync(path.join(__dirname,'money-mission-tracker-v2_5.html'),'utf8');
const fixtures=require('/Users/a1xxoffice/Documents/Codex/_prototype_work/money-mission-os/t6-119-handoff-review-display-contract/fixtures');
const contract=require('/Users/a1xxoffice/Documents/Codex/_prototype_work/money-mission-os/t6-119-handoff-review-display-contract/contract');
let checks=0;
function ok(value,label){checks+=1;assert.ok(value,label);}
function includesAll(source,values){values.forEach(value=>ok(source.includes(value),'missing '+value));}

const start=html.indexOf("var MISSION_T6119_DISPLAY_VERSION_V25");
const end=html.indexOf('function missionT644TabsV25',start);
ok(start>-1&&end>start,'isolated T6.119 production boundary exists');
const source=html.slice(start,end);

includesAll(source,[
  "'t6.119-review-display-v1'",
  "display.captain.name!=='Jean'",
  "display.captain.role!=='Content Captain'",
  "display.job.name!=='Content Planner'",
  "display.deliverable.name!=='Draft Content Plan'",
  "display.review_owner.name!=='@A1XX'",
  'display.workers.length!==0',
  'display.tools.length!==0',
  'display.model!==null',
  'display.decision_controls.enabled!==false',
  "'Confirm Handoff','Request Changes','Park'",
  "ui_state:'unavailable'",
  'handoff:null,review:null',
  "code:'review_display_unavailable',handoff:handoff,review:null",
  'No Output exists yet.',
  'Agent Inbox|Library|Agents > Outputs',
  'Permanent read-only review',
  'missionT6119TabKeyV25',
  'Journey',
  'History'
]);

['What happened','What now','What needs me','What this action does','What next','Safe destination'].forEach(label=>ok(source.includes(label),'five-question readback includes '+label));
['Goes to','Acting as','Expected return','Comes back to'].forEach(label=>ok(source.includes(label),'four-line summary includes '+label));
['Formal contract','Skills','Workers','Tools','Model','Effects','Source','Version','Full original command','Additional details'].forEach(label=>ok(source.includes(label),'details include '+label));
['@A1XX','Chief of Staff','Jean','Content Planner','Draft Content Plan'].forEach(label=>ok(source.includes(label),'routing includes '+label));
ok(!source.includes('Approve work to begin'),'superseded decision label is absent');
ok(source.includes('<button type="button" class="primary" disabled>\'+missionPhase1EscapeV25(labels[0])'),'Confirm Handoff is rendered disabled');
ok(source.includes('<button type="button" disabled>\'+missionPhase1EscapeV25(labels[1])'),'Request Changes is rendered disabled');
ok(source.includes('<button type="button" class="park" disabled>\'+missionPhase1EscapeV25(labels[2])'),'Park is rendered disabled');
ok(!/(fetch\s*\(|XMLHttpRequest|google\.script\.run|localStorage\.setItem|sessionStorage\.setItem|indexedDB|new Worker\s*\(|dispatchAgent|emitAudit|modelCall|createOutput)/i.test(source),'restored review boundary contains no runtime or write capability');

const wrapper=html.match(/missionT644ValidatePacketV25=async function\(packet,route,recipient\)\{[^\n]+\};/);
ok(wrapper,'extended packet validation wrapper exists');
includesAll(wrapper[0],['hasReview','fingerprint_mismatch','delete base.data.review_display','missionT6119ValidateDisplayV25']);
ok(/var normalized=await missionT6119NormalizeReviewPacketV25\(controller\.packet,controller\.recipient\)/.test(html),'open path consumes normalized display data');
ok(/body=missionT644TabsV25\(normalized\)/.test(html),'modal renderer receives normalization only');
ok(source.includes("lifecycle=base.handoff.lifecycle_state,uiState=lifecycle==='blocked'?'blocked':lifecycle==='failed'?'error'"),'terminal UI state derives from the validated normalized base lifecycle');
ok(source.includes("terminal=normalized&&normalized.ok&&['blocked','error'].indexOf(normalized.ui_state)>=0"),'tab router consumes only trusted normalized terminal state');
ok(!source.includes('packet.ui_state'),'packet-provided UI state is not consumed');

const css=html.slice(html.indexOf('<style id="mc-t6119-handoff-review-stage2-css">'),html.indexOf('</style>',html.indexOf('<style id="mc-t6119-handoff-review-stage2-css">')));
includesAll(css,['grid-template-columns:minmax(0,1fr) auto minmax(0,1fr) auto minmax(0,1fr) auto minmax(0,1fr) auto minmax(0,1fr)','justify-content:center','overflow-wrap:anywhere','@media(max-width:760px)','@media(max-width:520px)','@media(prefers-reduced-motion:reduce)','focus-visible']);
ok(/\.mc-t6119-route\{[^}]*width:100%/.test(css),'routing map is centered at full width');
ok(/@media\(max-width:760px\)[\s\S]*\.mc-t6119-route\{grid-template-columns:1fr/.test(css),'routing map stacks on narrow screens');

const display=fixtures.reviewDisplay;
const zero=Object.keys(display.effects).reduce((result,key)=>{result[key]=0;return result;},{});
const exact=(value,keys)=>!!value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).sort().join('|')===keys.slice().sort().join('|');
const isolated=Function('missionT644ExactV25','missionT644ZeroV25','missionPhase1EscapeV25',`${source};return {validate:missionT6119ValidateDisplayV25,unavailable:missionT6119UnavailableMarkupV25,review:missionT6119ReviewMarkupV25,tabs:missionT6119TabsV25};`)(exact,value=>exact(value,Object.keys(zero))&&Object.keys(zero).every(key=>value[key]===0),value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])));
assert.deepStrictEqual(isolated.validate(display,{handoff_id:fixtures.HANDOFF_ID,handoff_version:1,lifecycle_state:'awaiting_start_approval'},display.source.source_version),{ok:true,code:'verified'});checks+=1;
[
  ['workers',[{}]],['tools',['tool']],['model','gpt'],['decision_controls',{labels:['Confirm Handoff','Request Changes','Park'],enabled:true}],['effects',{...zero,network_calls:1}]
].forEach(([key,value])=>{const mutated=JSON.parse(JSON.stringify(display));mutated[key]=value;ok(!isolated.validate(mutated,{handoff_id:fixtures.HANDOFF_ID,handoff_version:1,lifecycle_state:'awaiting_start_approval'},display.source.source_version).ok,'invalid '+key+' fails closed');});

const blocked=contract.normalizeReviewPacket(fixtures.blockedPacket());
const failed=contract.normalizeReviewPacket(fixtures.failedPacket());
const blockedMarkup=isolated.tabs(blocked);
const failedMarkup=isolated.tabs(failed);
includesAll(blockedMarkup,['data-review-state="blocked"','Handoff review blocked','The verified handoff is blocked.','No approval, reply, read receipt, agent start, Output, or external action is connected.']);
includesAll(failedMarkup,['data-review-state="error"','Handoff failed safely','The verified handoff failed safely.','No approval, reply, read receipt, agent start, Output, or external action is connected.']);
['Confirm Handoff','Request Changes','Park',display.action_title,display.captain.name,display.chief_recommendation].forEach(value=>{ok(!blockedMarkup.includes(value),'blocked presentation hides review content '+value);ok(!failedMarkup.includes(value),'error presentation hides review content '+value);});
assert.deepStrictEqual(blocked.effects,zero);checks+=1;
assert.deepStrictEqual(failed.effects,zero);checks+=1;

const rejected=contract.clone(fixtures.blockedPacket());
rejected.data.review_display.captain={name:'Injected Agent',role:'Injected Captain'};
rejected.packet_fingerprint=contract.fingerprint(rejected);
const rejectedNormalized=contract.normalizeReviewPacket(rejected);
assert.deepStrictEqual({ui_state:rejectedNormalized.ui_state,handoff:rejectedNormalized.handoff,review:rejectedNormalized.review,effects:rejectedNormalized.effects},{ui_state:'unavailable',handoff:null,review:null,effects:zero});checks+=1;
const rejectedMarkup=isolated.tabs(rejectedNormalized);
ok(rejectedMarkup.includes('data-review-state="unavailable"'),'rejected packet renders unavailable only');
ok(!rejectedMarkup.includes('Injected Agent'),'rejected packet metadata is absent');
ok(!rejectedMarkup.includes(display.action_title),'rejected packet review content is absent');

for(const packet of [{lifecycle_state:'blocked'},{lifecycle_state:'failed'},{ui_state:'blocked'},{ui_state:'error'},{transport_error:true,ui_state:'blocked'},null]){
  const normalized=contract.normalizeReviewPacket(packet);
  assert.deepStrictEqual({ui_state:normalized.ui_state,handoff:normalized.handoff,review:normalized.review,effects:normalized.effects},{ui_state:'unavailable',handoff:null,review:null,effects:zero});checks+=1;
  ok(isolated.tabs(normalized).includes('data-review-state="unavailable"'),'raw or malformed terminal claim renders unavailable');
}

console.log(`PASS t6.119 Stage 2 production static acceptance (${checks} checks)`);
