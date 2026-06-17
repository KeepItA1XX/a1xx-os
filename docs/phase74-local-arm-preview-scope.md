# Phase 74 Local Arm Preview Scope

Phase 74 begins the controlled runtime probe local-arm preview. This pass defines what can be prepared locally before any future dry-run simulation.

Allowed:
- Define local arm preview scope.
- Keep the arm path single-use.
- Require preflight before a future dry run.
- Keep APP_CACHE_TOKEN as the active fallback.

Blocked:
- Probe arming.
- Probe execution.
- Runtime activation.
- Player UI manifest consumption.
- Token cleanup.
- Archive movement.
- App writes.

Next allowed step: Phase 74 Pass 1B Single-Use Arm Record.
