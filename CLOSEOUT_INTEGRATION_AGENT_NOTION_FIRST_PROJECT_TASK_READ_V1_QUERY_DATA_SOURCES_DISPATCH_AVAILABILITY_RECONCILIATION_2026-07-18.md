# Integration Agent Notion-First Project-Task Read V1 Query-Data-Sources Dispatch Availability Reconciliation Closeout

Date: 2026-07-18
Gate: `APPROVE INTEGRATION AGENT NOTION-FIRST PROJECT-TASK READ-V1 QUERY-DATA-SOURCES DISPATCH AVAILABILITY RECONCILIATION ONLY`
Disposition: `completed_docs_read_only_dispatch_registration_mismatch`
Planning thread: `019f5cb2-80b2-7081-8900-13900ba8e3c4`

## Scope

Conducted a narrow docs/read-only reconciliation of why the Notion SQL row-query surface is discoverable in the Integration tool inventory and schema preflight works, but the one authorized SQL dispatch failed with `Tool notion-query-data-sources not found`.

No row query, alternate Notion path, retry, connector/source/app modification, Notion write, browser/QA, sync/deploy, beta, commit/push, or external action occurred in this reconciliation.

## Verified Input

- Completion-excluded row-read proof closeout: `/Users/a1xxoffice/Documents/Codex/2026-05-06/i-have-a-html-for-an/CLOSEOUT_INTEGRATION_AGENT_NOTION_FIRST_PROJECT_TASK_READ_V1_PROJECTS_ONLY_COMPLETION_EXCLUDED_ROW_READ_PROOF_2026-07-18.md`
- Expected and verified SHA-256: `c2ccd1e3813efb8b8e9b4fbeec58ea37ef0e0234721cac73c2f164797041b2d9`

## Evidence Reviewed

1. The blocked proof closeout records that:
   - schema preflight used `mcp__codex_apps__notion._fetch` successfully;
   - Projects data source and SQLite table were returned;
   - the eight selected SQL columns were confirmed;
   - exactly one SQL row-query attempt was made;
   - dispatch failed with `MCP error -32602: Tool notion-query-data-sources not found`;
   - rows returned `0`, retries `0`, alternate paths `0`.

2. Connector inventory/tool schema discovery exposes:
   - namespace: `mcp__codex_apps__notion`;
   - model-visible function: `_notion_query_data_sources`;
   - documented user-facing capability: query Notion databases using SQL or view mode;
   - documented prerequisite: use `fetch` first to get schema and data source URLs;
   - supported SQL payload fields: `data.mode`, `data.data_source_urls`, `data.query`, `data.params`.

3. The same inventory also exposes `_fetch`, which is consistent with the successful schema preflight.

## Reconciliation Finding

This is a connector dispatch-registration mismatch, not a Projects schema mismatch and not a packet SQL mismatch.

The Integration runtime exposes a model-visible MCP tool schema named:

`mcp__codex_apps__notion._notion_query_data_sources`

However, when invoked, the connector execution path attempted to dispatch to a backend tool slug reported in the error as:

`notion-query-data-sources`

The backend returned:

`MCP error -32602: Tool notion-query-data-sources not found`

That means the capability is advertised to the model/runtime inventory, but the execution backend currently lacks, renames, or fails to bind the corresponding dispatch target. Schema fetch works because `_fetch` maps to an available backend path; row-query fails because `_notion_query_data_sources` maps to a missing backend path. The evidence does not support retrying the same query, changing SQL, using view/search/fetch as a row fallback, or modifying Notion/app state.

## Availability Classification

- Connector namespace visible: `yes`
- Query data sources schema visible: `yes`
- Fetch/schema preflight callable: `yes`
- Projects schema accessible: `yes`
- SQL row-query dispatch callable end-to-end: `no`
- Failure phase: `backend_dispatch_registration`
- Failure class: `advertised_schema_without_executable_backend_binding`
- Data/source validity conclusion: `not_reached`
- Row nullability/pagination/freshness conclusion: `not_reached`

## Safe Remedy / Handoff

Smallest safe remedy is an integration-surface handoff to the Notion connector/runtime owner, routed through Planning, asking for registration proof only.

The handoff should ask the owner to do one of the following without querying rows:

1. bind the advertised `mcp__codex_apps__notion._notion_query_data_sources` tool to an executable backend dispatch target;
2. document the correct executable replacement tool name if the advertised name is stale;
3. return explicit evidence that SQL data-source querying is unavailable in this runtime despite the schema advertisement.

Required proof from the owner:

- model-visible tool name;
- backend dispatch slug;
- runtime/plugin version or connector registration identifier if available;
- dry registration check or non-row capability health check;
- statement whether SQL mode is supported in this workspace/runtime;
- statement whether Business/Notion AI plan gating would be surfaced before or after backend dispatch;
- no row query, no view/search fallback, no direct API, no Notion write, no connector reconfiguration unless separately approved.

## Smallest Next Bounded Gate

`APPROVE INTEGRATION AGENT NOTION-FIRST PROJECT-TASK READ-V1 QUERY-DATA-SOURCES CONNECTOR REGISTRATION PROOF HANDOFF ONLY`

This should be a docs/handoff gate only. It should not issue another SQL row query or use alternate Notion paths. If a connector owner later returns registration proof, a new execution packet should be prepared before any row-read retry.

## Blockers

1. SQL row-query cannot proceed because backend dispatch target `notion-query-data-sources` is not registered.
2. Row-level count, nullability, pagination, freshness, and safe data-contract proof remain unavailable.
3. Repeating the same SQL query would be a retry against the same dispatch blocker and is not safe under current gates.

## Boundary Verification

- Row queries issued in this reconciliation: `0`.
- Alternate Notion paths invoked: `0`.
- Retries issued: `0`.
- Notion writes: `0`.
- Connector/source/app modifications: `0`.
- Browser/QA/sync/deploy/beta/commit/push/external actions: `0`.

## Return

Return this closeout path/SHA, finding, blockers, and smallest safe remedy/handoff to Planning thread `019f5cb2-80b2-7081-8900-13900ba8e3c4`, then stop.
