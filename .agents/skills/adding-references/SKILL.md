---
name: adding-references
description: Adds and manages third-party reference source code as git submodules. Use when the user wants to add reference source code for local reading or analysis.
author: Daniel Montilla
version: 1.1.0
license: MIT
dependencies:
  - executing-skills
groups:
  - git
  - workflow
---

# When To Use

Use when the user asks to add reference source code, pull in third-party code for local reading, or analyze external codebases. Also use when managing existing git submodules for reference code.

> **Note**: This skill was previously named `adding-vendor` and used `vendor/` as the path. All references now use `references/`. If you see old references to `vendor/` in existing submodules, they should be migrated.

> **Prerequisite**: Load the [executing-skills](../executing-skills/SKILL.md) skill before running this pipeline. It governs how skills are loaded, executed, and verified.

# Pipeline

## 1. Pre-Execution Validation

1. **Git init**: run `git rev-parse --is-inside-work-tree`. If not a git repo, abort.
2. **Directory**: ensure at repository root.
3. **.gitmodules**: if exists, read it. Ensure target reference is not already mapped.

## 2. Install Reference

### Create Submodule

```bash
git submodule add <repo-url> references/<reference-name>
```

### Initialize

```bash
git submodule update --init --recursive
```

If repo has sub-dependencies, pass `--recursive`.

### Verify

```bash
ls -R references/<reference-name>
```

If directory empty, re-run `git submodule update --init --recursive`.

### Register Reference

Add the reference to `.agents/skills/finding-references/SKILL.md` table:

```markdown
| <reference-name> | references/<reference-name> | <repo-url> |
```

## 3. Maintain Reference

When user requests "update" or "latest version":

```bash
git submodule update --remote --merge
git add .gitmodules references/<reference-name>
git commit -m "sys: update reference <reference-name> to latest remote"
```

## 4. Configure Read-Only Guardrails

### Option A: Global Ignore (Recommended)

Append `references/` to root `.gitignore` so reference files stay out of PRs.

### Option B: Ignore Tracking

```bash
git config submodule.references/<reference-name>.ignore all
```

Prevents dirty reference folders from appearing in `git status`.

## 5. Recover from Modified Content

If "Modified Content" inside reference blocks switching or updating:

```bash
cd references/<reference-name> && git reset --hard HEAD && cd -
```

# Reference

| Action | Command |
|--------|---------|
| Add reference | `git submodule add <url> references/<name>` |
| Initialize | `git submodule update --init --recursive` |
| Verify | `ls -R references/<name>` |
| Register reference | Edit `.agents/skills/finding-references/SKILL.md` |
| Update to latest | `git submodule update --remote --merge` |
| Reset reference | `cd references/<name> && git reset --hard HEAD && cd -` |
