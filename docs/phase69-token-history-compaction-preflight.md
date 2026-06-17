# Phase 69 Token History Compaction Preflight

## Purpose

Phase 69 Pass 1F defines the checklist that must pass before old build-token history can ever be compacted in a future approval-gated pass.

This pass does not compact code, remove cache-token history, move archives, activate manifest runtime, or change player UI.

## Current Build

- Current Phase: Phase 69 Manifest Runtime or Cleanup Planning
- Current Pass: Pass 1F Token History Compaction Preflight
- Pass Type: compaction preflight / no compaction
- Build stamp: OS v2_5 Phase 69 Manifest Runtime or Cleanup Planning · Pass 1F Token History Compaction Preflight
- Next allowed step: `phase69_pass1g_runtime_switch_candidate`

## Required Checklist

- Token history archive pointer is readable.
- Current build identity is available outside token history.
- `APP_CACHE_TOKEN` fallback remains active until an approved switch.
- Future compaction is scoped to token history only.
- Rollback uses timestamped backup and archive pointer.
- Future compaction requires parse, diff, source markers, and protected-boundary QA.

## Still Blocked

The following remain blocked:

- cache-token removal
- history compaction execution
- archive movement
- runtime activation
- player UI manifest consumption
- app write paths

## Next Allowed Step

`phase69_pass1g_runtime_switch_candidate`
