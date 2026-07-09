## Phase 0: Input Validation

- [ ] Feature name provided (kebab-case)
- [ ] Description provided
- [ ] Requirements captured
- [ ] Goals defined
- [ ] All gaps resolved ([grill-me](../grill-me/SKILL.md) loaded if needed)

## Phase 1: Structure Validation

- [ ] Feature root dir created under `.agents/features/<name>/`
- [ ] `FEATURE.md` exists with frontmatter (name, version, status, created, tasks)
- [ ] `CHECKLIST.md` exists with progress tracker
- [ ] All task subdirectories created with letter-number prefix
- [ ] Each task dir contains `TASK.md` and `MEMORY.md`
- [ ] `GATES.md` created for feature root and each task (skip trivial tasks)
- [ ] Directory tree matches the defined dependency structure

## Phase 2: Content Review

- [ ] Task dependency graph is acyclic (A→B→C ordering correct)
- [ ] Group letter assignments maximize parallelism
- [ ] Per-task `depends-on` frontmatter matches declared dependencies
- [ ] Gate phases properly scoped (feature root, each task, eligible defects)
- [ ] Final phase in every GATES.md is the strict conventions check
- [ ] `generated: gate` defects correctly omit their own GATES.md
- [ ] Caveman-compression applied to all files

## Phase 3: Final Approval

- [ ] User reviewed directory tree
- [ ] User reviewed dependency graph
- [ ] User reviewed gate phases per scope
- [ ] User explicitly approved the plan
