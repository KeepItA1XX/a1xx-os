# Phase 69 Path Selection Contract

## Purpose

Phase 69 Pass 1B selects the safest next contract path after the manifest scope matrix.

This pass does not execute the selected path. It only records the recommended path and the rules that must stay in place before any later runtime, cleanup, or archive work.

## Current Build

- Current Phase: Phase 69 Manifest Runtime or Cleanup Planning
- Current Pass: Pass 1B Path Selection Contract
- Pass Type: path selection contract / no execution
- Build stamp: OS v2_5 Phase 69 Manifest Runtime or Cleanup Planning · Pass 1B Path Selection Contract
- Next allowed step: `phase69_pass1c_legacy_cleanup_contract`

## Recommended Next Contract

Recommended path: legacy token cleanup planning.

Reason: the app weight problem is the main risk right now, so the next safest work is to plan an archive-first cleanup contract while keeping the existing `APP_CACHE_TOKEN` fallback active.

## Available Paths

| Path | Status | Execution Now |
| --- | --- | --- |
| Legacy token cleanup contract | Recommended | No |
| Manifest runtime activation contract | Available | No |
| Historical receipt archive contract | Available | No |

## Selection Rules

- Path selection chooses the next contract only.
- No runtime activation happens in this pass.
- No cache-token history is removed in this pass.
- No archive movement happens in this pass.
- `APP_CACHE_TOKEN` remains the active fallback.
- Player UI does not consume the shadow manifest yet.
- A1XX approval is still required before any execution path.

## Still Blocked

The following remain blocked:

- runtime activation
- cache-token removal
- archive movement
- player UI manifest consumption
- app write paths

## Protected Boundaries

The following remain blocked:

- mission completion writes
- XP award writes
- notification dispatch
- Sheets writes from app
- Notion writes from app
- Drive writes from app
- automation activation
- worker activation
- restore execution
- token export
- secret export

## Next Allowed Step

`phase69_pass1c_legacy_cleanup_contract`
