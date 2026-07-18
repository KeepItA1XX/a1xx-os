# Notion-First Project-Task Read V1 Projection Decision Packet

Date: 2026-07-18
Gate: `APPROVE BUILD AGENT NOTION-FIRST PROJECT-TASK READ-V1 PROJECTION DECISION PACKET PREPARATION ONLY`
Packet status: `implementation_ready_non_executing`
Disposition: `preflight_blocked_required_notion_row_query_capability_unavailable`

## Controlling Evidence

- Audit: `/Users/a1xxoffice/Documents/Codex/2026-05-06/i-have-a-html-for-an/CLOSEOUT_BUILD_AGENT_NOTION_FIRST_LIVE_DATA_CONTRACT_SCHEMA_GAP_AUDIT_2026-07-18.md`
- Audit SHA-256: `387b8011e97b7f76171d45cb306b4ca9c14ab0b611d68d2d2b19e95f1345c4f0`
- Projects source: `collection://19f61152-81da-8141-86a7-000b43a05c39`
- Tasks source: `collection://19f61152-81da-81d1-9b62-000b988f7279`
- Current HTML predecessor SHA-256: `8a2c7578c6ebbee0fbae8cd98ef06bf8be773efde11c16303764bbbca6ece2d8`
- Current Apps Script predecessor SHA-256: `8496b6c120137fc987ee4239dab05a3dfe10995d0c71ea45e7539ad195452ba8`

This packet defines one future source-only read projection. It does not edit or invoke the relay, read rows, write Notion, create a schema, add fallback records, run browser/server QA, or authorize deployment.

## Decision Boundary

Future candidate name: `notion_first_project_task_read_v1`

Future source boundary:

- Read only the two locked collections above.
- Reuse only properties and relations already present in Projects and Tasks.
- Do not query `Tasks (Master)` in the first pass, even though the current Project Desk relay names it.
- Do not join AI Agency, Outputs, Notes, CRM, Linear, Sheets, Drive, or any other collection in this first pass.
- Do not create, update, archive, duplicate, move, relate, template, or otherwise mutate Notion objects.
- Do not synthesize placeholder, seeded, local-fallback, or inferred records when either source is empty or unavailable.

## Source Authority Decisions

### Tasks versus Tasks (Master)

The canonical first-pass task source is the verified `Tasks` collection `19f61152-81da-81d1-9b62-000b988f7279`. `Tasks (Master)` is explicitly deferred because the audit has not established whether it is a mirror, a separate operational source, or the authoritative source for the app's Project Desk. No deduplication or cross-source merge is permitted in this packet.

Required later research: one supported bounded row read must compare the Projects `Tasks` relation, the Tasks source, and the `Tasks (Master)` relation/source before any future expansion.

### Completion rollup

Projects `Completion` is accepted as source truth only when returned by the locked Projects source and accompanied by a valid project record. The relay must not recompute completion from task rows in this first pass. Missing, empty, or unsupported rollup values remain `null` with an explicit field-state marker; they do not become zero, 100%, or a fallback estimate.

### Row nullability and cardinality

- Every source row must have a stable Notion page ID and title. Rows missing either are rejected with a bounded diagnostic and do not become fallback records.
- Missing scalar properties map to `null`, never to a guessed label or default business value.
- Missing relation properties map to `[]`.
- Relation IDs are arrays of exact Notion page IDs, deduplicated within the row without cross-source matching.
- Dates remain source strings or `null`; no timezone or due-date inference is performed.
- A source query returning no rows is a valid empty source result, not permission to use local seeded data.
- A source query error, unsupported property shape, pagination ambiguity, or partial page response blocks the projection.

### Cache and freshness

Freshness is explicitly deferred until the required row-query capability can expose source-read metadata. The current Apps Script helper can cache successful data-source reads for up to 600 seconds and retries a 500 response once; this packet does not claim that behavior is acceptable for the new contract.

The future capability must provide, or the relay must safely derive without another source read:

`sourceFetchedAt`, `generatedAt`, `cacheHit`, `cacheAgeMs`, and `freshnessState`.

Until those fields are available, the result must be `freshnessState: "unknown"` and cannot be presented as fresh. No cache bypass, cache mutation, retry, or alternate query mechanism is authorized by this packet.

## App-Safe Projection Contract

The future packet must contain only the following allowlisted fields. Unknown source properties are dropped from the app-safe result, not copied through.

```text
{
  packet: "notion_first_project_task_read_v1",
  status: "live | empty | blocked",
  generatedAt: string,
  sourceFetchedAt: string | null,
  freshness: {
    state: "fresh | stale | unknown | blocked",
    cacheHit: boolean | null,
    cacheAgeMs: number | null,
    maxAgeMs: number
  },
  projects: ProjectRead[],
  tasks: TaskRead[],
  health: {
    sourceStatus: "live | empty | blocked",
    projectsCount: number,
    tasksCount: number,
    rejectedRows: number,
    relationWarnings: string[],
    errors: string[]
  },
  blocked: {
    notionWrite: false,
    fallbackRecords: false,
    alternateSource: false,
    appWrite: false
  }
}
```

### ProjectRead allowlist

```text
id, title, projectType, status, priority, dates, ownerIds,
artist, executiveProducer, clientEmail, clientPhone, summary,
nextAction, outcome, needsA1XX, closestToMoney, completion,
taskIds, blockedByIds, isBlockingIds, relatedAssetIds,
campaignIds, missionAttemptIds, moneyMissionCycleIds, sourceUrl,
updatedAt
```

### TaskRead allowlist

```text
id, title, status, due, completedOn, priority, assigneeIds,
projectIds, parentTaskIds, subTaskIds, tags, campaignIds,
relatedAssetIds, missionAttemptIds, moneyMissionCycleIds,
moveType, notes, resultNeeded, actualMinutes, estimatedMinutes,
estimate, energy, workBlocks, batchLane, area, ruleOf300Eligible,
resultLogged, sourceUrl, updatedAt
```

Fields such as `App Read Eligible`, `Current Surface`, `Review Needed`, `Waiting On`, `Risk`, and `Freshness` are not to be added to Projects or canonical Tasks by this packet. `Freshness` belongs to the relay contract; `Review Needed`, `Waiting On`, and `Risk` require classification as computed state or a later domain decision; `App Read Eligible` exists in a different Tasks (Master) schema and is excluded from this first source boundary.

## View Mapping

### Today

- Notion truth: project `title`, `status`, `priority`, `summary`, `nextAction`, `needsA1XX`, `closestToMoney`, `dates`, `completion`; task `title`, `status`, `due`, `priority`, `projectIds`, `resultNeeded`.
- Relay-computed: needs-review, ready, waiting/blocked, counts, freshness, invalid-row diagnostics.
- App-local: Open First selection, compact timeline/queue layout, tone, drawer, filter, and route state.
- No fallback record is shown when sources are empty or blocked.

### Projects

- Notion truth: all allowlisted ProjectRead identity, operating, client, review, completion, and relation fields.
- Relay-computed: task joins only by exact relation IDs, relation warnings, and source health.
- App-local: project cards, selected project, files/notes/activity tabs, and display ordering.

### Planning

- Notion truth: task status, due/completed dates, priority, assignee, project relation, notes, result needed, and work context; project next move, owner, blocking relations, and outcome.
- Relay-computed: queue grouping, blocked/needs-review classification only where a locked rule exists, and relation summaries.
- App-local: focus lane, parked work, approval copy, and selected task/project.

### Mission Command

- Notion truth: project summary, next move, outcome; task result needed, notes, status, due, and priority.
- Relay-computed: safe read context packet with explicit source IDs and freshness state.
- App-local: response wording, focus lane, local mission chain, voice state, and action guards. This packet does not route commands or authorize writes.

## Required Live Query Capability

The only acceptable future row-read mechanism is one supported Notion data-source query capability that:

1. Is available in the connected runtime under a documented stable name.
2. Requires the source schema to be fetched first.
3. Accepts the two exact `collection://` URLs as query targets.
4. Returns bounded non-archived rows with page IDs, property values, relation IDs, pagination state, and read metadata.
5. Supports an explicit bounded page size and a deterministic no-fallback error result.
6. Does not require a Notion schema or record write.

The previously attempted capability returned `Tool notion-query-data-sources not found`. That absence is a **preflight blocker**. It is not a retry target and does not authorize an alternate connector, direct API call, browser read, server run, cache action, or source edit.

## Future One-Writer and Backup Contract

No writer is active for this packet. If a separate implementation gate is later issued, the single writer must be Build Agent 2, coordinated by Planning, unless A1XX explicitly changes the assignment.

Future target, if separately approved: `/Users/a1xxoffice/Documents/Codex/2026-05-06/i-have-a-html-for-an/apps-script-money-mission-tracker-v2_5.gs`.

Before any future write, create and hash a fresh backup using this locked naming pattern:

`/Users/a1xxoffice/Documents/Codex/2026-05-06/i-have-a-html-for-an/apps-script-money-mission-tracker-v2_5_backup_YYYYMMDD_HHMMSS_notion-first-project-task-read-v1.gs`

The HTML, Apps Script, Notion sources, and all existing backups remain unchanged by this packet.

## Exact Future Verification

The future execution packet must stop before source reads unless the required query capability preflight is clean:

1. Confirm exact source URLs and source schema hashes/field names.
2. Confirm supported query capability name, row-bound, pagination, metadata, and no-write behavior.
3. Confirm writer ownership and fresh timestamped backup before any source edit; no edit is allowed in this decision packet.
4. Query only the two locked sources with the allowlisted field contract.
5. Validate stable IDs, required titles, relation ID shape, scalar nullability, date preservation, duplicate IDs within each source, rejected-row count, and no fallback records.
6. Validate Projects-to-Tasks relation IDs without joining Tasks (Master).
7. Validate `Completion` as source-provided or `null`; never recompute it.
8. Validate freshness metadata; classify `unknown` when cache metadata is unavailable.
9. Run static/parser checks and a narrow diff only if a later implementation gate permits a relay edit.
10. Write one fresh closeout with the authoritative result, counts, diagnostics, source hashes, backup hash, and exact next phrase; update Command Hub once after a timestamped backup.

## Stop Conditions

Stop immediately, without retry or alternate mechanism, on:

- Missing required query capability or capability name drift.
- Source URL, schema, property, relation, pagination, or field-type mismatch.
- Any Notion schema, record, relation, template, cache, or app data write request.
- Any need to query Tasks (Master), another source, or fallback records in the first pass.
- Missing row metadata, ambiguous nullability/cardinality, duplicate canonical IDs, or unverifiable Completion semantics.
- Freshness metadata unavailable when the caller requires a fresh result.
- Unexpected fields in the app-safe output, silent field coercion, or relation inference by title.
- Request for app/Apps Script edit, browser/server/QA, sync/deploy, beta, commit, push, or external/live action.

## Fresh Closeout and Return Route

Future closeout path is packet-locked as:

`/Users/a1xxoffice/Documents/Codex/2026-05-06/i-have-a-html-for-an/CLOSEOUT_BUILD_AGENT_NOTION_FIRST_PROJECT_TASK_READ_V1_PROJECTION_2026-07-18.md`

Return route: Planning thread `019f5cb2-80b2-7081-8900-13900ba8e3c4`.

Exact next approval phrase:

`APPROVE BUILD AGENT NOTION-FIRST PROJECT-TASK READ-V1 SUPPORTED LIVE QUERY CAPABILITY RECONCILIATION ONLY`

This packet remains `preflight_blocked` until that capability is available and separately approved. No source, schema, app, Apps Script, browser, server, sync, deploy, beta, commit, push, or live action is authorized by this document.
