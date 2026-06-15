# Phase 65 Module Candidate Map

## Purpose

This pass maps the runtime areas that may eventually become lighter modules, archive references, or lazy-loaded room helpers.

This pass does not move runtime code, extract modules, delete files, change player UI, or enable protected execution.

## Current Phase

- Phase: 65
- Pass: 1C
- Type: module candidate owner/dependency map / planning only
- Build stamp: `OS v2_5 Phase 65 Weight Control Follow-Through · Pass 1C Module Candidate Map`
- Live app: `money-mission-tracker-v2_5.html`
- Scope map: `docs/phase65-runtime-module-boundary-scope-map.md`
- Live boundary inventory: `docs/phase65-live-boundary-inventory.md`
- App weight plan: `docs/app-weight-control-system-v1.md`

## Candidate Map

| Candidate | Owner | Current runtime | Dependencies | Future pattern | Risk |
| --- | --- | --- | --- | --- | --- |
| Build manifest and cache token history | build identity | `APP_CACHE_TOKEN`, build stamps, and stamp guard checks | Current Build QA, phase receipt stamp guards, Fast QA compact lane | Compact manifest pointer | Medium |
| Developer receipt registry and detail chains | Developer Control Room | Developer-only receipt state, readbacks, and review helpers | Developer Control Room, Deep QA archive pointer, protected boundary receipts | Developer reference module | Medium |
| Game catalog and icon registry | game data catalogs | Badge, trophy, resource, mission, roadmap, and icon lookup helpers | Badge shelf, resource shelf, mission roadmap, player-card reward previews | Lazy data module with summary cache | High |
| Mission room render helpers | mission player runtime | Active, Details, Steps, Resources, Roadmap, Time, and Mission Command renderers | Route state, render scheduler, mission payload cache, current mission lock | Lazy UI module per room | High |
| Source packet normalizers and readback helpers | source bridge | Notion, Sheets, Drive, task, event, time, and packet fallback helpers | Source map, packet freshness rules, read-only relay gates, player-safe fallback copy | Read-only bridge module until approved | Medium |

## Movement Prerequisites

- Dependency map must be finished before movement.
- A1XX approval is required before any runtime movement.
- Archive/reference pointer is required before removing live weight.
- Current player surfaces must stay responsive.
- Protected execution gates stay blocked.

## What Stays Blocked

- Module extraction
- Runtime movement
- File deletion
- Live function removal
- Player UI changes
- App writes
- Mission completion writes
- XP award writes
- Notification dispatch
- Notion, Sheets, or Drive writes from the app
- Automations, workers, restore execution, token export, and secret export

## Next Allowed Step

`phase65_pass1d_lazy_load_dependency_map`

The next pass should map lazy-load dependencies for each candidate so future movement can happen without breaking route state, player surfaces, Fast QA, or protected-boundary checks.
