---
name: adding-vendor
description: Adds and manages third-party vendor code as git submodules. Use when the user wants to add vendor source code for local reading or analysis.
author: Daniel Montilla
version: 1.0.0
license: MIT
groups:
  - git
  - workflow
---

# When To Use

Use when the user asks to add vendor source code, pull in third-party dependencies for local reading, or analyze external codebases. Also use when managing existing git submodules for vendor code.

# Pipeline

## 1. Pre-Execution Validation

1. **Git init**: run `git rev-parse --is-inside-work-tree`. If not a git repo, abort.
2. **Directory**: ensure at repository root.
3. **.gitmodules**: if exists, read it. Ensure target vendor is not already mapped.

## 2. Install Vendor

### Create Submodule

```bash
git submodule add <repo-url> vendor/<vendor-name>
```

### Initialize

```bash
git submodule update --init --recursive
```

If repo has sub-dependencies, pass `--recursive`.

### Verify

```bash
ls -R vendor/<vendor-name>
```

If directory empty, re-run `git submodule update --init --recursive`.

### Register Vendor

Add the vendor to `.agents/skills/finding-vendors/SKILL.md` table:

```markdown
| <vendor-name> | vendor/<vendor-name> | <repo-url> |
```

## 3. Maintain Vendor

When user requests "update" or "latest version":

```bash
git submodule update --remote --merge
git add .gitmodules vendor/<vendor-name>
git commit -m "sys: update vendor <vendor-name> to latest remote"
```

## 4. Configure Read-Only Guardrails

### Option A: Global Ignore (Recommended)

Append `vendor/` to root `.gitignore` so vendor files stay out of PRs.

### Option B: Ignore Tracking

```bash
git config submodule.vendor/<vendor-name>.ignore all
```

Prevents dirty vendor folders from appearing in `git status`.

## 5. Recover from Modified Content

If "Modified Content" inside vendor blocks switching or updating:

```bash
cd vendor/<vendor-name> && git reset --hard HEAD && cd -
```

# Reference

| Action | Command |
|--------|---------|
| Add vendor | `git submodule add <url> vendor/<name>` |
| Initialize | `git submodule update --init --recursive` |
| Verify | `ls -R vendor/<name>` |
| Register vendor | Edit `.agents/skills/finding-vendors/SKILL.md` |
| Update to latest | `git submodule update --remote --merge` |
| Reset vendor | `cd vendor/<name> && git reset --hard HEAD && cd -` |
