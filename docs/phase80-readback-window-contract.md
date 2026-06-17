# Phase 80 Pass 1B: Readback Window Contract

Phase 80: Developer Runtime Observation Readback

Current Phase: Phase 80
Current Pass: Pass 1B
Pass Type: bounded readback window / no persistence

Purpose:
Define the exact fields the developer observation window may read from the compact manifest before any release decision.

Readback window:
- Manifest identity
- Developer runtime pointer
- Fast QA pointer
- APP_CACHE_TOKEN fallback pointer
- Protected boundary count
- Player release hold state

Rules:
- The readback window is local and non-persistent.
- No player UI surface consumes the manifest.
- No app write path is enabled.
- The fallback remains available.

Next pass:
Phase 80 Pass 1C: Observation Snapshot Rows.
