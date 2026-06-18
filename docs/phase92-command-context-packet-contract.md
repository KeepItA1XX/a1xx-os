# Phase 92 Pass 1C: Command Context Packet Contract

The Mission Command Context packet is `mission_command_context_summary`.

It can expose at most four player-facing rows:

- current move
- focus lane
- reward preview
- next road

The packet is read-only, local-only, and preview-safe.
