# Phase 68 Cache Token Cutover Plan

## Purpose

Phase 68 Pass 1D maps how the app can eventually move away from the giant `APP_CACHE_TOKEN` history without breaking QA, build identity, or protected boundaries.

This pass does not remove cache-token segments and does not activate manifest runtime.

## Current Build

- Current Phase: Phase 68 Build Manifest Replacement
- Current Pass: Pass 1D Cache Token Cutover Plan
- Pass Type: cache token cutover plan / no removal execution
- Build stamp: OS v2_5 Phase 68 Build Manifest Replacement · Pass 1D Cache Token Cutover Plan
- Next allowed step: `phase68_pass1e_manifest_runtime_preflight`

## Cutover Gates

Before any token removal or runtime switch, the app must prove:

- shadow manifest contract is stable
- compact readback is stable
- Fast QA points to the latest compact manifest receipt
- `APP_CACHE_TOKEN` remains a fallback during transition
- archive receipt pointers exist
- protected boundaries remain blocked

## Removal Blockers

The following remain blocked in Pass 1D:

- manifest runtime switch
- cache-token removal
- archive movement
- live function removal
- player UI changes

## Planned Cutover Sequence

1. Freeze the manifest fields and readback shape.
2. Keep `APP_CACHE_TOKEN` active while manifest readback repeats cleanly.
3. Let QA read compact manifest identity before any removal.
4. Move historical receipts to approved docs/archive references only after review.
5. Remove old token segments only after an A1XX-approved cleanup pass.

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

`phase68_pass1e_manifest_runtime_preflight`
