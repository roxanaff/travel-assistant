---
name: plan-architecture
description: Plan or independently review the technical design of a Travel Assistant feature or extension before coding. Use a lightweight impact check for local changes.
---

# Plan the technical approach

Follow `AGENTS.md`. Read settled product requirements, relevant development-guide
sections and the actual affected frontend/backend code and tests. Work read-only
on application code; record the plan in the existing feature requirements or
maintenance audit. Planning is not permission to implement.

## Match the depth to the change

For a local label/style fix or a narrow change following an established pattern,
identify the existing owner/reusable implementation, affected consumers and checks.
A short note or handoff is enough; do not require a new document or separate agent.

For substantial changes involving shared state, cross-record rules, API/schema
contracts, migrations or a new abstraction, write a technical-plan section before
coding. Cover what is relevant, not a compulsory template for every change:

- Current responsibilities and source evidence; affected callers/consumers.
- Ownership of values and rules, boundaries and data flow across frontend/backend.
- What to reuse/extend; why an existing path is insufficient if introducing another.
- A concrete approach, meaningful alternatives and reasons for choosing it. Prefer
  the simplest design that meets current requirements, not hypothetical features.
- Invariants and failure cases: validation, ownership, money/date meaning,
  async/stale state, retries, errors and recovery where affected.
- Compatibility and migration/removal plan for old code/data; preserve intentional
  differences and safeguards rather than treating them as accidental duplication.
- Reviewable implementation slices, regression checks and manual acceptance checks.

Separate unresolved product decisions from technical choices. Bring the former
back to the user; do not invent automatic syncing, new payment meaning or changed
interaction behavior to simplify the design. Routine technical decisions within
approved scope do not need another implementation-approval round.

## Independent architecture review

For a substantial plan, give a separate read-only subagent the requirements,
proposed plan, relevant source and alternatives. Ask it to use this skill's review
mode before implementation. It should challenge the design, not merely repeat it.
Assess findings, revise valid issues and return the revised plan for review until
no actionable findings remain or an unresolved issue must be disclosed. Follow
`AGENTS.md` if independent review is unavailable.

### Review mode

Do not edit files or implement the proposal. Check the plan against the actual code
and requirements: ownership, reuse, unnecessary coupling/complexity, migration and
failure risks, testability and chunk boundaries. Give concrete findings with source
evidence and practical alternatives, distinguishing required fixes from optional
suggestions. Say when no actionable findings remain and identify review limits.

## Handoff and revision

Summarize the chosen approach, boundaries and unresolved issues. An approved
implementation request can proceed through `../implement-feature/SKILL.md` once
the design is ready; a planning-only request ends with the plan. Each chunk checks
that the plan still fits. Reopen the substantial design only when new coupling,
requirements or risk warrants it, and keep lasting decisions/reasons in the same
technical-plan section instead of creating a parallel activity log.
