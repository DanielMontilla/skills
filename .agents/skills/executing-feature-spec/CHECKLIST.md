# execution checklist

## Step 0: Mode

- [ ] User specified mode: SINGLE or MULTI
- [ ] If SINGLE and task ID given → note task
- [ ] If SINGLE and no task given → will resolve next

## Step 1: Load State

- [ ] Locate .agents/features/<name>/
- [ ] Read FEATURE.md, CHECKLIST.md, DEFECTS.md (if present)
- [ ] Read all TASK.md — note depends-on, status
- [ ] Read all MEMORY.md
- [ ] Read all GATES.md
- [ ] Scan `<task-dir>/defects/` for open defect sub-tasks
- [ ] Map: complete, in-progress, pending, blocked, defect

## SINGLE Mode

### Step 2: Identify Task

- [ ] If task ID specified → use it
- [ ] If no task → filter eligible (depends-on complete or empty)
- [ ] Prefer pending over in-progress
- [ ] If >1 eligible → ask user
- [ ] If none eligible → report blocked or feature done → go to Step 7 Final Commit

### Step 3: Execute

- [ ] Read TASK.md — requirements, completion indicators
- [ ] Read MEMORY.md
- [ ] Critically assess TASK.md — is the plan still correct?
- [ ] If not → update TASK.md, log deviation in MEMORY.md ## Deviations
- [ ] Check sibling MEMORY.md
- [ ] Create any needed files
- [ ] Implement per requirements
- [ ] Verify completion indicators
- [ ] Run test/lint/typecheck — all pass
- [ ] Update MEMORY.md: progress, decisions, blockers, changes
- [ ] Do NOT update FEATURE.md progress yet (gates must pass first)

### Step 4: Gate Execution (Validate Before Marking Complete)

**IMPORTANT: Gates must be run to validate implementation before marking a task complete. Do not skip this step.**

- [ ] **If scope has no GATES.md** → status = complete, update FEATURE.md + CHECKLIST.md, go to Step 5
- [ ] **If scope has GATES.md** → follow procedure:
    - [ ] Read scope's GATES.md — find highest fully-passed phase P, next phase = P+1
    - [ ] Check `## Defects History` — any `status: open` defects? If yes, resolve them first (blocked until resolved)
    - [ ] Execute each gate in the current phase (run the gate command and verify outcome)
    - [ ] Update each gate's status (`passed` | `failed`), agent, date in GATES.md
    - [ ] All gates passed → advance to next phase; repeat until all phases pass
    - [ ] Any gate failed → create defect: dir `<task-dir>/defects/<kebab-desc>/` with TASK.md + MEMORY.md, frontmatter `generated: gate`, `gate-source: <scope-ref>/G<n>.<i>`. Append to GATES.md `## Defects History`. Parent task → `defect`. Block until resolved.
    - [ ] Final phase passed → status = `complete`
- [ ] Update FEATURE.md progress + CHECKLIST.md

### Step 5: Defect Scan (After Gate Validation)

- [ ] Ask user: "Everything ok? Scan for DEFECT: comments?"
- [ ] If yes → load `managing-feature-spec-defects` skill and invoke it

### Step 6: Continue?

- [ ] Report task complete to user
- [ ] Ask user "Continue to next task?"
- [ ] Yes → go to Step 2 (Identify Task)
- [ ] No → go to Step 7 Final Commit

### Step 7: Final Commit

- [ ] Ask user: "Feature work is done. Create git commits for these changes?"
- [ ] If yes → load `planning-git-commits` skill to stage files and create conventional commits referencing feature name and task IDs
- [ ] If no → stop

## MULTI Mode

### Step 2: Identify Next Group

- [ ] Determine which group letter to process next (skip groups where all tasks are already complete)
- [ ] If no groups remain → go to Step 7 Final Commit
- [ ] The next group may be partial — some tasks may already be complete or in-progress
- [ ] Identify all tasks in that group with dependencies complete
- [ ] Only spawn sub-agents for pending tasks (skip already-complete or in-progress tasks)
- [ ] If no pending tasks in group → group is effectively complete, skip to Step 5

### Step 3: Orchestrate Group

- [ ] Spawn sub-agent per eligible pending task via Task tool
- [ ] Each sub-agent: SINGLE mode, specific task

### Step 4: Monitor

- [ ] Wait for all spawned agents (they run own gates)
- [ ] Any task spawned but not `complete`? Re-spawn (up to N retries, ask user)
- [ ] ALL tasks in group `complete` (including those already done before) → report group done

### Step 5: Defect Scan

- [ ] Ask user: "Everything ok? Scan for DEFECT: comments?"
- [ ] If yes → load `managing-feature-spec-defects` skill and invoke it

### Step 6: Continue?

- [ ] Ask user "Continue to next group?"
- [ ] Yes → go to Step 2
- [ ] No → go to Step 7 Final Commit
- [ ] IMPORTANT: NEVER proceed to the next group without user confirmation
- [ ] IMPORTANT: MULTI mode only orchestrates ONE GROUP per cycle, not all groups

### Step 7: Final Commit

- [ ] Ask user: "Feature work is done. Create git commits for these changes?"
- [ ] If yes → load `planning-git-commits` skill to stage files and create conventional commits referencing feature name and task IDs
- [ ] If no → stop
