---
name: scoping-features
description: Guides feature scoping to current requirements only, flags speculative architecture, and helps prune unnecessary complexity. Use during planning, design review, or when scope creep surfaces.
author: Daniel Montilla
version: 1.0.0
groups:
  - conventions
  - planning
---

# When To Use

Scopes features to current requirements, flags speculative architecture, and prunes unnecessary complexity. Use during planning, design review, or when scope creep surfaces.

# Pipeline

## 1. Identify Current Requirement

Write the specific problem being solved right now in one sentence.

## 2. Flag Speculative Additions

Scan the plan or code for:
- "Just in case" logic (caching layers, fallback strategies, config knobs for unrequested features)
- Generalized abstractions serving only one current use case
- Placeholder systems for hypothetical future scale

## 3. Prune Aggressively

Remove or comment out anything not required by the current requirement. Prefer inline code over abstracted infrastructure.

## 4. Leave the Door Open

Keep code modular — use simple functions, not complex frameworks. Write so adding the future feature later is easy, but don't build it now.

## 5. Verify

After pruning, confirm all current-requirement behavior still works. No tests should break.
