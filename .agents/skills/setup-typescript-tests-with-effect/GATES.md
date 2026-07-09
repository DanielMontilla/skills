## Phase 1: Dependency Correctness

- [ ] `@effect/vitest` version in `devDependencies` matches `effect` peerDependency exactly (without caret)
- [ ] `vitest` is present in `devDependencies`
- [ ] `"test": "vitest run"` script is present in `package.json`

## Phase 2: Configuration Correctness

- [ ] `vitest.config.ts` exists with `include` covering both `tests/**/*.test.ts` and `src/**/*.test.ts`

## Phase 3: Installation & Smoke Test

- [ ] `bun install` completes without errors
- [ ] `bun run --cwd packages/[name] test` runs successfully (may report 0 tests)
