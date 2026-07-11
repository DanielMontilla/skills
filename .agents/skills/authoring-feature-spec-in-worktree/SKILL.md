---
name: authoring-feature-spec-in-worktree
description: Authors a phased feature specification with workspace isolation via git worktrees. Wraps authoring-feature-spec with worktree creation, initialization, and relocation. Use when user wants to spec a new feature with an isolated git worktree.
author: Daniel Montilla
version: 1.0.0
license: MIT
dependencies:
  - authoring-feature-spec
  - using-git-worktrees
  - caveman-compression
  - grilling
  - finding-vendors
  - executing-skills
groups:
  - skills
  - feature-spec
  - planning
---

# When To Use

When a user asks to spec a new feature and the workspace needs isolation (git worktree). For in-place spec authoring without worktree isolation, use [authoring-feature-spec](../authoring-feature-spec/SKILL.md) directly.

> **Prerequisite**: Load the [executing-skills](../executing-skills/SKILL.md) skill before running this pipeline. It governs how skills are loaded, executed, and verified.

# Pipeline

## 1. Create Workspace

### Determine feature name

The worktree and branch names depend on the feature name. If the feature name is not already known (from context or user request):

1. Ask the user: "What is the feature name (kebab-case)?"
2. Use their answer as `<feature-name>` throughout this pipeline.

### Determine workspace type

Reference `using-git-worktrees` to detect isolation:

- **worktree**: In an isolated git linked worktree (GIT_DIR != GIT_COMMON, not a submodule). A new feature-specific worktree will be created from the current branch.
- **in-place**: In the main repository checkout (GIT_DIR == GIT_COMMON).

If `in-place`, recommend isolating — ask if they want a worktree. If they accept, create one (using-git-worktrees). If they decline, stay `in-place` (the spec will be authored without isolation; continue to step 2).

### Create feature worktree

**Must happen before any context gathering or grilling.** The worktree is the spec's home — all subsequent work lives there.

If workspace type is `worktree`, create a new feature-specific worktree:

1. Note current branch: `$(git branch --show-current)`
2. Generate branch name: `feat/<feature-name>`
3. Determine worktree path:
   - If inside a linked worktree (GIT_DIR != GIT_COMMON), compute path relative to the bare repo parent: `$(dirname $(git rev-parse --git-common-dir))/<feature-name>`
   - If `in-place`, compute relative to repo root: `../<feature-name>`
4. Create worktree: `git worktree add "<path>" -b "feat/<feature-name>"`
5. Relocate to worktree: `cd "<path>"` or set tool workdir to the new path

### Initialize worktree

After relocating, initialize the new worktree environment. If the agent does not already know the correct setup procedure:

1. Ask the user: "How should I initialize the worktree (install deps, build, etc.)?"
2. Provide a recommended option: "Let agent figure it out" (agent explores AGENTS.md, README.md, package.json, scripts/ to auto-detect)
3. If user selects the recommendation, explore project conventions to determine setup commands. Do not hardcode to any specific tool.
4. Execute setup and verify it succeeded before proceeding.

### All subsequent steps execute inside this worktree.

The spec files will be created at `.agents/features/<feature-name>/` within it.

## 2. Author Spec

From this point, follow the [authoring-feature-spec](../authoring-feature-spec/SKILL.md) pipeline (skip its step 0 — you are already in the feature worktree):

1. Gather Context — collect requirements, load grilling skill
2. Design Phases & Task Types
3. Design Gates
4. Generate Files
5. Review & Refine

All templates, frontmatter references, and file generation conventions are defined in the base skill.

# Reference

- **[authoring-feature-spec](../authoring-feature-spec/SKILL.md)** — Base skill for spec design, phases, gates, and file generation (MUST READ)
- **[authoring-feature-spec/templates/](../authoring-feature-spec/templates/)** — File templates: FEATURE.md, TASK.md, MEMORY.md, GATES.md (MUST READ)
- **[using-git-worktrees](../using-git-worktrees/SKILL.md)** — Worktree detection, creation, and setup
- **[executing-feature-spec](../executing-feature-spec/SKILL.md)** — Executor logic for task types and phase interruptions
