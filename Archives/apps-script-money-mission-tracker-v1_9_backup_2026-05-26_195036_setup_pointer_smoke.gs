// ============================================================
// A1XX Money Mission Tracker — Google Apps Script Backend
// Version 1.9
// Changes in 1.9 (2026-05-26):
//   - Added Foundation Pass Drive read endpoints for future skill/vault packs.
//   - Added action=read_skill_file, action=list_skill_files, and action=read_vault_file.
//   - Read-only Drive access only; no writes, deletes, or active pack behavior.
//   - Added OS Profile Index / Device Registry metadata endpoints for future
//     cross-device auth foundation. New devices remain Pending by default.
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
      var profileRow = saveOsProfileIndexV19(data);
      logActivity('OS profile index upsert — ' + profileRow.profileId + ' — device ' + (profileRow.activeDeviceId || 'none'));
      return jsonResponseV19({ status: 'ok', row: profileRow });
    }
    if (data.type === 'device_registry_upsert') {
      var deviceRow = saveOsDeviceRegistryV19(data);
      logActivity('OS device registry upsert — ' + deviceRow.deviceId + ' — ' + deviceRow.trustedStatus);
      return jsonResponseV19({ status: 'ok', row: deviceRow });
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
    if (e.parameter.action === 'read_skill_file')     return readSkillFileV19(e);
    if (e.parameter.action === 'list_skill_files')    return listSkillFilesV19(e);
    if (e.parameter.action === 'read_vault_file')     return readVaultFileV19(e);
    if (e.parameter.action === 'profile_index')        return getOsProfileIndexV19(e);
    if (e.parameter.action === 'device_registry')      return getOsDeviceRegistryV19(e);
    if (e.parameter.action === 'setup_pointers')       return getOsSetupPointersV19(e);
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

function cellTextV19(value, maxLen) {
  var text = value === null || value === undefined ? '' : String(value);
  maxLen = maxLen || 1000;
  return text.length > maxLen ? text.slice(0, maxLen) : text;
}

function cellNumberV19(value) {
  var n = Number(value);
  return isNaN(n) ? '' : n;
}

function profileIdV19(value) {
  return cellTextV19(value || 'a1xx-primary', 80);
}

function findRowByFirstColumnV19(sheet, id) {
  if (!sheet || sheet.getLastRow() < 2 || !id) return 0;
  var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0]) === String(id)) return i + 2;
  }
  return 0;
}

function rowToObjectV19(headers, row) {
  var obj = {};
  for (var i = 0; i < headers.length; i++) obj[headers[i]] = row[i];
  return obj;
}

function normalizeTrustedStatusV19(value) {
  var status = cellTextV19(value || 'Pending', 40);
  var allowed = { Pending: 1, Trusted: 1, Review: 1, Revoked: 1, Archived: 1 };
  return allowed[status] ? status : 'Pending';
}

function getOsProfileSheetV19() {
  return getOrCreateSheet(getMoneyMissionSpreadsheet(), SHEET_OS_PROFILE_INDEX, OS_PROFILE_INDEX_HEADERS, {
    matchPrefix: true,
    renameMatched: true
  });
}

function getOsDeviceRegistrySheetV19() {
  return getOrCreateSheet(getMoneyMissionSpreadsheet(), SHEET_OS_DEVICE_REGISTRY, OS_DEVICE_REGISTRY_HEADERS, {
    matchPrefix: true,
    renameMatched: true
  });
}

function getOsSetupPointersSheetV19() {
  return getOrCreateSheet(getMoneyMissionSpreadsheet(), SHEET_OS_SETUP_POINTERS, OS_SETUP_POINTER_HEADERS, {
    matchPrefix: true,
    renameMatched: true
  });
}

function saveOsProfileIndexV19(d) {
  var sheet = getOsProfileSheetV19();
  var profileId = profileIdV19(d.profileId);
  var nowIso = new Date().toISOString();
  var row = [
    profileId,
    cellTextV19(d.displayName || 'A1XX', 120),
    cellTextV19(d.role || 'Executive Producer', 120),
    cellTextV19(d.timezone || 'America/New_York', 80),
    cellTextV19(Array.isArray(d.preferredRoutes) ? d.preferredRoutes.join(',') : (d.preferredRoutes || ''), 250),
    cellTextV19(d.buildChannel || d.build || '', 120),
    cellTextV19(d.activeDeviceId || '', 120),
    cellTextV19(d.latestBackupMarker || d.backupMarker || '', 120),
    cellNumberV19(d.latestBackupSheetRow || d.backupSheetRow),
    cellTextV19(d.latestBackupDriveFileId || d.driveFileId || '', 160),
    cellNumberV19(d.latestBackupSize || d.backupSize),
    cellTextV19(d.lastVerifiedAt || nowIso, 80),
    cellTextV19(d.status || 'Active', 80),
    cellTextV19(d.notes || '', 1000)
  ];
  var targetRow = findRowByFirstColumnV19(sheet, profileId);
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

function saveOsDeviceRegistryV19(d) {
  var sheet = getOsDeviceRegistrySheetV19();
  var deviceId = cellTextV19(d.deviceId || '', 120);
  if (!deviceId) throw new Error('device_registry_upsert: missing deviceId');
  var profileId = profileIdV19(d.profileId);
  var nowIso = new Date().toISOString();
  var targetRow = findRowByFirstColumnV19(sheet, deviceId);
  var existing = targetRow ? sheet.getRange(targetRow, 1, 1, OS_DEVICE_REGISTRY_HEADERS.length).getValues()[0] : null;
  var existingTrusted = existing ? normalizeTrustedStatusV19(existing[9]) : 'Pending';
  var incomingTrusted = normalizeTrustedStatusV19(d.trustedStatus);
  var trustedStatus = existingTrusted;
  if (!existing) trustedStatus = 'Pending';
  else if (existingTrusted === 'Trusted') trustedStatus = 'Trusted';
  else if (incomingTrusted === 'Review' || incomingTrusted === 'Revoked' || incomingTrusted === 'Archived') trustedStatus = incomingTrusted;
  var firstSeen = existing && existing[4] ? existing[4] : (d.firstSeenAt || nowIso);
  var row = [
    deviceId,
    profileId,
    cellTextV19(d.deviceLabel || d.label || '', 120),
    cellTextV19(d.deviceType || 'browser', 80),
    cellTextV19(firstSeen, 80),
    cellTextV19(d.lastSeenAt || nowIso, 80),
    cellTextV19(d.lastAnchorCheckAt || d.lastReadyCheckAt || '', 80),
    cellTextV19(d.lastBackupMarker || d.latestBackupMarker || d.backupMarker || '', 120),
    cellNumberV19(d.lastBackupSheetRow || d.latestBackupSheetRow || d.backupSheetRow),
    trustedStatus,
    cellTextV19(d.trustReason || (trustedStatus === 'Pending' ? 'New device pending manual trust.' : ''), 500),
    cellTextV19(d.buildToken || d.build || '', 160),
    cellTextV19(d.appFile || '', 160),
    cellTextV19(d.status || 'Active', 80),
    cellTextV19(d.notes || '', 1000)
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

function getOsProfileIndexV19(e) {
  var sheet = getOsProfileSheetV19();
  var requested = profileIdV19(e && e.parameter ? e.parameter.profileId : '');
  var targetRow = findRowByFirstColumnV19(sheet, requested);
  if (!targetRow && sheet.getLastRow() >= 2) targetRow = 2;
  if (!targetRow) return jsonResponseV19({ status: 'ok', profile: null, latestBackup: null, activeDevice: null });
  var row = sheet.getRange(targetRow, 1, 1, OS_PROFILE_INDEX_HEADERS.length).getValues()[0];
  var profile = rowToObjectV19(OS_PROFILE_INDEX_HEADERS, row);
  return jsonResponseV19({
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

function getOsDeviceRegistryV19(e) {
  var sheet = getOsDeviceRegistrySheetV19();
  var requested = profileIdV19(e && e.parameter ? e.parameter.profileId : '');
  var rows = [];
  var trustedCount = 0;
  var reviewCount = 0;
  if (sheet.getLastRow() >= 2) {
    var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, OS_DEVICE_REGISTRY_HEADERS.length).getValues();
    for (var i = 0; i < values.length; i++) {
      if (String(values[i][1] || requested) !== requested) continue;
      var item = rowToObjectV19(OS_DEVICE_REGISTRY_HEADERS, values[i]);
      if (item['Trusted Status'] === 'Trusted') trustedCount++;
      if (item['Trusted Status'] === 'Review' || item['Trusted Status'] === 'Pending') reviewCount++;
      rows.push(item);
    }
  }
  return jsonResponseV19({ status: 'ok', profileId: requested, devices: rows, trustedCount: trustedCount, reviewCount: reviewCount });
}

function isSafeSetupPointerTypeV19(type) {
  var safe = {
    'Apps Script Web App URL': 1,
    'Clean Workbook ID': 1,
    'Backup Folder ID': 1,
    'MC Master Config Page ID': 1,
    'Team Chat Database ID': 1,
    'Intelligence HQ Page ID': 1
  };
  return !!safe[cellTextV19(type, 120)];
}

function getOsSetupPointersV19(e) {
  var sheet = getOsSetupPointersSheetV19();
  var rows = [];
  if (sheet.getLastRow() >= 2) {
    var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, OS_SETUP_POINTER_HEADERS.length).getValues();
    for (var i = 0; i < values.length; i++) {
      var item = rowToObjectV19(OS_SETUP_POINTER_HEADERS, values[i]);
      if (String(item.Status || item['Status'] || 'Active') === 'Archived') continue;
      if (!isSafeSetupPointerTypeV19(item['Pointer Type'])) continue;
      rows.push(item);
    }
  }
  return jsonResponseV19({ status: 'ok', pointers: rows });
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

function jsonResponseV19(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload || {}))
    .setMimeType(ContentService.MimeType.JSON);
}

function getDriveFolderByNameV19(folderName) {
  var name = String(folderName || '').trim();
  if (!name) return null;
  var folders = DriveApp.getFoldersByName(name);
  return folders.hasNext() ? folders.next() : null;
}

function getDriveTextFileV19(fileId, fileName, folderName) {
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
  var folder = getDriveFolderByNameV19(folderName);
  if (!folder) throw new Error('Drive folder not found: ' + folderName);
  var files = folder.getFilesByName(name);
  if (!files.hasNext()) throw new Error('Drive file not found: ' + name);
  var file = files.next();
  return {
    file: file,
    text: file.getBlob().getDataAsString()
  };
}

function makeDriveReadPayloadV19(kind, source) {
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

function readSkillFileV19(e) {
  try {
    var p = e.parameter || {};
    var source = getDriveTextFileV19(p.file_id || p.fileId, p.file_name || p.fileName, MC_SKILLS_LIBRARY_FOLDER);
    return jsonResponseV19(makeDriveReadPayloadV19('skill_file', source));
  } catch (err) {
    return jsonResponseV19({ status: 'error', ok: false, kind: 'skill_file', message: err.toString() });
  }
}

function listSkillFilesV19(e) {
  try {
    var p = e.parameter || {};
    var folder = getDriveFolderByNameV19(p.folder_name || p.folderName || MC_SKILLS_LIBRARY_FOLDER);
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
    return jsonResponseV19({
      status: 'ok',
      ok: true,
      storage: 'drive',
      kind: 'skill_file_list',
      folderId: folder.getId(),
      folderName: folder.getName(),
      items: items
    });
  } catch (err) {
    return jsonResponseV19({ status: 'error', ok: false, kind: 'skill_file_list', message: err.toString() });
  }
}

function readVaultFileV19(e) {
  try {
    var p = e.parameter || {};
    var folderName = p.folder_name || p.folderName || MC_MEMORY_VAULT_FOLDER;
    var source = getDriveTextFileV19(p.file_id || p.fileId, p.file_name || p.fileName, folderName);
    return jsonResponseV19(makeDriveReadPayloadV19('vault_file', source));
  } catch (err) {
    return jsonResponseV19({ status: 'error', ok: false, kind: 'vault_file', message: err.toString() });
  }
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

function testOsProfileDeviceRegistryV19() {
  var profile = saveOsProfileIndexV19({
    profileId: 'a1xx-primary',
    displayName: 'A1XX',
    role: 'Executive Producer',
    timezone: 'America/New_York',
    preferredRoutes: 'sales,pipeline,manager',
    buildChannel: 'v2_3',
    activeDeviceId: 'device_smoke_test',
    latestBackupMarker: 'backup_smoke_test',
    latestBackupSheetRow: 0,
    latestBackupSize: 0,
    status: 'Active',
    notes: 'Manual Apps Script smoke test.'
  });
  var device = saveOsDeviceRegistryV19({
    profileId: 'a1xx-primary',
    deviceId: 'device_smoke_test',
    deviceLabel: 'Smoke Test Device',
    deviceType: 'browser',
    lastAnchorCheckAt: new Date().toISOString(),
    lastBackupMarker: 'backup_smoke_test',
    lastBackupSheetRow: 0,
    trustedStatus: 'Trusted',
    buildToken: 'manual-smoke',
    appFile: 'money-mission-tracker-v2_3.html',
    status: 'Active',
    notes: 'Should remain Pending unless manually trusted in the Sheet.'
  });
  Logger.log(JSON.stringify({ profile: profile, device: device }));
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
