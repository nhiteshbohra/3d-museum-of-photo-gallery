# Setup

1. In your museum repository, copy `AGENTS.md` to the repository root. Antigravity recognizes workspace `AGENTS.md` as persistent project rules.
2. Copy `START_TEAM.md` to `docs/agent-work/START_TEAM.md` or paste its content into the Antigravity agent chat.
3. Copy the supplied mobile optimization audit to the repository root as `MUSEUM_MOBILE_OPTIMIZATION_AUDIT.md` so the agents can review it (it remains an audit, not proof of measured gains).
4. Open the project in Antigravity. Ask the main agent to follow START_TEAM.md. If your Antigravity App/CLI plan supports `/teamwork-preview`, use that to coordinate a multi-agent team. Otherwise launch isolated Agent Manager conversations or have the main agent delegate via available subagents; actual features vary by product/surface.
5. For isolated parallel work, have the lead assign separate Git worktrees/branches and keep ownership of overlapping files such as `src/main.js` and `src/engine/engine.js`. No automatic commits to production branch.
6. Before merging: tests, real browser recordings, independent review, user-facing summary and rollback plan.

Official docs: https://antigravity.google/docs/rules/ and https://www.antigravity.google/docs/teamwork/
