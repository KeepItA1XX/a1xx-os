# Chief of Staff Handoff — A1XX OS Infrastructure
**Date:** 2026-05-08
**From:** Claude (Sonnet 4.6)
**To:** Chief of Staff AI
**Purpose:** Continue Notion + automation setup where Claude left off

---

## What Claude Did Today (Already Complete — Do Not Repeat)

### Notion changes made directly via API:

| What | Where | Status |
|---|---|---|
| Added `Platform` multi-select field | Content Drafts DB | ✅ Done |
| Created `🎓 EVT — Masterclass Events` DB | Under CRM Hub page | ✅ Done |
| Added `Attendees (CRM)` relation | Masterclass Events ↔ CRM (two-way) | ✅ Done |
| Added `Skool Member` checkbox | CRM Lead Pipeline | ✅ Done |
| Added `Skool Call Booked` checkbox | CRM Lead Pipeline | ✅ Done |
| Added `Skool Masterclass` checkbox | CRM Lead Pipeline | ✅ Done |

**Platform field options added to Content Drafts:**
YouTube / YouTube Shorts / Instagram Reels / TikTok / Threads / Skool

**Masterclass Events DB fields:**
Event Name (title), Date, Type (Masterclass/Academy Call/Onboarding/Workshop), Status (Upcoming/Live/Complete), Registrations (number), Attendees (number), Closes (number), Revenue ($), Follow-Up Status (Pending/In Progress/Done), Notes, Attendees (CRM) relation

---

## What You Need to Do Now

### Task 1 — Verify ClickFunnels Skool Tag Name

Log into ClickFunnels. Find the tag that gets applied when someone joins the free Skool community. It is believed to be `skool lead`. Confirm the exact spelling and case. You'll use this in every step below.

---

### Task 2 — Update Make.com: Map Skool Tag → Source Field in Notion

The existing Make.com automation syncs ClickFunnels contacts into Notion CRM. You need to add one mapping:

**In the existing ClickFunnels → Notion CRM scenario:**
- Find where the Notion CRM record is created/updated
- Add condition: if the ClickFunnels contact has the `[skool lead tag]` → set `Source = Skool` in the Notion CRM record

The `Source` field in Notion CRM already has "Skool" as a select option. You're just making sure Make.com is writing it.

**To verify it worked:** Find a known Skool community member in Notion CRM. Check their Source field. It should say "Skool".

---

### Task 3 — Two New Zapier Zaps

A1XX is on Zapier free plan with the Skool paid plan enabling the Zapier connection. Do not upgrade Zapier. Keep zaps simple.

**Before creating zaps — confirm these ClickFunnels tags exist:**
- A tag for when someone books a strategy/sales call (e.g. `call booked` or similar)
- A tag for when someone registers for a masterclass (e.g. `masterclass registered` or similar)

If these tags don't exist, create them in ClickFunnels and make sure the booking page / masterclass registration page applies them on form submit.

---

**Zap A — Call Booked → Notion CRM**

| Field | Value |
|---|---|
| Trigger app | ClickFunnels |
| Trigger event | Contact Tag Added |
| Tag | `[call booked tag]` |
| Filter | Only continue if contact also has `[skool lead tag]` |
| Action app | Notion |
| Action | Find page in CRM DB by email → Update page |
| Update | Set `Skool Call Booked = true` |

CRM DB ID: `b82e7140-b3b0-48d1-915d-34e4cdf9f65a`

---

**Zap B — Masterclass Registration → Notion CRM**

| Field | Value |
|---|---|
| Trigger app | ClickFunnels |
| Trigger event | Contact Tag Added |
| Tag | `[masterclass registered tag]` |
| Filter | Only continue if contact also has `[skool lead tag]` |
| Action 1 | Notion — Find page in CRM by email → Update page → Set `Skool Masterclass = true` |
| Action 2 | Notion — Find matching Masterclass Events page by name/date → Add CRM page to `Attendees (CRM)` relation |

Masterclass Events DB ID: `de84e55d-d04c-4774-bed6-501181084511`

---

### Task 4 — Verify Upgrades Flow Correctly

When a Skool member purchases a paid product (Rappreneur OS membership, production deal, etc.), their Notion CRM record should update `Pipeline Stage = 🏆 Closed Won`.

Check: find a Skool member who you know has purchased. Is their Pipeline Stage set to Closed Won in Notion CRM?

If not — trace the purchase flow in ClickFunnels and identify where the stage update should happen. Fix the Make.com scenario or add a Zap to handle it.

---

### Task 5 — Masterclass Events DB: Add First Event

The DB is empty. Add the next upcoming event (Rapper Secrets Masterclass or Academy Call) as the first record so the team can see it's working. Fill in: Event Name, Date, Type, Status = Upcoming.

---

## What the App Will Query (Reference for Codex)

The A1XX OS dashboard app reads these fields via Google Apps Script:

**Skool Community Tab:**
- `Skool Member = true` → counts total community
- `Date Added` or `Opt-In Date` this month → new members count
- `Skool Call Booked = true` → calls booked count
- `Skool Masterclass = true` → masterclass attended count
- `Pipeline Stage = 🏆 Closed Won` AND `Skool Member = true` → upgrades count

**Content Distribution Tab:**
- `Ready To = Distribute` in Content Drafts → distributed content
- `Platform` multi-select → platform breakdown
- `Format` → long vs short breakdown
- `Publish Date` → posted timeline

Do not rename these fields. Do not change their types. The app depends on exact field names.

---

## Do Not Touch

- Existing Zapier Skool → ClickFunnels zap (don't modify the trigger or existing actions)
- Existing Make.com ClickFunnels → Notion sync (only ADD the Source mapping, don't change existing field mappings)
- Any existing Notion CRM pages or data
- Content Drafts DB existing fields (Platform was added, all others untouched)

---

## Confirm Back to A1XX When Done

When complete, report:
1. Exact ClickFunnels tag name for Skool joins (confirmed spelling)
2. Exact tag names used for Zap A and Zap B
3. Whether Make.com Source mapping is live and tested
4. Whether a known Skool member now shows `Source = Skool` in Notion CRM
5. First Masterclass Events record added (event name + date)

Codex needs items 3 and 4 confirmed before it can wire up the Community tab in the app.

---

## Context: What This Is All For

A1XX runs an HTML dashboard app (Money Mission OS) that pulls live data from Notion to show daily priorities. The Community tab in this app will show Skool member health at a glance — how many joined this month, how many booked a call, how many attended a masterclass, how many upgraded to paid. The app queries Notion CRM directly. Every field you're setting up feeds directly into that display.
