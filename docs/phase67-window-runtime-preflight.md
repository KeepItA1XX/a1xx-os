# Phase 67 Window Runtime Preflight

## Purpose

This pass checks whether the shelf-window system has enough contracts in place to safely activate later. It does not activate the runtime.

The goal is to protect app speed while avoiding another crowded or slow UI pass. Future runtime work must render the first useful window, slice rows before markup, mount only selected details, and cancel cleanly when the player changes route or tab.

## Current Build

- Current Phase: Phase 67 Virtualized Shelves
- Current Pass: Pass 1E Window Runtime Preflight
- Pass Type: window runtime preflight / planning only
- Build stamp: OS v2_5 Phase 67 Virtualized Shelves · Pass 1E Window Runtime Preflight
- Next allowed step: `phase67_pass1f_window_runtime_closeout`

## Readiness Gates

| Gate | Source | Status |
| --- | --- | --- |
| Shelf window contract ready | Phase 67 Pass 1B | ready |
| Shelf adapter stubs ready | Phase 67 Pass 1C | ready |
| Selected detail cache contract ready | Phase 67 Pass 1D | ready |
| Stable card dimensions required | CSS/runtime preflight | required |
| Route cancel required | performance guard | required |
| Repeat-click skip required | performance guard | required |
| Developer receipts manual boundary | developer boundary | blocked |
| Runtime activation | release boundary | blocked |

## Runtime Preflight Checks

1. First paint renders only the active window.
2. Rows are sliced before markup generation.
3. Only the selected detail mounts expanded content.
4. Detail cache key includes route, filter, unlock, and progress signatures.
5. Missing data returns a compact empty window.
6. Runtime can only be activated by a future approved pass.

## Release Holds

- No window runtime in this pass.
- No shelf renderer replacement in this pass.
- No player UI change in this pass.
- No storage schema change in this pass.
- No mission completion writes, XP award writes, notification dispatch, app writes, restore execution, workers, automations, token export, or secret export.

## Next Allowed Step

`phase67_pass1f_window_runtime_closeout`
