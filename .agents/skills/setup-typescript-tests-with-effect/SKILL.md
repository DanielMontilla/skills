---
name: setup-typescript-tests-with-effect
description: Scaffolds Vitest + @effect/vitest testing infrastructure in an Effect v4 monorepo package. Use when setting up a new Effect v4 package that needs tests or adding test support to an existing one.
author: Daniel Montilla
version: 1.0.0
license: MIT
groups:
  - typescript
  - effect
  - testing
  - scaffolding
dependencies: []
---

# When To Use

Setting up tests for a new Effect v4 monorepo package. User asks to add test infrastructure, scaffold tests, or configure Vitest with @effect/vitest. Also use when migrating an existing Effect v4 package from a different test framework.

# Pipeline

## 1. Read the Effect v4 version

Read the `effect` version from `peerDependencies` (or `dependencies`) in the target `package.json`. Strip the `^` prefix if present.

| `effect` version (from package.json) | `@effect/vitest` version to add |
|---|---|
| `^4.0.0-beta.43` | `4.0.0-beta.43` |
| `^4.1.0` | `4.1.0` |

The `@effect/vitest` package must always match the `effect` version exactly.

## 2. Add dependencies

Add to `devDependencies` in `package.json`:
- `@effect/vitest` at the exact same version as `effect` (without caret)
- `vitest` at the latest version compatible with the project

## 3. Add test script

Add `"test": "vitest run"` to the `scripts` section of `package.json`.

## 4. Create `vitest.config.ts`

```typescript
import * as Vitest from "vitest/config";

export default Vitest.defineConfig({
  test: {
    include: ["tests/**/*.test.ts", "src/**/*.test.ts"],
  },
});
```

# Reference

- **Validation Gates**: [GATES.md](GATES.md) (MUST READ)
