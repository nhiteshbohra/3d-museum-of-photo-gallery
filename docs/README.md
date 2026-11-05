# Documentation & Project Tracking Hub — Our Museum 3D

**Current Baseline:** 05 November 2026  
**Application:** Ultra-luxury Three.js WebGL virtual art museum and memorial sanctuary with live 2-player multiplayer, 3D character avatars, 61 curated artworks, and normalized GLB furniture/decorations.

---

## 1. Quick Navigation

- **System Architecture**: [`docs/architecture/ARCHITECTURE.md`](architecture/ARCHITECTURE.md)
- **Developer Cheatsheet & Map**: [`docs/architecture/CLAUDE.md`](architecture/CLAUDE.md)
- **Architectural Decision Records (ADRs)**: [`docs/tracking/DECISIONS.md`](tracking/DECISIONS.md)
- **Session History & Daily Logs**: [`docs/tracking/SESSION_LOG.md`](tracking/SESSION_LOG.md)
- **Active Sprint Backlog & Tasks**: [`docs/tracking/TODO.md`](tracking/TODO.md)
- **Implementation Milestones**: [`docs/tracking/PROGRESS.md`](tracking/PROGRESS.md)
- **Defects & Resolutions**: [`docs/tracking/BUGS.md`](tracking/BUGS.md)
- **Technical Blockers**: [`docs/tracking/BLOCKERS.md`](tracking/BLOCKERS.md)
- **Master Operating Contract**: [`docs/specs/PROJECT_INSTRUCTIONS.md`](specs/PROJECT_INSTRUCTIONS.md)
- **Asset Creative Commons Credits**: [`docs/specs/ATTRIBUTIONS.md`](specs/ATTRIBUTIONS.md)

---

## 2. Directory Structure

```
docs/
├── README.md                           <-- Master Documentation Index (You are here)
│
├── architecture/                       <-- SYSTEM DESIGN & CODING RULES
│   ├── ARCHITECTURE.md                 <-- WebGL/Three.js data flow, modules, boundaries
│   └── CLAUDE.md                       <-- Quick-start guide, tech stack, and developer rules
│
├── tracking/                           <-- ACTIVE PROJECT TRACKING & LOGS
│   ├── DECISIONS.md                    <-- Architectural Decision Records (ADRs) (Append-only)
│   ├── SESSION_LOG.md                  <-- Chronological log of each work session
│   ├── TODO.md                         <-- Verified backlog and task status
│   ├── PROGRESS.md                     <-- Milestones, cycles, and slice breakdowns
│   ├── BUGS.md                         <-- Open & resolved defect ledger
│   ├── BLOCKERS.md                     <-- Technical hurdles and workarounds
│   ├── PENDING_TASKS.md                <-- Honest list of live verification tasks
│   └── TEST_MATRIX.md                  <-- Feature test scenarios and results
│
├── specs/                              <-- MASTER CONTRACTS & SPECIFICATIONS
│   ├── PROJECT_INSTRUCTIONS.md         <-- Master Operating Contract & Universal Guidelines
│   ├── ATTRIBUTIONS.md                 <-- CC-BY-4.0 model author attributions
│   ├── MASTER_IMPLEMENTATION_GUIDE.md  <-- Historical implementation roadmap
│   ├── OUR_HOME_3D_PROJECT_SPEC.md     <-- Complete 3D project specification
│   ├── AGENT_TEAM_PLAYBOOK.md          <-- Role division and testing standards
│   └── USER_CHAOS_REVIEW.md            <-- Edge case analysis and UI robustness audit
│
├── prompts/                            <-- AI PROMPTS & DISCIPLINE PROTOCOLS
│   ├── REWRITTEN_PROMPT.md             <-- Clean 4-step 3D model & placement prompt
│   ├── ai-context-discipline-prompt.md <-- 5-file context discipline protocol
│   └── universal-code-audit-prompt.md  <-- Universal deep code audit protocol
│
└── reports/                            <-- VERIFICATION & HISTORICAL REPORTS
    ├── ALIGNMENT_REPORT.md             <-- 12 GLB model spatial alignment PASS/FAIL
    ├── MULTIPLAYER_REPORT.md           <-- Live 3D multiplayer relay verification
    ├── COMPLETION_CHECKLIST.md         <-- Step 4 model pipeline checklist
    ├── CURRENT_STATE_VITE_2026-10-30.md<-- Baseline Vite review
    ├── PERF_REPORT.md                  <-- Draw calls and triangle budget
    └── IDEAS.md                        <-- Future roadmap concepts
```

---

## 3. Context Discipline for AI Agents

All AI agents (Antigravity, Claude, Gemini, OpenAI) must observe the **5-File Context System**:
1. Check [`docs/architecture/CLAUDE.md`](architecture/CLAUDE.md) for current commands, keys, and file paths.
2. Check [`docs/architecture/ARCHITECTURE.md`](architecture/ARCHITECTURE.md) before making structural changes.
3. Record all architectural choices in [`docs/tracking/DECISIONS.md`](tracking/DECISIONS.md).
4. Log session progress in [`docs/tracking/SESSION_LOG.md`](tracking/SESSION_LOG.md).
5. Keep [`docs/tracking/TODO.md`](tracking/TODO.md) and [`docs/specs/PROJECT_INSTRUCTIONS.md`](specs/PROJECT_INSTRUCTIONS.md) synchronized.
