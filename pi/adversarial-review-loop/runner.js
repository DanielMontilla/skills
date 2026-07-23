import {
  createAgentSession,
  SessionManager,
  DefaultResourceLoader,
  getAgentDir,
} from '@earendil-works/pi-coding-agent';

/**
 * @typedef {{ text: string, error: string | undefined }} AgentRunResult
 */

/**
 * @typedef {{ model: string, systemPrompt: string, tools: readonly string[], cwd: string }} AgentSessionOptions
 */

/**
 * @typedef {AgentSessionOptions & { task: string }} AgentRunOptions
 */

/**
 * @typedef {{ prompt: (task: string, timeoutMs?: number) => Promise<AgentRunResult>, dispose: () => void }} PersistentAgent
 */

/**
 * @param {import('@earendil-works/pi-coding-agent').AgentSessionEvent[]} events
 * @returns {string}
 */
function extractAssistantText(events) {
  let text = '';
  for (const event of events) {
    if (event.type !== 'message_end') continue;
    const msg = /** @type {{ role?: string; content?: unknown }} */ (
      /** @type {any} */ (event).message
    );
    if (msg.role !== 'assistant') continue;
    const content = msg.content;
    if (typeof content === 'string') {
      text = content;
    } else if (Array.isArray(content)) {
      text = content
        .filter((c) => /** @type {{ type?: string }} */ (c).type === 'text')
        .map((c) => /** @type {{ text?: string }} */ (c).text ?? '')
        .join('');
    }
  }
  return text.trim();
}

/**
 * @param {import('@earendil-works/pi-coding-agent').AgentSessionEvent} event
 * @param {string} label
 */
function onToolStart(event, label) {
  const e = /** @type {{ args?: unknown, toolName?: string }} */ (/** @type {unknown} */ (event));
  const args =
    e.args && typeof e.args === 'object'
      ? JSON.stringify(e.args).slice(0, 120)
      : '';
  console.log(`  [${label}] → ${e.toolName ?? ''}${args ? ` ${args}` : ''}`);
}

/**
 * @param {import('@earendil-works/pi-coding-agent').AgentSessionEvent} event
 * @param {string} label
 */
function onToolEnd(event, label) {
  const e = /** @type {{ isError?: boolean, toolName?: string }} */ (/** @type {unknown} */ (event));
  const marker = e.isError ? '✗' : '←';
  console.log(`  [${label}] ${marker} ${e.toolName ?? ''}`);
}

/**
 * @param {import('@earendil-works/pi-coding-agent').AgentSession} session
 * @param {string} task
 * @param {string} modelLabel
 * @param {number} [timeoutMs]
 * @returns {Promise<AgentRunResult>}
 */
async function runOneTurn(session, task, modelLabel, timeoutMs = 600000) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Agent run timed out after ${timeoutMs}ms`)), timeoutMs)
  );

  /** @type {import('@earendil-works/pi-coding-agent').AgentSessionEvent[]} */
  const events = [];
  const unsub = session.subscribe((event) => {
    events.push(event);
    if (event.type === 'tool_execution_start') onToolStart(event, modelLabel);
    if (event.type === 'tool_execution_end') onToolEnd(event, modelLabel);
  });

  try {
    await Promise.race([
      (async () => {
        await session.prompt(task);
        await session.agent.waitForIdle();
      })(),
      timeout,
    ]);
  } catch (err) {
    return { text: '', error: err instanceof Error ? err.message : String(err) };
  } finally {
    unsub();
  }

  const text = extractAssistantText(events);
  return text
    ? { text, error: undefined }
    : { text: '', error: 'No assistant response produced' };
}

/**
 * Run a single-use agent: one prompt, fresh context.
 * @param {AgentRunOptions} options
 * @param {number} [timeoutMs]
 * @returns {Promise<AgentRunResult>}
 */
export async function runAgent(options, timeoutMs) {
  const session = await createSession(options);
  try {
    return await runOneTurn(session, options.task, options.model, timeoutMs);
  } finally {
    session.dispose();
  }
}

/**
 * Creates an agent session that persists across multiple prompts.
 * The same context (system prompt, conversation history) carries forward.
 * Use for the reviewer so it remembers previous cycles' findings.
 * @param {AgentSessionOptions} options
 * @param {number} [defaultTimeoutMs]
 * @returns {Promise<PersistentAgent>}
 */
export async function createPersistentAgent(options, defaultTimeoutMs) {
  const session = await createSession(options);
  return {
    prompt: (task, timeoutMs) => runOneTurn(session, task, options.model, timeoutMs ?? defaultTimeoutMs),
    dispose: () => {
      session.dispose();
    },
  };
}

/**
 * Creates an agent session with skill auto-loading intentionally disabled
 * (`noSkills: true`). The pi loop references adversarial-review and
 * addressing-adversarial-review as data dependencies through their file paths
 * (see REVIEWER_SYSTEM / FIXER_SYSTEM in agents.js) rather than relying on
 * the `executing-skills` auto-loading pipeline. Each agent reads the skill
 * file fresh every run, so skill updates propagate without a code change.
 * This is option (b) of finding F6 — explicit data-dependency reference over
 * hardcoded skill content. The agents have `read`, so they load the files
 * themselves.
 *
 * The reviewer is created as a persistent agent via `createPersistentAgent`,
 * carrying conversation history across cycles so it remembers prior findings.
 * To prevent unbounded context growth, when the cycle count exceeds 3 the
 * reviewer task is prefixed with a context-summarization instruction
 * (see `reReviewPrefix` in index.js). The review file remains the canonical
 * state; the persistent context is a convenience, not a necessity.
 *
 * @param {AgentSessionOptions} options
 * @returns {Promise<import('@earendil-works/pi-coding-agent').AgentSession>}
 */
async function createSession(options) {
  const loader = new DefaultResourceLoader({
    cwd: options.cwd,
    agentDir: getAgentDir(),
    systemPrompt: options.systemPrompt,
    noExtensions: true,
    noSkills: true,
    noPromptTemplates: true,
    noThemes: true,
    noContextFiles: true,
  });
  await loader.reload();

  const { session } = await createAgentSession({
    cwd: options.cwd,
    model: /** @type {any} */ (options.model),
    tools: [...options.tools],
    sessionManager: SessionManager.inMemory(),
    resourceLoader: loader,
  });

  return session;
}