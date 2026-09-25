/**
 * Mastra agent configuration with version pinning (#449).
 *
 * Every version below is pinned to an exact release. Floating ranges
 * (`^`, `~`, `*`, `x`) are rejected by `assertPinnedMastraConfig` so a
 * stray caret can never let the agent drift to an untested model or SDK
 * release. To upgrade, change a pin deliberately in this file and run the
 * full AI quality filter against the new version before shipping.
 */

export interface MastraAgentConfig {
  /** Pinned Mastra SDK release used by the song quality filter agent. */
  mastra: string;
  /** Pinned Mastra core runtime release. */
  mastraCore: string;
  /** NVIDIA NIM model id the agent targets. */
  modelId: string;
  /** Pinned model release; NVIDIA retires old model versions, so this must be exact. */
  modelVersion: string;
  /** Pinned prompt template version kept in lockstep with eval suites. */
  promptTemplateVersion: string;
}

export const MASTRA_AGENT_CONFIG: Readonly<MastraAgentConfig> = Object.freeze({
  mastra: '0.10.15',
  mastraCore: '0.13.6',
  modelId: 'nvidia/llama-3.1-nemotron-70b-instruct',
  modelVersion: '1.2.0',
  promptTemplateVersion: '2026-09-01',
});

/**
 * Returns true when `version` is an exact pin rather than a floating range
 * (`^1.2.3`, `~1.2.3`, `*`, `1.x`) or an empty string.
 */
export function isPinnedVersion(version: string): boolean {
  if (version.trim() === '') return false;
  return !/^[\^~]|^latest$|\*|x/i.test(version);
}

/**
 * Throws when any pin in the Mastra agent configuration is a floating
 * range or empty. Run at app startup so a bad edit fails fast instead of
 * silently upgrading the agent mid-release.
 */
export function assertPinnedMastraConfig(config: MastraAgentConfig = MASTRA_AGENT_CONFIG): void {
  const entries: Array<[keyof MastraAgentConfig, string]> = [
    ['mastra', config.mastra],
    ['mastraCore', config.mastraCore],
    ['modelVersion', config.modelVersion],
    ['promptTemplateVersion', config.promptTemplateVersion],
  ];

  for (const [name, version] of entries) {
    if (!isPinnedVersion(version)) {
      throw new Error(`Mastra agent config: '${name}' must be pinned to an exact version, got '${version}'`);
    }
  }

  if (config.modelId.trim() === '') {
    throw new Error("Mastra agent config: 'modelId' must not be empty");
  }
}
