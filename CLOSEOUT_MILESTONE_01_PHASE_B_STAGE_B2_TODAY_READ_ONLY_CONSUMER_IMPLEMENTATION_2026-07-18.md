# Milestone 01 Phase B Stage B2 - Today Read-Only Consumer Implementation

Date: 2026-07-18
Disposition: implemented_static_verified_runtime_verification_pending

## Locked provenance

- Decision packet: `/Users/a1xxoffice/A1XX WIKI/06 Command Hub/PACKET_MILESTONE_01_PHASE_B_STAGE_B1_TODAY_READ_ONLY_CONSUMER_IMPLEMENTATION_DECISION_2026-07-18.md`
- Decision packet SHA-256: `277f4c9a77b895c9728328984b7d86d8e884d39a5d9f320cbab726b3151b1347`
- Predecessor HTML SHA-256: `42d50eca0c072578319fa0a13d01de35f2fbb5035bd989eec852e238c8e54b8d`
- Post-edit HTML: `/Users/a1xxoffice/Documents/Codex/2026-05-06/i-have-a-html-for-an/money-mission-tracker-v2_5.html`
- Post-edit HTML SHA-256: `32ae47b3edaae3be9f04dd5265a3806efaa1fc1ff85fe3492cc41c730dd19d21`
- Timestamped backup: `/Users/a1xxoffice/Documents/Codex/2026-05-06/i-have-a-html-for-an/money-mission-tracker-v2_5_backup_2026-07-18_145109_milestone01-phaseb-stageb2-today.html`
- Backup SHA-256: `42d50eca0c072578319fa0a13d01de35f2fbb5035bd989eec852e238c8e54b8d`
- Apps Script remained unchanged at locked SHA-256 `b37a6964f4d8a304bfb24a3d58894fc2e2c65fd65f4ea294ccdf6dc226ee3bf8`.

## Implemented scope

- Added one `today-planning-live-context-host` immediately after the existing `daytype-banner`.
- Added a draft-free Today renderer using the existing `PLANNING_LIVE_CONTEXT_V1` / safe cache, freshness labels, verified-time helper, and capped selectors:
  - `planningLiveFocusRowsV1`
  - `planningLiveBlockedRowsV1`
  - `planningLiveApprovalRowsV1`
  - `planningLiveNextMoveRowsV1`
- Added the existing adapter render bridge so planner refresh/stale handling updates Today without a second relay call, cache key, polling interval, source, or data model.
- Kept `planning_action_drafts_v1` and all draft controls out of Today. Today is display-only.

## Verification

- Inline HTML JavaScript extraction passed `node --check`.
- `git diff --check` passed.
- Narrow diff: `20` additions, `0` deletions, HTML only.
- Structural assertions passed for host placement, one-host identity, packet/cache reuse, freshness reuse, all four capped selectors, bridge wiring, and initialization wiring.
- Forbidden-surface assertions passed for the Today renderer: no relay call, `google.script.run`, fetch, storage write, beacon, WebSocket, IndexedDB, or `postMessage`.
- Current worktree status shows only `money-mission-tracker-v2_5.html` modified in the scoped production surface; Apps Script is not modified.
- No browser/runtime QA, Notion/data/write, relay call/deployment, sync, beta, commit, or push was performed.

## Boundary

This closeout proves local implementation and static safety only. It does not claim that the Today block has been runtime-verified or visually accepted.

## Successor verification gate

`APPROVE MILESTONE 01 PHASE B STAGE B2 TODAY READ-ONLY CONSUMER STATIC ACCEPTANCE AND BROWSER-READY VERIFICATION ONLY`
