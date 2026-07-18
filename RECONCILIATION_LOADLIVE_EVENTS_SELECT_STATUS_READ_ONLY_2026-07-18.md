# Read-Only Reconciliation — `loadLiveEvents` Select vs Status Contract

Date: 2026-07-18

Approval: `APPROVE READ-ONLY RECONCILIATION OF LOADLIVE EVENTS SELECT-VS-STATUS QUERY CONTRACT ONLY.`

## Result

Reconciliation complete. The live Notion data source for `🎥 Live Events & Streams` is:

- Database ID: `99fcf23b-0cdc-49e7-9e23-9e99c08438d5`
- Data source: `collection://f32424f4-9966-4aaf-a387-ff985f4be95e`

The canonical `Status` property is a Notion **select** property, not a Notion status property. Its verified options are:

`Idea`, `Planning`, `Confirmed`, `Live Now`, `Done`, `Cancelled`.

The Notion schema and SQLite contract both expose `Status` as a text-backed field whose source type is `select`. The current browser failure therefore matches a query-contract mismatch: the live-events read path is applying a `status` filter to a database property whose type is `select`.

## Evidence

- Notion database fetch completed read-only with no writes.
- Database schema reports `Status.type = select` and enumerates the six options above.
- SQLite data-source definition reports `"Status" TEXT -- one of [...]`.
- Existing app `loadLiveEvents()` only requests Apps Script `action=live_events`; the mismatch is downstream in the Apps Script/Notion query path, not in the HTML fetch wrapper.
- Prior browser QA failure: Notion HTTP 400, `database property select does not match filter status`, request ID `53fb3f18-f3c0-4879-acd0-2113b66779ba`.

## Boundary respected

No Apps Script or HTML source was changed. No Notion record/schema/view was changed. No browser retry, visual QA, deployment, sync, beta, commit, or push was performed.

## Next gate

A separate implementation approval is required to repair the Apps Script live-events filter so it uses the verified `select` contract, followed by a fresh bounded browser QA approval.
