# Phase 69 Cleanup Group Preflight

## Purpose

Phase 69 Pass 1D selects the first legacy weight group for future cleanup review and defines the stop conditions before any compaction work can happen.

This pass does not compact code, remove cache-token history, move archives, activate manifest runtime, or change player UI.

## Current Build

- Current Phase: Phase 69 Manifest Runtime or Cleanup Planning
- Current Pass: Pass 1D Cleanup Group Preflight
- Pass Type: cleanup group preflight / no compaction
- Build stamp: OS v2_5 Phase 69 Manifest Runtime or Cleanup Planning · Pass 1D Cleanup Group Preflight
- Next allowed step: `phase69_pass1e_token_history_archive_pointer`

## Selected Future Cleanup Candidate

Selected group: old build-token history.

Reason: this is the largest visible weight risk and the safest first candidate because the compact manifest now carries the current build identity while `APP_CACHE_TOKEN` remains the active fallback.

## Required Preflight Checks

- Timestamped backup exists before any future compaction.
- Readable archive pointer doc exists before any future compaction.
- `APP_CACHE_TOKEN` remains active fallback until a later approved switch.
- Parse, diff, source markers, and protected-boundary checks are required after future compaction.
- Only one group can be compacted per future pass.

## Stop Conditions

Stop future cleanup if any of these happen:

- archive pointer is missing or unreadable
- parse, diff, source marker, or protected-boundary checks fail
- unrelated files appear in the change list
- player UI changes appear in a cleanup-only pass

## Still Blocked

The following remain blocked:

- cache-token removal
- history compaction execution
- archive movement
- runtime activation
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

`phase69_pass1e_token_history_archive_pointer`
