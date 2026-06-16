# Phase 66 Idle Queue Contract

## Purpose

Define the future background idle queue before any runtime queue is activated.

The queue should protect the player experience by doing small, cancelable preparation work only after the visible screen has already rendered.

## Current Build

- Phase: `66`
- Pass: `1B`
- Pass type: `idle queue contract / planning only`
- Build stamp: `OS v2_5 Phase 66 Background Hydration Layer · Pass 1B Idle Queue Contract`
- Status: `idle_queue_contract_ready`

## Queue Lanes

| Lane | Priority | Max batch | Cancel on route change | Status |
| --- | --- | --- | --- | --- |
| Nearby room summary prepare | 1 | 24ms | Yes | Planned |
| Mission payload cache prepare | 2 | 32ms | Yes | Planned |
| Badge, trophy, and resource summary prepare | 3 | 28ms | Yes | Planned |
| Read-only source packet preview prepare | 4 | 40ms | Yes | Planned |
| Developer receipt and Deep QA detail | 0 | 0ms | Yes | Blocked |

## Queue Rules

1. Run at most one small batch per idle window.
2. Cancel hidden work when the player changes route, tab, or mission room.
3. Every queued item must include a route, room, source, and data signature.
4. Every queued item must include a time budget and safe fallback.
5. Developer receipts and Deep QA never enter the automatic idle queue.

## Fallbacks

- If no idle window is available, skip hidden preparation and keep the visible screen responsive.
- If a signature changes, drop the queued item and let the active room rebuild later.
- If a source packet is blocked or stale, use compact fallback copy later instead of blocking now.
- If a batch exceeds budget, stop and leave the deeper room unopened until selected.

## Boundaries

This pass does not activate:

- idle queue runtime
- requestIdleCallback runtime or polyfill
- background hydration runtime
- Notion, Sheets, or Drive background reads
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

`phase66_pass1c_room_hydration_registry`

## Phase 66 Direction

The next pass should map which rooms can participate in hydration and what compact payload each room is allowed to prepare.
