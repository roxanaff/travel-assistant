---
name: implement-feature
description: Implement an approved Travel Assistant feature in reviewable commit-sized chunks with focused tests and reviewer feedback. Use after the user approves implementation.
---

# Implement a Travel Assistant feature

Read `AGENTS.md`, the agreed feature requirements, and
`documentation/development-guide.md`. Check branch and working tree before changes.
Follow the repository's branch and manual-commit rules.

Before coding, locate comparable UI, styles, hooks, API calls, backend endpoints,
and tests. Reuse suitable code and design patterns. Identify a coherent chunk that
can be tested and committed on its own.

Implement the chunk with a few high-value tests for its main behavior and important
edge cases. Run affected checks. Give a separate reviewer subagent the requirements,
entire uncommitted chunk diff, and relevant existing code. Have it follow the
`review-feature` procedure without editing files. Evaluate its findings, fix valid
issues, rerun affected checks, and return the revised diff for another review.
Continue until the reviewer reports no actionable findings or an unresolved issue
needs to be disclosed.

Then give the user the chunk's behavior, files, checks, review outcome, any remaining
concerns, and a suggested commit message. Pause for the user to commit before the
next chunk. Do not claim independent review if a separate reviewer was unavailable.
