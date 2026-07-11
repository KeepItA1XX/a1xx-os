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
      var llmResult = getMissionCommandLlmChatV1(data);
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
    return ok('A1XX Money Mission Tracker Backend is live.');
  } catch (err) {
    logActivity('GET ERROR: ' + err.toString());
    return error(err.toString());
  }
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
    provider: 'nvidia',
    relay: 'apps_script',
    action: 'mission_llm_chat',
    model: payload.model || 'z-ai/glm-5.1',
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
