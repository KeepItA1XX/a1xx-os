# Phase 66 Hydration Scope Map

## Purpose

Map the first safe layer of background hydration for Money Mission OS.

The goal is to keep the app fast by rendering the current visible screen first, then preparing nearby rooms and compact summaries during idle time. This pass is planning only. It does not activate a background loader.

## Current Build

- Phase: `66`
- Pass: `1A`
- Pass type: `background hydration planning / planning only`
- Build stamp: `OS v2_5 Phase 66 Background Hydration Layer · Pass 1A Hydration Scope Map`
- Status: `hydration_scope_map_ready`

## Hydration Zones

| Zone | Load role | Timing | Status |
| --- | --- | --- | --- |
| Current visible screen | Render first | Immediate | Required |
| Nearby Account rooms | Prepare compact summary | After first paint | Planned |
| Mission, badge, resource, journey, and profile summaries | Cache compact payload | After visible route is stable | Planned |
| Read-only Notion packet previews | Refresh preview | After player interaction idle | Planned |
| Developer receipts and Deep QA evidence | Manual only | Never auto-hydrate | Blocked |

## Rules

1. The visible screen must paint before hidden rooms prepare.
2. Hidden room hydration should only run during idle windows.
3. Compact summaries hydrate before deep cards, catalogs, or detail rooms.
4. Repeat hydration is skipped when route, room, and source signatures are unchanged.
5. Developer receipts and Deep QA stay manual and out of player UI.

## Boundaries

This pass does not activate:

- background hydration runtime
- idle queue runtime
- Notion, Sheets, or Drive app reads
- player UI changes
- app writes
- mission completion writes
- XP award writes
- notification dispatch
- workers
- automations
- restore execution
- token export
- secret export
- file movement
- live function removal

## Next Allowed Step

`phase66_pass1b_idle_queue_contract`

## Phase 66 Direction

The next pass should define the idle queue contract before any runtime loader is activated. The queue should be small, cancelable, signature-aware, and safe when the player switches tabs quickly.
