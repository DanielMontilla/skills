import fs from 'node:fs';
import path from 'node:path';
import { REVIEWER_SYSTEM, FIXER_SYSTEM, TOOLS } from './agents.js';
import { runAgent, createPersistentAgent } from './runner.js';
import { parseSummary, isAllTerminal } from './parse-summary.js';

/**
 * @typedef {{ reviewerModel: string, fixerModel: string, maxLoops: number, targetDir: string, reviewName: string, fresh: boolean }} LoopOptions
 */
/**
 * @typedef {{ ok: true, opts: LoopOptions } | { ok: false, err: unknown }} ParsedOptions
 */

/** @type {string} */
const DEFAULT_REVIEWER = 'deepseek-v4-pro';

/** @type {string} */
const DEFAULT_FIXER = 'deepseek-v4-flash-free';

/** @type {number} */
const DEFAULT_DEPTH = 3;

/** @type {number} */
const MAX_CONSECUTIVE_FAILURES = 2;

/** @type {string} */
const SKILL_PATH = '.agents/skills/adversarial-review/SKILL.md';

/** @type {string} */
const FIXER_SKILL_PATH = '.agents/skills/addressing-adversarial-review/SKILL.md';

/**
 * @param {string} args - Raw argument string
 * @param {string} cwd - Default working directory
 * @returns {LoopOptions}
 */
function parseOptions(args, cwd) {
  /** @type {Record<string, string>} */
  const map = {};
  for (const token of args.split(/\s+/)) {
    const m = token.match(/^--(\w[\w-]*)=(.+)/);
    if (m) map[m[1]] = m[2];
  }

  return {
    reviewerModel: map['reviewer-model'] ?? DEFAULT_REVIEWER,
    fixerModel: map['fixer-model'] ?? DEFAULT_FIXER,
    maxLoops: parseInt(map['max-loops'] ?? map['depth'] ?? String(DEFAULT_DEPTH), 10),
    targetDir: map['target-dir'] ?? map['dir'] ?? cwd,
    reviewName: map['name'] ?? 'adversarial',
    fresh: map['fresh'] === 'true' || map['fresh'] === '1',
  };
}

/**
 * Parse options, capturing errors as a discriminated union so the caller
 * gets a fully-typed `LoopOptions` after the `ok` check (no `Object` widenings).
 * @param {string} args
 * @param {string} cwd
 * @returns {ParsedOptions}
 */
function tryParseOptions(args, cwd) {
  try {
    return { ok: true, opts: parseOptions(args, cwd) };
  } catch (err) {
    return { ok: false, err };
  }
}

/**
 * @param {string} cwd - Project root
 * @returns {boolean}
 */
function verifySkill(cwd) {
  return (
    fs.existsSync(path.join(cwd, SKILL_PATH)) &&
    fs.existsSync(path.join(cwd, FIXER_SKILL_PATH))
  );
}

/**
 * Resolve the review file path. Per the adversarial-review skill Step 0:
 * - If the directory exists and contains `.md` files and `fresh` is false,
 *   reuse the highest existing numeric code (re-review, overwrite in place).
 * - Otherwise start at the next unused code (`001` if new, else highest+1).
 *
 * Numeric portion is extracted via regex so non-numeric prefixes
 * (e.g. `SPEC_001.md`) are ignored per the skill's spec.
 *
 * @param {string} cwd
 * @param {string} reviewName
 * @param {boolean} fresh
 * @returns {string} Absolute path to the review file
 */
function resolveReviewFile(cwd, reviewName, fresh) {
  const dir = path.join(cwd, '.agents/reviews', reviewName);
  if (!fs.existsSync(dir)) return path.join(dir, '001.md');

  const nums = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const m = f.match(/(\d+)\.md$/);
      return m ? parseInt(m[1], 10) : null;
    })
    .filter((/** @type {number | null} */ n) => n !== null);

  if (nums.length === 0) return path.join(dir, '001.md');

  const highest = Math.max(...nums);
  const code = fresh ? highest + 1 : highest;
  return path.join(dir, `${String(code).padStart(3, '0')}.md`);
}

/**
 * Parse the `## Summary` block of a review file. Returns null if the file
 * is missing or unparseable. Used to detect the all-terminal termination
 * condition (no `Open`/`In Review`/`Escalated` findings remain). Lives in
 * `parse-summary.js` so it can be unit-tested in isolation — see
 * `test/parse-summary.test.js` (regression coverage for finding F15).
 */

/**
 * @param {number} cycle
 * @param {number} total
 * @param {string} phase
 * @param {string} status
 * @returns {string}
 */
function statusLine(cycle, total, phase, status) {
  return `● adversarial-review-loop [${cycle}/${total}] ${phase}: ${status}`;
}

/**
 * @param {import('@earendil-works/pi-coding-agent').ExtensionAPI} pi
 */
export default function adversarialReviewLoopExtension(pi) {
  pi.registerCommand('adversarial-review-loop', {
    description:
      'Run an adversarial review loop: reviewer (heavy) → fixer (cheap) cycle, ' +
      'coordinating through a shared review file at .agents/reviews/<name>/<code>.md ' +
      'using the adversarial-review v3 per-finding protocol (Status/Attempts/Discussion).',
    handler: async (args, ctx) => {
      const parsed = tryParseOptions(args, ctx.cwd);
      if (!parsed.ok) {
        ctx.ui.notify(
          (parsed.err instanceof Error ? parsed.err.message : String(parsed.err)),
          'error',
        );
        return;
      }
      const opts = parsed.opts;

      if (!verifySkill(ctx.cwd)) {
        ctx.ui.notify(
          `Required skills not found at ${SKILL_PATH} or ${FIXER_SKILL_PATH}. ` +
            'Run from a project with both skills installed.',
          'error',
        );
        return;
      }
      ctx.ui.notify(
        '[adversarial-review-loop] Verified: adversarial-review + addressing-adversarial-review skills present.',
        'info',
      );

      const reviewFile = resolveReviewFile(ctx.cwd, opts.reviewName, opts.fresh);
      const reReview = fs.existsSync(reviewFile) && !opts.fresh;

      ctx.ui.setStatus('adversarial-review-loop', '● starting');
      ctx.ui.notify(
        `[adversarial-review-loop] file=${reviewFile} reReview=${reReview} ` +
          `reviewer=${opts.reviewerModel} fixer=${opts.fixerModel} ` +
          `depth=${opts.maxLoops} dir=${opts.targetDir}`,
        'info',
      );

      let cycle = 0;
      let consecutiveFailures = 0;

      // Reviewer persists across cycles — same context remembers prior findings.
      // The reviewer writes the review file directly (Step 8 / Step 9 of the skill).
      const reviewer = await createPersistentAgent({
        model: opts.reviewerModel,
        systemPrompt: REVIEWER_SYSTEM,
        tools: TOOLS.reviewer,
        cwd: ctx.cwd,
      });

      try {
        while (cycle < opts.maxLoops) {
          cycle++;

          // --- REVIEWER ---
          ctx.ui.setStatus(
            'adversarial-review-loop',
            statusLine(cycle, opts.maxLoops, 'reviewer', 'running'),
          );
          console.log(
            `\n[adversarial-review-loop] Cycle ${cycle}/${opts.maxLoops} — Reviewer ` +
              (cycle === 1 && !reReview ? '(fresh review)' : '(re-review Step 9)'),
          );

          const reviewerTask =
            cycle === 1 && !reReview
              ? `Perform a thorough adversarial review of ${opts.targetDir}. ` +
                `Load and follow the adversarial-review skill at ${SKILL_PATH}; ` +
                `write the report to ${reviewFile} using its standard file structure. ` +
                'Audit Steps 2–7 of the skill; lead with the highest-severity findings. ' +
                'If no defects are found, state "No defects found." and list coverage areas.'
              : `Re-review the existing review file at ${reviewFile} by executing ` +
                `Step 9 of the adversarial-review skill at ${SKILL_PATH}. ` +
                'Read only that file; scope to non-terminal findings (Open, In Review, Escalated ' +
                'only if a [Human] turn resolved the escalation); verify each In Review finding ' +
                `against the actual code at ${opts.targetDir} (never trust [Fixer] turns as evidence); ` +
                'hunt Steps 2–7 for regressions; bump Iteration; append [Reviewer] turns; ' +
                'overwrite the file in place. Do NOT touch Attempts.';

          const reviewResult = await reviewer.prompt(reviewerTask);

          if (reviewResult.error) {
            ctx.ui.notify(`Reviewer error: ${reviewResult.error}`, 'error');
            consecutiveFailures++;
            if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
              ctx.ui.notify(
                `Reviewer failed ${consecutiveFailures} consecutive times. Escalating to human.`,
                'error',
              );
              ctx.ui.setStatus('adversarial-review-loop', '● adversarial-review-loop FAILED');
              return;
            }
            continue;
          }

          // Detect termination via the file's Summary block, not a STATUS line.
          const summary = parseSummary(reviewFile);
          if (isAllTerminal(summary)) {
            console.log(
              `[adversarial-review-loop] Reviewer: all findings terminal ` +
                `(Resolved=${summary?.resolved}, Won't Fix=${summary?.wontFix}). Closing loop.`,
            );
            ctx.ui.setStatus('adversarial-review-loop', '● adversarial-review-loop DONE');
            ctx.ui.notify('[adversarial-review-loop] Completed: all findings resolved or dismissed.', 'info');
            return;
          }

          if (summary && summary.open === 0 && summary.inReview === 0 && summary.escalated > 0) {
            console.log(
              '[adversarial-review-loop] Only Escalated findings remain — surfacing to human.',
            );
            ctx.ui.notify(
              `[adversarial-review-loop] ${summary.escalated} escalated finding(s) need human input. Review file: ${reviewFile}`,
              'warning',
            );
            ctx.ui.setStatus('adversarial-review-loop', '● adversarial-review-loop ESCALATED');
            return;
          }

          consecutiveFailures = 0; // reviewer succeeded this cycle

          // --- FIXER ---
          ctx.ui.setStatus(
            'adversarial-review-loop',
            statusLine(cycle, opts.maxLoops, 'fixer', 'running'),
          );
          console.log(`[adversarial-review-loop] Cycle ${cycle}/${opts.maxLoops} — Fixer`);

          const fixerTask =
            `Resolve the findings in the review file at ${reviewFile}. ` +
            `Load and follow the addressing-adversarial-review skill at ${FIXER_SKILL_PATH} ` +
            'as your governing pipeline: triage findings by Status, enforce the per-finding ' +
            'Attempts ceiling (Max Attempts from Review Metadata, default 3), apply minimal ' +
            'fixes in severity order to the code under ' +
            `${opts.targetDir}, verify with the repo real checks (typecheck/lint/tests), ` +
            'increment Attempts per attempt, set Status to In Review after local verification ' +
            'passes (or leave Open on failure), append [Fixer] turns to each finding\'s ' +
            '### Discussion thread, and overwrite the review file in place. ' +
            'Do NOT touch Iteration or any reviewer-authored field. Escalate findings at the ceiling.';

          const fixResult = await runAgent({
            model: opts.fixerModel,
            systemPrompt: FIXER_SYSTEM,
            task: fixerTask,
            tools: TOOLS.fixer,
            cwd: ctx.cwd,
          });

          if (fixResult.error) {
            ctx.ui.notify(`Fixer error: ${fixResult.error}`, 'error');
            consecutiveFailures++;
            if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
              ctx.ui.notify(
                `Fixer failed ${consecutiveFailures} consecutive times. Escalating to human.`,
                'error',
              );
              ctx.ui.setStatus('adversarial-review-loop', '● adversarial-review-loop FAILED');
              return;
            }
            continue;
          }

          consecutiveFailures = 0; // fixer ran

          // If the fixer left nothing for the reviewer (everything terminal),
          // the next reviewer cycle will detect it; cheaper to peek now.
          const postFix = parseSummary(reviewFile);
          if (postFix && isAllTerminal(postFix)) {
            console.log('[adversarial-review-loop] Fixer advanced all findings to terminal status.');
          }
        }

        ctx.ui.setStatus('adversarial-review-loop', undefined);
        ctx.ui.notify(
          `[adversarial-review-loop] Max loops (${opts.maxLoops}) reached. Review file: ${reviewFile}`,
          'warning',
        );
      } finally {
        reviewer.dispose();
      }
    },
  });
}