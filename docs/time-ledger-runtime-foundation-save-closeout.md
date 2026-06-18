# Time Ledger Runtime Foundation Save Closeout

## Current Phase

- Phase: Time Tracking + Time Ledger Runtime Foundation
- Pass: Pass 1K Notion + Sheets Save Closeout
- Pass type: approved reviewed time save / Notion + Sheets writes enabled
- Approval source: A1XX in-session approval, 2026-06-18

## What Changed

The Mission Active time review strip now has a real save path after A1XX clicks `Looks Good`.

The save path writes one reviewed time block to:

- Google Sheets: `Time Sessions Ledger`
- Notion: configured time sessions database, when `NOTION_TIME_SESSIONS_DB` or `NOTION_TIME_SESSIONS_DB_ID` is present in Apps Script properties

## Save Rules

- Save only after the review packet is confirmed with `Looks Good`.
- Require approval text: `A1XX APPROVED TIME LEDGER SAVE`.
- Require scope: `time_ledger_reviewed_session_only`.
- Use an idempotency key so repeated clicks do not create duplicate Sheet rows.
- Keep the player UI compact: `Saving time...`, `Saved`, or `Save needs review`.

## Still Blocked

- Mission completion writes
- XP awards
- Badge/trophy awards
- Notification dispatch
- Worker activation
- Automation activation
- Restore execution
- Token export
- Secret export
- Broad app write paths

## Files

- `money-mission-tracker-v2_5.html`
- `apps-script-money-mission-tracker-v2_5.gs`
- `docs/app-weight-control-system-v1.md`

## Verification Expectations

- HTML inline script parses.
- Apps Script source parses.
- `git diff --check` passes.
- Fast QA includes `Time Ledger Runtime Foundation`.
- The protected boundary still reports mission completion, restore, workers, automations, token export, and secret export blocked.
