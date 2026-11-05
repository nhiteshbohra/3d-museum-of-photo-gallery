# Antigravity — Start the Museum Engineering Team

You are the Engineering Lead for my EXISTING 3D Museum project. Read `AGENTS.md` and inspect the current repository branch, commit, worktree, package.json, scripts and all relevant project files. Do not assume earlier audit claims are verified. My requirements include: passcode-first secure startup, realistic male/female 3D avatar motion and gestures, correct W/S facing, contextual sofas and seat locks, complete photo aspect-fit plus matching frames, consistent mobile/desktop controls, two-visitor WebSocket sync, and performance improvements documented in `MUSEUM_MOBILE_OPTIMIZATION_AUDIT.md` if available.

Organize specialized subagents or separate agent tasks:
1) Read-only Senior Researcher: repository inventory, dataflow and root causes, GLB animation/skeleton orientation, Three.js/mobile bottlenecks, relevant best practices.
2) Senior Developer: implement assigned fixes only, in owned files/worktree with focused regression tests.
3) Independent Senior Tester: reproduce failures and verify browser behavior, actual model/animation appearance, security edge cases, mobile layouts and two authenticated sessions; collect evidence.
4) Independent Reviewer: inspect patches, reject regressions/security/privacy/performance defects, challenge missing tests.
You are the Lead: plan phases, own issue tracker and integration. Use distinct file ownership/worktrees, approval gates and a maximum of three fix/retest cycles before escalation. Do not silently deploy, push to protected branches, modify credentials or alter user data.

Milestones (sequential integration gates; independent research/tests may run in parallel):
A. Baseline: inventory current SHA, reproduce known defects, classify P0/P1/P2, capture original screenshots/logs and performance profile. P0 security first.
B. Authentication: make a single consistent, server-validated invitation/session policy; eliminate duplicate event handlers, hard-coded codes and accidental boot paths. Test fresh/returning/expired/revoked/unauthorized scenarios.
C. Avatar: measure male/female GLB native forward axis, root transform, skin bind, feet contact, forward/back/strafe/diagonal orientation, walk/run timing, step-back, walk-start/stop, jump/land, turn, sit/stand, gestures and camera orbit. Fix source of defects, not just symptoms.
D. Photos/UI: all images visible with matching frame/backplate/outline and picking hit area across portrait, landscape, panorama and square; no overlapping adjacent frames. Browser test desktop and phone layouts, pointer lock, touch, drawer, lightbox.
E. Multiplayer: two authenticated clients; correct mirrored direction, gesture/seat synchronization, reconnect, room changes and collisions.
F. Mobile optimization: baseline first; prioritize sofa asset/LODs, adaptive DPR, avatar textures, bounded photo cache, room lifecycle, render loops, touch responsiveness and active/idle network rate; preserve quality.
G. Final regression: run available node/scripts/build checks and independent real desktop/mobile browser tests, report any blocked device tests honestly.

Begin with a short plan and baseline issue register. Then execute approved milestones autonomously with intermediate progress reports. Do not claim completed work without actual evidence, and stop for user approval at deployment/production or destructive operations. Deliver code diff, test logs, screenshots, unresolved items and rollback instructions.
