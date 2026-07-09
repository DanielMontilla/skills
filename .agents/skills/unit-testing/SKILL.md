---
name: unit-testing
description: Reviews tests for quality and structure. Probes whether tests test real behavior or just mocks. Verifies test directory layout. Use when writing tests, reviewing PRs with test changes, or before adding test coverage.
author: Daniel Montilla
version: 1.0.0
license: MIT
groups:
  - testing
dependencies:
  - creating-typescript-modules
  - setup-typescript-tests-with-effect
---

# When To Use

Reviewing test files for quality, structure, and proper coverage. Auditing PRs that include test changes. Before adding new tests to ensure conventions are followed. When investigating test reliability issues.

# Pipeline

## 1. Probe Test Quality

Ask in order:

- **What are we actually asserting?** Is the test checking real behavior/outcome, or verifying that mocks were called a certain way?
- **Are we just testing the mocks?** If the test passes/fails based on mock configuration rather than real logic, it is a mock-testing anti-pattern.
- **Does this need another type of test?** Would integration, end-to-end, snapshot, or property-based testing be more appropriate? Heavy mocking of IO/database/network suggests an integration test instead.
- **Is the test specific enough?** Does it assert exact values/structures rather than vague truthiness? Can it produce false positives?

## 2. Verify Directory Structure

### For TypeScript Modules

If the code under test follows the [creating-typescript-modules](../creating-typescript-modules/SKILL.md) convention (`.module.ts` + `index.ts`):

```
src/[category]/[module-name]/
├── [module-name].module.ts
├── index.ts
└── test/
    ├── [module-name].[utility-1].test.ts
    └── [module-name].[utility-2].test.ts
```

- `test/` directory lives **inside** the module directory
- One test file per exported utility/function
- Naming: `[module-name].[utility-name].test.ts`

### For Non-Module Code

```
src/[path/]/
├── file-to-test.ts
└── test/
    └── file-to-test.test.ts
```

- `test/` directory sits **next to** the file being tested
- Must use `test/` — never `__test__` or `tests/`

## 3. Apply TypeScript Conventions

If working in TypeScript, load [setup-typescript-tests-with-effect](../setup-typescript-tests-with-effect/SKILL.md) for scaffolding guidance and [creating-typescript-modules](../creating-typescript-modules/SKILL.md) for module conventions covering:

- File templates and imports
- `@effect/vitest` patterns
- Effect-specific testing (`.it.effect`, `Exit` assertions)
- Namespace imports and self-contained test contexts

# Reference

- **Module conventions**: [creating-typescript-modules](../creating-typescript-modules/SKILL.md) (MUST READ)
- **Test scaffolding**: [setup-typescript-tests-with-effect](../setup-typescript-tests-with-effect/SKILL.md)
