# Phase 65 Live Boundary Inventory

## Purpose

This pass identifies what must stay live in Money Mission OS before any future module movement, manifest replacement, or archive follow-through can be considered.

This pass does not move runtime code, extract modules, delete files, change player UI, or enable protected execution.

## Current Phase

- Phase: 65
- Pass: 1B
- Type: live runtime boundary inventory / planning only
- Build stamp: `OS v2_5 Phase 65 Weight Control Follow-Through · Pass 1B Live Boundary Inventory`
- Live app: `money-mission-tracker-v2_5.html`
- Scope map: `docs/phase65-runtime-module-boundary-scope-map.md`
- App weight plan: `docs/app-weight-control-system-v1.md`

## Must Stay Live

| Boundary | Reason |
| --- | --- |
| Boot shell, route handlers, and visible screen mount | The app must open and route before background work starts. |
| Current Mission, Profile, Badges, Journey, Time, and Overview player surfaces | These are the current gameplay rooms. |
| Fast QA, protected-boundary checks, and safety gate checks | Safety and quick verification must remain available. |
| Current source-map and packet readiness helpers | Notion and app-read previews depend on these contracts. |
| Render scheduler, payload signatures, and repeat-click cache guards | These keep the app responsive. |
| Current catalog summaries and icon registry lookups | Player shelves need compact identity and reward previews. |

## Future Candidates

| Candidate | Future action | Status |
| --- | --- | --- |
| Historical receipt checks already covered by manifest pointers | Archive reference only | Candidate |
| Developer-only receipt detail chains | Developer reference module | Candidate |
| Long cache-token history | Compact build manifest | Candidate |
| Full badge/resource/mission catalog detail builders | Lazy data module | Candidate |
| Deep QA historical paths | Manual Deep QA module | Candidate |

## Inventory Rules

- Current player UI stays live.
- Safety and protected gates stay live.
- Future movement waits for dependency mapping and A1XX approval.
- Archive-only, no delete.
- No runtime movement in this pass.

## Next Allowed Step

`phase65_pass1c_module_candidate_map`

The next pass should map each future candidate to dependencies, current owners, and the safest future movement pattern.
