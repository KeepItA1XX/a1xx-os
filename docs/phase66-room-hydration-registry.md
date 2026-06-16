# Phase 66 Pass 1C Room Hydration Registry

## Purpose

This registry defines which Money Mission OS rooms can eventually receive lightweight background-prepared summaries. It keeps the app moving toward faster navigation without allowing hidden rooms to rebuild heavy UI, read live sources, or show developer receipt chains in player-facing tabs.

## Current Build

- Current Phase: Phase 66 Background Hydration Layer
- Current Pass: Pass 1C Room Hydration Registry
- Pass Type: room hydration registry / planning only
- App file: `money-mission-tracker-v2_5.html`
- Runtime status: mapped only
- Player UI change: none

## Room Registry

| Key | Room | Payload | Allowed hydration | Source signature | Status |
| --- | --- | --- | --- | --- | --- |
| `overview_today` | Account Overview Today | `today_lens_summary` | summary only | route + today packet + mission summary | planned |
| `profile_momentum` | Account Profile Momentum | `profile_momentum_summary` | summary only | operator profile + reward summary + mission summary | planned |
| `badges_shelf` | Badges and trophy shelf | `reward_shelf_window_summary` | paged summary only | badge catalog + operator unlocks | planned |
| `missions_active` | Missions Active | `current_mission_summary` | visible or neighbor summary | mission ID + mission progress + focus lane | planned |
| `missions_details` | Mission Details rooms | `active_detail_room_summary` | neighbor summary only | mission ID + details lens + resource version | planned |
| `journey_road` | Journey road | `journey_milestone_summary` | summary only | journey progress + revenue milestones + mission chain | planned |
| `developer_receipts` | Developer receipt rooms | `receipt_detail` | manual only | manual action | blocked |

## Payload Rules

1. Hydrated room payloads must stay compact and summary-first.
2. Rendered HTML snapshots are not allowed as the long-term cache shape.
3. Every payload must include a route, room, source, and data signature.
4. Every room must remain safe when payloads are missing, aging, stale, blocked, or empty.
5. Developer receipts and Deep QA detail stay manual-only.

## Boundaries

- No room hydration runtime is activated in this pass.
- No background Notion, Sheets, Drive, or Apps Script reads are activated.
- No player-facing UI changes are made.
- No local storage or IndexedDB cache schema changes are made.
- Protected actions remain blocked.

## Next Allowed Step

`phase66_pass1d_cache_snapshot_guard`
