## Phase 1: State Loading

- [ ] All task states (complete, in-progress, pending, blocked) correctly mapped from files
- [ ] Active phase determined as first phase with pending/in-progress tasks
- [ ] `caveman-compression` applied when writing files

## Phase 2: Task Execution

- [ ] Each executed task completed according to its `type` contract
- [ ] All gates in executed task's GATES.md passed before marking complete
- [ ] Exploratory tasks stored findings in MEMORY.md
- [ ] Execution tasks validated (lint, format, test) per task GATES.md
- [ ] Defect tasks linked correct `related-tasks` in frontmatter

## Phase 3: Review & Defect Loop

- [ ] End-of-phase review prompt presented to user at phase boundary
- [ ] User-reported defects grouped into tasks with correct `originator` links
- [ ] Defect tasks shown to user for approval/modification before execution
- [ ] Review loop repeats until user reports no issues

## Phase 4: Per-Phase Commit

- [ ] `planning-git-commits` loaded after user approves phase
- [ ] Commit plan shown to user for approval/modification
- [ ] Commits created and phase locked only after user explicit approval
