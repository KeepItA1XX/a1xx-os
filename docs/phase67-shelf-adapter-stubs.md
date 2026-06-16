# Phase 67 Shelf Adapter Stubs

## Purpose

This pass defines inactive adapter stubs for future windowed shelves. The adapters describe how shelf data should be normalized, sliced to the active window, and connected to one selected detail panel before any renderer replacement happens.

This keeps the next build steps safer: the app can move toward lighter shelves without changing player UI, changing catalogs, or activating runtime virtualization all at once.

## Current Build

- Current Phase: Phase 67 Virtualized Shelves
- Current Pass: Pass 1C Shelf Adapter Stubs
- Pass Type: shelf adapter stubs / planning only
- Build stamp: OS v2_5 Phase 67 Virtualized Shelves · Pass 1C Shelf Adapter Stubs
- Next allowed step: `phase67_pass1d_selected_detail_cache_contract`

## Adapter Stubs

| Adapter | Shelf | Input Shape | Output Shape | Detail Mode |
| --- | --- | --- | --- | --- |
| Badge shelf adapter | Badge shelf | reward catalog rows | windowed reward cards | badge detail panel |
| Trophy shelf adapter | Trophy shelf | reward catalog rows | windowed reward cards | trophy detail panel |
| Resource shelf adapter | Mission resource shelf | resource catalog rows | windowed resource cards | resource detail panel |
| Mission catalog adapter | Mission catalog and locked road | mission chain rows | windowed mission road cards | mission detail panel |
| Journey roadmap adapter | Journey milestone road | journey milestone rows | windowed milestone cards | journey marker detail panel |
| Overview rewards adapter | Overview reward previews | reward preview rows | compact preview cards | summary detail panel |
| Developer receipt adapter | Developer receipt shelves | developer receipt rows | manual receipt cards | manual only |

## Normalized Shelf Input

Every future shelf adapter should normalize rows to:

- `id`
- `title`
- `status`
- `category`
- `progress`
- `iconKey`
- `unlockState`
- `sortKey`
- `detailKey`

## Adapter Rules

1. Normalize shelf rows before render work starts.
2. Slice to the active window before creating card markup.
3. Mount details by selected detail key only.
4. Require a stable sort key to prevent card jumping.
5. Return safe empty-state rows when data is missing.
6. Keep developer receipt adapters manual-only.

## Boundaries

- No adapter runtime activation in this pass.
- No existing shelf renderer rewiring in this pass.
- No player UI layout change in this pass.
- No new source reads in this pass.
- No mission completion writes, XP award writes, notification dispatch, app writes, restore execution, workers, automations, token export, or secret export.

## Next Allowed Step

`phase67_pass1d_selected_detail_cache_contract`
