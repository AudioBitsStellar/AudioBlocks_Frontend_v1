const fs = require('node:fs');
const path = require('node:path');

const SECRET_IDENTIFIERS = [
  'SENTRY_AUTH_TOKEN',
  'NVIDIA_API_KEY',
  'NVIDIA_NIM_API_KEY',
  'OPENAI_API_KEY',
  'AI_API_KEY',
  'PRIVY_APP_SECRET',
];
const TOKEN_PATTERNS = [/nvapi-[A-Za-z0-9_-]{16,}/g, /sk-[A-Za-z0-9_-]{20,}/g];

function scanText(text, label = '<text>') {
  const findings = [];
  for (const name of SECRET_IDENTIFIERS) {
    if (text.includes(name)) findings.push(`${label}: contains ${name}`);
  }
  for (const pattern of TOKEN_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) findings.push(`${label}: contains a secret-shaped token`);
  }
  return findings;
}

function scanTree(dir) {
  const findings = [];
  if (!fs.existsSync(dir)) return findings;
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) findings.push(...scanText(fs.readFileSync(full, 'utf8'), path.relative(process.cwd(), full)));
    }
  };
  walk(dir);
  return findings;
}

function scanDockerfile(file = path.resolve('Dockerfile')) {
  const source = fs.readFileSync(file, 'utf8');
  return source
    .split(/\r?\n/)
    .map((line, index) => ({ line, index: index + 1 }))
    .filter(({ line }) => /^\s*(?:ARG|ENV)\b/.test(line) && SECRET_IDENTIFIERS.some((name) => line.includes(name)))
    .map(({ line, index }) => `Dockerfile:${index}: server secret exposed as build ARG/ENV: ${line.trim()}`);
}

function run() {
  const findings = [...scanTree(path.resolve('.next/static')), ...scanDockerfile()];
  if (findings.length) {
    console.error(findings.join('\n'));
    process.exitCode = 1;
  }
  return findings;
}

if (require.main === module) run();
module.exports = { SECRET_IDENTIFIERS, scanText, scanTree, scanDockerfile, run };
