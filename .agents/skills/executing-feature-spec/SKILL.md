---
name: executing-feature-spec
description: Executes feature spec tasks single or multi-agent mode. SINGLE = work one task at a time, asking before next. MULTI = orchestrate sub-agents for one group at a time, asking before next group. Use when feature spec exists in .agents/features/ and tasks need implementation.
license: MIT
groups:
  - skills
  - feature-spec
dependencies:
  - managing-feature-spec-defects
  - planning-git-commits
---

# executing-feature-spec

Loads `.agents/features/<name>/`. User must specify mode: SINGLE or MULTI.

May invoke `managing-feature-spec-defects` after task/group completion to scan for `DEFECT:` comments (any language).

See [CHECKLIST.md](CHECKLIST.md) for detailed steps.

## Mode Selection

**SINGLE** — agent works one task at a time
- If task ID specified → execute that task
- If no task specified → auto-resolve next eligible task (dependencies complete, pending)
- After finishing task → report, ask user "Continue to next task?"
- Only proceed if user says yes; otherwise stop
- When user declines to continue or no eligible tasks remain → go to `## Final Commit`
- Use for sequential execution, debugging, or focused work

**MULTI** — agent acts as orchestrator (one group at a time)
- Identify the next group that has not been fully completed
- The next group may be partial: some tasks already complete or in-progress
- Spawn sub-agents via Task tool for eligible (pending) tasks in that group only
- Each group runs in parallel: all eligible tasks spawned together
- Monitors spawned agents, re-spawns on failure
- After ALL tasks in the group are complete → report, ask user "Continue to next group?"
- Only proceed if user says yes; otherwise stop
- Never proceed to the next group without user confirmation
- When user declines to continue or no groups remain → go to `## Final Commit`

## State Discovery

Before acting (both modes):
- Read FEATURE.md, CHECKLIST.md, all TASK.md, all MEMORY.md, all GATES.md, DEFECTS.md if present
- Map task status: complete, in-progress, pending, blocked, defect
- Scan `<task-dir>/defects/` for open defect sub-tasks under each task
- A task with status `defect` or with open defect sub-tasks is treated as non-complete for eligibility and group-completion checks

## SINGLE Mode: Task Selection

- Eligible if all `depends-on` tasks complete (or empty)
- Prefer pending over in-progress
- No eligible tasks → report feature done, go to `## Final Commit`

## SINGLE Mode: Execution

Order: **Implement → Validate with gates → Defect scan**. Do not skip gates or reorder.

1. **Implement** — Read TASK.md, MEMORY.md. Critically assess against current context. Update TASK.md if wrong (log in MEMORY.md ## Deviations). Create files, implement, verify completion indicators. Run test/lint/typecheck (all pass). Update MEMORY.md.
2. **Validate with gates** — Execute gates per GATES.md (see `## Gate Execution` below). If no GATES.md → status = complete. Update FEATURE.md progress + CHECKLIST.md.
3. **Defect scan** — Ask user: *"Everything ok? Scan for `DEFECT:` comments?"* If yes → invoke `managing-feature-spec-defects` skill on this feature.

## MULTI Mode: Orchestration (One Group At A Time)

IMPORTANT: MULTI mode NEVER executes more than one group per cycle. After each group completes, you MUST stop and ask the user for permission before proceeding to the next group.

Identify the next dependency group (A, B, C...):
- Determine which group letter to process next based on current state (skip groups where all tasks are already complete)
- The next group may be partial — some tasks may already be complete or in-progress. Only spawn sub-agents for tasks that are actually pending and have dependencies met.
- List all task statuses in that group; only spawn for `pending` tasks with dependencies complete
- Spawn sub-agent per eligible task via Task tool
- Sub-agent gets: TASK.md path + this skill (executing-feature-spec) in SINGLE mode
- Sub-agents run their own gates; orchestrator waits for `complete` not just sub-agent return
- Wait for all spawned agents to finish
- If any task not `complete` → re-spawn (up to N retries, ask user)
- If ALL tasks in the group are `complete` (or were already complete) → report group done
- Ask user: *"Everything ok? Scan for `DEFECT:` comments?"*
- If yes → invoke `managing-feature-spec-defects` skill on this feature
- Ask user "Continue to next group?"
- Stop unless user says yes — NEVER automatically proceed to the next group

## Gate Execution

When a scope (task / feature / defect) has a GATES.md, execute its gates after implementation:

1. Read scope's GATES.md; find highest fully-passed phase P; next = P+1
2. Read `## Defects History` in GATES.md — if any entry has `status: open`, block here until resolved (a defect is resolved when its TASK.md status = complete)
3. Spawn sub-agents in parallel for each gate in the current phase (no shared memory, no inter-agent communication)
4. Each sub-agent executes its gate and writes status (`passed` | `failed`), agent, date back to GATES.md
5. Collect all results after the phase settles
6. For each failed gate → create a defect:
   - Dir `<task-dir>/defects/<LETTER><NN>-<kebab-desc>/` with `TASK.md` + `MEMORY.md`
   - Frontmatter: `generated: gate`, `gate-source: <scope-ref>/G<n>.<i>`
   - No GATES.md for this defect (the generating gate is its gate)
   - Append entry to `## Defects` section of parent scope's TASK.md
   - Append entry to GATES.md `## Defects History`
   - Scope status → `defect`
7. Resolve defects via SINGLE/MULTI execution; on resume, step 2 blocks until all resolved; re-run only failed gates in the phase until all pass
8. Phase passed → advance to next phase; repeat from step 2
9. Final phase (including strict conventions check) passed → scope status = `complete`
10. If no GATES.md exists → no gates to run; scope completes immediately

## Coordination

Both modes:
- Check sibling MEMORY.md before shared-resource work
- Log intent in MEMORY.md before modifying shared files
- Conflict → log, ask user

## Resume

On re-entry (both modes):
- Re-read all TASK.md, MEMORY.md, GATES.md
- Re-evaluate eligibility via depends-on + status
- Recover from last logged position

## Final Commit

When the feature spec is fully complete (all tasks done, all defects resolved) or the user stops execution:
1. Load `planning-git-commits` skill
2. Prompt user: *"Feature work is done. Would you like to create git commits for these changes?"*
3. If yes → invoke `planning-git-commits` to stage modified files and create conventional commits with messages referencing the feature name and task IDs
4. If no → skip
