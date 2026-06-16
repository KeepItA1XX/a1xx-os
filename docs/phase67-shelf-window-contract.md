# Phase 67 Shelf Window Contract

## Purpose

This pass defines the window sizes, page behavior, and detail-panel rules for large Money Mission OS shelves before any runtime replacement happens.

The goal is simple: show the first useful set of cards quickly, keep detail panels mounted only when selected, and prevent large catalogs from rebuilding the whole screen at once.

## Current Build

- Current Phase: Phase 67 Virtualized Shelves
- Current Pass: Pass 1B Shelf Window Contract
- Pass Type: shelf window contract / planning only
- Build stamp: OS v2_5 Phase 67 Virtualized Shelves · Pass 1B Shelf Window Contract
- Next allowed step: `phase67_pass1c_shelf_adapter_stubs`

## Shelf Window Contracts

| Shelf | Surface | Page Size | Preload Ahead | Max DOM Cards | Detail Mode |
| --- | --- | ---: | ---: | ---: | --- |
| Badge shelf | Account > Badges | 9 | 3 | 12 | selected only |
| Trophy shelf | Account > Badges | 9 | 3 | 12 | selected only |
| Mission resource shelf | Missions > Resources | 8 | 4 | 12 | selected only |
| Mission catalog and locked road | Missions > Roadmap | 5 | 2 | 7 | current plus selected |
| Journey milestone road | Account > Journey | 6 | 2 | 8 | selected only |
| Overview reward previews | Account > Overview | 4 | 2 | 6 | preview only |
| Developer receipt shelves | Developer | 0 | 0 | 0 | manual only |

## Window Rules

1. Render the first shelf window only on route paint.
2. Keep each shelf inside a fixed max DOM card budget.
3. Mount expanded detail only for the selected card.
4. Reset to the first matching window when filters or categories change.
5. Keep card dimensions stable so shelves do not jump when data changes.
6. Keep developer receipt shelves manual-only.

## Boundaries

- No shelf renderer swap in this pass.
- No active DOM virtualization runtime in this pass.
- No player UI layout change in this pass.
- No badge, trophy, resource, mission, or journey catalog mutation.
- No mission completion writes, XP award writes, notification dispatch, app writes, restore execution, workers, automations, token export, or secret export.

## Next Allowed Step

`phase67_pass1c_shelf_adapter_stubs`
