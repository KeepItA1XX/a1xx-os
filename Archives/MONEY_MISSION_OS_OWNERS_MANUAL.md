# MONEY MISSION OS — OWNER'S MANUAL

**Living document · v1.0**

A working guide to operating the Money Mission OS. Versioned and updated as the app evolves. Numbers, dates, cycle names, and dollar targets used throughout are **illustrative examples** — substitute your own mission's values when reading. Whoever operates the OS reads this first.

---

## PREAMBLE — WHY THIS EXISTS

Most people running a creator or service business have no idea what their day actually produced. They feel busy. They worked all day. But the numbers — DMs sent, calls booked, dollars collected — vanish into vibes.

This app forces the score to be visible.

Every day you log seven numbers in the Daily Profit Campaign. Every week those numbers roll up into Activity This Week. Every cycle those weeks roll up into a cycle archive. A full mission spans multiple cycles.

The point is not to use the app. The point is to win your mission. The app is the scoreboard that tells you whether you're winning.

### About this manual

This is a **living document**. The version history at the back logs every app release. When the app changes, this manual changes — usually by whichever operator shipped the change.

Examples throughout use a hypothetical mission (8 cycles, $100K total, themed cycle names). Your actual mission may have a different cycle count, different targets, a different total. **Read the structure, substitute your own values.** The app's `CYCLES` config holds the real numbers; the manual gives you the framework.

If you're new to the OS and someone is handing you the keys: start at Chapter 1, then read the Chapter 17 checklists. You'll have the daily rhythm in 20 minutes.

---

## TABLE OF CONTENTS

1. The Mission & Cycle Framework
2. The Daily Rhythm
3. The Today Tab — Your Daily Cockpit
4. Daily Profit Campaign (DPC) — Your Score Card
5. Following Up — Pipeline & Follow-Up Tabs
6. Time Blocks — The NOW Banner & Your Calendar
7. Content & Production
8. The Activities Tab — Weekly Numbers
9. Sunday Weekly Review
10. The Report Tab — Are You Winning?
11. Cycle Close — Ending One, Starting the Next
12. The Rolodex — Your Business Brain
13. System Health & Backups
14. Reset Test Data
15. Where Your Data Lives (Backend Map)
16. Troubleshooting
17. The Daily / Weekly / Cycle Checklists
18. Version History

---

## CHAPTER 1 — THE MISSION & CYCLE FRAMEWORK

### How missions work in this OS

A **mission** is a multi-cycle journey toward a financial target. Each **cycle** is a discrete sprint of time (typically 6–9 weeks) with its own dollar target. Cycle targets ramp up as your capacity does.

When you set up the OS, you define:

- Your mission total (example: $100,000)
- Number of cycles (example: 8)
- Cycle length (example: ~8 weeks each)
- Per-cycle targets (example: small first, larger toward the end)
- Per-cycle name/theme (example: Foundation, Momentum, Scale, etc.)

These live in the `CYCLES` config in the HTML. As an operator, you're not expected to edit them directly during normal use — they're set at the start of the mission and updated only between missions or when scope changes.

### Example mission ladder (illustrative only)

This is one hypothetical mission shape. Yours may differ.

| # | Example name   | Example target |
|---|----------------|----------------|
| 1 | Foundation     | $1,500         |
| 2 | Momentum       | $10,500        |
| 3 | Traction       | $18,000        |
| 4 | Growth         | $28,000        |
| 5 | Scale          | $45,000        |
| 6 | Acceleration   | $62,000        |
| 7 | Peak           | $82,000        |
| 8 | Final Close    | $100,000       |

The early cycles are about **proving the system works**. The middle cycles are about **building repeatable wins**. The final cycles are about **running the machine you built**.

### Why cycles, not months

Months are arbitrary calendar units. Cycles are designed sprints. Each one has a clear target and a clear theme, and you can shape each one differently if needed.

### Where mission info shows up in the app

Two places, always visible at the top:

- **Top-right pill** — current cycle name and number (e.g., "Cycle 3 · Traction").
- **Top-left data strip** — `$X · NN% · N days left` — money in this cycle, percent to cycle target, days remaining.

Above that strip is the **MONEY MISSION OS** gradient banner. That's home base.

---

## CHAPTER 2 — THE DAILY RHYTHM

The OS comes preset with a seven-block daily rhythm. Block windows are illustrative — adjust `TIME_BLOCKS` in the HTML if your day looks different.

| Block          | Example window | Purpose                                                            |
|----------------|----------------|---------------------------------------------------------------------|
| Maker Time     | 10:00–11:55    | Create. Content, scripts, recording, deep work                      |
| Break          | 11:55–12:30    | Transition. Pick up real-life obligations                           |
| Ramp Up        | 12:30–13:00    | Review warm leads. Prep for money block                             |
| Money Time     | 13:00–17:00    | DMs, follow-ups, calls, pitches, closes                             |
| Manager Time   | 17:00–17:30    | Log numbers in DPC. Update CRM. Close loops                         |
| Wind Down      | 17:30–19:00    | Eat, decompress, off the clock                                      |
| Finale         | 19:00–20:00    | Journal wins/lessons. Set tomorrow's one thing                      |

Outside your defined blocks, the app shows **Pre-flight** (before your first block) or **Day complete** (after your last block).

The Manager calendar card shows a **NOW banner** above your Google Calendar events. It color-codes the current block so your eye knows exactly where you are at any time. See Chapter 6 for the full feature.

---

## CHAPTER 3 — THE TODAY TAB — YOUR DAILY COCKPIT

When you open the app, you land on the **This Week** tab (the daily cockpit). Top to bottom:

1. **Top header** — Money Mission OS banner + time/date/$rev/%/days-left data strip + system health dot + biz health pill (left). Saved/Synced tags + streaks + cycle pill + V1 beta tag (right).
2. **Time-block bar** — visual ribbon showing where you are in the daily rhythm.
3. **Daily Profit Campaign (DPC) card** — your daily log + scoreboard. This is where you live.
4. **Content card** — today's scheduled content piece, pipeline, spark capture, live events.
5. **Production card** — beats and tracks status.
6. **Calendar card (Manager)** — today's Google Calendar events with the NOW banner.
7. **Today's Actions** — Todoist task checklist.
8. **System Health panel** — backups, reset, setup buttons.

The four main tabs across the top:

- **This Week** — daily cockpit (above)
- **Activities** — weekly numbers, expenses, income streams, the weekly chart
- **Report** — cycle progress, profit, expense breakdown
- **Rolodex** — Notion + tools shortcuts

---

## CHAPTER 4 — DAILY PROFIT CAMPAIGN (DPC) — YOUR SCORE CARD

The DPC card is the most important real estate in the app. Open it, type seven numbers, hit save. That's the daily job.

### The seven daily fields

- **DMs sent** — outbound conversations started
- **Cold calls made** — outbound phone reach-outs
- **Content posted** — pieces shipped today
- **Calls booked** — appointments locked
- **Closes (paid)** — actual money collected
- **Money collected ($)** — total dollars in today
- **New warm leads** — net new humans who showed interest

### Three modes — Delta, Edit, Future

The DPC card is date-aware. Use the left/right arrows above the input grid to navigate the current Mon–Sun week.

**Delta mode (today)** — Inputs are blank. The "Today so far" readout above shows your accumulated totals for today. Each Save *adds* what you type to today's row.

> **Example.** You just closed a $50 sale. Open DPC → type `1` in Calls booked, `1` in Closes, `50` in Money collected → hit "Add to Today's Log". Form clears. "Today so far" updates with the new totals. Activity This Week revenue jumps by $50.

**Edit mode (past day in this week)** — Arrow back to an earlier day. Inputs pre-fill with what was saved. Edit any number → save → the day's row is overwritten.

> **Example.** It's Thursday. You realize Monday's DMs sent is wrong — should have been 35, not 20. Arrow back to Monday → inputs show 20 → change to 35 → save. Monday's row updates. Week totals recalculate.

**Future mode (any future day in this week)** — Arrow forward. Card flips to a blue read-only "Coming up" view showing the rhythm for that day. No inputs. Save button hidden.

### "Today so far" readout

In delta mode, the green box above the inputs shows what's already logged today. Glance at it to see running totals without doing math.

### Edit today's totals override

Sometimes you want to *overwrite* today's totals, not add to them (e.g. you logged something twice by mistake). Click the **Edit today's totals** link in the delta-mode hint. The card flips into edit mode for today — inputs pre-fill, save replaces the row. Click **Back to add-mode** to return.

### Undo Last Save

After every save, an **Undo last save** button appears. Click it to revert the most recent change. The button disappears after you navigate to a different day or after the next save.

### Missed-day banner

If yesterday has no saved DPC entry, a soft yellow banner appears above the DPC card on app load:

> "You missed [day name] — tap to fill it in."

Tap it → DPC arrows back to yesterday in edit mode. Fill it in. Save. Banner goes away.

The banner only fires when yesterday is *truly empty*. A saved row of zeros counts as "logged." The × button dismisses it for the rest of today if you want.

---

## CHAPTER 5 — FOLLOWING UP: PIPELINE & FOLLOW-UP TABS

The DPC card has three top-level sub-tabs: **Score**, **Pipeline**, **Follow-Up**.

### Pipeline

Three sub-views:

- **Focus** — Pipeline command, source/stage/next-action recommendations
- **Hit List** — CRM leads ranked by recency + heat. Top of the funnel.
- **Gap** — Conversion funnel math (DMs → Replies → Calls → Closes)

### Follow-Up

Three sub-views:

- **Queue (Cue)** — leads ranked FIRE / WARM / COLD by urgency
- **Reply** — message builder for outbound replies
- **Capture** — fast prospect intake form

### HOW-TO — Use the Hit List

1. DPC card → Pipeline tab → Hit List sub-tab
2. Cards show name + recency badge + ATL/local flag + stage + offer interest
3. Each card has DM IG + Call buttons + a script
4. Work the top of the list first. Reds before yellows. Yellows before grays.

### HOW-TO — Use the Reply builder

1. DPC card → Follow-Up tab → Reply sub-tab
2. Pick a lead from the pill row at the top
3. Choose "My goal is to..." from the dropdown (book a call / re-engage / qualify / close / reschedule / send proof)
4. The textarea fills with a stage-matched template using the lead's name and funnel context
5. Edit if needed → click Copy → paste into the DM/SMS/email

### HOW-TO — Use the Capture form

When you're on a cold call, in a DM thread, or talking to someone at an event and need to log a prospect *immediately*:

1. DPC card → Follow-Up tab → Capture sub-tab
2. Fill the required fields: **Stage Name** (or Real Name) and **Source**
3. Optional: Phone, Email, IG, Stage, Hot Lead ☑, Local ☑, Notes, Next Action, Follow-Up Date
4. Click **Expand ↓** to reveal Threads/Website/First Touch and CLOSER coaching prompts
5. Click **Save Capture**
6. Row appears at the top of "Recent captures" with badges (🔥 Hot, 🏙️ Local, follow-up date)
7. Click a row to expand → see all details → **Edit** to load into the form or **Delete** to soft-delete

The captured row also writes to the **Captured Leads** tab in your Google Sheet, keyed by UUID. To bulk-import to your CRM later, click **Export CSV ↓**.

> **Example.** You're on a call with a prospect who reached out from an IG comment. Halfway through they say "I need help with X, I'm local, can we talk Friday." Alt-tab to the app → DPC → Follow-Up → Capture. Type: Stage Name + Phone + IG + Source="IG comment" + Stage="Conversation Started" + ☑ Hot + ☑ Local + Notes + Next Action="Friday call" + Follow-Up Date. Save. Capture lands at top of list. You stay in the call. Done.

---

## CHAPTER 6 — TIME BLOCKS — THE NOW BANNER & YOUR CALENDAR

The Manager calendar card sits on the Today tab. It shows your Google Calendar events for the day, plus the **NOW banner** that highlights the current time block.

### The NOW banner

Appears above the events list. Color-coded:

| Block         | Color  |
|---------------|--------|
| Maker Time    | Blue   |
| Money Time    | Green  |
| Manager Time  | Amber  |
| Finale        | Purple |
| Pre-flight    | Gray   |
| Day complete  | Gray   |

The banner shows:

- Pulsing dot (live indicator)
- **NOW** tag
- Current block name
- Current time + block window
- Block summary (the block's one-line directive)
- Next-block line (what's coming + time remaining in current block)
- Thin progress bar showing position within the block

It refreshes every 60 seconds. As you cross a block boundary, the color and label change automatically.

### Event highlighting

Any Google Calendar event whose start time falls inside the current block window gets a green-tinted left-border highlight in the list below the banner. Use this to spot meetings happening *right now*.

### HOW-TO — Stay in flow with the NOW banner

1. Glance at the banner color — green means "you should be selling right now."
2. Read the block summary — your one-line directive for the current window.
3. Check the next-block line — know what's coming so you can wrap up cleanly.
4. Don't drift outside the block. If the banner says Money Time and you're writing content, you're off-task.

---

## CHAPTER 7 — CONTENT & PRODUCTION

### The Content card (Today tab)

Four sub-tabs:

- **Today** — today's scheduled content piece pulled from your Notion Content Calendar
- **Pipeline** — Projects / Distribution / Community sub-views of in-production pieces
- **Spark** — quick idea capture, your idea bank
- **Live** — upcoming live events / streams / podcasts

### The Production card

Shows beats/tracks in production and platform-specific status indicators (e.g., distribution platform uploads).

### HOW-TO — Move a piece through the pipeline

The content pipeline has stages (matches your Notion content DB):

- Script → Film → Edit → Distribute → Archived

1. Open the Pipeline sub-tab → Projects
2. Filter by stage if needed
3. Click a card → opens in Notion → update the "Ready To" status
4. Card moves to the next stage on the next refresh

### HOW-TO — Capture an idea before you forget it

1. Content card → Spark sub-tab
2. Type the idea into the quick capture box
3. Tag format (Reel / Short / Long / Thread / Stream / Email)
4. Save → it lands in your local Spark Queue and (when set up) into the Notion Content Planner

---

## CHAPTER 8 — THE ACTIVITIES TAB — WEEKLY NUMBERS

The Activities tab shows your week-level rollups. Most of it is auto-derived from your daily DPC logs.

### What's auto-derived (Activity This Week section)

These fields update automatically as you save DPC entries:

- Revenue collected ($)
- DMs sent
- Responses (warm leads)
- Calls booked
- Closes (paid)
- Content posted

They're tinted green to signal "live sum." You can still type into them directly — that's the bidirectional sync.

### Bidirectional sync — editing Activity This Week directly

If you change a number in Activity This Week (e.g. revenue), the app computes the delta and adds it to today's daily-log row. The week sum updates, today's DPC row updates, both stay consistent.

> **Example.** Activity This Week shows revenue at $X. You know you actually collected $Y this week and the daily log missed some. Change the field to $Y, tab out. Status reads "Activity This Week money set to $Y (delta +$Z applied to today's daily log)." Today's DPC row gains $Z. Both views consistent.

### What stays editable manually

- Week target ($)
- Ad spend / month
- Sessions closed (cycle)
- Software & tools / month
- Services this week
- Other expenses this week
- Big win this week (textarea)
- Biggest lesson this week (textarea)
- Income stream breakdown (multiple categories)

### The weekly revenue chart

Bottom of Activities tab. Shows revenue collected each week of the current cycle. Toggle Bar / Line / Running Total. Use this to spot pacing problems mid-cycle.

---

## CHAPTER 9 — SUNDAY WEEKLY REVIEW

Every Sunday (or whichever day closes your operating week), run the weekly review ritual. 15 minutes if you've been logging daily.

### HOW-TO — Run a weekly review in 15 minutes

1. **Open Activities tab.** Numbers are mostly filled in from daily logs.
2. **Fill manual fields:** week target, ad spend, software, services, other expenses, sessions closed.
3. **Adjust income streams** if you broke out specific buckets this week.
4. **Write your Big Win** (1-2 sentences). What are you proud of?
5. **Write your Biggest Lesson** (1-2 sentences). What would you do differently?
6. **Click "💾 Save Weekly Update"** at the bottom. The data writes to the Weekly Saves tab in your Google Sheet — your historical snapshot.
7. **Check the Report tab.** Are you on pace? If not, what's the bottleneck?

If you skipped daily DPC entries, fix them first via the Missed-day banner or by arrowing back day-by-day in the DPC. Don't save the week with hollow numbers.

---

## CHAPTER 10 — THE REPORT TAB — ARE YOU WINNING?

The Report tab is your "is this working" view. Open it when you want truth.

### What's there

- **Revenue to date** — cycle total earned so far
- **Week progress** — earned amount this week; subtext shows target and % progress, or ✓ when met
- **Cycle progress** — earned amount this cycle; subtext shows cycle target and % progress, or ✓ when met
- **True net profit** — revenue minus every expense
- **Progress bars** — week / cycle / mission total
- **Instagram Activity** — last posts if Meta token is set
- **Expense breakdown** — gross revenue → ad spend → software → services → other → net profit waterfall
- **Business intelligence** — daily pace, projected cycle total, ROAS, profit margin, days to mission goal

### HOW-TO — Read your numbers

1. Start with **Cycle progress %** in the subtext. By the midpoint of your cycle, you should be at roughly 50%. Below that = bottleneck somewhere.
2. Check **True net profit** vs. revenue. Profit margin should be reasonable for your business model.
3. Scan the **expense breakdown**. Any line item out of whack?
4. Check **Instagram Activity** if content cadence matters for your funnel.
5. If something's off, jump to Activities tab and see which week broke the trend.

---

## CHAPTER 11 — CYCLE CLOSE — ENDING ONE, STARTING THE NEXT

When a cycle ends, archive it before starting the next.

### What happens when you archive

- The cycle's full snapshot writes to the **Cycle Archives** tab in your Google Sheet
- Revenue, expenses, sessions, total DMs, total posts, win, lesson — all locked in for history
- The app advances to the next cycle automatically based on date (driven by the `CYCLES` config)

### HOW-TO — Archive a cycle

1. On the last day of the cycle (or the day after), complete your final weekly save.
2. Activities tab → scroll to bottom → click **📦 Archive Cycle**.
3. Confirm. The archive row writes to the Sheet.
4. Open the Report tab — cycle progress resets to the next cycle's targets.
5. Update your Week target for the new cycle if it changed.

---

## CHAPTER 12 — THE ROLODEX — YOUR BUSINESS BRAIN

The Rolodex tab is your one-stop navigation panel. Groups vary by instance — what's listed depends on the operator's configured links — but the structure is:

- **HQ Pages** — top-level Notion navigation pages (e.g., Command Center, Reporting HQ)
- **Operational Hubs** — per-domain hubs (e.g., Creative, CRM, Operations, Projects)
- **Content** — content-related Notion databases
- **Tools** — third-party tools (CRM platforms, invoicing, scheduling, etc.)
- **Live Contacts + Resources** — pulled live from your Notion Resource Library

### The search bar

Type into the search box at the top to find playbooks, contacts, resources, content, production, Google Drive links, or notes.

### ⌘ K shortcut

From anywhere in the app, press **⌘ K** (Mac) or **Ctrl K** (PC). The Rolodex tab opens and the search field focuses. Fastest navigation in the app.

### HOW-TO — Find anything fast

1. ⌘ K from anywhere
2. Type 2-3 letters of what you're looking for
3. Click the result

---

## CHAPTER 13 — SYSTEM HEALTH & BACKUPS

System Health is the admin panel at the bottom of the Today tab. Tap the 🟢 system health dot in the top-left header to expand it.

### Reading the health dot

- 🟢 Green — everything connected
- 🟡 Yellow — partial (some connector slow or unreachable)
- 🔴 Red — Apps Script URL not set, or major connector down

### Save backup / Restore backup

- **Save backup ↑** sends a full snapshot of your browser's localStorage to the **State Backups** tab in your Sheet. Use it before any major UI session.
- **Restore backup ↓** pulls the most recent backup blob from the Sheet and overwrites your browser's localStorage. Use it after a browser wipe or device switch.

### Auto-save

The app auto-saves every few minutes. The bar at the bottom of System Health shows last auto-save status and a "Save now" button if you want to force one.

### HOW-TO — Recover after a browser wipe

1. Open the app on the cleaned browser
2. Tap System Health dot → System panel expands
3. Click **Sheets / Notion setup** → re-paste your Apps Script URL (the one ending in `/exec`)
4. Click **Restore backup ↓**
5. Confirm overwrite → app reloads with your last snapshot

---

## CHAPTER 14 — RESET TEST DATA

Lets you wipe accumulated test data without losing setup or config. Useful during testing windows or when you want a clean slate without nuking the whole app.

### Two paths

**Reset Browser Data ↺** — clears localStorage in this browser. Categories:

- DPC daily logs (this week's saved rows + today's snapshot)
- Captured leads (prospects)
- Streaks + close log + content log
- Missed-day banner dismissals
- Everything `a1xx_*` (full wipe — keeps only setup tokens)

**Reset Sheet Rows ↺** — calls Apps Script to truncate Sheet tabs. Categories:

- Daily Log tab rows
- Captured Leads tab rows

Both paths use a **two-step confirm**: first click arms the button (it turns red and pulses for 5 seconds), second click commits.

Always preserved (across both paths):

- Apps Script web app URL
- Todoist token
- Instagram token

### Sheet reset audit

Sheet rows are never destroyed. Before truncation, every row writes to a **Reset Audit** tab as JSON with timestamp + reason. You can always recover them.

### HOW-TO — Wipe inflated test data

1. System Health → "Reset test data" section
2. Click **Reset Browser Data ↺**
3. Tick the categories you want gone
4. Click **Reset Browser Data**, then click again within 5s to confirm
5. Page reloads with a clean slate
6. (Optional) Repeat with **Reset Sheet Rows ↺** for the durable side

---

## CHAPTER 15 — WHERE YOUR DATA LIVES (BACKEND MAP)

Three layers, in order from fast to durable.

### Layer 1 — Browser localStorage

Lives in your Chrome/Safari profile on the device you're using. Survives reloads. Wiped if you clear browser data.

Key map (all prefixed `a1xx_`):

- `daily_profit_v1` — today's DPC working snapshot
- `dpc_weekly_daily_logs_v1` — this week's daily rows
- `prospect_captures_v1` — captured prospects
- `streak`, `close_log_v1`, `content_log_v1` — history
- `sheets_url_v1` — Apps Script URL (preserved during reset)
- `todoist_v1` — Todoist token (preserved)
- `ig_token` — Instagram token (preserved)

### Layer 2 — Google Sheet (durable)

The Apps Script writes to:

- **Weekly Saves** — Sunday rollups
- **Cycle Archives** — cycle history
- **Activity Log** — every event the Apps Script handles
- **State Backups** — full localStorage JSON snapshots
- **Daily Log** — per-date DPC rows (upserted)
- **Captured Leads** — prospects from the Capture form (upserted by UUID, soft-delete supported)
- **Reset Audit** — rows archived before any Sheet reset
- **Dev Log** — change tracking from AI agents and operators

The Sheet's URL is configured in the operator's localStorage. Keep a copy of it in your operations Notion page so it survives device wipes.

### Layer 3 — Notion databases (read-only from the app)

The Apps Script reads from your Notion workspace via the Notion API but doesn't write to it. Typical databases:

- **CRM Lead Pipeline** — your sales/leads database
- **Content Drafts** — content calendar
- **Production Pipeline** — beats/tracks/projects in production
- **Resource Library** — active resources surfaced contextually
- **Live Events** — streams, IRL events, podcasts
- **Team Chat / Command Hub** — where AI agents and operators log decisions

Database IDs are configured in the HTML's `NOTION_*` constants. Update them when your Notion structure changes.

### Where the Capture form sends data

1. Immediately to `localStorage.a1xx_prospect_captures_v1`
2. POSTs to Apps Script → writes a row to the Sheet's **Captured Leads** tab
3. Does NOT push to Notion CRM (manual bridge: Export CSV → import in Notion)
4. Does NOT touch any external CRM platform (e.g., ClickFunnels) directly

---

## CHAPTER 16 — TROUBLESHOOTING

### "The numbers in my DPC look wrong / inflated"

Cause: stacked test saves accumulated.
Fix: System Health → Reset Browser Data ↺ → DPC daily logs. Or use **Edit today's totals** in the DPC card to overwrite directly.

### "The DPC form fields keep resetting to 0 when I switch fields"

Cause: outdated build.
Fix: Hard refresh the app (⌘ + Shift + R). Confirm the version banner shows the latest build.

### "I saved data but nothing showed up in the Sheet"

Cause: Apps Script URL not set, or current Apps Script version not deployed.
Fix: System Health → Sheets / Notion setup → paste your `/exec` URL. Then open the Apps Script editor and confirm the latest version is the deployed one.

### "Activity This Week revenue won't budge"

Cause: was a max-clamp bug in earlier builds. Now fixed.
Fix: Save a new DPC entry — the sum should refresh. If it still misbehaves, check the JS console for errors.

### "I'm seeing 100%+ in the topbar"

You've passed your cycle target. Either celebrate or wipe inflated test data via Reset Browser Data ↺.

### "The Missed-day banner won't go away"

Cause: yesterday has no saved DPC row.
Fix: Either click the banner → fill yesterday → save, OR click the × to dismiss for the rest of the day.

### "Calendar shows 'Calendar unavailable'"

Cause: Apps Script not deployed or returning non-JSON.
Fix: Redeploy the Apps Script web app from the editor. Confirm the test endpoint (action=test) returns JSON.

### "I deleted a capture by accident"

Cause: deletes are soft — the Sheet row gets a Deleted At timestamp but the row stays.
Fix: Open the Sheet → Captured Leads tab → find the row → clear the Deleted At cell. The next `prospect_log` GET will see it again.

### "Everything is broken, I want to roll back"

Fix: Use Restore backup ↓ in System Health. It pulls your last full localStorage snapshot from the Sheet's State Backups tab and replays it.

---

## CHAPTER 17 — THE CHECKLISTS

### Daily checklist (5 minutes morning + 5 minutes evening)

**Morning (before your Money block)**

- Open the app
- Check NOW banner — what block am I in?
- Glance at "Today so far" — what's already logged?
- Read today's Content card scheduled piece
- Review Hit List — top 3 leads to work today
- Set today's one thing

**Evening (Manager Time)**

- DPC → log seven numbers for today
- If a deal closed today, also log it via the Close form
- Check Activity This Week — running pace looking right?
- Capture any prospect notes from cold calls / IRL
- Save backup ↑ (optional but smart)

### Weekly checklist (end of operating week, 15 minutes)

- Fill in missed DPC days via backdate arrows
- Activities tab → fill manual fields (week target, expenses, sessions)
- Update income stream breakdown
- Write Big Win (1-2 sentences)
- Write Biggest Lesson (1-2 sentences)
- Click 💾 Save Weekly Update
- Open Report tab → check pacing vs cycle target

### Cycle checklist (end of cycle)

- Final weekly save for the cycle's last week
- Review the Cycle Archives sheet — anything missing?
- Click 📦 Archive Cycle on Activities tab
- Update next cycle's week target if it changed
- Set new cycle theme intention
- Take a real break before opening the next cycle

---

## APPENDIX — KEYBOARD SHORTCUTS

- **⌘ K** (Mac) / **Ctrl K** (PC) — open Rolodex and focus search

(More shortcuts will be added as the app grows. New shortcuts get documented here.)

---

## CHAPTER 18 — VERSION HISTORY

This is a living changelog. Add a new entry at the top each time the app ships.

### Template for future entries

```
### vX.Y — One-line release name (YYYY-MM-DD)
- Feature 1 description
- Feature 2 description
- Bug fix 1 description
```

### v1.0 — Initial release

- DPC date-awareness (delta/edit/future modes, prev/next arrows, Today so far, Edit-today override)
- Missed-day banner + Undo Last Save
- Activity This Week derives from daily log + bidirectional sync via applyWeeklyEdit
- Capture form (DPC → Follow-Up → Capture) with CLOSER coaching prompts + CSV export
- Reset Test Data in System Health (browser + Sheet, audit-archived)
- Money Mission OS gradient banner + condensed data strip + V1 beta tag
- Manager calendar NOW banner with 60s auto-refresh
- Rolodex overhaul (HQ Pages group, refreshed hub URLs, ⌘K shortcut, rel=noopener)
- Apps Script v1.7 (Daily Log + Captured Leads + Reset Audit endpoints)
- Topbar: cycle progress percentage caps at 100%+ when goal met
- Report tab: cards show earned amount + ✓ goal-met indicator (was confusing remaining-to-target wording)

---

## CLOSING

This app is a mirror. It shows you what your day actually produced. If you log honestly every day, by the end of your final cycle you'll have hit your mission target and built a system that runs itself. If you don't log, the app is useless. The mission is the mission. The app just keeps score.

**Keep stacking.**

— Money Mission OS Owner's Manual · Living Document
