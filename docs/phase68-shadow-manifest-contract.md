# Phase 68 Shadow Manifest Contract

## Purpose

Phase 68 Pass 1B adds the first compact shadow manifest beside the existing `APP_CACHE_TOKEN` chain. The goal is to prove the replacement shape before any app behavior depends on it.

This pass does not remove the existing cache token and does not let the manifest drive player UI, mission runtime, writes, awards, notifications, or source reads.

## Current Build

- Current Phase: Phase 68 Build Manifest Replacement
- Current Pass: Pass 1B Shadow Manifest Contract
- Pass Type: shadow manifest contract / no runtime consumption
- Build stamp: OS v2_5 Phase 68 Build Manifest Replacement · Pass 1B Shadow Manifest Contract
- Next allowed step: `phase68_pass1c_manifest_readback_qa`

## Shadow Manifest Sections

The shadow manifest is stored in `APP_BUILD_MANIFEST_SHADOW_V25` and contains:

- `manifestVersion`
- `status`
- `activeRuntime`
- `fallback`
- `build`
- `features`
- `qa`
- `archives`
- `sources`
- `protectedBoundary`
- `migration`

## Active Boundary

- `APP_CACHE_TOKEN` remains the active fallback.
- The shadow manifest is not consumed by player UI.
- The shadow manifest does not replace the cache token.
- Historical build receipts stay referenced by pointers instead of embedded in player UI.
- Archive movement remains manual-only.

## QA Boundary

Fast QA may read the latest compact Phase 68 receipt so the app can prove this contract exists. That is not the same as using the manifest as app runtime.

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

`phase68_pass1c_manifest_readback_qa`
