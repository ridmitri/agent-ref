/**
 * Agents supported by the Explorer context menu.
 */
export type AgentTarget = 'codex' | 'opencode' | 'claudeCode' | 'cursor';

/**
 * Metadata shared by the manifest-facing and runtime agent integrations.
 *
 * `directMenuSettingKey` is relative to the `agentRef` configuration
 * namespace.
 */
export type AgentMetadata = {
  target: AgentTarget;
  displayLabel: string;
  executable: string;
  commandId: string;
  directMenuSettingKey: string;
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
    directMenuSettingKey: 'showCodexInTopLevelMenu'
  },
  opencode: {
    target: 'opencode',
    displayLabel: 'OpenCode',
    executable: 'opencode',
    commandId: 'agentRef.sendToOpenCode',
    directMenuSettingKey: 'showOpenCodeInTopLevelMenu'
  },
  claudeCode: {
    target: 'claudeCode',
    displayLabel: 'Claude Code',
    executable: 'claude',
    commandId: 'agentRef.sendToClaudeCode',
    directMenuSettingKey: 'showClaudeCodeInTopLevelMenu'
  },
  cursor: {
    target: 'cursor',
    displayLabel: 'Cursor',
    executable: 'agent',
    commandId: 'agentRef.sendToCursor',
    directMenuSettingKey: 'showCursorInTopLevelMenu'
  }
};

/** Build an interactive agent launch without delivering a startup message. */
export function buildAgentCommand(target: AgentTarget): string {
  return AGENT_METADATA[target].executable;
}
