# Phase 65 Lazy-Load Dependency Map

## Purpose

This pass maps what should load first, what can wait, and which dependencies must be respected before any future lazy-loader or module movement work begins.

This pass does not execute a lazy loader, move runtime code, extract modules, delete files, change player UI, or enable protected execution.

## Current Phase

- Phase: 65
- Pass: 1D
- Type: lazy-load dependency map / planning only
- Build stamp: `OS v2_5 Phase 65 Weight Control Follow-Through · Pass 1D Lazy-Load Dependency Map`
- Live app: `money-mission-tracker-v2_5.html`
- Scope map: `docs/phase65-runtime-module-boundary-scope-map.md`
- Live boundary inventory: `docs/phase65-live-boundary-inventory.md`
- Module candidate map: `docs/phase65-module-candidate-map.md`
- App weight plan: `docs/app-weight-control-system-v1.md`

## Lazy-Load Dependency Map

| Area | Load first | Defer until | Depends on | Future pattern |
| --- | --- | --- | --- | --- |
| Account shell and top-level tabs | Overview landing, Profile route, Mission tab selector | Hidden Mission rooms, Developer receipts, deep catalog details | Route state, render scheduler, safe placeholder | Shell first, visible room only |
| Mission Active room | Current mission summary, run controls, goal swipe | Details room, Steps depth, Resources depth, Roadmap depth | Current mission payload, timer micro-status, Mission Command context | Active room payload cache |
| Mission Details room | Mission detail summary, selected detail lane | Resource variants, roadmap chain depth, time room history | Mission payload cache, detail route key, room-level cache signature | Details room on demand |
| Badge, trophy, and resource shelves | Visible page window, selected detail panel | Locked item details, full catalog lists, large icon previews | Icon registry, catalog summary cache, selected item id | Paged shelf windowing |
| Developer receipts and Deep QA archive pointers | Compact status row | Manual developer action, Deep QA pointer open | Phase archive manifest, Developer Control Room, protected boundary check | Manual developer load only |

## Load Order

1. Boot shell and current visible route.
2. Current player room summary.
3. Nearby tab shell placeholders.
4. Selected room detail payload.
5. Developer and Deep QA references by manual action only.

## Guardrails

- No new lazy loader executes in this pass.
- No module or file movement in this pass.
- No player-facing UI change in this pass.
- Safety gates stay live and blocked.

## Next Checkpoint

`phase65_midpoint_team_chat_update`

After this pass, write the midpoint Team Chat update before continuing into the next Phase 65 build group.
