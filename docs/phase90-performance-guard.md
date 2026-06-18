# Phase 90 Pass 1H: Performance Guard

Mission Active uses a bounded packet render.

The Active room should not call the full Account render path and should not rebuild Details, Steps, Resources, or Roadmap.

Inactive Mission rooms stay lazy-loaded behind their own tab selection.
