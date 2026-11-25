// Runtime feature-flag overrides (#815).
//
// Serves `window.__AUDIOBLOCKS_RUNTIME_CONFIG__` as a script that the root
// layout loads before hydration (`beforeInteractive`). The values come from the
// server-only `RUNTIME_FEATURE_*` variables, which are read on every request.
// They are never inlined at build time, so a flag can be changed by updating the
// server environment and restarting it, without rebuilding the app.
//
// Unset variables are left out, so the build-time `NEXT_PUBLIC_FEATURE_*` value
// (or the NODE_ENV default) keeps applying to that flag.
import { FEATURE_FLAGS, type FeatureFlagName } from '@/lib/featureFlags';
import { RUNTIME_CONFIG_GLOBAL, type RuntimeConfig } from '@/lib/runtimeConfig';

export const dynamic = 'force-dynamic';

function readRuntimeConfig(env: NodeJS.ProcessEnv): RuntimeConfig {
  const featureFlags: RuntimeConfig['featureFlags'] = {};
  for (const flag of Object.keys(FEATURE_FLAGS) as FeatureFlagName[]) {
    const value = env[FEATURE_FLAGS[flag].runtimeEnvVar]?.trim();
    if (value) featureFlags[flag] = value;
  }
  return { featureFlags };
}

export function GET() {
  const config = readRuntimeConfig(process.env);
  return new Response(`window.${RUNTIME_CONFIG_GLOBAL} = ${JSON.stringify(config)};\n`, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
