# Money Mission OS App Weight Control System v1

## Purpose

This plan exists so Money Mission OS can keep growing without becoming slow, bloated, or unstable. Every future gameplay, Notion, Sheets, Mission Command, badge, resource, time, or reporting build should be checked against this system before it adds more live runtime weight.

## Current Phase Anchor

- Current phase: Phase 65 Weight Control Follow-Through
- Current pass type: runtime module boundary planning
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

### Phase 66: Background Hydration Layer

Add a formal background preload system for nearby tabs, Notion packets, and cached gameplay summaries.

### Phase 67: Virtualized Shelves

Apply virtualization or page-window rendering to badges, trophies, resources, mission catalogs, and long roadmap shelves.

### Phase 68: Build Manifest Replacement

Replace the giant cache-token history with a compact manifest and archive pointer.

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
