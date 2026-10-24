---
name: plan-feature
description: Discuss a Travel Assistant feature with the user and record agreed requirements before implementation. Use for feature discovery or unresolved product decisions.
---

# Plan a Travel Assistant feature

Follow `AGENTS.md`; consult the existing requirements, roadmap and related user
flows. Resume settled decisions instead of reopening discovery on every extension.

Explore behavior, scope, interaction design and meaningful tradeoffs in terms of
their effect on the traveller. Ask focused questions, allow multiple discussion
rounds and use concrete examples/mockups when helpful. Include important failure,
empty-state and linked-record cases rather than only the happy path.

Record the agreed outcome/non-goals and observable acceptance criteria in the
feature requirements. Summarize remaining product decisions separately. Hand the
settled behavior to `../plan-architecture/SKILL.md` for technical planning before
coding; a short local change needs only its lightweight mode. Technical planning
may proceed during discussion where it helps answer a question, but it must not
silently decide unresolved product behavior.

End planning with a concise agreement/next-step summary. Apply the authorization
boundary in `AGENTS.md` before moving into implementation.
