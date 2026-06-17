# Phase 71 Developer Probe Contract

## Purpose

Phase 71 Pass 1B defines the developer-only probe contract.

This pass does not activate runtime. It only defines how the developer receipt can read the shadow manifest safely.

## Current Build

- Current Phase: Phase 71 Developer-Only Manifest Runtime Probe
- Current Pass: Pass 1B Developer Probe Contract
- Pass Type: developer-only probe contract / runtime blocked
- Build stamp: OS v2_5 Phase 71 Developer-Only Manifest Runtime Probe · Pass 1B Developer Probe Contract
- Next allowed step: `phase71_pass1c_manifest_identity_readback`

## Probe Contract

- Read shadow manifest only.
- Use developer-only receipt path.
- Do not expose to player UI.
- Do not switch or activate runtime.
- Do not clean up or remove token history.
- Do not open app write paths.

## Still Blocked

- runtime activation
- player UI manifest consumption
- token cleanup
- token removal
- app writes

## Protected Boundary

No protected execution path is enabled.
