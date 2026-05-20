# Codex Handoff — A1XX Money Mission OS
**Date:** 2026-05-08
**From:** Claude (Sonnet 4.6)
**To:** Codex (ChatGPT)
**Purpose:** Pick up HTML + Apps Script development exactly where Claude left off

---

## The App

**What it is:** Single-file HTML daily ops dashboard for A1XX's rap music production and coaching business.
**Live at:** https://keepita1xx.github.io/a1xx-os/
**Local file:** `/Users/a1xxoffice/Documents/Codex/2026-05-06/i-have-a-html-for-an/money-mission-tracker-v1_5.html`
**GitHub repo:** `git@github.com:KeepItA1XX/a1xx-os.git` (SSH key at `~/.ssh/github_a1xx`)
**Deploy command:** `git add money-mission-tracker-v1_5.html && git commit -m "..." && git push origin main`
**Stack:** Vanilla HTML/JS/CSS (~6200 lines), localStorage for state, Google Apps Script as backend proxy

---

## Apps Script

**URL:** `https://script.google.com/macros/s/AKfycbx8rclmGXFeC5i7SAtLy7ZIVF2mn1IhIWZb1ksG7phum9HYBlIf0NLO_dZzRBDZSBE/exec`
**Version:** 1.4 (just updated — see below)
**Pattern:** All POSTs use `mode:'no-cors'` (blind — can't read response). GETs are readable.

**Available actions (GET):**
- `action=content_pipeline` — content in production (fixed in v1.4, see below)
- `action=content_pipeline&view=distribution` — distributed content only
- `action=content_pipeline&readyTo=Script` — filter by production stage (Script/Film/Edit/Schedule)
- `action=production_pipeline` — production DB items
- `action=resources` — resource library
- `action=crm_leads` — active CRM leads
- `action=skool_community` — Skool member health metrics (NEW in v1.4)
- `action=instagram` — Instagram account overview, last 10 posts, 7-day insights (NEW in v1.5 — add the function, see section below)
- `action=calendar` — today's Google Calendar events
- `action=search_resources&query=NAME` — find Notion resource page by name
- `action=get_backup` — restore last localStorage backup
- `action=health` — backend health check

**Available actions (POST `{type:'...'}`):**
- `type=backup_save` — save localStorage snapshot to Sheets
- `type=weekly_save` — save week data row
- `type=cycle_archive` — archive a completed cycle
- `type=log_change` — write a row to Dev Log tab in Sheets
- `type=test` — test connection

---

## Ground Rules — Read These First

1. **Never delete anything.** Comment out old code with `// ARCHIVED YYYY-MM-DD — reason`. Never remove functions.
2. **Show code changes with surrounding context** — enough lines that the user can ctrl+F to the right spot in a 6000+ line file. Never minimal diffs.
3. **No framework, no build system.** Vanilla JS only.
4. **localStorage keys all prefixed `a1xx_`.** Don't add keys without this prefix.
5. **After every commit, the post-commit git hook auto-logs to Dev Log** in Google Sheets. No manual logging needed.
6. **Always commit with Co-Authored-By:** `Co-Authored-By: Codex (ChatGPT) <noreply@openai.com>` — this is how the Dev Log identifies which AI made the change.

---

## What Was Just Built (Claude's Session — May 7-8)

### HTML changes completed:
- "Do this right now" box centered, bigger text
- Scoreboard: 5 tiles on one row (`grid-template-columns: repeat(5,1fr)`)
- Mission Journey game mechanic: Step 1 of 4 per day type (Outreach/Beat/Content/Manager), checklists, resource buttons, step completion
- Manager split view: Calendar + Tasks side-by-side in `#manager-split-wrapper` (flex)
- White text override block for active tabs, buttons, labels (no more green-on-green)
- Auto-save system: hourly with change detection, hibernate mode midnight–6am, 💾 nudge in topbar
- Live clock in topbar (30s interval), business revenue + days left in topbar
- Dev Log: `logDevChange(agent, layer, summary, session)` fires on manual Save Now
- Bottleneck line moved to bottom of Now view
- Mission complete message: white text (was green-on-green)
- `updateTopbarBiz()` wired into `updateReport` patch

### Notion changes completed (by Claude directly):
- `Platform` multi-select added to Content Drafts DB: YouTube, YouTube Shorts, Instagram Reels, TikTok, Threads, Skool
- `🎓 EVT — Masterclass Events` DB created in CRM Hub
- `Attendees (CRM)` relation added: Masterclass Events ↔ CRM Lead Pipeline (two-way)
- `Skool Member`, `Skool Call Booked`, `Skool Masterclass` checkboxes added to CRM Lead Pipeline DB

---

## What Needs to Be Built Next — Priority Order

### 1. Content Card — 3 Sub-Tabs Under Pipeline (NEXT UP)

The content card currently has tabs: Today / Pipeline / Stats. The Pipeline tab needs three sub-tabs:

**Projects** (rename current pipeline view, add stage filters)
- Filter buttons: All | Script | Film | Edit | Ready
- Each button calls `action=content_pipeline&readyTo=[stage]` or `action=content_pipeline` for All
- Display per item: title, Ready To stage (badge), format, channel, production date, score (💰 rating), link to Notion
- Stage badge colors: Plan=purple, Script=purple, Film=brown, Edit=green, Schedule=blue

**Distribution** (numbers and charts, no paragraphs)
- Calls `action=content_pipeline&view=distribution`
- Shows: total posted count, long vs short breakdown, platform breakdown (YouTube / YouTube Shorts / Instagram Reels / TikTok / Threads)
- Display as simple stat tiles, not text blocks
- Platform filter: filter the distribution list by platform tag
- No advice text for now

**Community** (Skool member health)
- Calls `action=skool_community`
- Shows 4 stat tiles: New Members This Month / Calls Booked / Masterclass Attended / Upgraded
- Below tiles: list of newest members this month (name, genre, opt-in date, Instagram handle)
- No engagement rate, no upcoming posts section — keep it tight

### 2. Fix content_pipeline filter bug in HTML
The HTML currently calls `content_pipeline` and maps `props.status` — but v1.4 fixed the Apps Script to return `readyTo` and `phase` fields instead. Make sure the HTML normalizer reads `item.readyTo` for the stage badge, not `item.status`.

### 3. Apps Script — `content_pipeline` filter fix (already done in v1.4)
Claude already provided the replacement function. If the user hasn't pasted it yet, here it is. Replace the existing `getContentPipeline` in Apps Script with this:

```javascript
function getContentPipeline(e) {
  var secret = PropertiesService.getScriptProperties().getProperty('NOTION_SECRET');
  var databaseId = e.parameter.databaseId || NOTION_CONTENT_DB;
  var stageFilter = e.parameter.readyTo || null;
  var viewMode    = e.parameter.view    || 'projects';

  if (!secret) return error('NOTION_SECRET not set in Script Properties.');

  var filter, cacheKey;

  if (viewMode === 'distribution') {
    filter   = { property: 'Ready To', status: { equals: 'Distribute' } };
    cacheKey = 'content_distribution';
  } else if (stageFilter) {
    filter   = { property: 'Ready To', status: { equals: stageFilter } };
    cacheKey = 'content_stage_' + stageFilter.toLowerCase();
  } else {
    filter = {
      and: [
        { property: 'Ready To', status: { does_not_equal: 'Archived'   } },
        { property: 'Ready To', status: { does_not_equal: 'Distribute' } }
      ]
    };
    cacheKey = 'content_pipeline';
  }

  var result = notionQuery(databaseId, {
    filter: filter,
    sorts:  [{ property: 'Production Date', direction: 'ascending' }],
    page_size: 25
  }, cacheKey);

  logActivity('Content pipeline — view: ' + viewMode + ' | stage: ' + (stageFilter || 'all') + ' | code: ' + result.code);

  if (result.code >= 400) return error('Notion content pipeline ' + result.code + ': ' + result.text);

  var data  = JSON.parse(result.text);
  var items = (data.results || []).map(function(page) {
    var props = page.properties || {};
    return {
      title:          readNotionTitle(props.Title),
      readyTo:        readNotionStatus(props['Ready To']),
      phase:          readNotionStatus(props.Phase),
      format:         readNotionSelect(props.Format),
      platform:       readNotionMulti(props.Platform),
      channel:        readNotionSelect(props.Channel),
      score:          readNotionSelect(props.Score),
      type:           readNotionMulti(props.Type),
      productionDate: readNotionDate(props['Production Date']),
      publishDate:    readNotionDate(props['Publish Date']),
      url:            page.url
    };
  });

  return ContentService
    .createTextOutput(JSON.stringify({
      status: 'ok', items: items, view: viewMode, stage: stageFilter
    }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

---

## Key Technical Details

### localStorage Keys
All prefixed `a1xx_`. Key ones:
- `a1xx_sheets_url` — Apps Script deployment URL
- `a1xx_store` — weekly data (rev, dms, calls, closes, streams, notes)
- `a1xx_dpc_*` — daily ops data
- `a1xx_auto_backup_meta_v1` — `{lastModified, lastSaved, hibernateSave}`
- `a1xx_close_log` — array of close events
- `a1xx_streak` — save streak

### Safe Render Pattern
All DOM updates go through `safeRender(label, fn)`:
```javascript
safeRender('content pipeline', function() { /* render code */ });
```

### Card Visibility
Cards use `mission-hidden` CSS class + `display:none`. Controlled by `openMissionTool(tool, shouldScroll)`.

The ids map inside `openMissionTool`:
```javascript
{
  dpc: 'dpc-card',
  content: 'content-tracker-card',
  production: 'production-card',
  calendar: 'manager-split-wrapper',
  tasks: 'manager-split-wrapper',
  manager: 'manager-split-wrapper'
}
```
After the loop, if tool === 'manager', set `display:flex` on the wrapper.

### Notion DB IDs
- Content Drafts: `1a061152-81da-81bc-b7ec-cecbcba9ed8e`
- Production: `1a761152-81da-8178-ad45-000b48fc3735`
- Resource Library: `35861152-81da-8053-8d5e-c5e6c5042e6c`
- CRM Lead Pipeline: `b82e7140-b3b0-48d1-915d-34e4cdf9f65a`
- Masterclass Events: `de84e55d-d04c-4774-bed6-501181084511` (NEW — just created)

### Notion Content DB Fields (exact names)
- Title field: `Title` (NOT Name)
- Stage: `Ready To` — Create, Plan, Script, Film, Edit, Schedule, Distribute, Archived
- Phase: `Phase` — Not started, In progress, Waiting, Done
- Format: `Format` — Long Video, Short Video, Reel, Photo, Text-only, Blog, Tweet, Carousel, Suite, Podcast
- Platform: `Platform` — YouTube, YouTube Shorts, Instagram Reels, TikTok, Threads, Skool (multi-select, NEW)
- Channel: `Channel` — Support Independent Rappers / A100DRUMZ
- Score: `Score` — 💰 through 💰💰💰💰💰
- Dates: `Production Date`, `Publish Date`

### Notion CRM Fields (exact names)
- Title field: `Name`
- Source: `Source` — has "Skool" as an option
- Pipeline Stage: `Pipeline Stage` — includes `🏆 Closed Won`
- Skool Member: `Skool Member` (checkbox, NEW)
- Skool Call Booked: `Skool Call Booked` (checkbox, NEW)
- Skool Masterclass: `Skool Masterclass` (checkbox, NEW)

---

## Apps Script v1.5 — Instagram Graph API (Add This Now)

**Status:** Chief of Staff has set up the Meta App and retrieved credentials. User will store `META_TOKEN` and `INSTAGRAM_BUSINESS_ID` in Apps Script Script Properties. You just need to add the function.

### Step 1 — Add to `doGet()` routing block:
```javascript
if (e.parameter.action === 'instagram') return getInstagramData(e);
```

### Step 2 — Add these three functions to Apps Script:

```javascript
function getInstagramData(e) {
  var token = PropertiesService.getScriptProperties().getProperty('META_TOKEN');
  var igId  = PropertiesService.getScriptProperties().getProperty('INSTAGRAM_BUSINESS_ID');
  if (!token || !igId) return error('META_TOKEN or INSTAGRAM_BUSINESS_ID not set.');

  // Account overview
  var accountRes = UrlFetchApp.fetch(
    'https://graph.facebook.com/v21.0/' + igId +
    '?fields=followers_count,media_count,profile_picture_url,username,biography' +
    '&access_token=' + token, { muteHttpExceptions: true });
  var account = JSON.parse(accountRes.getContentText());

  // Last 10 posts
  var mediaRes = UrlFetchApp.fetch(
    'https://graph.facebook.com/v21.0/' + igId +
    '/media?fields=id,caption,media_type,timestamp,like_count,comments_count,permalink' +
    '&limit=10&access_token=' + token, { muteHttpExceptions: true });
  var mediaData = JSON.parse(mediaRes.getContentText());
  var posts = (mediaData.data || []).map(function(post) {
    return {
      id:       post.id,
      caption:  (post.caption || '').slice(0, 120),
      type:     post.media_type,
      timestamp: post.timestamp,
      likes:    post.like_count    || 0,
      comments: post.comments_count || 0,
      url:      post.permalink
    };
  });

  // 7-day reach/impressions/profile views
  var insightRes = UrlFetchApp.fetch(
    'https://graph.facebook.com/v21.0/' + igId +
    '/insights?metric=reach,impressions,profile_views,follower_count' +
    '&period=day&since=' + get7DaysAgo() + '&until=' + getTodayStr() +
    '&access_token=' + token, { muteHttpExceptions: true });
  var insightData = JSON.parse(insightRes.getContentText());
  var insights = {};
  ((insightData.data) || []).forEach(function(metric) {
    var total = (metric.values || []).reduce(function(s, v) { return s + (v.value || 0); }, 0);
    insights[metric.name] = total;
  });

  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', account: account, posts: posts, insights: insights }))
    .setMimeType(ContentService.MimeType.JSON);
}

function get7DaysAgo() {
  var d = new Date(); d.setDate(d.getDate() - 7);
  return Math.floor(d.getTime() / 1000);
}
function getTodayStr() { return Math.floor(new Date().getTime() / 1000); }
```

### What to wire into the HTML (after user confirms credentials are set):

| Location | What to show |
|---|---|
| Content Card → Today tab | Last post signal: caption preview, likes, comments, timestamp |
| Rolodex → Instagram section | Follower count, 7-day reach, last 10 posts list |
| (Optional) Scoreboard | Replace static follower count with live pull — only if user requests |

### What NOT to build:
- DM inbox (requires special permissions)
- Story insights (different endpoint, lower priority)
- Ad account data (different API entirely)

### Action token note:
The `META_TOKEN` stored in Script Properties is a **long-lived Page Access Token (~60 days)**. When it expires, Chief of Staff will generate a new one. No refresh logic needed in the app for now.

---

## Sprint Items Still Open

From the 18-item audit (May 2026):
- [ ] **Content Card — 3 sub-tabs** (Projects, Distribution, Community) ← NEXT
- [ ] Remove empty Performance tab from Content card
- [ ] Studio pipeline view in Rolodex
- [ ] Close log (product, price, source, lead name, date per close)
- [ ] Close streak in topbar
- [ ] Merge Focus and Gap sub-tabs into Command view
- [ ] Make Cash the visually dominant scoreboard metric
- [ ] Stage-aware follow-up scripts per lead stage
- [ ] Separate leads from resources in Rolodex
- [ ] FedEx schedule awareness in time blocks
- [ ] Revenue attribution per close
- [ ] Pipeline velocity tracking

---

## Dev Log — How to Log Your Changes

Every git commit auto-logs to the Dev Log tab in Google Sheets via the post-commit hook. Just make sure your commits include:
```
Co-Authored-By: Codex (ChatGPT) <noreply@openai.com>
```

For significant non-commit changes, you can also call the endpoint directly:
```json
POST to Apps Script URL:
{
  "type": "log_change",
  "agent": "Codex (ChatGPT)",
  "layer": "HTML",
  "summary": "What you did",
  "session": "optional context"
}
```
