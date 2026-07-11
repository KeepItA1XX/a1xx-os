# MC_EXEC_01 implementation package

This is the finished, code-native Mission Command Executive Chip for the top-right corner of the terminal view.

## Visual lock

- 32×32 integer-pixel master
- Flat single-color mark
- Green token: `#72F59A`
- Wide command-chip/key silhouette with top processor notch
- `>` eye and `_` cursor expression
- Side contacts and two bottom landing contacts
- No gradients, shadow, antenna, human limbs, or decorative detail

## Install

1. Copy this folder to `assets/mission-command/mc-exec-01/`.
2. Load `mc-exec-01.css` once.
3. Add the contents of `mc-exec-01-inline.html` inside the terminal root.
4. Ensure the terminal root has class `mc-terminal`.
5. Change `data-state` on `.mc-exec` to drive behavior.

Supported states: `idle`, `listening`, `thinking`, `typing`, `dispatching`, `success`, `alert`, `error`, `offline`, `disabled`.

Suggested mapping:

- terminal ready → `idle`
- microphone/listening → `listening`
- waiting for model → `thinking`
- streaming response → `typing`
- starting a tool/agent → `dispatching`
- completed → `success`, then return to `idle`
- attention needed → `alert`
- failed command → `error`

The seat is decorative and pointer-transparent. Keep existing status text for accessibility. Motion stops automatically when the user requests reduced motion.

## Placement

- Desktop: 32 px, 12 px from top, 14 px from right
- Narrow screens: 24 px, 10 px from top/right
- Fixed layout box prevents terminal content shift
- If terminal controls already occupy the top-right, move the seat left while preserving at least 10 px clearance; do not move it into the scrollable transcript

## Build boundary

Integrate into `money-mission-tracker-v2_5.html` only after backing up that file. Do not redesign the terminal or change model/tool behavior. A1XX visual approval remains required before merge/deploy.
