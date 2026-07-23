/**
 * @description Parses the `## Summary` block of an adversarial-review
 * review file and reports the per-status counts. Kept in its own module
 * (no runtime/agent imports) so a regression test can exercise the regex
 * in isolation. See review finding F15 — the previous regex used `\z`,
 * which is a literal `z` in JS, not an end-of-string anchor.
 */

import fs from 'node:fs';

/**
 * `(?=^##\s|$(?![\s\S]))` is the JS-correct end-of-section terminator:
 * - `^##\s` lookahead matches the next `## ` heading (start of next section)
 * - `$(?![\s\S])` is the true end-of-input even under the `m` flag (the
 *   negative lookahead asserts no character — including newlines — follows,
 *   which rules out the `$`-before-`\n` case that `m` otherwise allows).
 * Together they stop the lazy capture at the next section boundary or at
 * true EOF, whichever comes first.
 */
const SUMMARY_RE = /^## Summary\s*$([\s\S]*?)(?=^##\s|$(?![\s\S]))/m;

/**
 * @typedef {{ open: number, inReview: number, escalated: number, resolved: number, wontFix: number }} SummaryCounts
 */

/**
 * Parse the `## Summary` block of a review file. Returns null if the file
 * is missing or unparseable. Used to detect the all-terminal termination
 * condition (no `Open`/`In Review`/`Escalated` findings remain).
 *
 * @param {string} filePath
 * @returns {SummaryCounts | null}
 */
export function parseSummary(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    const text = fs.readFileSync(filePath, 'utf8');
    return parseSummaryText(text);
  } catch {
    // Defensive: treat unreadable files as not-terminal so the loop keeps
    // iterating rather than crashing or falsely declaring victory.
    return null;
  }
}

/**
 * Parse the `## Summary` block from review-file text. Pure function —
 * extracted so tests can feed fixture strings directly.
 * @param {string} text
 * @returns {SummaryCounts | null}
 */
export function parseSummaryText(text) {
  const section = text.match(SUMMARY_RE);
  if (!section) return null;
  const body = section[1];
  /** @param {string} label */
  const count = (label) => {
    const m = body.match(new RegExp(`- \\*\\*${label}\\*\\*:\\s*(\\d+)`, 'm'));
    return m ? parseInt(m[1], 10) : 0;
  };
  return {
    open: count('Open'),
    inReview: count('In Review'),
    escalated: count('Escalated'),
    resolved: count('Resolved'),
    wontFix: count("Won't Fix"),
  };
}

/**
 * True when every finding is terminal (Resolved or Won't Fix) — the loop
 * can stop. Defensive: missing summary counts as not-terminal so the loop
 * keeps iterating rather than falsely declaring victory.
 *
 * @param {SummaryCounts | null} summary
 * @returns {boolean}
 */
export function isAllTerminal(summary) {
  if (!summary) return false;
  return summary.open === 0 && summary.inReview === 0 && summary.escalated === 0;
}