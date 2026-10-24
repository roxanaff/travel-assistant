---
name: refactor-code
description: Plan or carry out scoped behavior-preserving cleanup in Travel Assistant. Use for approved simplification, deduplication or structural changes, not product redesign.
---

# Refactor a bounded path

Follow `AGENTS.md` and the development guide. A request to assess or plan cleanup
ends with findings/proposal; carry out changes only when the user has authorized
implementation in that scope. Do not treat a neighboring feature task as permission
for a broad cleanup.

## Establish the boundary

Identify the concrete problem and source evidence: duplicated rules, tangled
responsibilities, accumulated compatibility patches, unnecessary states/branches
or unused code. State the intended simplification and affected consumers. A large
file or fewer lines alone is not a sufficient reason to introduce abstractions.

Record behavior to preserve and non-goals in the existing requirements/audit. Inspect
callers, styles, contracts and tests on both sides of any changed boundary. Use
`../plan-architecture/SKILL.md` when choosing new boundaries or shared ownership;
its lightweight check is enough for straightforward local cleanup.

## Preserve behavior while simplifying

Establish relevant baseline checks and add characterization/regression coverage
only where meaningful behavior lacks protection. Distinguish current behavior from
obsolete requirements or suspected bugs; discuss differences instead of silently
fixing them in the refactor.

Prefer focused extraction, consolidation or removal over a universal engine. Check
that apparently similar paths really share semantics before combining them. Keep
validation, ownership, money/date rules, errors, Undo, focus, navigation and async
ordering intact where affected. Do not discard defensive checks, migration history,
public contracts or compatibility paths based only on a text search for callers.

Remove replaced local paths within the approved scope; if compatibility requires
retaining one, record its owner and removal condition. No duplicate active path
should be introduced without a justified transition. Separate behavior changes
into explicitly approved work when practical.

## Verify and hand off

Use the chunk execution, verification, independent review and handoff procedure in
`../implement-feature/SKILL.md`; it need not repeat this planning phase when the
boundary is already settled. Give the reviewer the preserved-behavior baseline and
structural intent as well as the diff. Verify affected consumers, not just the new
helper in isolation. Report the simplification achieved and any retained complexity
or coverage limits; do not claim performance improvements without measurement.
