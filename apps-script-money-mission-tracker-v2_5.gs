// ============================================================
// A1XX Money Mission Tracker — Google Apps Script Backend
// Version 2.5
// Changes in 2.5 (2026-06-21):
//   - Added action=mission_command_voice_probe for Phase 133 Stage 40
//     Pass 40E backend relay support. The endpoint calls ElevenLabs only from
//     Apps Script Properties and returns audioBase64/mimeType to the app.
//   - Added Pass 40G player-safe ElevenLabs HTTP reason readback so the app
//     can distinguish setup, quota, model, request, and provider failures
//     without exposing raw provider responses.
//   - No secret export, token export, startup voice, autoplay, mission
//     completion, XP award, notification dispatch, worker, or automation
//     behavior is enabled.
// Changes in 2.5 (2026-06-01):
//   - Promoted the Apps Script backend identity to v2_5 for the OS v2_5
//     Phase 9F Account Mission Contracts build line.
//   - Preserved the v2_0 backend behavior and V20 helper suffixes for
//     deployment continuity.
//   - No new restore, login-anywhere, worker auth, automation, token export,
//     secret export, or bootstrap execution behavior is enabled by this bump.
// Changes in 2.0 (2026-06-01):
//   - Promoted the Apps Script backend file to v2_0 for the OS v2_5 build line.
//   - Preserved the Phase 8AS-stable behavior while moving internal backend
//     helper suffixes from V19 to V20 for clean build receipts.
//   - No new restore, login-anywhere, worker auth, automation, token export,
//     secret export, or bootstrap execution behavior is enabled by this bump.
// Changes in 1.9 (2026-05-26):
//   - Added Foundation Pass Drive read endpoints for future skill/vault packs.
//   - Added action=read_skill_file, action=list_skill_files, and action=read_vault_file.
//   - Read-only Drive access only; no writes, deletes, or active pack behavior.
//   - Added OS Profile Index / Device Registry metadata endpoints for future
//     cross-device auth foundation. New devices remain Pending by default.
//   - Added safe OS Setup Pointer Index population for non-secret cloud pointers.
//   - Added read-only OS registry summary endpoint for Phase 6B cloud workspace
//     visibility. No Notion, Sheet, or Drive writes.
// Changes in 1.8 (2026-05-24):
//   - Added Mission Command v1.1 Sheets event receiver.
//   - Added SHEET_MISSION_EVENTS = 'Mission Command Events' tab.
//   - Added type='mission_dpc_log', 'mission_pipeline_move', 'mission_booked_call',
//     'mission_revenue_log', and 'mission_content_log' POST handling.
//   - Granular Mission Command writes append to an event log only; existing
//     Daily Log, CRM, Calendar, and revenue totals remain confirmation-owned.
//   - 2026-05-25 recovery patch: added A1XX_SPREADSHEET_ID routing helper so
//     the backend can write to the clean rescue workbook instead of the bloated
//     originally bound workbook.
// Changes in 1.7 (2026-05-12):
//   - Added SHEET_RESET_AUDIT = 'Reset Audit' tab — captures every truncated row
//   - Added type='reset_test_data' POST → archives-then-truncates Daily Log
//     and/or Captured Leads tabs (per-flag), preserves headers, never deletes
//     audit history
//   - Bundles v1.5 (Daily Log) + v1.6 (Captured Leads) + v1.7 (Reset). Single paste.
// Changes in 1.6 (2026-05-12):
//   - Added SHEET_PROSPECTS = 'Captured Leads' tab — one row per prospect
//   - Added type='prospect_save' POST → upserts by ID column
//   - Added type='prospect_delete' POST → soft delete (Deleted At column)
//   - Added action=prospect_log GET → returns non-deleted rows JSON
// Changes in 1.5 (2026-05-12):
//   - Added SHEET_DAILY = 'Daily Log' tab — one row per (date)
//   - Added type='daily_save' POST with mode='add' or mode='replace'
//   - Added action=daily_log GET → date-ranged rows JSON
// Changes in 1.4:
//   - Added action=skool_community → getSkoolCommunity()
// ============================================================

var SHEET_WEEKLY       = 'Weekly Saves';
var SHEET_ARCHIVE      = 'Cycle Archives';
var SHEET_LOG          = 'Activity Log';
var SHEET_BACKUP       = 'State Backups';
var SHEET_DAILY        = 'Daily Log';
var SHEET_PROSPECTS    = 'Captured Leads';
var SHEET_RESET_AUDIT  = 'Reset Audit';      // ← NEW in 1.7
var SHEET_MISSION_CHAT = 'Mission Command Chat Log';
var SHEET_MISSION_SESSIONS = 'Mission Command Sessions';
var SHEET_MISSION_SYNC_AUDIT = 'Mission Command Sync Audit';
var SHEET_MISSION_EVENTS = 'Mission Command Events';
var SHEET_OS_PROFILE_INDEX = 'OS Profile Index';
var SHEET_OS_DEVICE_REGISTRY = 'OS Device Registry';
var SHEET_OS_SETUP_POINTERS = 'OS Setup Pointer Index';
var SHEET_TIME_SESSIONS_LEDGER = 'Time Sessions Ledger';

var NOTION_CONTENT_DB    = '1a061152-81da-81bc-b7ec-cecbcba9ed8e';
var NOTION_PRODUCTION_DB = '1a761152-81da-8199-a5df-fc423d447f31'; /* 2026-05-18: was incorrectly set to the data source ID (...8188...). Notion /v1/databases/{id}/query expects the DATABASE ID (URL slug). Parent database "Master Beat Catalog" lives at notion.so/1a76115281da8199a5dffc423d447f31. */
var NOTION_RESOURCE_DB   = '35861152-81da-8053-8d5e-c5e6c5042e6c';
var NOTION_CRM_DB        = 'b82e7140-b3b0-48d1-915d-34e4cdf9f65a';
var NOTION_PROJECTS_DB   = '19f61152-81da-8141-86a7-000b43a05c39';
var NOTION_PROJECTS_CONTAINER = '19f61152-81da-811e-aee9-c36dee866ec9';
var NOTION_OPS_DAILY_DB  = '36461152-81da-809d-baa7-d6638dd2077b';
var NOTION_OPS_WEEKLY_DB = '515171aa-890f-405f-a035-a37c09348f35';
var NOTION_OPS_CYCLE_DB  = 'e84314ae-e99a-4619-8c91-368fbfa38a63';
var TARGET_SPREADSHEET_PROPERTY = 'A1XX_SPREADSHEET_ID';
var MC_SKILLS_LIBRARY_FOLDER = 'MC Skills Library';
var MC_MEMORY_VAULT_FOLDER = 'MC Memory Vault';
var OS_REGISTRY_SUMMARY_BUILD_V20 = 'mmos-20260601-1546-v25-phase9f-account-mission-contracts';
var PHASE25_NOTION_READ_RELAY_BUILD_V25 = 'mmos-20260607-phase25-apps-script-read-relay-stub';
var PHASE26_NOTION_LIVE_READ_PROBE_BUILD_V25 = 'mmos-20260607-phase26-gated-live-read-probe';
var PHASE27_NOTION_PACKET_NORMALIZATION_BUILD_V25 = 'mmos-20260607-phase27-packet-normalization-stale-contract';
var PHASE28_NOTION_PACKET_QA_BUILD_V25 = 'mmos-20260607-phase28-packet-readback-qa-source-trust';
var PHASE101_MISSION_OS_CONTEXT_BUILD_V25 = 'mmos-20260619-phase101-mission-os-context-contract';
var PHASE102_MISSION_OS_CONTEXT_LIVE_PROBE_BUILD_V25 = 'mmos-20260619-phase102-mission-os-context-live-read-probe';
var PHASE102_CURRENT_OPERATING_STATE_API_ID_V25 = 'b83e9a0438f44f3d87833ddf4791c842';
var PHASE103_MISSION_OS_CONTEXT_NORMALIZATION_BUILD_V25 = 'mmos-20260619-phase103-mission-os-context-normalization';
var PHASE25_NOTION_TASK_MASTER_SOURCE_ID_V25 = '11161152-81da-80da-891f-000b711d93d8';
var PHASE25_NOTION_TASK_MASTER_VIEW_ID_V25 = '37761152-81da-81fa-98b3-000cedc52d4f';
var PHASE25_NOTION_LIVE_EVENTS_SOURCE_ID_V25 = 'f32424f4-9966-4aaf-a387-ff985f4be95e';
var PHASE25_NOTION_LIVE_EVENTS_VIEW_IDS_V25 = {
  upcoming_events: 'b5d5adeb-306a-4293-a7f2-8dca0f10ec21',
  events_by_campaign: '8d9b8d77-e7e1-4a35-b22f-1d47f3a99ffa',
  events_by_mission: 'a6ceba1a-56d1-44a2-902b-0f51f78d6e2f',
  followup_required_events: '4f329ddc-ad6b-4d05-944a-b171bfd9822f'
};

var WEEKLY_HEADERS = [
  'Timestamp','Save Date','Cycle #','Cycle Name','Cycle Dates','Cycle Target ($)',
  'Days Elapsed','Days Remaining',
  'Gross Revenue ($)','Week Target ($)',
  'Ad Spend/mo ($)','Software/mo ($)','Services This Cycle ($)','Other Expenses ($)','Total Expenses ($)',
  'Net Profit ($)','Profit Margin (%)','ROAS',
  'Daily Pace ($/day)','Projected Cycle Total ($)',
  'Sessions Closed','Warm Leads','Avg Deal Value ($)',
  'DMs Sent (week)','Responded','Offers Made','Closed (Paid)',
  'Total DMs This Cycle','Total Posts This Cycle',
  'Studio Commission ($)','Mix & Master ($)','Rappreneur OS ($)',
  'Production Deals ($)','Custom Beats ($)','Other Income ($)',
  'W1 Revenue','W2 Revenue','W3 Revenue','W4 Revenue',
  'W5 Revenue','W6 Revenue','W7 Revenue','W8 Revenue',
  'W1 Services','W2 Services','W3 Services','W4 Services',
  'W5 Services','W6 Services','W7 Services','W8 Services',
  'W1 Other Exp','W2 Other Exp','W3 Other Exp','W4 Other Exp',
  'W5 Other Exp','W6 Other Exp','W7 Other Exp','W8 Other Exp',
  'Big Win This Week','Biggest Lesson'
];

var ARCHIVE_HEADERS = [
  'Archived At','Cycle #','Cycle Name','Cycle Dates','Cycle Target ($)',
  'Days Elapsed at Archive',
  'Final Revenue ($)','Total Expenses ($)','Net Profit ($)','Profit Margin (%)',
  'ROAS','Daily Pace ($/day)',
  'Sessions Closed','Total DMs This Cycle','Total Posts This Cycle',
  'Studio Commission ($)','Mix & Master ($)','Rappreneur OS ($)',
  'Production Deals ($)','Custom Beats ($)','Other Income ($)',
  'Big Win','Biggest Lesson','Notes'
];

var DAILY_HEADERS = [
  'Date',
  'DMs Sent','Calls Made','Content Posted','Calls Booked','Closes (Paid)',
  'Money Collected ($)','New Warm Leads',
  'First Saved At','Last Updated At','Save Count'
];

var PROSPECT_HEADERS = [
  'First Saved','Stage Name','Real Name','Phone','Email','Instagram',
  'Threads','Website','Source','Stage','Hot','ATL','First Touch',
  'Next Action','Follow-Up Date','Notes','Save Count',
  'ID','Last Updated','Deleted At'
];

var RESET_AUDIT_HEADERS = [
  'Reset At','Reason','Source Tab','Original Row (JSON)'
];

var MISSION_EVENT_HEADERS = [
  'Received At','Event Type','Event Timestamp','Source','Action','Route',
  'Result','Status','Lead','Amount','Title','Summary','Session ID',
  'Active Chat ID','Prompt','Payload JSON'
];

var OS_PROFILE_INDEX_HEADERS = [
  'Profile ID','Display Name','Role','Timezone','Preferred Routes','Build Channel',
  'Active Device ID','Latest Backup Marker','Latest Backup Sheet Row',
  'Latest Backup Drive File ID','Latest Backup Size','Last Verified At',
  'Status','Notes'
];

var OS_DEVICE_REGISTRY_HEADERS = [
  'Device ID','Profile ID','Device Label','Device Type','First Seen At',
  'Last Seen At','Last Anchor Check At','Last Backup Marker',
  'Last Backup Sheet Row','Trusted Status','Trust Reason','Build Token',
  'App File','Status','Notes'
];

var OS_SETUP_POINTER_HEADERS = [
  'Pointer Key','Pointer Label','Pointer Type','Pointer Value','Updated At',
  'Updated By Device ID','Status','Notes'
];

var TIME_SESSIONS_LEDGER_HEADERS_V25 = [
  'Saved At','Idempotency Key','Review ID','Mission ID','Mission','Lane',
  'Action Type','Action Label','Status','Decision','Start Time ET','End Time ET',
  'Duration Minutes','Checkpoints','Debriefs','Proof','Result','Source Build',
  'Write Scope','Notion Status','Notion Page ID','Notion URL','Write Status'
];

function getMoneyMissionSpreadsheet() {
  var targetId = String(PropertiesService.getScriptProperties().getProperty(TARGET_SPREADSHEET_PROPERTY) || '').trim();
  if (targetId) return SpreadsheetApp.openById(targetId);
  return SpreadsheetApp.getActiveSpreadsheet();
}

// ── MAIN HANDLERS ────────────────────────────────────────────
function doPost(e) {
  try {
    var raw = e.postData ? e.postData.contents : '{}';
    var data = JSON.parse(raw);
    var expectedToken = PropertiesService.getScriptProperties().getProperty('A1XX_WEBHOOK_TOKEN');
    if (expectedToken && data.token !== expectedToken) {
      logActivity('Unauthorized POST blocked — type: ' + (data.type || '?') + ' — token sent: ' + (data.token ? 'yes' : 'no'));
      return ContentService.createTextOutput(JSON.stringify({ ok:false, error:'Unauthorized' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (data.type === 'test') {
      logActivity('Test connection received');
      return ok('Test received — connection working.');
    }
    if (data.type === 'log_change') {
      handleLogChange(data);
      return ContentService.createTextOutput(JSON.stringify({ok:true}))
        .setMimeType(ContentService.MimeType.JSON);
    }
    if (data.type === 'cycle_archive_probe') {
      logActivity('Cycle archive button ping — Cycle ' + (data.cycleNum || '?') + ' — ' + (data.source || 'app'));
      return ContentService.createTextOutput(JSON.stringify({ status: 'ok', message: 'Cycle archive ping logged.' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    if (data.type === 'weekly_save') {
      var weeklyRow = saveWeekly(data);
      var notionWeekly = syncWeeklyReviewToNotion(weeklyRow, data);
      logActivity('Weekly save — Cycle ' + data.cycleNum + ' — Revenue: $' + data.revenue);
      return ContentService.createTextOutput(JSON.stringify({ status: 'ok', row: weeklyRow, notionWeekly: notionWeekly }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    if (data.type === 'cycle_archive') {
      var cycleRow = archiveCycle(data);
      var notionCycle = syncCycleArchiveToNotion(cycleRow, data);
      logActivity('CYCLE ARCHIVE — Cycle ' + data.cycleNum + ' archived permanently.');
      return ContentService.createTextOutput(JSON.stringify({ status: 'ok', row: cycleRow, notionCycle: notionCycle }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    if (data.type === 'backup_save') {
      var backupResult = saveBackup(data);
      logActivity('Backup saved — ' + (data.keyCount || '?') + ' keys — ' + (data.size || '?') + ' chars');
      return ContentService.createTextOutput(JSON.stringify({ status: 'ok', message: 'Backup saved.', backup: backupResult }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    if (data.type === 'backup_chunk_save') {
      saveBackupChunkV18(data);
      logActivity('Backup chunk saved — ' + ((Number(data.part) || 0) + 1) + '/' + (data.total || '?') + ' — ' + (data.backupMarkerId || 'no marker'));
      return ok('Backup chunk saved.');
    }
    if (data.type === 'daily_save') {
      var row = saveDailySnapshot(data);
      var notionDaily = syncDailyDpcToNotion(row, data);
      logActivity('Daily save — ' + data.date + ' (' + (data.mode || 'replace') + ') — Money: $' + (data.money || 0));
      return ContentService.createTextOutput(JSON.stringify({ status: 'ok', row: row, notionDaily: notionDaily }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    if (data.type === 'mission_chat_log') {
      var chatRow = saveMissionChatLog(data);
      logActivity('Mission Command chat log — ' + (data.date || '') + ' — ' + String(data.question || data.kind || 'prompt').slice(0, 80));
      return ContentService.createTextOutput(JSON.stringify({ status: 'ok', row: chatRow }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    if (data.type === 'mission_llm_chat') {
      var llmResult = getMissionCommandLlmAdapterV1(data);
      return missionLlmJsonV1(llmResult);
    }
    if (data.type === 'mission_chat_session_sync') {
      var sessionRow = saveMissionChatSession(data);
      logActivity('Mission Command session sync — ' + (data.project || 'No project') + ' — ' + String(data.title || data.sessionId || 'chat').slice(0, 80));
      return ContentService.createTextOutput(JSON.stringify({ status: 'ok', row: sessionRow }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    if (isMissionCommandEventTypeV18(data.type)) {
      var eventRow = saveMissionCommandEventV18(data);
      logActivity('Mission Command event — ' + data.type + ' — ' + String(eventRow.action || eventRow.summary || '').slice(0, 80));
      return ContentService.createTextOutput(JSON.stringify({ status: 'ok', row: eventRow }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    if (data.type === 'profile_index_upsert') {
      var profileRow = saveOsProfileIndexV20(data);
      logActivity('OS profile index upsert — ' + profileRow.profileId + ' — device ' + (profileRow.activeDeviceId || 'none'));
      return jsonResponseV20({ status: 'ok', row: profileRow });
    }
    if (data.type === 'device_registry_upsert') {
      var deviceRow = saveOsDeviceRegistryV20(data);
      logActivity('OS device registry upsert — ' + deviceRow.deviceId + ' — ' + deviceRow.trustedStatus);
      return jsonResponseV20({ status: 'ok', row: deviceRow });
    }
    if (data.type === 'setup_pointers_upsert') {
      var pointerResult = saveOsSetupPointersV20(data);
      logActivity('OS setup pointers upsert — saved ' + pointerResult.saved.length + ' — skipped ' + pointerResult.skipped.length);
      return jsonResponseV20({ status: 'ok', result: pointerResult });
    }
    if (data.type === 'drive_file_index_pointer_write_skeleton') {
      return getDriveFileIndexPointerWriteSkeletonV20(data);
    }
    if (data.type === 'drive_file_index_pointer_write_confirmed') {
      return writeDriveFileIndexPointerConfirmedV20(data);
    }
    if (data.type === 'prospect_save') {
      var rec = saveProspectSnapshot(data);
      logActivity('Prospect save — ' + (data.stageName || data.realName || '(unnamed)') + ' (' + (data.source || 'no source') + ')');
      return ContentService.createTextOutput(JSON.stringify({ status: 'ok', record: rec }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    if (data.type === 'prospect_delete') {
      var ok2 = deleteProspectRow(data.id);
      logActivity('Prospect delete — id=' + (data.id || '(none)') + ' — ' + (ok2 ? 'soft-deleted' : 'not found'));
      return ContentService.createTextOutput(JSON.stringify({ status: 'ok', deleted: ok2 }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    if (data.type === 'reset_test_data') {                  // ← NEW in 1.7
      var result = resetTestData(data);
      logActivity('Reset test data — daily: ' + result.dailyCleared + ' rows | prospects: ' + result.prospectsCleared + ' rows | reason: ' + (data.reason || '(no reason)'));
      return ContentService.createTextOutput(JSON.stringify({ status: 'ok', result: result }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ok('Unknown type — no action taken.');
  } catch (err) {
    logActivity('POST ERROR: ' + err.toString());
    return error(err.toString());
  }
}

// Stable provider boundary for Mission Command. Providers may change behind
// this adapter, but the client always receives missionLlmContractV1().
var MC_LLM_PROVIDER_REGISTRY_V1 = {
  openai: { keyProperty:'OPENAI_API_KEY', modelProperty:'OPENAI_LLM_MODEL', defaultModel:'gpt-5.1', mode:'responses', endpoint:'https://api.openai.com/v1/responses' },
  moonshot: { keyProperty:'MOONSHOT_API_KEY', modelProperty:'MOONSHOT_LLM_MODEL', defaultModel:'kimi-k2.6', mode:'chat_completions', endpoint:'https://api.moonshot.ai/v1/chat/completions' },
  nvidia: { keyProperty:'NVIDIA_API_KEY', modelProperty:'NVIDIA_LLM_MODEL', defaultModel:'z-ai/glm-5.1', mode:'chat_completions', endpoint:'https://integrate.api.nvidia.com/v1/chat/completions' }
};

function getMissionCommandProviderConfigV1(data) {
  data = data || {};
  var props = PropertiesService.getScriptProperties();
  var requested = String(data.provider || props.getProperty('MISSION_LLM_PROVIDER') || 'openai').trim().toLowerCase();
  var provider = MC_LLM_PROVIDER_REGISTRY_V1[requested] ? requested : 'openai';
  var entry = MC_LLM_PROVIDER_REGISTRY_V1[provider];
  var model = String(props.getProperty(entry.modelProperty) || entry.defaultModel).trim();
  var endpointProperty = provider.toUpperCase() + '_LLM_BASE_URL';
  return { provider:provider, keyProperty:entry.keyProperty, model:model, mode:entry.mode,
    endpoint:String(props.getProperty(endpointProperty) || entry.endpoint).trim(),
    apiKey:String(props.getProperty(entry.keyProperty) || '').trim() };
}

function getMissionCommandLlmAdapterV1(data) {
  var config = getMissionCommandProviderConfigV1(data);
  if (config.mode === 'responses') return getMissionCommandOpenAiAdvisorV1(data, config);
  return getMissionCommandChatCompletionsAdvisorV1(data, config);
}

// Read-only OpenAI advisor path for the Mission Command UI. The existing
// client-side adapter remains default-off; when explicitly enabled it can
// request analysis of the sanitized context packet, but no tools or writes
// are ever passed to the model.
function getMissionCommandOpenAiAdvisorV1(data, config) {
  var started = Date.now();
  data = data || {};
  config = config || getMissionCommandProviderConfigV1({ provider:'openai' });
  var endpoint = config.endpoint;
  // Use a public Responses API model by default. An explicitly configured
  // OPENAI_LLM_MODEL property still wins, so existing private pilots remain
  // untouched until deliberately changed.
  var timeoutSeconds = 30;
  var question = sanitizeMissionCommandLlmTextV1(data.question || '', 700);
  var contextPacket = sanitizeMissionCommandLlmContextV1(data.contextPacket || {});
  var apiKey = config.apiKey;
  var model = config.model;

  if (!question) return missionLlmContractV1({ ok:false, status:'blocked', provider:config.provider, model:model, fallbackReason:'missing_question', latencyMs:Date.now()-started });
  if (!apiKey) return missionLlmContractV1({ ok:false, status:'blocked', provider:config.provider, model:model, fallbackReason:'missing_'+config.provider+'_api_key', latencyMs:Date.now()-started });

  var instructions = [
    'You are Mission Command inside Money Mission OS for A1XX.',
    'You are a real Executive Assistant: perceptive, concise, warm, and candid. Respond naturally to the user\'s actual words, not to a menu of canned prompts.',
    'Use the recent conversation and safe context to maintain continuity. Acknowledge what you understand, state the most useful answer first, then suggest one practical next move when appropriate.',
    'Show self-awareness: distinguish what you know from what is missing, say when you are making an inference, and ask one focused clarifying question only when it materially changes the recommendation.',
    'Advisor-only mode. Give one useful, specific answer grounded only in the supplied context.',
    'Never claim an action was completed, saved, synced, logged, paid, booked, shipped, approved, or sent.',
    'Never expose secrets, IDs, provider details, endpoints, storage names, or implementation details.',
    'Do not call tools, create tool calls, write data, dispatch work, send messages, or change app state.',
    'If context is insufficient, say what is missing and recommend the safest next step. Do not repeat the same generic project-selection advice when the user has supplied a different question.'
  ].join(' ');
  var payload = {
    model: model,
    instructions: instructions,
    input: 'User question: ' + question + '\nSafe context packet: ' + JSON.stringify(contextPacket),
    tools: [],
    max_output_tokens: 800,
    store: false
  };
  var response;
  try {
    response = UrlFetchApp.fetch(endpoint, {
      method:'post', contentType:'application/json',
      headers:{ Authorization:'Bearer '+apiKey, Accept:'application/json' },
      payload:JSON.stringify(payload), muteHttpExceptions:true,
      timeoutSeconds:timeoutSeconds
    });
  } catch (err) {
    return missionLlmContractV1({ ok:false, status:'error', provider:config.provider, model:model, fallbackReason:'provider_fetch_error', latencyMs:Date.now()-started });
  }
  var code = Number(response.getResponseCode() || 0);
  var body = String(response.getContentText() || '');
  if (code < 200 || code >= 300) return missionLlmContractV1({ ok:false, status:'error', provider:config.provider, model:model, httpStatus:code, fallbackReason:getMissionCommandLlmHttpReasonV1(code, body), latencyMs:Date.now()-started });
  var parsed;
  try { parsed = JSON.parse(body || '{}'); } catch (err2) { parsed = null; }
  var answer = parsed && typeof parsed.output_text === 'string' ? parsed.output_text : '';
  if (!answer && parsed && Array.isArray(parsed.output)) {
    parsed.output.forEach(function(item){
      if (!item || !Array.isArray(item.content)) return;
      item.content.forEach(function(part){ if (part && typeof part.text === 'string') answer += (answer?'\n':'') + part.text; });
    });
  }
  if (missionCommandLlmTextIsUnsafeV1(answer)) return missionLlmContractV1({ ok:false, status:'blocked', provider:config.provider, model:model, fallbackReason:'unsafe_answer_blocked', latencyMs:Date.now()-started });
  answer = sanitizeMissionCommandLlmTextV1(answer, 3200);
  if (!answer) return missionLlmContractV1({ ok:false, status:'empty', provider:config.provider, model:model, fallbackReason:'provider_empty_answer', latencyMs:Date.now()-started });
  return missionLlmContractV1({ ok:true, status:'ready', provider:config.provider, model:model, mode:'advisor_only', answerText:answer, latencyMs:Date.now()-started });
}

function getMissionCommandChatCompletionsAdvisorV1(data, config) {
  var started = Date.now(); data = data || {}; config = config || getMissionCommandProviderConfigV1(data);
  var question = sanitizeMissionCommandLlmTextV1(data.question || '', 700);
  var contextPacket = sanitizeMissionCommandLlmContextV1(data.contextPacket || {});
  if (!question) return missionLlmContractV1({ok:false,status:'blocked',provider:config.provider,model:config.model,fallbackReason:'missing_question',latencyMs:Date.now()-started});
  if (!config.apiKey) return missionLlmContractV1({ok:false,status:'blocked',provider:config.provider,model:config.model,fallbackReason:'missing_'+config.provider+'_api_key',latencyMs:Date.now()-started});
  var systemPrompt = 'You are Mission Command inside Money Mission OS for A1XX. Be perceptive, concise, warm, candid, self-aware, and grounded in the supplied safe context. Answer the user\'s actual words, never claim writes or external actions, never expose secrets or implementation details, and ask one focused question only when necessary. Advisor-only: no tools, writes, or dispatch.';
  var payload = {model:config.model,messages:[{role:'system',content:systemPrompt},{role:'user',content:'User question: '+question+'\nSafe context packet: '+JSON.stringify(contextPacket)}],temperature:0.35,top_p:0.9,max_tokens:800,stream:false};
  var response;
  try { response=UrlFetchApp.fetch(config.endpoint,{method:'post',contentType:'application/json',headers:{Authorization:'Bearer '+config.apiKey,Accept:'application/json'},payload:JSON.stringify(payload),muteHttpExceptions:true,timeoutSeconds:30}); }
  catch(err) { return missionLlmContractV1({ok:false,status:'error',provider:config.provider,model:config.model,fallbackReason:'provider_fetch_error',latencyMs:Date.now()-started}); }
  var code=Number(response.getResponseCode()||0), body=String(response.getContentText()||'');
  if(code<200||code>=300)return missionLlmContractV1({ok:false,status:'error',provider:config.provider,model:config.model,httpStatus:code,fallbackReason:getMissionCommandLlmHttpReasonV1(code,body),latencyMs:Date.now()-started});
  var parsed; try{parsed=JSON.parse(body||'{}');}catch(err2){parsed=null;}
  var answer=parsed&&parsed.choices&&parsed.choices[0]&&parsed.choices[0].message?parsed.choices[0].message.content:'';
  if(missionCommandLlmTextIsUnsafeV1(answer))return missionLlmContractV1({ok:false,status:'blocked',provider:config.provider,model:config.model,fallbackReason:'unsafe_answer_blocked',latencyMs:Date.now()-started});
  answer=sanitizeMissionCommandLlmTextV1(answer,3200);
  if(!answer)return missionLlmContractV1({ok:false,status:'empty',provider:config.provider,model:config.model,fallbackReason:'provider_empty_answer',latencyMs:Date.now()-started});
  return missionLlmContractV1({ok:true,status:'ready',provider:config.provider,model:config.model,mode:'advisor_only',answerText:answer,latencyMs:Date.now()-started});
}

function doGet(e) {
  try {
    if (e.parameter.action === 'content')             return getNotionContent(e);
    if (e.parameter.action === 'content_pipeline')    return getContentPipeline(e);
    if (e.parameter.action === 'production_pipeline') return getProductionPipeline(e);
    if (e.parameter.action === 'resources')           return getResources(e);
    if (e.parameter.action === 'crm_leads')           return getCRMLeads(e);
    if (e.parameter.action === 'calendar')            return getCalendarEvents(e);
    if (e.parameter.action === 'live_events')         return getLiveEvents(e);
    if (e.parameter.action === 'rolodex_search')      return searchRolodex(e);
    if (e.parameter.action === 'skool_community')     return getSkoolCommunity(e);
    if (e.parameter.action === 'get_backup')          return getBackup(e);
    if (e.parameter.action === 'backup_status')       return getBackupStatusV18(e);
    if (e.parameter.action === 'backup_get_probe')    return getBackupWriteProbeV18(e);
    if (e.parameter.action === 'read_skill_file')     return readSkillFileV20(e);
    if (e.parameter.action === 'list_skill_files')    return listSkillFilesV20(e);
    if (e.parameter.action === 'read_vault_file')     return readVaultFileV20(e);
    if (e.parameter.action === 'profile_index')        return getOsProfileIndexV20(e);
    if (e.parameter.action === 'device_registry')      return getOsDeviceRegistryV20(e);
    if (e.parameter.action === 'setup_pointers')       return getOsSetupPointersV20(e);
    if (e.parameter.action === 'os_registry_summary')  return getOsRegistrySummaryV20(e);
    if (e.parameter.action === 'get_os_registry_summary_v1') return getOsRegistrySummaryV20(e);
    if (e.parameter.action === 'os_registry_records')  return getOsRegistryRecordsV20(e);
    if (e.parameter.action === 'get_os_registry_records_v1') return getOsRegistryRecordsV20(e);
    if (e.parameter.action === 'phase25_notion_read_relay_stub') return getPhase25NotionReadRelayStubV25(e.parameter);
    if (e.parameter.action === 'phase26_notion_live_read_probe') return getPhase26NotionLiveReadProbeV25(e.parameter);
    if (e.parameter.action === 'phase27_normalized_packet_preview') return getPhase27NormalizedPacketPreviewV25(e.parameter);
    if (e.parameter.action === 'phase28_packet_readback_qa') return getPhase28PacketReadbackQAV25(e.parameter);
    if (e.parameter.action === 'mission_os_context') return getPhase101MissionOsContextV25(e.parameter);
    if (e.parameter.action === 'mission_command_voice_probe') return getMissionCommandVoiceProbeV25(e.parameter);
    if (e.parameter.action === 'time_ledger_save_reviewed_session') return writeTimeLedgerReviewedSessionV25(e.parameter);
    if (e.parameter.action === 'drive_file_index_pointer_write_skeleton') return getDriveFileIndexPointerWriteSkeletonV20(e.parameter);
    if (e.parameter.action === 'master_config_read_skeleton') return getMasterConfigReadSkeletonV20(e.parameter);
    if (e.parameter.action === 'master_config_read_preflight') return getMasterConfigReadPreflightV20(e.parameter);
    if (e.parameter.action === 'master_config_page_review') return getMasterConfigPageReviewV20(e.parameter);
    if (e.parameter.action === 'master_config_locator_review') return getMasterConfigLocatorReviewV20(e.parameter);
    if (e.parameter.action === 'master_config_endpoint_contract_review') return getMasterConfigEndpointContractReviewV20(e.parameter);
    if (e.parameter.action === 'master_config_safe_read_preview') return getMasterConfigSafeReadPreviewV20(e.parameter);
    if (e.parameter.action === 'master_config_real_read_gate_review') return getMasterConfigRealReadGateReviewV20(e.parameter);
    if (e.parameter.action === 'master_config_first_real_read') return getMasterConfigFirstRealReadV20(e.parameter);
    if (e.parameter.action === 'master_config_safe_package_normalize') return getMasterConfigSafePackageNormalizeV20(e.parameter);
    if (e.parameter.action === 'master_config_safe_pointer_gap_review') return getMasterConfigSafePointerGapReviewV20(e.parameter);
    if (e.parameter.action === 'master_config_safe_pointer_gap_fill_plan') return getMasterConfigSafePointerGapFillPlanV20(e.parameter);
    if (e.parameter.action === 'master_config_safe_pointer_gap_fill_preview') return getMasterConfigSafePointerGapFillPreviewV20(e.parameter);
    if (e.parameter.action === 'master_config_safe_pointer_gap_b3_confirmation') return getMasterConfigSafePointerGapB3ConfirmationV20(e.parameter);
    if (e.parameter.action === 'master_config_safe_pointer_gap_write_endpoint_review') return getMasterConfigSafePointerGapWriteEndpointReviewV20(e.parameter);
    if (e.parameter.action === 'master_config_safe_pointer_gap_exact_two_write_preflight') return getMasterConfigSafePointerGapExactTwoWritePreflightV20(e.parameter);
    if (e.parameter.action === 'master_config_safe_pointer_gap_exact_two_write') return writeMasterConfigSafePointerGapExactTwoV20(e.parameter);
    if (e.parameter.action === 'master_config_post_write_readback_closeout') return getMasterConfigPostWriteReadbackCloseoutV20(e.parameter);
    if (e.parameter.action === 'second_device_bootstrap_preview_plan') return getSecondDeviceBootstrapPreviewPlanV20(e.parameter);
    if (e.parameter.action === 'second_device_bootstrap_dry_run_preview') return getSecondDeviceBootstrapDryRunPreviewV20(e.parameter);
    if (e.parameter.action === 'second_device_restore_boundary_review') return getSecondDeviceRestoreBoundaryReviewV20(e.parameter);
    if (e.parameter.action === 'second_device_restore_source_preview') return getSecondDeviceRestoreSourcePreviewV20(e.parameter);
    if (e.parameter.action === 'second_device_restore_source_selection_review') return getSecondDeviceRestoreSourceSelectionReviewV20(e.parameter);
    if (e.parameter.action === 'second_device_restore_integrity_preview') return getSecondDeviceRestoreIntegrityPreviewV20(e.parameter);
    if (e.parameter.action === 'second_device_restore_execution_boundary_review') return getSecondDeviceRestoreExecutionBoundaryReviewV20(e.parameter);
    if (e.parameter.action === 'second_device_restore_execution_endpoint_review') return getSecondDeviceRestoreExecutionEndpointReviewV20(e.parameter);
    if (e.parameter.action === 'second_device_restore_execution_preflight_review') return getSecondDeviceRestoreExecutionPreflightReviewV20(e.parameter);
    if (e.parameter.action === 'second_device_restore_execution_b3_gate_review') return getSecondDeviceRestoreExecutionB3GateReviewV20(e.parameter);
    if (e.parameter.action === 'second_device_restore_execution_actual_run_approval') return getSecondDeviceRestoreExecutionActualRunApprovalV20(e.parameter);
    if (e.parameter.action === 'second_device_restore_execution_run_endpoint_activation_review') return getSecondDeviceRestoreExecutionRunEndpointActivationReviewV20(e.parameter);
    if (e.parameter.action === 'second_device_restore_execution_final_pre_execution_preflight') return getSecondDeviceRestoreExecutionFinalPreExecutionPreflightV20(e.parameter);
    if (e.parameter.action === 'second_device_restore_execution_run') return runSecondDeviceRestoreExecutionRunV20(e.parameter);
    if (e.parameter.action === 'drive_file_index_pointer_readback') return getDriveFileIndexPointerReadbackV20(e.parameter);
    if (e.parameter.action === 'daily_log')           return getDailyLog(e);
    if (e.parameter.action === 'prospect_log')        return getProspectLog(e);
    if (e.parameter.action === 'mission_events')      return getMissionCommandEventsV18(e);
    if (e.parameter.action === 'health')              return getHealthCheck(e);
    if (e.parameter.action === 'instagram')           return getInstagramData(e);
    if (e.parameter.action === 'search_resources')    return searchResources(e);
    if (e.parameter.action === 'live_read_packet_v1') return getLiveReadPacketV1(e);
    return ok('A1XX Money Mission Tracker Backend is live.');
  } catch (err) {
    logActivity('GET ERROR: ' + err.toString());
    return error(err.toString());
  }
}

// Read-only normalized packet for the existing Directory V3 and Projects surfaces.
// This endpoint intentionally performs no writes, dispatch, or source mutation.
function getLiveReadPacketV1(e) {
  var started = new Date().toISOString();
  var packet = { packet:'live_read_packet_v1', status:'partial', generatedAt:started, freshness:{state:'fresh',maxAgeMs:300000},
    sources:{notion:{status:'unknown',recordCount:0,fetchedAt:''},sheets:{status:'unknown',fetchedAt:''},drive:{status:'deferred',fetchedAt:''}},
    projects:[], relationships:[], files:[], warnings:[], errors:[] };
  var secret = PropertiesService.getScriptProperties().getProperty('NOTION_SECRET');
  if (secret) {
    try {
      var projectsResult = notionDataSourceQuery(NOTION_PROJECTS_DB, {page_size:50}, 'live_projects_v1');
      if (projectsResult.code >= 400) throw new Error('Projects ' + projectsResult.code);
      var projectsData = JSON.parse(projectsResult.text || '{}');
      var projectRows = projectsData.results || [];
      if (!projectRows.length) {
        var discovery = discoverProjectsDataSourcesV1();
        packet.sources.notion.projectsDiscovery = { containerCode: discovery.code, dataSources: discovery.sources };
        var discovered = discovery.sources;
        for (var di = 0; di < discovered.length && !projectRows.length; di++) {
          var discoveredResult = notionDataSourceQuery(discovered[di].id, {page_size:50}, 'live_projects_v1_' + discovered[di].id);
          if (discoveredResult.code >= 400) continue;
          var discoveredData = JSON.parse(discoveredResult.text || '{}');
          projectRows = discoveredData.results || [];
          if (projectRows.length) {
            packet.sources.notion.projectsDataSource = discovered[di];
            packet.warnings.push('projects_source_discovered');
          }
        }
      }
      packet.projects = projectRows.map(normalizeLiveProjectV1).filter(function(row){ return row.id && row.title; });
      packet.sources.notion.status = 'live';
      packet.sources.notion.fetchedAt = new Date().toISOString();
      packet.sources.notion.recordCount += packet.projects.length;
    } catch (err) {
      packet.warnings.push('projects_unavailable');
      packet.errors.push('projects_read_failed');
      packet.sources.notion.projectsError = String(err && err.message || err || 'unknown').slice(0, 180);
    }
    try {
      var leadsResult = notionQuery(NOTION_CRM_DB, {page_size:50}, 'live_relationships_v1');
      if (leadsResult.code >= 400) throw new Error('CRM ' + leadsResult.code);
      var leadsData = JSON.parse(leadsResult.text || '{}');
      packet.relationships = (leadsData.results || []).map(normalizeLiveRelationshipV1).filter(function(row){ return row.id && row.label; });
      packet.sources.notion.status = packet.sources.notion.status === 'live' ? 'live' : 'partial';
      packet.sources.notion.fetchedAt = packet.sources.notion.fetchedAt || new Date().toISOString();
      packet.sources.notion.recordCount += packet.relationships.length;
    } catch (err2) { packet.warnings.push('relationships_unavailable'); packet.errors.push('relationships_read_failed'); }
  } else { packet.warnings.push('notion_secret_missing'); packet.errors.push('notion_auth_unavailable'); }
  try {
    var ss = getMoneyMissionSpreadsheet();
    packet.sources.sheets.status = ss ? 'live' : 'unavailable';
    packet.sources.sheets.workbookId = ss ? ss.getId() : '';
    packet.sources.sheets.fetchedAt = new Date().toISOString();
  } catch (sheetErr) { packet.warnings.push('sheets_unavailable'); packet.errors.push('sheets_read_failed'); }
  // Drive remains metadata-only in this first pass; no Drive search or mutation is performed.
  packet.warnings.push('drive_metadata_deferred');
  packet.status = packet.projects.length || packet.relationships.length ? (packet.errors.length ? 'partial' : 'live') : 'empty';
  return jsonResponseV20(packet);
}

function normalizeLiveProjectV1(page) {
  var props = page.properties || {};
  var title = readNotionTitle(props.Name || props['Project Name'] || props['Project name'] || props.Title);
  return { id:page.id, objectType:'project', title:title, projectType:readNotionSelect(props['Project Type'] || props.Type), status:readNotionStatus(props.Status),
    priority:readNotionSelect(props.Priority), summary:readNotionText(props.Summary || props.Description),
    nextAction:readNotionText(props['Current Next Move'] || props['Next Action'] || props['Next Move']),
    needsA1XX:readNotionCheckbox(props['Needs A1XX']), closestToMoney:readNotionCheckbox(props['Closest To Money']),
    url:page.url, source:'Notion Projects', updatedAt:page.last_edited_time || page.created_time || '' };
}

function discoverProjectsDataSourcesV1() {
  var result = notionRequestV25('get', 'https://api.notion.com/v1/databases/' + NOTION_PROJECTS_CONTAINER, null, '2025-09-03');
  if (result.code >= 400) return { code:result.code, sources:[] };
  var data = JSON.parse(result.text || '{}');
  return { code:result.code, sources:(data.data_sources || []).map(function(source) {
    return { id:source.id, name:source.name || '' };
  }).filter(function(source){ return source.id; }) };
}

// Current Notion data-source query path. Kept separate from the legacy CRM
// database query helper so the proven relationships read remains unchanged.
function notionDataSourceQuery(dataSourceId, payload, cacheKey) {
  var cache = CacheService.getScriptCache();
  if (cacheKey) {
    var hit = cache.get(cacheKey);
    if (hit) { logActivity('Cache hit — ' + cacheKey); return { text: hit, code: 200 }; }
  }
  var secret = PropertiesService.getScriptProperties().getProperty('NOTION_SECRET');
  var opts = { method: 'post',
    headers: { Authorization: 'Bearer ' + secret, 'Notion-Version': '2025-09-03', 'Content-Type': 'application/json' },
    payload: JSON.stringify(payload), muteHttpExceptions: true };
  var res = UrlFetchApp.fetch('https://api.notion.com/v1/data_sources/' + dataSourceId + '/query', opts);
  var code = res.getResponseCode();
  if (code >= 500) {
    Utilities.sleep(2000);
    res = UrlFetchApp.fetch('https://api.notion.com/v1/data_sources/' + dataSourceId + '/query', opts);
    code = res.getResponseCode();
  }
  var text = res.getContentText();
  if (cacheKey && code < 400) { try { if (text.length < 90000) cache.put(cacheKey, text, 600); } catch (e) {} }
  return { text: text, code: code };
}

function notionRequestV25(method, url, payload, notionVersion) {
  var secret = PropertiesService.getScriptProperties().getProperty('NOTION_SECRET');
  var opts = { method: method,
    headers: { Authorization: 'Bearer ' + secret, 'Notion-Version': notionVersion || '2025-09-03', 'Content-Type': 'application/json' },
    muteHttpExceptions: true };
  if (payload) opts.payload = JSON.stringify(payload);
  var res = UrlFetchApp.fetch(url, opts);
  return { text:res.getContentText(), code:res.getResponseCode() };
}

function normalizeLiveRelationshipV1(page) {
  var props = page.properties || {};
  var label = readNotionTitle(props.Name || props['Real Name'] || props.Title);
  return { id:page.id, objectType:'relationship', label:label, type:'Lead', status:readNotionSelect(props['Lead Status'] || props.Status),
    description:readNotionText(props['Recent Activity'] || props.Notes || props.Description), source:'Notion CRM',
    url:page.url, updatedAt:page.last_edited_time || page.created_time || '',
    fields:{Email:readNotionEmail(props.Email),Instagram:readNotionText(props.Instagram),Stage:readNotionSelect(props['Pipeline Stage'])} };
}

function getMissionCommandLlmChatV1(data) {
  var started = Date.now();
  data = data || {};
  var question = sanitizeMissionCommandLlmTextV1(data.question || '', 700);
  var contextPacket = sanitizeMissionCommandLlmContextV1(data.contextPacket || {});
  var props = PropertiesService.getScriptProperties();
  var apiKey = String(props.getProperty('NVIDIA_API_KEY') || '').trim();
  var model = String(props.getProperty('NVIDIA_LLM_MODEL') || 'z-ai/glm-5.1').trim();
  var baseUrl = String(props.getProperty('NVIDIA_LLM_BASE_URL') || 'https://integrate.api.nvidia.com/v1/chat/completions').trim();

  if (!question) {
    return missionLlmContractV1({
      ok: false,
      status: 'blocked',
      model: model,
      fallbackReason: 'missing_question',
      latencyMs: Date.now() - started
    });
  }
  if (!apiKey) {
    return missionLlmContractV1({
      ok: false,
      status: 'blocked',
      model: model,
      fallbackReason: 'missing_nvidia_api_key',
      latencyMs: Date.now() - started
    });
  }

  var systemPrompt = [
    'You are Mission Command inside Money Mission OS for A1XX.',
    'Advisor Only mode: write the main conversational answer only.',
    'Be direct, useful, A1XX-specific, and action-oriented.',
    'Use only the context packet provided. Never claim live data unless it is in the packet.',
    'Never say an action was completed, saved, synced, logged, paid, booked, shipped, awarded, or approved unless the packet says so.',
    'Never expose implementation details, raw JSON, secrets, debug traces, endpoint names, internal IDs, tokens, keys, storage names, or provider details.',
    'Do not create buttons, HTML, markdown tables, code, tool calls, automations, XP awards, mission completion, or write actions.',
    'If the data is missing, say what is missing and give the safest next move.'
  ].join(' ');

  var payload = {
    model: model,
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: [
          'User question: ' + question,
          'Safe context packet: ' + JSON.stringify(contextPacket)
        ].join('\n')
      }
    ],
    temperature: 0.35,
    top_p: 0.9,
    max_tokens: 420,
    stream: false
  };

  var response;
  try {
    response = UrlFetchApp.fetch(baseUrl, {
      method: 'post',
      contentType: 'application/json',
      headers: {
        Authorization: 'Bearer ' + apiKey,
        Accept: 'application/json'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
  } catch (err) {
    return missionLlmContractV1({
      ok: false,
      status: 'error',
      model: model,
      fallbackReason: 'provider_fetch_error',
      latencyMs: Date.now() - started
    });
  }

  var code = response.getResponseCode();
  var body = response.getContentText() || '';
  if (code < 200 || code >= 300) {
    return missionLlmContractV1({
      ok: false,
      status: 'error',
      model: model,
      httpStatus: code,
      fallbackReason: getMissionCommandLlmHttpReasonV1(code, body),
      latencyMs: Date.now() - started
    });
  }

  var parsed;
  try {
    parsed = JSON.parse(body);
  } catch (parseErr) {
    return missionLlmContractV1({
      ok: false,
      status: 'error',
      model: model,
      fallbackReason: 'provider_bad_json',
      latencyMs: Date.now() - started
    });
  }

  var answer = parsed && parsed.choices && parsed.choices[0] && parsed.choices[0].message
    ? parsed.choices[0].message.content
    : '';
  if (missionCommandLlmTextIsUnsafeV1(answer)) {
    return missionLlmContractV1({
      ok: false,
      status: 'blocked',
      model: model,
      fallbackReason: 'unsafe_answer_blocked',
      latencyMs: Date.now() - started
    });
  }
  answer = sanitizeMissionCommandLlmTextV1(answer, 1200);
  if (!answer) {
    return missionLlmContractV1({
      ok: false,
      status: 'empty',
      model: model,
      fallbackReason: 'provider_empty_answer',
      latencyMs: Date.now() - started
    });
  }

  return missionLlmContractV1({
    ok: true,
    status: 'ready',
    model: model,
    mode: 'advisor_only',
    answerText: answer,
    latencyMs: Date.now() - started
  });
}

function sanitizeMissionCommandLlmTextV1(value, maxLen) {
  var text = String(value || '')
    .replace(/<\s*script\b[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/\b(api\s*key|secret|token|bearer|authorization|webhook|localStorage|sessionStorage|raw json|raw id|Notion ID|endpoint)\b\s*[:=-]?\s*/gi, ' ')
    .replace(/\s+\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  maxLen = Number(maxLen) || 900;
  if (text.length > maxLen) text = text.slice(0, maxLen).trim();
  return text;
}

function sanitizeMissionCommandLlmContextV1(value) {
  var json = '';
  try {
    json = JSON.stringify(value || {});
  } catch (err) {
    json = '{}';
  }
  json = json
    .replace(/https?:\/\/\S+/g, '[link removed]')
    .replace(/\b(api[_ -]?key|secret|token|bearer|authorization|webhook|password|oauth|private[_ -]?key)\b/gi, '[protected]')
    .slice(0, 5000);
  try {
    return JSON.parse(json);
  } catch (parseErr) {
    return { status: 'context_sanitized', summary: sanitizeMissionCommandLlmTextV1(json, 1000) };
  }
}

function missionCommandLlmTextIsUnsafeV1(text) {
  return /\b(api[_ -]?key|secret|bearer|authorization|webhook|localStorage|sessionStorage|raw json|raw id|Notion ID|endpoint|integrate\.api|UrlFetchApp|PropertiesService|ScriptProperties)\b/i.test(String(text || ''));
}

function getMissionCommandLlmHttpReasonV1(code, bodyText) {
  var body = String(bodyText || '').slice(0, 1200).toLowerCase();
  if (code === 401 || code === 403 || /invalid.*key|unauthorized|forbidden|api key/.test(body)) return 'provider_key_rejected';
  if (code === 404 || /model.*not.*found|not found/.test(body)) return 'provider_model_not_found';
  if (code === 408 || code === 504 || /timeout|timed out/.test(body)) return 'provider_timeout';
  if (code === 429 || /rate limit|quota|too many/.test(body)) return 'provider_rate_limited';
  return 'provider_http_' + code;
}

function missionLlmContractV1(payload) {
  payload = payload || {};
  return {
    ok: payload.ok === true,
    status: payload.status || (payload.ok === true ? 'ready' : 'blocked'),
    provider: payload.provider || 'openai',
    relay: 'apps_script',
    action: 'mission_llm_chat',
    model: payload.model || 'gpt-5.1',
    mode: payload.mode || 'advisor_only',
    answerText: payload.answerText || '',
    fallbackReason: payload.fallbackReason || '',
    httpStatus: payload.httpStatus || 0,
    latencyMs: payload.latencyMs || 0,
    appWrite: false,
    tokenExport: false,
    secretExport: false,
    missionCompletion: false,
    xpAward: false,
    automation: false
  };
}

function missionLlmJsonV1(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload || {}))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── MISSION COMMAND PHASE 3.1 OPENAI SHADOW FOUNDATION ─────
// Foundation-only helpers. No credentials, provider fetch, Sheet writes,
// trigger installation, visible delivery, dispatch, or external writes.
var MC_OPENAI_SHADOW_FOUNDATION_BUILD_V31 = 'mmos-20260711-phase3-1-openai-shadow-foundation';

function getMissionCommandOpenAiShadowFlagsV31(overrides) {
  var flags = {
    openaiAdapterEnabled: false,
    openaiProbeEnabled: false,
    runtimeShadowEnabled: false,
    shadowTriggerEnabled: false,
    visibleDeliveryEnabled: false,
    externalWritesEnabled: false,
    dispatchEnabled: false
  };
  overrides = overrides || {};
  Object.keys(flags).forEach(function(key) {
    flags[key] = overrides[key] === true;
  });
  return flags;
}

function getMissionCommandOpenAiShadowBlockedContractV31(reason, detail) {
  return {
    ok: false,
    status: 'blocked',
    build: MC_OPENAI_SHADOW_FOUNDATION_BUILD_V31,
    provider: 'openai',
    apiSurface: 'responses_api',
    fallbackReason: reason || 'feature_disabled',
    safeDetail: detail || '',
    request: null,
    receipt: makeMissionCommandOpenAiShadowReceiptV31(null, {
      status: 'blocked',
      fallbackReason: reason || 'feature_disabled'
    }),
    visibleRuntimeMutation: false,
    visibleInboxMutation: false,
    sheetWrite: false,
    triggerInstall: false,
    providerCall: false,
    providerSwitch: false,
    externalWrite: false,
    dispatch: false
  };
}

function normalizeMissionCommandOpenAiRoleV31(role) {
  var key = String(role || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  if (key === 'chief_of_staff' || key === 'chief') return 'chief_of_staff';
  if (key === 'executive_assistant' || key === 'assistant' || key === 'ea') return 'executive_assistant';
  return '';
}

function getMissionCommandOpenAiRolePromptV31(role) {
  var normalized = normalizeMissionCommandOpenAiRoleV31(role);
  var shared = [
    'You are Mission Command inside Money Mission OS for A1XX.',
    'Use only the safe context packet provided.',
    'Distinguish sourced facts from inference.',
    'Never claim a write, send, dispatch, approval, completion, external action, or runtime change.',
    'Never expose credentials, raw private payloads, implementation details, internal IDs, endpoint names, storage names, provider response bodies, or debug traces.',
    'Return only a hidden candidate that matches the required schema.'
  ].join(' ');
  if (normalized === 'executive_assistant') {
    return shared + ' Role: Executive Assistant. Focus on what needs A1XX now, why it matters, the smallest useful next move, and whether one direct question is required.';
  }
  if (normalized === 'chief_of_staff') {
    return shared + ' Role: Chief of Staff. Focus on what changed across workstreams, what is blocked, who owns the next move, and what gate or dependency comes next.';
  }
  return '';
}

function getMissionCommandOpenAiHiddenCandidateSchemaV31() {
  return {
    type: 'object',
    additionalProperties: false,
    required: [
      'role',
      'message_type',
      'priority',
      'title',
      'body',
      'why_it_matters',
      'next_move',
      'question',
      'source_labels',
      'grounding_state',
      'confidence',
      'should_deliver',
      'blocked_reason'
    ],
    properties: {
      role: { type: 'string', enum: ['executive_assistant', 'chief_of_staff'] },
      message_type: { type: 'string' },
      priority: { type: 'string', enum: ['low', 'normal', 'high', 'urgent'] },
      title: { type: 'string' },
      body: { type: 'string' },
      why_it_matters: { type: 'string' },
      next_move: { type: 'string' },
      question: { type: 'string' },
      source_labels: { type: 'array', items: { type: 'string' } },
      grounding_state: { type: 'string', enum: ['sourced', 'inferred', 'insufficient_context'] },
      confidence: { type: 'number' },
      should_deliver: { type: 'boolean' },
      blocked_reason: { type: 'string' }
    }
  };
}

function sanitizeMissionCommandOpenAiShadowTextV31(value, maxLen) {
  var text = String(value || '')
    .replace(/<\s*script\b[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/\b(api\s*key|secret|token|bearer|authorization|webhook|password|oauth|private[_ -]?key|raw json|raw id|endpoint)\b\s*[:=-]?\s*/gi, ' ')
    .replace(/\s+\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  maxLen = Number(maxLen) || 900;
  if (text.length > maxLen) text = text.slice(0, maxLen).trim();
  return text;
}

function sanitizeMissionCommandOpenAiShadowContextV31(value) {
  var json = '';
  try {
    json = JSON.stringify(value || {});
  } catch (err) {
    json = '{}';
  }
  json = json
    .replace(/https?:\/\/\S+/g, '[link removed]')
    .replace(/\b(api[_ -]?key|secret|token|bearer|authorization|webhook|password|oauth|private[_ -]?key)\b/gi, '[protected]')
    .slice(0, 8000);
  try {
    return JSON.parse(json);
  } catch (parseErr) {
    return { status: 'context_sanitized', summary: sanitizeMissionCommandOpenAiShadowTextV31(json, 1000) };
  }
}

function makeMissionCommandOpenAiSafetyIdentifierV31(seed) {
  var safeSeed = sanitizeMissionCommandOpenAiShadowTextV31(seed || 'a1xx-primary', 64) || 'a1xx-primary';
  var hash = 0;
  for (var i = 0; i < safeSeed.length; i++) {
    hash = ((hash << 5) - hash) + safeSeed.charCodeAt(i);
    hash = hash & hash;
  }
  return 'mc_' + Math.abs(hash).toString(36);
}

function getMissionCommandOpenAiRegistryModelV31(registry) {
  registry = registry || {};
  var model = String(registry.model || registry.model_key || registry.modelKey || '').trim();
  if (!model || /^(auto|default|current|registry_configured_current_model)$/i.test(model)) return '';
  return model;
}

function makeMissionCommandOpenAiShadowRequestDraftV31(input) {
  input = input || {};
  var role = normalizeMissionCommandOpenAiRoleV31(input.role);
  var model = getMissionCommandOpenAiRegistryModelV31(input.registry || {});
  var rolePrompt = getMissionCommandOpenAiRolePromptV31(role);
  var userPrompt = sanitizeMissionCommandOpenAiShadowTextV31(input.prompt || input.candidatePrompt || '', 1200);
  var safeContext = sanitizeMissionCommandOpenAiShadowContextV31(input.safeContext || input.contextPacket || {});
  var safetyIdentifier = makeMissionCommandOpenAiSafetyIdentifierV31(input.safetyIdentifierSeed || input.profileId || 'a1xx-primary');

  if (!role) return { ok: false, error: 'invalid_role', request: null };
  if (!model) return { ok: false, error: 'missing_registry_model', request: null };
  if (!userPrompt) return { ok: false, error: 'missing_prompt', request: null };

  return {
    ok: true,
    error: '',
    request: {
      model: model,
      store: false,
      input: [
        { role: 'system', content: rolePrompt },
        {
          role: 'user',
          content: [
            'Hidden candidate request: ' + userPrompt,
            'Safe context packet: ' + JSON.stringify(safeContext)
          ].join('\n')
        }
      ],
      reasoning: { effort: getMissionCommandOpenAiReasoningEffortV31(input.depth || 'standard') },
      max_output_tokens: Math.min(Math.max(Number(input.maxOutputTokens || 600), 120), 600),
      tools: [],
      text: {
        format: {
          type: 'json_schema',
          name: 'mission_command_hidden_candidate_v1',
          strict: true,
          schema: getMissionCommandOpenAiHiddenCandidateSchemaV31()
        }
      },
      safety_identifier: safetyIdentifier
    }
  };
}

function getMissionCommandOpenAiReasoningEffortV31(depth) {
  var key = String(depth || '').toLowerCase();
  if (key === 'brief') return 'low';
  if (key === 'deep' || key === 'audit') return 'high';
  return 'medium';
}

function prepareMissionCommandOpenAiShadowRequestV31(input) {
  input = input || {};
  var flags = getMissionCommandOpenAiShadowFlagsV31(input.flags || {});
  if (!flags.openaiAdapterEnabled || !flags.runtimeShadowEnabled) {
    return getMissionCommandOpenAiShadowBlockedContractV31('feature_disabled', 'OpenAI shadow adapter and runtime flags default off.');
  }
  if (flags.visibleDeliveryEnabled || flags.externalWritesEnabled || flags.dispatchEnabled || flags.openaiProbeEnabled || flags.shadowTriggerEnabled) {
    return getMissionCommandOpenAiShadowBlockedContractV31('unsafe_flag_state', 'Live, probe, trigger, visible, external write, or dispatch flag is not allowed in Stage 3.1.');
  }
  var draft = makeMissionCommandOpenAiShadowRequestDraftV31(input);
  if (!draft.ok) return getMissionCommandOpenAiShadowBlockedContractV31(draft.error, 'Request draft failed closed.');
  var validation = validateMissionCommandOpenAiShadowRequestV31(draft.request);
  if (!validation.ok) return getMissionCommandOpenAiShadowBlockedContractV31('request_contract_invalid', validation.errors.join('; '));
  return {
    ok: true,
    status: 'prepared_local_only',
    build: MC_OPENAI_SHADOW_FOUNDATION_BUILD_V31,
    provider: 'openai',
    apiSurface: 'responses_api',
    request: draft.request,
    validation: validation,
    providerCall: false,
    providerSwitch: false,
    visibleRuntimeMutation: false,
    visibleInboxMutation: false,
    sheetWrite: false,
    triggerInstall: false,
    externalWrite: false,
    dispatch: false
  };
}

function validateMissionCommandOpenAiShadowRequestV31(request) {
  var errors = [];
  request = request || {};
  if (!request.model) errors.push('missing model');
  if (request.store !== false) errors.push('store must be false');
  if (request.previous_response_id) errors.push('previous_response_id must be absent');
  if (request.conversation) errors.push('provider conversation must be absent');
  if (!Array.isArray(request.tools) || request.tools.length !== 0) errors.push('provider tools must be an empty array');
  if (!request.text || !request.text.format || request.text.format.type !== 'json_schema') errors.push('structured json_schema output required');
  if (!request.text || !request.text.format || request.text.format.strict !== true) errors.push('strict structured output required');
  if (!request.safety_identifier || /@|\.com|phone|email|a1xxoffice/i.test(String(request.safety_identifier))) errors.push('privacy-preserving safety identifier required');
  return { ok: errors.length === 0, errors: errors };
}

function makeMissionCommandOpenAiShadowReceiptV31(providerResponse, meta) {
  providerResponse = providerResponse || {};
  meta = meta || {};
  var usage = providerResponse.usage || {};
  var inputDetails = usage.input_tokens_details || usage.prompt_tokens_details || {};
  var outputDetails = usage.output_tokens_details || usage.completion_tokens_details || {};
  return {
    build: MC_OPENAI_SHADOW_FOUNDATION_BUILD_V31,
    provider: 'openai',
    apiSurface: 'responses_api',
    role: normalizeMissionCommandOpenAiRoleV31(meta.role) || '',
    model: sanitizeMissionCommandOpenAiShadowTextV31(meta.model || providerResponse.model || '', 120),
    status: sanitizeMissionCommandOpenAiShadowTextV31(meta.status || providerResponse.status || 'local_only', 80),
    latencyMs: Math.max(0, Number(meta.latencyMs || 0)),
    inputTokens: safeMissionCommandOpenAiNumberV31(usage.input_tokens || usage.prompt_tokens),
    cachedInputTokens: safeMissionCommandOpenAiNumberV31(inputDetails.cached_tokens),
    cacheWriteTokens: safeMissionCommandOpenAiNumberV31(inputDetails.cache_write_tokens),
    outputTokens: safeMissionCommandOpenAiNumberV31(usage.output_tokens || usage.completion_tokens),
    reasoningTokens: safeMissionCommandOpenAiNumberV31(outputDetails.reasoning_tokens || usage.reasoning_tokens),
    retryCount: safeMissionCommandOpenAiNumberV31(meta.retryCount),
    estimatedCost: Math.max(0, Number(meta.estimatedCost || 0)),
    fallbackReason: sanitizeMissionCommandOpenAiShadowTextV31(meta.fallbackReason || '', 120),
    rawPromptStored: false,
    rawResponseStored: false,
    credentialStored: false,
    providerCall: false,
    providerSwitch: false,
    externalWrite: false
  };
}

function safeMissionCommandOpenAiNumberV31(value) {
  var number = Number(value || 0);
  if (!isFinite(number) || number < 0) return 0;
  return Math.floor(number);
}

function getMissionCommandOpenAiNoProviderSwitchFallbackV31(reason) {
  return {
    ok: false,
    status: 'template_fallback',
    provider: 'openai',
    providerSwitch: false,
    fallbackReason: sanitizeMissionCommandOpenAiShadowTextV31(reason || 'provider_unavailable', 120),
    hiddenCandidate: {
      role: 'executive_assistant',
      message_type: 'fallback',
      priority: 'normal',
      title: 'Mission Command needs review',
      body: 'The shadow model lane is unavailable, so Mission Command used a deterministic fallback.',
      why_it_matters: 'No provider switch or live action was taken.',
      next_move: 'Review the redacted runtime receipt before approving the next stage.',
      question: '',
      source_labels: ['deterministic_fallback'],
      grounding_state: 'insufficient_context',
      confidence: 0,
      should_deliver: false,
      blocked_reason: sanitizeMissionCommandOpenAiShadowTextV31(reason || 'provider_unavailable', 120)
    },
    visibleRuntimeMutation: false,
    visibleInboxMutation: false,
    sheetWrite: false,
    triggerInstall: false,
    externalWrite: false,
    dispatch: false
  };
}

function getMissionCommandOpenAiShadowFoundationFixturesV31() {
  return [
    {
      id: 'flags_default_off',
      run: function() {
        var flags = getMissionCommandOpenAiShadowFlagsV31();
        return flags.openaiAdapterEnabled === false &&
          flags.openaiProbeEnabled === false &&
          flags.runtimeShadowEnabled === false &&
          flags.shadowTriggerEnabled === false &&
          flags.visibleDeliveryEnabled === false &&
          flags.externalWritesEnabled === false &&
          flags.dispatchEnabled === false;
      }
    },
    {
      id: 'flag_off_blocks_provider_path',
      run: function() {
        var result = prepareMissionCommandOpenAiShadowRequestV31({
          role: 'executive_assistant',
          registry: { model: 'registry-test-model' },
          prompt: 'Prepare a hidden candidate.',
          safeContext: { source_labels: ['fixture'] }
        });
        return result.ok === false && result.providerCall === false && result.fallbackReason === 'feature_disabled';
      }
    },
    {
      id: 'request_contract_local_only',
      run: function() {
        var draft = makeMissionCommandOpenAiShadowRequestDraftV31({
          role: 'chief_of_staff',
          registry: { model: 'registry-test-model' },
          prompt: 'Prepare a hidden coordination candidate.',
          safeContext: { status_counts: { blocked: 1 }, source_labels: ['fixture'] },
          safetyIdentifierSeed: 'a1xx-primary'
        });
        return draft.ok === true && validateMissionCommandOpenAiShadowRequestV31(draft.request).ok === true &&
          draft.request.store === false && draft.request.tools.length === 0 && !draft.request.previous_response_id;
      }
    },
    {
      id: 'missing_registry_model_fails_closed',
      run: function() {
        var draft = makeMissionCommandOpenAiShadowRequestDraftV31({
          role: 'executive_assistant',
          registry: {},
          prompt: 'Prepare a hidden candidate.',
          safeContext: {}
        });
        return draft.ok === false && draft.error === 'missing_registry_model';
      }
    },
    {
      id: 'receipt_redaction',
      run: function() {
        var receipt = makeMissionCommandOpenAiShadowReceiptV31({
          model: 'registry-test-model',
          usage: {
            input_tokens: 100,
            input_tokens_details: { cached_tokens: 40, cache_write_tokens: 10 },
            output_tokens: 20,
            output_tokens_details: { reasoning_tokens: 5 }
          }
        }, { role: 'executive_assistant', status: 'ok' });
        return receipt.inputTokens === 100 && receipt.cachedInputTokens === 40 &&
          receipt.cacheWriteTokens === 10 && receipt.outputTokens === 20 &&
          receipt.reasoningTokens === 5 && receipt.rawPromptStored === false &&
          receipt.rawResponseStored === false && receipt.credentialStored === false;
      }
    },
    {
      id: 'no_provider_switch_fallback',
      run: function() {
        var fallback = getMissionCommandOpenAiNoProviderSwitchFallbackV31('provider_failure');
        return fallback.status === 'template_fallback' && fallback.providerSwitch === false &&
          fallback.hiddenCandidate.should_deliver === false;
      }
    }
  ];
}

function runMissionCommandOpenAiShadowFoundationChecksV31() {
  var fixtures = getMissionCommandOpenAiShadowFoundationFixturesV31();
  var results = fixtures.map(function(fixture) {
    var passed = false;
    var error = '';
    try {
      passed = fixture.run() === true;
    } catch (err) {
      error = String(err && err.message ? err.message : err);
    }
    return { id: fixture.id, passed: passed, error: error };
  });
  var failed = results.filter(function(result) { return result.passed !== true; });
  return {
    ok: failed.length === 0,
    build: MC_OPENAI_SHADOW_FOUNDATION_BUILD_V31,
    fixtureCount: results.length,
    failedCount: failed.length,
    results: results,
    providerCall: false,
    credentialAccess: false,
    scriptPropertiesChanged: false,
    sheetWrite: false,
    triggerInstall: false,
    visibleRuntimeMutation: false,
    visibleInboxMutation: false,
    dispatch: false,
    externalWrite: false
  };
}

// ── MISSION COMMAND STAGE 3.2 OPENAI SINGLE PROBE ───────────
// Bounded one-probe helper only. No trigger, Sheet write, visible delivery,
// dispatch, Team Chat/Notion write, fallback model, or stored raw response.
var MC_OPENAI_STAGE32_PROBE_BUILD = 'mmos-20260711-stage3-2-openai-single-probe';
var MC_OPENAI_STAGE32_SCRIPT_PROPERTY_KEY = 'OPENAI_API_KEY';
var MC_OPENAI_STAGE32_MODEL = 'gpt-5.6-terra';
var MC_OPENAI_STAGE32_ENDPOINT = 'https://api.openai.com/v1/responses';
var MC_OPENAI_STAGE32_MAX_ESTIMATED_SPEND_USD = 1.00;
var MC_OPENAI_STAGE32_PREFLIGHT_ESTIMATED_SPEND_USD = 0.029;
var MC_OPENAI_STAGE32_TIMEOUT_MS = 30000;
var MC_OPENAI_STAGE32_TIMEOUT_SECONDS = 30;
var MC_OPENAI_STAGE32_MAX_INPUT_TOKENS = 8000;
var MC_OPENAI_STAGE32_MAX_OUTPUT_TOKENS = 600;

function getMissionCommandOpenAiStage32Flags(overrides) {
  var flags = {
    stage32ProbeEnabled: false,
    executeProviderCall: false,
    approvedSingleCall: false,
    scriptPropertyConfirmed: false,
    visibleDeliveryEnabled: false,
    externalWritesEnabled: false,
    dispatchEnabled: false,
    triggerEnabled: false,
    fallbackEnabled: false
  };
  overrides = overrides || {};
  Object.keys(flags).forEach(function(key) {
    flags[key] = overrides[key] === true;
  });
  return flags;
}

function getMissionCommandOpenAiStage32BlockedResult(reason, detail, meta) {
  meta = meta || {};
  return {
    ok: false,
    status: 'blocked',
    build: MC_OPENAI_STAGE32_PROBE_BUILD,
    provider: 'openai',
    model: MC_OPENAI_STAGE32_MODEL,
    role: 'chief_of_staff',
    stopCondition: sanitizeMissionCommandOpenAiShadowTextV31(reason || 'preflight_blocked', 120),
    safeDetail: sanitizeMissionCommandOpenAiShadowTextV31(detail || '', 240),
    providerCallAttempted: false,
    retryCount: 0,
    timeoutMs: MC_OPENAI_STAGE32_TIMEOUT_MS,
    maxEstimatedSpendUsd: MC_OPENAI_STAGE32_MAX_ESTIMATED_SPEND_USD,
    receipt: makeMissionCommandOpenAiStage32RedactedReceipt(null, {
      status: 'blocked',
      stopCondition: reason || 'preflight_blocked',
      estimatedCost: meta.estimatedCost || 0,
      structuredOutputValid: false,
      latencyMs: 0
    }),
    rawPromptStored: false,
    rawResponseStored: false,
    credentialStored: false,
    visibleRuntimeMutation: false,
    visibleInboxMutation: false,
    sheetWrite: false,
    triggerInstall: false,
    dispatch: false,
    externalWrite: false
  };
}

function getMissionCommandOpenAiStage32FixedFixture() {
  return {
    role: 'chief_of_staff',
    request_type: 'shadow_candidate_probe',
    safe_context: {
      date: '2026-07-11',
      surface: 'Mission Command',
      active_goal: 'Parallel Mission Command readiness while Project Desk build continues',
      known_state: [
        'Stage 3.1 OpenAI shadow foundation is complete and inert',
        'Stage 3.2 is approved for exactly one bounded provider probe',
        'Build Agent 2 is active only on the separate Project Desk production lane',
        'No visible runtime delivery or dispatch is allowed'
      ],
      source_labels: [
        'Stage 3.1 local closeout',
        'Mission Command parallel work plan',
        'Phase 2 contracts'
      ]
    },
    operator_prompt: 'Create one hidden Chief of Staff candidate for A1XX. It must be concise, sourced, non-dispatching, and must not claim any visible action occurred.'
  };
}

function makeMissionCommandOpenAiStage32Request() {
  var fixture = getMissionCommandOpenAiStage32FixedFixture();
  return makeMissionCommandOpenAiShadowRequestDraftV31({
    role: fixture.role,
    registry: { model: MC_OPENAI_STAGE32_MODEL },
    prompt: fixture.operator_prompt,
    safeContext: fixture.safe_context,
    safetyIdentifierSeed: 'a1xx-primary',
    depth: 'standard',
    maxOutputTokens: MC_OPENAI_STAGE32_MAX_OUTPUT_TOKENS
  });
}

function validateMissionCommandOpenAiStage32Request(request) {
  var base = validateMissionCommandOpenAiShadowRequestV31(request);
  var errors = base.errors.slice();
  if (request.model !== MC_OPENAI_STAGE32_MODEL) errors.push('model must be ' + MC_OPENAI_STAGE32_MODEL);
  if (request.max_output_tokens > MC_OPENAI_STAGE32_MAX_OUTPUT_TOKENS) errors.push('max output tokens exceed cap');
  if (JSON.stringify(request).length > MC_OPENAI_STAGE32_MAX_INPUT_TOKENS * 5) errors.push('request payload exceeds conservative input-size cap');
  if (request.parallel_tool_calls || request.tool_choice) errors.push('tool selection fields must be absent');
  return { ok: errors.length === 0, errors: errors };
}

function makeMissionCommandOpenAiStage32FetchOptions(apiKey, request) {
  return {
    method: 'post',
    contentType: 'application/json',
    headers: {
      Authorization: 'Bearer ' + String(apiKey || '')
    },
    payload: JSON.stringify(request || {}),
    muteHttpExceptions: true,
    timeoutSeconds: MC_OPENAI_STAGE32_TIMEOUT_SECONDS
  };
}

function getMissionCommandOpenAiStage32Preflight(input) {
  input = input || {};
  var flags = getMissionCommandOpenAiStage32Flags(input.flags || {});
  if (!flags.stage32ProbeEnabled || !flags.executeProviderCall || !flags.approvedSingleCall) {
    return getMissionCommandOpenAiStage32BlockedResult('probe_not_authorized', 'Stage 3.2 probe flags are default-off unless explicit one-call authorization is passed.');
  }
  if (flags.visibleDeliveryEnabled || flags.externalWritesEnabled || flags.dispatchEnabled || flags.triggerEnabled || flags.fallbackEnabled) {
    return getMissionCommandOpenAiStage32BlockedResult('unsafe_flag_state', 'Visible delivery, external write, dispatch, trigger, or fallback flags are not allowed.');
  }
  if (!flags.scriptPropertyConfirmed) {
    return getMissionCommandOpenAiStage32BlockedResult('credential_unconfirmed', 'OPENAI_API_KEY must be confirmed in Apps Script Script Properties without exposing its value.');
  }
  var estimatedCost = Number(input.estimatedCostUsd);
  if (!isFinite(estimatedCost) || estimatedCost < 0 || estimatedCost > MC_OPENAI_STAGE32_MAX_ESTIMATED_SPEND_USD) {
    return getMissionCommandOpenAiStage32BlockedResult('cost_cap_unconfirmed', 'Estimated probe cost must be numeric and <= $1.00.', { estimatedCost: estimatedCost });
  }
  var draft = makeMissionCommandOpenAiStage32Request();
  if (!draft.ok) return getMissionCommandOpenAiStage32BlockedResult(draft.error, 'Stage 3.2 request draft failed closed.');
  var validation = validateMissionCommandOpenAiStage32Request(draft.request);
  if (!validation.ok) return getMissionCommandOpenAiStage32BlockedResult('request_contract_invalid', validation.errors.join('; '), { estimatedCost: estimatedCost });
  return {
    ok: true,
    status: 'preflight_ready',
    build: MC_OPENAI_STAGE32_PROBE_BUILD,
    provider: 'openai',
    endpoint: MC_OPENAI_STAGE32_ENDPOINT,
    model: MC_OPENAI_STAGE32_MODEL,
    modelAccessCheckMethod: 'single_authorized_responses_probe',
    role: 'chief_of_staff',
    request: draft.request,
    validation: validation,
    estimatedCostUsd: estimatedCost,
    callLimit: 1,
    retryCount: 0,
    timeoutMs: MC_OPENAI_STAGE32_TIMEOUT_MS,
    timeoutSeconds: MC_OPENAI_STAGE32_TIMEOUT_SECONDS,
    fetchOptions: makeMissionCommandOpenAiStage32FetchOptions('[redacted]', draft.request),
    maxOutputTokens: MC_OPENAI_STAGE32_MAX_OUTPUT_TOKENS,
    store: false,
    tools: [],
    rawPromptStored: false,
    rawResponseStored: false,
    credentialStored: false,
    providerSwitch: false,
    visibleRuntimeMutation: false,
    visibleInboxMutation: false,
    sheetWrite: false,
    triggerInstall: false,
    dispatch: false,
    externalWrite: false
  };
}

function runMissionCommandOpenAiStage32OneProbe(input) {
  input = input || {};
  var preflight = getMissionCommandOpenAiStage32Preflight(input);
  if (!preflight.ok) return preflight;

  var apiKey = '';
  try {
    apiKey = String(PropertiesService.getScriptProperties().getProperty(MC_OPENAI_STAGE32_SCRIPT_PROPERTY_KEY) || '').trim();
  } catch (err) {
    return getMissionCommandOpenAiStage32BlockedResult('credential_read_failed', 'Script Properties could not be read safely.', { estimatedCost: preflight.estimatedCostUsd });
  }
  if (!apiKey) {
    return getMissionCommandOpenAiStage32BlockedResult('credential_unavailable', 'OPENAI_API_KEY is absent from Apps Script Script Properties.', { estimatedCost: preflight.estimatedCostUsd });
  }

  var started = Date.now();
  var httpStatus = 0;
  var responseBody = '';
  var providerResponse = null;
  try {
    var response = UrlFetchApp.fetch(MC_OPENAI_STAGE32_ENDPOINT, makeMissionCommandOpenAiStage32FetchOptions(apiKey, preflight.request));
    httpStatus = Number(response.getResponseCode() || 0);
    responseBody = String(response.getContentText() || '');
  } catch (fetchErr) {
    return makeMissionCommandOpenAiStage32ProviderResult(null, {
      status: 'provider_fetch_failed',
      httpStatus: 0,
      latencyMs: Date.now() - started,
      estimatedCost: preflight.estimatedCostUsd,
      stopCondition: 'provider_fetch_failed'
    });
  }

  try {
    providerResponse = JSON.parse(responseBody || '{}');
  } catch (parseErr) {
    providerResponse = null;
  }

  if (httpStatus === 404) {
    return makeMissionCommandOpenAiStage32ProviderResult(providerResponse, {
      status: 'model_unavailable',
      httpStatus: httpStatus,
      latencyMs: Date.now() - started,
      estimatedCost: preflight.estimatedCostUsd,
      stopCondition: 'model_unavailable'
    });
  }
  if (httpStatus < 200 || httpStatus >= 300) {
    return makeMissionCommandOpenAiStage32ProviderResult(providerResponse, {
      status: 'provider_http_' + httpStatus,
      httpStatus: httpStatus,
      latencyMs: Date.now() - started,
      estimatedCost: preflight.estimatedCostUsd,
      stopCondition: 'provider_http_' + httpStatus
    });
  }

  var parsed = parseMissionCommandOpenAiStage32StructuredCandidate(providerResponse);
  return makeMissionCommandOpenAiStage32ProviderResult(providerResponse, {
    status: parsed.ok ? 'probe_complete' : 'structured_output_invalid',
    httpStatus: httpStatus,
    latencyMs: Date.now() - started,
    estimatedCost: preflight.estimatedCostUsd,
    structuredOutputValid: parsed.ok,
    stopCondition: parsed.ok ? 'single_call_complete' : 'structured_output_invalid'
  });
}

function parseMissionCommandOpenAiStage32StructuredCandidate(providerResponse) {
  providerResponse = providerResponse || {};
  var outputText = '';
  if (typeof providerResponse.output_text === 'string') {
    outputText = providerResponse.output_text;
  } else if (Array.isArray(providerResponse.output)) {
    providerResponse.output.forEach(function(item) {
      if (item && Array.isArray(item.content)) {
        item.content.forEach(function(content) {
          if (content && typeof content.text === 'string') outputText += content.text;
        });
      }
    });
  }
  var parsed = null;
  try {
    parsed = JSON.parse(outputText || '{}');
  } catch (err) {
    parsed = null;
  }
  return validateMissionCommandOpenAiStage32Candidate(parsed);
}

function validateMissionCommandOpenAiStage32Candidate(candidate) {
  var errors = [];
  candidate = candidate || {};
  var required = getMissionCommandOpenAiHiddenCandidateSchemaV31().required || [];
  required.forEach(function(field) {
    if (!Object.prototype.hasOwnProperty.call(candidate, field)) errors.push('missing ' + field);
  });
  if (candidate.role !== 'chief_of_staff') errors.push('role must be chief_of_staff');
  if (candidate.should_deliver !== false) errors.push('should_deliver must be false for the probe');
  if (!Array.isArray(candidate.source_labels)) errors.push('source_labels must be an array');
  return { ok: errors.length === 0, errors: errors };
}

function makeMissionCommandOpenAiStage32ProviderResult(providerResponse, meta) {
  meta = meta || {};
  return {
    ok: meta.status === 'probe_complete',
    status: sanitizeMissionCommandOpenAiShadowTextV31(meta.status || 'provider_result', 80),
    build: MC_OPENAI_STAGE32_PROBE_BUILD,
    provider: 'openai',
    model: MC_OPENAI_STAGE32_MODEL,
    role: 'chief_of_staff',
    httpStatus: safeMissionCommandOpenAiNumberV31(meta.httpStatus),
    providerCallAttempted: true,
    callCount: 1,
    retryCount: 0,
    latencyMs: Math.max(0, Number(meta.latencyMs || 0)),
    timeoutMs: MC_OPENAI_STAGE32_TIMEOUT_MS,
    stopCondition: sanitizeMissionCommandOpenAiShadowTextV31(meta.stopCondition || meta.status || '', 120),
    structuredOutputValid: meta.structuredOutputValid === true,
    receipt: makeMissionCommandOpenAiStage32RedactedReceipt(providerResponse, meta),
    rawPromptStored: false,
    rawResponseStored: false,
    hiddenCandidateStored: false,
    credentialStored: false,
    providerSwitch: false,
    visibleRuntimeMutation: false,
    visibleInboxMutation: false,
    sheetWrite: false,
    triggerInstall: false,
    dispatch: false,
    externalWrite: false
  };
}

function makeMissionCommandOpenAiStage32RedactedReceipt(providerResponse, meta) {
  var base = makeMissionCommandOpenAiShadowReceiptV31(providerResponse || {}, {
    role: 'chief_of_staff',
    model: MC_OPENAI_STAGE32_MODEL,
    status: meta.status || 'blocked',
    latencyMs: meta.latencyMs || 0,
    retryCount: 0,
    estimatedCost: meta.estimatedCost || 0,
    fallbackReason: ''
  });
  return {
    stage: '3.2',
    build: MC_OPENAI_STAGE32_PROBE_BUILD,
    timestamp: new Date().toISOString(),
    provider: 'openai',
    model: MC_OPENAI_STAGE32_MODEL,
    role: 'chief_of_staff',
    requestContractVersion: 'mission_command_openai_stage32_v1',
    status: base.status,
    stopCondition: sanitizeMissionCommandOpenAiShadowTextV31(meta.stopCondition || meta.status || '', 120),
    latencyMs: base.latencyMs,
    timeoutMs: MC_OPENAI_STAGE32_TIMEOUT_MS,
    retryCount: 0,
    inputTokens: base.inputTokens,
    cachedInputTokens: base.cachedInputTokens,
    cacheWriteTokens: base.cacheWriteTokens,
    outputTokens: base.outputTokens,
    reasoningTokens: base.reasoningTokens,
    estimatedCost: base.estimatedCost,
    fallbackUsed: false,
    fallbackReason: '',
    safetyIdentifierHash: makeMissionCommandOpenAiSafetyIdentifierV31('a1xx-primary'),
    structuredOutputValid: meta.structuredOutputValid === true,
    rawPromptStored: false,
    rawResponseStored: false,
    credentialStored: false,
    externalWrite: false
  };
}

function runMissionCommandOpenAiStage32LocalChecks() {
  var stage31 = runMissionCommandOpenAiShadowFoundationChecksV31();
  var blocked = getMissionCommandOpenAiStage32Preflight({
    flags: {},
    estimatedCostUsd: 0.01
  });
  var ready = getMissionCommandOpenAiStage32Preflight({
    flags: {
      stage32ProbeEnabled: true,
      executeProviderCall: true,
      approvedSingleCall: true,
      scriptPropertyConfirmed: true
    },
    estimatedCostUsd: MC_OPENAI_STAGE32_PREFLIGHT_ESTIMATED_SPEND_USD
  });
  var invalidCost = getMissionCommandOpenAiStage32Preflight({
    flags: {
      stage32ProbeEnabled: true,
      executeProviderCall: true,
      approvedSingleCall: true,
      scriptPropertyConfirmed: true
    },
    estimatedCostUsd: 1.01
  });
  var fetchOptions = ready.ok === true ? makeMissionCommandOpenAiStage32FetchOptions('[redacted]', ready.request) : {};
  return {
    ok: stage31.ok === true &&
      blocked.ok === false &&
      blocked.providerCallAttempted === false &&
      ready.ok === true &&
      ready.request.store === false &&
      Array.isArray(ready.request.tools) &&
      ready.request.tools.length === 0 &&
      ready.request.model === MC_OPENAI_STAGE32_MODEL &&
      ready.timeoutSeconds === MC_OPENAI_STAGE32_TIMEOUT_SECONDS &&
      fetchOptions.timeoutSeconds === MC_OPENAI_STAGE32_TIMEOUT_SECONDS &&
      invalidCost.ok === false &&
      invalidCost.stopCondition === 'cost_cap_unconfirmed',
    build: MC_OPENAI_STAGE32_PROBE_BUILD,
    stage31Ok: stage31.ok === true,
    blockedDefaultOff: blocked.ok === false && blocked.providerCallAttempted === false,
    requestReady: ready.ok === true,
    timeoutSecondsReady: ready.timeoutSeconds === MC_OPENAI_STAGE32_TIMEOUT_SECONDS && fetchOptions.timeoutSeconds === MC_OPENAI_STAGE32_TIMEOUT_SECONDS,
    preflightEstimatedSpendUsd: MC_OPENAI_STAGE32_PREFLIGHT_ESTIMATED_SPEND_USD,
    invalidCostBlocked: invalidCost.ok === false,
    providerCall: false,
    credentialValueReturned: false,
    scriptPropertiesChanged: false,
    sheetWrite: false,
    triggerInstall: false,
    visibleRuntimeMutation: false,
    visibleInboxMutation: false,
    dispatch: false,
    externalWrite: false
  };
}

// ── MISSION COMMAND STAGE 3.3 AGENT RESPONSE CAPTURE ────────
// Temporary manual capture lane only. No trigger, Sheet write, visible delivery,
// dispatch, Team Chat/Notion write, fallback model, or stored raw response.
var MC_OPENAI_STAGE33_CAPTURE_BUILD = 'mmos-20260711-stage3-3-agent-response-capture';
var MC_OPENAI_STAGE33_LOG_PREFIX = 'MC_STAGE33_CAPTURE_SAFE ';
var MC_OPENAI_STAGE33_MODEL = 'gpt-5.6-terra';
var MC_OPENAI_STAGE33_MAX_ESTIMATED_SPEND_USD = 0.10;
var MC_OPENAI_STAGE33_PREFLIGHT_ESTIMATED_SPEND_USD = 0.0235;
var MC_OPENAI_STAGE33_TIMEOUT_SECONDS = 30;
var MC_OPENAI_STAGE33_MAX_INPUT_TOKENS_PER_ROLE = 2000;
var MC_OPENAI_STAGE33_MAX_OUTPUT_TOKENS_PER_ROLE = 450;
var MC_OPENAI_STAGE33_ROLE_ORDER = ['executive_assistant', 'chief_of_staff'];

function getMissionCommandOpenAiStage33Flags(overrides) {
  var flags = {
    stage33CaptureEnabled: false,
    executeProviderCalls: false,
    approvedManualRun: false,
    scriptPropertyConfirmed: false,
    visibleDeliveryEnabled: false,
    externalWritesEnabled: false,
    dispatchEnabled: false,
    triggerEnabled: false,
    fallbackEnabled: false
  };
  overrides = overrides || {};
  Object.keys(flags).forEach(function(key) {
    flags[key] = overrides[key] === true;
  });
  return flags;
}

function getMissionCommandOpenAiStage33Fixture() {
  return {
    fixture_id: 'mc_stage33_capture_v1',
    fixture_type: 'synthetic_safe_context',
    surface: 'Mission Command',
    known_state: [
      'One output draft is waiting for A1XX review',
      'One client deliverable is waiting on a missing reference file',
      'One content draft was returned by a specialist and has not been reviewed',
      'No dispatch, send, publish, delivery, billing, or external write is allowed'
    ],
    source_labels: [
      'synthetic_fixture:output_review',
      'synthetic_fixture:client_project',
      'synthetic_fixture:agent_return'
    ]
  };
}

function getMissionCommandOpenAiStage33RolePrompt(role) {
  if (role === 'executive_assistant') {
    return [
      'Create one hidden Executive Assistant candidate for A1XX.',
      'Lead with the highest-leverage A1XX action.',
      'Use firm Executive Accountability tone.',
      'Explain what matters and the smallest next move.',
      'Ask at most one useful question.',
      'Avoid team-internal detail unless it changes what A1XX should do.',
      'Never claim dispatch, source access, completion, visible delivery, or external action.',
      'Return should_deliver:false.'
    ].join(' ');
  }
  if (role === 'chief_of_staff') {
    return [
      'Create one hidden Chief of Staff candidate for A1XX.',
      'Summarize team and work movement, ownership, blockers, and review needs.',
      'Identify what should escalate to the Executive Assistant.',
      'Do not duplicate the Executive Assistant wording.',
      'Preserve lane boundaries and one-writer production rules.',
      'Never claim dispatch, source access, completion, visible delivery, or external action.',
      'Return should_deliver:false.'
    ].join(' ');
  }
  return '';
}

function makeMissionCommandOpenAiStage33Request(role) {
  var fixture = getMissionCommandOpenAiStage33Fixture();
  return makeMissionCommandOpenAiShadowRequestDraftV31({
    role: role,
    registry: { model: MC_OPENAI_STAGE33_MODEL },
    prompt: getMissionCommandOpenAiStage33RolePrompt(role),
    safeContext: fixture,
    safetyIdentifierSeed: 'a1xx-primary-' + role + '-stage33',
    depth: 'standard',
    maxOutputTokens: MC_OPENAI_STAGE33_MAX_OUTPUT_TOKENS_PER_ROLE
  });
}

function validateMissionCommandOpenAiStage33Request(role, request) {
  var base = validateMissionCommandOpenAiShadowRequestV31(request);
  var errors = base.errors.slice();
  role = normalizeMissionCommandOpenAiRoleV31(role);
  if (MC_OPENAI_STAGE33_ROLE_ORDER.indexOf(role) === -1) errors.push('invalid stage 3.3 role');
  if (request.model !== MC_OPENAI_STAGE33_MODEL) errors.push('model must be ' + MC_OPENAI_STAGE33_MODEL);
  if (request.max_output_tokens > MC_OPENAI_STAGE33_MAX_OUTPUT_TOKENS_PER_ROLE) errors.push('max output tokens exceed stage 3.3 cap');
  if (JSON.stringify(request).length > MC_OPENAI_STAGE33_MAX_INPUT_TOKENS_PER_ROLE * 5) errors.push('request payload exceeds conservative input-size cap');
  if (request.parallel_tool_calls || request.tool_choice) errors.push('tool selection fields must be absent');
  return { ok: errors.length === 0, errors: errors };
}

function makeMissionCommandOpenAiStage33FetchOptions(apiKey, request) {
  return {
    method: 'post',
    contentType: 'application/json',
    headers: {
      Authorization: 'Bearer ' + String(apiKey || '')
    },
    payload: JSON.stringify(request || {}),
    muteHttpExceptions: true,
    timeoutSeconds: MC_OPENAI_STAGE33_TIMEOUT_SECONDS
  };
}

function getMissionCommandOpenAiStage33Preflight(input) {
  input = input || {};
  var flags = getMissionCommandOpenAiStage33Flags(input.flags || {});
  if (!flags.stage33CaptureEnabled || !flags.executeProviderCalls || !flags.approvedManualRun) {
    return makeMissionCommandOpenAiStage33SafeCapture('blocked', [], {
      stopCondition: 'capture_not_authorized',
      safeDetail: 'Stage 3.3 capture flags are default-off unless explicit manual-run authorization is passed.',
      estimatedCost: 0
    });
  }
  if (flags.visibleDeliveryEnabled || flags.externalWritesEnabled || flags.dispatchEnabled || flags.triggerEnabled || flags.fallbackEnabled) {
    return makeMissionCommandOpenAiStage33SafeCapture('blocked', [], {
      stopCondition: 'unsafe_flag_state',
      safeDetail: 'Visible delivery, external write, dispatch, trigger, or fallback flags are not allowed.',
      estimatedCost: 0
    });
  }
  if (!flags.scriptPropertyConfirmed) {
    return makeMissionCommandOpenAiStage33SafeCapture('blocked', [], {
      stopCondition: 'credential_unconfirmed',
      safeDetail: 'OPENAI_API_KEY must be confirmed in Apps Script Script Properties without exposing its value.',
      estimatedCost: 0
    });
  }
  var estimatedCost = Number(input.estimatedCostUsd);
  if (!isFinite(estimatedCost) || estimatedCost < 0 || estimatedCost > MC_OPENAI_STAGE33_MAX_ESTIMATED_SPEND_USD) {
    return makeMissionCommandOpenAiStage33SafeCapture('blocked', [], {
      stopCondition: 'cost_cap_unconfirmed',
      safeDetail: 'Estimated capture cost must be numeric and <= $0.10.',
      estimatedCost: Math.max(0, estimatedCost || 0)
    });
  }
  var requests = [];
  var errors = [];
  MC_OPENAI_STAGE33_ROLE_ORDER.forEach(function(role) {
    var draft = makeMissionCommandOpenAiStage33Request(role);
    if (!draft.ok) {
      errors.push(role + ':' + draft.error);
      return;
    }
    var validation = validateMissionCommandOpenAiStage33Request(role, draft.request);
    if (!validation.ok) {
      errors.push(role + ':' + validation.errors.join('; '));
      return;
    }
    requests.push({ role: role, request: draft.request, validation: validation });
  });
  if (errors.length) {
    return makeMissionCommandOpenAiStage33SafeCapture('blocked', [], {
      stopCondition: 'request_contract_invalid',
      safeDetail: errors.join(' | '),
      estimatedCost: estimatedCost
    });
  }
  return {
    ok: true,
    status: 'preflight_ready',
    stage: '3.3',
    build: MC_OPENAI_STAGE33_CAPTURE_BUILD,
    provider: 'openai',
    endpoint: MC_OPENAI_STAGE32_ENDPOINT,
    model: MC_OPENAI_STAGE33_MODEL,
    fixture: getMissionCommandOpenAiStage33Fixture(),
    requests: requests,
    callLimit: 2,
    retryCount: 0,
    fallbackUsed: false,
    timeoutSeconds: MC_OPENAI_STAGE33_TIMEOUT_SECONDS,
    maxInputTokensPerRole: MC_OPENAI_STAGE33_MAX_INPUT_TOKENS_PER_ROLE,
    maxOutputTokensPerRole: MC_OPENAI_STAGE33_MAX_OUTPUT_TOKENS_PER_ROLE,
    estimatedCostUsd: estimatedCost,
    fetchOptions: makeMissionCommandOpenAiStage33FetchOptions('[redacted]', requests[0].request),
    store: false,
    tools: [],
    rawPromptStored: false,
    rawResponseStored: false,
    credentialReturned: false,
    visibleDelivery: false,
    visibleRuntimeMutation: false,
    visibleInboxMutation: false,
    sheetWrite: false,
    triggerInstall: false,
    dispatch: false,
    externalWrite: false
  };
}

function runMissionCommandOpenAiStage33CaptureBothRoles(input) {
  input = input || {};
  var preflight = getMissionCommandOpenAiStage33Preflight(input);
  if (!preflight.ok) return preflight;

  var apiKey = '';
  try {
    apiKey = String(PropertiesService.getScriptProperties().getProperty(MC_OPENAI_STAGE32_SCRIPT_PROPERTY_KEY) || '').trim();
  } catch (err) {
    return makeMissionCommandOpenAiStage33SafeCapture('blocked', [], {
      stopCondition: 'credential_read_failed',
      safeDetail: 'Script Properties could not be read safely.',
      estimatedCost: preflight.estimatedCostUsd
    });
  }
  if (!apiKey) {
    return makeMissionCommandOpenAiStage33SafeCapture('blocked', [], {
      stopCondition: 'credential_unavailable',
      safeDetail: 'OPENAI_API_KEY is absent from Apps Script Script Properties.',
      estimatedCost: preflight.estimatedCostUsd
    });
  }

  var roleResults = [];
  preflight.requests.forEach(function(entry, index) {
    if (index >= 2) return;
    roleResults.push(runMissionCommandOpenAiStage33OneRole(entry.role, entry.request, apiKey, preflight.estimatedCostUsd / 2));
  });
  return makeMissionCommandOpenAiStage33SafeCapture('capture_complete', roleResults, {
    stopCondition: 'manual_capture_complete',
    estimatedCost: preflight.estimatedCostUsd
  });
}

function runMissionCommandOpenAiStage33OneRole(role, request, apiKey, estimatedCost) {
  var started = Date.now();
  var httpStatus = 0;
  var providerResponse = null;
  try {
    var response = UrlFetchApp.fetch(MC_OPENAI_STAGE32_ENDPOINT, makeMissionCommandOpenAiStage33FetchOptions(apiKey, request));
    httpStatus = Number(response.getResponseCode() || 0);
    providerResponse = parseMissionCommandOpenAiStage33JsonObject(response.getContentText());
  } catch (fetchErr) {
    return makeMissionCommandOpenAiStage33RoleResult(role, null, {
      status: 'provider_fetch_failed',
      httpStatus: httpStatus,
      latencyMs: Date.now() - started,
      estimatedCost: estimatedCost,
      stopCondition: 'provider_fetch_failed'
    });
  }
  if (httpStatus < 200 || httpStatus >= 300) {
    return makeMissionCommandOpenAiStage33RoleResult(role, providerResponse, {
      status: httpStatus === 404 ? 'model_unavailable' : 'provider_http_' + httpStatus,
      httpStatus: httpStatus,
      latencyMs: Date.now() - started,
      estimatedCost: estimatedCost,
      stopCondition: httpStatus === 404 ? 'model_unavailable' : 'provider_http_' + httpStatus
    });
  }
  var parsed = parseMissionCommandOpenAiStage33StructuredCandidate(providerResponse, role);
  return makeMissionCommandOpenAiStage33RoleResult(role, providerResponse, {
    status: parsed.ok ? 'capture_valid' : 'structured_output_invalid',
    httpStatus: httpStatus,
    latencyMs: Date.now() - started,
    estimatedCost: estimatedCost,
    structuredOutputValid: parsed.ok,
    candidate: parsed.candidate,
    validationErrors: parsed.errors,
    stopCondition: parsed.ok ? 'role_capture_complete' : 'structured_output_invalid'
  });
}

function parseMissionCommandOpenAiStage33JsonObject(text) {
  try {
    return JSON.parse(String(text || '{}'));
  } catch (err) {
    return null;
  }
}

function getMissionCommandOpenAiStage33OutputText(providerResponse) {
  providerResponse = providerResponse || {};
  var outputText = '';
  if (typeof providerResponse.output_text === 'string') {
    outputText = providerResponse.output_text;
  } else if (Array.isArray(providerResponse.output)) {
    providerResponse.output.forEach(function(item) {
      if (item && Array.isArray(item.content)) {
        item.content.forEach(function(content) {
          if (content && typeof content.text === 'string') outputText += content.text;
        });
      }
    });
  }
  return outputText;
}

function parseMissionCommandOpenAiStage33StructuredCandidate(providerResponse, role) {
  var parsed = null;
  try {
    parsed = JSON.parse(getMissionCommandOpenAiStage33OutputText(providerResponse) || '{}');
  } catch (err) {
    parsed = null;
  }
  return validateMissionCommandOpenAiStage33Candidate(parsed, role);
}

function validateMissionCommandOpenAiStage33Candidate(candidate, role) {
  var errors = [];
  candidate = candidate || {};
  var required = getMissionCommandOpenAiHiddenCandidateSchemaV31().required || [];
  required.forEach(function(field) {
    if (!Object.prototype.hasOwnProperty.call(candidate, field)) errors.push('missing ' + field);
  });
  if (candidate.role !== role) errors.push('role must be ' + role);
  if (candidate.should_deliver !== false) errors.push('should_deliver must be false');
  if (!Array.isArray(candidate.source_labels)) errors.push('source_labels must be an array');
  return {
    ok: errors.length === 0,
    errors: errors,
    candidate: errors.length === 0 ? sanitizeMissionCommandOpenAiStage33Candidate(candidate) : null
  };
}

function sanitizeMissionCommandOpenAiStage33Candidate(candidate) {
  candidate = candidate || {};
  return {
    role: normalizeMissionCommandOpenAiRoleV31(candidate.role),
    message_type: sanitizeMissionCommandOpenAiShadowTextV31(candidate.message_type, 80),
    priority: sanitizeMissionCommandOpenAiShadowTextV31(candidate.priority, 40),
    title: sanitizeMissionCommandOpenAiShadowTextV31(candidate.title, 140),
    body: sanitizeMissionCommandOpenAiShadowTextV31(candidate.body, 900),
    why_it_matters: sanitizeMissionCommandOpenAiShadowTextV31(candidate.why_it_matters, 500),
    next_move: sanitizeMissionCommandOpenAiShadowTextV31(candidate.next_move, 360),
    question: sanitizeMissionCommandOpenAiShadowTextV31(candidate.question, 240),
    source_labels: (Array.isArray(candidate.source_labels) ? candidate.source_labels : []).slice(0, 8).map(function(label) {
      return sanitizeMissionCommandOpenAiShadowTextV31(label, 90);
    }),
    grounding_state: sanitizeMissionCommandOpenAiShadowTextV31(candidate.grounding_state, 80),
    confidence: Math.max(0, Math.min(1, Number(candidate.confidence || 0))),
    should_deliver: false,
    blocked_reason: sanitizeMissionCommandOpenAiShadowTextV31(candidate.blocked_reason, 240)
  };
}

function makeMissionCommandOpenAiStage33RoleResult(role, providerResponse, meta) {
  meta = meta || {};
  var receipt = makeMissionCommandOpenAiShadowReceiptV31(providerResponse || {}, {
    role: role,
    model: MC_OPENAI_STAGE33_MODEL,
    status: meta.status || 'role_result',
    latencyMs: meta.latencyMs || 0,
    retryCount: 0,
    estimatedCost: meta.estimatedCost || 0,
    fallbackReason: ''
  });
  return {
    role: role,
    status: sanitizeMissionCommandOpenAiShadowTextV31(meta.status || 'role_result', 80),
    httpStatus: safeMissionCommandOpenAiNumberV31(meta.httpStatus),
    stopCondition: sanitizeMissionCommandOpenAiShadowTextV31(meta.stopCondition || meta.status || '', 120),
    structuredOutputValid: meta.structuredOutputValid === true,
    candidate: meta.structuredOutputValid === true ? meta.candidate : null,
    validationErrors: (meta.validationErrors || []).slice(0, 6).map(function(error) {
      return sanitizeMissionCommandOpenAiShadowTextV31(error, 120);
    }),
    latencyMs: receipt.latencyMs,
    inputTokens: receipt.inputTokens,
    cachedInputTokens: receipt.cachedInputTokens,
    outputTokens: receipt.outputTokens,
    reasoningTokens: receipt.reasoningTokens,
    estimatedCost: Math.max(0, Number(meta.estimatedCost || 0)),
    retryCount: 0,
    fallbackUsed: false,
    rawPromptStored: false,
    rawResponseStored: false,
    credentialReturned: false,
    visibleDelivery: false,
    externalWrite: false
  };
}

function makeMissionCommandOpenAiStage33SafeCapture(status, roleResults, meta) {
  meta = meta || {};
  var fixture = getMissionCommandOpenAiStage33Fixture();
  roleResults = roleResults || [];
  return {
    ok: status === 'capture_complete' && roleResults.length === 2 && roleResults.every(function(result) { return result.structuredOutputValid === true; }),
    stage: '3.3',
    build: MC_OPENAI_STAGE33_CAPTURE_BUILD,
    timestamp: new Date().toISOString(),
    provider: 'openai',
    endpoint: 'responses_api',
    model: MC_OPENAI_STAGE33_MODEL,
    fixtureId: fixture.fixture_id,
    fixtureType: fixture.fixture_type,
    syntheticFixture: true,
    status: sanitizeMissionCommandOpenAiShadowTextV31(status || 'blocked', 80),
    stopCondition: sanitizeMissionCommandOpenAiShadowTextV31(meta.stopCondition || status || '', 120),
    safeDetail: sanitizeMissionCommandOpenAiShadowTextV31(meta.safeDetail || '', 240),
    roles: roleResults,
    attemptedCallCount: roleResults.length,
    maxCallCount: 2,
    retryCount: 0,
    fallbackUsed: false,
    timeoutSeconds: MC_OPENAI_STAGE33_TIMEOUT_SECONDS,
    estimatedCost: Math.max(0, Number(meta.estimatedCost || 0)),
    maxEstimatedSpendUsd: MC_OPENAI_STAGE33_MAX_ESTIMATED_SPEND_USD,
    rawPromptStored: false,
    rawResponseStored: false,
    credentialReturned: false,
    visibleDelivery: false,
    visibleRuntimeMutation: false,
    visibleInboxMutation: false,
    sheetWrite: false,
    triggerInstall: false,
    dispatch: false,
    externalWrite: false
  };
}

function runMissionCommandOpenAiStage33LocalChecks() {
  var stage31 = runMissionCommandOpenAiShadowFoundationChecksV31();
  var stage32 = runMissionCommandOpenAiStage32LocalChecks();
  var fixture = getMissionCommandOpenAiStage33Fixture();
  var blocked = getMissionCommandOpenAiStage33Preflight({
    flags: {},
    estimatedCostUsd: MC_OPENAI_STAGE33_PREFLIGHT_ESTIMATED_SPEND_USD
  });
  var ready = getMissionCommandOpenAiStage33Preflight({
    flags: {
      stage33CaptureEnabled: true,
      executeProviderCalls: true,
      approvedManualRun: true,
      scriptPropertyConfirmed: true
    },
    estimatedCostUsd: MC_OPENAI_STAGE33_PREFLIGHT_ESTIMATED_SPEND_USD
  });
  var invalidCost = getMissionCommandOpenAiStage33Preflight({
    flags: {
      stage33CaptureEnabled: true,
      executeProviderCalls: true,
      approvedManualRun: true,
      scriptPropertyConfirmed: true
    },
    estimatedCostUsd: 0.11
  });
  var promptsDistinct = getMissionCommandOpenAiStage33RolePrompt('executive_assistant') !== getMissionCommandOpenAiStage33RolePrompt('chief_of_staff');
  var requestsReady = ready.ok === true && ready.requests.length === 2 && ready.requests.every(function(entry) {
    return entry.request.store === false &&
      Array.isArray(entry.request.tools) &&
      entry.request.tools.length === 0 &&
      !entry.request.previous_response_id &&
      !entry.request.conversation &&
      entry.request.text.format.strict === true &&
      entry.request.max_output_tokens <= MC_OPENAI_STAGE33_MAX_OUTPUT_TOKENS_PER_ROLE;
  });
  var redactedFetch = ready.ok === true ? makeMissionCommandOpenAiStage33FetchOptions('[redacted]', ready.requests[0].request) : {};
  var fakeCapture = makeMissionCommandOpenAiStage33SafeCapture('capture_complete', [
    makeMissionCommandOpenAiStage33RoleResult('executive_assistant', { usage: { input_tokens: 100, output_tokens: 40 } }, {
      status: 'capture_valid',
      httpStatus: 200,
      structuredOutputValid: true,
      candidate: sanitizeMissionCommandOpenAiStage33Candidate({
        role: 'executive_assistant',
        message_type: 'brief',
        priority: 'high',
        title: 'Review the blocked output first',
        body: 'One output draft is waiting for review and blocks the next move.',
        why_it_matters: 'This is the highest-leverage item in the synthetic fixture.',
        next_move: 'Review the output draft before opening the client deliverable.',
        question: '',
        source_labels: ['synthetic_fixture:output_review'],
        grounding_state: 'sourced',
        confidence: 0.82,
        should_deliver: false,
        blocked_reason: ''
      }),
      estimatedCost: 0.01
    }),
    makeMissionCommandOpenAiStage33RoleResult('chief_of_staff', { usage: { input_tokens: 100, output_tokens: 40 } }, {
      status: 'capture_valid',
      httpStatus: 200,
      structuredOutputValid: true,
      candidate: sanitizeMissionCommandOpenAiStage33Candidate({
        role: 'chief_of_staff',
        message_type: 'coordination',
        priority: 'normal',
        title: 'Three synthetic work items need review order',
        body: 'The fixture has one output review, one missing client reference, and one returned content draft.',
        why_it_matters: 'Ownership and review order should be clear before any visible runtime stage.',
        next_move: 'Escalate the output review to Executive Assistant and keep the missing reference parked.',
        question: '',
        source_labels: ['synthetic_fixture:client_project', 'synthetic_fixture:agent_return'],
        grounding_state: 'sourced',
        confidence: 0.8,
        should_deliver: false,
        blocked_reason: ''
      }),
      estimatedCost: 0.01
    })
  ], { stopCondition: 'local_safe_capture_fixture', estimatedCost: 0.02 });
  var safeLog = MC_OPENAI_STAGE33_LOG_PREFIX + JSON.stringify(fakeCapture);
  return {
    ok: stage31.ok === true &&
      stage32.ok === true &&
      blocked.ok === false &&
      blocked.status === 'blocked' &&
      ready.ok === true &&
      requestsReady === true &&
      ready.callLimit === 2 &&
      ready.retryCount === 0 &&
      ready.fallbackUsed === false &&
      ready.timeoutSeconds === MC_OPENAI_STAGE33_TIMEOUT_SECONDS &&
      ready.estimatedCostUsd <= MC_OPENAI_STAGE33_MAX_ESTIMATED_SPEND_USD &&
      invalidCost.ok === false &&
      invalidCost.stopCondition === 'cost_cap_unconfirmed' &&
      fixture.fixture_id === 'mc_stage33_capture_v1' &&
      fixture.fixture_type === 'synthetic_safe_context' &&
      promptsDistinct === true &&
      redactedFetch.timeoutSeconds === MC_OPENAI_STAGE33_TIMEOUT_SECONDS &&
      redactedFetch.headers.Authorization === 'Bearer [redacted]' &&
      safeLog.indexOf(MC_OPENAI_STAGE33_LOG_PREFIX) === 0 &&
      safeLog.indexOf('Bearer ') === -1 &&
      safeLog.indexOf('OPENAI_API_KEY') === -1 &&
      safeLog.indexOf('raw_provider') === -1 &&
      safeLog.indexOf('previous_response_id') === -1,
    build: MC_OPENAI_STAGE33_CAPTURE_BUILD,
    stage31Ok: stage31.ok === true,
    stage32ClosedDefaultOff: stage32.ok === true && stage32.blockedDefaultOff === true,
    blockedDefaultOff: blocked.ok === false && blocked.attemptedCallCount === 0,
    requestReady: ready.ok === true,
    fixtureStaticSynthetic: fixture.fixture_id === 'mc_stage33_capture_v1' && fixture.fixture_type === 'synthetic_safe_context',
    promptsDistinct: promptsDistinct,
    callLimit: ready.callLimit,
    retryCount: ready.retryCount,
    fallbackUsed: ready.fallbackUsed,
    timeoutSecondsReady: ready.timeoutSeconds === MC_OPENAI_STAGE33_TIMEOUT_SECONDS && redactedFetch.timeoutSeconds === MC_OPENAI_STAGE33_TIMEOUT_SECONDS,
    preflightEstimatedSpendUsd: MC_OPENAI_STAGE33_PREFLIGHT_ESTIMATED_SPEND_USD,
    costCapBlocked: invalidCost.ok === false,
    safeLogPrefixReady: safeLog.indexOf(MC_OPENAI_STAGE33_LOG_PREFIX) === 0,
    providerCall: false,
    credentialValueReturned: false,
    scriptPropertiesChanged: false,
    sheetWrite: false,
    triggerInstall: false,
    visibleRuntimeMutation: false,
    visibleInboxMutation: false,
    dispatch: false,
    externalWrite: false
  };
}

// ── MISSION COMMAND STAGE 3.3R DURABLE SAFE RECEIPTS ────────
// Gate A only: local/synthetic receipt mechanics. No provider calls, live Sheet
// writes, Script Properties reads/writes, routes, triggers, or editor wrapper.
var MC_STAGE33R_RECEIPT_BUILD = 'mmos-20260711-stage3-3r-durable-safe-receipts-gate-a';
var MC_STAGE33R_CONTRACT_VERSION = 'mc_stage_3_3r_receipt_v1';
var MC_STAGE33R_STAGE_ID = '3.3r';
var MC_STAGE33R_FIXTURE_ID = 'mc_stage33_capture_v1';
var MC_STAGE33R_RECEIPT_SHEET_NAME = 'Mission Command Runtime Receipts';
var MC_STAGE33R_SOURCE = 'apps_script_shadow_stage_3_3r';
var MC_STAGE33R_PARENT_RECEIPT_TYPE = 'stage_3_3r_capture_parent';
var MC_STAGE33R_ROLE_RECEIPT_TYPE = 'stage_3_3r_capture_role';
var MC_STAGE33R_PROFILE_ID = 'a1xx-primary';
var MC_STAGE33R_DEVICE_ID = 'a1xx-primary';
var MC_STAGE33R_PRIVACY_CLASS = 'internal_shadow_redacted';
var MC_STAGE33R_RETENTION_CLASS = 'compact_receipt_365_days';
var MC_STAGE33R_LOCK_TIMEOUT_MS = 5000;
var MC_STAGE33R_ROLE_ORDER = ['executive_assistant', 'chief_of_staff'];
var MC_STAGE33R_GATE_B1_BUILD = 'mmos-20260711-stage3-3r-gate-b1-adapter-wrapper-prep';
var MC_STAGE33R_GATE_B2_WRAPPER_NAME = 'runMissionCommandStage33RGateB2ApprovedReceiptCaptureOnce';
var MC_STAGE33R_GATE_B2_PROPOSED_RUN_ID = 'mc_stage33r_gate_b2_20260711_manual_002';
var MC_STAGE33R_GATE_B2_MAX_CALL_COUNT = 2;
var MC_STAGE33R_GATE_B2_MAX_ESTIMATED_SPEND_USD = 0.10;
var MC_STAGE33R_RUNTIME_RECEIPT_HEADERS = [
  'receipt_id',
  'profile_id',
  'receipt_type',
  'source',
  'related_object',
  'result',
  'safe_summary',
  'provider_key',
  'model_key',
  'role',
  'latency_ms',
  'input_tokens',
  'cached_input_tokens',
  'cache_write_tokens',
  'output_tokens',
  'reasoning_tokens',
  'retry_count',
  'estimated_cost',
  'fallback_reason',
  'safety_identifier_hash',
  'created_at',
  'device_id',
  'request_id',
  'privacy_class',
  'retention_class',
  'next_action',
  'team_chat_receipt_url',
  'version',
  'etag',
  'updated_at',
  'updated_by',
  'last_request_id'
];

function getMissionCommandStage33RReceiptFlags(overrides) {
  var flags = {
    stage33RReceiptLayerEnabled: false,
    liveSheetWriteEnabled: false,
    providerExecutionEnabled: false,
    scriptPropertiesEnabled: false,
    approvedManualRun: false,
    visibleDeliveryEnabled: false,
    dispatchEnabled: false,
    externalWritesEnabled: false,
    triggerEnabled: false
  };
  overrides = overrides || {};
  Object.keys(flags).forEach(function(key) {
    flags[key] = overrides[key] === true;
  });
  return flags;
}

function canonicalizeMissionCommandStage33RValue(value) {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(canonicalizeMissionCommandStage33RValue);
  var result = {};
  Object.keys(value).sort().forEach(function(key) {
    result[key] = canonicalizeMissionCommandStage33RValue(value[key]);
  });
  return result;
}

function stringifyMissionCommandStage33RCanonical(value) {
  return JSON.stringify(canonicalizeMissionCommandStage33RValue(value || {}));
}

function hashMissionCommandStage33RText(text) {
  text = String(text || '');
  if (typeof Utilities !== 'undefined' && Utilities.computeDigest) {
    try {
      var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text);
      return digest.map(function(byte) {
        var value = byte;
        if (value < 0) value += 256;
        return ('0' + value.toString(16)).slice(-2);
      }).join('');
    } catch (err) {}
  }
  var hash = 0;
  for (var i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash = hash & hash;
  }
  return 'local_' + Math.abs(hash).toString(36);
}

function makeMissionCommandStage33RCaptureKey(oneTimeRunId) {
  var runId = sanitizeMissionCommandOpenAiShadowTextV31(oneTimeRunId || '', 120);
  if (!runId) return '';
  var payload = [
    MC_STAGE33R_CONTRACT_VERSION,
    MC_STAGE33R_STAGE_ID,
    MC_STAGE33R_FIXTURE_ID,
    MC_STAGE33R_ROLE_ORDER.join('|'),
    runId
  ].join('|');
  return hashMissionCommandStage33RText(payload);
}

function makeMissionCommandStage33RShortKey(captureKey) {
  return String(captureKey || '').replace(/[^a-zA-Z0-9_]/g, '').slice(0, 16) || 'missing_key';
}

function makeMissionCommandStage33RReceiptId(kind, captureKey, role) {
  var suffix = makeMissionCommandStage33RShortKey(captureKey);
  if (kind === 'parent') return 'rcp_mc33r_parent_' + suffix;
  if (role === 'executive_assistant') return 'rcp_mc33r_ea_' + suffix;
  if (role === 'chief_of_staff') return 'rcp_mc33r_cos_' + suffix;
  return 'rcp_mc33r_role_' + suffix;
}

function getMissionCommandStage33RRequiredReceiptHeaders() {
  return MC_STAGE33R_RUNTIME_RECEIPT_HEADERS.slice();
}

function validateMissionCommandStage33RReceiptHeaders(headers) {
  headers = headers || [];
  var missing = getMissionCommandStage33RRequiredReceiptHeaders().filter(function(header) {
    return headers.indexOf(header) === -1;
  });
  return {
    ok: missing.length === 0,
    missing: missing
  };
}

function makeMissionCommandStage33RBlockedResult(reason, detail) {
  return {
    ok: false,
    status: 'blocked',
    build: MC_STAGE33R_RECEIPT_BUILD,
    stopCondition: sanitizeMissionCommandOpenAiShadowTextV31(reason || 'stage_3_3r_blocked', 120),
    safeDetail: sanitizeMissionCommandOpenAiShadowTextV31(detail || '', 240),
    providerCallAttempted: false,
    liveSheetWrite: false,
    scriptPropertiesAccessed: false,
    routeCreated: false,
    triggerInstall: false,
    visibleDelivery: false,
    dispatch: false,
    externalWrite: false
  };
}

function getMissionCommandStage33RForbiddenReceiptPatterns() {
  return [
    /api[_ -]?key/i,
    /authorization/i,
    /bearer/i,
    /script\s*property/i,
    /raw[_ -]?prompt/i,
    /raw[_ -]?provider/i,
    /raw[_ -]?response/i,
    /provider[_ -]?envelope/i,
    /hidden[_ -]?reasoning/i,
    /chain[_ -]?of[_ -]?thought/i,
    /previous_response_id/i,
    /conversation[_ -]?id/i,
    /team_chat_receipt_url[^\\\"]*https?:/i,
    /visible[_ -]?inbox/i,
    /dispatch[_ -]?job/i
  ];
}

function assertMissionCommandStage33RReceiptSafe(value) {
  var text = '';
  try {
    text = JSON.stringify(value || {});
  } catch (err) {
    return { ok: false, reason: 'receipt_not_serializable' };
  }
  text = text
    .replace(/"raw_prompt_stored":false/g, '')
    .replace(/"raw_response_stored":false/g, '')
    .replace(/"credential_stored":false/g, '')
    .replace(/"visible_delivery":false/g, '')
    .replace(/"dispatch":false/g, '')
    .replace(/"external_write":false/g, '')
    .replace(/"provider_conversation":false/g, '')
    .replace(/"previous_response_id":false/g, '')
    .replace(/raw_prompt_stored/g, 'boundary_flag')
    .replace(/raw_response_stored/g, 'boundary_flag')
    .replace(/credential_stored/g, 'boundary_flag')
    .replace(/visible_delivery/g, 'boundary_flag')
    .replace(/external_write/g, 'boundary_flag')
    .replace(/provider_conversation/g, 'boundary_flag')
    .replace(/previous_response_id/g, 'boundary_flag');
  var matched = getMissionCommandStage33RForbiddenReceiptPatterns().filter(function(pattern) {
    return pattern.test(text);
  });
  return {
    ok: matched.length === 0,
    reason: matched.length ? 'unsafe_receipt_field' : ''
  };
}

function makeMissionCommandStage33RSafeSummary(data) {
  data = data || {};
  var summary = {
    stage_id: MC_STAGE33R_STAGE_ID,
    fixture_id: MC_STAGE33R_FIXTURE_ID,
    synthetic_fixture: true,
    requested_roles: MC_STAGE33R_ROLE_ORDER.slice(),
    capture_key: sanitizeMissionCommandOpenAiShadowTextV31(data.captureKey || '', 140),
    children_expected: safeMissionCommandOpenAiNumberV31(data.childrenExpected || 0),
    children_written: safeMissionCommandOpenAiNumberV31(data.childrenWritten || 0),
    children_valid: safeMissionCommandOpenAiNumberV31(data.childrenValid || 0),
    role: sanitizeMissionCommandOpenAiShadowTextV31(data.role || '', 80),
    role_status: sanitizeMissionCommandOpenAiShadowTextV31(data.roleStatus || '', 80),
    schema_valid: data.schemaValid === true,
    candidate_evidence: sanitizeMissionCommandOpenAiShadowTextV31(data.candidateEvidence || '', 140),
    child_receipt_ids: (data.childReceiptIds || []).slice(0, 2).map(function(id) {
      return sanitizeMissionCommandOpenAiShadowTextV31(id, 140);
    }),
    fallback_code: sanitizeMissionCommandOpenAiShadowTextV31(data.fallbackCode || '', 100),
    boundaries: {
      raw_prompt_stored: false,
      raw_response_stored: false,
      credential_stored: false,
      visible_delivery: false,
      dispatch: false,
      external_write: false,
      provider_conversation: false,
      previous_response_id: false
    }
  };
  var safety = assertMissionCommandStage33RReceiptSafe(summary);
  if (!safety.ok) return { ok: false, value: '', reason: safety.reason };
  return { ok: true, value: stringifyMissionCommandStage33RCanonical(summary), reason: '' };
}

function makeMissionCommandStage33RRuntimeReceiptRow(input) {
  input = input || {};
  var now = input.now || new Date().toISOString();
  var safeSummary = makeMissionCommandStage33RSafeSummary(input.safeSummary || {});
  if (!safeSummary.ok) return { ok: false, reason: safeSummary.reason, row: null };
  var row = {
    receipt_id: sanitizeMissionCommandOpenAiShadowTextV31(input.receiptId || '', 160),
    profile_id: MC_STAGE33R_PROFILE_ID,
    receipt_type: sanitizeMissionCommandOpenAiShadowTextV31(input.receiptType || '', 120),
    source: MC_STAGE33R_SOURCE,
    related_object: sanitizeMissionCommandOpenAiShadowTextV31(input.relatedObject || '', 180),
    result: sanitizeMissionCommandOpenAiShadowTextV31(input.result || 'receipt_draft', 80),
    safe_summary: safeSummary.value,
    provider_key: sanitizeMissionCommandOpenAiShadowTextV31(input.providerKey || '', 80),
    model_key: sanitizeMissionCommandOpenAiShadowTextV31(input.modelKey || '', 120),
    role: sanitizeMissionCommandOpenAiShadowTextV31(input.role || '', 120),
    latency_ms: safeMissionCommandOpenAiNumberV31(input.latencyMs),
    input_tokens: safeMissionCommandOpenAiNumberV31(input.inputTokens),
    cached_input_tokens: safeMissionCommandOpenAiNumberV31(input.cachedInputTokens),
    cache_write_tokens: safeMissionCommandOpenAiNumberV31(input.cacheWriteTokens),
    output_tokens: safeMissionCommandOpenAiNumberV31(input.outputTokens),
    reasoning_tokens: safeMissionCommandOpenAiNumberV31(input.reasoningTokens),
    retry_count: 0,
    estimated_cost: Math.max(0, Number(input.estimatedCost || 0)),
    fallback_reason: sanitizeMissionCommandOpenAiShadowTextV31(input.fallbackReason || '', 120),
    safety_identifier_hash: makeMissionCommandOpenAiSafetyIdentifierV31('a1xx-primary-stage33r'),
    created_at: now,
    device_id: MC_STAGE33R_DEVICE_ID,
    request_id: sanitizeMissionCommandOpenAiShadowTextV31(input.requestId || '', 140),
    privacy_class: MC_STAGE33R_PRIVACY_CLASS,
    retention_class: MC_STAGE33R_RETENTION_CLASS,
    next_action: sanitizeMissionCommandOpenAiShadowTextV31(input.nextAction || 'A1XX reviews the compact Stage 3.3R receipt before any next gate.', 240),
    team_chat_receipt_url: '',
    version: safeMissionCommandOpenAiNumberV31(input.version || 1),
    etag: sanitizeMissionCommandOpenAiShadowTextV31(input.etag || ('etag_' + hashMissionCommandStage33RText(now + (input.receiptId || ''))), 120),
    updated_at: now,
    updated_by: 'integration_gate_a_local',
    last_request_id: sanitizeMissionCommandOpenAiShadowTextV31(input.requestId || '', 140)
  };
  var safety = assertMissionCommandStage33RReceiptSafe(row);
  return {
    ok: safety.ok,
    reason: safety.reason,
    row: safety.ok ? row : null
  };
}

function makeMissionCommandStage33RLocalReceiptAdapter(headers, rows, options) {
  options = options || {};
  return {
    headers: headers || getMissionCommandStage33RRequiredReceiptHeaders(),
    rows: (rows || []).slice(),
    lockAvailable: options.lockAvailable !== false,
    appendFails: options.appendFails === true,
    updateFails: options.updateFails === true,
    lockEvents: [],
    appendedRows: 0,
    updatedRows: 0,
    acquireLock: function(label) {
      this.lockEvents.push('acquire:' + label);
      return this.lockAvailable === true;
    },
    releaseLock: function(label) {
      this.lockEvents.push('release:' + label);
    },
    refreshRows: function() {
      return true;
    },
    appendRowObject: function(row) {
      if (this.appendFails) throw new Error('local_append_failed');
      this.rows.push(row);
      this.appendedRows += 1;
      return this.rows.length;
    },
    updateRowObject: function(index, row, expected) {
      if (this.updateFails) throw new Error('local_update_failed');
      expected = expected || {};
      var current = this.rows[index];
      if (!current) throw new Error('local_update_missing_row');
      if (Object.prototype.hasOwnProperty.call(expected, 'version') && safeMissionCommandOpenAiNumberV31(current.version) !== safeMissionCommandOpenAiNumberV31(expected.version)) {
        throw new Error('local_update_version_conflict');
      }
      if (Object.prototype.hasOwnProperty.call(expected, 'etag') && String(current.etag || '') !== String(expected.etag || '')) {
        throw new Error('local_update_etag_conflict');
      }
      this.rows[index] = row;
      this.updatedRows += 1;
      return index + 1;
    }
  };
}

function makeMissionCommandStage33RRowValues(row, headers) {
  row = row || {};
  headers = headers || getMissionCommandStage33RRequiredReceiptHeaders();
  return headers.map(function(header) {
    return Object.prototype.hasOwnProperty.call(row, header) ? row[header] : '';
  });
}

function makeMissionCommandStage33RRowObject(headers, values) {
  var row = {};
  headers = headers || [];
  values = values || [];
  headers.forEach(function(header, index) {
    row[String(header || '')] = values[index];
  });
  return row;
}

function makeMissionCommandStage33RLiveReceiptAdapter(options) {
  options = options || {};
  var spreadsheet = options.spreadsheet || getMoneyMissionSpreadsheet();
  var sheet = spreadsheet && spreadsheet.getSheetByName ? spreadsheet.getSheetByName(MC_STAGE33R_RECEIPT_SHEET_NAME) : null;
  if (!sheet) throw new Error('stage_3_3r_runtime_receipts_sheet_missing');
  var lock = options.lock || LockService.getScriptLock();
  return {
    headers: getMissionCommandStage33RRequiredReceiptHeaders(),
    rows: [],
    lockEvents: [],
    appendedRows: 0,
    updatedRows: 0,
    acquireLock: function(label) {
      this.lockEvents.push('acquire:' + label);
      return lock.tryLock(MC_STAGE33R_LOCK_TIMEOUT_MS) === true;
    },
    releaseLock: function(label) {
      this.lockEvents.push('release:' + label);
      try {
        lock.releaseLock();
      } catch (err) {}
    },
    refreshRows: function() {
      var lastColumn = Math.max(1, sheet.getLastColumn());
      var refreshedHeaders = sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(function(header) {
        return String(header || '').trim();
      });
      var headerCheck = validateMissionCommandStage33RReceiptHeaders(refreshedHeaders);
      if (!headerCheck.ok) throw new Error('stage_3_3r_runtime_receipts_headers_missing:' + headerCheck.missing.join(','));
      var lastRow = Math.max(1, sheet.getLastRow());
      var values = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues() : [];
      this.headers = refreshedHeaders;
      this.rows = values.map(function(valuesRow) {
        return makeMissionCommandStage33RRowObject(refreshedHeaders, valuesRow);
      });
      return true;
    },
    appendRowObject: function(row) {
      var rowValues = makeMissionCommandStage33RRowValues(row, this.headers);
      sheet.appendRow(rowValues);
      this.rows.push(row);
      this.appendedRows += 1;
      return this.rows.length + 1;
    },
    updateRowObject: function(index, row, expected) {
      expected = expected || {};
      var current = this.rows[index];
      if (!current) throw new Error('live_update_missing_row');
      if (Object.prototype.hasOwnProperty.call(expected, 'version') && safeMissionCommandOpenAiNumberV31(current.version) !== safeMissionCommandOpenAiNumberV31(expected.version)) {
        throw new Error('live_update_version_conflict');
      }
      if (Object.prototype.hasOwnProperty.call(expected, 'etag') && String(current.etag || '') !== String(expected.etag || '')) {
        throw new Error('live_update_etag_conflict');
      }
      sheet.getRange(index + 2, 1, 1, this.headers.length).setValues([makeMissionCommandStage33RRowValues(row, this.headers)]);
      this.rows[index] = row;
      this.updatedRows += 1;
      return index + 2;
    }
  };
}

function refreshMissionCommandStage33RAdapterUnderLock(adapter) {
  if (!adapter) return { ok: false, stopCondition: 'receipt_adapter_missing', missing: [] };
  if (typeof adapter.refreshRows === 'function') adapter.refreshRows();
  var headerCheck = validateMissionCommandStage33RReceiptHeaders(adapter.headers);
  if (!headerCheck.ok) {
    return {
      ok: false,
      stopCondition: 'receipt_contract_invalid',
      missing: headerCheck.missing
    };
  }
  return { ok: true, stopCondition: '', missing: [] };
}

function findMissionCommandStage33RRowsByCaptureKey(adapter, captureKey) {
  var related = 'mc33r:' + captureKey;
  return (adapter.rows || []).map(function(row, index) {
    return { row: row, index: index };
  }).filter(function(entry) {
    return entry.row.related_object === related;
  });
}

function findMissionCommandStage33RParent(adapter, captureKey) {
  var rows = findMissionCommandStage33RRowsByCaptureKey(adapter, captureKey);
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].row.receipt_type === MC_STAGE33R_PARENT_RECEIPT_TYPE) return rows[i];
  }
  return null;
}

function findMissionCommandStage33RChild(adapter, captureKey, role) {
  var rows = findMissionCommandStage33RRowsByCaptureKey(adapter, captureKey);
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].row.receipt_type === MC_STAGE33R_ROLE_RECEIPT_TYPE && rows[i].row.role === role) return rows[i];
  }
  return null;
}

function claimMissionCommandStage33RParentReceipt(adapter, runId) {
  var captureKey = makeMissionCommandStage33RCaptureKey(runId);
  if (!captureKey) return makeMissionCommandStage33RBlockedResult('missing_run_id', 'A one-time run ID is required.');
  if (!adapter.acquireLock('parent_claim')) return makeMissionCommandStage33RBlockedResult('lock_unavailable', 'Parent claim lock was unavailable.');
  try {
    var refresh = refreshMissionCommandStage33RAdapterUnderLock(adapter);
    if (!refresh.ok) return makeMissionCommandStage33RBlockedResult(refresh.stopCondition, 'Missing Runtime Receipts columns: ' + refresh.missing.join(', '));
    var existing = findMissionCommandStage33RParent(adapter, captureKey);
    if (existing) {
      return {
        ok: false,
        status: 'duplicate_suppressed',
        build: MC_STAGE33R_RECEIPT_BUILD,
        captureKey: captureKey,
        relatedObject: 'mc33r:' + captureKey,
        receiptId: existing.row.receipt_id,
        providerCallAttempted: false,
        appendedRows: 0,
        liveSheetWrite: false,
        externalWrite: false
      };
    }
    var receiptId = makeMissionCommandStage33RReceiptId('parent', captureKey);
    var made = makeMissionCommandStage33RRuntimeReceiptRow({
      receiptId: receiptId,
      receiptType: MC_STAGE33R_PARENT_RECEIPT_TYPE,
      relatedObject: 'mc33r:' + captureKey,
      result: 'receipt_draft',
      role: MC_STAGE33R_ROLE_ORDER.join('+'),
      requestId: runId,
      fallbackReason: '',
      safeSummary: {
        captureKey: captureKey,
        childrenExpected: 2,
        childrenWritten: 0,
        childrenValid: 0,
        fallbackCode: ''
      }
    });
    if (!made.ok) return makeMissionCommandStage33RBlockedResult(made.reason, 'Parent receipt failed redaction.');
    adapter.appendRowObject(made.row);
    return {
      ok: true,
      status: 'receipt_draft',
      build: MC_STAGE33R_RECEIPT_BUILD,
      captureKey: captureKey,
      relatedObject: 'mc33r:' + captureKey,
      receiptId: receiptId,
      providerCallAttempted: false,
      appendedRows: 1,
      liveSheetWrite: false,
      externalWrite: false
    };
  } catch (err) {
    return makeMissionCommandStage33RBlockedResult('receipt_claim_failed', 'Parent claim append failed before provider work.');
  } finally {
    adapter.releaseLock('parent_claim');
  }
}

function makeMissionCommandStage33RCandidateEvidence(candidate) {
  var validation = validateMissionCommandOpenAiStage33Candidate(candidate, normalizeMissionCommandOpenAiRoleV31(candidate && candidate.role));
  if (!validation.ok) return { ok: false, evidence: '', errors: validation.errors };
  return {
    ok: true,
    evidence: 'sha256:' + hashMissionCommandStage33RText(stringifyMissionCommandStage33RCanonical(validation.candidate)),
    errors: []
  };
}

function appendMissionCommandStage33RChildReceipt(adapter, runId, role, candidate, meta) {
  meta = meta || {};
  role = normalizeMissionCommandOpenAiRoleV31(role);
  var captureKey = makeMissionCommandStage33RCaptureKey(runId);
  if (!captureKey || MC_STAGE33R_ROLE_ORDER.indexOf(role) === -1) return makeMissionCommandStage33RBlockedResult('invalid_child_request', 'Stage 3.3R child receipt role or run ID is invalid.');
  var evidence = makeMissionCommandStage33RCandidateEvidence(candidate || {});
  if (!adapter.acquireLock('child_append_' + role)) return makeMissionCommandStage33RBlockedResult('lock_unavailable', 'Child append lock was unavailable.');
  try {
    var refresh = refreshMissionCommandStage33RAdapterUnderLock(adapter);
    if (!refresh.ok) return makeMissionCommandStage33RBlockedResult(refresh.stopCondition, 'Missing Runtime Receipts columns: ' + refresh.missing.join(', '));
    if (!findMissionCommandStage33RParent(adapter, captureKey)) return makeMissionCommandStage33RBlockedResult('parent_missing', 'Parent receipt claim must exist before role child append.');
    var existing = findMissionCommandStage33RChild(adapter, captureKey, role);
    if (existing) {
      return {
        ok: false,
        status: 'duplicate_child_suppressed',
        build: MC_STAGE33R_RECEIPT_BUILD,
        captureKey: captureKey,
        receiptId: existing.row.receipt_id,
        providerCallAttempted: false,
        appendedRows: 0,
        liveSheetWrite: false
      };
    }
    var receiptId = makeMissionCommandStage33RReceiptId('child', captureKey, role);
    var result = evidence.ok ? 'logged' : 'failed';
    var made = makeMissionCommandStage33RRuntimeReceiptRow({
      receiptId: receiptId,
      receiptType: MC_STAGE33R_ROLE_RECEIPT_TYPE,
      relatedObject: 'mc33r:' + captureKey,
      result: result,
      role: role,
      requestId: runId,
      providerKey: 'openai',
      modelKey: MC_OPENAI_STAGE33_MODEL,
      latencyMs: meta.latencyMs || 0,
      inputTokens: meta.inputTokens || 0,
      cachedInputTokens: meta.cachedInputTokens || 0,
      cacheWriteTokens: meta.cacheWriteTokens || 0,
      outputTokens: meta.outputTokens || 0,
      reasoningTokens: meta.reasoningTokens || 0,
      estimatedCost: meta.estimatedCost || 0,
      fallbackReason: evidence.ok ? 'none' : 'schema_invalid',
      safeSummary: {
        captureKey: captureKey,
        role: role,
        roleStatus: evidence.ok ? 'capture_valid' : 'schema_invalid',
        schemaValid: evidence.ok,
        candidateEvidence: evidence.evidence,
        childrenExpected: 0,
        childrenWritten: 0,
        childrenValid: evidence.ok ? 1 : 0,
        fallbackCode: evidence.ok ? 'none' : 'schema_invalid'
      }
    });
    if (!made.ok) return makeMissionCommandStage33RBlockedResult(made.reason, 'Child receipt failed redaction.');
    adapter.appendRowObject(made.row);
    return {
      ok: evidence.ok,
      status: result,
      build: MC_STAGE33R_RECEIPT_BUILD,
      captureKey: captureKey,
      receiptId: receiptId,
      role: role,
      candidateEvidence: evidence.evidence,
      providerCallAttempted: false,
      appendedRows: 1,
      liveSheetWrite: false
    };
  } catch (err) {
    return makeMissionCommandStage33RBlockedResult('child_append_failed', 'Child receipt append failed without provider retry authority.');
  } finally {
    adapter.releaseLock('child_append_' + role);
  }
}

function finalizeMissionCommandStage33RParentReceipt(adapter, runId, expected) {
  var captureKey = makeMissionCommandStage33RCaptureKey(runId);
  expected = expected || {};
  if (!captureKey) return makeMissionCommandStage33RBlockedResult('missing_run_id', 'A one-time run ID is required.');
  if (!adapter.acquireLock('parent_finalize')) return makeMissionCommandStage33RBlockedResult('lock_unavailable', 'Parent finalization lock was unavailable.');
  try {
    var refresh = refreshMissionCommandStage33RAdapterUnderLock(adapter);
    if (!refresh.ok) return makeMissionCommandStage33RBlockedResult(refresh.stopCondition, 'Missing Runtime Receipts columns: ' + refresh.missing.join(', '));
    var parent = findMissionCommandStage33RParent(adapter, captureKey);
    if (!parent) return makeMissionCommandStage33RBlockedResult('parent_missing', 'Parent receipt cannot be finalized because it does not exist.');
    var currentVersion = safeMissionCommandOpenAiNumberV31(parent.row.version);
    var currentEtag = String(parent.row.etag || '');
    var expectedVersion = Object.prototype.hasOwnProperty.call(expected, 'version') ? safeMissionCommandOpenAiNumberV31(expected.version) : currentVersion;
    var expectedEtag = Object.prototype.hasOwnProperty.call(expected, 'etag') ? String(expected.etag || '') : currentEtag;
    if (currentVersion !== expectedVersion || currentEtag !== expectedEtag) {
      return makeMissionCommandStage33RBlockedResult('receipt_conflict', 'Parent receipt version/etag changed before finalization.');
    }
    var children = MC_STAGE33R_ROLE_ORDER.map(function(role) {
      return findMissionCommandStage33RChild(adapter, captureKey, role);
    }).filter(function(entry) { return !!entry; });
    var validChildren = children.filter(function(entry) { return entry.row.result === 'logged'; });
    var now = new Date().toISOString();
    var parentRow = {};
    Object.keys(parent.row).forEach(function(key) { parentRow[key] = parent.row[key]; });
    var finalResult = validChildren.length === 2 ? 'logged' : 'failed';
    var childIds = children.map(function(entry) { return entry.row.receipt_id; });
    var safeSummary = makeMissionCommandStage33RSafeSummary({
      captureKey: captureKey,
      childrenExpected: 2,
      childrenWritten: children.length,
      childrenValid: validChildren.length,
      childReceiptIds: childIds,
      fallbackCode: finalResult === 'logged' ? 'none' : 'partial_or_interrupted'
    });
    if (!safeSummary.ok) return makeMissionCommandStage33RBlockedResult(safeSummary.reason, 'Parent final summary failed redaction.');
    parentRow.result = finalResult;
    parentRow.safe_summary = safeSummary.value;
    parentRow.version = currentVersion + 1;
    parentRow.etag = 'etag_' + hashMissionCommandStage33RText(now + parentRow.receipt_id + parentRow.version);
    parentRow.updated_at = now;
    parentRow.updated_by = 'integration_gate_a_local';
    parentRow.last_request_id = runId;
    parentRow.fallback_reason = finalResult === 'logged' ? 'none' : 'partial_or_interrupted';
    adapter.updateRowObject(parent.index, parentRow, { version: currentVersion, etag: currentEtag });
    return {
      ok: finalResult === 'logged',
      status: finalResult,
      build: MC_STAGE33R_RECEIPT_BUILD,
      captureKey: captureKey,
      receiptId: parentRow.receipt_id,
      childrenWritten: children.length,
      childrenValid: validChildren.length,
      providerCallAttempted: false,
      updatedRows: 1,
      liveSheetWrite: false
    };
  } catch (err) {
    return makeMissionCommandStage33RBlockedResult('parent_finalize_failed', 'Parent finalization failed without provider retry authority.');
  } finally {
    adapter.releaseLock('parent_finalize');
  }
}

function getMissionCommandStage33RValidFixtureCandidate(role) {
  role = normalizeMissionCommandOpenAiRoleV31(role);
  return {
    role: role,
    message_type: role === 'executive_assistant' ? 'brief' : 'coordination',
    priority: role === 'executive_assistant' ? 'high' : 'normal',
    title: role === 'executive_assistant' ? 'Review the blocked output first' : 'Coordinate the synthetic review order',
    body: role === 'executive_assistant' ? 'One synthetic output draft needs A1XX review before the next move.' : 'The synthetic fixture has one output review, one missing reference, and one returned content draft.',
    why_it_matters: 'This is fixed synthetic Stage 3.3R evidence only.',
    next_move: role === 'executive_assistant' ? 'Review the output draft first.' : 'Escalate the output review and park the missing reference.',
    question: '',
    source_labels: role === 'executive_assistant' ? ['synthetic_fixture:output_review'] : ['synthetic_fixture:client_project', 'synthetic_fixture:agent_return'],
    grounding_state: 'sourced',
    confidence: 0.8,
    should_deliver: false,
    blocked_reason: ''
  };
}

function getMissionCommandStage33RGateB2Preflight(input) {
  input = input || {};
  var flags = getMissionCommandStage33RReceiptFlags(input.flags || {});
  var runId = sanitizeMissionCommandOpenAiShadowTextV31(input.oneTimeRunId || '', 140);
  var estimatedCost = Math.max(0, Number(input.estimatedCostUsd || 0));
  var captureKey = makeMissionCommandStage33RCaptureKey(runId);
  var requiredFlagsReady = flags.stage33RReceiptLayerEnabled === true &&
    flags.liveSheetWriteEnabled === true &&
    flags.providerExecutionEnabled === true &&
    flags.scriptPropertiesEnabled === true &&
    flags.approvedManualRun === true &&
    flags.visibleDeliveryEnabled === false &&
    flags.dispatchEnabled === false &&
    flags.externalWritesEnabled === false &&
    flags.triggerEnabled === false;
  var stage33 = getMissionCommandOpenAiStage33Preflight({
    flags: {
      stage33CaptureEnabled: flags.providerExecutionEnabled === true,
      executeProviderCalls: flags.providerExecutionEnabled === true,
      approvedManualRun: flags.approvedManualRun === true,
      scriptPropertyConfirmed: flags.scriptPropertiesEnabled === true,
      visibleDeliveryEnabled: false,
      externalWritesEnabled: false,
      dispatchEnabled: false,
      triggerEnabled: false,
      fallbackEnabled: false
    },
    estimatedCostUsd: estimatedCost
  });
  var stopCondition = '';
  if (!runId) stopCondition = 'missing_run_id';
  else if (runId !== MC_STAGE33R_GATE_B2_PROPOSED_RUN_ID) stopCondition = 'run_id_not_approved';
  else if (!captureKey) stopCondition = 'capture_key_unavailable';
  else if (!requiredFlagsReady) stopCondition = 'gate_b2_flags_not_approved';
  else if (estimatedCost > MC_STAGE33R_GATE_B2_MAX_ESTIMATED_SPEND_USD) stopCondition = 'estimated_cost_cap_exceeded';
  else if (!stage33.ok) stopCondition = stage33.stopCondition || 'stage_3_3_preflight_blocked';
  return {
    ok: stopCondition === '',
    status: stopCondition === '' ? 'preflight_ready' : 'blocked',
    build: MC_STAGE33R_GATE_B1_BUILD,
    stopCondition: stopCondition,
    wrapperName: MC_STAGE33R_GATE_B2_WRAPPER_NAME,
    oneTimeRunId: runId,
    captureKey: captureKey,
    relatedObject: captureKey ? 'mc33r:' + captureKey : '',
    sheetName: MC_STAGE33R_RECEIPT_SHEET_NAME,
    receiptTypes: [MC_STAGE33R_PARENT_RECEIPT_TYPE, MC_STAGE33R_ROLE_RECEIPT_TYPE],
    orderedRoles: MC_STAGE33R_ROLE_ORDER.slice(),
    maxCallCount: MC_STAGE33R_GATE_B2_MAX_CALL_COUNT,
    stage33RequestCount: stage33.ok && stage33.requests ? stage33.requests.length : 0,
    model: MC_OPENAI_STAGE33_MODEL,
    timeoutSeconds: MC_OPENAI_STAGE33_TIMEOUT_SECONDS,
    maxInputTokensPerRole: MC_OPENAI_STAGE33_MAX_INPUT_TOKENS_PER_ROLE,
    maxOutputTokensPerRole: MC_OPENAI_STAGE33_MAX_OUTPUT_TOKENS_PER_ROLE,
    estimatedCostUsd: estimatedCost,
    maxEstimatedSpendUsd: MC_STAGE33R_GATE_B2_MAX_ESTIMATED_SPEND_USD,
    store: false,
    tools: [],
    retryCount: 0,
    fallbackUsed: false,
    providerCallAttempted: false,
    liveSheetWriteAttempted: false,
    visibleDelivery: false,
    dispatch: false,
    externalWrite: false
  };
}

function getMissionCommandStage33RRoleResultsFromCapture(capture) {
  var roles = capture && Array.isArray(capture.roles) ? capture.roles.slice(0, 2) : [];
  var ok = roles.length === 2 &&
    roles[0] &&
    roles[1] &&
    roles[0].role === 'executive_assistant' &&
    roles[1].role === 'chief_of_staff';
  return {
    ok: ok,
    roles: ok ? roles : [],
    stopCondition: ok ? '' : 'role_result_shape_invalid'
  };
}

function runMissionCommandStage33RGateB2ReceiptCapture(input) {
  input = input || {};
  var preflight = getMissionCommandStage33RGateB2Preflight(input);
  if (!preflight.ok) return preflight;
  var adapter;
  try {
    adapter = makeMissionCommandStage33RLiveReceiptAdapter();
  } catch (adapterErr) {
    return makeMissionCommandStage33RBlockedResult('live_receipt_adapter_unavailable', 'Runtime Receipts live adapter could not open the approved sheet/header shape.');
  }
  var parentClaim = claimMissionCommandStage33RParentReceipt(adapter, preflight.oneTimeRunId);
  if (!parentClaim.ok) {
    parentClaim.captureKey = preflight.captureKey;
    parentClaim.relatedObject = preflight.relatedObject;
    return parentClaim;
  }
  var parentBeforeCapture = findMissionCommandStage33RParent(adapter, preflight.captureKey);
  var expectedVersion = parentBeforeCapture ? parentBeforeCapture.row.version : '';
  var expectedEtag = parentBeforeCapture ? parentBeforeCapture.row.etag : '';
  var capture = runMissionCommandOpenAiStage33CaptureBothRoles({
    flags: {
      stage33CaptureEnabled: true,
      executeProviderCalls: true,
      approvedManualRun: true,
      scriptPropertyConfirmed: true,
      visibleDeliveryEnabled: false,
      externalWritesEnabled: false,
      dispatchEnabled: false,
      triggerEnabled: false,
      fallbackEnabled: false
    },
    estimatedCostUsd: preflight.estimatedCostUsd
  });
  var roleShape = getMissionCommandStage33RRoleResultsFromCapture(capture);
  if (!roleShape.ok) {
    var failedFinalize = finalizeMissionCommandStage33RParentReceipt(adapter, preflight.oneTimeRunId, {
      version: expectedVersion,
      etag: expectedEtag
    });
    return {
      ok: false,
      status: failedFinalize.status || 'failed',
      build: MC_STAGE33R_GATE_B1_BUILD,
      wrapperName: MC_STAGE33R_GATE_B2_WRAPPER_NAME,
      oneTimeRunId: preflight.oneTimeRunId,
      captureKey: preflight.captureKey,
      relatedObject: preflight.relatedObject,
      parentReceiptId: parentClaim.receiptId || failedFinalize.receiptId || '',
      childrenWritten: failedFinalize.childrenWritten || 0,
      childrenValid: failedFinalize.childrenValid || 0,
      captureStatus: sanitizeMissionCommandOpenAiShadowTextV31(capture && capture.status || 'capture_unavailable', 80),
      stopCondition: roleShape.stopCondition,
      maxCallCount: MC_STAGE33R_GATE_B2_MAX_CALL_COUNT,
      retryCount: 0,
      fallbackUsed: false,
      visibleDelivery: false,
      dispatch: false,
      externalWrite: false,
      nextAction: 'A1XX reviews failed safe receipt; no automatic retry is authorized.'
    };
  }
  var roleResults = roleShape.roles;
  roleResults.forEach(function(roleResult) {
    appendMissionCommandStage33RChildReceipt(adapter, preflight.oneTimeRunId, roleResult.role, roleResult.candidate || {}, {
      latencyMs: roleResult.latencyMs || 0,
      inputTokens: roleResult.inputTokens || 0,
      cachedInputTokens: roleResult.cachedInputTokens || 0,
      cacheWriteTokens: roleResult.cacheWriteTokens || 0,
      outputTokens: roleResult.outputTokens || 0,
      reasoningTokens: roleResult.reasoningTokens || 0,
      estimatedCost: roleResult.estimatedCost || 0
    });
  });
  var finalized = finalizeMissionCommandStage33RParentReceipt(adapter, preflight.oneTimeRunId, {
    version: expectedVersion,
    etag: expectedEtag
  });
  return {
    ok: finalized.ok === true && capture && capture.ok === true,
    status: finalized.status || 'failed',
    build: MC_STAGE33R_GATE_B1_BUILD,
    wrapperName: MC_STAGE33R_GATE_B2_WRAPPER_NAME,
    oneTimeRunId: preflight.oneTimeRunId,
    captureKey: preflight.captureKey,
    relatedObject: preflight.relatedObject,
    parentReceiptId: parentClaim.receiptId || finalized.receiptId || '',
    childrenWritten: finalized.childrenWritten || 0,
    childrenValid: finalized.childrenValid || 0,
    captureStatus: sanitizeMissionCommandOpenAiShadowTextV31(capture && capture.status || 'capture_unavailable', 80),
    stopCondition: sanitizeMissionCommandOpenAiShadowTextV31(capture && capture.stopCondition || finalized.stopCondition || finalized.status || '', 120),
    maxCallCount: MC_STAGE33R_GATE_B2_MAX_CALL_COUNT,
    retryCount: 0,
    fallbackUsed: false,
    visibleDelivery: false,
    dispatch: false,
    externalWrite: false,
    nextAction: 'A1XX retrieves parent and child rows by related_object, then syncs disabled source.'
  };
}

function runMissionCommandStage33RReceiptLocalChecks() {
  var stage31 = runMissionCommandOpenAiShadowFoundationChecksV31();
  var stage32 = runMissionCommandOpenAiStage32LocalChecks();
  var stage33 = runMissionCommandOpenAiStage33LocalChecks();
  var runId = 'stage33r_gate_a_local_run';
  var missingHeaders = getMissionCommandStage33RRequiredReceiptHeaders().filter(function(header) { return header !== 'safe_summary'; });
  var missingAdapter = makeMissionCommandStage33RLocalReceiptAdapter(missingHeaders, []);
  var missingHeaderResult = claimMissionCommandStage33RParentReceipt(missingAdapter, runId);
  var duplicateKey = makeMissionCommandStage33RCaptureKey(runId);
  var existingParent = makeMissionCommandStage33RRuntimeReceiptRow({
    receiptId: makeMissionCommandStage33RReceiptId('parent', duplicateKey),
    receiptType: MC_STAGE33R_PARENT_RECEIPT_TYPE,
    relatedObject: 'mc33r:' + duplicateKey,
    result: 'receipt_draft',
    role: MC_STAGE33R_ROLE_ORDER.join('+'),
    requestId: runId,
    safeSummary: { captureKey: duplicateKey, childrenExpected: 2, childrenWritten: 0, childrenValid: 0 }
  }).row;
  var duplicateAdapter = makeMissionCommandStage33RLocalReceiptAdapter(null, [existingParent]);
  var duplicateResult = claimMissionCommandStage33RParentReceipt(duplicateAdapter, runId);
  var claimFailAdapter = makeMissionCommandStage33RLocalReceiptAdapter(null, [], { appendFails: true });
  var claimFailResult = claimMissionCommandStage33RParentReceipt(claimFailAdapter, runId);
  var successAdapter = makeMissionCommandStage33RLocalReceiptAdapter(null, []);
  var parent = claimMissionCommandStage33RParentReceipt(successAdapter, runId);
  var parentBeforeFinalize = findMissionCommandStage33RParent(successAdapter, makeMissionCommandStage33RCaptureKey(runId));
  var expectedParentVersion = parentBeforeFinalize ? parentBeforeFinalize.row.version : '';
  var expectedParentEtag = parentBeforeFinalize ? parentBeforeFinalize.row.etag : '';
  var childEa = appendMissionCommandStage33RChildReceipt(successAdapter, runId, 'executive_assistant', getMissionCommandStage33RValidFixtureCandidate('executive_assistant'), { inputTokens: 100, outputTokens: 40, estimatedCost: 0.01 });
  var childCos = appendMissionCommandStage33RChildReceipt(successAdapter, runId, 'chief_of_staff', getMissionCommandStage33RValidFixtureCandidate('chief_of_staff'), { inputTokens: 110, outputTokens: 45, estimatedCost: 0.01 });
  var finalized = finalizeMissionCommandStage33RParentReceipt(successAdapter, runId, { version: expectedParentVersion, etag: expectedParentEtag });
  var staleRunId = 'stage33r_gate_a_stale_run';
  var staleAdapter = makeMissionCommandStage33RLocalReceiptAdapter(null, []);
  claimMissionCommandStage33RParentReceipt(staleAdapter, staleRunId);
  appendMissionCommandStage33RChildReceipt(staleAdapter, staleRunId, 'executive_assistant', getMissionCommandStage33RValidFixtureCandidate('executive_assistant'), {});
  appendMissionCommandStage33RChildReceipt(staleAdapter, staleRunId, 'chief_of_staff', getMissionCommandStage33RValidFixtureCandidate('chief_of_staff'), {});
  var staleCaptureKey = makeMissionCommandStage33RCaptureKey(staleRunId);
  var staleParentBefore = findMissionCommandStage33RParent(staleAdapter, staleCaptureKey);
  var staleParentSnapshot = staleParentBefore ? stringifyMissionCommandStage33RCanonical(staleParentBefore.row) : '';
  var staleFinal = finalizeMissionCommandStage33RParentReceipt(staleAdapter, staleRunId, { version: 999, etag: 'stale_etag' });
  var staleParentAfter = findMissionCommandStage33RParent(staleAdapter, staleCaptureKey);
  var staleParentUnchanged = staleParentAfter ? stringifyMissionCommandStage33RCanonical(staleParentAfter.row) === staleParentSnapshot : false;
  var partialAdapter = makeMissionCommandStage33RLocalReceiptAdapter(null, []);
  claimMissionCommandStage33RParentReceipt(partialAdapter, runId);
  appendMissionCommandStage33RChildReceipt(partialAdapter, runId, 'executive_assistant', getMissionCommandStage33RValidFixtureCandidate('executive_assistant'), {});
  var partialFinal = finalizeMissionCommandStage33RParentReceipt(partialAdapter, runId);
  var evidenceOne = makeMissionCommandStage33RCandidateEvidence(getMissionCommandStage33RValidFixtureCandidate('executive_assistant'));
  var evidenceTwo = makeMissionCommandStage33RCandidateEvidence(getMissionCommandStage33RValidFixtureCandidate('executive_assistant'));
  var unsafeRow = makeMissionCommandStage33RRuntimeReceiptRow({
    receiptId: 'unsafe',
    receiptType: MC_STAGE33R_ROLE_RECEIPT_TYPE,
    relatedObject: 'mc33r:unsafe',
    result: 'logged',
    role: 'executive_assistant',
    requestId: 'unsafe',
    safeSummary: {
      captureKey: 'unsafe',
      role: 'executive_assistant',
      candidateEvidence: 'raw_prompt: should fail'
    }
  });
  var lockFailAdapter = makeMissionCommandStage33RLocalReceiptAdapter(null, [], { lockAvailable: false });
  var lockFail = claimMissionCommandStage33RParentReceipt(lockFailAdapter, runId);
  var defaultFlags = getMissionCommandStage33RReceiptFlags();
  var defaultFlagsClosed = Object.keys(defaultFlags).every(function(key) { return defaultFlags[key] === false; });
  var allRowsSafe = successAdapter.rows.every(function(row) {
    return assertMissionCommandStage33RReceiptSafe(row).ok === true &&
      row.team_chat_receipt_url === '' &&
      row.privacy_class === MC_STAGE33R_PRIVACY_CLASS &&
      row.retention_class === MC_STAGE33R_RETENTION_CLASS;
  });
  return {
    ok: stage31.ok === true &&
      stage32.ok === true &&
      stage32.blockedDefaultOff === true &&
      stage33.ok === true &&
      stage33.blockedDefaultOff === true &&
      missingHeaderResult.ok === false &&
      missingHeaderResult.stopCondition === 'receipt_contract_invalid' &&
      duplicateResult.status === 'duplicate_suppressed' &&
      duplicateAdapter.appendedRows === 0 &&
      claimFailResult.ok === false &&
      claimFailResult.stopCondition === 'receipt_claim_failed' &&
      parent.ok === true &&
      childEa.ok === true &&
      childCos.ok === true &&
      finalized.ok === true &&
      staleFinal.ok === false &&
      staleFinal.stopCondition === 'receipt_conflict' &&
      staleParentUnchanged === true &&
      successAdapter.rows.length === 3 &&
      partialFinal.ok === false &&
      partialFinal.status === 'failed' &&
      partialAdapter.rows.length === 2 &&
      evidenceOne.ok === true &&
      evidenceOne.evidence === evidenceTwo.evidence &&
      unsafeRow.ok === false &&
      lockFail.ok === false &&
      lockFail.stopCondition === 'lock_unavailable' &&
      defaultFlagsClosed === true &&
      allRowsSafe === true,
    build: MC_STAGE33R_RECEIPT_BUILD,
    stage31Ok: stage31.ok === true,
    stage32ClosedDefaultOff: stage32.ok === true && stage32.blockedDefaultOff === true,
    stage33ClosedDefaultOff: stage33.ok === true && stage33.blockedDefaultOff === true,
    missingInvalidHeadersFailClosed: missingHeaderResult.ok === false,
    duplicateParentSuppressed: duplicateResult.status === 'duplicate_suppressed',
    duplicateProviderCallAttempted: false,
    duplicateAppendedRows: duplicateAdapter.appendedRows,
    claimFailureProviderCallAttempted: false,
    staleWriteBlocked: staleFinal.ok === false && staleFinal.stopCondition === 'receipt_conflict',
    staleParentUnchanged: staleParentUnchanged,
    staleWriteProviderCallAttempted: false,
    syntheticSuccessRows: successAdapter.rows.length,
    partialRowsPreserved: partialAdapter.rows.length,
    partialResult: partialFinal.status,
    deterministicCandidateEvidence: evidenceOne.ok === true && evidenceOne.evidence === evidenceTwo.evidence,
    unsafeFieldsRejected: unsafeRow.ok === false,
    lockUnavailableFailsClosed: lockFail.ok === false,
    defaultFlagsClosed: defaultFlagsClosed,
    lockEvents: successAdapter.lockEvents,
    providerCall: false,
    liveSheetWrite: false,
    scriptPropertiesAccessed: false,
    routeCreated: false,
    triggerInstall: false,
    visibleRuntimeMutation: false,
    visibleInboxMutation: false,
    dispatch: false,
    externalWrite: false
  };
}

function runMissionCommandStage33RGateB1LocalChecks() {
  var gateA = runMissionCommandStage33RReceiptLocalChecks();
  var proposedRunId = MC_STAGE33R_GATE_B2_PROPOSED_RUN_ID;
  var proposedCaptureKey = makeMissionCommandStage33RCaptureKey(proposedRunId);
  var defaultPreflight = getMissionCommandStage33RGateB2Preflight({});
  var approvedPreflight = getMissionCommandStage33RGateB2Preflight({
    oneTimeRunId: proposedRunId,
    estimatedCostUsd: MC_OPENAI_STAGE33_PREFLIGHT_ESTIMATED_SPEND_USD,
    flags: {
      stage33RReceiptLayerEnabled: true,
      liveSheetWriteEnabled: true,
      providerExecutionEnabled: true,
      scriptPropertiesEnabled: true,
      approvedManualRun: true,
      visibleDeliveryEnabled: false,
      dispatchEnabled: false,
      externalWritesEnabled: false,
      triggerEnabled: false
    }
  });
  var overCostPreflight = getMissionCommandStage33RGateB2Preflight({
    oneTimeRunId: proposedRunId,
    estimatedCostUsd: 0.11,
    flags: {
      stage33RReceiptLayerEnabled: true,
      liveSheetWriteEnabled: true,
      providerExecutionEnabled: true,
      scriptPropertiesEnabled: true,
      approvedManualRun: true
    }
  });
  var wrongRunPreflight = getMissionCommandStage33RGateB2Preflight({
    oneTimeRunId: 'mc_stage33r_unapproved_run',
    estimatedCostUsd: MC_OPENAI_STAGE33_PREFLIGHT_ESTIMATED_SPEND_USD,
    flags: {
      stage33RReceiptLayerEnabled: true,
      liveSheetWriteEnabled: true,
      providerExecutionEnabled: true,
      scriptPropertiesEnabled: true,
      approvedManualRun: true
    }
  });
  var headers = getMissionCommandStage33RRequiredReceiptHeaders();
  var sheetRows = [];
  var stubSheet = {
    getLastColumn: function() { return headers.length; },
    getLastRow: function() { return sheetRows.length + 1; },
    getRange: function(row, column, rowCount, columnCount) {
      return {
        getValues: function() {
          if (row === 1) return [headers.slice(0, columnCount)];
          return sheetRows.slice(row - 2, row - 2 + rowCount).map(function(values) {
            return values.slice(0, columnCount);
          });
        },
        setValues: function(values) {
          sheetRows[row - 2] = values[0].slice();
        }
      };
    },
    appendRow: function(values) {
      sheetRows.push(values.slice());
    }
  };
  var stubSpreadsheet = {
    getSheetByName: function(name) {
      return name === MC_STAGE33R_RECEIPT_SHEET_NAME ? stubSheet : null;
    }
  };
  var stubLock = {
    locked: false,
    tryLock: function(timeoutMs) {
      this.locked = timeoutMs === MC_STAGE33R_LOCK_TIMEOUT_MS;
      return this.locked;
    },
    releaseLock: function() {
      this.locked = false;
    }
  };
  var liveAdapterStub = makeMissionCommandStage33RLiveReceiptAdapter({
    spreadsheet: stubSpreadsheet,
    lock: stubLock
  });
  var parent = claimMissionCommandStage33RParentReceipt(liveAdapterStub, proposedRunId);
  var duplicate = claimMissionCommandStage33RParentReceipt(liveAdapterStub, proposedRunId);
  var parentBeforeFinalize = findMissionCommandStage33RParent(liveAdapterStub, proposedCaptureKey);
  var childEa = appendMissionCommandStage33RChildReceipt(liveAdapterStub, proposedRunId, 'executive_assistant', getMissionCommandStage33RValidFixtureCandidate('executive_assistant'), {});
  var childCos = appendMissionCommandStage33RChildReceipt(liveAdapterStub, proposedRunId, 'chief_of_staff', getMissionCommandStage33RValidFixtureCandidate('chief_of_staff'), {});
  var finalized = finalizeMissionCommandStage33RParentReceipt(liveAdapterStub, proposedRunId, {
    version: parentBeforeFinalize ? parentBeforeFinalize.row.version : '',
    etag: parentBeforeFinalize ? parentBeforeFinalize.row.etag : ''
  });
  var concurrentRows = [];
  var concurrentSheet = {
    getLastColumn: function() { return headers.length; },
    getLastRow: function() { return concurrentRows.length + 1; },
    getRange: function(row, column, rowCount, columnCount) {
      return {
        getValues: function() {
          if (row === 1) return [headers.slice(0, columnCount)];
          return concurrentRows.slice(row - 2, row - 2 + rowCount).map(function(values) {
            return values.slice(0, columnCount);
          });
        },
        setValues: function(values) {
          concurrentRows[row - 2] = values[0].slice();
        }
      };
    },
    appendRow: function(values) {
      concurrentRows.push(values.slice());
    }
  };
  var concurrentSpreadsheet = {
    getSheetByName: function(name) {
      return name === MC_STAGE33R_RECEIPT_SHEET_NAME ? concurrentSheet : null;
    }
  };
  var concurrentLock = {
    tryLock: function(timeoutMs) { return timeoutMs === MC_STAGE33R_LOCK_TIMEOUT_MS; },
    releaseLock: function() {}
  };
  var concurrentAdapterOne = makeMissionCommandStage33RLiveReceiptAdapter({ spreadsheet: concurrentSpreadsheet, lock: concurrentLock });
  var concurrentAdapterTwo = makeMissionCommandStage33RLiveReceiptAdapter({ spreadsheet: concurrentSpreadsheet, lock: concurrentLock });
  var concurrentParentOne = claimMissionCommandStage33RParentReceipt(concurrentAdapterOne, proposedRunId);
  var concurrentParentTwo = claimMissionCommandStage33RParentReceipt(concurrentAdapterTwo, proposedRunId);
  var concurrentParentCount = concurrentRows.map(function(values) {
    return makeMissionCommandStage33RRowObject(headers, values);
  }).filter(function(row) {
    return row.receipt_type === MC_STAGE33R_PARENT_RECEIPT_TYPE &&
      row.related_object === 'mc33r:' + proposedCaptureKey;
  }).length;
  var concurrentChildAdapterOne = makeMissionCommandStage33RLiveReceiptAdapter({ spreadsheet: concurrentSpreadsheet, lock: concurrentLock });
  var concurrentChildAdapterTwo = makeMissionCommandStage33RLiveReceiptAdapter({ spreadsheet: concurrentSpreadsheet, lock: concurrentLock });
  var concurrentChildOne = appendMissionCommandStage33RChildReceipt(concurrentChildAdapterOne, proposedRunId, 'executive_assistant', getMissionCommandStage33RValidFixtureCandidate('executive_assistant'), {});
  var concurrentChildTwo = appendMissionCommandStage33RChildReceipt(concurrentChildAdapterTwo, proposedRunId, 'executive_assistant', getMissionCommandStage33RValidFixtureCandidate('executive_assistant'), {});
  var concurrentRowsAfterChild = concurrentRows.map(function(values) {
    return makeMissionCommandStage33RRowObject(headers, values);
  });
  var concurrentEaChildCount = concurrentRowsAfterChild.filter(function(row) {
    return row.receipt_type === MC_STAGE33R_ROLE_RECEIPT_TYPE &&
      row.role === 'executive_assistant' &&
      row.related_object === 'mc33r:' + proposedCaptureKey;
  }).length;
  var concurrentFinalizeAdapter = makeMissionCommandStage33RLiveReceiptAdapter({ spreadsheet: concurrentSpreadsheet, lock: concurrentLock });
  var concurrentParentBeforeFinalize = concurrentRowsAfterChild.filter(function(row) {
    return row.receipt_type === MC_STAGE33R_PARENT_RECEIPT_TYPE &&
      row.related_object === 'mc33r:' + proposedCaptureKey;
  })[0];
  var concurrentCosChild = appendMissionCommandStage33RChildReceipt(
    makeMissionCommandStage33RLiveReceiptAdapter({ spreadsheet: concurrentSpreadsheet, lock: concurrentLock }),
    proposedRunId,
    'chief_of_staff',
    getMissionCommandStage33RValidFixtureCandidate('chief_of_staff'),
    {}
  );
  var concurrentFinalized = finalizeMissionCommandStage33RParentReceipt(concurrentFinalizeAdapter, proposedRunId, {
    version: concurrentParentBeforeFinalize ? concurrentParentBeforeFinalize.version : '',
    etag: concurrentParentBeforeFinalize ? concurrentParentBeforeFinalize.etag : ''
  });
  var syntheticCapture = makeMissionCommandOpenAiStage33SafeCapture('capture_complete', [
    makeMissionCommandOpenAiStage33RoleResult('executive_assistant', { usage: { input_tokens: 10, output_tokens: 5 } }, {
      status: 'capture_valid',
      structuredOutputValid: true,
      candidate: getMissionCommandStage33RValidFixtureCandidate('executive_assistant')
    }),
    makeMissionCommandOpenAiStage33RoleResult('chief_of_staff', { usage: { input_tokens: 11, output_tokens: 6 } }, {
      status: 'capture_valid',
      structuredOutputValid: true,
      candidate: getMissionCommandStage33RValidFixtureCandidate('chief_of_staff')
    })
  ], { stopCondition: 'manual_capture_complete', estimatedCost: MC_OPENAI_STAGE33_PREFLIGHT_ESTIMATED_SPEND_USD });
  var roleShape = getMissionCommandStage33RRoleResultsFromCapture(syntheticCapture);
  var badRoleShape = getMissionCommandStage33RRoleResultsFromCapture({ roles: [{ role: 'chief_of_staff' }] });
  var flags = getMissionCommandStage33RReceiptFlags();
  var defaultFlagsClosed = Object.keys(flags).every(function(key) { return flags[key] === false; });
  return {
    ok: gateA.ok === true &&
      defaultPreflight.ok === false &&
      approvedPreflight.ok === true &&
      approvedPreflight.wrapperName === MC_STAGE33R_GATE_B2_WRAPPER_NAME &&
      approvedPreflight.oneTimeRunId === proposedRunId &&
      approvedPreflight.captureKey === proposedCaptureKey &&
      approvedPreflight.sheetName === MC_STAGE33R_RECEIPT_SHEET_NAME &&
      approvedPreflight.stage33RequestCount === 2 &&
      approvedPreflight.maxCallCount === 2 &&
      approvedPreflight.estimatedCostUsd <= MC_STAGE33R_GATE_B2_MAX_ESTIMATED_SPEND_USD &&
      overCostPreflight.ok === false &&
      overCostPreflight.stopCondition === 'estimated_cost_cap_exceeded' &&
      wrongRunPreflight.ok === false &&
      wrongRunPreflight.stopCondition === 'run_id_not_approved' &&
      parent.ok === true &&
      duplicate.status === 'duplicate_suppressed' &&
      duplicate.providerCallAttempted === false &&
      childEa.ok === true &&
      childCos.ok === true &&
      finalized.ok === true &&
      liveAdapterStub.rows.length === 3 &&
      sheetRows.length === 3 &&
      liveAdapterStub.updatedRows === 1 &&
      concurrentParentOne.ok === true &&
      concurrentParentTwo.status === 'duplicate_suppressed' &&
      concurrentParentTwo.providerCallAttempted === false &&
      concurrentParentCount === 1 &&
      concurrentChildOne.ok === true &&
      concurrentChildTwo.status === 'duplicate_child_suppressed' &&
      concurrentEaChildCount === 1 &&
      concurrentCosChild.ok === true &&
      concurrentFinalized.ok === true &&
      concurrentFinalized.childrenWritten === 2 &&
      roleShape.ok === true &&
      roleShape.roles.length === 2 &&
      badRoleShape.ok === false &&
      defaultFlagsClosed === true,
    build: MC_STAGE33R_GATE_B1_BUILD,
    gateAOk: gateA.ok === true,
    wrapperName: MC_STAGE33R_GATE_B2_WRAPPER_NAME,
    proposedOneTimeRunId: proposedRunId,
    deterministicCaptureKey: proposedCaptureKey,
    relatedObject: 'mc33r:' + proposedCaptureKey,
    sheetName: MC_STAGE33R_RECEIPT_SHEET_NAME,
    canonicalHeadersPresent: validateMissionCommandStage33RReceiptHeaders(headers).ok === true,
    defaultPreflightBlocked: defaultPreflight.ok === false,
    approvedPreflightReady: approvedPreflight.ok === true,
    overCostBlocked: overCostPreflight.stopCondition === 'estimated_cost_cap_exceeded',
    wrongRunBlocked: wrongRunPreflight.stopCondition === 'run_id_not_approved',
    duplicateSuppressedBeforeProvider: duplicate.status === 'duplicate_suppressed' && duplicate.providerCallAttempted === false,
    concurrentParentRefreshDuplicateSuppressed: concurrentParentTwo.status === 'duplicate_suppressed' && concurrentParentCount === 1,
    concurrentParentRefreshProviderCallAttempted: false,
    concurrentChildRefreshDuplicateSuppressed: concurrentChildTwo.status === 'duplicate_child_suppressed' && concurrentEaChildCount === 1,
    concurrentFinalizeRefreshSawBothChildren: concurrentFinalized.ok === true && concurrentFinalized.childrenWritten === 2,
    stage33CaptureRoleShapeValid: roleShape.ok === true && roleShape.roles.length === 2,
    stage33CaptureRoleShapeInvalidBlocked: badRoleShape.ok === false,
    liveAdapterStubRows: liveAdapterStub.rows.length,
    liveAdapterStubSheetRows: sheetRows.length,
    versionEtagFinalizationUpdatedRows: liveAdapterStub.updatedRows,
    defaultFlagsClosed: defaultFlagsClosed,
    maxCallCount: MC_STAGE33R_GATE_B2_MAX_CALL_COUNT,
    maxEstimatedSpendUsd: MC_STAGE33R_GATE_B2_MAX_ESTIMATED_SPEND_USD,
    timeoutSeconds: MC_OPENAI_STAGE33_TIMEOUT_SECONDS,
    maxInputTokensPerRole: MC_OPENAI_STAGE33_MAX_INPUT_TOKENS_PER_ROLE,
    maxOutputTokensPerRole: MC_OPENAI_STAGE33_MAX_OUTPUT_TOKENS_PER_ROLE,
    providerCall: false,
    liveSheetReadWrite: false,
    scriptPropertiesAccessed: false,
    wrapperInvoked: false,
    routeCreated: false,
    triggerInstall: false,
    visibleRuntimeMutation: false,
    visibleInboxMutation: false,
    dispatch: false,
    externalWrite: false
  };
}

// Mission Command Stage 3.4 Gate B1 deterministic shadow engine port.
// Gate B1 only: pure local decisions and fake receipt rows, with no live source/provider behavior.
var MC_STAGE34_GATE_B1_BUILD = 'mmos-20260712-stage3-4-gate-b1-apps-script-port';
var MC_STAGE34_GATE_B1_CONTRACT_VERSION = 'mc_stage_3_4_shadow_engine_v1';
var MC_STAGE34_GATE_B1_STAGE_ID = '3.4';
var MC_STAGE34_GATE_B1_PROFILE_ID = 'a1xx-primary';
var MC_STAGE34_GATE_B1_SOURCE = 'stage_3_4_shadow_fixture';
var MC_STAGE34_GATE_B1_PRIVACY_CLASS = 'internal_shadow_redacted';
var MC_STAGE34_GATE_B1_RETENTION_CLASS = 'compact_receipt_365_days';
var MC_STAGE34_GATE_B1_FIXTURE_SHA256 = 'e84a369b458669d3c60322e33ad5351d22a7f8078db0e10727b15d0d0202262b';
var MC_STAGE34_GATE_B1_PROVIDER_ENABLED = false;
var MC_STAGE34_GATE_B1_RECEIPT_WRITE_ENABLED = false;
var MC_STAGE34_GATE_B1_SOURCE_READ_ENABLED = false;
var MC_STAGE34_GATE_B1_TRIGGER_ENABLED = false;
var MC_STAGE34_GATE_B1_VISIBLE_DELIVERY_ENABLED = false;
var MC_STAGE34_GATE_B1_DISPATCH_ENABLED = false;
var MC_STAGE34_GATE_B1_KILL_SWITCH = true;
var MC_STAGE34_GATE_B1_REQUIRED_EVENT_FIELDS = [
  'source_class',
  'source_label',
  'event_type',
  'occurred_at',
  'observed_at',
  'status_bucket',
  'due_bucket',
  'owner_bucket',
  'mission_or_project_label',
  'blocker_bucket',
  'review_bucket',
  'safe_summary'
];
var MC_STAGE34_GATE_B1_ALLOWED_SOURCE_CLASSES = ['fixture'];
var MC_STAGE34_GATE_B1_ALLOWED_PRIORITIES = ['critical', 'important', 'routine', 'low'];
var MC_STAGE34_GATE_B1_ALLOWED_FRESHNESS = ['fresh', 'stale', 'partial', 'blocked'];
var MC_STAGE34_GATE_B1_MATERIAL_REOPEN_CODES = [
  'new_critical_approval',
  'missing_input_detected',
  'a1xx_waiting_state_added',
  'review_queue_count_increased',
  'dependency_linked_to_multiple_lanes',
  'stall_threshold_reached',
  'due_bucket_worsened',
  'blocker_cleared',
  'chief_escalation_required',
  'returning_with_current_action',
  'merge_compatible_events_detected'
];
var MC_STAGE34_GATE_B1_ORACLE_FIELDS = [
  'expected_outcome',
  'candidate_text',
  'role_owner',
  'candidate_family_key',
  'suppression_decision',
  'next_move_type',
  'escalated_from'
];

function getMissionCommandStage34GateB1Flags() {
  return {
    provider_call: false,
    live_sheet_read: false,
    live_sheet_write: false,
    runtime_receipt_write: false,
    script_properties_access: false,
    trigger: false,
    worker: false,
    route_ui: false,
    visible_inbox: false,
    dispatch: false,
    external_write: false,
    team_chat_notion_api: false,
    production_html: false,
    apps_script_edit: false,
    stage4: false,
    workstream_e: false,
    gate_b2: false,
    gate_b3: false
  };
}

function getMissionCommandStage34GateB1FeatureFlags() {
  return {
    build: MC_STAGE34_GATE_B1_BUILD,
    contractVersion: MC_STAGE34_GATE_B1_CONTRACT_VERSION,
    providerEnabled: MC_STAGE34_GATE_B1_PROVIDER_ENABLED,
    receiptWriteEnabled: MC_STAGE34_GATE_B1_RECEIPT_WRITE_ENABLED,
    sourceReadEnabled: MC_STAGE34_GATE_B1_SOURCE_READ_ENABLED,
    triggerEnabled: MC_STAGE34_GATE_B1_TRIGGER_ENABLED,
    visibleDeliveryEnabled: MC_STAGE34_GATE_B1_VISIBLE_DELIVERY_ENABLED,
    dispatchEnabled: MC_STAGE34_GATE_B1_DISPATCH_ENABLED,
    killSwitch: MC_STAGE34_GATE_B1_KILL_SWITCH
  };
}

function missionCommandStage34GateB1ArrayHas(items, value) {
  for (var i = 0; i < items.length; i++) {
    if (items[i] === value) return true;
  }
  return false;
}

function missionCommandStage34GateB1Clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function missionCommandStage34GateB1SortStable(value) {
  if (Array.isArray(value)) {
    return value.map(function(item) { return missionCommandStage34GateB1SortStable(item); });
  }
  if (!value || typeof value !== 'object') return value;
  var keys = Object.keys(value).sort();
  var out = {};
  for (var i = 0; i < keys.length; i++) {
    out[keys[i]] = missionCommandStage34GateB1SortStable(value[keys[i]]);
  }
  return out;
}

function missionCommandStage34GateB1Hash(value) {
  var text = JSON.stringify(missionCommandStage34GateB1SortStable(value));
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text, Utilities.Charset.UTF_8);
  var hex = '';
  for (var i = 0; i < bytes.length; i++) {
    var b = bytes[i];
    if (b < 0) b += 256;
    var h = b.toString(16);
    if (h.length === 1) h = '0' + h;
    hex += h;
  }
  return hex;
}

function stripMissionCommandStage34GateB1OracleFields(input) {
  var copy = missionCommandStage34GateB1Clone(input || {});
  for (var i = 0; i < MC_STAGE34_GATE_B1_ORACLE_FIELDS.length; i++) {
    delete copy[MC_STAGE34_GATE_B1_ORACLE_FIELDS[i]];
  }
  return copy;
}

function getMissionCommandStage34GateB1OracleFieldsSeen(input) {
  var seen = [];
  input = input || {};
  for (var i = 0; i < MC_STAGE34_GATE_B1_ORACLE_FIELDS.length; i++) {
    var field = MC_STAGE34_GATE_B1_ORACLE_FIELDS[i];
    if (Object.prototype.hasOwnProperty.call(input, field)) seen.push(field);
  }
  return seen;
}

function labelMissionCommandStage34GateB1NextMove(nextMoveType) {
  var labels = {
    approve_or_revise: 'review and approve or revise',
    provide_context: 'provide context',
    reply: 'reply',
    coordinate_review: 'coordinate review',
    resolve_dependency: 'review the dependency',
    assign_unblocker: 'stage an unblocker for review',
    resume_handoff: 'prepare the handoff to resume',
    choose_direction: 'choose direction',
    choose_scope: 'choose scope',
    review_source_allowlist: 'review source allowlist',
    wait_for_provider_recovery: 'wait for provider recovery',
    review_budget_cap: 'review budget cap',
    route_review_required: 'route review required',
    none: 'none'
  };
  return labels[nextMoveType] || 'route review required';
}

function normalizeMissionCommandStage34GateB1Event(input) {
  input = input || {};
  var event = input.normalized_event || {};
  var missing = [];
  for (var i = 0; i < MC_STAGE34_GATE_B1_REQUIRED_EVENT_FIELDS.length; i++) {
    var field = MC_STAGE34_GATE_B1_REQUIRED_EVENT_FIELDS[i];
    if (!Object.prototype.hasOwnProperty.call(event, field)) missing.push(field);
  }
  var priority = input.priority || 'routine';
  var freshness = input.freshness || 'fresh';
  var sourceClassAllowed = missionCommandStage34GateB1ArrayHas(MC_STAGE34_GATE_B1_ALLOWED_SOURCE_CLASSES, event.source_class);
  var syntheticOnlyAllowed = input.synthetic_only === true;
  var priorityAllowed = missionCommandStage34GateB1ArrayHas(MC_STAGE34_GATE_B1_ALLOWED_PRIORITIES, priority);
  var freshnessAllowed = missionCommandStage34GateB1ArrayHas(MC_STAGE34_GATE_B1_ALLOWED_FRESHNESS, freshness);
  return {
    normalized: {
      fixture_id: input.fixture_id || null,
      synthetic_only: input.synthetic_only === true,
      source_class: event.source_class,
      source_label: event.source_label,
      event_type: event.event_type,
      occurred_at: event.occurred_at,
      observed_at: event.observed_at,
      status_bucket: event.status_bucket,
      due_bucket: event.due_bucket,
      owner_bucket: event.owner_bucket,
      mission_or_project_label: event.mission_or_project_label,
      blocker_bucket: event.blocker_bucket,
      review_bucket: event.review_bucket,
      safe_summary: event.safe_summary,
      priority: priority,
      freshness: freshness,
      material_change: input.material_change || 'none'
    },
    validation: {
      ok: missing.length === 0 && syntheticOnlyAllowed && sourceClassAllowed && priorityAllowed && freshnessAllowed,
      missing: missing,
      syntheticOnlyAllowed: syntheticOnlyAllowed,
      sourceClassAllowed: sourceClassAllowed,
      priorityAllowed: priorityAllowed,
      freshnessAllowed: freshnessAllowed
    }
  };
}

function routeMissionCommandStage34GateB1Role(event) {
  if (event.material_change === 'chief_escalation_required') {
    return { role_owner: 'executive_assistant', escalated_from: 'chief_of_staff', route_review_required: false };
  }
  if (event.owner_bucket === 'a1xx' || event.review_bucket === 'needs_a1xx') {
    return { role_owner: 'executive_assistant', escalated_from: null, route_review_required: false };
  }
  if (event.owner_bucket === 'unassigned' && event.status_bucket === 'ambiguous') {
    return { role_owner: 'chief_of_staff', escalated_from: null, route_review_required: true };
  }
  return { role_owner: 'chief_of_staff', escalated_from: null, route_review_required: false };
}

function classifyMissionCommandStage34GateB1NextMove(event, route) {
  if (route.route_review_required) return 'route_review_required';
  if (event.blocker_bucket === 'privacy') return 'review_source_allowlist';
  if (event.event_type === 'provider_unavailable') return 'wait_for_provider_recovery';
  if (event.event_type === 'quota_cap_reached') return 'review_budget_cap';
  if (event.freshness === 'stale') return 'none';
  if (event.material_change === 'none') return 'none';
  if (!missionCommandStage34GateB1ArrayHas(MC_STAGE34_GATE_B1_MATERIAL_REOPEN_CODES, event.material_change)) return 'route_review_required';
  if (event.material_change === 'chief_escalation_required') {
    return event.event_type === 'scope_conflict' ? 'choose_scope' : 'choose_direction';
  }
  if (event.event_type === 'client_follow_up') return 'reply';
  if (event.event_type === 'meeting_readiness') return 'provide_context';
  if (event.event_type === 'agent_stall') {
    return event.status_bucket === 'ready_to_resume' ? 'resume_handoff' : 'assign_unblocker';
  }
  if (event.event_type === 'handoff_dependency') return 'resolve_dependency';
  if (event.event_type === 'output_review_queue' || event.event_type === 'related_review_items') return 'coordinate_review';
  if (event.owner_bucket === 'a1xx' || event.review_bucket === 'needs_a1xx') return 'approve_or_revise';
  return 'none';
}

function classifyMissionCommandStage34GateB1Outcome(event, route) {
  if (event.blocker_bucket === 'privacy' || event.status_bucket === 'privacy_blocked' || event.freshness === 'blocked' && event.blocker_bucket === 'privacy') {
    return { outcome: 'privacy_blocked', suppression_decision: 'block_privacy', safe_failure_code: 'privacy_blocked' };
  }
  if (event.event_type === 'provider_unavailable' || event.status_bucket === 'provider_unavailable') {
    return { outcome: 'provider_blocked', suppression_decision: 'block_provider', safe_failure_code: 'provider_unavailable' };
  }
  if (event.event_type === 'quota_cap_reached' || event.status_bucket === 'quota_limited') {
    return { outcome: 'quota_blocked', suppression_decision: 'block_quota', safe_failure_code: 'quota_cap_reached' };
  }
  if (event.freshness === 'stale') {
    return { outcome: 'stale_expired', suppression_decision: 'expire_stale_item', safe_failure_code: 'stale_expired' };
  }
  if (route.route_review_required) {
    return { outcome: 'route_review_required', suppression_decision: 'hold_for_route_review', safe_failure_code: 'route_review_required' };
  }
  if (event.material_change === 'none') {
    if (event.priority === 'low' && event.review_bucket === 'none') {
      return { outcome: 'suppressed', suppression_decision: 'suppress_low_value_noise', safe_failure_code: 'low_value_noise' };
    }
    return { outcome: 'suppressed', suppression_decision: 'suppress_unchanged_duplicate', safe_failure_code: 'unchanged_duplicate' };
  }
  if (!missionCommandStage34GateB1ArrayHas(MC_STAGE34_GATE_B1_MATERIAL_REOPEN_CODES, event.material_change)) {
    return { outcome: 'route_review_required', suppression_decision: 'hold_for_route_review', safe_failure_code: 'unknown_material_change' };
  }
  if (event.material_change === 'merge_compatible_events_detected') {
    return { outcome: 'merged', suppression_decision: 'merge_with_related_event', safe_failure_code: null };
  }
  if (event.material_change === 'chief_escalation_required') {
    return { outcome: 'hidden_candidate', suppression_decision: 'eligible_attributed_escalation', safe_failure_code: null };
  }
  if (event.material_change === 'returning_with_current_action') {
    return { outcome: 'hidden_candidate', suppression_decision: 'eligible_dormant_return_cap_applied', safe_failure_code: null };
  }
  if (missionCommandStage34GateB1ArrayHas(MC_STAGE34_GATE_B1_MATERIAL_REOPEN_CODES, event.material_change) && /worsened|cleared/.test(event.material_change)) {
    return { outcome: 'hidden_candidate', suppression_decision: 'reopen_material_change', safe_failure_code: null };
  }
  return { outcome: 'hidden_candidate', suppression_decision: 'eligible_new', safe_failure_code: null };
}

function getMissionCommandStage34GateB1SuppressionWindow(priority) {
  if (priority === 'critical') return '4h';
  if (priority === 'important') return '24h';
  if (priority === 'low') return '7d';
  return '72h';
}

function deriveMissionCommandStage34GateB1WhyNow(event, outcome) {
  if (outcome === 'privacy_blocked') return 'privacy_or_allowlist_stop';
  if (outcome === 'provider_blocked') return 'provider_stop_no_retry';
  if (outcome === 'quota_blocked') return 'quota_stop_no_retry';
  if (outcome === 'stale_expired') return 'stale_no_backlog_replay';
  if (outcome === 'suppressed') return event.priority === 'low' ? 'low_value_noise' : 'unchanged_inside_window';
  if (outcome === 'merged') return 'related_events_one_owner';
  if (outcome === 'route_review_required') return event.safe_failure_code === 'unknown_material_change' ? 'unknown_material_change_fail_closed' : 'ambiguous_owner_fail_closed';
  if (event.material_change === 'chief_escalation_required') return 'a1xx_decision_required_from_chief_context';
  if (event.material_change === 'returning_with_current_action') return 'dormant_return_current_action_only';
  if (missionCommandStage34GateB1ArrayHas(MC_STAGE34_GATE_B1_MATERIAL_REOPEN_CODES, event.material_change)) return 'material_change_reopened';
  return 'eligible_new_signal';
}

function makeMissionCommandStage34GateB1Keys(event, route, nextMove) {
  var materialState = {
    source_class: event.source_class,
    source_label: event.source_label,
    event_type: event.event_type,
    mission_or_project_label: event.mission_or_project_label,
    status_bucket: event.status_bucket,
    priority: event.priority,
    due_bucket: event.due_bucket,
    owner_bucket: event.owner_bucket,
    blocker_bucket: event.blocker_bucket,
    review_bucket: event.review_bucket,
    material_change: event.material_change
  };
  var eventFingerprint = missionCommandStage34GateB1Hash(materialState);
  var familyKey = missionCommandStage34GateB1Hash({
    stage: 'mission_command_stage_3_4',
    event_fingerprint: eventFingerprint,
    role_owner: route.role_owner,
    escalated_from: route.escalated_from || 'none'
  });
  var mergeKey = missionCommandStage34GateB1Hash({
    role_owner: route.role_owner,
    mission_or_project_label: event.mission_or_project_label,
    due_bucket: event.due_bucket,
    next_move_type: nextMove
  });
  return {
    event_fingerprint: eventFingerprint,
    event_fingerprint_summary: 'sha256:' + eventFingerprint.slice(0, 16),
    candidate_family_key: 'mc34:' + familyKey,
    merge_key: 'mc34merge:' + mergeKey,
    related_object: 'mc34:' + familyKey
  };
}

function decideMissionCommandStage34GateB1ShadowEvent(input) {
  var oracleFieldsSeen = getMissionCommandStage34GateB1OracleFieldsSeen(input);
  var normalizedBundle = normalizeMissionCommandStage34GateB1Event(input || {});
  var event = normalizedBundle.normalized;
  var route = routeMissionCommandStage34GateB1Role(event);
  var nextMove = classifyMissionCommandStage34GateB1NextMove(event, route);
  var outcome = normalizedBundle.validation.ok ?
    classifyMissionCommandStage34GateB1Outcome(event, route) :
    { outcome: 'privacy_blocked', suppression_decision: 'block_privacy', safe_failure_code: 'invalid_or_unallowlisted_event' };
  var keys = makeMissionCommandStage34GateB1Keys(event, route, nextMove);
  var eventForWhy = {};
  for (var k in event) eventForWhy[k] = event[k];
  eventForWhy.safe_failure_code = outcome.safe_failure_code;
  return {
    fixture_id: event.fixture_id,
    source_class: event.source_class,
    source_label: event.source_label,
    event_type: event.event_type,
    outcome: outcome.outcome,
    role_owner: route.role_owner,
    priority: event.priority,
    freshness: event.freshness,
    why_now_code: deriveMissionCommandStage34GateB1WhyNow(eventForWhy, outcome.outcome),
    material_change: event.material_change,
    material_change_reopens: missionCommandStage34GateB1ArrayHas(MC_STAGE34_GATE_B1_MATERIAL_REOPEN_CODES, event.material_change),
    event_fingerprint: keys.event_fingerprint,
    event_fingerprint_summary: keys.event_fingerprint_summary,
    candidate_family_key: keys.candidate_family_key,
    merge_key: keys.merge_key,
    related_object: keys.related_object,
    suppression_window: getMissionCommandStage34GateB1SuppressionWindow(event.priority),
    suppression_decision: outcome.suppression_decision,
    escalated_from: route.escalated_from || null,
    next_move_type: nextMove,
    protected_next_move_label: labelMissionCommandStage34GateB1NextMove(nextMove),
    safe_failure_code: outcome.safe_failure_code,
    oracle_fields_seen: oracleFieldsSeen,
    validation: normalizedBundle.validation,
    boundary_flags: getMissionCommandStage34GateB1Flags()
  };
}

function mapMissionCommandStage34GateB1ReceiptRow(decision, requestId) {
  decision = decision || {};
  var receiptType = 'stage_3_4_candidate';
  var result = 'logged';
  if (decision.outcome === 'suppressed' || decision.outcome === 'merged') receiptType = 'stage_3_4_suppression';
  else if (decision.outcome === 'privacy_blocked') {
    receiptType = 'stage_3_4_privacy_block';
    result = 'redacted';
  } else if (decision.outcome === 'provider_blocked') {
    receiptType = 'stage_3_4_provider_block';
    result = 'failed';
  } else if (decision.outcome === 'quota_blocked') {
    receiptType = 'stage_3_4_budget_block';
    result = 'failed';
  } else if (decision.outcome === 'stale_expired') receiptType = 'stage_3_4_expiry';
  else if (decision.outcome === 'route_review_required') receiptType = 'stage_3_4_failure';
  return {
    receipt_id: 'mc34b1_' + missionCommandStage34GateB1Hash({
      related_object: decision.related_object || '',
      request_id: requestId || '',
      outcome: decision.outcome || ''
    }).slice(0, 24),
    profile_id: MC_STAGE34_GATE_B1_PROFILE_ID,
    receipt_type: receiptType,
    source: MC_STAGE34_GATE_B1_SOURCE,
    related_object: decision.related_object || '',
    result: result,
    safe_summary: JSON.stringify({
      stage: MC_STAGE34_GATE_B1_STAGE_ID,
      build: MC_STAGE34_GATE_B1_BUILD,
      fixture_id: decision.fixture_id || '',
      outcome: decision.outcome || '',
      role_owner: decision.role_owner || '',
      priority: decision.priority || '',
      freshness: decision.freshness || '',
      why_now_code: decision.why_now_code || '',
      suppression_decision: decision.suppression_decision || '',
      next_move_type: decision.next_move_type || '',
      protected_next_move_label: decision.protected_next_move_label || '',
      no_provider_call: true,
      no_live_sheet: true,
      no_visible_delivery: true,
      no_dispatch: true,
      hash_only_evidence: true
    }),
    provider_key: '',
    model_key: '',
    role: decision.role_owner || '',
    latency_ms: '',
    input_tokens: '',
    cached_input_tokens: '',
    cache_write_tokens: '',
    output_tokens: '',
    reasoning_tokens: '',
    retry_count: 0,
    estimated_cost: '',
    fallback_reason: decision.safe_failure_code || decision.suppression_decision || '',
    safety_identifier_hash: decision.event_fingerprint || '',
    created_at: '',
    device_id: MC_STAGE34_GATE_B1_PROFILE_ID,
    request_id: requestId || 'gate_b1_fake_adapter_only',
    privacy_class: MC_STAGE34_GATE_B1_PRIVACY_CLASS,
    retention_class: MC_STAGE34_GATE_B1_RETENTION_CLASS,
    next_action: decision.next_move_type || 'none',
    team_chat_receipt_url: '',
    version: 1,
    etag: missionCommandStage34GateB1Hash({
      related_object: decision.related_object || '',
      receipt_type: receiptType,
      result: result,
      safety_identifier_hash: decision.event_fingerprint || ''
    }).slice(0, 32),
    updated_at: '',
    updated_by: MC_STAGE34_GATE_B1_BUILD,
    last_request_id: requestId || 'gate_b1_fake_adapter_only'
  };
}

function verifyMissionCommandStage34GateB1WithFixtures(fixturePayload) {
  var opportunities = fixturePayload && fixturePayload.opportunities ? fixturePayload.opportunities : [];
  var results = [];
  var metrics = {
    fixture_count: opportunities.length,
    expected_outcomes_matched: 0,
    role_ownership_matched: 0,
    unchanged_duplicates_suppressed: 0,
    material_changes_reopened: 0,
    chief_escalations_attributed: 0,
    hidden_candidates: 0,
    suppressed: 0,
    privacy_blocks: 0,
    provider_blocks: 0,
    quota_blocks: 0,
    stale_expired: 0,
    route_review_required: 0,
    merged: 0,
    oracle_separation_ok: true,
    boundary_flags_ok: true,
    protected_labels_ok: true,
    fake_receipts_ok: true
  };
  var forbiddenLabelWords = /\b(assign|resolve|restart|clear)\b/i;
  for (var i = 0; i < opportunities.length; i++) {
    var fixture = opportunities[i];
    var stripped = stripMissionCommandStage34GateB1OracleFields(fixture);
    var decision = decideMissionCommandStage34GateB1ShadowEvent(stripped);
    var mutated = missionCommandStage34GateB1Clone(fixture);
    mutated.expected_outcome = 'mutated';
    mutated.candidate_text = 'mutated';
    mutated.role_owner = 'mutated';
    mutated.candidate_family_key = 'mutated';
    mutated.suppression_decision = 'mutated';
    mutated.next_move_type = 'mutated';
    mutated.escalated_from = 'mutated';
    var mutatedDecision = decideMissionCommandStage34GateB1ShadowEvent(mutated);
    if (decision.outcome !== mutatedDecision.outcome ||
      decision.role_owner !== mutatedDecision.role_owner ||
      decision.next_move_type !== mutatedDecision.next_move_type ||
      decision.candidate_family_key !== mutatedDecision.candidate_family_key) metrics.oracle_separation_ok = false;
    if (decision.outcome === fixture.expected_outcome) metrics.expected_outcomes_matched++;
    if (decision.role_owner === fixture.role_owner) metrics.role_ownership_matched++;
    if (decision.suppression_decision === 'suppress_unchanged_duplicate') metrics.unchanged_duplicates_suppressed++;
    if (decision.suppression_decision === 'reopen_material_change') metrics.material_changes_reopened++;
    if (decision.escalated_from === 'chief_of_staff') metrics.chief_escalations_attributed++;
    if (decision.outcome === 'hidden_candidate') metrics.hidden_candidates++;
    else if (decision.outcome === 'suppressed') metrics.suppressed++;
    else if (decision.outcome === 'privacy_blocked') metrics.privacy_blocks++;
    else if (decision.outcome === 'provider_blocked') metrics.provider_blocks++;
    else if (decision.outcome === 'quota_blocked') metrics.quota_blocks++;
    else if (decision.outcome === 'stale_expired') metrics.stale_expired++;
    else if (decision.outcome === 'route_review_required') metrics.route_review_required++;
    else if (decision.outcome === 'merged') metrics.merged++;
    if (forbiddenLabelWords.test(decision.protected_next_move_label)) metrics.protected_labels_ok = false;
    var flags = decision.boundary_flags || {};
    for (var flag in flags) {
      if (flags[flag] !== false) metrics.boundary_flags_ok = false;
    }
    var fakeRow = mapMissionCommandStage34GateB1ReceiptRow(decision, 'gate_b1_fixture_' + fixture.fixture_id);
    if (fakeRow.provider_key || fakeRow.model_key || fakeRow.team_chat_receipt_url ||
      fakeRow.privacy_class !== MC_STAGE34_GATE_B1_PRIVACY_CLASS ||
      fakeRow.retention_class !== MC_STAGE34_GATE_B1_RETENTION_CLASS ||
      fakeRow.safe_summary.indexOf('candidate_text') !== -1) metrics.fake_receipts_ok = false;
    results.push(decision);
  }
  var unknown = stripMissionCommandStage34GateB1OracleFields(opportunities[0] || {});
  unknown.fixture_id = 'ADVERSARIAL-UNKNOWN-MATERIAL';
  unknown.material_change = 'unreviewed_new_signal';
  var unknownDecision = decideMissionCommandStage34GateB1ShadowEvent(unknown);
  var nonSynthetic = stripMissionCommandStage34GateB1OracleFields(opportunities[0] || {});
  nonSynthetic.fixture_id = 'ADVERSARIAL-NON-SYNTHETIC';
  nonSynthetic.synthetic_only = false;
  var nonSyntheticDecision = decideMissionCommandStage34GateB1ShadowEvent(nonSynthetic);
  var runtimeReceipt = stripMissionCommandStage34GateB1OracleFields(opportunities[0] || {});
  runtimeReceipt.fixture_id = 'ADVERSARIAL-RUNTIME-RECEIPT';
  runtimeReceipt.normalized_event.source_class = 'runtime_receipt';
  var runtimeDecision = decideMissionCommandStage34GateB1ShadowEvent(runtimeReceipt);
  var approvedSummary = stripMissionCommandStage34GateB1OracleFields(opportunities[0] || {});
  approvedSummary.fixture_id = 'ADVERSARIAL-APPROVED-SUMMARY';
  approvedSummary.normalized_event.source_class = 'approved_summary';
  var summaryDecision = decideMissionCommandStage34GateB1ShadowEvent(approvedSummary);
  var featureFlags = getMissionCommandStage34GateB1FeatureFlags();
  var defaultClosed = featureFlags.providerEnabled === false &&
    featureFlags.receiptWriteEnabled === false &&
    featureFlags.sourceReadEnabled === false &&
    featureFlags.triggerEnabled === false &&
    featureFlags.visibleDeliveryEnabled === false &&
    featureFlags.dispatchEnabled === false &&
    featureFlags.killSwitch === true;
  var ok = opportunities.length === 25 &&
    metrics.expected_outcomes_matched === 25 &&
    metrics.role_ownership_matched === 25 &&
    metrics.unchanged_duplicates_suppressed === 3 &&
    metrics.material_changes_reopened === 3 &&
    metrics.chief_escalations_attributed === 2 &&
    metrics.oracle_separation_ok === true &&
    metrics.boundary_flags_ok === true &&
    metrics.protected_labels_ok === true &&
    metrics.fake_receipts_ok === true &&
    unknownDecision.outcome !== 'hidden_candidate' &&
    unknownDecision.safe_failure_code === 'unknown_material_change' &&
    nonSyntheticDecision.outcome === 'privacy_blocked' &&
    nonSyntheticDecision.validation.syntheticOnlyAllowed === false &&
    runtimeDecision.outcome === 'privacy_blocked' &&
    runtimeDecision.validation.sourceClassAllowed === false &&
    summaryDecision.outcome === 'privacy_blocked' &&
    summaryDecision.validation.sourceClassAllowed === false &&
    defaultClosed === true;
  return {
    ok: ok,
    build: MC_STAGE34_GATE_B1_BUILD,
    contractVersion: MC_STAGE34_GATE_B1_CONTRACT_VERSION,
    fixtureSha256Expected: MC_STAGE34_GATE_B1_FIXTURE_SHA256,
    metrics: metrics,
    adversarial: {
      unknownMaterial: unknownDecision,
      nonSynthetic: nonSyntheticDecision,
      runtimeReceipt: runtimeDecision,
      approvedSummary: summaryDecision
    },
    defaultClosed: defaultClosed,
    featureFlags: featureFlags,
    sampleFakeReceipt: results.length ? mapMissionCommandStage34GateB1ReceiptRow(results[0], 'gate_b1_fixture_sample') : null,
    providerCall: false,
    liveSheetReadWrite: false,
    runtimeReceiptWrite: false,
    scriptPropertiesAccessed: false,
    wrapperCreated: false,
    routeCreated: false,
    triggerInstall: false,
    visibleInboxMutation: false,
    dispatch: false,
    externalWrite: false,
    gateB2Started: false,
    gateB3Started: false
  };
}

// Mission Command Stage 3.4 Gate B2 preparation only.
// Prepares one no-provider Runtime Receipts batch wrapper. Do not invoke without separate A1XX approval.
var MC_STAGE34_GATE_B2_BUILD = 'mmos-20260712-stage3-4-gate-b2-preparation';
var MC_STAGE34_GATE_B2_WRAPPER_NAME = 'runMissionCommandStage34GateB2ApprovedReceiptBatchOnce';
var MC_STAGE34_GATE_B2_RUN_ID = 'mc_stage34_gate_b2_20260712_manual_001';
var MC_STAGE34_GATE_B2_CAPTURE_KEY = '36f462c8cd744c34dc05dfe421947d5d1aabf4c10d3956ca947b3c84f632e59a';
var MC_STAGE34_GATE_B2_PARENT_RELATED_OBJECT = 'mc34b2:36f462c8cd744c34dc05dfe421947d5d1aabf4c10d3956ca947b3c84f632e59a';
var MC_STAGE34_GATE_B2_MAX_ROWS = 26;
var MC_STAGE34_GATE_B2_PARENT_RECEIPT_TYPE = 'stage_3_4_batch_parent';
var MC_STAGE34_GATE_B2_REQUEST_SOURCE = 'stage_3_4_gate_b2_no_provider_fixture_batch';

function getMissionCommandStage34GateB2FixturePayload() {
  var rows = [
    'MC34-F01|critical|fresh|new_critical_approval|fixture|synthetic_stage34_fixture|approval_deadline|2099-10-01T08:00:00Z|2099-10-01T08:05:00Z|awaiting_approval|today|a1xx|SYNTH-PROJECT-ALPHA|approval|needs_a1xx',
    'MC34-F02|critical|fresh|missing_input_detected|fixture|synthetic_stage34_fixture|meeting_readiness|2099-10-01T08:15:00Z|2099-10-01T08:20:00Z|missing_required_input|next_24h|a1xx|SYNTH-SESSION-BRAVO|dependency|needs_a1xx',
    'MC34-F03|critical|fresh|a1xx_waiting_state_added|fixture|synthetic_stage34_fixture|client_follow_up|2099-10-01T08:30:00Z|2099-10-01T08:35:00Z|a1xx_waiting|today|a1xx|SYNTH-CLIENT-GAMMA|approval|needs_a1xx',
    'MC34-F04|important|fresh|review_queue_count_increased|fixture|synthetic_stage34_fixture|output_review_queue|2099-10-01T09:00:00Z|2099-10-01T09:05:00Z|review_queue_growing|this_week|team_agent|SYNTH-CONTENT-LANE|dependency|needs_team',
    'MC34-F05|important|fresh|dependency_linked_to_multiple_lanes|fixture|synthetic_stage34_fixture|handoff_dependency|2099-10-01T09:10:00Z|2099-10-01T09:15:00Z|handoff_waiting|this_week|team_agent|SYNTH-GROWTH-LANE|dependency|needs_team',
    'MC34-F06|important|fresh|stall_threshold_reached|fixture|synthetic_stage34_fixture|agent_stall|2099-10-01T09:20:00Z|2099-10-01T09:25:00Z|stalled|this_week|team_agent|SYNTH-OPS-LANE|source|needs_team',
    'MC34-F07|low|fresh|none|fixture|synthetic_stage34_fixture|routine_status_ping|2099-10-01T09:30:00Z|2099-10-01T09:35:00Z|unchanged|later|team_agent|SYNTH-MAINTENANCE|none|none',
    'MC34-F08|low|fresh|none|fixture|synthetic_stage34_fixture|optional_reference_update|2099-10-01T09:40:00Z|2099-10-01T09:45:00Z|informational|none|unassigned|SYNTH-LIBRARY|none|none',
    'MC34-F09|critical|fresh|none|fixture|synthetic_stage34_fixture|approval_deadline|2099-10-01T09:50:00Z|2099-10-01T09:55:00Z|awaiting_approval|today|a1xx|SYNTH-PROJECT-ALPHA|approval|needs_a1xx',
    'MC34-F10|important|fresh|none|fixture|synthetic_stage34_fixture|output_review_queue|2099-10-01T10:00:00Z|2099-10-01T10:05:00Z|review_queue_growing|this_week|team_agent|SYNTH-CONTENT-LANE|dependency|needs_team',
    'MC34-F11|routine|fresh|none|fixture|synthetic_stage34_fixture|routine_status_ping|2099-10-01T10:10:00Z|2099-10-01T10:15:00Z|unchanged|later|team_agent|SYNTH-MAINTENANCE|none|none',
    'MC34-F12|critical|fresh|due_bucket_worsened|fixture|synthetic_stage34_fixture|approval_deadline|2099-10-01T10:20:00Z|2099-10-01T10:25:00Z|awaiting_approval|overdue|a1xx|SYNTH-PROJECT-ALPHA|approval|needs_a1xx',
    'MC34-F13|important|fresh|due_bucket_worsened|fixture|synthetic_stage34_fixture|handoff_dependency|2099-10-01T10:30:00Z|2099-10-01T10:35:00Z|handoff_waiting|today|team_agent|SYNTH-GROWTH-LANE|dependency|needs_team',
    'MC34-F14|important|fresh|blocker_cleared|fixture|synthetic_stage34_fixture|agent_stall|2099-10-01T10:40:00Z|2099-10-01T10:45:00Z|ready_to_resume|this_week|team_agent|SYNTH-OPS-LANE|none|needs_team',
    'MC34-F15|important|fresh|chief_escalation_required|fixture|synthetic_stage34_fixture|cross_lane_decision|2099-10-01T10:50:00Z|2099-10-01T10:55:00Z|team_context_ready|today|team_agent|SYNTH-CAMPAIGN-DELTA|approval|needs_a1xx',
    'MC34-F16|important|fresh|chief_escalation_required|fixture|synthetic_stage34_fixture|scope_conflict|2099-10-01T11:00:00Z|2099-10-01T11:05:00Z|team_options_ready|next_24h|team_agent|SYNTH-PROJECT-ECHO|approval|needs_a1xx',
    'MC34-F17|routine|stale|none|fixture|synthetic_stage34_fixture|old_review_item|2099-09-20T08:00:00Z|2099-10-01T11:15:00Z|unchanged|later|a1xx|SYNTH-ARCHIVE-ZETA|none|none',
    'MC34-F18|routine|stale|none|fixture|synthetic_stage34_fixture|old_team_risk|2099-09-21T08:00:00Z|2099-10-01T11:20:00Z|unchanged|later|team_agent|SYNTH-OPS-LANE|none|none',
    'MC34-F19|important|blocked|privacy_block_detected|fixture|synthetic_privacy_test|private_payload_detected|2099-10-01T11:30:00Z|2099-10-01T11:35:00Z|privacy_blocked|none|unassigned|withheld|privacy|none',
    'MC34-F20|important|blocked|privacy_block_detected|fixture|synthetic_privacy_test|unapproved_source_class|2099-10-01T11:40:00Z|2099-10-01T11:45:00Z|privacy_blocked|none|unassigned|withheld|privacy|none',
    'MC34-F21|important|blocked|provider_unavailable|fixture|synthetic_provider_health|provider_unavailable|2099-10-01T11:50:00Z|2099-10-01T11:55:00Z|provider_unavailable|today|team_agent|SYNTH-CONTENT-LANE|provider|needs_team',
    'MC34-F22|important|blocked|quota_cap_reached|fixture|synthetic_provider_health|quota_cap_reached|2099-10-01T12:00:00Z|2099-10-01T12:05:00Z|quota_limited|this_week|team_agent|SYNTH-GROWTH-LANE|provider|needs_team',
    'MC34-F23|routine|partial|role_ambiguity_detected|fixture|synthetic_stage34_fixture|ambiguous_status_change|2099-10-01T12:10:00Z|2099-10-01T12:15:00Z|ambiguous|this_week|unassigned|SYNTH-PROJECT-FOXTROT|none|needs_team',
    'MC34-F24|important|fresh|merge_compatible_events_detected|fixture|synthetic_stage34_fixture|related_review_items|2099-10-01T12:20:00Z|2099-10-01T12:25:00Z|two_related_items|this_week|team_agent|SYNTH-CONTENT-LANE|dependency|needs_team',
    'MC34-F25|important|fresh|returning_with_current_action|fixture|synthetic_stage34_fixture|dormant_return_priority|2099-10-01T12:30:00Z|2099-10-03T12:30:00Z|returning_after_dormancy|today|a1xx|SYNTH-MISSION-RETURN|approval|needs_a1xx'
  ];
  return {
    schema_version: 'mc_stage_3_4_fixture_v1',
    synthetic_only: true,
    opportunities: rows.map(function(row) {
      var p = row.split('|');
      return {
        fixture_id: p[0],
        synthetic_only: true,
        priority: p[1],
        freshness: p[2],
        material_change: p[3],
        normalized_event: {
          source_class: p[4],
          source_label: p[5],
          event_type: p[6],
          occurred_at: p[7],
          observed_at: p[8],
          status_bucket: p[9],
          due_bucket: p[10],
          owner_bucket: p[11],
          mission_or_project_label: p[12],
          blocker_bucket: p[13],
          review_bucket: p[14],
          safe_summary: ''
        }
      };
    })
  };
}

function makeMissionCommandStage34GateB2Blocked(reason, detail) {
  return {
    ok: false,
    status: 'blocked',
    build: MC_STAGE34_GATE_B2_BUILD,
    stopCondition: reason || 'gate_b2_blocked',
    safeDetail: detail || '',
    providerCallAttempted: false,
    liveSheetWrite: false,
    scriptPropertiesAccessed: false,
    routeCreated: false,
    triggerInstall: false,
    visibleDelivery: false,
    dispatch: false,
    externalWrite: false
  };
}

function makeMissionCommandStage34GateB2ReceiptId(kind, suffix) {
  return 'rcp_mc34b2_' + kind + '_' + String(suffix || '').replace(/[^a-zA-Z0-9_]/g, '').slice(0, 32);
}

function findMissionCommandStage34GateB2Rows(adapter) {
  return (adapter.rows || []).map(function(row, index) {
    return { row: row, index: index };
  }).filter(function(entry) {
    return entry.row.related_object === MC_STAGE34_GATE_B2_PARENT_RELATED_OBJECT ||
      entry.row.request_id === MC_STAGE34_GATE_B2_RUN_ID;
  });
}

function findMissionCommandStage34GateB2Parent(adapter) {
  var rows = findMissionCommandStage34GateB2Rows(adapter);
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].row.receipt_type === MC_STAGE34_GATE_B2_PARENT_RECEIPT_TYPE) return rows[i];
  }
  return null;
}

function findMissionCommandStage34GateB2Child(adapter, receiptId) {
  var rows = findMissionCommandStage34GateB2Rows(adapter);
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].row.receipt_id === receiptId) return rows[i];
  }
  return null;
}

function makeMissionCommandStage34GateB2ParentRow(state, meta) {
  meta = meta || {};
  var now = meta.now || new Date().toISOString();
  var summary = {
    stage: MC_STAGE34_GATE_B1_STAGE_ID,
    gate: 'b2_no_provider_receipt_batch',
    build: MC_STAGE34_GATE_B2_BUILD,
    run_id: MC_STAGE34_GATE_B2_RUN_ID,
    capture_key_hash: 'sha256:' + MC_STAGE34_GATE_B2_CAPTURE_KEY,
    parent_related_object: MC_STAGE34_GATE_B2_PARENT_RELATED_OBJECT,
    fixture_sha256: MC_STAGE34_GATE_B1_FIXTURE_SHA256,
    children_expected: 25,
    children_written: meta.childrenWritten || 0,
    provider_call_attempted: false,
    row_ceiling: MC_STAGE34_GATE_B2_MAX_ROWS,
    hash_only_evidence: true,
    status: state || 'receipt_draft'
  };
  var receiptId = makeMissionCommandStage34GateB2ReceiptId('parent', MC_STAGE34_GATE_B2_CAPTURE_KEY);
  return {
    receipt_id: receiptId,
    profile_id: MC_STAGE34_GATE_B1_PROFILE_ID,
    receipt_type: MC_STAGE34_GATE_B2_PARENT_RECEIPT_TYPE,
    source: MC_STAGE34_GATE_B2_REQUEST_SOURCE,
    related_object: MC_STAGE34_GATE_B2_PARENT_RELATED_OBJECT,
    result: state || 'receipt_draft',
    safe_summary: JSON.stringify(summary),
    provider_key: '',
    model_key: '',
    role: 'batch',
    latency_ms: '',
    input_tokens: '',
    cached_input_tokens: '',
    cache_write_tokens: '',
    output_tokens: '',
    reasoning_tokens: '',
    retry_count: 0,
    estimated_cost: '',
    fallback_reason: '',
    safety_identifier_hash: missionCommandStage34GateB1Hash(summary),
    created_at: now,
    device_id: MC_STAGE34_GATE_B1_PROFILE_ID,
    request_id: MC_STAGE34_GATE_B2_RUN_ID,
    privacy_class: MC_STAGE34_GATE_B1_PRIVACY_CLASS,
    retention_class: MC_STAGE34_GATE_B1_RETENTION_CLASS,
    next_action: 'review_receipt_batch_counts',
    team_chat_receipt_url: '',
    version: meta.version || 1,
    etag: meta.etag || ('etag_' + missionCommandStage34GateB1Hash(summary).slice(0, 24)),
    updated_at: now,
    updated_by: MC_STAGE34_GATE_B2_BUILD,
    last_request_id: MC_STAGE34_GATE_B2_RUN_ID
  };
}

function makeMissionCommandStage34GateB2ChildRow(decision) {
  var row = mapMissionCommandStage34GateB1ReceiptRow(decision, MC_STAGE34_GATE_B2_RUN_ID);
  row.receipt_id = makeMissionCommandStage34GateB2ReceiptId('child', decision.fixture_id + '_' + decision.event_fingerprint.slice(0, 16));
  row.source = MC_STAGE34_GATE_B2_REQUEST_SOURCE;
  row.related_object = MC_STAGE34_GATE_B2_PARENT_RELATED_OBJECT;
  row.request_id = MC_STAGE34_GATE_B2_RUN_ID;
  row.last_request_id = MC_STAGE34_GATE_B2_RUN_ID;
  row.updated_by = MC_STAGE34_GATE_B2_BUILD;
  row.created_at = '';
  row.updated_at = '';
  row.safe_summary = JSON.stringify({
    stage: MC_STAGE34_GATE_B1_STAGE_ID,
    gate: 'b2_no_provider_receipt_batch_child',
    build: MC_STAGE34_GATE_B2_BUILD,
    run_id: MC_STAGE34_GATE_B2_RUN_ID,
    fixture_id: decision.fixture_id || '',
    outcome: decision.outcome || '',
    role_owner: decision.role_owner || '',
    priority: decision.priority || '',
    freshness: decision.freshness || '',
    why_now_code: decision.why_now_code || '',
    suppression_decision: decision.suppression_decision || '',
    next_move_type: decision.next_move_type || '',
    protected_next_move_label: decision.protected_next_move_label || '',
    decision_related_object_hash: decision.related_object || '',
    provider_call_attempted: false,
    no_visible_delivery: true,
    no_dispatch: true,
    hash_only_evidence: true
  });
  row.etag = missionCommandStage34GateB1Hash({
    receipt_id: row.receipt_id,
    related_object: row.related_object,
    safety_identifier_hash: row.safety_identifier_hash,
    request_id: row.request_id
  }).slice(0, 32);
  return row;
}

function claimMissionCommandStage34GateB2Parent(adapter) {
  if (!adapter || !adapter.acquireLock) return makeMissionCommandStage34GateB2Blocked('adapter_missing', 'Gate B2 receipt adapter is missing.');
  if (!adapter.acquireLock('stage34_b2_parent_claim')) return makeMissionCommandStage34GateB2Blocked('lock_unavailable', 'Parent claim lock unavailable.');
  try {
    var refresh = refreshMissionCommandStage33RAdapterUnderLock(adapter);
    if (!refresh.ok) return makeMissionCommandStage34GateB2Blocked(refresh.stopCondition, 'Runtime Receipts headers missing: ' + refresh.missing.join(', '));
    var existing = findMissionCommandStage34GateB2Parent(adapter);
    if (existing) {
      return {
        ok: false,
        status: 'duplicate_suppressed',
        providerCallAttempted: false,
        rowCount: findMissionCommandStage34GateB2Rows(adapter).length,
        parent: existing.row
      };
    }
    var parentRow = makeMissionCommandStage34GateB2ParentRow('receipt_draft');
    adapter.appendRowObject(parentRow);
    return {
      ok: true,
      status: 'parent_claimed',
      providerCallAttempted: false,
      parent: parentRow,
      rowCount: findMissionCommandStage34GateB2Rows(adapter).length
    };
  } finally {
    adapter.releaseLock('stage34_b2_parent_claim');
  }
}

function appendMissionCommandStage34GateB2Child(adapter, decision) {
  var row = makeMissionCommandStage34GateB2ChildRow(decision);
  if (!adapter.acquireLock('stage34_b2_child_' + decision.fixture_id)) return makeMissionCommandStage34GateB2Blocked('lock_unavailable', 'Child append lock unavailable.');
  try {
    var refresh = refreshMissionCommandStage33RAdapterUnderLock(adapter);
    if (!refresh.ok) return makeMissionCommandStage34GateB2Blocked(refresh.stopCondition, 'Runtime Receipts headers missing: ' + refresh.missing.join(', '));
    if (!findMissionCommandStage34GateB2Parent(adapter)) return makeMissionCommandStage34GateB2Blocked('parent_missing', 'Parent receipt must exist before child append.');
    if (findMissionCommandStage34GateB2Child(adapter, row.receipt_id)) {
      return { ok: false, status: 'duplicate_child_suppressed', row: row, providerCallAttempted: false };
    }
    if (findMissionCommandStage34GateB2Rows(adapter).length >= MC_STAGE34_GATE_B2_MAX_ROWS) return makeMissionCommandStage34GateB2Blocked('row_ceiling_reached', 'Gate B2 row ceiling reached.');
    adapter.appendRowObject(row);
    return { ok: true, status: 'child_logged', row: row, providerCallAttempted: false };
  } catch (err) {
    return makeMissionCommandStage34GateB2Blocked('child_append_failed', 'Child append failed before finalization.');
  } finally {
    adapter.releaseLock('stage34_b2_child_' + decision.fixture_id);
  }
}

function getMissionCommandStage34GateB2ExpectedChildReceiptIds() {
  var fixturePayload = getMissionCommandStage34GateB2FixturePayload();
  var opportunities = fixturePayload.opportunities || [];
  return opportunities.map(function(opportunity) {
    var decision = decideMissionCommandStage34GateB1ShadowEvent(stripMissionCommandStage34GateB1OracleFields(opportunity));
    return makeMissionCommandStage34GateB2ReceiptId('child', decision.fixture_id + '_' + decision.event_fingerprint.slice(0, 16));
  });
}

function countMissionCommandStage34GateB2ChildRows(adapter) {
  return findMissionCommandStage34GateB2Rows(adapter).filter(function(entry) {
    return entry.row.receipt_type !== MC_STAGE34_GATE_B2_PARENT_RECEIPT_TYPE;
  }).length;
}

function makeMissionCommandStage34GateB2Interrupted(adapter, parent, childResults, decision, failed) {
  var rows = findMissionCommandStage34GateB2Rows(adapter);
  var parentEntry = findMissionCommandStage34GateB2Parent(adapter);
  var childCount = countMissionCommandStage34GateB2ChildRows(adapter);
  return {
    ok: false,
    status: 'receipt_interrupted',
    build: MC_STAGE34_GATE_B2_BUILD,
    stopCondition: failed.stopCondition || failed.status || 'child_append_failed',
    safeDetail: 'Gate B2 stopped before parent finalization after child append failure.',
    wrapperName: MC_STAGE34_GATE_B2_WRAPPER_NAME,
    runId: MC_STAGE34_GATE_B2_RUN_ID,
    captureKey: MC_STAGE34_GATE_B2_CAPTURE_KEY,
    parentRelatedObject: MC_STAGE34_GATE_B2_PARENT_RELATED_OBJECT,
    parentResult: parentEntry && parentEntry.row ? parentEntry.row.result : '',
    childrenAttempted: childResults.length,
    childrenWritten: childCount,
    failedFixtureId: decision && decision.fixture_id ? decision.fixture_id : '',
    failedChildStatus: failed.status || '',
    failedChildStopCondition: failed.stopCondition || '',
    rowCount: rows.length,
    rowCeiling: MC_STAGE34_GATE_B2_MAX_ROWS,
    providerCallAttempted: false,
    retryAttempted: false,
    finalized: false,
    parent: parent && parent.parent ? parent.parent : null
  };
}

function finalizeMissionCommandStage34GateB2Parent(adapter, expected) {
  expected = expected || {};
  if (!adapter.acquireLock('stage34_b2_parent_finalize')) return makeMissionCommandStage34GateB2Blocked('lock_unavailable', 'Parent finalize lock unavailable.');
  try {
    var refresh = refreshMissionCommandStage33RAdapterUnderLock(adapter);
    if (!refresh.ok) return makeMissionCommandStage34GateB2Blocked(refresh.stopCondition, 'Runtime Receipts headers missing: ' + refresh.missing.join(', '));
    var parent = findMissionCommandStage34GateB2Parent(adapter);
    if (!parent) return makeMissionCommandStage34GateB2Blocked('parent_missing', 'Parent receipt missing at finalization.');
    if (Object.prototype.hasOwnProperty.call(expected, 'version') && safeMissionCommandOpenAiNumberV31(parent.row.version) !== safeMissionCommandOpenAiNumberV31(expected.version)) return makeMissionCommandStage34GateB2Blocked('receipt_conflict', 'Parent version changed before finalization.');
    if (Object.prototype.hasOwnProperty.call(expected, 'etag') && String(parent.row.etag || '') !== String(expected.etag || '')) return makeMissionCommandStage34GateB2Blocked('receipt_conflict', 'Parent etag changed before finalization.');
    var rows = findMissionCommandStage34GateB2Rows(adapter);
    var childCount = rows.filter(function(entry) {
      return entry.row.receipt_type !== MC_STAGE34_GATE_B2_PARENT_RECEIPT_TYPE;
    }).length;
    if (rows.length !== MC_STAGE34_GATE_B2_MAX_ROWS || childCount !== 25) return makeMissionCommandStage34GateB2Blocked('receipt_child_count_invalid', 'Parent finalization requires exactly 25 children and 26 matching rows.');
    var expectedChildIds = getMissionCommandStage34GateB2ExpectedChildReceiptIds();
    for (var i = 0; i < expectedChildIds.length; i++) {
      if (!findMissionCommandStage34GateB2Child(adapter, expectedChildIds[i])) return makeMissionCommandStage34GateB2Blocked('receipt_child_set_invalid', 'Parent finalization requires all 25 deterministic child receipts.');
    }
    var updated = makeMissionCommandStage34GateB2ParentRow('logged', {
      childrenWritten: childCount,
      version: safeMissionCommandOpenAiNumberV31(parent.row.version) + 1
    });
    updated.created_at = parent.row.created_at;
    adapter.updateRowObject(parent.index, updated, expected);
    return { ok: true, status: 'parent_finalized', childrenWritten: childCount, parent: updated, providerCallAttempted: false };
  } finally {
    adapter.releaseLock('stage34_b2_parent_finalize');
  }
}

function runMissionCommandStage34GateB2ReceiptBatch(adapter, fixturePayload, runId) {
  if (runId !== MC_STAGE34_GATE_B2_RUN_ID) return makeMissionCommandStage34GateB2Blocked('run_id_not_approved', 'Gate B2 run ID is not approved.');
  var parent = claimMissionCommandStage34GateB2Parent(adapter);
  if (!parent.ok) return parent;
  var expected = { version: parent.parent.version, etag: parent.parent.etag };
  var opportunities = (fixturePayload && fixturePayload.opportunities) || [];
  if (opportunities.length !== 25) return makeMissionCommandStage34GateB2Blocked('fixture_count_invalid', 'Gate B2 requires exactly 25 fixture opportunities.');
  var childResults = [];
  for (var i = 0; i < opportunities.length; i++) {
    var decision = decideMissionCommandStage34GateB1ShadowEvent(stripMissionCommandStage34GateB1OracleFields(opportunities[i]));
    var childResult = appendMissionCommandStage34GateB2Child(adapter, decision);
    childResults.push(childResult);
    if (!childResult.ok) return makeMissionCommandStage34GateB2Interrupted(adapter, parent, childResults, decision, childResult);
  }
  var finalized = finalizeMissionCommandStage34GateB2Parent(adapter, expected);
  return {
    ok: finalized.ok === true,
    status: finalized.status,
    build: MC_STAGE34_GATE_B2_BUILD,
    wrapperName: MC_STAGE34_GATE_B2_WRAPPER_NAME,
    runId: MC_STAGE34_GATE_B2_RUN_ID,
    captureKey: MC_STAGE34_GATE_B2_CAPTURE_KEY,
    parentRelatedObject: MC_STAGE34_GATE_B2_PARENT_RELATED_OBJECT,
    childrenAttempted: childResults.length,
    childrenWritten: finalized.childrenWritten || 0,
    rowCount: findMissionCommandStage34GateB2Rows(adapter).length,
    rowCeiling: MC_STAGE34_GATE_B2_MAX_ROWS,
    providerCallAttempted: false,
    liveSheetWritePrepared: true,
    gateB3Started: false,
    finalized: finalized
  };
}

function verifyMissionCommandStage34GateB2PreparationLocalChecks(fixturePayload) {
  fixturePayload = fixturePayload || getMissionCommandStage34GateB2FixturePayload();
  var b1 = verifyMissionCommandStage34GateB1WithFixtures(fixturePayload);
  var adapter = makeMissionCommandStage33RLocalReceiptAdapter(null, []);
  var result = runMissionCommandStage34GateB2ReceiptBatch(adapter, fixturePayload, MC_STAGE34_GATE_B2_RUN_ID);
  var duplicate = runMissionCommandStage34GateB2ReceiptBatch(adapter, fixturePayload, MC_STAGE34_GATE_B2_RUN_ID);
  var parentRows = findMissionCommandStage34GateB2Rows(adapter).filter(function(entry) {
    return entry.row.receipt_type === MC_STAGE34_GATE_B2_PARENT_RECEIPT_TYPE;
  });
  var childRows = findMissionCommandStage34GateB2Rows(adapter).filter(function(entry) {
    return entry.row.receipt_type !== MC_STAGE34_GATE_B2_PARENT_RECEIPT_TYPE;
  });
  var staleAdapter = makeMissionCommandStage33RLocalReceiptAdapter(null, []);
  var staleParent = claimMissionCommandStage34GateB2Parent(staleAdapter);
  var staleFinalize = finalizeMissionCommandStage34GateB2Parent(staleAdapter, { version: 999, etag: 'stale_etag' });
  var duplicateChildAdapter = makeMissionCommandStage33RLocalReceiptAdapter(null, []);
  var dupParent = claimMissionCommandStage34GateB2Parent(duplicateChildAdapter);
  var dupDecision = decideMissionCommandStage34GateB1ShadowEvent(stripMissionCommandStage34GateB1OracleFields(fixturePayload.opportunities[0]));
  var dupChildOne = appendMissionCommandStage34GateB2Child(duplicateChildAdapter, dupDecision);
  var dupChildTwo = appendMissionCommandStage34GateB2Child(duplicateChildAdapter, dupDecision);
  var missingHeaderAdapter = makeMissionCommandStage33RLocalReceiptAdapter(getMissionCommandStage33RRequiredReceiptHeaders().filter(function(header) { return header !== 'safe_summary'; }), []);
  var missingHeader = claimMissionCommandStage34GateB2Parent(missingHeaderAdapter);
  var childLockFailAdapter = makeMissionCommandStage33RLocalReceiptAdapter(null, []);
  var childLockAcquire = childLockFailAdapter.acquireLock;
  childLockFailAdapter.acquireLock = function(label) {
    if (String(label || '').indexOf('MC34-F04') !== -1) {
      this.lockEvents.push('acquire:' + label);
      return false;
    }
    return childLockAcquire.call(this, label);
  };
  var childLockInterrupted = runMissionCommandStage34GateB2ReceiptBatch(childLockFailAdapter, fixturePayload, MC_STAGE34_GATE_B2_RUN_ID);
  var childLockParent = findMissionCommandStage34GateB2Parent(childLockFailAdapter);
  var childLockRows = findMissionCommandStage34GateB2Rows(childLockFailAdapter);
  var childLockChildren = countMissionCommandStage34GateB2ChildRows(childLockFailAdapter);
  var headerFailAdapter = makeMissionCommandStage33RLocalReceiptAdapter(null, []);
  var headerRefreshCount = 0;
  headerFailAdapter.refreshRows = function() {
    headerRefreshCount += 1;
    if (headerRefreshCount >= 5) this.headers = getMissionCommandStage33RRequiredReceiptHeaders().filter(function(header) { return header !== 'safe_summary'; });
    return true;
  };
  var headerInterrupted = runMissionCommandStage34GateB2ReceiptBatch(headerFailAdapter, fixturePayload, MC_STAGE34_GATE_B2_RUN_ID);
  var headerParent = findMissionCommandStage34GateB2Parent(headerFailAdapter);
  var appendFailAdapter = makeMissionCommandStage33RLocalReceiptAdapter(null, []);
  var appendOriginal = appendFailAdapter.appendRowObject;
  appendFailAdapter.appendRowObject = function(row) {
    if (this.appendedRows >= 3) throw new Error('planned_child_append_failure');
    return appendOriginal.call(this, row);
  };
  var appendInterrupted = runMissionCommandStage34GateB2ReceiptBatch(appendFailAdapter, fixturePayload, MC_STAGE34_GATE_B2_RUN_ID);
  var appendParent = findMissionCommandStage34GateB2Parent(appendFailAdapter);
  var partialFinalizeAdapter = makeMissionCommandStage33RLocalReceiptAdapter(null, []);
  var partialParent = claimMissionCommandStage34GateB2Parent(partialFinalizeAdapter);
  var partialExpected = { version: partialParent.parent.version, etag: partialParent.parent.etag };
  for (var partialIndex = 0; partialIndex < 24; partialIndex++) {
    var partialDecision = decideMissionCommandStage34GateB1ShadowEvent(stripMissionCommandStage34GateB1OracleFields(fixturePayload.opportunities[partialIndex]));
    appendMissionCommandStage34GateB2Child(partialFinalizeAdapter, partialDecision);
  }
  var partialFinalize = finalizeMissionCommandStage34GateB2Parent(partialFinalizeAdapter, partialExpected);
  var partialParentAfter = findMissionCommandStage34GateB2Parent(partialFinalizeAdapter);
  var sample = childRows.length ? childRows[0].row : {};
  var safeSummaryText = String(sample.safe_summary || '');
  var receiptRedactionOk = sample.provider_key === '' &&
    sample.model_key === '' &&
    sample.team_chat_receipt_url === '' &&
    safeSummaryText.indexOf('candidate_text') === -1 &&
    safeSummaryText.indexOf('raw') === -1 &&
    safeSummaryText.indexOf('credential') === -1;
  return {
    ok: b1.ok === true &&
      result.ok === true &&
      result.rowCount === MC_STAGE34_GATE_B2_MAX_ROWS &&
      result.childrenWritten === 25 &&
      parentRows.length === 1 &&
      childRows.length === 25 &&
      duplicate.status === 'duplicate_suppressed' &&
      duplicate.providerCallAttempted === false &&
      staleParent.ok === true &&
      staleFinalize.ok === false &&
      staleFinalize.stopCondition === 'receipt_conflict' &&
      dupParent.ok === true &&
      dupChildOne.ok === true &&
      dupChildTwo.status === 'duplicate_child_suppressed' &&
      missingHeader.ok === false &&
      missingHeader.stopCondition === 'receipt_contract_invalid' &&
      childLockInterrupted.status === 'receipt_interrupted' &&
      childLockInterrupted.stopCondition === 'lock_unavailable' &&
      childLockInterrupted.childrenWritten === 3 &&
      childLockInterrupted.failedFixtureId === 'MC34-F04' &&
      childLockInterrupted.parentResult === 'receipt_draft' &&
      childLockInterrupted.retryAttempted === false &&
      childLockInterrupted.providerCallAttempted === false &&
      childLockParent.row.result === 'receipt_draft' &&
      childLockChildren === 3 &&
      childLockRows.length === 4 &&
      headerInterrupted.status === 'receipt_interrupted' &&
      headerInterrupted.stopCondition === 'receipt_contract_invalid' &&
      headerParent.row.result === 'receipt_draft' &&
      appendInterrupted.status === 'receipt_interrupted' &&
      appendInterrupted.stopCondition === 'child_append_failed' &&
      appendInterrupted.childrenWritten === 2 &&
      appendInterrupted.failedFixtureId === 'MC34-F03' &&
      appendInterrupted.providerCallAttempted === false &&
      appendParent.row.result === 'receipt_draft' &&
      partialFinalize.ok === false &&
      partialFinalize.stopCondition === 'receipt_child_count_invalid' &&
      partialParentAfter.row.result === 'receipt_draft' &&
      receiptRedactionOk === true,
    build: MC_STAGE34_GATE_B2_BUILD,
    wrapperName: MC_STAGE34_GATE_B2_WRAPPER_NAME,
    runId: MC_STAGE34_GATE_B2_RUN_ID,
    captureKey: MC_STAGE34_GATE_B2_CAPTURE_KEY,
    parentRelatedObject: MC_STAGE34_GATE_B2_PARENT_RELATED_OBJECT,
    rowCeiling: MC_STAGE34_GATE_B2_MAX_ROWS,
    b1Ok: b1.ok === true,
    parentRows: parentRows.length,
    childRows: childRows.length,
    duplicateParentSuppressed: duplicate.status === 'duplicate_suppressed',
    duplicateChildSuppressed: dupChildTwo.status === 'duplicate_child_suppressed',
    staleVersionEtagBlocked: staleFinalize.stopCondition === 'receipt_conflict',
    missingHeaderBlocked: missingHeader.stopCondition === 'receipt_contract_invalid',
    childLockInterrupted: childLockInterrupted.status === 'receipt_interrupted',
    childHeaderInterrupted: headerInterrupted.status === 'receipt_interrupted',
    childAppendInterrupted: appendInterrupted.status === 'receipt_interrupted',
    partialFinalizeBlocked: partialFinalize.stopCondition === 'receipt_child_count_invalid',
    partialParentRemainsDraft: partialParentAfter.row.result === 'receipt_draft',
    receiptRedactionOk: receiptRedactionOk,
    providerCallAttempted: false,
    wrapperPrepared: false,
    wrapperRemovedAfterManualRun: true,
    wrapperInvoked: false,
    liveSheetTouchedByTest: false,
    scriptPropertiesAccessed: false,
    triggerInstall: false,
    routeCreated: false,
    visibleDelivery: false,
    dispatch: false,
    externalWrite: false,
    gateB3Started: false
  };
}

// Mission Command Stage 3.4 Gate B3A local preparation only.
// Defines the readable review contract with fake adapters; no live tab, provider, wrapper, route, or trigger.
var MC_STAGE34_GATE_B3A_BUILD = 'mmos-20260712-stage3-4-gate-b3a-local-preparation';
var MC_STAGE34_GATE_B3A_ENABLED = false;
var MC_STAGE34_GATE_B3A_KILL_SWITCH = true;
var MC_STAGE34_GATE_B3A_REVIEW_TAB_NAME = 'Mission Command Shadow Candidate Review';
var MC_STAGE34_GATE_B3A_PRIVACY_CLASS = 'internal_synthetic_readable_review';
var MC_STAGE34_GATE_B3A_RETENTION_DAYS = 7;
var MC_STAGE34_GATE_B3A_REVIEW_HEADERS = [
  'review_row_id',
  'review_batch_id',
  'fixture_id',
  'fixture_pack_sha256',
  'receipt_related_object',
  'receipt_parent_id',
  'receipt_child_id',
  'candidate_sha256',
  'role_owner',
  'escalated_from',
  'family',
  'priority',
  'why_now',
  'material_change',
  'next_move_type',
  'candidate_text',
  'schema_valid',
  'review_state',
  'reviewer',
  'reviewed_at',
  'privacy_class',
  'retention_due_at',
  'redacted_at',
  'redaction_reason',
  'batch_state',
  'boundary_flags'
];
var MC_STAGE34_GATE_B3A_FIXTURE_IDS = ['MC34-F01', 'MC34-F04', 'MC34-F12', 'MC34-F15'];
var MC_STAGE34_GATE_B3A_READABLE_FIELDS = [
  'fixture_id',
  'role_owner',
  'escalated_from',
  'family',
  'priority',
  'why_now',
  'material_change',
  'next_move_type',
  'candidate_text'
];
var MC_STAGE34_GATE_B3A_RECEIPT_PARENT_TYPE = 'stage_3_4_gate_b3_review_parent';
var MC_STAGE34_GATE_B3A_RECEIPT_CHILD_TYPE = 'stage_3_4_gate_b3_candidate_hash';

function getMissionCommandStage34GateB3AFlags(input) {
  input = input || {};
  return {
    gateB3AEnabled: MC_STAGE34_GATE_B3A_ENABLED === true && MC_STAGE34_GATE_B3A_KILL_SWITCH !== true,
    killSwitchEnabled: MC_STAGE34_GATE_B3A_KILL_SWITCH === true,
    liveSheetEnabled: false,
    providerEnabled: false,
    scriptPropertiesEnabled: false,
    wrapperEnabled: false,
    routeEnabled: false,
    triggerEnabled: false,
    visibleDeliveryEnabled: false,
    dispatchEnabled: false,
    externalWriteEnabled: false,
    deleteEnabled: false
  };
}

function getMissionCommandStage34GateB3AReviewHeaders() {
  return MC_STAGE34_GATE_B3A_REVIEW_HEADERS.slice();
}

function validateMissionCommandStage34GateB3AReviewHeaders(headers) {
  headers = headers || [];
  var expected = getMissionCommandStage34GateB3AReviewHeaders();
  var missing = expected.filter(function(header) {
    return headers.indexOf(header) === -1;
  });
  var exactOrder = headers.length === expected.length && missing.length === 0 && expected.every(function(header, index) {
    return headers[index] === header;
  });
  return { ok: missing.length === 0 && exactOrder, missing: missing, exactOrder: exactOrder };
}

function getMissionCommandStage34GateB3AFixtureAllowlist() {
  return MC_STAGE34_GATE_B3A_FIXTURE_IDS.slice();
}

function isMissionCommandStage34GateB3AFixtureAllowed(fixtureId) {
  return getMissionCommandStage34GateB3AFixtureAllowlist().indexOf(String(fixtureId || '')) !== -1;
}

function getMissionCommandStage34GateB3ADenylistPatterns() {
  return [
    /api[_ -]?key/i,
    /authorization/i,
    /bearer/i,
    /script\s*propert/i,
    /raw[_ -]?prompt/i,
    /raw[_ -]?provider/i,
    /raw[_ -]?response/i,
    /provider[_ -]?envelope/i,
    /hidden[_ -]?reasoning/i,
    /chain[_ -]?of[_ -]?thought/i,
    /conversation[_ -]?id/i,
    /previous_response_id/i,
    /visible[_ -]?delivery/i,
    /dispatch/i,
    /external[_ -]?write/i,
    /live[_ -]?source/i,
    /customer[_ -]?data/i,
    /client[_ -]?secret/i
  ];
}

function assertMissionCommandStage34GateB3AReadableSafe(value) {
  var text = '';
  try {
    text = JSON.stringify(value || {});
  } catch (err) {
    return { ok: false, reason: 'candidate_not_serializable' };
  }
  var matched = getMissionCommandStage34GateB3ADenylistPatterns().filter(function(pattern) {
    return pattern.test(text);
  });
  return { ok: matched.length === 0, reason: matched.length ? 'privacy_denylist_match' : '' };
}

function getMissionCommandStage34GateB3AFixtureMap() {
  return {
    'MC34-F01': { roleOwner: 'executive_assistant', family: 'executive_assistant_critical', priority: 'critical', escalatedFrom: '' },
    'MC34-F04': { roleOwner: 'chief_of_staff', family: 'chief_coordination', priority: 'important', escalatedFrom: '' },
    'MC34-F12': { roleOwner: 'chief_of_staff', family: 'material_change_reopen', priority: 'critical', escalatedFrom: '' },
    'MC34-F15': { roleOwner: 'executive_assistant', family: 'attributed_chief_escalation', priority: 'important', escalatedFrom: 'chief_of_staff' }
  };
}

function makeMissionCommandStage34GateB3ABatchKey(runId) {
  return missionCommandStage34GateB1Hash(['stage_3_4_gate_b3', MC_STAGE34_GATE_B1_FIXTURE_SHA256, runId].join('|'));
}

function makeMissionCommandStage34GateB3ARelatedObject(batchKey) {
  return 'mc34b3:' + String(batchKey || '');
}

function makeMissionCommandStage34GateB3AReviewRowId(batchKey, fixtureId) {
  return 'mc34b3r:' + String(batchKey || '').slice(0, 16) + ':' + String(fixtureId || '');
}

function makeMissionCommandStage34GateB3ACandidateId(batchKey, fixtureId) {
  return 'cand_mc34b3_' + String(batchKey || '').slice(0, 16) + '_' + String(fixtureId || '');
}

function makeMissionCommandStage34GateB3AReceiptId(kind, batchKey, fixtureId) {
  if (kind === 'parent') return 'rcp_mc34b3_parent_' + String(batchKey || '').slice(0, 16);
  return 'rcp_mc34b3_child_' + String(batchKey || '').slice(0, 16) + '_' + String(fixtureId || '');
}

function makeMissionCommandStage34GateB3ACandidateHash(candidate) {
  var canonical = JSON.stringify(candidate || {}, Object.keys(candidate || {}).sort());
  return missionCommandStage34GateB1Hash(canonical);
}

function makeMissionCommandStage34GateB3AFakeRuntimeAdapter(headers, rows, options) {
  return makeMissionCommandStage33RLocalReceiptAdapter(headers || getMissionCommandStage33RRequiredReceiptHeaders(), rows || [], options || {});
}

function makeMissionCommandStage34GateB3AFakeReviewAdapter(headers, rows, options) {
  options = options || {};
  return {
    tabName: MC_STAGE34_GATE_B3A_REVIEW_TAB_NAME,
    headers: headers || getMissionCommandStage34GateB3AReviewHeaders(),
    rows: (rows || []).slice(),
    lockAvailable: options.lockAvailable !== false,
    appendFails: options.appendFails === true,
    updateFails: options.updateFails === true,
    lockEvents: [],
    appendedRows: 0,
    updatedRows: 0,
    deletedRows: 0,
    acquireLock: function(label) {
      this.lockEvents.push('acquire:' + label);
      return this.lockAvailable === true;
    },
    releaseLock: function(label) {
      this.lockEvents.push('release:' + label);
    },
    refreshRows: function() {
      return true;
    },
    appendRowObject: function(row) {
      if (this.appendFails) throw new Error('local_review_append_failed');
      this.rows.push(row);
      this.appendedRows += 1;
      return this.rows.length;
    },
    updateRowObject: function(index, row, expected) {
      if (this.updateFails) throw new Error('local_review_update_failed');
      expected = expected || {};
      var current = this.rows[index];
      if (!current) throw new Error('local_review_update_missing_row');
      if (Object.prototype.hasOwnProperty.call(expected, 'version') && safeMissionCommandOpenAiNumberV31(current.version) !== safeMissionCommandOpenAiNumberV31(expected.version)) {
        throw new Error('local_review_update_version_conflict');
      }
      if (Object.prototype.hasOwnProperty.call(expected, 'etag') && String(current.etag || '') !== String(expected.etag || '')) {
        throw new Error('local_review_update_etag_conflict');
      }
      this.rows[index] = row;
      this.updatedRows += 1;
      return index + 1;
    }
  };
}

function refreshMissionCommandStage34GateB3AReviewAdapterUnderLock(adapter) {
  if (!adapter) return { ok: false, stopCondition: 'review_adapter_missing', missing: [] };
  if (typeof adapter.refreshRows === 'function') adapter.refreshRows();
  var headerCheck = validateMissionCommandStage34GateB3AReviewHeaders(adapter.headers);
  if (!headerCheck.ok) return { ok: false, stopCondition: 'review_contract_invalid', missing: headerCheck.missing };
  return { ok: true, stopCondition: '', missing: [] };
}

function findMissionCommandStage34GateB3AReceiptRows(adapter, relatedObject) {
  return (adapter.rows || []).map(function(row, index) {
    return { row: row, index: index };
  }).filter(function(entry) {
    return entry.row.related_object === relatedObject;
  });
}

function findMissionCommandStage34GateB3AReviewRows(adapter, batchKey) {
  return (adapter.rows || []).map(function(row, index) {
    return { row: row, index: index };
  }).filter(function(entry) {
    return entry.row.review_batch_id === batchKey;
  });
}

function findMissionCommandStage34GateB3AReviewRow(adapter, reviewRowId) {
  var rows = (adapter.rows || []).map(function(row, index) {
    return { row: row, index: index };
  });
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].row.review_row_id === reviewRowId) return rows[i];
  }
  return null;
}

function findMissionCommandStage34GateB3AChildReceipt(adapter, batchKey, fixtureId) {
  var receiptId = makeMissionCommandStage34GateB3AReceiptId('child', batchKey, fixtureId);
  var relatedObject = makeMissionCommandStage34GateB3ARelatedObject(batchKey);
  var rows = (adapter.rows || []).map(function(row, index) {
    return { row: row, index: index };
  });
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].row.receipt_id === receiptId &&
        rows[i].row.related_object === relatedObject &&
        rows[i].row.receipt_type === MC_STAGE34_GATE_B3A_RECEIPT_CHILD_TYPE) return rows[i];
  }
  return null;
}

function parseMissionCommandStage34GateB3ASafeSummary(row) {
  try {
    return JSON.parse(String((row || {}).safe_summary || '{}'));
  } catch (err) {
    return {};
  }
}

function makeMissionCommandStage34GateB3ABlocked(reason, detail) {
  return {
    ok: false,
    status: 'blocked',
    build: MC_STAGE34_GATE_B3A_BUILD,
    stopCondition: reason || 'gate_b3a_blocked',
    safeDetail: detail || '',
    providerImplicationAllowed: false,
    providerCallAttempted: false,
    liveSheetTouched: false,
    scriptPropertiesAccessed: false,
    wrapperCreated: false,
    routeCreated: false,
    triggerInstall: false,
    visibleDelivery: false,
    dispatch: false,
    externalWrite: false,
    autoDelete: false
  };
}

function makeMissionCommandStage34GateB3AParentReceipt(runId, batchKey) {
  var relatedObject = makeMissionCommandStage34GateB3ARelatedObject(batchKey);
  var summary = {
    stage: MC_STAGE34_GATE_B1_STAGE_ID,
    gate: 'b3a_local_preparation_parent',
    run_id: runId,
    fixture_pack_sha256: MC_STAGE34_GATE_B1_FIXTURE_SHA256,
    fixtures_expected: MC_STAGE34_GATE_B3A_FIXTURE_IDS.slice(),
    readable_text_stored: false,
    provider_call_attempted: false,
    review_tab: MC_STAGE34_GATE_B3A_REVIEW_TAB_NAME
  };
  return {
    receipt_id: makeMissionCommandStage34GateB3AReceiptId('parent', batchKey),
    profile_id: MC_STAGE34_GATE_B1_PROFILE_ID,
    receipt_type: MC_STAGE34_GATE_B3A_RECEIPT_PARENT_TYPE,
    source: 'stage_3_4_gate_b3a_local_preparation',
    related_object: relatedObject,
    result: 'receipt_draft',
    safe_summary: JSON.stringify(summary),
    provider_key: '',
    model_key: '',
    role: 'batch',
    latency_ms: '',
    input_tokens: '',
    cached_input_tokens: '',
    cache_write_tokens: '',
    output_tokens: '',
    reasoning_tokens: '',
    retry_count: 0,
    estimated_cost: '',
    fallback_reason: '',
    safety_identifier_hash: missionCommandStage34GateB1Hash(summary),
    created_at: '',
    device_id: MC_STAGE34_GATE_B1_PROFILE_ID,
    request_id: runId,
    privacy_class: MC_STAGE34_GATE_B1_PRIVACY_CLASS,
    retention_class: MC_STAGE34_GATE_B1_RETENTION_CLASS,
    next_action: 'review_gate_b3_readable_surface_contract',
    team_chat_receipt_url: '',
    version: 1,
    etag: 'etag_' + missionCommandStage34GateB1Hash(summary).slice(0, 24),
    updated_at: '',
    updated_by: MC_STAGE34_GATE_B3A_BUILD,
    last_request_id: runId
  };
}

function makeMissionCommandStage34GateB3AChildReceipt(runId, batchKey, fixtureId, candidateHash, reviewRowId) {
  var relatedObject = makeMissionCommandStage34GateB3ARelatedObject(batchKey);
  var fixtureMeta = getMissionCommandStage34GateB3AFixtureMap()[fixtureId] || {};
  var summary = {
    gate: 'b3a_hash_only_child',
    fixture_id: fixtureId,
    candidate_sha256: candidateHash,
    review_row_id: reviewRowId,
    readable_text_stored: false,
    provider_call_attempted: false
  };
  return {
    receipt_id: makeMissionCommandStage34GateB3AReceiptId('child', batchKey, fixtureId),
    profile_id: MC_STAGE34_GATE_B1_PROFILE_ID,
    receipt_type: MC_STAGE34_GATE_B3A_RECEIPT_CHILD_TYPE,
    source: 'stage_3_4_gate_b3a_local_preparation',
    related_object: relatedObject,
    result: 'hash_logged',
    safe_summary: JSON.stringify(summary),
    provider_key: '',
    model_key: '',
    role: fixtureMeta.roleOwner || '',
    latency_ms: '',
    input_tokens: '',
    cached_input_tokens: '',
    cache_write_tokens: '',
    output_tokens: '',
    reasoning_tokens: '',
    retry_count: 0,
    estimated_cost: '',
    fallback_reason: '',
    safety_identifier_hash: missionCommandStage34GateB1Hash(summary),
    created_at: '',
    device_id: MC_STAGE34_GATE_B1_PROFILE_ID,
    request_id: runId,
    privacy_class: MC_STAGE34_GATE_B1_PRIVACY_CLASS,
    retention_class: MC_STAGE34_GATE_B1_RETENTION_CLASS,
    next_action: 'link_hash_to_readable_review_row',
    team_chat_receipt_url: '',
    version: 1,
    etag: 'etag_' + missionCommandStage34GateB1Hash(summary).slice(0, 24),
    updated_at: '',
    updated_by: MC_STAGE34_GATE_B3A_BUILD,
    last_request_id: runId
  };
}

function makeMissionCommandStage34GateB3ABlankReviewRow(runId, batchKey, fixtureId) {
  var fixtureMeta = getMissionCommandStage34GateB3AFixtureMap()[fixtureId] || {};
  var reviewRowId = makeMissionCommandStage34GateB3AReviewRowId(batchKey, fixtureId);
  return {
    review_row_id: reviewRowId,
    review_batch_id: batchKey,
    fixture_id: fixtureId,
    fixture_pack_sha256: MC_STAGE34_GATE_B1_FIXTURE_SHA256,
    receipt_related_object: makeMissionCommandStage34GateB3ARelatedObject(batchKey),
    receipt_parent_id: makeMissionCommandStage34GateB3AReceiptId('parent', batchKey),
    receipt_child_id: '',
    candidate_sha256: '',
    role_owner: fixtureMeta.roleOwner || '',
    escalated_from: fixtureMeta.escalatedFrom || '',
    family: fixtureMeta.family || '',
    priority: fixtureMeta.priority || '',
    why_now: '',
    material_change: '',
    next_move_type: '',
    candidate_text: '',
    schema_valid: false,
    review_state: 'unreviewed',
    reviewer: '',
    reviewed_at: '',
    privacy_class: MC_STAGE34_GATE_B3A_PRIVACY_CLASS,
    retention_due_at: '2099-10-08T00:00:00Z',
    redacted_at: '',
    redaction_reason: '',
    batch_state: 'reserved',
    boundary_flags: JSON.stringify({
      raw_prompt_stored: false,
      raw_provider_response_stored: false,
      visible_delivery: false,
      dispatch: false,
      external_write: false,
      route_created: false
    }),
    version: 1,
    etag: 'etag_' + missionCommandStage34GateB1Hash(reviewRowId).slice(0, 24)
  };
}

function claimMissionCommandStage34GateB3AParent(runtimeAdapter, runId, batchKey) {
  var relatedObject = makeMissionCommandStage34GateB3ARelatedObject(batchKey);
  if (!runtimeAdapter || !runtimeAdapter.acquireLock) return makeMissionCommandStage34GateB3ABlocked('runtime_adapter_missing', 'Runtime receipt fake adapter missing.');
  if (!runtimeAdapter.acquireLock('stage34_b3a_parent_claim')) return makeMissionCommandStage34GateB3ABlocked('runtime_lock_unavailable', 'Runtime receipt parent lock unavailable.');
  try {
    var refresh = refreshMissionCommandStage33RAdapterUnderLock(runtimeAdapter);
    if (!refresh.ok) return makeMissionCommandStage34GateB3ABlocked(refresh.stopCondition, 'Runtime receipt headers missing.');
    if (findMissionCommandStage34GateB3AReceiptRows(runtimeAdapter, relatedObject).length) {
      return { ok: false, status: 'duplicate_suppressed', providerImplicationAllowed: false, providerCallAttempted: false };
    }
    var parent = makeMissionCommandStage34GateB3AParentReceipt(runId, batchKey);
    runtimeAdapter.appendRowObject(parent);
    return { ok: true, status: 'parent_claimed', parent: parent, providerImplicationAllowed: false, providerCallAttempted: false };
  } catch (err) {
    return makeMissionCommandStage34GateB3ABlocked('parent_claim_failed', 'Parent claim failed before provider implication.');
  } finally {
    runtimeAdapter.releaseLock('stage34_b3a_parent_claim');
  }
}

function reserveMissionCommandStage34GateB3AReviewRows(reviewAdapter, runId, batchKey) {
  if (!reviewAdapter || !reviewAdapter.acquireLock) return makeMissionCommandStage34GateB3ABlocked('review_adapter_missing', 'Review fake adapter missing.');
  if (!reviewAdapter.acquireLock('stage34_b3a_review_reserve')) return makeMissionCommandStage34GateB3ABlocked('review_lock_unavailable', 'Review reservation lock unavailable.');
  try {
    var refresh = refreshMissionCommandStage34GateB3AReviewAdapterUnderLock(reviewAdapter);
    if (!refresh.ok) return makeMissionCommandStage34GateB3ABlocked(refresh.stopCondition, 'Review tab headers missing.');
    var reserved = [];
    for (var i = 0; i < MC_STAGE34_GATE_B3A_FIXTURE_IDS.length; i++) {
      var fixtureId = MC_STAGE34_GATE_B3A_FIXTURE_IDS[i];
      var reviewRowId = makeMissionCommandStage34GateB3AReviewRowId(batchKey, fixtureId);
      if (findMissionCommandStage34GateB3AReviewRow(reviewAdapter, reviewRowId)) return { ok: false, status: 'duplicate_suppressed', providerImplicationAllowed: false, providerCallAttempted: false };
      var row = makeMissionCommandStage34GateB3ABlankReviewRow(runId, batchKey, fixtureId);
      reviewAdapter.appendRowObject(row);
      reserved.push(row);
    }
    return { ok: true, status: 'four_blank_rows_reserved', rows: reserved, providerImplicationAllowed: false, providerCallAttempted: false };
  } catch (err) {
    return makeMissionCommandStage34GateB3ABlocked('review_reservation_failed', 'Review row reservation failed before provider implication.');
  } finally {
    reviewAdapter.releaseLock('stage34_b3a_review_reserve');
  }
}

function validateMissionCommandStage34GateB3ACandidate(candidate) {
  candidate = candidate || {};
  if (!isMissionCommandStage34GateB3AFixtureAllowed(candidate.fixture_id)) return { ok: false, reason: 'fixture_not_allowed' };
  var fixtureMeta = getMissionCommandStage34GateB3AFixtureMap()[candidate.fixture_id] || {};
  if (candidate.role_owner !== fixtureMeta.roleOwner) return { ok: false, reason: 'role_owner_invalid' };
  var keys = Object.keys(candidate);
  for (var i = 0; i < keys.length; i++) {
    if (MC_STAGE34_GATE_B3A_READABLE_FIELDS.indexOf(keys[i]) === -1) return { ok: false, reason: 'field_not_allowed' };
  }
  var safety = assertMissionCommandStage34GateB3AReadableSafe(candidate);
  if (!safety.ok) return safety;
  if (!candidate.candidate_text || String(candidate.candidate_text).length > 600) return { ok: false, reason: 'candidate_text_invalid' };
  return { ok: true, reason: '' };
}

function appendMissionCommandStage34GateB3AHashChild(runtimeAdapter, runId, batchKey, fixtureId, candidateHash, reviewRowId) {
  if (!runtimeAdapter.acquireLock('stage34_b3a_hash_child_' + fixtureId)) return makeMissionCommandStage34GateB3ABlocked('runtime_lock_unavailable', 'Hash child lock unavailable.');
  try {
    var refresh = refreshMissionCommandStage33RAdapterUnderLock(runtimeAdapter);
    if (!refresh.ok) return makeMissionCommandStage34GateB3ABlocked(refresh.stopCondition, 'Runtime receipt headers missing.');
    var row = makeMissionCommandStage34GateB3AChildReceipt(runId, batchKey, fixtureId, candidateHash, reviewRowId);
    var existing = findMissionCommandStage34GateB3AChildReceipt(runtimeAdapter, batchKey, fixtureId);
    if (existing) return { ok: false, status: 'duplicate_suppressed', row: existing.row, providerImplicationAllowed: false, providerCallAttempted: false };
    runtimeAdapter.appendRowObject(row);
    return { ok: true, status: 'hash_child_logged', row: row, providerCallAttempted: false };
  } catch (err) {
    return makeMissionCommandStage34GateB3ABlocked('hash_child_failed', 'Hash-only child receipt failed before readable candidate text.');
  } finally {
    runtimeAdapter.releaseLock('stage34_b3a_hash_child_' + fixtureId);
  }
}

function verifyMissionCommandStage34GateB3AHashChildEvidence(runtimeAdapter, batchKey, fixtureId, candidateHash, reviewRowId) {
  var child = findMissionCommandStage34GateB3AChildReceipt(runtimeAdapter, batchKey, fixtureId);
  if (!child) return { ok: false, stopCondition: 'hash_child_missing', child: null };
  var summary = parseMissionCommandStage34GateB3ASafeSummary(child.row);
  if (summary.fixture_id !== fixtureId) return { ok: false, stopCondition: 'hash_child_fixture_mismatch', child: child.row };
  if (summary.candidate_sha256 !== candidateHash) return { ok: false, stopCondition: 'hash_child_hash_mismatch', child: child.row };
  if (summary.review_row_id !== reviewRowId) return { ok: false, stopCondition: 'hash_child_review_row_mismatch', child: child.row };
  if (child.row.related_object !== makeMissionCommandStage34GateB3ARelatedObject(batchKey)) return { ok: false, stopCondition: 'hash_child_batch_mismatch', child: child.row };
  return { ok: true, stopCondition: '', child: child.row };
}

function writeMissionCommandStage34GateB3AReadableCandidate(runtimeAdapter, reviewAdapter, runId, batchKey, candidate, candidateHash, receiptChildId) {
  var fixtureId = candidate.fixture_id;
  var reviewRowId = makeMissionCommandStage34GateB3AReviewRowId(batchKey, fixtureId);
  if (!reviewAdapter.acquireLock('stage34_b3a_readable_' + fixtureId)) return makeMissionCommandStage34GateB3ABlocked('review_lock_unavailable', 'Readable row lock unavailable.');
  try {
    var childEvidence = verifyMissionCommandStage34GateB3AHashChildEvidence(runtimeAdapter, batchKey, fixtureId, candidateHash, reviewRowId);
    if (!childEvidence.ok) return makeMissionCommandStage34GateB3ABlocked(childEvidence.stopCondition, 'Readable candidate write requires matching hash-only child receipt evidence.');
    if (childEvidence.child.receipt_id !== receiptChildId) return makeMissionCommandStage34GateB3ABlocked('hash_child_receipt_id_mismatch', 'Readable candidate write requires the matching child receipt ID.');
    var refresh = refreshMissionCommandStage34GateB3AReviewAdapterUnderLock(reviewAdapter);
    if (!refresh.ok) return makeMissionCommandStage34GateB3ABlocked(refresh.stopCondition, 'Review tab headers missing.');
    var found = findMissionCommandStage34GateB3AReviewRow(reviewAdapter, reviewRowId);
    if (!found) return makeMissionCommandStage34GateB3ABlocked('review_reservation_missing', 'Readable row reservation missing.');
    if (String(found.row.candidate_sha256 || '') || String(found.row.candidate_text || '') || found.row.schema_valid === true) {
      return { ok: false, status: 'duplicate_suppressed', row: found.row, providerImplicationAllowed: false, providerCallAttempted: false };
    }
    var expected = { version: found.row.version, etag: found.row.etag };
    var updated = Object.assign({}, found.row, {
      receipt_child_id: receiptChildId,
      candidate_sha256: candidateHash,
      why_now: candidate.why_now || '',
      material_change: candidate.material_change || '',
      next_move_type: candidate.next_move_type || '',
      candidate_text: candidate.candidate_text || '',
      schema_valid: true,
      batch_state: 'partial',
      version: safeMissionCommandOpenAiNumberV31(found.row.version) + 1,
      etag: 'etag_' + missionCommandStage34GateB1Hash(reviewRowId + candidateHash).slice(0, 24)
    });
    reviewAdapter.updateRowObject(found.index, updated, expected);
    return { ok: true, status: 'readable_candidate_written', row: updated, providerCallAttempted: false };
  } catch (err) {
    return makeMissionCommandStage34GateB3ABlocked('review_write_failed', 'Readable candidate write failed after hash-only child.');
  } finally {
    reviewAdapter.releaseLock('stage34_b3a_readable_' + fixtureId);
  }
}

function addMissionCommandStage34GateB3ACandidate(runtimeAdapter, reviewAdapter, runId, batchKey, candidate) {
  var validation = validateMissionCommandStage34GateB3ACandidate(candidate);
  if (!validation.ok) return makeMissionCommandStage34GateB3ABlocked(validation.reason, 'Readable candidate failed validation.');
  var candidateHash = makeMissionCommandStage34GateB3ACandidateHash(candidate);
  var reviewRowId = makeMissionCommandStage34GateB3AReviewRowId(batchKey, candidate.fixture_id);
  var child = appendMissionCommandStage34GateB3AHashChild(runtimeAdapter, runId, batchKey, candidate.fixture_id, candidateHash, reviewRowId);
  if (!child.ok) return child;
  return writeMissionCommandStage34GateB3AReadableCandidate(runtimeAdapter, reviewAdapter, runId, batchKey, candidate, candidateHash, child.row.receipt_id);
}

function finalizeMissionCommandStage34GateB3ABatch(runtimeAdapter, reviewAdapter, runId, batchKey) {
  if (!runtimeAdapter.acquireLock('stage34_b3a_finalize_runtime')) return makeMissionCommandStage34GateB3ABlocked('runtime_lock_unavailable', 'Finalize runtime lock unavailable.');
  if (!reviewAdapter.acquireLock('stage34_b3a_finalize_review')) {
    runtimeAdapter.releaseLock('stage34_b3a_finalize_runtime');
    return makeMissionCommandStage34GateB3ABlocked('review_lock_unavailable', 'Finalize review lock unavailable.');
  }
  try {
  var runtimeRefresh = refreshMissionCommandStage33RAdapterUnderLock(runtimeAdapter);
  if (!runtimeRefresh.ok) return makeMissionCommandStage34GateB3ABlocked(runtimeRefresh.stopCondition, 'Runtime receipt headers missing.');
  var reviewRefresh = refreshMissionCommandStage34GateB3AReviewAdapterUnderLock(reviewAdapter);
  if (!reviewRefresh.ok) return makeMissionCommandStage34GateB3ABlocked(reviewRefresh.stopCondition, 'Review tab headers missing.');
  var relatedObject = makeMissionCommandStage34GateB3ARelatedObject(batchKey);
  var receiptRows = findMissionCommandStage34GateB3AReceiptRows(runtimeAdapter, relatedObject);
  var parentRows = receiptRows.filter(function(entry) { return entry.row.receipt_type === MC_STAGE34_GATE_B3A_RECEIPT_PARENT_TYPE; });
  var childRows = receiptRows.filter(function(entry) { return entry.row.receipt_type === MC_STAGE34_GATE_B3A_RECEIPT_CHILD_TYPE; });
  var reviewRows = findMissionCommandStage34GateB3AReviewRows(reviewAdapter, batchKey);
  var completeReviewRows = reviewRows.filter(function(entry) {
    return entry.row.schema_valid === true && String(entry.row.candidate_text || '') !== '' && String(entry.row.candidate_sha256 || '') !== '';
  });
  if (parentRows.length !== 1 || childRows.length !== 4 || reviewRows.length !== 4 || completeReviewRows.length !== 4) return makeMissionCommandStage34GateB3ABlocked('b3a_exact_four_required', 'Finalization requires one parent, four hash-only children, and four complete review rows.');
  for (var i = 0; i < MC_STAGE34_GATE_B3A_FIXTURE_IDS.length; i++) {
    var fixtureId = MC_STAGE34_GATE_B3A_FIXTURE_IDS[i];
    var reviewRowId = makeMissionCommandStage34GateB3AReviewRowId(batchKey, fixtureId);
    var reviewRow = findMissionCommandStage34GateB3AReviewRow(reviewAdapter, reviewRowId);
    if (!reviewRow || reviewRow.row.fixture_id !== fixtureId) return makeMissionCommandStage34GateB3ABlocked('b3a_review_set_invalid', 'Exact four deterministic review rows are required.');
    var child = findMissionCommandStage34GateB3AChildReceipt(runtimeAdapter, batchKey, fixtureId);
    if (!child) return makeMissionCommandStage34GateB3ABlocked('b3a_child_set_invalid', 'Exact four deterministic child receipts are required.');
    var summary = parseMissionCommandStage34GateB3ASafeSummary(child.row);
    if (summary.fixture_id !== fixtureId ||
        summary.candidate_sha256 !== reviewRow.row.candidate_sha256 ||
        summary.review_row_id !== reviewRowId ||
        reviewRow.row.receipt_child_id !== child.row.receipt_id) {
      return makeMissionCommandStage34GateB3ABlocked('b3a_hash_link_invalid', 'Child receipt and readable review row linkage must match exactly.');
    }
  }
  var parentEntry = parentRows[0];
  var updatedParent = Object.assign({}, parentEntry.row, {
    result: 'logged',
    version: safeMissionCommandOpenAiNumberV31(parentEntry.row.version) + 1,
    etag: 'etag_' + missionCommandStage34GateB1Hash(parentEntry.row.receipt_id + ':logged:' + batchKey).slice(0, 24),
    updated_by: MC_STAGE34_GATE_B3A_BUILD,
    last_request_id: runId
  });
  runtimeAdapter.updateRowObject(parentEntry.index, updatedParent, { version: parentEntry.row.version, etag: parentEntry.row.etag });
  for (var j = 0; j < reviewRows.length; j++) {
    var reviewEntry = reviewRows[j];
    var updatedReview = Object.assign({}, reviewEntry.row, {
      batch_state: 'review_ready',
      version: safeMissionCommandOpenAiNumberV31(reviewEntry.row.version) + 1,
      etag: 'etag_' + missionCommandStage34GateB1Hash(reviewEntry.row.review_row_id + ':review_ready:' + batchKey).slice(0, 24)
    });
    reviewAdapter.updateRowObject(reviewEntry.index, updatedReview, { version: reviewEntry.row.version, etag: reviewEntry.row.etag });
  }
  return { ok: true, status: 'review_ready', childrenWritten: childRows.length, reviewRowsComplete: completeReviewRows.length, parentResult: 'logged', providerCallAttempted: false };
  } catch (err) {
    return makeMissionCommandStage34GateB3ABlocked('b3a_finalize_failed', 'Finalization update failed.');
  } finally {
    reviewAdapter.releaseLock('stage34_b3a_finalize_review');
    runtimeAdapter.releaseLock('stage34_b3a_finalize_runtime');
  }
}

function markMissionCommandStage34GateB3ARedactionPending(reviewAdapter, nowIso) {
  var now = new Date(nowIso || '').getTime();
  var changed = 0;
  for (var i = 0; i < reviewAdapter.rows.length; i++) {
    var row = reviewAdapter.rows[i];
    var due = new Date(row.retention_due_at || '').getTime();
    if (isFinite(now) && isFinite(due) && due <= now && row.batch_state !== 'redacted') {
      var updated = Object.assign({}, row, {
        batch_state: 'redaction_pending',
        review_state: row.review_state === 'unreviewed' ? 'expired' : row.review_state,
        version: safeMissionCommandOpenAiNumberV31(row.version) + 1,
        etag: 'etag_' + missionCommandStage34GateB1Hash(row.review_row_id + nowIso).slice(0, 24)
      });
      reviewAdapter.updateRowObject(i, updated, { version: row.version, etag: row.etag });
      changed += 1;
    }
  }
  return { ok: true, status: 'redaction_pending_marked', rowsMarked: changed, rowsDeleted: reviewAdapter.deletedRows || 0 };
}

function makeMissionCommandStage34GateB3ASafeCandidates() {
  return [
    {
      fixture_id: 'MC34-F01',
      role_owner: 'executive_assistant',
      escalated_from: '',
      family: 'executive_assistant_critical',
      priority: 'critical',
      why_now: 'A synthetic approval window moved into the today bucket.',
      material_change: 'deadline_now_today',
      next_move_type: 'review_and_approve_or_revise',
      candidate_text: 'Review the synthetic approval and choose approve or revise before the window closes.'
    },
    {
      fixture_id: 'MC34-F04',
      role_owner: 'chief_of_staff',
      escalated_from: '',
      family: 'chief_coordination',
      priority: 'important',
      why_now: 'A synthetic review queue grew across a coordination lane.',
      material_change: 'review_queue_count_increased',
      next_move_type: 'stage_an_unblocker_for_review',
      candidate_text: 'Stage an unblocker for review so the synthetic coordination lane can move cleanly.'
    },
    {
      fixture_id: 'MC34-F12',
      role_owner: 'chief_of_staff',
      escalated_from: '',
      family: 'material_change_reopen',
      priority: 'critical',
      why_now: 'The synthetic due bucket worsened from later to overdue.',
      material_change: 'due_bucket_worsened',
      next_move_type: 'review_the_dependency',
      candidate_text: 'Review the dependency because the synthetic item reopened after its due bucket changed.'
    },
    {
      fixture_id: 'MC34-F15',
      role_owner: 'executive_assistant',
      escalated_from: 'chief_of_staff',
      family: 'attributed_chief_escalation',
      priority: 'important',
      why_now: 'Chief has synthetic team context ready and needs an A1XX decision.',
      material_change: 'chief_escalation_required',
      next_move_type: 'prepare_the_handoff_to_resume',
      candidate_text: 'Chief has the synthetic context ready; review the decision so the handoff can resume.'
    }
  ];
}

function verifyMissionCommandStage34GateB3ALocalChecks() {
  var runId = 'mc_stage34_gate_b3a_local_only';
  var batchKey = makeMissionCommandStage34GateB3ABatchKey(runId);
  var runtime = makeMissionCommandStage34GateB3AFakeRuntimeAdapter();
  var review = makeMissionCommandStage34GateB3AFakeReviewAdapter();
  var parent = claimMissionCommandStage34GateB3AParent(runtime, runId, batchKey);
  var reserve = reserveMissionCommandStage34GateB3AReviewRows(review, runId, batchKey);
  var candidates = makeMissionCommandStage34GateB3ASafeCandidates();
  var writeResults = candidates.map(function(candidate) {
    return addMissionCommandStage34GateB3ACandidate(runtime, review, runId, batchKey, candidate);
  });
  var final = finalizeMissionCommandStage34GateB3ABatch(runtime, review, runId, batchKey);
  var finalizedParent = findMissionCommandStage34GateB3AReceiptRows(runtime, makeMissionCommandStage34GateB3ARelatedObject(batchKey)).filter(function(entry) {
    return entry.row.receipt_type === MC_STAGE34_GATE_B3A_RECEIPT_PARENT_TYPE;
  })[0];
  var finalizedReviewRows = findMissionCommandStage34GateB3AReviewRows(review, batchKey);
  var duplicate = claimMissionCommandStage34GateB3AParent(runtime, runId, batchKey);
  var beforeDuplicateChildCount = findMissionCommandStage34GateB3AReceiptRows(runtime, makeMissionCommandStage34GateB3ARelatedObject(batchKey)).filter(function(entry) {
    return entry.row.receipt_type === MC_STAGE34_GATE_B3A_RECEIPT_CHILD_TYPE;
  }).length;
  var duplicateTextBefore = findMissionCommandStage34GateB3AReviewRow(review, makeMissionCommandStage34GateB3AReviewRowId(batchKey, 'MC34-F01')).row.candidate_text;
  var duplicateCandidate = addMissionCommandStage34GateB3ACandidate(runtime, review, runId, batchKey, candidates[0]);
  var afterDuplicateChildCount = findMissionCommandStage34GateB3AReceiptRows(runtime, makeMissionCommandStage34GateB3ARelatedObject(batchKey)).filter(function(entry) {
    return entry.row.receipt_type === MC_STAGE34_GATE_B3A_RECEIPT_CHILD_TYPE;
  }).length;
  var duplicateTextAfter = findMissionCommandStage34GateB3AReviewRow(review, makeMissionCommandStage34GateB3AReviewRowId(batchKey, 'MC34-F01')).row.candidate_text;
  var missingReviewHeaders = reserveMissionCommandStage34GateB3AReviewRows(makeMissionCommandStage34GateB3AFakeReviewAdapter(getMissionCommandStage34GateB3AReviewHeaders().filter(function(header) { return header !== 'candidate_text'; })), runId, batchKey);
  var missingRuntimeHeaders = claimMissionCommandStage34GateB3AParent(makeMissionCommandStage34GateB3AFakeRuntimeAdapter(getMissionCommandStage33RRequiredReceiptHeaders().filter(function(header) { return header !== 'safe_summary'; })), runId, batchKey);
  var reservationFail = reserveMissionCommandStage34GateB3AReviewRows(makeMissionCommandStage34GateB3AFakeReviewAdapter(null, [], { appendFails: true }), runId, batchKey);
  var childFailRuntime = makeMissionCommandStage34GateB3AFakeRuntimeAdapter(null, [], { appendFails: true });
  var childFailReview = makeMissionCommandStage34GateB3AFakeReviewAdapter();
  var childFailParent = claimMissionCommandStage34GateB3AParent(childFailRuntime, runId + '_child_fail', makeMissionCommandStage34GateB3ABatchKey(runId + '_child_fail'));
  var childFailReserve = reserveMissionCommandStage34GateB3AReviewRows(childFailReview, runId + '_child_fail', makeMissionCommandStage34GateB3ABatchKey(runId + '_child_fail'));
  var childFail = addMissionCommandStage34GateB3ACandidate(childFailRuntime, childFailReview, runId + '_child_fail', makeMissionCommandStage34GateB3ABatchKey(runId + '_child_fail'), candidates[0]);
  var childFailReviewRow = findMissionCommandStage34GateB3AReviewRow(childFailReview, makeMissionCommandStage34GateB3AReviewRowId(makeMissionCommandStage34GateB3ABatchKey(runId + '_child_fail'), 'MC34-F01'));
  var directRuntime = makeMissionCommandStage34GateB3AFakeRuntimeAdapter();
  var directReview = makeMissionCommandStage34GateB3AFakeReviewAdapter();
  var directKey = makeMissionCommandStage34GateB3ABatchKey(runId + '_direct');
  claimMissionCommandStage34GateB3AParent(directRuntime, runId + '_direct', directKey);
  reserveMissionCommandStage34GateB3AReviewRows(directReview, runId + '_direct', directKey);
  var directHash = makeMissionCommandStage34GateB3ACandidateHash(candidates[0]);
  var directWrite = writeMissionCommandStage34GateB3AReadableCandidate(directRuntime, directReview, runId + '_direct', directKey, candidates[0], directHash, makeMissionCommandStage34GateB3AReceiptId('child', directKey, 'MC34-F01'));
  var wrongRuntime = makeMissionCommandStage34GateB3AFakeRuntimeAdapter();
  var wrongReview = makeMissionCommandStage34GateB3AFakeReviewAdapter();
  var wrongKey = makeMissionCommandStage34GateB3ABatchKey(runId + '_wrong');
  claimMissionCommandStage34GateB3AParent(wrongRuntime, runId + '_wrong', wrongKey);
  reserveMissionCommandStage34GateB3AReviewRows(wrongReview, runId + '_wrong', wrongKey);
  var wrongHash = makeMissionCommandStage34GateB3ACandidateHash(candidates[0]);
  var wrongReviewRowId = makeMissionCommandStage34GateB3AReviewRowId(wrongKey, 'MC34-F01');
  appendMissionCommandStage34GateB3AHashChild(wrongRuntime, runId + '_wrong', wrongKey, 'MC34-F01', 'wrong_hash', wrongReviewRowId);
  var wrongWrite = writeMissionCommandStage34GateB3AReadableCandidate(wrongRuntime, wrongReview, runId + '_wrong', wrongKey, candidates[0], wrongHash, makeMissionCommandStage34GateB3AReceiptId('child', wrongKey, 'MC34-F01'));
  var partialRuntime = makeMissionCommandStage34GateB3AFakeRuntimeAdapter();
  var partialReview = makeMissionCommandStage34GateB3AFakeReviewAdapter();
  var partialKey = makeMissionCommandStage34GateB3ABatchKey(runId + '_partial');
  claimMissionCommandStage34GateB3AParent(partialRuntime, runId + '_partial', partialKey);
  reserveMissionCommandStage34GateB3AReviewRows(partialReview, runId + '_partial', partialKey);
  addMissionCommandStage34GateB3ACandidate(partialRuntime, partialReview, runId + '_partial', partialKey, candidates[0]);
  var partialParentBefore = findMissionCommandStage34GateB3AReceiptRows(partialRuntime, makeMissionCommandStage34GateB3ARelatedObject(partialKey))[0].row.result;
  var partialReviewBefore = findMissionCommandStage34GateB3AReviewRow(partialReview, makeMissionCommandStage34GateB3AReviewRowId(partialKey, 'MC34-F01')).row.batch_state;
  var partialFinal = finalizeMissionCommandStage34GateB3ABatch(partialRuntime, partialReview, runId + '_partial', partialKey);
  var partialParentAfter = findMissionCommandStage34GateB3AReceiptRows(partialRuntime, makeMissionCommandStage34GateB3ARelatedObject(partialKey))[0].row.result;
  var partialReviewAfter = findMissionCommandStage34GateB3AReviewRow(partialReview, makeMissionCommandStage34GateB3AReviewRowId(partialKey, 'MC34-F01')).row.batch_state;
  var substitutedRuntime = makeMissionCommandStage34GateB3AFakeRuntimeAdapter();
  var substitutedReview = makeMissionCommandStage34GateB3AFakeReviewAdapter();
  var substitutedKey = makeMissionCommandStage34GateB3ABatchKey(runId + '_substituted');
  claimMissionCommandStage34GateB3AParent(substitutedRuntime, runId + '_substituted', substitutedKey);
  reserveMissionCommandStage34GateB3AReviewRows(substitutedReview, runId + '_substituted', substitutedKey);
  candidates.forEach(function(candidate) {
    addMissionCommandStage34GateB3ACandidate(substitutedRuntime, substitutedReview, runId + '_substituted', substitutedKey, candidate);
  });
  substitutedReview.rows[3] = Object.assign({}, substitutedReview.rows[0]);
  var substitutedFinal = finalizeMissionCommandStage34GateB3ABatch(substitutedRuntime, substitutedReview, runId + '_substituted', substitutedKey);
  var unsafeCandidate = Object.assign({}, candidates[0], { candidate_text: 'raw provider response with api key' });
  var unsafe = validateMissionCommandStage34GateB3ACandidate(unsafeCandidate);
  var disallowed = validateMissionCommandStage34GateB3ACandidate(Object.assign({}, candidates[0], { fixture_id: 'MC34-F99' }));
  var staleReview = makeMissionCommandStage34GateB3AFakeReviewAdapter();
  reserveMissionCommandStage34GateB3AReviewRows(staleReview, runId + '_stale', makeMissionCommandStage34GateB3ABatchKey(runId + '_stale'));
  var staleRow = staleReview.rows[0];
  var staleBlocked = false;
  try {
    staleReview.updateRowObject(0, staleRow, { version: 999, etag: 'stale_etag' });
  } catch (err) {
    staleBlocked = true;
  }
  var beforeExpireCount = review.rows.length;
  var expire = markMissionCommandStage34GateB3ARedactionPending(review, '2099-10-09T00:00:00Z');
  var afterExpireCount = review.rows.length;
  var runtimeText = JSON.stringify(runtime.rows);
  var reviewText = JSON.stringify(review.rows);
  var flags = getMissionCommandStage34GateB3AFlags();
  var callerFlags = getMissionCommandStage34GateB3AFlags({ gateB3AEnabled: true });
  return {
    ok: parent.ok === true &&
      reserve.ok === true &&
      reserve.rows.length === 4 &&
      writeResults.every(function(result) { return result.ok === true; }) &&
      final.ok === true &&
      final.parentResult === 'logged' &&
      finalizedParent.row.result === 'logged' &&
      finalizedReviewRows.every(function(entry) { return entry.row.batch_state === 'review_ready'; }) &&
      final.childrenWritten === 4 &&
      final.reviewRowsComplete === 4 &&
      duplicate.status === 'duplicate_suppressed' &&
      duplicateCandidate.status === 'duplicate_suppressed' &&
      beforeDuplicateChildCount === afterDuplicateChildCount &&
      duplicateTextBefore === duplicateTextAfter &&
      missingReviewHeaders.stopCondition === 'review_contract_invalid' &&
      missingRuntimeHeaders.stopCondition === 'receipt_contract_invalid' &&
      reservationFail.stopCondition === 'review_reservation_failed' &&
      childFailParent.ok === false &&
      childFailParent.stopCondition === 'parent_claim_failed' &&
      childFailReserve.ok === true &&
      childFail.ok === false &&
      childFailReviewRow.row.candidate_text === '' &&
      directWrite.ok === false &&
      directWrite.stopCondition === 'hash_child_missing' &&
      wrongWrite.ok === false &&
      wrongWrite.stopCondition === 'hash_child_hash_mismatch' &&
      partialFinal.stopCondition === 'b3a_exact_four_required' &&
      partialParentBefore === partialParentAfter &&
      partialReviewBefore === partialReviewAfter &&
      substitutedFinal.ok === false &&
      substitutedFinal.stopCondition === 'b3a_review_set_invalid' &&
      unsafe.ok === false &&
      disallowed.ok === false &&
      staleBlocked === true &&
      expire.rowsMarked === 4 &&
      beforeExpireCount === afterExpireCount &&
      runtimeText.indexOf('candidate_text') === -1 &&
      runtimeText.indexOf('Review the synthetic') === -1 &&
      reviewText.indexOf('api key') === -1 &&
      flags.liveSheetEnabled === false &&
      flags.gateB3AEnabled === false &&
      flags.killSwitchEnabled === true &&
      callerFlags.gateB3AEnabled === false &&
      callerFlags.killSwitchEnabled === true &&
      flags.providerEnabled === false &&
      flags.scriptPropertiesEnabled === false &&
      flags.wrapperEnabled === false &&
      flags.routeEnabled === false &&
      flags.triggerEnabled === false &&
      flags.deleteEnabled === false,
    build: MC_STAGE34_GATE_B3A_BUILD,
    reviewTabName: MC_STAGE34_GATE_B3A_REVIEW_TAB_NAME,
    reviewHeaders: getMissionCommandStage34GateB3AReviewHeaders(),
    fixtureAllowlist: getMissionCommandStage34GateB3AFixtureAllowlist(),
    reviewRowsReserved: reserve.rows.length,
    childrenWritten: final.childrenWritten || 0,
    reviewRowsComplete: final.reviewRowsComplete || 0,
    duplicateSuppressed: duplicate.status === 'duplicate_suppressed',
    duplicateCandidateSuppressed: duplicateCandidate.status === 'duplicate_suppressed',
    duplicateChildCountUnchanged: beforeDuplicateChildCount === afterDuplicateChildCount,
    duplicateReadableNotOverwritten: duplicateTextBefore === duplicateTextAfter,
    missingReviewHeadersBlocked: missingReviewHeaders.stopCondition === 'review_contract_invalid',
    missingRuntimeHeadersBlocked: missingRuntimeHeaders.stopCondition === 'receipt_contract_invalid',
    reservationFailureBlocksProvider: reservationFail.stopCondition === 'review_reservation_failed',
    childBeforeText: childFailReviewRow.row.candidate_text === '',
    directReadableWithoutChildBlocked: directWrite.stopCondition === 'hash_child_missing',
    wrongHashLinkBlocked: wrongWrite.stopCondition === 'hash_child_hash_mismatch',
    partialFinalizationBlocked: partialFinal.stopCondition === 'b3a_exact_four_required',
    partialStatesUnchanged: partialParentBefore === partialParentAfter && partialReviewBefore === partialReviewAfter,
    substitutedSetBlocked: substitutedFinal.stopCondition === 'b3a_review_set_invalid',
    exactSetFinalized: final.parentResult === 'logged' && finalizedReviewRows.every(function(entry) { return entry.row.batch_state === 'review_ready'; }),
    unsafeCandidateBlocked: unsafe.ok === false,
    disallowedFixtureBlocked: disallowed.ok === false,
    staleVersionEtagBlocked: staleBlocked,
    redactionPendingRows: expire.rowsMarked,
    automaticDeletion: false,
    runtimeReceiptsHashOnly: runtimeText.indexOf('candidate_text') === -1,
    gateB3AEnabled: flags.gateB3AEnabled,
    killSwitchEnabled: flags.killSwitchEnabled,
    callerCannotEnable: callerFlags.gateB3AEnabled === false,
    wrapperCreated: false,
    providerCallAttempted: false,
    liveSheetTouched: false,
    scriptPropertiesAccessed: false,
    routeCreated: false,
    triggerInstall: false,
    visibleDelivery: false,
    dispatch: false,
    externalWrite: false,
    gateB3BStarted: false
  };
}

// Mission Command Stage 3.4 Gate B3C provider-run preparation only.
// Prepares the future B3D manual wrapper path; local checks use fake adapters only.
var MC_STAGE34_GATE_B3C_BUILD = 'mmos-20260712-stage3-4-gate-b3c-provider-run-preparation';
var MC_STAGE34_GATE_B3C_ENABLED = false;
var MC_STAGE34_GATE_B3C_KILL_SWITCH = true;
var MC_STAGE34_GATE_B3C_WRAPPER_NAME = 'runMissionCommandStage34GateB3DApprovedProviderReviewOnce';
var MC_STAGE34_GATE_B3C_RUN_ID = 'mc_stage34_gate_b3d_20260712_manual_001';
var MC_STAGE34_GATE_B3C_BATCH_KEY = '57288e814a6b65a989bf1165452c7241cb304d729121e6b7e7bcdb5d323ff481';
var MC_STAGE34_GATE_B3C_RELATED_OBJECT = 'mc34b3:57288e814a6b65a989bf1165452c7241cb304d729121e6b7e7bcdb5d323ff481';
var MC_STAGE34_GATE_B3C_REVIEW_SHEET_ID = 2083401137;
var MC_STAGE34_GATE_B3C_MODEL = 'gpt-5.6-terra';
var MC_STAGE34_GATE_B3C_MAX_CALLS = 4;
var MC_STAGE34_GATE_B3C_RETRY_COUNT = 0;
var MC_STAGE34_GATE_B3C_TIMEOUT_SECONDS = 30;
var MC_STAGE34_GATE_B3C_MAX_INPUT_TOKENS_PER_CALL = 2000;
var MC_STAGE34_GATE_B3C_MAX_OUTPUT_TOKENS_PER_CALL = 450;
var MC_STAGE34_GATE_B3C_MAX_ESTIMATED_SPEND_USD = 0.20;
var MC_STAGE34_GATE_B3C_AUTH_TOKEN = 'stage34_gate_b3d_manual_001_wrapper_only';
var MC_STAGE34_GATE_B3C_FAILURE_RECEIPT_TYPE = 'stage_3_4_gate_b3_review_failure';
var MC_STAGE34_GATE_B3C_INPUT_PRICE_PER_MILLION = 2.50;
var MC_STAGE34_GATE_B3C_OUTPUT_PRICE_PER_MILLION = 15.00;

function getMissionCommandStage34GateB3CFlags(input) {
  input = input || {};
  var wrapperAuthorized = input.wrapperAuthorization === true &&
    input.authorizationToken === MC_STAGE34_GATE_B3C_AUTH_TOKEN &&
    input.runId === MC_STAGE34_GATE_B3C_RUN_ID &&
    input.batchKey === MC_STAGE34_GATE_B3C_BATCH_KEY;
  return {
    gateB3CEnabled: MC_STAGE34_GATE_B3C_ENABLED === true && MC_STAGE34_GATE_B3C_KILL_SWITCH !== true,
    killSwitchEnabled: MC_STAGE34_GATE_B3C_KILL_SWITCH === true,
    approvedManualRun: input.approvedManualRun === true,
    wrapperAuthorization: wrapperAuthorized,
    liveSheetEnabled: wrapperAuthorized === true,
    providerEnabled: wrapperAuthorized === true,
    scriptPropertiesEnabled: wrapperAuthorized === true,
    wrapperEnabled: wrapperAuthorized === true,
    routeEnabled: false,
    triggerEnabled: false,
    visibleDeliveryEnabled: false,
    dispatchEnabled: false,
    externalWriteEnabled: false,
    retryEnabled: false,
    fallbackEnabled: false
  };
}

function makeMissionCommandStage34GateB3CBlocked(reason, detail, meta) {
  meta = meta || {};
  return {
    ok: false,
    status: meta.status || 'blocked',
    build: MC_STAGE34_GATE_B3C_BUILD,
    stopCondition: reason || 'gate_b3c_blocked',
    safeDetail: detail || '',
    runId: MC_STAGE34_GATE_B3C_RUN_ID,
    batchKey: MC_STAGE34_GATE_B3C_BATCH_KEY,
    relatedObject: MC_STAGE34_GATE_B3C_RELATED_OBJECT,
    providerCallAttempted: false,
    fakeProviderCalls: safeMissionCommandOpenAiNumberV31(meta.fakeProviderCalls || 0),
    retryCount: 0,
    fallbackUsed: false,
    liveSheetTouched: false,
    scriptPropertiesAccessed: false,
    routeCreated: false,
    triggerInstall: false,
    visibleDelivery: false,
    dispatch: false,
    externalWrite: false
  };
}

function validateMissionCommandStage34GateB3CRunIdentity(input) {
  input = input || {};
  if (input.runId !== MC_STAGE34_GATE_B3C_RUN_ID) return makeMissionCommandStage34GateB3CBlocked('run_id_mismatch', 'Gate B3C/B3D run ID must match the locked approval packet.');
  if (input.batchKey !== MC_STAGE34_GATE_B3C_BATCH_KEY) return makeMissionCommandStage34GateB3CBlocked('batch_key_mismatch', 'Gate B3C/B3D batch key must match the locked approval packet.');
  if (makeMissionCommandStage34GateB3ARelatedObject(input.batchKey) !== MC_STAGE34_GATE_B3C_RELATED_OBJECT) return makeMissionCommandStage34GateB3CBlocked('related_object_mismatch', 'Gate B3C/B3D related object must be deterministic.');
  if (Number(input.estimatedCostUsd || 0) > MC_STAGE34_GATE_B3C_MAX_ESTIMATED_SPEND_USD) return makeMissionCommandStage34GateB3CBlocked('cost_cap_exceeded', 'Estimated cost must stay at or below the approved B3C/B3D cap.');
  return { ok: true, status: 'identity_ready' };
}

function makeMissionCommandStage34GateB3CWrapperAuthorization() {
  return {
    approvedManualRun: true,
    wrapperAuthorization: true,
    authorizationToken: MC_STAGE34_GATE_B3C_AUTH_TOKEN,
    runId: MC_STAGE34_GATE_B3C_RUN_ID,
    batchKey: MC_STAGE34_GATE_B3C_BATCH_KEY,
    estimatedCostUsd: MC_STAGE34_GATE_B3C_MAX_ESTIMATED_SPEND_USD
  };
}

function validateMissionCommandStage34GateB3CAuthorization(input) {
  input = input || {};
  var identity = validateMissionCommandStage34GateB3CRunIdentity(input);
  if (!identity.ok) return identity;
  var flags = getMissionCommandStage34GateB3CFlags(input);
  if (flags.gateB3CEnabled !== false || flags.killSwitchEnabled !== true) return makeMissionCommandStage34GateB3CBlocked('flag_state_invalid', 'Gate B3C helpers must remain default-off with kill switch true.');
  if (input.approvedManualRun !== true || input.wrapperAuthorization !== true || input.authorizationToken !== MC_STAGE34_GATE_B3C_AUTH_TOKEN) {
    return makeMissionCommandStage34GateB3CBlocked('wrapper_authorization_missing', 'Gate B3C/B3D coordinator requires the exact wrapper-only authorization shape.');
  }
  if (flags.liveSheetEnabled !== true || flags.providerEnabled !== true || flags.scriptPropertiesEnabled !== true || flags.wrapperEnabled !== true) {
    return makeMissionCommandStage34GateB3CBlocked('wrapper_authorization_invalid', 'Wrapper authorization flags did not resolve to the approved live path.');
  }
  if (flags.routeEnabled || flags.triggerEnabled || flags.visibleDeliveryEnabled || flags.dispatchEnabled || flags.externalWriteEnabled || flags.retryEnabled || flags.fallbackEnabled) {
    return makeMissionCommandStage34GateB3CBlocked('unsafe_flag_state', 'Route, trigger, visible delivery, dispatch, external write, retry, and fallback flags must remain false.');
  }
  return { ok: true, status: 'wrapper_authorized', flags: flags };
}

function getMissionCommandStage34GateB3CCandidateSchema() {
  return {
    type: 'object',
    additionalProperties: false,
    required: MC_STAGE34_GATE_B3A_READABLE_FIELDS.slice(),
    properties: {
      fixture_id: { type: 'string', enum: getMissionCommandStage34GateB3AFixtureAllowlist() },
      role_owner: { type: 'string', enum: ['executive_assistant', 'chief_of_staff'] },
      escalated_from: { type: 'string' },
      family: { type: 'string' },
      priority: { type: 'string', enum: ['critical', 'important'] },
      why_now: { type: 'string' },
      material_change: { type: 'string' },
      next_move_type: { type: 'string' },
      candidate_text: { type: 'string' }
    }
  };
}

function getMissionCommandStage34GateB3CFixturePrompt(fixtureId) {
  var meta = getMissionCommandStage34GateB3AFixtureMap()[fixtureId] || {};
  return [
    'Create one readable Mission Command shadow review candidate for A1XX.',
    'Use fixture ' + fixtureId + ' only.',
    'Return strict JSON matching the provided schema.',
    'Use role_owner ' + meta.roleOwner + ', family ' + meta.family + ', priority ' + meta.priority + '.',
    'Do not claim delivery, dispatch, completion, publication, external writes, or live source access.',
    'Use protected next-move wording such as review, stage, prepare, or route for decision.'
  ].join(' ');
}

function makeMissionCommandStage34GateB3CRequest(fixtureId) {
  if (!isMissionCommandStage34GateB3AFixtureAllowed(fixtureId)) return { ok: false, error: 'fixture_not_allowed', request: null };
  var meta = getMissionCommandStage34GateB3AFixtureMap()[fixtureId] || {};
  var request = {
    model: MC_STAGE34_GATE_B3C_MODEL,
    store: false,
    input: [
      {
        role: 'system',
        content: 'You prepare hidden Mission Command review candidates. Output only strict JSON. Never include raw provider data, secrets, visible delivery claims, dispatch claims, or external action claims.'
      },
      {
        role: 'user',
        content: JSON.stringify({
          run_id: MC_STAGE34_GATE_B3C_RUN_ID,
          batch_key: MC_STAGE34_GATE_B3C_BATCH_KEY,
          fixture_id: fixtureId,
          fixture_pack_sha256: MC_STAGE34_GATE_B1_FIXTURE_SHA256,
          fixture_meta: meta,
          instruction: getMissionCommandStage34GateB3CFixturePrompt(fixtureId),
          synthetic_only: true
        })
      }
    ],
    reasoning: { effort: 'low' },
    max_output_tokens: MC_STAGE34_GATE_B3C_MAX_OUTPUT_TOKENS_PER_CALL,
    tools: [],
    text: {
      format: {
        type: 'json_schema',
        name: 'mission_command_gate_b3_readable_candidate_v1',
        strict: true,
        schema: getMissionCommandStage34GateB3CCandidateSchema()
      }
    },
    safety_identifier: makeMissionCommandOpenAiSafetyIdentifierV31('a1xx-primary-stage34-b3c-' + fixtureId)
  };
  return { ok: true, error: '', request: request };
}

function validateMissionCommandStage34GateB3CRequest(fixtureId, request) {
  var errors = [];
  var base = validateMissionCommandOpenAiShadowRequestV31(request);
  errors = errors.concat(base.errors || []);
  if (request.model !== MC_STAGE34_GATE_B3C_MODEL) errors.push('model must be ' + MC_STAGE34_GATE_B3C_MODEL);
  if (request.max_output_tokens > MC_STAGE34_GATE_B3C_MAX_OUTPUT_TOKENS_PER_CALL) errors.push('max output tokens exceed B3C cap');
  if (JSON.stringify(request).length > MC_STAGE34_GATE_B3C_MAX_INPUT_TOKENS_PER_CALL * 5) errors.push('request payload exceeds conservative input-size cap');
  if (request.parallel_tool_calls || request.tool_choice) errors.push('tool selection fields must be absent');
  if (!isMissionCommandStage34GateB3AFixtureAllowed(fixtureId)) errors.push('fixture not allowlisted');
  return { ok: errors.length === 0, errors: errors };
}

function makeMissionCommandStage34GateB3CFetchOptions(apiKey, request) {
  return {
    method: 'post',
    contentType: 'application/json',
    headers: {
      Authorization: 'Bearer ' + String(apiKey || '')
    },
    payload: JSON.stringify(request || {}),
    muteHttpExceptions: true,
    timeoutSeconds: MC_STAGE34_GATE_B3C_TIMEOUT_SECONDS
  };
}

function buildMissionCommandStage34GateB3CRequests() {
  var requests = [];
  var errors = [];
  getMissionCommandStage34GateB3AFixtureAllowlist().forEach(function(fixtureId) {
    var draft = makeMissionCommandStage34GateB3CRequest(fixtureId);
    if (!draft.ok) {
      errors.push(fixtureId + ':' + draft.error);
      return;
    }
    var validation = validateMissionCommandStage34GateB3CRequest(fixtureId, draft.request);
    if (!validation.ok) {
      errors.push(fixtureId + ':' + validation.errors.join('; '));
      return;
    }
    requests.push({ fixtureId: fixtureId, request: draft.request, validation: validation });
  });
  return { ok: errors.length === 0 && requests.length === 4, requests: requests, errors: errors };
}

function extractMissionCommandStage34GateB3COutputText(providerResponse) {
  return getMissionCommandOpenAiStage33OutputText(providerResponse || {});
}

function parseMissionCommandStage34GateB3CProviderCandidate(providerResponse) {
  var parsed = null;
  var outputText = extractMissionCommandStage34GateB3COutputText(providerResponse);
  if (!String(outputText || '').trim()) return null;
  try {
    parsed = JSON.parse(outputText);
  } catch (err) {
    parsed = null;
  }
  return parsed;
}

function validateMissionCommandStage34GateB3CProviderCandidate(fixtureId, candidate) {
  var validation = validateMissionCommandStage34GateB3ACandidate(candidate || {});
  if (!validation.ok) return validation;
  if (candidate.fixture_id !== fixtureId) return { ok: false, reason: 'fixture_id_mismatch' };
  if (String(candidate.candidate_text || '').length < 20) return { ok: false, reason: 'candidate_text_too_short' };
  return { ok: true, reason: '' };
}

function getMissionCommandStage34GateB3CUsage(providerResponse) {
  providerResponse = providerResponse || {};
  var usage = providerResponse.usage || {};
  var inputTokens = safeMissionCommandOpenAiNumberV31(usage.input_tokens || usage.prompt_tokens || 0);
  var outputTokens = safeMissionCommandOpenAiNumberV31(usage.output_tokens || usage.completion_tokens || 0);
  var reasoningTokens = safeMissionCommandOpenAiNumberV31((usage.output_tokens_details && usage.output_tokens_details.reasoning_tokens) || usage.reasoning_tokens || 0);
  var estimatedCost = ((inputTokens / 1000000) * MC_STAGE34_GATE_B3C_INPUT_PRICE_PER_MILLION) +
    ((outputTokens / 1000000) * MC_STAGE34_GATE_B3C_OUTPUT_PRICE_PER_MILLION);
  return {
    inputTokens: inputTokens,
    cachedInputTokens: safeMissionCommandOpenAiNumberV31((usage.input_tokens_details && usage.input_tokens_details.cached_tokens) || usage.cached_input_tokens || 0),
    outputTokens: outputTokens,
    reasoningTokens: reasoningTokens,
    estimatedCost: Math.max(0, Number(estimatedCost || 0))
  };
}

function makeMissionCommandStage34GateB3CProviderResultFromEnvelope(fixtureId, providerResponse, meta) {
  meta = meta || {};
  var candidate = parseMissionCommandStage34GateB3CProviderCandidate(providerResponse);
  var validation = validateMissionCommandStage34GateB3CProviderCandidate(fixtureId, candidate);
  var usage = getMissionCommandStage34GateB3CUsage(providerResponse || {});
  return {
    ok: validation.ok,
    status: validation.ok ? 'provider_candidate_valid' : validation.reason,
    candidate: validation.ok ? candidate : null,
    meta: {
      schemaValid: validation.ok,
      providerCallAttempted: meta.providerCallAttempted === true,
      authorizedFixtureAttempts: safeMissionCommandOpenAiNumberV31(meta.authorizedFixtureAttempts || 0),
      fetchAttempts: safeMissionCommandOpenAiNumberV31(meta.fetchAttempts || 0),
      latencyMs: safeMissionCommandOpenAiNumberV31(meta.latencyMs || 0),
      httpStatus: safeMissionCommandOpenAiNumberV31(meta.httpStatus || 0),
      inputTokens: usage.inputTokens,
      cachedInputTokens: usage.cachedInputTokens,
      outputTokens: usage.outputTokens,
      reasoningTokens: usage.reasoningTokens,
      estimatedCost: usage.estimatedCost
    }
  };
}

function makeMissionCommandStage34GateB3CParentReceipt(runId, batchKey) {
  var row = makeMissionCommandStage34GateB3AParentReceipt(runId, batchKey);
  var summary = {
    stage: MC_STAGE34_GATE_B1_STAGE_ID,
    gate: 'b3c_provider_run_preparation_parent',
    run_id: runId,
    fixture_pack_sha256: MC_STAGE34_GATE_B1_FIXTURE_SHA256,
    fixtures_expected: MC_STAGE34_GATE_B3A_FIXTURE_IDS.slice(),
    readable_text_stored: false,
    provider_call_attempted: false,
    review_tab: MC_STAGE34_GATE_B3A_REVIEW_TAB_NAME,
    model: MC_STAGE34_GATE_B3C_MODEL,
    max_calls: MC_STAGE34_GATE_B3C_MAX_CALLS,
    retries: 0
  };
  row.source = 'stage_3_4_gate_b3c_provider_run_preparation';
  row.safe_summary = JSON.stringify(summary);
  row.safety_identifier_hash = missionCommandStage34GateB1Hash(summary);
  row.updated_by = MC_STAGE34_GATE_B3C_BUILD;
  row.etag = 'etag_' + missionCommandStage34GateB1Hash(summary).slice(0, 24);
  return row;
}

function makeMissionCommandStage34GateB3CChildReceipt(runId, batchKey, fixtureId, candidateHash, reviewRowId, meta) {
  meta = meta || {};
  var row = makeMissionCommandStage34GateB3AChildReceipt(runId, batchKey, fixtureId, candidateHash, reviewRowId);
  var summary = {
    gate: 'b3c_hash_only_provider_child',
    fixture_id: fixtureId,
    candidate_sha256: candidateHash,
    review_row_id: reviewRowId,
    readable_text_stored: false,
    provider_call_attempted: meta.providerCallAttempted === true,
    authorized_fixture_attempts: safeMissionCommandOpenAiNumberV31(meta.authorizedFixtureAttempts || 0),
    fetch_attempts: safeMissionCommandOpenAiNumberV31(meta.fetchAttempts || 0),
    schema_valid: meta.schemaValid === true,
    boundary_flags: {
      raw_prompt_stored: false,
      raw_provider_response_stored: false,
      visible_delivery: false,
      dispatch: false,
      external_write: false,
      conversation: false,
      previous_response_id: false
    }
  };
  row.source = 'stage_3_4_gate_b3c_provider_run_preparation';
  row.result = meta.schemaValid === true ? 'hash_logged' : 'failed';
  row.safe_summary = JSON.stringify(summary);
  row.provider_key = 'openai';
  row.model_key = MC_STAGE34_GATE_B3C_MODEL;
  row.latency_ms = safeMissionCommandOpenAiNumberV31(meta.latencyMs || 0);
  row.input_tokens = safeMissionCommandOpenAiNumberV31(meta.inputTokens || 0);
  row.cached_input_tokens = safeMissionCommandOpenAiNumberV31(meta.cachedInputTokens || 0);
  row.output_tokens = safeMissionCommandOpenAiNumberV31(meta.outputTokens || 0);
  row.reasoning_tokens = safeMissionCommandOpenAiNumberV31(meta.reasoningTokens || 0);
  row.estimated_cost = Math.max(0, Number(meta.estimatedCost || 0));
  row.safety_identifier_hash = missionCommandStage34GateB1Hash(summary);
  row.updated_by = MC_STAGE34_GATE_B3C_BUILD;
  row.etag = 'etag_' + missionCommandStage34GateB1Hash(summary).slice(0, 24);
  return row;
}

function makeMissionCommandStage34GateB3CFailureReceiptId(batchKey, fixtureId) {
  return 'rcp_mc34b3_failure_' + String(batchKey || '').slice(0, 16) + '_' + String(fixtureId || '');
}

function findMissionCommandStage34GateB3CFailureReceipt(adapter, batchKey, fixtureId) {
  var receiptId = makeMissionCommandStage34GateB3CFailureReceiptId(batchKey, fixtureId);
  var relatedObject = makeMissionCommandStage34GateB3ARelatedObject(batchKey);
  var rows = (adapter.rows || []).map(function(row, index) {
    return { row: row, index: index };
  });
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].row.receipt_id === receiptId &&
        rows[i].row.related_object === relatedObject &&
        rows[i].row.receipt_type === MC_STAGE34_GATE_B3C_FAILURE_RECEIPT_TYPE) return rows[i];
  }
  return null;
}

function makeMissionCommandStage34GateB3CFailureReceipt(runId, batchKey, fixtureId, status, callCount, meta) {
  meta = meta || {};
  var relatedObject = makeMissionCommandStage34GateB3ARelatedObject(batchKey);
  var summary = {
    gate: 'b3c_provider_validation_failure',
    fixture_id: fixtureId,
    provider_call_attempted: meta.providerCallAttempted === true,
    safe_status: sanitizeMissionCommandOpenAiShadowTextV31(status || 'provider_candidate_failed', 80),
    call_count: safeMissionCommandOpenAiNumberV31(callCount || 0),
    authorized_fixture_attempts: safeMissionCommandOpenAiNumberV31(meta.authorizedFixtureAttempts || callCount || 0),
    fetch_attempts: safeMissionCommandOpenAiNumberV31(meta.fetchAttempts || 0),
    estimated_cost: Math.max(0, Number(meta.estimatedCost || 0)),
    readable_text_stored: false,
    retry_count: 0,
    fallback_used: false,
    boundary_flags: {
      raw_prompt_stored: false,
      raw_provider_response_stored: false,
      visible_delivery: false,
      dispatch: false,
      external_write: false,
      conversation: false,
      previous_response_id: false
    }
  };
  return {
    receipt_id: makeMissionCommandStage34GateB3CFailureReceiptId(batchKey, fixtureId),
    profile_id: MC_STAGE34_GATE_B1_PROFILE_ID,
    receipt_type: MC_STAGE34_GATE_B3C_FAILURE_RECEIPT_TYPE,
    source: 'stage_3_4_gate_b3c_provider_run_preparation',
    related_object: relatedObject,
    result: 'provider_validation_failed',
    safe_summary: JSON.stringify(summary),
    provider_key: 'openai',
    model_key: MC_STAGE34_GATE_B3C_MODEL,
    role: (getMissionCommandStage34GateB3AFixtureMap()[fixtureId] || {}).roleOwner || '',
    latency_ms: '',
    input_tokens: '',
    cached_input_tokens: '',
    cache_write_tokens: '',
    output_tokens: '',
    reasoning_tokens: '',
    retry_count: 0,
    estimated_cost: '',
    fallback_reason: '',
    safety_identifier_hash: missionCommandStage34GateB1Hash(summary),
    created_at: '',
    device_id: MC_STAGE34_GATE_B1_PROFILE_ID,
    request_id: runId,
    privacy_class: MC_STAGE34_GATE_B1_PRIVACY_CLASS,
    retention_class: MC_STAGE34_GATE_B1_RETENTION_CLASS,
    next_action: 'review_gate_b3_provider_failure_before_any_retry',
    team_chat_receipt_url: '',
    version: 1,
    etag: 'etag_' + missionCommandStage34GateB1Hash(summary).slice(0, 24),
    updated_at: '',
    updated_by: MC_STAGE34_GATE_B3C_BUILD,
    last_request_id: runId
  };
}

function appendMissionCommandStage34GateB3CFailureReceipt(runtimeAdapter, runId, batchKey, fixtureId, status, callCount, meta) {
  meta = meta || {};
  if (!runtimeAdapter || !runtimeAdapter.acquireLock) return makeMissionCommandStage34GateB3CBlocked('runtime_adapter_missing', 'Runtime receipt adapter missing for failure receipt.');
  if (!runtimeAdapter.acquireLock('stage34_b3c_failure_' + fixtureId)) return makeMissionCommandStage34GateB3CBlocked('runtime_lock_unavailable', 'Failure receipt lock unavailable.');
  try {
    var refresh = refreshMissionCommandStage33RAdapterUnderLock(runtimeAdapter);
    if (!refresh.ok) return makeMissionCommandStage34GateB3CBlocked(refresh.stopCondition, 'Runtime receipt headers missing.');
    var parentRows = findMissionCommandStage34GateB3AReceiptRows(runtimeAdapter, makeMissionCommandStage34GateB3ARelatedObject(batchKey)).filter(function(entry) {
      return entry.row.receipt_type === MC_STAGE34_GATE_B3A_RECEIPT_PARENT_TYPE;
    });
    if (parentRows.length !== 1) return makeMissionCommandStage34GateB3CBlocked('parent_missing', 'Failure receipt requires an existing parent receipt draft.');
    var existing = findMissionCommandStage34GateB3CFailureReceipt(runtimeAdapter, batchKey, fixtureId);
    if (existing) return { ok: false, status: 'duplicate_suppressed', row: existing.row, appendedRows: 0, providerCallAttempted: true };
    var row = makeMissionCommandStage34GateB3CFailureReceipt(runId, batchKey, fixtureId, status, callCount, meta);
    runtimeAdapter.appendRowObject(row);
    return { ok: true, status: 'failure_receipt_logged', row: row, appendedRows: 1, providerCallAttempted: meta.providerCallAttempted === true };
  } catch (err) {
    return makeMissionCommandStage34GateB3CBlocked('failure_receipt_failed', 'Failure receipt write failed; no readable candidate text was written.');
  } finally {
    runtimeAdapter.releaseLock('stage34_b3c_failure_' + fixtureId);
  }
}

function claimMissionCommandStage34GateB3CParent(runtimeAdapter, runId, batchKey) {
  var relatedObject = makeMissionCommandStage34GateB3ARelatedObject(batchKey);
  if (relatedObject !== MC_STAGE34_GATE_B3C_RELATED_OBJECT) return makeMissionCommandStage34GateB3CBlocked('related_object_mismatch', 'Parent claim related object must match locked B3C/B3D identity.');
  if (!runtimeAdapter || !runtimeAdapter.acquireLock) return makeMissionCommandStage34GateB3CBlocked('runtime_adapter_missing', 'Runtime receipt adapter missing.');
  if (!runtimeAdapter.acquireLock('stage34_b3c_parent_claim')) return makeMissionCommandStage34GateB3CBlocked('runtime_lock_unavailable', 'Runtime receipt parent lock unavailable.');
  try {
    var refresh = refreshMissionCommandStage33RAdapterUnderLock(runtimeAdapter);
    if (!refresh.ok) return makeMissionCommandStage34GateB3CBlocked(refresh.stopCondition, 'Runtime receipt headers missing.');
    if (findMissionCommandStage34GateB3AReceiptRows(runtimeAdapter, relatedObject).length) {
      return { ok: false, status: 'duplicate_suppressed', providerImplicationAllowed: false, providerCallAttempted: false, fakeProviderCalls: 0 };
    }
    var parent = makeMissionCommandStage34GateB3CParentReceipt(runId, batchKey);
    runtimeAdapter.appendRowObject(parent);
    return { ok: true, status: 'parent_claimed', parent: parent, providerImplicationAllowed: false, providerCallAttempted: false };
  } catch (err) {
    return makeMissionCommandStage34GateB3CBlocked('parent_claim_failed', 'Parent claim failed before provider implication.');
  } finally {
    runtimeAdapter.releaseLock('stage34_b3c_parent_claim');
  }
}

function appendMissionCommandStage34GateB3CHashChild(runtimeAdapter, runId, batchKey, fixtureId, candidateHash, reviewRowId, meta) {
  if (!runtimeAdapter.acquireLock('stage34_b3c_hash_child_' + fixtureId)) return makeMissionCommandStage34GateB3CBlocked('runtime_lock_unavailable', 'Hash child lock unavailable.');
  try {
    var refresh = refreshMissionCommandStage33RAdapterUnderLock(runtimeAdapter);
    if (!refresh.ok) return makeMissionCommandStage34GateB3CBlocked(refresh.stopCondition, 'Runtime receipt headers missing.');
    var existing = findMissionCommandStage34GateB3AChildReceipt(runtimeAdapter, batchKey, fixtureId);
    if (existing) return { ok: false, status: 'duplicate_suppressed', row: existing.row, appendedRows: 0, providerCallAttempted: false };
    var row = makeMissionCommandStage34GateB3CChildReceipt(runId, batchKey, fixtureId, candidateHash, reviewRowId, meta || {});
    runtimeAdapter.appendRowObject(row);
    return { ok: true, status: 'hash_child_logged', row: row, appendedRows: 1, providerCallAttempted: true };
  } catch (err) {
    return makeMissionCommandStage34GateB3CBlocked('hash_child_failed', 'Hash-only child receipt failed before readable candidate text.');
  } finally {
    runtimeAdapter.releaseLock('stage34_b3c_hash_child_' + fixtureId);
  }
}

function addMissionCommandStage34GateB3CProviderCandidate(runtimeAdapter, reviewAdapter, runId, batchKey, candidate, meta) {
  var validation = validateMissionCommandStage34GateB3CProviderCandidate(candidate && candidate.fixture_id, candidate);
  if (!validation.ok) return makeMissionCommandStage34GateB3CBlocked(validation.reason, 'Provider candidate failed strict review validation.');
  var candidateHash = makeMissionCommandStage34GateB3ACandidateHash(candidate);
  var reviewRowId = makeMissionCommandStage34GateB3AReviewRowId(batchKey, candidate.fixture_id);
  var child = appendMissionCommandStage34GateB3CHashChild(runtimeAdapter, runId, batchKey, candidate.fixture_id, candidateHash, reviewRowId, meta || {});
  if (!child.ok) return child;
  return writeMissionCommandStage34GateB3CReadableCandidate(runtimeAdapter, reviewAdapter, runId, batchKey, candidate, candidateHash, child.row.receipt_id);
}

function finalizeMissionCommandStage34GateB3CBatch(runtimeAdapter, reviewAdapter, runId, batchKey) {
  var final = finalizeMissionCommandStage34GateB3CReviewBatch(runtimeAdapter, reviewAdapter, runId, batchKey);
  if (!final.ok) return final;
  return Object.assign({}, final, {
    build: MC_STAGE34_GATE_B3C_BUILD,
    providerCallAttempted: true,
    wrapperInvokedByIntegration: false
  });
}

function makeMissionCommandStage34GateB3CFakeProviderAdapter(options) {
  options = options || {};
  return {
    calls: [],
    fetchAttempts: 0,
    failFixtureId: options.failFixtureId || '',
    malformedFixtureId: options.malformedFixtureId || '',
    credentialUnavailable: options.credentialUnavailable === true,
    fetchFailFixtureId: options.fetchFailFixtureId || '',
    expensiveFixtureId: options.expensiveFixtureId || '',
    responseFor: function(fixtureId, request) {
      this.calls.push({
        fixtureId: fixtureId,
        model: request && request.model,
        maxOutputTokens: request && request.max_output_tokens,
        safeAttemptRecorded: true,
        providerCallAttempted: false
      });
      var authorizedAttempts = this.calls.length;
      if (this.credentialUnavailable) return { ok: false, status: 'credential_unavailable', candidate: null, meta: { providerCallAttempted: false, authorizedFixtureAttempts: authorizedAttempts, fetchAttempts: this.fetchAttempts, latencyMs: 0, estimatedCost: 0 } };
      this.fetchAttempts += 1;
      this.calls[this.calls.length - 1].providerCallAttempted = true;
      if (fixtureId === this.fetchFailFixtureId) return { ok: false, status: 'provider_fetch_failed', candidate: null, meta: { providerCallAttempted: true, authorizedFixtureAttempts: authorizedAttempts, fetchAttempts: this.fetchAttempts, latencyMs: 0, estimatedCost: 0 } };
      if (fixtureId === this.failFixtureId) return { ok: false, status: 'fake_provider_blocked', candidate: null, meta: { providerCallAttempted: true, authorizedFixtureAttempts: authorizedAttempts, fetchAttempts: this.fetchAttempts, latencyMs: 0, estimatedCost: 0 } };
      var candidates = makeMissionCommandStage34GateB3ASafeCandidates();
      for (var i = 0; i < candidates.length; i++) {
        if (candidates[i].fixture_id === fixtureId) {
          if (fixtureId === this.expensiveFixtureId) {
            return {
              ok: true,
              status: 'fake_provider_valid',
              candidate: candidates[i],
              meta: {
                schemaValid: true,
                providerCallAttempted: true,
                authorizedFixtureAttempts: authorizedAttempts,
                fetchAttempts: this.fetchAttempts,
                latencyMs: 1,
                inputTokens: 90000,
                outputTokens: 1,
                estimatedCost: MC_STAGE34_GATE_B3C_MAX_ESTIMATED_SPEND_USD + 0.01
              }
            };
          }
          if (fixtureId === this.malformedFixtureId) {
            return makeMissionCommandStage34GateB3CProviderResultFromEnvelope(fixtureId, { output_text: '{"fixture_id":"MC34-F99"}', usage: { input_tokens: 100, output_tokens: 20 } }, {
              providerCallAttempted: true,
              authorizedFixtureAttempts: authorizedAttempts,
              fetchAttempts: this.fetchAttempts,
              latencyMs: 1,
              httpStatus: 200
            });
          }
          return {
            ok: true,
            status: 'fake_provider_valid',
            candidate: candidates[i],
            meta: {
              schemaValid: true,
              providerCallAttempted: true,
              authorizedFixtureAttempts: authorizedAttempts,
              fetchAttempts: this.fetchAttempts,
              latencyMs: 1,
              inputTokens: 100,
              outputTokens: 80,
              estimatedCost: ((100 / 1000000) * MC_STAGE34_GATE_B3C_INPUT_PRICE_PER_MILLION) + ((80 / 1000000) * MC_STAGE34_GATE_B3C_OUTPUT_PRICE_PER_MILLION)
            }
          };
        }
      }
      return { ok: false, status: 'fake_fixture_missing', candidate: null, meta: { providerCallAttempted: true, authorizedFixtureAttempts: authorizedAttempts, fetchAttempts: this.fetchAttempts, latencyMs: 0, estimatedCost: 0 } };
    }
  };
}

function makeMissionCommandStage34GateB3COpenAiProviderAdapter() {
  return {
    calls: [],
    fetchAttempts: 0,
    responseFor: function(fixtureId, request) {
      this.calls.push({
        fixtureId: fixtureId,
        model: request && request.model,
        maxOutputTokens: request && request.max_output_tokens,
        safeAttemptRecorded: true,
        providerCallAttempted: false
      });
      var authorizedAttempts = this.calls.length;
      var apiKey = String(PropertiesService.getScriptProperties().getProperty(MC_OPENAI_STAGE32_SCRIPT_PROPERTY_KEY) || '').trim();
      if (!apiKey) return { ok: false, status: 'credential_unavailable', candidate: null, meta: { providerCallAttempted: false, authorizedFixtureAttempts: authorizedAttempts, fetchAttempts: this.fetchAttempts, latencyMs: 0, estimatedCost: 0 } };
      var started = Date.now();
      var httpStatus = 0;
      var parsed = null;
      try {
        this.fetchAttempts += 1;
        this.calls[this.calls.length - 1].providerCallAttempted = true;
        var response = UrlFetchApp.fetch(MC_OPENAI_STAGE32_ENDPOINT, makeMissionCommandStage34GateB3CFetchOptions(apiKey, request));
        httpStatus = Number(response.getResponseCode() || 0);
        parsed = parseMissionCommandOpenAiStage33JsonObject(response.getContentText());
      } catch (err) {
        return { ok: false, status: 'provider_fetch_failed', candidate: null, meta: { providerCallAttempted: true, authorizedFixtureAttempts: authorizedAttempts, fetchAttempts: this.fetchAttempts, latencyMs: Date.now() - started, httpStatus: httpStatus, estimatedCost: 0 } };
      }
      if (httpStatus < 200 || httpStatus >= 300) {
        return { ok: false, status: httpStatus === 404 ? 'model_unavailable' : 'provider_http_' + httpStatus, candidate: null, meta: { providerCallAttempted: true, authorizedFixtureAttempts: authorizedAttempts, fetchAttempts: this.fetchAttempts, latencyMs: Date.now() - started, httpStatus: httpStatus, estimatedCost: 0 } };
      }
      return makeMissionCommandStage34GateB3CProviderResultFromEnvelope(fixtureId, parsed, {
        providerCallAttempted: true,
        authorizedFixtureAttempts: authorizedAttempts,
        fetchAttempts: this.fetchAttempts,
        latencyMs: Date.now() - started,
        httpStatus: httpStatus
      });
    }
  };
}

function makeMissionCommandStage34GateB3CLiveReviewAdapter(options) {
  options = options || {};
  var spreadsheet = options.spreadsheet || getMoneyMissionSpreadsheet();
  var sheet = spreadsheet && spreadsheet.getSheetByName ? spreadsheet.getSheetByName(MC_STAGE34_GATE_B3A_REVIEW_TAB_NAME) : null;
  if (!sheet) throw new Error('stage_3_4_gate_b3_review_sheet_missing');
  if (Number(sheet.getSheetId && sheet.getSheetId()) !== MC_STAGE34_GATE_B3C_REVIEW_SHEET_ID) throw new Error('stage_3_4_gate_b3_review_sheet_id_mismatch');
  var lock = options.lock || LockService.getScriptLock();
  var headerValidator = options.headerValidator || validateMissionCommandStage34GateB3AReviewHeaders;
  var headerInvalidCode = options.headerInvalidCode || 'stage_3_4_gate_b3_review_headers_invalid';
  var adapter = makeMissionCommandStage34GateB3AFakeReviewAdapter();
  adapter.sheetId = Number(sheet.getSheetId && sheet.getSheetId());
  adapter.headerValidatorName = options.headerValidatorName || 'gate_b3a_legacy_26';
  adapter.acquireLock = function(label) {
    this.lockEvents.push('acquire:' + label);
    return lock.tryLock(MC_STAGE33R_LOCK_TIMEOUT_MS) === true;
  };
  adapter.releaseLock = function(label) {
    this.lockEvents.push('release:' + label);
    try {
      lock.releaseLock();
    } catch (err) {}
  };
  adapter.refreshRows = function() {
    var lastColumn = Math.max(1, sheet.getLastColumn());
    var refreshedHeaders = sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(function(header) {
      return String(header || '').trim();
    });
    var headerCheck = headerValidator(refreshedHeaders);
    if (!headerCheck.ok) throw new Error(headerInvalidCode + ':' + (headerCheck.missing || []).join(','));
    var lastRow = Math.max(1, sheet.getLastRow());
    var values = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues() : [];
    this.headers = refreshedHeaders;
    this.rows = values.map(function(valuesRow) {
      var row = {};
      refreshedHeaders.forEach(function(header, index) {
        row[header] = valuesRow[index];
      });
      return row;
    });
    return true;
  };
  adapter.appendRowObject = function(row) {
    sheet.appendRow(this.headers.map(function(header) { return Object.prototype.hasOwnProperty.call(row, header) ? row[header] : ''; }));
    this.rows.push(row);
    this.appendedRows += 1;
    return this.rows.length + 1;
  };
  adapter.updateRowObject = function(index, row, expected) {
    expected = expected || {};
    if (Object.prototype.hasOwnProperty.call(expected, 'version') || Object.prototype.hasOwnProperty.call(expected, 'etag')) throw new Error('live_review_version_etag_not_persisted');
    if (!Object.prototype.hasOwnProperty.call(expected, 'persistedHash')) throw new Error('live_review_update_missing_snapshot');
    var currentValues = sheet.getRange(index + 2, 1, 1, this.headers.length).getValues()[0];
    var current = {};
    this.headers.forEach(function(header, headerIndex) {
      current[header] = currentValues[headerIndex];
    });
    var currentHash = makeMissionCommandStage34GateB3CReviewSnapshotHash(current, this.headers);
    if (currentHash !== String(expected.persistedHash || '')) throw new Error('live_review_update_snapshot_conflict');
    sheet.getRange(index + 2, 1, 1, this.headers.length).setValues([this.headers.map(function(header) { return Object.prototype.hasOwnProperty.call(row, header) ? row[header] : ''; })]);
    this.rows[index] = row;
    this.updatedRows += 1;
    return index + 2;
  };
  return adapter;
}

function makeMissionCommandStage34GateB3CReviewSnapshotHash(row, headers) {
  headers = headers || getMissionCommandStage34GateB3AReviewHeaders();
  var persisted = {};
  headers.forEach(function(header) {
    persisted[header] = Object.prototype.hasOwnProperty.call(row || {}, header) ? row[header] : '';
  });
  return missionCommandStage34GateB1Hash(persisted);
}

function updateMissionCommandStage34GateB3CReviewRowWithSnapshot(reviewAdapter, entry, updatedRow) {
  if (!entry || !entry.row) throw new Error('b3c_review_update_missing_entry');
  var expectedHash = makeMissionCommandStage34GateB3CReviewSnapshotHash(entry.row, reviewAdapter.headers);
  reviewAdapter.updateRowObject(entry.index, updatedRow, { persistedHash: expectedHash });
}

function makeMissionCommandStage34GateB3CReviewAdapter(headers, rows, options) {
  var adapter = makeMissionCommandStage34GateB3AFakeReviewAdapter(headers, rows, options || {});
  var baseUpdate = adapter.updateRowObject;
  adapter.updateRowObject = function(index, row, expected) {
    expected = expected || {};
    if (Object.prototype.hasOwnProperty.call(expected, 'version') || Object.prototype.hasOwnProperty.call(expected, 'etag')) {
      throw new Error('b3c_review_version_etag_not_persisted');
    }
    if (Object.prototype.hasOwnProperty.call(expected, 'persistedHash')) {
      var current = this.rows[index];
      if (!current) throw new Error('local_review_update_missing_row');
      var currentHash = makeMissionCommandStage34GateB3CReviewSnapshotHash(current, this.headers);
      if (currentHash !== String(expected.persistedHash || '')) throw new Error('local_review_update_snapshot_conflict');
      this.rows[index] = row;
      this.updatedRows += 1;
      return index + 1;
    }
    return baseUpdate.call(this, index, row, expected);
  };
  return adapter;
}

function reserveMissionCommandStage34GateB3CReviewRows(reviewAdapter, runId, batchKey) {
  return reserveMissionCommandStage34GateB3AReviewRows(reviewAdapter, runId, batchKey);
}

function writeMissionCommandStage34GateB3CReadableCandidate(runtimeAdapter, reviewAdapter, runId, batchKey, candidate, candidateHash, receiptChildId) {
  var validation = validateMissionCommandStage34GateB3CProviderCandidate(candidate && candidate.fixture_id, candidate);
  if (!validation.ok) return makeMissionCommandStage34GateB3CBlocked(validation.reason, 'Readable candidate failed strict validation.');
  var fixtureId = candidate.fixture_id;
  var reviewRowId = makeMissionCommandStage34GateB3AReviewRowId(batchKey, fixtureId);
  if (!reviewAdapter.acquireLock('stage34_b3c_readable_' + fixtureId)) return makeMissionCommandStage34GateB3CBlocked('review_lock_unavailable', 'Readable row lock unavailable.');
  try {
    var childEvidence = verifyMissionCommandStage34GateB3AHashChildEvidence(runtimeAdapter, batchKey, fixtureId, candidateHash, reviewRowId);
    if (!childEvidence.ok) return makeMissionCommandStage34GateB3CBlocked(childEvidence.stopCondition, 'Readable candidate write requires matching hash-only child receipt evidence.');
    if (childEvidence.child.receipt_id !== receiptChildId) return makeMissionCommandStage34GateB3CBlocked('hash_child_receipt_id_mismatch', 'Readable candidate write requires the matching child receipt ID.');
    var refresh = refreshMissionCommandStage34GateB3AReviewAdapterUnderLock(reviewAdapter);
    if (!refresh.ok) return makeMissionCommandStage34GateB3CBlocked(refresh.stopCondition, 'Review tab headers missing.');
    var found = findMissionCommandStage34GateB3AReviewRow(reviewAdapter, reviewRowId);
    if (!found) return makeMissionCommandStage34GateB3CBlocked('review_reservation_missing', 'Readable row reservation missing.');
    if (String(found.row.candidate_text || '') || String(found.row.candidate_sha256 || '')) return { ok: false, status: 'duplicate_suppressed', providerCallAttempted: false };
    var updated = Object.assign({}, found.row, {
      receipt_child_id: receiptChildId,
      candidate_sha256: candidateHash,
      why_now: sanitizeMissionCommandOpenAiShadowTextV31(candidate.why_now, 220),
      material_change: sanitizeMissionCommandOpenAiShadowTextV31(candidate.material_change, 120),
      next_move_type: sanitizeMissionCommandOpenAiShadowTextV31(candidate.next_move_type, 120),
      candidate_text: sanitizeMissionCommandOpenAiShadowTextV31(candidate.candidate_text, 600),
      schema_valid: true,
      batch_state: 'candidate_ready'
    });
    updateMissionCommandStage34GateB3CReviewRowWithSnapshot(reviewAdapter, found, updated);
    return { ok: true, status: 'readable_candidate_written', row: updated, providerCallAttempted: true };
  } catch (err) {
    return makeMissionCommandStage34GateB3CBlocked('review_write_failed', 'Readable candidate write failed after snapshot check.');
  } finally {
    reviewAdapter.releaseLock('stage34_b3c_readable_' + fixtureId);
  }
}

function finalizeMissionCommandStage34GateB3CReviewBatch(runtimeAdapter, reviewAdapter, runId, batchKey) {
  if (!runtimeAdapter.acquireLock('stage34_b3c_finalize_runtime')) return makeMissionCommandStage34GateB3CBlocked('runtime_lock_unavailable', 'Finalize runtime lock unavailable.');
  if (!reviewAdapter.acquireLock('stage34_b3c_finalize_review')) {
    runtimeAdapter.releaseLock('stage34_b3c_finalize_runtime');
    return makeMissionCommandStage34GateB3CBlocked('review_lock_unavailable', 'Finalize review lock unavailable.');
  }
  try {
    var runtimeRefresh = refreshMissionCommandStage33RAdapterUnderLock(runtimeAdapter);
    if (!runtimeRefresh.ok) return makeMissionCommandStage34GateB3CBlocked(runtimeRefresh.stopCondition, 'Runtime receipt headers missing.');
    var reviewRefresh = refreshMissionCommandStage34GateB3AReviewAdapterUnderLock(reviewAdapter);
    if (!reviewRefresh.ok) return makeMissionCommandStage34GateB3CBlocked(reviewRefresh.stopCondition, 'Review tab headers missing.');
    var relatedObject = makeMissionCommandStage34GateB3ARelatedObject(batchKey);
    var receiptRows = findMissionCommandStage34GateB3AReceiptRows(runtimeAdapter, relatedObject);
    var parentRows = receiptRows.filter(function(entry) { return entry.row.receipt_type === MC_STAGE34_GATE_B3A_RECEIPT_PARENT_TYPE; });
    var childRows = receiptRows.filter(function(entry) { return entry.row.receipt_type === MC_STAGE34_GATE_B3A_RECEIPT_CHILD_TYPE; });
    var failureRows = receiptRows.filter(function(entry) { return entry.row.receipt_type === MC_STAGE34_GATE_B3C_FAILURE_RECEIPT_TYPE; });
    var reviewRows = findMissionCommandStage34GateB3AReviewRows(reviewAdapter, batchKey);
    var completeReviewRows = reviewRows.filter(function(entry) {
      return entry.row.schema_valid === true && String(entry.row.candidate_text || '') !== '' && String(entry.row.candidate_sha256 || '') !== '';
    });
    if (failureRows.length > 0) return makeMissionCommandStage34GateB3CBlocked('b3c_failure_receipt_present', 'Parent remains receipt_draft when any provider failure receipt exists.');
    if (parentRows.length !== 1 || childRows.length !== 4 || reviewRows.length !== 4 || completeReviewRows.length !== 4) return makeMissionCommandStage34GateB3CBlocked('b3c_exact_four_required', 'Finalization requires one parent, four hash-only children, and four complete review rows.');
    for (var i = 0; i < MC_STAGE34_GATE_B3A_FIXTURE_IDS.length; i++) {
      var fixtureId = MC_STAGE34_GATE_B3A_FIXTURE_IDS[i];
      var reviewRowId = makeMissionCommandStage34GateB3AReviewRowId(batchKey, fixtureId);
      var reviewRow = findMissionCommandStage34GateB3AReviewRow(reviewAdapter, reviewRowId);
      if (!reviewRow || reviewRow.row.fixture_id !== fixtureId) return makeMissionCommandStage34GateB3CBlocked('b3c_review_set_invalid', 'Exact four deterministic review rows are required.');
      var child = findMissionCommandStage34GateB3AChildReceipt(runtimeAdapter, batchKey, fixtureId);
      if (!child) return makeMissionCommandStage34GateB3CBlocked('b3c_child_set_invalid', 'Exact four deterministic child receipts are required.');
      var summary = parseMissionCommandStage34GateB3ASafeSummary(child.row);
      if (summary.fixture_id !== fixtureId ||
          summary.candidate_sha256 !== reviewRow.row.candidate_sha256 ||
          summary.review_row_id !== reviewRowId ||
          reviewRow.row.receipt_child_id !== child.row.receipt_id) {
        return makeMissionCommandStage34GateB3CBlocked('b3c_hash_link_invalid', 'Child receipt and readable review row linkage must match exactly.');
      }
    }
    var parentEntry = parentRows[0];
    var updatedParent = Object.assign({}, parentEntry.row, {
      result: 'logged',
      version: safeMissionCommandOpenAiNumberV31(parentEntry.row.version) + 1,
      etag: 'etag_' + missionCommandStage34GateB1Hash(parentEntry.row.receipt_id + ':logged:' + batchKey).slice(0, 24),
      updated_by: MC_STAGE34_GATE_B3C_BUILD,
      last_request_id: runId
    });
    runtimeAdapter.updateRowObject(parentEntry.index, updatedParent, { version: parentEntry.row.version, etag: parentEntry.row.etag });
    for (var j = 0; j < reviewRows.length; j++) {
      var reviewEntry = reviewRows[j];
      var updatedReview = Object.assign({}, reviewEntry.row, {
        batch_state: 'review_ready'
      });
      updateMissionCommandStage34GateB3CReviewRowWithSnapshot(reviewAdapter, reviewEntry, updatedReview);
    }
    return { ok: true, status: 'review_ready', build: MC_STAGE34_GATE_B3C_BUILD, childrenWritten: childRows.length, reviewRowsComplete: completeReviewRows.length, parentResult: 'logged', providerCallAttempted: true };
  } catch (err) {
    return makeMissionCommandStage34GateB3CBlocked('b3c_finalize_failed', 'Finalization update failed.');
  } finally {
    reviewAdapter.releaseLock('stage34_b3c_finalize_review');
    runtimeAdapter.releaseLock('stage34_b3c_finalize_runtime');
  }
}

function runMissionCommandStage34GateB3CProviderReviewBatch(runtimeAdapter, reviewAdapter, providerAdapter, input) {
  input = input || {};
  var authorization = validateMissionCommandStage34GateB3CAuthorization(input);
  if (!authorization.ok) return authorization;
  var requests = buildMissionCommandStage34GateB3CRequests();
  if (!requests.ok) return makeMissionCommandStage34GateB3CBlocked('request_contract_invalid', requests.errors.join(' | '));
  var parent = claimMissionCommandStage34GateB3CParent(runtimeAdapter, input.runId, input.batchKey);
  if (!parent.ok) return parent;
  var reserve = reserveMissionCommandStage34GateB3AReviewRows(reviewAdapter, input.runId, input.batchKey);
  if (!reserve.ok) return reserve;
  var results = [];
  var cumulativeEstimatedCost = 0;
  for (var i = 0; i < requests.requests.length; i++) {
    if (i >= MC_STAGE34_GATE_B3C_MAX_CALLS) return makeMissionCommandStage34GateB3CBlocked('call_cap_exceeded', 'B3C/B3D call cap exceeded.', { fakeProviderCalls: results.length });
    var entry = requests.requests[i];
    var providerResult = providerAdapter.responseFor(entry.fixtureId, entry.request);
    if (!providerResult.ok) {
      var providerMeta = providerResult.meta || {};
      var failureReceipt = appendMissionCommandStage34GateB3CFailureReceipt(runtimeAdapter, input.runId, input.batchKey, entry.fixtureId, providerResult.status, providerMeta.authorizedFixtureAttempts || (providerAdapter.calls ? providerAdapter.calls.length : results.length + 1), providerMeta);
      return {
        ok: false,
        status: 'interrupted',
        build: MC_STAGE34_GATE_B3C_BUILD,
        stopCondition: failureReceipt.ok || failureReceipt.status === 'duplicate_suppressed' ? (providerResult.status || 'provider_candidate_failed') : (failureReceipt.stopCondition || 'failure_receipt_failed'),
        failedFixtureId: entry.fixtureId,
        childrenWritten: results.length,
        parentResult: 'receipt_draft',
        failureReceiptStatus: failureReceipt.status || '',
        failureReceiptWritten: failureReceipt.ok === true,
        providerCallAttempted: providerMeta.providerCallAttempted === true,
        authorizedFixtureAttempts: safeMissionCommandOpenAiNumberV31(providerMeta.authorizedFixtureAttempts || (providerAdapter.calls ? providerAdapter.calls.length : results.length + 1)),
        actualFetchAttempts: safeMissionCommandOpenAiNumberV31(providerMeta.fetchAttempts || (providerAdapter.fetchAttempts || 0)),
        cumulativeEstimatedCost: cumulativeEstimatedCost + Math.max(0, Number(providerMeta.estimatedCost || 0)),
        retryCount: 0,
        fallbackUsed: false
      };
    }
    cumulativeEstimatedCost += Math.max(0, Number((providerResult.meta || {}).estimatedCost || 0));
    if (cumulativeEstimatedCost > MC_STAGE34_GATE_B3C_MAX_ESTIMATED_SPEND_USD) {
      var costFailureReceipt = appendMissionCommandStage34GateB3CFailureReceipt(runtimeAdapter, input.runId, input.batchKey, entry.fixtureId, 'cost_cap_exceeded', (providerResult.meta || {}).authorizedFixtureAttempts || (providerAdapter.calls ? providerAdapter.calls.length : results.length + 1), Object.assign({}, providerResult.meta || {}, { estimatedCost: cumulativeEstimatedCost }));
      return {
        ok: false,
        status: 'interrupted',
        build: MC_STAGE34_GATE_B3C_BUILD,
        stopCondition: costFailureReceipt.ok || costFailureReceipt.status === 'duplicate_suppressed' ? 'cost_cap_exceeded' : (costFailureReceipt.stopCondition || 'failure_receipt_failed'),
        failedFixtureId: entry.fixtureId,
        childrenWritten: results.length,
        parentResult: 'receipt_draft',
        failureReceiptStatus: costFailureReceipt.status || '',
        failureReceiptWritten: costFailureReceipt.ok === true,
        providerCallAttempted: (providerResult.meta || {}).providerCallAttempted === true,
        authorizedFixtureAttempts: safeMissionCommandOpenAiNumberV31((providerResult.meta || {}).authorizedFixtureAttempts || (providerAdapter.calls ? providerAdapter.calls.length : results.length + 1)),
        actualFetchAttempts: safeMissionCommandOpenAiNumberV31((providerResult.meta || {}).fetchAttempts || (providerAdapter.fetchAttempts || 0)),
        cumulativeEstimatedCost: cumulativeEstimatedCost,
        retryCount: 0,
        fallbackUsed: false
      };
    }
    var add = addMissionCommandStage34GateB3CProviderCandidate(runtimeAdapter, reviewAdapter, input.runId, input.batchKey, providerResult.candidate, providerResult.meta);
    if (!add.ok) {
      var addMeta = providerResult.meta || {};
      var addFailureReceipt = appendMissionCommandStage34GateB3CFailureReceipt(runtimeAdapter, input.runId, input.batchKey, entry.fixtureId, add.stopCondition || add.status || 'candidate_write_failed', addMeta.authorizedFixtureAttempts || (providerAdapter.calls ? providerAdapter.calls.length : results.length + 1), addMeta);
      return {
        ok: false,
        status: 'interrupted',
        build: MC_STAGE34_GATE_B3C_BUILD,
        stopCondition: addFailureReceipt.ok || addFailureReceipt.status === 'duplicate_suppressed' ? (add.stopCondition || add.status || 'candidate_write_failed') : (addFailureReceipt.stopCondition || 'failure_receipt_failed'),
        failedFixtureId: entry.fixtureId,
        childrenWritten: results.length,
        parentResult: 'receipt_draft',
        failureReceiptStatus: addFailureReceipt.status || '',
        failureReceiptWritten: addFailureReceipt.ok === true,
        providerCallAttempted: addMeta.providerCallAttempted === true,
        authorizedFixtureAttempts: safeMissionCommandOpenAiNumberV31(addMeta.authorizedFixtureAttempts || (providerAdapter.calls ? providerAdapter.calls.length : results.length + 1)),
        actualFetchAttempts: safeMissionCommandOpenAiNumberV31(addMeta.fetchAttempts || (providerAdapter.fetchAttempts || 0)),
        cumulativeEstimatedCost: cumulativeEstimatedCost,
        retryCount: 0,
        fallbackUsed: false
      };
    }
    results.push(add);
  }
  var final = finalizeMissionCommandStage34GateB3CBatch(runtimeAdapter, reviewAdapter, input.runId, input.batchKey);
  if (!final.ok) return final;
  return {
    ok: true,
    status: 'ready_for_review',
    build: MC_STAGE34_GATE_B3C_BUILD,
    runId: input.runId,
    batchKey: input.batchKey,
    relatedObject: MC_STAGE34_GATE_B3C_RELATED_OBJECT,
    childrenWritten: results.length,
    reviewRowsComplete: final.reviewRowsComplete,
    providerCallAttempted: true,
    authorizedFixtureAttempts: providerAdapter.calls ? providerAdapter.calls.length : results.length,
    actualFetchAttempts: safeMissionCommandOpenAiNumberV31(providerAdapter.fetchAttempts || 0),
    fakeProviderCalls: providerAdapter.calls ? providerAdapter.calls.length : results.length,
    cumulativeEstimatedCost: cumulativeEstimatedCost,
    retryCount: 0,
    fallbackUsed: false,
    wrapperInvokedByIntegration: false
  };
}

function verifyMissionCommandStage34GateB3CLocalChecks() {
  var stage31 = runMissionCommandOpenAiShadowFoundationChecksV31();
  var stage32 = runMissionCommandOpenAiStage32LocalChecks();
  var stage33 = runMissionCommandOpenAiStage33LocalChecks();
  var stage33r = runMissionCommandStage33RReceiptLocalChecks();
  var b3a = verifyMissionCommandStage34GateB3ALocalChecks();
  var flags = getMissionCommandStage34GateB3CFlags();
  var callerFlags = getMissionCommandStage34GateB3CFlags({ gateB3CEnabled: true });
  var wrongTokenInput = Object.assign({}, makeMissionCommandStage34GateB3CWrapperAuthorization(), { authorizationToken: 'wrong' });
  var wrongFlagsInput = Object.assign({}, makeMissionCommandStage34GateB3CWrapperAuthorization(), { wrapperAuthorization: false });
  var directRuntime = makeMissionCommandStage34GateB3AFakeRuntimeAdapter();
  var directReview = makeMissionCommandStage34GateB3CReviewAdapter();
  var directProvider = makeMissionCommandStage34GateB3CFakeProviderAdapter();
  var directBlocked = runMissionCommandStage34GateB3CProviderReviewBatch(directRuntime, directReview, directProvider, {});
  var wrongTokenBlocked = runMissionCommandStage34GateB3CProviderReviewBatch(directRuntime, directReview, directProvider, wrongTokenInput);
  var wrongFlagsBlocked = runMissionCommandStage34GateB3CProviderReviewBatch(directRuntime, directReview, directProvider, wrongFlagsInput);
  var wrongIdentityBlocked = runMissionCommandStage34GateB3CProviderReviewBatch(directRuntime, directReview, directProvider, Object.assign({}, makeMissionCommandStage34GateB3CWrapperAuthorization(), { runId: 'wrong' }));
  var requests = buildMissionCommandStage34GateB3CRequests();
  var redactedFetch = requests.ok ? makeMissionCommandStage34GateB3CFetchOptions('[redacted]', requests.requests[0].request) : {};
  var runtime = makeMissionCommandStage34GateB3AFakeRuntimeAdapter();
  var review = makeMissionCommandStage34GateB3CReviewAdapter();
  var provider = makeMissionCommandStage34GateB3CFakeProviderAdapter();
  var success = runMissionCommandStage34GateB3CProviderReviewBatch(runtime, review, provider, makeMissionCommandStage34GateB3CWrapperAuthorization());
  var duplicateProvider = makeMissionCommandStage34GateB3CFakeProviderAdapter();
  var duplicate = runMissionCommandStage34GateB3CProviderReviewBatch(runtime, review, duplicateProvider, makeMissionCommandStage34GateB3CWrapperAuthorization());
  var failureRuntime = makeMissionCommandStage34GateB3AFakeRuntimeAdapter();
  var failureReview = makeMissionCommandStage34GateB3CReviewAdapter();
  var failureProvider = makeMissionCommandStage34GateB3CFakeProviderAdapter({ failFixtureId: 'MC34-F12' });
  var interrupted = runMissionCommandStage34GateB3CProviderReviewBatch(failureRuntime, failureReview, failureProvider, makeMissionCommandStage34GateB3CWrapperAuthorization());
  var failureReceipt = findMissionCommandStage34GateB3CFailureReceipt(failureRuntime, MC_STAGE34_GATE_B3C_BATCH_KEY, 'MC34-F12');
  var failureDuplicate = appendMissionCommandStage34GateB3CFailureReceipt(failureRuntime, MC_STAGE34_GATE_B3C_RUN_ID, MC_STAGE34_GATE_B3C_BATCH_KEY, 'MC34-F12', 'fake_provider_blocked', failureProvider.calls.length);
  var interruptedRows = findMissionCommandStage34GateB3AReviewRows(failureReview, MC_STAGE34_GATE_B3C_BATCH_KEY);
  var credentialRuntime = makeMissionCommandStage34GateB3AFakeRuntimeAdapter();
  var credentialReview = makeMissionCommandStage34GateB3CReviewAdapter();
  var credentialProvider = makeMissionCommandStage34GateB3CFakeProviderAdapter({ credentialUnavailable: true });
  var credentialBlocked = runMissionCommandStage34GateB3CProviderReviewBatch(credentialRuntime, credentialReview, credentialProvider, makeMissionCommandStage34GateB3CWrapperAuthorization());
  var credentialFailureReceipt = findMissionCommandStage34GateB3CFailureReceipt(credentialRuntime, MC_STAGE34_GATE_B3C_BATCH_KEY, 'MC34-F01');
  var credentialSummary = parseMissionCommandStage34GateB3ASafeSummary(credentialFailureReceipt && credentialFailureReceipt.row);
  var fetchRuntime = makeMissionCommandStage34GateB3AFakeRuntimeAdapter();
  var fetchReview = makeMissionCommandStage34GateB3CReviewAdapter();
  var fetchProvider = makeMissionCommandStage34GateB3CFakeProviderAdapter({ fetchFailFixtureId: 'MC34-F01' });
  var fetchBlocked = runMissionCommandStage34GateB3CProviderReviewBatch(fetchRuntime, fetchReview, fetchProvider, makeMissionCommandStage34GateB3CWrapperAuthorization());
  var fetchFailureReceipt = findMissionCommandStage34GateB3CFailureReceipt(fetchRuntime, MC_STAGE34_GATE_B3C_BATCH_KEY, 'MC34-F01');
  var fetchSummary = parseMissionCommandStage34GateB3ASafeSummary(fetchFailureReceipt && fetchFailureReceipt.row);
  var malformedRuntime = makeMissionCommandStage34GateB3AFakeRuntimeAdapter();
  var malformedReview = makeMissionCommandStage34GateB3CReviewAdapter();
  var malformedProvider = makeMissionCommandStage34GateB3CFakeProviderAdapter({ malformedFixtureId: 'MC34-F01' });
  var malformedBlocked = runMissionCommandStage34GateB3CProviderReviewBatch(malformedRuntime, malformedReview, malformedProvider, makeMissionCommandStage34GateB3CWrapperAuthorization());
  var malformedReviewRow = findMissionCommandStage34GateB3AReviewRow(malformedReview, makeMissionCommandStage34GateB3AReviewRowId(MC_STAGE34_GATE_B3C_BATCH_KEY, 'MC34-F01'));
  var costRuntime = makeMissionCommandStage34GateB3AFakeRuntimeAdapter();
  var costReview = makeMissionCommandStage34GateB3CReviewAdapter();
  var costProvider = makeMissionCommandStage34GateB3CFakeProviderAdapter({ expensiveFixtureId: 'MC34-F01' });
  var costBlocked = runMissionCommandStage34GateB3CProviderReviewBatch(costRuntime, costReview, costProvider, makeMissionCommandStage34GateB3CWrapperAuthorization());
  var costReviewRow = findMissionCommandStage34GateB3AReviewRow(costReview, makeMissionCommandStage34GateB3AReviewRowId(MC_STAGE34_GATE_B3C_BATCH_KEY, 'MC34-F01'));
  var envelopeCandidate = makeMissionCommandStage34GateB3ASafeCandidates()[0];
  var envelope = {
    output_text: JSON.stringify(envelopeCandidate),
    usage: {
      input_tokens: 2000,
      output_tokens: 450,
      input_tokens_details: { cached_tokens: 0 },
      output_tokens_details: { reasoning_tokens: 12 }
    }
  };
  var envelopeResult = makeMissionCommandStage34GateB3CProviderResultFromEnvelope('MC34-F01', envelope, {
    providerCallAttempted: true,
    authorizedFixtureAttempts: 1,
    fetchAttempts: 1,
    latencyMs: 12,
    httpStatus: 200
  });
  var extraHeader = refreshMissionCommandStage34GateB3AReviewAdapterUnderLock(makeMissionCommandStage34GateB3CReviewAdapter(getMissionCommandStage34GateB3AReviewHeaders().concat(['version']), []));
  var staleReview = makeMissionCommandStage34GateB3CReviewAdapter();
  reserveMissionCommandStage34GateB3CReviewRows(staleReview, MC_STAGE34_GATE_B3C_RUN_ID, MC_STAGE34_GATE_B3C_BATCH_KEY);
  var staleEntry = findMissionCommandStage34GateB3AReviewRow(staleReview, makeMissionCommandStage34GateB3AReviewRowId(MC_STAGE34_GATE_B3C_BATCH_KEY, 'MC34-F01'));
  var staleHash = makeMissionCommandStage34GateB3CReviewSnapshotHash(staleEntry.row, staleReview.headers);
  staleReview.rows[staleEntry.index].candidate_text = 'manual change before update';
  var staleBlocked = false;
  try {
    staleReview.updateRowObject(staleEntry.index, staleEntry.row, { persistedHash: staleHash });
  } catch (err) {
    staleBlocked = true;
  }
  var versionEtagBlocked = false;
  try {
    staleReview.updateRowObject(staleEntry.index, staleEntry.row, { version: 1, etag: 'x' });
  } catch (err2) {
    versionEtagBlocked = true;
  }
  var invalidCost = validateMissionCommandStage34GateB3CRunIdentity({
    runId: MC_STAGE34_GATE_B3C_RUN_ID,
    batchKey: MC_STAGE34_GATE_B3C_BATCH_KEY,
    estimatedCostUsd: 0.21
  });
  var runtimeText = JSON.stringify(runtime.rows);
  var reviewText = JSON.stringify(review.rows);
  var requestText = JSON.stringify(requests.requests || []);
  return {
    ok: stage31.ok === true &&
      stage32.ok === true &&
      stage33.ok === true &&
      stage33r.ok === true &&
      b3a.ok === true &&
      flags.gateB3CEnabled === false &&
      flags.killSwitchEnabled === true &&
      callerFlags.gateB3CEnabled === false &&
      directBlocked.stopCondition === 'run_id_mismatch' &&
      directRuntime.rows.length === 0 &&
      directProvider.calls.length === 0 &&
      wrongTokenBlocked.stopCondition === 'wrapper_authorization_missing' &&
      wrongFlagsBlocked.stopCondition === 'wrapper_authorization_missing' &&
      wrongIdentityBlocked.stopCondition === 'run_id_mismatch' &&
      requests.ok === true &&
      requests.requests.length === 4 &&
      requests.requests.every(function(entry) {
        return entry.request.model === MC_STAGE34_GATE_B3C_MODEL &&
          entry.request.store === false &&
          Array.isArray(entry.request.tools) &&
          entry.request.tools.length === 0 &&
          !entry.request.previous_response_id &&
          !entry.request.conversation &&
          entry.request.text.format.strict === true &&
          entry.request.max_output_tokens <= MC_STAGE34_GATE_B3C_MAX_OUTPUT_TOKENS_PER_CALL;
      }) &&
      redactedFetch.timeoutSeconds === MC_STAGE34_GATE_B3C_TIMEOUT_SECONDS &&
      redactedFetch.headers.Authorization === 'Bearer [redacted]' &&
      success.ok === true &&
      success.fakeProviderCalls === 4 &&
      success.childrenWritten === 4 &&
      success.reviewRowsComplete === 4 &&
      provider.calls[0].fixtureId === 'MC34-F01' &&
      duplicate.status === 'duplicate_suppressed' &&
      duplicateProvider.calls.length === 0 &&
      interrupted.ok === false &&
      interrupted.status === 'interrupted' &&
      interrupted.failedFixtureId === 'MC34-F12' &&
      interrupted.childrenWritten === 2 &&
      interrupted.failureReceiptWritten === true &&
      interrupted.providerCallAttempted === true &&
      interrupted.authorizedFixtureAttempts === 3 &&
      interrupted.actualFetchAttempts === 3 &&
      failureReceipt &&
      failureReceipt.row.receipt_type === MC_STAGE34_GATE_B3C_FAILURE_RECEIPT_TYPE &&
      failureDuplicate.status === 'duplicate_suppressed' &&
      interrupted.retryCount === 0 &&
      interrupted.fallbackUsed === false &&
      success.cumulativeEstimatedCost > 0 &&
      success.cumulativeEstimatedCost < MC_STAGE34_GATE_B3C_MAX_ESTIMATED_SPEND_USD &&
      credentialBlocked.stopCondition === 'credential_unavailable' &&
      credentialBlocked.providerCallAttempted === false &&
      credentialBlocked.authorizedFixtureAttempts === 1 &&
      credentialBlocked.actualFetchAttempts === 0 &&
      credentialSummary.provider_call_attempted === false &&
      credentialSummary.fetch_attempts === 0 &&
      fetchBlocked.stopCondition === 'provider_fetch_failed' &&
      fetchBlocked.providerCallAttempted === true &&
      fetchBlocked.actualFetchAttempts === 1 &&
      fetchSummary.provider_call_attempted === true &&
      fetchSummary.fetch_attempts === 1 &&
      malformedBlocked.stopCondition === 'fixture_not_allowed' &&
      malformedReviewRow.row.candidate_text === '' &&
      costBlocked.stopCondition === 'cost_cap_exceeded' &&
      costBlocked.cumulativeEstimatedCost > MC_STAGE34_GATE_B3C_MAX_ESTIMATED_SPEND_USD &&
      costReviewRow.row.candidate_text === '' &&
      envelopeResult.ok === true &&
      envelopeResult.candidate.fixture_id === 'MC34-F01' &&
      envelopeResult.meta.inputTokens === 2000 &&
      envelopeResult.meta.outputTokens === 450 &&
      envelopeResult.meta.reasoningTokens === 12 &&
      envelopeResult.meta.estimatedCost > 0 &&
      envelopeResult.meta.estimatedCost < MC_STAGE34_GATE_B3C_MAX_ESTIMATED_SPEND_USD &&
      interruptedRows.filter(function(entry) { return entry.row.candidate_text; }).length === 2 &&
      findMissionCommandStage34GateB3AReviewRow(failureReview, makeMissionCommandStage34GateB3AReviewRowId(MC_STAGE34_GATE_B3C_BATCH_KEY, 'MC34-F12')).row.candidate_text === '' &&
      extraHeader.ok === false &&
      staleBlocked === true &&
      versionEtagBlocked === true &&
      invalidCost.ok === false &&
      runtimeText.indexOf('candidate_text') === -1 &&
      runtimeText.indexOf('Review the synthetic') === -1 &&
      reviewText.indexOf('api key') === -1 &&
      requestText.indexOf('previous_response_id') === -1 &&
      requestText.indexOf('conversation') === -1,
    build: MC_STAGE34_GATE_B3C_BUILD,
    wrapperName: MC_STAGE34_GATE_B3C_WRAPPER_NAME,
    runId: MC_STAGE34_GATE_B3C_RUN_ID,
    batchKey: MC_STAGE34_GATE_B3C_BATCH_KEY,
    relatedObject: MC_STAGE34_GATE_B3C_RELATED_OBJECT,
    reviewTabName: MC_STAGE34_GATE_B3A_REVIEW_TAB_NAME,
    reviewSheetId: MC_STAGE34_GATE_B3C_REVIEW_SHEET_ID,
    model: MC_STAGE34_GATE_B3C_MODEL,
    maxCalls: MC_STAGE34_GATE_B3C_MAX_CALLS,
    retryCount: MC_STAGE34_GATE_B3C_RETRY_COUNT,
    fallbackUsed: false,
    timeoutSeconds: MC_STAGE34_GATE_B3C_TIMEOUT_SECONDS,
    maxInputTokensPerCall: MC_STAGE34_GATE_B3C_MAX_INPUT_TOKENS_PER_CALL,
    maxOutputTokensPerCall: MC_STAGE34_GATE_B3C_MAX_OUTPUT_TOKENS_PER_CALL,
    maxEstimatedSpendUsd: MC_STAGE34_GATE_B3C_MAX_ESTIMATED_SPEND_USD,
    requestCount: requests.requests.length,
    requestContractReady: requests.ok === true,
    directCoordinatorBlocked: directBlocked.stopCondition === 'run_id_mismatch' && directRuntime.rows.length === 0 && directProvider.calls.length === 0,
    wrongAuthorizationBlocked: wrongTokenBlocked.stopCondition === 'wrapper_authorization_missing',
    wrongFlagsBlocked: wrongFlagsBlocked.stopCondition === 'wrapper_authorization_missing',
    wrongIdentityBlocked: wrongIdentityBlocked.stopCondition === 'run_id_mismatch',
    successFakeProviderCalls: success.fakeProviderCalls || 0,
    authorizedFixtureAttempts: success.authorizedFixtureAttempts || 0,
    actualFetchAttempts: success.actualFetchAttempts || 0,
    cumulativeEstimatedCost: success.cumulativeEstimatedCost || 0,
    cumulativeCostBelowCap: success.cumulativeEstimatedCost > 0 && success.cumulativeEstimatedCost < MC_STAGE34_GATE_B3C_MAX_ESTIMATED_SPEND_USD,
    providerAttemptsRecorded: provider.calls.length === 4 && provider.calls.every(function(call) { return call.safeAttemptRecorded === true && !call.request; }),
    duplicateSuppressedBeforeProvider: duplicate.status === 'duplicate_suppressed' && duplicateProvider.calls.length === 0,
    interruptionStopsWithoutRetry: interrupted.status === 'interrupted' && interrupted.retryCount === 0,
    failedThirdCallCountTruthful: interrupted.authorizedFixtureAttempts === 3 && interrupted.actualFetchAttempts === 3 && failureProvider.calls.length === 3,
    failureReceiptWritten: interrupted.failureReceiptWritten === true,
    failureReceiptDuplicateSuppressed: failureDuplicate.status === 'duplicate_suppressed',
    credentialUnavailableZeroFetch: credentialBlocked.providerCallAttempted === false && credentialBlocked.actualFetchAttempts === 0 && credentialSummary.provider_call_attempted === false,
    fetchFailureOneAttempt: fetchBlocked.providerCallAttempted === true && fetchBlocked.actualFetchAttempts === 1 && fetchSummary.provider_call_attempted === true,
    malformedEnvelopeBlocked: malformedBlocked.stopCondition === 'fixture_not_allowed' && malformedReviewRow.row.candidate_text === '',
    returnedUsageCostCapBlocked: costBlocked.stopCondition === 'cost_cap_exceeded' && costReviewRow.row.candidate_text === '',
    realisticEnvelopeParsed: envelopeResult.ok === true && envelopeResult.candidate.fixture_id === 'MC34-F01',
    realisticEnvelopeUsageCostReady: envelopeResult.meta.inputTokens === 2000 && envelopeResult.meta.outputTokens === 450 && envelopeResult.meta.estimatedCost > 0,
    failedFixtureReadableBlank: findMissionCommandStage34GateB3AReviewRow(failureReview, makeMissionCommandStage34GateB3AReviewRowId(MC_STAGE34_GATE_B3C_BATCH_KEY, 'MC34-F12')).row.candidate_text === '',
    extraReviewHeaderBlocked: extraHeader.ok === false,
    staleReviewSnapshotBlocked: staleBlocked,
    versionEtagRejectedForReviewRows: versionEtagBlocked,
    partialRowsRemainReviewable: interruptedRows.length === 4,
    runtimeReceiptsHashOnly: runtimeText.indexOf('candidate_text') === -1,
    readableTextReviewTabOnly: reviewText.indexOf('Review the synthetic') !== -1,
    modelAccessVerified: false,
    pricingVerifiedForB3D: false,
    providerCallAttemptedByIntegration: false,
    wrapperInvokedByIntegration: false,
    liveSheetTouched: false,
    scriptPropertiesAccessed: false,
    routeCreated: false,
    triggerInstall: false,
    visibleDelivery: false,
    dispatch: false,
    externalWrite: false,
    gateB3DStarted: false
  };
}

// Mission Command Stage 3.4 Gate C2 local correction preparation only.
// Adds candidate V2 validation and fake evidence helpers; no live schema, wrapper, provider, route, or trigger.
var MC_STAGE34_GATE_C2_BUILD = 'mmos-20260712-stage3-4-gate-c2-local-correction-preparation';
var MC_STAGE34_GATE_C2_ENABLED = false;
var MC_STAGE34_GATE_C2_KILL_SWITCH = true;
var MC_STAGE34_GATE_C2_SCHEMA_VERSION = 'mc_stage34_candidate_v2';
var MC_STAGE34_GATE_C2_RETENTION_SECONDS = 604800;
var MC_STAGE34_GATE_C2_FAILURE_RECEIPT_TYPE = 'stage_3_4_gate_b3_quality_block';
var MC_STAGE34_GATE_C2_OBJECT_TYPES = ['approval_packet', 'review_queue', 'project_decision', 'campaign_direction', 'handoff_dependency', 'meeting_brief', 'other_synthetic'];
var MC_STAGE34_GATE_C2_SOURCE_LABELS = ['synthetic_fixture', 'shadow_review_fixture', 'synthetic_runtime_receipt', 'synthetic_shadow_fixture', 'runtime_receipt_hash_link', 'chief_escalation_context'];
var MC_STAGE34_GATE_C2_GROUNDING_STATES = ['grounded_synthetic', 'grounded_hash_linked', 'synthetic_fixture_only'];
var MC_STAGE34_GATE_C2_MATERIAL_CODES = ['new_eligible_event', 'state_changed', 'priority_changed', 'due_date_changed', 'owner_changed', 'blocker_changed', 'review_transition_changed', 'dependency_changed', 'suppression_reopen', 'chief_escalation_required', 'none'];
var MC_STAGE34_GATE_C2_NEXT_MOVE_TYPES = ['review', 'approve_or_revise', 'choose_direction', 'review_dependency', 'review_owner', 'reply', 'park', 'review_decision_packet', 'stage_coordination_owner', 'review_changed_due_date', 'choose_approval_path'];
var MC_STAGE34_GATE_C2_QUALITY_FAIL_CODES = [
  'missing_object_label',
  'generic_object_label',
  'missing_decision',
  'missing_source_labels',
  'grounding_incomplete',
  'why_now_generic',
  'invalid_material_change_code',
  'missing_material_change_summary',
  'material_change_contradiction',
  'next_move_count_invalid',
  'invalid_next_move_type',
  'meta_instruction_detected',
  'role_mismatch',
  'escalation_attribution_missing',
  'dedupe_evidence_missing',
  'execution_claim_detected',
  'privacy_blocked',
  'unsafe_or_incomplete_truncation',
  'retention_invalid',
  'provider_aggregation_mismatch'
];
var MC_STAGE34_GATE_C2_ADDITIVE_REVIEW_COLUMNS = [
  'schema_version',
  'created_at',
  'object_type',
  'object_label',
  'source_labels',
  'grounding_state',
  'grounding_evidence',
  'material_change_code',
  'material_change_summary',
  'material_change_summary_truncated',
  'why_now_truncated',
  'candidate_text_truncated',
  'next_move_text',
  'next_move_count',
  'escalation_chain_id',
  'escalated_to',
  'chief_context_summary',
  'executive_decision_required',
  'companion_chief_candidate_state',
  'dedupe_evidence_key',
  'suppression_evidence_state',
  'confidence',
  'should_deliver',
  'blocked_reason',
  'quality_gate_state',
  'quality_fail_codes',
  'concrete_object_present',
  'source_labels_valid',
  'grounding_valid',
  'why_now_specific',
  'material_change_valid',
  'next_move_count_valid',
  'role_fidelity_valid',
  'escalation_attribution_valid',
  'dedupe_evidence_valid',
  'protected_wording_valid',
  'word_boundary_safe',
  'candidate_non_meta',
  'privacy_valid',
  'review_ready',
  'provider_call_attempted',
  'fetch_attempt_count',
  'fetch_attempt_index'
];

function getMissionCommandStage34GateC2Flags(input) {
  input = input || {};
  return {
    gateC2Enabled: MC_STAGE34_GATE_C2_ENABLED === true && MC_STAGE34_GATE_C2_KILL_SWITCH !== true,
    killSwitchEnabled: MC_STAGE34_GATE_C2_KILL_SWITCH === true,
    callerCanEnable: false,
    requestedEnabled: input.gateC2Enabled === true,
    liveSheetEnabled: false,
    providerEnabled: false,
    scriptPropertiesEnabled: false,
    wrapperEnabled: false,
    routeEnabled: false,
    triggerEnabled: false,
    visibleDeliveryEnabled: false,
    dispatchEnabled: false,
    externalWriteEnabled: false
  };
}

function getMissionCommandStage34GateC2AdditiveReviewColumns() {
  return MC_STAGE34_GATE_C2_ADDITIVE_REVIEW_COLUMNS.slice();
}

function getMissionCommandStage34GateC2ProposedReviewHeaders() {
  return getMissionCommandStage34GateB3AReviewHeaders().concat(getMissionCommandStage34GateC2AdditiveReviewColumns());
}

function validateMissionCommandStage34GateC2ProposedHeaders(headers) {
  headers = headers || [];
  var expected = getMissionCommandStage34GateC2ProposedReviewHeaders();
  var missing = expected.filter(function(header) { return headers.indexOf(header) === -1; });
  var exactOrder = headers.length === expected.length && missing.length === 0 && expected.every(function(header, index) {
    return headers[index] === header;
  });
  return { ok: exactOrder, missing: missing, exactOrder: exactOrder, expectedCount: expected.length, actualCount: headers.length };
}

function makeMissionCommandStage34GateC2Blocked(reason, detail, meta) {
  meta = meta || {};
  return {
    ok: false,
    status: meta.status || 'blocked',
    build: MC_STAGE34_GATE_C2_BUILD,
    stopCondition: reason || 'gate_c2_blocked',
    safeDetail: detail || '',
    providerCallAttempted: false,
    liveSheetTouched: false,
    scriptPropertiesAccessed: false,
    wrapperCreated: false,
    routeCreated: false,
    triggerInstall: false,
    visibleDelivery: false,
    dispatch: false,
    externalWrite: false
  };
}

function normalizeMissionCommandStage34GateC2Text(value) {
  return String(value || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
}

function sanitizeMissionCommandStage34GateC2Text(value, maxLength) {
  var text = normalizeMissionCommandStage34GateC2Text(value);
  maxLength = safeMissionCommandOpenAiNumberV31(maxLength || 0);
  if (!maxLength || text.length <= maxLength) return { text: text, truncated: false, wordBoundarySafe: true };
  var limit = Math.max(0, maxLength - 3);
  var slice = text.slice(0, limit);
  var boundary = slice.lastIndexOf(' ');
  if (boundary <= 0) return { text: slice + '...', truncated: true, wordBoundarySafe: false };
  return { text: slice.slice(0, boundary).trim() + '...', truncated: true, wordBoundarySafe: true };
}

function isMissionCommandStage34GateC2GenericObject(label) {
  var value = normalizeMissionCommandStage34GateC2Text(label).toLowerCase();
  return !value || ['matter', 'item', 'thing', 'request', 'context', 'brief', 'the matter', 'the item'].indexOf(value) !== -1;
}

function missionCommandStage34GateC2ContainsAny(text, phrases) {
  var value = normalizeMissionCommandStage34GateC2Text(text).toLowerCase();
  for (var i = 0; i < phrases.length; i++) {
    if (value.indexOf(phrases[i]) !== -1) return true;
  }
  return false;
}

function hasMissionCommandStage34GateC2MetaInstruction(candidate) {
  var text = [candidate.candidate_text, candidate.next_move_text, candidate.why_now].join(' ');
  return missionCommandStage34GateC2ContainsAny(text, [
    'prepare a brief',
    'prepare a concise brief',
    'frame the decision',
    'route the matter',
    'route options',
    'validate assumptions',
    'validate impacted assumptions',
    'identify dependencies',
    'stage updated context'
  ]);
}

function hasMissionCommandStage34GateC2ExecutionClaim(candidate) {
  var text = normalizeMissionCommandStage34GateC2Text([candidate.candidate_text, candidate.next_move_text].join(' ')).toLowerCase();
  var negated = ['do not dispatch', 'no dispatch', 'do not send', 'no external action', 'not delivered'];
  for (var n = 0; n < negated.length; n++) text = text.replace(negated[n], '');
  return /\b(assign|assigned|resolve|resolved|restart|clear|send|sent|publish|published|deliver|delivered|dispatch|dispatched|mark complete|updated the record|update the record)\b/.test(text);
}

function hasMissionCommandStage34GateC2SpecificWhyNow(whyNow) {
  var value = normalizeMissionCommandStage34GateC2Text(whyNow).toLowerCase();
  if (value.length < 12) return false;
  if (['time-sensitive', 'important', 'urgent', 'needs review', 'requires leadership review'].indexOf(value) !== -1) return false;
  return /(today|window|due|changed|waiting|moved|slot|threshold|parked|competing|approval|owner)/.test(value);
}

function getMissionCommandStage34GateC2AcceptanceFixtureMap() {
  return Object.assign({
    'MC34-F01': {
      revised_id: 'MC34-F01-R1',
      role_owner: 'executive_assistant',
      family: 'executive_assistant_critical',
      priority: 'critical',
      object_type: 'approval_packet',
      object_label: 'Project Atlas launch approval packet',
      source_labels: ['synthetic_shadow_fixture', 'runtime_receipt_hash_link'],
      grounding_state: 'synthetic_fixture_only',
      grounding_evidence: 'The synthetic approval packet is linked to the shadow review fixture.',
      decision_needed: 'Choose approve or revise before the review window closes.',
      why_now: 'The review window closes today and downstream client-facing draft work must stay parked.',
      material_change_code: 'review_transition_changed',
      material_change_summary: 'The packet moved from routine preparation to executive approval-needed.',
      next_move_type: 'review_decision_packet',
      next_move_text: 'Review the Project Atlas approval packet.',
      next_move_count: 1,
      candidate_text: 'Project Atlas launch approval is at the review window. Choose approve or revise so the client-facing draft stays parked until your direction is set.',
      confidence: 0.86,
      should_deliver: false,
      escalated_from: '',
      escalated_to: '',
      chief_context_summary: '',
      executive_decision_required: '',
      companion_chief_candidate_state: '',
      suppression_evidence_state: ''
    },
    'MC34-F04': {
      revised_id: 'MC34-F04-R1',
      role_owner: 'chief_of_staff',
      family: 'chief_coordination',
      priority: 'important',
      object_type: 'review_queue',
      object_label: 'Build Lane Delta sequencing handoff',
      source_labels: ['synthetic_shadow_fixture', 'runtime_receipt_hash_link'],
      grounding_state: 'synthetic_fixture_only',
      grounding_evidence: 'Prototype and Integration are waiting on one synthetic route decision.',
      decision_needed: 'Stage Planning as sequencing owner before downstream Build work is proposed.',
      why_now: 'Prototype and Integration are both waiting on the same route decision.',
      material_change_code: 'owner_changed',
      material_change_summary: 'Ownership changed from unassigned coordination to Planning-owned sequencing review.',
      next_move_type: 'stage_coordination_owner',
      next_move_text: 'Stage Planning as sequencing owner.',
      next_move_count: 1,
      candidate_text: 'Build Lane Delta has Prototype and Integration waiting on the same route decision. Stage Planning as sequencing owner before any downstream Build handoff is proposed.',
      confidence: 0.84,
      should_deliver: false,
      escalated_from: '',
      escalated_to: '',
      chief_context_summary: '',
      executive_decision_required: '',
      companion_chief_candidate_state: '',
      suppression_evidence_state: ''
    },
    'MC34-F12': {
      revised_id: 'MC34-F12-R1',
      role_owner: 'chief_of_staff',
      family: 'material_change_reopen',
      priority: 'critical',
      object_type: 'approval_packet',
      object_label: 'Client Packet Orion output review',
      source_labels: ['synthetic_shadow_fixture', 'runtime_receipt_hash_link'],
      grounding_state: 'synthetic_fixture_only',
      grounding_evidence: 'The synthetic due-date change reopens a previously quiet review.',
      decision_needed: 'Reopen the review because the due date changed from later this week to today.',
      why_now: 'The due date moved to today, so the prior quiet state is no longer valid.',
      material_change_code: 'due_date_changed',
      material_change_summary: 'Due date changed from later this week to today.',
      next_move_type: 'review_changed_due_date',
      next_move_text: 'Review the changed due-date dependency.',
      next_move_count: 1,
      candidate_text: 'Client Packet Orion moved from later this week to today. Reopen the review and check the changed due-date dependency before the handoff remains parked.',
      confidence: 0.88,
      should_deliver: false,
      escalated_from: '',
      escalated_to: '',
      chief_context_summary: '',
      executive_decision_required: '',
      companion_chief_candidate_state: '',
      suppression_evidence_state: ''
    },
    'MC34-F15': {
      revised_id: 'MC34-F15-R1',
      role_owner: 'executive_assistant',
      family: 'attributed_chief_escalation',
      priority: 'important',
      object_type: 'project_decision',
      object_label: 'Project Nova approval path',
      source_labels: ['synthetic_shadow_fixture', 'runtime_receipt_hash_link', 'chief_escalation_context'],
      grounding_state: 'synthetic_fixture_only',
      grounding_evidence: 'Chief context shows two synthetic lanes competing for one approval slot.',
      decision_needed: 'Choose whether the Build path or Content path gets today\'s approval slot.',
      why_now: 'Chief identified two lanes competing for the same approval slot, and one must stay parked.',
      material_change_code: 'review_transition_changed',
      material_change_summary: 'Team coordination moved into an A1XX decision because the approval slot can hold only one path.',
      next_move_type: 'choose_approval_path',
      next_move_text: 'Choose Build path or Content path for today\'s approval slot.',
      next_move_count: 1,
      candidate_text: 'Chief flagged Project Nova: Build and Content are competing for today\'s approval slot. Choose which path gets reviewed now; the other stays parked.',
      confidence: 0.87,
      should_deliver: false,
      escalated_from: 'chief_of_staff',
      escalated_to: 'executive_assistant',
      chief_context_summary: 'Chief identified Build and Content lanes competing for one synthetic approval slot.',
      executive_decision_required: 'Choose whether Build or Content gets today\'s approval slot.',
      companion_chief_candidate_state: 'merged_into_escalation',
      suppression_evidence_state: 'verified_hash_link'
    }
  }, getMissionCommandStage34GateI5AFixtureMap(), getMissionCommandStage34GateI5BFixtureMap(), getMissionCommandStage34GateI5CFixtureMap(), getMissionCommandStage34GateI5DFixtureMap());
}

function makeMissionCommandStage34GateC2DedupeKey(candidate) {
  return missionCommandStage34GateB1Hash([
    MC_STAGE34_GATE_C2_SCHEMA_VERSION,
    candidate.fixture_id || '',
    candidate.role_owner || '',
    candidate.escalated_from || '',
    candidate.object_label || '',
    candidate.decision_needed || ''
  ].join('|'));
}

function makeMissionCommandStage34GateC2EscalationChainId(candidate) {
  return missionCommandStage34GateB1Hash([
    'stage34_c2_escalation',
    candidate.fixture_id || '',
    candidate.family || '',
    candidate.chief_context_summary || '',
    candidate.executive_decision_required || ''
  ].join('|'));
}

function makeMissionCommandStage34GateC2Candidate(fixtureId, overrides) {
  var base = Object.assign({}, (getMissionCommandStage34GateC2AcceptanceFixtureMap()[fixtureId] || {}), overrides || {});
  base.schema_version = base.schema_version || MC_STAGE34_GATE_C2_SCHEMA_VERSION;
  base.fixture_id = base.fixture_id || fixtureId;
  base.candidate_family_key = base.candidate_family_key || missionCommandStage34GateB1Hash(['candidate_v2', fixtureId, base.family || ''].join('|'));
  base.escalation_chain_id = base.escalation_chain_id || (base.escalated_from ? makeMissionCommandStage34GateC2EscalationChainId(base) : '');
  base.dedupe_evidence_key = base.dedupe_evidence_key || (base.escalated_from ? makeMissionCommandStage34GateC2DedupeKey(base) : '');
  base.blocked_reason = base.blocked_reason || '';
  return base;
}

function getMissionCommandStage34GateC2CandidateSchema() {
  return {
    schema_version: MC_STAGE34_GATE_C2_SCHEMA_VERSION,
    required: [
      'schema_version',
      'fixture_id',
      'candidate_family_key',
      'role_owner',
      'family',
      'priority',
      'object_type',
      'object_label',
      'source_labels',
      'grounding_state',
      'grounding_evidence',
      'decision_needed',
      'why_now',
      'material_change_code',
      'material_change_summary',
      'next_move_type',
      'next_move_text',
      'next_move_count',
      'candidate_text',
      'confidence',
      'should_deliver'
    ],
    materialChangeCodes: MC_STAGE34_GATE_C2_MATERIAL_CODES.slice(),
    nextMoveTypes: MC_STAGE34_GATE_C2_NEXT_MOVE_TYPES.slice()
  };
}

function getMissionCommandStage34GateC3ProviderCandidateFields() {
  return [
    'schema_version',
    'fixture_id',
    'candidate_family_key',
    'role_owner',
    'family',
    'priority',
    'object_type',
    'object_label',
    'source_labels',
    'grounding_state',
    'grounding_evidence',
    'decision_needed',
    'why_now',
    'material_change_code',
    'material_change_summary',
    'next_move_type',
    'next_move_text',
    'next_move_count',
    'candidate_text',
    'confidence',
    'should_deliver',
    'escalated_from',
    'escalated_to',
    'chief_context_summary',
    'executive_decision_required',
    'companion_chief_candidate_state',
    'dedupe_evidence_key',
    'suppression_evidence_state'
  ];
}

function getMissionCommandStage34GateC3RuntimeOwnedProviderSchemaFields() {
  return [
    'review_row_id',
    'review_batch_id',
    'receipt_id',
    'receipt_parent_id',
    'receipt_child_id',
    'receipt_related_object',
    'candidate_sha256',
    'quality_gate_state',
    'quality_fail_codes',
    'review_ready',
    'review_state',
    'batch_state',
    'retention_due_at',
    'created_at',
    'updated_at',
    'provider_call_attempted',
    'fetch_attempt_count',
    'fetch_attempt_index',
    'safe_summary',
    'safety_identifier_hash',
    'etag',
    'version'
  ];
}

function getMissionCommandStage34GateC3ProviderCandidateSchema() {
  var fields = getMissionCommandStage34GateC3ProviderCandidateFields();
  return {
    type: 'object',
    additionalProperties: false,
    required: fields.slice(),
    properties: {
      schema_version: { type: 'string', enum: [MC_STAGE34_GATE_C2_SCHEMA_VERSION] },
      fixture_id: { type: 'string', enum: MC_STAGE34_GATE_B3A_FIXTURE_IDS.slice() },
      candidate_family_key: { type: 'string' },
      role_owner: { type: 'string', enum: ['executive_assistant', 'chief_of_staff'] },
      family: { type: 'string', enum: ['executive_assistant_critical', 'chief_coordination', 'material_change_reopen', 'attributed_chief_escalation'] },
      priority: { type: 'string', enum: ['critical', 'important', 'routine', 'low'] },
      object_type: { type: 'string', enum: MC_STAGE34_GATE_C2_OBJECT_TYPES.slice() },
      object_label: { type: 'string' },
      source_labels: { type: 'array', items: { type: 'string', enum: MC_STAGE34_GATE_C2_SOURCE_LABELS.slice() } },
      grounding_state: { type: 'string', enum: MC_STAGE34_GATE_C2_GROUNDING_STATES.slice() },
      grounding_evidence: { type: 'string' },
      decision_needed: { type: 'string' },
      why_now: { type: 'string' },
      material_change_code: { type: 'string', enum: MC_STAGE34_GATE_C2_MATERIAL_CODES.slice() },
      material_change_summary: { type: 'string' },
      next_move_type: { type: 'string', enum: MC_STAGE34_GATE_C2_NEXT_MOVE_TYPES.slice() },
      next_move_text: { type: 'string' },
      next_move_count: { type: 'number', enum: [1] },
      candidate_text: { type: 'string' },
      confidence: { type: 'number' },
      should_deliver: { type: 'boolean', enum: [false] },
      escalated_from: { type: 'string' },
      escalated_to: { type: 'string' },
      chief_context_summary: { type: 'string' },
      executive_decision_required: { type: 'string' },
      companion_chief_candidate_state: { type: 'string', enum: ['', 'suppressed_same_family', 'merged_into_escalation'] },
      dedupe_evidence_key: { type: 'string' },
      suppression_evidence_state: { type: 'string', enum: ['', 'verified_hash_link'] }
    }
  };
}

function validateMissionCommandStage34GateC3StrictSchemaNode(node, path, errors) {
  node = node || {};
  path = path || 'schema';
  errors = errors || [];
  var allowed = ['type', 'enum', 'items', 'properties', 'required', 'additionalProperties'];
  Object.keys(node).forEach(function(key) {
    if (allowed.indexOf(key) === -1) errors.push(path + ':unsupported_keyword_' + key);
  });
  if (!node.type) errors.push(path + ':missing_type');
  if (['object', 'string', 'number', 'boolean', 'array'].indexOf(node.type) === -1) errors.push(path + ':unsupported_type');
  if (node.enum && (!Array.isArray(node.enum) || node.enum.length === 0)) errors.push(path + ':invalid_enum');
  if (node.type === 'array') {
    if (!node.items || typeof node.items !== 'object') errors.push(path + ':array_items_missing');
    else validateMissionCommandStage34GateC3StrictSchemaNode(node.items, path + '.items', errors);
  }
  if (node.type === 'object') {
    if (node.additionalProperties !== false) errors.push(path + ':additional_properties_must_be_false');
    if (!node.properties || typeof node.properties !== 'object' || Array.isArray(node.properties)) errors.push(path + ':properties_missing');
    var required = Array.isArray(node.required) ? node.required : [];
    if (!Array.isArray(node.required)) errors.push(path + ':required_missing');
    var seen = {};
    required.forEach(function(name) {
      if (seen[name]) errors.push(path + ':duplicate_required_' + name);
      seen[name] = true;
      if (!node.properties || !node.properties[name]) errors.push(path + ':required_property_missing_' + name);
    });
    if (node.properties) {
      Object.keys(node.properties).forEach(function(name) {
        if (required.indexOf(name) === -1) errors.push(path + ':property_not_required_' + name);
        validateMissionCommandStage34GateC3StrictSchemaNode(node.properties[name], path + '.properties.' + name, errors);
      });
    }
  }
  return errors;
}

function validateMissionCommandStage34GateC3ProviderSchema(schema) {
  var errors = [];
  schema = schema || {};
  validateMissionCommandStage34GateC3StrictSchemaNode(schema, 'schema', errors);
  var required = Array.isArray(schema.required) ? schema.required : [];
  var properties = schema.properties || {};
  var expected = getMissionCommandStage34GateC3ProviderCandidateFields();
  expected.forEach(function(field) {
    if (required.indexOf(field) === -1) errors.push('provider_required_missing_' + field);
    if (!properties[field]) errors.push('provider_property_missing_' + field);
  });
  required.forEach(function(field) {
    if (expected.indexOf(field) === -1) errors.push('provider_required_unexpected_' + field);
  });
  Object.keys(properties).forEach(function(field) {
    if (expected.indexOf(field) === -1) errors.push('provider_property_unexpected_' + field);
  });
  getMissionCommandStage34GateC3RuntimeOwnedProviderSchemaFields().forEach(function(field) {
    if (required.indexOf(field) !== -1 || properties[field]) errors.push('runtime_owned_field_leaked_' + field);
  });
  return { ok: errors.length === 0, errors: errors };
}

function validateMissionCommandStage34GateC3Request(fixtureId, request) {
  var errors = [];
  var base = validateMissionCommandOpenAiShadowRequestV31(request);
  errors = errors.concat(base.errors || []);
  request = request || {};
  if (request.model !== MC_STAGE34_GATE_C3_MODEL) errors.push('model_mismatch');
  if (request.max_output_tokens !== MC_STAGE34_GATE_C3_MAX_OUTPUT_TOKENS_PER_CALL) errors.push('max_output_tokens_mismatch');
  if (!request.reasoning || request.reasoning.effort !== 'low') errors.push('reasoning_effort_mismatch');
  if (request.parallel_tool_calls || request.tool_choice) errors.push('tool_selection_fields_must_be_absent');
  if (!Array.isArray(request.input) || request.input.length !== 2) errors.push('input_messages_invalid');
  if (request.input && request.input[1]) {
    var payload = {};
    try {
      payload = JSON.parse(request.input[1].content || '{}');
    } catch (err) {
      errors.push('user_payload_not_json');
    }
    if (payload.run_id !== MC_STAGE34_GATE_C3_RUN_ID) errors.push('run_id_mismatch');
    if (payload.batch_key !== MC_STAGE34_GATE_C3_BATCH_KEY) errors.push('batch_key_mismatch');
    if (payload.fixture_id !== fixtureId) errors.push('fixture_id_mismatch');
    if (payload.synthetic_only !== true) errors.push('synthetic_only_missing');
  }
  var format = request.text && request.text.format || {};
  if (format.name !== 'mission_command_stage34_candidate_v2') errors.push('schema_name_mismatch');
  var schemaCheck = validateMissionCommandStage34GateC3ProviderSchema(format.schema || {});
  errors = errors.concat(schemaCheck.errors || []);
  var serialized = '';
  try {
    serialized = JSON.stringify(request);
  } catch (err) {
    errors.push('request_serialization_failed');
  }
  if (serialized && serialized.length > MC_STAGE34_GATE_C3_MAX_INPUT_TOKENS_PER_CALL * 5) errors.push('request_payload_exceeds_input_cap');
  if (MC_STAGE34_GATE_B3A_FIXTURE_IDS.indexOf(fixtureId) === -1) errors.push('fixture_not_allowlisted');
  return { ok: errors.length === 0, errors: errors, serializedLength: serialized.length };
}

function computeMissionCommandStage34GateC2QualityGate(candidate) {
  candidate = candidate || {};
  var fixture = getMissionCommandStage34GateC2AcceptanceFixtureMap()[candidate.fixture_id] || {};
  var failCodes = [];
  var objectLabel = normalizeMissionCommandStage34GateC2Text(candidate.object_label);
  var sourceLabels = Array.isArray(candidate.source_labels) ? candidate.source_labels : [];
  var materialSummary = sanitizeMissionCommandStage34GateC2Text(candidate.material_change_summary, 200);
  var whyNow = sanitizeMissionCommandStage34GateC2Text(candidate.why_now, 180);
  var candidateText = sanitizeMissionCommandStage34GateC2Text(candidate.candidate_text, 360);
  var nextMoveText = sanitizeMissionCommandStage34GateC2Text(candidate.next_move_text, 120);
  var concreteObjectPresent = objectLabel.length >= 8 && objectLabel.length <= 80 && !isMissionCommandStage34GateC2GenericObject(objectLabel);
  var sourceLabelsValid = sourceLabels.length >= 1 && sourceLabels.length <= 3 && sourceLabels.every(function(label) {
    return MC_STAGE34_GATE_C2_SOURCE_LABELS.indexOf(label) !== -1;
  });
  var groundingValid = MC_STAGE34_GATE_C2_GROUNDING_STATES.indexOf(candidate.grounding_state) !== -1 && normalizeMissionCommandStage34GateC2Text(candidate.grounding_evidence).length >= 12;
  var whyNowSpecific = hasMissionCommandStage34GateC2SpecificWhyNow(candidate.why_now);
  var materialValid = MC_STAGE34_GATE_C2_MATERIAL_CODES.indexOf(candidate.material_change_code) !== -1 &&
    candidate.material_change_code !== 'none' &&
    materialSummary.text.length >= 12 &&
    !materialSummary.truncated &&
    !missionCommandStage34GateC2ContainsAny(materialSummary.text, ['material change', 'changed condition', 'needs review']);
  var nextMoveCountValid = safeMissionCommandOpenAiNumberV31(candidate.next_move_count) === 1 &&
    MC_STAGE34_GATE_C2_NEXT_MOVE_TYPES.indexOf(candidate.next_move_type) !== -1 &&
    nextMoveText.text.length >= 6 &&
    !/\b(and then|then|, and|;)\b/i.test(nextMoveText.text);
  var roleFidelityValid = candidate.role_owner === fixture.role_owner && candidate.family === fixture.family;
  var escalationRequired = candidate.fixture_id === 'MC34-F15' || candidate.family === 'attributed_chief_escalation';
  var escalationAttributionValid = !escalationRequired || (candidate.escalated_from === 'chief_of_staff' &&
    candidate.escalated_to === 'executive_assistant' &&
    normalizeMissionCommandStage34GateC2Text(candidate.chief_context_summary).length >= 12 &&
    normalizeMissionCommandStage34GateC2Text(candidate.executive_decision_required).length >= 8);
  var dedupeEvidenceValid = !escalationRequired || (['suppressed_same_family', 'merged_into_escalation'].indexOf(candidate.companion_chief_candidate_state) !== -1 &&
    candidate.suppression_evidence_state === 'verified_hash_link' &&
    normalizeMissionCommandStage34GateC2Text(candidate.dedupe_evidence_key).length >= 16);
  var protectedWordingValid = !hasMissionCommandStage34GateC2ExecutionClaim(candidate);
  var wordBoundarySafe = !materialSummary.truncated && !whyNow.truncated && !candidateText.truncated && !nextMoveText.truncated &&
    materialSummary.wordBoundarySafe && whyNow.wordBoundarySafe && candidateText.wordBoundarySafe && nextMoveText.wordBoundarySafe;
  var candidateNonMeta = !hasMissionCommandStage34GateC2MetaInstruction(candidate);
  var privacyValid = candidate.should_deliver === false && !missionCommandStage34GateC2ContainsAny(candidateText.text, ['api key', 'script property', 'raw provider', 'hidden reasoning', 'client email']);
  var decisionPresent = normalizeMissionCommandStage34GateC2Text(candidate.decision_needed).length >= 8;
  if (!concreteObjectPresent) failCodes.push(objectLabel ? 'generic_object_label' : 'missing_object_label');
  if (!decisionPresent) failCodes.push('missing_decision');
  if (!sourceLabelsValid) failCodes.push('missing_source_labels');
  if (!groundingValid) failCodes.push('grounding_incomplete');
  if (!whyNowSpecific) failCodes.push('why_now_generic');
  if (MC_STAGE34_GATE_C2_MATERIAL_CODES.indexOf(candidate.material_change_code) === -1 || candidate.material_change_code === 'none') failCodes.push('invalid_material_change_code');
  if (!materialValid) failCodes.push('missing_material_change_summary');
  if (!nextMoveCountValid) failCodes.push(safeMissionCommandOpenAiNumberV31(candidate.next_move_count) !== 1 ? 'next_move_count_invalid' : 'invalid_next_move_type');
  if (!roleFidelityValid) failCodes.push('role_mismatch');
  if (!escalationAttributionValid) failCodes.push('escalation_attribution_missing');
  if (!dedupeEvidenceValid) failCodes.push('dedupe_evidence_missing');
  if (!protectedWordingValid) failCodes.push('execution_claim_detected');
  if (!wordBoundarySafe) failCodes.push('unsafe_or_incomplete_truncation');
  if (!candidateNonMeta) failCodes.push('meta_instruction_detected');
  if (!privacyValid) failCodes.push('privacy_blocked');
  var pass = failCodes.length === 0 && Number(candidate.confidence || 0) >= 0.70;
  return {
    schema_valid: true,
    quality_gate_state: pass ? 'pass' : 'fail',
    quality_fail_codes: failCodes,
    concrete_object_present: concreteObjectPresent,
    source_labels_valid: sourceLabelsValid,
    grounding_valid: groundingValid,
    why_now_specific: whyNowSpecific,
    material_change_valid: materialValid,
    next_move_count_valid: nextMoveCountValid,
    role_fidelity_valid: roleFidelityValid,
    escalation_attribution_valid: escalationAttributionValid,
    dedupe_evidence_valid: dedupeEvidenceValid,
    protected_wording_valid: protectedWordingValid,
    word_boundary_safe: wordBoundarySafe,
    candidate_non_meta: candidateNonMeta,
    privacy_valid: privacyValid,
    review_ready: pass,
    sanitized: {
      why_now: whyNow,
      material_change_summary: materialSummary,
      next_move_text: nextMoveText,
      candidate_text: candidateText
    }
  };
}

function validateMissionCommandStage34GateC2Candidate(candidate) {
  candidate = candidate || {};
  var schemaErrors = [];
  var fixture = getMissionCommandStage34GateC2AcceptanceFixtureMap()[candidate.fixture_id] || null;
  if (candidate.schema_version !== MC_STAGE34_GATE_C2_SCHEMA_VERSION) schemaErrors.push('schema_version_invalid');
  if (!fixture) schemaErrors.push('fixture_not_allowed');
  if (MC_STAGE34_GATE_C2_OBJECT_TYPES.indexOf(candidate.object_type) === -1) schemaErrors.push('object_type_invalid');
  if (['critical', 'important', 'routine', 'low'].indexOf(candidate.priority) === -1) schemaErrors.push('priority_invalid');
  if (candidate.should_deliver !== false) schemaErrors.push('should_deliver_must_be_false');
  var quality = computeMissionCommandStage34GateC2QualityGate(candidate);
  if (schemaErrors.length) {
    quality.schema_valid = false;
    quality.quality_gate_state = 'fail';
    quality.review_ready = false;
    quality.quality_fail_codes = schemaErrors.concat(quality.quality_fail_codes || []);
  }
  return { ok: quality.schema_valid === true && quality.review_ready === true, schemaErrors: schemaErrors, quality: quality };
}

function makeMissionCommandStage34GateC2RetentionDueAt(createdAtIso) {
  var started = new Date(createdAtIso || '').getTime();
  if (!isFinite(started)) return { ok: false, stopCondition: 'run_timestamp_invalid', createdAt: createdAtIso || '', retentionDueAt: '' };
  var due = new Date(started + MC_STAGE34_GATE_C2_RETENTION_SECONDS * 1000).toISOString();
  return { ok: true, createdAt: new Date(started).toISOString(), retentionDueAt: due, seconds: MC_STAGE34_GATE_C2_RETENTION_SECONDS };
}

function validateMissionCommandStage34GateC2Retention(createdAtIso, retentionDueAtIso) {
  var created = new Date(createdAtIso || '').getTime();
  var due = new Date(retentionDueAtIso || '').getTime();
  var seconds = Math.round((due - created) / 1000);
  return { ok: isFinite(created) && isFinite(due) && seconds === MC_STAGE34_GATE_C2_RETENTION_SECONDS, seconds: seconds };
}

function makeMissionCommandStage34GateC2ReviewRow(candidate, runId, batchKey, createdAtIso) {
  var validation = validateMissionCommandStage34GateC2Candidate(candidate);
  var retention = makeMissionCommandStage34GateC2RetentionDueAt(createdAtIso);
  if (!retention.ok) return makeMissionCommandStage34GateC2Blocked(retention.stopCondition, 'Gate C2 review row requires a valid actual run timestamp.');
  var reviewRowId = makeMissionCommandStage34GateB3AReviewRowId(batchKey, candidate.fixture_id);
  var candidateHash = makeMissionCommandStage34GateB3ACandidateHash(candidate);
  var quality = validation.quality;
  var row = {
    review_row_id: reviewRowId,
    review_batch_id: batchKey,
    fixture_id: candidate.fixture_id,
    fixture_pack_sha256: MC_STAGE34_GATE_B1_FIXTURE_SHA256,
    receipt_related_object: makeMissionCommandStage34GateB3ARelatedObject(batchKey),
    receipt_parent_id: makeMissionCommandStage34GateB3AReceiptId('parent', batchKey),
    receipt_child_id: validation.ok ? makeMissionCommandStage34GateB3AReceiptId('child', batchKey, candidate.fixture_id) : '',
    candidate_sha256: validation.ok ? candidateHash : '',
    role_owner: candidate.role_owner || '',
    escalated_from: candidate.escalated_from || '',
    family: candidate.family || '',
    priority: candidate.priority || '',
    why_now: validation.ok ? quality.sanitized.why_now.text : '',
    material_change: '',
    next_move_type: candidate.next_move_type || '',
    candidate_text: validation.ok ? quality.sanitized.candidate_text.text : '',
    schema_valid: quality.schema_valid === true,
    review_state: validation.ok ? 'unreviewed' : 'quality_blocked',
    reviewer: '',
    reviewed_at: '',
    privacy_class: MC_STAGE34_GATE_B3A_PRIVACY_CLASS,
    retention_due_at: retention.retentionDueAt,
    redacted_at: '',
    redaction_reason: '',
    batch_state: validation.ok ? 'review_ready' : 'quality_blocked',
    boundary_flags: JSON.stringify({ raw_prompt_stored: false, raw_provider_response_stored: false, visible_delivery: false, dispatch: false, external_write: false, route_created: false }),
    schema_version: MC_STAGE34_GATE_C2_SCHEMA_VERSION,
    created_at: retention.createdAt,
    object_type: candidate.object_type || '',
    object_label: candidate.object_label || '',
    source_labels: JSON.stringify(candidate.source_labels || []),
    grounding_state: candidate.grounding_state || '',
    grounding_evidence: validation.ok ? normalizeMissionCommandStage34GateC2Text(candidate.grounding_evidence) : '',
    material_change_code: candidate.material_change_code || '',
    material_change_summary: validation.ok ? quality.sanitized.material_change_summary.text : '',
    material_change_summary_truncated: quality.sanitized.material_change_summary.truncated,
    why_now_truncated: quality.sanitized.why_now.truncated,
    candidate_text_truncated: quality.sanitized.candidate_text.truncated,
    next_move_text: validation.ok ? quality.sanitized.next_move_text.text : '',
    next_move_count: safeMissionCommandOpenAiNumberV31(candidate.next_move_count || 0),
    escalation_chain_id: candidate.escalation_chain_id || '',
    escalated_to: candidate.escalated_to || '',
    chief_context_summary: validation.ok ? normalizeMissionCommandStage34GateC2Text(candidate.chief_context_summary || '') : '',
    executive_decision_required: validation.ok ? normalizeMissionCommandStage34GateC2Text(candidate.executive_decision_required || '') : '',
    companion_chief_candidate_state: candidate.companion_chief_candidate_state || '',
    dedupe_evidence_key: candidate.dedupe_evidence_key || '',
    suppression_evidence_state: candidate.suppression_evidence_state || '',
    confidence: Number(candidate.confidence || 0),
    should_deliver: candidate.should_deliver === true,
    blocked_reason: validation.ok ? '' : (quality.quality_fail_codes[0] || 'quality_blocked'),
    quality_gate_state: quality.quality_gate_state,
    quality_fail_codes: JSON.stringify(quality.quality_fail_codes || []),
    concrete_object_present: quality.concrete_object_present,
    source_labels_valid: quality.source_labels_valid,
    grounding_valid: quality.grounding_valid,
    why_now_specific: quality.why_now_specific,
    material_change_valid: quality.material_change_valid,
    next_move_count_valid: quality.next_move_count_valid,
    role_fidelity_valid: quality.role_fidelity_valid,
    escalation_attribution_valid: quality.escalation_attribution_valid,
    dedupe_evidence_valid: quality.dedupe_evidence_valid,
    protected_wording_valid: quality.protected_wording_valid,
    word_boundary_safe: quality.word_boundary_safe,
    candidate_non_meta: quality.candidate_non_meta,
    privacy_valid: quality.privacy_valid,
    review_ready: validation.ok,
    provider_call_attempted: false,
    fetch_attempt_count: 0,
    fetch_attempt_index: ''
  };
  return { ok: true, status: validation.ok ? 'review_ready' : 'quality_blocked', row: row, validation: validation, candidateHash: candidateHash };
}

function makeMissionCommandStage34GateC2QualityFailureReceipt(runId, batchKey, candidate, validation) {
  candidate = candidate || {};
  validation = validation || { quality: { quality_fail_codes: [] } };
  var summary = {
    schema_version: MC_STAGE34_GATE_C2_SCHEMA_VERSION,
    fixture_id: candidate.fixture_id || '',
    quality_gate_state: 'fail',
    quality_fail_codes: (validation.quality && validation.quality.quality_fail_codes) || [],
    readable_text_stored: false,
    retry_count: 0,
    fallback_used: false,
    provider_call_attempted: false,
    boundary_flags: {
      raw_prompt_stored: false,
      raw_provider_response_stored: false,
      visible_delivery: false,
      dispatch: false,
      external_write: false
    }
  };
  return {
    receipt_id: 'rcp_mc34c2_quality_' + String(batchKey || '').slice(0, 16) + '_' + String(candidate.fixture_id || ''),
    receipt_type: MC_STAGE34_GATE_C2_FAILURE_RECEIPT_TYPE,
    related_object: makeMissionCommandStage34GateB3ARelatedObject(batchKey),
    result: 'quality_blocked',
    safe_summary: JSON.stringify(summary),
    fallback_reason: summary.quality_fail_codes[0] || 'quality_blocked',
    request_id: runId,
    role: candidate.role_owner || '',
    privacy_class: MC_STAGE34_GATE_B1_PRIVACY_CLASS,
    retention_class: MC_STAGE34_GATE_B1_RETENTION_CLASS
  };
}

function aggregateMissionCommandStage34GateC2ProviderAttempts(receipts) {
  receipts = receipts || [];
  var authorizedFixtures = {};
  var seenFixtures = {};
  var totalFetch = 0;
  var fetchSuccesses = 0;
  var httpSuccesses = 0;
  var responseParsed = 0;
  var schemaPasses = 0;
  var qualityPasses = 0;
  var reviewRowsWritten = 0;
  receipts.forEach(function(row) {
    var summary = parseMissionCommandStage34GateB3ASafeSummary(row);
    var fixtureId = String(summary.fixture_id || '');
    if (!fixtureId || seenFixtures[fixtureId]) return;
    seenFixtures[fixtureId] = true;
    if (summary.authorized_fixture_attempt === true) authorizedFixtures[fixtureId] = true;
    var fetchCount = safeMissionCommandOpenAiNumberV31(summary.fetch_attempt_count || 0);
    totalFetch += fetchCount === 1 ? 1 : 0;
    if (summary.fetch_succeeded === true) fetchSuccesses += 1;
    if (summary.http_succeeded === true) httpSuccesses += 1;
    if (summary.response_parsed === true) responseParsed += 1;
    if (summary.schema_valid === true) schemaPasses += 1;
    if (summary.quality_gate_passed === true || summary.quality_gate_state === 'pass') qualityPasses += 1;
    if (summary.review_row_written === true) reviewRowsWritten += 1;
  });
  var exactSet = MC_STAGE34_GATE_B3A_FIXTURE_IDS.every(function(fixtureId) { return seenFixtures[fixtureId] === true; }) &&
    Object.keys(seenFixtures).length === MC_STAGE34_GATE_B3A_FIXTURE_IDS.length;
  return {
    authorized_fixture_count: Object.keys(authorizedFixtures).length,
    provider_fetch_attempts_actual: totalFetch,
    provider_call_attempted: totalFetch > 0,
    provider_fetch_successes: fetchSuccesses,
    provider_fetch_failures: totalFetch - fetchSuccesses,
    http_successes: httpSuccesses,
    response_parsed_count: responseParsed,
    schema_valid_count: schemaPasses,
    quality_gate_passes: qualityPasses,
    review_rows_written: reviewRowsWritten,
    deterministic_child_set_complete: exactSet,
    aggregation_state: exactSet ? 'complete' : 'partial'
  };
}

function makeMissionCommandStage34GateC2FakeChildReceipt(fixtureId, meta) {
  meta = meta || {};
  var summary = {
    schema_version: MC_STAGE34_GATE_C2_SCHEMA_VERSION,
    fixture_id: fixtureId,
    authorized_fixture_attempt: meta.authorized !== false,
    provider_call_attempted: meta.providerCallAttempted === true,
    fetch_attempt_count: safeMissionCommandOpenAiNumberV31(meta.fetchAttemptCount || 0),
    fetch_succeeded: meta.fetchSucceeded === true,
    schema_valid: meta.schemaValid !== false,
    quality_gate_state: meta.qualityGatePassed === false ? 'fail' : 'pass',
    quality_gate_passed: meta.qualityGatePassed !== false,
    review_row_written: meta.reviewRowWritten === true
  };
  return {
    receipt_type: MC_STAGE34_GATE_B3A_RECEIPT_CHILD_TYPE,
    result: summary.quality_gate_passed ? 'hash_logged' : 'quality_blocked',
    safe_summary: JSON.stringify(summary)
  };
}

function verifyMissionCommandStage34GateC2LocalChecks() {
  var flags = getMissionCommandStage34GateC2Flags();
  var callerFlags = getMissionCommandStage34GateC2Flags({ gateC2Enabled: true });
  var schema = getMissionCommandStage34GateC2CandidateSchema();
  var proposedHeaders = getMissionCommandStage34GateC2ProposedReviewHeaders();
  var headerCheck = validateMissionCommandStage34GateC2ProposedHeaders(proposedHeaders);
  var extraHeaderCheck = validateMissionCommandStage34GateC2ProposedHeaders(proposedHeaders.concat(['unexpected_extra']));
  var fixtures = MC_STAGE34_GATE_B3A_FIXTURE_IDS.map(function(fixtureId) {
    var candidate = makeMissionCommandStage34GateC2Candidate(fixtureId);
    var validation = validateMissionCommandStage34GateC2Candidate(candidate);
    var row = makeMissionCommandStage34GateC2ReviewRow(candidate, 'mc_stage34_gate_c2_local', MC_STAGE34_GATE_B3C_BATCH_KEY, '2026-07-12T18:00:00Z');
    return { fixtureId: fixtureId, candidate: candidate, validation: validation, row: row };
  });
  var generic = validateMissionCommandStage34GateC2Candidate(makeMissionCommandStage34GateC2Candidate('MC34-F01', {
    object_label: 'item',
    candidate_text: 'Prepare a concise brief and route the matter for leadership review.'
  }));
  var missingDecision = validateMissionCommandStage34GateC2Candidate(makeMissionCommandStage34GateC2Candidate('MC34-F01', { decision_needed: '' }));
  var proseMaterial = validateMissionCommandStage34GateC2Candidate(makeMissionCommandStage34GateC2Candidate('MC34-F12', { material_change_code: 'the date changed today' }));
  var genericMaterial = validateMissionCommandStage34GateC2Candidate(makeMissionCommandStage34GateC2Candidate('MC34-F12', { material_change_summary: 'material change needs review' }));
  var truncatedMaterialCandidate = makeMissionCommandStage34GateC2Candidate('MC34-F12', { material_change_summary: Array(230).join('A') });
  var truncatedMaterial = validateMissionCommandStage34GateC2Candidate(truncatedMaterialCandidate);
  var multipleMoves = validateMissionCommandStage34GateC2Candidate(makeMissionCommandStage34GateC2Candidate('MC34-F04', { next_move_count: 2, next_move_text: 'Stage Planning and route Build.' }));
  var executionClaim = validateMissionCommandStage34GateC2Candidate(makeMissionCommandStage34GateC2Candidate('MC34-F01', { candidate_text: 'Project Atlas was sent to the client and marked complete.' }));
  var missingEscalation = validateMissionCommandStage34GateC2Candidate(makeMissionCommandStage34GateC2Candidate('MC34-F15', { escalated_from: '', dedupe_evidence_key: '', companion_chief_candidate_state: '' }));
  var qualityBlockedRow = makeMissionCommandStage34GateC2ReviewRow(makeMissionCommandStage34GateC2Candidate('MC34-F01', {
    object_label: 'item',
    candidate_text: 'Prepare a concise brief and route the matter for leadership review.'
  }), 'mc_stage34_gate_c2_local', MC_STAGE34_GATE_B3C_BATCH_KEY, '2026-07-12T18:00:00Z');
  var failureReceipt = makeMissionCommandStage34GateC2QualityFailureReceipt('mc_stage34_gate_c2_local', MC_STAGE34_GATE_B3C_BATCH_KEY, qualityBlockedRow.validation ? qualityBlockedRow.validation.candidate : makeMissionCommandStage34GateC2Candidate('MC34-F01'), generic);
  var retention = makeMissionCommandStage34GateC2RetentionDueAt('2026-07-12T18:00:00Z');
  var retentionValid = validateMissionCommandStage34GateC2Retention('2026-07-12T18:00:00Z', retention.retentionDueAt);
  var retentionInvalid = validateMissionCommandStage34GateC2Retention('2026-07-12T18:00:00Z', '2099-10-08T00:00:00Z');
  var invalidTimestamp = makeMissionCommandStage34GateC2RetentionDueAt('not-a-date');
  var children = [
    makeMissionCommandStage34GateC2FakeChildReceipt('MC34-F01', { providerCallAttempted: true, fetchAttemptCount: 1, fetchSucceeded: true, reviewRowWritten: true }),
    makeMissionCommandStage34GateC2FakeChildReceipt('MC34-F04', { providerCallAttempted: true, fetchAttemptCount: 1, fetchSucceeded: true, reviewRowWritten: true }),
    makeMissionCommandStage34GateC2FakeChildReceipt('MC34-F12', { providerCallAttempted: true, fetchAttemptCount: 1, fetchSucceeded: false, qualityGatePassed: false }),
    makeMissionCommandStage34GateC2FakeChildReceipt('MC34-F15', { providerCallAttempted: false, fetchAttemptCount: 0, qualityGatePassed: false })
  ];
  var aggregation = aggregateMissionCommandStage34GateC2ProviderAttempts(children);
  var noFetchAggregation = aggregateMissionCommandStage34GateC2ProviderAttempts([
    makeMissionCommandStage34GateC2FakeChildReceipt('MC34-F01', { providerCallAttempted: false, fetchAttemptCount: 0, qualityGatePassed: false })
  ]);
  var wordSafe = sanitizeMissionCommandStage34GateC2Text('Alpha beta gamma delta', 15);
  var noBoundary = sanitizeMissionCommandStage34GateC2Text('Supercalifragilistic', 12);
  return {
    ok: flags.gateC2Enabled === false &&
      flags.killSwitchEnabled === true &&
      callerFlags.gateC2Enabled === false &&
      schema.schema_version === MC_STAGE34_GATE_C2_SCHEMA_VERSION &&
      headerCheck.ok === true &&
      extraHeaderCheck.ok === false &&
      fixtures.length === 4 &&
      fixtures.every(function(entry) { return entry.validation.ok === true && entry.row.ok === true && entry.row.row.review_ready === true && entry.row.row.should_deliver === false; }) &&
      generic.ok === false &&
      generic.quality.quality_fail_codes.indexOf('meta_instruction_detected') !== -1 &&
      missingDecision.ok === false &&
      missingDecision.quality.quality_fail_codes.indexOf('missing_decision') !== -1 &&
      proseMaterial.ok === false &&
      proseMaterial.quality.quality_fail_codes.indexOf('invalid_material_change_code') !== -1 &&
      genericMaterial.ok === false &&
      genericMaterial.quality.quality_fail_codes.indexOf('missing_material_change_summary') !== -1 &&
      truncatedMaterial.ok === false &&
      truncatedMaterial.quality.quality_fail_codes.indexOf('unsafe_or_incomplete_truncation') !== -1 &&
      multipleMoves.ok === false &&
      multipleMoves.quality.quality_fail_codes.indexOf('next_move_count_invalid') !== -1 &&
      executionClaim.ok === false &&
      executionClaim.quality.quality_fail_codes.indexOf('execution_claim_detected') !== -1 &&
      missingEscalation.ok === false &&
      missingEscalation.quality.quality_fail_codes.indexOf('escalation_attribution_missing') !== -1 &&
      qualityBlockedRow.ok === true &&
      qualityBlockedRow.row.candidate_text === '' &&
      qualityBlockedRow.row.review_ready === false &&
      failureReceipt.result === 'quality_blocked' &&
      retentionValid.ok === true &&
      retentionValid.seconds === MC_STAGE34_GATE_C2_RETENTION_SECONDS &&
      retentionInvalid.ok === false &&
      invalidTimestamp.ok === false &&
      aggregation.provider_call_attempted === true &&
      aggregation.provider_fetch_attempts_actual === 3 &&
      aggregation.provider_fetch_successes === 2 &&
      aggregation.review_rows_written === 2 &&
      noFetchAggregation.provider_call_attempted === false &&
      wordSafe.truncated === true &&
      wordSafe.wordBoundarySafe === true &&
      noBoundary.wordBoundarySafe === false,
    build: MC_STAGE34_GATE_C2_BUILD,
    schemaVersion: MC_STAGE34_GATE_C2_SCHEMA_VERSION,
    flagsDefaultOff: flags.gateC2Enabled === false && flags.killSwitchEnabled === true,
    callerCannotEnable: callerFlags.gateC2Enabled === false,
    proposedHeaderCount: proposedHeaders.length,
    additiveColumnCount: MC_STAGE34_GATE_C2_ADDITIVE_REVIEW_COLUMNS.length,
    revisedFixturesReady: fixtures.filter(function(entry) { return entry.validation.ok === true; }).length,
    genericMetaBlocked: generic.ok === false,
    missingDecisionBlocked: missingDecision.ok === false,
    proseMaterialBlocked: proseMaterial.ok === false,
    genericMaterialBlocked: genericMaterial.ok === false,
    truncationBlocked: truncatedMaterial.ok === false,
    multipleMovesBlocked: multipleMoves.ok === false,
    executionClaimBlocked: executionClaim.ok === false,
    escalationDedupeBlocked: missingEscalation.ok === false,
    qualityFailureReadableBlank: qualityBlockedRow.row.candidate_text === '',
    retentionSeconds: retentionValid.seconds,
    retentionInvalidBlocked: retentionInvalid.ok === false,
    invalidTimestampBlocked: invalidTimestamp.ok === false,
    parentAggregationFromChildren: aggregation.provider_call_attempted === true && aggregation.provider_fetch_attempts_actual === 3,
    noFetchAggregationFalse: noFetchAggregation.provider_call_attempted === false,
    wordSafeTruncation: wordSafe.truncated === true && wordSafe.wordBoundarySafe === true,
    noBoundaryBlocked: noBoundary.wordBoundarySafe === false,
    liveSheetTouched: false,
    scriptPropertiesAccessed: false,
    providerCallAttempted: false,
    wrapperCreated: false,
    routeCreated: false,
    triggerInstall: false,
    visibleDelivery: false,
    dispatch: false,
    externalWrite: false,
    gateC2BStarted: false
  };
}

// Mission Command Stage 3.4 post-G3 Gate H3 response-completion proof closed state.
// The consumed editor-only wrapper is removed; helpers remain default-off and unrouted.
var MC_STAGE34_GATE_C3_BUILD = 'mmos-20260713-stage3-4-post-g3-gate-h2-response-completion-proof-preparation';
var MC_STAGE34_GATE_C3_ENABLED = false;
var MC_STAGE34_GATE_C3_KILL_SWITCH = true;
var MC_STAGE34_GATE_C3_WRAPPER_NAME = 'runMissionCommandStage34GateH3ApprovedResponseCompletionProofOnce';
var MC_STAGE34_GATE_C3_RUN_ID = 'mc_stage34_gate_h3_20260713_manual_001';
var MC_STAGE34_GATE_C3_BATCH_KEY = 'a5d315f2536bc77adb7edf889c894188e54ddf4cc91fabfb28c3634b69c060b6';
var MC_STAGE34_GATE_C3_RELATED_OBJECT = 'mc34b3:a5d315f2536bc77adb7edf889c894188e54ddf4cc91fabfb28c3634b69c060b6';
var MC_STAGE34_GATE_C3_AUTH_TOKEN = 'stage34_gate_h3_manual_001_wrapper_only_a5d315f2536bc';
var MC_STAGE34_GATE_C4_CONSUMED_WRAPPER_NAME = 'runMissionCommandStage34GateC4ApprovedCandidateV2Once';
var MC_STAGE34_GATE_C4_CONSUMED_RUN_ID = 'mc_stage34_gate_c4_20260712_manual_001';
var MC_STAGE34_GATE_C4_CONSUMED_BATCH_KEY = '23061132685957ff54b0066ed88627eb74d6b6a2d4e109dc75099c7c57beffd6';
var MC_STAGE34_GATE_C4_CONSUMED_AUTH_TOKEN = 'stage34_gate_c4_manual_001_wrapper_only';
var MC_STAGE34_GATE_D3_CONSUMED_WRAPPER_NAME = 'runMissionCommandStage34GateD3ApprovedFreshCandidateV2Once';
var MC_STAGE34_GATE_D3_CONSUMED_RUN_ID = 'mc_stage34_gate_d3_20260712_manual_001';
var MC_STAGE34_GATE_D3_CONSUMED_BATCH_KEY = '449671d23157f8a3d15ba40dd226d5ed157d1d52940bae6994f541d84990cfbb';
var MC_STAGE34_GATE_D3_CONSUMED_AUTH_TOKEN = 'stage34_gate_d3_manual_001_fresh_wrapper_only';
var MC_STAGE34_GATE_E3_CONSUMED_WRAPPER_NAME = 'runMissionCommandStage34GateE3ApprovedFreshCandidateV2Once';
var MC_STAGE34_GATE_E3_CONSUMED_RUN_ID = 'mc_stage34_gate_e3_20260712_manual_001';
var MC_STAGE34_GATE_E3_CONSUMED_BATCH_KEY = '0dfaf4bd8311b1beb70e3c16941c785b7f92944c6cb46bce144e36974969b6d8';
var MC_STAGE34_GATE_E3_CONSUMED_AUTH_TOKEN = 'stage34_gate_e3_manual_001_fresh_wrapper_only';
var MC_STAGE34_GATE_F3_CONSUMED_WRAPPER_NAME = 'runMissionCommandStage34GateF3ApprovedFreshCandidateV2Once';
var MC_STAGE34_GATE_F3_CONSUMED_RUN_ID = 'mc_stage34_gate_f3_20260712_manual_001';
var MC_STAGE34_GATE_F3_CONSUMED_BATCH_KEY = '3b755502280c134ab3c12fd59014f811c4261d3e815f1fb428c956baabc5d8f9';
var MC_STAGE34_GATE_F3_CONSUMED_AUTH_TOKEN = 'stage34_gate_f3_manual_001_16a10bfe14137aae654c51609798e2733fd452c9c2ba02fd7f4fd6aceefbe91b';
var MC_STAGE34_GATE_G3_CONSUMED_WRAPPER_NAME = 'runMissionCommandStage34GateG3ApprovedAccountingProofOnce';
var MC_STAGE34_GATE_G3_CONSUMED_RUN_ID = 'mc_stage34_gate_g3_20260712_manual_001';
var MC_STAGE34_GATE_G3_CONSUMED_BATCH_KEY = '53ad777867939613aab1fe5458e5df3113e7d1b7b8dc5acef27be95306d5c7dc';
var MC_STAGE34_GATE_G3_CONSUMED_AUTH_TOKEN = 'stage34_gate_g3_manual_001_913815f7839c68570c55276417422913b232b4d6225b1f2343c4a80353d5fa6e';
var MC_STAGE34_GATE_C3_MODEL = MC_STAGE34_GATE_B3C_MODEL;
var MC_STAGE34_GATE_C3_MAX_CALLS = 4;
var MC_STAGE34_GATE_C3_TIMEOUT_SECONDS = 30;
var MC_STAGE34_GATE_C3_MAX_INPUT_TOKENS_PER_CALL = 2000;
var MC_STAGE34_GATE_C3_MAX_OUTPUT_TOKENS_PER_CALL = 700;
var MC_STAGE34_GATE_C3_MAX_ESTIMATED_SPEND_USD = 0.20;
var MC_STAGE34_GATE_E1_BUILD = 'mmos-20260712-stage3-4-post-d3-gate-e1-provider-boundary-durability';

function getMissionCommandStage34GateC3Flags(input) {
  input = input || {};
  var wrapperAuthorized = input.wrapperAuthorization === true &&
    input.authorizationToken === MC_STAGE34_GATE_C3_AUTH_TOKEN &&
    input.runId === MC_STAGE34_GATE_C3_RUN_ID &&
    input.batchKey === MC_STAGE34_GATE_C3_BATCH_KEY;
  return {
    gateC3Enabled: MC_STAGE34_GATE_C3_ENABLED === true && MC_STAGE34_GATE_C3_KILL_SWITCH !== true,
    killSwitchEnabled: MC_STAGE34_GATE_C3_KILL_SWITCH === true,
    approvedManualRun: input.approvedManualRun === true,
    wrapperAuthorization: wrapperAuthorized,
    liveSheetEnabled: wrapperAuthorized === true,
    providerEnabled: wrapperAuthorized === true,
    scriptPropertiesEnabled: wrapperAuthorized === true,
    wrapperEnabled: wrapperAuthorized === true,
    routeEnabled: false,
    triggerEnabled: false,
    visibleDeliveryEnabled: false,
    dispatchEnabled: false,
    externalWriteEnabled: false,
    retryEnabled: false,
    fallbackEnabled: false
  };
}

function makeMissionCommandStage34GateC3Blocked(reason, detail, meta) {
  meta = meta || {};
  return {
    ok: false,
    status: meta.status || 'blocked',
    build: MC_STAGE34_GATE_C3_BUILD,
    stopCondition: reason || 'gate_c3_blocked',
    safeDetail: detail || '',
    runId: MC_STAGE34_GATE_C3_RUN_ID,
    batchKey: MC_STAGE34_GATE_C3_BATCH_KEY,
    relatedObject: MC_STAGE34_GATE_C3_RELATED_OBJECT,
    providerCallAttempted: false,
    actualFetchAttempts: safeMissionCommandOpenAiNumberV31(meta.actualFetchAttempts || 0),
    retryCount: 0,
    fallbackUsed: false,
    liveSheetTouched: false,
    scriptPropertiesAccessed: false,
    wrapperInvokedByIntegration: false,
    routeCreated: false,
    triggerInstall: false,
    visibleDelivery: false,
    dispatch: false,
    externalWrite: false
  };
}

function makeMissionCommandStage34GateC3WrapperAuthorization() {
  return {
    approvedManualRun: true,
    wrapperAuthorization: true,
    authorizationToken: MC_STAGE34_GATE_C3_AUTH_TOKEN,
    runId: MC_STAGE34_GATE_C3_RUN_ID,
    batchKey: MC_STAGE34_GATE_C3_BATCH_KEY,
    estimatedCostUsd: MC_STAGE34_GATE_C3_MAX_ESTIMATED_SPEND_USD
  };
}

function validateMissionCommandStage34GateC3Authorization(input) {
  input = input || {};
  if (input.runId !== MC_STAGE34_GATE_C3_RUN_ID) return makeMissionCommandStage34GateC3Blocked('run_id_mismatch', 'Gate H2/H3 run ID must match the locked approval packet.');
  if (input.batchKey !== MC_STAGE34_GATE_C3_BATCH_KEY) return makeMissionCommandStage34GateC3Blocked('batch_key_mismatch', 'Gate H2/H3 batch key must match the locked approval packet.');
  if (makeMissionCommandStage34GateB3ARelatedObject(input.batchKey) !== MC_STAGE34_GATE_C3_RELATED_OBJECT) return makeMissionCommandStage34GateC3Blocked('related_object_mismatch', 'Gate H2/H3 related object must be deterministic.');
  if (Number(input.estimatedCostUsd || 0) > MC_STAGE34_GATE_C3_MAX_ESTIMATED_SPEND_USD) return makeMissionCommandStage34GateC3Blocked('cost_cap_exceeded', 'Estimated cost must stay at or below the approved H2/H3 cap.');
  var flags = getMissionCommandStage34GateC3Flags(input);
  if (flags.gateC3Enabled !== false || flags.killSwitchEnabled !== true) return makeMissionCommandStage34GateC3Blocked('flag_state_invalid', 'Gate C3 helpers must remain default-off with kill switch true.');
  if (input.approvedManualRun !== true || flags.wrapperAuthorization !== true) return makeMissionCommandStage34GateC3Blocked('wrapper_authorization_missing', 'Gate H2/H3 coordinator requires the exact wrapper-only authorization shape.');
  if (flags.routeEnabled || flags.triggerEnabled || flags.visibleDeliveryEnabled || flags.dispatchEnabled || flags.externalWriteEnabled || flags.retryEnabled || flags.fallbackEnabled) {
    return makeMissionCommandStage34GateC3Blocked('unsafe_flag_state', 'Route, trigger, visible delivery, dispatch, external write, retry, and fallback flags must remain false.');
  }
  return { ok: true, status: 'wrapper_authorized', flags: flags };
}

function makeMissionCommandStage34GateC3ParentReceipt(runId, batchKey) {
  var parent = makeMissionCommandStage34GateB3AParentReceipt(runId, batchKey);
  var summary = {
    schema_version: MC_STAGE34_GATE_C2_SCHEMA_VERSION,
    gate: 'c3_candidate_v2_parent',
    run_id: runId,
    fixture_pack_sha256: MC_STAGE34_GATE_B1_FIXTURE_SHA256,
    fixtures_expected: MC_STAGE34_GATE_B3A_FIXTURE_IDS.slice(),
    aggregation_state: 'pending',
    provider_call_attempted: 'unknown_pending_children',
    readable_text_stored: false,
    review_tab: MC_STAGE34_GATE_B3A_REVIEW_TAB_NAME,
    review_sheet_id: MC_STAGE34_GATE_B3C_REVIEW_SHEET_ID,
    model: MC_STAGE34_GATE_C3_MODEL,
    max_calls: MC_STAGE34_GATE_C3_MAX_CALLS,
    retry_count: 0
  };
  parent.source = 'stage_3_4_gate_c3_wrapper_preparation';
  parent.safe_summary = JSON.stringify(summary);
  parent.safety_identifier_hash = missionCommandStage34GateB1Hash(summary);
  parent.updated_by = MC_STAGE34_GATE_C3_BUILD;
  parent.etag = 'etag_' + missionCommandStage34GateB1Hash(summary).slice(0, 24);
  return parent;
}

function claimMissionCommandStage34GateC3Parent(runtimeAdapter, runId, batchKey) {
  if (!runtimeAdapter || !runtimeAdapter.acquireLock) return makeMissionCommandStage34GateC3Blocked('runtime_adapter_missing', 'Runtime adapter missing.');
  if (!runtimeAdapter.acquireLock('stage34_c3_parent_claim')) return makeMissionCommandStage34GateC3Blocked('runtime_lock_unavailable', 'Runtime lock unavailable.');
  try {
    var refresh = refreshMissionCommandStage33RAdapterUnderLock(runtimeAdapter);
    if (!refresh.ok) return makeMissionCommandStage34GateC3Blocked(refresh.stopCondition, 'Runtime receipt headers missing.');
    if (findMissionCommandStage34GateB3AReceiptRows(runtimeAdapter, makeMissionCommandStage34GateB3ARelatedObject(batchKey)).length) {
      return { ok: false, status: 'duplicate_suppressed', providerCallAttempted: false };
    }
    var parent = makeMissionCommandStage34GateC3ParentReceipt(runId, batchKey);
    runtimeAdapter.appendRowObject(parent);
    return { ok: true, status: 'parent_claimed', parent: parent, providerCallAttempted: false };
  } catch (err) {
    return makeMissionCommandStage34GateC3Blocked('parent_claim_failed', 'Parent claim failed before provider work.');
  } finally {
    runtimeAdapter.releaseLock('stage34_c3_parent_claim');
  }
}

function refreshMissionCommandStage34GateC3ReviewAdapterUnderLock(reviewAdapter) {
  if (!reviewAdapter) return { ok: false, stopCondition: 'review_adapter_missing' };
  try {
    if (typeof reviewAdapter.refreshRows === 'function') reviewAdapter.refreshRows();
  } catch (err) {
    return { ok: false, stopCondition: 'review_v2_contract_invalid', refreshError: String((err && err.message) || err || '') };
  }
  var headers = reviewAdapter.headers || [];
  var check = validateMissionCommandStage34GateC2ProposedHeaders(headers);
  if (!check.ok) return { ok: false, stopCondition: 'review_v2_contract_invalid', missing: check.missing || [], expectedCount: check.expectedCount, actualCount: check.actualCount };
  if (reviewAdapter.sheetId && safeMissionCommandOpenAiNumberV31(reviewAdapter.sheetId) !== MC_STAGE34_GATE_B3C_REVIEW_SHEET_ID) {
    return { ok: false, stopCondition: 'review_sheet_id_mismatch' };
  }
  return { ok: true, stopCondition: '' };
}

function preflightMissionCommandStage34GateC3ReviewReservation(reviewAdapter, runId, batchKey, createdAtIso) {
  if (!reviewAdapter || !reviewAdapter.acquireLock) return makeMissionCommandStage34GateC3Blocked('review_adapter_missing', 'Review adapter missing.');
  if (!reviewAdapter.acquireLock('stage34_c3_review_preflight')) return makeMissionCommandStage34GateC3Blocked('review_lock_unavailable', 'Review preflight lock unavailable.');
  try {
    var refresh = refreshMissionCommandStage34GateC3ReviewAdapterUnderLock(reviewAdapter);
    if (!refresh.ok) return makeMissionCommandStage34GateC3Blocked(refresh.stopCondition, 'Review V2 headers missing or mismatched before parent claim.');
    var retention = makeMissionCommandStage34GateC2RetentionDueAt(createdAtIso);
    if (!retention.ok) return makeMissionCommandStage34GateC3Blocked('run_timestamp_invalid', 'Review reservation requires valid run timestamp before parent claim.');
    for (var i = 0; i < MC_STAGE34_GATE_B3A_FIXTURE_IDS.length; i++) {
      var reviewRowId = makeMissionCommandStage34GateB3AReviewRowId(batchKey, MC_STAGE34_GATE_B3A_FIXTURE_IDS[i]);
      if (findMissionCommandStage34GateB3AReviewRow(reviewAdapter, reviewRowId)) return { ok: false, status: 'duplicate_suppressed', providerCallAttempted: false, parentClaimed: false };
    }
    return { ok: true, status: 'review_preflight_passed', providerCallAttempted: false, parentClaimed: false };
  } catch (err) {
    return makeMissionCommandStage34GateC3Blocked('review_preflight_failed', 'Review reservation preflight failed before parent claim.');
  } finally {
    reviewAdapter.releaseLock('stage34_c3_review_preflight');
  }
}

function makeMissionCommandStage34GateC3BlankReviewRow(runId, batchKey, fixtureId, createdAtIso) {
  var base = makeMissionCommandStage34GateB3ABlankReviewRow(runId, batchKey, fixtureId);
  var retention = makeMissionCommandStage34GateC2RetentionDueAt(createdAtIso);
  if (!retention.ok) return null;
  var additions = {};
  getMissionCommandStage34GateC2AdditiveReviewColumns().forEach(function(column) { additions[column] = ''; });
  additions.schema_version = MC_STAGE34_GATE_C2_SCHEMA_VERSION;
  additions.created_at = retention.createdAt;
  additions.retention_due_at = retention.retentionDueAt;
  additions.should_deliver = false;
  additions.quality_gate_state = 'reserved';
  additions.review_ready = false;
  additions.provider_call_attempted = false;
  additions.fetch_attempt_count = 0;
  return Object.assign({}, base, additions, {
    retention_due_at: retention.retentionDueAt,
    batch_state: 'reserved',
    schema_valid: false,
    review_state: 'unreviewed'
  });
}

function reserveMissionCommandStage34GateC3ReviewRows(reviewAdapter, runId, batchKey, createdAtIso) {
  if (!reviewAdapter || !reviewAdapter.acquireLock) return makeMissionCommandStage34GateC3Blocked('review_adapter_missing', 'Review adapter missing.');
  if (!reviewAdapter.acquireLock('stage34_c3_review_reserve')) return makeMissionCommandStage34GateC3Blocked('review_lock_unavailable', 'Review lock unavailable.');
  try {
    var refresh = refreshMissionCommandStage34GateC3ReviewAdapterUnderLock(reviewAdapter);
    if (!refresh.ok) return makeMissionCommandStage34GateC3Blocked(refresh.stopCondition, 'Review V2 headers missing or mismatched.');
    var rows = [];
    for (var i = 0; i < MC_STAGE34_GATE_B3A_FIXTURE_IDS.length; i++) {
      var fixtureId = MC_STAGE34_GATE_B3A_FIXTURE_IDS[i];
      var reviewRowId = makeMissionCommandStage34GateB3AReviewRowId(batchKey, fixtureId);
      if (findMissionCommandStage34GateB3AReviewRow(reviewAdapter, reviewRowId)) return { ok: false, status: 'duplicate_suppressed', providerCallAttempted: false };
      var row = makeMissionCommandStage34GateC3BlankReviewRow(runId, batchKey, fixtureId, createdAtIso);
      if (!row) return makeMissionCommandStage34GateC3Blocked('run_timestamp_invalid', 'Review reservation requires valid run timestamp.');
      reviewAdapter.appendRowObject(row);
      rows.push(row);
    }
    return { ok: true, status: 'v2_rows_reserved', rows: rows, providerCallAttempted: false };
  } catch (err) {
    return makeMissionCommandStage34GateC3Blocked('review_reservation_failed', 'Review reservation failed before provider work.');
  } finally {
    reviewAdapter.releaseLock('stage34_c3_review_reserve');
  }
}

function makeMissionCommandStage34GateC3Request(fixtureId) {
  var candidate = makeMissionCommandStage34GateC2Candidate(fixtureId);
  if (!candidate.fixture_id) return { ok: false, error: 'fixture_not_allowed' };
  var request = {
    model: MC_STAGE34_GATE_C3_MODEL,
    store: false,
    input: [
      {
        role: 'system',
        content: 'Create one Mission Command mc_stage34_candidate_v2 JSON object. Use the supplied synthetic fixture only. Do not include raw provider data, secrets, live source claims, visible delivery, dispatch, or external action claims.'
      },
      {
        role: 'user',
        content: JSON.stringify({
          run_id: MC_STAGE34_GATE_C3_RUN_ID,
          batch_key: MC_STAGE34_GATE_C3_BATCH_KEY,
          fixture_id: fixtureId,
          fixture_pack_sha256: MC_STAGE34_GATE_B1_FIXTURE_SHA256,
          revised_acceptance_fixture: candidate,
          synthetic_only: true
        })
      }
    ],
    reasoning: { effort: 'low' },
    max_output_tokens: MC_STAGE34_GATE_C3_MAX_OUTPUT_TOKENS_PER_CALL,
    tools: [],
    text: {
      format: {
        type: 'json_schema',
        name: 'mission_command_stage34_candidate_v2',
        strict: true,
        schema: getMissionCommandStage34GateC3ProviderCandidateSchema()
      }
    },
    safety_identifier: makeMissionCommandOpenAiSafetyIdentifierV31('a1xx-primary-stage34-c3-' + fixtureId)
  };
  var validation = validateMissionCommandStage34GateC3Request(fixtureId, request);
  return { ok: validation.ok, error: validation.ok ? '' : validation.errors.join('|'), request: request, validation: validation };
}

function buildMissionCommandStage34GateC3Requests() {
  var requests = [];
  var errors = [];
  MC_STAGE34_GATE_B3A_FIXTURE_IDS.forEach(function(fixtureId) {
    var request = makeMissionCommandStage34GateC3Request(fixtureId);
    if (!request.ok) errors.push(fixtureId + ':' + request.error);
    else requests.push({ fixtureId: fixtureId, request: request.request });
  });
  return { ok: errors.length === 0 && requests.length === MC_STAGE34_GATE_B3A_FIXTURE_IDS.length, requests: requests, errors: errors };
}

function validateMissionCommandStage34GateC3ProviderCandidate(fixtureId, candidate) {
  candidate = candidate || {};
  var errors = [];
  if (candidate.fixture_id !== fixtureId) errors.push('fixture_id_mismatch');
  if (candidate.schema_version !== MC_STAGE34_GATE_C2_SCHEMA_VERSION) errors.push('schema_version_invalid');
  var fields = getMissionCommandStage34GateC3ProviderCandidateFields();
  fields.forEach(function(field) {
    if (!Object.prototype.hasOwnProperty.call(candidate, field)) errors.push('candidate_missing_' + field);
  });
  Object.keys(candidate).forEach(function(field) {
    if (fields.indexOf(field) === -1) errors.push('candidate_field_not_allowed_' + field);
  });
  if (MC_STAGE34_GATE_B3A_FIXTURE_IDS.indexOf(candidate.fixture_id) === -1) errors.push('fixture_not_allowed');
  if (candidate.should_deliver !== false) errors.push('should_deliver_must_be_false');
  if (MC_STAGE34_GATE_C2_OBJECT_TYPES.indexOf(candidate.object_type) === -1) errors.push('object_type_invalid');
  if (MC_STAGE34_GATE_C2_MATERIAL_CODES.indexOf(candidate.material_change_code) === -1) errors.push('material_change_code_invalid');
  if (MC_STAGE34_GATE_C2_NEXT_MOVE_TYPES.indexOf(candidate.next_move_type) === -1) errors.push('next_move_type_invalid');
  if (!Array.isArray(candidate.source_labels) || !candidate.source_labels.every(function(label) { return MC_STAGE34_GATE_C2_SOURCE_LABELS.indexOf(label) !== -1; })) errors.push('source_labels_invalid');
  if (errors.length) return { ok: false, reason: errors[0], errors: errors };
  return { ok: true, reason: '', errors: [] };
}

function normalizeMissionCommandStage34GateC3AttemptMeta(meta) {
  meta = meta || {};
  var providerCallAttempted = meta.providerCallAttempted === true;
  var fetchAttemptCount = Object.prototype.hasOwnProperty.call(meta, 'fetchAttemptCount')
    ? safeMissionCommandOpenAiNumberV31(meta.fetchAttemptCount)
    : 0;
  fetchAttemptCount = fetchAttemptCount === 1 ? 1 : 0;
  var fetchAttemptIndex = fetchAttemptCount === 1 ? safeMissionCommandOpenAiNumberV31(meta.fetchAttemptIndex || 0) : 0;
  return {
    authorizedCallCountTotal: safeMissionCommandOpenAiNumberV31(meta.authorizedCallCountTotal || meta.authorizedFixtureAttempts || 0),
    authorizedFixtureAttempt: meta.authorizedFixtureAttempt === false ? false : safeMissionCommandOpenAiNumberV31(meta.authorizedCallCountTotal || meta.authorizedFixtureAttempts || 0) > 0,
    providerCallAttempted: providerCallAttempted,
    fetchAttemptCount: fetchAttemptCount,
    fetchAttemptIndex: fetchAttemptCount === 1 && fetchAttemptIndex > 0 ? fetchAttemptIndex : '',
    fetchSucceeded: meta.fetchSucceeded === true,
    httpSucceeded: meta.httpSucceeded === true,
    responseParsed: meta.responseParsed === true,
    candidateParsed: meta.candidateParsed === true,
    schemaValid: meta.schemaValid === true,
    qualityGatePassed: meta.qualityGatePassed === true,
    reviewRowWritten: meta.reviewRowWritten === true,
    latencyMs: safeMissionCommandOpenAiNumberV31(meta.latencyMs || 0),
    httpStatus: safeMissionCommandOpenAiNumberV31(meta.httpStatus || 0),
    inputTokens: safeMissionCommandOpenAiNumberV31(meta.inputTokens || 0),
    cachedInputTokens: safeMissionCommandOpenAiNumberV31(meta.cachedInputTokens || 0),
    outputTokens: safeMissionCommandOpenAiNumberV31(meta.outputTokens || 0),
    reasoningTokens: safeMissionCommandOpenAiNumberV31(meta.reasoningTokens || 0),
    estimatedCost: Math.max(0, Number(meta.estimatedCost || 0)),
    validationReason: sanitizeMissionCommandOpenAiShadowTextV31(meta.validationReason || '', 120)
  };
}

function validateMissionCommandStage34GateC3AttemptMeta(meta) {
  meta = meta || {};
  var rawFetchAttemptCount = Object.prototype.hasOwnProperty.call(meta, 'fetchAttemptCount')
    ? safeMissionCommandOpenAiNumberV31(meta.fetchAttemptCount)
    : 0;
  var attempt = normalizeMissionCommandStage34GateC3AttemptMeta(meta);
  var errors = [];
  if (rawFetchAttemptCount !== 0 && rawFetchAttemptCount !== 1) errors.push('fetch_attempt_count_not_binary');
  if (attempt.fetchAttemptCount === 0 && (attempt.providerCallAttempted === true || attempt.fetchAttemptIndex !== '' || attempt.fetchSucceeded === true || attempt.httpSucceeded === true)) errors.push('no_fetch_attempt_fields_invalid');
  if (attempt.fetchAttemptCount === 1 && (attempt.providerCallAttempted !== true || !attempt.fetchAttemptIndex)) errors.push('fetch_attempt_missing_attempt_or_index');
  if (attempt.httpSucceeded === true && attempt.fetchSucceeded !== true) errors.push('http_success_without_fetch_success');
  if (attempt.responseParsed === true && attempt.httpSucceeded !== true) errors.push('response_parsed_without_http_success');
  if (attempt.candidateParsed === true && attempt.responseParsed !== true) errors.push('candidate_parsed_without_response_parse');
  if (attempt.schemaValid === true && attempt.responseParsed !== true) errors.push('schema_valid_without_response_parse');
  if (attempt.schemaValid === true && attempt.candidateParsed !== true) errors.push('schema_valid_without_candidate_parse');
  if (attempt.qualityGatePassed === true && attempt.schemaValid !== true) errors.push('quality_pass_without_schema_valid');
  return { ok: errors.length === 0, attempt: attempt, errors: errors };
}

function classifyMissionCommandStage34GateH1IncompleteReason(reason) {
  reason = String(reason || '').toLowerCase();
  if (reason === 'max_output_tokens' || reason === 'max_tokens') return 'provider_response_incomplete_max_output_tokens';
  if (reason === 'content_filter') return 'provider_response_incomplete_content_filter';
  return 'provider_response_incomplete_other';
}

function extractMissionCommandStage34GateH1ResponseOutput(providerResponse) {
  providerResponse = providerResponse || {};
  if (providerResponse.status === 'incomplete') {
    return { ok: false, status: classifyMissionCommandStage34GateH1IncompleteReason(providerResponse.incomplete_details && providerResponse.incomplete_details.reason), outputText: '', refusal: false };
  }
  if (providerResponse.status === 'failed') {
    return { ok: false, status: 'provider_response_failed', outputText: '', refusal: false };
  }
  if (providerResponse.status && providerResponse.status !== 'completed') {
    return { ok: false, status: 'provider_response_incomplete_other', outputText: '', refusal: false };
  }
  if (typeof providerResponse.refusal === 'string' && providerResponse.refusal) {
    return { ok: false, status: 'provider_refusal', outputText: '', refusal: true };
  }
  if (Array.isArray(providerResponse.output)) {
    for (var i = 0; i < providerResponse.output.length; i++) {
      var item = providerResponse.output[i] || {};
      if (item.status === 'incomplete') {
        return { ok: false, status: classifyMissionCommandStage34GateH1IncompleteReason(item.incomplete_details && item.incomplete_details.reason), outputText: '', refusal: false };
      }
      if (item.status === 'failed') return { ok: false, status: 'provider_response_failed', outputText: '', refusal: false };
      if (item.type === 'refusal' || (typeof item.refusal === 'string' && item.refusal)) {
        return { ok: false, status: 'provider_refusal', outputText: '', refusal: true };
      }
      if (Array.isArray(item.content)) {
        for (var j = 0; j < item.content.length; j++) {
          var content = item.content[j] || {};
          if (content.type === 'refusal' || (typeof content.refusal === 'string' && content.refusal)) {
            return { ok: false, status: 'provider_refusal', outputText: '', refusal: true };
          }
        }
      }
    }
  }
  var outputs = [];
  if (typeof providerResponse.output_text === 'string' && providerResponse.output_text.trim()) {
    outputs.push(providerResponse.output_text);
  } else if (Array.isArray(providerResponse.output)) {
    providerResponse.output.forEach(function(item) {
      if (item && Array.isArray(item.content)) {
        item.content.forEach(function(content) {
          if (content && typeof content.text === 'string' && content.text.trim()) outputs.push(content.text);
        });
      }
    });
  }
  if (outputs.length !== 1) return { ok: false, status: 'provider_output_missing', outputText: '', refusal: false, outputCount: outputs.length };
  return { ok: true, status: 'provider_output_ready', outputText: outputs[0], refusal: false, outputCount: 1 };
}

function makeMissionCommandStage34GateC3ProviderResultFromEnvelope(fixtureId, providerResponse, meta) {
  meta = meta || {};
  var usage = getMissionCommandStage34GateB3CUsage(providerResponse || {});
  var baseAttempt = Object.assign({}, meta, {
    responseParsed: true,
    inputTokens: usage.inputTokens,
    cachedInputTokens: usage.cachedInputTokens,
    outputTokens: usage.outputTokens,
    reasoningTokens: usage.reasoningTokens,
    estimatedCost: usage.estimatedCost
  });
  var output = extractMissionCommandStage34GateH1ResponseOutput(providerResponse || {});
  if (!output.ok) {
    return {
      ok: false,
      status: output.status,
      candidate: null,
      meta: Object.assign({}, normalizeMissionCommandStage34GateC3AttemptMeta(Object.assign({}, baseAttempt, {
        candidateParsed: false,
        schemaValid: false,
        qualityGatePassed: false,
        validationReason: output.status
      })), { outputCount: safeMissionCommandOpenAiNumberV31(output.outputCount || 0) })
    };
  }
  var candidate = null;
  try {
    candidate = JSON.parse(output.outputText);
  } catch (err) {
    return {
      ok: false,
      status: 'provider_candidate_json_invalid',
      candidate: null,
      meta: Object.assign({}, normalizeMissionCommandStage34GateC3AttemptMeta(Object.assign({}, baseAttempt, {
        candidateParsed: false,
        schemaValid: false,
        qualityGatePassed: false,
        validationReason: 'provider_candidate_json_invalid'
      })), { outputCount: 1 })
    };
  }
  var validation = validateMissionCommandStage34GateC3ProviderCandidate(fixtureId, candidate);
  var schemaFailureStatus = validation.ok ? '' : (validation.reason === 'fixture_id_mismatch' || validation.reason === 'fixture_not_allowed' ? 'provider_fixture_mismatch' : 'provider_candidate_schema_invalid');
  var attempt = normalizeMissionCommandStage34GateC3AttemptMeta(Object.assign({}, baseAttempt, {
    candidateParsed: true,
    schemaValid: validation.ok,
    qualityGatePassed: validation.ok,
    validationReason: validation.reason || ''
  }));
  return {
    ok: validation.ok,
    status: validation.ok ? 'provider_candidate_valid' : schemaFailureStatus,
    candidate: validation.ok ? candidate : null,
    meta: Object.assign({}, attempt, {
      candidateParsed: validation.ok || candidate !== null,
      schemaValid: validation.ok,
      qualityGatePassed: validation.ok,
      inputTokens: usage.inputTokens,
      cachedInputTokens: usage.cachedInputTokens,
      outputTokens: usage.outputTokens,
      reasoningTokens: usage.reasoningTokens,
      estimatedCost: usage.estimatedCost,
      validationReason: validation.reason || '',
      outputCount: 1
    })
  };
}

function makeMissionCommandStage34GateC3ChildReceipt(runId, batchKey, fixtureId, candidateHash, reviewRowId, meta) {
  meta = meta || {};
  var attempt = normalizeMissionCommandStage34GateC3AttemptMeta(meta);
  var row = makeMissionCommandStage34GateB3AChildReceipt(runId, batchKey, fixtureId, candidateHash, reviewRowId);
  var failureClass = sanitizeMissionCommandOpenAiShadowTextV31(meta.failureClass || '', 80);
  var safeStatus = sanitizeMissionCommandOpenAiShadowTextV31(meta.safeStatus || meta.failureCode || '', 80);
  var summary = {
    schema_version: MC_STAGE34_GATE_C2_SCHEMA_VERSION,
    gate: 'c3_candidate_v2_hash_child',
    fixture_id: fixtureId,
    candidate_sha256: candidateHash,
    review_row_id: reviewRowId,
    authorized_fixture_attempt: attempt.authorizedFixtureAttempt === true,
    authorized_call_count_total: attempt.authorizedCallCountTotal,
    provider_call_attempted: attempt.providerCallAttempted === true,
    fetch_attempt_count: attempt.fetchAttemptCount,
    fetch_attempts: attempt.fetchAttemptCount,
    fetch_attempt_index: attempt.fetchAttemptIndex,
    fetch_succeeded: attempt.fetchSucceeded === true,
    http_succeeded: attempt.httpSucceeded === true,
    response_parsed: attempt.responseParsed === true,
    candidate_parsed: attempt.candidateParsed === true,
    schema_valid: attempt.schemaValid === true,
    quality_gate_passed: attempt.qualityGatePassed === true,
    failure_class: failureClass,
    safe_status: safeStatus,
    http_status: attempt.httpStatus,
    review_row_written: attempt.reviewRowWritten === true,
    readable_text_stored: false,
    retry_count: 0,
    fallback_used: false
  };
  row.source = 'stage_3_4_gate_c3_wrapper_preparation';
  row.result = failureClass ? 'provider_boundary_failed' : (meta.qualityGatePassed === true ? 'hash_logged' : 'quality_blocked');
  row.safe_summary = JSON.stringify(summary);
  row.provider_key = attempt.providerCallAttempted === true ? 'openai' : '';
  row.model_key = attempt.providerCallAttempted === true ? MC_STAGE34_GATE_C3_MODEL : '';
  row.latency_ms = attempt.latencyMs;
  row.input_tokens = attempt.inputTokens;
  row.output_tokens = attempt.outputTokens;
  row.reasoning_tokens = attempt.reasoningTokens;
  row.estimated_cost = attempt.estimatedCost;
  row.fallback_reason = meta.qualityGatePassed === true ? '' : (failureClass || meta.failureCode || 'quality_blocked');
  row.safety_identifier_hash = missionCommandStage34GateB1Hash(summary);
  row.updated_by = failureClass ? MC_STAGE34_GATE_E1_BUILD : MC_STAGE34_GATE_C3_BUILD;
  row.etag = 'etag_' + missionCommandStage34GateB1Hash(summary).slice(0, 24);
  return row;
}

function appendMissionCommandStage34GateC3HashChild(runtimeAdapter, runId, batchKey, fixtureId, candidateHash, reviewRowId, meta) {
  if (!runtimeAdapter.acquireLock('stage34_c3_hash_child_' + fixtureId)) return makeMissionCommandStage34GateC3Blocked('runtime_lock_unavailable', 'Hash child lock unavailable.');
  try {
    var refresh = refreshMissionCommandStage33RAdapterUnderLock(runtimeAdapter);
    if (!refresh.ok) return makeMissionCommandStage34GateC3Blocked(refresh.stopCondition, 'Runtime receipt headers missing.');
    var existing = findMissionCommandStage34GateB3AChildReceipt(runtimeAdapter, batchKey, fixtureId);
    if (existing) return { ok: false, status: 'duplicate_suppressed', row: existing.row, providerCallAttempted: false };
    var attemptCheck = validateMissionCommandStage34GateC3AttemptMeta(meta || {});
    if (!attemptCheck.ok) return makeMissionCommandStage34GateC3Blocked('attempt_meta_invalid', 'Attempt accounting metadata failed local invariant checks.');
    var row = makeMissionCommandStage34GateC3ChildReceipt(runId, batchKey, fixtureId, candidateHash, reviewRowId, meta);
    runtimeAdapter.appendRowObject(row);
    return { ok: true, status: row.result === 'hash_logged' ? 'hash_child_logged' : 'quality_child_logged', row: row, providerCallAttempted: meta && meta.providerCallAttempted === true };
  } catch (err) {
    return makeMissionCommandStage34GateC3Blocked('hash_child_failed', 'Hash-only child receipt failed before readable candidate text.');
  } finally {
    runtimeAdapter.releaseLock('stage34_c3_hash_child_' + fixtureId);
  }
}

function classifyMissionCommandStage34GateC3ProviderFailure(status, meta) {
  meta = meta || {};
  var attempt = normalizeMissionCommandStage34GateC3AttemptMeta(meta);
  var safeStatus = sanitizeMissionCommandOpenAiShadowTextV31(status || 'provider_candidate_failed', 80);
  var httpStatus = attempt.httpStatus;
  var failureClass = 'provider_boundary_failed';
  if (safeStatus === 'credential_unavailable') failureClass = 'credential_unavailable';
  else if (safeStatus === 'credential_access_failed') failureClass = 'credential_access_failed';
  else if (safeStatus === 'provider_fetch_failed') failureClass = 'provider_fetch_failed';
  else if (safeStatus === 'model_unavailable' || /^provider_http_/.test(safeStatus)) failureClass = 'provider_http_or_model_failed';
  else if (safeStatus === 'provider_response_parse_failed') failureClass = 'provider_response_parse_failed';
  else if (safeStatus.indexOf('provider_response_incomplete_') === 0) failureClass = safeStatus;
  else if (safeStatus === 'provider_response_failed') failureClass = 'provider_response_failed';
  else if (safeStatus === 'provider_refusal') failureClass = 'provider_refusal';
  else if (safeStatus === 'provider_output_missing') failureClass = 'provider_output_missing';
  else if (safeStatus === 'provider_candidate_json_invalid') failureClass = 'provider_candidate_json_invalid';
  else if (safeStatus === 'provider_candidate_schema_invalid' || safeStatus === 'provider_schema_invalid' || safeStatus === 'candidate_text_too_short') failureClass = 'provider_candidate_schema_invalid';
  else if (safeStatus === 'provider_fixture_mismatch' || safeStatus === 'fixture_not_allowed' || safeStatus === 'fixture_id_mismatch') failureClass = 'provider_fixture_mismatch';
  else if (safeStatus === 'quality_blocked' || safeStatus === 'quality_gate_failed') failureClass = 'quality_gate_failed';
  return {
    failureClass: failureClass,
    safeStatus: safeStatus,
    providerCallAttempted: attempt.providerCallAttempted,
    authorizedCallCountTotal: attempt.authorizedCallCountTotal,
    authorizedFixtureAttempt: attempt.authorizedFixtureAttempt,
    fetchAttemptCount: attempt.fetchAttemptCount,
    fetchAttemptIndex: attempt.fetchAttemptIndex,
    fetchSucceeded: attempt.fetchSucceeded,
    httpSucceeded: attempt.httpSucceeded,
    responseParsed: attempt.responseParsed,
    candidateParsed: attempt.candidateParsed,
    schemaValid: attempt.schemaValid,
    qualityGatePassed: attempt.qualityGatePassed,
    reviewRowWritten: attempt.reviewRowWritten,
    httpStatus: httpStatus,
    latencyMs: attempt.latencyMs,
    inputTokens: attempt.inputTokens,
    cachedInputTokens: attempt.cachedInputTokens,
    outputTokens: attempt.outputTokens,
    reasoningTokens: attempt.reasoningTokens,
    estimatedCost: attempt.estimatedCost
  };
}

function makeMissionCommandStage34GateC3FailureHash(fixtureId, status, meta) {
  var failure = classifyMissionCommandStage34GateC3ProviderFailure(status, meta);
  return missionCommandStage34GateB1Hash({
    schema_version: MC_STAGE34_GATE_C2_SCHEMA_VERSION,
    fixture_id: fixtureId,
    failure_class: failure.failureClass,
    safe_status: failure.safeStatus,
    provider_call_attempted: failure.providerCallAttempted,
    fetch_attempt_count: failure.fetchAttemptCount,
    fetch_attempt_index: failure.fetchAttemptIndex,
    fetch_succeeded: failure.fetchSucceeded,
    http_succeeded: failure.httpSucceeded,
    response_parsed: failure.responseParsed,
    candidate_parsed: failure.candidateParsed,
    schema_valid: failure.schemaValid,
    quality_gate_passed: failure.qualityGatePassed,
    http_status: failure.httpStatus,
    retry_count: 0,
    fallback_used: false,
    readable_text_stored: false
  });
}

function appendMissionCommandStage34GateC3FailureChild(runtimeAdapter, runId, batchKey, fixtureId, status, meta) {
  meta = meta || {};
  var relatedObject = makeMissionCommandStage34GateB3ARelatedObject(batchKey);
  var parentRows = findMissionCommandStage34GateB3AReceiptRows(runtimeAdapter, relatedObject).filter(function(entry) {
    return entry.row.receipt_type === MC_STAGE34_GATE_B3A_RECEIPT_PARENT_TYPE;
  });
  if (parentRows.length !== 1) return makeMissionCommandStage34GateC3Blocked('parent_missing', 'Failure child requires an existing parent receipt draft.');
  var reviewRowId = makeMissionCommandStage34GateB3AReviewRowId(batchKey, fixtureId);
  var failure = classifyMissionCommandStage34GateC3ProviderFailure(status, meta);
  var failureHash = makeMissionCommandStage34GateC3FailureHash(fixtureId, status, failure);
  var child = appendMissionCommandStage34GateC3HashChild(runtimeAdapter, runId, batchKey, fixtureId, failureHash, reviewRowId, Object.assign({}, failure, {
    failureCode: failure.failureClass
  }));
  if (child.ok && child.row) child.row.updated_by = MC_STAGE34_GATE_E1_BUILD;
  return Object.assign({}, child, {
    failureClass: failure.failureClass,
    safeStatus: failure.safeStatus,
    candidateHash: failureHash,
    reviewRowId: reviewRowId
  });
}

function updateMissionCommandStage34GateC3FailureReviewRow(reviewAdapter, runId, batchKey, fixtureId, childReceiptId, failureHash, status, meta) {
  meta = meta || {};
  var failure = classifyMissionCommandStage34GateC3ProviderFailure(status, meta);
  var reviewRowId = makeMissionCommandStage34GateB3AReviewRowId(batchKey, fixtureId);
  if (!reviewAdapter.acquireLock('stage34_c3_failure_review_' + fixtureId)) return makeMissionCommandStage34GateC3Blocked('review_lock_unavailable', 'Failure review-row lock unavailable.');
  try {
    var refresh = refreshMissionCommandStage34GateC3ReviewAdapterUnderLock(reviewAdapter);
    if (!refresh.ok) return makeMissionCommandStage34GateC3Blocked(refresh.stopCondition, 'Review V2 headers missing or mismatched.');
    var found = findMissionCommandStage34GateB3AReviewRow(reviewAdapter, reviewRowId);
    if (!found) return makeMissionCommandStage34GateC3Blocked('review_reservation_missing', 'Failure status requires a reserved review row.');
    if (String(found.row.receipt_child_id || '') || String(found.row.quality_gate_state || '') !== 'reserved') {
      return { ok: false, status: 'duplicate_suppressed', row: found.row, providerCallAttempted: false };
    }
    var persistedHash = makeMissionCommandStage34GateB3CReviewSnapshotHash(found.row, reviewAdapter.headers);
    var updated = Object.assign({}, found.row, {
      receipt_child_id: childReceiptId || '',
      candidate_sha256: failureHash || '',
      why_now: '',
      material_change: '',
      next_move_type: '',
      candidate_text: '',
      object_type: '',
      object_label: '',
      source_labels: '',
      grounding_state: '',
      grounding_evidence: '',
      material_change_code: '',
      material_change_summary: '',
      next_move_text: '',
      chief_context_summary: '',
      executive_decision_required: '',
      schema_valid: false,
      review_ready: false,
      should_deliver: false,
      batch_state: 'provider_boundary_failed',
      review_state: 'provider_boundary_failed',
      quality_gate_state: failure.failureClass,
      quality_fail_codes: JSON.stringify([failure.failureClass]),
      blocked_reason: failure.safeStatus,
      provider_call_attempted: failure.providerCallAttempted,
      fetch_attempt_count: failure.fetchAttemptCount,
      fetch_attempt_index: failure.fetchAttemptIndex,
      boundary_flags: JSON.stringify({ raw_prompt_stored: false, raw_provider_response_stored: false, visible_delivery: false, dispatch: false, external_write: false, route_created: false })
    });
    reviewAdapter.updateRowObject(found.index, updated, { persistedHash: persistedHash });
    return { ok: true, status: 'failure_review_row_marked', row: updated, providerCallAttempted: failure.providerCallAttempted };
  } catch (err) {
    return makeMissionCommandStage34GateC3Blocked('failure_review_update_failed', 'Failure review row update failed; readable candidate text was not written.');
  } finally {
    reviewAdapter.releaseLock('stage34_c3_failure_review_' + fixtureId);
  }
}

function recordMissionCommandStage34GateC3FailureEvidence(runtimeAdapter, reviewAdapter, runId, batchKey, fixtureId, status, meta) {
  meta = meta || {};
  var failure = classifyMissionCommandStage34GateC3ProviderFailure(status, meta);
  var child = appendMissionCommandStage34GateC3FailureChild(runtimeAdapter, runId, batchKey, fixtureId, failure.safeStatus, failure);
  if (!child.ok && child.status !== 'duplicate_suppressed') {
    return Object.assign({}, child, { failureClass: failure.failureClass, failureEvidenceWritten: false });
  }
  var childRow = child.row || {};
  var review = updateMissionCommandStage34GateC3FailureReviewRow(reviewAdapter, runId, batchKey, fixtureId, childRow.receipt_id || '', child.candidateHash || '', failure.safeStatus, failure);
  var relatedRows = findMissionCommandStage34GateB3AReceiptRows(runtimeAdapter, makeMissionCommandStage34GateB3ARelatedObject(batchKey));
  var childRows = relatedRows.filter(function(entry) { return entry.row.receipt_type === MC_STAGE34_GATE_B3A_RECEIPT_CHILD_TYPE; }).map(function(entry) { return entry.row; });
  return {
    ok: review.ok === true || review.status === 'duplicate_suppressed',
    status: review.ok === true ? 'failure_evidence_recorded' : (review.status || 'failure_evidence_interrupted'),
    failureClass: failure.failureClass,
    safeStatus: failure.safeStatus,
    childStatus: child.status || '',
    reviewStatus: review.status || '',
    failureEvidenceWritten: child.ok === true,
    duplicateSuppressed: child.status === 'duplicate_suppressed' || review.status === 'duplicate_suppressed',
    child: child.row || null,
    reviewRow: review.row || null,
    aggregation: aggregateMissionCommandStage34GateC2ProviderAttempts(childRows),
    providerCallAttempted: failure.providerCallAttempted,
    actualFetchAttempts: failure.fetchAttemptCount
  };
}

function updateMissionCommandStage34GateC3ReviewRow(reviewAdapter, runId, batchKey, candidate, candidateHash, childReceiptId, meta) {
  var fixtureId = candidate.fixture_id;
  var reviewRowId = makeMissionCommandStage34GateB3AReviewRowId(batchKey, fixtureId);
  if (!reviewAdapter.acquireLock('stage34_c3_readable_' + fixtureId)) return makeMissionCommandStage34GateC3Blocked('review_lock_unavailable', 'Readable row lock unavailable.');
  try {
    var refresh = refreshMissionCommandStage34GateC3ReviewAdapterUnderLock(reviewAdapter);
    if (!refresh.ok) return makeMissionCommandStage34GateC3Blocked(refresh.stopCondition, 'Review V2 headers missing or mismatched.');
    var found = findMissionCommandStage34GateB3AReviewRow(reviewAdapter, reviewRowId);
    if (!found) return makeMissionCommandStage34GateC3Blocked('review_reservation_missing', 'Readable row reservation missing.');
    if (String(found.row.candidate_text || '') || String(found.row.candidate_sha256 || '')) return { ok: false, status: 'duplicate_suppressed', row: found.row, providerCallAttempted: false };
    var c2Row = makeMissionCommandStage34GateC2ReviewRow(candidate, runId, batchKey, found.row.created_at || new Date().toISOString());
    if (!c2Row.ok || c2Row.row.review_ready !== true) return makeMissionCommandStage34GateC3Blocked('quality_gate_failed', 'Readable row write requires review-ready V2 candidate.');
    var persistedHash = makeMissionCommandStage34GateB3CReviewSnapshotHash(found.row, reviewAdapter.headers);
    var updated = Object.assign({}, found.row, c2Row.row, {
      receipt_child_id: childReceiptId,
      candidate_sha256: candidateHash,
      provider_call_attempted: meta.providerCallAttempted === true,
      fetch_attempt_count: normalizeMissionCommandStage34GateC3AttemptMeta(meta).fetchAttemptCount,
      fetch_attempt_index: meta.fetchAttemptIndex || '',
      batch_state: 'partial'
    });
    reviewAdapter.updateRowObject(found.index, updated, { persistedHash: persistedHash });
    return { ok: true, status: 'readable_candidate_written', row: updated, providerCallAttempted: meta.providerCallAttempted === true };
  } catch (err) {
    return makeMissionCommandStage34GateC3Blocked('review_write_failed', 'Readable candidate write failed after hash-only child.');
  } finally {
    reviewAdapter.releaseLock('stage34_c3_readable_' + fixtureId);
  }
}

function addMissionCommandStage34GateC3ProviderCandidate(runtimeAdapter, reviewAdapter, runId, batchKey, candidate, meta) {
  var validation = validateMissionCommandStage34GateC2Candidate(candidate);
  var reviewRowId = makeMissionCommandStage34GateB3AReviewRowId(batchKey, candidate.fixture_id);
  if (!validation.ok) {
    var failure = makeMissionCommandStage34GateC2QualityFailureReceipt(runId, batchKey, candidate, validation);
    var failureMeta = Object.assign({}, meta || {}, {
      failureClass: 'quality_gate_failed',
      safeStatus: 'quality_gate_failed',
      schemaValid: validation.quality.schema_valid === true,
      qualityGatePassed: false,
      failureCode: (validation.quality.quality_fail_codes || [])[0] || 'quality_blocked'
    });
    var failureChild = appendMissionCommandStage34GateC3HashChild(runtimeAdapter, runId, batchKey, candidate.fixture_id, missionCommandStage34GateB1Hash(failure.safe_summary), reviewRowId, failureMeta);
    var failureHash = failureChild.candidateHash || missionCommandStage34GateB1Hash(failure.safe_summary);
    var reviewFailure = updateMissionCommandStage34GateC3FailureReviewRow(reviewAdapter, runId, batchKey, candidate.fixture_id, (failureChild.row || {}).receipt_id || '', failureHash, 'quality_blocked', failureMeta);
    return { ok: false, status: 'quality_blocked', failureReceipt: failure, child: failureChild, reviewFailure: reviewFailure, providerCallAttempted: meta && meta.providerCallAttempted === true, actualFetchAttempts: normalizeMissionCommandStage34GateC3AttemptMeta(meta).fetchAttemptCount };
  }
  var candidateHash = makeMissionCommandStage34GateB3ACandidateHash(candidate);
  var child = appendMissionCommandStage34GateC3HashChild(runtimeAdapter, runId, batchKey, candidate.fixture_id, candidateHash, reviewRowId, Object.assign({}, meta || {}, {
    schemaValid: true,
    qualityGatePassed: true,
    reviewRowWritten: false
  }));
  if (!child.ok) return child;
  var readable = updateMissionCommandStage34GateC3ReviewRow(reviewAdapter, runId, batchKey, candidate, candidateHash, child.row.receipt_id, Object.assign({}, meta || {}, {
    reviewRowWritten: true
  }));
  return readable.ok ? { ok: true, status: 'candidate_v2_written', child: child.row, reviewRow: readable.row, providerCallAttempted: meta && meta.providerCallAttempted === true } : readable;
}

function finalizeMissionCommandStage34GateC3Batch(runtimeAdapter, reviewAdapter, runId, batchKey) {
  if (!runtimeAdapter.acquireLock('stage34_c3_finalize_runtime')) return makeMissionCommandStage34GateC3Blocked('runtime_lock_unavailable', 'Finalize runtime lock unavailable.');
  if (!reviewAdapter.acquireLock('stage34_c3_finalize_review')) {
    runtimeAdapter.releaseLock('stage34_c3_finalize_runtime');
    return makeMissionCommandStage34GateC3Blocked('review_lock_unavailable', 'Finalize review lock unavailable.');
  }
  try {
    var runtimeRefresh = refreshMissionCommandStage33RAdapterUnderLock(runtimeAdapter);
    if (!runtimeRefresh.ok) return makeMissionCommandStage34GateC3Blocked(runtimeRefresh.stopCondition, 'Runtime receipt headers missing.');
    var reviewRefresh = refreshMissionCommandStage34GateC3ReviewAdapterUnderLock(reviewAdapter);
    if (!reviewRefresh.ok) return makeMissionCommandStage34GateC3Blocked(reviewRefresh.stopCondition, 'Review V2 headers missing or mismatched.');
    var relatedObject = makeMissionCommandStage34GateB3ARelatedObject(batchKey);
    var receiptRows = findMissionCommandStage34GateB3AReceiptRows(runtimeAdapter, relatedObject);
    var parentRows = receiptRows.filter(function(entry) { return entry.row.receipt_type === MC_STAGE34_GATE_B3A_RECEIPT_PARENT_TYPE; });
    var childRows = receiptRows.filter(function(entry) { return entry.row.receipt_type === MC_STAGE34_GATE_B3A_RECEIPT_CHILD_TYPE; });
    var reviewRows = findMissionCommandStage34GateB3AReviewRows(reviewAdapter, batchKey);
    var completeReviewRows = reviewRows.filter(function(entry) { return entry.row.review_ready === true && String(entry.row.candidate_text || '') !== ''; });
    var expectedCount = MC_STAGE34_GATE_B3A_FIXTURE_IDS.length;
    if (parentRows.length !== 1 || childRows.length !== expectedCount || reviewRows.length !== expectedCount || completeReviewRows.length !== expectedCount) return makeMissionCommandStage34GateC3Blocked('exact_fixture_set_required', 'Finalization requires one parent and the exact authorized child/review set.');
    var childReceiptRows = childRows.map(function(entry) { return entry.row; });
    var aggregation = aggregateMissionCommandStage34GateC2ProviderAttempts(childReceiptRows);
    for (var i = 0; i < MC_STAGE34_GATE_B3A_FIXTURE_IDS.length; i++) {
      var fixtureId = MC_STAGE34_GATE_B3A_FIXTURE_IDS[i];
      var reviewRowId = makeMissionCommandStage34GateB3AReviewRowId(batchKey, fixtureId);
      var reviewRow = findMissionCommandStage34GateB3AReviewRow(reviewAdapter, reviewRowId);
      var child = findMissionCommandStage34GateB3AChildReceipt(runtimeAdapter, batchKey, fixtureId);
      if (!reviewRow || !child) return makeMissionCommandStage34GateC3Blocked('deterministic_set_missing', 'Exact deterministic child/review set required.');
      var summary = parseMissionCommandStage34GateB3ASafeSummary(child.row);
      if (summary.fixture_id !== fixtureId || summary.candidate_sha256 !== reviewRow.row.candidate_sha256 || summary.review_row_id !== reviewRowId || reviewRow.row.receipt_child_id !== child.row.receipt_id) {
        return makeMissionCommandStage34GateC3Blocked('hash_link_invalid', 'Child receipt and readable review row linkage must match.');
      }
    }
    var parentEntry = parentRows[0];
    var parentSummary = parseMissionCommandStage34GateB3ASafeSummary(parentEntry.row);
    parentSummary.aggregation_state = 'complete';
    parentSummary.provider_call_attempted = aggregation.provider_call_attempted;
    parentSummary.provider_fetch_attempts_actual = aggregation.provider_fetch_attempts_actual;
    parentSummary.provider_fetch_successes = aggregation.provider_fetch_successes;
    parentSummary.provider_fetch_failures = aggregation.provider_fetch_failures;
    parentSummary.http_successes = aggregation.http_successes;
    parentSummary.response_parsed_count = aggregation.response_parsed_count;
    parentSummary.schema_valid_count = aggregation.schema_valid_count;
    parentSummary.quality_gate_passes = aggregation.quality_gate_passes;
    parentSummary.review_rows_written = completeReviewRows.length;
    parentSummary.deterministic_child_set_complete = aggregation.deterministic_child_set_complete === true;
    var updatedParent = Object.assign({}, parentEntry.row, {
      result: 'logged',
      safe_summary: JSON.stringify(parentSummary),
      version: safeMissionCommandOpenAiNumberV31(parentEntry.row.version) + 1,
      etag: 'etag_' + missionCommandStage34GateB1Hash(parentEntry.row.receipt_id + ':c3_logged:' + batchKey).slice(0, 24),
      updated_by: MC_STAGE34_GATE_C3_BUILD,
      last_request_id: runId
    });
    runtimeAdapter.updateRowObject(parentEntry.index, updatedParent, { version: parentEntry.row.version, etag: parentEntry.row.etag });
    for (var j = 0; j < reviewRows.length; j++) {
      var reviewEntry = reviewRows[j];
      var updatedReview = Object.assign({}, reviewEntry.row, { batch_state: 'review_ready' });
      reviewAdapter.updateRowObject(reviewEntry.index, updatedReview, { persistedHash: makeMissionCommandStage34GateB3CReviewSnapshotHash(reviewEntry.row, reviewAdapter.headers) });
    }
    return { ok: true, status: 'ready_for_review', parentResult: 'logged', childrenWritten: childRows.length, reviewRowsComplete: completeReviewRows.length, aggregation: aggregation };
  } catch (err) {
    return makeMissionCommandStage34GateC3Blocked('finalize_failed', 'Finalization failed closed.');
  } finally {
    reviewAdapter.releaseLock('stage34_c3_finalize_review');
    runtimeAdapter.releaseLock('stage34_c3_finalize_runtime');
  }
}

function runMissionCommandStage34GateC3CandidateV2Batch(runtimeAdapter, reviewAdapter, providerAdapter, input) {
  input = input || {};
  var authorization = validateMissionCommandStage34GateC3Authorization(input);
  if (!authorization.ok) return authorization;
  var requests = buildMissionCommandStage34GateC3Requests();
  if (!requests.ok) return makeMissionCommandStage34GateC3Blocked('request_contract_invalid', requests.errors.join(' | '));
  var runTimestamp = input.runTimestamp || new Date().toISOString();
  var reviewPreflight = preflightMissionCommandStage34GateC3ReviewReservation(reviewAdapter, input.runId, input.batchKey, runTimestamp);
  if (!reviewPreflight.ok) return reviewPreflight;
  var parent = claimMissionCommandStage34GateC3Parent(runtimeAdapter, input.runId, input.batchKey);
  if (!parent.ok) return parent;
  var reserve = reserveMissionCommandStage34GateC3ReviewRows(reviewAdapter, input.runId, input.batchKey, runTimestamp);
  if (!reserve.ok) return reserve;
  var results = [];
  var cumulativeEstimatedCost = 0;
  for (var i = 0; i < requests.requests.length; i++) {
    if (i >= MC_STAGE34_GATE_C3_MAX_CALLS) return makeMissionCommandStage34GateC3Blocked('call_cap_exceeded', 'C3/C4 call cap exceeded.', { actualFetchAttempts: results.length });
    var entry = requests.requests[i];
    var providerResult = providerAdapter.responseFor(entry.fixtureId, entry.request);
    if (!providerResult.ok) {
      var failureEvidence = recordMissionCommandStage34GateC3FailureEvidence(runtimeAdapter, reviewAdapter, input.runId, input.batchKey, entry.fixtureId, providerResult.status || 'provider_candidate_failed', providerResult.meta || {});
      return {
        ok: false,
        status: 'interrupted',
        build: MC_STAGE34_GATE_C3_BUILD,
        stopCondition: failureEvidence.ok === true ? (providerResult.status || 'provider_candidate_failed') : (failureEvidence.stopCondition || failureEvidence.status || 'failure_evidence_failed'),
        failedFixtureId: entry.fixtureId,
        childrenWritten: results.length,
        parentResult: 'receipt_draft',
        providerCallAttempted: providerResult.meta && providerResult.meta.providerCallAttempted === true,
        actualFetchAttempts: normalizeMissionCommandStage34GateC3AttemptMeta(providerResult.meta || {}).fetchAttemptCount,
        failureClass: failureEvidence.failureClass || '',
        failureEvidenceStatus: failureEvidence.status || '',
        failureEvidenceWritten: failureEvidence.failureEvidenceWritten === true,
        failureReviewStatus: failureEvidence.reviewStatus || '',
        parentAggregation: failureEvidence.aggregation || {},
        retryCount: 0,
        fallbackUsed: false
      };
    }
    cumulativeEstimatedCost += Math.max(0, Number((providerResult.meta || {}).estimatedCost || 0));
    if (cumulativeEstimatedCost > MC_STAGE34_GATE_C3_MAX_ESTIMATED_SPEND_USD) {
      var costEvidence = recordMissionCommandStage34GateC3FailureEvidence(runtimeAdapter, reviewAdapter, input.runId, input.batchKey, entry.fixtureId, 'cost_cap_exceeded', Object.assign({}, providerResult.meta || {}, { failureClass: 'cost_cap_exceeded', safeStatus: 'cost_cap_exceeded' }));
      return {
        ok: false,
        status: 'interrupted',
        build: MC_STAGE34_GATE_C3_BUILD,
        stopCondition: costEvidence.ok === true ? 'cost_cap_exceeded' : (costEvidence.stopCondition || costEvidence.status || 'failure_evidence_failed'),
        failedFixtureId: entry.fixtureId,
        childrenWritten: results.length,
        parentResult: 'receipt_draft',
        providerCallAttempted: providerResult.meta && providerResult.meta.providerCallAttempted === true,
        actualFetchAttempts: normalizeMissionCommandStage34GateC3AttemptMeta(providerResult.meta || {}).fetchAttemptCount,
        failureClass: costEvidence.failureClass || '',
        failureEvidenceStatus: costEvidence.status || '',
        failureEvidenceWritten: costEvidence.failureEvidenceWritten === true,
        parentAggregation: costEvidence.aggregation || {},
        retryCount: 0,
        fallbackUsed: false
      };
    }
    var add = addMissionCommandStage34GateC3ProviderCandidate(runtimeAdapter, reviewAdapter, input.runId, input.batchKey, providerResult.candidate, providerResult.meta || {});
    if (!add.ok) {
      return {
        ok: false,
        status: 'interrupted',
        build: MC_STAGE34_GATE_C3_BUILD,
        stopCondition: add.stopCondition || add.status || 'candidate_write_failed',
        failedFixtureId: entry.fixtureId,
        childrenWritten: results.length,
        parentResult: 'receipt_draft',
        providerCallAttempted: add.providerCallAttempted === true,
        actualFetchAttempts: safeMissionCommandOpenAiNumberV31(add.actualFetchAttempts || 0),
        failureClass: add.status === 'quality_blocked' ? 'quality_gate_failed' : '',
        failureEvidenceStatus: add.status || '',
        failureEvidenceWritten: add.child && add.child.ok === true,
        failureReviewStatus: add.reviewFailure && add.reviewFailure.status || '',
        retryCount: 0,
        fallbackUsed: false
      };
    }
    results.push(add);
  }
  var final = finalizeMissionCommandStage34GateC3Batch(runtimeAdapter, reviewAdapter, input.runId, input.batchKey);
  if (!final.ok) return final;
  return {
    ok: true,
    status: 'ready_for_review',
    build: MC_STAGE34_GATE_C3_BUILD,
    runId: input.runId,
    batchKey: input.batchKey,
    relatedObject: MC_STAGE34_GATE_C3_RELATED_OBJECT,
    childrenWritten: results.length,
    reviewRowsComplete: final.reviewRowsComplete,
    providerCallAttempted: final.aggregation.provider_call_attempted === true,
    actualFetchAttempts: final.aggregation.provider_fetch_attempts_actual,
    cumulativeEstimatedCost: cumulativeEstimatedCost,
    retryCount: 0,
    fallbackUsed: false,
    wrapperInvokedByIntegration: false
  };
}

function makeMissionCommandStage34GateC3ReviewAdapter(headers, rows, options) {
  return makeMissionCommandStage34GateB3CReviewAdapter(headers || getMissionCommandStage34GateC2ProposedReviewHeaders(), rows || [], options || {});
}

function makeMissionCommandStage34GateC3FakeProviderAdapter(options) {
  options = options || {};
  return {
    calls: [],
    fetchAttempts: 0,
    responseFor: function(fixtureId, request) {
      this.calls.push({ fixtureId: fixtureId, safeAttemptRecorded: true });
      var authorizedCallCountTotal = this.calls.length;
      if (options.failFixtureId === fixtureId) {
        this.fetchAttempts += 1;
        return { ok: false, status: 'provider_fetch_failed', meta: normalizeMissionCommandStage34GateC3AttemptMeta({ providerCallAttempted: true, authorizedCallCountTotal: authorizedCallCountTotal, fetchAttemptCount: 1, fetchAttemptIndex: this.fetchAttempts, fetchSucceeded: false, httpSucceeded: false, responseParsed: false, schemaValid: false, qualityGatePassed: false }) };
      }
      var candidate = makeMissionCommandStage34GateC2Candidate(fixtureId, options.overrideCandidate || {});
      this.fetchAttempts += options.noFetch === true ? 0 : 1;
      var attempted = options.noFetch !== true;
      return {
        ok: true,
        status: 'provider_candidate_valid',
        candidate: candidate,
        meta: normalizeMissionCommandStage34GateC3AttemptMeta({
          providerCallAttempted: attempted,
          authorizedCallCountTotal: authorizedCallCountTotal,
          fetchAttemptCount: attempted ? 1 : 0,
          fetchAttemptIndex: attempted ? this.fetchAttempts : '',
          fetchSucceeded: attempted,
          httpSucceeded: attempted,
          responseParsed: attempted,
          candidateParsed: attempted,
          schemaValid: true,
          qualityGatePassed: true,
          latencyMs: 10,
          inputTokens: 1200,
          outputTokens: 240,
          estimatedCost: 0.006
        })
      };
    }
  };
}

function makeMissionCommandStage34GateC3OpenAiProviderAdapter() {
  return {
    calls: [],
    fetchAttempts: 0,
    responseFor: function(fixtureId, request) {
      var requestValidation = validateMissionCommandStage34GateC3Request(fixtureId, request);
      if (!requestValidation.ok) {
        return {
          ok: false,
          status: 'request_contract_invalid',
          candidate: null,
          meta: Object.assign(normalizeMissionCommandStage34GateC3AttemptMeta({
            providerCallAttempted: false,
            authorizedCallCountTotal: this.calls.length,
            fetchAttemptCount: 0,
            latencyMs: 0,
            estimatedCost: 0
          }), {
            requestValidationErrors: requestValidation.errors || []
          })
        };
      }
      this.calls.push({ fixtureId: fixtureId, safeAttemptRecorded: true });
      var authorizedAttempts = this.calls.length;
      var apiKey = '';
      try {
        apiKey = String(PropertiesService.getScriptProperties().getProperty(MC_OPENAI_STAGE32_SCRIPT_PROPERTY_KEY) || '').trim();
      } catch (err) {
        return { ok: false, status: 'credential_access_failed', candidate: null, meta: normalizeMissionCommandStage34GateC3AttemptMeta({ providerCallAttempted: false, authorizedCallCountTotal: authorizedAttempts, fetchAttemptCount: 0, latencyMs: 0, estimatedCost: 0 }) };
      }
      if (!apiKey) return { ok: false, status: 'credential_unavailable', candidate: null, meta: normalizeMissionCommandStage34GateC3AttemptMeta({ providerCallAttempted: false, authorizedCallCountTotal: authorizedAttempts, fetchAttemptCount: 0, latencyMs: 0, estimatedCost: 0 }) };
      var started = new Date().getTime();
      var response = null;
      var fetchAttemptIndex = 0;
      try {
        this.fetchAttempts += 1;
        fetchAttemptIndex = this.fetchAttempts;
        response = UrlFetchApp.fetch(MC_OPENAI_STAGE32_ENDPOINT, makeMissionCommandStage34GateB3CFetchOptions(apiKey, request));
      } catch (err) {
        return { ok: false, status: 'provider_fetch_failed', candidate: null, meta: normalizeMissionCommandStage34GateC3AttemptMeta({ providerCallAttempted: true, authorizedCallCountTotal: authorizedAttempts, fetchAttemptCount: 1, fetchAttemptIndex: fetchAttemptIndex, fetchSucceeded: false, httpSucceeded: false, responseParsed: false, schemaValid: false, qualityGatePassed: false, latencyMs: new Date().getTime() - started, httpStatus: 0, estimatedCost: 0 }) };
      }
      var httpStatus = safeMissionCommandOpenAiNumberV31(response.getResponseCode && response.getResponseCode());
      if (httpStatus < 200 || httpStatus >= 300) {
        return { ok: false, status: httpStatus === 404 ? 'model_unavailable' : 'provider_http_' + httpStatus, candidate: null, meta: normalizeMissionCommandStage34GateC3AttemptMeta({ providerCallAttempted: true, authorizedCallCountTotal: authorizedAttempts, fetchAttemptCount: 1, fetchAttemptIndex: fetchAttemptIndex, fetchSucceeded: true, httpSucceeded: false, responseParsed: false, schemaValid: false, qualityGatePassed: false, latencyMs: new Date().getTime() - started, httpStatus: httpStatus, estimatedCost: 0 }) };
      }
      var parsed = {};
      try {
        parsed = JSON.parse(response.getContentText() || '{}');
      } catch (err) {
        return { ok: false, status: 'provider_response_parse_failed', candidate: null, meta: normalizeMissionCommandStage34GateC3AttemptMeta({ providerCallAttempted: true, authorizedCallCountTotal: authorizedAttempts, fetchAttemptCount: 1, fetchAttemptIndex: fetchAttemptIndex, fetchSucceeded: true, httpSucceeded: true, responseParsed: false, schemaValid: false, qualityGatePassed: false, latencyMs: new Date().getTime() - started, httpStatus: httpStatus, estimatedCost: 0 }) };
      }
      var result = makeMissionCommandStage34GateC3ProviderResultFromEnvelope(fixtureId, parsed, {
        providerCallAttempted: true,
        authorizedCallCountTotal: authorizedAttempts,
        fetchAttemptCount: 1,
        fetchAttemptIndex: fetchAttemptIndex,
        fetchSucceeded: true,
        httpSucceeded: true,
        latencyMs: new Date().getTime() - started,
        httpStatus: httpStatus
      });
      if (!result.ok) return { ok: false, status: result.status || 'provider_schema_invalid', candidate: null, meta: result.meta };
      return { ok: true, status: 'provider_candidate_valid', candidate: result.candidate, meta: result.meta };
    }
  };
}

function makeMissionCommandStage34GateC3LiveReviewAdapter(options) {
  options = Object.assign({}, options || {}, {
    headerValidator: validateMissionCommandStage34GateC2ProposedHeaders,
    headerInvalidCode: 'stage_3_4_gate_c3_review_v2_headers_invalid',
    headerValidatorName: 'gate_c3_v2_exact_69'
  });
  return makeMissionCommandStage34GateB3CLiveReviewAdapter(options);
}

function verifyMissionCommandStage34GateC3LocalChecks() {
  var c2 = verifyMissionCommandStage34GateC2LocalChecks();
  var flags = getMissionCommandStage34GateC3Flags();
  var callerFlags = getMissionCommandStage34GateC3Flags({ gateC3Enabled: true });
  var directRuntime = makeMissionCommandStage34GateB3AFakeRuntimeAdapter();
  var directReview = makeMissionCommandStage34GateC3ReviewAdapter();
  var directProvider = makeMissionCommandStage34GateC3FakeProviderAdapter();
  var directBlocked = runMissionCommandStage34GateC3CandidateV2Batch(directRuntime, directReview, directProvider, {});
  var wrongToken = runMissionCommandStage34GateC3CandidateV2Batch(directRuntime, directReview, directProvider, Object.assign({}, makeMissionCommandStage34GateC3WrapperAuthorization(), { authorizationToken: 'wrong' }));
  var wrongIdentity = runMissionCommandStage34GateC3CandidateV2Batch(directRuntime, directReview, directProvider, Object.assign({}, makeMissionCommandStage34GateC3WrapperAuthorization(), { runId: 'wrong' }));
  var consumedC4 = runMissionCommandStage34GateC3CandidateV2Batch(directRuntime, directReview, directProvider, Object.assign({}, makeMissionCommandStage34GateC3WrapperAuthorization(), {
    authorizationToken: MC_STAGE34_GATE_C4_CONSUMED_AUTH_TOKEN,
    runId: MC_STAGE34_GATE_C4_CONSUMED_RUN_ID,
    batchKey: MC_STAGE34_GATE_C4_CONSUMED_BATCH_KEY
  }));
  var consumedD3 = runMissionCommandStage34GateC3CandidateV2Batch(directRuntime, directReview, directProvider, Object.assign({}, makeMissionCommandStage34GateC3WrapperAuthorization(), {
    authorizationToken: MC_STAGE34_GATE_D3_CONSUMED_AUTH_TOKEN,
    runId: MC_STAGE34_GATE_D3_CONSUMED_RUN_ID,
    batchKey: MC_STAGE34_GATE_D3_CONSUMED_BATCH_KEY
  }));
  var consumedE3 = runMissionCommandStage34GateC3CandidateV2Batch(directRuntime, directReview, directProvider, Object.assign({}, makeMissionCommandStage34GateC3WrapperAuthorization(), {
    authorizationToken: MC_STAGE34_GATE_E3_CONSUMED_AUTH_TOKEN,
    runId: MC_STAGE34_GATE_E3_CONSUMED_RUN_ID,
    batchKey: MC_STAGE34_GATE_E3_CONSUMED_BATCH_KEY
  }));
  var consumedF3 = runMissionCommandStage34GateC3CandidateV2Batch(directRuntime, directReview, directProvider, Object.assign({}, makeMissionCommandStage34GateC3WrapperAuthorization(), {
    authorizationToken: MC_STAGE34_GATE_F3_CONSUMED_AUTH_TOKEN,
    runId: MC_STAGE34_GATE_F3_CONSUMED_RUN_ID,
    batchKey: MC_STAGE34_GATE_F3_CONSUMED_BATCH_KEY
  }));
  var consumedG3 = runMissionCommandStage34GateC3CandidateV2Batch(directRuntime, directReview, directProvider, Object.assign({}, makeMissionCommandStage34GateC3WrapperAuthorization(), {
    authorizationToken: MC_STAGE34_GATE_G3_CONSUMED_AUTH_TOKEN,
    runId: MC_STAGE34_GATE_G3_CONSUMED_RUN_ID,
    batchKey: MC_STAGE34_GATE_G3_CONSUMED_BATCH_KEY
  }));
  var requests = buildMissionCommandStage34GateC3Requests();
  var runtime = makeMissionCommandStage34GateB3AFakeRuntimeAdapter();
  var review = makeMissionCommandStage34GateC3ReviewAdapter();
  var provider = makeMissionCommandStage34GateC3FakeProviderAdapter();
  var success = runMissionCommandStage34GateC3CandidateV2Batch(runtime, review, provider, Object.assign({}, makeMissionCommandStage34GateC3WrapperAuthorization(), { runTimestamp: '2026-07-12T19:00:00Z' }));
  var duplicateProvider = makeMissionCommandStage34GateC3FakeProviderAdapter();
  var duplicate = runMissionCommandStage34GateC3CandidateV2Batch(runtime, review, duplicateProvider, Object.assign({}, makeMissionCommandStage34GateC3WrapperAuthorization(), { runTimestamp: '2026-07-12T19:00:00Z' }));
  var qualityRuntime = makeMissionCommandStage34GateB3AFakeRuntimeAdapter();
  var qualityReview = makeMissionCommandStage34GateC3ReviewAdapter();
  var qualityProvider = makeMissionCommandStage34GateC3FakeProviderAdapter({ overrideCandidate: { object_label: 'item', candidate_text: 'Prepare a concise brief and route the matter for review.' } });
  var qualityBlocked = runMissionCommandStage34GateC3CandidateV2Batch(qualityRuntime, qualityReview, qualityProvider, Object.assign({}, makeMissionCommandStage34GateC3WrapperAuthorization(), { runTimestamp: '2026-07-12T19:00:00Z' }));
  var qualityRows = findMissionCommandStage34GateB3AReviewRows(qualityReview, MC_STAGE34_GATE_C3_BATCH_KEY);
  var interruptionRuntime = makeMissionCommandStage34GateB3AFakeRuntimeAdapter();
  var interruptionReview = makeMissionCommandStage34GateC3ReviewAdapter();
  var interruptionProvider = makeMissionCommandStage34GateC3FakeProviderAdapter({ failFixtureId: 'MC34-F12' });
  var interrupted = runMissionCommandStage34GateC3CandidateV2Batch(interruptionRuntime, interruptionReview, interruptionProvider, Object.assign({}, makeMissionCommandStage34GateC3WrapperAuthorization(), { runTimestamp: '2026-07-12T19:00:00Z' }));
  var badHeaderReview = makeMissionCommandStage34GateC3ReviewAdapter(getMissionCommandStage34GateB3AReviewHeaders(), []);
  var badHeader = reserveMissionCommandStage34GateC3ReviewRows(badHeaderReview, MC_STAGE34_GATE_C3_RUN_ID, MC_STAGE34_GATE_C3_BATCH_KEY, '2026-07-12T19:00:00Z');
  var retentionOk = validateMissionCommandStage34GateC2Retention('2026-07-12T19:00:00Z', success.ok ? findMissionCommandStage34GateB3AReviewRows(review, MC_STAGE34_GATE_C3_BATCH_KEY)[0].row.retention_due_at : '');
  var relatedRows = findMissionCommandStage34GateB3AReceiptRows(runtime, MC_STAGE34_GATE_C3_RELATED_OBJECT);
  var childRows = relatedRows.filter(function(entry) { return entry.row.receipt_type === MC_STAGE34_GATE_B3A_RECEIPT_CHILD_TYPE; }).map(function(entry) { return entry.row; });
  var aggregation = aggregateMissionCommandStage34GateC2ProviderAttempts(childRows);
  return {
    ok: c2.ok === true &&
      flags.gateC3Enabled === false &&
      flags.killSwitchEnabled === true &&
      callerFlags.gateC3Enabled === false &&
      directBlocked.stopCondition === 'run_id_mismatch' &&
      directRuntime.rows.length === 0 &&
      directProvider.calls.length === 0 &&
      wrongToken.stopCondition === 'wrapper_authorization_missing' &&
      wrongIdentity.stopCondition === 'run_id_mismatch' &&
      consumedC4.stopCondition === 'run_id_mismatch' &&
      consumedD3.stopCondition === 'run_id_mismatch' &&
      consumedE3.stopCondition === 'run_id_mismatch' &&
      consumedF3.stopCondition === 'run_id_mismatch' &&
      consumedG3.stopCondition === 'run_id_mismatch' &&
      requests.ok === true &&
      requests.requests.length === 4 &&
      requests.requests.map(function(entry) { return entry.fixtureId; }).join('|') === MC_STAGE34_GATE_B3A_FIXTURE_IDS.join('|') &&
      requests.requests.every(function(entry) { return entry.request.store === false && entry.request.tools.length === 0 && !entry.request.previous_response_id && !entry.request.conversation; }) &&
      success.ok === true &&
      success.childrenWritten === 4 &&
      success.reviewRowsComplete === 4 &&
      success.actualFetchAttempts === 4 &&
      duplicate.status === 'duplicate_suppressed' &&
      duplicateProvider.calls.length === 0 &&
      qualityBlocked.status === 'interrupted' &&
      qualityRows.filter(function(entry) { return String(entry.row.candidate_text || '') !== ''; }).length === 0 &&
      interrupted.status === 'interrupted' &&
      interrupted.failedFixtureId === 'MC34-F12' &&
      interrupted.retryCount === 0 &&
      interrupted.fallbackUsed === false &&
      badHeader.stopCondition === 'review_v2_contract_invalid' &&
      retentionOk.ok === true &&
      aggregation.provider_call_attempted === true &&
      aggregation.provider_fetch_attempts_actual === 4 &&
      success.reviewRowsComplete === 4,
    build: MC_STAGE34_GATE_C3_BUILD,
    wrapperName: MC_STAGE34_GATE_C3_WRAPPER_NAME,
    runId: MC_STAGE34_GATE_C3_RUN_ID,
    batchKey: MC_STAGE34_GATE_C3_BATCH_KEY,
    relatedObject: MC_STAGE34_GATE_C3_RELATED_OBJECT,
    model: MC_STAGE34_GATE_C3_MODEL,
    maxCalls: MC_STAGE34_GATE_C3_MAX_CALLS,
    timeoutSeconds: MC_STAGE34_GATE_C3_TIMEOUT_SECONDS,
    maxInputTokensPerCall: MC_STAGE34_GATE_C3_MAX_INPUT_TOKENS_PER_CALL,
    maxOutputTokensPerCall: MC_STAGE34_GATE_C3_MAX_OUTPUT_TOKENS_PER_CALL,
    maxEstimatedSpendUsd: MC_STAGE34_GATE_C3_MAX_ESTIMATED_SPEND_USD,
    flagsDefaultOff: flags.gateC3Enabled === false && flags.killSwitchEnabled === true,
    callerCannotEnable: callerFlags.gateC3Enabled === false,
    directBlocked: directBlocked.stopCondition === 'run_id_mismatch',
    wrongTokenBlocked: wrongToken.stopCondition === 'wrapper_authorization_missing',
    wrongIdentityBlocked: wrongIdentity.stopCondition === 'run_id_mismatch',
    consumedC4IdentityRejected: consumedC4.stopCondition === 'run_id_mismatch',
    consumedD3IdentityRejected: consumedD3.stopCondition === 'run_id_mismatch',
    consumedE3IdentityRejected: consumedE3.stopCondition === 'run_id_mismatch',
    consumedF3IdentityRejected: consumedF3.stopCondition === 'run_id_mismatch',
    consumedG3IdentityRejected: consumedG3.stopCondition === 'run_id_mismatch',
    requestCount: requests.requests.length,
    fixtureOrderExact: requests.requests.map(function(entry) { return entry.fixtureId; }).join('|') === MC_STAGE34_GATE_B3A_FIXTURE_IDS.join('|'),
    successChildren: success.childrenWritten || 0,
    successReviewRows: success.reviewRowsComplete || 0,
    duplicateSuppressedBeforeProvider: duplicate.status === 'duplicate_suppressed' && duplicateProvider.calls.length === 0,
    qualityFailureReadableBlank: qualityRows.filter(function(entry) { return String(entry.row.candidate_text || '') !== ''; }).length === 0,
    interruptionStopsWithoutRetry: interrupted.status === 'interrupted' && interrupted.retryCount === 0,
    badHeaderBlocked: badHeader.stopCondition === 'review_v2_contract_invalid',
    retentionValid: retentionOk.ok === true,
    parentAggregationFromChildren: aggregation.provider_call_attempted === true && aggregation.provider_fetch_attempts_actual === 4,
    wrapperPrepared: false,
    wrapperRemovedAfterManualRun: true,
    wrapperInvokedByIntegration: false,
    liveSheetTouched: false,
    scriptPropertiesAccessed: false,
    providerCallAttemptedByIntegration: false,
    routeCreated: false,
    triggerInstall: false,
    visibleDelivery: false,
    dispatch: false,
    externalWrite: false,
    gateC4Started: false,
    gateC4ManualRunConsumed: true,
    gateC4SafeStatus: 'manual_run_completed_parent_draft_no_children_no_review_rows',
    freshManualRunPrepared: true,
    freshManualRunStarted: true,
    gateD3ManualRunConsumed: true,
    gateD3SafeStatus: 'manual_run_completed_four_reserved_rows_no_children_no_candidates',
    gateE2PreparationReady: true,
    gateE3ManualRunConsumed: true,
    gateE3SafeStatus: 'manual_run_failed_safely_provider_http_400_one_failure_child_no_candidates',
    gateF2PreparationReady: true,
    gateF3ManualRunConsumed: true,
    gateF3SafeStatus: 'manual_run_completed_four_review_ready_rows_with_attempt_aggregation_inconsistency',
    gateF3AttemptAggregationTrust: 'counter_inconsistent_do_not_claim_truthful',
    gateF3AuditInconsistency: {
      parentProviderFetchAttemptsActual: 10,
      childFetchAttemptCountShape: 'cumulative_1_2_3_4_not_per_child',
      childFetchSucceededShape: 'false_despite_http_200_schema_valid_quality_pass',
      childFetchAttemptIndexShape: 'blank'
    },
    gateG3ManualRunConsumed: true,
    gateG3SafeStatus: 'manual_accounting_proof_partial_three_valid_one_schema_failure_accounting_truthful',
    gateG3AccountingProof: {
      parentFinalized: false,
      parentResult: 'receipt_draft',
      childFetchAttemptCountShape: 'per_child_1_1_1_1',
      childFetchAttemptIndexShape: 'global_1_2_3_4',
      successfulFixtures: ['MC34-F01', 'MC34-F04', 'MC34-F12'],
      failedFixture: 'MC34-F15',
      failedFixtureStatus: 'provider_schema_invalid',
      retryCount: 0,
      fallbackUsed: false
    },
    gateH2PreparationReady: true,
    gateH3ManualRunStarted: true,
    gateH3ManualRunConsumed: true,
    gateH3SafeStatus: 'manual_run_appears_successful_parent_four_children_four_review_ready_rows_accounting_truthful_visible_evidence_only'
  };
}

// Mission Command Stage 3.4 post-H3 Gate I5A Batch A local preparation only.
// Only F26-F29 are active inside the scoped Batch A coordinator; the wrapper is editor-only and uninvoked.
var MC_STAGE34_GATE_I5A_BUILD = 'mmos-20260713-stage3-4-post-h3-gate-i5a-batch-a-local-preparation';
var MC_STAGE34_GATE_I5A_ENABLED = false;
var MC_STAGE34_GATE_I5A_KILL_SWITCH = true;
var MC_STAGE34_GATE_I5A_MANIFEST_SHA256 = '13118bddc89cc986f36e5066c0e090941dc859a8863202b3eaede2fda6d1df64';
var MC_STAGE34_GATE_I5A_FIXTURE_IDS = ['MC34-I4-F26', 'MC34-I4-F27', 'MC34-I4-F28', 'MC34-I4-F29'];
var MC_STAGE34_GATE_I5A_WRAPPER_NAME = 'runMissionCommandStage34GateI5AApprovedSyntheticBatchAOnce';
var MC_STAGE34_GATE_I5A_RUN_ID = 'mc_stage34_gate_i5a_batch_a_20260713_manual_001';
var MC_STAGE34_GATE_I5A_BATCH_KEY = '54e506c5f2e9d6a6c4042b6e5d8700c06ffda6fae9412bf9d2e810a0da439';
var MC_STAGE34_GATE_I5A_RELATED_OBJECT = 'mc34b3:54e506c5f2e9d6a6c4042b6e5d8700c06ffda6fae9412bf9d2e810a0da439';
var MC_STAGE34_GATE_I5A_AUTH_TOKEN = 'stage34_gate_i5a_batch_a_manual_001_87d09af73d254f65b703b4684689f31f51995da21250ce5cec6';

function getMissionCommandStage34GateI5AFixtureMap() {
  return {
    'MC34-I4-F26': {
      revised_id: 'MC34-I4-F26-A1',
      role_owner: 'executive_assistant',
      family: 'executive_assistant_critical',
      priority: 'critical',
      object_type: 'approval_packet',
      object_label: 'Synthetic Vendor Kappa renewal approval',
      source_labels: ['synthetic_shadow_fixture', 'runtime_receipt_hash_link'],
      grounding_state: 'synthetic_fixture_only',
      grounding_evidence: 'A synthetic renewal packet has a decision window that closes today.',
      decision_needed: 'Choose approve or revise for the synthetic renewal packet.',
      why_now: 'The synthetic renewal window closes today while downstream planning remains parked.',
      material_change_code: 'new_eligible_event',
      material_change_summary: 'The renewal packet entered its first eligible approval window today.',
      next_move_type: 'approve_or_revise',
      next_move_text: 'Review and approve or revise the renewal packet.',
      next_move_count: 1,
      candidate_text: 'Synthetic Vendor Kappa entered its first eligible renewal window today. Choose approve or revise while downstream planning remains parked.',
      confidence: 0.86,
      should_deliver: false,
      escalated_from: '',
      escalated_to: '',
      chief_context_summary: '',
      executive_decision_required: '',
      companion_chief_candidate_state: '',
      suppression_evidence_state: ''
    },
    'MC34-I4-F27': {
      revised_id: 'MC34-I4-F27-A1',
      role_owner: 'executive_assistant',
      family: 'executive_assistant_critical',
      priority: 'critical',
      object_type: 'project_decision',
      object_label: 'Synthetic Operator Lambda finalist decision',
      source_labels: ['synthetic_shadow_fixture', 'runtime_receipt_hash_link'],
      grounding_state: 'grounded_synthetic',
      grounding_evidence: 'Two synthetic finalists remain in a locked comparison fixture.',
      decision_needed: 'Choose one synthetic finalist for the next review stage.',
      why_now: 'The synthetic comparison window moved to final review today.',
      material_change_code: 'priority_changed',
      material_change_summary: 'The finalist review changed from important comparison to critical final selection.',
      next_move_type: 'choose_direction',
      next_move_text: 'Choose one finalist for the next review stage.',
      next_move_count: 1,
      candidate_text: 'Synthetic Operator Lambda moved from comparison to critical final selection today. Choose one finalist for the next review stage.',
      confidence: 0.85,
      should_deliver: false,
      escalated_from: '',
      escalated_to: '',
      chief_context_summary: '',
      executive_decision_required: '',
      companion_chief_candidate_state: '',
      suppression_evidence_state: ''
    },
    'MC34-I4-F28': {
      revised_id: 'MC34-I4-F28-A1',
      role_owner: 'executive_assistant',
      family: 'executive_assistant_critical',
      priority: 'critical',
      object_type: 'approval_packet',
      object_label: 'Synthetic Initiative Mu allocation packet',
      source_labels: ['synthetic_shadow_fixture', 'runtime_receipt_hash_link'],
      grounding_state: 'grounded_hash_linked',
      grounding_evidence: 'The synthetic allocation packet is linked to a fixed budget-cap receipt hash.',
      decision_needed: 'Choose the approved synthetic allocation ceiling.',
      why_now: 'The planned allocation crossed its synthetic review threshold today.',
      material_change_code: 'blocker_changed',
      material_change_summary: 'The allocation changed from within the synthetic cap to blocked pending A1XX review.',
      next_move_type: 'review_decision_packet',
      next_move_text: 'Review the synthetic allocation ceiling packet.',
      next_move_count: 1,
      candidate_text: 'Synthetic Initiative Mu crossed its allocation review threshold today. Review the ceiling packet and choose the approved synthetic allocation ceiling.',
      confidence: 0.84,
      should_deliver: false,
      escalated_from: '',
      escalated_to: '',
      chief_context_summary: '',
      executive_decision_required: '',
      companion_chief_candidate_state: '',
      suppression_evidence_state: ''
    },
    'MC34-I4-F29': {
      revised_id: 'MC34-I4-F29-A1',
      role_owner: 'chief_of_staff',
      family: 'chief_coordination',
      priority: 'important',
      object_type: 'review_queue',
      object_label: 'Synthetic Project Nu cross-lane review queue',
      source_labels: ['synthetic_shadow_fixture', 'runtime_receipt_hash_link'],
      grounding_state: 'synthetic_fixture_only',
      grounding_evidence: 'Two synthetic lanes now depend on one coordination owner.',
      decision_needed: 'Review the proposed owner for the synthetic cross-lane queue.',
      why_now: 'Ownership changed while both synthetic lanes are waiting on the same review queue.',
      material_change_code: 'owner_changed',
      material_change_summary: 'The queue changed from separate lane owners to one proposed coordination owner.',
      next_move_type: 'review_owner',
      next_move_text: 'Review the proposed coordination owner.',
      next_move_count: 1,
      candidate_text: 'Synthetic Project Nu now has two lanes waiting on one review queue. Review the proposed coordination owner while both lanes remain parked.',
      confidence: 0.83,
      should_deliver: false,
      escalated_from: '',
      escalated_to: '',
      chief_context_summary: '',
      executive_decision_required: '',
      companion_chief_candidate_state: '',
      suppression_evidence_state: ''
    }
  };
}

function getMissionCommandStage34GateI5AFlags(input) {
  input = input || {};
  var authorized = input.approvedManualRun === true &&
    input.wrapperAuthorization === true &&
    input.authorizationToken === MC_STAGE34_GATE_I5A_AUTH_TOKEN &&
    input.runId === MC_STAGE34_GATE_I5A_RUN_ID &&
    input.batchKey === MC_STAGE34_GATE_I5A_BATCH_KEY &&
    input.manifestSha256 === MC_STAGE34_GATE_I5A_MANIFEST_SHA256;
  return {
    enabled: MC_STAGE34_GATE_I5A_ENABLED === true && MC_STAGE34_GATE_I5A_KILL_SWITCH !== true,
    killSwitchEnabled: MC_STAGE34_GATE_I5A_KILL_SWITCH === true,
    wrapperAuthorized: authorized,
    routeEnabled: false,
    triggerEnabled: false,
    visibleDeliveryEnabled: false,
    dispatchEnabled: false,
    externalWriteEnabled: false,
    retryEnabled: false,
    fallbackEnabled: false
  };
}

function makeMissionCommandStage34GateI5AWrapperAuthorization() {
  return {
    approvedManualRun: true,
    wrapperAuthorization: true,
    authorizationToken: MC_STAGE34_GATE_I5A_AUTH_TOKEN,
    runId: MC_STAGE34_GATE_I5A_RUN_ID,
    batchKey: MC_STAGE34_GATE_I5A_BATCH_KEY,
    manifestSha256: MC_STAGE34_GATE_I5A_MANIFEST_SHA256
  };
}

function withMissionCommandStage34GateI5AScope(callback) {
  var prior = {
    fixtureIds: MC_STAGE34_GATE_B3A_FIXTURE_IDS,
    build: MC_STAGE34_GATE_C3_BUILD,
    wrapperName: MC_STAGE34_GATE_C3_WRAPPER_NAME,
    runId: MC_STAGE34_GATE_C3_RUN_ID,
    batchKey: MC_STAGE34_GATE_C3_BATCH_KEY,
    relatedObject: MC_STAGE34_GATE_C3_RELATED_OBJECT,
    authToken: MC_STAGE34_GATE_C3_AUTH_TOKEN
  };
  MC_STAGE34_GATE_B3A_FIXTURE_IDS = MC_STAGE34_GATE_I5A_FIXTURE_IDS.slice();
  MC_STAGE34_GATE_C3_BUILD = MC_STAGE34_GATE_I5A_BUILD;
  MC_STAGE34_GATE_C3_WRAPPER_NAME = MC_STAGE34_GATE_I5A_WRAPPER_NAME;
  MC_STAGE34_GATE_C3_RUN_ID = MC_STAGE34_GATE_I5A_RUN_ID;
  MC_STAGE34_GATE_C3_BATCH_KEY = MC_STAGE34_GATE_I5A_BATCH_KEY;
  MC_STAGE34_GATE_C3_RELATED_OBJECT = MC_STAGE34_GATE_I5A_RELATED_OBJECT;
  MC_STAGE34_GATE_C3_AUTH_TOKEN = MC_STAGE34_GATE_I5A_AUTH_TOKEN;
  try {
    return callback();
  } finally {
    MC_STAGE34_GATE_B3A_FIXTURE_IDS = prior.fixtureIds;
    MC_STAGE34_GATE_C3_BUILD = prior.build;
    MC_STAGE34_GATE_C3_WRAPPER_NAME = prior.wrapperName;
    MC_STAGE34_GATE_C3_RUN_ID = prior.runId;
    MC_STAGE34_GATE_C3_BATCH_KEY = prior.batchKey;
    MC_STAGE34_GATE_C3_RELATED_OBJECT = prior.relatedObject;
    MC_STAGE34_GATE_C3_AUTH_TOKEN = prior.authToken;
  }
}

function runMissionCommandStage34GateI5ABatchA(runtimeAdapter, reviewAdapter, providerAdapter, input) {
  input = input || {};
  var flags = getMissionCommandStage34GateI5AFlags(input);
  if (!flags.wrapperAuthorized) {
    return makeMissionCommandStage34GateC3Blocked('i5a_wrapper_authorization_missing', 'Gate I5A Batch A requires the exact future editor-wrapper identity.');
  }
  return withMissionCommandStage34GateI5AScope(function() {
    return runMissionCommandStage34GateC3CandidateV2Batch(runtimeAdapter, reviewAdapter, providerAdapter, {
      approvedManualRun: true,
      wrapperAuthorization: true,
      authorizationToken: MC_STAGE34_GATE_I5A_AUTH_TOKEN,
      runId: MC_STAGE34_GATE_I5A_RUN_ID,
      batchKey: MC_STAGE34_GATE_I5A_BATCH_KEY,
      runTimestamp: input.runTimestamp || ''
    });
  });
}

function verifyMissionCommandStage34GateI5ALocalChecks() {
  var flags = getMissionCommandStage34GateI5AFlags();
  var callerFlags = getMissionCommandStage34GateI5AFlags({ enabled: true });
  var directRuntime = makeMissionCommandStage34GateB3AFakeRuntimeAdapter();
  var directReview = makeMissionCommandStage34GateC3ReviewAdapter();
  var directProvider = makeMissionCommandStage34GateC3FakeProviderAdapter();
  var direct = runMissionCommandStage34GateI5ABatchA(directRuntime, directReview, directProvider, {});
  var auth = makeMissionCommandStage34GateI5AWrapperAuthorization();
  var wrongToken = runMissionCommandStage34GateI5ABatchA(directRuntime, directReview, directProvider, Object.assign({}, auth, { authorizationToken: 'wrong' }));
  var consumedH3 = runMissionCommandStage34GateI5ABatchA(directRuntime, directReview, directProvider, {
    approvedManualRun: true,
    wrapperAuthorization: true,
    authorizationToken: MC_STAGE34_GATE_C3_AUTH_TOKEN,
    runId: MC_STAGE34_GATE_C3_RUN_ID,
    batchKey: MC_STAGE34_GATE_C3_BATCH_KEY,
    manifestSha256: MC_STAGE34_GATE_I5A_MANIFEST_SHA256
  });
  var successRuntime = makeMissionCommandStage34GateB3AFakeRuntimeAdapter();
  var successReview = makeMissionCommandStage34GateC3ReviewAdapter();
  var successProvider = makeMissionCommandStage34GateC3FakeProviderAdapter();
  var success = runMissionCommandStage34GateI5ABatchA(successRuntime, successReview, successProvider, Object.assign({}, auth, { runTimestamp: '2026-07-13T15:45:33Z' }));
  var duplicateProvider = makeMissionCommandStage34GateC3FakeProviderAdapter();
  var duplicate = runMissionCommandStage34GateI5ABatchA(successRuntime, successReview, duplicateProvider, Object.assign({}, auth, { runTimestamp: '2026-07-13T15:45:33Z' }));
  var interruptedRuntime = makeMissionCommandStage34GateB3AFakeRuntimeAdapter();
  var interruptedReview = makeMissionCommandStage34GateC3ReviewAdapter();
  var interruptedProvider = makeMissionCommandStage34GateC3FakeProviderAdapter({ failFixtureId: 'MC34-I4-F28' });
  var interrupted = runMissionCommandStage34GateI5ABatchA(interruptedRuntime, interruptedReview, interruptedProvider, Object.assign({}, auth, { runTimestamp: '2026-07-13T15:45:33Z' }));
  var futureFixtureRejected = withMissionCommandStage34GateI5AScope(function() {
    return validateMissionCommandStage34GateC3Request('MC34-I4-F30', makeMissionCommandStage34GateC3Request('MC34-I4-F30').request || {});
  });
  var providerSchema = withMissionCommandStage34GateI5AScope(function() { return getMissionCommandStage34GateC3ProviderCandidateSchema(); });
  return {
    ok: flags.enabled === false &&
      flags.killSwitchEnabled === true &&
      callerFlags.enabled === false &&
      direct.stopCondition === 'i5a_wrapper_authorization_missing' &&
      wrongToken.stopCondition === 'i5a_wrapper_authorization_missing' &&
      consumedH3.stopCondition === 'i5a_wrapper_authorization_missing' &&
      directRuntime.rows.length === 0 &&
      directProvider.calls.length === 0 &&
      success.ok === true &&
      success.childrenWritten === 4 &&
      success.reviewRowsComplete === 4 &&
      success.actualFetchAttempts === 4 &&
      duplicate.status === 'duplicate_suppressed' &&
      duplicateProvider.calls.length === 0 &&
      interrupted.status === 'interrupted' &&
      interrupted.failedFixtureId === 'MC34-I4-F28' &&
      interrupted.retryCount === 0 &&
      interrupted.fallbackUsed === false &&
      futureFixtureRejected.ok === false &&
      providerSchema.required.length === 28 &&
      Object.keys(providerSchema.properties).length === 28 &&
      providerSchema.additionalProperties === false &&
      providerSchema.properties.fixture_id.enum.join('|') === MC_STAGE34_GATE_I5A_FIXTURE_IDS.join('|'),
    build: MC_STAGE34_GATE_I5A_BUILD,
    manifestSha256: MC_STAGE34_GATE_I5A_MANIFEST_SHA256,
    fixtureIds: MC_STAGE34_GATE_I5A_FIXTURE_IDS.slice(),
    wrapperName: MC_STAGE34_GATE_I5A_WRAPPER_NAME,
    runId: MC_STAGE34_GATE_I5A_RUN_ID,
    batchKey: MC_STAGE34_GATE_I5A_BATCH_KEY,
    relatedObject: MC_STAGE34_GATE_I5A_RELATED_OBJECT,
    model: MC_STAGE34_GATE_C3_MODEL,
    maxCalls: MC_STAGE34_GATE_C3_MAX_CALLS,
    timeoutSeconds: MC_STAGE34_GATE_C3_TIMEOUT_SECONDS,
    maxInputTokensPerCall: MC_STAGE34_GATE_C3_MAX_INPUT_TOKENS_PER_CALL,
    maxOutputTokensPerCall: MC_STAGE34_GATE_C3_MAX_OUTPUT_TOKENS_PER_CALL,
    maxEstimatedSpendUsd: MC_STAGE34_GATE_C3_MAX_ESTIMATED_SPEND_USD,
    flagsDefaultOff: flags.enabled === false && flags.killSwitchEnabled === true,
    callerCannotEnable: callerFlags.enabled === false,
    directBlocked: direct.stopCondition === 'i5a_wrapper_authorization_missing',
    wrongTokenBlocked: wrongToken.stopCondition === 'i5a_wrapper_authorization_missing',
    consumedH3IdentityRejected: consumedH3.stopCondition === 'i5a_wrapper_authorization_missing',
    futureFixturesInactive: futureFixtureRejected.ok === false,
    providerSchemaFieldCount: providerSchema.required.length,
    successChildren: success.childrenWritten || 0,
    successReviewRows: success.reviewRowsComplete || 0,
    childFetchAttemptCountShape: 'per_child_1_1_1_1',
    childFetchAttemptIndexShape: 'global_1_2_3_4',
    duplicateSuppressedBeforeProvider: duplicate.status === 'duplicate_suppressed' && duplicateProvider.calls.length === 0,
    interruptionDurable: interrupted.status === 'interrupted' && interrupted.retryCount === 0 && interrupted.fallbackUsed === false,
    wrapperPrepared: false,
    wrapperRemovedAfterManualRun: true,
    manualRunConsumed: true,
    manualRunSafeStatus: 'manual_run_appears_successful_parent_four_children_four_batch_a_review_rows_visible_evidence_only',
    wrapperInvokedByIntegration: false,
    liveServicesTouched: false,
    routeCreated: false,
    triggerInstall: false,
    visibleDelivery: false,
    dispatch: false,
    externalWrite: false,
    readyForOneRunDecision: false
  };
}

// Mission Command Stage 3.4 post-H3 Gate I5B Batch B local preparation only.
// Only F30-F33 are active inside the scoped Batch B coordinator; the wrapper is editor-only and uninvoked.
var MC_STAGE34_GATE_I5B_BUILD = 'mmos-20260713-stage3-4-post-h3-gate-i5b-batch-b-local-preparation';
var MC_STAGE34_GATE_I5B_ENABLED = false;
var MC_STAGE34_GATE_I5B_KILL_SWITCH = true;
var MC_STAGE34_GATE_I5B_MANIFEST_SHA256 = '13118bddc89cc986f36e5066c0e090941dc859a8863202b3eaede2fda6d1df64';
var MC_STAGE34_GATE_I5B_FIXTURE_IDS = ['MC34-I4-F30', 'MC34-I4-F31', 'MC34-I4-F32', 'MC34-I4-F33'];
var MC_STAGE34_GATE_I5B_WRAPPER_NAME = 'runMissionCommandStage34GateI5BApprovedSyntheticBatchBOnce';
var MC_STAGE34_GATE_I5B_RUN_ID = 'mc_stage34_gate_i5b_batch_b_20260713_manual_001';
var MC_STAGE34_GATE_I5B_BATCH_KEY = '9ec1cb85d68ea76c1b3f8ce827fa79b82095362a71b8bee6c2590e93b23b3e48';
var MC_STAGE34_GATE_I5B_RELATED_OBJECT = 'mc34b3:9ec1cb85d68ea76c1b3f8ce827fa79b82095362a71b8bee6c2590e93b23b3e48';
var MC_STAGE34_GATE_I5B_AUTH_TOKEN = 'stage34_gate_i5b_batch_b_manual_001_8b6fe152d09023c364c2730d0344817c538ccf899f657a7f';

function getMissionCommandStage34GateI5BFixtureMap() {
  return {
    'MC34-I4-F30': {
      revised_id: 'MC34-I4-F30-B1', role_owner: 'chief_of_staff', family: 'chief_coordination', priority: 'important',
      object_type: 'meeting_brief', object_label: 'Synthetic Review Sigma schedule brief',
      source_labels: ['synthetic_shadow_fixture', 'runtime_receipt_hash_link'], grounding_state: 'grounded_synthetic',
      grounding_evidence: 'Two synthetic review windows now overlap in the fixed schedule fixture.',
      decision_needed: 'Review which synthetic dependency should retain the shared review window.',
      why_now: 'A new synthetic dependency caused the two review windows to overlap today.',
      material_change_code: 'dependency_changed', material_change_summary: 'The schedule changed from independent windows to one shared dependency window.',
      next_move_type: 'review_dependency', next_move_text: 'Review which dependency should retain the shared review window.', next_move_count: 1,
      candidate_text: 'Synthetic Review Sigma now has two review windows sharing one dependency window. Review which dependency should retain that window.',
      confidence: 0.84, should_deliver: false, escalated_from: '', escalated_to: '', chief_context_summary: '', executive_decision_required: '', companion_chief_candidate_state: '', suppression_evidence_state: ''
    },
    'MC34-I4-F31': {
      revised_id: 'MC34-I4-F31-B1', role_owner: 'chief_of_staff', family: 'chief_coordination', priority: 'important',
      object_type: 'handoff_dependency', object_label: 'Synthetic Handoff Tau sequence review',
      source_labels: ['synthetic_shadow_fixture', 'runtime_receipt_hash_link'], grounding_state: 'grounded_hash_linked',
      grounding_evidence: 'The synthetic handoff has a fixed sequence-state receipt hash.',
      decision_needed: 'Review the proposed owner for the next synthetic handoff step.',
      why_now: 'The handoff state changed from parked to ready for one ownership review.',
      material_change_code: 'state_changed', material_change_summary: 'The handoff changed from parked dependency to ready-for-owner-review.',
      next_move_type: 'review_owner', next_move_text: 'Review the proposed owner for the next handoff step.', next_move_count: 1,
      candidate_text: 'Synthetic Handoff Tau changed from parked to ready for owner review. Review the proposed owner for the next handoff step.',
      confidence: 0.83, should_deliver: false, escalated_from: '', escalated_to: '', chief_context_summary: '', executive_decision_required: '', companion_chief_candidate_state: '', suppression_evidence_state: ''
    },
    'MC34-I4-F32': {
      revised_id: 'MC34-I4-F32-B1', role_owner: 'chief_of_staff', family: 'material_change_reopen', priority: 'critical',
      object_type: 'project_decision', object_label: 'Synthetic Release Upsilon due-window review',
      source_labels: ['synthetic_shadow_fixture', 'runtime_receipt_hash_link'], grounding_state: 'synthetic_fixture_only',
      grounding_evidence: 'The synthetic release fixture records a due-window change from later to today.',
      decision_needed: 'Review the dependency reopened by the changed synthetic due window.',
      why_now: 'The synthetic due window moved to today, invalidating the prior quiet state.',
      material_change_code: 'due_date_changed', material_change_summary: 'The release due window changed from next week to today.',
      next_move_type: 'review_changed_due_date', next_move_text: 'Review the dependency reopened by the changed due date.', next_move_count: 1,
      candidate_text: 'Synthetic Release Upsilon moved its due window from next week to today. Review the dependency reopened by that change.',
      confidence: 0.86, should_deliver: false, escalated_from: '', escalated_to: '', chief_context_summary: '', executive_decision_required: '', companion_chief_candidate_state: '', suppression_evidence_state: ''
    },
    'MC34-I4-F33': {
      revised_id: 'MC34-I4-F33-B1', role_owner: 'chief_of_staff', family: 'material_change_reopen', priority: 'important',
      object_type: 'handoff_dependency', object_label: 'Synthetic Dependency Phi blocker review',
      source_labels: ['synthetic_shadow_fixture', 'runtime_receipt_hash_link'], grounding_state: 'grounded_synthetic',
      grounding_evidence: 'The synthetic blocker fixture changed after an approved dependency became unavailable.',
      decision_needed: 'Review the newly blocked synthetic dependency.',
      why_now: 'The dependency changed from available to blocked during the current review window.',
      material_change_code: 'blocker_changed', material_change_summary: 'The handoff changed from dependency-available to blocked on a new synthetic condition.',
      next_move_type: 'review_dependency', next_move_text: 'Review the newly blocked synthetic dependency.', next_move_count: 1,
      candidate_text: 'Synthetic Dependency Phi changed from available to blocked during the current review window. Review the newly blocked dependency.',
      confidence: 0.82, should_deliver: false, escalated_from: '', escalated_to: '', chief_context_summary: '', executive_decision_required: '', companion_chief_candidate_state: '', suppression_evidence_state: ''
    }
  };
}

function getMissionCommandStage34GateI5BFlags(input) {
  input = input || {};
  var authorized = input.approvedManualRun === true && input.wrapperAuthorization === true &&
    input.authorizationToken === MC_STAGE34_GATE_I5B_AUTH_TOKEN && input.runId === MC_STAGE34_GATE_I5B_RUN_ID &&
    input.batchKey === MC_STAGE34_GATE_I5B_BATCH_KEY && input.manifestSha256 === MC_STAGE34_GATE_I5B_MANIFEST_SHA256;
  return {
    enabled: MC_STAGE34_GATE_I5B_ENABLED === true && MC_STAGE34_GATE_I5B_KILL_SWITCH !== true,
    killSwitchEnabled: MC_STAGE34_GATE_I5B_KILL_SWITCH === true,
    wrapperAuthorized: authorized,
    routeEnabled: false, triggerEnabled: false, visibleDeliveryEnabled: false, dispatchEnabled: false,
    externalWriteEnabled: false, retryEnabled: false, fallbackEnabled: false
  };
}

function makeMissionCommandStage34GateI5BWrapperAuthorization() {
  return { approvedManualRun: true, wrapperAuthorization: true, authorizationToken: MC_STAGE34_GATE_I5B_AUTH_TOKEN,
    runId: MC_STAGE34_GATE_I5B_RUN_ID, batchKey: MC_STAGE34_GATE_I5B_BATCH_KEY, manifestSha256: MC_STAGE34_GATE_I5B_MANIFEST_SHA256 };
}

function withMissionCommandStage34GateI5BScope(callback) {
  var prior = { fixtureIds: MC_STAGE34_GATE_B3A_FIXTURE_IDS, build: MC_STAGE34_GATE_C3_BUILD,
    wrapperName: MC_STAGE34_GATE_C3_WRAPPER_NAME, runId: MC_STAGE34_GATE_C3_RUN_ID,
    batchKey: MC_STAGE34_GATE_C3_BATCH_KEY, relatedObject: MC_STAGE34_GATE_C3_RELATED_OBJECT,
    authToken: MC_STAGE34_GATE_C3_AUTH_TOKEN };
  MC_STAGE34_GATE_B3A_FIXTURE_IDS = MC_STAGE34_GATE_I5B_FIXTURE_IDS.slice();
  MC_STAGE34_GATE_C3_BUILD = MC_STAGE34_GATE_I5B_BUILD;
  MC_STAGE34_GATE_C3_WRAPPER_NAME = MC_STAGE34_GATE_I5B_WRAPPER_NAME;
  MC_STAGE34_GATE_C3_RUN_ID = MC_STAGE34_GATE_I5B_RUN_ID;
  MC_STAGE34_GATE_C3_BATCH_KEY = MC_STAGE34_GATE_I5B_BATCH_KEY;
  MC_STAGE34_GATE_C3_RELATED_OBJECT = MC_STAGE34_GATE_I5B_RELATED_OBJECT;
  MC_STAGE34_GATE_C3_AUTH_TOKEN = MC_STAGE34_GATE_I5B_AUTH_TOKEN;
  try { return callback(); }
  finally {
    MC_STAGE34_GATE_B3A_FIXTURE_IDS = prior.fixtureIds; MC_STAGE34_GATE_C3_BUILD = prior.build;
    MC_STAGE34_GATE_C3_WRAPPER_NAME = prior.wrapperName; MC_STAGE34_GATE_C3_RUN_ID = prior.runId;
    MC_STAGE34_GATE_C3_BATCH_KEY = prior.batchKey; MC_STAGE34_GATE_C3_RELATED_OBJECT = prior.relatedObject;
    MC_STAGE34_GATE_C3_AUTH_TOKEN = prior.authToken;
  }
}

function runMissionCommandStage34GateI5BBatchB(runtimeAdapter, reviewAdapter, providerAdapter, input) {
  input = input || {};
  var flags = getMissionCommandStage34GateI5BFlags(input);
  if (!flags.wrapperAuthorized) return makeMissionCommandStage34GateC3Blocked('i5b_wrapper_authorization_missing', 'Gate I5B Batch B requires the exact future editor-wrapper identity.');
  return withMissionCommandStage34GateI5BScope(function() {
    return runMissionCommandStage34GateC3CandidateV2Batch(runtimeAdapter, reviewAdapter, providerAdapter, {
      approvedManualRun: true, wrapperAuthorization: true, authorizationToken: MC_STAGE34_GATE_I5B_AUTH_TOKEN,
      runId: MC_STAGE34_GATE_I5B_RUN_ID, batchKey: MC_STAGE34_GATE_I5B_BATCH_KEY, runTimestamp: input.runTimestamp || ''
    });
  });
}

function verifyMissionCommandStage34GateI5BLocalChecks() {
  var flags = getMissionCommandStage34GateI5BFlags();
  var directRuntime = makeMissionCommandStage34GateB3AFakeRuntimeAdapter();
  var directProvider = makeMissionCommandStage34GateC3FakeProviderAdapter();
  var direct = runMissionCommandStage34GateI5BBatchB(directRuntime, makeMissionCommandStage34GateC3ReviewAdapter(), directProvider, {});
  var auth = makeMissionCommandStage34GateI5BWrapperAuthorization();
  var consumedI5A = runMissionCommandStage34GateI5BBatchB(directRuntime, makeMissionCommandStage34GateC3ReviewAdapter(), directProvider,
    Object.assign({}, auth, { authorizationToken: MC_STAGE34_GATE_I5A_AUTH_TOKEN, runId: MC_STAGE34_GATE_I5A_RUN_ID, batchKey: MC_STAGE34_GATE_I5A_BATCH_KEY }));
  var successRuntime = makeMissionCommandStage34GateB3AFakeRuntimeAdapter();
  var successReview = makeMissionCommandStage34GateC3ReviewAdapter();
  var successProvider = makeMissionCommandStage34GateC3FakeProviderAdapter();
  var success = runMissionCommandStage34GateI5BBatchB(successRuntime, successReview, successProvider, Object.assign({}, auth, { runTimestamp: '2026-07-13T18:00:00Z' }));
  var duplicateProvider = makeMissionCommandStage34GateC3FakeProviderAdapter();
  var duplicate = runMissionCommandStage34GateI5BBatchB(successRuntime, successReview, duplicateProvider, Object.assign({}, auth, { runTimestamp: '2026-07-13T18:00:00Z' }));
  var interruptedProvider = makeMissionCommandStage34GateC3FakeProviderAdapter({ failFixtureId: 'MC34-I4-F32' });
  var interrupted = runMissionCommandStage34GateI5BBatchB(makeMissionCommandStage34GateB3AFakeRuntimeAdapter(), makeMissionCommandStage34GateC3ReviewAdapter(), interruptedProvider, Object.assign({}, auth, { runTimestamp: '2026-07-13T18:00:00Z' }));
  var futureRejected = withMissionCommandStage34GateI5BScope(function() { return validateMissionCommandStage34GateC3Request('MC34-I4-F34', makeMissionCommandStage34GateC3Request('MC34-I4-F34').request || {}); });
  var schema = withMissionCommandStage34GateI5BScope(function() { return getMissionCommandStage34GateC3ProviderCandidateSchema(); });
  return {
    ok: flags.enabled === false && flags.killSwitchEnabled === true && direct.stopCondition === 'i5b_wrapper_authorization_missing' &&
      consumedI5A.stopCondition === 'i5b_wrapper_authorization_missing' && directRuntime.rows.length === 0 && directProvider.calls.length === 0 &&
      success.ok === true && success.childrenWritten === 4 && success.reviewRowsComplete === 4 && success.actualFetchAttempts === 4 &&
      duplicate.status === 'duplicate_suppressed' && duplicateProvider.calls.length === 0 && interrupted.status === 'interrupted' &&
      interrupted.failedFixtureId === 'MC34-I4-F32' && interrupted.retryCount === 0 && interrupted.fallbackUsed === false &&
      futureRejected.ok === false && schema.required.length === 28 && Object.keys(schema.properties).length === 28 &&
      schema.additionalProperties === false && schema.properties.fixture_id.enum.join('|') === MC_STAGE34_GATE_I5B_FIXTURE_IDS.join('|'),
    build: MC_STAGE34_GATE_I5B_BUILD, fixtureIds: MC_STAGE34_GATE_I5B_FIXTURE_IDS.slice(), wrapperName: MC_STAGE34_GATE_I5B_WRAPPER_NAME,
    runId: MC_STAGE34_GATE_I5B_RUN_ID, batchKey: MC_STAGE34_GATE_I5B_BATCH_KEY, relatedObject: MC_STAGE34_GATE_I5B_RELATED_OBJECT,
    flagsDefaultOff: flags.enabled === false && flags.killSwitchEnabled === true, directBlocked: direct.stopCondition === 'i5b_wrapper_authorization_missing',
    consumedI5AIdentityRejected: consumedI5A.stopCondition === 'i5b_wrapper_authorization_missing', futureFixturesInactive: futureRejected.ok === false,
    successStatus: success.status || '', successStopCondition: success.stopCondition || '', successFailedFixtureId: success.failedFixtureId || '', successChildren: success.childrenWritten || 0, successReviewRows: success.reviewRowsComplete || 0,
    duplicateSuppressedBeforeProvider: duplicate.status === 'duplicate_suppressed' && duplicateProvider.calls.length === 0,
    interruptionDurable: interrupted.status === 'interrupted' && interrupted.retryCount === 0 && interrupted.fallbackUsed === false,
    wrapperPrepared: false, wrapperRemovedAfterManualRun: true, manualRunConsumed: true,
    manualRunSafeStatus: 'manual_run_appears_successful_parent_four_children_four_batch_b_review_rows_visible_evidence_only',
    wrapperInvokedByIntegration: false, liveServicesTouched: false, routeCreated: false,
    triggerInstall: false, visibleDelivery: false, dispatch: false, externalWrite: false, readyForOneRunDecision: false
  };
}

// Mission Command Stage 3.4 post-H3 Gate I5C Batch C local preparation only.
// Only F34-F37 are active inside the scoped Batch C coordinator; F38 remains inactive.
var MC_STAGE34_GATE_I5C_BUILD = 'mmos-20260713-stage3-4-post-h3-gate-i5c-batch-c-local-preparation';
var MC_STAGE34_GATE_I5C_ENABLED = false;
var MC_STAGE34_GATE_I5C_KILL_SWITCH = true;
var MC_STAGE34_GATE_I5C_MANIFEST_SHA256 = '13118bddc89cc986f36e5066c0e090941dc859a8863202b3eaede2fda6d1df64';
var MC_STAGE34_GATE_I5C_FIXTURE_IDS = ['MC34-I4-F34', 'MC34-I4-F35', 'MC34-I4-F36', 'MC34-I4-F37'];
var MC_STAGE34_GATE_I5C_WRAPPER_NAME = 'runMissionCommandStage34GateI5CApprovedSyntheticBatchCOnce';
var MC_STAGE34_GATE_I5C_RUN_ID = 'mc_stage34_gate_i5c_batch_c_20260713_manual_001';
var MC_STAGE34_GATE_I5C_BATCH_KEY = 'b8af4cb63d5cfa9d3a7fd2c115ac3d4cd7597f5b89f4f7fd4d0c93510f79ec36';
var MC_STAGE34_GATE_I5C_RELATED_OBJECT = 'mc34b3:b8af4cb63d5cfa9d3a7fd2c115ac3d4cd7597f5b89f4f7fd4d0c93510f79ec36';
var MC_STAGE34_GATE_I5C_AUTH_TOKEN = 'stage34_gate_i5c_batch_c_manual_001_1becb1e8e5c8bd88ff6ad07fbf01216d17558aafe18e44c546b76a63c';

function getMissionCommandStage34GateI5CFixtureMap() {
  return {
    'MC34-I4-F34': {
      revised_id: 'MC34-I4-F34-C1', role_owner: 'chief_of_staff', family: 'material_change_reopen', priority: 'important',
      object_type: 'review_queue', object_label: 'Synthetic Queue Chi reopened review',
      source_labels: ['synthetic_shadow_fixture', 'runtime_receipt_hash_link'], grounding_state: 'grounded_hash_linked',
      grounding_evidence: 'A prior synthetic suppression hash is linked to a newly eligible review state.',
      decision_needed: 'Review whether the newly changed synthetic queue should reopen.',
      why_now: 'A material queue change invalidated the prior suppression decision today.',
      material_change_code: 'suppression_reopen', material_change_summary: 'The queue changed from unchanged-suppressed to newly eligible after its review state moved.',
      next_move_type: 'review', next_move_text: 'Review whether the newly changed synthetic queue should reopen.', next_move_count: 1,
      candidate_text: 'Synthetic Queue Chi changed from suppressed to newly eligible after its review state moved. Review whether the queue should reopen.',
      confidence: 0.84, should_deliver: false, escalated_from: '', escalated_to: '', chief_context_summary: '', executive_decision_required: '', companion_chief_candidate_state: '', suppression_evidence_state: ''
    },
    'MC34-I4-F35': {
      revised_id: 'MC34-I4-F35-C1', role_owner: 'executive_assistant', family: 'attributed_chief_escalation', priority: 'important',
      object_type: 'campaign_direction', object_label: 'Synthetic Campaign Psi tradeoff decision',
      source_labels: ['synthetic_shadow_fixture', 'runtime_receipt_hash_link', 'chief_escalation_context'], grounding_state: 'synthetic_fixture_only',
      grounding_evidence: 'Chief context identifies two synthetic campaign paths competing for one review window.',
      decision_needed: 'Choose which synthetic campaign path receives the review window.',
      why_now: 'Chief moved the competing campaign paths into one A1XX decision today.',
      material_change_code: 'chief_escalation_required', material_change_summary: 'Chief coordination changed into an A1XX tradeoff because only one campaign path can use the review window.',
      next_move_type: 'choose_approval_path', next_move_text: 'Choose which campaign path receives the review window.', next_move_count: 1,
      candidate_text: 'Chief moved two Synthetic Campaign Psi paths into one decision because they compete for one review window. Choose which path receives it.',
      confidence: 0.86, should_deliver: false, escalated_from: 'chief_of_staff', escalated_to: 'executive_assistant',
      chief_context_summary: 'Chief identified two synthetic campaign paths competing for one review window.',
      executive_decision_required: 'Choose which synthetic campaign path receives the review window.',
      companion_chief_candidate_state: 'merged_into_escalation', suppression_evidence_state: 'verified_hash_link'
    },
    'MC34-I4-F36': {
      revised_id: 'MC34-I4-F36-C1', role_owner: 'executive_assistant', family: 'attributed_chief_escalation', priority: 'critical',
      object_type: 'project_decision', object_label: 'Synthetic Launch Omega window decision',
      source_labels: ['synthetic_shadow_fixture', 'runtime_receipt_hash_link', 'chief_escalation_context'], grounding_state: 'grounded_hash_linked',
      grounding_evidence: 'Chief context links two synthetic launch windows to one fixed readiness receipt hash.',
      decision_needed: 'Choose the synthetic launch window to retain.',
      why_now: 'Chief identified that the two launch windows now compete for the same readiness slot today.',
      material_change_code: 'chief_escalation_required', material_change_summary: 'Chief coordination changed into an A1XX launch-window decision after the readiness slots converged.',
      next_move_type: 'choose_direction', next_move_text: 'Choose the synthetic launch window to retain.', next_move_count: 1,
      candidate_text: 'Chief linked two Synthetic Launch Omega windows to one readiness slot. Choose the launch window to retain.',
      confidence: 0.88, should_deliver: false, escalated_from: 'chief_of_staff', escalated_to: 'executive_assistant',
      chief_context_summary: 'Chief linked two synthetic launch windows to one fixed readiness receipt hash.',
      executive_decision_required: 'Choose the synthetic launch window to retain.',
      companion_chief_candidate_state: 'suppressed_same_family', suppression_evidence_state: 'verified_hash_link'
    },
    'MC34-I4-F37': {
      revised_id: 'MC34-I4-F37-C1', role_owner: 'chief_of_staff', family: 'chief_coordination', priority: 'important',
      object_type: 'other_synthetic', object_label: 'Synthetic Return Rho current-priority review',
      source_labels: ['synthetic_shadow_fixture', 'runtime_receipt_hash_link'], grounding_state: 'synthetic_fixture_only',
      grounding_evidence: 'The synthetic return fixture exposes one current Chief priority and suppresses historical backlog.',
      decision_needed: 'Review the one current synthetic priority retained after return.',
      why_now: 'The return state moved from dormant to one current review item while older items remain parked.',
      material_change_code: 'review_transition_changed', material_change_summary: 'The return changed from dormant to one current Chief review item without backlog replay.',
      next_move_type: 'review', next_move_text: 'Review the one current synthetic priority retained after return.', next_move_count: 1,
      candidate_text: 'Synthetic Return Rho moved from dormant to one current Chief priority while historical backlog remains parked. Review the retained priority.',
      confidence: 0.83, should_deliver: false, escalated_from: '', escalated_to: '', chief_context_summary: '', executive_decision_required: '', companion_chief_candidate_state: '', suppression_evidence_state: ''
    }
  };
}

function getMissionCommandStage34GateI5CFlags(input) {
  input = input || {};
  var authorized = input.approvedManualRun === true && input.wrapperAuthorization === true &&
    input.authorizationToken === MC_STAGE34_GATE_I5C_AUTH_TOKEN && input.runId === MC_STAGE34_GATE_I5C_RUN_ID &&
    input.batchKey === MC_STAGE34_GATE_I5C_BATCH_KEY && input.manifestSha256 === MC_STAGE34_GATE_I5C_MANIFEST_SHA256;
  return {
    enabled: MC_STAGE34_GATE_I5C_ENABLED === true && MC_STAGE34_GATE_I5C_KILL_SWITCH !== true,
    killSwitchEnabled: MC_STAGE34_GATE_I5C_KILL_SWITCH === true, wrapperAuthorized: authorized,
    routeEnabled: false, triggerEnabled: false, visibleDeliveryEnabled: false, dispatchEnabled: false,
    externalWriteEnabled: false, retryEnabled: false, fallbackEnabled: false
  };
}

function makeMissionCommandStage34GateI5CWrapperAuthorization() {
  return { approvedManualRun: true, wrapperAuthorization: true, authorizationToken: MC_STAGE34_GATE_I5C_AUTH_TOKEN,
    runId: MC_STAGE34_GATE_I5C_RUN_ID, batchKey: MC_STAGE34_GATE_I5C_BATCH_KEY, manifestSha256: MC_STAGE34_GATE_I5C_MANIFEST_SHA256 };
}

function withMissionCommandStage34GateI5CScope(callback) {
  var prior = { fixtureIds: MC_STAGE34_GATE_B3A_FIXTURE_IDS, build: MC_STAGE34_GATE_C3_BUILD,
    wrapperName: MC_STAGE34_GATE_C3_WRAPPER_NAME, runId: MC_STAGE34_GATE_C3_RUN_ID,
    batchKey: MC_STAGE34_GATE_C3_BATCH_KEY, relatedObject: MC_STAGE34_GATE_C3_RELATED_OBJECT, authToken: MC_STAGE34_GATE_C3_AUTH_TOKEN };
  MC_STAGE34_GATE_B3A_FIXTURE_IDS = MC_STAGE34_GATE_I5C_FIXTURE_IDS.slice();
  MC_STAGE34_GATE_C3_BUILD = MC_STAGE34_GATE_I5C_BUILD; MC_STAGE34_GATE_C3_WRAPPER_NAME = MC_STAGE34_GATE_I5C_WRAPPER_NAME;
  MC_STAGE34_GATE_C3_RUN_ID = MC_STAGE34_GATE_I5C_RUN_ID; MC_STAGE34_GATE_C3_BATCH_KEY = MC_STAGE34_GATE_I5C_BATCH_KEY;
  MC_STAGE34_GATE_C3_RELATED_OBJECT = MC_STAGE34_GATE_I5C_RELATED_OBJECT; MC_STAGE34_GATE_C3_AUTH_TOKEN = MC_STAGE34_GATE_I5C_AUTH_TOKEN;
  try { return callback(); }
  finally {
    MC_STAGE34_GATE_B3A_FIXTURE_IDS = prior.fixtureIds; MC_STAGE34_GATE_C3_BUILD = prior.build;
    MC_STAGE34_GATE_C3_WRAPPER_NAME = prior.wrapperName; MC_STAGE34_GATE_C3_RUN_ID = prior.runId;
    MC_STAGE34_GATE_C3_BATCH_KEY = prior.batchKey; MC_STAGE34_GATE_C3_RELATED_OBJECT = prior.relatedObject; MC_STAGE34_GATE_C3_AUTH_TOKEN = prior.authToken;
  }
}

function runMissionCommandStage34GateI5CBatchC(runtimeAdapter, reviewAdapter, providerAdapter, input) {
  input = input || {};
  var flags = getMissionCommandStage34GateI5CFlags(input);
  if (!flags.wrapperAuthorized) return makeMissionCommandStage34GateC3Blocked('i5c_wrapper_authorization_missing', 'Gate I5C Batch C requires the exact future editor-wrapper identity.');
  return withMissionCommandStage34GateI5CScope(function() {
    return runMissionCommandStage34GateC3CandidateV2Batch(runtimeAdapter, reviewAdapter, providerAdapter, {
      approvedManualRun: true, wrapperAuthorization: true, authorizationToken: MC_STAGE34_GATE_I5C_AUTH_TOKEN,
      runId: MC_STAGE34_GATE_I5C_RUN_ID, batchKey: MC_STAGE34_GATE_I5C_BATCH_KEY, runTimestamp: input.runTimestamp || ''
    });
  });
}

function verifyMissionCommandStage34GateI5CLocalChecks() {
  var flags = getMissionCommandStage34GateI5CFlags();
  var directRuntime = makeMissionCommandStage34GateB3AFakeRuntimeAdapter();
  var directProvider = makeMissionCommandStage34GateC3FakeProviderAdapter();
  var direct = runMissionCommandStage34GateI5CBatchC(directRuntime, makeMissionCommandStage34GateC3ReviewAdapter(), directProvider, {});
  var auth = makeMissionCommandStage34GateI5CWrapperAuthorization();
  var consumedI5B = runMissionCommandStage34GateI5CBatchC(directRuntime, makeMissionCommandStage34GateC3ReviewAdapter(), directProvider,
    Object.assign({}, auth, { authorizationToken: MC_STAGE34_GATE_I5B_AUTH_TOKEN, runId: MC_STAGE34_GATE_I5B_RUN_ID, batchKey: MC_STAGE34_GATE_I5B_BATCH_KEY }));
  var successRuntime = makeMissionCommandStage34GateB3AFakeRuntimeAdapter();
  var successReview = makeMissionCommandStage34GateC3ReviewAdapter();
  var successProvider = makeMissionCommandStage34GateC3FakeProviderAdapter();
  var success = runMissionCommandStage34GateI5CBatchC(successRuntime, successReview, successProvider, Object.assign({}, auth, { runTimestamp: '2026-07-13T19:30:00Z' }));
  var duplicateProvider = makeMissionCommandStage34GateC3FakeProviderAdapter();
  var duplicate = runMissionCommandStage34GateI5CBatchC(successRuntime, successReview, duplicateProvider, Object.assign({}, auth, { runTimestamp: '2026-07-13T19:30:00Z' }));
  var interruptedProvider = makeMissionCommandStage34GateC3FakeProviderAdapter({ failFixtureId: 'MC34-I4-F36' });
  var interrupted = runMissionCommandStage34GateI5CBatchC(makeMissionCommandStage34GateB3AFakeRuntimeAdapter(), makeMissionCommandStage34GateC3ReviewAdapter(), interruptedProvider, Object.assign({}, auth, { runTimestamp: '2026-07-13T19:30:00Z' }));
  var f38Rejected = withMissionCommandStage34GateI5CScope(function() { return validateMissionCommandStage34GateC3Request('MC34-I4-F38', makeMissionCommandStage34GateC3Request('MC34-I4-F38').request || {}); });
  var schema = withMissionCommandStage34GateI5CScope(function() { return getMissionCommandStage34GateC3ProviderCandidateSchema(); });
  return {
    ok: flags.enabled === false && flags.killSwitchEnabled === true && direct.stopCondition === 'i5c_wrapper_authorization_missing' &&
      consumedI5B.stopCondition === 'i5c_wrapper_authorization_missing' && directRuntime.rows.length === 0 && directProvider.calls.length === 0 &&
      success.ok === true && success.childrenWritten === 4 && success.reviewRowsComplete === 4 && success.actualFetchAttempts === 4 &&
      duplicate.status === 'duplicate_suppressed' && duplicateProvider.calls.length === 0 && interrupted.status === 'interrupted' &&
      interrupted.failedFixtureId === 'MC34-I4-F36' && interrupted.retryCount === 0 && interrupted.fallbackUsed === false &&
      f38Rejected.ok === false && schema.required.length === 28 && Object.keys(schema.properties).length === 28 &&
      schema.additionalProperties === false && schema.properties.fixture_id.enum.join('|') === MC_STAGE34_GATE_I5C_FIXTURE_IDS.join('|'),
    build: MC_STAGE34_GATE_I5C_BUILD, fixtureIds: MC_STAGE34_GATE_I5C_FIXTURE_IDS.slice(), wrapperName: MC_STAGE34_GATE_I5C_WRAPPER_NAME,
    runId: MC_STAGE34_GATE_I5C_RUN_ID, batchKey: MC_STAGE34_GATE_I5C_BATCH_KEY, relatedObject: MC_STAGE34_GATE_I5C_RELATED_OBJECT,
    flagsDefaultOff: flags.enabled === false && flags.killSwitchEnabled === true, directBlocked: direct.stopCondition === 'i5c_wrapper_authorization_missing',
    consumedI5BIdentityRejected: consumedI5B.stopCondition === 'i5c_wrapper_authorization_missing', f38Inactive: f38Rejected.ok === false,
    successChildren: success.childrenWritten || 0, successReviewRows: success.reviewRowsComplete || 0,
    duplicateSuppressedBeforeProvider: duplicate.status === 'duplicate_suppressed' && duplicateProvider.calls.length === 0,
    interruptionDurable: interrupted.status === 'interrupted' && interrupted.retryCount === 0 && interrupted.fallbackUsed === false,
    wrapperPrepared: false, wrapperRemovedAfterManualRun: true, manualRunConsumed: true,
    manualRunSafeStatus: 'manual_run_appears_successful_parent_four_children_four_batch_c_review_rows_visible_evidence_only',
    wrapperInvokedByIntegration: false, liveServicesTouched: false, routeCreated: false,
    triggerInstall: false, visibleDelivery: false, dispatch: false, externalWrite: false, readyForOneRunDecision: false
  };
}

// Mission Command Stage 3.4 post-H3 Gate I5D Batch D local preparation only.
// Only final frozen fixture F38 is active inside the scoped coordinator; the wrapper is editor-only and uninvoked.
var MC_STAGE34_GATE_I5D_BUILD = 'mmos-20260713-stage3-4-post-h3-gate-i5d-batch-d-local-preparation';
var MC_STAGE34_GATE_I5D_ENABLED = false;
var MC_STAGE34_GATE_I5D_KILL_SWITCH = true;
var MC_STAGE34_GATE_I5D_MANIFEST_SHA256 = '13118bddc89cc986f36e5066c0e090941dc859a8863202b3eaede2fda6d1df64';
var MC_STAGE34_GATE_I5D_FIXTURE_IDS = ['MC34-I4-F38'];
var MC_STAGE34_GATE_I5D_WRAPPER_NAME = 'runMissionCommandStage34GateI5DApprovedSyntheticBatchDOnce';
var MC_STAGE34_GATE_I5D_RUN_ID = 'mc_stage34_gate_i5d_batch_d_20260713_manual_001';
var MC_STAGE34_GATE_I5D_BATCH_KEY = '790a46a38f3936d93fd7ca265588d76622cdab0d2739838135b9d1cf761306c2';
var MC_STAGE34_GATE_I5D_RELATED_OBJECT = 'mc34b3:790a46a38f3936d93fd7ca265588d76622cdab0d2739838135b9d1cf761306c2';
var MC_STAGE34_GATE_I5D_AUTH_TOKEN = 'stage34_gate_i5d_batch_d_manual_001_6a1b94a7d1d78e97ace28fd11c53052f09566fa4ef43cd8ac0798b7eb75635c2';

function getMissionCommandStage34GateI5DFixtureMap() {
  return {
    'MC34-I4-F38': {
      revised_id: 'MC34-I4-F38-D1', role_owner: 'executive_assistant', family: 'executive_assistant_critical', priority: 'critical',
      object_type: 'project_decision', object_label: 'Synthetic Project Eta risk-threshold decision',
      source_labels: ['synthetic_shadow_fixture', 'runtime_receipt_hash_link'], grounding_state: 'grounded_synthetic',
      grounding_evidence: 'The synthetic project fixture records a risk-state change above its review threshold.',
      decision_needed: 'Choose approve or revise for the synthetic risk response.',
      why_now: 'The synthetic risk state crossed its review threshold today while downstream work remains parked.',
      material_change_code: 'state_changed', material_change_summary: 'The project changed from below-threshold monitoring to above-threshold A1XX review.',
      next_move_type: 'approve_or_revise', next_move_text: 'Choose approve or revise for the synthetic risk response.', next_move_count: 1,
      candidate_text: 'Synthetic Project Eta crossed its risk review threshold while downstream work remains parked. Choose approve or revise for the synthetic response.',
      confidence: 0.89, should_deliver: false, escalated_from: '', escalated_to: '', chief_context_summary: '', executive_decision_required: '', companion_chief_candidate_state: '', suppression_evidence_state: ''
    }
  };
}

function getMissionCommandStage34GateI5DFlags(input) {
  input = input || {};
  var authorized = input.approvedManualRun === true && input.wrapperAuthorization === true &&
    input.authorizationToken === MC_STAGE34_GATE_I5D_AUTH_TOKEN && input.runId === MC_STAGE34_GATE_I5D_RUN_ID &&
    input.batchKey === MC_STAGE34_GATE_I5D_BATCH_KEY && input.manifestSha256 === MC_STAGE34_GATE_I5D_MANIFEST_SHA256;
  return {
    enabled: MC_STAGE34_GATE_I5D_ENABLED === true && MC_STAGE34_GATE_I5D_KILL_SWITCH !== true,
    killSwitchEnabled: MC_STAGE34_GATE_I5D_KILL_SWITCH === true, wrapperAuthorized: authorized,
    routeEnabled: false, triggerEnabled: false, visibleDeliveryEnabled: false, dispatchEnabled: false,
    externalWriteEnabled: false, retryEnabled: false, fallbackEnabled: false
  };
}

function makeMissionCommandStage34GateI5DWrapperAuthorization() {
  return { approvedManualRun: true, wrapperAuthorization: true, authorizationToken: MC_STAGE34_GATE_I5D_AUTH_TOKEN,
    runId: MC_STAGE34_GATE_I5D_RUN_ID, batchKey: MC_STAGE34_GATE_I5D_BATCH_KEY, manifestSha256: MC_STAGE34_GATE_I5D_MANIFEST_SHA256 };
}

function withMissionCommandStage34GateI5DScope(callback) {
  var prior = { fixtureIds: MC_STAGE34_GATE_B3A_FIXTURE_IDS, build: MC_STAGE34_GATE_C3_BUILD,
    wrapperName: MC_STAGE34_GATE_C3_WRAPPER_NAME, runId: MC_STAGE34_GATE_C3_RUN_ID,
    batchKey: MC_STAGE34_GATE_C3_BATCH_KEY, relatedObject: MC_STAGE34_GATE_C3_RELATED_OBJECT, authToken: MC_STAGE34_GATE_C3_AUTH_TOKEN };
  MC_STAGE34_GATE_B3A_FIXTURE_IDS = MC_STAGE34_GATE_I5D_FIXTURE_IDS.slice();
  MC_STAGE34_GATE_C3_BUILD = MC_STAGE34_GATE_I5D_BUILD; MC_STAGE34_GATE_C3_WRAPPER_NAME = MC_STAGE34_GATE_I5D_WRAPPER_NAME;
  MC_STAGE34_GATE_C3_RUN_ID = MC_STAGE34_GATE_I5D_RUN_ID; MC_STAGE34_GATE_C3_BATCH_KEY = MC_STAGE34_GATE_I5D_BATCH_KEY;
  MC_STAGE34_GATE_C3_RELATED_OBJECT = MC_STAGE34_GATE_I5D_RELATED_OBJECT; MC_STAGE34_GATE_C3_AUTH_TOKEN = MC_STAGE34_GATE_I5D_AUTH_TOKEN;
  try { return callback(); }
  finally {
    MC_STAGE34_GATE_B3A_FIXTURE_IDS = prior.fixtureIds; MC_STAGE34_GATE_C3_BUILD = prior.build;
    MC_STAGE34_GATE_C3_WRAPPER_NAME = prior.wrapperName; MC_STAGE34_GATE_C3_RUN_ID = prior.runId;
    MC_STAGE34_GATE_C3_BATCH_KEY = prior.batchKey; MC_STAGE34_GATE_C3_RELATED_OBJECT = prior.relatedObject; MC_STAGE34_GATE_C3_AUTH_TOKEN = prior.authToken;
  }
}

function runMissionCommandStage34GateI5DBatchD(runtimeAdapter, reviewAdapter, providerAdapter, input) {
  input = input || {};
  var flags = getMissionCommandStage34GateI5DFlags(input);
  if (!flags.wrapperAuthorized) return makeMissionCommandStage34GateC3Blocked('i5d_wrapper_authorization_missing', 'Gate I5D Batch D requires the exact future editor-wrapper identity.');
  return withMissionCommandStage34GateI5DScope(function() {
    return runMissionCommandStage34GateC3CandidateV2Batch(runtimeAdapter, reviewAdapter, providerAdapter, {
      approvedManualRun: true, wrapperAuthorization: true, authorizationToken: MC_STAGE34_GATE_I5D_AUTH_TOKEN,
      runId: MC_STAGE34_GATE_I5D_RUN_ID, batchKey: MC_STAGE34_GATE_I5D_BATCH_KEY, runTimestamp: input.runTimestamp || ''
    });
  });
}

function verifyMissionCommandStage34GateI5DLocalChecks() {
  var flags = getMissionCommandStage34GateI5DFlags();
  var directRuntime = makeMissionCommandStage34GateB3AFakeRuntimeAdapter();
  var directProvider = makeMissionCommandStage34GateC3FakeProviderAdapter();
  var direct = runMissionCommandStage34GateI5DBatchD(directRuntime, makeMissionCommandStage34GateC3ReviewAdapter(), directProvider, {});
  var auth = makeMissionCommandStage34GateI5DWrapperAuthorization();
  var consumedI5C = runMissionCommandStage34GateI5DBatchD(directRuntime, makeMissionCommandStage34GateC3ReviewAdapter(), directProvider,
    Object.assign({}, auth, { authorizationToken: MC_STAGE34_GATE_I5C_AUTH_TOKEN, runId: MC_STAGE34_GATE_I5C_RUN_ID, batchKey: MC_STAGE34_GATE_I5C_BATCH_KEY }));
  var successRuntime = makeMissionCommandStage34GateB3AFakeRuntimeAdapter();
  var successReview = makeMissionCommandStage34GateC3ReviewAdapter();
  var successProvider = makeMissionCommandStage34GateC3FakeProviderAdapter();
  var success = runMissionCommandStage34GateI5DBatchD(successRuntime, successReview, successProvider, Object.assign({}, auth, { runTimestamp: '2026-07-13T20:00:00Z' }));
  var duplicateProvider = makeMissionCommandStage34GateC3FakeProviderAdapter();
  var duplicate = runMissionCommandStage34GateI5DBatchD(successRuntime, successReview, duplicateProvider, Object.assign({}, auth, { runTimestamp: '2026-07-13T20:00:00Z' }));
  var interruptedProvider = makeMissionCommandStage34GateC3FakeProviderAdapter({ failFixtureId: 'MC34-I4-F38' });
  var interrupted = runMissionCommandStage34GateI5DBatchD(makeMissionCommandStage34GateB3AFakeRuntimeAdapter(), makeMissionCommandStage34GateC3ReviewAdapter(), interruptedProvider, Object.assign({}, auth, { runTimestamp: '2026-07-13T20:00:00Z' }));
  var priorRejected = withMissionCommandStage34GateI5DScope(function() { return validateMissionCommandStage34GateC3Request('MC34-I4-F37', makeMissionCommandStage34GateC3Request('MC34-I4-F37').request || {}); });
  var schema = withMissionCommandStage34GateI5DScope(function() { return getMissionCommandStage34GateC3ProviderCandidateSchema(); });
  return {
    ok: flags.enabled === false && flags.killSwitchEnabled === true && direct.stopCondition === 'i5d_wrapper_authorization_missing' &&
      consumedI5C.stopCondition === 'i5d_wrapper_authorization_missing' && directRuntime.rows.length === 0 && directProvider.calls.length === 0 &&
      success.ok === true && success.childrenWritten === 1 && success.reviewRowsComplete === 1 && success.actualFetchAttempts === 1 &&
      duplicate.status === 'duplicate_suppressed' && duplicateProvider.calls.length === 0 && interrupted.status === 'interrupted' &&
      interrupted.failedFixtureId === 'MC34-I4-F38' && interrupted.retryCount === 0 && interrupted.fallbackUsed === false &&
      priorRejected.ok === false && schema.required.length === 28 && Object.keys(schema.properties).length === 28 &&
      schema.additionalProperties === false && schema.properties.fixture_id.enum.join('|') === MC_STAGE34_GATE_I5D_FIXTURE_IDS.join('|'),
    build: MC_STAGE34_GATE_I5D_BUILD, fixtureIds: MC_STAGE34_GATE_I5D_FIXTURE_IDS.slice(), wrapperName: MC_STAGE34_GATE_I5D_WRAPPER_NAME,
    runId: MC_STAGE34_GATE_I5D_RUN_ID, batchKey: MC_STAGE34_GATE_I5D_BATCH_KEY, relatedObject: MC_STAGE34_GATE_I5D_RELATED_OBJECT,
    flagsDefaultOff: flags.enabled === false && flags.killSwitchEnabled === true, directBlocked: direct.stopCondition === 'i5d_wrapper_authorization_missing',
    consumedI5CIdentityRejected: consumedI5C.stopCondition === 'i5d_wrapper_authorization_missing', priorFixturesInactive: priorRejected.ok === false,
    successChildren: success.childrenWritten || 0, successReviewRows: success.reviewRowsComplete || 0,
    duplicateSuppressedBeforeProvider: duplicate.status === 'duplicate_suppressed' && duplicateProvider.calls.length === 0,
    interruptionDurable: interrupted.status === 'interrupted' && interrupted.retryCount === 0 && interrupted.fallbackUsed === false,
    wrapperPrepared: false, wrapperRemovedAfterManualRun: true, manualRunConsumed: true,
    manualRunSafeStatus: 'manual_run_appears_successful_parent_one_child_one_batch_d_f38_review_row_visible_evidence_only',
    accountingCaution: 'parent_safe_summary_max_calls_4_while_exact_active_fixture_and_actual_authorized_attempt_count_are_1_preserve_history',
    wrapperInvokedByIntegration: false, liveServicesTouched: false, routeCreated: false,
    triggerInstall: false, visibleDelivery: false, dispatch: false, externalWrite: false, readyForOneRunDecision: false
  };
}

function getMissionCommandVoiceProbeV25(params) {
  params = params || {};
  var text = sanitizeMissionCommandVoiceTextV25(params.text || '');
  if (!text) {
    return voiceProbeJsonV25({
      ok: false,
      status: 'blocked',
      message: 'No speakable Mission Command text was provided.',
      audioBase64: '',
      mimeType: '',
      appWrite: false,
      tokenExport: false,
      secretExport: false
    });
  }

  var props = PropertiesService.getScriptProperties();
  var apiKey = String(props.getProperty('ELEVENLABS_API_KEY') || '').trim();
  var voiceId = String(props.getProperty('ELEVENLABS_VOICE_ID') || '').trim();
  var modelId = String(props.getProperty('ELEVENLABS_MODEL_ID') || 'eleven_multilingual_v2').trim();

  if (!apiKey) {
    return voiceProbeJsonV25({
      ok: false,
      status: 'blocked',
      message: 'Voice key is not configured in Apps Script.',
      audioBase64: '',
      mimeType: '',
      appWrite: false,
      tokenExport: false,
      secretExport: false
    });
  }
  if (!voiceId) {
    return voiceProbeJsonV25({
      ok: false,
      status: 'blocked',
      message: 'Voice ID is not configured in Apps Script.',
      audioBase64: '',
      mimeType: '',
      appWrite: false,
      tokenExport: false,
      secretExport: false
    });
  }

  var url = 'https://api.elevenlabs.io/v1/text-to-speech/' + encodeURIComponent(voiceId);
  var payload = {
    text: text,
    model_id: modelId,
    voice_settings: {
      stability: 0.44,
      similarity_boost: 0.78,
      style: 0.18,
      use_speaker_boost: true
    }
  };
  var response;
  try {
    response = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'xi-api-key': apiKey,
        'Accept': 'audio/mpeg'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
  } catch (err) {
    return voiceProbeJsonV25({
      ok: false,
      status: 'error',
      message: 'Voice relay could not reach provider.',
      voiceErrorCode: 'voice_relay_fetch_error',
      voiceErrorHint: 'Check Apps Script authorization, deployment access, and external fetch access.',
      audioBase64: '',
      mimeType: '',
      appWrite: false,
      tokenExport: false,
      secretExport: false
    });
  }
  var code = response.getResponseCode();
  if (code < 200 || code >= 300) {
    var voiceError = getMissionCommandVoiceHttpErrorV25(code, response.getContentText());
    return voiceProbeJsonV25({
      ok: false,
      status: 'error',
      message: voiceError.message,
      httpStatus: code,
      voiceErrorCode: voiceError.code,
      voiceErrorHint: voiceError.hint,
      audioBase64: '',
      mimeType: '',
      appWrite: false,
      tokenExport: false,
      secretExport: false
    });
  }

  var bytes = response.getBlob().getBytes();
  if (!bytes || !bytes.length) {
    return voiceProbeJsonV25({
      ok: false,
      status: 'missing_audio',
      message: 'Voice relay answered, but no audio was returned.',
      audioBase64: '',
      mimeType: '',
      appWrite: false,
      tokenExport: false,
      secretExport: false
    });
  }

  return voiceProbeJsonV25({
    ok: true,
    status: 'ready',
    provider: 'elevenlabs',
    relay: 'apps_script',
    action: 'mission_command_voice_probe',
    firstBubbleOnly: true,
    sanitizedTextOnly: true,
    audioBase64: Utilities.base64Encode(bytes),
    mimeType: 'audio/mpeg',
    durationMs: 0,
    message: 'Voice ready.',
    appWrite: false,
    tokenExport: false,
    secretExport: false
  });
}

function getMissionCommandVoiceHttpErrorV25(code, bodyText) {
  var body = String(bodyText || '').slice(0, 1200).toLowerCase();
  if (code === 401 || code === 403 || /invalid api key|unauthorized|forbidden|xi-api-key|api key/.test(body)) {
    return {
      code: 'voice_key_rejected',
      message: 'Voice key rejected.',
      hint: 'Check ELEVENLABS_API_KEY in Apps Script Properties.'
    };
  }
  if (code === 404 || /voice.*not.*found|voice_not_found|voice id|not found/.test(body)) {
    return {
      code: 'voice_id_not_found',
      message: 'Voice ID not found.',
      hint: 'Check ELEVENLABS_VOICE_ID in Apps Script Properties.'
    };
  }
  if (code === 429 || /rate limit|too many requests|quota|credits|subscription|character/.test(body)) {
    return {
      code: 'voice_quota_or_plan',
      message: 'Voice quota or plan needs attention.',
      hint: 'Check ElevenLabs quota, credits, rate limits, or plan access.'
    };
  }
  if (/model|model_id|unsupported model/.test(body)) {
    return {
      code: 'voice_model_error',
      message: 'Voice model needs attention.',
      hint: 'Check ELEVENLABS_MODEL_ID or leave it blank for the default model.'
    };
  }
  if (code === 400 || code === 422 || /invalid|validation|voice_settings|text|request/.test(body)) {
    return {
      code: 'voice_request_invalid',
      message: 'Voice request needs attention.',
      hint: 'Check the voice request shape and selected voice settings.'
    };
  }
  if (code >= 500) {
    return {
      code: 'voice_provider_unavailable',
      message: 'Voice provider is busy.',
      hint: 'Try again after the provider is available.'
    };
  }
  return {
    code: 'voice_relay_http_error',
    message: 'Voice relay could not create audio.',
    hint: 'Check ElevenLabs settings and deployment.'
  };
}

function sanitizeMissionCommandVoiceTextV25(value) {
  var text = String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/\b(api\s*key|secret|token|bearer|authorization|webhook|localStorage|sessionStorage|raw json|raw id|Notion ID)\b\s*[:=-]?\s*/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length > 900) text = text.slice(0, 900).trim();
  return text;
}

function voiceProbeJsonV25(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload || {}))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleLogChange(data) {
  var ss = getMoneyMissionSpreadsheet();
  var sheet = ss.getSheetByName('Dev Log');
  if (!sheet) {
    sheet = ss.insertSheet('Dev Log');
    sheet.appendRow(['Timestamp', 'Agent', 'Layer', 'Summary', 'Session', 'Raw TS']);
    sheet.setFrozenRows(1);
    sheet.getRange('A1:F1').setFontWeight('bold');
  }
  sheet.appendRow([
    new Date().toLocaleString('en-US', {timeZone: 'America/New_York'}),
    data.agent || 'Unknown', data.layer || '—',
    data.summary || '', data.session || '',
    data.ts || new Date().toISOString()
  ]);
}

// ── RESET TEST DATA (NEW in 1.7) ────────────────────────────
// Archives every cleared row to "Reset Audit" tab as JSON,
// then truncates the targeted tab(s) below the header row.
// Never deletes audit history. Headers always preserved.
function resetTestData(d) {
  var ss = getMoneyMissionSpreadsheet();
  var audit = getOrCreateSheet(ss, SHEET_RESET_AUDIT, RESET_AUDIT_HEADERS);
  var nowIso = new Date().toISOString();
  var reason = String(d.reason || 'no reason provided').slice(0, 500);
  var result = { dailyCleared: 0, prospectsCleared: 0, reason: reason, resetAt: nowIso };

  function archiveAndTruncate(sheetName, headers){
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet || sheet.getLastRow() < 2) return 0;
    var last = sheet.getLastRow();
    var lastCol = headers.length;
    var values = sheet.getRange(2, 1, last - 1, lastCol).getValues();
    // append archive rows in batch
    var auditRows = values.map(function(row){
      var obj = {};
      for (var i = 0; i < headers.length; i++) obj[headers[i]] = row[i];
      return [nowIso, reason, sheetName, JSON.stringify(obj)];
    });
    if (auditRows.length) {
      audit.getRange(audit.getLastRow() + 1, 1, auditRows.length, RESET_AUDIT_HEADERS.length).setValues(auditRows);
    }
    // truncate the source sheet below the header row
    sheet.getRange(2, 1, last - 1, lastCol).clearContent();
    return values.length;
  }

  if (d.daily) {
    result.dailyCleared = archiveAndTruncate(SHEET_DAILY, DAILY_HEADERS);
  }
  if (d.prospects) {
    result.prospectsCleared = archiveAndTruncate(SHEET_PROSPECTS, PROSPECT_HEADERS);
  }
  return result;
}

// ── DAILY LOG (v1.5) ───────────────────────────────────────
function saveDailySnapshot(d) {
  var lock = LockService.getScriptLock();
  var locked = false;
  try {
    lock.waitLock(10000);
    locked = true;
    var ss = getMoneyMissionSpreadsheet();
    var sheet = getOrCreateSheet(ss, SHEET_DAILY, DAILY_HEADERS);
    var date = String(d.date || '').slice(0, 10);
    if (!date) throw new Error('daily_save: missing date');
    var saveMode = (d.mode === 'add') ? 'add' : 'replace';
    var nowIso = new Date().toISOString();

    var last = sheet.getLastRow();
    var rowIdx = -1; var existing = null;
    if (last > 1) {
      var dates = sheet.getRange(2, 1, last - 1, 1).getValues();
      for (var i = 0; i < dates.length; i++) {
        var v = dates[i][0];
        var vStr = (v instanceof Date) ? Utilities.formatDate(v, 'UTC', 'yyyy-MM-dd') : String(v).slice(0, 10);
        if (vStr === date) {
          rowIdx = i + 2;
          existing = sheet.getRange(rowIdx, 1, 1, DAILY_HEADERS.length).getValues()[0];
          break;
        }
      }
    }
    var prev = existing ? {
      dms: parseFloat(existing[1]) || 0, coldCalls: parseFloat(existing[2]) || 0,
      content: parseFloat(existing[3]) || 0, calls: parseFloat(existing[4]) || 0,
      closes: parseFloat(existing[5]) || 0, money: parseFloat(existing[6]) || 0,
      leads: parseFloat(existing[7]) || 0,
      firstSaved: existing[8] || nowIso, saveCount: parseFloat(existing[10]) || 0
    } : { dms:0,coldCalls:0,content:0,calls:0,closes:0,money:0,leads:0,firstSaved:nowIso,saveCount:0 };

    var next;
    if (saveMode === 'add') {
      next = {
        dms: prev.dms + (parseFloat(d.dms) || 0),
        coldCalls: prev.coldCalls + (parseFloat(d.coldCalls) || 0),
        content: prev.content + (parseFloat(d.content) || 0),
        calls: prev.calls + (parseFloat(d.calls) || 0),
        closes: prev.closes + (parseFloat(d.closes) || 0),
        money: prev.money + (parseFloat(d.money) || 0),
        leads: prev.leads + (parseFloat(d.leads) || 0)
      };
    } else {
      next = {
        dms: parseFloat(d.dms) || 0, coldCalls: parseFloat(d.coldCalls) || 0,
        content: parseFloat(d.content) || 0, calls: parseFloat(d.calls) || 0,
        closes: parseFloat(d.closes) || 0, money: parseFloat(d.money) || 0,
        leads: parseFloat(d.leads) || 0
      };
    }
    var row = [
      date, next.dms, next.coldCalls, next.content, next.calls, next.closes, next.money, next.leads,
      prev.firstSaved, nowIso, prev.saveCount + 1
    ];
    if (rowIdx > 0) sheet.getRange(rowIdx, 1, 1, DAILY_HEADERS.length).setValues([row]);
    else sheet.appendRow(row);
    return {
      date: date, mode: saveMode,
      dms: next.dms, coldCalls: next.coldCalls, content: next.content,
      calls: next.calls, closes: next.closes, money: next.money, leads: next.leads,
      firstSavedAt: prev.firstSaved, lastUpdatedAt: nowIso, saveCount: prev.saveCount + 1
    };
  } finally {
    if (locked) lock.releaseLock();
  }
}

function getDailyLog(e) {
  var ss = getMoneyMissionSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_DAILY);
  if (!sheet || sheet.getLastRow() < 2) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'ok', rows: [] }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  var start = (e.parameter.start || '').slice(0, 10);
  var end = (e.parameter.end || '').slice(0, 10);
  var only = (e.parameter.date || '').slice(0, 10);
  var last = sheet.getLastRow();
  var values = sheet.getRange(2, 1, last - 1, DAILY_HEADERS.length).getValues();
  var rows = [];
  for (var i = 0; i < values.length; i++) {
    var r = values[i];
    var rawDate = r[0];
    var dStr = (rawDate instanceof Date) ? Utilities.formatDate(rawDate, 'UTC', 'yyyy-MM-dd') : String(rawDate).slice(0, 10);
    if (!dStr) continue;
    if (only && dStr !== only) continue;
    if (start && dStr < start) continue;
    if (end && dStr > end) continue;
    rows.push({
      date: dStr, dms: parseFloat(r[1]) || 0, coldCalls: parseFloat(r[2]) || 0,
      content: parseFloat(r[3]) || 0, calls: parseFloat(r[4]) || 0,
      closes: parseFloat(r[5]) || 0, money: parseFloat(r[6]) || 0, leads: parseFloat(r[7]) || 0,
      firstSavedAt: r[8] || '', lastUpdatedAt: r[9] || '', saveCount: parseFloat(r[10]) || 0
    });
  }
  logActivity('Daily log read — ' + rows.length + ' rows');
  return ContentService.createTextOutput(JSON.stringify({ status: 'ok', rows: rows }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── CAPTURED LEADS (v1.6) ─────────────────────────────
function saveProspectSnapshot(d) {
  var lock = LockService.getScriptLock();
  var locked = false;
  try {
    lock.waitLock(10000);
    locked = true;
    var ss = getMoneyMissionSpreadsheet();
    var sheet = getOrCreateSheet(ss, SHEET_PROSPECTS, PROSPECT_HEADERS);
    var nowIso = new Date().toISOString();
    var id = String(d.id || '').trim();
    if (!id) throw new Error('prospect_save: missing id (uuid required)');
    var idCol = PROSPECT_HEADERS.indexOf('ID') + 1;
    var last = sheet.getLastRow();
    var rowIdx = -1; var existing = null;
    if (last > 1) {
      var ids = sheet.getRange(2, idCol, last - 1, 1).getValues();
      for (var i = 0; i < ids.length; i++) {
        if (String(ids[i][0]) === id) {
          rowIdx = i + 2;
          existing = sheet.getRange(rowIdx, 1, 1, PROSPECT_HEADERS.length).getValues()[0];
          break;
        }
      }
    }
    var prev = existing ? {
      firstSaved: existing[0] || nowIso,
      saveCount: parseFloat(existing[16]) || 0
    } : { firstSaved: nowIso, saveCount: 0 };
    var row = [
      prev.firstSaved, d.stageName || '', d.realName || '', d.phone || '',
      d.email || '', d.instagram || '', d.threads || '', d.website || '',
      d.source || '', d.stage || '', d.hot ? 'YES' : '', d.atl ? 'YES' : '',
      d.firstTouch || '', d.nextAction || '', d.followUpDate || '', d.notes || '',
      prev.saveCount + 1, id, nowIso, ''
    ];
    if (rowIdx > 0) sheet.getRange(rowIdx, 1, 1, PROSPECT_HEADERS.length).setValues([row]);
    else sheet.appendRow(row);
    return { id: id, firstSavedAt: prev.firstSaved, lastUpdatedAt: nowIso, saveCount: prev.saveCount + 1 };
  } finally {
    if (locked) lock.releaseLock();
  }
}

function deleteProspectRow(id) {
  if (!id) return false;
  var ss = getMoneyMissionSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_PROSPECTS);
  if (!sheet || sheet.getLastRow() < 2) return false;
  var idCol = PROSPECT_HEADERS.indexOf('ID') + 1;
  var delCol = PROSPECT_HEADERS.indexOf('Deleted At') + 1;
  var last = sheet.getLastRow();
  var ids = sheet.getRange(2, idCol, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) {
      sheet.getRange(i + 2, delCol).setValue(new Date().toISOString());
      return true;
    }
  }
  return false;
}

function getProspectLog(e) {
  var ss = getMoneyMissionSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_PROSPECTS);
  if (!sheet || sheet.getLastRow() < 2) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'ok', rows: [] }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  var includeDeleted = (e.parameter.includeDeleted === '1' || e.parameter.includeDeleted === 'true');
  var last = sheet.getLastRow();
  var values = sheet.getRange(2, 1, last - 1, PROSPECT_HEADERS.length).getValues();
  var rows = [];
  for (var i = 0; i < values.length; i++) {
    var r = values[i];
    var deletedAt = String(r[19] || '');
    if (deletedAt && !includeDeleted) continue;
    rows.push({
      firstSavedAt: r[0] || '', stageName: r[1] || '', realName: r[2] || '',
      phone: r[3] || '', email: r[4] || '', instagram: r[5] || '',
      threads: r[6] || '', website: r[7] || '', source: r[8] || '',
      stage: r[9] || '', hot: String(r[10]).toUpperCase() === 'YES',
      atl: String(r[11]).toUpperCase() === 'YES', firstTouch: r[12] || '',
      nextAction: r[13] || '', followUpDate: r[14] || '', notes: r[15] || '',
      saveCount: parseFloat(r[16]) || 0, id: r[17] || '',
      lastUpdatedAt: r[18] || '', deletedAt: deletedAt
    });
  }
  logActivity('Prospect log read — ' + rows.length + ' rows');
  return ContentService.createTextOutput(JSON.stringify({ status: 'ok', rows: rows }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── CACHE HELPER ─────────────────────────────────────────────
function notionQuery(databaseId, payload, cacheKey) {
  var cache = CacheService.getScriptCache();
  if (cacheKey) {
    var hit = cache.get(cacheKey);
    if (hit) { logActivity('Cache hit — ' + cacheKey); return { text: hit, code: 200 }; }
  }
  var secret = PropertiesService.getScriptProperties().getProperty('NOTION_SECRET');
  var opts = { method: 'post',
    headers: { Authorization: 'Bearer ' + secret, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' },
    payload: JSON.stringify(payload), muteHttpExceptions: true };
  var res = UrlFetchApp.fetch('https://api.notion.com/v1/databases/' + databaseId + '/query', opts);
  var code = res.getResponseCode();
  if (code >= 500) {
    Utilities.sleep(2000);
    res = UrlFetchApp.fetch('https://api.notion.com/v1/databases/' + databaseId + '/query', opts);
    code = res.getResponseCode();
  }
  var text = res.getContentText();
  if (cacheKey && code < 400) { try { if (text.length < 90000) cache.put(cacheKey, text, 600); } catch (e) {} }
  return { text: text, code: code };
}

function notionRequest(method, url, payload) {
  var secret = PropertiesService.getScriptProperties().getProperty('NOTION_SECRET');
  var opts = {
    method: method,
    headers: { Authorization: 'Bearer ' + secret, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' },
    muteHttpExceptions: true
  };
  if (payload) opts.payload = JSON.stringify(payload);
  var res = UrlFetchApp.fetch(url, opts);
  var code = res.getResponseCode();
  if (code >= 500) {
    Utilities.sleep(2000);
    res = UrlFetchApp.fetch(url, opts);
    code = res.getResponseCode();
  }
  return { text: res.getContentText(), code: code };
}

function syncDailyDpcToNotion(row, source) {
  try {
    var dayType = normalizeDailyDayType(source.dayType);
    var properties = {
      'Name': notionTitle('Daily DPC Log — ' + row.date),
      'Date': { date: { start: row.date } },
      'DMs Sent': { number: row.dms || 0 },
      'Calls Made': { number: row.coldCalls || 0 },
      'Content Posted': { number: row.content || 0 },
      'Calls Booked': { number: row.calls || 0 },
      'Closes': { number: row.closes || 0 },
      'Money Collected': { number: row.money || 0 },
      'New Warm Leads': { number: row.leads || 0 },
      'Streak Hit': { checkbox: isDailyStreakHit(row) },
      'Cycle': notionText(source.cycle || ''),
      'Notes': notionText(source.notes || '')
    };
    if (dayType) properties['Day Type'] = { select: { name: dayType } };

    var query = notionQuery(NOTION_OPS_DAILY_DB, {
      filter: { property: 'Date', date: { equals: row.date } },
      page_size: 1
    });
    if (query.code >= 400) {
      logActivity('Notion Daily DPC query — code: ' + query.code + ' — ' + query.text);
      return { status: 'error', stage: 'query', code: query.code };
    }
    var parsed = JSON.parse(query.text || '{}');
    var existing = parsed.results && parsed.results.length ? parsed.results[0] : null;
    var result = existing
      ? notionRequest('patch', 'https://api.notion.com/v1/pages/' + existing.id, { properties: properties })
      : notionRequest('post', 'https://api.notion.com/v1/pages', { parent: { database_id: NOTION_OPS_DAILY_DB }, properties: properties });

    logActivity('Notion Daily DPC upsert — ' + row.date + ' — code: ' + result.code);
    return { status: result.code < 400 ? 'ok' : 'error', stage: existing ? 'update' : 'create', code: result.code };
  } catch (err) {
    logActivity('Notion Daily DPC ERROR: ' + err.toString());
    return { status: 'error', message: err.toString() };
  }
}

function syncWeeklyReviewToNotion(row, source) {
  try {
    var weekOf = row.weekOf || source.weekOf || mondayDateKey(new Date());
    logActivity('Notion Weekly Review sync starting — ' + weekOf + ' — db: ' + NOTION_OPS_WEEKLY_DB);
    var properties = {
      'Name': notionTitle('Weekly Review — ' + weekOf),
      'Week Of': { date: { start: weekOf } },
      'Cycle': notionText(row.cycle || ''),
      'Revenue This Week': { number: row.revenue || 0 },
      'Week Target': { number: row.weekTarget || 0 },
      'Ad Spend': { number: row.adSpend || 0 },
      'Software & Tools': { number: row.software || 0 },
      'Other Expenses': { number: row.otherExp || 0 },
      'DMs Sent': { number: row.dms || 0 },
      'Calls Booked': { number: row.callsBooked || 0 },
      'Closes': { number: row.closes || 0 },
      'Content Posted': { number: row.content || 0 },
      'Sessions Closed': { number: row.sessions || 0 },
      'Big Win': notionText(row.bigWin || ''),
      'Biggest Lesson': notionText(row.biggestLesson || '')
    };

    var query = notionQuery(NOTION_OPS_WEEKLY_DB, {
      filter: { property: 'Week Of', date: { equals: weekOf } },
      page_size: 1
    });
    logActivity('Notion Weekly Review query — ' + weekOf + ' — code: ' + query.code);
    if (query.code >= 400) {
      logActivity('Notion Weekly Review query — code: ' + query.code + ' — ' + query.text);
      return { status: 'error', stage: 'query', code: query.code };
    }
    var parsed = JSON.parse(query.text || '{}');
    var existing = parsed.results && parsed.results.length ? parsed.results[0] : null;
    var result = existing
      ? notionRequest('patch', 'https://api.notion.com/v1/pages/' + existing.id, { properties: properties })
      : notionRequest('post', 'https://api.notion.com/v1/pages', { parent: { database_id: NOTION_OPS_WEEKLY_DB }, properties: properties });

    logActivity('Notion Weekly Review upsert — ' + weekOf + ' — code: ' + result.code);
    if (result.code >= 400) logActivity('Notion Weekly Review upsert error — code: ' + result.code + ' — ' + result.text);
    return { status: result.code < 400 ? 'ok' : 'error', stage: existing ? 'update' : 'create', code: result.code };
  } catch (err) {
    logActivity('Notion Weekly Review ERROR: ' + err.toString());
    return { status: 'error', message: err.toString() };
  }
}

function syncCycleArchiveToNotion(row, source) {
  try {
    var cycleNum = parseFloat(row.cycleNum || source.cycleNum) || 0;
    logActivity('Notion Cycle Archive sync starting — Cycle ' + cycleNum + ' — db: ' + NOTION_OPS_CYCLE_DB);
    var properties = {
      'Cycle Name': notionTitle(row.cycleName || ('Cycle ' + cycleNum)),
      'Cycle Number': { number: cycleNum },
      'Status': { select: { name: 'Archived' } },
      'Target': { number: row.target || 0 },
      'Revenue Collected': { number: row.revenue || 0 },
      'Net Profit': { number: row.netProfit || 0 },
      'Total DMs Sent': { number: row.totalDms || 0 },
      'Total Calls Made': { number: row.totalCalls || 0 },
      'Total Closes': { number: row.totalCloses || 0 },
      'Total Content Posted': { number: row.totalContent || 0 },
      'Cycle Win': notionText(row.cycleWin || ''),
      'Cycle Lesson': notionText(row.cycleLesson || '')
    };
    if (row.startDate) properties['Start Date'] = { date: { start: row.startDate } };
    if (row.endDate) properties['End Date'] = { date: { start: row.endDate } };

    var query = notionQuery(NOTION_OPS_CYCLE_DB, {
      filter: { property: 'Cycle Number', number: { equals: cycleNum } },
      page_size: 1
    });
    logActivity('Notion Cycle Archive query — Cycle ' + cycleNum + ' — code: ' + query.code);
    if (query.code >= 400) {
      logActivity('Notion Cycle Archive query error — code: ' + query.code + ' — ' + query.text);
      return { status: 'error', stage: 'query', code: query.code };
    }
    var parsed = JSON.parse(query.text || '{}');
    var existing = parsed.results && parsed.results.length ? parsed.results[0] : null;
    var result = existing
      ? notionRequest('patch', 'https://api.notion.com/v1/pages/' + existing.id, { properties: properties })
      : notionRequest('post', 'https://api.notion.com/v1/pages', { parent: { database_id: NOTION_OPS_CYCLE_DB }, properties: properties });

    logActivity('Notion Cycle Archive upsert — Cycle ' + cycleNum + ' — code: ' + result.code);
    if (result.code >= 400) logActivity('Notion Cycle Archive upsert error — code: ' + result.code + ' — ' + result.text);
    return { status: result.code < 400 ? 'ok' : 'error', stage: existing ? 'update' : 'create', code: result.code };
  } catch (err) {
    logActivity('Notion Cycle Archive ERROR: ' + err.toString());
    return { status: 'error', message: err.toString() };
  }
}

function notionTitle(text) {
  return { title: [{ text: { content: String(text || '') } }] };
}

function notionText(text) {
  return { rich_text: String(text || '') ? [{ text: { content: String(text || '') } }] : [] };
}

function timeLedgerTextV25(value, fallback) {
  value = String(value === undefined || value === null ? '' : value).trim();
  return value || String(fallback || '');
}

function timeLedgerNumberV25(value) {
  var n = parseFloat(value);
  return isNaN(n) ? 0 : n;
}

function timeLedgerNowEtV25() {
  return Utilities.formatDate(new Date(), 'America/New_York', "yyyy-MM-dd'T'HH:mm:ss");
}

function parseTimeLedgerPayloadV25(raw) {
  if (!raw) throw new Error('Missing reviewed time payload.');
  if (typeof raw === 'object') return raw;
  return JSON.parse(String(raw || '{}'));
}

function sanitizeTimeLedgerReviewedPayloadV25(raw) {
  var payload = parseTimeLedgerPayloadV25(raw);
  var start = timeLedgerTextV25(payload.startTimeEt, timeLedgerNowEtV25());
  var end = timeLedgerTextV25(payload.endTimeEt, start);
  var key = timeLedgerTextV25(payload.idempotencyKey, [
    payload.reviewId || 'time_review',
    payload.missionId || 'mission',
    start,
    end,
    payload.actionType || 'save'
  ].join('_')).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 160);
  return {
    approvalText: timeLedgerTextV25(payload.approvalText),
    writeScope: timeLedgerTextV25(payload.writeScope),
    sourceBuild: timeLedgerTextV25(payload.sourceBuild),
    idempotencyKey: key,
    reviewId: timeLedgerTextV25(payload.reviewId, key),
    packetKey: timeLedgerTextV25(payload.packetKey, 'time_ledger_reviewed_session'),
    missionId: timeLedgerTextV25(payload.missionId, 'current_mission'),
    missionTitle: timeLedgerTextV25(payload.missionTitle, 'Current Mission'),
    lane: timeLedgerTextV25(payload.lane, 'Follow-Up'),
    actionType: timeLedgerTextV25(payload.actionType, 'save'),
    actionLabel: timeLedgerTextV25(payload.actionLabel, 'Time review'),
    status: timeLedgerTextV25(payload.status, 'review_confirmed'),
    decision: timeLedgerTextV25(payload.decision, 'looks_good'),
    startTimeEt: start,
    endTimeEt: end,
    elapsedMinutes: timeLedgerNumberV25(payload.elapsedMinutes),
    checkpointCount: timeLedgerNumberV25(payload.checkpointCount),
    debriefCount: timeLedgerNumberV25(payload.debriefCount),
    proof: timeLedgerTextV25(payload.proof),
    result: timeLedgerTextV25(payload.result),
    requestedAtEt: timeLedgerTextV25(payload.requestedAtEt, timeLedgerNowEtV25())
  };
}

function validateTimeLedgerReviewedPayloadV25(data) {
  var failures = [];
  if (data.approvalText !== 'A1XX APPROVED TIME LEDGER SAVE') failures.push('approval');
  if (data.writeScope !== 'time_ledger_reviewed_session_only') failures.push('scope');
  if (data.decision !== 'looks_good') failures.push('decision');
  if (data.status !== 'review_confirmed') failures.push('status');
  if (!data.idempotencyKey) failures.push('idempotency');
  if (!data.missionId || !data.missionTitle) failures.push('mission');
  if (data.elapsedMinutes < 0) failures.push('duration');
  return failures;
}

function getTimeLedgerSheetV25() {
  var ss = getMoneyMissionSpreadsheet();
  return getOrCreateSheet(ss, SHEET_TIME_SESSIONS_LEDGER, TIME_SESSIONS_LEDGER_HEADERS_V25, { matchPrefix: true });
}

function findTimeLedgerRowByKeyV25(sheet, key) {
  var last = sheet.getLastRow();
  if (!key || last < 2) return 0;
  var values = sheet.getRange(2, 2, last - 1, 1).getValues();
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0] || '') === key) return i + 2;
  }
  return 0;
}

function appendTimeLedgerReviewedSheetRowV25(data, notion) {
  var sheet = getTimeLedgerSheetV25();
  var existingRow = findTimeLedgerRowByKeyV25(sheet, data.idempotencyKey);
  if (existingRow) {
    return { status: 'duplicate', row: existingRow, sheet: SHEET_TIME_SESSIONS_LEDGER };
  }
  var row = [
    timeLedgerNowEtV25(),
    data.idempotencyKey,
    data.reviewId,
    data.missionId,
    data.missionTitle,
    data.lane,
    data.actionType,
    data.actionLabel,
    data.status,
    data.decision,
    data.startTimeEt,
    data.endTimeEt,
    data.elapsedMinutes,
    data.checkpointCount,
    data.debriefCount,
    data.proof,
    data.result,
    data.sourceBuild,
    data.writeScope,
    notion && notion.status ? notion.status : 'pending',
    notion && notion.pageId ? notion.pageId : '',
    notion && notion.url ? notion.url : '',
    'saved'
  ];
  sheet.appendRow(row);
  formatSheet(sheet);
  return { status: 'ok', row: sheet.getLastRow(), sheet: SHEET_TIME_SESSIONS_LEDGER };
}

function getTimeLedgerNotionDatabaseIdV25() {
  var props = PropertiesService.getScriptProperties();
  return String(
    props.getProperty('NOTION_TIME_SESSIONS_DB') ||
    props.getProperty('NOTION_TIME_SESSIONS_DB_ID') ||
    props.getProperty('NOTION_TIME_BLOCKS_DB') ||
    ''
  ).trim();
}

function getNotionDatabaseSchemaV25(databaseId) {
  if (!databaseId) return null;
  var result = notionRequest('get', 'https://api.notion.com/v1/databases/' + databaseId);
  if (result.code >= 400) {
    logActivity('Time ledger Notion schema read failed - code: ' + result.code + ' - ' + result.text);
    return null;
  }
  var parsed = JSON.parse(result.text || '{}');
  return parsed.properties || null;
}

function firstNotionPropertyNameV25(schema, names) {
  if (!schema) return '';
  for (var i = 0; i < names.length; i++) {
    if (schema[names[i]]) return names[i];
  }
  return '';
}

function notionTitlePropertyNameV25(schema) {
  if (!schema) return 'Name';
  var keys = Object.keys(schema);
  for (var i = 0; i < keys.length; i++) {
    if (schema[keys[i]] && schema[keys[i]].type === 'title') return keys[i];
  }
  return 'Name';
}

function setNotionSafePropertyV25(properties, schema, names, value) {
  var name = firstNotionPropertyNameV25(schema, names);
  if (!name) return;
  var type = schema[name] && schema[name].type;
  if (type === 'number') properties[name] = { number: timeLedgerNumberV25(value) };
  else if (type === 'checkbox') properties[name] = { checkbox: !!value };
  else if (type === 'date') properties[name] = { date: { start: String(value || '').slice(0, 10) || Utilities.formatDate(new Date(), 'America/New_York', 'yyyy-MM-dd') } };
  else if (type === 'select') properties[name] = { select: { name: timeLedgerTextV25(value, 'Logged') } };
  else if (type === 'status') properties[name] = { status: { name: timeLedgerTextV25(value, 'Logged') } };
  else properties[name] = notionText(value);
}

function buildNotionTimeLedgerPropertiesV25(data, schema) {
  var properties = {};
  properties[notionTitlePropertyNameV25(schema)] = notionTitle(data.missionTitle + ' - ' + data.actionLabel);
  setNotionSafePropertyV25(properties, schema, ['Date', 'Session Date', 'Work Date'], data.startTimeEt);
  setNotionSafePropertyV25(properties, schema, ['Start Time', 'Start Time ET', 'Started At'], data.startTimeEt);
  setNotionSafePropertyV25(properties, schema, ['End Time', 'End Time ET', 'Ended At'], data.endTimeEt);
  setNotionSafePropertyV25(properties, schema, ['Duration Minutes', 'Minutes', 'Time Minutes'], data.elapsedMinutes);
  setNotionSafePropertyV25(properties, schema, ['Mission', 'Mission Title'], data.missionTitle);
  setNotionSafePropertyV25(properties, schema, ['Mission ID'], data.missionId);
  setNotionSafePropertyV25(properties, schema, ['Lane', 'Batch Lane', 'Focus Lane'], data.lane);
  setNotionSafePropertyV25(properties, schema, ['Action Type', 'Action'], data.actionType);
  setNotionSafePropertyV25(properties, schema, ['Status', 'Session Status'], 'Logged');
  setNotionSafePropertyV25(properties, schema, ['Review ID'], data.reviewId);
  setNotionSafePropertyV25(properties, schema, ['Idempotency Key', 'Idempotency'], data.idempotencyKey);
  setNotionSafePropertyV25(properties, schema, ['Source Build'], data.sourceBuild);
  setNotionSafePropertyV25(properties, schema, ['Proof'], data.proof);
  setNotionSafePropertyV25(properties, schema, ['Result', 'Result To Log'], data.result);
  setNotionSafePropertyV25(properties, schema, ['App Write Eligible'], true);
  return properties;
}

function writeNotionTimeLedgerReviewedSessionV25(data) {
  var databaseId = getTimeLedgerNotionDatabaseIdV25();
  if (!databaseId) return { status: 'skipped_missing_db', code: 0 };
  try {
    var schema = getNotionDatabaseSchemaV25(databaseId);
    if (!schema) return { status: 'review', code: 0, message: 'schema unavailable' };
    var properties = buildNotionTimeLedgerPropertiesV25(data, schema);
    var result = notionRequest('post', 'https://api.notion.com/v1/pages', {
      parent: { database_id: databaseId },
      properties: properties
    });
    var parsed = {};
    try { parsed = JSON.parse(result.text || '{}'); } catch (err) {}
    return {
      status: result.code < 400 ? 'ok' : 'review',
      code: result.code,
      pageId: parsed.id || '',
      url: parsed.url || ''
    };
  } catch (err) {
    logActivity('Time ledger Notion save ERROR: ' + err.toString());
    return { status: 'review', message: err.toString() };
  }
}

function writeTimeLedgerReviewedSessionV25(params) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(8000);
    var data = sanitizeTimeLedgerReviewedPayloadV25(params && params.payload);
    var failures = validateTimeLedgerReviewedPayloadV25(data);
    if (failures.length) {
      return jsonResponseV20({ status: 'review', ok: false, writeExecuted: false, failures: failures });
    }
    var sheet = getTimeLedgerSheetV25();
    var existingRow = findTimeLedgerRowByKeyV25(sheet, data.idempotencyKey);
    if (existingRow) {
      return jsonResponseV20({
        status: 'ok',
        ok: true,
        writeExecuted: false,
        duplicate: true,
        sheets: { status: 'duplicate', row: existingRow, sheet: SHEET_TIME_SESSIONS_LEDGER },
        notion: { status: 'skipped_duplicate' },
        protected: { missionCompletion: false, xp: false, notification: false, automation: false, restore: false, tokenExport: false, secretExport: false }
      });
    }
    var notion = writeNotionTimeLedgerReviewedSessionV25(data);
    var sheets = appendTimeLedgerReviewedSheetRowV25(data, notion);
    logActivity('Time ledger reviewed session saved - ' + data.idempotencyKey + ' - row ' + sheets.row);
    return jsonResponseV20({
      status: 'ok',
      ok: true,
      writeExecuted: true,
      duplicate: false,
      sheets: sheets,
      notion: notion,
      idempotencyKey: data.idempotencyKey,
      protected: { missionCompletion: false, xp: false, notification: false, automation: false, restore: false, tokenExport: false, secretExport: false }
    });
  } catch (err) {
    logActivity('Time ledger reviewed session ERROR: ' + err.toString());
    return jsonResponseV20({ status: 'review', ok: false, writeExecuted: false, message: err.toString() });
  } finally {
    try { lock.releaseLock(); } catch (releaseErr) {}
  }
}

function normalizeDailyDayType(value) {
  var v = String(value || '').toLowerCase();
  if (v === 'outreach') return 'Outreach';
  if (v === 'beat') return 'Beat';
  if (v === 'content') return 'Content';
  if (v === 'manager') return 'Manager';
  return '';
}

function mondayDateKey(date) {
  var d = new Date(date || new Date());
  d.setHours(0, 0, 0, 0);
  var day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function isDailyStreakHit(row) {
  return (row.dms || 0) >= 40 || (row.content || 0) >= 1 || (row.calls || 0) >= 1 || (row.closes || 0) >= 1 || (row.money || 0) > 0;
}

function getCalendarEvents(e) {
  var ALLOWED_CALENDARS = ['Business','HoneyBook Calendar - 100 drums'];
  var start = new Date(); start.setHours(0, 0, 0, 0);
  var end = new Date(start); end.setDate(end.getDate() + 1);
  var calendars = CalendarApp.getAllCalendars();
  var events = [];
  calendars.forEach(function(cal) {
    var calName = cal.getName();
    if (ALLOWED_CALENDARS.indexOf(calName) === -1) return;
    try {
      cal.getEvents(start, end).forEach(function(event) {
        var s = event.getStartTime();
        events.push({ title: event.getTitle(), calendar: calName,
          start: s.toISOString(), startTime: Utilities.formatDate(s, Session.getScriptTimeZone(), 'h:mm a') });
      });
    } catch (err) { logActivity('Calendar skipped: ' + calName + ' — ' + err.toString()); }
  });
  logActivity('Calendar request — checked: ' + calendars.length + ' — found: ' + events.length);
  return ContentService.createTextOutput(JSON.stringify({ events: events })).setMimeType(ContentService.MimeType.JSON);
}

function saveWeekly(d) {
  var ss = getMoneyMissionSpreadsheet();
  var sheet = getOrCreateSheet(ss, SHEET_WEEKLY, WEEKLY_HEADERS);
  var wkRev = d.weeklyRevenue || []; var wkSv = d.weeklyServices || []; var wkOt = d.weeklyOther || [];
  var timestamp = d.timestamp || new Date().toISOString();
  var saveDate = d.date || new Date().toLocaleDateString();
  var row = [
    timestamp, saveDate,
    d.cycleNum || '', d.cycleName || '', d.cycleDates || '', d.cycleTarget || 0,
    d.daysElapsed || 0, d.daysLeft || 0, d.revenue || 0, d.weekTarget || 0,
    d.adSpend || 0, d.software || 0, d.services || 0, d.otherExp || 0, d.totalExpenses || 0,
    d.netProfit || 0, d.margin || 0, d.roas || 0, d.dailyPace || 0, d.projectedTotal || 0,
    d.sessions || 0, d.leads || 0, d.dealVal || 0,
    d.dmSent || 0, d.dmResp || 0, d.dmOffer || 0, d.dmClose || 0,
    d.cumDms || 0, d.cumPosts || 0,
    d.studioCommission || 0, d.mixMaster || 0, d.rapreneurOS || 0,
    d.productionDeals || 0, d.customBeats || 0, d.otherIncome || 0,
    wkRev[0]||0, wkRev[1]||0, wkRev[2]||0, wkRev[3]||0,
    wkRev[4]||0, wkRev[5]||0, wkRev[6]||0, wkRev[7]||0,
    wkSv[0]||0,  wkSv[1]||0,  wkSv[2]||0,  wkSv[3]||0,
    wkSv[4]||0,  wkSv[5]||0,  wkSv[6]||0,  wkSv[7]||0,
    wkOt[0]||0,  wkOt[1]||0,  wkOt[2]||0,  wkOt[3]||0,
    wkOt[4]||0,  wkOt[5]||0,  wkOt[6]||0,  wkOt[7]||0,
    d.noteWin || '', d.noteLesson || ''
  ];
  sheet.appendRow(row); formatSheet(sheet);
  return {
    timestamp: timestamp,
    saveDate: saveDate,
    weekOf: d.weekOf || mondayDateKey(new Date()),
    cycle: d.cycleName ? ('Cycle ' + (d.cycleNum || '') + ' — ' + d.cycleName) : ('Cycle ' + (d.cycleNum || '')),
    revenue: d.revenue || 0,
    weekTarget: d.weekTarget || 0,
    adSpend: d.adSpend || 0,
    software: d.software || 0,
    services: d.services || 0,
    otherExp: (d.services || 0) + (d.otherExp || 0),
    dms: d.dmSent || 0,
    callsBooked: d.calls || 0,
    closes: d.dmClose || 0,
    content: d.cumPosts || 0,
    sessions: d.sessions || 0,
    bigWin: d.noteWin || '',
    biggestLesson: d.noteLesson || ''
  };
}

function saveMissionChatLog(d) {
  var ss = getMoneyMissionSpreadsheet();
  var headers = [
    'Timestamp','Date','Cycle','Active Tool','Kind','Question','Answer',
    'Sources','Packet Summary','Mode','Turn ID'
  ];
  var sheet = getOrCreateSheet(ss, SHEET_MISSION_CHAT, headers);
  var cycle = d.cycle || {};
  var cycleLabel = cycle.num ? ('Cycle ' + cycle.num + ' — ' + (cycle.name || '')) : (cycle.name || '');
  var row = [
    d.ts || new Date().toISOString(),
    d.date || '',
    cycleLabel,
    d.activeTool || '',
    d.kind || '',
    d.question || '',
    d.answer || '',
    Array.isArray(d.sources) ? d.sources.join(', ') : (d.sources || ''),
    d.packetSummary || '',
    d.mode || 'local',
    d.id || ''
  ];
  sheet.appendRow(row);
  formatSheet(sheet);
  return {
    timestamp: row[0],
    date: row[1],
    cycle: row[2],
    question: row[5],
    sources: row[7]
  };
}

function saveMissionChatSession(d) {
  var lock = LockService.getScriptLock();
  var locked = false;
  try {
    lock.waitLock(10000);
    locked = true;
    var ss = getMoneyMissionSpreadsheet();
    var headers = [
      'Session ID','Title','Project','Created At','Updated At','Archived At',
      'Message Count','Last Question','Last Answer','Tags','Context Window',
      'Messages JSON','Sources','Cycle','Active Tool','Last Sync At','Sync Reason'
    ];
    var sheet = getOrCreateSheet(ss, SHEET_MISSION_SESSIONS, headers);
    var sessionId = String(d.sessionId || d.id || '').trim();
    if (!sessionId) throw new Error('Missing Mission Command session ID.');
    var messages = Array.isArray(d.messages) ? d.messages : [];
    var messagesForStorage = messages.slice();
    var messagesJson = JSON.stringify(messagesForStorage);
    while (messagesJson.length > 40000 && messagesForStorage.length > 1) {
      messagesForStorage.shift();
      messagesJson = JSON.stringify(messagesForStorage);
    }
    var lastQuestion = '';
    var lastAnswer = '';
    for (var i = messages.length - 1; i >= 0; i--) {
      if (!lastQuestion && messages[i].role === 'user') lastQuestion = messages[i].body || '';
      if (!lastAnswer && messages[i].role === 'assistant') lastAnswer = messages[i].body || '';
      if (lastQuestion && lastAnswer) break;
    }
    var row = [
      sessionId,
      d.title || '',
      d.project || '',
      d.createdAt || '',
      d.updatedAt || '',
      d.archivedAt || '',
      messages.length,
      String(lastQuestion).slice(0, 1000),
      String(lastAnswer).slice(0, 1000),
      Array.isArray(d.tags) ? d.tags.join(', ') : (d.tags || ''),
      String(d.contextWindow || '').slice(0, 4000),
      messagesJson,
      Array.isArray(d.sources) ? d.sources.join(', ') : (d.sources || ''),
      d.cycle || '',
      d.activeTool || '',
      new Date().toISOString(),
      d.syncReason || ''
    ];
    var lastRow = sheet.getLastRow();
    var targetRow = 0;
    if (lastRow >= 2) {
      var scanStart = Math.max(2, lastRow - 298);
      var ids = sheet.getRange(scanStart, 1, lastRow - scanStart + 1, 1).getValues();
      for (var r = 0; r < ids.length; r++) {
        if (String(ids[r][0]) === sessionId) {
          targetRow = r + scanStart;
          break;
        }
      }
    }
    if (targetRow) sheet.getRange(targetRow, 1, 1, headers.length).setValues([row]);
    else sheet.appendRow(row);
    formatSheet(sheet);
    appendMissionChatSyncAudit(ss, d, row, targetRow ? 'update' : 'create');
    return {
      sessionId: sessionId,
      title: row[1],
      project: row[2],
      archivedAt: row[5],
      messageCount: row[6]
    };
  } finally {
    if (locked) lock.releaseLock();
  }
}

function appendMissionChatSyncAudit(ss, d, row, stage) {
  var headers = [
    'Sync At','Stage','Session ID','Title','Project','Archived At',
    'Message Count','Sync Reason','Updated At','Last Question'
  ];
  var audit = getMissionChatSyncAuditSheet(ss, headers);
  audit.appendRow([
    new Date().toISOString(),
    stage || '',
    row[0] || '',
    row[1] || '',
    row[2] || '',
    row[5] || '',
    row[6] || 0,
    d.syncReason || '',
    row[4] || '',
    String(d.lastQuestion || row[7] || '').slice(0, 500)
  ]);
  formatSheet(audit);
}

function getMissionChatSyncAuditSheet(ss, headers) {
  return getOrCreateSheet(ss, SHEET_MISSION_SYNC_AUDIT, headers, {
    matchPrefix: true,
    renameMatched: true
  });
}

function isMissionCommandEventTypeV18(type) {
  return [
    'mission_dpc_log',
    'mission_pipeline_move',
    'mission_booked_call',
    'mission_revenue_log',
    'mission_content_log'
  ].indexOf(String(type || '')) >= 0;
}

function getMissionCommandEventPayloadV18(d) {
  var payload = d && typeof d.payload === 'object' && d.payload !== null ? d.payload : {};
  var flat = {};
  Object.keys(d || {}).forEach(function(key) {
    if (key !== 'payload' && key !== 'token') flat[key] = d[key];
  });
  Object.keys(payload).forEach(function(key) { flat[key] = payload[key]; });
  return flat;
}

function stringifyMissionEventPayloadV18(payload) {
  var json = JSON.stringify(payload || {});
  if (json.length > 40000) json = json.slice(0, 39980) + '...';
  return json;
}

function saveMissionCommandEventV18(d) {
  var ss = getMoneyMissionSpreadsheet();
  var sheet = getOrCreateSheet(ss, SHEET_MISSION_EVENTS, MISSION_EVENT_HEADERS, {
    matchPrefix: true,
    renameMatched: true
  });
  var payload = getMissionCommandEventPayloadV18(d || {});
  var eventType = String((d && d.type) || payload.type || '').trim();
  var summary = payload.summary || payload.note || payload.text || payload.description || '';
  var lead = payload.lead || payload.leadName || payload.name || payload.stageName || payload.contact || '';
  var row = [
    new Date().toISOString(),
    eventType,
    payload.ts || (d && d.ts) || '',
    payload.source || '',
    payload.action || '',
    payload.route || '',
    payload.result || payload.resultType || '',
    payload.status || '',
    lead,
    payload.amount || payload.money || payload.revenue || '',
    payload.title || '',
    String(summary).slice(0, 1000),
    payload.sessionId || payload.chatSessionId || '',
    payload.activeChatId || payload.chatId || '',
    String(payload.prompt || payload.question || payload.input || '').slice(0, 1000),
    stringifyMissionEventPayloadV18(payload)
  ];
  sheet.appendRow(row);
  formatSheet(sheet);
  return {
    receivedAt: row[0],
    type: row[1],
    action: row[4],
    route: row[5],
    result: row[6],
    lead: row[8],
    amount: row[9],
    summary: row[11]
  };
}

function getMissionCommandEventsV18(e) {
  var ss = getMoneyMissionSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_MISSION_EVENTS);
  if (!sheet || sheet.getLastRow() < 2) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'ok', rows: [] }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  var limit = Math.min(Number(e.parameter.limit || 25), 100);
  var last = sheet.getLastRow();
  var start = Math.max(2, last - limit + 1);
  var values = sheet.getRange(start, 1, last - start + 1, MISSION_EVENT_HEADERS.length).getValues();
  var rows = values.map(function(row) {
    return {
      receivedAt: row[0],
      type: row[1],
      eventTs: row[2],
      source: row[3],
      action: row[4],
      route: row[5],
      result: row[6],
      status: row[7],
      lead: row[8],
      amount: row[9],
      title: row[10],
      summary: row[11],
      sessionId: row[12],
      activeChatId: row[13],
      prompt: row[14]
    };
  });
  return ContentService.createTextOutput(JSON.stringify({ status: 'ok', rows: rows }))
    .setMimeType(ContentService.MimeType.JSON);
}

function cellTextV20(value, maxLen) {
  var text = value === null || value === undefined ? '' : String(value);
  maxLen = maxLen || 1000;
  return text.length > maxLen ? text.slice(0, maxLen) : text;
}

function cellNumberV20(value) {
  var n = Number(value);
  return isNaN(n) ? '' : n;
}

function profileIdV20(value) {
  return cellTextV20(value || 'a1xx-primary', 80);
}

function findRowByFirstColumnV20(sheet, id) {
  if (!sheet || sheet.getLastRow() < 2 || !id) return 0;
  var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0]) === String(id)) return i + 2;
  }
  return 0;
}

function rowToObjectV20(headers, row) {
  var obj = {};
  for (var i = 0; i < headers.length; i++) obj[headers[i]] = row[i];
  return obj;
}

function normalizeTrustedStatusV20(value) {
  var status = cellTextV20(value || 'Pending', 40);
  var allowed = { Pending: 1, Trusted: 1, Review: 1, Revoked: 1, Archived: 1 };
  return allowed[status] ? status : 'Pending';
}

function getOsProfileSheetV20() {
  return getOrCreateSheet(getMoneyMissionSpreadsheet(), SHEET_OS_PROFILE_INDEX, OS_PROFILE_INDEX_HEADERS, {
    matchPrefix: true,
    renameMatched: true
  });
}

function getOsDeviceRegistrySheetV20() {
  return getOrCreateSheet(getMoneyMissionSpreadsheet(), SHEET_OS_DEVICE_REGISTRY, OS_DEVICE_REGISTRY_HEADERS, {
    matchPrefix: true,
    renameMatched: true
  });
}

function getOsSetupPointersSheetV20() {
  return getOrCreateSheet(getMoneyMissionSpreadsheet(), SHEET_OS_SETUP_POINTERS, OS_SETUP_POINTER_HEADERS, {
    matchPrefix: true,
    renameMatched: true
  });
}

function saveOsProfileIndexV20(d) {
  var sheet = getOsProfileSheetV20();
  var profileId = profileIdV20(d.profileId);
  var nowIso = new Date().toISOString();
  var row = [
    profileId,
    cellTextV20(d.displayName || 'A1XX', 120),
    cellTextV20(d.role || 'Executive Producer', 120),
    cellTextV20(d.timezone || 'America/New_York', 80),
    cellTextV20(Array.isArray(d.preferredRoutes) ? d.preferredRoutes.join(',') : (d.preferredRoutes || ''), 250),
    cellTextV20(d.buildChannel || d.build || '', 120),
    cellTextV20(d.activeDeviceId || '', 120),
    cellTextV20(d.latestBackupMarker || d.backupMarker || '', 120),
    cellNumberV20(d.latestBackupSheetRow || d.backupSheetRow),
    cellTextV20(d.latestBackupDriveFileId || d.driveFileId || '', 160),
    cellNumberV20(d.latestBackupSize || d.backupSize),
    cellTextV20(d.lastVerifiedAt || nowIso, 80),
    cellTextV20(d.status || 'Active', 80),
    cellTextV20(d.notes || '', 1000)
  ];
  var targetRow = findRowByFirstColumnV20(sheet, profileId);
  if (targetRow) sheet.getRange(targetRow, 1, 1, OS_PROFILE_INDEX_HEADERS.length).setValues([row]);
  else sheet.appendRow(row);
  formatSheet(sheet);
  return {
    profileId: profileId,
    row: targetRow || sheet.getLastRow(),
    activeDeviceId: row[6],
    latestBackupMarker: row[7],
    latestBackupSheetRow: row[8],
    updatedAt: row[11],
    status: row[12]
  };
}

function saveOsDeviceRegistryV20(d) {
  var sheet = getOsDeviceRegistrySheetV20();
  var deviceId = cellTextV20(d.deviceId || '', 120);
  if (!deviceId) throw new Error('device_registry_upsert: missing deviceId');
  var profileId = profileIdV20(d.profileId);
  var nowIso = new Date().toISOString();
  var targetRow = findRowByFirstColumnV20(sheet, deviceId);
  var existing = targetRow ? sheet.getRange(targetRow, 1, 1, OS_DEVICE_REGISTRY_HEADERS.length).getValues()[0] : null;
  var existingTrusted = existing ? normalizeTrustedStatusV20(existing[9]) : 'Pending';
  var incomingTrusted = normalizeTrustedStatusV20(d.trustedStatus);
  var trustedStatus = existingTrusted;
  if (!existing) trustedStatus = 'Pending';
  else if (existingTrusted === 'Trusted') trustedStatus = 'Trusted';
  else if (incomingTrusted === 'Review' || incomingTrusted === 'Revoked' || incomingTrusted === 'Archived') trustedStatus = incomingTrusted;
  var firstSeen = existing && existing[4] ? existing[4] : (d.firstSeenAt || nowIso);
  var row = [
    deviceId,
    profileId,
    cellTextV20(d.deviceLabel || d.label || '', 120),
    cellTextV20(d.deviceType || 'browser', 80),
    cellTextV20(firstSeen, 80),
    cellTextV20(d.lastSeenAt || nowIso, 80),
    cellTextV20(d.lastAnchorCheckAt || d.lastReadyCheckAt || '', 80),
    cellTextV20(d.lastBackupMarker || d.latestBackupMarker || d.backupMarker || '', 120),
    cellNumberV20(d.lastBackupSheetRow || d.latestBackupSheetRow || d.backupSheetRow),
    trustedStatus,
    cellTextV20(d.trustReason || (trustedStatus === 'Pending' ? 'New device pending manual trust.' : ''), 500),
    cellTextV20(d.buildToken || d.build || '', 160),
    cellTextV20(d.appFile || '', 160),
    cellTextV20(d.status || 'Active', 80),
    cellTextV20(d.notes || '', 1000)
  ];
  if (targetRow) sheet.getRange(targetRow, 1, 1, OS_DEVICE_REGISTRY_HEADERS.length).setValues([row]);
  else sheet.appendRow(row);
  formatSheet(sheet);
  return {
    deviceId: deviceId,
    profileId: profileId,
    row: targetRow || sheet.getLastRow(),
    trustedStatus: trustedStatus,
    lastBackupMarker: row[7],
    updatedAt: row[5]
  };
}

function getOsProfileIndexV20(e) {
  var sheet = getOsProfileSheetV20();
  var requested = profileIdV20(e && e.parameter ? e.parameter.profileId : '');
  var targetRow = findRowByFirstColumnV20(sheet, requested);
  if (!targetRow && sheet.getLastRow() >= 2) targetRow = 2;
  if (!targetRow) return jsonResponseV20({ status: 'ok', profile: null, latestBackup: null, activeDevice: null });
  var row = sheet.getRange(targetRow, 1, 1, OS_PROFILE_INDEX_HEADERS.length).getValues()[0];
  var profile = rowToObjectV20(OS_PROFILE_INDEX_HEADERS, row);
  return jsonResponseV20({
    status: 'ok',
    profile: profile,
    latestBackup: {
      marker: profile['Latest Backup Marker'] || '',
      sheetRow: profile['Latest Backup Sheet Row'] || '',
      driveFileId: profile['Latest Backup Drive File ID'] || '',
      size: profile['Latest Backup Size'] || ''
    },
    activeDevice: profile['Active Device ID'] || ''
  });
}

function getOsDeviceRegistryV20(e) {
  var sheet = getOsDeviceRegistrySheetV20();
  var requested = profileIdV20(e && e.parameter ? e.parameter.profileId : '');
  var rows = [];
  var trustedCount = 0;
  var reviewCount = 0;
  if (sheet.getLastRow() >= 2) {
    var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, OS_DEVICE_REGISTRY_HEADERS.length).getValues();
    for (var i = 0; i < values.length; i++) {
      if (String(values[i][1] || requested) !== requested) continue;
      var item = rowToObjectV20(OS_DEVICE_REGISTRY_HEADERS, values[i]);
      if (item['Trusted Status'] === 'Trusted') trustedCount++;
      if (item['Trusted Status'] === 'Review' || item['Trusted Status'] === 'Pending') reviewCount++;
      rows.push(item);
    }
  }
  return jsonResponseV20({ status: 'ok', profileId: requested, devices: rows, trustedCount: trustedCount, reviewCount: reviewCount });
}

function isSafeSetupPointerTypeV20(type) {
  var safe = {
    'Apps Script Web App URL': 1,
    'Clean Workbook ID': 1,
    'Backup Folder ID': 1,
    'MC Master Config Page ID': 1,
    'Team Chat Database ID': 1,
    'Intelligence HQ Page ID': 1
  };
  return !!safe[cellTextV20(type, 120)];
}

function normalizeSetupPointerStatusV20(value) {
  var status = cellTextV20(value || 'Active', 40);
  var allowed = { Active: 1, Review: 1, Archived: 1 };
  return allowed[status] ? status : 'Active';
}

function saveOsSetupPointersV20(d) {
  var sheet = getOsSetupPointersSheetV20();
  var pointers = Array.isArray(d.pointers) ? d.pointers : [];
  var updatedAt = new Date().toISOString();
  var deviceId = cellTextV20(d.deviceId || d.updatedByDeviceId || '', 120);
  var saved = [];
  var skipped = [];
  for (var i = 0; i < pointers.length; i++) {
    var item = pointers[i] || {};
    var key = cellTextV20(item.pointerKey || item.key || '', 120);
    var type = cellTextV20(item.pointerType || item.type || '', 120);
    var value = cellTextV20(item.pointerValue || item.value || '', 1000);
    if (!key || !type || !value) {
      skipped.push({ key: key || '(missing)', reason: 'missing key/type/value' });
      continue;
    }
    if (!isSafeSetupPointerTypeV20(type)) {
      skipped.push({ key: key, reason: 'unsafe pointer type' });
      continue;
    }
    var row = [
      key,
      cellTextV20(item.pointerLabel || item.label || key, 160),
      type,
      value,
      cellTextV20(item.updatedAt || updatedAt, 80),
      deviceId,
      normalizeSetupPointerStatusV20(item.status),
      cellTextV20(item.notes || 'Safe setup pointer only. No secret token stored.', 1000)
    ];
    var targetRow = findRowByFirstColumnV20(sheet, key);
    if (targetRow) sheet.getRange(targetRow, 1, 1, OS_SETUP_POINTER_HEADERS.length).setValues([row]);
    else sheet.appendRow(row);
    saved.push({ key: key, type: type, row: targetRow || sheet.getLastRow(), status: row[6] });
  }
  formatSheet(sheet);
  return { saved: saved, skipped: skipped, updatedAt: updatedAt };
}

function getOsSetupPointersV20(e) {
  var sheet = getOsSetupPointersSheetV20();
  var rows = [];
  if (sheet.getLastRow() >= 2) {
    var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, OS_SETUP_POINTER_HEADERS.length).getValues();
    for (var i = 0; i < values.length; i++) {
      var item = rowToObjectV20(OS_SETUP_POINTER_HEADERS, values[i]);
      if (String(item.Status || item['Status'] || 'Active') === 'Archived') continue;
      if (!isSafeSetupPointerTypeV20(item['Pointer Type'])) continue;
      rows.push(item);
    }
  }
  return jsonResponseV20({ status: 'ok', pointers: rows });
}

function getOsRegistrySummaryConfigsV20() {
  return [
    {
      key: 'driveFileIndex',
      label: 'Drive File Index',
      databaseId: 'b14f75b4bd9f4398a118128b076c6f14',
      dataSourceId: '222ee427-5a93-4419-a43d-7d3e1dbcedfb',
      url: 'https://www.notion.so/b14f75b4bd9f4398a118128b076c6f14',
      role: 'Drive-backed file pointers and verification state.'
    },
    {
      key: 'sourceTrustRegistry',
      label: 'Source Trust Registry',
      databaseId: '7d9c2f63b6374729b9313792cbc93fd3',
      dataSourceId: '5d1af673-2dc4-4c23-b5c4-e3099e0eca55',
      url: 'https://www.notion.so/7d9c2f63b6374729b9313792cbc93fd3',
      role: 'Source freshness, confidence, and fallback rules.'
    },
    {
      key: 'dataSchemaRegistry',
      label: 'Data Schema Registry',
      databaseId: '11976d6e21bb4404b7053ea6c2ef5085',
      dataSourceId: '88612b98-3a9f-45ed-8dd1-c8ba7597ab8b',
      url: 'https://www.notion.so/11976d6e21bb4404b7053ea6c2ef5085',
      role: 'Data key ownership, restore behavior, and protection rules.'
    },
    {
      key: 'vaultIndexMirror',
      label: 'Vault Index Mirror',
      databaseId: '1c04f726fdd849ea8c511e998e762c6f',
      dataSourceId: 'bc1d3888-ee17-4063-b21c-397bcea9bd7e',
      url: 'https://www.notion.so/1c04f726fdd849ea8c511e998e762c6f',
      role: 'Human-readable mirror of Drive memory vault pointers.'
    },
    {
      key: 'agentOutputLog',
      label: 'Agent Output Log',
      databaseId: '1b8faaccea234eb58fcbe0995ef758ee',
      dataSourceId: 'fd608775-dc12-47a7-9db9-ad2ac7a5e153',
      url: 'https://www.notion.so/1b8faaccea234eb58fcbe0995ef758ee',
      role: 'Advisory agent recommendations and approval state.'
    },
    {
      key: 'skillRegistry',
      label: 'Skill Registry',
      databaseId: '055b24d063154871bc9f4ab78ef088a8',
      dataSourceId: '1feb2a54-8558-44bc-809f-f81dc1955fab',
      url: 'https://www.notion.so/055b24d063154871bc9f4ab78ef088a8',
      role: 'Skill specs, allowed tools, approval, and test state.'
    },
    {
      key: 'workerRegistry',
      label: 'Worker Registry',
      databaseId: 'ada21584d22c448c8a9dbccf52437777',
      dataSourceId: '3036fbd5-6746-4590-ab9f-c6d0c47fa716',
      url: 'https://www.notion.so/ada21584d22c448c8a9dbccf52437777',
      role: 'Future worker records before behavior is activated.'
    },
    {
      key: 'automationRegistry',
      label: 'Automation Registry',
      databaseId: '981687d4a80f4549b38197009fea9e51',
      dataSourceId: '9223135d-90dc-42b2-99d3-65cd890118d9',
      url: 'https://www.notion.so/981687d4a80f4549b38197009fea9e51',
      role: 'Automation specs, gates, and activation status.'
    },
    {
      key: 'callNotesIndex',
      label: 'Call Notes Index',
      databaseId: 'b74e8b31d7074b4e9251fc845e9980f2',
      dataSourceId: '433e8984-ed9a-429f-8e7f-3449319400b9',
      url: 'https://www.notion.so/b74e8b31d7074b4e9251fc845e9980f2',
      role: 'Call-note pointers, follow-up state, and related contacts.'
    },
    {
      key: 'contactIntelligence',
      label: 'Contact Intelligence',
      databaseId: '9850638c392540e7a83bec8b958161a3',
      dataSourceId: 'e8be5d29-92ef-4fff-96e8-03a9699aadfa',
      url: 'https://www.notion.so/9850638c392540e7a83bec8b958161a3',
      role: 'Contact context, status, follow-up, and memory links.'
    },
    {
      key: 'contentIntelligence',
      label: 'Content Intelligence',
      databaseId: '228e4670ee2e48de8f50e7a4e1059b50',
      dataSourceId: 'a3300f8a-2514-427b-ba40-dd8bf7f181c2',
      url: 'https://www.notion.so/228e4670ee2e48de8f50e7a4e1059b50',
      role: 'Content ideas, offers, production links, and status.'
    },
    {
      key: 'cycleMemory',
      label: 'Cycle Memory',
      databaseId: '84ef169fd5d54b0ebad1d8f6534a4b80',
      dataSourceId: '992db686-c95a-4b45-922e-1eac35fa01bf',
      url: 'https://www.notion.so/84ef169fd5d54b0ebad1d8f6534a4b80',
      role: 'Daily logs, weekly reviews, and cycle archive memory.'
    }
  ];
}

function findOsRegistrySummaryConfigV20(key) {
  var configs = getOsRegistrySummaryConfigsV20();
  var wanted = cellTextV20(key || '', 120);
  for (var i = 0; i < configs.length; i++) {
    if (configs[i].key === wanted) return configs[i];
  }
  return null;
}

function getDriveFileIndexPointerWriteSkeletonV20(input) {
  var checkedAt = new Date().toISOString();
  var config = findOsRegistrySummaryConfigV20('driveFileIndex');
  var unsafe = detectUnsafeDriveFileIndexPointerPayloadV20(input || {});
  var preview = sanitizeDriveFileIndexPointerPreviewV20(input || {});
  var missing = getDriveFileIndexPointerMissingFieldsV20(preview);
  return jsonResponseV20({
    status: unsafe.length ? 'review' : 'blocked',
    ok: true,
    mode: 'skeleton_only',
    build: OS_REGISTRY_SUMMARY_BUILD_V20,
    checkedAt: checkedAt,
    targetRegistry: {
      key: config ? config.key : 'driveFileIndex',
      label: config ? config.label : 'Drive File Index',
      databaseId: config ? config.databaseId : '',
      dataSourceId: config ? config.dataSourceId : '',
      url: config ? config.url : ''
    },
    preview: preview,
    missingFields: missing,
    unsafeFields: unsafe,
    gates: {
      approval: 'required_later',
      b3Confirmation: 'required_later',
      backupFirst: 'required_later',
      readbackVerification: 'required_later',
      writeEndpointActive: false,
      writeExecuted: false
    },
    message: unsafe.length
      ? 'Pointer payload needs review. No write executed.'
      : 'Phase 7B skeleton is installed. Pointer writes remain blocked.',
    safety: {
      notion: 'No Notion create or update is executed by this skeleton.',
      sheets: 'No Sheet writes.',
      drive: 'No Drive writes, moves, renames, shares, or deletes.',
      secrets: 'Secret-like fields and values are rejected from the preview.',
      workers: 'Workers and automations cannot call an active write path from this build.'
    },
    blockedActions: [
      'notion_create',
      'notion_update',
      'sheet_write',
      'drive_write',
      'delete',
      'move',
      'rename',
      'share',
      'mass_edit',
      'activate_automation',
      'worker_triggered_write'
    ]
  });
}

function getMasterConfigReadSkeletonV20(input) {
  var checkedAt = new Date().toISOString();
  var payload = input || {};
  var unsafe = detectUnsafeMasterConfigReadSkeletonInputV20(payload);
  var requestedPageId = cellTextV20(
    payload.masterConfigPageId || payload.pageId || payload.configPageId || 'preview_only',
    180
  );
  var allowedFields = [
    'profileId',
    'displayName',
    'safeSetupPointerKeys',
    'driveRootPointer',
    'registrySummaryPointers',
    'latestBackupMarker',
    'sourceBuild',
    'lastVerified',
    'readOnlyMode'
  ];
  var safeSetupPointerKeys = [
    'apps_script_web_app_url',
    'clean_workbook_id',
    'backup_folder_id',
    'mc_master_config_page_id',
    'team_chat_database_id',
    'intelligence_hq_page_id'
  ];
  return jsonResponseV20({
    status: unsafe.length ? 'review' : 'blocked',
    ok: true,
    mode: 'skeleton_only',
    build: OS_REGISTRY_SUMMARY_BUILD_V20,
    checkedAt: checkedAt,
    target: 'private_notion_master_config_page',
    requestedPageId: requestedPageId,
    readEndpointActive: false,
    readExecuted: false,
    writeExecuted: false,
    writesEnabled: false,
    loginAnywhereActive: false,
    secretExport: false,
    tokenExport: false,
    restoreEnabled: false,
    workerAuthEnabled: false,
    automationActivationEnabled: false,
    allowedFields: allowedFields,
    safeSetupPointerKeys: safeSetupPointerKeys,
    unsafeFields: unsafe,
    requiredGates: [
      'A1XX approval',
      'exact master config page ID supplied manually',
      'Notion integration shared to that exact page',
      'trusted source device confirmed',
      'backup visible before preview',
      'read-only endpoint review before activation',
      'secret scan before any future read'
    ],
    protectedFields: [
      'notionToken',
      'googleOAuthToken',
      'webhookToken',
      'todoistToken',
      'hmacSecret',
      'password',
      'pin',
      'workerCredential',
      'automationSecret'
    ],
    blockedActions: [
      'live master config read',
      'master config write',
      'login-anywhere activation',
      'auth sync write',
      'token export',
      'secret export',
      'worker auth',
      'automation activation',
      'restore execution'
    ],
    safety: {
      notion: 'No Notion read, create, update, archive, or delete executed.',
      sheets: 'No Sheet writes.',
      drive: 'No Drive writes, moves, renames, shares, restores, or deletes.',
      auth: 'No login-anywhere, auth sync, token export, or secret export.',
      workers: 'Workers and automations cannot call an active auth path from this skeleton.'
    },
    message: unsafe.length
      ? 'Master config read skeleton input needs review. No master config read executed.'
      : 'Master config read skeleton is installed but blocked. No master config read executed.'
  });
}

function detectUnsafeMasterConfigReadSkeletonInputV20(input) {
  var unsafe = [];
  var deny = /(token|secret|password|credential|oauth|bearer|api[_ -]?key|webhook|hmac|pin|private[_ -]?key)/i;
  function scan(value, path) {
    if (unsafe.length >= 12) return;
    if (deny.test(String(path || ''))) {
      unsafe.push(cellTextV20(path, 120));
      return;
    }
    if (value === null || value === undefined) return;
    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        for (var i = 0; i < value.length; i++) scan(value[i], path + '[' + i + ']');
      } else {
        var keys = Object.keys(value);
        for (var j = 0; j < keys.length; j++) scan(value[keys[j]], path ? path + '.' + keys[j] : keys[j]);
      }
      return;
    }
    if (deny.test(String(value || ''))) unsafe.push(cellTextV20(path || 'value', 120));
  }
  scan(input || {}, '');
  return unsafe.filter(function(item, index, arr) { return item && arr.indexOf(item) === index; });
}

function getMasterConfigReadPreflightV20(input) {
  var checkedAt = new Date().toISOString();
  var payload = input || {};
  var unsafe = detectUnsafeMasterConfigReadSkeletonInputV20(payload);
  var pageId = normalizeMasterConfigPageIdPreflightV20(
    payload.masterConfigPageId || payload.pageId || payload.configPageId || ''
  );
  var trustedSource = normalizeBooleanV20(payload.trustedSourceConfirmed);
  var backupVisible = normalizeBooleanV20(payload.backupVisible);
  var integrationShared = normalizeBooleanV20(payload.integrationSharedConfirmed);
  var approvalCaptured = normalizeBooleanV20(payload.a1xxApprovalCaptured);
  var pageIdSupplied = !!pageId.normalized && pageId.normalized !== 'preview_only';
  var missingGates = [];
  if (!approvalCaptured) missingGates.push('A1XX approval not captured in this preflight');
  if (!pageIdSupplied) missingGates.push('Exact master config page ID not supplied');
  if (!integrationShared) missingGates.push('Notion integration sharing not confirmed');
  if (!trustedSource) missingGates.push('Trusted source device not confirmed');
  if (!backupVisible) missingGates.push('Backup visibility not confirmed');
  if (unsafe.length) missingGates.push('Unsafe token/secret-like input detected');
  return jsonResponseV20({
    status: unsafe.length ? 'review' : 'preflight_ready',
    ok: true,
    mode: 'preflight_only',
    build: OS_REGISTRY_SUMMARY_BUILD_V20,
    checkedAt: checkedAt,
    target: 'private_notion_master_config_page',
    requestedPageId: pageId.normalized || 'preview_only',
    pageIdSupplied: pageIdSupplied,
    pageIdFormat: pageId.format,
    integrationSharedConfirmed: integrationShared,
    trustedSourceConfirmed: trustedSource,
    backupVisible: backupVisible,
    a1xxApprovalCaptured: approvalCaptured,
    preflightExecuted: true,
    readEndpointActive: false,
    readExecuted: false,
    configReadExecuted: false,
    writeExecuted: false,
    writesEnabled: false,
    loginAnywhereActive: false,
    secretExport: false,
    tokenExport: false,
    restoreEnabled: false,
    workerAuthEnabled: false,
    automationActivationEnabled: false,
    unsafeFields: unsafe,
    missingGates: missingGates,
    allowedPreviewFields: [
      'profileId',
      'displayName',
      'safeSetupPointerKeys',
      'driveRootPointer',
      'registrySummaryPointers',
      'latestBackupMarker',
      'sourceBuild',
      'lastVerified',
      'readOnlyMode'
    ],
    blockedFields: [
      'notionToken',
      'googleOAuthToken',
      'webhookToken',
      'todoistToken',
      'hmacSecret',
      'password',
      'pin',
      'workerCredential',
      'automationSecret'
    ],
    requiredBeforeFutureRead: [
      'A1XX approval',
      'exact master config page ID supplied manually',
      'Notion integration shared to that exact page',
      'trusted source device confirmed',
      'backup visible before preview',
      'secret scan passed',
      'read-only endpoint review passed'
    ],
    blockedActions: [
      'live master config read',
      'master config write',
      'login-anywhere activation',
      'auth sync write',
      'token export',
      'secret export',
      'worker auth',
      'automation activation',
      'restore execution'
    ],
    safety: {
      notion: 'No Notion read, create, update, archive, or delete executed.',
      sheets: 'No Sheet writes.',
      drive: 'No Drive writes, moves, renames, shares, restores, or deletes.',
      auth: 'No login-anywhere, auth sync, token export, or secret export.',
      recovery: 'No restore execution.'
    },
    message: 'Master config read preflight is preview-only. No master config read executed.'
  });
}

function normalizeMasterConfigPageIdPreflightV20(value) {
  var raw = cellTextV20(value || 'preview_only', 180);
  if (!raw || raw === 'preview_only') return { normalized: 'preview_only', format: 'preview_only' };
  var compact = raw.replace(/-/g, '').trim();
  if (/^[0-9a-fA-F]{32}$/.test(compact)) return { normalized: compact, format: 'notion_page_id_shape_ok' };
  return { normalized: raw, format: 'review_needed' };
}

function normalizeBooleanV20(value) {
  if (value === true) return true;
  var text = cellTextV20(value || '', 40).toLowerCase();
  return text === 'true' || text === 'yes' || text === '1' || text === 'checked';
}

function getMasterConfigPageReviewV20(input) {
  var checkedAt = new Date().toISOString();
  var payload = input || {};
  var unsafe = detectUnsafeMasterConfigReadSkeletonInputV20(payload);
  var locator = normalizeMasterConfigPageLocatorV20(
    payload.masterConfigPageLocator || payload.masterConfigPageUrl || payload.masterConfigPageId || payload.pageId || ''
  );
  var approvalCaptured = normalizeBooleanV20(payload.a1xxApprovalCaptured);
  var integrationShared = normalizeBooleanV20(payload.integrationSharedConfirmed);
  var exactPageShared = normalizeBooleanV20(payload.exactPageSharedConfirmed);
  var trustedSource = normalizeBooleanV20(payload.trustedSourceConfirmed);
  var backupVisible = normalizeBooleanV20(payload.backupVisible);
  var pageIdSupplied = locator.normalized !== 'preview_only';
  var pageIdShapeOk = locator.format === 'notion_page_id_shape_ok';
  var missingReviewItems = [];
  if (!approvalCaptured) missingReviewItems.push('A1XX approval not captured for page review');
  if (!pageIdSupplied) missingReviewItems.push('Exact master config page ID or URL not supplied');
  if (pageIdSupplied && !pageIdShapeOk) missingReviewItems.push('Master config page ID shape needs review');
  if (!integrationShared) missingReviewItems.push('Notion integration sharing not confirmed');
  if (!exactPageShared) missingReviewItems.push('Exact page share not confirmed');
  if (!trustedSource) missingReviewItems.push('Trusted source device not confirmed');
  if (!backupVisible) missingReviewItems.push('Backup visibility not confirmed');
  if (unsafe.length) missingReviewItems.push('Unsafe token/secret-like input detected');
  return jsonResponseV20({
    status: unsafe.length ? 'review' : 'page_review_ready',
    ok: true,
    mode: 'page_review_only',
    build: OS_REGISTRY_SUMMARY_BUILD_V20,
    checkedAt: checkedAt,
    target: 'private_notion_master_config_page',
    rawLocatorPreview: locator.preview,
    requestedPageId: locator.normalized,
    pageIdSupplied: pageIdSupplied,
    pageIdShapeOk: pageIdShapeOk,
    pageIdFormat: locator.format,
    locatorType: locator.locatorType,
    a1xxApprovalCaptured: approvalCaptured,
    integrationSharedConfirmed: integrationShared,
    exactPageSharedConfirmed: exactPageShared,
    trustedSourceConfirmed: trustedSource,
    backupVisible: backupVisible,
    pageReviewExecuted: true,
    readEndpointActive: false,
    readExecuted: false,
    configReadExecuted: false,
    writeExecuted: false,
    writesEnabled: false,
    loginAnywhereActive: false,
    secretExport: false,
    tokenExport: false,
    restoreEnabled: false,
    workerAuthEnabled: false,
    automationActivationEnabled: false,
    unsafeFields: unsafe,
    missingReviewItems: missingReviewItems,
    allowedLocatorInputs: [
      'preview_only',
      'Notion page URL',
      '32-character Notion page ID',
      'hyphenated Notion page ID'
    ],
    requiredBeforeFutureRead: [
      'A1XX approval',
      'exact master config page ID reviewed',
      'Notion integration shared to that exact page',
      'trusted source device confirmed',
      'backup visible before preview',
      'secret scan passed',
      'read-only endpoint review passed'
    ],
    blockedActions: [
      'live master config read',
      'master config write',
      'login-anywhere activation',
      'auth sync write',
      'token export',
      'secret export',
      'worker auth',
      'automation activation',
      'restore execution'
    ],
    safety: {
      notion: 'No Notion read, create, update, archive, or delete executed.',
      sheets: 'No Sheet writes.',
      drive: 'No Drive writes, moves, renames, shares, restores, or deletes.',
      auth: 'No login-anywhere, auth sync, token export, or secret export.',
      recovery: 'No restore execution.'
    },
    message: 'Master config page review is review-only. No master config read executed.'
  });
}

function normalizeMasterConfigPageLocatorV20(value) {
  var raw = cellTextV20(value || 'preview_only', 500);
  if (!raw || raw === 'preview_only') {
    return {
      normalized: 'preview_only',
      format: 'preview_only',
      locatorType: 'preview_only',
      preview: 'preview_only'
    };
  }
  var matches = raw.match(/[0-9a-fA-F]{32}/g);
  var compact = raw.replace(/-/g, '').trim();
  if ((!matches || !matches.length) && /^[0-9a-fA-F]{32}$/.test(compact)) matches = [compact];
  if (matches && matches.length) {
    return {
      normalized: matches[matches.length - 1].toLowerCase(),
      format: 'notion_page_id_shape_ok',
      locatorType: /^https?:\/\//i.test(raw) ? 'notion_url' : 'page_id',
      preview: cellTextV20(raw, 160)
    };
  }
  return {
    normalized: raw,
    format: 'review_needed',
    locatorType: /^https?:\/\//i.test(raw) ? 'url_review_needed' : 'id_review_needed',
    preview: cellTextV20(raw, 160)
  };
}

function getMasterConfigLocatorReviewV20(input) {
  var checkedAt = new Date().toISOString();
  var payload = input || {};
  var unsafe = detectUnsafeMasterConfigReadSkeletonInputV20(payload);
  var locator = normalizeMasterConfigPageLocatorV20(
    payload.masterConfigPageLocator || payload.masterConfigPageUrl || payload.masterConfigPageId || payload.pageId || ''
  );
  var approvalCaptured = normalizeBooleanV20(payload.a1xxApprovalCaptured);
  var userConfirmsRealLocator = normalizeBooleanV20(payload.userConfirmsRealLocator);
  var integrationShared = normalizeBooleanV20(payload.integrationSharedConfirmed);
  var exactPageShared = normalizeBooleanV20(payload.exactPageSharedConfirmed);
  var trustedSource = normalizeBooleanV20(payload.trustedSourceConfirmed);
  var backupVisible = normalizeBooleanV20(payload.backupVisible);
  var locatorIsReal = locator.normalized !== 'preview_only';
  var locatorShapeOk = locator.format === 'notion_page_id_shape_ok';
  var missingReviewItems = [];
  if (!approvalCaptured) missingReviewItems.push('A1XX approval not captured for real locator review');
  if (!locatorIsReal) missingReviewItems.push('Real master config page locator not supplied');
  if (locatorIsReal && !locatorShapeOk) missingReviewItems.push('Real master config page locator shape needs review');
  if (locatorIsReal && !userConfirmsRealLocator) missingReviewItems.push('A1XX has not confirmed this is the real private master config page');
  if (!integrationShared) missingReviewItems.push('Notion integration sharing not confirmed');
  if (!exactPageShared) missingReviewItems.push('Exact page share not confirmed');
  if (!trustedSource) missingReviewItems.push('Trusted source device not confirmed');
  if (!backupVisible) missingReviewItems.push('Backup visibility not confirmed');
  if (unsafe.length) missingReviewItems.push('Unsafe token/secret-like input detected');
  return jsonResponseV20({
    status: unsafe.length ? 'review' : 'locator_review_ready',
    ok: true,
    mode: 'locator_review_only',
    build: OS_REGISTRY_SUMMARY_BUILD_V20,
    checkedAt: checkedAt,
    target: 'private_notion_master_config_page',
    rawLocatorPreview: locator.preview,
    requestedPageId: locator.normalized,
    locatorIsReal: locatorIsReal,
    locatorShapeOk: locatorShapeOk,
    locatorType: locator.locatorType,
    pageIdFormat: locator.format,
    userConfirmsRealLocator: userConfirmsRealLocator,
    a1xxApprovalCaptured: approvalCaptured,
    integrationSharedConfirmed: integrationShared,
    exactPageSharedConfirmed: exactPageShared,
    trustedSourceConfirmed: trustedSource,
    backupVisible: backupVisible,
    locatorReviewExecuted: true,
    readEndpointActive: false,
    readExecuted: false,
    configReadExecuted: false,
    writeExecuted: false,
    writesEnabled: false,
    loginAnywhereActive: false,
    secretExport: false,
    tokenExport: false,
    restoreEnabled: false,
    workerAuthEnabled: false,
    automationActivationEnabled: false,
    unsafeFields: unsafe,
    missingReviewItems: missingReviewItems,
    allowedLocatorInputs: [
      'Notion page URL',
      '32-character Notion page ID',
      'hyphenated Notion page ID'
    ],
    nextAllowedStepAfterCleanReview: 'read_endpoint_contract_review_only',
    blockedActions: [
      'live master config read',
      'master config write',
      'login-anywhere activation',
      'auth sync write',
      'token export',
      'secret export',
      'worker auth',
      'automation activation',
      'restore execution'
    ],
    safety: {
      notion: 'No Notion read, create, update, archive, or delete executed.',
      sheets: 'No Sheet writes.',
      drive: 'No Drive writes, moves, renames, shares, restores, or deletes.',
      auth: 'No login-anywhere, auth sync, token export, or secret export.',
      recovery: 'No restore execution.'
    },
    message: 'Master config locator review is review-only. No master config read executed.'
  });
}

function getMasterConfigEndpointContractReviewV20(input) {
  var checkedAt = new Date().toISOString();
  var payload = input || {};
  var safeScanPayload = Object.assign({}, payload);
  delete safeScanPayload.secretScanGateIncluded;
  delete safeScanPayload.protectedValueScanGateIncluded;
  var unsafe = detectUnsafeMasterConfigReadSkeletonInputV20(safeScanPayload);
  var locator = normalizeMasterConfigPageLocatorV20(
    payload.masterConfigPageLocator || payload.masterConfigPageUrl || payload.masterConfigPageId || payload.pageId || ''
  );
  var approvalCaptured = normalizeBooleanV20(payload.a1xxApprovalCaptured);
  var noLiveReadConfirmed = normalizeBooleanV20(payload.noLiveReadConfirmed);
  var secretScanGateIncluded = Object.prototype.hasOwnProperty.call(payload, 'protectedValueScanGateIncluded')
    ? normalizeBooleanV20(payload.protectedValueScanGateIncluded)
    : normalizeBooleanV20(payload.secretScanGateIncluded);
  var readOnlyEndpointReviewIncluded = normalizeBooleanV20(payload.readOnlyEndpointReviewIncluded);
  var trustedSource = normalizeBooleanV20(payload.trustedSourceConfirmed);
  var backupVisible = normalizeBooleanV20(payload.backupVisible);
  var missingContractItems = [];
  if (!approvalCaptured) missingContractItems.push('A1XX approval not captured for endpoint contract review');
  if (!noLiveReadConfirmed) missingContractItems.push('No-live-read boundary not confirmed');
  if (!secretScanGateIncluded) missingContractItems.push('Secret scan gate not included in future read contract');
  if (!readOnlyEndpointReviewIncluded) missingContractItems.push('Read-only endpoint review gate not included');
  if (!trustedSource) missingContractItems.push('Trusted source device not confirmed');
  if (!backupVisible) missingContractItems.push('Backup visibility not confirmed');
  if (unsafe.length) missingContractItems.push('Unsafe token/secret-like input detected');
  return jsonResponseV20({
    status: unsafe.length ? 'review' : 'contract_review_ready',
    ok: true,
    mode: 'read_endpoint_contract_review_only',
    build: OS_REGISTRY_SUMMARY_BUILD_V20,
    checkedAt: checkedAt,
    target: 'private_notion_master_config_page',
    contractName: 'master_config_safe_read_contract_v1',
    futureEndpointAction: 'master_config_safe_read',
    futureEndpointActive: false,
    contractReviewExecuted: true,
    readEndpointActive: false,
    readExecuted: false,
    configReadExecuted: false,
    writeExecuted: false,
    writesEnabled: false,
    loginAnywhereActive: false,
    secretExport: false,
    tokenExport: false,
    restoreEnabled: false,
    workerAuthEnabled: false,
    automationActivationEnabled: false,
    rawLocatorPreview: locator.preview,
    requestedPageId: locator.normalized,
    locatorShapeOk: locator.format === 'notion_page_id_shape_ok',
    locatorType: locator.locatorType,
    pageIdFormat: locator.format,
    a1xxApprovalCaptured: approvalCaptured,
    noLiveReadConfirmed: noLiveReadConfirmed,
    secretScanGateIncluded: secretScanGateIncluded,
    readOnlyEndpointReviewIncluded: readOnlyEndpointReviewIncluded,
    trustedSourceConfirmed: trustedSource,
    backupVisible: backupVisible,
    unsafeFields: unsafe,
    missingContractItems: missingContractItems,
    allowedRequestFields: [
      'masterConfigPageLocator',
      'a1xxApprovalCaptured',
      'integrationSharedConfirmed',
      'exactPageSharedConfirmed',
      'trustedSourceConfirmed',
      'backupVisible',
      'secretScanPassed',
      'readOnlyEndpointReviewPassed',
      'sourceBuild'
    ],
    allowedResponseFields: [
      'profileId',
      'displayName',
      'safeSetupPointerKeys',
      'driveRootPointer',
      'registrySummaryPointers',
      'latestBackupMarker',
      'sourceBuild',
      'lastVerified',
      'readOnlyMode',
      'readReceipt'
    ],
    blockedRequestFields: [
      'notionToken',
      'googleOAuthToken',
      'webhookToken',
      'todoistToken',
      'hmacSecret',
      'password',
      'pin',
      'workerCredential',
      'automationSecret'
    ],
    requiredGatesBeforeFutureRead: [
      'A1XX approval',
      'exact master config page ID reviewed',
      'Notion integration shared to that exact page',
      'trusted source device confirmed',
      'backup visible before preview',
      'secret scan passed',
      'read-only endpoint review passed',
      'readback/receipt returned after any future read'
    ],
    nextAllowedStepAfterCleanContract: 'safe_read_preview_endpoint_build',
    blockedActions: [
      'live master config read',
      'master config write',
      'login-anywhere activation',
      'auth sync write',
      'token export',
      'secret export',
      'worker auth',
      'automation activation',
      'restore execution'
    ],
    safety: {
      notion: 'No Notion read, create, update, archive, or delete executed.',
      sheets: 'No Sheet writes.',
      drive: 'No Drive writes, moves, renames, shares, restores, or deletes.',
      auth: 'No login-anywhere, auth sync, token export, or secret export.',
      recovery: 'No restore execution.'
    },
    message: 'Master config endpoint contract review is review-only. No master config read executed.'
  });
}

function getMasterConfigSafeReadPreviewV20(input) {
  var checkedAt = new Date().toISOString();
  var payload = input || {};
  var safeScanPayload = Object.assign({}, payload);
  delete safeScanPayload.secretScanPassed;
  delete safeScanPayload.readOnlyEndpointReviewPassed;
  var unsafe = detectUnsafeMasterConfigReadSkeletonInputV20(safeScanPayload);
  var locator = normalizeMasterConfigPageLocatorV20(
    payload.masterConfigPageLocator || payload.masterConfigPageUrl || payload.masterConfigPageId || payload.pageId || ''
  );
  var approvalCaptured = normalizeBooleanV20(payload.a1xxApprovalCaptured);
  var integrationShared = normalizeBooleanV20(payload.integrationSharedConfirmed);
  var exactPageShared = normalizeBooleanV20(payload.exactPageSharedConfirmed);
  var trustedSource = normalizeBooleanV20(payload.trustedSourceConfirmed);
  var backupVisible = normalizeBooleanV20(payload.backupVisible);
  var secretScanPassed = normalizeBooleanV20(payload.secretScanPassed);
  var readOnlyEndpointReviewPassed = normalizeBooleanV20(payload.readOnlyEndpointReviewPassed);
  var locatorIsReal = locator.normalized !== 'preview_only';
  var locatorShapeOk = locator.format === 'notion_page_id_shape_ok';
  var missingPreviewItems = [];
  if (!approvalCaptured) missingPreviewItems.push('A1XX approval not captured for safe read preview');
  if (locatorIsReal && !locatorShapeOk) missingPreviewItems.push('Master config page locator shape needs review');
  if (!trustedSource) missingPreviewItems.push('Trusted source device not confirmed');
  if (!backupVisible) missingPreviewItems.push('Backup visibility not confirmed');
  if (!secretScanPassed) missingPreviewItems.push('Secret scan gate not passed for preview endpoint');
  if (!readOnlyEndpointReviewPassed) missingPreviewItems.push('Read-only endpoint review gate not passed');
  if (locatorIsReal && !integrationShared) missingPreviewItems.push('Notion integration sharing not confirmed');
  if (locatorIsReal && !exactPageShared) missingPreviewItems.push('Exact page share not confirmed');
  if (unsafe.length) missingPreviewItems.push('Unsafe token/secret-like input detected');
  return jsonResponseV20({
    status: unsafe.length ? 'review' : 'safe_read_preview_ready',
    ok: true,
    mode: 'safe_read_preview_only',
    build: OS_REGISTRY_SUMMARY_BUILD_V20,
    checkedAt: checkedAt,
    target: 'private_notion_master_config_page',
    previewEndpointActive: true,
    futureLiveReadEndpointActive: false,
    safeReadPreviewExecuted: true,
    readExecuted: false,
    configReadExecuted: false,
    notionReadExecuted: false,
    writeExecuted: false,
    writesEnabled: false,
    loginAnywhereActive: false,
    secretExport: false,
    tokenExport: false,
    restoreEnabled: false,
    workerAuthEnabled: false,
    automationActivationEnabled: false,
    rawLocatorPreview: locator.preview,
    requestedPageId: locator.normalized,
    locatorIsReal: locatorIsReal,
    locatorShapeOk: locatorShapeOk,
    locatorType: locator.locatorType,
    pageIdFormat: locator.format,
    a1xxApprovalCaptured: approvalCaptured,
    integrationSharedConfirmed: integrationShared,
    exactPageSharedConfirmed: exactPageShared,
    trustedSourceConfirmed: trustedSource,
    backupVisible: backupVisible,
    secretScanPassed: secretScanPassed,
    readOnlyEndpointReviewPassed: readOnlyEndpointReviewPassed,
    unsafeFields: unsafe,
    missingPreviewItems: missingPreviewItems,
    previewPackage: {
      profileId: 'a1xx-primary',
      displayName: 'A1XX',
      safeSetupPointerKeys: [
        'apps_script_web_app_url',
        'clean_workbook_id',
        'backup_folder_id',
        'mc_master_config_page_id',
        'team_chat_database_id',
        'intelligence_hq_page_id'
      ],
      driveRootPointer: 'preview_only',
      registrySummaryPointers: 'preview_only',
      latestBackupMarker: cellTextV20(payload.latestBackupMarker || 'visible_from_client_backup_gate', 120),
      sourceBuild: cellTextV20(payload.sourceBuild || OS_REGISTRY_SUMMARY_BUILD_V20, 180),
      lastVerified: checkedAt.slice(0, 10),
      readOnlyMode: true,
      readReceipt: 'preview_only_no_notion_read'
    },
    allowedResponseFields: [
      'profileId',
      'displayName',
      'safeSetupPointerKeys',
      'driveRootPointer',
      'registrySummaryPointers',
      'latestBackupMarker',
      'sourceBuild',
      'lastVerified',
      'readOnlyMode',
      'readReceipt'
    ],
    nextAllowedStepAfterPreview: 'real_master_config_read_gate_review',
    blockedActions: [
      'live master config read',
      'master config write',
      'login-anywhere activation',
      'auth sync write',
      'token export',
      'secret export',
      'worker auth',
      'automation activation',
      'restore execution'
    ],
    safety: {
      notion: 'No Notion read, create, update, archive, or delete executed.',
      sheets: 'No Sheet writes.',
      drive: 'No Drive writes, moves, renames, shares, restores, or deletes.',
      auth: 'No login-anywhere, auth sync, token export, or secret export.',
      recovery: 'No restore execution.'
    },
    message: 'Master config safe read preview endpoint returned preview data only. No master config read executed.'
  });
}

function getMasterConfigRealReadGateReviewV20(input) {
  var checkedAt = new Date().toISOString();
  var payload = input || {};
  var safeScanPayload = Object.assign({}, payload);
  delete safeScanPayload.secretScanPassed;
  delete safeScanPayload.protectedValueScanPassed;
  delete safeScanPayload.readOnlyEndpointReviewPassed;
  var unsafe = detectUnsafeMasterConfigReadSkeletonInputV20(safeScanPayload);
  var locator = normalizeMasterConfigPageLocatorV20(
    payload.masterConfigPageLocator || payload.masterConfigPageUrl || payload.masterConfigPageId || payload.pageId || ''
  );
  var locatorIsReal = locator.normalized !== 'preview_only';
  var locatorShapeOk = locator.format === 'notion_page_id_shape_ok';
  var approvalCaptured = normalizeBooleanV20(payload.a1xxApprovalCaptured);
  var firstReadApprovalCaptured = normalizeBooleanV20(payload.firstReadApprovalCaptured);
  var userConfirmsRealLocator = normalizeBooleanV20(payload.userConfirmsRealLocator);
  var integrationShared = normalizeBooleanV20(payload.integrationSharedConfirmed);
  var exactPageShared = normalizeBooleanV20(payload.exactPageSharedConfirmed);
  var trustedSource = normalizeBooleanV20(payload.trustedSourceConfirmed);
  var backupVisible = normalizeBooleanV20(payload.backupVisible);
  var secretScanPassed = Object.prototype.hasOwnProperty.call(payload, 'protectedValueScanPassed')
    ? normalizeBooleanV20(payload.protectedValueScanPassed)
    : normalizeBooleanV20(payload.secretScanPassed);
  var readOnlyEndpointReviewPassed = normalizeBooleanV20(payload.readOnlyEndpointReviewPassed);
  var safeReadPreviewVerified = normalizeBooleanV20(payload.safeReadPreviewVerified);
  var missingGateItems = [];
  if (!approvalCaptured) missingGateItems.push('A1XX approval not captured for gate review');
  if (!firstReadApprovalCaptured) missingGateItems.push('A1XX first real read approval not captured');
  if (!locatorIsReal) missingGateItems.push('Real master config page locator not supplied');
  if (locatorIsReal && !locatorShapeOk) missingGateItems.push('Real master config page locator shape needs review');
  if (locatorIsReal && !userConfirmsRealLocator) missingGateItems.push('A1XX has not confirmed this is the real private master config page');
  if (!integrationShared) missingGateItems.push('Notion integration sharing not confirmed');
  if (!exactPageShared) missingGateItems.push('Exact page share not confirmed');
  if (!trustedSource) missingGateItems.push('Trusted source device not confirmed');
  if (!backupVisible) missingGateItems.push('Backup visibility not confirmed');
  if (!secretScanPassed) missingGateItems.push('Secret scan gate not passed');
  if (!readOnlyEndpointReviewPassed) missingGateItems.push('Read-only endpoint review not passed');
  if (!safeReadPreviewVerified) missingGateItems.push('Safe read preview endpoint not verified');
  if (unsafe.length) missingGateItems.push('Unsafe token/secret-like input detected');
  return jsonResponseV20({
    status: unsafe.length ? 'review' : 'real_read_gate_review_ready',
    ok: true,
    mode: 'real_read_gate_review_only',
    build: OS_REGISTRY_SUMMARY_BUILD_V20,
    checkedAt: checkedAt,
    target: 'private_notion_master_config_page',
    gateReviewExecuted: true,
    firstReadGateReady: missingGateItems.length === 0,
    realReadEndpointActive: false,
    realReadExecuted: false,
    readExecuted: false,
    configReadExecuted: false,
    notionReadExecuted: false,
    writeExecuted: false,
    writesEnabled: false,
    loginAnywhereActive: false,
    secretExport: false,
    tokenExport: false,
    restoreEnabled: false,
    workerAuthEnabled: false,
    automationActivationEnabled: false,
    rawLocatorPreview: locator.preview,
    requestedPageId: locator.normalized,
    locatorIsReal: locatorIsReal,
    locatorShapeOk: locatorShapeOk,
    locatorType: locator.locatorType,
    pageIdFormat: locator.format,
    a1xxApprovalCaptured: approvalCaptured,
    firstReadApprovalCaptured: firstReadApprovalCaptured,
    userConfirmsRealLocator: userConfirmsRealLocator,
    integrationSharedConfirmed: integrationShared,
    exactPageSharedConfirmed: exactPageShared,
    trustedSourceConfirmed: trustedSource,
    backupVisible: backupVisible,
    secretScanPassed: secretScanPassed,
    readOnlyEndpointReviewPassed: readOnlyEndpointReviewPassed,
    safeReadPreviewVerified: safeReadPreviewVerified,
    unsafeFields: unsafe,
    missingGateItems: missingGateItems,
    gateReceipt: {
      receiptType: 'real_master_config_read_gate_review',
      canRunFirstRealReadLater: missingGateItems.length === 0,
      readAllowedNow: false,
      reason: 'Phase 8L reviews gates only. Phase 8M must separately approve and execute the first real read.',
      reviewedAt: checkedAt
    },
    requiredBeforeFirstRealRead: [
      'A1XX first real read approval',
      'real master config page locator supplied',
      'A1XX confirms locator is the real private master config page',
      'Notion integration shared to the exact page',
      'exact page share confirmed',
      'trusted source device confirmed',
      'backup visible before read',
      'secret scan passed',
      'read-only endpoint review passed',
      'safe read preview endpoint verified'
    ],
    nextAllowedStepAfterGateReview: 'first_real_master_config_read_single_page_read_only',
    blockedActions: [
      'live master config read',
      'master config write',
      'login-anywhere activation',
      'auth sync write',
      'token export',
      'secret export',
      'worker auth',
      'automation activation',
      'restore execution'
    ],
    safety: {
      notion: 'No Notion read, create, update, archive, or delete executed.',
      sheets: 'No Sheet writes.',
      drive: 'No Drive writes, moves, renames, shares, restores, or deletes.',
      auth: 'No login-anywhere, auth sync, token export, or secret export.',
      recovery: 'No restore execution.'
    },
    message: 'Master config real read gate review is review-only. No master config read executed.'
  });
}

function getNotionRichTextPlainV20(items) {
  if (!items || !items.length) return '';
  return items.map(function(item) {
    return cellTextV20(item && (item.plain_text || (item.text && item.text.content)) || '', 4000);
  }).join('');
}

function getNotionBlockPlainTextV20(block) {
  if (!block || !block.type) return '';
  var data = block[block.type] || {};
  if (data.rich_text) return getNotionRichTextPlainV20(data.rich_text);
  if (data.title) return getNotionRichTextPlainV20(data.title);
  if (data.caption) return getNotionRichTextPlainV20(data.caption);
  return '';
}

function formatNotionPageIdForApiV20(pageId) {
  var compact = String(pageId || '').replace(/-/g, '').trim();
  if (!/^[0-9a-fA-F]{32}$/.test(compact)) return pageId;
  return [
    compact.slice(0, 8),
    compact.slice(8, 12),
    compact.slice(12, 16),
    compact.slice(16, 20),
    compact.slice(20)
  ].join('-');
}

function fetchNotionPagePlainTextV20(pageId) {
  var apiPageId = formatNotionPageIdForApiV20(pageId);
  var url = 'https://api.notion.com/v1/blocks/' + encodeURIComponent(apiPageId) + '/children?page_size=100';
  var response = notionRequest('get', url);
  var text = response.text || '';
  var parsed = {};
  try { parsed = text ? JSON.parse(text) : {}; } catch (err) { parsed = {}; }
  var results = parsed && parsed.results && parsed.results.length ? parsed.results : [];
  var lines = results.map(function(block) { return getNotionBlockPlainTextV20(block); }).filter(function(line) {
    return String(line || '').trim();
  });
  return {
    code: response.code,
    ok: response.code >= 200 && response.code < 300,
    text: lines.join('\n\n'),
    blockCount: results.length,
    rawError: response.code >= 400 ? cellTextV20(text, 500) : ''
  };
}

function extractMasterConfigSafeReadSectionV20(pageText) {
  var text = String(pageText || '');
  var marker = '[MC_MASTER_CONFIG_SAFE_READ]';
  var index = text.indexOf(marker);
  if (index < 0) return { found: false, sectionText: '', config: {}, lines: [] };
  var section = text.slice(index + marker.length);
  var next = section.search(/\n\s*\[[A-Z0-9_ -]+\]/);
  if (next >= 0) section = section.slice(0, next);
  var config = {};
  var lines = section.split(/\r?\n/).map(function(line) { return line.trim(); }).filter(function(line) {
    return line && line.indexOf(':') > 0;
  });
  lines.forEach(function(line) {
    var pivot = line.indexOf(':');
    var key = line.slice(0, pivot).trim();
    var value = line.slice(pivot + 1).trim();
    if (key) config[key] = value;
  });
  return { found: true, sectionText: section, config: config, lines: lines };
}

function splitMasterConfigListV20(value) {
  return String(value || '').split(',').map(function(item) { return cellTextV20(item.trim(), 120); }).filter(function(item) { return item; });
}

function buildMasterConfigSafeReadPackageV20(config, pageId, pageRead, checkedAt, payload) {
  config = config || {};
  var pointerKeys = splitMasterConfigListV20(config.safeSetupPointerKeys);
  var pointerMap = {
    apps_script_web_app_url: cellTextV20(config.apps_script_web_app_url || '', 500),
    clean_workbook_id: cellTextV20(config.clean_workbook_id || '', 160),
    backup_folder_id: cellTextV20(config.backup_folder_id || '', 160),
    mc_master_config_page_id: cellTextV20(config.mc_master_config_page_id || pageId || '', 160),
    team_chat_database_id: cellTextV20(config.team_chat_database_id || '', 160),
    intelligence_hq_page_id: cellTextV20(config.intelligence_hq_page_id || '', 160)
  };
  var safeReadPackage = {
    profileId: cellTextV20(config.profileId || '', 120),
    displayName: cellTextV20(config.displayName || '', 120),
    safeSetupPointerKeys: pointerKeys,
    driveRootPointer: cellTextV20(config.driveRootPointer || '', 180),
    registrySummaryPointers: pointerMap,
    latestBackupMarker: cellTextV20(config.latestBackupMarker || payload.latestBackupMarker || '', 160),
    sourceBuild: cellTextV20(config.sourceBuild || payload.sourceBuild || OS_REGISTRY_SUMMARY_BUILD_V20, 180),
    lastVerified: cellTextV20(config.lastVerified || checkedAt.slice(0, 10), 40),
    readOnlyMode: String(config.readOnlyMode || '').toLowerCase() === 'true',
    readReceipt: {
      receiptType: 'first_real_master_config_read',
      pageId: pageId,
      readOnly: true,
      safeSectionOnly: true,
      blockCount: pageRead.blockCount || 0,
      fieldsReturned: 9,
      readAt: checkedAt
    }
  };
  return safeReadPackage;
}

function getMasterConfigFirstRealReadV20(input) {
  var checkedAt = new Date().toISOString();
  var payload = input || {};
  var safeScanPayload = Object.assign({}, payload);
  delete safeScanPayload.secretScanPassed;
  delete safeScanPayload.protectedValueScanPassed;
  delete safeScanPayload.readOnlyEndpointReviewPassed;
  var unsafe = detectUnsafeMasterConfigReadSkeletonInputV20(safeScanPayload);
  var locator = normalizeMasterConfigPageLocatorV20(
    payload.masterConfigPageLocator || payload.masterConfigPageUrl || payload.masterConfigPageId || payload.pageId || ''
  );
  var locatorIsReal = locator.normalized !== 'preview_only';
  var locatorShapeOk = locator.format === 'notion_page_id_shape_ok';
  var approvalCaptured = normalizeBooleanV20(payload.a1xxApprovalCaptured);
  var firstReadApprovalCaptured = normalizeBooleanV20(payload.firstReadApprovalCaptured);
  var userConfirmsRealLocator = normalizeBooleanV20(payload.userConfirmsRealLocator);
  var integrationShared = normalizeBooleanV20(payload.integrationSharedConfirmed);
  var exactPageShared = normalizeBooleanV20(payload.exactPageSharedConfirmed);
  var trustedSource = normalizeBooleanV20(payload.trustedSourceConfirmed);
  var backupVisible = normalizeBooleanV20(payload.backupVisible);
  var secretScanPassed = Object.prototype.hasOwnProperty.call(payload, 'protectedValueScanPassed')
    ? normalizeBooleanV20(payload.protectedValueScanPassed)
    : normalizeBooleanV20(payload.secretScanPassed);
  var readOnlyEndpointReviewPassed = normalizeBooleanV20(payload.readOnlyEndpointReviewPassed);
  var safeReadPreviewVerified = normalizeBooleanV20(payload.safeReadPreviewVerified);
  var gateFailures = [];
  if (!approvalCaptured) gateFailures.push('A1XX approval not captured for first real read');
  if (!firstReadApprovalCaptured) gateFailures.push('A1XX first real read approval not captured');
  if (!locatorIsReal) gateFailures.push('Real master config page locator not supplied');
  if (locatorIsReal && !locatorShapeOk) gateFailures.push('Real master config page locator shape needs review');
  if (locatorIsReal && !userConfirmsRealLocator) gateFailures.push('A1XX has not confirmed this is the real private master config page');
  if (!integrationShared) gateFailures.push('Notion integration sharing not confirmed');
  if (!exactPageShared) gateFailures.push('Exact page share not confirmed');
  if (!trustedSource) gateFailures.push('Trusted source device not confirmed');
  if (!backupVisible) gateFailures.push('Backup visibility not confirmed');
  if (!secretScanPassed) gateFailures.push('Secret scan gate not passed');
  if (!readOnlyEndpointReviewPassed) gateFailures.push('Read-only endpoint review not passed');
  if (!safeReadPreviewVerified) gateFailures.push('Safe read preview endpoint not verified');
  if (unsafe.length) gateFailures.push('Unsafe token/secret-like request input detected');
  var base = {
    ok: true,
    mode: 'first_real_master_config_read_read_only',
    build: OS_REGISTRY_SUMMARY_BUILD_V20,
    checkedAt: checkedAt,
    target: 'private_notion_master_config_page',
    firstRealReadEndpointActive: true,
    writeExecuted: false,
    writesEnabled: false,
    loginAnywhereActive: false,
    secretExport: false,
    tokenExport: false,
    restoreEnabled: false,
    workerAuthEnabled: false,
    automationActivationEnabled: false,
    rawLocatorPreview: locator.preview,
    requestedPageId: locator.normalized,
    locatorIsReal: locatorIsReal,
    locatorShapeOk: locatorShapeOk,
    locatorType: locator.locatorType,
    pageIdFormat: locator.format,
    a1xxApprovalCaptured: approvalCaptured,
    firstReadApprovalCaptured: firstReadApprovalCaptured,
    userConfirmsRealLocator: userConfirmsRealLocator,
    integrationSharedConfirmed: integrationShared,
    exactPageSharedConfirmed: exactPageShared,
    trustedSourceConfirmed: trustedSource,
    backupVisible: backupVisible,
    secretScanPassed: secretScanPassed,
    readOnlyEndpointReviewPassed: readOnlyEndpointReviewPassed,
    safeReadPreviewVerified: safeReadPreviewVerified,
    unsafeFields: unsafe,
    gateFailures: gateFailures,
    allowedResponseFields: [
      'profileId',
      'displayName',
      'safeSetupPointerKeys',
      'driveRootPointer',
      'registrySummaryPointers',
      'latestBackupMarker',
      'sourceBuild',
      'lastVerified',
      'readOnlyMode',
      'readReceipt'
    ],
    blockedActions: [
      'master config write',
      'login-anywhere activation',
      'auth sync write',
      'token export',
      'secret export',
      'worker auth',
      'automation activation',
      'restore execution'
    ],
    safety: {
      notion: 'One Notion page read is allowed. No Notion create, update, archive, or delete executed.',
      scope: 'Only the [MC_MASTER_CONFIG_SAFE_READ] section is parsed and returned.',
      sheets: 'No Sheet writes.',
      drive: 'No Drive writes, moves, renames, shares, restores, or deletes.',
      auth: 'No login-anywhere, auth sync, token export, or secret export.',
      recovery: 'No restore execution.'
    }
  };
  if (gateFailures.length) {
    base.status = 'blocked';
    base.readExecuted = false;
    base.configReadExecuted = false;
    base.notionReadExecuted = false;
    base.safeSectionFound = false;
    base.safeReadPackage = null;
    base.message = 'First real master config read is blocked by missing gates. No Notion read executed.';
    return jsonResponseV20(base);
  }
  var pageRead = fetchNotionPagePlainTextV20(locator.normalized);
  base.notionReadExecuted = true;
  if (!pageRead.ok) {
    base.status = 'review';
    base.readExecuted = false;
    base.configReadExecuted = false;
    base.safeSectionFound = false;
    base.safeReadPackage = null;
    base.notionStatusCode = pageRead.code;
    base.notionError = pageRead.rawError;
    base.message = 'Notion page read failed or is not shared to the integration. No config package returned.';
    return jsonResponseV20(base);
  }
  var section = extractMasterConfigSafeReadSectionV20(pageRead.text);
  var safeReadPackage = buildMasterConfigSafeReadPackageV20(section.config, locator.normalized, pageRead, checkedAt, payload);
  var packageUnsafe = detectUnsafeMasterConfigReadSkeletonInputV20(safeReadPackage);
  var missingFields = [];
  if (!section.found) missingFields.push('MC_MASTER_CONFIG_SAFE_READ section not found');
  if (!safeReadPackage.profileId) missingFields.push('profileId missing');
  if (!safeReadPackage.displayName) missingFields.push('displayName missing');
  if (!safeReadPackage.safeSetupPointerKeys.length) missingFields.push('safeSetupPointerKeys missing');
  if (!safeReadPackage.sourceBuild) missingFields.push('sourceBuild missing');
  if (!safeReadPackage.lastVerified) missingFields.push('lastVerified missing');
  if (safeReadPackage.readOnlyMode !== true) missingFields.push('readOnlyMode must be true');
  base.safeSectionFound = section.found;
  base.blockCount = pageRead.blockCount || 0;
  base.packageUnsafeFields = packageUnsafe;
  base.missingFields = missingFields;
  if (missingFields.length || packageUnsafe.length) {
    base.status = 'review';
    base.readExecuted = false;
    base.configReadExecuted = false;
    base.safeReadPackage = null;
    base.message = 'Notion page was read, but the safe config package needs review. No write executed.';
    return jsonResponseV20(base);
  }
  base.status = 'first_real_read_complete';
  base.readExecuted = true;
  base.configReadExecuted = true;
  base.safeReadPackage = safeReadPackage;
  base.readReceipt = safeReadPackage.readReceipt;
  base.message = 'First real master config read completed. Safe section returned only; no write executed.';
  return jsonResponseV20(base);
}

function parseMasterConfigJsonParamV20(value, fallback) {
  if (!value) return fallback || {};
  if (typeof value === 'object') return value;
  try { return JSON.parse(String(value)); } catch (err) { return fallback || {}; }
}

function getMasterConfigSafePackageNormalizeV20(input) {
  var checkedAt = new Date().toISOString();
  var payload = input || {};
  var safeReadPackage = parseMasterConfigJsonParamV20(payload.safeReadPackageJson || payload.safeReadPackage, {});
  var readReceipt = parseMasterConfigJsonParamV20(payload.readReceiptJson || payload.readReceipt, safeReadPackage.readReceipt || {});
  var unsafe = detectUnsafeMasterConfigReadSkeletonInputV20(safeReadPackage);
  var profileId = cellTextV20(safeReadPackage.profileId || '', 120);
  var displayName = cellTextV20(safeReadPackage.displayName || '', 120);
  var pointerKeys = Array.isArray(safeReadPackage.safeSetupPointerKeys)
    ? safeReadPackage.safeSetupPointerKeys.map(function(item) { return cellTextV20(item, 120); }).filter(function(item) { return item; })
    : splitMasterConfigListV20(safeReadPackage.safeSetupPointerKeys || '');
  var pointerMap = safeReadPackage.registrySummaryPointers || {};
  var allowedPointers = [
    'apps_script_web_app_url',
    'clean_workbook_id',
    'backup_folder_id',
    'mc_master_config_page_id',
    'team_chat_database_id',
    'intelligence_hq_page_id'
  ];
  var requiredPointers = [
    'apps_script_web_app_url',
    'mc_master_config_page_id',
    'team_chat_database_id',
    'intelligence_hq_page_id'
  ];
  var optionalPointers = [
    'clean_workbook_id',
    'backup_folder_id'
  ];
  var unknownPointerKeys = pointerKeys.filter(function(key) { return allowedPointers.indexOf(key) < 0; });
  var normalizedPointers = allowedPointers.map(function(key) {
    var value = cellTextV20(pointerMap[key] || '', key === 'apps_script_web_app_url' ? 500 : 180);
    var required = requiredPointers.indexOf(key) >= 0;
    var optional = optionalPointers.indexOf(key) >= 0;
    return {
      key: key,
      value: value,
      required: required,
      optional: optional,
      status: value ? 'Ready' : (required ? 'Missing Required' : 'Optional Gap')
    };
  });
  var missingRequiredPointers = normalizedPointers.filter(function(row) {
    return row.required && !row.value;
  }).map(function(row) { return row.key; });
  var optionalPointerGaps = normalizedPointers.filter(function(row) {
    return row.optional && !row.value;
  }).map(function(row) { return row.key; });
  var missingFields = [];
  if (!profileId) missingFields.push('profileId missing');
  if (!displayName) missingFields.push('displayName missing');
  if (!pointerKeys.length) missingFields.push('safeSetupPointerKeys missing');
  if (safeReadPackage.readOnlyMode !== true) missingFields.push('readOnlyMode must be true');
  if (!readReceipt || readReceipt.safeSectionOnly !== true) missingFields.push('safe section read receipt missing');
  if (unsafe.length) missingFields.push('Unsafe token/secret-like package field detected');
  var packageReady = !missingFields.length && !missingRequiredPointers.length && !unknownPointerKeys.length;
  return jsonResponseV20({
    status: packageReady ? (optionalPointerGaps.length ? 'normalized_with_optional_gaps' : 'normalized_ready') : 'review',
    ok: true,
    mode: 'safe_package_normalization_only',
    build: OS_REGISTRY_SUMMARY_BUILD_V20,
    checkedAt: checkedAt,
    normalizeExecuted: true,
    readExecuted: false,
    configReadExecuted: false,
    notionReadExecuted: false,
    writeExecuted: false,
    writesEnabled: false,
    loginAnywhereActive: false,
    secretExport: false,
    tokenExport: false,
    restoreEnabled: false,
    workerAuthEnabled: false,
    automationActivationEnabled: false,
    packageReady: packageReady,
    setupAutomationReady: packageReady && optionalPointerGaps.length === 0,
    profileId: profileId,
    displayName: displayName,
    sourceBuild: cellTextV20(safeReadPackage.sourceBuild || payload.sourceBuild || '', 180),
    latestBackupMarker: cellTextV20(safeReadPackage.latestBackupMarker || payload.latestBackupMarker || '', 160),
    lastVerified: cellTextV20(safeReadPackage.lastVerified || checkedAt.slice(0, 10), 40),
    readReceipt: {
      receiptType: cellTextV20(readReceipt.receiptType || '', 120),
      pageId: cellTextV20(readReceipt.pageId || '', 160),
      readOnly: readReceipt.readOnly === true,
      safeSectionOnly: readReceipt.safeSectionOnly === true,
      readAt: cellTextV20(readReceipt.readAt || '', 80)
    },
    normalizedPointers: normalizedPointers,
    requiredPointers: requiredPointers,
    optionalPointers: optionalPointers,
    missingRequiredPointers: missingRequiredPointers,
    optionalPointerGaps: optionalPointerGaps,
    unknownPointerKeys: unknownPointerKeys,
    missingFields: missingFields,
    unsafeFields: unsafe,
    nextAllowedStepAfterNormalization: packageReady
      ? (optionalPointerGaps.length ? 'safe_pointer_gap_review' : 'second_device_bootstrap_preview_plan')
      : 'repair_safe_master_config_package',
    blockedActions: [
      'live master config read',
      'master config write',
      'login-anywhere activation',
      'auth sync write',
      'token export',
      'secret export',
      'worker auth',
      'automation activation',
      'restore execution'
    ],
    safety: {
      notion: 'No Notion read, create, update, archive, or delete executed.',
      scope: 'Normalize only the already-returned safe read package.',
      sheets: 'No Sheet writes.',
      drive: 'No Drive writes, moves, renames, shares, restores, or deletes.',
      auth: 'No login-anywhere, auth sync, token export, or secret export.',
      recovery: 'No restore execution.'
    },
    message: packageReady
      ? 'Master config safe package normalized. No read or write executed.'
      : 'Master config safe package normalization needs review. No read or write executed.'
  });
}

function getMasterConfigSafePointerGapReviewV20(input) {
  var checkedAt = new Date().toISOString();
  var payload = input || {};
  var normalized = parseMasterConfigJsonParamV20(payload.normalizedPackageJson || payload.normalizedPackage, {});
  var optionalGapsRaw = parseMasterConfigJsonParamV20(payload.optionalPointerGapsJson, null);
  var missingRequiredRaw = parseMasterConfigJsonParamV20(payload.missingRequiredPointersJson, null);
  var missingFieldsRaw = parseMasterConfigJsonParamV20(payload.missingFieldsJson, null);
  var unsafeRaw = parseMasterConfigJsonParamV20(payload.unsafeFieldsJson, null);
  var optionalGaps = Array.isArray(optionalGapsRaw)
    ? optionalGapsRaw.map(function(item) { return cellTextV20(item, 120); }).filter(function(item) { return item; })
    : (Array.isArray(normalized.optionalPointerGaps)
      ? normalized.optionalPointerGaps.map(function(item) { return cellTextV20(item, 120); }).filter(function(item) { return item; })
      : splitMasterConfigListV20(normalized.optionalPointerGaps || ''));
  var missingRequired = Array.isArray(missingRequiredRaw)
    ? missingRequiredRaw.map(function(item) { return cellTextV20(item, 120); }).filter(function(item) { return item; })
    : (Array.isArray(normalized.missingRequiredPointers)
      ? normalized.missingRequiredPointers.map(function(item) { return cellTextV20(item, 120); }).filter(function(item) { return item; })
      : splitMasterConfigListV20(normalized.missingRequiredPointers || ''));
  var missingFields = Array.isArray(missingFieldsRaw)
    ? missingFieldsRaw.map(function(item) { return cellTextV20(item, 180); }).filter(function(item) { return item; })
    : (Array.isArray(normalized.missingFields)
      ? normalized.missingFields.map(function(item) { return cellTextV20(item, 180); }).filter(function(item) { return item; })
      : splitMasterConfigListV20(normalized.missingFields || ''));
  var unsafe = Array.isArray(unsafeRaw)
    ? unsafeRaw.map(function(item) { return cellTextV20(item, 180); }).filter(function(item) { return item; })
    : (Array.isArray(normalized.unsafeFields)
      ? normalized.unsafeFields.map(function(item) { return cellTextV20(item, 180); }).filter(function(item) { return item; })
      : []);
  var compactUnsafe = detectUnsafeMasterConfigReadSkeletonInputV20({
    sourceBuild: payload.sourceBuild || '',
    optionalPointerGaps: optionalGaps,
    missingRequiredPointers: missingRequired,
    missingFields: missingFields,
    unsafeFields: unsafe
  });
  unsafe = unsafe.concat(compactUnsafe).filter(function(item, index, arr) { return item && arr.indexOf(item) === index; });
  var knownOptional = ['clean_workbook_id', 'backup_folder_id'];
  var unknownOptionalGaps = optionalGaps.filter(function(key) { return knownOptional.indexOf(key) < 0; });
  var packageReady = Object.prototype.hasOwnProperty.call(payload, 'packageReady')
    ? normalizeBooleanV20(payload.packageReady)
    : normalizeBooleanV20(normalized.packageReady);
  var requiredClean = packageReady && missingRequired.length === 0 && missingFields.length === 0 && unsafe.length === 0;
  var gapReviewItems = optionalGaps.map(function(key) {
    var label = key === 'clean_workbook_id'
      ? 'Clean Workbook ID'
      : (key === 'backup_folder_id' ? 'Backup Folder ID' : key);
    var source = key === 'clean_workbook_id'
      ? 'Apps Script spreadsheet target or Setup Doctor health'
      : (key === 'backup_folder_id' ? 'Drive backup archive folder anchor' : 'Manual source review required');
    return {
      key: key,
      label: label,
      status: 'Optional Gap',
      recommendedAction: 'Fill in MC Master Config before second-device setup automation, or explicitly waive for manual setup.',
      safeSource: source
    };
  });
  var reviewReady = requiredClean && unknownOptionalGaps.length === 0;
  return jsonResponseV20({
    status: reviewReady ? (optionalGaps.length ? 'gap_review_ready_with_optional_gaps' : 'gap_review_ready_no_gaps') : 'review',
    ok: true,
    mode: 'safe_pointer_gap_review_only',
    build: OS_REGISTRY_SUMMARY_BUILD_V20,
    checkedAt: checkedAt,
    reviewExecuted: true,
    readExecuted: false,
    configReadExecuted: false,
    notionReadExecuted: false,
    writeExecuted: false,
    writesEnabled: false,
    loginAnywhereActive: false,
    secretExport: false,
    tokenExport: false,
    restoreEnabled: false,
    workerAuthEnabled: false,
    automationActivationEnabled: false,
    packageReady: packageReady,
    requiredPointersReady: requiredClean,
    setupAutomationReady: reviewReady && optionalGaps.length === 0,
    optionalGapsReviewed: reviewReady,
    optionalPointerGaps: optionalGaps,
    unknownOptionalGaps: unknownOptionalGaps,
    missingRequiredPointers: missingRequired,
    missingFields: missingFields,
    unsafeFields: unsafe,
    gapReviewItems: gapReviewItems,
    recommendedDecision: optionalGaps.length
      ? 'fill_optional_pointers_before_bootstrap_preview'
      : 'continue_to_second_device_bootstrap_preview_plan',
    requiredBeforeSetupAutomation: optionalGaps.length
      ? ['Fill clean_workbook_id and backup_folder_id in MC Master Config, or capture explicit A1XX waiver for manual setup.']
      : ['No optional pointer gaps remain. Continue only after A1XX approves the next phase.'],
    nextAllowedStepAfterGapReview: reviewReady
      ? (optionalGaps.length ? 'safe_pointer_gap_fill_plan' : 'second_device_bootstrap_preview_plan')
      : 'repair_safe_pointer_gap_review',
    blockedActions: [
      'live master config read',
      'master config write',
      'login-anywhere activation',
      'auth sync write',
      'token export',
      'secret export',
      'worker auth',
      'automation activation',
      'restore execution',
      'second-device bootstrap execution'
    ],
    safety: {
      notion: 'No Notion read, create, update, archive, or delete executed.',
      scope: 'Review only the normalized safe pointer gaps from Phase 8N.',
      sheets: 'No Sheet writes.',
      drive: 'No Drive writes, moves, renames, shares, restores, or deletes.',
      auth: 'No login-anywhere, auth sync, token export, or secret export.',
      recovery: 'No restore or bootstrap execution.'
    },
    message: reviewReady
      ? 'Safe pointer gap review completed. Optional gaps remain visible; no read or write executed.'
      : 'Safe pointer gap review needs review. No read or write executed.'
  });
}

function getMasterConfigSafePointerGapFillPlanV20(input) {
  var checkedAt = new Date().toISOString();
  var payload = input || {};
  var optionalGaps = parseMasterConfigJsonParamV20(payload.optionalPointerGapsJson, []);
  var unknownGaps = parseMasterConfigJsonParamV20(payload.unknownOptionalGapsJson, []);
  var missingRequired = parseMasterConfigJsonParamV20(payload.missingRequiredPointersJson, []);
  var missingFields = parseMasterConfigJsonParamV20(payload.missingFieldsJson, []);
  var unsafeFields = parseMasterConfigJsonParamV20(payload.unsafeFieldsJson, []);
  var candidates = parseMasterConfigJsonParamV20(payload.candidatesJson, []);
  optionalGaps = Array.isArray(optionalGaps) ? optionalGaps.map(function(item) { return cellTextV20(item, 120); }).filter(function(item) { return item; }) : [];
  unknownGaps = Array.isArray(unknownGaps) ? unknownGaps.map(function(item) { return cellTextV20(item, 120); }).filter(function(item) { return item; }) : [];
  missingRequired = Array.isArray(missingRequired) ? missingRequired.map(function(item) { return cellTextV20(item, 120); }).filter(function(item) { return item; }) : [];
  missingFields = Array.isArray(missingFields) ? missingFields.map(function(item) { return cellTextV20(item, 180); }).filter(function(item) { return item; }) : [];
  unsafeFields = Array.isArray(unsafeFields) ? unsafeFields.map(function(item) { return cellTextV20(item, 180); }).filter(function(item) { return item; }) : [];
  candidates = Array.isArray(candidates) ? candidates : [];
  var candidateByKey = {};
  candidates.forEach(function(item) {
    var key = cellTextV20(item && item.key || '', 120);
    if (!key) return;
    candidateByKey[key] = {
      key: key,
      label: cellTextV20(item.label || key, 180),
      value: cellTextV20(item.value || '', key === 'apps_script_web_app_url' ? 500 : 180),
      source: cellTextV20(item.source || '', 180),
      status: cellTextV20(item.status || '', 80)
    };
  });
  var compactUnsafe = detectUnsafeMasterConfigReadSkeletonInputV20({
    sourceBuild: payload.sourceBuild || '',
    optionalPointerGaps: optionalGaps,
    unknownOptionalGaps: unknownGaps,
    missingRequiredPointers: missingRequired,
    missingFields: missingFields,
    unsafeFields: unsafeFields,
    candidates: candidates.map(function(item) {
      return { key: item.key || '', source: item.source || '', status: item.status || '' };
    })
  });
  unsafeFields = unsafeFields.concat(compactUnsafe).filter(function(item, index, arr) { return item && arr.indexOf(item) === index; });
  var packageReady = normalizeBooleanV20(payload.packageReady);
  var gapReviewReady = normalizeBooleanV20(payload.gapReviewReady);
  var requiredPointersReady = normalizeBooleanV20(payload.requiredPointersReady);
  var fillPlanItems = optionalGaps.map(function(key) {
    var candidate = candidateByKey[key] || { key: key, label: key, value: '', source: '', status: '' };
    return {
      key: key,
      label: candidate.label || key,
      candidateValue: candidate.value,
      candidateSource: candidate.source || 'safe setup pointer index or local setup source',
      candidateStatus: candidate.value ? 'Candidate Ready' : 'Source Needed',
      fillTarget: 'MC Master Config safe read section',
      writeMode: 'future_write_gated',
      requiredGate: 'A1XX approval, backup-first, preview, B3 confirmation, write, readback verification'
    };
  });
  var missingCandidates = fillPlanItems.filter(function(item) { return !item.candidateValue; }).map(function(item) { return item.key; });
  var planReady = packageReady && gapReviewReady && requiredPointersReady
    && optionalGaps.length > 0
    && missingCandidates.length === 0
    && unknownGaps.length === 0
    && missingRequired.length === 0
    && missingFields.length === 0
    && unsafeFields.length === 0;
  return jsonResponseV20({
    status: planReady ? 'fill_plan_ready_with_candidates' : 'fill_plan_needs_review',
    ok: true,
    mode: 'safe_pointer_gap_fill_plan_only',
    build: OS_REGISTRY_SUMMARY_BUILD_V20,
    checkedAt: checkedAt,
    planExecuted: true,
    readExecuted: false,
    configReadExecuted: false,
    notionReadExecuted: false,
    writeExecuted: false,
    writesEnabled: false,
    loginAnywhereActive: false,
    secretExport: false,
    tokenExport: false,
    restoreEnabled: false,
    workerAuthEnabled: false,
    automationActivationEnabled: false,
    bootstrapExecutionEnabled: false,
    packageReady: packageReady,
    gapReviewReady: gapReviewReady,
    requiredPointersReady: requiredPointersReady,
    setupAutomationReady: false,
    optionalPointerGaps: optionalGaps,
    fillPlanItems: fillPlanItems,
    missingCandidateValues: missingCandidates,
    unknownOptionalGaps: unknownGaps,
    missingRequiredPointers: missingRequired,
    missingFields: missingFields,
    unsafeFields: unsafeFields,
    recommendedDecision: planReady
      ? 'preview_two_safe_pointer_fills_before_write'
      : 'repair_pointer_candidate_sources_before_fill_preview',
    requiredBeforeAnyFutureFill: [
      'A1XX approval for filling clean_workbook_id and backup_folder_id',
      'backup verified before preview',
      'preview exact two pointer values',
      'B3 confirmation before any write',
      'write only those two safe fields',
      'readback verification after write',
      'archive-only recovery if readback fails'
    ],
    nextAllowedStepAfterFillPlan: planReady
      ? 'safe_pointer_gap_fill_preview'
      : 'safe_pointer_gap_candidate_repair',
    blockedActions: [
      'live master config read',
      'master config write',
      'login-anywhere activation',
      'auth sync write',
      'token export',
      'secret export',
      'worker auth',
      'automation activation',
      'restore execution',
      'second-device bootstrap execution'
    ],
    safety: {
      notion: 'No Notion read, create, update, archive, or delete executed.',
      scope: 'Plan only the future fill for the two safe optional pointer fields.',
      sheets: 'No Sheet writes.',
      drive: 'No Drive writes, moves, renames, shares, restores, or deletes.',
      auth: 'No login-anywhere, auth sync, token export, or secret export.',
      recovery: 'No restore or bootstrap execution.'
    },
    message: planReady
      ? 'Safe pointer gap fill plan is ready. No read or write executed.'
      : 'Safe pointer gap fill plan needs review. No read or write executed.'
  });
}

function getMasterConfigSafePointerGapFillPreviewV20(input) {
  var checkedAt = new Date().toISOString();
  var payload = input || {};
  var expectedKeys = ['clean_workbook_id', 'backup_folder_id'];
  var fillPlanItems = parseMasterConfigJsonParamV20(payload.fillPlanItemsJson, []);
  var optionalGaps = parseMasterConfigJsonParamV20(payload.optionalPointerGapsJson, []);
  var missingCandidates = parseMasterConfigJsonParamV20(payload.missingCandidateValuesJson, []);
  var unknownGaps = parseMasterConfigJsonParamV20(payload.unknownOptionalGapsJson, []);
  var missingRequired = parseMasterConfigJsonParamV20(payload.missingRequiredPointersJson, []);
  var missingFields = parseMasterConfigJsonParamV20(payload.missingFieldsJson, []);
  var unsafeFields = parseMasterConfigJsonParamV20(payload.unsafeFieldsJson, []);
  fillPlanItems = Array.isArray(fillPlanItems) ? fillPlanItems : [];
  optionalGaps = Array.isArray(optionalGaps) ? optionalGaps.map(function(item) { return cellTextV20(item, 120); }).filter(function(item) { return item; }) : [];
  missingCandidates = Array.isArray(missingCandidates) ? missingCandidates.map(function(item) { return cellTextV20(item, 120); }).filter(function(item) { return item; }) : [];
  unknownGaps = Array.isArray(unknownGaps) ? unknownGaps.map(function(item) { return cellTextV20(item, 120); }).filter(function(item) { return item; }) : [];
  missingRequired = Array.isArray(missingRequired) ? missingRequired.map(function(item) { return cellTextV20(item, 120); }).filter(function(item) { return item; }) : [];
  missingFields = Array.isArray(missingFields) ? missingFields.map(function(item) { return cellTextV20(item, 180); }).filter(function(item) { return item; }) : [];
  unsafeFields = Array.isArray(unsafeFields) ? unsafeFields.map(function(item) { return cellTextV20(item, 180); }).filter(function(item) { return item; }) : [];
  var planByKey = {};
  fillPlanItems.forEach(function(item) {
    var key = cellTextV20(item && item.key || '', 120);
    if (!key) return;
    planByKey[key] = {
      key: key,
      label: cellTextV20(item.label || key, 180),
      candidateValue: cellTextV20(item.candidateValue || '', 220),
      candidateSource: cellTextV20(item.candidateSource || '', 180),
      candidateStatus: cellTextV20(item.candidateStatus || '', 80),
      fillTarget: cellTextV20(item.fillTarget || 'MC Master Config safe read section', 180)
    };
  });
  var previewItems = expectedKeys.map(function(key) {
    var plan = planByKey[key] || {};
    return {
      key: key,
      label: plan.label || key,
      target: 'MC Master Config safe read section',
      previousValue: 'blank_or_missing_in_safe_section',
      candidateValue: plan.candidateValue || '',
      candidateSource: plan.candidateSource || 'Phase 8P candidate plan',
      operation: 'future_update_safe_field',
      status: plan.candidateValue ? 'Preview Ready' : 'Candidate Missing'
    };
  });
  var unexpectedKeys = Object.keys(planByKey).filter(function(key) { return expectedKeys.indexOf(key) < 0; });
  var missingPreviewValues = previewItems.filter(function(item) { return !item.candidateValue; }).map(function(item) { return item.key; });
  var compactUnsafe = detectUnsafeMasterConfigReadSkeletonInputV20({
    sourceBuild: payload.sourceBuild || '',
    optionalPointerGaps: optionalGaps,
    missingCandidateValues: missingCandidates,
    unknownOptionalGaps: unknownGaps,
    missingRequiredPointers: missingRequired,
    missingFields: missingFields,
    unsafeFields: unsafeFields,
    previewItems: previewItems.map(function(item) {
      return {
        key: item.key,
        target: item.target,
        operation: item.operation,
        status: item.status
      };
    })
  });
  unsafeFields = unsafeFields.concat(compactUnsafe).filter(function(item, index, arr) { return item && arr.indexOf(item) === index; });
  var fillPlanReady = normalizeBooleanV20(payload.fillPlanReady);
  var packageReady = normalizeBooleanV20(payload.packageReady);
  var gapReviewReady = normalizeBooleanV20(payload.gapReviewReady);
  var requiredPointersReady = normalizeBooleanV20(payload.requiredPointersReady);
  var backupVisible = normalizeBooleanV20(payload.backupVisible);
  var trustedSource = normalizeBooleanV20(payload.trustedSourceConfirmed);
  var previewApproval = normalizeBooleanV20(payload.a1xxPreviewApprovalCaptured);
  var exactTwoFields = previewItems.length === 2
    && optionalGaps.length === 2
    && expectedKeys.every(function(key) { return optionalGaps.indexOf(key) >= 0; })
    && unexpectedKeys.length === 0;
  var previewReady = fillPlanReady
    && packageReady
    && gapReviewReady
    && requiredPointersReady
    && backupVisible
    && trustedSource
    && previewApproval
    && exactTwoFields
    && missingPreviewValues.length === 0
    && missingCandidates.length === 0
    && unknownGaps.length === 0
    && missingRequired.length === 0
    && missingFields.length === 0
    && unsafeFields.length === 0;
  return jsonResponseV20({
    status: previewReady ? 'fill_preview_ready_exact_two_fields' : 'fill_preview_needs_review',
    ok: true,
    mode: 'safe_pointer_gap_fill_preview_only',
    build: OS_REGISTRY_SUMMARY_BUILD_V20,
    checkedAt: checkedAt,
    previewExecuted: true,
    fillPreviewReady: previewReady,
    fillPlanReady: fillPlanReady,
    packageReady: packageReady,
    gapReviewReady: gapReviewReady,
    requiredPointersReady: requiredPointersReady,
    setupAutomationReady: false,
    readExecuted: false,
    configReadExecuted: false,
    notionReadExecuted: false,
    writeExecuted: false,
    writesEnabled: false,
    loginAnywhereActive: false,
    secretExport: false,
    tokenExport: false,
    restoreEnabled: false,
    workerAuthEnabled: false,
    automationActivationEnabled: false,
    bootstrapExecutionEnabled: false,
    backupVisible: backupVisible,
    trustedSourceConfirmed: trustedSource,
    a1xxPreviewApprovalCaptured: previewApproval,
    exactTwoFields: exactTwoFields,
    optionalPointerGaps: optionalGaps,
    previewItems: previewItems,
    unexpectedPreviewKeys: unexpectedKeys,
    missingPreviewValues: missingPreviewValues,
    missingCandidateValues: missingCandidates,
    unknownOptionalGaps: unknownGaps,
    missingRequiredPointers: missingRequired,
    missingFields: missingFields,
    unsafeFields: unsafeFields,
    recommendedDecision: previewReady
      ? 'confirm_b3_before_exact_two_safe_pointer_write'
      : 'repair_fill_preview_before_any_write',
    requiredBeforeAnyFutureWrite: [
      'A1XX approval for writing only clean_workbook_id and backup_folder_id',
      'backup verified immediately before write',
      'B3 confirmation before write',
      'write only those two safe pointer fields',
      'readback verification after write',
      'archive-only recovery if readback fails'
    ],
    nextAllowedStepAfterFillPreview: previewReady
      ? 'safe_pointer_gap_b3_write_confirmation'
      : 'safe_pointer_gap_fill_preview_repair',
    blockedActions: [
      'live master config read',
      'master config write',
      'login-anywhere activation',
      'auth sync write',
      'token export',
      'secret export',
      'worker auth',
      'automation activation',
      'restore execution',
      'second-device bootstrap execution'
    ],
    safety: {
      notion: 'No Notion read, create, update, archive, or delete executed.',
      scope: 'Preview only the exact two safe optional pointer fields from Phase 8P.',
      sheets: 'No Sheet writes.',
      drive: 'No Drive writes, moves, renames, shares, restores, or deletes.',
      auth: 'No login-anywhere, auth sync, token export, or secret export.',
      recovery: 'No restore or bootstrap execution.'
    },
    message: previewReady
      ? 'Safe pointer gap fill preview is ready. Exact two fields only; no read or write executed.'
      : 'Safe pointer gap fill preview needs review. No read or write executed.'
  });
}

function getMasterConfigSafePointerGapB3ConfirmationV20(input) {
  var checkedAt = new Date().toISOString();
  var payload = input || {};
  var expectedKeys = ['clean_workbook_id', 'backup_folder_id'];
  var previewItems = parseMasterConfigJsonParamV20(payload.previewItemsJson, []);
  var optionalGaps = parseMasterConfigJsonParamV20(payload.optionalPointerGapsJson, []);
  var missingPreviewValues = parseMasterConfigJsonParamV20(payload.missingPreviewValuesJson, []);
  var missingCandidates = parseMasterConfigJsonParamV20(payload.missingCandidateValuesJson, []);
  var unexpectedKeys = parseMasterConfigJsonParamV20(payload.unexpectedPreviewKeysJson, []);
  var unknownGaps = parseMasterConfigJsonParamV20(payload.unknownOptionalGapsJson, []);
  var missingRequired = parseMasterConfigJsonParamV20(payload.missingRequiredPointersJson, []);
  var missingFields = parseMasterConfigJsonParamV20(payload.missingFieldsJson, []);
  var unsafeFields = parseMasterConfigJsonParamV20(payload.unsafeFieldsJson, []);
  previewItems = Array.isArray(previewItems) ? previewItems : [];
  optionalGaps = Array.isArray(optionalGaps) ? optionalGaps.map(function(item) { return cellTextV20(item, 120); }).filter(function(item) { return item; }) : [];
  missingPreviewValues = Array.isArray(missingPreviewValues) ? missingPreviewValues.map(function(item) { return cellTextV20(item, 120); }).filter(function(item) { return item; }) : [];
  missingCandidates = Array.isArray(missingCandidates) ? missingCandidates.map(function(item) { return cellTextV20(item, 120); }).filter(function(item) { return item; }) : [];
  unexpectedKeys = Array.isArray(unexpectedKeys) ? unexpectedKeys.map(function(item) { return cellTextV20(item, 120); }).filter(function(item) { return item; }) : [];
  unknownGaps = Array.isArray(unknownGaps) ? unknownGaps.map(function(item) { return cellTextV20(item, 120); }).filter(function(item) { return item; }) : [];
  missingRequired = Array.isArray(missingRequired) ? missingRequired.map(function(item) { return cellTextV20(item, 120); }).filter(function(item) { return item; }) : [];
  missingFields = Array.isArray(missingFields) ? missingFields.map(function(item) { return cellTextV20(item, 180); }).filter(function(item) { return item; }) : [];
  unsafeFields = Array.isArray(unsafeFields) ? unsafeFields.map(function(item) { return cellTextV20(item, 180); }).filter(function(item) { return item; }) : [];
  var normalizedItems = previewItems.map(function(item) {
    return {
      key: cellTextV20(item && item.key || '', 120),
      label: cellTextV20(item && item.label || item && item.key || '', 180),
      target: cellTextV20(item && item.target || 'MC Master Config safe read section', 180),
      previousValue: cellTextV20(item && item.previousValue || 'blank_or_missing_in_safe_section', 180),
      candidateValue: cellTextV20(item && item.candidateValue || '', 220),
      candidateSource: cellTextV20(item && item.candidateSource || '', 180),
      operation: cellTextV20(item && item.operation || '', 120),
      status: cellTextV20(item && item.status || '', 80)
    };
  }).filter(function(item) { return item.key; });
  var normalizedKeys = normalizedItems.map(function(item) { return item.key; });
  var exactTwoFields = normalizedItems.length === 2
    && optionalGaps.length === 2
    && expectedKeys.every(function(key) { return normalizedKeys.indexOf(key) >= 0 && optionalGaps.indexOf(key) >= 0; })
    && unexpectedKeys.length === 0;
  var compactUnsafe = detectUnsafeMasterConfigReadSkeletonInputV20({
    sourceBuild: payload.sourceBuild || '',
    optionalPointerGaps: optionalGaps,
    previewItems: normalizedItems.map(function(item) {
      return {
        key: item.key,
        target: item.target,
        operation: item.operation,
        status: item.status
      };
    }),
    missingPreviewValues: missingPreviewValues,
    missingCandidateValues: missingCandidates,
    unexpectedPreviewKeys: unexpectedKeys,
    unknownOptionalGaps: unknownGaps,
    missingRequiredPointers: missingRequired,
    missingFields: missingFields,
    unsafeFields: unsafeFields
  });
  unsafeFields = unsafeFields.concat(compactUnsafe).filter(function(item, index, arr) { return item && arr.indexOf(item) === index; });
  var fillPreviewReady = normalizeBooleanV20(payload.fillPreviewReady);
  var fillPlanReady = normalizeBooleanV20(payload.fillPlanReady);
  var packageReady = normalizeBooleanV20(payload.packageReady);
  var gapReviewReady = normalizeBooleanV20(payload.gapReviewReady);
  var requiredPointersReady = normalizeBooleanV20(payload.requiredPointersReady);
  var backupVisible = normalizeBooleanV20(payload.backupVisible);
  var trustedSource = normalizeBooleanV20(payload.trustedSourceConfirmed);
  var approvalCaptured = normalizeBooleanV20(payload.a1xxB3ApprovalCaptured);
  var confirmationText = cellTextV20(payload.confirmationText || '', 120);
  var expectedConfirmationText = 'B3 CONFIRM TWO SAFE POINTERS';
  var b3Confirmed = fillPreviewReady
    && fillPlanReady
    && packageReady
    && gapReviewReady
    && requiredPointersReady
    && backupVisible
    && trustedSource
    && approvalCaptured
    && confirmationText === expectedConfirmationText
    && exactTwoFields
    && missingPreviewValues.length === 0
    && missingCandidates.length === 0
    && unexpectedKeys.length === 0
    && unknownGaps.length === 0
    && missingRequired.length === 0
    && missingFields.length === 0
    && unsafeFields.length === 0;
  return jsonResponseV20({
    status: b3Confirmed ? 'b3_confirmation_armed_exact_two_fields' : 'b3_confirmation_needs_review',
    ok: true,
    mode: 'safe_pointer_gap_b3_confirmation_only',
    build: OS_REGISTRY_SUMMARY_BUILD_V20,
    checkedAt: checkedAt,
    b3ConfirmationExecuted: true,
    b3Confirmed: b3Confirmed,
    b3ArmedAt: b3Confirmed ? checkedAt : '',
    confirmationText: confirmationText,
    expectedConfirmationText: expectedConfirmationText,
    fillPreviewReady: fillPreviewReady,
    fillPlanReady: fillPlanReady,
    packageReady: packageReady,
    gapReviewReady: gapReviewReady,
    requiredPointersReady: requiredPointersReady,
    setupAutomationReady: false,
    readExecuted: false,
    configReadExecuted: false,
    notionReadExecuted: false,
    writeExecuted: false,
    writesEnabled: false,
    loginAnywhereActive: false,
    secretExport: false,
    tokenExport: false,
    restoreEnabled: false,
    workerAuthEnabled: false,
    automationActivationEnabled: false,
    bootstrapExecutionEnabled: false,
    backupVisible: backupVisible,
    trustedSourceConfirmed: trustedSource,
    a1xxB3ApprovalCaptured: approvalCaptured,
    exactTwoFields: exactTwoFields,
    writeScope: 'exact_two_safe_pointer_fields_only',
    target: 'MC Master Config safe read section',
    optionalPointerGaps: optionalGaps,
    confirmedPreviewItems: normalizedItems,
    missingPreviewValues: missingPreviewValues,
    missingCandidateValues: missingCandidates,
    unexpectedPreviewKeys: unexpectedKeys,
    unknownOptionalGaps: unknownGaps,
    missingRequiredPointers: missingRequired,
    missingFields: missingFields,
    unsafeFields: unsafeFields,
    recommendedDecision: b3Confirmed
      ? 'review_exact_two_field_write_endpoint_before_write'
      : 'repair_b3_confirmation_before_any_write',
    requiredBeforeAnyFutureWrite: [
      'backup verified immediately before write',
      'write endpoint contract reviewed for exact two safe fields',
      'write only clean_workbook_id and backup_folder_id',
      'readback verification after write',
      'archive-only recovery if readback fails'
    ],
    nextAllowedStepAfterB3: b3Confirmed
      ? 'safe_pointer_gap_write_endpoint_review'
      : 'safe_pointer_gap_b3_confirmation_repair',
    blockedActions: [
      'live master config read',
      'master config write',
      'login-anywhere activation',
      'auth sync write',
      'token export',
      'secret export',
      'worker auth',
      'automation activation',
      'restore execution',
      'second-device bootstrap execution'
    ],
    safety: {
      notion: 'No Notion read, create, update, archive, or delete executed.',
      scope: 'B3 confirms only the exact two safe pointer fields previewed in Phase 8Q.',
      sheets: 'No Sheet writes.',
      drive: 'No Drive writes, moves, renames, shares, restores, or deletes.',
      auth: 'No login-anywhere, auth sync, token export, or secret export.',
      recovery: 'No restore or bootstrap execution.'
    },
    message: b3Confirmed
      ? 'B3 confirmation is armed for the exact two safe pointer fields. No read or write executed.'
      : 'B3 confirmation needs review. No read or write executed.'
  });
}

function getMasterConfigSafePointerGapWriteEndpointReviewV20(input) {
  var checkedAt = new Date().toISOString();
  var payload = input || {};
  var expectedKeys = ['clean_workbook_id', 'backup_folder_id'];
  var confirmedItems = parseMasterConfigJsonParamV20(payload.confirmedPreviewItemsJson, []);
  var optionalGaps = parseMasterConfigJsonParamV20(payload.optionalPointerGapsJson, []);
  var missingPreviewValues = parseMasterConfigJsonParamV20(payload.missingPreviewValuesJson, []);
  var missingCandidates = parseMasterConfigJsonParamV20(payload.missingCandidateValuesJson, []);
  var unexpectedKeys = parseMasterConfigJsonParamV20(payload.unexpectedPreviewKeysJson, []);
  var unknownGaps = parseMasterConfigJsonParamV20(payload.unknownOptionalGapsJson, []);
  var missingRequired = parseMasterConfigJsonParamV20(payload.missingRequiredPointersJson, []);
  var missingFields = parseMasterConfigJsonParamV20(payload.missingFieldsJson, []);
  var unsafeFields = parseMasterConfigJsonParamV20(payload.unsafeFieldsJson, []);
  confirmedItems = Array.isArray(confirmedItems) ? confirmedItems : [];
  optionalGaps = Array.isArray(optionalGaps) ? optionalGaps.map(function(item) { return cellTextV20(item, 120); }).filter(function(item) { return item; }) : [];
  missingPreviewValues = Array.isArray(missingPreviewValues) ? missingPreviewValues.map(function(item) { return cellTextV20(item, 120); }).filter(function(item) { return item; }) : [];
  missingCandidates = Array.isArray(missingCandidates) ? missingCandidates.map(function(item) { return cellTextV20(item, 120); }).filter(function(item) { return item; }) : [];
  unexpectedKeys = Array.isArray(unexpectedKeys) ? unexpectedKeys.map(function(item) { return cellTextV20(item, 120); }).filter(function(item) { return item; }) : [];
  unknownGaps = Array.isArray(unknownGaps) ? unknownGaps.map(function(item) { return cellTextV20(item, 120); }).filter(function(item) { return item; }) : [];
  missingRequired = Array.isArray(missingRequired) ? missingRequired.map(function(item) { return cellTextV20(item, 120); }).filter(function(item) { return item; }) : [];
  missingFields = Array.isArray(missingFields) ? missingFields.map(function(item) { return cellTextV20(item, 180); }).filter(function(item) { return item; }) : [];
  unsafeFields = Array.isArray(unsafeFields) ? unsafeFields.map(function(item) { return cellTextV20(item, 180); }).filter(function(item) { return item; }) : [];
  var normalizedItems = confirmedItems.map(function(item) {
    return {
      key: cellTextV20(item && item.key || '', 120),
      label: cellTextV20(item && item.label || item && item.key || '', 180),
      target: cellTextV20(item && item.target || 'MC Master Config safe read section', 180),
      previousValue: cellTextV20(item && item.previousValue || 'blank_or_missing_in_safe_section', 180),
      candidateValue: cellTextV20(item && item.candidateValue || '', 220),
      candidateSource: cellTextV20(item && item.candidateSource || '', 180),
      operation: cellTextV20(item && item.operation || '', 120),
      status: cellTextV20(item && item.status || '', 80)
    };
  }).filter(function(item) { return item.key; });
  var normalizedKeys = normalizedItems.map(function(item) { return item.key; });
  var exactTwoFields = normalizedItems.length === 2
    && optionalGaps.length === 2
    && expectedKeys.every(function(key) { return normalizedKeys.indexOf(key) >= 0 && optionalGaps.indexOf(key) >= 0; })
    && unexpectedKeys.length === 0;
  var compactUnsafe = detectUnsafeMasterConfigReadSkeletonInputV20({
    sourceBuild: payload.sourceBuild || '',
    optionalPointerGaps: optionalGaps,
    confirmedItems: normalizedItems.map(function(item) {
      return {
        key: item.key,
        target: item.target,
        operation: item.operation,
        status: item.status
      };
    }),
    missingPreviewValues: missingPreviewValues,
    missingCandidateValues: missingCandidates,
    unexpectedPreviewKeys: unexpectedKeys,
    unknownOptionalGaps: unknownGaps,
    missingRequiredPointers: missingRequired,
    missingFields: missingFields,
    unsafeFields: unsafeFields
  });
  unsafeFields = unsafeFields.concat(compactUnsafe).filter(function(item, index, arr) { return item && arr.indexOf(item) === index; });
  var b3Confirmed = normalizeBooleanV20(payload.b3Confirmed);
  var b3ArmedAt = cellTextV20(payload.b3ArmedAt || '', 80);
  var confirmationText = cellTextV20(payload.confirmationText || '', 120);
  var fillPreviewReady = normalizeBooleanV20(payload.fillPreviewReady);
  var fillPlanReady = normalizeBooleanV20(payload.fillPlanReady);
  var packageReady = normalizeBooleanV20(payload.packageReady);
  var gapReviewReady = normalizeBooleanV20(payload.gapReviewReady);
  var requiredPointersReady = normalizeBooleanV20(payload.requiredPointersReady);
  var backupVisible = normalizeBooleanV20(payload.backupVisible);
  var trustedSource = normalizeBooleanV20(payload.trustedSourceConfirmed);
  var approvalCaptured = normalizeBooleanV20(payload.a1xxEndpointReviewApprovalCaptured);
  var writeScope = cellTextV20(payload.writeScope || '', 120);
  var endpointContractReady = b3Confirmed
    && !!b3ArmedAt
    && confirmationText === 'B3 CONFIRM TWO SAFE POINTERS'
    && fillPreviewReady
    && fillPlanReady
    && packageReady
    && gapReviewReady
    && requiredPointersReady
    && backupVisible
    && trustedSource
    && approvalCaptured
    && exactTwoFields
    && writeScope === 'exact_two_safe_pointer_fields_only'
    && missingPreviewValues.length === 0
    && missingCandidates.length === 0
    && unexpectedKeys.length === 0
    && unknownGaps.length === 0
    && missingRequired.length === 0
    && missingFields.length === 0
    && unsafeFields.length === 0;
  return jsonResponseV20({
    status: endpointContractReady ? 'write_endpoint_review_ready_exact_two_fields' : 'write_endpoint_review_needs_review',
    ok: true,
    mode: 'safe_pointer_gap_write_endpoint_review_only',
    build: OS_REGISTRY_SUMMARY_BUILD_V20,
    checkedAt: checkedAt,
    endpointReviewExecuted: true,
    endpointContractReady: endpointContractReady,
    futureWriteEndpointActive: false,
    writeEndpointActive: false,
    b3Confirmed: b3Confirmed,
    b3ArmedAt: b3ArmedAt,
    confirmationText: confirmationText,
    fillPreviewReady: fillPreviewReady,
    fillPlanReady: fillPlanReady,
    packageReady: packageReady,
    gapReviewReady: gapReviewReady,
    requiredPointersReady: requiredPointersReady,
    setupAutomationReady: false,
    readExecuted: false,
    configReadExecuted: false,
    notionReadExecuted: false,
    writeExecuted: false,
    writesEnabled: false,
    loginAnywhereActive: false,
    secretExport: false,
    tokenExport: false,
    restoreEnabled: false,
    workerAuthEnabled: false,
    automationActivationEnabled: false,
    bootstrapExecutionEnabled: false,
    backupVisible: backupVisible,
    trustedSourceConfirmed: trustedSource,
    a1xxEndpointReviewApprovalCaptured: approvalCaptured,
    exactTwoFields: exactTwoFields,
    writeScope: 'exact_two_safe_pointer_fields_only',
    endpointName: 'master_config_safe_pointer_gap_write_exact_two_v1',
    endpointAction: 'master_config_safe_pointer_gap_write_exact_two',
    target: 'MC Master Config safe read section',
    optionalPointerGaps: optionalGaps,
    reviewedWriteItems: normalizedItems,
    missingPreviewValues: missingPreviewValues,
    missingCandidateValues: missingCandidates,
    unexpectedPreviewKeys: unexpectedKeys,
    unknownOptionalGaps: unknownGaps,
    missingRequiredPointers: missingRequired,
    missingFields: missingFields,
    unsafeFields: unsafeFields,
    allowedRequestFields: [
      'b3Confirmed',
      'b3ArmedAt',
      'confirmationText',
      'writeScope',
      'target',
      'safePointerUpdates',
      'backupVerified',
      'latestBackupMarker',
      'sourceBuild'
    ],
    allowedWriteFields: [
      'clean_workbook_id',
      'backup_folder_id'
    ],
    allowedResponseFields: [
      'status',
      'mode',
      'writeReceipt',
      'writeExecuted',
      'readbackRequired',
      'readbackReceipt',
      'blockedActions'
    ],
    blockedRequestFields: [
      'notionToken',
      'googleOAuthToken',
      'webhookToken',
      'todoistToken',
      'hmacSecret',
      'password',
      'pin',
      'workerCredential',
      'automationSecret'
    ],
    requiredBeforeAnyFutureWrite: [
      'fresh backup verified immediately before write',
      'write action reviewed and separately approved by A1XX',
      'write only clean_workbook_id and backup_folder_id',
      'return write receipt',
      'run readback verification after write',
      'archive-only recovery if readback fails'
    ],
    nextAllowedStepAfterEndpointReview: endpointContractReady
      ? 'safe_pointer_gap_exact_two_write_preflight'
      : 'safe_pointer_gap_write_endpoint_review_repair',
    blockedActions: [
      'live master config read',
      'master config write',
      'login-anywhere activation',
      'auth sync write',
      'token export',
      'secret export',
      'worker auth',
      'automation activation',
      'restore execution',
      'second-device bootstrap execution'
    ],
    safety: {
      notion: 'No Notion read, create, update, archive, or delete executed.',
      scope: 'Review only the future exact two-field safe pointer write endpoint contract.',
      sheets: 'No Sheet writes.',
      drive: 'No Drive writes, moves, renames, shares, restores, or deletes.',
      auth: 'No login-anywhere, auth sync, token export, or secret export.',
      recovery: 'No restore or bootstrap execution.'
    },
    message: endpointContractReady
      ? 'Safe pointer gap write endpoint review is ready. No read or write executed.'
      : 'Safe pointer gap write endpoint review needs review. No read or write executed.'
  });
}

function normalizeMasterConfigExactTwoWriteInputV20(input) {
  var payload = input || {};
  var expectedKeys = ['clean_workbook_id', 'backup_folder_id'];
  var reviewedItems = parseMasterConfigJsonParamV20(payload.reviewedWriteItemsJson, []);
  reviewedItems = Array.isArray(reviewedItems) ? reviewedItems : [];
  var normalizedItems = reviewedItems.map(function(item) {
    return {
      key: cellTextV20(item && item.key || '', 120),
      label: cellTextV20(item && item.label || item && item.key || '', 180),
      target: cellTextV20(item && item.target || 'MC Master Config safe read section', 180),
      previousValue: cellTextV20(item && item.previousValue || 'blank_or_missing_in_safe_section', 180),
      candidateValue: cellTextV20(item && item.candidateValue || '', 220),
      candidateSource: cellTextV20(item && item.candidateSource || '', 180),
      operation: cellTextV20(item && item.operation || '', 120),
      status: cellTextV20(item && item.status || '', 80)
    };
  }).filter(function(item) { return item.key; });
  var normalizedKeys = normalizedItems.map(function(item) { return item.key; });
  var optionalGaps = parseMasterConfigJsonParamV20(payload.optionalPointerGapsJson, []);
  optionalGaps = Array.isArray(optionalGaps) ? optionalGaps.map(function(item) { return cellTextV20(item, 120); }).filter(function(item) { return item; }) : [];
  var itemByKey = {};
  normalizedItems.forEach(function(item) { itemByKey[item.key] = item; });
  var updates = expectedKeys.map(function(key) {
    var item = itemByKey[key] || {};
    return {
      key: key,
      value: cellTextV20(item.candidateValue || '', 220),
      target: 'MC Master Config safe read section',
      operation: 'update_safe_field'
    };
  });
  return {
    payload: payload,
    expectedKeys: expectedKeys,
    optionalGaps: optionalGaps,
    reviewedItems: normalizedItems,
    reviewedKeys: normalizedKeys,
    updates: updates,
    missingUpdateValues: updates.filter(function(item) { return !item.value; }).map(function(item) { return item.key; })
  };
}

function getMasterConfigExactTwoWriteGateV20(input, requireFreshBackup) {
  var data = normalizeMasterConfigExactTwoWriteInputV20(input);
  var payload = data.payload;
  var locator = normalizeMasterConfigPageLocatorV20(
    payload.masterConfigPageLocator || payload.masterConfigPageUrl || payload.masterConfigPageId || payload.pageId || ''
  );
  var latestBackup = getLatestDriveBackupStatusSnapshotV20().latest || {};
  var missing = [];
  var unsafe = detectUnsafeMasterConfigReadSkeletonInputV20({
    sourceBuild: payload.sourceBuild || '',
    writeScope: payload.writeScope || '',
    endpointName: payload.endpointName || '',
    endpointAction: payload.endpointAction || '',
    updateKeys: data.updates.map(function(item) { return item.key; })
  });
  var exactTwoFields = data.reviewedItems.length === 2
    && data.optionalGaps.length === 2
    && data.expectedKeys.every(function(key) { return data.reviewedKeys.indexOf(key) >= 0 && data.optionalGaps.indexOf(key) >= 0; })
    && data.missingUpdateValues.length === 0;
  var backupMarker = cellTextV20(payload.latestBackupMarker || payload.backupMarker || '', 160);
  var backupOk = !!(latestBackup.backupId && latestBackup.driveFileId);
  if (!normalizeBooleanV20(payload.endpointContractReady)) missing.push('endpointContractReady');
  if (normalizeBooleanV20(payload.futureWriteEndpointActive)) missing.push('futureWriteEndpointActive must be false before preflight');
  if (normalizeBooleanV20(payload.writeEndpointActive)) missing.push('writeEndpointActive must be false before preflight');
  if (!normalizeBooleanV20(payload.b3Confirmed)) missing.push('b3Confirmed');
  if (!cellTextV20(payload.b3ArmedAt || '', 80)) missing.push('b3ArmedAt');
  if (cellTextV20(payload.confirmationText || '', 120) !== 'B3 CONFIRM TWO SAFE POINTERS') missing.push('confirmationText');
  if (!normalizeBooleanV20(payload.backupVisible)) missing.push('backupVisible');
  if (!normalizeBooleanV20(payload.trustedSourceConfirmed)) missing.push('trustedSourceConfirmed');
  if (!normalizeBooleanV20(payload.a1xxWritePreflightApprovalCaptured) && !normalizeBooleanV20(payload.a1xxExactWriteApprovalCaptured)) missing.push('A1XX write approval');
  if (cellTextV20(payload.writeScope || '', 120) !== 'exact_two_safe_pointer_fields_only') missing.push('writeScope');
  if (!exactTwoFields) missing.push('exactTwoFields');
  if (locator.normalized === 'preview_only' || locator.format !== 'notion_page_id_shape_ok') missing.push('real master config page locator');
  if (requireFreshBackup && !backupOk) missing.push('latestBackup');
  if (requireFreshBackup && backupMarker && latestBackup.backupId && backupMarker !== latestBackup.backupId) missing.push('latestBackupMarker');
  if (data.missingUpdateValues.length) missing.push('missing update values: ' + data.missingUpdateValues.join(', '));
  if (unsafe.length) missing.push('unsafeFields');
  return {
    ready: missing.length === 0,
    missing: missing,
    unsafe: unsafe,
    locator: locator,
    latestBackup: latestBackup,
    backupMarker: backupMarker,
    exactTwoFields: exactTwoFields,
    data: data
  };
}

function getMasterConfigSafePointerGapExactTwoWritePreflightV20(input) {
  var checkedAt = new Date().toISOString();
  var gate = getMasterConfigExactTwoWriteGateV20(input, false);
  return jsonResponseV20({
    status: gate.ready ? 'exact_two_write_preflight_ready' : 'exact_two_write_preflight_needs_review',
    ok: true,
    mode: 'safe_pointer_gap_exact_two_write_preflight_only',
    build: OS_REGISTRY_SUMMARY_BUILD_V20,
    checkedAt: checkedAt,
    preflightExecuted: true,
    exactWritePreflightReady: gate.ready,
    futureWriteEndpointActive: false,
    writeEndpointActive: false,
    readExecuted: false,
    configReadExecuted: false,
    notionReadExecuted: false,
    writeExecuted: false,
    writesEnabled: false,
    loginAnywhereActive: false,
    secretExport: false,
    tokenExport: false,
    restoreEnabled: false,
    workerAuthEnabled: false,
    automationActivationEnabled: false,
    bootstrapExecutionEnabled: false,
    requestedPageId: gate.locator.normalized,
    locatorShapeOk: gate.locator.format === 'notion_page_id_shape_ok',
    b3Confirmed: normalizeBooleanV20(gate.data.payload.b3Confirmed),
    exactTwoFields: gate.exactTwoFields,
    writeScope: 'exact_two_safe_pointer_fields_only',
    latestBackupMarker: gate.latestBackup.backupId || gate.backupMarker || '',
    writeItems: gate.data.updates,
    missingGateItems: gate.missing,
    unsafeFields: gate.unsafe,
    requiredBeforeExactWrite: [
      'fresh backup verified immediately before write',
      'A1XX exact write approval captured',
      'write only clean_workbook_id and backup_folder_id',
      'return write receipt',
      'run readback verification after write',
      'archive-only recovery if readback fails'
    ],
    nextAllowedStepAfterPreflight: gate.ready
      ? 'safe_pointer_gap_exact_two_write'
      : 'safe_pointer_gap_exact_two_write_preflight_repair',
    blockedActions: [
      'master config write',
      'login-anywhere activation',
      'auth sync write',
      'token export',
      'secret export',
      'worker auth',
      'automation activation',
      'restore execution',
      'second-device bootstrap execution'
    ],
    message: gate.ready
      ? 'Exact two-field write preflight is ready. No read or write executed.'
      : 'Exact two-field write preflight needs review. No read or write executed.'
  });
}

function fetchNotionPageBlocksV20(pageId) {
  var apiPageId = formatNotionPageIdForApiV20(pageId);
  var url = 'https://api.notion.com/v1/blocks/' + encodeURIComponent(apiPageId) + '/children?page_size=100';
  var response = notionRequest('get', url);
  var parsed = {};
  try { parsed = response.text ? JSON.parse(response.text) : {}; } catch (err) { parsed = {}; }
  return {
    code: response.code,
    ok: response.code >= 200 && response.code < 300,
    blocks: parsed.results || [],
    rawError: response.code >= 400 ? cellTextV20(response.text || '', 500) : ''
  };
}

function patchNotionRichTextBlockV20(block, text) {
  if (!block || !block.id || !block.type || !block[block.type] || !block[block.type].rich_text) {
    return { ok: false, code: 'unsupported_block', text: 'Block cannot be patched as rich_text.' };
  }
  var payload = {};
  payload[block.type] = {
    rich_text: [{ type: 'text', text: { content: String(text || '') } }]
  };
  var result = notionRequest('patch', 'https://api.notion.com/v1/blocks/' + encodeURIComponent(block.id), payload);
  return { ok: result.code >= 200 && result.code < 300, code: result.code, text: result.text || '' };
}

function appendNotionSafePointerLinesAfterBlockV20(pageId, afterBlockId, updates) {
  var apiPageId = formatNotionPageIdForApiV20(pageId);
  var payload = {
    after: afterBlockId,
    children: (updates || []).map(function(update) {
      return {
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ type: 'text', text: { content: update.key + ': ' + update.value } }]
        }
      };
    })
  };
  var result = notionRequest('patch', 'https://api.notion.com/v1/blocks/' + encodeURIComponent(apiPageId) + '/children', payload);
  var parsed = {};
  try { parsed = result.text ? JSON.parse(result.text) : {}; } catch (err) { parsed = {}; }
  return {
    ok: result.code >= 200 && result.code < 300,
    code: result.code,
    text: result.text || '',
    results: parsed.results || []
  };
}

function writeMasterConfigSafePointerGapExactTwoV20(input) {
  var checkedAt = new Date().toISOString();
  var gate = getMasterConfigExactTwoWriteGateV20(input, true);
  var base = {
    ok: true,
    mode: 'safe_pointer_gap_exact_two_write',
    build: OS_REGISTRY_SUMMARY_BUILD_V20,
    checkedAt: checkedAt,
    exactWriteEndpointActive: true,
    requestedPageId: gate.locator.normalized,
    b3Confirmed: normalizeBooleanV20(gate.data.payload.b3Confirmed),
    exactTwoFields: gate.exactTwoFields,
    writeScope: 'exact_two_safe_pointer_fields_only',
    latestBackupMarker: gate.latestBackup.backupId || gate.backupMarker || '',
    writeItems: gate.data.updates,
    missingGateItems: gate.missing,
    unsafeFields: gate.unsafe,
    readExecuted: false,
    configReadExecuted: false,
    notionReadExecuted: false,
    writeExecuted: false,
    writesEnabled: false,
    loginAnywhereActive: false,
    secretExport: false,
    tokenExport: false,
    restoreEnabled: false,
    workerAuthEnabled: false,
    automationActivationEnabled: false,
    bootstrapExecutionEnabled: false,
    blockedActions: [
      'login-anywhere activation',
      'auth sync write',
      'token export',
      'secret export',
      'worker auth',
      'automation activation',
      'restore execution',
      'second-device bootstrap execution'
    ]
  };
  if (!gate.ready || !normalizeBooleanV20(gate.data.payload.a1xxExactWriteApprovalCaptured)) {
    base.status = 'blocked';
    if (!normalizeBooleanV20(gate.data.payload.a1xxExactWriteApprovalCaptured)) base.missingGateItems.push('A1XX exact write approval');
    base.message = 'Exact two-field write blocked by missing gates. No write executed.';
    return jsonResponseV20(base);
  }
  var blockRead = fetchNotionPageBlocksV20(gate.locator.normalized);
  base.notionReadExecuted = true;
  if (!blockRead.ok) {
    base.status = 'review';
    base.notionStatusCode = blockRead.code;
    base.notionError = blockRead.rawError;
    base.message = 'Could not read master config blocks before write. No write executed.';
    return jsonResponseV20(base);
  }
  var safeStarted = false;
  var safeMarkerBlock = null;
  var targets = {};
  blockRead.blocks.forEach(function(block) {
    var text = getNotionBlockPlainTextV20(block).trim();
    if (text.indexOf('[MC_MASTER_CONFIG_SAFE_READ]') >= 0) {
      safeStarted = true;
      safeMarkerBlock = block;
      return;
    }
    if (safeStarted && /^\[[A-Z0-9_ -]+\]$/.test(text)) safeStarted = false;
    if (!safeStarted) return;
    gate.data.expectedKeys.forEach(function(key) {
      if (!targets[key] && new RegExp('^' + key + '\\s*:').test(text)) targets[key] = { block: block, text: text };
    });
  });
  var missingBlocks = gate.data.expectedKeys.filter(function(key) { return !targets[key]; });
  var insertResults = [];
  if (missingBlocks.length) {
    if (!safeMarkerBlock || !safeMarkerBlock.id) {
      base.status = 'review';
      base.missingTargetBlocks = missingBlocks;
      base.message = 'Could not find safe section marker for missing pointer lines. No write executed.';
      return jsonResponseV20(base);
    }
    var missingUpdates = gate.data.updates.filter(function(update) { return missingBlocks.indexOf(update.key) >= 0; });
    var insert = appendNotionSafePointerLinesAfterBlockV20(gate.locator.normalized, safeMarkerBlock.id, missingUpdates);
    insertResults = missingUpdates.map(function(update, index) {
      var inserted = insert.results && insert.results[index] ? insert.results[index] : {};
      return {
        key: update.key,
        blockId: inserted.id || '',
        nextText: update.key + ': ' + update.value,
        code: insert.code,
        ok: insert.ok,
        operation: 'insert_missing_safe_line'
      };
    });
    if (!insert.ok) {
      base.status = 'review';
      base.missingTargetBlocks = missingBlocks;
      base.insertResults = insertResults;
      base.notionError = cellTextV20(insert.text || '', 500);
      base.message = 'Notion rejected missing safe pointer line creation. No pointer update completed.';
      return jsonResponseV20(base);
    }
  }
  var patches = [];
  for (var i = 0; i < gate.data.updates.length; i++) {
    var update = gate.data.updates[i];
    var target = targets[update.key];
    if (!target && missingBlocks.indexOf(update.key) >= 0) continue;
    var nextText = update.key + ': ' + update.value;
    var patch = patchNotionRichTextBlockV20(target.block, nextText);
    patches.push({ key: update.key, blockId: target.block.id, previousText: target.text, nextText: nextText, code: patch.code, ok: patch.ok });
    if (!patch.ok) {
      base.status = 'review';
      base.patchResults = patches;
      base.message = 'Notion rejected one safe pointer update. Stop and use archive-only recovery if needed.';
      return jsonResponseV20(base);
    }
  }
  Utilities.sleep(600);
  var readback = fetchNotionPagePlainTextV20(gate.locator.normalized);
  var section = readback.ok ? extractMasterConfigSafeReadSectionV20(readback.text) : { config: {} };
  var verified = readback.ok && gate.data.updates.every(function(item) {
    return cellTextV20(section.config[item.key] || '', 220) === item.value;
  });
  base.status = verified ? 'exact_two_write_complete' : 'readback_review';
  base.readExecuted = true;
  base.configReadExecuted = true;
  base.writeExecuted = true;
  base.writesEnabled = true;
  base.insertResults = insertResults;
  base.patchResults = patches;
  base.writeReceipt = {
    receiptType: 'safe_pointer_gap_exact_two_write',
    pageId: gate.locator.normalized,
    fieldsWritten: gate.data.expectedKeys,
    backupMarker: gate.latestBackup.backupId || '',
    wroteAt: checkedAt
  };
  base.readbackReceipt = {
    receiptType: 'safe_pointer_gap_exact_two_readback',
    verified: verified,
    readAt: new Date().toISOString(),
    values: {
      clean_workbook_id: cellTextV20(section.config.clean_workbook_id || '', 220),
      backup_folder_id: cellTextV20(section.config.backup_folder_id || '', 220)
    }
  };
  base.message = verified
    ? 'Exact two safe pointer fields written and read back cleanly.'
    : 'Exact two safe pointer write ran, but readback needs review.';
  return jsonResponseV20(base);
}

function getMasterConfigPostWriteReadbackCloseoutV20(input) {
  var payload = input || {};
  var checkedAt = new Date().toISOString();
  var locator = normalizeMasterConfigPageLocatorV20(
    payload.masterConfigPageLocator || payload.masterConfigPageUrl || payload.masterConfigPageId || payload.pageId || ''
  );
  var writeReceipt = parseMasterConfigJsonParamV20(payload.writeReceiptJson, {});
  var readbackReceipt = parseMasterConfigJsonParamV20(payload.readbackReceiptJson, {});
  var latestBackup = getLatestDriveBackupStatusSnapshotV20().latest || {};
  var expectedRequired = [
    'apps_script_web_app_url',
    'mc_master_config_page_id',
    'team_chat_database_id',
    'intelligence_hq_page_id'
  ];
  var expectedOptional = [
    'clean_workbook_id',
    'backup_folder_id'
  ];
  var allExpected = expectedRequired.concat(expectedOptional);
  var unsafe = detectUnsafeMasterConfigReadSkeletonInputV20({
    sourceBuild: payload.sourceBuild || '',
    writeReceiptType: writeReceipt.receiptType || '',
    readbackReceiptType: readbackReceipt.receiptType || '',
    expectedKeys: allExpected
  });
  var missingGateItems = [];
  var exactWriteReceiptPresent = !!(
    writeReceipt &&
    writeReceipt.receiptType === 'safe_pointer_gap_exact_two_write' &&
    Array.isArray(writeReceipt.fieldsWritten) &&
    writeReceipt.fieldsWritten.indexOf('clean_workbook_id') >= 0 &&
    writeReceipt.fieldsWritten.indexOf('backup_folder_id') >= 0
  );
  var readbackVerified = !!(
    readbackReceipt &&
    readbackReceipt.receiptType === 'safe_pointer_gap_exact_two_readback' &&
    readbackReceipt.verified === true
  );
  if (!normalizeBooleanV20(payload.a1xxCloseoutApprovalCaptured)) missingGateItems.push('A1XX closeout approval');
  if (!normalizeBooleanV20(payload.backupVisible)) missingGateItems.push('backupVisible');
  if (!normalizeBooleanV20(payload.trustedSourceConfirmed)) missingGateItems.push('trustedSourceConfirmed');
  if (locator.normalized === 'preview_only' || locator.format !== 'notion_page_id_shape_ok') missingGateItems.push('real master config page locator');
  var pageRead = { ok: false, text: '', blockCount: 0, rawError: '' };
  var section = { found: false, config: {}, lines: [] };
  if (locator.normalized !== 'preview_only' && locator.format === 'notion_page_id_shape_ok') {
    pageRead = fetchNotionPagePlainTextV20(locator.normalized);
    section = pageRead.ok ? extractMasterConfigSafeReadSectionV20(pageRead.text) : section;
  }
  var pointerRows = allExpected.map(function(key) {
    var value = cellTextV20(section.config[key] || '', key === 'apps_script_web_app_url' ? 500 : 220);
    return {
      key: key,
      value: value,
      required: expectedRequired.indexOf(key) >= 0,
      status: value ? 'Ready' : 'Missing'
    };
  });
  var missingRequired = pointerRows.filter(function(row) { return row.required && !row.value; }).map(function(row) { return row.key; });
  var optionalGaps = pointerRows.filter(function(row) { return !row.required && !row.value; }).map(function(row) { return row.key; });
  var safePointerPackageReady = !!(section.found && missingRequired.length === 0 && optionalGaps.length === 0);
  var packageReadbackVerified = !!(pageRead.ok && safePointerPackageReady);
  var postReloadCloseoutAccepted = !!(
    normalizeBooleanV20(payload.postReloadCloseoutAccepted) ||
    normalizeBooleanV20(payload.safePackageReadbackAccepted)
  );
  var phase8uReceiptPathReady = !!(exactWriteReceiptPresent && readbackVerified);
  var safePackageReadbackPathReady = !!(packageReadbackVerified && postReloadCloseoutAccepted);
  if (!phase8uReceiptPathReady && !safePackageReadbackPathReady) {
    missingGateItems.push('Phase 8U receipt or current safe package readback acceptance');
  }
  var closeoutSource = phase8uReceiptPathReady
    ? 'phase8u_write_receipt'
    : (safePackageReadbackPathReady ? 'current_safe_package_readback' : 'none');
  var closeoutReady = !!(
    pageRead.ok &&
    section.found &&
    safePointerPackageReady &&
    (phase8uReceiptPathReady || safePackageReadbackPathReady) &&
    missingGateItems.length === 0 &&
    unsafe.length === 0
  );
  return jsonResponseV20({
    status: closeoutReady ? 'post_write_readback_closeout_ready' : 'post_write_readback_closeout_needs_review',
    ok: true,
    mode: 'master_config_post_write_readback_closeout_read_only',
    build: OS_REGISTRY_SUMMARY_BUILD_V20,
    checkedAt: checkedAt,
    closeoutExecuted: true,
    readExecuted: pageRead.ok,
    configReadExecuted: pageRead.ok,
    notionReadExecuted: pageRead.ok,
    writeExecuted: false,
    writesEnabled: false,
    loginAnywhereActive: false,
    secretExport: false,
    tokenExport: false,
    restoreEnabled: false,
    workerAuthEnabled: false,
    automationActivationEnabled: false,
    bootstrapExecutionEnabled: false,
    setupAutomationPreviewReady: closeoutReady,
    setupAutomationReady: false,
    safePointerPackageReady: safePointerPackageReady,
    optionalGapsResolved: optionalGaps.length === 0,
    exactWriteReceiptPresent: exactWriteReceiptPresent,
    readbackVerified: readbackVerified,
    packageReadbackVerified: packageReadbackVerified,
    postReloadCloseoutAccepted: postReloadCloseoutAccepted,
    phase8uReceiptPathReady: phase8uReceiptPathReady,
    safePackageReadbackPathReady: safePackageReadbackPathReady,
    closeoutSource: closeoutSource,
    requestedPageId: locator.normalized,
    locatorShapeOk: locator.format === 'notion_page_id_shape_ok',
    latestBackupMarker: latestBackup.backupId || cellTextV20(payload.latestBackupMarker || '', 160),
    safeSectionFound: section.found,
    blockCountRead: pageRead.blockCount || 0,
    pointerRows: pointerRows,
    missingRequiredPointers: missingRequired,
    optionalPointerGaps: optionalGaps,
    missingGateItems: missingGateItems,
    unsafeFields: unsafe,
    nextAllowedStepAfterCloseout: closeoutReady
      ? 'second_device_bootstrap_preview_plan'
      : 'post_write_readback_closeout_repair',
    blockedActions: [
      'live master config write',
      'login-anywhere activation',
      'auth sync write',
      'token export',
      'secret export',
      'worker auth',
      'automation activation',
      'restore execution',
      'second-device bootstrap execution'
    ],
    message: closeoutReady
      ? 'Post-write readback closeout is clean. Setup automation is ready for preview only.'
      : 'Post-write readback closeout needs review. No write executed.'
  });
}

function getSecondDeviceBootstrapPreviewPlanV20(input) {
  var payload = input || {};
  var checkedAt = new Date().toISOString();
  var locator = normalizeMasterConfigPageLocatorV20(
    payload.masterConfigPageLocator || payload.masterConfigPageUrl || payload.masterConfigPageId || payload.pageId || ''
  );
  var closeoutReceipt = parseMasterConfigJsonParamV20(payload.closeoutReceiptJson, {});
  var latestBackup = getLatestDriveBackupStatusSnapshotV20().latest || {};
  var expectedRequired = [
    'apps_script_web_app_url',
    'mc_master_config_page_id',
    'team_chat_database_id',
    'intelligence_hq_page_id'
  ];
  var expectedOptional = [
    'clean_workbook_id',
    'backup_folder_id'
  ];
  var allExpected = expectedRequired.concat(expectedOptional);
  var unsafe = detectUnsafeMasterConfigReadSkeletonInputV20({
    sourceBuild: payload.sourceBuild || '',
    targetDeviceLabel: payload.targetDeviceLabel || '',
    closeoutStatus: closeoutReceipt.status || '',
    expectedKeys: allExpected
  });
  var missingGateItems = [];
  if (!normalizeBooleanV20(payload.a1xxPreviewApprovalCaptured)) missingGateItems.push('A1XX bootstrap preview approval');
  if (!normalizeBooleanV20(payload.backupVisible)) missingGateItems.push('backupVisible');
  if (!normalizeBooleanV20(payload.trustedSourceConfirmed)) missingGateItems.push('trustedSourceConfirmed');
  if (locator.normalized === 'preview_only' || locator.format !== 'notion_page_id_shape_ok') missingGateItems.push('real master config page locator');
  var pageRead = { ok: false, text: '', blockCount: 0, rawError: '' };
  var section = { found: false, config: {}, lines: [] };
  if (locator.normalized !== 'preview_only' && locator.format === 'notion_page_id_shape_ok') {
    pageRead = fetchNotionPagePlainTextV20(locator.normalized);
    section = pageRead.ok ? extractMasterConfigSafeReadSectionV20(pageRead.text) : section;
  }
  var pointerRows = allExpected.map(function(key) {
    var value = cellTextV20(section.config[key] || '', key === 'apps_script_web_app_url' ? 500 : 220);
    return {
      key: key,
      value: value,
      required: expectedRequired.indexOf(key) >= 0,
      status: value ? 'Ready' : 'Missing'
    };
  });
  var missingRequired = pointerRows.filter(function(row) { return row.required && !row.value; }).map(function(row) { return row.key; });
  var optionalGaps = pointerRows.filter(function(row) { return !row.required && !row.value; }).map(function(row) { return row.key; });
  var safePointerPackageReady = !!(section.found && missingRequired.length === 0 && optionalGaps.length === 0);
  var phase8vCloseoutReady = !!(
    normalizeBooleanV20(payload.phase8vCloseoutReady) ||
    (
      closeoutReceipt &&
      closeoutReceipt.status === 'post_write_readback_closeout_ready' &&
      closeoutReceipt.safePointerPackageReady === true &&
      closeoutReceipt.optionalGapsResolved === true &&
      closeoutReceipt.packageReadbackVerified === true &&
      closeoutReceipt.setupAutomationPreviewReady === true &&
      closeoutReceipt.setupAutomationReady === false
    )
  );
  if (!phase8vCloseoutReady) missingGateItems.push('Phase 8V post-write readback closeout');
  var planItems = [
    {
      key: 'confirm_second_device_identity',
      label: 'Confirm second device identity and trust request',
      mode: 'manual_preview_only',
      status: 'Preview Only'
    },
    {
      key: 'load_safe_pointer_package',
      label: 'Use safe setup pointers from MC Master Config',
      mode: 'read_only',
      status: safePointerPackageReady ? 'Ready' : 'Blocked'
    },
    {
      key: 'open_apps_script_bridge',
      label: 'Open Apps Script bridge URL on the second device',
      pointerKey: 'apps_script_web_app_url',
      mode: 'manual_preview_only',
      status: section.config.apps_script_web_app_url ? 'Ready' : 'Blocked'
    },
    {
      key: 'restore_from_verified_backup',
      label: 'Preview restore source from latest verified Drive backup',
      pointerKey: 'backup_folder_id',
      mode: 'preview_only',
      status: section.config.backup_folder_id ? 'Ready' : 'Blocked'
    },
    {
      key: 'open_clean_workbook',
      label: 'Preview clean workbook connection',
      pointerKey: 'clean_workbook_id',
      mode: 'preview_only',
      status: section.config.clean_workbook_id ? 'Ready' : 'Blocked'
    },
    {
      key: 'keep_protected_actions_blocked',
      label: 'Keep login-anywhere, restore execution, workers, and automations blocked',
      mode: 'safety_boundary',
      status: 'Blocked'
    }
  ];
  var previewReady = !!(
    pageRead.ok &&
    section.found &&
    safePointerPackageReady &&
    phase8vCloseoutReady &&
    missingGateItems.length === 0 &&
    unsafe.length === 0
  );
  return jsonResponseV20({
    status: previewReady ? 'second_device_bootstrap_preview_plan_ready' : 'second_device_bootstrap_preview_plan_needs_review',
    ok: true,
    mode: 'second_device_bootstrap_preview_plan_only',
    build: OS_REGISTRY_SUMMARY_BUILD_V20,
    checkedAt: checkedAt,
    previewPlanExecuted: true,
    previewPlanReady: previewReady,
    readExecuted: pageRead.ok,
    configReadExecuted: pageRead.ok,
    notionReadExecuted: pageRead.ok,
    writeExecuted: false,
    writesEnabled: false,
    loginAnywhereActive: false,
    secretExport: false,
    tokenExport: false,
    restoreEnabled: false,
    restoreExecutionEnabled: false,
    workerAuthEnabled: false,
    automationActivationEnabled: false,
    bootstrapExecutionEnabled: false,
    setupAutomationPreviewReady: previewReady,
    setupAutomationReady: false,
    phase8vCloseoutReady: phase8vCloseoutReady,
    safePointerPackageReady: safePointerPackageReady,
    optionalGapsResolved: optionalGaps.length === 0,
    requestedPageId: locator.normalized,
    locatorShapeOk: locator.format === 'notion_page_id_shape_ok',
    latestBackupMarker: latestBackup.backupId || cellTextV20(payload.latestBackupMarker || '', 160),
    safeSectionFound: section.found,
    blockCountRead: pageRead.blockCount || 0,
    targetDeviceLabel: cellTextV20(payload.targetDeviceLabel || 'second device', 120),
    pointerRows: pointerRows,
    previewPlanItems: planItems,
    missingRequiredPointers: missingRequired,
    optionalPointerGaps: optionalGaps,
    missingGateItems: missingGateItems,
    unsafeFields: unsafe,
    nextAllowedStepAfterPreviewPlan: previewReady
      ? 'second_device_bootstrap_dry_run_preview'
      : 'second_device_bootstrap_preview_plan_repair',
    blockedActions: [
      'live master config write',
      'login-anywhere activation',
      'auth sync write',
      'token export',
      'secret export',
      'restore execution',
      'worker auth',
      'automation activation',
      'second-device bootstrap execution'
    ],
    message: previewReady
      ? 'Second-device bootstrap preview plan is ready. No bootstrap execution ran.'
      : 'Second-device bootstrap preview plan needs review. No execution ran.'
  });
}

function getSecondDeviceBootstrapDryRunPreviewV20(input) {
  var payload = input || {};
  var checkedAt = new Date().toISOString();
  var locator = normalizeMasterConfigPageLocatorV20(
    payload.masterConfigPageLocator || payload.masterConfigPageUrl || payload.masterConfigPageId || payload.pageId || ''
  );
  var previewPlanReceipt = parseMasterConfigJsonParamV20(payload.previewPlanReceiptJson || payload.previewPlanReceipt, {});
  var latestBackup = getLatestDriveBackupStatusSnapshotV20().latest || {};
  var expectedRequired = [
    'apps_script_web_app_url',
    'mc_master_config_page_id',
    'team_chat_database_id',
    'intelligence_hq_page_id'
  ];
  var expectedOptional = [
    'clean_workbook_id',
    'backup_folder_id'
  ];
  var allExpected = expectedRequired.concat(expectedOptional);
  var unsafe = detectUnsafeMasterConfigReadSkeletonInputV20({
    sourceBuild: payload.sourceBuild || '',
    targetDeviceLabel: payload.targetDeviceLabel || '',
    previewPlanStatus: previewPlanReceipt.status || '',
    expectedKeys: allExpected
  });
  var missingGateItems = [];
  if (!normalizeBooleanV20(payload.a1xxDryRunPreviewApprovalCaptured)) missingGateItems.push('A1XX dry-run preview approval');
  if (!normalizeBooleanV20(payload.backupVisible)) missingGateItems.push('backupVisible');
  if (!normalizeBooleanV20(payload.trustedSourceConfirmed)) missingGateItems.push('trustedSourceConfirmed');
  if (locator.normalized === 'preview_only' || locator.format !== 'notion_page_id_shape_ok') missingGateItems.push('real master config page locator');
  var pageRead = { ok: false, text: '', blockCount: 0, rawError: '' };
  var section = { found: false, config: {}, lines: [] };
  if (locator.normalized !== 'preview_only' && locator.format === 'notion_page_id_shape_ok') {
    pageRead = fetchNotionPagePlainTextV20(locator.normalized);
    section = pageRead.ok ? extractMasterConfigSafeReadSectionV20(pageRead.text) : section;
  }
  var pointerRows = allExpected.map(function(key) {
    var value = cellTextV20(section.config[key] || '', key === 'apps_script_web_app_url' ? 500 : 220);
    return {
      key: key,
      value: value,
      required: expectedRequired.indexOf(key) >= 0,
      status: value ? 'Ready' : 'Missing'
    };
  });
  var missingRequired = pointerRows.filter(function(row) { return row.required && !row.value; }).map(function(row) { return row.key; });
  var optionalGaps = pointerRows.filter(function(row) { return !row.required && !row.value; }).map(function(row) { return row.key; });
  var safePointerPackageReady = !!(section.found && missingRequired.length === 0 && optionalGaps.length === 0);
  var phase8wPreviewPlanReady = !!(
    normalizeBooleanV20(payload.phase8wPreviewPlanReady) ||
    (
      previewPlanReceipt &&
      previewPlanReceipt.status === 'second_device_bootstrap_preview_plan_ready' &&
      previewPlanReceipt.previewPlanReady === true &&
      previewPlanReceipt.safePointerPackageReady === true &&
      previewPlanReceipt.optionalGapsResolved === true &&
      previewPlanReceipt.setupAutomationPreviewReady === true &&
      previewPlanReceipt.setupAutomationReady === false &&
      previewPlanReceipt.bootstrapExecutionEnabled === false
    )
  );
  if (!phase8wPreviewPlanReady) missingGateItems.push('Phase 8W second-device bootstrap preview plan');
  var latestBackupMarker = latestBackup.backupId || cellTextV20(payload.latestBackupMarker || previewPlanReceipt.latestBackupMarker || '', 160);
  var dryRunItems = [
    {
      key: 'confirm_second_device_identity',
      label: 'Confirm second device identity and trust request',
      mode: 'manual_dry_run_only',
      status: 'Manual Check'
    },
    {
      key: 'verify_latest_backup_marker',
      label: 'Confirm latest verified Drive backup marker is visible before any future restore preview',
      mode: 'read_only',
      status: latestBackupMarker ? 'Ready' : 'Review'
    },
    {
      key: 'verify_apps_script_bridge_url',
      label: 'Confirm Apps Script bridge URL is present for manual second-device opening',
      pointerKey: 'apps_script_web_app_url',
      mode: 'read_only',
      status: section.config.apps_script_web_app_url ? 'Ready' : 'Blocked'
    },
    {
      key: 'verify_clean_workbook_pointer',
      label: 'Confirm clean workbook pointer is present',
      pointerKey: 'clean_workbook_id',
      mode: 'read_only',
      status: section.config.clean_workbook_id ? 'Ready' : 'Blocked'
    },
    {
      key: 'verify_backup_folder_pointer',
      label: 'Confirm backup folder pointer is present',
      pointerKey: 'backup_folder_id',
      mode: 'read_only',
      status: section.config.backup_folder_id ? 'Ready' : 'Blocked'
    },
    {
      key: 'preview_restore_source_only',
      label: 'Preview restore source only; do not execute restore',
      pointerKey: 'backup_folder_id',
      mode: 'preview_only',
      status: section.config.backup_folder_id ? 'Preview Only' : 'Blocked'
    },
    {
      key: 'keep_execution_locked',
      label: 'Keep login-anywhere, restore execution, worker auth, automations, and bootstrap execution blocked',
      mode: 'safety_boundary',
      status: 'Blocked'
    }
  ];
  var dryRunReady = !!(
    pageRead.ok &&
    section.found &&
    safePointerPackageReady &&
    phase8wPreviewPlanReady &&
    missingGateItems.length === 0 &&
    unsafe.length === 0
  );
  return jsonResponseV20({
    status: dryRunReady ? 'second_device_bootstrap_dry_run_preview_ready' : 'second_device_bootstrap_dry_run_preview_needs_review',
    ok: true,
    mode: 'second_device_bootstrap_dry_run_preview_only',
    build: OS_REGISTRY_SUMMARY_BUILD_V20,
    checkedAt: checkedAt,
    dryRunPreviewExecuted: true,
    dryRunPreviewReady: dryRunReady,
    readExecuted: pageRead.ok,
    configReadExecuted: pageRead.ok,
    notionReadExecuted: pageRead.ok,
    writeExecuted: false,
    writesEnabled: false,
    loginAnywhereActive: false,
    secretExport: false,
    tokenExport: false,
    restoreEnabled: false,
    restoreExecutionEnabled: false,
    workerAuthEnabled: false,
    automationActivationEnabled: false,
    bootstrapExecutionEnabled: false,
    setupAutomationPreviewReady: dryRunReady,
    setupAutomationReady: false,
    phase8wPreviewPlanReady: phase8wPreviewPlanReady,
    safePointerPackageReady: safePointerPackageReady,
    optionalGapsResolved: optionalGaps.length === 0,
    requestedPageId: locator.normalized,
    locatorShapeOk: locator.format === 'notion_page_id_shape_ok',
    latestBackupMarker: latestBackupMarker,
    safeSectionFound: section.found,
    blockCountRead: pageRead.blockCount || 0,
    targetDeviceLabel: cellTextV20(payload.targetDeviceLabel || 'second device', 120),
    pointerRows: pointerRows,
    dryRunItems: dryRunItems,
    missingRequiredPointers: missingRequired,
    optionalPointerGaps: optionalGaps,
    missingGateItems: missingGateItems,
    unsafeFields: unsafe,
    nextAllowedStepAfterDryRunPreview: dryRunReady
      ? 'second_device_restore_boundary_review'
      : 'second_device_bootstrap_dry_run_preview_repair',
    blockedActions: [
      'live master config write',
      'login-anywhere activation',
      'auth sync write',
      'token export',
      'secret export',
      'restore execution',
      'worker auth',
      'automation activation',
      'second-device bootstrap execution'
    ],
    message: dryRunReady
      ? 'Second-device bootstrap dry-run preview is ready. No restore or bootstrap execution ran.'
      : 'Second-device bootstrap dry-run preview needs review. No execution ran.'
  });
}

function getSecondDeviceRestoreBoundaryReviewV20(input) {
  var payload = input || {};
  var checkedAt = new Date().toISOString();
  var locator = normalizeMasterConfigPageLocatorV20(
    payload.masterConfigPageLocator || payload.masterConfigPageUrl || payload.masterConfigPageId || payload.pageId || ''
  );
  var dryRunReceipt = parseMasterConfigJsonParamV20(payload.dryRunReceiptJson || payload.dryRunReceipt, {});
  var latestBackup = getLatestDriveBackupStatusSnapshotV20().latest || {};
  var expectedRequired = [
    'apps_script_web_app_url',
    'mc_master_config_page_id',
    'team_chat_database_id',
    'intelligence_hq_page_id'
  ];
  var expectedOptional = [
    'clean_workbook_id',
    'backup_folder_id'
  ];
  var allExpected = expectedRequired.concat(expectedOptional);
  var unsafe = detectUnsafeMasterConfigReadSkeletonInputV20({
    sourceBuild: payload.sourceBuild || '',
    targetDeviceLabel: payload.targetDeviceLabel || '',
    dryRunStatus: dryRunReceipt.status || '',
    expectedKeys: allExpected
  });
  var missingGateItems = [];
  if (!normalizeBooleanV20(payload.a1xxBoundaryReviewApprovalCaptured)) missingGateItems.push('A1XX restore boundary review approval');
  if (!normalizeBooleanV20(payload.backupVisible)) missingGateItems.push('backupVisible');
  if (!normalizeBooleanV20(payload.trustedSourceConfirmed)) missingGateItems.push('trustedSourceConfirmed');
  if (locator.normalized === 'preview_only' || locator.format !== 'notion_page_id_shape_ok') missingGateItems.push('real master config page locator');
  var pageRead = { ok: false, text: '', blockCount: 0, rawError: '' };
  var section = { found: false, config: {}, lines: [] };
  if (locator.normalized !== 'preview_only' && locator.format === 'notion_page_id_shape_ok') {
    pageRead = fetchNotionPagePlainTextV20(locator.normalized);
    section = pageRead.ok ? extractMasterConfigSafeReadSectionV20(pageRead.text) : section;
  }
  var pointerRows = allExpected.map(function(key) {
    var value = cellTextV20(section.config[key] || '', key === 'apps_script_web_app_url' ? 500 : 220);
    return {
      key: key,
      value: value,
      required: expectedRequired.indexOf(key) >= 0,
      status: value ? 'Ready' : 'Missing'
    };
  });
  var missingRequired = pointerRows.filter(function(row) { return row.required && !row.value; }).map(function(row) { return row.key; });
  var optionalGaps = pointerRows.filter(function(row) { return !row.required && !row.value; }).map(function(row) { return row.key; });
  var safePointerPackageReady = !!(section.found && missingRequired.length === 0 && optionalGaps.length === 0);
  var phase8xDryRunReady = !!(
    normalizeBooleanV20(payload.phase8xDryRunReady) ||
    (
      dryRunReceipt &&
      dryRunReceipt.status === 'second_device_bootstrap_dry_run_preview_ready' &&
      dryRunReceipt.dryRunPreviewReady === true &&
      dryRunReceipt.safePointerPackageReady === true &&
      dryRunReceipt.optionalGapsResolved === true &&
      dryRunReceipt.setupAutomationPreviewReady === true &&
      dryRunReceipt.setupAutomationReady === false &&
      dryRunReceipt.restoreExecutionEnabled === false &&
      dryRunReceipt.bootstrapExecutionEnabled === false
    )
  );
  if (!phase8xDryRunReady) missingGateItems.push('Phase 8X second-device bootstrap dry-run preview');
  var latestBackupMarker = latestBackup.backupId || cellTextV20(payload.latestBackupMarker || dryRunReceipt.latestBackupMarker || '', 160);
  var boundaryItems = [
    {
      key: 'restore_source_can_be_previewed',
      label: 'Restore source may be previewed from the verified backup folder only',
      pointerKey: 'backup_folder_id',
      mode: 'preview_only',
      status: section.config.backup_folder_id ? 'Ready' : 'Blocked'
    },
    {
      key: 'restore_execution_stays_blocked',
      label: 'No restore execution can run in this phase',
      mode: 'safety_boundary',
      status: 'Blocked'
    },
    {
      key: 'second_device_identity_stays_manual',
      label: 'Second-device identity and trust remain manual review items',
      mode: 'manual_review_only',
      status: 'Review'
    },
    {
      key: 'clean_workbook_pointer_review_only',
      label: 'Clean workbook pointer may be reviewed but not opened by automation',
      pointerKey: 'clean_workbook_id',
      mode: 'review_only',
      status: section.config.clean_workbook_id ? 'Ready' : 'Blocked'
    },
    {
      key: 'bridge_url_review_only',
      label: 'Apps Script bridge URL may be reviewed but not used to bootstrap automatically',
      pointerKey: 'apps_script_web_app_url',
      mode: 'review_only',
      status: section.config.apps_script_web_app_url ? 'Ready' : 'Blocked'
    },
    {
      key: 'protected_actions_locked',
      label: 'Login-anywhere, auth sync, token export, secret export, worker auth, automations, and bootstrap execution remain blocked',
      mode: 'safety_boundary',
      status: 'Blocked'
    }
  ];
  var boundaryReady = !!(
    pageRead.ok &&
    section.found &&
    safePointerPackageReady &&
    phase8xDryRunReady &&
    missingGateItems.length === 0 &&
    unsafe.length === 0
  );
  return jsonResponseV20({
    status: boundaryReady ? 'second_device_restore_boundary_review_ready' : 'second_device_restore_boundary_review_needs_review',
    ok: true,
    mode: 'second_device_restore_boundary_review_only',
    build: OS_REGISTRY_SUMMARY_BUILD_V20,
    checkedAt: checkedAt,
    boundaryReviewExecuted: true,
    boundaryReviewReady: boundaryReady,
    readExecuted: pageRead.ok,
    configReadExecuted: pageRead.ok,
    notionReadExecuted: pageRead.ok,
    writeExecuted: false,
    writesEnabled: false,
    loginAnywhereActive: false,
    secretExport: false,
    tokenExport: false,
    restoreEnabled: false,
    restoreExecutionEnabled: false,
    workerAuthEnabled: false,
    automationActivationEnabled: false,
    bootstrapExecutionEnabled: false,
    setupAutomationPreviewReady: boundaryReady,
    setupAutomationReady: false,
    phase8xDryRunReady: phase8xDryRunReady,
    safePointerPackageReady: safePointerPackageReady,
    optionalGapsResolved: optionalGaps.length === 0,
    requestedPageId: locator.normalized,
    locatorShapeOk: locator.format === 'notion_page_id_shape_ok',
    latestBackupMarker: latestBackupMarker,
    safeSectionFound: section.found,
    blockCountRead: pageRead.blockCount || 0,
    targetDeviceLabel: cellTextV20(payload.targetDeviceLabel || 'second device', 120),
    pointerRows: pointerRows,
    boundaryItems: boundaryItems,
    missingRequiredPointers: missingRequired,
    optionalPointerGaps: optionalGaps,
    missingGateItems: missingGateItems,
    unsafeFields: unsafe,
    nextAllowedStepAfterBoundaryReview: boundaryReady
      ? 'second_device_restore_source_preview'
      : 'second_device_restore_boundary_review_repair',
    blockedActions: [
      'live master config write',
      'login-anywhere activation',
      'auth sync write',
      'token export',
      'secret export',
      'restore execution',
      'worker auth',
      'automation activation',
      'second-device bootstrap execution'
    ],
    message: boundaryReady
      ? 'Second-device restore boundary review is ready. Restore execution remains blocked.'
      : 'Second-device restore boundary review needs review. No restore execution ran.'
  });
}

function getSecondDeviceRestoreSourcePreviewV20(input) {
  var payload = input || {};
  var checkedAt = new Date().toISOString();
  var locator = normalizeMasterConfigPageLocatorV20(
    payload.masterConfigPageLocator || payload.masterConfigPageUrl || payload.masterConfigPageId || payload.pageId || ''
  );
  var boundaryReceipt = parseMasterConfigJsonParamV20(payload.boundaryReceiptJson || payload.boundaryReceipt, {});
  var latestBackupStatus = getLatestDriveBackupStatusSnapshotV20();
  var latestBackup = latestBackupStatus.latest || {};
  var expectedRequired = [
    'apps_script_web_app_url',
    'mc_master_config_page_id',
    'team_chat_database_id',
    'intelligence_hq_page_id'
  ];
  var expectedOptional = [
    'clean_workbook_id',
    'backup_folder_id'
  ];
  var allExpected = expectedRequired.concat(expectedOptional);
  var unsafe = detectUnsafeMasterConfigReadSkeletonInputV20({
    sourceBuild: payload.sourceBuild || '',
    targetDeviceLabel: payload.targetDeviceLabel || '',
    boundaryStatus: boundaryReceipt.status || '',
    expectedKeys: allExpected
  });
  var missingGateItems = [];
  if (!normalizeBooleanV20(payload.a1xxSourcePreviewApprovalCaptured)) missingGateItems.push('A1XX restore source preview approval');
  if (!normalizeBooleanV20(payload.backupVisible)) missingGateItems.push('backupVisible');
  if (!normalizeBooleanV20(payload.trustedSourceConfirmed)) missingGateItems.push('trustedSourceConfirmed');
  if (locator.normalized === 'preview_only' || locator.format !== 'notion_page_id_shape_ok') missingGateItems.push('real master config page locator');
  var pageRead = { ok: false, text: '', blockCount: 0, rawError: '' };
  var section = { found: false, config: {}, lines: [] };
  if (locator.normalized !== 'preview_only' && locator.format === 'notion_page_id_shape_ok') {
    pageRead = fetchNotionPagePlainTextV20(locator.normalized);
    section = pageRead.ok ? extractMasterConfigSafeReadSectionV20(pageRead.text) : section;
  }
  var pointerRows = allExpected.map(function(key) {
    var value = cellTextV20(section.config[key] || '', key === 'apps_script_web_app_url' ? 500 : 220);
    return {
      key: key,
      value: value,
      required: expectedRequired.indexOf(key) >= 0,
      status: value ? 'Ready' : 'Missing'
    };
  });
  var missingRequired = pointerRows.filter(function(row) { return row.required && !row.value; }).map(function(row) { return row.key; });
  var optionalGaps = pointerRows.filter(function(row) { return !row.required && !row.value; }).map(function(row) { return row.key; });
  var safePointerPackageReady = !!(section.found && missingRequired.length === 0 && optionalGaps.length === 0);
  var phase8yBoundaryReady = !!(
    normalizeBooleanV20(payload.phase8yBoundaryReady) ||
    (
      boundaryReceipt &&
      boundaryReceipt.status === 'second_device_restore_boundary_review_ready' &&
      boundaryReceipt.boundaryReviewReady === true &&
      boundaryReceipt.safePointerPackageReady === true &&
      boundaryReceipt.optionalGapsResolved === true &&
      boundaryReceipt.setupAutomationPreviewReady === true &&
      boundaryReceipt.setupAutomationReady === false &&
      boundaryReceipt.restoreExecutionEnabled === false &&
      boundaryReceipt.bootstrapExecutionEnabled === false
    )
  );
  if (!phase8yBoundaryReady) missingGateItems.push('Phase 8Y second-device restore boundary review');
  var backupFolderId = cellTextV20(section.config.backup_folder_id || '', 220);
  var latestBackupMarker = latestBackup.backupId || cellTextV20(payload.latestBackupMarker || boundaryReceipt.latestBackupMarker || '', 160);
  var latestBackupRow = cellTextV20(latestBackup.matchedRow || latestBackup.row || '', 80);
  var sourcePreviewItems = [
    {
      key: 'verified_backup_folder_pointer',
      label: 'Backup folder pointer is present for restore-source preview',
      pointerKey: 'backup_folder_id',
      value: backupFolderId,
      mode: 'read_only',
      status: backupFolderId ? 'Ready' : 'Blocked'
    },
    {
      key: 'latest_backup_marker_visible',
      label: 'Latest verified backup marker is visible before any future restore choice',
      value: latestBackupMarker,
      mode: 'read_only',
      status: latestBackupMarker ? 'Ready' : 'Review'
    },
    {
      key: 'backup_archive_index_visible',
      label: 'Backup archive index row is visible when available',
      value: latestBackupRow,
      mode: 'read_only',
      status: latestBackupRow ? 'Ready' : 'Review'
    },
    {
      key: 'restore_source_preview_only',
      label: 'Restore source may be previewed from the verified backup marker only',
      pointerKey: 'backup_folder_id',
      value: latestBackupMarker,
      mode: 'preview_only',
      status: backupFolderId && latestBackupMarker ? 'Preview Only' : 'Blocked'
    },
    {
      key: 'restore_execution_stays_blocked',
      label: 'No restore execution can run in this phase',
      mode: 'safety_boundary',
      status: 'Blocked'
    },
    {
      key: 'protected_actions_locked',
      label: 'Login-anywhere, auth sync, token export, secret export, worker auth, automations, and bootstrap execution remain blocked',
      mode: 'safety_boundary',
      status: 'Blocked'
    }
  ];
  var sourcePreviewReady = !!(
    pageRead.ok &&
    section.found &&
    safePointerPackageReady &&
    phase8yBoundaryReady &&
    backupFolderId &&
    latestBackupMarker &&
    missingGateItems.length === 0 &&
    unsafe.length === 0
  );
  return jsonResponseV20({
    status: sourcePreviewReady ? 'second_device_restore_source_preview_ready' : 'second_device_restore_source_preview_needs_review',
    ok: true,
    mode: 'second_device_restore_source_preview_only',
    build: OS_REGISTRY_SUMMARY_BUILD_V20,
    checkedAt: checkedAt,
    sourcePreviewExecuted: true,
    sourcePreviewReady: sourcePreviewReady,
    readExecuted: pageRead.ok,
    configReadExecuted: pageRead.ok,
    notionReadExecuted: pageRead.ok,
    writeExecuted: false,
    writesEnabled: false,
    loginAnywhereActive: false,
    secretExport: false,
    tokenExport: false,
    restoreEnabled: false,
    restoreExecutionEnabled: false,
    workerAuthEnabled: false,
    automationActivationEnabled: false,
    bootstrapExecutionEnabled: false,
    setupAutomationPreviewReady: sourcePreviewReady,
    setupAutomationReady: false,
    phase8yBoundaryReady: phase8yBoundaryReady,
    safePointerPackageReady: safePointerPackageReady,
    optionalGapsResolved: optionalGaps.length === 0,
    requestedPageId: locator.normalized,
    locatorShapeOk: locator.format === 'notion_page_id_shape_ok',
    latestBackupMarker: latestBackupMarker,
    latestBackupRow: latestBackupRow,
    backupFolderId: backupFolderId,
    safeSectionFound: section.found,
    blockCountRead: pageRead.blockCount || 0,
    targetDeviceLabel: cellTextV20(payload.targetDeviceLabel || 'second device', 120),
    pointerRows: pointerRows,
    sourcePreviewItems: sourcePreviewItems,
    missingRequiredPointers: missingRequired,
    optionalPointerGaps: optionalGaps,
    missingGateItems: missingGateItems,
    unsafeFields: unsafe,
    nextAllowedStepAfterSourcePreview: sourcePreviewReady
      ? 'second_device_restore_source_selection_review'
      : 'second_device_restore_source_preview_repair',
    blockedActions: [
      'live master config write',
      'login-anywhere activation',
      'auth sync write',
      'token export',
      'secret export',
      'restore execution',
      'worker auth',
      'automation activation',
      'second-device bootstrap execution'
    ],
    message: sourcePreviewReady
      ? 'Second-device restore source preview is ready. No restore execution ran.'
      : 'Second-device restore source preview needs review. No restore execution ran.'
  });
}

function getSecondDeviceRestoreSourceSelectionReviewV20(input) {
  var payload = input || {};
  var checkedAt = new Date().toISOString();
  var locator = normalizeMasterConfigPageLocatorV20(
    payload.masterConfigPageLocator || payload.masterConfigPageUrl || payload.masterConfigPageId || payload.pageId || ''
  );
  var sourcePreviewReceipt = parseMasterConfigJsonParamV20(payload.sourcePreviewReceiptJson || payload.sourcePreviewReceipt, {});
  var latestBackupStatus = getLatestDriveBackupStatusSnapshotV20();
  var latestBackup = latestBackupStatus.latest || {};
  var expectedRequired = [
    'apps_script_web_app_url',
    'mc_master_config_page_id',
    'team_chat_database_id',
    'intelligence_hq_page_id'
  ];
  var expectedOptional = [
    'clean_workbook_id',
    'backup_folder_id'
  ];
  var allExpected = expectedRequired.concat(expectedOptional);
  var unsafe = detectUnsafeMasterConfigReadSkeletonInputV20({
    sourceBuild: payload.sourceBuild || '',
    targetDeviceLabel: payload.targetDeviceLabel || '',
    sourcePreviewStatus: sourcePreviewReceipt.status || '',
    expectedKeys: allExpected
  });
  var missingGateItems = [];
  if (!normalizeBooleanV20(payload.a1xxSourceSelectionReviewApprovalCaptured)) missingGateItems.push('A1XX restore source selection review approval');
  if (!normalizeBooleanV20(payload.backupVisible)) missingGateItems.push('backupVisible');
  if (!normalizeBooleanV20(payload.trustedSourceConfirmed)) missingGateItems.push('trustedSourceConfirmed');
  if (locator.normalized === 'preview_only' || locator.format !== 'notion_page_id_shape_ok') missingGateItems.push('real master config page locator');
  var pageRead = { ok: false, text: '', blockCount: 0, rawError: '' };
  var section = { found: false, config: {}, lines: [] };
  if (locator.normalized !== 'preview_only' && locator.format === 'notion_page_id_shape_ok') {
    pageRead = fetchNotionPagePlainTextV20(locator.normalized);
    section = pageRead.ok ? extractMasterConfigSafeReadSectionV20(pageRead.text) : section;
  }
  var pointerRows = allExpected.map(function(key) {
    var value = cellTextV20(section.config[key] || '', key === 'apps_script_web_app_url' ? 500 : 220);
    return {
      key: key,
      value: value,
      required: expectedRequired.indexOf(key) >= 0,
      status: value ? 'Ready' : 'Missing'
    };
  });
  var missingRequired = pointerRows.filter(function(row) { return row.required && !row.value; }).map(function(row) { return row.key; });
  var optionalGaps = pointerRows.filter(function(row) { return !row.required && !row.value; }).map(function(row) { return row.key; });
  var safePointerPackageReady = !!(section.found && missingRequired.length === 0 && optionalGaps.length === 0);
  var phase8zSourcePreviewReady = !!(
    normalizeBooleanV20(payload.phase8zSourcePreviewReady) ||
    (
      sourcePreviewReceipt &&
      sourcePreviewReceipt.status === 'second_device_restore_source_preview_ready' &&
      sourcePreviewReceipt.sourcePreviewReady === true &&
      sourcePreviewReceipt.safePointerPackageReady === true &&
      sourcePreviewReceipt.optionalGapsResolved === true &&
      sourcePreviewReceipt.setupAutomationPreviewReady === true &&
      sourcePreviewReceipt.setupAutomationReady === false &&
      sourcePreviewReceipt.restoreExecutionEnabled === false &&
      sourcePreviewReceipt.bootstrapExecutionEnabled === false
    )
  );
  if (!phase8zSourcePreviewReady) missingGateItems.push('Phase 8Z second-device restore source preview');
  var backupFolderId = cellTextV20(section.config.backup_folder_id || '', 220);
  var latestBackupMarker = cellTextV20(
    payload.latestBackupMarker || sourcePreviewReceipt.latestBackupMarker || latestBackup.backupId || '',
    160
  );
  var latestBackupRow = cellTextV20(
    payload.latestBackupRow || sourcePreviewReceipt.latestBackupRow || latestBackup.matchedRow || latestBackup.row || '',
    80
  );
  var selectedRestoreSourceMarker = cellTextV20(
    payload.selectedRestoreSourceMarker || latestBackupMarker || sourcePreviewReceipt.latestBackupMarker || '',
    160
  );
  var selectedRestoreSourceRow = cellTextV20(
    payload.selectedRestoreSourceRow || latestBackupRow || sourcePreviewReceipt.latestBackupRow || '',
    80
  );
  var selectionMatchesLatest = !!(selectedRestoreSourceMarker && latestBackupMarker && selectedRestoreSourceMarker === latestBackupMarker);
  var sourceSelectionItems = [
    {
      key: 'selected_restore_source_marker',
      label: 'Selected restore source marker is visible for review only',
      value: selectedRestoreSourceMarker,
      mode: 'review_only',
      status: selectedRestoreSourceMarker ? 'Selected' : 'Review'
    },
    {
      key: 'selected_restore_source_row',
      label: 'Selected backup archive index row is visible when available',
      value: selectedRestoreSourceRow,
      mode: 'read_only',
      status: selectedRestoreSourceRow ? 'Ready' : 'Review'
    },
    {
      key: 'selected_backup_folder_pointer',
      label: 'Backup folder pointer remains the restore-source container',
      pointerKey: 'backup_folder_id',
      value: backupFolderId,
      mode: 'read_only',
      status: backupFolderId ? 'Ready' : 'Blocked'
    },
    {
      key: 'selection_matches_latest_preview',
      label: 'Selected source matches the latest visible preview marker',
      value: latestBackupMarker,
      mode: 'review_only',
      status: selectionMatchesLatest ? 'Ready' : 'Review'
    },
    {
      key: 'restore_execution_stays_blocked',
      label: 'No restore execution can run in this phase',
      mode: 'safety_boundary',
      status: 'Blocked'
    },
    {
      key: 'protected_actions_locked',
      label: 'Login-anywhere, auth sync, token export, secret export, worker auth, automations, and bootstrap execution remain blocked',
      mode: 'safety_boundary',
      status: 'Blocked'
    }
  ];
  var selectionReviewReady = !!(
    pageRead.ok &&
    section.found &&
    safePointerPackageReady &&
    phase8zSourcePreviewReady &&
    backupFolderId &&
    latestBackupMarker &&
    selectedRestoreSourceMarker &&
    selectionMatchesLatest &&
    missingGateItems.length === 0 &&
    unsafe.length === 0
  );
  return jsonResponseV20({
    status: selectionReviewReady ? 'second_device_restore_source_selection_review_ready' : 'second_device_restore_source_selection_review_needs_review',
    ok: true,
    mode: 'second_device_restore_source_selection_review_only',
    build: OS_REGISTRY_SUMMARY_BUILD_V20,
    checkedAt: checkedAt,
    selectionReviewExecuted: true,
    selectionReviewReady: selectionReviewReady,
    readExecuted: pageRead.ok,
    configReadExecuted: pageRead.ok,
    notionReadExecuted: pageRead.ok,
    writeExecuted: false,
    writesEnabled: false,
    loginAnywhereActive: false,
    secretExport: false,
    tokenExport: false,
    restoreEnabled: false,
    restoreExecutionEnabled: false,
    workerAuthEnabled: false,
    automationActivationEnabled: false,
    bootstrapExecutionEnabled: false,
    setupAutomationPreviewReady: selectionReviewReady,
    setupAutomationReady: false,
    phase8zSourcePreviewReady: phase8zSourcePreviewReady,
    safePointerPackageReady: safePointerPackageReady,
    optionalGapsResolved: optionalGaps.length === 0,
    requestedPageId: locator.normalized,
    locatorShapeOk: locator.format === 'notion_page_id_shape_ok',
    latestBackupMarker: latestBackupMarker,
    latestBackupRow: latestBackupRow,
    selectedRestoreSourceMarker: selectedRestoreSourceMarker,
    selectedRestoreSourceRow: selectedRestoreSourceRow,
    selectionMatchesLatest: selectionMatchesLatest,
    backupFolderId: backupFolderId,
    safeSectionFound: section.found,
    blockCountRead: pageRead.blockCount || 0,
    targetDeviceLabel: cellTextV20(payload.targetDeviceLabel || 'second device', 120),
    pointerRows: pointerRows,
    sourceSelectionItems: sourceSelectionItems,
    missingRequiredPointers: missingRequired,
    optionalPointerGaps: optionalGaps,
    missingGateItems: missingGateItems,
    unsafeFields: unsafe,
    nextAllowedStepAfterSourceSelectionReview: selectionReviewReady
      ? 'second_device_restore_integrity_preview'
      : 'second_device_restore_source_selection_review_repair',
    blockedActions: [
      'live master config write',
      'login-anywhere activation',
      'auth sync write',
      'token export',
      'secret export',
      'restore execution',
      'worker auth',
      'automation activation',
      'second-device bootstrap execution'
    ],
    message: selectionReviewReady
      ? 'Second-device restore source selection review is ready. No restore execution ran.'
      : 'Second-device restore source selection review needs review. No restore execution ran.'
  });
}

function getSecondDeviceRestoreIntegrityPreviewV20(input) {
  var payload = input || {};
  var checkedAt = new Date().toISOString();
  var locator = normalizeMasterConfigPageLocatorV20(
    payload.masterConfigPageLocator || payload.masterConfigPageUrl || payload.masterConfigPageId || payload.pageId || ''
  );
  var selectionReceipt = parseMasterConfigJsonParamV20(payload.selectionReviewReceiptJson || payload.selectionReviewReceipt, {});
  var latestBackupStatus = getLatestDriveBackupStatusSnapshotV20();
  var latestBackup = latestBackupStatus.latest || {};
  var expectedRequired = [
    'apps_script_web_app_url',
    'mc_master_config_page_id',
    'team_chat_database_id',
    'intelligence_hq_page_id'
  ];
  var expectedOptional = [
    'clean_workbook_id',
    'backup_folder_id'
  ];
  var allExpected = expectedRequired.concat(expectedOptional);
  var unsafe = detectUnsafeMasterConfigReadSkeletonInputV20({
    sourceBuild: payload.sourceBuild || '',
    targetDeviceLabel: payload.targetDeviceLabel || '',
    selectionReviewStatus: selectionReceipt.status || '',
    expectedKeys: allExpected
  });
  var missingGateItems = [];
  if (!normalizeBooleanV20(payload.a1xxRestoreIntegrityPreviewApprovalCaptured)) missingGateItems.push('A1XX restore integrity preview approval');
  if (!normalizeBooleanV20(payload.backupVisible)) missingGateItems.push('backupVisible');
  if (!normalizeBooleanV20(payload.trustedSourceConfirmed)) missingGateItems.push('trustedSourceConfirmed');
  if (locator.normalized === 'preview_only' || locator.format !== 'notion_page_id_shape_ok') missingGateItems.push('real master config page locator');
  var pageRead = { ok: false, text: '', blockCount: 0, rawError: '' };
  var section = { found: false, config: {}, lines: [] };
  if (locator.normalized !== 'preview_only' && locator.format === 'notion_page_id_shape_ok') {
    pageRead = fetchNotionPagePlainTextV20(locator.normalized);
    section = pageRead.ok ? extractMasterConfigSafeReadSectionV20(pageRead.text) : section;
  }
  var pointerRows = allExpected.map(function(key) {
    var value = cellTextV20(section.config[key] || '', key === 'apps_script_web_app_url' ? 500 : 220);
    return {
      key: key,
      value: value,
      required: expectedRequired.indexOf(key) >= 0,
      status: value ? 'Ready' : 'Missing'
    };
  });
  var missingRequired = pointerRows.filter(function(row) { return row.required && !row.value; }).map(function(row) { return row.key; });
  var optionalGaps = pointerRows.filter(function(row) { return !row.required && !row.value; }).map(function(row) { return row.key; });
  var safePointerPackageReady = !!(section.found && missingRequired.length === 0 && optionalGaps.length === 0);
  var phase8aaSelectionReady = !!(
    normalizeBooleanV20(payload.phase8aaSelectionReviewReady) ||
    (
      selectionReceipt &&
      selectionReceipt.status === 'second_device_restore_source_selection_review_ready' &&
      selectionReceipt.selectionReviewReady === true &&
      selectionReceipt.safePointerPackageReady === true &&
      selectionReceipt.optionalGapsResolved === true &&
      selectionReceipt.setupAutomationPreviewReady === true &&
      selectionReceipt.setupAutomationReady === false &&
      selectionReceipt.restoreExecutionEnabled === false &&
      selectionReceipt.bootstrapExecutionEnabled === false
    )
  );
  if (!phase8aaSelectionReady) missingGateItems.push('Phase 8AA second-device restore source selection review');
  var cleanWorkbookId = cellTextV20(section.config.clean_workbook_id || '', 220);
  var backupFolderId = cellTextV20(section.config.backup_folder_id || '', 220);
  var selectedRestoreSourceMarker = cellTextV20(
    payload.selectedRestoreSourceMarker || selectionReceipt.selectedRestoreSourceMarker || selectionReceipt.latestBackupMarker || '',
    160
  );
  var selectedRestoreSourceRow = cellTextV20(
    payload.selectedRestoreSourceRow || selectionReceipt.selectedRestoreSourceRow || selectionReceipt.latestBackupRow || '',
    80
  );
  var latestBackupMarker = cellTextV20(
    payload.latestBackupMarker || latestBackup.backupId || selectionReceipt.latestBackupMarker || '',
    160
  );
  var latestBackupRow = cellTextV20(
    payload.latestBackupRow || latestBackup.matchedRow || latestBackup.row || selectionReceipt.latestBackupRow || '',
    80
  );
  var selectedMarkerShapeOk = !!(selectedRestoreSourceMarker && /^backup_/.test(selectedRestoreSourceMarker));
  var backupFolderShapeOk = !!(backupFolderId && /^[A-Za-z0-9_-]{20,}$/.test(backupFolderId));
  var cleanWorkbookShapeOk = !!(cleanWorkbookId && /^[A-Za-z0-9_-]{20,}$/.test(cleanWorkbookId));
  var sourceStillVisible = !!(selectedRestoreSourceMarker && backupFolderId);
  var integrityPreviewItems = [
    {
      key: 'phase8aa_selection_receipt',
      label: 'Phase 8AA selected restore source receipt is present',
      value: selectionReceipt.status || '',
      mode: 'review_only',
      status: phase8aaSelectionReady ? 'Ready' : 'Review'
    },
    {
      key: 'selected_restore_source_marker_shape',
      label: 'Selected restore source marker has backup marker shape',
      value: selectedRestoreSourceMarker,
      mode: 'preview_only',
      status: selectedMarkerShapeOk ? 'Ready' : 'Review'
    },
    {
      key: 'selected_restore_source_row_visible',
      label: 'Selected backup archive row is visible when available',
      value: selectedRestoreSourceRow,
      mode: 'read_only',
      status: selectedRestoreSourceRow ? 'Ready' : 'Review'
    },
    {
      key: 'backup_folder_pointer_shape',
      label: 'Backup folder pointer is present and shaped like a Drive ID',
      pointerKey: 'backup_folder_id',
      value: backupFolderId,
      mode: 'read_only',
      status: backupFolderShapeOk ? 'Ready' : 'Blocked'
    },
    {
      key: 'clean_workbook_pointer_shape',
      label: 'Clean workbook pointer is present and shaped like a Drive ID',
      pointerKey: 'clean_workbook_id',
      value: cleanWorkbookId,
      mode: 'read_only',
      status: cleanWorkbookShapeOk ? 'Ready' : 'Blocked'
    },
    {
      key: 'source_visibility_preview',
      label: 'Selected source remains visible from the safe pointer package',
      value: latestBackupMarker || selectedRestoreSourceMarker,
      mode: 'preview_only',
      status: sourceStillVisible ? 'Preview Ready' : 'Review'
    },
    {
      key: 'restore_execution_stays_blocked',
      label: 'No restore execution can run in this phase',
      mode: 'safety_boundary',
      status: 'Blocked'
    },
    {
      key: 'protected_actions_locked',
      label: 'Login-anywhere, auth sync, token export, secret export, worker auth, automations, and bootstrap execution remain blocked',
      mode: 'safety_boundary',
      status: 'Blocked'
    }
  ];
  var integrityPreviewReady = !!(
    pageRead.ok &&
    section.found &&
    safePointerPackageReady &&
    phase8aaSelectionReady &&
    selectedRestoreSourceMarker &&
    selectedMarkerShapeOk &&
    backupFolderShapeOk &&
    cleanWorkbookShapeOk &&
    sourceStillVisible &&
    missingGateItems.length === 0 &&
    unsafe.length === 0
  );
  return jsonResponseV20({
    status: integrityPreviewReady ? 'second_device_restore_integrity_preview_ready' : 'second_device_restore_integrity_preview_needs_review',
    ok: true,
    mode: 'second_device_restore_integrity_preview_only',
    build: OS_REGISTRY_SUMMARY_BUILD_V20,
    checkedAt: checkedAt,
    integrityPreviewExecuted: true,
    integrityPreviewReady: integrityPreviewReady,
    readExecuted: pageRead.ok,
    configReadExecuted: pageRead.ok,
    notionReadExecuted: pageRead.ok,
    writeExecuted: false,
    writesEnabled: false,
    loginAnywhereActive: false,
    secretExport: false,
    tokenExport: false,
    restoreEnabled: false,
    restoreExecutionEnabled: false,
    workerAuthEnabled: false,
    automationActivationEnabled: false,
    bootstrapExecutionEnabled: false,
    setupAutomationPreviewReady: integrityPreviewReady,
    setupAutomationReady: false,
    phase8aaSelectionReviewReady: phase8aaSelectionReady,
    safePointerPackageReady: safePointerPackageReady,
    optionalGapsResolved: optionalGaps.length === 0,
    requestedPageId: locator.normalized,
    locatorShapeOk: locator.format === 'notion_page_id_shape_ok',
    latestBackupMarker: latestBackupMarker,
    latestBackupRow: latestBackupRow,
    selectedRestoreSourceMarker: selectedRestoreSourceMarker,
    selectedRestoreSourceRow: selectedRestoreSourceRow,
    selectedMarkerShapeOk: selectedMarkerShapeOk,
    sourceStillVisible: sourceStillVisible,
    cleanWorkbookId: cleanWorkbookId,
    backupFolderId: backupFolderId,
    backupFolderShapeOk: backupFolderShapeOk,
    cleanWorkbookShapeOk: cleanWorkbookShapeOk,
    safeSectionFound: section.found,
    blockCountRead: pageRead.blockCount || 0,
    targetDeviceLabel: cellTextV20(payload.targetDeviceLabel || 'second device', 120),
    pointerRows: pointerRows,
    integrityPreviewItems: integrityPreviewItems,
    missingRequiredPointers: missingRequired,
    optionalPointerGaps: optionalGaps,
    missingGateItems: missingGateItems,
    unsafeFields: unsafe,
    nextAllowedStepAfterIntegrityPreview: integrityPreviewReady
      ? 'second_device_restore_execution_boundary_review'
      : 'second_device_restore_integrity_preview_repair',
    blockedActions: [
      'live master config write',
      'login-anywhere activation',
      'auth sync write',
      'token export',
      'secret export',
      'restore execution',
      'worker auth',
      'automation activation',
      'second-device bootstrap execution'
    ],
    message: integrityPreviewReady
      ? 'Second-device restore integrity preview is ready. No restore execution ran.'
      : 'Second-device restore integrity preview needs review. No restore execution ran.'
  });
}

function getSecondDeviceRestoreExecutionBoundaryReviewV20(input) {
  var payload = input || {};
  var checkedAt = new Date().toISOString();
  var locator = normalizeMasterConfigPageLocatorV20(
    payload.masterConfigPageLocator || payload.masterConfigPageUrl || payload.masterConfigPageId || payload.pageId || ''
  );
  var integrityReceipt = parseMasterConfigJsonParamV20(payload.integrityPreviewReceiptJson || payload.integrityPreviewReceipt, {});
  var latestBackupStatus = getLatestDriveBackupStatusSnapshotV20();
  var latestBackup = latestBackupStatus.latest || {};
  var expectedRequired = [
    'apps_script_web_app_url',
    'mc_master_config_page_id',
    'team_chat_database_id',
    'intelligence_hq_page_id'
  ];
  var expectedOptional = [
    'clean_workbook_id',
    'backup_folder_id'
  ];
  var allExpected = expectedRequired.concat(expectedOptional);
  var unsafe = detectUnsafeMasterConfigReadSkeletonInputV20({
    sourceBuild: payload.sourceBuild || '',
    targetDeviceLabel: payload.targetDeviceLabel || '',
    integrityPreviewStatus: integrityReceipt.status || '',
    expectedKeys: allExpected
  });
  var missingGateItems = [];
  if (!normalizeBooleanV20(payload.a1xxRestoreExecutionBoundaryApprovalCaptured)) missingGateItems.push('A1XX restore execution boundary review approval');
  if (!normalizeBooleanV20(payload.backupVisible)) missingGateItems.push('backupVisible');
  if (!normalizeBooleanV20(payload.trustedSourceConfirmed)) missingGateItems.push('trustedSourceConfirmed');
  if (locator.normalized === 'preview_only' || locator.format !== 'notion_page_id_shape_ok') missingGateItems.push('real master config page locator');
  var pageRead = { ok: false, text: '', blockCount: 0, rawError: '' };
  var section = { found: false, config: {}, lines: [] };
  if (locator.normalized !== 'preview_only' && locator.format === 'notion_page_id_shape_ok') {
    pageRead = fetchNotionPagePlainTextV20(locator.normalized);
    section = pageRead.ok ? extractMasterConfigSafeReadSectionV20(pageRead.text) : section;
  }
  var pointerRows = allExpected.map(function(key) {
    var value = cellTextV20(section.config[key] || '', key === 'apps_script_web_app_url' ? 500 : 220);
    return {
      key: key,
      value: value,
      required: expectedRequired.indexOf(key) >= 0,
      status: value ? 'Ready' : 'Missing'
    };
  });
  var missingRequired = pointerRows.filter(function(row) { return row.required && !row.value; }).map(function(row) { return row.key; });
  var optionalGaps = pointerRows.filter(function(row) { return !row.required && !row.value; }).map(function(row) { return row.key; });
  var safePointerPackageReady = !!(section.found && missingRequired.length === 0 && optionalGaps.length === 0);
  var phase8abIntegrityReady = !!(
    normalizeBooleanV20(payload.phase8abIntegrityPreviewReady) ||
    (
      integrityReceipt &&
      integrityReceipt.status === 'second_device_restore_integrity_preview_ready' &&
      integrityReceipt.integrityPreviewReady === true &&
      integrityReceipt.safePointerPackageReady === true &&
      integrityReceipt.optionalGapsResolved === true &&
      integrityReceipt.setupAutomationPreviewReady === true &&
      integrityReceipt.setupAutomationReady === false &&
      integrityReceipt.restoreExecutionEnabled === false &&
      integrityReceipt.bootstrapExecutionEnabled === false
    )
  );
  if (!phase8abIntegrityReady) missingGateItems.push('Phase 8AB second-device restore integrity preview');
  var cleanWorkbookId = cellTextV20(section.config.clean_workbook_id || '', 220);
  var backupFolderId = cellTextV20(section.config.backup_folder_id || '', 220);
  var selectedRestoreSourceMarker = cellTextV20(
    payload.selectedRestoreSourceMarker || integrityReceipt.selectedRestoreSourceMarker || integrityReceipt.latestBackupMarker || '',
    160
  );
  var selectedRestoreSourceRow = cellTextV20(
    payload.selectedRestoreSourceRow || integrityReceipt.selectedRestoreSourceRow || integrityReceipt.latestBackupRow || '',
    80
  );
  var latestBackupMarker = cellTextV20(
    payload.latestBackupMarker || latestBackup.backupId || integrityReceipt.latestBackupMarker || '',
    160
  );
  var latestBackupRow = cellTextV20(
    payload.latestBackupRow || latestBackup.matchedRow || latestBackup.row || integrityReceipt.latestBackupRow || '',
    80
  );
  var executionBoundaryItems = [
    {
      key: 'phase8ab_integrity_receipt',
      label: 'Phase 8AB restore integrity preview receipt is present',
      value: integrityReceipt.status || '',
      mode: 'review_only',
      status: phase8abIntegrityReady ? 'Ready' : 'Review'
    },
    {
      key: 'future_restore_execution_requires_separate_gate',
      label: 'Any restore execution must use a later explicit gate and approval',
      mode: 'safety_boundary',
      status: 'Blocked'
    },
    {
      key: 'restore_target_scope_locked',
      label: 'Future restore scope is limited to the selected source marker and safe pointers',
      value: selectedRestoreSourceMarker,
      mode: 'review_only',
      status: selectedRestoreSourceMarker ? 'Ready' : 'Review'
    },
    {
      key: 'backup_source_boundary_visible',
      label: 'Backup folder pointer remains visible for future restore review',
      pointerKey: 'backup_folder_id',
      value: backupFolderId,
      mode: 'read_only',
      status: backupFolderId ? 'Ready' : 'Blocked'
    },
    {
      key: 'workbook_target_boundary_visible',
      label: 'Clean workbook pointer remains visible for future restore review',
      pointerKey: 'clean_workbook_id',
      value: cleanWorkbookId,
      mode: 'read_only',
      status: cleanWorkbookId ? 'Ready' : 'Blocked'
    },
    {
      key: 'write_and_restore_stay_blocked',
      label: 'No write or restore execution can run in this phase',
      mode: 'safety_boundary',
      status: 'Blocked'
    },
    {
      key: 'protected_actions_locked',
      label: 'Login-anywhere, auth sync, token export, secret export, worker auth, automations, and bootstrap execution remain blocked',
      mode: 'safety_boundary',
      status: 'Blocked'
    }
  ];
  var boundaryReviewReady = !!(
    pageRead.ok &&
    section.found &&
    safePointerPackageReady &&
    phase8abIntegrityReady &&
    selectedRestoreSourceMarker &&
    cleanWorkbookId &&
    backupFolderId &&
    missingGateItems.length === 0 &&
    unsafe.length === 0
  );
  return jsonResponseV20({
    status: boundaryReviewReady ? 'second_device_restore_execution_boundary_review_ready' : 'second_device_restore_execution_boundary_review_needs_review',
    ok: true,
    mode: 'second_device_restore_execution_boundary_review_only',
    build: OS_REGISTRY_SUMMARY_BUILD_V20,
    checkedAt: checkedAt,
    boundaryReviewExecuted: true,
    boundaryReviewReady: boundaryReviewReady,
    readExecuted: pageRead.ok,
    configReadExecuted: pageRead.ok,
    notionReadExecuted: pageRead.ok,
    writeExecuted: false,
    writesEnabled: false,
    loginAnywhereActive: false,
    secretExport: false,
    tokenExport: false,
    restoreEnabled: false,
    restoreExecutionEnabled: false,
    workerAuthEnabled: false,
    automationActivationEnabled: false,
    bootstrapExecutionEnabled: false,
    setupAutomationPreviewReady: boundaryReviewReady,
    setupAutomationReady: false,
    phase8abIntegrityPreviewReady: phase8abIntegrityReady,
    safePointerPackageReady: safePointerPackageReady,
    optionalGapsResolved: optionalGaps.length === 0,
    requestedPageId: locator.normalized,
    locatorShapeOk: locator.format === 'notion_page_id_shape_ok',
    latestBackupMarker: latestBackupMarker,
    latestBackupRow: latestBackupRow,
    selectedRestoreSourceMarker: selectedRestoreSourceMarker,
    selectedRestoreSourceRow: selectedRestoreSourceRow,
    cleanWorkbookId: cleanWorkbookId,
    backupFolderId: backupFolderId,
    safeSectionFound: section.found,
    blockCountRead: pageRead.blockCount || 0,
    targetDeviceLabel: cellTextV20(payload.targetDeviceLabel || 'second device', 120),
    pointerRows: pointerRows,
    executionBoundaryItems: executionBoundaryItems,
    missingRequiredPointers: missingRequired,
    optionalPointerGaps: optionalGaps,
    missingGateItems: missingGateItems,
    unsafeFields: unsafe,
    nextAllowedStepAfterExecutionBoundaryReview: boundaryReviewReady
      ? 'second_device_restore_execution_endpoint_review'
      : 'second_device_restore_execution_boundary_review_repair',
    blockedActions: [
      'live master config write',
      'login-anywhere activation',
      'auth sync write',
      'token export',
      'secret export',
      'restore execution',
      'worker auth',
      'automation activation',
      'second-device bootstrap execution'
    ],
    message: boundaryReviewReady
      ? 'Second-device restore execution boundary review is ready. No restore execution ran.'
      : 'Second-device restore execution boundary review needs review. No restore execution ran.'
  });
}

function getSecondDeviceRestoreExecutionEndpointReviewV20(input) {
  var payload = input || {};
  var checkedAt = new Date().toISOString();
  var boundaryReceipt = parseMasterConfigJsonParamV20(payload.executionBoundaryReviewReceiptJson || payload.executionBoundaryReviewReceipt, {});
  var unsafe = detectUnsafeMasterConfigReadSkeletonInputV20({
    sourceBuild: payload.sourceBuild || '',
    targetDeviceLabel: payload.targetDeviceLabel || '',
    boundaryReviewStatus: boundaryReceipt.status || '',
    selectedRestoreSourceMarker: payload.selectedRestoreSourceMarker || boundaryReceipt.selectedRestoreSourceMarker || ''
  });
  var selectedRestoreSourceMarker = cellTextV20(
    payload.selectedRestoreSourceMarker || boundaryReceipt.selectedRestoreSourceMarker || boundaryReceipt.latestBackupMarker || '',
    160
  );
  var selectedRestoreSourceRow = cellTextV20(
    payload.selectedRestoreSourceRow || boundaryReceipt.selectedRestoreSourceRow || boundaryReceipt.latestBackupRow || '',
    80
  );
  var latestBackupMarker = cellTextV20(
    payload.latestBackupMarker || boundaryReceipt.latestBackupMarker || selectedRestoreSourceMarker || '',
    160
  );
  var latestBackupRow = cellTextV20(
    payload.latestBackupRow || boundaryReceipt.latestBackupRow || selectedRestoreSourceRow || '',
    80
  );
  var cleanWorkbookId = cellTextV20(payload.cleanWorkbookId || boundaryReceipt.cleanWorkbookId || '', 220);
  var backupFolderId = cellTextV20(payload.backupFolderId || boundaryReceipt.backupFolderId || '', 220);
  var phase8acBoundaryReady = !!(
    normalizeBooleanV20(payload.phase8acBoundaryReviewReady) ||
    (
      boundaryReceipt &&
      boundaryReceipt.status === 'second_device_restore_execution_boundary_review_ready' &&
      boundaryReceipt.boundaryReviewReady === true &&
      boundaryReceipt.restoreExecutionEnabled === false &&
      boundaryReceipt.bootstrapExecutionEnabled === false &&
      boundaryReceipt.safePointerPackageReady === true &&
      boundaryReceipt.optionalGapsResolved === true
    )
  );
  var missingGateItems = [];
  if (!normalizeBooleanV20(payload.a1xxRestoreExecutionEndpointReviewApprovalCaptured)) missingGateItems.push('A1XX restore execution endpoint review approval');
  if (!phase8acBoundaryReady) missingGateItems.push('Phase 8AC second-device restore execution boundary review');
  if (!selectedRestoreSourceMarker) missingGateItems.push('selectedRestoreSourceMarker');
  if (!cleanWorkbookId) missingGateItems.push('clean_workbook_id');
  if (!backupFolderId) missingGateItems.push('backup_folder_id');
  var endpointReviewItems = [
    {
      key: 'phase8ac_boundary_receipt',
      label: 'Phase 8AC restore execution boundary review receipt is present',
      value: boundaryReceipt.status || '',
      mode: 'review_only',
      status: phase8acBoundaryReady ? 'Ready' : 'Review'
    },
    {
      key: 'future_execution_endpoint_inactive',
      label: 'Future restore execution endpoint remains inactive in this phase',
      mode: 'safety_boundary',
      status: 'Blocked'
    },
    {
      key: 'execution_scope_locked',
      label: 'Future execution scope is limited to the selected backup marker and safe pointers',
      value: selectedRestoreSourceMarker,
      mode: 'contract_review_only',
      status: selectedRestoreSourceMarker ? 'Ready' : 'Review'
    },
    {
      key: 'restore_source_pointer_locked',
      label: 'Backup folder pointer is reviewed but not used to restore in this phase',
      pointerKey: 'backup_folder_id',
      value: backupFolderId,
      mode: 'read_only',
      status: backupFolderId ? 'Ready' : 'Blocked'
    },
    {
      key: 'restore_target_pointer_locked',
      label: 'Clean workbook pointer is reviewed but not written in this phase',
      pointerKey: 'clean_workbook_id',
      value: cleanWorkbookId,
      mode: 'read_only',
      status: cleanWorkbookId ? 'Ready' : 'Blocked'
    },
    {
      key: 'execution_requires_later_preflight',
      label: 'Any restore execution still requires a later preflight, fresh backup, and explicit A1XX approval',
      mode: 'safety_boundary',
      status: 'Blocked'
    },
    {
      key: 'protected_actions_locked',
      label: 'Login-anywhere, auth sync, token export, secret export, worker auth, automations, and bootstrap execution remain blocked',
      mode: 'safety_boundary',
      status: 'Blocked'
    }
  ];
  var allowedRequestFields = [
    'a1xxRestoreExecutionApprovalCaptured',
    'backupVerified',
    'latestBackupMarker',
    'selectedRestoreSourceMarker',
    'selectedRestoreSourceRow',
    'cleanWorkbookId',
    'backupFolderId',
    'targetDeviceLabel',
    'executionScope',
    'sourceBuild'
  ];
  var allowedExecutionInputs = [
    'selected_restore_source_marker',
    'backup_folder_id',
    'clean_workbook_id',
    'target_device_label'
  ];
  var allowedResponseFields = [
    'status',
    'mode',
    'executionReceipt',
    'restoreExecuted',
    'readbackRequired',
    'recoveryMode',
    'blockedActions'
  ];
  var blockedRequestFields = [
    'notionToken',
    'googleOAuthToken',
    'webhookToken',
    'todoistToken',
    'hmacSecret',
    'password',
    'pin',
    'workerCredential',
    'automationSecret'
  ];
  var requiredBeforeFutureExecution = [
    'fresh backup verified immediately before restore execution',
    'separate A1XX approval for actual restore execution',
    'explicit second-device identity confirmation',
    'exact selected backup marker confirmed',
    'restore execution preflight completed',
    'restore readback verification after execution',
    'archive-only recovery if readback fails'
  ];
  var endpointReviewReady = !!(
    phase8acBoundaryReady &&
    selectedRestoreSourceMarker &&
    cleanWorkbookId &&
    backupFolderId &&
    missingGateItems.length === 0 &&
    unsafe.length === 0
  );
  return jsonResponseV20({
    status: endpointReviewReady ? 'second_device_restore_execution_endpoint_review_ready' : 'second_device_restore_execution_endpoint_review_needs_review',
    ok: true,
    mode: 'second_device_restore_execution_endpoint_review_only',
    build: OS_REGISTRY_SUMMARY_BUILD_V20,
    checkedAt: checkedAt,
    endpointReviewExecuted: true,
    endpointContractReady: endpointReviewReady,
    futureRestoreEndpointActive: false,
    restoreEndpointActive: false,
    endpointName: 'second_device_restore_execution_v1',
    endpointAction: 'second_device_restore_execute_selected_backup',
    phase8acBoundaryReviewReady: phase8acBoundaryReady,
    selectedRestoreSourceMarker: selectedRestoreSourceMarker,
    selectedRestoreSourceRow: selectedRestoreSourceRow,
    latestBackupMarker: latestBackupMarker,
    latestBackupRow: latestBackupRow,
    cleanWorkbookId: cleanWorkbookId,
    backupFolderId: backupFolderId,
    targetDeviceLabel: cellTextV20(payload.targetDeviceLabel || boundaryReceipt.targetDeviceLabel || 'second device', 120),
    readExecuted: false,
    configReadExecuted: false,
    notionReadExecuted: false,
    writeExecuted: false,
    writesEnabled: false,
    loginAnywhereActive: false,
    secretExport: false,
    tokenExport: false,
    restoreEnabled: false,
    restoreExecutionEnabled: false,
    workerAuthEnabled: false,
    automationActivationEnabled: false,
    bootstrapExecutionEnabled: false,
    setupAutomationReady: false,
    endpointReviewItems: endpointReviewItems,
    allowedRequestFields: allowedRequestFields,
    allowedExecutionInputs: allowedExecutionInputs,
    allowedResponseFields: allowedResponseFields,
    blockedRequestFields: blockedRequestFields,
    requiredBeforeFutureExecution: requiredBeforeFutureExecution,
    missingGateItems: missingGateItems,
    unsafeFields: unsafe,
    nextAllowedStepAfterExecutionEndpointReview: endpointReviewReady
      ? 'second_device_restore_execution_preflight_review'
      : 'second_device_restore_execution_endpoint_review_repair',
    blockedActions: [
      'live master config write',
      'login-anywhere activation',
      'auth sync write',
      'token export',
      'secret export',
      'restore execution',
      'worker auth',
      'automation activation',
      'second-device bootstrap execution'
    ],
    message: endpointReviewReady
      ? 'Second-device restore execution endpoint review is ready. Restore execution remains blocked.'
      : 'Second-device restore execution endpoint review needs review. No restore execution ran.'
  });
}

function getSecondDeviceRestoreExecutionPreflightReviewV20(input) {
  var payload = input || {};
  var checkedAt = new Date().toISOString();
  var endpointReceipt = parseMasterConfigJsonParamV20(payload.executionEndpointReviewReceiptJson || payload.executionEndpointReviewReceipt, {});
  var unsafe = detectUnsafeMasterConfigReadSkeletonInputV20({
    sourceBuild: payload.sourceBuild || '',
    targetDeviceLabel: payload.targetDeviceLabel || '',
    endpointReviewStatus: endpointReceipt.status || '',
    selectedRestoreSourceMarker: payload.selectedRestoreSourceMarker || endpointReceipt.selectedRestoreSourceMarker || ''
  });
  var endpointReviewReady = !!(
    normalizeBooleanV20(payload.phase8adEndpointReviewReady) ||
    (
      endpointReceipt &&
      endpointReceipt.status === 'second_device_restore_execution_endpoint_review_ready' &&
      endpointReceipt.endpointContractReady === true &&
      endpointReceipt.futureRestoreEndpointActive === false &&
      endpointReceipt.restoreEndpointActive === false &&
      endpointReceipt.restoreExecutionEnabled === false &&
      endpointReceipt.bootstrapExecutionEnabled === false
    )
  );
  var selectedRestoreSourceMarker = cellTextV20(
    payload.selectedRestoreSourceMarker || endpointReceipt.selectedRestoreSourceMarker || endpointReceipt.latestBackupMarker || '',
    160
  );
  var selectedRestoreSourceRow = cellTextV20(
    payload.selectedRestoreSourceRow || endpointReceipt.selectedRestoreSourceRow || endpointReceipt.latestBackupRow || '',
    80
  );
  var latestBackupMarker = cellTextV20(
    payload.latestBackupMarker || endpointReceipt.latestBackupMarker || selectedRestoreSourceMarker || '',
    160
  );
  var latestBackupRow = cellTextV20(
    payload.latestBackupRow || endpointReceipt.latestBackupRow || selectedRestoreSourceRow || '',
    80
  );
  var cleanWorkbookId = cellTextV20(payload.cleanWorkbookId || endpointReceipt.cleanWorkbookId || '', 220);
  var backupFolderId = cellTextV20(payload.backupFolderId || endpointReceipt.backupFolderId || '', 220);
  var backupVerified = !!(normalizeBooleanV20(payload.backupVerified) || latestBackupMarker);
  var missingGateItems = [];
  if (!normalizeBooleanV20(payload.a1xxRestoreExecutionPreflightReviewApprovalCaptured)) missingGateItems.push('A1XX restore execution preflight review approval');
  if (!endpointReviewReady) missingGateItems.push('Phase 8AD second-device restore execution endpoint review');
  if (!backupVerified) missingGateItems.push('fresh backup verification');
  if (!selectedRestoreSourceMarker) missingGateItems.push('selectedRestoreSourceMarker');
  if (!cleanWorkbookId) missingGateItems.push('clean_workbook_id');
  if (!backupFolderId) missingGateItems.push('backup_folder_id');
  var preflightItems = [
    {
      key: 'phase8ad_endpoint_receipt',
      label: 'Phase 8AD restore execution endpoint review receipt is present',
      value: endpointReceipt.status || '',
      mode: 'review_only',
      status: endpointReviewReady ? 'Ready' : 'Review'
    },
    {
      key: 'fresh_backup_visible',
      label: 'Fresh backup marker is visible before any later restore execution gate',
      value: latestBackupMarker,
      mode: 'read_only',
      status: backupVerified ? 'Ready' : 'Review'
    },
    {
      key: 'restore_source_locked',
      label: 'Selected restore source marker is locked for future execution review',
      value: selectedRestoreSourceMarker,
      mode: 'preflight_review_only',
      status: selectedRestoreSourceMarker ? 'Ready' : 'Review'
    },
    {
      key: 'restore_target_pointer_visible',
      label: 'Clean workbook target pointer remains visible but not written',
      pointerKey: 'clean_workbook_id',
      value: cleanWorkbookId,
      mode: 'read_only',
      status: cleanWorkbookId ? 'Ready' : 'Blocked'
    },
    {
      key: 'restore_archive_pointer_visible',
      label: 'Backup folder source pointer remains visible but not used to execute restore',
      pointerKey: 'backup_folder_id',
      value: backupFolderId,
      mode: 'read_only',
      status: backupFolderId ? 'Ready' : 'Blocked'
    },
    {
      key: 'execution_endpoint_stays_inactive',
      label: 'Restore execution endpoint remains inactive during preflight review',
      mode: 'safety_boundary',
      status: 'Blocked'
    },
    {
      key: 'protected_actions_locked',
      label: 'Login-anywhere, auth sync, token export, secret export, worker auth, automations, and bootstrap execution remain blocked',
      mode: 'safety_boundary',
      status: 'Blocked'
    }
  ];
  var requiredBeforeFutureExecution = [
    'fresh backup verified immediately before restore execution',
    'B3 confirmation for actual restore execution',
    'separate A1XX restore execution approval',
    'explicit second-device identity confirmation',
    'exact selected backup marker confirmed',
    'restore execution receipt returned',
    'restore readback verification after execution',
    'archive-only recovery if readback fails'
  ];
  var preflightReady = !!(
    endpointReviewReady &&
    backupVerified &&
    selectedRestoreSourceMarker &&
    cleanWorkbookId &&
    backupFolderId &&
    missingGateItems.length === 0 &&
    unsafe.length === 0
  );
  return jsonResponseV20({
    status: preflightReady ? 'second_device_restore_execution_preflight_review_ready' : 'second_device_restore_execution_preflight_review_needs_review',
    ok: true,
    mode: 'second_device_restore_execution_preflight_review_only',
    build: OS_REGISTRY_SUMMARY_BUILD_V20,
    checkedAt: checkedAt,
    preflightReviewExecuted: true,
    preflightReviewReady: preflightReady,
    phase8adEndpointReviewReady: endpointReviewReady,
    backupVerified: backupVerified,
    latestBackupMarker: latestBackupMarker,
    latestBackupRow: latestBackupRow,
    selectedRestoreSourceMarker: selectedRestoreSourceMarker,
    selectedRestoreSourceRow: selectedRestoreSourceRow,
    cleanWorkbookId: cleanWorkbookId,
    backupFolderId: backupFolderId,
    targetDeviceLabel: cellTextV20(payload.targetDeviceLabel || endpointReceipt.targetDeviceLabel || 'second device', 120),
    readExecuted: false,
    configReadExecuted: false,
    notionReadExecuted: false,
    writeExecuted: false,
    writesEnabled: false,
    loginAnywhereActive: false,
    secretExport: false,
    tokenExport: false,
    restoreEnabled: false,
    restoreExecutionEnabled: false,
    workerAuthEnabled: false,
    automationActivationEnabled: false,
    bootstrapExecutionEnabled: false,
    setupAutomationReady: false,
    futureRestoreEndpointActive: false,
    restoreEndpointActive: false,
    preflightItems: preflightItems,
    requiredBeforeFutureExecution: requiredBeforeFutureExecution,
    missingGateItems: missingGateItems,
    unsafeFields: unsafe,
    nextAllowedStepAfterExecutionPreflightReview: preflightReady
      ? 'second_device_restore_execution_b3_confirmation'
      : 'second_device_restore_execution_preflight_review_repair',
    blockedActions: [
      'live master config write',
      'login-anywhere activation',
      'auth sync write',
      'token export',
      'secret export',
      'restore execution',
      'worker auth',
      'automation activation',
      'second-device bootstrap execution'
    ],
    message: preflightReady
      ? 'Second-device restore execution preflight review is ready. Restore execution remains blocked.'
      : 'Second-device restore execution preflight review needs review. No restore execution ran.'
  });
}

function getSecondDeviceRestoreExecutionB3GateReviewV20(input) {
  var payload = input || {};
  var checkedAt = new Date().toISOString();
  var expectedConfirmationText = 'B3 CONFIRM RESTORE EXECUTION GATE';
  var confirmationText = cellTextV20(payload.confirmationText || '', 120);
  var preflightReceipt = parseMasterConfigJsonParamV20(payload.executionPreflightReviewReceiptJson || payload.executionPreflightReviewReceipt, {});
  var unsafe = detectUnsafeMasterConfigReadSkeletonInputV20({
    sourceBuild: payload.sourceBuild || '',
    targetDeviceLabel: payload.targetDeviceLabel || '',
    preflightReviewStatus: preflightReceipt.status || '',
    selectedRestoreSourceMarker: payload.selectedRestoreSourceMarker || preflightReceipt.selectedRestoreSourceMarker || ''
  });
  var preflightReady = !!(
    normalizeBooleanV20(payload.phase8aePreflightReviewReady) ||
    (
      preflightReceipt &&
      preflightReceipt.status === 'second_device_restore_execution_preflight_review_ready' &&
      preflightReceipt.preflightReviewReady === true &&
      preflightReceipt.backupVerified === true &&
      preflightReceipt.restoreExecutionEnabled === false &&
      preflightReceipt.bootstrapExecutionEnabled === false &&
      preflightReceipt.futureRestoreEndpointActive === false &&
      preflightReceipt.restoreEndpointActive === false
    )
  );
  var selectedRestoreSourceMarker = cellTextV20(
    payload.selectedRestoreSourceMarker || preflightReceipt.selectedRestoreSourceMarker || preflightReceipt.latestBackupMarker || '',
    160
  );
  var selectedRestoreSourceRow = cellTextV20(
    payload.selectedRestoreSourceRow || preflightReceipt.selectedRestoreSourceRow || preflightReceipt.latestBackupRow || '',
    80
  );
  var latestBackupMarker = cellTextV20(
    payload.latestBackupMarker || preflightReceipt.latestBackupMarker || selectedRestoreSourceMarker || '',
    160
  );
  var latestBackupRow = cellTextV20(
    payload.latestBackupRow || preflightReceipt.latestBackupRow || selectedRestoreSourceRow || '',
    80
  );
  var cleanWorkbookId = cellTextV20(payload.cleanWorkbookId || preflightReceipt.cleanWorkbookId || '', 220);
  var backupFolderId = cellTextV20(payload.backupFolderId || preflightReceipt.backupFolderId || '', 220);
  var backupVerified = !!(normalizeBooleanV20(payload.backupVerified) || latestBackupMarker || preflightReceipt.backupVerified === true);
  var b3Confirmed = !!(
    normalizeBooleanV20(payload.b3Confirmed) &&
    confirmationText === expectedConfirmationText
  );
  var b3ArmedAt = cellTextV20(payload.b3ArmedAt || checkedAt, 80);
  var missingGateItems = [];
  if (!preflightReady) missingGateItems.push('Phase 8AE second-device restore execution preflight review');
  if (!backupVerified) missingGateItems.push('fresh backup verification');
  if (!b3Confirmed) missingGateItems.push('B3 confirmation text');
  if (!selectedRestoreSourceMarker) missingGateItems.push('selectedRestoreSourceMarker');
  if (!cleanWorkbookId) missingGateItems.push('clean_workbook_id');
  if (!backupFolderId) missingGateItems.push('backup_folder_id');
  var gateItems = [
    {
      key: 'phase8ae_preflight_receipt',
      label: 'Phase 8AE restore execution preflight review receipt is present',
      value: preflightReceipt.status || '',
      mode: 'review_only',
      status: preflightReady ? 'Ready' : 'Review'
    },
    {
      key: 'b3_confirmation_exact_text',
      label: 'B3 confirmation is armed for the final restore execution gate only',
      value: confirmationText,
      mode: 'b3_confirmation',
      status: b3Confirmed ? 'Armed' : 'Review'
    },
    {
      key: 'fresh_backup_visible',
      label: 'Fresh backup marker remains visible before any later restore execution',
      value: latestBackupMarker,
      mode: 'read_only',
      status: backupVerified ? 'Ready' : 'Review'
    },
    {
      key: 'exact_restore_source_locked',
      label: 'Selected restore source marker is locked for the future execution phase',
      value: selectedRestoreSourceMarker,
      mode: 'final_gate_review_only',
      status: selectedRestoreSourceMarker ? 'Ready' : 'Review'
    },
    {
      key: 'exact_restore_target_locked',
      label: 'Clean workbook target pointer is locked for future execution review',
      pointerKey: 'clean_workbook_id',
      value: cleanWorkbookId,
      mode: 'final_gate_review_only',
      status: cleanWorkbookId ? 'Ready' : 'Review'
    },
    {
      key: 'restore_source_folder_locked',
      label: 'Backup folder source pointer is locked for future execution review',
      pointerKey: 'backup_folder_id',
      value: backupFolderId,
      mode: 'final_gate_review_only',
      status: backupFolderId ? 'Ready' : 'Review'
    },
    {
      key: 'actual_restore_requires_separate_phase',
      label: 'Actual restore execution still requires a later separate approval and execution phase',
      mode: 'safety_boundary',
      status: 'Blocked'
    },
    {
      key: 'protected_actions_locked',
      label: 'Login-anywhere, auth sync, token export, secret export, worker auth, automations, and bootstrap execution remain blocked',
      mode: 'safety_boundary',
      status: 'Blocked'
    }
  ];
  var requiredBeforeActualExecution = [
    'fresh backup verified immediately before restore execution',
    'separate A1XX approval for actual restore execution',
    'explicit second-device identity confirmation',
    'exact selected backup marker confirmed',
    'actual restore execution endpoint reviewed and activated in its own phase',
    'restore execution receipt returned',
    'restore readback verification after execution',
    'archive-only recovery if readback fails'
  ];
  var gateReviewReady = !!(
    preflightReady &&
    backupVerified &&
    b3Confirmed &&
    selectedRestoreSourceMarker &&
    cleanWorkbookId &&
    backupFolderId &&
    missingGateItems.length === 0 &&
    unsafe.length === 0
  );
  return jsonResponseV20({
    status: gateReviewReady ? 'second_device_restore_execution_b3_gate_review_ready' : 'second_device_restore_execution_b3_gate_review_needs_review',
    ok: true,
    mode: 'second_device_restore_execution_b3_gate_review_only',
    build: OS_REGISTRY_SUMMARY_BUILD_V20,
    checkedAt: checkedAt,
    b3GateReviewExecuted: true,
    b3GateReviewReady: gateReviewReady,
    finalExecutionGateReviewed: gateReviewReady,
    phase8aePreflightReviewReady: preflightReady,
    b3Confirmed: b3Confirmed,
    b3ArmedAt: b3ArmedAt,
    confirmationText: confirmationText,
    expectedConfirmationText: expectedConfirmationText,
    backupVerified: backupVerified,
    latestBackupMarker: latestBackupMarker,
    latestBackupRow: latestBackupRow,
    selectedRestoreSourceMarker: selectedRestoreSourceMarker,
    selectedRestoreSourceRow: selectedRestoreSourceRow,
    cleanWorkbookId: cleanWorkbookId,
    backupFolderId: backupFolderId,
    targetDeviceLabel: cellTextV20(payload.targetDeviceLabel || preflightReceipt.targetDeviceLabel || 'second device', 120),
    readExecuted: false,
    configReadExecuted: false,
    notionReadExecuted: false,
    writeExecuted: false,
    writesEnabled: false,
    loginAnywhereActive: false,
    secretExport: false,
    tokenExport: false,
    restoreEnabled: false,
    restoreExecutionEnabled: false,
    workerAuthEnabled: false,
    automationActivationEnabled: false,
    bootstrapExecutionEnabled: false,
    setupAutomationReady: false,
    futureRestoreEndpointActive: false,
    restoreEndpointActive: false,
    gateReviewItems: gateItems,
    requiredBeforeActualExecution: requiredBeforeActualExecution,
    missingGateItems: missingGateItems,
    unsafeFields: unsafe,
    nextAllowedStepAfterExecutionB3GateReview: gateReviewReady
      ? 'second_device_restore_execution_actual_run_approval'
      : 'second_device_restore_execution_b3_gate_review_repair',
    blockedActions: [
      'live master config write',
      'login-anywhere activation',
      'auth sync write',
      'token export',
      'secret export',
      'restore execution',
      'worker auth',
      'automation activation',
      'second-device bootstrap execution'
    ],
    message: gateReviewReady
      ? 'Second-device restore execution B3 and final gate review is ready. Actual restore execution remains blocked for a later separate phase.'
      : 'Second-device restore execution B3 and final gate review needs review. No restore execution ran.'
  });
}

function getSecondDeviceRestoreExecutionActualRunApprovalV20(input) {
  var payload = input || {};
  var checkedAt = new Date().toISOString();
  var expectedApprovalText = 'A1XX APPROVE RESTORE EXECUTION RUN GATE';
  var approvalText = cellTextV20(payload.approvalText || '', 120);
  var gateReceipt = parseMasterConfigJsonParamV20(payload.b3GateReviewReceiptJson || payload.b3GateReviewReceipt, {});
  var unsafe = detectUnsafeMasterConfigReadSkeletonInputV20({
    sourceBuild: payload.sourceBuild || '',
    targetDeviceLabel: payload.targetDeviceLabel || '',
    b3GateReviewStatus: gateReceipt.status || '',
    selectedRestoreSourceMarker: payload.selectedRestoreSourceMarker || gateReceipt.selectedRestoreSourceMarker || ''
  });
  var phase8af8agReady = !!(
    normalizeBooleanV20(payload.phase8af8agGateReviewReady) ||
    (
      gateReceipt &&
      gateReceipt.status === 'second_device_restore_execution_b3_gate_review_ready' &&
      gateReceipt.b3GateReviewReady === true &&
      gateReceipt.finalExecutionGateReviewed === true &&
      gateReceipt.b3Confirmed === true &&
      gateReceipt.restoreExecutionEnabled === false &&
      gateReceipt.bootstrapExecutionEnabled === false &&
      gateReceipt.futureRestoreEndpointActive === false &&
      gateReceipt.restoreEndpointActive === false
    )
  );
  var selectedRestoreSourceMarker = cellTextV20(
    payload.selectedRestoreSourceMarker || gateReceipt.selectedRestoreSourceMarker || gateReceipt.latestBackupMarker || '',
    160
  );
  var selectedRestoreSourceRow = cellTextV20(
    payload.selectedRestoreSourceRow || gateReceipt.selectedRestoreSourceRow || gateReceipt.latestBackupRow || '',
    80
  );
  var latestBackupMarker = cellTextV20(
    payload.latestBackupMarker || gateReceipt.latestBackupMarker || selectedRestoreSourceMarker || '',
    160
  );
  var latestBackupRow = cellTextV20(
    payload.latestBackupRow || gateReceipt.latestBackupRow || selectedRestoreSourceRow || '',
    80
  );
  var cleanWorkbookId = cellTextV20(payload.cleanWorkbookId || gateReceipt.cleanWorkbookId || '', 220);
  var backupFolderId = cellTextV20(payload.backupFolderId || gateReceipt.backupFolderId || '', 220);
  var targetDeviceLabel = cellTextV20(payload.targetDeviceLabel || gateReceipt.targetDeviceLabel || 'second device', 120);
  var backupVerified = !!(normalizeBooleanV20(payload.backupVerified) || latestBackupMarker || gateReceipt.backupVerified === true);
  var approvalCaptured = !!(
    normalizeBooleanV20(payload.a1xxActualRestoreExecutionApprovalCaptured) &&
    approvalText === expectedApprovalText
  );
  var missingGateItems = [];
  if (!phase8af8agReady) missingGateItems.push('Phase 8AF/8AG second-device restore execution B3/final gate review');
  if (!backupVerified) missingGateItems.push('fresh backup verification');
  if (!approvalCaptured) missingGateItems.push('A1XX actual restore execution run approval text');
  if (!selectedRestoreSourceMarker) missingGateItems.push('selectedRestoreSourceMarker');
  if (!cleanWorkbookId) missingGateItems.push('clean_workbook_id');
  if (!backupFolderId) missingGateItems.push('backup_folder_id');
  if (!targetDeviceLabel) missingGateItems.push('targetDeviceLabel');
  var approvalItems = [
    {
      key: 'phase8af8ag_b3_gate_receipt',
      label: 'Phase 8AF/8AG B3/final gate receipt is present',
      value: gateReceipt.status || '',
      mode: 'review_only',
      status: phase8af8agReady ? 'Ready' : 'Review'
    },
    {
      key: 'actual_run_approval_text',
      label: 'A1XX actual restore execution run approval is captured for the future execution gate',
      value: approvalText,
      mode: 'approval_gate',
      status: approvalCaptured ? 'Approved' : 'Review'
    },
    {
      key: 'fresh_backup_visible',
      label: 'Fresh backup marker is visible before any future restore execution activation',
      value: latestBackupMarker,
      mode: 'read_only',
      status: backupVerified ? 'Ready' : 'Review'
    },
    {
      key: 'restore_source_locked',
      label: 'Selected restore source marker stays locked',
      value: selectedRestoreSourceMarker,
      mode: 'approval_review_only',
      status: selectedRestoreSourceMarker ? 'Ready' : 'Review'
    },
    {
      key: 'restore_target_locked',
      label: 'Clean workbook target pointer stays locked',
      pointerKey: 'clean_workbook_id',
      value: cleanWorkbookId,
      mode: 'approval_review_only',
      status: cleanWorkbookId ? 'Ready' : 'Review'
    },
    {
      key: 'restore_source_folder_locked',
      label: 'Backup folder source pointer stays locked',
      pointerKey: 'backup_folder_id',
      value: backupFolderId,
      mode: 'approval_review_only',
      status: backupFolderId ? 'Ready' : 'Review'
    },
    {
      key: 'restore_execution_endpoint_inactive',
      label: 'Actual restore execution endpoint remains inactive in this approval phase',
      mode: 'safety_boundary',
      status: 'Blocked'
    },
    {
      key: 'protected_actions_locked',
      label: 'Login-anywhere, auth sync, token export, secret export, worker auth, automations, and bootstrap execution remain blocked',
      mode: 'safety_boundary',
      status: 'Blocked'
    }
  ];
  var requiredBeforeRestoreExecution = [
    'actual restore execution endpoint activation reviewed in its own phase',
    'fresh backup verified immediately before execution',
    'exact selected backup marker confirmed again',
    'explicit second-device identity confirmation',
    'restore execution receipt returned',
    'restore readback verification after execution',
    'archive-only recovery if readback fails'
  ];
  var approvalReady = !!(
    phase8af8agReady &&
    backupVerified &&
    approvalCaptured &&
    selectedRestoreSourceMarker &&
    cleanWorkbookId &&
    backupFolderId &&
    targetDeviceLabel &&
    missingGateItems.length === 0 &&
    unsafe.length === 0
  );
  return jsonResponseV20({
    status: approvalReady ? 'second_device_restore_execution_actual_run_approval_ready' : 'second_device_restore_execution_actual_run_approval_needs_review',
    ok: true,
    mode: 'second_device_restore_execution_actual_run_approval_only',
    build: OS_REGISTRY_SUMMARY_BUILD_V20,
    checkedAt: checkedAt,
    actualRunApprovalExecuted: true,
    actualRunApprovalReady: approvalReady,
    phase8af8agGateReviewReady: phase8af8agReady,
    a1xxActualRestoreExecutionApprovalCaptured: approvalCaptured,
    approvalText: approvalText,
    expectedApprovalText: expectedApprovalText,
    backupVerified: backupVerified,
    latestBackupMarker: latestBackupMarker,
    latestBackupRow: latestBackupRow,
    selectedRestoreSourceMarker: selectedRestoreSourceMarker,
    selectedRestoreSourceRow: selectedRestoreSourceRow,
    cleanWorkbookId: cleanWorkbookId,
    backupFolderId: backupFolderId,
    targetDeviceLabel: targetDeviceLabel,
    readExecuted: false,
    configReadExecuted: false,
    notionReadExecuted: false,
    writeExecuted: false,
    writesEnabled: false,
    loginAnywhereActive: false,
    secretExport: false,
    tokenExport: false,
    restoreEnabled: false,
    restoreExecutionEnabled: false,
    workerAuthEnabled: false,
    automationActivationEnabled: false,
    bootstrapExecutionEnabled: false,
    setupAutomationReady: false,
    futureRestoreEndpointActive: false,
    restoreEndpointActive: false,
    approvalReviewItems: approvalItems,
    requiredBeforeRestoreExecution: requiredBeforeRestoreExecution,
    missingGateItems: missingGateItems,
    unsafeFields: unsafe,
    nextAllowedStepAfterActualRunApproval: approvalReady
      ? 'second_device_restore_execution_run_endpoint_activation_review'
      : 'second_device_restore_execution_actual_run_approval_repair',
    blockedActions: [
      'live master config write',
      'login-anywhere activation',
      'auth sync write',
      'token export',
      'secret export',
      'restore execution',
      'worker auth',
      'automation activation',
      'second-device bootstrap execution'
    ],
    message: approvalReady
      ? 'Second-device restore execution actual run approval is captured. Actual restore execution remains blocked for a later endpoint activation phase.'
      : 'Second-device restore execution actual run approval needs review. No restore execution ran.'
  });
}

function getSecondDeviceRestoreExecutionRunEndpointActivationReviewV20(input) {
  var payload = input || {};
  var checkedAt = new Date().toISOString();
  var expectedActivationText = 'A1XX REVIEW RESTORE ENDPOINT ACTIVATION';
  var activationText = cellTextV20(payload.activationReviewText || '', 140);
  var approvalReceipt = parseMasterConfigJsonParamV20(payload.actualRunApprovalReceiptJson || payload.actualRunApprovalReceipt, {});
  var unsafe = detectUnsafeMasterConfigReadSkeletonInputV20({
    sourceBuild: payload.sourceBuild || '',
    targetDeviceLabel: payload.targetDeviceLabel || '',
    actualRunApprovalStatus: approvalReceipt.status || '',
    selectedRestoreSourceMarker: payload.selectedRestoreSourceMarker || approvalReceipt.selectedRestoreSourceMarker || ''
  });
  var phase8ahApprovalReady = !!(
    normalizeBooleanV20(payload.phase8ahActualRunApprovalReady) ||
    (
      approvalReceipt &&
      approvalReceipt.status === 'second_device_restore_execution_actual_run_approval_ready' &&
      approvalReceipt.actualRunApprovalReady === true &&
      approvalReceipt.a1xxActualRestoreExecutionApprovalCaptured === true &&
      approvalReceipt.restoreExecutionEnabled === false &&
      approvalReceipt.bootstrapExecutionEnabled === false &&
      approvalReceipt.futureRestoreEndpointActive === false &&
      approvalReceipt.restoreEndpointActive === false
    )
  );
  var selectedRestoreSourceMarker = cellTextV20(
    payload.selectedRestoreSourceMarker || approvalReceipt.selectedRestoreSourceMarker || approvalReceipt.latestBackupMarker || '',
    160
  );
  var selectedRestoreSourceRow = cellTextV20(
    payload.selectedRestoreSourceRow || approvalReceipt.selectedRestoreSourceRow || approvalReceipt.latestBackupRow || '',
    80
  );
  var latestBackupMarker = cellTextV20(
    payload.latestBackupMarker || approvalReceipt.latestBackupMarker || selectedRestoreSourceMarker || '',
    160
  );
  var latestBackupRow = cellTextV20(
    payload.latestBackupRow || approvalReceipt.latestBackupRow || selectedRestoreSourceRow || '',
    80
  );
  var cleanWorkbookId = cellTextV20(payload.cleanWorkbookId || approvalReceipt.cleanWorkbookId || '', 220);
  var backupFolderId = cellTextV20(payload.backupFolderId || approvalReceipt.backupFolderId || '', 220);
  var targetDeviceLabel = cellTextV20(payload.targetDeviceLabel || approvalReceipt.targetDeviceLabel || 'second device', 120);
  var backupVerified = !!(normalizeBooleanV20(payload.backupVerified) || latestBackupMarker || approvalReceipt.backupVerified === true);
  var activationReviewed = !!(
    normalizeBooleanV20(payload.a1xxRestoreEndpointActivationReviewCaptured) &&
    activationText === expectedActivationText
  );
  var missingGateItems = [];
  if (!phase8ahApprovalReady) missingGateItems.push('Phase 8AH second-device restore execution actual run approval');
  if (!backupVerified) missingGateItems.push('fresh backup verification');
  if (!activationReviewed) missingGateItems.push('A1XX restore endpoint activation review text');
  if (!selectedRestoreSourceMarker) missingGateItems.push('selectedRestoreSourceMarker');
  if (!cleanWorkbookId) missingGateItems.push('clean_workbook_id');
  if (!backupFolderId) missingGateItems.push('backup_folder_id');
  if (!targetDeviceLabel) missingGateItems.push('targetDeviceLabel');
  var activationItems = [
    {
      key: 'phase8ah_actual_run_approval_receipt',
      label: 'Phase 8AH actual run approval receipt is present',
      value: approvalReceipt.status || '',
      mode: 'review_only',
      status: phase8ahApprovalReady ? 'Ready' : 'Review'
    },
    {
      key: 'endpoint_activation_review_text',
      label: 'A1XX restore endpoint activation review is captured',
      value: activationText,
      mode: 'activation_review_gate',
      status: activationReviewed ? 'Reviewed' : 'Review'
    },
    {
      key: 'future_endpoint_contract_visible',
      label: 'Future restore execution endpoint contract is visible but inactive',
      value: 'second_device_restore_execution_v1',
      mode: 'endpoint_activation_review_only',
      status: 'Ready'
    },
    {
      key: 'restore_endpoint_inactive',
      label: 'Restore execution endpoint remains inactive during activation review',
      mode: 'safety_boundary',
      status: 'Blocked'
    },
    {
      key: 'fresh_backup_visible',
      label: 'Fresh backup marker is visible before any later execution phase',
      value: latestBackupMarker,
      mode: 'read_only',
      status: backupVerified ? 'Ready' : 'Review'
    },
    {
      key: 'restore_source_locked',
      label: 'Selected restore source marker remains locked',
      value: selectedRestoreSourceMarker,
      mode: 'activation_review_only',
      status: selectedRestoreSourceMarker ? 'Ready' : 'Review'
    },
    {
      key: 'restore_target_locked',
      label: 'Clean workbook target pointer remains locked',
      pointerKey: 'clean_workbook_id',
      value: cleanWorkbookId,
      mode: 'activation_review_only',
      status: cleanWorkbookId ? 'Ready' : 'Review'
    },
    {
      key: 'protected_actions_locked',
      label: 'Login-anywhere, auth sync, token export, secret export, worker auth, automations, and bootstrap execution remain blocked',
      mode: 'safety_boundary',
      status: 'Blocked'
    }
  ];
  var requiredBeforeRestoreExecution = [
    'final pre-execution preflight completed in its own phase',
    'fresh backup verified immediately before execution',
    'exact selected backup marker confirmed again',
    'explicit second-device identity confirmation',
    'restore execution endpoint activated only in the execution phase',
    'restore execution receipt returned',
    'restore readback verification after execution',
    'archive-only recovery if readback fails'
  ];
  var activationReady = !!(
    phase8ahApprovalReady &&
    backupVerified &&
    activationReviewed &&
    selectedRestoreSourceMarker &&
    cleanWorkbookId &&
    backupFolderId &&
    targetDeviceLabel &&
    missingGateItems.length === 0 &&
    unsafe.length === 0
  );
  return jsonResponseV20({
    status: activationReady ? 'second_device_restore_execution_run_endpoint_activation_review_ready' : 'second_device_restore_execution_run_endpoint_activation_review_needs_review',
    ok: true,
    mode: 'second_device_restore_execution_run_endpoint_activation_review_only',
    build: OS_REGISTRY_SUMMARY_BUILD_V20,
    checkedAt: checkedAt,
    endpointActivationReviewExecuted: true,
    endpointActivationReviewReady: activationReady,
    phase8ahActualRunApprovalReady: phase8ahApprovalReady,
    a1xxRestoreEndpointActivationReviewCaptured: activationReviewed,
    activationReviewText: activationText,
    expectedActivationReviewText: expectedActivationText,
    endpointName: 'second_device_restore_execution_v1',
    endpointAction: 'second_device_restore_execution',
    backupVerified: backupVerified,
    latestBackupMarker: latestBackupMarker,
    latestBackupRow: latestBackupRow,
    selectedRestoreSourceMarker: selectedRestoreSourceMarker,
    selectedRestoreSourceRow: selectedRestoreSourceRow,
    cleanWorkbookId: cleanWorkbookId,
    backupFolderId: backupFolderId,
    targetDeviceLabel: targetDeviceLabel,
    readExecuted: false,
    configReadExecuted: false,
    notionReadExecuted: false,
    writeExecuted: false,
    writesEnabled: false,
    loginAnywhereActive: false,
    secretExport: false,
    tokenExport: false,
    restoreEnabled: false,
    restoreExecutionEnabled: false,
    workerAuthEnabled: false,
    automationActivationEnabled: false,
    bootstrapExecutionEnabled: false,
    setupAutomationReady: false,
    futureRestoreEndpointActive: false,
    restoreEndpointActive: false,
    endpointActivationReviewItems: activationItems,
    requiredBeforeRestoreExecution: requiredBeforeRestoreExecution,
    missingGateItems: missingGateItems,
    unsafeFields: unsafe,
    nextAllowedStepAfterEndpointActivationReview: activationReady
      ? 'second_device_restore_execution_final_pre_execution_preflight'
      : 'second_device_restore_execution_run_endpoint_activation_review_repair',
    blockedActions: [
      'live master config write',
      'login-anywhere activation',
      'auth sync write',
      'token export',
      'secret export',
      'restore execution',
      'worker auth',
      'automation activation',
      'second-device bootstrap execution'
    ],
    message: activationReady
      ? 'Second-device restore execution endpoint activation review is ready. Actual restore execution remains blocked for a later pre-execution phase.'
      : 'Second-device restore execution endpoint activation review needs review. No restore execution ran.'
  });
}

function getSecondDeviceRestoreExecutionFinalPreExecutionPreflightV20(input) {
  var payload = input || {};
  var checkedAt = new Date().toISOString();
  var expectedPreflightText = 'A1XX CONFIRM FINAL RESTORE PREFLIGHT';
  var preflightText = cellTextV20(payload.finalPreflightText || '', 140);
  var activationReceipt = parseMasterConfigJsonParamV20(payload.endpointActivationReviewReceiptJson || payload.endpointActivationReviewReceipt, {});
  var unsafe = detectUnsafeMasterConfigReadSkeletonInputV20({
    sourceBuild: payload.sourceBuild || '',
    targetDeviceLabel: payload.targetDeviceLabel || '',
    endpointActivationStatus: activationReceipt.status || '',
    selectedRestoreSourceMarker: payload.selectedRestoreSourceMarker || activationReceipt.selectedRestoreSourceMarker || ''
  });
  var phase8aiActivationReady = !!(
    normalizeBooleanV20(payload.phase8aiEndpointActivationReviewReady) ||
    (
      activationReceipt &&
      activationReceipt.status === 'second_device_restore_execution_run_endpoint_activation_review_ready' &&
      activationReceipt.endpointActivationReviewReady === true &&
      activationReceipt.a1xxRestoreEndpointActivationReviewCaptured === true &&
      activationReceipt.restoreExecutionEnabled === false &&
      activationReceipt.bootstrapExecutionEnabled === false &&
      activationReceipt.futureRestoreEndpointActive === false &&
      activationReceipt.restoreEndpointActive === false
    )
  );
  var selectedRestoreSourceMarker = cellTextV20(
    payload.selectedRestoreSourceMarker || activationReceipt.selectedRestoreSourceMarker || activationReceipt.latestBackupMarker || '',
    160
  );
  var selectedRestoreSourceRow = cellTextV20(
    payload.selectedRestoreSourceRow || activationReceipt.selectedRestoreSourceRow || activationReceipt.latestBackupRow || '',
    80
  );
  var latestBackupMarker = cellTextV20(
    payload.latestBackupMarker || activationReceipt.latestBackupMarker || selectedRestoreSourceMarker || '',
    160
  );
  var latestBackupRow = cellTextV20(
    payload.latestBackupRow || activationReceipt.latestBackupRow || selectedRestoreSourceRow || '',
    80
  );
  var cleanWorkbookId = cellTextV20(payload.cleanWorkbookId || activationReceipt.cleanWorkbookId || '', 220);
  var backupFolderId = cellTextV20(payload.backupFolderId || activationReceipt.backupFolderId || '', 220);
  var targetDeviceLabel = cellTextV20(payload.targetDeviceLabel || activationReceipt.targetDeviceLabel || 'second device', 120);
  var backupVerified = !!(normalizeBooleanV20(payload.backupVerified) || latestBackupMarker || activationReceipt.backupVerified === true);
  var sourceConfirmed = !!(
    normalizeBooleanV20(payload.selectedRestoreSourceConfirmed) &&
    selectedRestoreSourceMarker &&
    cellTextV20(payload.confirmedRestoreSourceMarker || selectedRestoreSourceMarker, 160) === selectedRestoreSourceMarker
  );
  var targetConfirmed = !!(
    normalizeBooleanV20(payload.restoreTargetPointersConfirmed) &&
    cleanWorkbookId &&
    backupFolderId
  );
  var deviceConfirmed = !!(
    normalizeBooleanV20(payload.secondDeviceIdentityConfirmed) &&
    targetDeviceLabel
  );
  var finalPreflightConfirmed = !!(
    normalizeBooleanV20(payload.a1xxFinalRestorePreflightConfirmed) &&
    preflightText === expectedPreflightText
  );
  var missingGateItems = [];
  if (!phase8aiActivationReady) missingGateItems.push('Phase 8AI second-device restore execution endpoint activation review');
  if (!backupVerified) missingGateItems.push('fresh backup verification');
  if (!sourceConfirmed) missingGateItems.push('selected restore source confirmation');
  if (!targetConfirmed) missingGateItems.push('restore target pointer confirmation');
  if (!deviceConfirmed) missingGateItems.push('second-device identity confirmation');
  if (!finalPreflightConfirmed) missingGateItems.push('A1XX final restore preflight confirmation text');
  if (!selectedRestoreSourceMarker) missingGateItems.push('selectedRestoreSourceMarker');
  if (!cleanWorkbookId) missingGateItems.push('clean_workbook_id');
  if (!backupFolderId) missingGateItems.push('backup_folder_id');
  var preflightItems = [
    {
      key: 'phase8ai_endpoint_activation_receipt',
      label: 'Phase 8AI endpoint activation review receipt is present',
      value: activationReceipt.status || '',
      mode: 'review_only',
      status: phase8aiActivationReady ? 'Ready' : 'Review'
    },
    {
      key: 'final_preflight_confirmation_text',
      label: 'A1XX final restore preflight confirmation is captured',
      value: preflightText,
      mode: 'final_preflight_gate',
      status: finalPreflightConfirmed ? 'Confirmed' : 'Review'
    },
    {
      key: 'fresh_backup_visible',
      label: 'Fresh backup marker is visible immediately before any future execution phase',
      value: latestBackupMarker,
      mode: 'read_only',
      status: backupVerified ? 'Ready' : 'Review'
    },
    {
      key: 'restore_source_reconfirmed',
      label: 'Selected restore source marker is reconfirmed',
      value: selectedRestoreSourceMarker,
      mode: 'final_preflight_only',
      status: sourceConfirmed ? 'Ready' : 'Review'
    },
    {
      key: 'restore_target_reconfirmed',
      label: 'Clean workbook and backup folder pointers are reconfirmed',
      value: cleanWorkbookId && backupFolderId ? cleanWorkbookId + ' | ' + backupFolderId : '',
      mode: 'final_preflight_only',
      status: targetConfirmed ? 'Ready' : 'Review'
    },
    {
      key: 'second_device_identity_reconfirmed',
      label: 'Second-device identity is reconfirmed manually',
      value: targetDeviceLabel,
      mode: 'manual_review_only',
      status: deviceConfirmed ? 'Ready' : 'Review'
    },
    {
      key: 'restore_execution_endpoint_inactive',
      label: 'Restore execution endpoint remains inactive in final preflight',
      mode: 'safety_boundary',
      status: 'Blocked'
    },
    {
      key: 'protected_actions_locked',
      label: 'Login-anywhere, auth sync, token export, secret export, worker auth, automations, and bootstrap execution remain blocked',
      mode: 'safety_boundary',
      status: 'Blocked'
    }
  ];
  var requiredBeforeRestoreExecution = [
    'fresh backup verified immediately before execution',
    'A1XX explicit restore execution run command in the execution phase',
    'exact selected backup marker supplied to execution request',
    'second-device identity supplied to execution request',
    'restore execution receipt returned',
    'restore readback verification after execution',
    'archive-only recovery if readback fails'
  ];
  var finalPreflightReady = !!(
    phase8aiActivationReady &&
    backupVerified &&
    sourceConfirmed &&
    targetConfirmed &&
    deviceConfirmed &&
    finalPreflightConfirmed &&
    selectedRestoreSourceMarker &&
    cleanWorkbookId &&
    backupFolderId &&
    missingGateItems.length === 0 &&
    unsafe.length === 0
  );
  return jsonResponseV20({
    status: finalPreflightReady ? 'second_device_restore_execution_final_pre_execution_preflight_ready' : 'second_device_restore_execution_final_pre_execution_preflight_needs_review',
    ok: true,
    mode: 'second_device_restore_execution_final_pre_execution_preflight_only',
    build: OS_REGISTRY_SUMMARY_BUILD_V20,
    checkedAt: checkedAt,
    finalPreExecutionPreflightExecuted: true,
    finalPreExecutionPreflightReady: finalPreflightReady,
    phase8aiEndpointActivationReviewReady: phase8aiActivationReady,
    a1xxFinalRestorePreflightConfirmed: finalPreflightConfirmed,
    finalPreflightText: preflightText,
    expectedFinalPreflightText: expectedPreflightText,
    selectedRestoreSourceConfirmed: sourceConfirmed,
    restoreTargetPointersConfirmed: targetConfirmed,
    secondDeviceIdentityConfirmed: deviceConfirmed,
    backupVerified: backupVerified,
    latestBackupMarker: latestBackupMarker,
    latestBackupRow: latestBackupRow,
    selectedRestoreSourceMarker: selectedRestoreSourceMarker,
    selectedRestoreSourceRow: selectedRestoreSourceRow,
    cleanWorkbookId: cleanWorkbookId,
    backupFolderId: backupFolderId,
    targetDeviceLabel: targetDeviceLabel,
    readExecuted: false,
    configReadExecuted: false,
    notionReadExecuted: false,
    writeExecuted: false,
    writesEnabled: false,
    loginAnywhereActive: false,
    secretExport: false,
    tokenExport: false,
    restoreEnabled: false,
    restoreExecutionEnabled: false,
    workerAuthEnabled: false,
    automationActivationEnabled: false,
    bootstrapExecutionEnabled: false,
    setupAutomationReady: false,
    futureRestoreEndpointActive: false,
    restoreEndpointActive: false,
    finalPreflightItems: preflightItems,
    requiredBeforeRestoreExecution: requiredBeforeRestoreExecution,
    missingGateItems: missingGateItems,
    unsafeFields: unsafe,
    nextAllowedStepAfterFinalPreExecutionPreflight: finalPreflightReady
      ? 'second_device_restore_execution_run'
      : 'second_device_restore_execution_final_pre_execution_preflight_repair',
    blockedActions: [
      'live master config write',
      'login-anywhere activation',
      'auth sync write',
      'token export',
      'secret export',
      'restore execution',
      'worker auth',
      'automation activation',
      'second-device bootstrap execution'
    ],
    message: finalPreflightReady
      ? 'Second-device restore execution final pre-execution preflight is ready. Actual restore execution remains blocked for a separate execution phase.'
      : 'Second-device restore execution final pre-execution preflight needs review. No restore execution ran.'
  });
}

function getSecondDeviceRestoreProtectedStorageKeysV20() {
  var keys = {};
  [
    'a1xx_sheets_url_v1',
    'a1xx_mc_sheets_config_v11',
    'mmos_webhook_token_v1',
    'a1xx_todoist_v1',
    'a1xx_notion_v1',
    'a1xx_ig_token'
  ].forEach(function(key) {
    keys[key] = true;
  });
  return keys;
}

function getDriveBackupPayloadByMarkerV20(markerId) {
  markerId = cellTextV20(markerId || '', 160);
  if (!markerId) return { ok: false, error: 'missing_marker' };
  var ss = getMoneyMissionSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_BACKUP);
  if (!sheet || sheet.getLastRow() < 2) return { ok: false, error: 'missing_backup_index' };
  var lastRow = sheet.getLastRow();
  var start = Math.max(2, lastRow - 499);
  var values = sheet.getRange(start, 1, lastRow - start + 1, Math.min(sheet.getLastColumn(), 10)).getValues();
  for (var i = values.length - 1; i >= 0; i--) {
    var row = values[i];
    if (!isDriveBackupIndexRowV18(row) || String(row[4] || '') !== markerId) continue;
    var payload = loadDriveBackupPayloadV18(row[5]);
    return {
      ok: true,
      payload: payload,
      row: start + i,
      backupId: row[4] || '',
      driveFileId: row[5] || '',
      driveUrl: row[6] || '',
      build: row[7] || '',
      savedAt: row[0] || ''
    };
  }
  return { ok: false, error: 'backup_marker_not_found_recent' };
}

function extractCleanWorkbookIdFromBackupPayloadV20(backupPayload) {
  function shaped(value) {
    value = cellTextV20(value || '', 220);
    return /^[A-Za-z0-9_-]{20,}$/.test(value) ? value : '';
  }
  function inspectValue(value) {
    if (!value) return '';
    if (typeof value === 'object') return inspectObject(value);
    var text = String(value || '');
    var direct = shaped(text);
    if (direct) return direct;
    try {
      return inspectObject(JSON.parse(text));
    } catch (err) {
      return '';
    }
  }
  function inspectObject(obj) {
    if (!obj || typeof obj !== 'object') return '';
    var candidates = [
      'clean_workbook_id',
      'cleanWorkbookId',
      'cleanWorkbookID',
      'cleanWorkbook',
      'workbookId',
      'spreadsheetId',
      'sheetsId',
      'targetSpreadsheetId',
      'targetWorkbookId'
    ];
    for (var i = 0; i < candidates.length; i++) {
      var found = shaped(obj[candidates[i]]);
      if (found) return found;
    }
    for (var key in obj) {
      if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
      if (!/clean|workbook|spreadsheet|sheets|target/i.test(key)) continue;
      var nested = inspectValue(obj[key]);
      if (nested) return nested;
    }
    return '';
  }
  var direct = inspectObject(backupPayload);
  if (direct) return direct;
  var keys = Object.keys(backupPayload || {});
  for (var i = 0; i < keys.length; i++) {
    if (!/config|pointer|profile|setup|registry|sheets|workbook/i.test(keys[i])) continue;
    var found = inspectValue(backupPayload[keys[i]]);
    if (found) return found;
  }
  return '';
}

function runSecondDeviceRestoreExecutionRunV20(input) {
  var payload = input || {};
  var checkedAt = new Date().toISOString();
  var expectedRunText = 'A1XX EXECUTE RESTORE RUN';
  var runText = cellTextV20(payload.restoreExecutionRunText || '', 140);
  var finalReceipt = parseMasterConfigJsonParamV20(payload.finalPreExecutionPreflightReceiptJson || payload.finalPreExecutionPreflightReceipt, {});
  var portableMarkerGate = normalizeBooleanV20(payload.portableRestoreMarkerGate);
  var latestBackupStatus = getLatestDriveBackupStatusSnapshotV20();
  var latestBackup = latestBackupStatus.latest || {};
  var selectedRestoreSourceMarker = cellTextV20(
    payload.selectedRestoreSourceMarker || payload.confirmedRestoreSourceMarker || latestBackup.backupId || finalReceipt.selectedRestoreSourceMarker || finalReceipt.latestBackupMarker || '',
    160
  );
  var confirmedRestoreSourceMarker = cellTextV20(payload.confirmedRestoreSourceMarker || selectedRestoreSourceMarker, 160);
  var selectedRestoreSourceRow = cellTextV20(
    payload.selectedRestoreSourceRow || latestBackup.matchedRow || finalReceipt.selectedRestoreSourceRow || finalReceipt.latestBackupRow || '',
    80
  );
  var latestBackupMarker = cellTextV20(payload.latestBackupMarker || latestBackup.backupId || selectedRestoreSourceMarker || '', 160);
  var latestBackupRow = cellTextV20(payload.latestBackupRow || latestBackup.matchedRow || selectedRestoreSourceRow || '', 80);
  var cleanWorkbookId = cellTextV20(payload.cleanWorkbookId || finalReceipt.cleanWorkbookId || '', 220);
  var backupFolderId = cellTextV20(payload.backupFolderId || finalReceipt.backupFolderId || '', 220);
  var targetDeviceLabel = cellTextV20(payload.targetDeviceLabel || finalReceipt.targetDeviceLabel || 'second device', 120);
  var actualBackupFolderId = '';
  try {
    actualBackupFolderId = getBackupFolderV18().getId();
  } catch (folderErr) {}
  var phase8ajReady = !!(
    finalReceipt &&
    finalReceipt.status === 'second_device_restore_execution_final_pre_execution_preflight_ready' &&
    finalReceipt.finalPreExecutionPreflightReady === true &&
    finalReceipt.restoreExecutionEnabled === false &&
    finalReceipt.bootstrapExecutionEnabled === false &&
    finalReceipt.restoreEndpointActive === false
  );
  var restoreSourceGateReady = !!(phase8ajReady || portableMarkerGate);
  var runConfirmed = !!(
    normalizeBooleanV20(payload.a1xxRestoreExecutionRunConfirmed) &&
    runText === expectedRunText
  );
  var sourceConfirmed = !!(
    normalizeBooleanV20(payload.selectedRestoreSourceConfirmed) &&
    selectedRestoreSourceMarker &&
    confirmedRestoreSourceMarker === selectedRestoreSourceMarker
  );
  var targetConfirmed = !!(
    normalizeBooleanV20(payload.restoreTargetPointersConfirmed) &&
    cleanWorkbookId &&
    backupFolderId
  );
  var deviceConfirmed = !!(
    normalizeBooleanV20(payload.secondDeviceIdentityConfirmed) &&
    targetDeviceLabel
  );
  var backupFolderMatches = !!(!actualBackupFolderId || !backupFolderId || actualBackupFolderId === backupFolderId);
  var backupRead = selectedRestoreSourceMarker ? getDriveBackupPayloadByMarkerV20(selectedRestoreSourceMarker) : { ok: false, error: 'missing_marker' };
  var backupPayload = {};
  var parseError = '';
  if (backupRead.ok) {
    try {
      backupPayload = JSON.parse(String(backupRead.payload || '{}')) || {};
    } catch (err) {
      parseError = err.toString();
    }
  }
  if (!cleanWorkbookId) cleanWorkbookId = extractCleanWorkbookIdFromBackupPayloadV20(backupPayload);
  targetConfirmed = !!(
    normalizeBooleanV20(payload.restoreTargetPointersConfirmed) &&
    cleanWorkbookId &&
    backupFolderId
  );
  var protectedKeys = getSecondDeviceRestoreProtectedStorageKeysV20();
  var restorePayload = {};
  var protectedSkipped = [];
  var backupKeys = Object.keys(backupPayload || {}).filter(function(key) {
    return (key !== '__mmos_backup_verification_v22' && key.indexOf('a1xx_') === 0) || key === 'mmos_webhook_token_v1';
  });
  backupKeys.forEach(function(key) {
    if (protectedKeys[key] || /token|secret|password|pin|oauth|webhook|todoist|notion|ig_token|sheets_url|sheets_config/i.test(key)) protectedSkipped.push(key);
    else restorePayload[key] = String(backupPayload[key] || '');
  });
  var restoreKeys = Object.keys(restorePayload);
  var unsafe = detectUnsafeMasterConfigReadSkeletonInputV20({
    sourceBuild: payload.sourceBuild || '',
    selectedRestoreSourceMarker: selectedRestoreSourceMarker,
    targetDeviceLabel: targetDeviceLabel
  });
  var missingGateItems = [];
  if (!restoreSourceGateReady) missingGateItems.push('Phase 8AJ final preflight or exact portable restore marker gate');
  if (!runConfirmed) missingGateItems.push('A1XX restore execution run text');
  if (!sourceConfirmed) missingGateItems.push('selected restore source confirmation');
  if (!targetConfirmed) missingGateItems.push('restore target pointer confirmation');
  if (!deviceConfirmed) missingGateItems.push('second-device identity confirmation');
  if (!selectedRestoreSourceMarker) missingGateItems.push('selectedRestoreSourceMarker');
  if (!latestBackupMarker) missingGateItems.push('latestBackupMarker');
  if (!cleanWorkbookId) missingGateItems.push('clean_workbook_id');
  if (!backupFolderId) missingGateItems.push('backup_folder_id');
  if (!backupFolderMatches) missingGateItems.push('backup_folder_id_match');
  if (!backupRead.ok) missingGateItems.push('backup payload: ' + (backupRead.error || 'read_failed'));
  if (parseError) missingGateItems.push('backup payload parse');
  if (!restoreKeys.length) missingGateItems.push('restore payload keys');
  var runReady = !!(
    restoreSourceGateReady &&
    runConfirmed &&
    sourceConfirmed &&
    targetConfirmed &&
    deviceConfirmed &&
    selectedRestoreSourceMarker &&
    cleanWorkbookId &&
    backupFolderId &&
    backupFolderMatches &&
    backupRead.ok &&
    !parseError &&
    restoreKeys.length &&
    missingGateItems.length === 0 &&
    unsafe.length === 0
  );
  return jsonResponseV20({
    status: runReady ? 'second_device_restore_execution_run_ready' : 'second_device_restore_execution_run_needs_review',
    ok: true,
    mode: 'second_device_restore_execution_run',
    build: OS_REGISTRY_SUMMARY_BUILD_V20,
    checkedAt: checkedAt,
    restoreExecutionRunEndpointActive: true,
    restoreExecutionRunReady: runReady,
    phase8ajFinalPreExecutionPreflightReady: phase8ajReady,
    portableRestoreMarkerGate: portableMarkerGate,
    a1xxRestoreExecutionRunConfirmed: runConfirmed,
    restoreExecutionRunText: runText,
    expectedRestoreExecutionRunText: expectedRunText,
    selectedRestoreSourceConfirmed: sourceConfirmed,
    restoreTargetPointersConfirmed: targetConfirmed,
    secondDeviceIdentityConfirmed: deviceConfirmed,
    backupVerified: !!(latestBackupMarker && backupRead.ok),
    latestBackupMarker: latestBackupMarker,
    latestBackupRow: latestBackupRow,
    selectedRestoreSourceMarker: selectedRestoreSourceMarker,
    selectedRestoreSourceRow: selectedRestoreSourceRow || backupRead.row || '',
    cleanWorkbookId: cleanWorkbookId,
    backupFolderId: backupFolderId,
    targetDeviceLabel: targetDeviceLabel,
    backupDriveFileId: backupRead.driveFileId || '',
    backupDriveUrl: backupRead.driveUrl || '',
    restorePayload: runReady ? restorePayload : {},
    restoreKeyCount: restoreKeys.length,
    protectedSkippedKeys: protectedSkipped,
    readExecuted: true,
    configReadExecuted: false,
    notionReadExecuted: false,
    writeExecuted: false,
    writesEnabled: false,
    loginAnywhereActive: false,
    secretExport: false,
    tokenExport: false,
    restoreEnabled: runReady,
    restoreExecutionEnabled: runReady,
    workerAuthEnabled: false,
    automationActivationEnabled: false,
    bootstrapExecutionEnabled: false,
    setupAutomationReady: false,
    restoreEndpointActive: runReady,
    restoreExecutionItems: [
      { key: 'phase8aj_final_preflight_or_portable_marker_gate', status: restoreSourceGateReady ? 'Ready' : 'Review', mode: phase8ajReady ? 'receipt_gate' : 'portable_marker_gate', label: 'Phase 8AJ receipt or exact portable restore marker gate is present', value: phase8ajReady ? (finalReceipt.status || '') : selectedRestoreSourceMarker },
      { key: 'restore_execution_run_text', status: runConfirmed ? 'Confirmed' : 'Review', mode: 'execution_gate', label: 'A1XX restore execution run text is captured', value: runText },
      { key: 'selected_restore_source_marker', status: sourceConfirmed ? 'Ready' : 'Review', mode: 'exact_marker_gate', label: 'Selected restore source marker is confirmed for this run', value: selectedRestoreSourceMarker },
      { key: 'backup_payload_read', status: backupRead.ok ? 'Ready' : 'Review', mode: 'drive_read', label: 'Selected Drive backup payload is readable', value: backupRead.driveFileId || backupRead.error || '' },
      { key: 'protected_keys_filtered', status: 'Ready', mode: 'safety_boundary', label: 'Protected setup/token keys are filtered from the restore payload', value: String(protectedSkipped.length) },
      { key: 'restore_payload_ready', status: restoreKeys.length ? 'Ready' : 'Review', mode: 'execution_payload', label: 'Non-protected restore payload is ready for browser restore', value: String(restoreKeys.length) },
      { key: 'protected_actions_locked', status: 'Blocked', mode: 'safety_boundary', label: 'Login-anywhere, auth sync, token export, secret export, worker auth, automations, and bootstrap execution remain blocked' }
    ],
    missingGateItems: missingGateItems,
    unsafeFields: unsafe,
    nextAllowedStepAfterRestoreExecutionRun: runReady
      ? 'second_device_restore_execution_readback_verification'
      : 'second_device_restore_execution_run_repair',
    blockedActions: [
      'live master config write',
      'login-anywhere activation',
      'auth sync write',
      'token export',
      'secret export',
      'worker auth',
      'automation activation',
      'second-device bootstrap execution'
    ],
    message: runReady
      ? 'Second-device restore execution run package is ready. Browser restore may execute only the filtered non-protected keys.'
      : 'Second-device restore execution run needs review. No restore payload should be applied.'
  });
}

function sanitizeDriveFileIndexPointerPreviewV20(input) {
  var payload = input && input.pointer ? input.pointer : input || {};
  return {
    title: cellTextV20(payload.title || payload.name || '', 180),
    objectType: normalizeDriveFileIndexObjectTypeV20(payload.objectType || payload.type || ''),
    driveFileId: cellTextV20(payload.driveFileId || payload.fileId || '', 160),
    driveUrl: cellTextV20(payload.driveUrl || payload.url || '', 500),
    folderPath: cellTextV20(payload.folderPath || payload.folder || '', 260),
    source: cellTextV20(payload.source || 'Money Mission OS', 140),
    summary: cellTextV20(payload.summary || '', 500),
    relatedContact: cellTextV20(payload.relatedContact || '', 160),
    relatedOffer: cellTextV20(payload.relatedOffer || '', 160),
    relatedCycle: cellTextV20(payload.relatedCycle || '', 160),
    relatedWorker: cellTextV20(payload.relatedWorker || '', 160),
    relatedSkill: cellTextV20(payload.relatedSkill || '', 160),
    confidence: normalizeDriveFileIndexConfidenceV20(payload.confidence || ''),
    status: normalizeDriveFileIndexPointerStatusV20(payload.status || ''),
    archiveState: normalizeDriveFileIndexArchiveStateV20(payload.archiveState || ''),
    lastVerified: cellTextV20(payload.lastVerified || payload.lastVerifiedAt || '', 80)
  };
}

function getDriveFileIndexPointerMissingFieldsV20(preview) {
  var required = ['title', 'objectType', 'driveFileId', 'driveUrl', 'folderPath', 'source', 'status', 'archiveState'];
  var missing = [];
  for (var i = 0; i < required.length; i++) {
    var key = required[i];
    if (!preview[key]) missing.push(key);
  }
  return missing;
}

function normalizeDriveFileIndexObjectTypeV20(value) {
  var text = cellTextV20(value, 80).toLowerCase().replace(/\s+/g, '_');
  if (text === 'folder' || text === 'folder_pointer') return 'folder_pointer';
  if (text === 'file' || text === 'file_pointer') return 'file_pointer';
  if (text === 'backup' || text === 'backup_pointer') return 'backup_pointer';
  if (text === 'memory' || text === 'memory_pointer') return 'memory_pointer';
  return text ? cellTextV20(text, 80) : '';
}

function normalizeDriveFileIndexPointerStatusV20(value) {
  var text = cellTextV20(value || 'Verified', 80).toLowerCase();
  if (text === 'verified') return 'Verified';
  if (text === 'planned') return 'Planned';
  if (text === 'review' || text === 'needs review') return 'Needs Review';
  if (text === 'archived') return 'Archived';
  return cellTextV20(value || 'Verified', 80);
}

function normalizeDriveFileIndexArchiveStateV20(value) {
  var text = cellTextV20(value || 'Active', 80).toLowerCase();
  if (text === 'active') return 'Active';
  if (text === 'do not delete' || text === 'do_not_delete') return 'Do Not Delete';
  if (text === 'superseded') return 'Superseded';
  if (text === 'archived') return 'Archived';
  return cellTextV20(value || 'Active', 80);
}

function normalizeDriveFileIndexConfidenceV20(value) {
  var text = cellTextV20(value || 'High', 80).toLowerCase();
  if (text === 'high') return 'High';
  if (text === 'medium') return 'Medium';
  if (text === 'low') return 'Low';
  if (text === 'unverified') return 'Unverified';
  return cellTextV20(value || 'High', 80);
}

function detectUnsafeDriveFileIndexPointerPayloadV20(input) {
  var unsafe = [];
  var deny = /(token|secret|password|credential|oauth|bearer|api[_ -]?key|webhook|notion_secret|todoist|private[_ -]?key)/i;
  function scan(value, path) {
    if (unsafe.length >= 12) return;
    if (deny.test(String(path || ''))) {
      unsafe.push(cellTextV20(path, 120));
      return;
    }
    if (value === null || value === undefined) return;
    if (typeof value === 'object') {
      for (var key in value) {
        if (Object.prototype.hasOwnProperty.call(value, key)) scan(value[key], path ? path + '.' + key : key);
      }
      return;
    }
    var text = String(value);
    if (deny.test(text) || text.length > 1200) unsafe.push(cellTextV20(path || 'value', 120));
  }
  scan(input || {}, '');
  return unsafe;
}

function getDisallowedDriveFileIndexPointerFieldsV20(pointer) {
  var allowed = {
    title: 1,
    name: 1,
    objectType: 1,
    type: 1,
    driveFileId: 1,
    fileId: 1,
    driveUrl: 1,
    url: 1,
    folderPath: 1,
    folder: 1,
    source: 1,
    summary: 1,
    relatedContact: 1,
    relatedOffer: 1,
    relatedCycle: 1,
    relatedWorker: 1,
    relatedSkill: 1,
    confidence: 1,
    status: 1,
    archiveState: 1,
    lastVerified: 1,
    lastVerifiedAt: 1
  };
  var disallowed = [];
  pointer = pointer || {};
  for (var key in pointer) {
    if (Object.prototype.hasOwnProperty.call(pointer, key) && !allowed[key]) {
      disallowed.push('pointer.' + cellTextV20(key, 80));
    }
  }
  return disallowed;
}

function isAllowedDriveFileIndexUrlV20(url) {
  var text = cellTextV20(url || '', 500);
  if (!/^https:\/\/(drive|docs)\.google\.com\//i.test(text)) return false;
  if (/preview-only/i.test(text)) return false;
  return true;
}

function isPreviewOnlyDriveFileIndexPointerV20(preview) {
  return /^preview[_-]?only$/i.test(cellTextV20(preview.driveFileId || '', 80))
    || /preview-only/i.test(cellTextV20(preview.driveUrl || '', 500));
}

function normalizeDriveFileIndexNotionStatusV20(value) {
  var text = cellTextV20(value || 'Verified', 80);
  if (text === 'Needs Review') return 'Review';
  if (text === 'Planned') return 'Needs Verification';
  return normalizeDriveFileIndexPointerStatusV20(text);
}

function normalizeDriveFileIndexSourceSystemV20(value) {
  var text = cellTextV20(value || '', 160).toLowerCase();
  if (text.indexOf('google drive') >= 0) return 'Google Drive';
  if (text.indexOf('apps script') >= 0) return 'Apps Script';
  if (text.indexOf('notion') >= 0) return 'Notion';
  if (text.indexOf('sheet') >= 0) return 'Google Sheets';
  if (text.indexOf('worker') >= 0) return 'Worker';
  if (text.indexOf('manual') >= 0) return 'Manual';
  return 'Money Mission OS';
}

function normalizeDriveFileIndexMimeTypeV20(objectType) {
  var type = cellTextV20(objectType || '', 80);
  if (type === 'folder_pointer') return 'folder';
  if (type === 'backup_pointer' || type === 'backup_payload' || type === 'backup_probe') return 'json';
  if (type === 'memory_pointer' || type === 'memory_file' || type === 'vault_index') return 'markdown';
  if (type === 'call_note' || type === 'notebook_note') return 'doc';
  if (type === 'script_file') return 'other';
  return 'other';
}

function normalizeDriveFileIndexLastVerifiedV20(value) {
  var text = cellTextV20(value || '', 80);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  if (/^\d{4}-\d{2}-\d{2}T/.test(text)) return text.slice(0, 10);
  return new Date().toISOString().slice(0, 10);
}

function getLatestDriveBackupStatusSnapshotV20() {
  var folder = getBackupFolderV18();
  var ss = getMoneyMissionSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_BACKUP);
  var latest = null;
  if (sheet && sheet.getLastRow() >= 2) {
    var lastRow = sheet.getLastRow();
    var start = Math.max(2, lastRow - 249);
    var values = sheet.getRange(start, 1, lastRow - start + 1, Math.min(sheet.getLastColumn(), 10)).getValues();
    for (var i = values.length - 1; i >= 0; i--) {
      var row = values[i];
      if (!isDriveBackupIndexRowV18(row)) continue;
      if (String(row[8] || '') === 'probe') continue;
      latest = {
        savedAt: row[0],
        keyCount: row[1],
        size: row[2],
        backupId: row[4],
        driveFileId: row[5],
        driveUrl: row[6],
        build: row[7],
        indexStatus: row[8],
        matchedRow: start + i
      };
      break;
    }
  }
  return {
    status: 'ok',
    storage: 'drive',
    driveBackupActive: true,
    folderId: folder.getId(),
    folderName: folder.getName(),
    latest: latest
  };
}

function buildDriveFileIndexPointerPropertiesV20(preview, context) {
  context = context || {};
  var notes = [
    'Phase 7G confirmed pointer write.',
    'Source: ' + (preview.source || 'Money Mission OS') + '.',
    preview.summary ? 'Summary: ' + preview.summary : '',
    context.backupId ? 'Backup before write: ' + context.backupId + '.' : '',
    context.sourceBuild ? 'Source build: ' + context.sourceBuild + '.' : ''
  ].filter(Boolean).join(' ');
  var properties = {
    'File Name': notionTitle(preview.title),
    'Object Type': { select: { name: preview.objectType } },
    'Drive File ID': notionText(preview.driveFileId),
    'Drive URL': { url: preview.driveUrl },
    'Folder Path': notionText(preview.folderPath),
    'Source System': { select: { name: normalizeDriveFileIndexSourceSystemV20(preview.source) } },
    'Status': { select: { name: normalizeDriveFileIndexNotionStatusV20(preview.status) } },
    'Archive State': { select: { name: normalizeDriveFileIndexArchiveStateV20(preview.archiveState) } },
    'Last Verified': { date: { start: normalizeDriveFileIndexLastVerifiedV20(preview.lastVerified) } },
    'MIME Type': { select: { name: normalizeDriveFileIndexMimeTypeV20(preview.objectType) } },
    'Pointer Version': notionText('phase7g-v1'),
    'Related Contact': notionText(preview.relatedContact || ''),
    'Related Offer': notionText(preview.relatedOffer || ''),
    'Related Cycle': notionText(preview.relatedCycle || ''),
    'Related Worker': notionText(preview.relatedWorker || ''),
    'Related Skill': notionText(preview.relatedSkill || ''),
    'Related Module': notionText('Phase 7G pointer write endpoint'),
    'Verification Notes': notionText(notes)
  };
  return properties;
}

function queryDriveFileIndexPointerPageV20(preview) {
  var config = findOsRegistrySummaryConfigV20('driveFileIndex');
  if (!config) return { ok: false, code: 'missing_config', error: 'Drive File Index config missing.' };
  var driveFileId = cellTextV20(preview.driveFileId || '', 160);
  var title = cellTextV20(preview.title || '', 180);
  if (!driveFileId && !title) return { ok: false, code: 'missing_lookup', error: 'Missing title or Drive file ID.' };
  var payload = {
    page_size: 1,
    filter: driveFileId
      ? { property: 'Drive File ID', rich_text: { equals: driveFileId } }
      : { property: 'File Name', title: { equals: title } }
  };
  var result = notionQuery(config.databaseId, payload);
  if (result.code >= 400) return { ok: false, code: result.code, error: cellTextV20(result.text || '', 500) };
  var parsed = JSON.parse(result.text || '{}');
  var page = parsed.results && parsed.results.length ? parsed.results[0] : null;
  return { ok: true, page: page, hasMore: parsed.has_more === true };
}

function compactDriveFileIndexPointerReadbackV20(page, preview) {
  if (!page) return null;
  var compact = compactNotionRegistryPageV20(page);
  var props = page.properties || {};
  compact.driveFileId = readNotionAnyPropertyV20(props['Drive File ID']);
  compact.driveUrl = readNotionAnyPropertyV20(props['Drive URL']);
  compact.folderPath = readNotionAnyPropertyV20(props['Folder Path']);
  compact.archiveState = readNotionAnyPropertyV20(props['Archive State']);
  compact.lastVerified = readNotionAnyPropertyV20(props['Last Verified']);
  compact.verified = !!(
    compact.title === preview.title
    && compact.driveFileId === preview.driveFileId
    && compact.type === preview.objectType
    && compact.status === normalizeDriveFileIndexNotionStatusV20(preview.status)
  );
  return compact;
}

function getDriveFileIndexPointerReadbackV20(input) {
  var checkedAt = new Date().toISOString();
  var preview = sanitizeDriveFileIndexPointerPreviewV20(input || {});
  var query = queryDriveFileIndexPointerPageV20(preview);
  var readback = query.ok && query.page ? compactDriveFileIndexPointerReadbackV20(query.page, preview) : null;
  return jsonResponseV20({
    status: readback && readback.verified ? 'ok' : 'review',
    ok: !!(query.ok && readback),
    mode: 'readback_only',
    build: OS_REGISTRY_SUMMARY_BUILD_V20,
    checkedAt: checkedAt,
    targetRegistry: 'driveFileIndex',
    readback: readback,
    errorCode: query.ok ? '' : query.code,
    error: query.ok ? '' : cellTextV20(query.error || '', 300),
    safety: {
      notion: 'Readback query only. No Notion write.',
      sheets: 'No Sheet writes.',
      drive: 'No Drive writes, moves, renames, shares, or deletes.'
    }
  });
}

function validateDriveFileIndexPointerWriteGatesV20(data, preview) {
  var failures = [];
  if (cellTextV20(data.approvalState || '', 40).toLowerCase() !== 'approved') failures.push('approvalState');
  if (data.b3Confirmed !== true && data.b3Confirmed !== 'true') failures.push('b3Confirmed');
  if (!cellTextV20(data.b3ArmedAt || '', 80)) failures.push('b3ArmedAt');
  if (cellTextV20(data.writeScope || '', 80) !== 'one_pointer_only') failures.push('writeScope');
  if (cellTextV20(data.targetRegistry || '', 80) !== 'driveFileIndex') failures.push('targetRegistry');
  if (cellTextV20(data.sourceBuild || '', 180) !== OS_REGISTRY_SUMMARY_BUILD_V20) failures.push('sourceBuild');
  if (data.backupVerified !== true && data.backupVerified !== 'true') failures.push('backupVerified');
  if (cellTextV20(data.confirmationText || '', 80) !== 'B3 CONFIRM ONE POINTER') failures.push('confirmationText');
  if (isPreviewOnlyDriveFileIndexPointerV20(preview)) failures.push('realDrivePointer');
  if (!isAllowedDriveFileIndexUrlV20(preview.driveUrl)) failures.push('driveUrl');
  return failures;
}

function writeDriveFileIndexPointerConfirmedV20(data) {
  var checkedAt = new Date().toISOString();
  var config = findOsRegistrySummaryConfigV20('driveFileIndex');
  var pointer = data && data.pointer ? data.pointer : {};
  var preview = sanitizeDriveFileIndexPointerPreviewV20(pointer);
  var missing = getDriveFileIndexPointerMissingFieldsV20(preview);
  var unsafe = detectUnsafeDriveFileIndexPointerPayloadV20(pointer).concat(getDisallowedDriveFileIndexPointerFieldsV20(pointer));
  var gateFailures = validateDriveFileIndexPointerWriteGatesV20(data || {}, preview);
  var backupSnapshot = getLatestDriveBackupStatusSnapshotV20();
  var latestBackup = backupSnapshot.latest || {};
  if (!latestBackup.backupId || !latestBackup.driveFileId) gateFailures.push('latestBackup');
  if (data && data.latestBackupId && latestBackup.backupId && String(data.latestBackupId) !== String(latestBackup.backupId)) gateFailures.push('latestBackupId');

  if (!config || missing.length || unsafe.length || gateFailures.length) {
    return jsonResponseV20({
      status: unsafe.length ? 'review' : 'blocked',
      ok: false,
      mode: 'confirmed_single_pointer_write',
      build: OS_REGISTRY_SUMMARY_BUILD_V20,
      checkedAt: checkedAt,
      targetRegistry: config ? config.key : 'driveFileIndex',
      preview: preview,
      missingFields: missing,
      unsafeFields: unsafe,
      gateFailures: gateFailures,
      writeExecuted: false,
      message: 'Pointer write blocked. Fix the listed gate, missing, or unsafe fields first.',
      safety: {
        notion: 'No Notion write executed.',
        sheets: 'No Sheet writes.',
        drive: 'No Drive writes, moves, renames, shares, or deletes.'
      }
    });
  }

  var existingQuery = queryDriveFileIndexPointerPageV20(preview);
  if (!existingQuery.ok) {
    return jsonResponseV20({
      status: 'review',
      ok: false,
      mode: 'confirmed_single_pointer_write',
      build: OS_REGISTRY_SUMMARY_BUILD_V20,
      checkedAt: checkedAt,
      targetRegistry: config.key,
      writeExecuted: false,
      stage: 'query_existing',
      errorCode: existingQuery.code,
      error: cellTextV20(existingQuery.error || '', 300)
    });
  }

  var properties = buildDriveFileIndexPointerPropertiesV20(preview, {
    backupId: latestBackup.backupId,
    sourceBuild: data.sourceBuild || OS_REGISTRY_SUMMARY_BUILD_V20
  });
  var existing = existingQuery.page || null;
  var result = existing
    ? notionRequest('patch', 'https://api.notion.com/v1/pages/' + existing.id, { properties: properties })
    : notionRequest('post', 'https://api.notion.com/v1/pages', { parent: { database_id: config.databaseId }, properties: properties });

  if (result.code >= 400) {
    logActivity('Drive File Index pointer write ERROR — code: ' + result.code + ' — ' + cellTextV20(result.text || '', 500));
    return jsonResponseV20({
      status: 'review',
      ok: false,
      mode: 'confirmed_single_pointer_write',
      build: OS_REGISTRY_SUMMARY_BUILD_V20,
      checkedAt: checkedAt,
      targetRegistry: config.key,
      writeExecuted: false,
      stage: existing ? 'update' : 'create',
      errorCode: result.code,
      error: cellTextV20(result.text || '', 500),
      message: 'Notion rejected the pointer write. No retry was attempted.'
    });
  }

  var readbackQuery = queryDriveFileIndexPointerPageV20(preview);
  var readback = readbackQuery.ok && readbackQuery.page ? compactDriveFileIndexPointerReadbackV20(readbackQuery.page, preview) : null;
  var verified = !!(readback && readback.verified);
  logActivity('Drive File Index pointer write — ' + (existing ? 'updated' : 'created') + ' — ' + preview.title + ' — verified: ' + verified);

  return jsonResponseV20({
    status: verified ? 'ok' : 'review',
    ok: true,
    mode: 'confirmed_single_pointer_write',
    build: OS_REGISTRY_SUMMARY_BUILD_V20,
    checkedAt: checkedAt,
    targetRegistry: config.key,
    writeExecuted: true,
    writeAction: existing ? 'update' : 'create',
    pageId: readback ? readback.id : '',
    pageUrl: readback ? readback.url : '',
    backup: {
      backupId: latestBackup.backupId,
      driveFileId: latestBackup.driveFileId,
      matchedRow: latestBackup.matchedRow
    },
    readback: readback,
    readbackVerified: verified,
    message: verified
      ? 'One Drive File Index pointer was written and read back cleanly.'
      : 'Pointer write returned, but readback needs review. Do not retry without A1XX approval.',
    safety: {
      notion: 'One Drive File Index page create/update only.',
      sheets: 'No Sheet writes.',
      drive: 'No Drive writes, moves, renames, shares, or deletes.',
      workers: 'No worker or automation path triggered.'
    }
  });
}

function getOsRegistrySummaryV20(e) {
  var checkedAt = new Date().toISOString();
  var warnings = [];
  var registries = {};
  var configs = getOsRegistrySummaryConfigsV20();
  var maxPages = Math.max(1, Math.min(3, Number(e && e.parameter && e.parameter.maxPages) || 1));

  for (var i = 0; i < configs.length; i++) {
    var config = configs[i];
    var read = readNotionRegistrySummaryV20(config.databaseId, maxPages);
    var status = read.ok ? 'readable' : 'review';
    if (!read.ok) warnings.push(config.label + ': ' + (read.error || ('Notion ' + read.code)));
    registries[config.key] = {
      key: config.key,
      label: config.label,
      status: status,
      role: config.role,
      databaseId: config.databaseId,
      dataSourceId: config.dataSourceId,
      url: config.url,
      recordCount: read.count || 0,
      countCapped: read.capped === true,
      lastEditedAt: read.lastEditedAt || '',
      counts: read.counts || {},
      errorCode: read.ok ? '' : (read.code || ''),
      error: read.ok ? '' : cellTextV20(read.error || '', 220)
    };
  }

  return jsonResponseV20({
    status: warnings.length ? 'review' : 'ok',
    ok: true,
    mode: 'read_only',
    build: OS_REGISTRY_SUMMARY_BUILD_V20,
    checkedAt: checkedAt,
    maxPages: maxPages,
    registryCount: configs.length,
    readableCount: configs.length - warnings.length,
    warnings: warnings,
    registries: registries,
    safety: {
      sheets: 'No Sheet writes. Sheets remain small index and receipt rows only.',
      drive: 'No Drive writes, moves, renames, or deletes.',
      notion: 'No Notion writes. Registry databases are queried for compact counts only.',
      secrets: 'No secrets or protected local setup values returned.'
    },
    blockedActions: [
      'delete',
      'move',
      'rename',
      'share',
      'mass_edit',
      'activate_automation',
      'overwrite_protected_setup',
      'store_large_payload_in_sheets'
    ]
  });
}

function getOsRegistryRecordsV20(e) {
  var registryKey = cellTextV20(e && e.parameter ? e.parameter.registry : '', 120);
  var config = findOsRegistrySummaryConfigV20(registryKey);
  if (!config) {
    return jsonResponseV20({
      status: 'error',
      ok: false,
      mode: 'read_only',
      error: 'Unknown or unsupported registry key.',
      allowedRegistries: getOsRegistrySummaryConfigsV20().map(function(item) { return item.key; })
    });
  }

  var limit = Math.max(1, Math.min(50, Number(e && e.parameter && e.parameter.limit) || 12));
  var read = readNotionRegistryRecordsV20(config.databaseId, limit);
  return jsonResponseV20({
    status: read.ok ? 'ok' : 'review',
    ok: read.ok === true,
    mode: 'read_only',
    build: OS_REGISTRY_SUMMARY_BUILD_V20,
    checkedAt: new Date().toISOString(),
    registry: {
      key: config.key,
      label: config.label,
      role: config.role,
      databaseId: config.databaseId,
      dataSourceId: config.dataSourceId,
      url: config.url
    },
    limit: limit,
    rows: read.rows || [],
    rowCount: read.rows ? read.rows.length : 0,
    hasMore: read.hasMore === true,
    errorCode: read.ok ? '' : (read.code || ''),
    error: read.ok ? '' : cellTextV20(read.error || '', 500),
    safety: {
      notion: 'Read-only registry row query. No Notion writes.',
      sheets: 'No Sheet writes.',
      drive: 'No Drive writes, moves, renames, or deletes.',
      secrets: 'No secrets or protected local setup values returned.'
    }
  });
}

function readNotionRegistrySummaryV20(databaseId, maxPages) {
  try {
    var secret = PropertiesService.getScriptProperties().getProperty('NOTION_SECRET');
    if (!secret) return { ok: false, code: 'missing_secret', error: 'NOTION_SECRET not set.' };

    var count = 0;
    var pageCount = 0;
    var hasMore = true;
    var nextCursor = '';
    var lastEditedAt = '';
    var counts = {
      status: {},
      approvalState: {},
      testStatus: {},
      promotionStatus: {},
      contextWeight: {},
      sourceType: {},
      objectType: {},
      pointerType: {}
    };

    while (hasMore && pageCount < maxPages) {
      var payload = { page_size: 100 };
      if (nextCursor) payload.start_cursor = nextCursor;
      var result = notionQuery(databaseId, payload);
      if (result.code >= 400) {
        return { ok: false, code: result.code, error: cellTextV20(result.text || '', 500) };
      }

      var parsed = JSON.parse(result.text || '{}');
      var rows = parsed.results || [];
      count += rows.length;
      pageCount++;

      for (var i = 0; i < rows.length; i++) {
        var page = rows[i] || {};
        var props = page.properties || {};
        if (page.last_edited_time && (!lastEditedAt || page.last_edited_time > lastEditedAt)) {
          lastEditedAt = page.last_edited_time;
        }
        bumpRegistryCountV20(counts.status, readNotionStatusNameV20(props.Status));
        bumpRegistryCountV20(counts.approvalState, readNotionStatusNameV20(props['Approval State']));
        bumpRegistryCountV20(counts.testStatus, readNotionStatusNameV20(props['Test Status']));
        bumpRegistryCountV20(counts.promotionStatus, readNotionStatusNameV20(props['Promotion Status']));
        bumpRegistryCountV20(counts.contextWeight, readNotionStatusNameV20(props['Context Weight']));
        bumpRegistryCountV20(counts.sourceType, readNotionStatusNameV20(props['Source Type']));
        bumpRegistryCountV20(counts.objectType, readNotionStatusNameV20(props['Object Type']));
        bumpRegistryCountV20(counts.pointerType, readNotionStatusNameV20(props['Pointer Type']));
      }

      hasMore = parsed.has_more === true;
      nextCursor = parsed.next_cursor || '';
    }

    return {
      ok: true,
      count: count,
      capped: hasMore === true,
      lastEditedAt: lastEditedAt,
      counts: pruneEmptyRegistryCountsV20(counts)
    };
  } catch (err) {
    return { ok: false, code: 'exception', error: err.toString() };
  }
}

function readNotionRegistryRecordsV20(databaseId, limit) {
  try {
    var secret = PropertiesService.getScriptProperties().getProperty('NOTION_SECRET');
    if (!secret) return { ok: false, code: 'missing_secret', error: 'NOTION_SECRET not set.' };
    var result = notionQuery(databaseId, { page_size: limit });
    if (result.code >= 400) return { ok: false, code: result.code, error: cellTextV20(result.text || '', 500) };
    var parsed = JSON.parse(result.text || '{}');
    var rows = (parsed.results || []).map(function(page) {
      return compactNotionRegistryPageV20(page);
    });
    return { ok: true, rows: rows, hasMore: parsed.has_more === true };
  } catch (err) {
    return { ok: false, code: 'exception', error: err.toString() };
  }
}

function compactNotionRegistryPageV20(page) {
  page = page || {};
  var props = page.properties || {};
  var fields = {};
  [
    'Status',
    'Object Type',
    'Source Type',
    'Pointer Type',
    'Approval State',
    'Test Status',
    'Promotion Status',
    'Context Weight',
    'Confidence',
    'Archive State',
    'Last Verified',
    'Approval Needed',
    'Owner'
  ].forEach(function(name) {
    if (props[name]) fields[name] = readNotionAnyPropertyV20(props[name]);
  });
  return {
    id: page.id || '',
    title: readNotionRegistryTitleV20(props) || 'Untitled registry item',
    url: page.url || '',
    status: fields.Status || '',
    type: fields['Object Type'] || fields['Source Type'] || fields['Pointer Type'] || '',
    summary: readNotionRegistrySummaryTextV20(props),
    fields: fields,
    createdTime: page.created_time || '',
    lastEditedAt: page.last_edited_time || ''
  };
}

function readNotionRegistryTitleV20(props) {
  props = props || {};
  for (var key in props) {
    if (props.hasOwnProperty(key) && props[key] && props[key].type === 'title') {
      return readNotionTitle(props[key]);
    }
  }
  return '';
}

function readNotionRegistrySummaryTextV20(props) {
  props = props || {};
  var candidates = [
    'Summary',
    'Description',
    'Recommendation',
    'Action Required',
    'Trust Language',
    'Purpose',
    'Notes'
  ];
  for (var i = 0; i < candidates.length; i++) {
    var value = readNotionAnyPropertyV20(props[candidates[i]]);
    if (value) return cellTextV20(value, 500);
  }
  return '';
}

function readNotionAnyPropertyV20(prop) {
  if (!prop) return '';
  if (prop.status && prop.status.name) return prop.status.name;
  if (prop.select && prop.select.name) return prop.select.name;
  if (prop.multi_select && prop.multi_select.length) {
    return prop.multi_select.map(function(item) { return item.name || ''; }).filter(Boolean).join(', ');
  }
  if (prop.title && prop.title.length) return readNotionTitle(prop);
  if (prop.rich_text && prop.rich_text.length) return readNotionText(prop);
  if (prop.checkbox === true) return 'true';
  if (prop.checkbox === false) return 'false';
  if (prop.date && prop.date.start) return prop.date.start;
  if (typeof prop.number === 'number') return String(prop.number);
  if (prop.url) return prop.url;
  if (prop.email) return prop.email;
  if (prop.phone_number) return prop.phone_number;
  if (prop.relation && prop.relation.length) return prop.relation.length + ' relation(s)';
  if (prop.people && prop.people.length) return prop.people.map(function(item) { return item.name || ''; }).filter(Boolean).join(', ');
  if (prop.files && prop.files.length) return prop.files.length + ' file(s)';
  return '';
}

function readNotionStatusNameV20(prop) {
  if (!prop) return '';
  if (prop.status && prop.status.name) return prop.status.name;
  if (prop.select && prop.select.name) return prop.select.name;
  if (prop.multi_select && prop.multi_select.length) {
    return prop.multi_select.map(function(item) { return item.name || ''; }).filter(Boolean).join(', ');
  }
  if (prop.checkbox === true) return 'true';
  if (prop.checkbox === false) return 'false';
  var text = readNotionText(prop);
  return text || '';
}

function bumpRegistryCountV20(bucket, value) {
  var key = cellTextV20(value || '', 120);
  if (!key) return;
  bucket[key] = (bucket[key] || 0) + 1;
}

function pruneEmptyRegistryCountsV20(counts) {
  var clean = {};
  for (var key in counts) {
    if (!counts.hasOwnProperty(key)) continue;
    var bucket = counts[key] || {};
    var hasValue = false;
    for (var item in bucket) {
      if (bucket.hasOwnProperty(item)) {
        hasValue = true;
        break;
      }
    }
    if (hasValue) clean[key] = bucket;
  }
  return clean;
}

function ensureSheetHeaders(sheet, headers) {
  if (sheet.getMaxColumns() < headers.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), headers.length - sheet.getMaxColumns());
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  } else {
    var firstCell = String(sheet.getRange(1, 1).getValue() || '');
    if (firstCell !== headers[0]) {
      sheet.insertRowBefore(1);
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
  }
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#1a2910').setFontColor('#7ec845');
  sheet.setFrozenRows(1);
}

function archiveCycle(d) {
  var ss = getMoneyMissionSpreadsheet();
  var sheet = getOrCreateSheet(ss, SHEET_ARCHIVE, ARCHIVE_HEADERS);
  var archivedAt = new Date().toISOString();
  var row = [
    archivedAt,
    d.cycleNum || '', d.cycleName || '', d.cycleDates || '', d.cycleTarget || 0,
    d.daysElapsed || 0, d.revenue || 0, d.totalExpenses || 0, d.netProfit || 0, d.margin || 0,
    d.roas || 0, d.dailyPace || 0, d.sessions || 0, d.cumDms || 0, d.cumPosts || 0,
    d.studioCommission || 0, d.mixMaster || 0, d.rapreneurOS || 0,
    d.productionDeals || 0, d.customBeats || 0, d.otherIncome || 0,
    d.noteWin || '', d.noteLesson || '',
    'Cycle ' + d.cycleNum + ' archived on ' + new Date().toLocaleDateString()
  ];
  sheet.appendRow(row);
  sheet.getRange(sheet.getLastRow(), 1, 1, ARCHIVE_HEADERS.length)
    .setFontWeight('bold')
    .setBackground('#0d1808')
    .setFontColor('#d9f8c6');
  return {
    archivedAt: archivedAt,
    cycleNum: d.cycleNum || '',
    cycleName: d.cycleName || '',
    startDate: d.cycleStart || '',
    endDate: d.cycleEnd || '',
    target: d.cycleTarget || 0,
    revenue: d.revenue || 0,
    netProfit: d.netProfit || 0,
    totalDms: d.cumDms || d.dmSent || 0,
    totalCalls: d.calls || 0,
    totalCloses: d.dmClose || d.closes || 0,
    totalContent: d.cumPosts || d.content || 0,
    cycleWin: d.noteWin || '',
    cycleLesson: d.noteLesson || ''
  };
}

function saveBackup(d) {
  var ss = getMoneyMissionSpreadsheet();
  var json = d.payload || '{}';
  var marker = d.backupMarker || null;
  if (marker && !extractBackupMarkerV18(json)) {
    try {
      var parsed = JSON.parse(String(json || '{}'));
      parsed.__mmos_backup_verification_v22 = marker;
      json = JSON.stringify(parsed);
    } catch (err) {}
  }
  var savedAt = d.savedAt || new Date().toISOString();
  var markerId = marker && marker.id ? String(marker.id) : ('backup_' + Date.now());
  var savedMarker = extractBackupMarkerV18(json) || marker || { id: markerId };
  var driveFile = writeBackupPayloadToDriveV18(json, markerId, savedAt, {
    build: d.build || '',
    keyCount: d.keyCount || 0,
    size: json.length,
    marker: savedMarker
  });
  var status = isBackupProbePayloadV18(json) ? 'probe' : 'drive_archived';
  var indexRow = '';
  var indexStatus = 'indexed';
  var indexError = '';
  try {
    var sheet = getBackupIndexSheetV18(ss);
    sheet.appendRow([
      savedAt,
      d.keyCount || 0,
      json.length,
      'DRIVE_BACKUP_INDEX',
      markerId,
      driveFile.id,
      driveFile.url,
      d.build || '',
      status,
      'Payload stored in Drive. Sheet row is index only.'
    ]);
    indexRow = sheet.getLastRow();
  } catch (err) {
    indexStatus = 'drive_only';
    indexError = err.toString();
  }
  if (savedMarker && savedMarker.id) logActivity('Drive backup marker saved — ' + savedMarker.id + ' — file ' + driveFile.id + ' — index row ' + (indexRow || 'not written'));
  return { marker: savedMarker, driveFileId: driveFile.id, driveUrl: driveFile.url, row: indexRow, indexStatus: indexStatus, indexError: indexError };
}

function getBackupIndexHeadersV18() {
  return ['Saved At', 'Key Count', 'Size (chars)', 'Data', 'Backup ID', 'Drive File ID', 'Drive URL', 'Build', 'Status', 'Notes'];
}

function getBackupIndexSheetV18(ss) {
  var headers = getBackupIndexHeadersV18();
  var sheet = getOrCreateSheet(ss, SHEET_BACKUP, headers);
  if (sheet.getMaxColumns() < headers.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), headers.length - sheet.getMaxColumns());
  }
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#1a2910').setFontColor('#7ec845');
  sheet.setFrozenRows(1);
  return sheet;
}

function getBackupFolderV18() {
  var props = PropertiesService.getScriptProperties();
  var folderId = String(props.getProperty('A1XX_BACKUP_FOLDER_ID') || '').trim();
  if (folderId) {
    try {
      return DriveApp.getFolderById(folderId);
    } catch (err) {
      props.deleteProperty('A1XX_BACKUP_FOLDER_ID');
    }
  }
  var name = 'Money Mission OS Backups';
  var folders = DriveApp.getFoldersByName(name);
  var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(name);
  props.setProperty('A1XX_BACKUP_FOLDER_ID', folder.getId());
  return folder;
}

function makeBackupFileNameV18(markerId, savedAt) {
  var stamp = String(savedAt || new Date().toISOString()).replace(/[^0-9A-Za-z_-]/g, '').slice(0, 32);
  var cleanMarker = String(markerId || ('backup_' + Date.now())).replace(/[^0-9A-Za-z_-]/g, '').slice(0, 120);
  return 'mmos-backup-' + cleanMarker + '-' + stamp + '.json';
}

function writeBackupPayloadToDriveV18(json, markerId, savedAt, meta) {
  var folder = getBackupFolderV18();
  var fileName = makeBackupFileNameV18(markerId, savedAt);
  var file = folder.createFile(fileName, String(json || '{}'), MimeType.PLAIN_TEXT);
  try {
    file.setDescription(JSON.stringify({
      markerId: markerId,
      savedAt: savedAt,
      build: meta && meta.build || '',
      keyCount: meta && meta.keyCount || 0,
      size: meta && meta.size || String(json || '').length
    }));
  } catch (err) {}
  return { id: file.getId(), url: file.getUrl(), name: fileName };
}

function parseBackupChunkV18(payload) {
  try {
    var parsed = JSON.parse(String(payload || '{}'));
    return parsed.__mmos_backup_chunk_v22 ? parsed : null;
  } catch (err) {
    return null;
  }
}

function isBackupProbePayloadV18(payload) {
  try {
    var parsed = JSON.parse(String(payload || '{}'));
    return parsed.__mmos_backup_probe_v22 === true;
  } catch (err) {
    return false;
  }
}

function saveBackupChunkV18(d) {
  var ss = getMoneyMissionSpreadsheet();
  var marker = d.backupMarker || null;
  var markerId = d.backupMarkerId || (marker && marker.id) || ('backup_' + Date.now());
  var part = Math.max(0, Number(d.part) || 0);
  var total = Math.max(1, Number(d.total) || 1);
  var savedAt = d.savedAt || new Date().toISOString();
  var envelope = {
    __mmos_backup_chunk_v22: {
      backupId: markerId,
      part: part,
      total: total,
      marker: marker || null,
      savedAt: savedAt,
      build: d.build || ''
    },
    data: String(d.chunk || '')
  };
  var driveFile = writeBackupPayloadToDriveV18(JSON.stringify(envelope), markerId + '_part_' + part, savedAt, {
    build: d.build || '',
    keyCount: d.keyCount || 0,
    size: d.size || String(d.chunk || '').length,
    marker: marker || null
  });
  var rowNumber = '';
  try {
    var sheet = getBackupIndexSheetV18(ss);
    sheet.appendRow([
      savedAt,
      d.keyCount || 0,
      d.size || String(d.chunk || '').length,
      'DRIVE_BACKUP_LEGACY_CHUNK',
      markerId,
      driveFile.id,
      driveFile.url,
      d.build || '',
      'legacy_chunk_archived',
      'Legacy chunk stored in Drive to prevent Sheet bloat. Update frontend to backup_save for full restore.'
    ]);
    rowNumber = sheet.getLastRow();
  } catch (err) {}
  if (part + 1 === total) logActivity('Backup marker saved — ' + markerId + ' — legacy chunks stored in Drive ending row ' + (rowNumber || 'not written'));
}

function extractBackupMarkerV18(payload) {
  try {
    var parsed = JSON.parse(String(payload || '{}'));
    if (parsed.__mmos_backup_chunk_v22) return parsed.__mmos_backup_chunk_v22.marker || null;
    return parsed.__mmos_backup_verification_v22 || null;
  } catch (err) {
    return null;
  }
}

function makeBackupResponseV18(row, rowNumber, marker, markerSearch, payloadOverride) {
  return {
    status: 'ok',
    markerSearch: markerSearch || '',
    matchedRow: rowNumber || '',
    marker: marker || null,
    backup: {
      savedAt: row[0],
      keyCount: row[1],
      size: row[2],
      payload: payloadOverride !== undefined ? payloadOverride : row[3]
    }
  };
}

function isDriveBackupIndexRowV18(row) {
  return String(row[3] || '').indexOf('DRIVE_BACKUP_') === 0 && String(row[5] || '');
}

function loadDriveBackupPayloadV18(fileId) {
  return DriveApp.getFileById(String(fileId || '')).getBlob().getDataAsString();
}

function makeDriveBackupResponseV18(row, rowNumber, markerSearch) {
  var payload = loadDriveBackupPayloadV18(row[5]);
  var marker = extractBackupMarkerV18(payload);
  return {
    status: 'ok',
    storage: 'drive',
    markerSearch: markerSearch || '',
    matchedRow: rowNumber || '',
    marker: marker || null,
    backup: {
      savedAt: row[0],
      keyCount: row[1],
      size: row[2],
      payload: payload,
      backupId: row[4] || '',
      driveFileId: row[5] || '',
      driveUrl: row[6] || '',
      build: row[7] || '',
      indexStatus: row[8] || ''
    }
  };
}

function reconstructBackupFromRowsV18(values, start, backupId) {
  var chunks = [];
  var lastRow = 0;
  var sample = null;
  for (var i = 0; i < values.length; i++) {
    var parsed = parseBackupChunkV18(values[i][3]);
    if (!parsed) continue;
    var meta = parsed.__mmos_backup_chunk_v22 || {};
    if (String(meta.backupId || '') !== String(backupId || '')) continue;
    chunks.push({ part: Number(meta.part) || 0, data: String(parsed.data || '') });
    lastRow = start + i;
    sample = { row: values[i], marker: meta.marker || null };
  }
  if (!sample || !chunks.length) return null;
  chunks.sort(function(a, b) { return a.part - b.part; });
  return makeBackupResponseV18(sample.row, lastRow, sample.marker, 'matched_chunked', chunks.map(function(item) { return item.data; }).join(''));
}

function makeLatestBackupResponseV18(sheet) {
  var lastRow = sheet.getLastRow();
  var scanStart = Math.max(2, lastRow - 249);
  var values = sheet.getRange(scanStart, 1, lastRow - scanStart + 1, Math.min(sheet.getLastColumn(), 10)).getValues();
  for (var i = values.length - 1; i >= 0; i--) {
    var latest = values[i];
    if (isDriveBackupIndexRowV18(latest)) {
      if (String(latest[8] || '') === 'probe') continue;
      try {
        return makeDriveBackupResponseV18(latest, scanStart + i, 'latest_drive');
      } catch (err) {
        continue;
      }
    }
    if (isBackupProbePayloadV18(latest[3])) continue;
    var chunk = parseBackupChunkV18(latest[3]);
    if (chunk && chunk.__mmos_backup_chunk_v22) {
      var rebuilt = reconstructBackupFromRowsV18(values, scanStart, chunk.__mmos_backup_chunk_v22.backupId);
      if (rebuilt) return rebuilt;
    }
    return makeBackupResponseV18(latest, scanStart + i, extractBackupMarkerV18(latest[3]), 'latest');
  }
  var fallback = values[values.length - 1];
  return makeBackupResponseV18(fallback, lastRow, extractBackupMarkerV18(fallback[3]), 'latest_probe_only');
}

function getBackup(e) {
  var ss = getMoneyMissionSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_BACKUP);
  if (!sheet || sheet.getLastRow() < 2) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'ok', backup: null }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  var markerId = e && e.parameter ? String(e.parameter.marker || '').trim() : '';
  var lastRow = sheet.getLastRow();
  if (markerId) {
    var start = Math.max(2, lastRow - 249);
    var values = sheet.getRange(start, 1, lastRow - start + 1, Math.min(sheet.getLastColumn(), 10)).getValues();
    for (var i = values.length - 1; i >= 0; i--) {
      if (isDriveBackupIndexRowV18(values[i]) && String(values[i][4] || '') === markerId) {
        return ContentService.createTextOutput(JSON.stringify(makeDriveBackupResponseV18(values[i], start + i, 'matched_drive')))
          .setMimeType(ContentService.MimeType.JSON);
      }
      var payload = String(values[i][3] || '');
      if (payload.indexOf(markerId) === -1) continue;
      var chunk = parseBackupChunkV18(payload);
      if (chunk && chunk.__mmos_backup_chunk_v22) {
        var rebuilt = reconstructBackupFromRowsV18(values, start, chunk.__mmos_backup_chunk_v22.backupId);
        if (rebuilt) return ContentService.createTextOutput(JSON.stringify(rebuilt))
          .setMimeType(ContentService.MimeType.JSON);
      }
      var marker = extractBackupMarkerV18(payload);
      if (marker && String(marker.id || '') === markerId) {
        return ContentService.createTextOutput(JSON.stringify(makeBackupResponseV18(values[i], start + i, marker, 'matched_recent')))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
  }
  var latest = makeLatestBackupResponseV18(sheet);
  if (markerId) latest.markerSearch = 'not_found_recent';
  return ContentService.createTextOutput(JSON.stringify(latest))
    .setMimeType(ContentService.MimeType.JSON);
}

function getBackupStatusV18(e) {
  var folder = getBackupFolderV18();
  var ss = getMoneyMissionSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_BACKUP);
  var latest = null;
  if (sheet && sheet.getLastRow() >= 2) {
    var lastRow = sheet.getLastRow();
    var start = Math.max(2, lastRow - 249);
    var values = sheet.getRange(start, 1, lastRow - start + 1, Math.min(sheet.getLastColumn(), 10)).getValues();
    for (var i = values.length - 1; i >= 0; i--) {
      var row = values[i];
      if (!isDriveBackupIndexRowV18(row)) continue;
      if (String(row[8] || '') === 'probe') continue;
      latest = {
        savedAt: row[0],
        keyCount: row[1],
        size: row[2],
        backupId: row[4],
        driveFileId: row[5],
        driveUrl: row[6],
        build: row[7],
        indexStatus: row[8],
        matchedRow: start + i
      };
      break;
    }
  }
  return ContentService.createTextOutput(JSON.stringify({
    status: 'ok',
    storage: 'drive',
    driveBackupActive: true,
    folderId: folder.getId(),
    folderName: folder.getName(),
    latest: latest
  })).setMimeType(ContentService.MimeType.JSON);
}

function getBackupWriteProbeV18(e) {
  var markerId = String((e && e.parameter && e.parameter.marker) || ('get_probe_' + Date.now())).slice(0, 120);
  var marker = {
    id: markerId,
    ts: Date.now(),
    build: String((e && e.parameter && e.parameter.build) || ''),
    transport: 'GET'
  };
  var payload = JSON.stringify({
    __mmos_backup_verification_v22: marker,
    __mmos_backup_probe_v22: true,
    build: marker.build
  });
  var savedAt = new Date().toISOString();
  var result = saveBackup({
    payload: payload,
    keyCount: 1,
    size: payload.length,
    backupMarker: marker,
    backupMarkerId: marker.id,
    build: marker.build,
    savedAt: savedAt
  });
  logActivity('Backup GET probe saved to Drive — ' + markerId + ' — index row ' + result.row);
  return ContentService.createTextOutput(JSON.stringify({
    status: 'ok',
    storage: 'drive',
    probe: true,
    marker: marker,
    matchedRow: result.row,
    backup: { savedAt: savedAt, keyCount: 1, size: payload.length, payload: payload, driveFileId: result.driveFileId, driveUrl: result.driveUrl }
  })).setMimeType(ContentService.MimeType.JSON);
}

function getHealthCheck(e) {
  var secret = PropertiesService.getScriptProperties().getProperty('NOTION_SECRET');
  var health = { checkedAt: new Date().toISOString(), secretSet: !!secret };
  try {
    var nr = UrlFetchApp.fetch('https://api.notion.com/v1/users/me', {
      method: 'get', headers: { Authorization: 'Bearer ' + (secret || 'none'), 'Notion-Version': '2022-06-28' },
      muteHttpExceptions: true
    });
    health.notion = nr.getResponseCode() < 400 ? 'ok' : 'error';
    health.notionCode = nr.getResponseCode();
  } catch (err) { health.notion = 'error'; health.notionMsg = err.toString(); }
  try {
    var targetId = String(PropertiesService.getScriptProperties().getProperty(TARGET_SPREADSHEET_PROPERTY) || '').trim();
    var ss = getMoneyMissionSpreadsheet();
    health.sheets = ss ? 'ok' : 'error';
    health.sheetsName = ss ? ss.getName() : '';
    health.sheetsId = ss ? ss.getId() : '';
    health.sheetsSource = targetId ? 'script_property' : 'active_bound';
  }
  catch (err) { health.sheets = 'error'; health.sheetsMsg = err.toString(); }
  try { var cals = CalendarApp.getAllCalendars(); health.calendar = 'ok'; health.calendarCount = cals.length; }
  catch (err) { health.calendar = 'error'; health.calendarMsg = err.toString(); }
  try { var cache = CacheService.getScriptCache(); cache.put('health_ping', '1', 10); health.cache = cache.get('health_ping') === '1' ? 'ok' : 'error'; }
  catch (err) { health.cache = 'error'; }
  logActivity('Health check — notion: ' + health.notion + ' | sheets: ' + health.sheets + ' | calendar: ' + health.calendar + ' | cache: ' + health.cache);
  return ContentService.createTextOutput(JSON.stringify({ status: 'ok', health: health })).setMimeType(ContentService.MimeType.JSON);
}

function logActivity(msg) {
  try {
    var ss = getMoneyMissionSpreadsheet();
    var sheet = getOrCreateSheet(ss, SHEET_LOG, ['Timestamp', 'Event']);
    sheet.appendRow([new Date().toISOString(), msg]);
  } catch(e) {}
}

function getNotionContent(e) {
  var secret = PropertiesService.getScriptProperties().getProperty('NOTION_SECRET');
  var date = e.parameter.date;
  var databaseId = e.parameter.databaseId || NOTION_CONTENT_DB;
  var dateField = e.parameter.dateField || 'Production Date';
  if (!secret) return error('NOTION_SECRET not set in Script Properties.');
  if (!date) return error('Missing date.');
  var endDate = new Date(date + 'T00:00:00'); endDate.setDate(endDate.getDate() + 1);
  var end = Utilities.formatDate(endDate, 'UTC', 'yyyy-MM-dd');
  var result = notionQuery(databaseId, {
    filter: { and: [
      { property: dateField, date: { on_or_after: date } },
      { property: dateField, date: { before: end } }
    ]}, page_size: 10
  }, 'content_' + date);
  logActivity('Notion content — date: ' + date + ' — code: ' + result.code);
  if (result.code >= 400) return error('Notion ' + result.code + ': ' + result.text);
  return ContentService.createTextOutput(result.text).setMimeType(ContentService.MimeType.JSON);
}

function getContentPipeline(e) {
  var secret = PropertiesService.getScriptProperties().getProperty('NOTION_SECRET');
  var databaseId = e.parameter.databaseId || NOTION_CONTENT_DB;
  var stageFilter = e.parameter.readyTo || null;
  var viewMode = e.parameter.view || 'projects';
  if (!secret) return error('NOTION_SECRET not set in Script Properties.');
  var filter, cacheKey;
  if (viewMode === 'distribution') { filter = { property: 'Ready To', status: { equals: 'Distribute' } }; cacheKey = 'content_distribution'; }
  else if (stageFilter) { filter = { property: 'Ready To', status: { equals: stageFilter } }; cacheKey = 'content_stage_' + stageFilter.toLowerCase(); }
  else {
    filter = { and: [
      { property: 'Ready To', status: { does_not_equal: 'Archived' } },
      { property: 'Ready To', status: { does_not_equal: 'Distribute' } }
    ]};
    cacheKey = 'content_pipeline';
  }
  var result = notionQuery(databaseId, { filter: filter, sorts: [{ property: 'Production Date', direction: 'ascending' }], page_size: 25 }, cacheKey);
  if (result.code >= 400) return error('Notion content pipeline ' + result.code + ': ' + result.text);
  var data = JSON.parse(result.text);
  var items = (data.results || []).map(function(page) {
    var props = page.properties || {};
    return {
      title: readNotionTitle(props.Title), readyTo: readNotionStatus(props['Ready To']),
      phase: readNotionStatus(props.Phase), format: readNotionSelect(props.Format),
      platform: readNotionMulti(props.Platform), channel: readNotionSelect(props.Channel),
      score: readNotionSelect(props.Score), type: readNotionMulti(props.Type),
      productionDate: readNotionDate(props['Production Date']),
      publishDate: readNotionDate(props['Publish Date']), url: page.url
    };
  });
  return ContentService.createTextOutput(JSON.stringify({ status: 'ok', items: items, view: viewMode, stage: stageFilter }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getProductionPipeline(e) {
  var secret = PropertiesService.getScriptProperties().getProperty('NOTION_SECRET');
  var databaseId = e.parameter.databaseId || NOTION_PRODUCTION_DB;
  if (!secret) return error('NOTION_SECRET not set in Script Properties.');
  var result = notionQuery(databaseId, {
    filter: { property: 'Status', status: { does_not_equal: 'Posted/Scheduled' } },
    sorts: [{ timestamp: 'created_time', direction: 'descending' }], page_size: 25
  }, 'production_pipeline');
  if (result.code >= 400) return error('Notion production ' + result.code + ': ' + result.text);
  var data = JSON.parse(result.text);
  var items = (data.results || []).map(function(page) {
    var props = page.properties || {};
    return { title: readNotionTitle(props.Name), status: readNotionStatus(props.Status),
      owner: readNotionPeople(props.Assign), url: page.url, createdTime: page.created_time };
  });
  return ContentService.createTextOutput(JSON.stringify({ status: 'ok', items: items })).setMimeType(ContentService.MimeType.JSON);
}

function getResources(e) {
  var secret = PropertiesService.getScriptProperties().getProperty('NOTION_SECRET');
  var databaseId = e.parameter.databaseId || NOTION_RESOURCE_DB;
  if (!secret) return error('NOTION_SECRET not set in Script Properties.');
  var result = notionQuery(databaseId, {
    filter: { property: 'Active', checkbox: { equals: true } },
    sorts: [{ property: 'Priority', direction: 'ascending' }], page_size: 50
  }, 'resources');
  if (result.code >= 400) return error('Notion resources ' + result.code + ': ' + result.text);
  var data = JSON.parse(result.text);
  var items = (data.results || []).map(function(page) {
    var props = page.properties || {};
    return {
      title: readNotionTitle(props['Resource Name']), type: readNotionSelect(props.Type),
      businessArea: readNotionMulti(props['Business Area']),
      relatedCard: readNotionMulti(props['Related Card']),
      relatedTab: readNotionMulti(props['Related Tab']),
      relatedStage: readNotionMulti(props['Related Stage']),
      useCase: readNotionMulti(props['Use Case']),
      priority: readNotionSelect(props.Priority),
      whenToShow: readNotionText(props['When To Show']),
      summary: readNotionText(props['Short Summary']),
      aiNotes: readNotionText(props['AI Notes']),
      resourceUrl: readNotionUrl(props.URL), notionUrl: page.url, createdTime: page.created_time
    };
  });
  return ContentService.createTextOutput(JSON.stringify({ status: 'ok', items: items })).setMimeType(ContentService.MimeType.JSON);
}

function getCRMLeads(e) {
  var secret = PropertiesService.getScriptProperties().getProperty('NOTION_SECRET');
  var databaseId = e.parameter.databaseId || NOTION_CRM_DB;
  if (!secret) return error('NOTION_SECRET not set in Script Properties.');
  var result = notionQuery(databaseId, {
    filter: { and: [
      { property: 'Lead Status', select: { does_not_equal: '❌ Dead' } },
      { property: 'Pipeline Stage', select: { does_not_equal: '🏆 Closed Won' } }
    ]},
    sorts: [{ property: 'Last Activity Date', direction: 'descending' }], page_size: 50
  }, 'crm_leads');
  if (result.code >= 400) return error('Notion CRM ' + result.code + ': ' + result.text);
  var data = JSON.parse(result.text);
  var items = (data.results || []).map(function(page) {
    var props = page.properties || {};
    return {
      name: readNotionTitle(props.Name), source: readNotionSelect(props.Source),
      stageName: readNotionText(props['Stage Name']),
      realName: readNotionText(props['Real Name']),
      funnelSource: readNotionSelect(props['CF Funnel Source']),
      stage: readNotionSelect(props['Pipeline Stage']),
      status: readNotionSelect(props['Lead Status']),
      offerInterest: readNotionMulti(props['Offer Interest']),
      phone: readNotionPhone(props.Phone), instagram: readNotionText(props.Instagram),
      email: readNotionEmail(props.Email), hot: readNotionCheckbox(props['Hot Lead']),
      bookingPriority: readNotionSelect(props['Booking Priority']),
      followUpDate: readNotionDate(props['Follow-Up Date']),
      lastContact: readNotionDate(props['Last Contact']) || readNotionDate(props['Last Activity Date']),
      optInDate: readNotionDate(props['Opt-In Date']) || readNotionDate(props['Date Added']),
      opportunityValue: readNotionNumber(props['Opportunity Value']),
      conversionEvent: readNotionSelect(props['Conversion Event']),
      contactedToday: readNotionCheckbox(props['Contacted Today']),
      replied: readNotionCheckbox(props.Replied),
      recentActivity: readNotionText(props['Recent Activity']),
      notionUrl: page.url, url: page.url
    };
  });
  return ContentService.createTextOutput(JSON.stringify({ status: 'ok', items: items })).setMimeType(ContentService.MimeType.JSON);
}

function getSkoolCommunity(e) {
  var secret = PropertiesService.getScriptProperties().getProperty('NOTION_SECRET');
  var databaseId = e.parameter.databaseId || NOTION_CRM_DB;
  if (!secret) return error('NOTION_SECRET not set in Script Properties.');
  var now = new Date();
  var monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  var monthStartStr = Utilities.formatDate(monthStart, 'UTC', 'yyyy-MM-dd');
  var result = notionQuery(databaseId, {
    filter: { property: 'Skool Member', checkbox: { equals: true } },
    sorts: [{ property: 'Opt-In Date', direction: 'descending' }], page_size: 100
  }, null);
  if (result.code >= 400) return error('Notion Skool community ' + result.code + ': ' + result.text);
  var data = JSON.parse(result.text);
  var allMembers = data.results || [];
  var newThisMonth = allMembers.filter(function(p) {
    var optIn = readNotionDate(p.properties['Opt-In Date']) || readNotionDate(p.properties['Date Added']);
    return optIn && optIn >= monthStartStr;
  });
  var callsBooked = allMembers.filter(function(p) { return readNotionCheckbox(p.properties['Skool Call Booked']); });
  var masterclassAttended = allMembers.filter(function(p) { return readNotionCheckbox(p.properties['Skool Masterclass']); });
  var upgraded = allMembers.filter(function(p) { return readNotionSelect(p.properties['Pipeline Stage']) === '🏆 Closed Won'; });
  var recentMembers = newThisMonth.slice(0, 10).map(function(p) {
    var props = p.properties || {};
    return {
      name: readNotionTitle(props.Name), stageName: readNotionText(props['Stage Name']),
      genre: readNotionMulti(props.Genre), title: readNotionSelect(props.Title),
      optInDate: readNotionDate(props['Opt-In Date']) || readNotionDate(props['Date Added']),
      instagram: readNotionText(props.Instagram),
      beatPacks: readNotionMulti(props['Beat Pack Downloaded']),
      songVSong: readNotionCheckbox(props['Song V Song']),
      submitted: readNotionCheckbox(props['Song V Song Submitted']),
      banginApp: readNotionCheckbox(props['BANGIN App']),
      hot: readNotionCheckbox(props['Hot Lead']), url: p.url
    };
  });
  return ContentService.createTextOutput(JSON.stringify({
    status: 'ok',
    metrics: { totalMembers: allMembers.length, newThisMonth: newThisMonth.length,
      callsBooked: callsBooked.length, masterclassAttended: masterclassAttended.length, upgraded: upgraded.length },
    recentMembers: recentMembers
  })).setMimeType(ContentService.MimeType.JSON);
}

function searchRolodex(e) {
  return ContentService.createTextOutput(JSON.stringify({ status: 'ok', items: [], message: 'Rolodex search not yet implemented.' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function searchResources(e) {
  var secret = PropertiesService.getScriptProperties().getProperty('NOTION_SECRET');
  var query = (e.parameter.query || '').trim();
  if (!query || !secret) return ContentService.createTextOutput(JSON.stringify({ status: 'ok', url: null })).setMimeType(ContentService.MimeType.JSON);
  var result = notionQuery(NOTION_RESOURCE_DB, { filter: { property: 'Name', title: { contains: query } }, page_size: 3 }, 'res_search_' + query.toLowerCase());
  var items = []; try { items = JSON.parse(result.text).results || []; } catch (err) {}
  if (!items.length) return ContentService.createTextOutput(JSON.stringify({ status: 'ok', url: null })).setMimeType(ContentService.MimeType.JSON);
  var exact = items.filter(function(p) {
    var t = ((p.properties.Name || {}).title || [])[0];
    return t && t.plain_text.toLowerCase() === query.toLowerCase();
  });
  var page = exact[0] || items[0];
  var url = page.url || ('https://notion.so/' + page.id.replace(/-/g, ''));
  return ContentService.createTextOutput(JSON.stringify({ status: 'ok', url: url })).setMimeType(ContentService.MimeType.JSON);
}

// ── NOTION PROPERTY READERS ──────────────────────────────────
function readNotionTitle(p) { if (!p || !p.title || !p.title.length) return ''; return p.title.map(function(t) { return t.plain_text || ''; }).join(''); }
function readNotionStatus(p) { if (!p || !p.status) return 'Not started'; return p.status.name || 'Not started'; }
function readNotionPeople(p) { if (!p || !p.people || !p.people.length) return ''; return p.people.map(function(x) { return x.name || ''; }).filter(Boolean).join(', '); }
function readNotionText(p) { if (!p) return ''; var arr = p.rich_text || p.title || []; if (!arr.length) return ''; return arr.map(function(t) { return t.plain_text || ''; }).join(''); }
function readNotionSelect(p) { if (!p || !p.select) return ''; return p.select.name || ''; }
function readNotionMulti(p) { if (!p || !p.multi_select || !p.multi_select.length) return []; return p.multi_select.map(function(item) { return item.name || ''; }).filter(Boolean); }
function readNotionUrl(p) { if (!p || !p.url) return ''; return p.url; }
function readNotionDate(p) { if (!p || !p.date) return ''; return p.date.start || ''; }
function readNotionCheckbox(p) { if (!p) return false; return p.checkbox === true; }
function readNotionNumber(p) { if (!p || typeof p.number !== 'number') return 0; return p.number; }
function readNotionPhone(p) { if (!p) return ''; return p.phone_number || ''; }
function readNotionEmail(p) { if (!p) return ''; return p.email || ''; }

function getLiveEvents(e) {
  var secret = PropertiesService.getScriptProperties().getProperty('NOTION_SECRET');
  if (!secret) return error('NOTION_SECRET not set in Script Properties.');
  var LIVE_EVENTS_DB = '99fcf23b-0cdc-49e7-9e23-9e99c08438d5';
  var result = notionQuery(LIVE_EVENTS_DB, {
    filter: { and: [
      { property: 'Status', status: { does_not_equal: 'Done' } },
      { property: 'Status', status: { does_not_equal: 'Cancelled' } }
    ]},
    sorts: [{ property: 'Date', direction: 'ascending' }], page_size: 10
  }, 'live_events');
  if (result.code >= 400) return error('Notion live events ' + result.code + ': ' + result.text);
  var data = JSON.parse(result.text);
  var items = (data.results || []).map(function(page) {
    var props = page.properties || {};
    return {
      title: readNotionTitle(props['Event Name']), type: readNotionSelect(props['Type']),
      date: readNotionDate(props['Date']), location: readNotionText(props['Location']),
      platform: readNotionMulti(props['Platform']), status: readNotionStatus(props['Status']),
      contentPotential: readNotionSelect(props['Content Potential']),
      topic: readNotionText(props['Stream Topic']), url: page.url
    };
  });
  return ContentService.createTextOutput(JSON.stringify({ status: 'ok', items: items })).setMimeType(ContentService.MimeType.JSON);
}

// ── HELPERS ──────────────────────────────────────────────────
function findSheetByNameOrPrefix(ss, name, options) {
  options = options || {};
  var sheet = ss.getSheetByName(name);
  if (sheet) return sheet;
  if (!options.matchPrefix) return null;
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    var candidate = sheets[i];
    var candidateName = candidate.getName();
    if (candidateName.indexOf(name + '_conflict') === 0 || candidateName.indexOf(name) === 0) {
      if (options.renameMatched) {
        try {
          candidate.setName(name);
          logActivity('Sheet name cleanup — reused ' + candidateName + ' as ' + name);
        } catch (err) {
          logActivity('Sheet name cleanup — reused ' + candidateName + ' without rename: ' + err.message);
        }
      }
      return candidate;
    }
  }
  return null;
}

function getOrCreateSheet(ss, name, headers, options) {
  var sheet = findSheetByNameOrPrefix(ss, name, options);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#1a2910').setFontColor('#7ec845');
    sheet.setFrozenRows(1);
  } else if (options && options.matchPrefix && headers) {
    ensureSheetHeaders(sheet, headers);
  }
  return sheet;
}

function formatSheet(sheet) {
  if (sheet.getLastRow() <= 5) sheet.autoResizeColumns(1, Math.min(sheet.getLastColumn(), 20));
}

function jsonResponseV20(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload || {}))
    .setMimeType(ContentService.MimeType.JSON);
}

function getDriveFolderByNameV20(folderName) {
  var name = String(folderName || '').trim();
  if (!name) return null;
  var folders = DriveApp.getFoldersByName(name);
  return folders.hasNext() ? folders.next() : null;
}

function getDriveTextFileV20(fileId, fileName, folderName) {
  var id = String(fileId || '').trim();
  if (id) {
    var fileById = DriveApp.getFileById(id);
    return {
      file: fileById,
      text: fileById.getBlob().getDataAsString()
    };
  }
  var name = String(fileName || '').trim();
  if (!name) throw new Error('Missing file_id or file_name.');
  var folder = getDriveFolderByNameV20(folderName);
  if (!folder) throw new Error('Drive folder not found: ' + folderName);
  var files = folder.getFilesByName(name);
  if (!files.hasNext()) throw new Error('Drive file not found: ' + name);
  var file = files.next();
  return {
    file: file,
    text: file.getBlob().getDataAsString()
  };
}

function makeDriveReadPayloadV20(kind, source) {
  var file = source.file;
  var text = String(source.text || '');
  return {
    status: 'ok',
    ok: true,
    storage: 'drive',
    kind: kind,
    fileId: file.getId(),
    fileName: file.getName(),
    fileUrl: file.getUrl(),
    size: text.length,
    text: text
  };
}

function readSkillFileV20(e) {
  try {
    var p = e.parameter || {};
    var source = getDriveTextFileV20(p.file_id || p.fileId, p.file_name || p.fileName, MC_SKILLS_LIBRARY_FOLDER);
    return jsonResponseV20(makeDriveReadPayloadV20('skill_file', source));
  } catch (err) {
    return jsonResponseV20({ status: 'error', ok: false, kind: 'skill_file', message: err.toString() });
  }
}

function listSkillFilesV20(e) {
  try {
    var p = e.parameter || {};
    var folder = getDriveFolderByNameV20(p.folder_name || p.folderName || MC_SKILLS_LIBRARY_FOLDER);
    if (!folder) throw new Error('Drive folder not found: ' + (p.folder_name || p.folderName || MC_SKILLS_LIBRARY_FOLDER));
    var limit = Math.min(Math.max(Number(p.limit || 50), 1), 100);
    var files = folder.getFiles();
    var items = [];
    while (files.hasNext() && items.length < limit) {
      var file = files.next();
      items.push({
        fileId: file.getId(),
        fileName: file.getName(),
        fileUrl: file.getUrl(),
        mimeType: file.getMimeType(),
        updatedAt: file.getLastUpdated().toISOString()
      });
    }
    return jsonResponseV20({
      status: 'ok',
      ok: true,
      storage: 'drive',
      kind: 'skill_file_list',
      folderId: folder.getId(),
      folderName: folder.getName(),
      items: items
    });
  } catch (err) {
    return jsonResponseV20({ status: 'error', ok: false, kind: 'skill_file_list', message: err.toString() });
  }
}

function readVaultFileV20(e) {
  try {
    var p = e.parameter || {};
    var folderName = p.folder_name || p.folderName || MC_MEMORY_VAULT_FOLDER;
    var source = getDriveTextFileV20(p.file_id || p.fileId, p.file_name || p.fileName, folderName);
    return jsonResponseV20(makeDriveReadPayloadV20('vault_file', source));
  } catch (err) {
    return jsonResponseV20({ status: 'error', ok: false, kind: 'vault_file', message: err.toString() });
  }
}

function getPhase101MissionOsContextSourceMapV25() {
  return {
    build: PHASE101_MISSION_OS_CONTEXT_BUILD_V25,
    timezone: 'America/New_York',
    sourceIds: {
      currentOperatingState: 'collection://3e651779-c5a1-43b0-a52d-c2b3056263a6',
      taskMaster: 'collection://11161152-81da-80da-891f-000b711d93d8',
      campaigns: 'collection://3dac644d-ada6-46ce-b34b-e025fbcf1746',
      missionAttempts: 'collection://5c02c36e-fe2a-4de9-be2c-d7c2c29e803f',
      agentOutputArchives: 'collection://c6337637-98eb-47ea-8396-982e72f2637d',
      scheduleBlocks: 'collection://eda14da4-2cbc-46fa-8f4e-4b1cfd6924ec',
      scriptOutlineDrafts: 'collection://25e8d3bc-9355-4ba0-8444-c9dd909e9485',
      contentDrafts: 'collection://1a061152-81da-8109-8a75-000b421df0bf',
      assetsDriveIndex: 'collection://df392cb7-f0b5-441b-a4bd-38ee4d48b3ee',
      liveEventsStreams: 'collection://f32424f4-9966-4aaf-a387-ff985f4be95e'
    },
    apiIds: {
      currentOperatingState: PHASE102_CURRENT_OPERATING_STATE_API_ID_V25
    },
    fields: {
      currentOperatingState: ['State Name','Status','Week Of','Active Cycle','Active Campaign','Active Mission Attempt','Active Batch Lane','Today Priority','Current Offer','Current CTA','Allowed Work','Parked Work','Urgent Exceptions','Result To Log','Approval Focus','Source Freshness'],
      taskMaster: ['Name','Status','App Read Eligible','Batch Lane','Move Type','Campaign','Mission Attempt','Result Needed','Result Logged','Rep Count','Rule of 300 Eligible','Estimated Minutes','Actual Minutes','Due date','Priority','Area'],
      campaigns: ['Campaign Name','Status','App Read Eligible','Primary Offer','Primary Batch Lane','Active Batch Lane','Batch Lane Type','Allowed Work','Parked Work','Urgent Exceptions','Batch Mission Set','Batch Result To Log','Rule of 300 Target','Rule of 300 Progress %','Weekly Time Goal','Total Focused Minutes'],
      missionAttempts: ['Attempt Name','Attempt Status','App Read Eligible','Completion %','Current Phase','Current Next Move','Current Batch Move','Batch Lane','Batch Lane Type','Mission Set','Allowed Work','Parked Work','Result To Log','Lock-In Default Lane','Batch Carry Forward','Score','Proof Captured','Focused Minutes'],
      agentOutputs: ['Output Name','Output Type','Status','Approval Needed','Next Action','Summary','Week Of','Output Date','Agent','Related Cycle','Related Campaign'],
      scheduleBlocks: ['Block Name','Status','Approval Needed','Calendar Event Created','Block Date','Block Type','Start Time','End Time','Time Zone','Goal','Recommended Focus','Related Campaign','Related Content','Related CRM Lead','Related Event','Related Agent Output'],
      scriptOutlines: ['Script Name','Status','Approval Needed','Week Of','Output Date','Format','Lane','Campaign','Money Mission Cycle','CTA','Training Notes','A1XX Feedback'],
      contentDrafts: ['Title','Campaign','Mission Attempt','Money Mission Cycle','Ready To','Phase','Format','Platform','Related Assets','Related Project','Publish Date','Production Date','Status']
    },
    futureConsumers: {
      overview: ['today','thisWeek','mission','journey','rewards','sourceFreshness'],
      profile: ['activeCampaign','activeBatchLane','scoreboard','time','rewards'],
      badges: ['rewardOpportunities','missionAchievements','levelBadges'],
      missions: ['activeMission','missionAttempt','resources','steps','handoff'],
      journey: ['activeCycle','activeCampaign','milestones','revenueRoad'],
      command: ['currentMission','currentMove','focusLane','allowedWork','parkedWork','resultToLog'],
      brief: ['currentState','agentOutputs','scheduleBlocks','approvalFocus'],
      outreach: ['todayMoves','crm','sales','activeMission','followUps'],
      music: ['activeBatchLane','projects','fulfillment','content','assets'],
      manager: ['approvals','scheduleBlocks','projects','warnings','missingContext']
    }
  };
}

function getPhase101MissionOsContextBoundaryV25() {
  return {
    readOnly: true,
    contractOnly: true,
    playerConsumptionEnabled: false,
    appWrite: false,
    notionWrite: false,
    sheetsWrite: false,
    missionCompletionWrite: false,
    xpAwardWrite: false,
    awardExecution: false,
    notificationDispatch: false,
    ledgerWrite: false,
    restoreExecutionEnabled: false,
    workerAuth: false,
    automationActivation: false,
    tokenExport: false,
    secretExport: false,
    bootstrapExecution: false
  };
}

function getPhase101MissionOsContextEmptyPacketV25(reason) {
  var sourceMap = getPhase101MissionOsContextSourceMapV25();
  return {
    ok: true,
    packetKey: 'mission_os_context',
    version: 'v1',
    build: PHASE101_MISSION_OS_CONTEXT_BUILD_V25,
    status: 'contract_ready',
    reason: reason || 'live_read_deferred_to_next_gate',
    generatedAt: new Date().toISOString(),
    timezone: 'America/New_York',
    readOnly: true,
    playerSafe: true,
    sourceMap: sourceMap,
    sourceFreshness: {
      overall: 'waiting',
      language: 'The read-only context shape is ready. Live Notion rows are deferred to the controlled read phase.'
    },
    currentState: null,
    activeCycle: null,
    activeCampaign: null,
    activeBatchLane: null,
    activeMission: null,
    todayMoves: [],
    thisWeekMoves: [],
    scheduleBlocks: [],
    content: [],
    scripts: [],
    sales: [],
    crm: [],
    projects: [],
    fulfillment: [],
    events: [],
    resources: [],
    approvals: [],
    agentOutputs: [],
    scoreboard: {
      ruleOf300: null,
      focusedMinutes: null,
      badges: null,
      trophies: null,
      missions: null
    },
    debrief: null,
    links: [],
    warnings: [],
    cardConsumers: sourceMap.futureConsumers,
    protectedBoundary: getPhase101MissionOsContextBoundaryV25(),
    nextAllowedStep: 'phase102_controlled_mission_os_context_live_read_probe'
  };
}

function getPhase101MissionOsContextV25(p) {
  try {
    p = p || {};
    var developerProbe = String(p.developerProbe || p.developer_probe || '') === '1';
    var liveProbe = String(p.liveProbe || p.live_probe || '') === '1';
    var mode = String(p.mode || '').trim();
    if ((developerProbe && liveProbe) || mode === 'live_probe') {
      return jsonResponseV20(getPhase102MissionOsContextLiveProbePacketV25(p));
    }
    return jsonResponseV20(getPhase101MissionOsContextEmptyPacketV25('phase101_endpoint_contract_ready'));
  } catch (err) {
    return jsonResponseV20({
      ok: false,
      packetKey: 'mission_os_context',
      status: 'error',
      readOnly: true,
      playerSafe: true,
      message: err.toString(),
      protectedBoundary: getPhase101MissionOsContextBoundaryV25()
    });
  }
}

function getPhase102MissionOsContextLiveProbeBoundaryV25() {
  var boundary = getPhase101MissionOsContextBoundaryV25();
  boundary.contractOnly = false;
  boundary.liveReadProbeOnly = true;
  boundary.playerConsumptionEnabled = false;
  boundary.appWrite = false;
  boundary.notionWrite = false;
  boundary.sheetsWrite = false;
  return boundary;
}

function readPhase102CurrentOperatingStateProbeV25(limit) {
  try {
    var secret = PropertiesService.getScriptProperties().getProperty('NOTION_SECRET');
    if (!secret) return { ok: false, code: 'missing_secret', error: 'NOTION_SECRET not set.', rows: [], rowCount: 0 };
    var sourceMap = getPhase101MissionOsContextSourceMapV25();
    var sourceId = String((sourceMap.apiIds && sourceMap.apiIds.currentOperatingState) || sourceMap.sourceIds.currentOperatingState || '').replace(/^collection:\/\//, '');
    if (!sourceId) return { ok: false, code: 'missing_source', error: 'Current Operating State source is missing.', rows: [], rowCount: 0 };
    var rowLimit = Math.min(Math.max(Number(limit || 1), 1), 1);
    var result = notionQuery(sourceId, { page_size: rowLimit }, 'phase102_current_operating_state_probe');
    if (result.code >= 400) {
      return { ok: false, code: String(result.code), error: cellTextV20(result.text || '', 500), rows: [], rowCount: 0 };
    }
    var parsed = JSON.parse(result.text || '{}');
    var rows = (parsed.results || []).slice(0, rowLimit).map(function(page) {
      return compactPhase102CurrentOperatingStatePageV25(page);
    });
    return { ok: true, code: String(result.code || 200), rows: rows, rowCount: rows.length, hasMore: parsed.has_more === true };
  } catch (err) {
    return { ok: false, code: 'exception', error: err.toString(), rows: [], rowCount: 0 };
  }
}

function readPhase102PropV25(props, name) {
  try {
    return cellTextV20(readNotionAnyPropertyV20(props[name]), 260);
  } catch (err) {
    return '';
  }
}

function compactPhase102CurrentOperatingStatePageV25(page) {
  page = page || {};
  var props = page.properties || {};
  return {
    id: page.id || '',
    title: readPhase102PropV25(props, 'State Name') || readNotionRegistryTitleV20(props) || 'Current Operating State',
    status: readPhase102PropV25(props, 'Status'),
    weekOf: readPhase102PropV25(props, 'Week Of'),
    todayPriority: readPhase102PropV25(props, 'Today Priority'),
    currentOffer: readPhase102PropV25(props, 'Current Offer'),
    currentCTA: readPhase102PropV25(props, 'Current CTA'),
    activeBatchLane: readPhase102PropV25(props, 'Active Batch Lane'),
    allowedWork: readPhase102PropV25(props, 'Allowed Work'),
    parkedWork: readPhase102PropV25(props, 'Parked Work'),
    urgentExceptions: readPhase102PropV25(props, 'Urgent Exceptions'),
    resultToLog: readPhase102PropV25(props, 'Result To Log'),
    approvalFocus: readPhase102PropV25(props, 'Approval Focus'),
    sourceFreshness: readPhase102PropV25(props, 'Source Freshness'),
    url: page.url || '',
    lastEditedAt: page.last_edited_time || ''
  };
}

function phase103ClipMissionTextV25(value, max) {
  max = Math.max(Number(max || 120), 40);
  var text = cellTextV20(value || '', 1000).replace(/\s+/g, ' ').trim();
  if (!text) return '';
  if (text.length <= max) return text;
  return text.slice(0, Math.max(max - 1, 20)).replace(/\s+\S*$/, '').trim() + '…';
}

function phase103CleanWeekLabelV25(value) {
  var text = phase103ClipMissionTextV25(value, 40);
  return text ? 'Week of ' + text : 'Current week';
}

function phase103LaneInstructionV25(lane) {
  var clean = String(lane || '').toLowerCase();
  if (clean === 'outreach') return 'Protect the outreach lane. Keep the next move tied to approved conversations and log the result.';
  if (clean === 'music') return 'Protect the music block. Finish one clear creative move before switching lanes.';
  if (clean === 'content') return 'Protect the content lane. Create the next visible proof piece and keep the CTA clean.';
  if (clean === 'fulfillment') return 'Protect delivery. Move the paid work forward and save proof before changing context.';
  if (clean === 'proof') return 'Protect proof. Capture what moved and turn the result into something visible.';
  if (clean === 'admin') return 'Protect the cleanup lane. Clear the blocker without drifting into a new project.';
  if (clean === 'recalibration') return 'Protect recalibration. Review the road, reset the next move, and restart clean.';
  return 'Protect one lane. Keep the next move clean and log what happened.';
}

function getPhase103MissionOsContextFallbackCopyV25(freshness) {
  var state = String(freshness || '').toLowerCase();
  var map = {
    fresh: 'Today’s operating context is ready.',
    aging: 'Today’s context is available, but it may need a quick refresh soon.',
    stale: 'This context is old enough to review before trusting it.',
    empty: 'No current operating row is available yet.',
    blocked: 'The operating context is blocked until the source is available.',
    error: 'The operating context needs review before player use.',
    waiting: 'The operating context shape is ready and waiting for a live read.'
  };
  return {
    freshness: state || 'waiting',
    playerLine: map[state] || map.waiting,
    emptyLine: 'Set the current operating state in Notion to unlock a cleaner read.',
    blockedLine: 'Keep working from the local mission state until this source is refreshed.'
  };
}

function getPhase103MissionOsContextConsumerPermissionsV25() {
  return {
    overview: ['weekLabel','activeLane','todayFocusShort','offerShort','ctaShort','resultTargetShort','freshness'],
    brief: ['weekLabel','todayFocusShort','approvalNeededShort','allowedWorkShort','freshness'],
    outreach: ['activeLane','ctaShort','resultTargetShort','laneInstruction','freshness'],
    music: ['activeLane','todayFocusShort','allowedWorkShort','parkedWorkShort','freshness'],
    manager: ['approvalNeededShort','urgentExceptionsShort','parkedWorkShort','resultTargetShort','freshness'],
    missions: ['activeLane','todayFocusShort','resultTargetShort','freshness'],
    command: ['activeLane','todayFocusShort','ctaShort','resultTargetShort','laneInstruction','approvalNeededShort'],
    profile: ['activeLane','freshness'],
    badges: ['freshness'],
    journey: ['weekLabel','activeLane','freshness']
  };
}

function normalizePhase103MissionOsCurrentStateV25(row, freshness) {
  row = row || {};
  var activeLane = phase103ClipMissionTextV25(row.activeBatchLane || '', 32) || 'Not set';
  var fresh = String(freshness || row.sourceFreshness || 'waiting').toLowerCase();
  return {
    weekLabel: phase103CleanWeekLabelV25(row.weekOf || ''),
    stateTitle: phase103ClipMissionTextV25(row.title || 'Current Operating State', 80),
    status: phase103ClipMissionTextV25(row.status || 'Pending', 40),
    freshness: fresh,
    activeLane: activeLane,
    todayFocus: row.todayPriority || '',
    todayFocusShort: phase103ClipMissionTextV25(row.todayPriority || '', 120) || 'Choose one clean move for today.',
    currentOffer: row.currentOffer || '',
    offerShort: phase103ClipMissionTextV25(row.currentOffer || '', 90) || 'Current offer not set.',
    currentCTA: row.currentCTA || '',
    ctaShort: phase103ClipMissionTextV25(row.currentCTA || '', 90) || 'Current CTA not set.',
    allowedWork: row.allowedWork || '',
    allowedWorkShort: phase103ClipMissionTextV25(row.allowedWork || '', 110) || 'Allowed work not set.',
    parkedWork: row.parkedWork || '',
    parkedWorkShort: phase103ClipMissionTextV25(row.parkedWork || '', 110) || 'No parked work listed.',
    urgentExceptions: row.urgentExceptions || '',
    urgentExceptionsShort: phase103ClipMissionTextV25(row.urgentExceptions || '', 100) || 'No urgent exceptions listed.',
    resultToLog: row.resultToLog || '',
    resultTargetShort: phase103ClipMissionTextV25(row.resultToLog || '', 110) || 'Log the result that proves the move counted.',
    approvalFocus: row.approvalFocus || '',
    approvalNeededShort: phase103ClipMissionTextV25(row.approvalFocus || '', 110) || 'No approval focus listed.',
    laneInstruction: phase103LaneInstructionV25(activeLane),
    sourceUrl: row.url || '',
    lastEditedAt: row.lastEditedAt || ''
  };
}

function getPhase103MissionOsContextNormalizedLayerV25(packet) {
  packet = packet || {};
  var rawFresh = packet.sourceFreshness && packet.sourceFreshness.overall ? packet.sourceFreshness.overall : 'waiting';
  var normalized = normalizePhase103MissionOsCurrentStateV25(packet.currentState || {}, rawFresh);
  var fallbackCopy = getPhase103MissionOsContextFallbackCopyV25(normalized.freshness);
  return {
    build: PHASE103_MISSION_OS_CONTEXT_NORMALIZATION_BUILD_V25,
    normalizedAt: new Date().toISOString(),
    source: 'Current Operating State',
    normalizedContext: normalized,
    playerSafeCopy: {
      headline: fallbackCopy.playerLine,
      todayFocus: normalized.todayFocusShort,
      lane: normalized.activeLane,
      laneInstruction: normalized.laneInstruction,
      offer: normalized.offerShort,
      cta: normalized.ctaShort,
      resultTarget: normalized.resultTargetShort,
      approval: normalized.approvalNeededShort,
      fallback: fallbackCopy
    },
    consumerPermissions: getPhase103MissionOsContextConsumerPermissionsV25(),
    rawPlayerSurfaceBlocked: true,
    playerConsumptionEnabled: false
  };
}

function getPhase102MissionOsContextLiveProbePacketV25(p) {
  p = p || {};
  var read = readPhase102CurrentOperatingStateProbeV25(1);
  var packet = getPhase101MissionOsContextEmptyPacketV25(read.ok ? 'phase102_live_probe_ok' : 'phase102_live_probe_review');
  packet.ok = read.ok === true;
  packet.build = PHASE102_MISSION_OS_CONTEXT_LIVE_PROBE_BUILD_V25;
  packet.status = read.ok ? 'live_probe_ok' : 'live_probe_review';
  packet.mode = 'controlled_live_read_probe';
  packet.liveReadProbe = true;
  packet.playerConsumptionEnabled = false;
  packet.readAt = new Date().toISOString();
  packet.currentState = read.rows && read.rows.length ? read.rows[0] : null;
  packet.currentStateRows = read.rows || [];
  packet.rowCount = read.rowCount || 0;
  packet.sourceFreshness = read.ok ? {
    overall: read.rowCount ? 'fresh' : 'empty',
    language: read.rowCount ? 'Current Operating State returned one safe read row.' : 'Current Operating State responded but did not return a row.'
  } : {
    overall: 'error',
    language: 'Current Operating State live read needs review before player use.'
  };
  packet.probe = {
    sourceKey: 'currentOperatingState',
    sourceLabel: 'Current Operating State',
    limit: 1,
    ok: read.ok === true,
    code: read.code || '',
    error: read.error || '',
    hasMore: read.hasMore === true
  };
  packet.warnings = read.ok ? [] : [{ type: 'live_read_probe', message: read.error || 'Live read did not complete.' }];
  packet.protectedBoundary = getPhase102MissionOsContextLiveProbeBoundaryV25();
  var normalizedLayer = getPhase103MissionOsContextNormalizedLayerV25(packet);
  packet.build = PHASE103_MISSION_OS_CONTEXT_NORMALIZATION_BUILD_V25;
  packet.normalizedContext = normalizedLayer.normalizedContext;
  packet.playerSafeCopy = normalizedLayer.playerSafeCopy;
  packet.consumerPermissions = normalizedLayer.consumerPermissions;
  packet.rawPlayerSurfaceBlocked = true;
  packet.nextAllowedStep = 'phase104_controlled_app_read_preview';
  return packet;
}

function getPhase25NotionReadRelayPacketCatalogV25() {
  return [
    {
      packetKey: 'today_money_moves',
      sourceKey: 'task_master',
      sourceLabel: 'Task (Master)',
      sourceId: PHASE25_NOTION_TASK_MASTER_SOURCE_ID_V25,
      viewKey: 'app_read_moves',
      viewLabel: 'App Read Moves',
      viewId: PHASE25_NOTION_TASK_MASTER_VIEW_ID_V25,
      defaultLimit: 6,
      maxRows: 12,
      purpose: 'Today money moves and next clean actions.'
    },
    {
      packetKey: 'mission_task_context',
      sourceKey: 'task_master',
      sourceLabel: 'Task (Master)',
      sourceId: PHASE25_NOTION_TASK_MASTER_SOURCE_ID_V25,
      viewKey: 'app_read_moves',
      viewLabel: 'App Read Moves',
      viewId: PHASE25_NOTION_TASK_MASTER_VIEW_ID_V25,
      defaultLimit: 10,
      maxRows: 20,
      purpose: 'Current mission task context and move planning.'
    },
    {
      packetKey: 'upcoming_events',
      sourceKey: 'live_events',
      sourceLabel: 'Live Events & Streams',
      sourceId: PHASE25_NOTION_LIVE_EVENTS_SOURCE_ID_V25,
      viewKey: 'upcoming_events',
      viewLabel: 'Upcoming Events',
      viewId: PHASE25_NOTION_LIVE_EVENTS_VIEW_IDS_V25.upcoming_events,
      defaultLimit: 8,
      maxRows: 20,
      purpose: 'Upcoming events and stream schedule context.'
    },
    {
      packetKey: 'campaign_events',
      sourceKey: 'live_events',
      sourceLabel: 'Live Events & Streams',
      sourceId: PHASE25_NOTION_LIVE_EVENTS_SOURCE_ID_V25,
      viewKey: 'events_by_campaign',
      viewLabel: 'Events by Campaign',
      viewId: PHASE25_NOTION_LIVE_EVENTS_VIEW_IDS_V25.events_by_campaign,
      defaultLimit: 8,
      maxRows: 20,
      purpose: 'Campaign-linked event planning context.'
    },
    {
      packetKey: 'mission_events',
      sourceKey: 'live_events',
      sourceLabel: 'Live Events & Streams',
      sourceId: PHASE25_NOTION_LIVE_EVENTS_SOURCE_ID_V25,
      viewKey: 'events_by_mission',
      viewLabel: 'Events by Mission',
      viewId: PHASE25_NOTION_LIVE_EVENTS_VIEW_IDS_V25.events_by_mission,
      defaultLimit: 8,
      maxRows: 20,
      purpose: 'Mission-linked event and stream context.'
    },
    {
      packetKey: 'followup_event_alerts',
      sourceKey: 'live_events',
      sourceLabel: 'Live Events & Streams',
      sourceId: PHASE25_NOTION_LIVE_EVENTS_SOURCE_ID_V25,
      viewKey: 'followup_required_events',
      viewLabel: 'Follow-Up Required Events',
      viewId: PHASE25_NOTION_LIVE_EVENTS_VIEW_IDS_V25.followup_required_events,
      defaultLimit: 8,
      maxRows: 20,
      purpose: 'Follow-up-needed event context.'
    }
  ];
}

function getPhase25NotionReadRelayPacketV25(packetKey) {
  var normalized = String(packetKey || '').trim();
  var catalog = getPhase25NotionReadRelayPacketCatalogV25();
  for (var i = 0; i < catalog.length; i++) {
    if (catalog[i].packetKey === normalized) return catalog[i];
  }
  return null;
}

function getPhase25NotionReadRelayStubV25(p) {
  p = p || {};
  var packetKey = String(p.packetKey || p.packet_key || '').trim();
  var packet = getPhase25NotionReadRelayPacketV25(packetKey);
  var requestedSourceKey = String(p.sourceKey || p.source_key || '').trim();
  var requestedViewKey = String(p.viewKey || p.view_key || '').trim();
  if (!packet) {
    return jsonResponseV20({
      status: 'review',
      ok: false,
      build: PHASE25_NOTION_READ_RELAY_BUILD_V25,
      phase: '25B',
      mode: 'apps_script_read_relay_stub_only',
      dryRun: true,
      code: 'unknown_packet',
      requestedPacketKey: packetKey || '(missing)',
      allowedPacketKeys: getPhase25NotionReadRelayPacketCatalogV25().map(function(item) { return item.packetKey; }),
      rows: [],
      rowCount: 0,
      protectedBoundary: getPhase25NotionReadRelayProtectedBoundaryV25()
    });
  }
  if (requestedSourceKey && requestedSourceKey !== packet.sourceKey) {
    return jsonResponseV20({
      status: 'review',
      ok: false,
      build: PHASE25_NOTION_READ_RELAY_BUILD_V25,
      phase: '25B',
      mode: 'apps_script_read_relay_stub_only',
      dryRun: true,
      code: 'source_mismatch',
      packetKey: packet.packetKey,
      expectedSourceKey: packet.sourceKey,
      requestedSourceKey: requestedSourceKey,
      rows: [],
      rowCount: 0,
      protectedBoundary: getPhase25NotionReadRelayProtectedBoundaryV25()
    });
  }
  if (requestedViewKey && requestedViewKey !== packet.viewKey) {
    return jsonResponseV20({
      status: 'review',
      ok: false,
      build: PHASE25_NOTION_READ_RELAY_BUILD_V25,
      phase: '25B',
      mode: 'apps_script_read_relay_stub_only',
      dryRun: true,
      code: 'view_mismatch',
      packetKey: packet.packetKey,
      expectedViewKey: packet.viewKey,
      requestedViewKey: requestedViewKey,
      rows: [],
      rowCount: 0,
      protectedBoundary: getPhase25NotionReadRelayProtectedBoundaryV25()
    });
  }
  var requestedLimit = Number(p.limit || packet.defaultLimit || 8);
  var limit = Math.min(Math.max(isNaN(requestedLimit) ? packet.defaultLimit : requestedLimit, 1), packet.maxRows);
  return jsonResponseV20({
    status: 'ok',
    ok: true,
    build: PHASE25_NOTION_READ_RELAY_BUILD_V25,
    phase: '25B',
    mode: 'apps_script_read_relay_stub_only',
    dryRun: true,
    packetKey: packet.packetKey,
    sourceKey: packet.sourceKey,
    sourceLabel: packet.sourceLabel,
    sourceId: packet.sourceId,
    viewKey: packet.viewKey,
    viewLabel: packet.viewLabel,
    viewId: packet.viewId,
    limit: limit,
    rows: [],
    rowCount: 0,
    readAt: new Date().toISOString(),
    purpose: packet.purpose,
    warnings: ['Stub only. No live Notion rows were read in Phase 25.'],
    protectedBoundary: getPhase25NotionReadRelayProtectedBoundaryV25()
  });
}

function getPhase25NotionReadRelayProtectedBoundaryV25() {
  return {
    notionLiveRead: false,
    notionWrite: false,
    sheetsWrite: false,
    driveWrite: false,
    appWrite: false,
    xpAwardWrite: false,
    missionCompletionWrite: false,
    awardExecution: false,
    notificationDispatch: false,
    automationActivation: false,
    workerActivation: false,
    autonomousAction: false,
    playerConsumptionEnabled: false
  };
}

function getPhase26NotionLiveReadProbeV25(p) {
  p = p || {};
  var packetKey = String(p.packetKey || p.packet_key || '').trim();
  var packet = getPhase25NotionReadRelayPacketV25(packetKey);
  var developerProbe = String(p.developerProbe || p.developer_probe || '') === '1';
  var liveProbe = String(p.liveProbe || p.live_probe || '') === '1';
  if (!packet) {
    return jsonResponseV20({
      status: 'review',
      ok: false,
      build: PHASE26_NOTION_LIVE_READ_PROBE_BUILD_V25,
      phase: '26B',
      mode: 'gated_live_read_probe',
      code: 'unknown_packet',
      requestedPacketKey: packetKey || '(missing)',
      allowedPacketKeys: getPhase25NotionReadRelayPacketCatalogV25().map(function(item) { return item.packetKey; }),
      rows: [],
      rowCount: 0,
      protectedBoundary: getPhase26NotionLiveReadProbeBoundaryV25(false)
    });
  }
  if (!developerProbe || !liveProbe) {
    return jsonResponseV20({
      status: 'hold',
      ok: true,
      build: PHASE26_NOTION_LIVE_READ_PROBE_BUILD_V25,
      phase: '26B',
      mode: 'gated_live_read_probe',
      code: 'probe_gate_closed',
      packetKey: packet.packetKey,
      sourceKey: packet.sourceKey,
      sourceLabel: packet.sourceLabel,
      viewKey: packet.viewKey,
      viewLabel: packet.viewLabel,
      rows: [],
      rowCount: 0,
      message: 'Developer probe requires developerProbe=1 and liveProbe=1.',
      protectedBoundary: getPhase26NotionLiveReadProbeBoundaryV25(false)
    });
  }
  var requestedLimit = Number(p.limit || 2);
  var limit = Math.min(Math.max(isNaN(requestedLimit) ? 2 : requestedLimit, 1), 3);
  var read = readPhase26NotionProbeRowsV25(packet, limit);
  return jsonResponseV20({
    status: read.ok ? 'ok' : 'review',
    ok: read.ok === true,
    build: PHASE26_NOTION_LIVE_READ_PROBE_BUILD_V25,
    phase: '26B',
    mode: 'gated_live_read_probe',
    packetKey: packet.packetKey,
    sourceKey: packet.sourceKey,
    sourceLabel: packet.sourceLabel,
    sourceId: packet.sourceId,
    viewKey: packet.viewKey,
    viewLabel: packet.viewLabel,
    viewId: packet.viewId,
    limit: limit,
    rows: read.rows || [],
    rowCount: read.rows ? read.rows.length : 0,
    hasMore: read.hasMore === true,
    code: read.code || '',
    error: read.error || '',
    readAt: new Date().toISOString(),
    protectedBoundary: getPhase26NotionLiveReadProbeBoundaryV25(true)
  });
}

function readPhase26NotionProbeRowsV25(packet, limit) {
  try {
    var secret = PropertiesService.getScriptProperties().getProperty('NOTION_SECRET');
    if (!secret) return { ok: false, code: 'missing_secret', error: 'NOTION_SECRET not set.', rows: [] };
    var payload = { page_size: limit };
    var result = notionQuery(packet.sourceId, payload);
    if (result.code >= 400) {
      return { ok: false, code: String(result.code), error: cellTextV20(result.text || '', 500), rows: [] };
    }
    var parsed = JSON.parse(result.text || '{}');
    var rows = (parsed.results || []).slice(0, limit).map(function(page) {
      return compactPhase26NotionProbePageV25(page);
    });
    return { ok: true, code: String(result.code || 200), rows: rows, hasMore: parsed.has_more === true };
  } catch (err) {
    return { ok: false, code: 'exception', error: err.toString(), rows: [] };
  }
}

function compactPhase26NotionProbePageV25(page) {
  page = page || {};
  var props = page.properties || {};
  var fields = {};
  var count = 0;
  for (var key in props) {
    if (!props.hasOwnProperty(key) || count >= 8) continue;
    var value = readNotionAnyPropertyV20(props[key]);
    if (!value) continue;
    fields[key] = cellTextV20(value, 180);
    count++;
  }
  return {
    id: page.id || '',
    title: readNotionRegistryTitleV20(props) || 'Untitled',
    url: page.url || '',
    fields: fields,
    createdTime: page.created_time || '',
    lastEditedAt: page.last_edited_time || ''
  };
}

function getPhase26NotionLiveReadProbeBoundaryV25(probeRequested) {
  return {
    developerOnly: true,
    readProbeRequested: probeRequested === true,
    writeEnabled: false,
    sheetsWrite: false,
    driveWrite: false,
    appWrite: false,
    xpAwardWrite: false,
    missionCompletionWrite: false,
    awardExecution: false,
    notificationDispatch: false,
    automationActivation: false,
    workerActivation: false,
    autonomousAction: false,
    playerConsumptionEnabled: false
  };
}

function getPhase27NormalizedPacketPreviewV25(p) {
  p = p || {};
  var packetKey = String(p.packetKey || p.packet_key || '').trim();
  var packet = getPhase25NotionReadRelayPacketV25(packetKey);
  if (!packet) {
    return jsonResponseV20(makePhase27NormalizedPacketV25({
      packet: null,
      status: 'error',
      code: 'unknown_packet',
      rows: [],
      error: 'Unknown packet key.',
      warnings: ['Packet key is not in the Phase 25 allowlist.']
    }));
  }
  var developerProbe = String(p.developerProbe || p.developer_probe || '') === '1';
  var liveProbe = String(p.liveProbe || p.live_probe || '') === '1';
  var requestedLimit = Number(p.limit || 2);
  var limit = Math.min(Math.max(isNaN(requestedLimit) ? 2 : requestedLimit, 1), 3);
  if (!developerProbe || !liveProbe) {
    return jsonResponseV20(makePhase27NormalizedPacketV25({
      packet: packet,
      status: 'blocked',
      code: 'probe_gate_closed',
      rows: [],
      warnings: ['Developer live-read probe gate is closed.'],
      limit: limit
    }));
  }
  var read = readPhase26NotionProbeRowsV25(packet, limit);
  var status = read.ok ? ((read.rows || []).length ? 'ok' : 'empty') : 'error';
  return jsonResponseV20(makePhase27NormalizedPacketV25({
    packet: packet,
    status: status,
    code: read.code || '',
    rows: read.rows || [],
    error: read.error || '',
    hasMore: read.hasMore === true,
    limit: limit
  }));
}

function makePhase27NormalizedPacketV25(config) {
  config = config || {};
  var packet = config.packet || {};
  var now = new Date().toISOString();
  var rows = (config.rows || []).map(function(row) {
    return normalizePhase27PacketRowV25(row);
  });
  var packetStatus = config.status || 'blocked';
  var freshness = getPhase27PacketFreshnessV25(packetStatus, now, rows.length);
  var fallback = getPhase27PacketFallbackV25(packetStatus, freshness, rows.length);
  return {
    status: packetStatus,
    ok: packetStatus === 'ok' || packetStatus === 'empty' || packetStatus === 'blocked',
    build: PHASE27_NOTION_PACKET_NORMALIZATION_BUILD_V25,
    phase: '27B',
    mode: 'normalized_packet_preview_developer_only',
    packetKey: packet.packetKey || '',
    source: {
      key: packet.sourceKey || '',
      label: packet.sourceLabel || '',
      id: packet.sourceId || ''
    },
    view: {
      key: packet.viewKey || '',
      label: packet.viewLabel || '',
      id: packet.viewId || ''
    },
    rows: rows,
    rowCount: rows.length,
    hasMore: config.hasMore === true,
    limit: config.limit || 0,
    lastReadAt: now,
    freshness: freshness,
    warnings: (config.warnings || []).concat(getPhase27PacketWarningsV25(packetStatus, freshness, rows.length)),
    fallback: fallback,
    playerSafe: 'shape_only',
    playerConsumptionEnabled: false,
    code: config.code || '',
    error: config.error || '',
    protectedBoundary: getPhase27PacketNormalizationBoundaryV25()
  };
}

function normalizePhase27PacketRowV25(row) {
  row = row || {};
  var fields = row.fields || {};
  return {
    id: row.id || '',
    title: row.title || firstPhase27FieldValueV25(fields, ['Name', 'Task Name', 'Event Name', 'Title']) || 'Untitled',
    status: firstPhase27FieldValueV25(fields, ['Status', 'Ready To', 'Stage']) || '',
    date: firstPhase27FieldValueV25(fields, ['Date', 'Due Date', 'Start Date', 'Follow Up Date']) || '',
    type: firstPhase27FieldValueV25(fields, ['Type', 'Object Type', 'Source Type', 'Category']) || '',
    priority: firstPhase27FieldValueV25(fields, ['Priority', 'Impact', 'Context Weight']) || '',
    summary: firstPhase27FieldValueV25(fields, ['Summary', 'Short Summary', 'Description', 'Notes', 'Purpose']) || '',
    url: row.url || '',
    lastEditedAt: row.lastEditedAt || row.last_edited_time || ''
  };
}

function firstPhase27FieldValueV25(fields, keys) {
  fields = fields || {};
  for (var i = 0; i < keys.length; i++) {
    if (fields[keys[i]]) return cellTextV20(fields[keys[i]], 220);
  }
  return '';
}

function getPhase27PacketFreshnessV25(status, lastReadAt, rowCount) {
  if (status === 'blocked') return 'blocked';
  if (status === 'error') return 'error';
  if (rowCount === 0) return 'empty';
  var ageMs = new Date().getTime() - new Date(lastReadAt).getTime();
  var ageMinutes = isNaN(ageMs) ? 9999 : Math.max(0, Math.round(ageMs / 60000));
  if (ageMinutes <= 15) return 'fresh';
  if (ageMinutes <= 60) return 'aging';
  return 'stale';
}

function getPhase27PacketWarningsV25(status, freshness, rowCount) {
  var warnings = [];
  if (status === 'blocked') warnings.push('Probe gate is closed.');
  if (status === 'error') warnings.push('Source needs developer review.');
  if (freshness === 'empty') warnings.push('No rows returned for this packet.');
  if (freshness === 'aging') warnings.push('Packet should be refreshed soon.');
  if (freshness === 'stale') warnings.push('Packet is stale and should not be used for player UI.');
  if (rowCount > 3) warnings.push('Packet exceeded the Phase 27 row cap.');
  return warnings;
}

function getPhase27PacketFallbackV25(status, freshness, rowCount) {
  if (status === 'blocked') return { state: 'blocked', copy: 'This source is waiting for a developer read check.' };
  if (status === 'error') return { state: 'error', copy: 'This source needs review before it can support the app.' };
  if (freshness === 'empty' || rowCount === 0) return { state: 'empty', copy: 'Nothing is queued here right now.' };
  if (freshness === 'stale') return { state: 'stale', copy: 'This packet is old. Refresh it before using it.' };
  if (freshness === 'aging') return { state: 'aging', copy: 'This packet is usable, but close to needing a refresh.' };
  return { state: 'fresh', copy: 'Fresh packet ready for developer review.' };
}

function getPhase27PacketNormalizationBoundaryV25() {
  return {
    developerOnly: true,
    normalizedShapeReady: true,
    playerConsumptionEnabled: false,
    writeEnabled: false,
    notionWrite: false,
    sheetsWrite: false,
    driveWrite: false,
    appWrite: false,
    xpAwardWrite: false,
    missionCompletionWrite: false,
    awardExecution: false,
    notificationDispatch: false,
    automationActivation: false,
    workerActivation: false,
    autonomousAction: false
  };
}

function getPhase28PacketReadbackQAV25(p) {
  p = p || {};
  var packetKey = String(p.packetKey || p.packet_key || '').trim();
  var catalog = getPhase25NotionReadRelayPacketCatalogV25();
  var rows = catalog.map(function(packet) {
    var normalized = makePhase27NormalizedPacketV25({
      packet: packet,
      status: 'blocked',
      code: 'qa_matrix_gate_closed',
      rows: [],
      warnings: ['Phase 28 QA matrix preview. Developer probe gate is closed.'],
      limit: 0
    });
    if (packetKey && packet.packetKey === packetKey && String(p.developerProbe || p.developer_probe || '') === '1' && String(p.liveProbe || p.live_probe || '') === '1') {
      var probeLimit = Math.min(Math.max(Number(p.limit || 2), 1), 3);
      var read = readPhase26NotionProbeRowsV25(packet, probeLimit);
      normalized = makePhase27NormalizedPacketV25({
        packet: packet,
        status: read.ok ? ((read.rows || []).length ? 'ok' : 'empty') : 'error',
        code: read.code || '',
        rows: read.rows || [],
        error: read.error || '',
        hasMore: read.hasMore === true,
        limit: probeLimit
      });
    }
    return makePhase28PacketReadbackRowV25(packet, normalized);
  });
  var issueCount = rows.reduce(function(total, row) { return total + row.issueCount; }, 0);
  return jsonResponseV20({
    status: issueCount ? 'review' : 'ok',
    ok: true,
    build: PHASE28_NOTION_PACKET_QA_BUILD_V25,
    phase: '28B',
    mode: 'packet_readback_qa_developer_only',
    packetCount: rows.length,
    matrix: rows,
    trustRules: getPhase28SourceTrustRulesV25(),
    requiredFields: getPhase28RequiredFieldsV25(),
    errorCases: getPhase28ErrorCaseCatalogV25(),
    issueCount: issueCount,
    playerConsumptionEnabled: false,
    protectedBoundary: getPhase28PacketQABoundaryV25()
  });
}

function makePhase28PacketReadbackRowV25(packet, normalized) {
  var qa = checkPhase28NormalizedPacketShapeV25(normalized);
  var trust = getPhase28SourceTrustV25(normalized, qa);
  return {
    packetKey: packet.packetKey || '',
    sourceKey: packet.sourceKey || '',
    sourceLabel: packet.sourceLabel || '',
    viewKey: packet.viewKey || '',
    viewLabel: packet.viewLabel || '',
    status: normalized.status || '',
    freshness: normalized.freshness || '',
    rowCount: normalized.rowCount || 0,
    fallbackState: normalized.fallback && normalized.fallback.state ? normalized.fallback.state : '',
    warnings: normalized.warnings || [],
    playerSafe: normalized.playerSafe || 'shape_only',
    trust: trust,
    sourceConfirmed: !!(packet.sourceId && normalized.source && normalized.source.id === packet.sourceId),
    viewConfirmed: !!(packet.viewId && normalized.view && normalized.view.id === packet.viewId),
    issueCount: qa.issueCount,
    issues: qa.issues
  };
}

function getPhase28SourceTrustRulesV25() {
  return [
    { key: 'verified', meaning: 'Canonical source and view are expected, packet shape is clean, and fresh rows exist.' },
    { key: 'limited', meaning: 'Source is valid, but the packet is empty or aging.' },
    { key: 'stale', meaning: 'Packet is old and should not support player UI yet.' },
    { key: 'blocked', meaning: 'Developer probe gate is closed.' },
    { key: 'review', meaning: 'Unknown packet, mismatch, error, unsafe shape, or malformed row needs review.' }
  ];
}

function getPhase28SourceTrustV25(packet, qa) {
  if (!packet || qa.issueCount) return 'review';
  if (packet.status === 'error') return 'review';
  if (packet.freshness === 'blocked') return 'blocked';
  if (packet.freshness === 'stale') return 'stale';
  if (packet.freshness === 'empty' || packet.freshness === 'aging') return 'limited';
  if (packet.freshness === 'fresh' && packet.rowCount > 0) return 'verified';
  return 'review';
}

function getPhase28RequiredFieldsV25() {
  return {
    packet: ['packetKey', 'source', 'view', 'rows', 'rowCount', 'lastReadAt', 'freshness', 'status', 'warnings', 'fallback', 'playerSafe'],
    row: ['id', 'title', 'status', 'date', 'type', 'priority', 'summary', 'url', 'lastEditedAt']
  };
}

function checkPhase28NormalizedPacketShapeV25(packet) {
  packet = packet || {};
  var required = getPhase28RequiredFieldsV25();
  var issues = [];
  required.packet.forEach(function(field) {
    if (!packet.hasOwnProperty(field)) issues.push('missing packet field: ' + field);
  });
  if (!Array.isArray(packet.rows)) issues.push('rows is not an array');
  (packet.rows || []).forEach(function(row, index) {
    required.row.forEach(function(field) {
      if (!row.hasOwnProperty(field)) issues.push('row ' + (index + 1) + ' missing field: ' + field);
    });
  });
  if (packet.playerConsumptionEnabled === true) issues.push('player consumption unexpectedly enabled');
  return { ok: issues.length === 0, issueCount: issues.length, issues: issues };
}

function getPhase28ErrorCaseCatalogV25() {
  return [
    { key: 'unknown_packet', expected: 'review', fallback: 'This source needs review before it can support the app.' },
    { key: 'source_mismatch', expected: 'review', fallback: 'This source needs review before it can support the app.' },
    { key: 'view_mismatch', expected: 'review', fallback: 'This source needs review before it can support the app.' },
    { key: 'empty_rows', expected: 'limited', fallback: 'Nothing is queued here right now.' },
    { key: 'stale_rows', expected: 'stale', fallback: 'This packet is old. Refresh it before using it.' },
    { key: 'missing_secret', expected: 'review', fallback: 'This source needs review before it can support the app.' },
    { key: 'notion_error', expected: 'review', fallback: 'This source needs review before it can support the app.' },
    { key: 'malformed_row_shape', expected: 'review', fallback: 'This source needs review before it can support the app.' }
  ];
}

function getPhase28PacketQABoundaryV25() {
  return {
    developerOnly: true,
    matrixReady: true,
    trustRulesReady: true,
    packetShapeQAReady: true,
    errorCaseQAReady: true,
    playerConsumptionEnabled: false,
    writeEnabled: false,
    notionWrite: false,
    sheetsWrite: false,
    driveWrite: false,
    appWrite: false,
    xpAwardWrite: false,
    missionCompletionWrite: false,
    awardExecution: false,
    notificationDispatch: false,
    automationActivation: false,
    workerActivation: false,
    autonomousAction: false
  };
}

function ok(msg) { return ContentService.createTextOutput(JSON.stringify({ status: 'ok', message: msg })).setMimeType(ContentService.MimeType.JSON); }
function error(msg) { return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: msg })).setMimeType(ContentService.MimeType.JSON); }

function authorizeNotionFetch() {
  UrlFetchApp.fetch('https://api.notion.com/v1/users/me', { method: 'get', headers: { Authorization: 'Bearer test' }, muteHttpExceptions: true });
}

function testTargetSpreadsheetRouting() {
  var targetId = String(PropertiesService.getScriptProperties().getProperty(TARGET_SPREADSHEET_PROPERTY) || '').trim();
  var ss = getMoneyMissionSpreadsheet();
  Logger.log(JSON.stringify({
    ok: true,
    spreadsheetName: ss.getName(),
    spreadsheetId: ss.getId(),
    source: targetId ? 'script_property' : 'active_bound'
  }));
}

function getInstagramData(e) {
  var token = PropertiesService.getScriptProperties().getProperty('META_TOKEN');
  if (!token) return error('META_TOKEN not set.');
  var accountRes = UrlFetchApp.fetch('https://graph.instagram.com/me?fields=id,username,account_type,media_count&access_token=' + token, { muteHttpExceptions: true });
  var account = JSON.parse(accountRes.getContentText());
  var mediaRes = UrlFetchApp.fetch('https://graph.instagram.com/me/media?fields=id,caption,media_type,timestamp,permalink&limit=10&access_token=' + token, { muteHttpExceptions: true });
  var mediaData = JSON.parse(mediaRes.getContentText());
  var posts = ((mediaData.data) || []).map(function(post) {
    return { id: post.id, caption: (post.caption || '').slice(0, 120), type: post.media_type,
      timestamp: post.timestamp, likes: 0, comments: 0, url: post.permalink };
  });
  return ContentService.createTextOutput(JSON.stringify({ status: 'ok', account: account, posts: posts, insights: {} })).setMimeType(ContentService.MimeType.JSON);
}

// ── SMOKE TESTS ────────────────────────────────────────────
function testDailySave() {
  var resAdd = saveDailySnapshot({ date: Utilities.formatDate(new Date(), 'UTC', 'yyyy-MM-dd'), mode: 'add', dms: 5, money: 10 });
  Logger.log('Daily after add: ' + JSON.stringify(resAdd));
}

function testProspectSave() {
  var id = 'test-' + Date.now();
  var r = saveProspectSnapshot({ id: id, stageName: 'TestArtist', source: 'cold call', stage: 'New' });
  Logger.log('Prospect saved: ' + JSON.stringify(r));
}

function testResetTestData() {
  var r = resetTestData({ daily: true, prospects: true, reason: 'smoke test via Apps Script editor' });
  Logger.log('Reset result: ' + JSON.stringify(r));
}

function testOsProfileDeviceRegistryV20() {
  var profile = saveOsProfileIndexV20({
    profileId: 'a1xx-primary',
    displayName: 'A1XX',
    role: 'Executive Producer',
    timezone: 'America/New_York',
    preferredRoutes: 'sales,pipeline,manager',
    buildChannel: 'v2_5',
    activeDeviceId: 'device_smoke_test',
    latestBackupMarker: 'backup_smoke_test',
    latestBackupSheetRow: 0,
    latestBackupSize: 0,
    status: 'Active',
    notes: 'Manual Apps Script smoke test.'
  });
  var device = saveOsDeviceRegistryV20({
    profileId: 'a1xx-primary',
    deviceId: 'device_smoke_test',
    deviceLabel: 'Smoke Test Device',
    deviceType: 'browser',
    lastAnchorCheckAt: new Date().toISOString(),
    lastBackupMarker: 'backup_smoke_test',
    lastBackupSheetRow: 0,
    trustedStatus: 'Trusted',
    buildToken: 'manual-smoke',
    appFile: 'money-mission-tracker-v2_5.html',
    status: 'Active',
    notes: 'Should remain Pending unless manually trusted in the Sheet.'
  });
  var setupPointers = getOsSetupPointersSheetV20();
  Logger.log(JSON.stringify({
    profile: profile,
    device: device,
    setupPointers: {
      sheetName: setupPointers.getName(),
      rows: setupPointers.getLastRow(),
      headers: OS_SETUP_POINTER_HEADERS.length
    }
  }));
}

function testCycleArchiveSync() {
  var payload = {
    cycleNum: 1,
    cycleName: 'CEO Roadmap',
    cycleDates: '2026-05-05 → 2026-06-28',
    cycleStart: '2026-05-05',
    cycleEnd: '2026-06-28',
    cycleTarget: 20000,
    daysElapsed: 14,
    revenue: 10,
    totalExpenses: 0,
    netProfit: 10,
    margin: 100,
    roas: 0,
    dailyPace: 0.71,
    sessions: 0,
    cumDms: 0,
    cumPosts: 0,
    studioCommission: 0,
    mixMaster: 0,
    rapreneurOS: 0,
    productionDeals: 0,
    customBeats: 0,
    otherIncome: 0,
    noteWin: 'Manual archive sync test',
    noteLesson: 'Triggered from Apps Script editor'
  };
  var row = archiveCycle(payload);
  var notion = syncCycleArchiveToNotion(row, payload);
  logActivity('Cycle archive manual test — code: ' + (notion && notion.code ? notion.code : 'unknown'));
  Logger.log(JSON.stringify({ row: row, notion: notion }));
}

// ── MISSION COMMAND STAGE 4 ROUTE-UNEXPOSED PREPARATION ────
// Local fake/stubbed preparation only. This section is intentionally absent from
// doGet/doPost, editor wrappers, menus, triggers, workers, HTML, and live adapters.
var MC_STAGE4_LOCAL_BUILD = 'mmos-20260713-stage4-route-unexposed-fake-stubbed-preparation';
var MC_STAGE4_CONTRACT_VERSION = 'mc_stage_4_read_stage_v1';
var MC_STAGE4_LOCK_TIMEOUT_MS = 3000;
var MC_STAGE4_SESSION_TTL_SECONDS = 900;
var MC_STAGE4_TRUST_FRESHNESS_SECONDS = 300;
var MC_STAGE4_IDEMPOTENCY_RETENTION_DAYS = 90;
var MC_STAGE4_JOURNAL_OBJECT = 'Mission Command Stage 4 Mutation Journal';
var MC_STAGE4_SESSION_OBJECT = 'Mission Command Stage 4 Sessions';
var MC_STAGE4_TRUST_OBJECT = 'Mission Command Stage 4 Trust Summary';
var MC_STAGE4_FLAGS = {
  mc_stage_4_master_enabled: false,
  mc_stage_4_presence_enabled: false,
  mc_stage_4_runtime_controls_enabled: false,
  mc_stage_4_inbox_enabled: false,
  mc_stage_4_staged_work_enabled: false,
  mc_stage_4_return_brief_enabled: false,
  mc_stage_4_mentions_labeled_turns_enabled: false,
  mc_stage_4_receipts_enabled: false,
  mc_stage_4_model_composition_enabled: false
};
var MC_STAGE4_LEGACY_GUARDS = [
  'mc_phase_4_runtime_visible_controls',
  'mc_phase_4_inbox_visible_mutations',
  'mc_phase_4_staged_work_mutations',
  'mc_phase_4_read_and_stage_beta'
];
var MC_STAGE4_SESSION_HEADERS = [
  'session_id', 'token_hash', 'token_hash_algorithm', 'profile_id', 'device_id',
  'trust_revision', 'capability_set', 'issued_at', 'expires_at', 'revoked_at',
  'revoked_reason', 'last_nonce', 'created_by', 'contract_version'
];
var MC_STAGE4_TRUST_HEADERS = [
  'profile_id', 'device_id', 'profile_status', 'device_status', 'trust_state',
  'trust_revision', 'capability_ceiling', 'source_profile_etag', 'source_device_etag',
  'materialized_at', 'fresh_until', 'revoked_at', 'updated_by', 'contract_version'
];
var MC_STAGE4_JOURNAL_HEADERS = [
  'journal_id', 'request_id', 'request_fingerprint_sha256', 'profile_id', 'device_id',
  'session_id', 'capability', 'target_type', 'target_id', 'source_version', 'source_etag',
  'destination_version', 'destination_etag', 'source_state', 'destination_state',
  'safe_state_delta_json', 'receipt_type', 'safe_result_json', 'result_code',
  'contract_version', 'created_at', 'retention_due_at'
];
var MC_STAGE4_CAPABILITY_FLAGS = {
  mc_stage_4_presence_heartbeat: 'mc_stage_4_presence_enabled',
  stage4_runtime_control: 'mc_stage_4_runtime_controls_enabled',
  stage4_inbox_mutate: 'mc_stage_4_inbox_enabled',
  stage4_staged_work_confirm_or_park: 'mc_stage_4_staged_work_enabled'
};
var MC_STAGE4_TRANSITIONS = {
  runtime: {
    off: ['configuring'], configuring: ['error_safe_mode', 'off'],
    active: ['sleeping', 'snoozed', 'error_safe_mode', 'off'],
    sleeping: ['active', 'error_safe_mode', 'off'], snoozed: ['active', 'error_safe_mode', 'off'],
    returning: ['active', 'error_safe_mode', 'off'], error_safe_mode: ['off', 'sleeping'],
    disabled_by_kill_switch: ['off']
  },
  inbox: {
    unread: ['read', 'snoozed', 'resolved'], read: ['snoozed', 'resolved'],
    snoozed: ['unread', 'read', 'resolved']
  },
  staged_work: { draft: ['ready', 'parked'], ready: ['parked'], parked: ['ready', 'parked'] }
};
var MC_STAGE4_DENIED_SAFE_FIELDS = [
  'token', 'nonce', 'credential', 'raw_content', 'prompt', 'transcript', 'private_payload',
  'provider_data', 'hidden_reasoning', 'raw_error_body', 'related_job_id'
];

function canonicalizeMissionCommandStage4Local(value) {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(canonicalizeMissionCommandStage4Local);
  var out = {};
  Object.keys(value).sort().forEach(function(key) {
    out[key] = canonicalizeMissionCommandStage4Local(value[key]);
  });
  return out;
}

function makeMissionCommandStage4LocalBlocked(code, detail, extra) {
  var out = { ok: false, code: code, safe_message: detail || code, retry_later: false };
  Object.keys(extra || {}).forEach(function(key) { out[key] = extra[key]; });
  return out;
}

function resolveMissionCommandStage4LocalGuard(capability, suppliedFlags) {
  suppliedFlags = suppliedFlags || {};
  var keys = Object.keys(suppliedFlags);
  if (keys.some(function(key) { return MC_STAGE4_LEGACY_GUARDS.indexOf(key) !== -1; })) {
    return makeMissionCommandStage4LocalBlocked('legacy_guard_denied', 'Legacy Stage 4 guards confer no authority.', { adapter_calls: 0 });
  }
  var capabilityFlag = MC_STAGE4_CAPABILITY_FLAGS[capability];
  if (!capabilityFlag) return makeMissionCommandStage4LocalBlocked('unknown_capability', 'Unknown Stage 4 capability.', { adapter_calls: 0 });
  if (suppliedFlags.mc_stage_4_master_enabled !== true || suppliedFlags[capabilityFlag] !== true) {
    return makeMissionCommandStage4LocalBlocked('feature_disabled', 'Stage 4 capability is disabled.', { adapter_calls: 0 });
  }
  return { ok: true, capability_flag: capabilityFlag };
}

function validateMissionCommandStage4LocalExactHeaders(actual, expected) {
  if (!Array.isArray(actual) || actual.length !== expected.length) return false;
  for (var i = 0; i < expected.length; i++) if (actual[i] !== expected[i]) return false;
  return true;
}

function preflightMissionCommandStage4Local(input, adapters, immutableHeadersOnly) {
  if (!input || input.contract_version !== MC_STAGE4_CONTRACT_VERSION) return makeMissionCommandStage4LocalBlocked('schema_upgrade_required', 'Exact Stage 4 contract version required.');
  var required = ['request_id', 'profile_id', 'device_id', 'session_id', 'capability', 'target_type', 'target_id', 'expected_version', 'expected_etag', 'source_state', 'destination_state'];
  for (var i = 0; i < required.length; i++) if (input[required[i]] === undefined || input[required[i]] === '') return makeMissionCommandStage4LocalBlocked('invalid_request', 'Missing required Stage 4 field: ' + required[i]);
  var headerBundle = immutableHeadersOnly ? {
    sessions: MC_STAGE4_SESSION_HEADERS,
    trust: MC_STAGE4_TRUST_HEADERS,
    journal: MC_STAGE4_JOURNAL_HEADERS
  } : adapters.schema.getHeaders();
  if (!headerBundle || !validateMissionCommandStage4LocalExactHeaders(headerBundle.sessions, MC_STAGE4_SESSION_HEADERS) ||
      !validateMissionCommandStage4LocalExactHeaders(headerBundle.trust, MC_STAGE4_TRUST_HEADERS) ||
      !validateMissionCommandStage4LocalExactHeaders(headerBundle.journal, MC_STAGE4_JOURNAL_HEADERS)) {
    return makeMissionCommandStage4LocalBlocked('schema_upgrade_required', 'Exact Stage 4 headers required.');
  }
  return { ok: true };
}

function validateMissionCommandStage4LocalTrust(input, trustRows, nowMs) {
  if (!Array.isArray(trustRows) || trustRows.length !== 1) return makeMissionCommandStage4LocalBlocked('untrusted_device', 'Unique Trust Summary row required.');
  var row = trustRows[0];
  var ceiling = Array.isArray(row.capability_ceiling) ? row.capability_ceiling : [];
  if (row.profile_id !== input.profile_id || row.device_id !== input.device_id || row.profile_status !== 'active' || row.device_status !== 'active' ||
      row.trust_state !== 'trusted' || row.revoked_at || Number(new Date(row.fresh_until)) <= nowMs || row.trust_revision !== input.trust_revision || ceiling.indexOf(input.capability) === -1) {
    return makeMissionCommandStage4LocalBlocked('untrusted_device', 'Fresh trusted Stage 4 summary required.');
  }
  return { ok: true, row: row };
}

function validateMissionCommandStage4LocalSession(input, record, tokenHash, nowMs) {
  if (!record || record.token_hash !== tokenHash || record.profile_id !== input.profile_id || record.device_id !== input.device_id ||
      record.trust_revision !== input.trust_revision || Number(new Date(record.expires_at)) <= nowMs || record.revoked_at ||
      (record.capability_set || []).indexOf(input.capability) === -1) {
    return makeMissionCommandStage4LocalBlocked('auth_invalid', 'Valid Stage 4 session required.');
  }
  return { ok: true };
}

function validateMissionCommandStage4LocalTransition(targetType, sourceState, destinationState) {
  var allowed = MC_STAGE4_TRANSITIONS[targetType] && MC_STAGE4_TRANSITIONS[targetType][sourceState];
  return !!allowed && allowed.indexOf(destinationState) !== -1;
}

function validateMissionCommandStage4LocalSafeDelta(delta) {
  if (!delta || typeof delta !== 'object' || Array.isArray(delta)) return false;
  var serialized = JSON.stringify(delta);
  if (MC_STAGE4_DENIED_SAFE_FIELDS.some(function(key) { return Object.prototype.hasOwnProperty.call(delta, key); })) return false;
  return !/dispatch|agent[_ ]?job|agent[_ ]?return|provider|source[_ ]?read|external[_ ]?write/i.test(serialized);
}

function fingerprintMissionCommandStage4Local(input, adapters) {
  var stable = {
    contract_version: input.contract_version, capability: input.capability,
    profile_id: input.profile_id, device_id: input.device_id, session_id: input.session_id,
    target_type: input.target_type, target_id: input.target_id,
    expected_version: input.expected_version, expected_etag: input.expected_etag,
    allowed_mutation_fields: canonicalizeMissionCommandStage4Local(input.allowed_mutation_fields || {})
  };
  return adapters.crypto.sha256(JSON.stringify(canonicalizeMissionCommandStage4Local(stable)));
}

function foldMissionCommandStage4LocalJournal(base, rows, targetType, targetId) {
  var current = { version: Number(base.version || 0), etag: String(base.etag || ''), state: String(base.state || '') };
  var applicable = (rows || []).filter(function(row) { return row.target_type === targetType && row.target_id === targetId; }).slice();
  applicable.sort(function(a, b) {
    return Number(a.destination_version) - Number(b.destination_version) || String(a.created_at).localeCompare(String(b.created_at)) || String(a.journal_id).localeCompare(String(b.journal_id));
  });
  var seen = {};
  for (var i = 0; i < applicable.length; i++) {
    var row = applicable[i];
    if (!row.journal_id || seen[row.journal_id] || row.contract_version !== MC_STAGE4_CONTRACT_VERSION ||
        Number(row.source_version) !== current.version || String(row.source_etag) !== current.etag ||
        Number(row.destination_version) !== current.version + 1 || !row.destination_etag) {
      return makeMissionCommandStage4LocalBlocked('reconciliation_required', 'Journal discontinuity detected.', { affected_target: targetType + ':' + targetId });
    }
    seen[row.journal_id] = true;
    current = { version: Number(row.destination_version), etag: String(row.destination_etag), state: String(row.destination_state) };
  }
  return { ok: true, state: current, rows_folded: applicable.length };
}

function mintMissionCommandStage4LocalSession(input, adapters) {
  if (!input || input.same_origin_assertion !== true) return makeMissionCommandStage4LocalBlocked('auth_missing', 'Trusted same-origin assertion required.');
  var nowMs = adapters.clock.nowMs();
  var trust = validateMissionCommandStage4LocalTrust(input, adapters.trust.lookup(input.profile_id, input.device_id), nowMs);
  if (!trust.ok) return trust;
  var bytes = adapters.random.bytes(32);
  if (!bytes || bytes.length < 32) return makeMissionCommandStage4LocalBlocked('randomness_insufficient', 'At least 256 random bits required.');
  var rawToken = adapters.crypto.encodeToken(bytes);
  var record = {
    session_id: adapters.random.id('stage4_session'), token_hash: adapters.crypto.sha256(rawToken), token_hash_algorithm: 'SHA-256',
    profile_id: input.profile_id, device_id: input.device_id, trust_revision: input.trust_revision,
    capability_set: (input.capability_set || []).slice(), issued_at: new Date(nowMs).toISOString(),
    expires_at: new Date(nowMs + MC_STAGE4_SESSION_TTL_SECONDS * 1000).toISOString(), revoked_at: '', revoked_reason: '',
    last_nonce: '', created_by: MC_STAGE4_LOCAL_BUILD, contract_version: MC_STAGE4_CONTRACT_VERSION
  };
  adapters.sessions.append(record);
  return { ok: true, code: 'session_minted', session_id: record.session_id, raw_token: rawToken, expires_at: record.expires_at };
}

function coordinateMissionCommandStage4LocalMutation(input, adapters) {
  var guard = resolveMissionCommandStage4LocalGuard(input && input.capability, input && input.flags);
  if (!guard.ok) return guard;
  if (input.capability === 'mc_presence_heartbeat' || input.phase_3_heartbeat_selected === true) return makeMissionCommandStage4LocalBlocked('heartbeat_phase_ambiguity', 'Historical Phase 3 heartbeat is non-selectable.', { adapter_calls: 0 });
  var preflight = preflightMissionCommandStage4Local(input, adapters, true);
  if (!preflight.ok) return preflight;
  var nowMs = adapters.clock.nowMs();
  var tokenHash = adapters.crypto.sha256(input.raw_token || '');
  var session = validateMissionCommandStage4LocalSession(input, adapters.sessions.lookup(input.session_id), tokenHash, nowMs);
  if (!session.ok) return session;
  var trust = validateMissionCommandStage4LocalTrust(input, adapters.trust.lookup(input.profile_id, input.device_id), nowMs);
  if (!trust.ok) return trust;
  if (!validateMissionCommandStage4LocalSafeDelta(input.allowed_mutation_fields || {})) return makeMissionCommandStage4LocalBlocked('invalid_request', 'Unsafe Stage 4 mutation fields denied.');
  if (!validateMissionCommandStage4LocalTransition(input.target_type, input.source_state, input.destination_state)) return makeMissionCommandStage4LocalBlocked('state_conflict', 'Stage 4 transition denied.');
  var fingerprint = fingerprintMissionCommandStage4Local(input, adapters);
  var existing = adapters.journal.findRequest(input.request_id);
  if (existing) {
    if (existing.request_fingerprint_sha256 === fingerprint) return JSON.parse(existing.safe_result_json);
    return makeMissionCommandStage4LocalBlocked('idempotency_key_reused', 'Request ID already used with different content.');
  }
  if (adapters.journal.findNonce(input.nonce)) return makeMissionCommandStage4LocalBlocked('replay_blocked', 'Nonce replay blocked.');
  var folded = foldMissionCommandStage4LocalJournal(adapters.baseState.get(input.target_type, input.target_id), adapters.journal.listTarget(input.target_type, input.target_id), input.target_type, input.target_id);
  if (!folded.ok) return folded;
  if (folded.state.version !== Number(input.expected_version) || folded.state.etag !== String(input.expected_etag) || folded.state.state !== input.source_state) {
    return makeMissionCommandStage4LocalBlocked('state_conflict', 'Refetch required.', {
      http_status: 409, current_version: folded.state.version, current_etag: folded.state.etag,
      conflict_code: 'etag_or_version_mismatch', refetch_required: true, request_id: input.request_id
    });
  }
  var locked = false;
  try {
    locked = adapters.lock.tryLock(MC_STAGE4_LOCK_TIMEOUT_MS) === true;
    if (!locked) return makeMissionCommandStage4LocalBlocked('runtime_busy', 'Runtime busy.', { retry_later: true });
    existing = adapters.journal.findRequest(input.request_id);
    if (existing) {
      if (existing.request_fingerprint_sha256 === fingerprint) return JSON.parse(existing.safe_result_json);
      return makeMissionCommandStage4LocalBlocked('idempotency_key_reused', 'Request ID already used with different content.');
    }
    if (adapters.journal.findNonce(input.nonce)) return makeMissionCommandStage4LocalBlocked('replay_blocked', 'Nonce replay blocked.');
    folded = foldMissionCommandStage4LocalJournal(adapters.baseState.get(input.target_type, input.target_id), adapters.journal.listTarget(input.target_type, input.target_id), input.target_type, input.target_id);
    if (!folded.ok) return folded;
    if (folded.state.version !== Number(input.expected_version) || folded.state.etag !== String(input.expected_etag)) return makeMissionCommandStage4LocalBlocked('state_conflict', 'Refetch required.', { http_status: 409, refetch_required: true });
    var destinationVersion = folded.state.version + 1;
    var destinationEtag = adapters.random.id('etag');
    var result = { ok: true, code: 'staged', request_id: input.request_id, target_type: input.target_type, target_id: input.target_id, state: input.destination_state, version: destinationVersion, etag: destinationEtag };
    var row = {
      journal_id: adapters.random.id('journal'), request_id: input.request_id, request_fingerprint_sha256: fingerprint,
      profile_id: input.profile_id, device_id: input.device_id, session_id: input.session_id, capability: input.capability,
      target_type: input.target_type, target_id: input.target_id, source_version: folded.state.version, source_etag: folded.state.etag,
      destination_version: destinationVersion, destination_etag: destinationEtag, source_state: input.source_state,
      destination_state: input.destination_state, safe_state_delta_json: JSON.stringify(canonicalizeMissionCommandStage4Local(input.allowed_mutation_fields || {})),
      receipt_type: input.receipt_type, safe_result_json: JSON.stringify(result), result_code: 'staged',
      contract_version: MC_STAGE4_CONTRACT_VERSION, created_at: new Date(nowMs).toISOString(),
      retention_due_at: new Date(nowMs + MC_STAGE4_IDEMPOTENCY_RETENTION_DAYS * 86400000).toISOString()
    };
    adapters.journal.append(row);
    var readback = adapters.journal.readExact(row.journal_id);
    if (JSON.stringify(canonicalizeMissionCommandStage4Local(readback || {})) !== JSON.stringify(canonicalizeMissionCommandStage4Local(row))) {
      return makeMissionCommandStage4LocalBlocked('reconciliation_required', 'Exact journal readback failed.');
    }
    return result;
  } catch (err) {
    return makeMissionCommandStage4LocalBlocked('runtime_busy', 'Injected Stage 4 adapter failed safely.');
  } finally {
    if (locked) adapters.lock.release();
  }
}

// ── MISSION COMMAND STAGE 4 ROUTE-UNEXPOSED PRODUCTION-ADAPTER PREPARATION ────
// Inert contract and injected interfaces only. No route, wrapper, UI, trigger,
// global service lookup, live object access, retry, fallback, or second write.
var MC_STAGE4_PRODUCTION_ADAPTER_VERSION = 'mc_stage_4_production_adapter_v1';
var MC_STAGE4_PRODUCTION_ASSERTION = {
  issuer: 'a1xx_same_origin_host_session',
  audience: 'money_mission_os_stage_4',
  required_fields: ['issuer', 'audience', 'origin', 'assertion_id', 'profile_id', 'device_id', 'trust_revision', 'capability_set', 'issued_at', 'expires_at'],
  maximum_seconds: 60,
  single_use: true,
  bind_profile_device_trust_revision: true
};
var MC_STAGE4_PRODUCTION_CRYPTO = {
  token_bytes: 32,
  id_nonce_bytes: 16,
  encoding: 'base64url_unpadded',
  token_hash: 'SHA-256',
  token_storage: 'hash_only',
  etag_rule: 'sha256_base64url_of_16_random_bytes'
};
var MC_STAGE4_PRODUCTION_LIMITS = {
  session_ttl_seconds: 900,
  session_retention_days: 90,
  trust_refresh_target_seconds: 120,
  trust_freshness_max_seconds: 300,
  journal_target_rows: 500,
  journal_candidate_rows: 2000,
  journal_pages: 4,
  journal_page_rows: 500,
  prelock_deadline_ms: 1500,
  under_lock_deadline_ms: 1500,
  trusted_profile_device_pairs: 25,
  retained_journal_rows: 25000,
  lock_timeout_ms: 3000,
  safe_delta_utf8_bytes: 8192,
  safe_result_utf8_bytes: 4096
};
var MC_STAGE4_PRODUCTION_HEADERS = {
  sessions: MC_STAGE4_SESSION_HEADERS.slice(),
  trust: MC_STAGE4_TRUST_HEADERS.slice(),
  journal: MC_STAGE4_JOURNAL_HEADERS.slice()
};
var MC_STAGE4_PRODUCTION_SAFE_DELTA_FIELDS = [
  'runtime_id', 'visible_surface', 'selected_mission_label', 'selected_project_label',
  'approved_status_counts', 'meaningful_interaction_at', 'last_seen_inbox_cursor',
  'last_seen_return_cursor', 'message_id', 'snooze_until', 'answer_summary',
  'staged_work_id', 'title', 'safe_summary', 'scope', 'origin_agent', 'target_agent'
];
var MC_STAGE4_PRODUCTION_SAFE_RESULT_FIELDS = [
  'ok', 'code', 'safe_message', 'retry_later', 'http_status', 'request_id',
  'target_type', 'target_id', 'state', 'version', 'etag', 'current_version',
  'current_etag', 'conflict_code', 'refetch_required', 'session_id', 'expires_at'
];
var MC_STAGE4_PRODUCTION_FAILURE_HTTP = {
  auth_missing: 401, auth_invalid: 401, untrusted_device: 403,
  feature_disabled: 403, invalid_request: 400, schema_upgrade_required: 409,
  state_conflict: 409, idempotency_key_reused: 409, replay_blocked: 409,
  runtime_busy: 503, capacity_exceeded: 503, reconciliation_required: 503,
  adapter_unavailable: 503, randomness_insufficient: 503
};
var MC_STAGE4_PRODUCTION_BOUNDARIES = {
  flags_default_off: true,
  master_false_dominates: true,
  legacy_guards_deny: true,
  dispatch_allowed: false,
  second_durable_write_allowed: false,
  automatic_retry_allowed: false,
  route_exposed: false
};

function makeMissionCommandStage4ProductionUnavailable(name) {
  return function() { throw new Error('stage4_adapter_unavailable:' + name); };
}

function validateMissionCommandStage4ProductionHeaders(bundle) {
  return !!bundle &&
    validateMissionCommandStage4LocalExactHeaders(bundle.sessions, MC_STAGE4_PRODUCTION_HEADERS.sessions) &&
    validateMissionCommandStage4LocalExactHeaders(bundle.trust, MC_STAGE4_PRODUCTION_HEADERS.trust) &&
    validateMissionCommandStage4LocalExactHeaders(bundle.journal, MC_STAGE4_PRODUCTION_HEADERS.journal);
}

function verifyMissionCommandStage4ProductionAssertion(assertion, expected, handles) {
  if (!handles || !handles.assertions || typeof handles.assertions.verify !== 'function') {
    return makeMissionCommandStage4LocalBlocked('adapter_unavailable', 'Assertion verifier unavailable.');
  }
  var claim;
  try { claim = handles.assertions.verify(assertion); }
  catch (err) { return makeMissionCommandStage4LocalBlocked('auth_invalid', 'Host assertion denied.'); }
  if (!claim || typeof claim !== 'object') return makeMissionCommandStage4LocalBlocked('auth_invalid', 'Host assertion denied.');
  for (var i = 0; i < MC_STAGE4_PRODUCTION_ASSERTION.required_fields.length; i++) {
    var field = MC_STAGE4_PRODUCTION_ASSERTION.required_fields[i];
    if (claim[field] === undefined || claim[field] === '') return makeMissionCommandStage4LocalBlocked('auth_invalid', 'Host assertion denied.');
  }
  var nowMs = handles.clock.nowMs();
  var issuedMs = Number(new Date(claim.issued_at));
  var expiresMs = Number(new Date(claim.expires_at));
  if (claim.issuer !== MC_STAGE4_PRODUCTION_ASSERTION.issuer || claim.audience !== MC_STAGE4_PRODUCTION_ASSERTION.audience ||
      claim.origin !== expected.origin || claim.profile_id !== expected.profile_id || claim.device_id !== expected.device_id ||
      claim.trust_revision !== expected.trust_revision || issuedMs > nowMs || expiresMs <= nowMs ||
      expiresMs - issuedMs > MC_STAGE4_PRODUCTION_ASSERTION.maximum_seconds * 1000) {
    return makeMissionCommandStage4LocalBlocked('auth_invalid', 'Host assertion denied.');
  }
  if (!handles.assertions.consumeOnce(claim.assertion_id)) return makeMissionCommandStage4LocalBlocked('replay_blocked', 'Host assertion replay denied.');
  return { ok: true, claim: claim };
}

function makeMissionCommandStage4ProductionMaterial(kind, handles) {
  var bytesRequired = kind === 'token' ? MC_STAGE4_PRODUCTION_CRYPTO.token_bytes : MC_STAGE4_PRODUCTION_CRYPTO.id_nonce_bytes;
  if (!handles || !handles.random || !handles.crypto) return makeMissionCommandStage4LocalBlocked('adapter_unavailable', 'Secure random adapter unavailable.');
  var bytes;
  try { bytes = handles.random.bytes(bytesRequired); }
  catch (err) { return makeMissionCommandStage4LocalBlocked('randomness_insufficient', 'Secure random generation failed.'); }
  if (!bytes || bytes.length !== bytesRequired) return makeMissionCommandStage4LocalBlocked('randomness_insufficient', 'Exact secure random length required.');
  var encoded;
  try { encoded = handles.crypto.base64url(bytes); }
  catch (err2) { return makeMissionCommandStage4LocalBlocked('randomness_insufficient', 'Secure encoding failed.'); }
  if (!encoded || !/^[A-Za-z0-9_-]+$/.test(encoded) || /=/.test(encoded)) return makeMissionCommandStage4LocalBlocked('randomness_insufficient', 'Unpadded base64url required.');
  var hash = handles.crypto.sha256(encoded);
  if (!hash || !/^[a-f0-9]{64}$/i.test(hash)) return makeMissionCommandStage4LocalBlocked('randomness_insufficient', 'SHA-256 hash required.');
  return { ok: true, raw_once: encoded, hash: hash, bytes: bytesRequired };
}

function makeMissionCommandStage4ProductionEtag(handles) {
  var material = makeMissionCommandStage4ProductionMaterial('id', handles);
  if (!material.ok) return material;
  return { ok: true, etag: material.hash };
}

function missionCommandStage4Utf8Bytes(value) {
  var text = String(value);
  var bytes = 0;
  for (var i = 0; i < text.length; i++) {
    var code = text.charCodeAt(i);
    if (code < 0x80) bytes += 1;
    else if (code < 0x800) bytes += 2;
    else if (code >= 0xD800 && code <= 0xDBFF && i + 1 < text.length) { bytes += 4; i += 1; }
    else bytes += 3;
  }
  return bytes;
}

function validateMissionCommandStage4ProductionSafeJson(value, allowlist, maxBytes) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  var keys = Object.keys(value);
  for (var i = 0; i < keys.length; i++) if (allowlist.indexOf(keys[i]) === -1) return false;
  return missionCommandStage4Utf8Bytes(JSON.stringify(value)) <= maxBytes;
}

function createMissionCommandStage4ProductionAdapters(handles) {
  handles = handles || {};
  var unavailable = makeMissionCommandStage4ProductionUnavailable;
  return {
    assertions: handles.assertions || { verify: unavailable('assertion.verify'), consumeOnce: unavailable('assertion.consumeOnce') },
    random: handles.random || { bytes: unavailable('random.bytes') },
    crypto: handles.crypto || { base64url: unavailable('crypto.base64url'), sha256: unavailable('crypto.sha256') },
    sessions: handles.sessions || { validateHeaders: unavailable('sessions.validateHeaders'), lookupExact: unavailable('sessions.lookupExact'), appendHashOnly: unavailable('sessions.appendHashOnly'), lookupRevocation: unavailable('sessions.lookupRevocation') },
    trust: handles.trust || { validateHeaders: unavailable('trust.validateHeaders'), lookupExactReadOnly: unavailable('trust.lookupExactReadOnly') },
    baseState: handles.baseState || { getBoundedReadOnly: unavailable('baseState.getBoundedReadOnly') },
    journal: handles.journal || { validateHeaders: unavailable('journal.validateHeaders'), findRequestExact: unavailable('journal.findRequestExact'), findNonceExact: unavailable('journal.findNonceExact'), listTargetPage: unavailable('journal.listTargetPage'), appendOne: unavailable('journal.appendOne'), readExact: unavailable('journal.readExact') },
    lock: handles.lock || { tryLock: unavailable('lock.tryLock'), release: unavailable('lock.release') },
    response: handles.response || { safe: makeMissionCommandStage4ProductionSafeResponse },
    bridge: handles.bridge || { readFoldedTarget: unavailable('bridge.readFoldedTarget') },
    clock: handles.clock || { nowMs: unavailable('clock.nowMs') }
  };
}

function makeMissionCommandStage4ProductionSafeResponse(code, extra) {
  var out = { ok: false, code: code, safe_message: code, retry_later: code === 'runtime_busy' };
  out.http_status = MC_STAGE4_PRODUCTION_FAILURE_HTTP[code] || 503;
  Object.keys(extra || {}).forEach(function(key) {
    if (MC_STAGE4_PRODUCTION_SAFE_RESULT_FIELDS.indexOf(key) !== -1) out[key] = extra[key];
  });
  return out;
}

function validateMissionCommandStage4ProductionSession(record, expected, nowMs) {
  return !!record && record.profile_id === expected.profile_id && record.device_id === expected.device_id &&
    record.trust_revision === expected.trust_revision && !record.revoked_at &&
    Number(new Date(record.expires_at)) > nowMs && Number(new Date(record.expires_at)) - Number(new Date(record.issued_at)) === MC_STAGE4_PRODUCTION_LIMITS.session_ttl_seconds * 1000 &&
    record.token_hash_algorithm === MC_STAGE4_PRODUCTION_CRYPTO.token_hash;
}

function validateMissionCommandStage4ProductionJournalBounds(meta) {
  return !!meta && meta.target_rows <= MC_STAGE4_PRODUCTION_LIMITS.journal_target_rows &&
    meta.candidate_rows <= MC_STAGE4_PRODUCTION_LIMITS.journal_candidate_rows &&
    meta.pages <= MC_STAGE4_PRODUCTION_LIMITS.journal_pages &&
    meta.page_rows <= MC_STAGE4_PRODUCTION_LIMITS.journal_page_rows &&
    meta.profile_device_pairs <= MC_STAGE4_PRODUCTION_LIMITS.trusted_profile_device_pairs &&
    meta.retained_rows <= MC_STAGE4_PRODUCTION_LIMITS.retained_journal_rows && meta.complete === true;
}

function readMissionCommandStage4ProductionBridge(targetRef, adapters) {
  if (!targetRef || !adapters || !adapters.bridge || typeof adapters.bridge.readFoldedTarget !== 'function') {
    return makeMissionCommandStage4LocalBlocked('adapter_unavailable', 'Read-only bridge unavailable.');
  }
  var result = adapters.bridge.readFoldedTarget(targetRef);
  return { ok: true, mode: 'folded_read_only', target: result };
}
