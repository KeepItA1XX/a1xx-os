# Completion-Excluded Integration Agent Notion-First Project-Task Read V1 Row-Read Proof Decision Packet

Date: 2026-07-18
Correction gate prepared under: `APPROVE INTEGRATION AGENT NOTION-FIRST PROJECT-TASK READ-V1 PROJECTS-ONLY COMPLETION-EXCLUDED QUERY-DATA-SOURCES ROW-READ PROOF PACKET CORRECTION ONLY`
Packet status: `prepared_non_executing_completion_excluded`
Disposition: `ready_for_exact_projects_only_integration_sql_mode_row_read_proof_after_completion_exclusion`
Prepared receiver for future gate: Integration Agent
Planning thread: `019f5cb2-80b2-7081-8900-13900ba8e3c4`

## Supersedes

This fresh corrected docs-only packet supersedes only the SQL column contract in:

`/Users/a1xxoffice/Documents/Codex/2026-05-06/i-have-a-html-for-an/PACKET_INTEGRATION_AGENT_NOTION_FIRST_PROJECT_TASK_READ_V1_EXACT_ROW_READ_PROOF_DECISION_CORRECTED_2026-07-18.md`

Superseded packet SHA-256: `7f7bfb51d86f468fcb06eb23587091615b4cbab7dbfb7735d4b4ed8435496ad9`

No row query occurred under the superseded packet. The superseded proof stopped during schema-only preflight because `Completion` was marked `notAvailableInQuerySql`.

## Controlling Evidence

- Blocked proof closeout: `/Users/a1xxoffice/Documents/Codex/2026-05-06/i-have-a-html-for-an/CLOSEOUT_INTEGRATION_AGENT_NOTION_FIRST_PROJECT_TASK_READ_V1_PROJECTS_ONLY_CORRECTED_ROW_READ_PROOF_2026-07-18.md`
- Blocked proof closeout SHA-256: `588cae9f18f619f250f05d9c2b61bfa50d734afc89cee365996c699e03c357e3`
- Schema audit: `/Users/a1xxoffice/Documents/Codex/2026-05-06/i-have-a-html-for-an/CLOSEOUT_BUILD_AGENT_NOTION_FIRST_LIVE_DATA_CONTRACT_SCHEMA_GAP_AUDIT_2026-07-18.md`
- Schema audit SHA-256: `387b8011e97b7f76171d45cb306b4ca9c14ab0b611d68d2d2b19e95f1345c4f0`
- Capability closeout: `/Users/a1xxoffice/Documents/Codex/_prototype_work/money-mission-os/notion-first-project-task-read-v1-query-capability-surface-integration-closeout-2026-07-18.md`
- Capability closeout SHA-256: `8e37af81e9cc3f99f009cdc86e03be66896c03d0549dc3e7d55f4328f7c51121`
- Source selected for this proof: Projects collection only.
- Projects source URL: `collection://19f61152-81da-8141-86a7-000b43a05c39`

This packet prepares one future proof. It does not execute any Notion query, fetch schema, read rows, write Notion, use alternate tools, edit app/Apps Script/source files, run browser/QA, sync, deploy, or modify live state.

## Completion Exclusion

`Completion` remains an existing Projects rollup and app/relay-relevant field, but it is explicitly unavailable for SQL selection in the Projects data source based on the blocked proof closeout. Therefore this packet:

- removes `Completion` from the SQL query;
- removes `Completion` from SQL selected columns;
- preserves `Completion` as deferred/unavailable relay metadata;
- requires the future proof receipt to report `completionSqlAvailable:false`;
- does not authorize a second read, relation traversal, Tasks query, Tasks (Master) query, rollup recomputation, view query, search, direct API, app relay, cache path, or fallback record to recover Completion.

## Future Exact Execution Gate

If and only if Planning approves execution later, use this exact phrase:

`APPROVE INTEGRATION AGENT NOTION-FIRST PROJECT-TASK READ-V1 PROJECTS-ONLY COMPLETION-EXCLUDED QUERY-DATA-SOURCES ROW-READ PROOF EXACTLY ONCE`

## Future Proof Boundary

The future proof may perform exactly one bounded SQL-mode `mcp__codex_apps__notion_notion_query_data_sources` row-read proof in the Integration surface, after local/packet SHA verification and one schema-only Projects preflight if separately allowed by the execution gate. It must query only the Projects collection:

`collection://19f61152-81da-8141-86a7-000b43a05c39`

It must not query Tasks, Tasks (Master), database views, search, browser-visible pages, direct Notion API, app relay, cache, Apps Script, HTML, Sheets, Drive, Linear, or any other source.

## Exact Single Row-Read Contract

Future tool surface:

```text
mcp__codex_apps__notion_notion_query_data_sources({
  data: {
    mode: "sql",
    data_source_urls: ["collection://19f61152-81da-8141-86a7-000b43a05c39"],
    query: "SELECT \"Project name\", \"Project Type\", Status, Priority, \"Current Next Move\", \"Outcome / Definition of Done\", \"Needs A1XX\", \"Closest To Money\" FROM \"collection://19f61152-81da-8141-86a7-000b43a05c39\" LIMIT 5",
    params: []
  }
})
```

Do not add `Completion`, `title`, `Need for A1XX`, `Outcome`, `Closest to Money`, `url`, `id`, `createdTime`, or `last_edited_time` to the SQL unless a later schema preflight explicitly proves those exact SQL identifiers and Planning supplies a corrected packet.

## Minimum Selected Columns

Select only the following audited, queryable Projects fields:

- `Project name`
- `Project Type`
- `Status`
- `Priority`
- `Current Next Move`
- `Outcome / Definition of Done`
- `Needs A1XX`
- `Closest To Money`

The following app-safe output names may be used only in the closeout interpretation layer, not in SQL:

- `Project name` maps to app-safe `title`.
- `Needs A1XX` maps to app-safe `needsA1XX`.
- `Outcome / Definition of Done` maps to app-safe `outcome`.
- `Closest To Money` maps to app-safe `closestToMoney`.
- `Completion` maps to `completion:null` with `completionSqlAvailable:false` and `completionDeferredReason:"not_available_in_query_sql"`.

## Sensitive-Field Exclusions

Do not select:

- `Completion`
- `Client Email`
- `Client Phone`
- `Summary`
- `Owner`
- `Executive Producer`
- `Artist`
- `Tasks`
- `Tasks (Master)`
- `Is Blocking`
- `Blocked By`
- `Related Assets`
- `Campaign`
- `Mission Attempt`
- `Money Mission Cycle`
- attachments/files
- comments/content blocks
- person/email fields

If any selected result unexpectedly includes sensitive or relation-expanded content, the future proof must stop after recording the safe error shape and must not run a second query.

## Row Limit and Pagination

- Strict row limit: `LIMIT 5`.
- Page/source count: one source only.
- Pagination: no follow-up page is authorized.
- If the response indicates `has_more`, `next_cursor`, or equivalent pagination state, record it in the receipt and stop without fetching the next page.
- If the response returns more than five rows, mark the proof failed and do not repair or retry.

## Required Receipt

The later closeout must include a structured receipt with at least:

```text
{
  packet: "notion_first_project_task_read_v1_projects_only_completion_excluded_row_read_proof",
  status: "live | empty | blocked",
  toolRegistration: "mcp__codex_apps__notion_notion_query_data_sources",
  mode: "sql",
  source: "collection://19f61152-81da-8141-86a7-000b43a05c39",
  selectedColumns: [
    "Project name",
    "Project Type",
    "Status",
    "Priority",
    "Current Next Move",
    "Outcome / Definition of Done",
    "Needs A1XX",
    "Closest To Money"
  ],
  deferredUnavailableFields: [
    {
      "field": "Completion",
      "reason": "not_available_in_query_sql",
      "relayValue": null
    }
  ],
  rowLimit: 5,
  rowsReturned: number,
  hasMore: boolean | null,
  nextCursorPresent: boolean | null,
  sourceFetchedAt: string | null,
  generatedAt: string,
  freshnessState: "unknown | fresh | stale | blocked",
  errors: [],
  blocked: {
    notionWrite: false,
    fallbackRecords: false,
    alternateTool: false,
    appWrite: false
  }
}
```

The receipt must separately state:

- exact SQL text used;
- exact params array;
- exact row count;
- whether pagination metadata was present;
- whether any selected field was missing/null;
- whether any sensitive excluded field appeared unexpectedly;
- `Completion` deferred/unavailable status;
- zero Notion writes;
- zero app/source writes;
- zero alternate tools.

## Cleanup and Stop Conditions

No cleanup is expected because the future proof must not create, mutate, cache, sync, deploy, or stage anything.

Stop immediately and return blocked on:

- controlling SHA drift;
- Projects collection URL drift;
- tool registration missing or renamed;
- selected column mismatch or ambiguous SQL identifier;
- `Completion` appearing in SQL or selected columns;
- any requirement to query Tasks, Tasks (Master), view mode, search, fetch fallback for row contents, direct API, browser, app relay, cache, Sheets, Drive, Linear, or another source;
- request to write Notion, app, Apps Script, HTML, source, Sheet, property, cache, or external state;
- row limit not enforceable;
- pagination requiring a second call;
- sensitive excluded fields appearing in the result;
- malformed result, missing row count, or absent error metadata;
- any retry, fallback, repair, or alternate route request.

## Later Fresh Read-Proof Closeout Path

The future execution gate must write exactly one new closeout:

`/Users/a1xxoffice/Documents/Codex/2026-05-06/i-have-a-html-for-an/CLOSEOUT_INTEGRATION_AGENT_NOTION_FIRST_PROJECT_TASK_READ_V1_PROJECTS_ONLY_COMPLETION_EXCLUDED_ROW_READ_PROOF_2026-07-18.md`

That closeout must include packet path/SHA, controlling evidence paths/SHAs, schema/preflight result if authorized, exact SQL/params, selected columns, row limit, receipt metadata, Completion deferred/unavailable status, result disposition, blockers, and exact next recommendation.

## Prohibited Under This Packet

No row query, tool invocation, schema fetch, missing-tool retry, view query, search, direct API, browser/app/QA run, Notion write, source/app/Apps Script/HTML edit, sync, deploy, beta, commit, push, cleanup, archive/delete, migration, or external action is authorized by this packet-correction gate.

## Return Route

Return completion-excluded packet path/SHA, correction closeout path/SHA, Command Hub receipt/backup, blockers, and exact future execution gate to Planning thread `019f5cb2-80b2-7081-8900-13900ba8e3c4`, then stop.
