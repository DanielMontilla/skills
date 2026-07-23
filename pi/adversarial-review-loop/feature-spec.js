import fs from 'node:fs';
import path from 'node:path';
import { runAgent } from './runner.js';
import { FIXER_SYSTEM, TOOLS } from './agents.js';

const FIXER_TIMEOUT = 600000;

/** @type {string} */
const FIXER_SKILL_PATH = '.agents/skills/addressing-adversarial-review/SKILL.md';

/**
 * Parses YAML frontmatter (--- delimited) and returns key-value pairs.
 * Does not handle complex YAML — only simple `key: value` lines.
 * @param {string} content
 * @returns {Record<string, string>}
 */
function parseFrontmatter(content) {
  const m = content.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  /** @type {Record<string, string>} */
  const result = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^(\w[\w-]*)\s*:\s*(.+)$/);
    if (kv) result[kv[1]] = kv[2].trim();
  }
  return result;
}

/**
 * Scans TASK.md files in a directory and returns their parsed frontmatter + metadata.
 * @param {string} dir
 * @returns {{ id: string, name: string, type: string, status: string, dirName: string }[]}
 */
function scanTaskFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  /** @type {{ id: string, name: string, type: string, status: string, dirName: string }[]} */
  const tasks = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const taskMd = path.join(dir, entry.name, 'TASK.md');
    if (!fs.existsSync(taskMd)) continue;
    try {
      const content = fs.readFileSync(taskMd, 'utf8');
      const fm = parseFrontmatter(content);
      tasks.push({
        id: fm.id || '',
        name: fm.name || entry.name,
        type: fm.type || '',
        status: fm.status || '',
        dirName: entry.name,
      });
    } catch {
      // skip unreadable files
    }
  }
  return tasks;
}

/**
 * Extracts the phase letter and numeric portion from a task ID like "A099".
 * @param {string} taskId
 * @returns {{ phase: string, num: number }}
 */
function parseTaskId(taskId) {
  const m = taskId.match(/^([A-Z])(\d+)$/);
  if (!m) return { phase: '?', num: 0 };
  return { phase: m[1], num: parseInt(m[2], 10) };
}

/**
 * Generates the next sequential task ID after the given one.
 * e.g. A099 → A100, B005 → B006
 * @param {string} currentId
 * @returns {string}
 */
function nextTaskId(currentId) {
  const { phase, num } = parseTaskId(currentId);
  return `${phase}${String(num + 1).padStart(3, '0')}`;
}

// ─── Feature Spec Loading ────────────────────────────────────────────

/**
 * @typedef {{ featureDir: string, featureName: string, lockedPhases: string[], taskTableRows: string[] }} FeatureSpec
 */

/**
 * Reads and parses a feature spec from `.agents/features/<specName>/`.
 * @param {string} cwd
 * @param {string} specName
 * @returns {{ ok: true, spec: FeatureSpec } | { ok: false, err: string }}
 */
export function loadFeatureSpec(cwd, specName) {
  const featureDir = path.join(cwd, '.agents/features', specName);
  if (!fs.existsSync(featureDir)) {
    return { ok: false, err: `Feature spec directory not found: ${featureDir}` };
  }

  const featureMd = path.join(featureDir, 'FEATURE.md');
  if (!fs.existsSync(featureMd)) {
    return { ok: false, err: `FEATURE.md not found in ${featureDir}` };
  }

  try {
    const content = fs.readFileSync(featureMd, 'utf8');
    const fm = parseFrontmatter(content);
    const lockedPhases = (fm['locked-phases'] || '')
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);

    // Parse task table rows (lines between first --- and last --- in body)
    const bodyMatch = content.match(/---\n([\s\S]*?)\n---/);
    const taskTableRows = [];
    if (bodyMatch) {
      const bodyLines = bodyMatch[1].split('\n');
      let inTable = false;
      for (const line of bodyLines) {
        if (line.startsWith('|') && !inTable) {
          // Check if this looks like a table header
          inTable = line.includes('ID') && line.includes('Type');
        }
        if (inTable) {
          taskTableRows.push(line);
          if (!line.trim().startsWith('|') || (line.trim() !== line.trim().replace(/\|/g, '').trim())) {
            // End of table: line doesn't start with | or is separator
            if (!line.trim().startsWith('|') || /^\|?\s*[-:]+\s*\|/.test(line)) {
              // Keep separator row, but stop after it
              if (/^\|?\s*[-:]+\s*\|/.test(line)) {
                // do nothing, keep going
              } else {
                break;
              }
            }
          }
        }
      }
    }

    return { ok: true, spec: { featureDir, featureName: specName, lockedPhases, taskTableRows } };
  } catch (err) {
    return { ok: false, err: `Failed to parse FEATURE.md: ${err instanceof Error ? err.message : String(err)}` };
  }
}

// ─── Active Phase Detection ──────────────────────────────────────────

/**
 * Determines the active phase by scanning all TASK.md files in the feature
 * directory. Returns the first phase (by order A→Z) that has non-complete
 * tasks and is not locked. Also returns the review task within that phase
 * (highest-numbered task with type=review).
 *
 * @param {FeatureSpec} spec
 * @param {string[]} [lockedPhases]
 * @returns {{ phase: string, phaseDir: string, reviewTask: { id: string, memoryPath: string, reviewFile: string } | null, highestTaskId: string } | null}
 */
export function findActivePhase(spec, lockedPhases) {
  const featureDir = spec.featureDir;
  const entries = fs.readdirSync(featureDir, { withFileTypes: true });

  // Collect phase directories (single uppercase letter names)
  /** @type {{ phase: string, dir: string }[]} */
  const phases = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (/^[A-Z]$/.test(entry.name) && !lockedPhases?.includes(entry.name)) {
      phases.push({ phase: entry.name, dir: path.join(featureDir, entry.name) });
    }
  }

  // Sort phases alphabetically
  phases.sort((a, b) => a.phase.localeCompare(b.phase));

  for (const { phase, dir } of phases) {
    const tasks = scanTaskFiles(dir);
    if (tasks.length === 0) continue;

    // Check if there are non-complete tasks
    const hasNonComplete = tasks.some((t) => t.status !== 'complete');
    if (!hasNonComplete) continue;

    // Find the review task (highest-numbered task with type=review)
    const reviewTasks = tasks.filter((t) => t.type === 'review').sort((a, b) => b.id.localeCompare(a.id));
    const reviewTask = reviewTasks.length > 0 ? reviewTasks[0] : null;

    // Find the highest task ID in this phase
    const allIds = tasks.map((t) => t.id).sort();
    const highestTaskId = allIds.length > 0 ? allIds[allIds.length - 1] : '';

    return {
      phase,
      phaseDir: dir,
      reviewTask: reviewTask
        ? {
            id: reviewTask.id,
            memoryPath: path.join(dir, reviewTask.dirName, 'MEMORY.md'),
            reviewFile: path.join(dir, reviewTask.dirName, 'REVIEW.md'),
          }
        : null,
      highestTaskId,
    };
  }

  return null;
}

// ─── Review Loop Counter ─────────────────────────────────────────────

/**
 * Reads the existing review loop counter from a MEMORY.md file.
 * @param {string} memoryPath
 * @returns {number} Current iteration count (0 if absent)
 */
export function getReviewLoopCounter(memoryPath) {
  if (!fs.existsSync(memoryPath)) return 0;
  try {
    const content = fs.readFileSync(memoryPath, 'utf8');
    const section = content.match(/## Review Loop Counter\s*$([\s\S]*?)(?=^##|\Z)/m);
    if (!section) return 0;

    const lines = section[1].trim().split('\n');
    let maxIter = 0;
    for (const line of lines) {
      const m = line.match(/Iteration\s+(\d+)/);
      if (m) {
        const iter = parseInt(m[1], 10);
        if (iter > maxIter) maxIter = iter;
      }
    }
    return maxIter;
  } catch {
    return 0;
  }
}

/**
 * Appends an iteration log line to the review task's MEMORY.md.
 * Creates the ## Review Loop Counter section if missing.
 * @param {string} memoryPath
 * @param {number} iteration
 * @param {number} findingCount
 * @param {number} taskCount
 */
export function updateReviewLoopCounter(memoryPath, iteration, findingCount, taskCount) {
  const line = `- Iteration ${iteration}: ${findingCount} finding(s) found, ${taskCount} remediation task(s) created`;

  if (!fs.existsSync(memoryPath)) {
    fs.writeFileSync(memoryPath, `# MEMORY\n\n## Review Loop Counter\n${line}\n`);
    return;
  }

  try {
    const content = fs.readFileSync(memoryPath, 'utf8');
    const sectionRe = /## Review Loop Counter\s*$/m;

    if (sectionRe.test(content)) {
      // Append after existing section
      const updated = content.replace(sectionRe, `$&\n${line}\n`);
      fs.writeFileSync(memoryPath, updated);
    } else {
      // Add new section at end
      fs.writeFileSync(memoryPath, `${content.trimEnd()}\n\n## Review Loop Counter\n${line}\n`);
    }
  } catch {
    // If we can't write, just continue — the loop will still work
  }
}

// ─── Finding Extraction ──────────────────────────────────────────────

/**
 * @typedef {{ id: string, severity: string, problem: string, status: string, location: string }} Finding
 */

/**
 * Parses individual findings from a review file.
 * Extracts F<n> blocks under each severity heading.
 * @param {string} reviewFilePath
 * @returns {Finding[]}
 */
export function extractFindings(reviewFilePath) {
  if (!fs.existsSync(reviewFilePath)) return [];

  try {
    const content = fs.readFileSync(reviewFilePath, 'utf8');
    /** @type {Finding[]} */
    const findings = [];

    // Split by finding headers: #### F<N> — <title>
    const findingBlocks = content.split(/(?=^#### F\d+)/m);

    for (const block of findingBlocks) {
      const idMatch = block.match(/^#### (F\d+) — (.+)$/m);
      if (!idMatch) continue;

      const id = idMatch[1];
      const title = idMatch[2].trim();

      const sevMatch = block.match(/- \*\*Severity\*\*: (.+)$/m);
      const locMatch = block.match(/- \*\*Location\*\*: `(.+?)`/m);
      const probMatch = block.match(/- \*\*Problem\*\*: (.+?)(?:\n- \*\*Impact\*\*)/m);
      const statusMatch = block.match(/- \*\*Status\*\*: (.+)$/m);

      findings.push({
        id,
        severity: sevMatch ? sevMatch[1].trim() : 'Unknown',
        location: locMatch ? locMatch[1] : 'unknown',
        problem: probMatch ? probMatch[1].trim() : title,
        status: statusMatch ? statusMatch[1].trim() : 'Open',
      });
    }

    return findings;
  } catch {
    return [];
  }
}

// ─── Remediation Task Creation ───────────────────────────────────────

/**
 * Creates remediation tasks for accepted findings.
 * Each task goes in its own directory: `<PHASE><NNN>-remediate-f<n>/`
 *
 * @param {Finding[]} findings - Open/non-terminal findings to create tasks for
 * @param {string} phaseLetter - The active phase letter (e.g., 'A')
 * @param {string} highestTaskId - Highest existing task ID in phase (e.g., 'A099')
 * @param {string} reviewTaskId - The review task ID (used for depends-on)
 * @param {string} featureDir - Path to the feature directory
 * @param {string} reviewFile - Path to the review file
 * @returns {{ taskDirs: string[], taskIds: string[] }}
 */
export function createRemediationTasks(findings, phaseLetter, highestTaskId, reviewTaskId, featureDir, reviewFile) {
  let nextNum = parseTaskId(highestTaskId).num;
  /** @type {{ taskDirs: string[], taskIds: string[] }} */
  const result = { taskDirs: [], taskIds: [] };

  for (const finding of findings) {
    nextNum++;
    const taskId = `${phaseLetter}${String(nextNum).padStart(3, '0')}`;
    const taskDirName = `remediate-${finding.id.toLowerCase()}`;
    const taskDir = path.join(featureDir, phaseLetter, taskDirName);

    fs.mkdirSync(taskDir, { recursive: true });

    // Write TASK.md
    const taskMd = `---
id: ${taskId}
name: ${taskDirName}
type: defect
originator: defect:${reviewTaskId}
depends-on: ${reviewTaskId}
finding-ref: ${finding.id}
status: pending
---

# Task ${taskId}: Remediate Finding ${finding.id}

## Type: defect

## Description
Fix ${finding.id} from the adversarial review.

## Requirements
- Address the problem described in the review: ${finding.problem}
- Pass all verification gates (lint, test, typecheck)

## Completion
- [ ] Code compiles / Tests pass
- [ ] Output summarized in MEMORY.md
`;
    fs.writeFileSync(path.join(taskDir, 'TASK.md'), taskMd);

    // Write MEMORY.md
    const memoryMd = `# MEMORY

## Finding Context
- **Finding**: ${finding.id}
- **Severity**: ${finding.severity}
- **Location**: ${finding.location}
- **Problem**: ${finding.problem}
- **Review File**: ${reviewFile}
`;
    fs.writeFileSync(path.join(taskDir, 'MEMORY.md'), memoryMd);

    result.taskDirs.push(taskDir);
    result.taskIds.push(taskId);
  }

  return result;
}

// ─── FEATURE.md Task Table Update ────────────────────────────────────

/**
 * Appends rows for new remediation tasks to the FEATURE.md task table.
 * @param {string} featureMdPath
 * @param {{ id: string, name: string }[]} newTasks
 * @returns {boolean} True if the file was updated
 */
export function updateFeatureTaskTable(featureMdPath, newTasks) {
  if (!fs.existsSync(featureMdPath)) return false;

  try {
    let content = fs.readFileSync(featureMdPath, 'utf8');

    // Find the task table and append rows before the closing | of the last data row
    // Look for the pattern: | <existing tasks> | ... |
    // Insert new rows after the last existing task row

    const lines = content.split('\n');
    const newRows = newTasks.map((t) => `| ${t.id} | ${t.name} | defect | pending |`);

    // Find the last row that starts with `| ` and contains a task ID pattern
    let insertIdx = -1;
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].match(/^\| [A-Z]\d+/)) {
        insertIdx = i + 1;
        break;
      }
    }

    if (insertIdx === -1) {
      // Fallback: append before the last non-empty line
      for (let i = lines.length - 1; i >= 0; i--) {
        if (lines[i].trim()) {
          insertIdx = i + 1;
          break;
        }
      }
    }

    if (insertIdx === -1) return false;

    // Insert new rows
    const inserted = [...newRows, lines[insertIdx]];
    lines.splice(insertIdx, 1, ...inserted);

    fs.writeFileSync(featureMdPath, lines.join('\n'));
    return true;
  } catch {
    return false;
  }
}

// ─── Fixer Execution for Remediation ─────────────────────────────────

/**
 * Spawns fixer agents to resolve specific findings. Runs each finding's
 * remediation as a separate agent invocation so they can be tracked independently.
 *
 * @param {string} targetDir
 * @param {string} reviewFile
 * @param {string} cwd
 * @param {string} model
 * @returns {Promise<{ success: number, failed: number }>}
 */
export async function executeRemediations(targetDir, reviewFile, cwd, model) {
  const fixerTask =
    `Resolve the findings in the review file at ${reviewFile}. ` +
    `Load and follow the addressing-adversarial-review skill at ${FIXER_SKILL_PATH} ` +
    'as your governing pipeline: triage findings by Status, enforce the per-finding ' +
    'Attempts ceiling (Max Attempts from Review Metadata, default 3), apply minimal ' +
    'fixes in severity order to the code under ' +
    `${targetDir}, verify with the repo real checks (typecheck/lint/tests), ` +
    'increment Attempts per attempt, set Status to In Review after local verification ' +
    'passes (or leave Open on failure), append [Fixer] turns to each finding\'s ' +
    '### Discussion thread, and overwrite the review file in place. ' +
    'Do NOT touch Iteration or any reviewer-authored field. Escalate findings at the ceiling.';

  const result = await runAgent({
    model,
    systemPrompt: FIXER_SYSTEM,
    task: fixerTask,
    tools: TOOLS.fixer,
    cwd,
  }, FIXER_TIMEOUT);

  if (result.error) {
    console.log(`[adversarial-review-loop] Fixer error during remediation: ${result.error}`);
    return { success: 0, failed: 1 };
  }

  return { success: 1, failed: 0 };
}
