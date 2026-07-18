# Integration Agent Notion-First Project-Task Read V1 Query-Data-Sources Connector Registration Proof Handoff Packet

Date: 2026-07-18
Gate: `APPROVE INTEGRATION AGENT NOTION-FIRST PROJECT-TASK READ-V1 QUERY-DATA-SOURCES CONNECTOR REGISTRATION PROOF HANDOFF ONLY`
Packet status: `prepared_docs_only_handoff`
Disposition: `owner_availability_blocked_route_through_planning`
Planning thread: `019f5cb2-80b2-7081-8900-13900ba8e3c4`

## Controlling Evidence

- Dispatch reconciliation closeout: `/Users/a1xxoffice/Documents/Codex/2026-05-06/i-have-a-html-for-an/CLOSEOUT_INTEGRATION_AGENT_NOTION_FIRST_PROJECT_TASK_READ_V1_QUERY_DATA_SOURCES_DISPATCH_AVAILABILITY_RECONCILIATION_2026-07-18.md`
- Dispatch reconciliation SHA-256: `94a7060c0c36179270311753743e4d651555cc5d2b332a63bec58b5c633854ed`

## Purpose

Route a docs-only connector-owner registration-proof request for the Notion query-data-sources surface. The goal is to resolve why the model-visible Notion MCP schema exposes `_notion_query_data_sources` while the backend dispatch path returns:

`MCP error -32602: Tool notion-query-data-sources not found`

This packet does not authorize another SQL row query, alternate Notion path, retry, connector reconfiguration, source/app edit, Notion write, browser/QA, sync/deploy, beta, commit/push, or external action.

## Owner / Supported Escalation Surface

Direct connector-owner tooling is not exposed in the current Integration runtime. The only supported safe escalation surface available under this gate is Planning routing to the Notion connector/runtime owner or platform/plugin owner.

Unsupported surfaces under this gate:

- invoking `mcp__codex_apps__notion._notion_query_data_sources` again;
- using Notion view/search/fetch as a row fallback;
- using Plugin Management uninstall/install/connect actions;
- changing connector configuration;
- writing Notion, source, app, Apps Script, HTML, or deployment state.

## Registration-Proof Request

Planning should route this packet to the Notion connector/runtime owner and request only the following non-row evidence:

1. Model-visible tool name:
   - expected observed name: `mcp__codex_apps__notion._notion_query_data_sources`
2. Backend dispatch slug:
   - failing observed slug: `notion-query-data-sources`
3. Connector/plugin/runtime version or registration identifier:
   - include Notion connector version, MCP server/runtime build, or equivalent registration ID if available.
4. Non-row registration health proof:
   - a dry registration check, tool registry introspection, or non-row capability health result proving whether the backend dispatch target exists.
5. SQL-mode support statement:
   - confirm whether SQL-mode data-source querying is supported for this workspace/runtime.
6. Plan-gating phase statement:
   - state whether Business/Notion AI plan gating would be surfaced before backend dispatch, after backend dispatch, or only after query execution.

## Required Owner Return Shape

```text
{
  packet: "notion_first_project_task_read_v1_query_data_sources_connector_registration_proof",
  status: "registered | unavailable | renamed | plan_gated | blocked",
  modelVisibleToolName: string,
  backendDispatchSlug: string | null,
  connectorRuntimeVersion: string | null,
  registrationId: string | null,
  nonRowHealthProof: string,
  sqlModeSupported: boolean | null,
  planGatePhase: "before_dispatch | after_dispatch | after_query_execution | unknown",
  rowQueryExecuted: false,
  alternatePathUsed: false,
  writesPerformed: false,
  recommendedNextGate: string
}
```

## Stop Conditions

Stop and return blocked if the owner or routed surface requires:

- row query execution;
- view/search/direct API fallback;
- retry of `notion-query-data-sources`;
- Notion write;
- connector install/uninstall/reconfiguration;
- source/app/Apps Script/HTML edit;
- browser/QA;
- sync/deploy/beta/commit/push;
- external action beyond owner routing.

## Smallest Next Action

Route this handoff through Planning to the Notion connector/runtime owner for registration proof only.

Exact next action:

`ROUTE NOTION QUERY-DATA-SOURCES CONNECTOR REGISTRATION PROOF REQUEST TO CONNECTOR OWNER`

## Return Route

The connector-owner result should return to Planning thread `019f5cb2-80b2-7081-8900-13900ba8e3c4`. If owner access is unavailable, Planning should record the owner availability blocker and hold row-read work.
