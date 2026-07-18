/**
 * Regression test for finding F15 — `parseSummary` previously used a `\z`
 * regex anchor, which is a literal `z` in ECMAScript regex (not end-of-input
 * like in Ruby/Python). For the canonical review-file layout (Summary at
 * end-of-file with no `z` in the body), the old regex returned `null`, the
 * loop never detected "all terminal", and falsely ran to `maxLoops`.
 *
 * These tests pin the corrected end-of-section anchor
 * `(?=^##\s|$(?![\s\S]))` against the four layouts:
 *   1. Summary at EOF, no `z` in body (the canonical F15 case).
 *   2. Summary at EOF, body containing a `z` (must not truncate at the `z`).
 *   3. Summary followed by another `## ` heading (e.g. `## Reviewer Verdict`).
 *   4. No Summary block at all (returns null → loop keeps iterating).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSummaryText, isAllTerminal } from '../parse-summary.js';

const fixtureAllTerminalNoZ = `# Adversarial Review: x

## Review Metadata
- **Max Attempts**: 3

## Findings

### Critical

#### F1 — x
- **Status**: Resolved
- **Attempts**: 1

### Discussion
[Fixer] done

## Summary
- **Open**: 0
- **In Review**: 0
- **Resolved**: 1
- **Won't Fix**: 0
- **Escalated**: 0
`;

const fixtureAllTerminalWithZ = `# Adversarial Review: x

## Summary
- **Open**: 0
- **In Review**: 0
- **Resolved**: 2
- **Won't Fix**: 0
- **Escalated**: 0

Coverage areas: zombie paths, zero-state, zebra input.
`;

const fixtureSummaryThenVerdict = `# Adversarial Review: x

## Summary
- **Open**: 1
- **In Review**: 0
- **Resolved**: 13
- **Won't Fix**: 1
- **Escalated**: 0

## Reviewer Verdict
One new defect (F15) was introduced. Loop NOT closed; fixer owes a response.
`;

const fixtureNoSummary = `# Adversarial Review: x

## Findings

### Critical

#### F1 — x
- **Status**: Open
- **Attempts**: 0
`;

test('parseSummaryText: Summary at EOF with no z in body returns full counts (F15 canonical case)', () => {
  const s = parseSummaryText(fixtureAllTerminalNoZ);
  assert.ok(s, 'expected non-null for canonical end-of-file Summary');
  assert.equal(s.open, 0);
  assert.equal(s.inReview, 0);
  assert.equal(s.resolved, 1);
  assert.equal(s.wontFix, 0);
  assert.equal(s.escalated, 0);
  assert.equal(isAllTerminal(s), true, 'all-terminal must be detected when Open/InReview/Escalated are 0');
});

test('parseSummaryText: body containing z is not truncated at the z (F15 secondary failure mode)', () => {
  const s = parseSummaryText(fixtureAllTerminalWithZ);
  assert.ok(s, 'expected non-null even though body contains z chars');
  assert.equal(s.open, 0);
  assert.equal(s.inReview, 0);
  assert.equal(s.resolved, 2);
  assert.equal(s.wontFix, 0);
  assert.equal(s.escalated, 0);
  assert.equal(isAllTerminal(s), true);
});

test('parseSummaryText: Summary followed by ## Reviewer Verdict stops at the next heading', () => {
  const s = parseSummaryText(fixtureSummaryThenVerdict);
  assert.ok(s, 'expected non-null for Summary followed by another ## section');
  assert.equal(s.open, 1);
  assert.equal(s.inReview, 0);
  assert.equal(s.resolved, 13);
  assert.equal(s.wontFix, 1);
  assert.equal(s.escalated, 0);
  assert.equal(isAllTerminal(s), false, 'open=1 → not all terminal');
});

test('parseSummaryText: missing Summary returns null → isAllTerminal false (defensive)', () => {
  const s = parseSummaryText(fixtureNoSummary);
  assert.equal(s, null);
  assert.equal(isAllTerminal(s), false);
});