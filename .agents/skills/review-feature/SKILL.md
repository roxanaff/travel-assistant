---
name: review-feature
description: Review one Travel Assistant feature chunk against its requirements and existing patterns, especially missed reuse or duplicate UI. Use as an independent reviewer before the user sees a chunk.
---

# Review a Travel Assistant feature chunk

Read `AGENTS.md`, the agreed feature requirements, and the complete diff for the
chunk. Inspect nearby existing components and styles before judging reuse. Report
findings; do not edit files. A request to remain read-only is a behavioral boundary
unless the reviewer environment enforces it with permissions.

Prioritize checks that apply to the change:

1. Agreed behavior, important states, and edge cases.
2. Reuse of components, buttons, styles, forms, hooks, API helpers, and backend
   patterns; flag inconsistent duplicate implementations when an existing pattern
   fits the same behavior.
3. Correctness of data flow, persistence, error handling, and stale UI state.
4. Input validation, trip ownership, and access rules.
5. A few high-value tests for main behavior and important regressions, without
   demanding full coverage.
6. Scope and maintainability, including unnecessary abstractions.

For each finding, give severity, file and line, a concrete failure or inconsistency,
and a practical fix. Separate required fixes from optional suggestions. Avoid
speculative refactors or requests to reuse code whose behavior differs materially.
If nothing actionable remains, say so and mention any meaningful verification limit.
When a revised diff arrives, check both the fixes and the final chunk as a whole.
