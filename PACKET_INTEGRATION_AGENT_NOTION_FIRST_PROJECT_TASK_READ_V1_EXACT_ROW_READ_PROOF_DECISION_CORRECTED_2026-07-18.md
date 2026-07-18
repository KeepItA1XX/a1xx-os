# Corrected Integration Agent Notion-First Project-Task Read V1 Exact Row-Read Proof Decision Packet

Date: 2026-07-18
Correction gate prepared under: `APPROVE INTEGRATION AGENT NOTION-FIRST PROJECT-TASK READ-V1 EXACT ROW-READ PROOF COLUMN-CONTRACT RECONCILIATION ONLY`
Packet status: `prepared_non_executing_corrected_column_contract`
Disposition: `ready_for_exact_projects_only_integration_sql_mode_row_read_proof_after_schema_identifier_preflight`
Prepared receiver for future gate: Integration Agent
Planning thread: `019f5cb2-80b2-7081-8900-13900ba8e3c4`

## Supersedes

This corrected docs-only packet supersedes only the SQL column contract in:

`/Users/a1xxoffice/Documents/Codex/2026-05-06/i-have-a-html-for-an/PACKET_INTEGRATION_AGENT_NOTION_FIRST_PROJECT_TASK_READ_V1_EXACT_ROW_READ_PROOF_DECISION_2026-07-18.md`

Superseded packet SHA-256: `cc48f56f81d4cab5ff2d8c6f551b194339fc8df4d97b063d1b15e6da913ac8db`

No execution occurred under the superseded packet.

## Controlling Evidence

- Schema audit: `/Users/a1xxoffice/Documents/Codex/2026-05-06/i-have-a-html-for-an/CLOSEOUT_BUILD_AGENT_NOTION_FIRST_LIVE_DATA_CONTRACT_SCHEMA_GAP_AUDIT_2026-07-18.md`
- Schema audit SHA-256: `387b8011e97b7f76171d45cb306b4ca9c14ab0b611d68d2d2b19e95f1345c4f0`
- Capability closeout: `/Users/a1xxoffice/Documents/Codex/_prototype_work/money-mission-os/notion-first-project-task-read-v1-query-capability-surface-integration-closeout-2026-07-18.md`
- Capability closeout SHA-256: `8e37af81e9cc3f99f009cdc86e03be66896c03d0549dc3e7d55f4328f7c51121`
- Project-Task V1 decision packet: `/Users/a1xxoffice/Documents/Codex/2026-05-06/i-have-a-html-for-an/PACKET_BUILD_AGENT_NOTION_FIRST_PROJECT_TASK_READ_V1_PROJECTION_DECISION_2026-07-18.md`
- Project-Task V1 decision packet SHA-256: `7ecc2f60b1923f201dfd272cd5489ee6d4ecc955fdaf3707cbb3c328e88d390c`
- Source selected for this proof: Projects collection only.
- Projects source URL: `collection://19f61152-81da-8141-86a7-000b43a05c39`

This packet prepares one future proof. It does not execute any Notion query, read rows, write Notion, use alternate tools, edit app/Apps Script/source files, run browser/QA, sync, deploy, or modify live state.

## Column-Contract Correction

The schema audit documents Projects source property names as:

- `Project name`
- `Project Type`
- `Status`
- `Priority`
- `Dates`
- `Summary`
- `Current Next Move`
- `Outcome / Definition of Done`
- `Owner`
- `Executive Producer`
- `Artist`
- `Client Email`
- `Client Phone`
- `Needs A1XX`
- `Closest To Money`
- `Completion`
- relation properties including `Tasks`, `Tasks (Master)`, `Is Blocking`, `Blocked By`, `Related Assets`, `Campaign`, `Mission Attempt`, and `Money Mission Cycle`

The superseded packet named app-safe or inferred identifiers that are not documented as SQL aliases in the schema audit:

- `title`
- `Need for A1XX`
- `Outcome`
- `Closest to Money`
- `last_edited_time`

The corrected packet must use only audited Projects property names in SQL unless the future schema-first preflight proves an exact connector metadata identifier. Metadata identifiers such as page ID, URL, and last edited time remain receipt requirements if returned out-of-band by the connector, but they are not selected as SQL columns in this corrected packet.

## Future Exact Execution Gate

If and only if Planning approves execution later, use this exact phrase:

`APPROVE INTEGRATION AGENT NOTION-FIRST PROJECT-TASK READ-V1 PROJECTS-ONLY CORRECTED QUERY-DATA-SOURCES ROW-READ PROOF EXACTLY ONCE`

## Future Proof Boundary

The future proof may perform exactly one bounded SQL-mode `mcp__codex_apps__notion_notion_query_data_sources` row-read proof in the Integration surface, after a schema-first preflight. It must query only the Projects collection:

`collection://19f61152-81da-8141-86a7-000b43a05c39`

It must not query Tasks, Tasks (Master), database views, search, browser-visible pages, direct Notion API, app relay, cache, Apps Script, HTML, Sheets, Drive, Linear, or any other source.

## Schema-First Preflight

Before the single row-read call, the future proof must:

1. Verify this corrected packet SHA and all controlling evidence SHAs.
2. Confirm the Integration runtime still exposes the schema-first SQL surface for `mcp__codex_apps__notion_notion_query_data_sources`.
3. Verify Projects data-source schema only as required to confirm the exact `collection://19f61152-81da-8141-86a7-000b43a05c39` URL and the corrected selected property names.
4. Stop before row-read if any selected property name is absent, renamed, type-ambiguous, or requires an undocumented alias.
5. Stop before row-read if page ID, source URL, last-edited, or pagination metadata is required as a SQL-selected column rather than connector receipt metadata.
6. Record the preflight result in the later closeout.

No schema migration, property creation, record write, relation repair, source edit, app edit, fallback fetch/search, or row-content fetch is authorized.

## Exact Single Row-Read Contract

Future tool surface:

```text
mcp__codex_apps__notion_notion_query_data_sources({
  data: {
    mode: "sql",
    data_source_urls: ["collection://19f61152-81da-8141-86a7-000b43a05c39"],
    query: "SELECT \"Project name\", \"Project Type\", Status, Priority, \"Current Next Move\", \"Outcome / Definition of Done\", \"Needs A1XX\", \"Closest To Money\", Completion FROM \"collection://19f61152-81da-8141-86a7-000b43a05c39\" LIMIT 5",
    params: []
  }
})
```

Do not add `title`, `Need for A1XX`, `Outcome`, `Closest to Money`, `url`, `id`, or `last_edited_time` to the SQL unless a later schema preflight explicitly proves those exact SQL identifiers for this connector and Planning supplies a corrected packet.

## Minimum Selected Columns

The proof is intentionally narrow. Select only the following audited Projects fields:

- `Project name`
- `Project Type`
- `Status`
- `Priority`
- `Current Next Move`
- `Outcome / Definition of Done`
- `Needs A1XX`
- `Closest To Money`
- `Completion`

The following app-safe output names may be used only in the closeout interpretation layer, not in SQL:

- `Project name` maps to app-safe `title`.
- `Needs A1XX` maps to app-safe `needsA1XX`.
- `Outcome / Definition of Done` maps to app-safe `outcome`.
- `Closest To Money` maps to app-safe `closestToMoney`.

## Sensitive-Field Exclusions

Do not select:

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
  packet: "notion_first_project_task_read_v1_projects_only_corrected_row_read_proof",
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
    "Closest To Money",
    "Completion"
  ],
  rowLimit: 5,
  rowsReturned: number,
  hasMore: boolean | null,
  nextCursorPresent: boolean | null,
  pageIdMetadataPresent: boolean | null,
  sourceUrlMetadataPresent: boolean | null,
  lastEditedMetadataPresent: boolean | null,
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
- whether page ID, source URL, and last-edited metadata were returned out-of-band;
- whether any selected field was missing/null;
- whether any sensitive excluded field appeared unexpectedly;
- zero Notion writes;
- zero app/source writes;
- zero alternate tools.

## Cleanup and Stop Conditions

No cleanup is expected because the future proof must not create, mutate, cache, sync, deploy, or stage anything.

Stop immediately and return blocked on:

- controlling SHA drift;
- Projects collection URL drift;
- tool registration missing or renamed;
- schema-first preflight mismatch;
- selected column mismatch or ambiguous SQL identifier;
- need for undocumented aliases or metadata SQL columns;
- any requirement to query Tasks, Tasks (Master), view mode, search, fetch fallback for row contents, direct API, browser, app relay, cache, Sheets, Drive, Linear, or another source;
- request to write Notion, app, Apps Script, HTML, source, Sheet, property, cache, or external state;
- row limit not enforceable;
- pagination requiring a second call;
- sensitive excluded fields appearing in the result;
- malformed result, missing row count, or absent error metadata;
- any retry, fallback, repair, or alternate route request.

## Later Fresh Read-Proof Closeout Path

The future execution gate must write exactly one new closeout:

`/Users/a1xxoffice/Documents/Codex/2026-05-06/i-have-a-html-for-an/CLOSEOUT_INTEGRATION_AGENT_NOTION_FIRST_PROJECT_TASK_READ_V1_PROJECTS_ONLY_CORRECTED_ROW_READ_PROOF_2026-07-18.md`

That closeout must include packet path/SHA, controlling evidence paths/SHAs, schema-first preflight result, exact SQL/params, selected columns, row limit, receipt metadata, result disposition, blockers, and exact next recommendation.

## Prohibited Under This Packet

No row query, tool invocation, missing-tool retry, view query, search, direct API, browser/app/QA run, Notion write, source/app/Apps Script/HTML edit, sync, deploy, beta, commit, push, cleanup, archive/delete, migration, or external action is authorized by this packet-preparation gate.

## Return Route

Return corrected packet path/SHA, reconciliation closeout path/SHA, blockers, and exact future execution gate to Planning thread `019f5cb2-80b2-7081-8900-13900ba8e3c4`, then stop.
