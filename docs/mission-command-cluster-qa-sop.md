# Mission Command Cluster QA SOP + Test Matrix

Product: Money Mission OS
Primary file: `money-mission-tracker-v2_1.html`
Purpose: make Mission Command testing repeatable, faster, and safer as the chat brain is tightened across behavior clusters.

This is not a feature spec. This is the operating process for testing, diagnosing, fixing, and protecting Mission Command conversation behavior.

## Core Principle

Test prompts are pressure points. The goal is not to make one phrase pass. The goal is to find the shared layer underneath the failure and improve the whole behavior class.

Research-backed testing principle: exploratory testing finds the unknowns, regression testing preserves the fixes, and stateful conversational QA must test the actual sequence path, not only one prompt at a time.

Every cluster pass should answer:

- What did A1XX ask?
- What did Mission Command answer?
- Did the answer stay in the right lane?
- Did stale memory influence the turn?
- Did the visible bubble add noise, wrong buttons, or wrong data?
- Which system layer owns the failure?
- What regression prompt now protects it?

## Research Findings Applied To Mission Command

The current QA direction is right, but it needs to be treated like an operating loop instead of a pile of prompt checks.

Key findings:

- Exploratory testing should be timeboxed and charter-based. A test pass needs a target cluster, starting state, risk hypothesis, and notes on what changed during the session.
- Every high-value exploratory bug should become either a permanent regression, a watchlist item, or a documented non-bug. Do not leave it as chat memory.
- Conversational AI tests need multi-turn transcripts because a single answer can pass while state, memory, or follow-up behavior is broken.
- Stateful assistant QA needs separate checks for route, memory, data, output wording, action buttons, and save/restore behavior.
- Regression tests should assert behavior rules, not exact full paragraphs, unless the bug is specifically formatting or wording.
- Test harnesses need clean setup and teardown. Several recent failures were not product bugs; they were QA-state contamination between fixtures.
- Debug capture should be internal-only. The visible Mission Command chat should never expose source labels, truth ledgers, arbitration traces, or test names.

What this means for Mission Command:

- Run clusters as short QA sessions with a written charter.
- Convert repeated failures into shared-layer fixes, not one-prompt patches.
- Add permanent regressions for every fixed route, memory, context, bubble, or data-trust bug.
- Keep live transcript testing even when VM tests pass, because live render and storage paths can still differ.
- Keep a small watchlist for risky behavior that is not safe to patch yet.

## Cluster QA Session Charter

Before each cluster pass, write a short charter:

```text
Cluster:
Starting state:
Risk hypothesis:
Prompts:
Expected owner layer:
Must not happen:
Regression target if failure appears:
```

Example:

```text
Cluster: Correction
Starting state: fresh starter, DPC zero, no booked after starter
Risk hypothesis: correction prompts may reattach stale Production/System Hub context
Prompts: wrong read, nah not that, that sounds disconnected, answer like you know what I am doing
Expected owner layer: fresh starter DPC anchor + correction route guard
Must not happen: Production tracker, System Hub, booked-call prep, stale card bubble
Regression target if failure appears: fresh_chat_correction_anchor_<prompt>
```

## Standard Cluster QA Loop

1. Define the charter.
   Pick one cluster, one starting state, one risk hypothesis, and one expected owner layer.

2. Run one cluster transcript.
   Use 8 to 15 prompts in one behavior family.

3. Capture actual output.
   Save the exact visible answer, including secondary bubbles and action buttons.

4. Label each failure.
   Use the failure labels below instead of vague notes.

5. Locate the owning layer.
   Fix the shared route, memory, composition, bubble, or guard layer instead of only patching one string.

6. Decide patch, test, or watchlist.
   Use the decision rules below before editing.

7. Add regression coverage.
   Every fixed phrase or behavior needs a future test unless it is explicitly marked watchlist.

8. Run verification.
   Minimum checks:
   - syntax check
   - `git diff --check`
   - context arbitration regression
   - master intelligence QA
   - broad regression hardening
   - presence self-check

9. Live retest.
   Run the original chain plus 2 to 3 wording variations.

10. Promote the behavior standard.
   Write down the expected behavior so future installs do not overwrite it.

## Failure Labels

- `route_drift`: the answer moved into the wrong lane.
- `memory_leak`: old thread/result/pending action influenced the current turn.
- `fresh_boundary_fail`: a fresh starter did not reset or gate old context correctly.
- `result_context_fail`: booked/paid/done/no reply did not control the next follow-up.
- `data_trust_fail`: sync/data/current-source prompts did not answer with loaded/missing/current data.
- `bubble_leak`: first answer was correct but secondary bubble or action buttons were wrong.
- `card_owner_fail`: card/lane ownership answer picked the wrong surface.
- `voice_noise`: unnecessary opener, closer, hype, or robotic wrapper was added.
- `formatting_fail`: line breaks, punctuation, labels, or spacing made the response hard to read.
- `live_path_mismatch`: helper/VM tests passed but the visible live chat path failed.
- `qa_harness_fail`: the test fixture or setup was wrong, stale, or contaminated.
- `coverage_gap`: the bug class exists but no cluster currently protects it.
- `over_blocking`: a guard suppressed useful context.
- `under_blocking`: a guard allowed stale or irrelevant context.
- `regression_gap`: behavior was fixed but not added to a test harness.

## Failure Report Format

Use this format for every meaningful failure:

```text
Failure ID:
Cluster:
Prompt or chain:
Starting state:
Actual answer:
Expected answer:
Failure label:
Owner layer:
Root cause:
Patch decision:
Regression added:
Live retest:
Watchlist note:
```

Root cause must name the mechanism, not just the symptom.

Good:

```text
Root cause: fresh starter correction phrases were not included in the DPC anchor matcher, so the response fell through to current journey state.
```

Weak:

```text
Root cause: answer was wrong.
```

## Patch / Test / Watchlist Decision Rules

Patch code when:

- The route is wrong.
- Memory is stale or crossing chat boundaries.
- The answer contradicts loaded data.
- A secondary bubble or action button points at the wrong task.
- A repeated wording issue comes from one shared template.

Update tests when:

- The product behavior is correct but the harness setup is stale.
- A regression assertion expects old wording that is no longer the standard.
- The test passes in isolation but fails after another fixture mutates state.

Add to watchlist when:

- The behavior is annoying but not clearly wrong.
- Fixing it may weaken protected routes.
- The root cause is unclear after one pass.
- The issue depends on live data freshness that cannot be reproduced yet.

Permanent regression rule:

- If a bug affected route, memory, result, data trust, card ownership, or live render behavior, it becomes a permanent regression.
- If a bug was only phrasing, add it to regression when the phrase is high-frequency or part of a protected cluster.
- If a bug was only QA fixture contamination, update the harness and document the fixture rule.

## Owner Layer Map

- Route choice: `getMissionCommandResponse`, `runMissionTurn`, route priority, direct route override.
- Context boundary: `buildMissionContextArbitrationV11`, session scrub, fresh starter marker, result event ledger.
- Result loop: result signal detection, `buildMissionResultLoopPromptV1`, booked/paid/no-reply logic.
- Pending action: action accountability, current step, journey state, pending action validity.
- Card ownership: communication cohesion, card intelligence, cross-card alignment.
- Data trust: `getMissionDataConfidenceResponse`, sync health, loaded/missing/current reads.
- Visible answer: `finishMissionAnswer`, answer quality guards, prose guards, presence layer.
- Secondary bubbles: `buildMissionBubblePacket`, `getMissionDataBubble`, `getMissionActionButtons`.
- Live render: `renderMissionCommand`, final packet integrity check, bubble append path.
- QA harness: context arbitration regression, master intelligence sweep, focused transcript tests.

## Cluster Priority Matrix

Use this order unless A1XX points to a live failure:

| Priority | Cluster | Why it matters | Minimum regression surface |
| --- | --- | --- | --- |
| P0 | Context boundary / fresh starter | Prevents stale brain state from driving new chats | `runMissionLivePathContextArbitrationRegressionV11` |
| P0 | Sales / result | Protects booked, paid, follow-up, and money outcomes | result loop + booked count + log-target prompts |
| P0 | Data trust | Prevents wrong decisions from stale or partial data | loaded/missing/current/source prompts |
| P1 | Correction | Keeps A1XX in control when the read is wrong | fresh, booked, and explicit-lane correction prompts |
| P1 | Card ownership | Keeps actions attached to the right app surface | brief/outreach/content/production/manager card prompts |
| P1 | Money | Keeps money reads buyer-facing and truth-aware | today/weekly/action-to-money prompts |
| P2 | Starter / DPC anchor | Keeps the day from drifting into dashboards | good morning + what today + why + short window |
| P2 | Wrap / review | Keeps closeout honest about what moved | what changed/tomorrow/wrap prompts |
| P3 | Voice / naturalness | Improves feel after logic is stable | high-frequency first-bubble wording |

## Live Transcript Capture Format

When A1XX sends live test output, convert it into this structure before patching:

```text
Cluster:
Chat state:
Prompt:
Visible first bubble:
Secondary bubble/action:
Expected:
Failure label:
Likely owner:
Regression name:
```

If the transcript includes multiple prompts, mark the first prompt where the behavior turned wrong. Do not patch the last visible symptom until the earlier state transition is understood.

## Regression Naming Standard

Use stable names that identify the boundary and behavior:

```text
<state>_<cluster>_<behavior>_<risk>
```

Examples:

- `fresh_chat_correction_anchor_wrong_read`
- `active_booked_event_log_target`
- `fresh_chat_stale_event_ledger_next_leak`
- `data_trust_current_spacing`
- `card_outreach_handoff_missing`
- `qa_fixture_truth_ledger_active_chat`

Name the regression after the failure mode, not the implementation detail.

## Cluster Test Matrix

### 1. Starter / DPC Anchor Cluster

Purpose: make day-start prompts anchor to DPC when the day is invisible, even if the day bar is Beat Day or another mode.

Test chain:

```text
good morning
what should i do today
why
make it make sense
where we at
i got 20 minutes
lock in
```

Expected behavior:

- `good morning` can give a light mode read.
- `what should i do today` should say DPC is empty and recommend one outreach or sales action.
- `why` should explain that today is invisible because DPC is zero.
- Beat Day, Content Day, or current journey step must not hijack the fresh starter unless A1XX explicitly asks for that lane.

Common failures:

- `fresh_boundary_fail`
- `route_drift`
- `voice_noise`
- `bubble_leak`

Regression requirements:

- Fresh starter plus stale booked memory must not produce booked prep.
- Fresh starter plus Beat Day must not produce Production tracker as the first move when DPC is zero.

### 2. Sales / Result Cluster

Purpose: protect live sales and result handling from generic dashboard routing.

Test chain:

```text
/pipeline
i meant sales not pipeline
what should i say
call is done
booked
what next
why
what should i log
what should i come back with
how many booked calls do i have
```

Expected behavior:

- Sales correction should switch from pipeline to sales.
- `what should i say` should return a clean sales line, not dashboard advice.
- `booked` should create chat-only booked context.
- Follow-ups after booked should stay on Sales + Manager.
- Log-target prompts should answer DPC booked call, lead status, and calendar detail.
- Booked count must separate dashboard-confirmed from chat-only.

Common failures:

- `result_context_fail`
- `memory_leak`
- `bubble_leak`
- `card_owner_fail`

Regression requirements:

- `what do i log after this`, `what should i log`, `what should i come back with`, `what counts as done`, and `what result are we looking for` must all stay attached to fresh booked context.
- No Production tracker, Content tracker, Mark Step Done, or Save Note bubble after booked log-target prompts.

### 3. Data Trust Cluster

Purpose: answer data/source/current/missing questions directly and cleanly.

Test chain:

```text
what data are you using
what do you see
what data is missing
is this data current
what should i trust from this
where is that coming from
show me the data then tell me the move
```

Expected behavior:

- Answer with loaded sources, missing sources, and trust level.
- Use readable line breaks.
- Do not add generic sync motivation unless sync is needed.
- Do not append unrelated closers like "Need a quick trust check" after already answering the trust check.

Common failures:

- `data_trust_fail`
- `formatting_fail`
- `voice_noise`
- `bubble_leak`

Regression requirements:

- Data lines must stay separated.
- Missing data answer must not claim exact final truth.
- Current data answer must distinguish safe next move from locked final numbers.

### 4. Correction Cluster

Purpose: reroute clearly when A1XX says the read is wrong or names a different lane.

Test chain:

```text
wrong read
nah not that
that sounds disconnected
make it make sense
answer like you know what I’m doing
i meant sales not pipeline
i meant content not sales
give me the clean version
```

Expected behavior:

- Explicit correction beats memory.
- If A1XX names a lane, answer in that lane.
- If no lane is named, explain the current read without grabbing stale context.
- Keep the tone natural and short.

Common failures:

- `route_drift`
- `memory_leak`
- `voice_noise`
- `card_owner_fail`

Regression requirements:

- Correction phrases after booked must stay booked.
- Correction phrases after fresh starter must stay DPC.
- Correction phrases after explicit content/sales/pipeline prompt must honor the explicit lane.

### 5. Card Ownership Cluster

Purpose: make card prompts answer the surface that owns the next visible app change.

Test chain:

```text
what card owns this
what do i log after this
where do i go from here
read the brief card
what should i do on the outreach card
what should i do on the content card
what should i do on the beat card
what should i check on the manager card
```

Expected behavior:

- Card prompts stay card-specific.
- Brief, Outreach, Content, Production, and Manager should use their own intelligence.
- Cross-card answers should be explicit when a move is split, such as Sales owns call prep and Manager owns calendar detail.

Common failures:

- `card_owner_fail`
- `bubble_leak`
- `route_drift`
- `voice_noise`

Regression requirements:

- Booked card ownership must return Sales + Manager.
- Content prompts must not return Sales scripts.
- Production prompts must not own outreach or DPC logs.

### 6. Money Cluster

Purpose: keep money prompts specific, action-first, and connected to the actual money read.

Test chain:

```text
how much money are we making
how much did i make today
what can i do to make money today
what's keeping me broke
how does this connect to money
turn that into the move
```

Expected behavior:

- Money prompts stay money-specific.
- Today vs weekly money should be clear.
- If weekly pressure is covered, the answer should still give one buyer-facing action.
- Do not turn money prompts into generic production/content steps.

Common failures:

- `route_drift`
- `data_trust_fail`
- `voice_noise`

Regression requirements:

- Money answers should not invent paid results.
- Money answers should not hide whether numbers are dashboard-confirmed or chat-only.

### 7. Wrap / Review Cluster

Purpose: end-of-day and review prompts should summarize what actually moved.

Test chain:

```text
wrap it
what moved today
what changed today
what did i log today
what should tomorrow start with
what is the one thing I should do next
```

Expected behavior:

- Review prompts should separate logged facts from chat-only events.
- If nothing is logged, say so.
- If a booked/paid/reply result happened in chat, identify it as chat-only unless confirmed.
- Tomorrow's first move should be based on the last confirmed or highest-priority open loop.

Common failures:

- `memory_leak`
- `result_context_fail`
- `data_trust_fail`
- `voice_noise`

Regression requirements:

- Wrap should not report unconfirmed dashboard facts.
- Tomorrow start should not carry stale pending action from an older fresh starter.

## Fix Rules

- Fix the layer, not just the output phrase.
- Keep edits small and reversible.
- Do not install a new intelligence layer unless the existing layer cannot safely own the behavior.
- Do not let new skill packs override protected routes.
- Do not expose debug/source/trace text in visible chat.
- Do not let first bubble carry unnecessary report labels or robotic wrappers.
- Do not allow secondary bubbles to contradict the first bubble.
- After each fix, add the exact failed phrase and at least one variation to regression.

## Minimum Verification Commands

Run these after each code fix:

```bash
node - <<'NODE'
const fs=require('fs');
const html=fs.readFileSync('money-mission-tracker-v2_1.html','utf8');
const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).join('\n');
try{ new Function(scripts); console.log('syntax ok'); }
catch(e){ console.error(e.stack||e.message); process.exit(1); }
NODE

git diff --check -- money-mission-tracker-v2_1.html
```

Then run the internal VM QA bundle:

```bash
runMissionLivePathContextArbitrationRegressionV11()
runMissionMasterIntelligenceQASweepV1()
runMissionBroadRegressionHardeningV1()
runMissionPresenceSelfCheck()
```

Optional QA metadata check:

```bash
runMissionClusterQASystemSelfCheckV1()
```

## Required Verification Summary

After every cluster fix, report:

```text
Cluster:
Failure found:
Shared layer patched:
Regression added:
Syntax:
Diff check:
Context arbitration:
Master QA:
Broad regression:
Presence:
Live prompts to test next:
Watchlist:
```

## Team Chat / Intelligence HQ Update Template

Use this update shape:

```text
UPDATE - Mission Command QA cluster pass

What changed:
-

Why it matters:
-

Tests passed:
- syntax extraction
- git diff check
- context arbitration
- master QA
- broad regression
- presence

Next cluster:
-

Watchlist:
-
```

## Commit Standard

Commit only the intended files. For Mission Command chat fixes, normally stage:

```bash
git add money-mission-tracker-v2_1.html docs/mission-command-cluster-qa-sop.md
```

Use specific commit names:

```text
Add Mission Command cluster QA SOP
Guard booked log prompt across live render path
Quiet presence layer for protected mission reads
Keep fresh starter read above beat day step
```

## Current Watchlist

- Presence layer can still add too much "personality garnish" to protected reads.
- Day type/journey step can still compete with DPC starter if priority weakens.
- Secondary bubbles and action buttons can leak stale current-step context after the first answer is corrected.
- Session result memory and dashboard-confirmed data must stay separated.
- Data trust formatting should stay line-based and readable.
- Correction phrases need lane-aware context, not generic clean-read templates.
