# Phase 67 Shelf Virtualization Scope Map

## Purpose

Phase 67 exists to reduce DOM weight and visual crowding by preparing windowed shelves for large catalogs. This pass maps the surfaces that should eventually render only the visible cards first, then load the next page or selected detail only when needed.

This is planning-only. It does not replace shelf renderers, add a DOM virtualization runtime, change player UI layout, start background source reads, or enable protected actions.

## Current Build

- Current Phase: Phase 67 Virtualized Shelves
- Current Pass: Pass 1A Shelf Virtualization Scope Map
- Pass Type: virtualization scope map / planning only
- Build stamp: OS v2_5 Phase 67 Virtualized Shelves · Pass 1A Shelf Virtualization Scope Map
- Next allowed step: `phase67_pass1b_shelf_window_contract`

## Candidate Shelves

| Shelf | Surface | Risk | Target Pattern | First Window | Preload |
| --- | --- | --- | --- | ---: | ---: |
| Badge shelf | Account > Badges | High | paged window | 9 | 3 |
| Trophy shelf | Account > Badges | High | paged window | 9 | 3 |
| Mission resource shelf | Missions > Resources | High | category window | 8 | 4 |
| Mission catalog and locked road | Missions > Roadmap | Medium | road window | 5 | 2 |
| Journey milestone road | Account > Journey | Medium | milestone window | 6 | 2 |
| Overview reward previews | Account > Overview | Medium | preview window | 4 | 2 |
| Developer receipt shelves | Developer | High | manual only | 0 | 0 |

## Virtualization Rules

1. Render visible rows or cards first.
2. Use a fixed-size window per shelf.
3. Render detail panels only for the selected item.
4. Recalculate the active window only when filters or categories change.
5. Keep developer receipt shelves manual-only and out of player UI.
6. Keep virtualization runtime blocked until a later approved pass.

## Boundaries

- No player UI layout change in this pass.
- No shelf renderer replacement in this pass.
- No DOM virtualization runtime in this pass.
- No background source reads in this pass.
- No mission completion writes, XP award writes, notification dispatch, app writes, restore execution, workers, automations, token export, or secret export.

## Next Allowed Step

`phase67_pass1b_shelf_window_contract`
