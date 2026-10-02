# Travel Assistant working agreements

This file contains the complete feature development workflow. No separate feature
skill is required.

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

## Feature decisions

- Discuss new features with the user before implementation. Explore behavior, scope,
  interaction design, and meaningful tradeoffs together; allow as many rounds as needed.
  Ask focused questions and use concrete examples or mockups when helpful. Explain
  options in terms of their effect on the traveller, including important edge cases.
- Record agreed requirements in `documentation/requirements/<feature>.md`, preserving
  existing content. Separate open questions and deferred ideas from agreed behavior.
  Include observable acceptance criteria where they clarify completion. Existing
  requirements are context, not by themselves permission to start implementing.
- Summarize the agreement and wait for the user's instruction to implement. Silence
  is not approval.
- Begin implementation when the user says to proceed. Honor approval already given
  in the current task; do not ask again for each implementation, test, or review step.
- Bring unresolved decisions that change user-visible behavior or agreed scope back
  to the user. Resolve routine technical choices using the existing architecture.
  Continue independent work while waiting for a product decision.

## Implementation and verification

- Follow `documentation/development-guide.md` for architecture and verification commands.
  Reuse established frontend and backend patterns.
- After authorization, carry each commit-sized chunk through implementation, tests,
  review, fixes, and relevant documentation updates without separate prompts for each
  stage. Stop at the commit checkpoints described above.
- Add a small number of high-value tests alongside feature implementation, focused on
  main functionality and important edge cases or regressions. Do not aim for full
  coverage or add tests for every variation, trivial detail, or implementation detail.
  Prefer existing coverage where it already verifies the behavior.
- Run checks appropriate to the affected areas. Review the resulting diff against
  the requirements, considering ownership
  checks, validation, persistence, and UI states where relevant.
- Fix actionable review findings and rerun affected checks. Once checks pass, repeat
  or broaden them only when new changes or evidence justify it.
- Describe self-review accurately; do not call it independent review. Report blocked
  checks and remaining findings rather than claiming unverified completion.
- Record unrelated improvements in `documentation/maintenance-backlog.md` rather than
  expanding the feature. Update relevant documentation when behavior changes.
- Use readable multi-line code, consistent indentation, and sensible line breaks.
- Completing a feature does not itself authorize pushing or deploying it.

## Hand back for user testing

- Summarize implemented behavior, verification results, and remaining limitations.
  Provide a short walkthrough of what the user should try and where to access the
  local result.
- Keep a concise status section in the feature requirements with completed work and
  remaining decisions or checks, rather than a chronological activity log.
- Incorporate user feedback and repeat the affected implementation and verification
  steps, retaining commit checkpoints. Discuss scope changes when needed. Passing
  tests does not establish user acceptance.
