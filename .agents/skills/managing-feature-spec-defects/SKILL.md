---
name: managing-feature-spec-defects
description: Scans codebase for DEFECT: comments (any comment style), maps them to feature spec tasks, and generates defect sub-tasks or new tasks. Invoked by executing-feature-spec after task/group completion.
license: MIT
groups:
  - skills
  - feature-spec
---

# managing-feature-spec-defects

Invoked by `executing-feature-spec` after each task or group completes. User is asked: *"Everything ok? Scan for `DEFECT:`?"* If yes, this skill runs.

Defects created by this skill get frontmatter `generated: orchestrator` (standalone/interactive → `generated: user`). Gate-generated defects (`generated: gate`) are created by the gate execution system, not by this skill's DEFECT: scan — they do NOT get their own GATES.md and are tracked in the originating GATES.md's `## Defects History`.

## Scan

- `rg 'DEFECT:(?!TASK\()'` across codebase (matches `DEFECT:` but not already-processed `DEFECT-TASK(...):`)
- Collect file:line:comment-text per match

## Match

Agent maps each defect to a task by context:
- File path proximity to task source files
- Nearest TASK.md directory
- Package/module boundaries

If uncertain → **ambiguity gate**: ask user *"Is this a new standalone task, or a defect originating from task X?"*

## Two Types

### Type A: Task-linked defect

Defect originates from an existing task.

- Location: `<task-dir>/defects/<LETTER><NN>-<kebab-desc>/`
- Contains: `TASK.md` + `MEMORY.md` (standard task format)
- `depends-on` includes parent task
- Parent task `TASK.md` gains `## Defects` section listing this defect
- Parent task status → `defect` (not `complete` until all defect sub-tasks resolved)

### Type B: Standalone defect

Defect is unrelated to any existing task — new requirement discovered.

- Created as a standard task in the feature spec
- Placement is interactive: ask user *"Same group? Next group? Specific position?"*
- User can place it in current group (e.g., next C task), next layer (D group), or custom depends-on

## Generate

For each defect (after user confirmation):
1. Create task dir + TASK.md + MEMORY.md (TASK.md frontmatter includes `generated: orchestrator`; use `generated: user` if user placed it manually)
2. For Type A: add `## Defects` section to parent TASK.md
3. Update FEATURE.md progress table with new task
4. Update CHECKLIST.md
5. Append entry to DEFECTS.md index at feature root
6. **Mark source as processed**: replace the matched `DEFECT:` in the source file (at the given file:line) with `DEFECT-TASK(<task-id>):` — subsequent scans will skip it

## DEFECTS.md

Index file at feature root. Lists all defects with:
- ID, description, type, source (file:line), related task, status

## Status Model

New status value `defect` added to:
- `pending | in-progress | complete | defect`

A task with status `defect` is treated as non-complete by `executing-feature-spec` for eligibility and group-completion checks. Defect sub-tasks flow through the normal status lifecycle. When all sub-tasks resolve, parent status reverts to `complete`.

## Dir Structure

```
.agents/features/<feature-name>/
├── FEATURE.md
├── CHECKLIST.md
├── DEFECTS.md
├── GATES.md (optional — feature-level gates)
├── A01-<task-name>/
│   ├── TASK.md
│   ├── MEMORY.md
│   └── defects/
│       ├── A01-<defect-desc>/
│       │   ├── TASK.md
│       │   └── MEMORY.md
│       └── A02-<defect-desc>/
│           ├── TASK.md
│           └── MEMORY.md
├── B01-<task-name>/
│   ├── TASK.md
│   └── MEMORY.md
└── C01-standalone-defect/
    ├── TASK.md
    └── MEMORY.md
```

## Templates

### DEFECTS.md

```markdown
---
feature: <kebab-name>
---

# Defects

## D01: <short-title>

- **Type:** task-linked | standalone
- **Status:** open | in-progress | resolved | closed
- **Severity:** critical | major | minor
- **Source:** <file>:<line> → marked `DEFECT-TASK(<task-id>):`
- **Related Task:** <LETTER><NN>
- **Description:** <what's wrong>
- **Resolution:** <how fixed>
```

### Parent TASK.md additions (Type A)

```markdown
## Defects

- [ ] A01-<defect-desc> — see [defects/A01-<defect-desc>/](defects/A01-<defect-desc>/)
```

### Defect TASK.md

```markdown
---
id: <LETTER><NN>
name: <kebab-desc>
depends-on: <parent-task-id>
status: pending|in-progress|complete
generated: orchestrator | user | gate
gate-source: <scope-ref>/G<n>.<i>  <!-- only when generated: gate -->
---

# Task <LETTER><NN>: <Title>

## Description

Defect: <original DEFECT: comment text>

## Completion

- [ ] Bug fixed or requirement met
- [ ] Tests pass
- [ ] Project conventions followed

## Depends On

<parent task ID>

## Notes

Source: <file>:<line> → marked `DEFECT-TASK(<task-id>):`
```

## Gate-generated Defects

Defects created by a failed gate (not by this skill) have `generated: gate` in their frontmatter. These defects:

- Do NOT get a GATES.md file (the generating gate is their gate)
- Are tracked in the originating GATES.md's `## Defects History` section
- Are resolved like any other defect sub-task; once complete, the gate system re-runs the failed phase
- Must NOT be assigned a GATES.md by the feature spec orchestrator at creation time

This skill does not handle `generated: gate` defects — they are created by the [`executing-feature-spec`](../executing-feature-spec/SKILL.md) gate execution system and fed back through the defect resolution pipeline.
