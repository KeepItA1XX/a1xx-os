# Money Mission OS App Weight Control System v1

## Purpose

This plan exists so Money Mission OS can keep growing without becoming slow, bloated, or unstable. Every future gameplay, Notion, Sheets, Mission Command, badge, resource, time, or reporting build should be checked against this system before it adds more live runtime weight.

## Current Phase Anchor

- Current phase: Phase 94 Time Ledger Write Approval Gate
- Current pass type: approval-gate build / no time-write execution
- Origin: Phase 64 Receipt Archive Candidate closeout
- Primary file currently protected: `money-mission-tracker-v2_5.html`

## Performance Rules

1. Only render the room the player is actually viewing.
2. Never auto-render developer receipt chains inside player UI.
3. Keep Fast QA compact. Move historical checks to Deep QA or archived reference.
4. Cache prepared Mission, badge, resource, journey, and profile payloads when the source data has not changed.
5. Skip repeat renders when the same route, tab, lens, and data signature are unchanged.
6. Use lightweight placeholders for inactive rooms.
7. Move old phase receipts and old QA records out of the live runtime path once they have archive coverage.
8. Keep protected gates blocked unless A1XX separately approves execution.

## Background Loading Plan

The app should load in this order:

1. Shell and current visible screen.
2. Current account or mission summary.
3. Lightweight navigation and route state.
4. Idle preload for nearby tabs.
5. Deep panels only when opened.
6. Developer receipts only by manual developer action.
7. Deep QA only when explicitly run.

Background work should use idle scheduling where possible so the browser can paint the UI first.

## Cache Strategy

Use memory cache for:

- active mission payloads
- mission room render signatures
- badge and trophy catalog summaries
- resource shelf summaries
- journey milestone summaries
- player profile summaries
- Notion packet previews

Use local storage or IndexedDB only for compact data snapshots:

- last known read packet
- build manifest
- catalog version
- source freshness state
- recent route state

Do not store large rendered HTML strings as the long-term cache shape.

## Archive Strategy

Old code should not be deleted blindly. The approved route is:

1. Identify historical receipt, QA, or legacy render code.
2. Confirm it is not needed by current player UI.
3. Confirm Deep QA or archived reference will preserve the evidence.
4. Create a timestamped backup.
5. Move the old runtime weight out of the live path.
6. Leave a small receipt or manifest pointer in the live file.
7. Run script parse, diff check, protected-action scan, and source proof.

## Removal Criteria

Code can be moved out of the live file when it is one or more of:

- historical receipt-only code
- duplicate render path
- old player UI that has been replaced
- developer-only receipt surface accidentally mounted in player UI
- unused cache token history
- stale phase gate no longer used by Fast QA
- old markup that is no longer reachable
- heavy data preparation that can be lazy-loaded

Code should stay live when it is:

- needed for current player UI
- needed for active routing
- needed for protected gate enforcement
- needed for Fast QA
- needed for current source-map reads
- needed for the current Mission, Profile, Badges, Journey, Time, or Notion bridge surfaces

## Build Manifest Direction

The long cache token should eventually be replaced with a compact build manifest:

- current phase
- current pass
- build stamp
- feature flags
- source-map version
- player UI version
- developer receipt archive pointer
- protected boundary status

The live file should not keep growing a giant cache-token string forever.

## Future Phase Recommendations

### Phase 64: Receipt Archive Execution Candidate

Move historical receipt and old QA weight out of the live runtime path while preserving archive/reference access.

### Phase 65: Weight Control Follow-Through

Map live runtime boundaries, module candidates, cache ownership, and approval rules before moving any code out of the single-file app.

Current references:

- `docs/phase65-runtime-module-boundary-scope-map.md`
- `docs/phase65-live-boundary-inventory.md`
- `docs/phase65-module-candidate-map.md`
- `docs/phase65-lazy-load-dependency-map.md`
- `docs/phase65-cache-ownership-map.md`
- `docs/phase65-build-manifest-compaction-plan.md`
- `docs/phase65-developer-receipt-archive-pointer-plan.md`
- `docs/phase65-fast-qa-manifest-pointer-plan.md`
- `docs/phase65-phase-closeout-qa.md`

### Phase 66: Background Hydration Layer

Add a formal background preload system for nearby tabs, Notion packets, and cached gameplay summaries.

Current references:

- `docs/phase66-hydration-scope-map.md`
- `docs/phase66-idle-queue-contract.md`
- `docs/phase66-room-hydration-registry.md`
- `docs/phase66-cache-snapshot-guard.md`
- `docs/phase66-background-hydration-readiness-matrix.md`
- `docs/phase66-phase-closeout-qa.md`

### Phase 67: Virtualized Shelves

Apply virtualization or page-window rendering to badges, trophies, resources, mission catalogs, and long roadmap shelves.

Current references:

- `docs/phase67-shelf-virtualization-scope-map.md`
- `docs/phase67-shelf-window-contract.md`
- `docs/phase67-shelf-adapter-stubs.md`
- `docs/phase67-selected-detail-cache-contract.md`
- `docs/phase67-window-runtime-preflight.md`
- `docs/phase67-window-runtime-closeout.md`

### Phase 68: Build Manifest Replacement

Replace the giant cache-token history with a compact manifest and archive pointer.

Current references:

- `docs/phase68-build-manifest-schema-scope.md`
- `docs/phase68-shadow-manifest-contract.md`
- `docs/phase68-manifest-readback-qa.md`
- `docs/phase68-cache-token-cutover-plan.md`
- `docs/phase68-manifest-runtime-preflight.md`
- `docs/phase68-manifest-replacement-closeout.md`

### Phase 69: Manifest Runtime or Cleanup Planning

Select the safe next path after the manifest replacement closeout: runtime activation planning, legacy token cleanup planning, or historical receipt archive planning.

Current references:

- `docs/phase69-manifest-runtime-cleanup-scope.md`
- `docs/phase69-path-selection-contract.md`
- `docs/phase69-legacy-cleanup-contract.md`
- `docs/phase69-cleanup-group-preflight.md`
- `docs/phase69-token-history-archive-pointer.md`
- `docs/phase69-token-history-compaction-preflight.md`
- `docs/phase69-runtime-switch-candidate.md`
- `docs/phase69-phase-closeout-qa.md`

### Phase 70: Runtime or Cleanup Execution Gate

Install the approval gate that must be satisfied before any future manifest runtime activation or token-history cleanup can execute.

Current references:

- `docs/phase70-execution-gate-scope.md`
- `docs/phase70-runtime-activation-approval-checklist.md`
- `docs/phase70-cleanup-execution-approval-checklist.md`
- `docs/phase70-rollback-stop-conditions.md`
- `docs/phase70-phase-closeout-qa.md`

Phase 70 remains gate-only. It does not activate the manifest runtime, compact history, remove cache-token history, move archives, or change player UI.

### Phase 94: Time Ledger Write Approval Gate

Install the approval gate required before any future Start, Pause, Save Checkpoint, or Debrief time-session write can happen.

Current references:

- `docs/phase94-phase-scope-backup.md`
- `docs/phase94-time-source-ownership-map.md`
- `docs/phase94-time-ledger-row-contract.md`
- `docs/phase94-approval-criteria-checklist.md`
- `docs/phase94-button-write-boundary.md`
- `docs/phase94-duplicate-bad-session-guard.md`
- `docs/phase94-player-safe-approval-copy.md`
- `docs/phase94-developer-readback.md`
- `docs/phase94-fast-qa-gate.md`
- `docs/phase94-protected-boundary-scan.md`
- `docs/phase94-docs-roadmap-receipts.md`
- `docs/phase94-phase-closeout-qa.md`

Phase 94 remains gate-only. It does not write time rows, enable Sheets writes, enable Notion writes, change player UI, complete missions, award XP, dispatch notifications, activate workers, run automations, execute restore paths, export tokens, or export secrets.

### Phase 71: Developer-Only Manifest Runtime Probe

Run the approved developer-only manifest probe path without player UI consumption, token removal, cleanup execution, or app writes.

Current references:

- `docs/phase71-approved-probe-path.md`
- `docs/phase71-developer-probe-contract.md`
- `docs/phase71-manifest-identity-readback.md`
- `docs/phase71-fallback-rollback-guard.md`
- `docs/phase71-phase-closeout-qa.md`

Phase 71 reads the shadow manifest for developer verification only. It does not activate the manifest runtime, replace `APP_CACHE_TOKEN`, compact history, remove token history, move archives, or change player UI.

### Phase 72: Developer Manifest Probe Result Review

Review the developer-only manifest probe result and prepare the next safe gate without activating runtime behavior.

Current references:

- `docs/phase72-probe-result-snapshot.md`
- `docs/phase72-probe-result-interpretation.md`
- `docs/phase72-runtime-readiness-review.md`
- `docs/phase72-next-path-recommendation.md`
- `docs/phase72-phase-closeout-qa.md`

Phase 72 is review-only. It keeps `APP_CACHE_TOKEN` as the active fallback and does not activate the manifest runtime, consume manifest data in player UI, remove token history, move archives, write app data, or clean up live code.

### Phase 73: Controlled Runtime Probe Approval Gate

Install the approval gate required before any controlled runtime probe can be prepared.

Current references:

- `docs/phase73-approval-gate-scope.md`
- `docs/phase73-approval-receipt-contract.md`
- `docs/phase73-controlled-probe-limits.md`
- `docs/phase73-probe-hold-state.md`
- `docs/phase73-rollback-stop-rules.md`
- `docs/phase73-phase-closeout-qa.md`

Phase 73 is gate-only. It does not arm or execute a controlled probe, activate the manifest runtime, consume manifest data in player UI, remove token history, move archives, write app data, or clean up live code.

### Phase 74: Controlled Runtime Probe Local Arm Preview

Install the local-arm preview contract for a future controlled runtime probe without arming or executing the probe.

Current references:

- `docs/phase74-local-arm-preview-scope.md`
- `docs/phase74-single-use-arm-record.md`
- `docs/phase74-probe-preflight-checklist.md`
- `docs/phase74-arm-hold-state.md`
- `docs/phase74-stop-rollback-confirmation.md`
- `docs/phase74-phase-closeout-qa.md`

Phase 74 is local-preview only. It does not arm or execute a controlled probe, activate the manifest runtime, consume manifest data in player UI, persist an arm record, remove token history, move archives, write app data, dispatch notifications, or clean up live code.

### Phase 75: Controlled Runtime Probe Dry-Run Simulation

Run the approved developer-only dry-run simulation against the shadow manifest and protected-boundary stop rules.

Current references:

- `docs/phase75-dry-run-simulation-scope.md`
- `docs/phase75-simulation-harness-contract.md`
- `docs/phase75-manifest-readback-dry-run.md`
- `docs/phase75-protected-boundary-stop-test.md`
- `docs/phase75-dry-run-result-packet.md`
- `docs/phase75-phase-closeout-qa.md`

Phase 75 is a developer-only dry run. It simulates manifest readback and boundary stops in memory, then records a result packet. It does not activate runtime, execute a real controlled probe, consume manifest data in player UI, persist dry-run data, remove token history, move archives, write app data, dispatch notifications, or clean up live code.

### Phase 76: Runtime Probe Review Gate

Review the Phase 75 dry-run result and define the exact gates required before any future runtime activation.

Current references:

- `docs/phase76-review-gate-scope.md`
- `docs/phase76-dry-run-result-review.md`
- `docs/phase76-runtime-readiness-decision-matrix.md`
- `docs/phase76-player-ui-consumption-gate.md`
- `docs/phase76-activation-approval-requirements.md`
- `docs/phase76-phase-closeout-qa.md`

Phase 76 is review-gate only. It reviews the developer-only dry-run result, keeps player UI consumption blocked, documents the decision matrix, and records the approval requirements for a future activation gate. It does not activate runtime, execute a real controlled probe, consume manifest data in player UI, persist runtime data, remove token history, move archives, write app data, dispatch notifications, or clean up live code.

### Phase 77: Runtime Activation Approval Gate

Install the activation approval gate that must exist before any future controlled runtime activation.

Current references:

- `docs/phase77-activation-approval-gate-scope.md`
- `docs/phase77-approval-packet-contract.md`
- `docs/phase77-single-use-activation-limits.md`
- `docs/phase77-rollback-stop-requirements.md`
- `docs/phase77-player-ui-release-boundary.md`
- `docs/phase77-phase-closeout-qa.md`

Phase 77 is approval-gate only. It defines the approval packet, single-use activation limits, rollback stop requirements, and player UI release boundary for a future activation phase. It does not approve or execute runtime activation, execute a real controlled probe, consume manifest data in player UI, persist runtime data, remove token history, move archives, write app data, dispatch notifications, or clean up live code.

### Phase 78: Controlled Runtime Activation

Activate the compact build manifest only inside the developer runtime/readback lane while keeping player UI, app writes, rewards, notifications, cleanup, and token removal blocked.

Current references:

- `docs/phase78-controlled-runtime-activation-scope.md`
- `docs/phase78-activation-arm-contract.md`
- `docs/phase78-developer-runtime-switch.md`
- `docs/phase78-fallback-monitor.md`
- `docs/phase78-runtime-result-readback.md`
- `docs/phase78-phase-closeout-qa.md`

Phase 78 completes the controlled developer-runtime activation. The compact manifest is now readable as the active developer runtime pointer, `APP_CACHE_TOKEN` remains the fallback, and player-facing manifest consumption is still blocked until a later separately approved release phase.

### Phase 79: Developer Runtime Stability Monitor

Monitor the controlled developer-runtime manifest path after activation before any player-facing release.

Current references:

- `docs/phase79-stability-monitor-scope.md`
- `docs/phase79-runtime-sample-snapshot.md`
- `docs/phase79-fallback-stability-watch.md`
- `docs/phase79-fast-qa-stability-guard.md`
- `docs/phase79-player-release-hold-review.md`
- `docs/phase79-phase-closeout-qa.md`

Phase 79 confirms the developer runtime path remains stable across local readback samples, fallback checks, Fast QA wiring, and release-hold review. It does not release player UI manifest consumption, execute app writes, remove cache-token fallback, move archives, dispatch notifications, or activate workers/automations.

### Phase 80: Developer Runtime Observation Readback

Observe the controlled developer-runtime manifest over a bounded developer readback window before any player-facing release decision.

Current references:

- `docs/phase80-observation-scope.md`
- `docs/phase80-readback-window-contract.md`
- `docs/phase80-observation-snapshot-rows.md`
- `docs/phase80-drift-watch-guard.md`
- `docs/phase80-release-readiness-hold.md`
- `docs/phase80-phase-closeout-qa.md`

Phase 80 confirms the controlled developer-runtime path can be observed through stable manifest readbacks, bounded observation rows, drift watch, and release-hold review. It does not release player UI manifest consumption, execute app writes, remove cache-token fallback, move archives, dispatch notifications, or activate workers/automations.

### Phase 81: Developer Runtime Release Candidate Gate

Prepare the controlled developer-runtime manifest as a release candidate without releasing it to player UI.

Current references:

- `docs/phase81-release-candidate-scope.md`
- `docs/phase81-candidate-criteria-matrix.md`
- `docs/phase81-player-release-boundary-review.md`
- `docs/phase81-rollback-stop-guard.md`
- `docs/phase81-approval-packet-preview.md`
- `docs/phase81-phase-closeout-qa.md`

Phase 81 confirms the developer-runtime manifest has a release-candidate gate, criteria matrix, player release boundary review, rollback stop guard, and approval packet preview. It does not capture release approval, consume manifest data in player UI, execute app writes, remove cache-token fallback, move archives, dispatch notifications, or activate workers/automations.

### Phase 82: Player Manifest Consumption Approval Gate

Create the approval gate for future player manifest consumption while keeping consumption disabled.

Current references:

- `docs/phase82-approval-scope.md`
- `docs/phase82-approval-criteria.md`
- `docs/phase82-player-consumption-boundary.md`
- `docs/phase82-approval-hold-packet.md`
- `docs/phase82-no-execution-receipt.md`
- `docs/phase82-phase-closeout-qa.md`

Phase 82 confirms the player manifest consumption approval gate, approval criteria, player consumption boundary, approval hold packet, and no-execution receipt. It does not approve player manifest consumption, consume manifest data in player UI, enable app reads, execute app writes, remove cache-token fallback, move archives, dispatch notifications, or activate workers/automations.

### Phase 83: Player Manifest Consumption Arm Preview

Create the preview-only arm packet for future player manifest consumption while keeping the app unarmed and consumption disabled.

Current references:

- `docs/phase83-arm-preview-scope.md`
- `docs/phase83-single-use-arm-preview.md`
- `docs/phase83-consumption-readiness-preview.md`
- `docs/phase83-stop-rollback-guard.md`
- `docs/phase83-no-execution-receipt.md`
- `docs/phase83-phase-closeout-qa.md`

Phase 83 confirms the player manifest consumption arm preview, single-use arm preview, consumption readiness preview, stop rollback guard, and no-execution receipt. It does not arm player manifest consumption, consume manifest data in player UI, enable app reads, execute app writes, remove cache-token fallback, move archives, dispatch notifications, or activate workers/automations.

### Phase 84: Player Manifest Consumption Approval Capture Gate

Create the approval-capture gate for future player manifest consumption while keeping the approval uncaptured, the arm blocked, and player consumption disabled.

Current references:

- `docs/phase84-capture-gate-scope.md`
- `docs/phase84-capture-criteria-checklist.md`
- `docs/phase84-local-capture-preview.md`
- `docs/phase84-arm-decision-boundary.md`
- `docs/phase84-no-execution-receipt.md`
- `docs/phase84-phase-closeout-qa.md`

Phase 84 confirms the player manifest consumption approval-capture gate, capture criteria checklist, local capture preview, arm decision boundary, and no-execution receipt. It does not save approval capture, arm player manifest consumption, consume manifest data in player UI, enable app reads, execute app writes, remove cache-token fallback, move archives, dispatch notifications, or activate workers/automations.

### Phase 85: Player Manifest Consumption Capture Local Arm Preview

Create the local arm preview packet that follows the approval-capture gate while keeping local arm save, runtime arm, player UI consumption, app reads, and app writes blocked.

Current references:

- `docs/phase85-local-arm-preview-scope.md`
- `docs/phase85-single-use-local-arm-packet.md`
- `docs/phase85-capture-hold-boundary.md`
- `docs/phase85-player-consumption-hold.md`
- `docs/phase85-no-execution-receipt.md`
- `docs/phase85-phase-closeout-qa.md`

Phase 85 confirms the local arm preview scope, single-use local arm packet, capture hold boundary, player consumption hold, and no-execution receipt. It does not save a local arm, arm runtime consumption, consume manifest data in player UI, enable app reads, execute app writes, remove cache-token fallback, move archives, dispatch notifications, or activate workers/automations.

### Phase 86: Player Manifest Consumption Release System

Install the complete player manifest consumption release system so the app can move toward first live read-only player surfaces without treating small passes as phases.

Current references:

- `docs/phase86-release-system-scope.md`
- `docs/phase86-arm-review-gate.md`
- `docs/phase86-approval-carry-forward.md`
- `docs/phase86-controlled-readonly-release-packet.md`
- `docs/phase86-player-surface-release-hold.md`
- `docs/phase86-release-stability-monitor.md`
- `docs/phase86-no-write-execution-receipt.md`
- `docs/phase86-phase-closeout-qa.md`

Phase 86 confirms the release system scope, arm review gate, A1XX approval carry-forward, controlled read-only release packet, player surface release hold, stability monitor, and no-write execution receipt. It does not activate broad app reads, choose the first live player surface, enable app writes, execute rewards, dispatch notifications, remove cache-token fallback, move archives, or activate workers/automations.

### Phase 87: First Live Player Data Surfaces

Activate the first narrow player-facing read-only data surface without opening broad app reads or adding new clutter to the player UI. The selected surface is `Account > Mission > Overview > Today`, using the `today_money_moves` packet only.

Current references:

- `docs/phase87-surface-selection-contract.md`
- `docs/phase87-source-eligibility-gate.md`
- `docs/phase87-player-data-adapter.md`
- `docs/phase87-overview-today-live-surface.md`
- `docs/phase87-empty-stale-blocked-states.md`
- `docs/phase87-performance-guard.md`
- `docs/phase87-developer-readback-only.md`
- `docs/phase87-fast-qa-gate.md`
- `docs/phase87-docs-roadmap-receipts.md`
- `docs/phase87-phase-closeout-qa.md`

Phase 87 confirms the first live player data surface, source eligibility gate, player-safe adapter, fallback states, performance guard, developer readback boundary, Fast QA row, and receipt docs. It does not enable broad app reads, additional player surfaces, app writes, mission completion writes, XP awards, notification dispatch, cache-token removal, archive moves, restore execution, workers, automations, token export, or secret export.

### Phase 88: Overview Today Surface Polish + Second Surface Readiness

Polish the first live player surface before expanding the live-read footprint. `Account > Mission > Overview > Today` remains the only active player read surface. Phase 88 improves copy, row compactness, fallback states, and no-crowd guardrails while mapping `Profile Momentum` as the next candidate only.

Current references:

- `docs/phase88-phase-scope-backup.md`
- `docs/phase88-overview-today-surface-audit.md`
- `docs/phase88-player-copy-polish.md`
- `docs/phase88-compact-live-row-design.md`
- `docs/phase88-freshness-fallback-ux.md`
- `docs/phase88-no-crowd-guard.md`
- `docs/phase88-performance-guard.md`
- `docs/phase88-second-surface-candidate-map.md`
- `docs/phase88-developer-readback.md`
- `docs/phase88-fast-qa-gate.md`
- `docs/phase88-docs-roadmap-receipts.md`
- `docs/phase88-phase-closeout-qa.md`

Phase 88 confirms the polished Today packet, player-safe copy, max-three-row design, clean empty/stale states, no-crowd guard, bounded render guard, developer-only readback, compact Fast QA row, and next-surface candidate map. It does not activate a second player surface, enable broad app reads, enable app writes, execute rewards, dispatch notifications, remove cache-token fallback, move archives, or activate workers/automations.

### Phase 89: Profile Momentum Surface Readiness

Prepare `Account > Mission > Profile > Momentum` as the second narrow player-facing read-only data surface. Overview Today remains the first player surface, and Profile Momentum becomes the next compact read that summarizes today, current mission, rewards, and journey position without crowding the Profile tab.

Current references:

- `docs/phase89-phase-scope-backup.md`
- `docs/phase89-profile-momentum-surface-audit.md`
- `docs/phase89-momentum-packet-contract.md`
- `docs/phase89-player-safe-copy.md`
- `docs/phase89-compact-visual-layout.md`
- `docs/phase89-fresh-empty-waiting-states.md`
- `docs/phase89-no-crowd-guard.md`
- `docs/phase89-performance-guard.md`
- `docs/phase89-developer-readback.md`
- `docs/phase89-fast-qa-gate.md`
- `docs/phase89-docs-roadmap-receipts.md`
- `docs/phase89-phase-closeout-qa.md`

Phase 89 confirms the Profile Momentum packet, four-row cap, player-safe copy, compact layout, clean empty states, no-crowd guard, bounded render guard, developer-only readback, compact Fast QA row, and docs receipts. It activates only the second narrow read-only player surface and does not enable broad app reads, app writes, mission completion writes, XP awards, notification dispatch, cache-token removal, archive moves, restore execution, workers, automations, token export, or secret export.

### Phase 90: Mission Active Surface Readiness

Prepare `Account > Mission > Missions > Active` as the third narrow player-facing read-only data surface. Overview Today remains the first player surface, Profile Momentum remains the second, and Mission Active becomes the compact current-run read that summarizes the goal, next move, run controls, and nearby reward path without crowding the Active tab.

Current references:

- `docs/phase90-phase-scope-backup.md`
- `docs/phase90-mission-active-surface-audit.md`
- `docs/phase90-mission-active-packet-contract.md`
- `docs/phase90-player-safe-copy.md`
- `docs/phase90-compact-control-layout.md`
- `docs/phase90-fresh-empty-waiting-states.md`
- `docs/phase90-no-crowd-guard.md`
- `docs/phase90-performance-guard.md`
- `docs/phase90-developer-readback.md`
- `docs/phase90-fast-qa-gate.md`
- `docs/phase90-docs-roadmap-receipts.md`
- `docs/phase90-phase-closeout-qa.md`

Phase 90 confirms the Mission Active packet, four-row cap, player-safe copy, compact control layout, clean empty states, no-crowd guard, bounded render guard, developer-only readback, compact Fast QA row, and docs receipts. It activates only the third narrow read-only player surface and does not enable broad app reads, app writes, mission completion writes, XP awards, notification dispatch, cache-token removal, archive moves, restore execution, workers, automations, token export, or secret export.

### Phase 91: Journey Road Surface Readiness

Prepare `Account > Mission > Journey` as the fourth narrow player-facing read-only data surface. Overview Today remains the first player surface, Profile Momentum remains the second, Mission Active remains the third, and Journey Road becomes the compact broad-road read that summarizes the $1M road, current mission, current checkpoint, and next road marker without crowding the Journey tab.

Current references:

- `docs/phase91-phase-scope-backup.md`
- `docs/phase91-journey-road-surface-audit.md`
- `docs/phase91-journey-road-packet-contract.md`
- `docs/phase91-player-safe-copy.md`
- `docs/phase91-compact-road-layout.md`
- `docs/phase91-fresh-empty-waiting-states.md`
- `docs/phase91-no-crowd-guard.md`
- `docs/phase91-performance-guard.md`
- `docs/phase91-developer-readback.md`
- `docs/phase91-fast-qa-gate.md`
- `docs/phase91-docs-roadmap-receipts.md`
- `docs/phase91-phase-closeout-qa.md`

Phase 91 confirms the Journey Road packet, four-row cap, player-safe copy, compact road layout, clean empty states, no-crowd guard, bounded render guard, developer-only readback, compact Fast QA row, and docs receipts. It activates only the fourth narrow read-only player surface and does not enable broad app reads, app writes, mission completion writes, XP awards, notification dispatch, cache-token removal, archive moves, restore execution, workers, automations, token export, or secret export.

### Phase 92: Mission Command Context Surface Readiness

Prepare `Mission Command` as the fifth narrow player-facing read-only data surface. Overview Today remains the first player surface, Profile Momentum remains the second, Mission Active remains the third, Journey Road remains the fourth, and Mission Command Context becomes the compact guide context read that summarizes the current move, focus lane, reward preview, and next road marker without turning the chat area into a dashboard.

Current references:

- `docs/phase92-phase-scope-backup.md`
- `docs/phase92-command-context-surface-audit.md`
- `docs/phase92-command-context-packet-contract.md`
- `docs/phase92-player-safe-guide-copy.md`
- `docs/phase92-compact-guide-layout.md`
- `docs/phase92-fresh-empty-waiting-states.md`
- `docs/phase92-no-crowd-guard.md`
- `docs/phase92-performance-guard.md`
- `docs/phase92-developer-readback.md`
- `docs/phase92-fast-qa-gate.md`
- `docs/phase92-docs-roadmap-receipts.md`
- `docs/phase92-phase-closeout-qa.md`

Phase 92 confirms the Mission Command Context packet, four-row cap, player-safe guide copy, compact guide layout, clean empty states, no-crowd guard, bounded render guard, developer-only readback, compact Fast QA row, and docs receipts. It activates only the fifth narrow read-only player surface and does not enable broad app reads, app writes, mission completion writes, XP awards, notification dispatch, cache-token removal, archive moves, restore execution, workers, automations, token export, or secret export.

### Phase 93: Timer Runtime Cards Surface Readiness

Prepare `Account > Mission > Missions > Active` to show compact timer/work-block context as the sixth narrow player-facing read-only data surface. Overview Today remains the first player surface, Profile Momentum remains the second, Mission Active remains the third, Journey Road remains the fourth, Mission Command Context remains the fifth, and Timer Runtime Cards becomes the compact time/work-block read that summarizes the current block, focus lane, today time state, and Rule of 300 readiness without adding a standalone time dashboard.

Current references:

- `docs/phase93-phase-scope-backup.md`
- `docs/phase93-timer-surface-audit.md`
- `docs/phase93-timer-runtime-packet-contract.md`
- `docs/phase93-player-safe-time-copy.md`
- `docs/phase93-compact-timer-layout.md`
- `docs/phase93-fresh-empty-waiting-states.md`
- `docs/phase93-no-crowd-guard.md`
- `docs/phase93-performance-guard.md`
- `docs/phase93-developer-readback.md`
- `docs/phase93-fast-qa-gate.md`
- `docs/phase93-docs-roadmap-receipts.md`
- `docs/phase93-phase-closeout-qa.md`

Phase 93 confirms the Timer Runtime packet, four-row cap, player-safe time copy, compact timer layout, clean empty states, no-crowd guard, bounded render guard, developer-only readback, compact Fast QA row, and docs receipts. It activates only the sixth narrow read-only player surface and does not enable broad app reads, app writes, time ledger writes, timer ledger writes, mission completion writes, XP awards, notification dispatch, cache-token removal, archive moves, restore execution, workers, automations, token export, or secret export.

## QA Expectations

Every performance-sensitive pass should verify:

- script parse passes
- diff check passes
- protected-action scan passes
- Fast QA remains compact
- no player-facing developer receipts appear
- hidden tabs do not render full heavy content
- repeat tab clicks do not rebuild unchanged payloads
- app load and Mission tab switching remain responsive

## Standing Boundary

This plan does not authorize mission completion writes, XP award writes, notification dispatch, app writes, restore execution, worker auth, automations, token export, or secret export.
