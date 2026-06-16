# Phase 67 Selected Detail Cache Contract

## Purpose

This pass defines how selected shelf details should be cached later so the app can avoid rebuilding entire badge, trophy, resource, mission, journey, or overview shelves when the player clicks one item.

The cache target is only the selected detail payload. Full rendered catalogs should not be cached as large HTML strings.

## Current Build

- Current Phase: Phase 67 Virtualized Shelves
- Current Pass: Pass 1D Selected Detail Cache Contract
- Pass Type: selected detail cache contract / planning only
- Build stamp: OS v2_5 Phase 67 Virtualized Shelves · Pass 1D Selected Detail Cache Contract
- Next allowed step: `phase67_pass1e_window_runtime_preflight`

## Detail Cache Targets

| Detail Cache | Shelf | Key Prefix | Scope | Invalidation |
| --- | --- | --- | --- | --- |
| Badge detail cache | Badge shelf | `badge:` | session memory | catalog version change |
| Trophy detail cache | Trophy shelf | `trophy:` | session memory | catalog version change |
| Resource detail cache | Mission resource shelf | `resource:` | session memory | resource unlock change |
| Mission detail cache | Mission catalog and locked road | `mission:` | session memory | mission progress change |
| Journey marker detail cache | Journey milestone road | `journey:` | session memory | journey progress change |
| Overview reward detail cache | Overview reward previews | `overview_reward:` | session memory | today summary change |
| Developer receipt detail cache | Developer receipt shelves | `developer_receipt:` | manual only | manual developer action |

## Cache Key Fields

Future selected-detail cache keys should include:

- `shelfKey`
- `detailKey`
- `catalogVersion`
- `routeKey`
- `filterKey`
- `unlockState`
- `progressSignature`

## Rules

1. Cache selected details by stable detail key.
2. Keep cache scope in session memory unless separately approved.
3. Invalidate when catalog, unlock, route, filter, or progress signatures change.
4. Do not cache full rendered shelf catalogs.
5. If selected detail cache is missing, rebuild only the selected detail.
6. Keep developer receipt detail cache manual-only.

## Boundaries

- No selected detail cache runtime in this pass.
- No localStorage or IndexedDB schema change in this pass.
- No existing detail renderer rewiring in this pass.
- No player UI layout change in this pass.
- No mission completion writes, XP award writes, notification dispatch, app writes, restore execution, workers, automations, token export, or secret export.

## Next Allowed Step

`phase67_pass1e_window_runtime_preflight`
