---
name: implement-feature
description: Implement an approved Travel Assistant feature in reviewable commit-sized chunks with focused tests and reviewer feedback. Use after the user approves implementation.
---

# Implement a Travel Assistant feature

Follow `AGENTS.md` for authorization, Git and checkpoint rules. Read the agreed
requirements/technical plan and the development guide for architecture and checks.

## Before each chunk

Confirm which acceptance criteria the chunk delivers and the affected consumers.
Check the technical plan against the live code and existing reusable patterns. If
there is no appropriate plan/check yet, use `../plan-architecture/SKILL.md` before
coding. Revisit design only when new evidence changes boundaries, ownership or risk;
resolve substantial plan findings before implementation. Do not restart product
planning for routine technical choices.

If the affected path needs structural cleanup, use `../refactor-code/SKILL.md` to
bound it. Keep behavior-preserving work separate from behavior changes when
practical; do not turn a feature extension into unrelated cleanup.

## Implement and verify

Deliver a complete, reviewable slice rather than speculative scaffolding. Remove
superseded paths within scope, or record the compatibility reason and removal
condition. Keep relevant documentation consistent with the resulting behavior.

Add a small number of high-value tests for main functionality and important edge
cases/regressions, preferring existing coverage where it already fits. Avoid tests
for trivial variations or implementation details. Run the affected checks from the
development guide; repeat/broaden passing checks only when new edits or evidence
justify it. Distinguish pre-existing failures and untested paths from verified work.

## Review and handoff

Give an independent reviewer `../review-feature/SKILL.md`, agreed requirements and
technical decisions, the complete chunk diff (including untracked files), relevant
existing code and verification results. Assess findings, fix valid issues and rerun
affected checks. Return the revised complete chunk for review until no actionable
findings remain, or explain why review cannot converge.

At the `AGENTS.md` commit checkpoint, summarize files, implemented behavior, checks,
review outcome and limits. Provide a short manual walkthrough and local access
location, plus a commit message covering the full working diff. Keep requirements
status concise. User feedback repeats the affected implementation/verification
steps; scope changes return to product planning.
