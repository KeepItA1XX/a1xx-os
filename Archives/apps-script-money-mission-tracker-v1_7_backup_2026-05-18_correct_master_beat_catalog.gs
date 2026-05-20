// ============================================================
// A1XX Money Mission Tracker — Google Apps Script Backend
// Version 1.7
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

var NOTION_CONTENT_DB    = '1a061152-81da-81bc-b7ec-cecbcba9ed8e';
var NOTION_PRODUCTION_DB = '1a761152-81da-8178-ad45-000b48fc3735';
var NOTION_RESOURCE_DB   = '35861152-81da-8053-8d5e-c5e6c5042e6c';
var NOTION_CRM_DB        = 'b82e7140-b3b0-48d1-915d-34e4cdf9f65a';

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

// ── MAIN HANDLERS ────────────────────────────────────────────
function doPost(e) {
  try {
    var raw = e.postData ? e.postData.contents : '{}';
    var data = JSON.parse(raw);

    if (data.type === 'test') {
      logActivity('Test connection received');
      return ok('Test received — connection working.');
    }
    if (data.type === 'log_change') {
      handleLogChange(data);
      return ContentService.createTextOutput(JSON.stringify({ok:true}))
        .setMimeType(ContentService.MimeType.JSON);
    }
    if (data.type === 'weekly_save') {
      saveWeekly(data);
      logActivity('Weekly save — Cycle ' + data.cycleNum + ' — Revenue: $' + data.revenue);
      return ok('Weekly save complete.');
    }
    if (data.type === 'cycle_archive') {
      archiveCycle(data);
      logActivity('CYCLE ARCHIVE — Cycle ' + data.cycleNum + ' archived permanently.');
      return ok('Cycle archive complete.');
    }
    if (data.type === 'backup_save') {
      saveBackup(data);
      logActivity('Backup saved — ' + (data.keyCount || '?') + ' keys — ' + (data.size || '?') + ' chars');
      return ok('Backup saved.');
    }
    if (data.type === 'daily_save') {
      var row = saveDailySnapshot(data);
      logActivity('Daily save — ' + data.date + ' (' + (data.mode || 'replace') + ') — Money: $' + (data.money || 0));
      return ContentService.createTextOutput(JSON.stringify({ status: 'ok', row: row }))
        .setMimeType(ContentService.MimeType.JSON);
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
    if (e.parameter.action === 'daily_log')           return getDailyLog(e);
    if (e.parameter.action === 'prospect_log')        return getProspectLog(e);
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
  var ss = SpreadsheetApp.getActiveSpreadsheet();
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
  var ss = SpreadsheetApp.getActiveSpreadsheet();
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
  var ss = SpreadsheetApp.getActiveSpreadsheet();
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
}

function getDailyLog(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
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
  var ss = SpreadsheetApp.getActiveSpreadsheet();
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
}

function deleteProspectRow(id) {
  if (!id) return false;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
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
  var ss = SpreadsheetApp.getActiveSpreadsheet();
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
  var res = UrlFetchApp.fetch(
    'https://api.notion.com/v1/databases/' + databaseId + '/query',
    { method: 'post',
      headers: { Authorization: 'Bearer ' + secret, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' },
      payload: JSON.stringify(payload), muteHttpExceptions: true }
  );
  var text = res.getContentText(); var code = res.getResponseCode();
  if (cacheKey && code < 400) { try { if (text.length < 90000) cache.put(cacheKey, text, 600); } catch (e) {} }
  return { text: text, code: code };
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
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = getOrCreateSheet(ss, SHEET_WEEKLY, WEEKLY_HEADERS);
  var wkRev = d.weeklyRevenue || []; var wkSv = d.weeklyServices || []; var wkOt = d.weeklyOther || [];
  var row = [
    d.timestamp || new Date().toISOString(), d.date || new Date().toLocaleDateString(),
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
}

function archiveCycle(d) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = getOrCreateSheet(ss, SHEET_ARCHIVE, ARCHIVE_HEADERS);
  var row = [
    new Date().toISOString(),
    d.cycleNum || '', d.cycleName || '', d.cycleDates || '', d.cycleTarget || 0,
    d.daysElapsed || 0, d.revenue || 0, d.totalExpenses || 0, d.netProfit || 0, d.margin || 0,
    d.roas || 0, d.dailyPace || 0, d.sessions || 0, d.cumDms || 0, d.cumPosts || 0,
    d.studioCommission || 0, d.mixMaster || 0, d.rapreneurOS || 0,
    d.productionDeals || 0, d.customBeats || 0, d.otherIncome || 0,
    d.noteWin || '', d.noteLesson || '',
    'Cycle ' + d.cycleNum + ' archived on ' + new Date().toLocaleDateString()
  ];
  sheet.appendRow(row);
  sheet.getRange(sheet.getLastRow(), 1, 1, ARCHIVE_HEADERS.length).setFontWeight('bold').setBackground('#0d1808');
}

function saveBackup(d) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = getOrCreateSheet(ss, SHEET_BACKUP, ['Saved At', 'Key Count', 'Size (chars)', 'Data']);
  var json = d.payload || '{}';
  sheet.appendRow([new Date().toISOString(), d.keyCount || 0, json.length, json]);
}

function getBackup(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_BACKUP);
  if (!sheet || sheet.getLastRow() < 2) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'ok', backup: null }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  var row = sheet.getRange(sheet.getLastRow(), 1, 1, 4).getValues()[0];
  return ContentService.createTextOutput(JSON.stringify({
    status: 'ok', backup: { savedAt: row[0], keyCount: row[1], size: row[2], payload: row[3] }
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
  try { var ss = SpreadsheetApp.getActiveSpreadsheet(); health.sheets = ss ? 'ok' : 'error'; health.sheetsName = ss ? ss.getName() : ''; }
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
    var ss = SpreadsheetApp.getActiveSpreadsheet();
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
function getOrCreateSheet(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#1a2910').setFontColor('#7ec845');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function formatSheet(sheet) {
  if (sheet.getLastRow() <= 5) sheet.autoResizeColumns(1, Math.min(sheet.getLastColumn(), 20));
}

function ok(msg) { return ContentService.createTextOutput(JSON.stringify({ status: 'ok', message: msg })).setMimeType(ContentService.MimeType.JSON); }
function error(msg) { return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: msg })).setMimeType(ContentService.MimeType.JSON); }

function authorizeNotionFetch() {
  UrlFetchApp.fetch('https://api.notion.com/v1/users/me', { method: 'get', headers: { Authorization: 'Bearer test' }, muteHttpExceptions: true });
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
