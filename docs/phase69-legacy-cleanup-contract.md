# Phase 69 Legacy Cleanup Contract

## Purpose

Phase 69 Pass 1C defines the archive-first cleanup contract for reducing legacy app weight later.

This pass does not remove cache-token history, compact live code, move archive files, activate manifest runtime, or change player UI.

## Current Build

- Current Phase: Phase 69 Manifest Runtime or Cleanup Planning
- Current Pass: Pass 1C Legacy Cleanup Contract
- Pass Type: legacy cleanup contract / no removal
- Build stamp: OS v2_5 Phase 69 Manifest Runtime or Cleanup Planning · Pass 1C Legacy Cleanup Contract
- Next allowed step: `phase69_pass1d_cleanup_group_preflight`

## Cleanup Groups

| Group | Future Action | Execution Now |
| --- | --- | --- |
| Old build-token history | Archive pointer, then compact | No |
| Historical developer receipts | Docs pointer, then compact | No |
| Legacy QA pointer chains | Manifest pointer, then compact | No |
| Inactive player-surface receipts | Developer archive, then compact | No |

## Archive-First Rules

- Create a timestamped backup before any future cleanup pass.
- Every compacted history group must have a readable archive pointer.
- No delete path is authorized; cleanup means archive-backed compaction only.
- Clean one group per future pass so regressions stay easy to find.
- Run parse, diff, source markers, and protected-boundary checks after each group.

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

`phase69_pass1d_cleanup_group_preflight`
