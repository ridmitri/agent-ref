/**
 * Agents supported by the Explorer context menu.
 */
export type AgentTarget = 'codex' | 'opencode' | 'claudeCode' | 'cursor';

/**
 * Metadata shared by the manifest-facing and runtime agent integrations.
 *
 * `directMenuSettingKey` is relative to the `agentRef` configuration
 * namespace. `promptArgument` describes how the prompt is passed to the
 * corresponding CLI: as a positional argument or after a named option.
 */
export type AgentMetadata = {
  target: AgentTarget;
  displayLabel: string;
  executable: string;
  commandId: string;
  directMenuSettingKey: string;
  promptArgument: 'positional' | '--prompt';
};

/**
 * Single source of truth for the supported Explorer agents.
 */
export const AGENT_METADATA: Readonly<Record<AgentTarget, AgentMetadata>> = {
  codex: {
    target: 'codex',
    displayLabel: 'Codex',
    executable: 'codex',
    commandId: 'agentRef.sendToCodex',
    directMenuSettingKey: 'showCodexInTopLevelMenu',
    promptArgument: 'positional'
  },
  opencode: {
    target: 'opencode',
    displayLabel: 'OpenCode',
    executable: 'opencode',
    commandId: 'agentRef.sendToOpenCode',
    directMenuSettingKey: 'showOpenCodeInTopLevelMenu',
    promptArgument: '--prompt'
  },
  claudeCode: {
    target: 'claudeCode',
    displayLabel: 'Claude Code',
    executable: 'claude',
    commandId: 'agentRef.sendToClaudeCode',
    directMenuSettingKey: 'showClaudeCodeInTopLevelMenu',
    promptArgument: 'positional'
  },
  cursor: {
    target: 'cursor',
    displayLabel: 'Cursor',
    executable: 'agent',
    commandId: 'agentRef.sendToCursor',
    directMenuSettingKey: 'showCursorInTopLevelMenu',
    promptArgument: 'positional'
  }
};

/**
 * Default prompt used by Explorer agent actions.
 *
 * `<PATH>` is replaced with the selected resource's absolute path before the
 * complete prompt is passed to the target CLI as one shell argument.
 */
export const DEFAULT_PROMPT =
  `For this session, "the path" refers to "<PATH>". Do not inspect it yet; wait for a later request.`;

/**
 * Resolve a configured prompt template for an Explorer resource.
 *
 * A template can place the selected path anywhere, and can include it more
 * than once. When no placeholder is present, retain the configured text and
 * add the required path line exactly as specified by the preference contract.
 */
export function buildAgentPrompt(
  promptTemplate: string,
  absolutePath: string
): string {
  if (promptTemplate.includes('<PATH>')) {
    return promptTemplate.split('<PATH>').join(absolutePath);
  }

  return `${promptTemplate}\n path: ${absolutePath}`;
}

/**
 * Build the command sent to the integrated POSIX shell.
 *
 * The path is embedded in the prompt as data and the complete prompt is
 * single-quoted before it is sent to the shell. This keeps whitespace,
 * quotes, glob characters, and shell metacharacters in the selected path
 * inside one argument. The command therefore assumes the local terminal
 * uses a POSIX-compatible shell (for example, zsh or bash).
 */
export function buildAgentCommand(
  target: AgentTarget,
  absolutePath: string,
  promptTemplate: string = DEFAULT_PROMPT
): string {
  const prompt = buildAgentPrompt(promptTemplate, absolutePath);
  const quotedPrompt = quotePosixShellArgument(prompt);
  const metadata = AGENT_METADATA[target];

  if (metadata.promptArgument === 'positional') {
    return `${metadata.executable} ${quotedPrompt}`;
  }

  return `${metadata.executable} ${metadata.promptArgument} ${quotedPrompt}`;
}

/**
 * Quote one argument for a POSIX shell using the shell's single-quote form.
 * An embedded apostrophe ends the quote, emits an escaped apostrophe, and
 * starts the quote again.
 */
function quotePosixShellArgument(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}
