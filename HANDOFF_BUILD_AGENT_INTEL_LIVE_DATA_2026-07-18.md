# Build Agent Handoff — Intel Live Data Continuation

## Receiver

Build Agent. Source thread: current Codex build thread.

Project folder: `/Users/a1xxoffice/Documents/Codex/2026-05-06/i-have-a-html-for-an`

## Context

Money Mission OS v2.5 is a player-facing, read-only-first operating dashboard. Intel is the front-facing AI operations layer with Today, Agents, and Library workspaces. The current effort replaces seeded/local Intel demo data with live Apps Script/Notion read data while preserving protected boundaries: no live approvals, writes, sends, worker execution, notifications, automations, XP/tokens, or secrets from these surfaces.

## Current architecture

- HTML app: `money-mission-tracker-v2_5.html`
- Apps Script source: `apps-script-money-mission-tracker-v2_5.gs`
- Apps Script URL is stored in localStorage key `a1xx_sheets_url_v1`.
- Read route: `action=intel_read_packet_v1`.
- Browser transport: JSONP bridge, added because browser fetch/CORS was unreliable.
- Live packet verified as `status=live` with 8 departments, 41 jobs, 98 skills, 5 workers, 16 outputs, and 5 projects.

## Completed

1. Apps Script Intel read route supports callback JSONP and normal JSON.
2. HTML JSONP client includes timeout and cleanup.
3. Live packet normalization feeds Today/Library/context.
4. Agents registry rebuild makes live departments, jobs, skills, and workers drive the Agents tabs.
5. Today includes a read-only Live Projects block under More Today Context.
6. Browser evidence confirmed live labels/counts: 41 jobs, 98 skills, 5 workers, and departments labeled Live Intel.
7. Syntax and diff checks passed.

## Commits

- `a19e2b4` — Route Intel live reads through JSONP bridge
- `c8e1881` — Use live Intel agent registry for workspace tabs
- `254a7bc` — Surface live projects in Intel Today (latest)

## Backups

- `apps-script-money-mission-tracker-v2_5.gs_backup_2026-07-18_0945_intel_jsonp_bridge`
- `money-mission-tracker-v2_5.html_backup_2026-07-18_0945_intel_jsonp_client`
- `money-mission-tracker-v2_5.html_backup_2026-07-18_1007_live_registry_overlay`
- `money-mission-tracker-v2_5.html_backup_2026-07-18_1015_live_projects_today`

## Goal

Make Intel Today, Agents, and Library reliably reflect real Notion/Apps Script read data, with clear source/freshness labeling and no misleading placeholder content where live records exist. Keep the UI operator-friendly, read-only, protected, and usable at 125%, 150%, and 175% zoom.

## Remaining implementation

### Today

- Replace seeded timeline rows with live `today.brief`, `today.queues`, `today.approvals`, and `today.recent` records where available.
- Replace seeded business signal values where live packet/Sheets data exists; label unavailable values instead of showing demo numbers.
- Keep Live Projects easy to find in the primary Today scan.
- Preserve protected read-only actions.

### Agents

- Correct status/readiness wording so metrics do not imply invented worker readiness or local outputs.
- Handle unparented live jobs explicitly as Unassigned/Operations review; do not silently assign them to the first department.
- Map the packet's 16 live outputs into Agents Outputs. Current registry rebuild leaves job outputs empty, so the UI can say “No outputs staged yet.”
- Preserve live source URLs and record IDs.

### Library

- Bind `packet.library.outputs`, `memory`, and `files` consistently into Library and output detail.
- Distinguish live Notion records from local protected staged decisions.
- Never fabricate readiness, review, handoff, or delivery states.

### Source/freshness UX

- Add compact visible LIVE / PARTIAL / UNAVAILABLE state where appropriate.
- Keep developer/source details collapsed by default.

## Verification

- JSONP probe returns callback-wrapped `intel_read_packet_v1` with `status=live`.
- Served Pages HTML contains the JSONP bridge and latest registry/project code.
- `node --check` on extracted inline scripts passes.
- `git diff --check` passes.
- Browser QA confirms 8 departments, 41 jobs, 98 skills, 5 workers, 16 outputs, and 5 projects.
- Verify Today, Agents, and Library at 125%, 150%, and 175% zoom.
- Confirm no writes, sends, approvals, worker execution, notifications, automations, XP, tokens, or secrets are enabled.

## Boundaries

- Build Agent implements approved production changes only.
- Never delete files/data; never archive without A1XX approval.
- Back up important files with timestamps before editing.
- Do not deploy Apps Script changes without backup and approval.
- Do not activate loops or create `.codex/agents/*.toml`.
- Do not turn placeholder data into fake live data; label unavailable or fail visibly.
- Do not broaden into Mission Command voice, payments, client fulfillment, or unrelated UI.

## Open decisions for A1XX

- Move live project cards into the primary Today scan or keep them under More Today Context?
- Which packet collections are authoritative for timeline and business signals?
- Group the 16 outputs by department/job in Agents, or keep them Library-only until ownership relations are complete?
- What label should be used for records missing department/job ownership?

## Handoff instruction

Continue from commit `254a7bc`. Start with read-only Today binding and output mapping. Return changed files, timestamped backups, exact verification results, deployment status, and blockers.
