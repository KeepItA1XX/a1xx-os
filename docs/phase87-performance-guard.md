# Phase 87 Performance Guard

Current Phase: Phase 87: First Live Player Data Surfaces
Current Pass: Pass 1F: Performance Guard
Pass Type: bounded render / no broad rebuild

## Guard

The first live surface must not rebuild the full Account surface, Missions room, developer receipts, or historical QA chain.

## Limits

- Row count is capped at 3.
- Hidden surfaces stay hidden.
- Developer readback stays out of player rendering.
- No broad app read loop starts from Overview Today.
- Fast QA remains compact.

