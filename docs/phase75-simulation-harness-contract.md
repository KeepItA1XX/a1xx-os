# Phase 75 Simulation Harness Contract

The dry-run harness is an in-memory developer-only shape. It does not persist records, call external services, or activate runtime behavior.

Harness fields:
- inputPacket
- manifestSnapshot
- boundarySnapshot
- simulatedAt
- result
- stopReason

The harness can only report whether the simulated path would stop safely.

Next allowed step: Phase 75 Pass 1C Manifest Readback Dry Run.
