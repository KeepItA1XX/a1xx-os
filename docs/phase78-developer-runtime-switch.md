# Phase 78 Pass 1C: Developer Runtime Switch

## Current Phase

Phase 78: Controlled Runtime Activation

## Current Pass

Pass 1C: Developer Runtime Switch

## Pass Type

Developer-only manifest runtime switch.

## Switch

The build manifest is now the enabled pointer for developer runtime readback. The player UI does not consume manifest-driven behavior yet.

## Readback expectations

- Manifest status: `controlled_runtime_active_developer_only`
- Enabled pointer: `APP_BUILD_MANIFEST_SHADOW_V25`
- Fallback: `APP_CACHE_TOKEN`
- Developer runtime reads: active
- Player UI reads: blocked
- App writes: blocked

