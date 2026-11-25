const FORBIDDEN = {
  NEXT_PUBLIC_API_MOCKING: new Set(['1', 'true', 'enabled', 'on', 'yes']),
  NEXT_PUBLIC_ENABLE_DEVTOOLS: new Set(['1', 'true', 'enabled', 'on', 'yes']),
};

function assertSafeProductionFlags(env = process.env) {
  const enabled = Object.entries(FORBIDDEN)
    .filter(([name, values]) => values.has(String(env[name] ?? '').trim().toLowerCase()))
    .map(([name]) => name);
  if (enabled.length) {
    throw new Error(`Production build blocked: ${enabled.join(', ')} must be disabled for production artifacts.`);
  }
}

if (require.main === module) {
  try { assertSafeProductionFlags(); }
  catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
module.exports = { assertSafeProductionFlags };
