# Phase 74 Single-Use Arm Record

This pass defines the local arm record shape for future controlled runtime probe work.

Record fields:
- armId
- scope
- expiresAt
- preflightRequired
- usedAt
- status

The record is a preview contract only. It is not created, persisted, armed, or used by player UI.

Blocked:
- Persisting the record.
- Activating runtime.
- Executing a probe.
- Writing app data.

Next allowed step: Phase 74 Pass 1C Probe Preflight Checklist.
