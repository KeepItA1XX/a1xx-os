# Milestone 01 — Planning Live Context Local Implementation

Status: `local_source_complete_runtime_unverified_no_deployment`

## Delivered locally

- Added the Apps Script `planning_live_context_v1` read-only route.
- Projects projection: title, type, status, priority, current next move, outcome, A1XX-review flag, closest-to-money flag, and safe edit freshness only; maximum 50 rows.
- Task projection: Task (Master) rows where `App Read Eligible` is checked; title, status, due date, priority, opaque related-project IDs, result needed, and safe edit freshness only; maximum 20 rows.
- Added a Planning adapter that presents Focus, Blockers, Approvals, and Next moves in the Planner.
- Added visible-tab-only five-minute refresh eligibility, last-verified stale display, and local-only `planning_action_drafts_v1` drafts marked `Not sent`.

## Boundaries held

- No Notion schema, record, relation, template, or other write.
- No CRM, Drive, Sheets, separate Tasks database, raw page URL, contact detail, attachment, or relation expansion in the new packet.
- No webhook, reminder dispatch, automation, agent execution, deployment, sync, beta, commit, push, or broad QA.
- The Codex Notion SQL connector dispatch issue remains a parked platform concern, not this relay's data plane.

## Verification

- Apps Script syntax: passed through `node --check < apps-script-money-mission-tracker-v2_5.gs`.
- HTML inline script parse: passed.
- `git diff --check`: passed.
- Static contract checks: passed for endpoint routing, packet name, row caps, App Read Eligible filter, field exclusions, write blocks, visible-tab polling, five-minute interval, stale cache, and local-only draft wording.

## Files and backups

- Changed: `apps-script-money-mission-tracker-v2_5.gs`
- Changed: `money-mission-tracker-v2_5.html`
- Backup: `apps-script-money-mission-tracker-v2_5_backup_2026-07-18_130708_milestone01_planning_live_context.gs`
- Backup: `money-mission-tracker-v2_5_backup_2026-07-18_130708_milestone01_planning_live_context.html`

## Current hashes

- Apps Script: `b37a6964f4d8a304bfb24a3d58894fc2e2c65fd65f4ea294ccdf6dc226ee3bf8`
- HTML: `b3d11a8d1f416bff98c255854de8a5be906d66525a3cad6d4e0548eb783ab04b`

## Next gate

`APPROVE MILESTONE 01 PHASE 5 STAGE 5.1 APPS SCRIPT READ-ONLY RELAY DEPLOYMENT AND PLANNING RUNTIME VERIFICATION ONLY`

This gate must deploy only the already-reviewed Apps Script change, then perform one bounded Planning surface verification of the source allowlist, row caps, safe field shape, freshness/stale transition, visible-tab polling eligibility, draft isolation, and no-write behavior. It must stop before Today, Projects, Mission Command, webhooks, reminders, agent actions, sync, beta, commit, or push.
