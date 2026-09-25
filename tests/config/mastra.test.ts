import { describe, it, expect } from 'vitest';
import {
  MASTRA_AGENT_CONFIG,
  assertPinnedMastraConfig,
  isPinnedVersion,
} from '@/config/mastra';

describe('isPinnedVersion', () => {
  it.each(['1.2.3', '0.13.6', '2026-09-01', '1.2.0-rc.1'])(
    'accepts the exact pin %s',
    (version) => {
      expect(isPinnedVersion(version)).toBe(true);
    }
  );

  it.each(['^1.2.3', '~1.2.3', '*', '1.x', 'latest', ''])(
    'rejects the floating range %s',
    (version) => {
      expect(isPinnedVersion(version)).toBe(false);
    }
  );
});

describe('MASTRA_AGENT_CONFIG', () => {
  it('is frozen so pins cannot be mutated at runtime', () => {
    expect(Object.isFrozen(MASTRA_AGENT_CONFIG)).toBe(true);
  });

  it('pins every version to an exact release', () => {
    expect(() => assertPinnedMastraConfig(MASTRA_AGENT_CONFIG)).not.toThrow();
  });
});

describe('assertPinnedMastraConfig', () => {
  it.each([
    ['mastra', { ...MASTRA_AGENT_CONFIG, mastra: '^0.10.15' }],
    ['mastraCore', { ...MASTRA_AGENT_CONFIG, mastraCore: '*' }],
    ['modelVersion', { ...MASTRA_AGENT_CONFIG, modelVersion: 'latest' }],
    ['promptTemplateVersion', { ...MASTRA_AGENT_CONFIG, promptTemplateVersion: '' }],
  ])('throws on a floating %s', (name, config) => {
    expect(() => assertPinnedMastraConfig(config)).toThrow(
      `Mastra agent config: '${name}' must be pinned to an exact version`
    );
  });

  it('throws on an empty modelId', () => {
    const config = { ...MASTRA_AGENT_CONFIG, modelId: '  ' };
    expect(() => assertPinnedMastraConfig(config)).toThrow(
      "Mastra agent config: 'modelId' must not be empty"
    );
  });
});
