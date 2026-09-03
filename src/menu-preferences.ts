import {
  AgentMetadata,
  AgentTarget
} from './agent-command';

/**
 * Context keys used to control the visibility of direct Explorer actions.
 *
 * Configuration values cannot be referenced directly from a menu `when`
 * clause, so extension activation mirrors each preference into one of these
 * explicit keys.
 */
export const TOP_LEVEL_MENU_CONTEXT_KEYS: Readonly<Record<AgentTarget, string>> = {
  codex: 'agentRef.showCodexInTopLevelMenu',
  opencode: 'agentRef.showOpenCodeInTopLevelMenu',
  claudeCode: 'agentRef.showClaudeCodeInTopLevelMenu',
  cursor: 'agentRef.showCursorInTopLevelMenu'
};

export type MenuContextUpdate = {
  contextKey: string;
  value: boolean;
};

export type AgentConfiguration = {
  get<T>(section: string, defaultValue: T): T;
};

/**
 * Map one agent's configuration preference to the context value used by its
 * direct Explorer menu contribution.
 */
export function getTopLevelMenuContextUpdate(
  agent: AgentMetadata,
  configuration: AgentConfiguration
): MenuContextUpdate {
  return {
    contextKey: TOP_LEVEL_MENU_CONTEXT_KEYS[agent.target],
    value: configuration.get<boolean>(agent.directMenuSettingKey, true)
  };
}
