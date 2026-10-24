# Travel Assistant working agreements

This file owns the repository-wide rules. Task procedures live in `.agents/skills/`;
architecture facts, conventions and verification commands live in
`documentation/development-guide.md`. Keep each instruction in one authoritative
place; reference it elsewhere instead of copying it.

## Git workflow

- Before making any repository changes, check the current branch and working tree.
  Never change files on `main`. If `main` is checked out, tell the user and wait for
  them to switch to `dev` or explicitly direct a branch switch before making changes.
  This also applies to requirements, documentation, and instruction-file edits.
- Implement features on `feature/<feature-name>` branches created from `dev`, using
  a descriptive lowercase kebab-case name. Once implementation is authorized, create
  the feature branch from `dev` or resume the matching existing feature branch.
  Do not branch from `main`, overwrite an existing branch, or move unrelated changes
  between branches. If the base or working tree makes switching ambiguous, ask first.
- The user stages and commits changes. Do not stage, commit, amend, merge, push, or
  deploy unless the user explicitly changes that agreement.
- Suggested commit messages must cover all current uncommitted changes, not only
  the latest edit. Inspect the full working diff before suggesting one.
  Focus on functionality changes; omit accompanying documentation updates unless
  documentation is the main change.
- Split implementation into coherent, reviewable commit-sized chunks, including
  relevant tests. At each completed chunk, report its files, behavior, verification,
  and a suggested commit message. Pause so the user can commit before the next chunk;
  continue when they say to proceed. Avoid mixing unrelated changes in a chunk.
  Inspect the working tree when resuming; do not assume a commit happened.
- The user merges `feature/<feature-name>` into `dev`, then `dev` into `main`.

## Establish context

- Read the relevant feature requirements and `documentation/development-guide.md`.
  Consult the roadmap and existing implementation as needed.
- Determine the current phase from the user's request and conversation. Resume from
  existing decisions and authorization rather than restarting the discussion.
- Preserve unrelated working changes. This workflow does not authorize starting
  other tasks or expanding the requested scope.

## Authorization and scope

- Agree new behavior with the user before implementation. Written requirements,
  planning approval and silence do not themselves authorize application changes.
  Honor implementation approval already given; do not ask again for routine design,
  test or review steps within that scope.
- Bring unresolved product decisions or meaningful scope/behavior changes back to
  the user. Resolve routine technical choices within the agreed architecture.
- Record unrelated improvements in `documentation/maintenance-backlog.md`; do not
  expand the task to implement them.

## Workflow

- Use the relevant procedure: `plan-feature` for behavior and requirements,
  `plan-architecture` for technical design, `implement-feature` for approved changes,
  `refactor-code` for scoped behavior-preserving cleanup, and `review-feature` for
  independent chunk review. Skills support these rules, not replace them.
- Every feature/extension gets an architecture check before coding. Use a brief
  reuse/impact check for local changes, a recorded technical plan and independent
  architecture review for substantial changes. Before each implementation chunk,
  check that the plan still fits; do not repeat the full design without new evidence.
- Carry authorized chunks through implementation, verification, independent review,
  fixes and relevant documentation updates before the manual commit checkpoint.
  Reviewers are separate read-only subagents. Disclose unavailable review or
  unresolved findings; never present self-review as independent review.

## Quality and records

- Inspect existing implementations before adding another UI/control/style/helper or
  backend path. Reuse when behavior fits; otherwise preserve equivalent appearance
  and interaction. Do not introduce abstractions solely to reduce line counts.
- Use readable multi-line code, consistent indentation and sensible line breaks.
- Keep behavior, technical decisions and concise completion status in
  `documentation/requirements/<feature>.md` (or the existing audit for maintenance).
  Preserve existing content; separate agreements from open questions/deferred ideas.
- Verification must match the affected area and risk. Passing tests does not establish
  user acceptance. Report meaningful limits and leave a clear manual test handoff.
