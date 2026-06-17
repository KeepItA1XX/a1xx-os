# Phase 75 Dry-Run Simulation Scope

Phase 75 runs a developer-only dry-run simulation for the controlled runtime probe path.

Allowed:
- Simulate the probe lane locally.
- Read the shadow manifest in the dry-run lane.
- Check protected-boundary stop rules.
- Produce a developer-only result packet.

Blocked:
- Runtime activation.
- Real controlled probe execution.
- Player UI manifest consumption.
- App writes.
- Token cleanup.
- Archive movement.
- Notifications, workers, and automations.

Next allowed step: Phase 75 Pass 1B Simulation Harness Contract.
