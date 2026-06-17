# Phase 73 Rollback Stop Rules

## Status

Ready.

## Current Phase

- Phase: 73
- Pass: 1E
- Pass type: rollback stop rules / stop before execution

## Stop Rules

Any future controlled probe path must stop before execution if:

- script parse fails
- Fast QA fails
- protected boundary changes
- player UI changes unexpectedly
- `APP_CACHE_TOKEN` fallback is missing
- a write path appears

## Rollback Posture

The current safe rollback posture is to keep `APP_CACHE_TOKEN` active and use the timestamped backup if a future patch fails before execution.

## Next

Pass 1F closes Phase 73.
