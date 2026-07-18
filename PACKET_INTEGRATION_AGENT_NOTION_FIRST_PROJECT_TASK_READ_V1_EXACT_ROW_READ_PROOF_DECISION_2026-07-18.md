# Integration Agent Notion-First Project-Task Read V1 Exact Row-Read Proof Decision Packet

Date: 2026-07-18
Gate prepared under: `APPROVE INTEGRATION AGENT NOTION-FIRST PROJECT-TASK READ-V1 EXACT ROW-READ PROOF DECISION PACKET PREPARATION ONLY`
Packet status: `prepared_non_executing`
Disposition: `ready_for_exact_projects_only_integration_sql_mode_row_read_proof`
Prepared receiver for future gate: Integration Agent
Planning thread: `019f5cb2-80b2-7081-8900-13900ba8e3c4`

## Controlling Evidence

- Capability closeout: `/Users/a1xxoffice/Documents/Codex/_prototype_work/money-mission-os/notion-first-project-task-read-v1-query-capability-surface-integration-closeout-2026-07-18.md`
- Capability closeout SHA-256: `8e37af81e9cc3f99f009cdc86e03be66896c03d0549dc3e7d55f4328f7c51121`
- Project-Task V1 decision packet: `/Users/a1xxoffice/Documents/Codex/2026-05-06/i-have-a-html-for-an/PACKET_BUILD_AGENT_NOTION_FIRST_PROJECT_TASK_READ_V1_PROJECTION_DECISION_2026-07-18.md`
- Project-Task V1 decision packet SHA-256: `7ecc2f60b1923f201dfd272cd5489ee6d4ecc955fdaf3707cbb3c328e88d390c`
- Source selected for this proof: Projects collection only.
- Projects source URL: `collection://19f61152-81da-8141-86a7-000b43a05c39`
- Tasks source URL: `collection://19f61152-81da-81d1-9b62-000b988f7279` is controlling context only and is not authorized for this proof.

This packet prepares one future proof. It does not execute any Notion query, read rows, write Notion, use alternate tools, edit app/Apps Script/source files, run browser/QA, sync, deploy, or modify live state.

## Future Exact Execution Gate

If and only if Planning approves execution later, use this exact phrase:

`APPROVE INTEGRATION AGENT NOTION-FIRST PROJECT-TASK READ-V1 PROJECTS-ONLY QUERY-DATA-SOURCES ROW-READ PROOF EXACTLY ONCE`

## Future Proof Boundary

The future proof may perform exactly one bounded SQL-mode `mcp__codex_apps__notion_notion_query_data_sources` row-read proof in the Integration surface, after a schema-first preflight. It must query only the Projects collection:

`collection://19f61152-81da-8141-86a7-000b43a05c39`

It must not query Tasks, Tasks (Master), database views, search, browser-visible pages, direct Notion API, app relay, cache, Apps Script, HTML, Sheets, Drive, Linear, or any other source.

## Schema-First Preflight

Before the single row-read call, the future proof must:

1. Verify this packet SHA and the two controlling evidence SHAs.
2. Confirm the Integration runtime still exposes the schema-first SQL surface for `mcp__codex_apps__notion_notion_query_data_sources`.
3. Fetch or otherwise verify the Projects data-source schema only as required to confirm the exact `collection://19f61152-81da-8141-86a7-000b43a05c39` URL and the selected column names.
4. Stop before row-read if the Projects collection URL, selected columns, tool registration, SQL mode, or no-write/no-fallback boundaries drift.
5. Record the preflight result in the later closeout, including whether schema verification succeeded without row content.

No schema migration, property creation, record write, relation repair, source edit, app edit, or fallback fetch/search is authorized.

## Exact Single Row-Read Contract

Future tool surface:

```text
mcp__codex_apps__notion_notion_query_data_sources({
  data: {
    mode: "sql",
    data_source_urls: ["collection://19f61152-81da-8141-86a7-000b43a05c39"],
    query: "SELECT id, title, Status, Priority, \"Project Type\", \"Need for A1XX\", \"Current Next Move\", Outcome, \"Closest to Money\", Completion, url, last_edited_time FROM \"collection://19f61152-81da-8141-86a7-000b43a05c39\" LIMIT 5",
    params: []
  }
})
```

If the schema reports different exact SQL property identifiers for title, URL, or last-edited metadata, stop and return blocked unless Planning supplies a corrected packet. Do not guess, alias, broaden, or issue a second query.

## Minimum Selected Columns

The proof is intentionally narrow. Select only the following Projects fields:

- `id`
- `title`
- `Status`
- `Priority`
- `Project Type`
- `Need for A1XX`
- `Current Next Move`
- `Outcome`
- `Closest to Money`
- `Completion`
- `url`
- `last_edited_time`

Sensitive-field exclusions:

- Do not select `Client Email`.
- Do not select `Client Phone`.
- Do not select freeform private notes or comments.
- Do not select owner/person email fields beyond opaque IDs if the connector returns them implicitly.
- Do not select relation expansions or joined task rows.
- Do not select attachments/files.
- Do not return content blocks.

If any selected column would expose unexpected sensitive text or person/contact details, the future proof must stop after recording the safe error shape and must not run a second query.

## Row Limit and Pagination

- Strict row limit: `LIMIT 5`.
- Page/source count: one source only.
- Pagination: no follow-up page is authorized.
- If the response indicates `has_more`, `next_cursor`, or any equivalent pagination state, record it in the receipt and stop without fetching the next page.
- If the response returns more than five rows, mark the proof failed and do not repair or retry.

## Required Receipt

The later closeout must include a structured receipt with at least:

```text
{
  packet: "notion_first_project_task_read_v1_projects_only_row_read_proof",
  status: "live | empty | blocked",
  toolRegistration: "mcp__codex_apps__notion_notion_query_data_sources",
  mode: "sql",
  source: "collection://19f61152-81da-8141-86a7-000b43a05c39",
  selectedColumns: [],
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
- any requirement to query Tasks, Tasks (Master), view mode, search, fetch fallback for row contents, direct API, browser, app relay, cache, Sheets, Drive, Linear, or another source;
- request to write Notion, app, Apps Script, HTML, source, Sheet, property, cache, or external state;
- row limit not enforceable;
- pagination requiring a second call;
- sensitive excluded fields appearing in the result;
- malformed result, missing row count, or absent error metadata;
- any retry, fallback, repair, or alternate route request.

## Later Fresh Read-Proof Closeout Path

The future execution gate must write exactly one new closeout:

`/Users/a1xxoffice/Documents/Codex/2026-05-06/i-have-a-html-for-an/CLOSEOUT_INTEGRATION_AGENT_NOTION_FIRST_PROJECT_TASK_READ_V1_PROJECTS_ONLY_ROW_READ_PROOF_2026-07-18.md`

That closeout must include:

- packet path and SHA;
- controlling evidence paths and SHAs;
- schema-first preflight result;
- exact tool registration;
- exact SQL and params;
- selected columns;
- row limit;
- receipt metadata;
- result disposition;
- blockers;
- exact next recommendation.

## Prohibited Under This Packet

No row query, tool invocation, missing-tool retry, view query, search, direct API, browser/app/QA run, Notion write, source/app/Apps Script/HTML edit, sync, deploy, beta, commit, push, cleanup, archive/delete, migration, or external action is authorized by this packet-preparation gate.

## Return Route

Return packet path/SHA, preparation closeout path/SHA, blockers, and exact future execution gate to Planning thread `019f5cb2-80b2-7081-8900-13900ba8e3c4`, then stop.
