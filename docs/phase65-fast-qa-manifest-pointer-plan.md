# Phase 65 Fast QA Manifest Pointer Plan

## Purpose

This pass plans how Fast QA can stay compact by reading manifest and archive pointers instead of recursively executing the full historical receipt chain.

This pass does not change Fast QA runtime behavior, activate a manifest reader, execute archive pointers, change player UI, delete files, or enable protected execution.

## Current Phase

- Phase: 65
- Pass: 1H
- Type: Fast QA manifest pointer plan / planning only
- Build stamp: `OS v2_5 Phase 65 Weight Control Follow-Through · Pass 1H Fast QA Manifest Pointer Plan`
- Live app: `money-mission-tracker-v2_5.html`
- Developer receipt archive pointer plan: `docs/phase65-developer-receipt-archive-pointer-plan.md`
- App weight plan: `docs/app-weight-control-system-v1.md`

## Fast QA Pointer Rows

| Pointer row | Reads from | Replaces | Load mode |
| --- | --- | --- | --- |
| Current build identity pointer | `manifest.currentPhase`, `manifest.currentPass`, `manifest.buildStamp` | Long stamp-regex history for daily build identity | Fast summary |
| Protected boundary pointer | `manifest.protectedBoundaryStatus` | Full historical protected receipt chain in Fast QA | Fast summary |
| Developer archive pointer | `manifest.developerArchivePointer` | Developer receipt detail chains in daily QA | Fast summary with manual detail |
| Deep QA pointer | Archive manifest and Deep QA pointer row | Daily deep historical QA execution | Manual only |
| Phase chain pointer | Latest phase/pass closeout receipt | Recursive previous-pass execution in Fast QA | Fast summary |

## Fast QA Rules

- Fast QA should not recursively execute the whole historical chain.
- Fast QA should check the latest receipt plus compact pointers.
- Deep QA remains available by manual action only.
- If a pointer is missing, fall back to source proof instead of freezing.
- Developer receipt details stay manual and out of player UI.

## Boundaries

- No Fast QA runtime behavior changes in this pass.
- No manifest reader activation in this pass.
- No archive pointer execution in this pass.
- No player-facing UI change in this pass.
- Protected actions stay blocked.

## Next Allowed Step

`phase65_pass1i_phase_closeout_qa`

The next pass should close out Phase 65 with source proof and compact QA evidence, without re-running the full historical chain.
