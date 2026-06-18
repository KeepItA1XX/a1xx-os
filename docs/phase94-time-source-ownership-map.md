# Phase 94 Pass 1B - Time Source Ownership Map

Time tracking ownership is split before writes are allowed.

Ownership:
- App: live controls, current timer read, and local pending session behavior.
- Google Sheets: future raw time-session rows, duration math, pause/resume totals, and Rule of 300 time/reps.
- Notion: cycle, campaign, mission, batch lane, debrief meaning, and relationships.

Boundary:
- No app write, Sheets write, Notion write, Drive write, mission completion, XP award, notification, worker, automation, restore, token export, or secret export.

Next allowed step:
- `phase94_pass1c_time_ledger_row_contract`
