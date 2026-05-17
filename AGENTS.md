# scenario-globe-viewer Agent Rules

Vite-based globe scenario viewer. This file is loaded by both Claude Code and
Codex CLI; `CLAUDE.md` is a symlink to this file.

## 1. Scope

1. Project specifics (live state, decisions, scoped rules) are tracked in
   `.agent-memory/` (symlink into Claude Code's user-private memory store for
   this repo).
2. Cross-project workflow conventions (Multi-Tool Agent Convention, Memory
   Bridge Convention, Heavy-Compute Routing) live at
   `/home/u24/papers/AGENTS.md` §7 / §8 / §9.
3. Audit history is captured in `INDEPENDENT-AUDIT-*.md` at repo root; treat
   those as historical evidence, not active TODO.

## 2. Agent Memory Bridge

This repo bridges its agent memory across tools (Claude Code, Codex CLI,
future agents). The live, session-updated memory store lives at
`.agent-memory/` (symlink into Claude Code's user-private memory dir for this
repo's slug; the symlink itself is in `.gitignore`, the target is the source
of truth).

**Read order at session start (any agent):**

1. `.agent-memory/MEMORY.md` — index of all current memory entries for this
   repo.
2. Open every `.agent-memory/feedback_*` and `.agent-memory/project_*` entry
   whose description matches the task at hand.
3. Then proceed to the workspace-level workflow rules at
   `/home/u24/papers/AGENTS.md` §7 (Multi-Tool Agent Convention) and §8
   (Memory Bridge Convention).
4. Finally this repo's own rules below.

**Updating memory:**

- Only the Claude controller agent updates memory entries (writes to the
  symlink target). Codex CLI and other sub-agents treat `.agent-memory/` as
  read-only context.
- Memory entries that contradict current code or status are stale — surface
  the contradiction; do not act on stale memory.

The canonical bridge implementation reference is
`modqn-paper-reproduction/AGENTS.md` §Agent Memory Bridge.

## 3. Workspace Inheritance

This repo inherits the following from `/home/u24/papers/AGENTS.md`:

1. §7 Multi-Tool Agent Convention — controller (Claude Opus) / executor
   (Codex CLI or Claude sub-agent) / reviewer roles. Memory writes only by
   controller.
2. §8 Memory Bridge Convention — `.agent-memory/` is the source of truth;
   `AGENTS.md` carries a maintained snapshot for agents that can't load the
   memory dir.
3. §9 Heavy-Compute Routing — pilots and training (none expected for this
   visualization repo) route to the Ubuntu server `sat@120.126.151.102 -p
   2222`.

If a workspace rule conflicts with a project-specific rule, the project rule
wins for project-scoped tasks (per the workspace AGENTS.md scope split).

## 4. Project-Specific Pointers

Read order for new work, beyond the bridge above:

1. `.agent-memory/MEMORY.md` — live project state and scope rules.
2. `README.md` — repo entry point.
3. `docs/` — technical documentation.
4. `INDEPENDENT-AUDIT-final-report.md` + `INDEPENDENT-AUDIT-results.md` +
   `INDEPENDENT-AUDIT-requirements.md` — audit history, treat as forensics.
5. `src/` + `tests/` for implementation context.
6. `vite.config.ts` + `package.json` for build / dev-server setup.

## 5. Project-Specific Rules (snapshot from memory)

Critical rules embedded verbatim from `.agent-memory/` so a non-Claude
executor that fails to load the memory dir still sees them. The memory
entries are the live form; this section is a snapshot maintained alongside
them.

### R1. No ITRI references in new code (`.agent-memory/feedback_no_itri_in_new_code.md`)

ITRI-specific code paths, identifiers, and assumptions are legacy. New code
must not introduce new ITRI references. Existing ITRI-tagged code may stay
until a refactor explicitly removes it. If a task requires touching
ITRI-tagged code, surface the contradiction and confirm scope.

### R2. Visible-first dev (`.agent-memory/feedback_visible_first_dev.md`)

For UI / visualization changes, prefer making the change visible in the dev
server before extending tests or refactoring. Visual confirmation precedes
code structure decisions.

### R3. Caveman mode default (`.agent-memory/feedback_caveman_mode_default.md`)

Communication style for this repo defaults to caveman-compressed; switch to
normal mode only when the user requests it explicitly or when the task
requires multi-step safety prose.

(See the individual `.agent-memory/` entries for full rationale and how-to-
apply text. This snapshot may be slightly stale; the memory entries are
authoritative.)

## 6. Sync Rule

`CLAUDE.md` is a symlink to this file. When editing, both Claude Code and
Codex CLI read the same content. No mirror maintenance needed.
