# Money Mission OS Cycle Reset / Closeout Wizard Handoff v1

Date: 2026-06-12
Prepared by: Codex
Scope: implementation handoff only
Live app edit status: no live HTML or Apps Script edits made

## Purpose

Build a safe Cycle Reset / Cycle Closeout Wizard for Money Mission OS so A1XX can close or restart Cycle 1 without losing proof, config, backup history, audit history, or real operating data.

The current reset system is still present, but it is too narrow for a full post-build Cycle 1 reset. It can clear selected browser storage and truncate two Sheet tabs after archiving rows to Reset Audit. It does not fully cover newer Mission runtime state, Mission Command chats, Notion time/session records, Rule of 300 structures, or the new time-tracking ledger.

## Current Code Evidence

Current app files inspected:
- `/Users/a1xxoffice/Documents/Codex/2026-05-06/i-have-a-html-for-an/money-mission-tracker-v2_5.html`
- `/Users/a1xxoffice/Documents/Codex/2026-05-06/i-have-a-html-for-an/apps-script-money-mission-tracker-v2_5.gs`

Important current functions and locations:
- Browser reset UI: `money-mission-tracker-v2_5.html`, Reset test data section
- Browser reset executor: `executeBrowserReset()`
- Sheet reset executor: `executeSheetReset()`
- Protected local keys: `getProtectedStorageKeysV22()`
- Cycle archive button: `archiveCycleBtn()`
- Apps Script reset endpoint: `resetTestData(d)`
- Apps Script cycle archive endpoint: `archiveCycle(d)`
- Drive backup status: `getLatestDriveBackupStatusSnapshotV20()`
- Drive backup save: `saveBackup(d)`
- Mission runtime local state key: `a1xx_phase9ee_mission_runtime_local_session_state_v1`
- Mission Command sessions key: `a1xx_mission_command_sessions_v1`
- Mission Command archive key: `a1xx_mc_chat_archive`

## Existing Reset Behavior

### Browser reset

Current browser reset can clear:
- `a1xx_daily_profit_v1`
- `a1xx_dpc_weekly_daily_logs_v1`
- `a1xx_dpc_call_reschedules_v1`
- `a1xx_prospect_captures_v1`
- `a1xx_streak`
- `a1xx_close_log_v1`
- `a1xx_content_log_v1`
- `a1xx_missed_banner_dismissed_*`
- broad `a1xx_*` keys when Everything is selected

Current browser reset preserves:
- Apps Script URL (`SHEETS_KEY`)
- Mission sync config (`MISSION_SHEETS_CONFIG_KEY`)
- Webhook token (`WEBHOOK_TOKEN_KEY`)
- Todoist token (`TODOIST_KEY`)
- Notion token (`NOTION_KEY`)
- Instagram token (`a1xx_ig_token`)

Risk: broad `a1xx_*` reset is blunt. It may catch newer Mission runtime keys, but it is not an explicit Cycle closeout contract and should not be treated as the final reset flow.

### Sheet reset

Current Apps Script `resetTestData(d)` archives rows to `Reset Audit`, then clears content below the header row for:
- `Daily Log`
- `Captured Leads`

Current Sheet reset does not clear:
- `Weekly Saves`
- `Cycle Archives`
- `Activity Log`
- `State Backups`
- `Mission Command Chat Log`
- `Mission Command Sessions`
- `Mission Command Sync Audit`
- `Mission Command Events`
- new Time Tracking + Rule of 300 ledger tabs
- Notion records

## Backend Sources To Include

### Existing production workbook

Known current Apps Script tabs:
- `Daily Log`
- `Captured Leads`
- `Cycle Archives`
- `Reset Audit`
- `Mission Command Chat Log`
- `Mission Command Sessions`
- `Mission Command Sync Audit`
- `Mission Command Events`
- backup index / state backup area through Drive-backed backup system

### New time-tracking workbook

Google Sheet:
- `Money Mission OS Time Tracking + Rule of 300 Ledger v1`
- Spreadsheet ID: `1YrPSWoBKIv4hDYSXaiMZ4dzODO77j92g1cmLbLZplRo`

Tabs:
- `Time Sessions Ledger`
- `Rule of 300 Tracker`
- `Weekly Time Summary`
- `Lane Time Summary`
- `Source Ownership Rules`
- `README - Setup`

### Notion backend

Primary new database:
- `Time Sessions / Work Blocks`
- Database URL: `https://app.notion.com/p/f2c594a20ac446778c65b4ae313b9a25`
- Data source: `collection://a68586ad-a9b2-4696-adbe-eac43b3a4297`

Relevant connected Notion sources:
- Campaigns
- Mission Attempts
- Task Master
- Money Mission Cycles
- Mission Catalog
- Mission Debriefs

## Wizard Goal

The wizard should give A1XX a controlled way to:
1. Verify backup safety.
2. Inventory test/active Cycle data.
3. Archive Cycle data into durable history.
4. Reset only active workspace data.
5. Preserve config, tokens, audit history, archives, proof, and real records.
6. Produce a receipt that explains exactly what happened.

## Non-Negotiable Boundaries

No delete behavior.

Archive first, then clear active rows or mark records inactive.

Do not clear setup/config keys.

Do not clear backups, backup indexes, Reset Audit, Cycle Archives, Activity Log, or real proof.

Do not execute app rewards, XP, badges, trophies, mission completion, notifications, automations, or autonomous writes.

No reset action may run unless a fresh backup marker is visible and confirmed.

No Notion pages should be deleted. Use status fields, archived flags, or archive views.

## Proposed Wizard Stages

### Stage 1: Preflight

Purpose: prove it is safe to start.

Checks:
- Apps Script URL exists.
- Webhook token exists if required by current POST flow.
- Latest Drive backup marker exists via backup status.
- Backup is not a probe.
- App build token/version is captured.
- Current cycle number and cycle dates are visible.
- Connected workbook is reachable.
- Notion source links are known for Time Sessions / Work Blocks and relevant Mission/Campaign sources.

UI state:
- `Ready` only when backup marker, workbook, and cycle info are present.
- `Blocked` if backup is missing.
- `Review` if Notion time source is missing or unknown.

Primary copy:
`Before resetting anything, Money Mission OS needs a verified backup and a clear archive target. Nothing resets until the backup is visible.`

### Stage 2: Inventory

Purpose: show what will be archived, reset, or preserved.

Inventory groups:
- Browser local data
- Production Sheet active rows
- Mission Command chat/session data
- Mission runtime local state
- Time Tracking + Rule of 300 ledger rows
- Notion Time Sessions / Work Blocks
- Notion Mission Attempts / Campaigns rollup state

Required counts:
- local DPC keys present
- local captured prospect keys present
- Mission runtime state count by mission ID
- Mission Command active chat count
- Mission Command archive count
- Sheet Daily Log row count
- Sheet Captured Leads row count
- Time Sessions Ledger row count
- Notion Time Sessions count by Session Status
- Notion Time Sessions count with `App Write Eligible` checked
- Notion test-labeled record count if available

Important: counts should be read-only and may show `Unavailable` rather than guessing.

### Stage 3: Archive

Purpose: preserve Cycle 1 and test history before clearing active workspace state.

Archive targets:
- Existing `Cycle Archives` row through current `archiveCycle(d)` flow.
- Existing `Reset Audit` rows for any Sheet rows cleared.
- New `Cycle Reset Audit` or `Cycle Closeout Audit` tab if implementation adds broader reset coverage.
- Notion closeout page or Team Chat UPDATE receipt.
- Optional Notion status update for test pages: mark `Archived`, `Test`, or `Cycle 1 Closeout`, never delete.

Archive payload should include:
- cycle number
- cycle name
- cycle dates
- cycle revenue
- total expenses
- net profit
- DMs
- posts/content count
- sessions
- calls
- closes
- top win
- lesson
- backup marker ID
- backup Drive URL
- app build token
- reset mode selected
- operator confirmation timestamp

### Stage 4: Reset Active Workspace

Purpose: clear current working state only after archive succeeds.

Allowed reset actions:
- Clear browser local DPC active keys.
- Clear browser captured-prospect test keys.
- Clear browser streak/content/close log test keys if selected.
- Clear Mission runtime local session state key after archive/receipt.
- Archive or compact Mission Command active QA chats if selected.
- Clear Sheet `Daily Log` rows after Reset Audit archive.
- Clear Sheet `Captured Leads` rows after Reset Audit archive.
- Clear or archive rows in Time Sessions Ledger only if the row is test/reset-eligible.
- Mark Notion Time Sessions as Archived/Test Reset only when explicit filters are selected.

Explicitly preserved:
- Apps Script URL
- Mission Sheets config
- Webhook token
- Todoist token
- Notion token
- Instagram token
- Drive backup payloads and backup index
- Cycle Archives
- Reset Audit
- Activity Log
- real revenue proof
- real customer/prospect records unless explicitly archived by filter
- Notion source databases and schemas

### Stage 5: Start Fresh

Purpose: prepare the app for a clean next operating run.

Choices:
- `Restart Cycle 1 Clean`
- `Start Cycle 2`
- `Close Test Data Only`

The wizard should not silently change cycle constants. If Cycle 2 initialization requires code/config changes, it should stop and create a handoff requiring A1XX approval.

Fresh baseline should include:
- active session state empty
- active daily log blank
- active captured-leads test rows cleared or archived
- mission runtime ready state
- no fake counters
- Rule of 300 targets preserved but current test reps cleared or archived only by selected filter
- app read/write gates preserved

### Stage 6: Receipt

Purpose: leave A1XX with proof.

Receipt should show:
- backup marker
- archive row/result
- counts archived
- counts reset
- counts preserved
- Notion records marked
- Sheet tabs touched
- browser keys cleared
- app build token
- timestamp
- whether any action failed or was skipped

Receipt should also write a Team Chat UPDATE when Notion write tooling is available.

## Proposed UI Copy

Wizard title:
`Cycle Closeout + Reset`

Short intro:
`Close the cycle, protect the proof, then clear only the active workspace. Nothing deletes. Nothing resets until backup and archive are checked.`

Preflight blocked:
`Backup is not verified yet. Save a backup before running closeout.`

Archive step:
`This saves the cycle result before the active workspace is cleared. Archives and audit tabs stay permanent.`

Reset step:
`This clears selected active/test data only. Config, backups, archives, tokens, and proof stay untouched.`

Final receipt:
`Closeout complete. The cycle is archived, selected active data is reset, and the receipt is saved.`

## Proposed Data Contract

### Client closeout request

```json
{
  "type": "cycle_closeout_reset",
  "mode": "preview|execute",
  "cycleNum": 1,
  "cycleName": "Cycle name",
  "cycleStart": "YYYY-MM-DD",
  "cycleEnd": "YYYY-MM-DD",
  "backupMarkerId": "backup_...",
  "backupDriveUrl": "https://drive.google.com/...",
  "appBuild": "APP_CACHE_TOKEN",
  "selectedActions": {
    "archiveCycle": true,
    "resetDailyLog": true,
    "resetCapturedLeads": true,
    "resetMissionRuntime": true,
    "archiveMissionChats": false,
    "resetTimeLedgerTestRows": false,
    "archiveNotionTestSessions": false
  },
  "counts": {
    "dailyRows": 0,
    "capturedLeadRows": 0,
    "missionRuntimeItems": 0,
    "timeLedgerRows": 0,
    "notionTimeSessions": 0
  },
  "operatorConfirmation": "A1XX approved cycle closeout reset",
  "requestedAt": "ISO timestamp"
}
```

### Server response

```json
{
  "status": "ok|blocked|partial",
  "mode": "preview|execute",
  "receiptId": "cycle_closeout_...",
  "backupMarkerId": "backup_...",
  "archive": {
    "cycleArchiveRow": 0,
    "resetAuditRows": 0,
    "closeoutAuditRow": 0
  },
  "cleared": {
    "dailyRows": 0,
    "capturedLeadRows": 0,
    "timeLedgerRows": 0
  },
  "preserved": [
    "Cycle Archives",
    "Reset Audit",
    "State Backups",
    "Activity Log",
    "protected config keys"
  ],
  "warnings": [],
  "nextStep": "Reload app and verify clean baseline"
}
```

## Implementation Plan For Build Thread

### Pass A: Read-only inventory

Add a wizard shell and read-only inventory. No reset execution.

Required:
- current backup marker read
- current cycle read
- browser key count read
- Sheet row counts read
- Time Tracking ledger count read if configured
- Notion source availability display if app-read source is available
- no writes

QA:
- Missing backup blocks execution.
- Missing optional Notion source shows Review, not failure.
- Inventory never changes localStorage or Sheets.

### Pass B: Closeout archive preview

Add archive preview payload and receipt preview. No reset execution.

Required:
- show exact archive payload
- include backup marker
- include selected reset actions
- require two-step confirmation copy

QA:
- Preview does not send reset.
- Preview does not clear rows.
- Preview includes all preserved sources.

### Pass C: Apps Script closeout endpoint

Add a new Apps Script endpoint, do not expand `reset_test_data` silently.

Recommended endpoint:
- `cycle_closeout_reset`

Modes:
- `preview`
- `execute`

Server behavior:
- verify backup marker exists in backup index
- call or mirror `archiveCycle(d)` when selected
- archive and clear selected rows only after archive succeeds
- create `Cycle Closeout Audit` tab if needed
- return structured receipt

QA:
- Execute blocked without backup marker.
- Execute blocked without operator confirmation.
- Execute preserves Reset Audit and Cycle Archives.
- Execute never deletes tabs.

### Pass D: Browser local reset execution

After server receipt succeeds, clear selected local keys.

Allowed local keys for Cycle reset:
- `a1xx_daily_profit_v1`
- `a1xx_dpc_weekly_daily_logs_v1`
- `a1xx_dpc_call_reschedules_v1`
- `a1xx_prospect_captures_v1`
- `a1xx_streak`
- `a1xx_close_log_v1`
- `a1xx_content_log_v1`
- `a1xx_phase9ee_mission_runtime_local_session_state_v1`

Review before clearing:
- `a1xx_mission_command_sessions_v1`
- `a1xx_mc_chat_archive`
- Mission Command active/alias keys
- any Mission result/event ledger keys

Never clear:
- protected setup/config keys returned by `getProtectedStorageKeysV22()`
- backup metadata keys unless explicitly covered by restore/backup protocol

QA:
- Protected keys remain unchanged.
- Mission runtime clears only after server receipt.
- Reload shows clean baseline.

### Pass E: Notion archive integration

Add Notion test-session closeout only after the app has an approved Notion write path.

Until then:
- show Notion reset as manual checklist only
- do not attempt app-side Notion writes

Future approved behavior:
- mark Time Sessions / Work Blocks rows as `Archived` only when selected by status/filter
- use checkbox/tag fields to distinguish test data from real data
- never delete pages
- write Team Chat receipt

## QA Matrix

### Safety

- Backup missing blocks all execute actions.
- Backup probe does not count as valid backup.
- Protected local keys survive all reset modes.
- Cycle Archives and Reset Audit survive all reset modes.
- App does not delete Sheets tabs.
- App does not delete Notion pages.

### Browser

- DPC-only reset clears only DPC keys.
- Captured leads reset clears only prospect capture local key.
- Mission runtime reset clears `a1xx_phase9ee_mission_runtime_local_session_state_v1`.
- Mission chats are preserved unless explicitly selected.
- Browser reload lands on clean baseline.

### Sheets

- Daily Log rows archive to Reset Audit before clear.
- Captured Leads rows archive to Reset Audit before clear.
- Cycle Archives receives one closeout row.
- Closeout Audit receives one receipt row if implemented.
- State Backups / Drive backup index stays intact.

### Time Tracking

- Time Sessions Ledger is untouched by default.
- Test-row reset requires explicit filter and confirmation.
- Rule of 300 category/target scaffolding remains.
- Weekly/Lane summary tabs remain.

### Notion

- Notion archive is manual-only until approved write path.
- App-read gates remain visible.
- App-write gates remain false/closed unless separately approved.

## Suggested Build Thread Prompt

Use this exact handoff file as the source of truth:

`/Users/a1xxoffice/Documents/Codex/2026-05-06/i-have-a-html-for-an/docs/cycle-reset-closeout-wizard-handoff-v1.md`

Directive:
Implement the Cycle Reset / Closeout Wizard in small gated passes. Do not delete anything. Do not edit without timestamped backups. Preserve setup/config keys. Start with read-only inventory and no execution. Do not add Notion writes until separately approved. Use current files `money-mission-tracker-v2_5.html` and `apps-script-money-mission-tracker-v2_5.gs` unless A1XX confirms a newer build.

## Open Questions For A1XX

1. Should the first real closeout reset restart Cycle 1 clean, or initialize Cycle 2?
2. Should Mission Command chats be preserved by default, archived by default, or reset only when explicitly selected?
3. Should Time Sessions / Work Blocks test rows be marked Archived in Notion manually first, or should that wait for approved app-side Notion writes?
4. Should the new time-tracking Google Sheet be wired into the main Apps Script backend, or stay as a separate manual ledger until time tracking is fully live?

