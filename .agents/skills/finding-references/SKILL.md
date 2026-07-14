---
name: finding-references
description: Finds, explores, and reports on third-party reference source code vendored as git submodules. Use when the user wants to examine reference code, find a specific reference package, or understand available reference dependencies.
author: Daniel Montilla
version: 1.1.0
license: MIT
dependencies:
  - executing-skills
groups:
  - references
  - workflow
---

# When To Use

Use when the user wants to examine reference source code, find a specific reference package in the project, or understand what references are available.

> **Note**: This skill was previously named `finding-vendors` and used `vendor/` as the path. All references now use `references/`. If you see old references to `vendor/` in existing submodules, they should be migrated.

> **Prerequisite**: Load the [executing-skills](../executing-skills/SKILL.md) skill before running this pipeline. It governs how skills are loaded, executed, and verified.

# Pipeline

## 1. Identify Reference Request

Determine which reference or type of reference code the user needs based on their request.

## 2. Locate Reference

Search the `references/` directory for matching reference packages using Glob. Cross-reference with the Reference Registry in the Reference section below.

## 3. Present Information

For each matching reference, provide:
- **Path**: Location under `references/`
- **Purpose**: What the library does
- **URL**: Original source repository

## 4. Read Reference Code (if requested)

If the user wants to read or analyze reference source, navigate to the reference directory and read the relevant files.

# Reference

> **⚠️ References are READ ONLY.** They are git submodules included for local reference and analysis only. They are **not** dependencies of the monorepo, its packages, services, or applications. Do not modify reference files or import from them in production code.

| Reference | Path | URL |
|-----------|------|-----|
| alchemy-effect | references/alchemy-effect | https://github.com/alchemy-run/alchemy-effect.git |
| drizzle-orm | references/drizzle-orm | https://github.com/drizzle-team/drizzle-orm |
| effect | references/effect | https://github.com/Effect-TS/effect-smol |
| orpc | references/orpc | https://github.com/middleapi/orpc.git |
| shadcn-svelte | references/shadcn-svelte | https://github.com/huntabyte/shadcn-svelte |
| sveltekit | references/sveltekit | https://github.com/sveltejs/kit.git |
| signoz | references/signoz | https://github.com/SigNoz/signoz |
| workers-oauth-provider | references/workers-oauth-provider | https://github.com/cloudflare/workers-oauth-provider |
| effect-cf | references/effect-cf | https://github.com/jbt95/effect-cf |
| vitest | references/vitest | https://github.com/vitest-dev/vitest |

To add a new reference, use `adding-references` skill.
