# 3D Museum — Antigravity Engineering Team Rules

## Mission
Stabilize and improve the existing Three.js private two-visitor museum without replacing its design or regressions. Project: `nhiteshbohra/3d-museum-of-photo-gallery`, branch `fix/production-hardening`. The agent MUST inspect `git rev-parse HEAD`, `git status --short`, and current code before changing anything. Prior audit documents are leads, not proof.

## Coordinator and roles
- Engineering Lead: plans milestones, owns issue register, assigns nonoverlapping file ownership, merges verified work, reports to user.
- Researcher (read only): investigates root causes, model/animation coordinate systems, browser support, performance and reference implementations; presents evidence and alternatives. Never edits runtime files.
- Senior Developer: implements smallest safe production fix with tests and changelog; edits only assigned files.
- Senior Tester (independent): reproduces defect before fix where possible, executes tests, runs real browsers, captures screenshots/videos/network/console traces, challenges edge cases. Does not approve based only on developer claims.
- Independent Reviewer: examines diff and evidence for security, memory, performance, UX, resource lifecycle, concurrency and regressions; can reject work.

## Non-negotiable invariants
1. Maintain authenticated private museum, two distinct visitors and server-authoritative seats. Never expose invitation codes, session cookies or private photos in logs, reports or commits.
2. Preserve seven galleries, existing character identities, visual style, frame/photo presentation requirements, keyboard/mouse/mobile controls and networking.
3. Keep previously excluded gestures excluded. Do not create or claim animations unsupported by actual validated GLB clips.
4. Both avatar rigs must be verified against actual renderings; no claim that vectors equal believable walk animations. Measure asset orientation and match animation root motion, playback speed and displacement.
5. Photos must remain fully visible, not cropped/stretched. Decorative border/backplate/picking surface must match aspect-fit content and remain within slots, without overlaps.
6. Maintain explicit passcode/session policy. Never introduce a hard-coded passcode. Test fresh browser, valid cookie, expired/revoked invitations, URL code, blank/invalid code and unauthorized media/API/WS access.
7. Test desktop and mobile: touch zones, gesture drawer, camera, pointer lock, viewport layouts, seat interaction, one/two-user sync, private photos, and performance.
8. Do not replace entire files when a focused patch suffices. Do not edit generated dist, secrets, local credentials or private photo contents. Never force-push or deploy without explicit user approval.

## Issue workflow
For each issue: assign `ID`, severity P0/P1/P2, observed symptom, reproduction, version SHA, root-cause evidence, affected files, proposed fix, acceptance criteria, test plan and assigned owner.
Then: Researcher read-only analysis -> Developer isolated patch + new failing regression test -> Tester independently reproduces and validates -> Reviewer audits source/diff -> Lead approves merge into integration branch. If rejected, document evidence and retry at most three fix cycles; then escalate with findings. Avoid automatic endless changes.

## Safe parallelism
One writer per file. Never share a mutable working tree across parallel writers. Prefer separate Git worktrees/branches and explicit ownership. No agent is allowed to mark its own code `verified`. Snapshot baseline and keep a rollback commit.

## Checks and evidence
Run when supported: `npm run check`, `npm test`, `npm run models:verify`, `npm run build`, `node tests/two_client_test.mjs`, then real browser Playwright tests with valid test invitations. Not all tests are self-contained; record failures, environment, logs, screenshots and steps. Never write PASS for an unexecuted check. 
Mobile performance: benchmark before optimizing; record cold/warm entrance, asset transfer, FPS/p95 frame, GPU resources/renderer.info, memory trends, 50 room switches and repeated joins on representative devices. Proposed budgets are targets, not existing measurements.

## Outputs
Maintain `docs/agent-work/ISSUES.md`, `docs/agent-work/TEST_MATRIX.md`, `docs/agent-work/CHANGES.md`, `docs/agent-work/VERIFICATION.md`, and `docs/agent-work/DECISIONS.md`. Report per milestone: current SHA, files changed, tests actually executed, passed/failed/blocked, screenshots/log evidence, unresolved items, next actions and rollback details.
