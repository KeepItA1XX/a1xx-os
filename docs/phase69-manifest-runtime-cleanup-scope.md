# Phase 69 Manifest Runtime or Cleanup Scope

## Purpose

Phase 69 starts after Phase 68 prepared the compact build manifest system. This phase decides which safe path comes next: manifest runtime activation planning, legacy token cleanup planning, or historical receipt archive planning.

This pass does not activate manifest runtime, remove cache-token history, move archives, or change player UI.

## Current Build

- Current Phase: Phase 69 Manifest Runtime or Cleanup Planning
- Current Pass: Pass 1A Scope Decision Matrix
- Pass Type: scope decision matrix / no runtime activation
- Build stamp: OS v2_5 Phase 69 Manifest Runtime or Cleanup Planning · Pass 1A Scope Decision Matrix
- Next allowed step: `phase69_pass1b_select_runtime_or_cleanup_path`

## Candidate Paths

| Path | Purpose | Execution Now |
| --- | --- | --- |
| Manifest runtime activation planning | Plan how QA and developer runtime could read the compact manifest safely. | No |
| Legacy token cleanup planning | Plan approved archive-first cleanup of old cache-token history. | No |
| Historical receipt archive planning | Plan how older receipt chains can move into docs/archive pointers. | No |

## Decision Rules

- Runtime activation and legacy cleanup stay separate.
- No deletion happens without an archive pointer and A1XX approval.
- `APP_CACHE_TOKEN` remains the fallback until a runtime path is approved and verified.
- QA must prove manifest identity before any runtime switch.
- Player UI reads manifest only after developer/runtime proof.

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

`phase69_pass1b_select_runtime_or_cleanup_path`
