# Phase 66 Pass 1D Cache Snapshot Guard

## Purpose

This guard defines what Money Mission OS can safely cache later so the app stays fast without filling memory or local storage with heavy UI. It protects the future background hydration layer from storing rendered HTML, stale source data, oversized shelves, or developer receipts.

## Current Build

- Current Phase: Phase 66 Background Hydration Layer
- Current Pass: Pass 1D Cache Snapshot Guard
- Pass Type: cache snapshot guard / planning only
- App file: `money-mission-tracker-v2_5.html`
- Runtime status: mapped only
- Player UI change: none

## Snapshot Lanes

| Key | Store | Max age | Max items | Status |
| --- | --- | --- | --- | --- |
| `current_room_summary` | memory | 10 minutes | 1 | planned |
| `neighbor_room_summary` | memory | 10 minutes | 2 | planned |
| `today_packet_preview` | compact snapshot candidate | 15 minutes | 5 | planned |
| `reward_shelf_window` | compact snapshot candidate | 30 minutes | 12 | planned |
| `journey_milestone_summary` | compact snapshot candidate | 60 minutes | 8 | planned |
| `developer_receipt_detail` | none | 0 minutes | 0 | blocked |

## Snapshot Rules

1. Snapshots cannot store rendered HTML strings as the long-term cache shape.
2. Every snapshot candidate must carry a route, room, source, version, and data signature.
3. Every snapshot candidate must have a small max-age rule.
4. Every snapshot candidate must have a row, card, or item budget.
5. Every stale, empty, blocked, or missing snapshot must fall back without freezing the UI.
6. Developer receipts and Deep QA detail stay excluded from automatic snapshots.

## Invalidation Rules

- Drop neighbor summaries when route, tab, or room changes.
- Drop packet previews when the source signature changes.
- Drop mission room summaries when the active mission changes.
- Drop reward shelf windows when badge, trophy, or resource catalogs change.
- Manual refresh can clear stale compact snapshots before a later rebuild.

## Boundaries

- No cache snapshot runtime is activated in this pass.
- No local storage or IndexedDB schema change is made.
- No background Notion, Sheets, Drive, or Apps Script reads are activated.
- No player-facing UI changes are made.
- Protected actions remain blocked.

## Next Allowed Step

`phase66_pass1e_background_hydration_readiness_matrix`
