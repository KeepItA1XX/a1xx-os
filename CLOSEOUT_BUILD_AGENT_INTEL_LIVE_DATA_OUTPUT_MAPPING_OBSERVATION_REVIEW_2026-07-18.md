# Build Agent Closeout - Intel Output-Mapping Observation Review

Date: 2026-07-18
Scope: read-only source-to-view mapping review for the live output observation
Baseline live-read closeout: `CLOSEOUT_BUILD_AGENT_INTEL_LIVE_DATA_BROWSER_LIVE_READ_2026-07-18.md`
Baseline closeout SHA: `ad7c73273db84e15fd124801154b267c007d5b44002d52f9e5ff71c8a4ee0780`

## Disposition

`identity_mapping_concern_title_collision_not_confirmed_duplicate_id`

The four visible `Output 38e61152` entries should not be treated as proof that one canonical output ID was emitted four times. The prior browser closeout used the visible title as an ID shorthand. Source evidence shows that canonical IDs and display titles are separate fields, and the current output surface displays the title without a visible canonical identifier.

## Evidence

- Apps Script `intelDedupeRowsV1` keeps one row per exact `row.id`, records duplicate IDs in `health.duplicates`, and returns the deduped output packet. This is the source-side identity boundary.
- HTML `intelLiveRecordV25` preserves `row.id` as `id` and maps `row.title` independently as `title`.
- HTML `getIntelAgencySnapshot` dedupes output records by exact `output.id` across job and department attachments before the Agents Outputs view is built.
- HTML `getIntelOutputCommandRowsV25` maps the snapshot rows one-for-one; the output card's visible name is `row.title`, while the selected action uses `row.id`.
- The approved live-read baseline rendered 16 Agents > Outputs cards and 16 Library output rows. The visible label `Output 38e61152` appeared four times, with 13 unique visible labels among those 16 records. No raw canonical IDs were collected in that browser-only read.

## Classification

This is an identity/mapping concern at the presentation boundary, not a confirmed source duplicate and not safely dismissible as harmless presentation duplication. The available evidence is consistent with four distinct live records sharing a title, but the visible surface does not make that distinction reviewable. The source and snapshot dedupe rules make a same-ID fourfold emission less likely, but they do not prove the four underlying IDs from the existing browser evidence.

## Smallest Next Bounded Gate

Perform one docs-only or separately approved read-only identity-label review that compares each of the 16 packet records' canonical `id`, `title`, source URL, and rendered row/card position. Do not edit the app, Apps Script, or data; do not dedupe, rerun configuration, retry live reads, or perform unrelated QA.

Next approval phrase:

`APPROVE BUILD AGENT INTEL LIVE DATA OUTPUT CANONICAL-ID LABEL REVIEW ONLY`

## Boundaries

No browser rerun, app or Apps Script edit, data repair, dedupe, configuration rerun, sync, deploy, beta activation, commit, or push occurred in this review.

Locked production hashes remain unchanged: HTML `8a2c7578c6ebbee0fbae8cd98ef06bf8be773efde11c16303764bbbca6ece2d8`; Apps Script `8496b6c120137fc987ee4239dab05a3dfe10995d0c71ea45e7539ad195452ba8`.
