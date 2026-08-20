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
expect(prepare && /title:'Prepare a Content Plan for Executive Review'/.test(prepare[0]), 'approved work title includes the exact article');
expect(prepare && /owner:'Jean · Content Captain'/.test(prepare[0]), 'owner metadata is Jean Content Captain');
expect(/Chief of Staff made routing recommendation/.test(html), 'Chief remains the recommendation author');
expect(/Chief of Staff recommends this handoff: Prepare a Content Plan for Executive Review\./.test(html), 'Executive Assistant chat uses the exact work title');
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
['Mission Command', 'Chief of Staff made routing recommendation', 'Executive Assistant prepared review', '@A1XX decision', 'What needs me', 'CURRENT', 'NEXT', 'LATER', 'Safe destination', 'Additional details', 'Full original command'].forEach((token) => expect(t67.includes(token), `approved hierarchy includes ${token}`));
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
expect(/\.mc-handoff-review-hero\{text-align:left/.test(t67Css) && /\.mc-handoff-review-movement\{[^}]*justify-content:flex-start/.test(t67Css), 'EA letter and compact movement are left aligned');
expect(/\.mc-handoff-review-control:hover \.mc-handoff-review-tip/.test(t67Css) && /\.mc-handoff-review-control:focus-within \.mc-handoff-review-tip/.test(t67Css), 'hidden help appears only on hover or keyboard focus-within');
expect(!/data-open|mc-handoff-review-help/.test(t67Css), 'CSS has no sticky help selector or visible help button');
expect(/\.mc-handoff-review-visible-routing \.mc-handoff-review-stepper\{margin-top:22px;gap:12px\}/.test(t67Css), 'desktop stepper has increased route separation and internal spacing');
expect(/\.mc-handoff-review-visible-routing \.mc-handoff-review-step small\{font-size:8px\}/.test(t67Css) && /\.mc-handoff-review-visible-routing \.mc-handoff-review-step b\{font-size:11px/.test(t67Css), 'stepper tags and targets are modestly larger');
expect(/@media\(max-width:760px\)[\s\S]*\.mc-handoff-review-visible-routing \.mc-handoff-review-stepper\{margin-top:16px;gap:6px\}/.test(t67Css), 'mobile stepper spacing remains proportional');
expect(/#mc-phase1-modal-scoped \.mc-handoff-review-details \.mc-handoff-review-groups\+\.mc-handoff-review-label\{display:block;margin-top:12px\}/.test(html), 'Full original command label has modest scoped separation from preceding details');
expect(/#mc-phase1-modal-scoped \.mc-handoff-review-letter\{[^}]*text-align:left/.test(html) && /\.mc-handoff-review-letter p\+p\{margin-top:7px\}/.test(html), 'EA letter is locally scoped, left aligned, and separates sentences modestly');
expect(/#mc-phase1-modal-scoped \.mc-handoff-review-signoff\{[^}]*text-align:left[^}]*font-size:10px/.test(html), 'EA sign-off uses restrained scoped message-close styling');
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
expect(/Prepare a Content Plan for Executive Review was added to Agent Inbox/.test(html) && /Prepare a Content Plan for Executive Review is parked locally/.test(html), 'durable EA decision wording uses exact work title');
expect(/Prepare a Content Plan for Executive Review\. Jean is the Content Captain; Content Planner is the Job\./.test(html), 'initial EA chat separates title owner and Job');
expect(/<dt>State<\/dt><dd>Ready for confirmation<\/dd>/.test(t67), 'visible review state is Ready for confirmation');

const provenance = t67.indexOf('Chief of Staff made routing recommendation');
const eaPrepared = t67.indexOf('Executive Assistant prepared review');
const a1xxDecision = t67.indexOf('@A1XX decision');
expect(provenance > -1 && provenance < eaPrepared && eaPrepared < a1xxDecision, 'provenance orders Chief authorship, EA presentation, and A1XX decision');
expect(t67.includes('I reviewed the Chief of Staff’s recommendation and prepared this handoff for you.'), 'EA presents the recommendation conversationally');
expect(t67.includes('Jean</span><i>→</i><span>Draft Content Plan</span><i>→</i><span>@A1XX Review'), 'compact movement is exact');
['Goes to', 'Acting as', 'Expected return', 'Comes back to'].forEach((token) => expect(t67.includes(token), `four-line summary includes ${token}`));
expect(t67.includes('>Confirm Handoff</button>') && t67.includes('>Request Changes</button>') && t67.includes('>Park</button>'), 'approved decision labels are exact');
const decisionStart = t67.indexOf('Approve the Chief of Staff’s routing recommendation?');
expect(decisionStart > -1 && t67.indexOf('>Confirm Handoff</button>', decisionStart) < t67.indexOf('mc-handoff-review-safety', decisionStart), 'permanent no-start line immediately follows decision controls');
['mc-t612-confirm-tip', 'mc-t612-changes-tip', 'mc-t612-park-tip', 'role="tooltip"', 'aria-describedby'].forEach((token) => expect(t67.includes(token), `hidden decision help includes ${token}`));
expect(!/>\?<\/button>|mc-handoff-review-help|missionT612HandoffHelpV25|data-open|aria-expanded/.test(t67), 'no visible or sticky help toggle remains');
const renderedOrder = t67.slice(t67.indexOf("return '<div class=\"mc-handoff-review-shell\""));
const visibleRoute = renderedOrder.indexOf('mc-handoff-review-visible-routing');
const route = renderedOrder.indexOf('missionT67HandoffReviewRouteMarkupV25()', visibleRoute);
const stepper = renderedOrder.indexOf('missionT67HandoffReviewStepsMarkupV25(mode)', visibleRoute);
const details = renderedOrder.indexOf("+details+'</div>'");
expect(visibleRoute > -1 && visibleRoute < route && route < stepper && stepper < details, 'visible route precedes state stepper and closed Additional details');
expect(!t67.includes('<details class="mc-handoff-review-details" open'), 'Additional details is closed by default');
['Formal contract', 'Capabilities', 'Workers', 'Tools', 'Model', 'Effects', 'Source', 'Version', 'No output exists yet'].forEach((token) => expect(t67.includes(token), `deeper details include ${token}`));
expect(/missionPhase1EscapeV25\(item\.request\)/.test(t67), 'full original command is escaped for long-copy safety');

const renderT6121 = Function(`function missionPhase1EscapeV25(value){return String(value == null ? '' : value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}${t67}; return missionT67HandoffReviewBodyV25;`)();
const fixtureItem = { title: 'Prepare a Content Plan for Executive Review', project: 'A1XX', request: '<long command>', skills: ['Audience problem', 'Hook'], revision_note: '' };
const reviewMarkup = renderT6121(fixtureItem, 'review');
const inboxMarkup = renderT6121(fixtureItem, 'inbox');
const scanLabels = ['Workers', 'Tools', 'Model', 'Effects', 'Source', 'Version'];
scanLabels.forEach((label) => {
  const token = `data-scan-row="${label}"`;
  expect(reviewMarkup.split(token).length === 2, `${label} is one distinct semantic scan row`);
});
expect(!/<dt>(Workers|Tools|Model|Effects|Source|Version)<\/dt>/.test(reviewMarkup), 'six scan labels are not grouped into definition-list facts');
expect(!/data-scan-row="(?:Workers · Tools|Model · Effects|Source · Version)"/.test(reviewMarkup), 'six scan labels are never combined');
expect(reviewMarkup.includes('data-scan-row="State"><span>State</span><strong>Ready for confirmation</strong>'), 'pre-decision presentation state is exact');
expect(inboxMarkup.includes('data-scan-row="State"><span>State</span><strong>Handoff confirmed · execution not connected</strong>'), 'Inbox Review presentation state is exact');
expect((reviewMarkup.match(/Formal contract/g) || []).length === 1 && !reviewMarkup.includes('>Routing<'), 'details keep one formal contract and do not duplicate Routing');
expect(reviewMarkup.includes('Full original command') && reviewMarkup.includes('&lt;long command&gt;') && reviewMarkup.includes('No output exists yet'), 'project details preserve escaped command and no-output truth');
const letterSentences = [
  'I reviewed the Chief of Staff’s recommendation and prepared this handoff for you.',
  'The Chief recommends sending it to Jean.',
  'Jean will act as the Content Planner to prepare a Draft Content Plan and return it to you for Executive Review.'
];
expect(reviewMarkup.includes('<div class="mc-handoff-review-letter" aria-label="Executive Assistant recommendation"><p>'), 'pre-decision recommendation uses semantic EA letter markup');
expect(letterSentences.every((sentence) => reviewMarkup.includes(`<p>${sentence}</p>`)), 'each exact EA recommendation sentence has its own block');
const letterOne = reviewMarkup.indexOf(letterSentences[0]);
const letterTwo = reviewMarkup.indexOf(letterSentences[1]);
const letterThree = reviewMarkup.indexOf(letterSentences[2]);
const controlsEnd = reviewMarkup.indexOf('Nothing will start from this decision.');
const signature = reviewMarkup.indexOf('— Your Executive Assistant');
const signatureSource = reviewMarkup.indexOf('Prepared from the Chief of Staff’s recommendation.');
const lowerRoute = reviewMarkup.indexOf('mc-handoff-review-visible-routing');
expect(letterOne < letterTwo && letterTwo < letterThree && letterThree < controlsEnd && controlsEnd < signature && signature < signatureSource && signatureSource < lowerRoute, 'letter, controls, safety, EA sign-off, and lower route render in exact order');
expect((reviewMarkup.match(/— Your Executive Assistant/g) || []).length === 1 && !inboxMarkup.includes('— Your Executive Assistant') && !inboxMarkup.includes('mc-handoff-review-letter'), 'EA sign-off and letter appear only in pre-decision review');
expect(!/Executive Assistant (recommended|approved|dispatched|executed)/i.test(reviewMarkup), 'sign-off does not transfer Chief authorship or claim approval or execution');

if (failures.length) {
  console.error(`T6.4 FAIL (${failures.length})`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(`T6.4/T6.7 PASS (${checks}/${checks})`);
