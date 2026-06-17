# Phase 69 Runtime Switch Candidate

## Purpose

Phase 69 Pass 1G stages the manifest runtime switch as a future candidate while keeping the app on the existing `APP_CACHE_TOKEN` fallback.

This pass does not activate manifest runtime, compact token history, remove cache-token history, move archives, or change player UI.

## Current Build

- Current Phase: Phase 69 Manifest Runtime or Cleanup Planning
- Current Pass: Pass 1G Runtime Switch Candidate
- Pass Type: runtime switch candidate / activation blocked
- Build stamp: OS v2_5 Phase 69 Manifest Runtime or Cleanup Planning · Pass 1G Runtime Switch Candidate
- Next allowed step: `phase69_pass1h_phase_closeout_qa`

## Candidate Rules

- Developer runtime must prove manifest identity before player UI reads it.
- `APP_CACHE_TOKEN` remains fallback through any future switch test.
- Token history is not removed during switch candidate planning.
- Fast QA must read the compact closeout pointer.
- Rollback returns to `APP_CACHE_TOKEN` fallback and timestamped backup.

## Still Blocked

The following remain blocked:

- runtime activation
- manifest runtime consumption
- cache-token removal
- history compaction execution
- player UI manifest consumption
- app write paths

## Next Allowed Step

`phase69_pass1h_phase_closeout_qa`
