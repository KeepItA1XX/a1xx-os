# Codex Handoff — A1XX Money Mission OS
**Date:** 2026-05-10
**From:** Claude (Sonnet 4.6)
**To:** Codex (ChatGPT)
**Purpose:** Continue exactly where Claude left off

---

## The App

**What it is:** Single-file HTML daily ops dashboard for A1XX's rap music production and coaching business.
**Live at:** https://keepita1xx.github.io/a1xx-os/money-mission-tracker-v1_8.html
**Local file:** `/Users/a1xxoffice/Documents/Codex/2026-05-06/i-have-a-html-for-an/money-mission-tracker-v1_8.html`
**GitHub repo:** `git@github.com:KeepItA1XX/a1xx-os.git` (SSH key at `~/.ssh/github_a1xx`)
**Deploy command:** `GIT_SSH_COMMAND="ssh -i ~/.ssh/github_a1xx" git push origin main`
**Stack:** Vanilla HTML/JS/CSS (~6800 lines), localStorage for state, Google Apps Script as backend proxy

---

## Ground Rules — Read These First

1. **Never delete anything.** Comment out old code with `// ARCHIVED YYYY-MM-DD — reason`. Never remove functions.
2. **Show code changes with surrounding context** — enough lines that the user can ctrl+F to the right spot in a 6800+ line file. Never minimal diffs.
3. **No framework, no build system.** Vanilla JS only.
4. **localStorage keys all prefixed `a1xx_`.** Don't add keys without this prefix.
5. **After every commit, the post-commit git hook auto-logs to Dev Log** in Google Sheets.
6. **Always commit with Co-Authored-By:** `Co-Authored-By: Codex (ChatGPT) <noreply@openai.com>`
7. **CRITICAL — ASCII quotes only in JS.** Claude's edit tool introduced typographic/curly quotes (U+2018/U+2019) as string delimiters in JS code. This silently breaks the entire script. Before every commit, run this check:

```bash
python3 -c "
import re
with open('money-mission-tracker-v1_8.html','r') as f:
    content = f.read()
scripts = re.findall(r'<script[^>]*>(.*?)</script>', content, re.DOTALL)
js = scripts[0]
lines = js.split('\n')
bad = []
for i, line in enumerate(lines):
    for j, c in enumerate(line):
        if ord(c) in (0x2018, 0x2019):
            before = line[j-1] if j > 0 else ''
            after  = line[j+1] if j < len(line)-1 else ''
            if before in \"=(:+,?!;&{[\" or after in \"=(:+,?!;&{[>\":
                bad.append((i+1, repr(line[max(0,j-20):j+20])))
print(f'Curly-quote delimiter issues: {len(bad)}')
for ln, ctx in bad[:10]:
    print(f'  Line {ln}: {ctx}')
"
```
Zero issues = safe to commit.

---

## Apps Script

**URL:** `https://script.google.com/macros/s/AKfycbx8rclmGXFeC5i7SAtLy7ZIVF2nm1IhIWZb1ksG7phum9HYBlIf0NLO_dZzRBDZSBE/exec`
**Pattern:** All POSTs use `mode:'no-cors'` (blind). GETs are readable.

**Available actions (GET):**
- `action=content_pipeline` — active content pipeline (readyTo ≠ Archived, ≠ Distribute)
- `action=content_pipeline&readyTo=Script` — filter by stage (Script/Film/Edit/Schedule)
- `action=content_pipeline&view=distribution` — items at readyTo=Distribute
- `action=production_pipeline` — production DB items
- `action=resources` — resource library
- `action=crm_leads` — active CRM leads
- `action=skool_community` — Skool member health metrics
- `action=instagram` — (deprecated — now direct browser call to graph.instagram.com)
- `action=calendar` — today's Google Calendar events
- `action=live_events` — upcoming live streams/events from Notion DB
- `action=search_resources&query=NAME` — find Notion resource page
- `action=get_backup` — restore last localStorage backup
- `action=health` — backend health check

**Available actions (POST `{type:'...'}`):**
- `type=backup_save` — save localStorage snapshot to Sheets
- `type=weekly_save` — save week data row
- `type=cycle_archive` — archive a completed cycle
- `type=log_change` — write a row to Dev Log tab
- `type=test` — test connection
- `type=create_content_idea` — **NOT YET IMPLEMENTED IN APPS SCRIPT** (HTML fires it, handler missing — add this)

**Apps Script functions user still needs to paste:**
1. `getLiveEvents()` — provided in previous handoff (CODEX_HANDOFF_2026-05-08.md) — user needs to paste and redeploy
2. `create_content_idea` POST handler — new, see spec below

---

## What Was Built This Session (Claude — May 10)

### Commits (newest first):
1. **Fix critical JS parse error** — 272 curly/typographic quotes replaced with ASCII in Pipeline sub-tab code. This was breaking the entire script silently.
2. **Pipeline sub-tabs** — Projects / Distribution / Community under the Pipeline tab
3. **Spark tab** — replaced Repurpose tab entirely
4. **Live tab + readyTo fix** — Content card 4th tab, moved streams out of Manager

### Content Card tab structure (final):
`Today | Pipeline | Spark | Live`

**Pipeline tab has 3 sub-tabs:**
- **Projects** — stage filters (All / Script / Film / Edit / Schedule), each fires `readyTo=` filter to Apps Script; shows title, score, format, channel, date, color-coded stage badge; bottleneck summary below; Longs/Shorts count at bottom
- **Distribution** — lazy-loaded, cached in `window.__distributionData`; 3 overview tiles + 6 platform tiles (YouTube, YT Shorts, IG Reels, TikTok, Threads, Skool)
- **Community** — lazy-loaded, cached in `window.__communityData`; 4 stat tiles (New This Month / Calls Booked / Masterclass / Upgraded) + newest members list

**Spark tab:**
- Quick Capture: textarea + format select → saves to `localStorage['a1xx_spark_queue']`
- Captured queue: shows pending ideas with Push → Notion button (fires `type=create_content_idea` POST) and ✕ delete
- Idea Bank: live Notion items at readyTo=Create or Plan

**Live tab:**
- Pulls from `window.__liveEvents` (loaded by `loadLiveEvents()` via `action=live_events`)
- Filters to streaming types only: Twitch Stream, IRL Stream, YouTube Live, Studio Session
- Shows: icon, name, status badge, date, countdown (In X days/Tomorrow/Today), platform tags, topic

### Key function locations (search by name in the HTML):
- `setPipelineSubTab()` — Pipeline sub-tab switcher
- `setPipelineFilter()` — stage filter buttons
- `renderProjectsTab()` — Projects sub-tab renderer
- `loadPipelineByStage()` — fetches filtered pipeline from Apps Script
- `loadAndRenderDistribution()` — Distribution sub-tab loader
- `renderDistributionTab()` — Distribution renderer
- `loadAndRenderCommunity()` — Community sub-tab loader
- `renderCommunityTab()` — Community renderer
- `normalizeNotionContentItem()` — normalizes Apps Script pipeline response format
- `stageBadgeClass()` — maps readyTo → CSS class for color-coded badge
- `captureIdea()` — Quick Capture save to localStorage
- `renderSparkQueue()` — renders captured queue
- `pushCapture(idx)` — POSTs to Apps Script, removes from queue
- `renderSparkIdeaBank()` — renders Notion ideas at Create/Plan stage
- `renderLiveTab()` — Live tab renderer
- `loadLiveEvents()` — fetches from Apps Script, stores in `window.__liveEvents`

### normalizeContentStage() fix:
Now reads `piece.readyTo` first (Apps Script v1.4+ field), then falls back to `piece.stage` then `piece.status`. Stage labels updated to match Notion: Film (was Record), Schedule (added), Posted (was Post).

---

## What Needs to Be Built Next — Priority Order

### 1. Apps Script — `create_content_idea` POST handler

Add to `doPost()` routing block:
```javascript
if (data.type === 'create_content_idea') return createContentIdea(data);
```

Add function:
```javascript
function createContentIdea(data) {
  var secret = PropertiesService.getScriptProperties().getProperty('NOTION_SECRET');
  if (!secret) return error('NOTION_SECRET not set.');
  var CONTENT_DB = '1a061152-81da-81bc-b7ec-cecbcba9ed8e';
  var payload = {
    parent: { database_id: CONTENT_DB },
    properties: {
      'Title': { title: [{ text: { content: data.title || 'Untitled Idea' } }] },
      'Ready To': { status: { name: data.readyTo || 'Create' } },
      'Format': data.format ? { select: { name: data.format } } : undefined,
      'Notes': data.source ? { rich_text: [{ text: { content: data.source } }] } : undefined
    }
  };
  // Remove undefined properties
  Object.keys(payload.properties).forEach(function(k) {
    if (!payload.properties[k]) delete payload.properties[k];
  });
  var res = UrlFetchApp.fetch('https://api.notion.com/v1/pages', {
    method: 'post',
    headers: {
      'Authorization': 'Bearer ' + secret,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  logActivity('create_content_idea: ' + data.title + ' — code: ' + res.getResponseCode());
  return ContentService.createTextOutput(JSON.stringify({ status: 'ok' })).setMimeType(ContentService.MimeType.JSON);
}
```

### 2. Cold call tracking in DPC card (deferred from last session)
User wants to track cold calls alongside DMs (Fanatical Prospecting / Jeb Blunt style):
- Add "Calls" input next to DMs in the DPC daily ops view
- Quick reschedule button
- Track daily call count in `a1xx_dpc_*` localStorage

### 3. Make Cash the dominant scoreboard metric
The scoreboard has 5 tiles. Cash/Revenue should be visually larger than the others.

### 4. Close streak in topbar
Show consecutive days with at least 1 close, similar to the save streak pill.

### 5. Manager card — Masterclass/Academy Call events panel
Business events (Masterclass, Academy Call, Conference, Industry Event) from the Masterclass Events DB (`de84e55d-d04c-4774-bed6-501181084511`) should show in the Manager card as a small "Upcoming Sessions" panel. NOT the same as live streams (those are in the Content card Live tab). Filter the Live Events DB by non-streaming types OR query the Masterclass Events DB directly.

---

## Notion Database IDs (reference)

- Content Drafts: `1a061152-81da-81bc-b7ec-cecbcba9ed8e`
- Production: `1a761152-81da-8178-ad45-000b48fc3735`
- Resource Library: `35861152-81da-8053-8d5e-c5e6c5042e6c`
- CRM Lead Pipeline: `b82e7140-b3b0-48d1-915d-34e4cdf9f65a`
- Masterclass Events: `de84e55d-d04c-4774-bed6-501181084511`
- Live Events & Streams: `99fcf23b-0cdc-49e7-9e23-9e99c08438d5`

---

## Content Card — Notion Field Mapping

Apps Script `content_pipeline` endpoint returns items with these fields:
```
title, readyTo, phase, format, platform (array), channel, score, type (array),
productionDate, publishDate, url
```

`normalizeNotionContentItem()` in the HTML handles this format. Don't run these through `normalizeNotionContent()` — that function filters out items without a date and would drop most pipeline items.

Stage badge colors (CSS classes):
- `stage-create` / `stage-plan` → purple
- `stage-script` → purple
- `stage-film` → brown/gold
- `stage-edit` → green
- `stage-schedule` → blue
- `stage-posted` / `stage-distribute` → green

---

## Instagram Setup (current state)

- Token stored in `localStorage['a1xx_ig_token']` (IGAA token from Meta App dashboard)
- Direct browser call to `graph.instagram.com/me` — no Apps Script roundtrip
- Token refresh: 🔑 Refresh Token button opens modal (`openIGTokenModal()`)
- Short-lived tokens (~1 hour) — user pastes new one when it expires
- Report tab shows: media count, posts this week, week % progress bar (analytics only, no post previews)
- Rolodex shows: follower count, account info, last 10 posts (filtered by `filterRolodex()`)

---

## localStorage Keys

All prefixed `a1xx_`:
- `a1xx_sheets_url` — Apps Script URL
- `a1xx_store` — weekly data
- `a1xx_dpc_*` — daily ops data
- `a1xx_spark_queue` — Quick Capture idea queue (NEW)
- `a1xx_ig_token` — Instagram IGAA token (NEW)
- `a1xx_auto_backup_meta_v1` — auto-backup metadata
- `a1xx_close_log` — close events array
- `a1xx_streak` — save streak

---

## Safe Render Pattern

All DOM updates go through `safeRender(label, fn)`:
```javascript
safeRender('pipeline projects', function() { renderProjectsTab(); });
```

All data loads go through `safeLoad(label, loader, fallback, timeoutMs)`:
```javascript
safeLoad('live events', function() { return loadLiveEvents(); }, [], 12000)
```

---

## Pending Sprint Items (from 18-item audit)

- [x] Content Card — 4 tabs (Today / Pipeline / Spark / Live)
- [x] Pipeline sub-tabs (Projects / Distribution / Community)
- [x] Fix readyTo stage bug in pipeline
- [x] Spark tab replaces Repurpose
- [x] Live tab for streams
- [x] Notion Live Events DB created + placeholder events
- [x] Instagram analytics in Report tab
- [ ] **Apps Script: create_content_idea handler** ← NEXT (needed for Spark Push button)
- [ ] **Apps Script: getLiveEvents() handler** ← paste and redeploy (code in CODEX_HANDOFF_2026-05-08.md)
- [ ] Cold call tracking in DPC card (Fanatical Prospecting style)
- [ ] Make Cash the dominant scoreboard metric
- [ ] Close streak in topbar
- [ ] Manager card — Masterclass/Academy Call events panel
- [ ] Separate leads from resources in Rolodex
- [ ] Revenue attribution per close
- [ ] Pipeline velocity tracking
- [ ] FedEx schedule awareness in time blocks
- [ ] Stage-aware follow-up scripts per lead stage

---

## Chief of Staff Dependencies (blocking Community tab real data)

The Community sub-tab shows zeros until:
1. Make.com: ClickFunnels → Notion CRM Source = Skool mapping is live
2. Zapier Zap A: Call Booked tag → Skool Call Booked checkbox in CRM
3. Zapier Zap B: Masterclass registered → Skool Masterclass checkbox in CRM
4. At least one CRM contact has Skool Member = true

See `CHIEF_OF_STAFF_HANDOFF_2026-05-08.md` for full setup instructions.
