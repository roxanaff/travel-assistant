---
name: review-feature
description: Review one Travel Assistant feature chunk against its requirements and existing patterns, especially missed reuse or duplicate UI. Use as an independent reviewer before the user sees a chunk.
---

# Review a Travel Assistant feature chunk

Follow `AGENTS.md`. Read the agreed requirements, technical plan/decisions and the
complete chunk diff, including untracked files. Inspect affected consumers and
nearby existing implementations before judging reuse. Report findings; do not edit
files. Read-only is a behavioral boundary even without filesystem enforcement.

Prioritize checks that apply to the change:

1. Agreed behavior, important states, and edge cases.
2. Reuse of components, buttons, styles, forms, hooks, API helpers, and backend
   patterns; flag inconsistent duplicate implementations when an existing pattern
   fits the same behavior.
3. Correctness of data flow, persistence, error handling, and stale UI state.
4. Input validation, trip ownership, and access rules.
5. A few high-value tests for main behavior and important regressions, without
   demanding full coverage.
6. Scope, simplicity and maintainability: architectural ownership, justified plan
   deviations, unnecessary abstractions, duplicate active paths and whether replaced
   implementations were removed or have a clear compatibility/removal condition.

For behavior-preserving refactors, compare externally observable behavior before
and after, including refresh/error/Undo/navigation and timing where affected.
Product redesign disguised as cleanup is a finding, not an automatic improvement.

This is chunk review after implementation. Substantial technical plans get their
earlier read-only architecture review through `../plan-architecture/SKILL.md`.

For each finding, give severity, file and line, a concrete failure or inconsistency,
and a practical fix. Separate required fixes from optional suggestions. Avoid
speculative refactors or requests to reuse code whose behavior differs materially.
If nothing actionable remains, say so and mention any meaningful verification limit.
When a revised diff arrives, check both the fixes and the final chunk as a whole.
