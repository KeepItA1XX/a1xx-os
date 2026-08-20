const fs = require('fs');

const html = fs.readFileSync('money-mission-tracker-v2_5.html', 'utf8');
const failures = [];
let checks = 0;
const expect = (condition, label) => { checks += 1; if (!condition) failures.push(label); };

const recognizerSource = html.match(/function missionT64JeanContentPlannerRequestV25\(text\)\{[^\n]+\}/);
expect(recognizerSource, 'deterministic recognizer exists');
if (recognizerSource) {
  const recognizes = Function(`${recognizerSource[0]}; return missionT64JeanContentPlannerRequestV25;`)();
  expect(recognizes('Create a content plan for A1XX'), 'supported content-plan request stages');
  expect(recognizes('Draft our YouTube plan'), 'supported YouTube-plan request stages');
  expect(!recognizes('Create a sales plan for A1XX'), 'unsupported job stays inert');
  expect(!recognizes('Tell me about content planning'), 'read-only question stays inert');
  expect(!recognizes('Create a content plan for Acme Corp'), 'unsupported external target stays inert');
}

const prepare = html.match(/function prepareMissionT64JeanContentPlannerPreviewV25[\s\S]*?\n\}/);
const preview = html.match(/function openMissionT64JeanContentPlannerPreviewV25[\s\S]*?\n\}/);
const ask = html.match(/askMissionCommand=function\(\)\{[^\n]+\};/);
expect(prepare && /captain:'Jean'/.test(prepare[0]), 'Jean maps to Captain');
expect(prepare && /job:'Content Planner'/.test(prepare[0]), 'Content Planner maps to Job');
expect(prepare && /stage_state:'ready'/.test(prepare[0]), 'primary state is ready');
expect(prepare && /internal_substate:'awaiting_a1xx_confirmation'/.test(prepare[0]), 'internal substate is awaiting confirmation');
expect(prepare && /workers:\[\],tools:\[\]/.test(prepare[0]), 'Workers and tools are empty');
expect(prepare && /title:'Content Plan for A1XX'/.test(prepare[0]), 'work title is Content Plan for A1XX');
expect(prepare && /owner:'Jean · Content Captain'/.test(prepare[0]), 'owner metadata is Jean Content Captain');
expect(/Chief of Staff routes the request/.test(html), 'Chief remains compact internal routing copy');
expect(/I understand the request\. Chief of Staff recommends a Content Plan for A1XX handoff/.test(html), 'Executive Assistant remains visible conversational voice');
expect(ask && /prepareMissionT64JeanContentPlannerPreviewV25\(q\)/.test(ask[0]) && !/openMissionT64JeanContentPlannerPreviewV25\(q\)/.test(ask[0]), 'Enter prepares without opening modal');
expect(ask && />Review handoff<\/button>/.test(ask[0]) && /type="button"/.test(ask[0]), 'reply has accessible Review handoff button');
expect(prepare && !/openMissionPhase1ModalV25|MISSION_PHASE1_INBOX_V25|confirmMissionAssignmentV25/.test(prepare[0]), 'preparation does not open, confirm, or create Inbox activity');
expect(preview && /openMissionPhase1ModalV25/.test(preview[0]), 'Review handoff click opens existing modal');
expect(/item\.stage_state='parked'/.test(html), 'Park is memory-only state');
expect(/state:isJeanPreview\?'ready':'staged'/.test(html), 'confirmed Jean preview uses canonical ready state');
expect(/function missionT64DecisionFeedbackV25/.test(html) && /mcShowToastV10/.test(html), 'Park and Confirm use existing toast feedback');
expect(/Handoff parked locally/.test(html) && /Submit the request again/.test(html), 'Park adds truthful EA bubble with next action');
expect(/Handoff added to Agent Inbox/.test(html) && />Open Agent Inbox<\/button>/.test(html), 'Confirm adds EA bubble with accessible Inbox control');
expect(/unread:isJeanPreview/.test(html), 'confirmed Jean handoff enters Inbox as new');
expect(/if\(assignment\.contract==='t6_4_jean_content_planner_local_preview'\)\{item\.unread=false;renderMissionAgentInboxV25\(\)/.test(html), 'Review acknowledges the specific Jean item');
expect(/<dt>Project<\/dt>.*<dt>Captain<\/dt>.*<dt>Job<\/dt>.*<dt>Skills<\/dt>.*<dt>Workers<\/dt>.*<dt>Tools<\/dt>.*<dt>State<\/dt>/.test(html), 'Inbox Review shows full Jean handoff contract');
expect(/Jean is not dispatched/.test(html) && /separately approved execution decision/.test(html), 'Inbox detail preserves no-dispatch next step');
expect(/item\.feedbackShown===action/.test(html), 'repeat decision feedback is deduplicated');
const park = html.match(/function parkMissionT64JeanContentPlannerPreviewV25\(\)\{[^\n]+\}/);
expect(park && park[0].indexOf('closeMissionPhase1ModalV25()') < park[0].indexOf("missionT64DecisionFeedbackV25(item,'parked')"), 'Park closes modal before toast and EA bubble');
const confirm = html.match(/function confirmMissionAssignmentV25\(\)\{[^\n]+\}/);
expect(confirm && /closeMissionPhase1ModalV25\(\);if\(isJeanPreview\)missionT64DecisionFeedbackV25\(item,'confirmed'\)/.test(confirm[0]), 'Confirm still closes modal before feedback');

const addedSurface = [prepare && prepare[0], preview && preview[0], recognizerSource && recognizerSource[0], ask && ask[0]].join('\n');
expect(!/fetch\s*\(|XMLHttpRequest|google\.script\.run|localStorage\.setItem|sessionStorage\.setItem|indexedDB|new Worker\s*\(|dispatchAgent|postToAppsScript|Today|Agency Feed|receipt/i.test(addedSurface), 'preview has zero external/runtime/persistence/promotion effects');
expect(!/data-tab=|<nav|relationship map|output card/i.test(addedSurface), 'preview adds no nav, relationship map, or output surface');

const t67Start = html.indexOf('function missionT67HandoffReviewStepsMarkupV25');
const t67End = html.indexOf('function prepareMissionT64JeanContentPlannerPreviewV25');
const t67 = html.slice(t67Start, t67End);
expect(t67Start > -1 && t67End > t67Start, 'T6.7 helpers are adjacent to T6.4');
['Nothing is running', 'REVIEW HANDOFF', 'CURRENT', 'NEXT', 'LATER', 'Proposed routing path', 'Request interpretation', 'Plain-language read', 'What approval means', 'Five-question readback', 'Safe destination'].forEach((token) => expect(t67.includes(token), `T6.7 hierarchy includes ${token}`));
['A1XX', 'Chief of Staff', 'Jean', 'Content Planner', 'Content Plan'].forEach((token) => expect(t67.includes(token), `visual route includes ${token}`));
['What happened', 'What now', 'What needs me', 'What this action does', 'What next'].forEach((token) => expect(t67.includes(token), `five-question readback includes ${token}`));
expect(/mode==='inbox'\?\[\['DONE','Routing confirmed',false\],\['CURRENT · NOT CONNECTED','Agent Inbox Review',true\]/.test(t67), 'Inbox Review has state-specific stepper');
expect(/data-handoff-review-state="'\+\(inbox\?'inbox':'review'\)/.test(t67), 'only review and inbox modal states render');
expect(!/data-handoff-review-state[^\n]*(confirmed|parked)/.test(t67), 'no persistent Confirmed or Parked modal states');
expect(/aria-current="step"/.test(t67) && /aria-live="polite"/.test(t67), 'stepper and readback expose state accessibly');
expect(/id="mc-t67-revision-note" aria-invalid="false" aria-describedby="mc-t67-revision-error"/.test(t67), 'revision note has accessible validation contract');
expect(/A revision note is required/.test(t67) && /input\.focus\(\{preventScroll:true\}\)/.test(t67), 'empty revision is rejected and focused');
expect(/item\.revision_note=note/.test(t67) && /nothing was staged or dispatched/.test(t67), 'valid revision stays local and truthful');
expect(/missionPhase1EscapeV25\(item\.project\)/.test(t67) && /missionPhase1EscapeV25\(\(item\.skills\|\|\[\]\)\.join/.test(t67) && /missionPhase1EscapeV25\(item\.revision_note\|\|''\)/.test(t67), 'dynamic handoff facts are escaped');
expect(/0 calls · 0 runs · 0 writes/.test(t67) && /not dispatched/.test(t67), 'zero-effect truth is visible');
expect(t67.includes('No output exists yet. A future returned result would link to one canonical Output visible through Inbox, Library, and Agents &gt; Outputs.'), 'Inbox Review states the full no-output and canonical-location contract');
expect(!/fetch\s*\(|XMLHttpRequest|WebSocket|google\.script\.run|localStorage\.setItem|sessionStorage\.setItem|indexedDB|new Worker\s*\(|postToAppsScript|dispatchAgent|deliverySend|receipt/i.test(t67), 'T6.7 helpers contain no forbidden capability');

const cssStart = html.indexOf('#mc-phase1-modal-scoped .mc-handoff-review-shell');
const cssEnd = html.indexOf('@media(max-width:1000px)', cssStart);
const t67Css = html.slice(cssStart, cssEnd);
expect(cssStart > -1 && cssEnd > cssStart, 'T6.7 scoped CSS exists');
expect(!/(^|[},])\s*\.mc-handoff-review-/m.test(t67Css), 'every Handoff Review selector is host-scoped');
['@media(max-width:760px)', '@media(max-width:520px)', '@media(prefers-reduced-motion:reduce)', 'overflow-wrap:anywhere', 'min-width:0'].forEach((token) => expect(t67Css.includes(token), `responsive CSS includes ${token}`));
expect(/id="mc-phase1-modal-scoped"/.test(html), 'existing modal host carries the scope id');

const staged = html.match(/function openMissionStagedAssignmentV25\(id\)\{[^\n]+\}/);
expect(staged && /if\(assignment\.contract==='t6_4_jean_content_planner_local_preview'\)/.test(staged[0]), 'full Inbox hierarchy is contract-linked only');
expect(staged && /openMissionPhase1ModalV25\('Ready for Handoff',item\.title,'This assignment is staged locally\. No dispatch occurred\.'/.test(staged[0]), 'generic staged fallback is preserved');
expect(/if\(!MISSION_STAGE4_MASTER_ENABLED_V25\|\|!MISSION_STAGE4_BROWSER_V25\.enabled\)/.test(html), 'Stage4 default-off wrapper is preserved');
expect(/if\(modal&&modal\.classList\.contains\('open'\)\)\{event\.preventDefault\(\);closeMissionPhase1ModalV25\(\)/.test(html), 'Escape still closes modal through existing focus-return path');

const inboxRenderer = html.match(/function renderMissionAgentInboxV25\(\)\{[\s\S]*?\n\}/);
expect(inboxRenderer && /assignment\.contract==='t6_4_jean_content_planner_local_preview'/.test(inboxRenderer[0]), 'Inbox naming branch is contract-specific');
expect(inboxRenderer && /<strong>'\+missionPhase1EscapeV25\(item\.title\)/.test(inboxRenderer[0]), 'contract Inbox row leads with work title');
expect(inboxRenderer && /<span>Jean · Content Captain<\/span><span>Job: Content Planner<\/span>/.test(inboxRenderer[0]), 'owner and Job appear once in secondary metadata');
expect(inboxRenderer && /item\.source\+' · '\+\(item\.title\|\|item\.label\)/.test(inboxRenderer[0]), 'generic legacy source-title output is preserved');
expect(!html.includes('Jean · Jean · Content Planner'), 'redundant Jean title is absent');
expect(!html.includes("title:'Jean · Content Planner'"), 'owner and Job are not used as work title');
expect(/openMissionPhase1ModalV25\('Handoff Review',item\.title/.test(html) && /openMissionPhase1ModalV25\('Agent Inbox Review',assignment\.title/.test(html), 'pre-decision and Inbox modal titles use work title');
expect(/The Content Plan for A1XX handoff was added to Agent Inbox/.test(html) && /The Content Plan for A1XX handoff is parked locally/.test(html), 'durable EA decision wording uses work title');
expect(/Chief of Staff recommends a Content Plan for A1XX handoff\. Jean is the Content Captain; Content Planner is the Job\./.test(html), 'initial EA chat separates title owner and Job');
expect(/replace\(mode==='inbox'\?'Ready · awaiting A1XX execution decision':'Ready · awaiting A1XX confirmation','Ready for confirmation'\)/.test(t67), 'visible review state is Ready for confirmation');

if (failures.length) {
  console.error(`T6.4 FAIL (${failures.length})`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(`T6.4/T6.7 PASS (${checks}/${checks})`);
