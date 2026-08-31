/**
 * Conventional Commits enforcement (#302).
 *
 * The README / CONTRIBUTING.md already ask for Conventional Commits; this
 * makes it real. Enforced locally via the Husky `commit-msg` hook and in CI
 * via `.github/workflows/commitlint.yml`.
 *
 * Beyond the `@commitlint/config-conventional` defaults we allow the two
 * extra types this repo already uses in its history and CONTRIBUTING guide:
 * `a11y` and `security`.
 */

/** @type {import('@commitlint/types').UserConfig} */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'build',
        'chore',
        'ci',
        'docs',
        'feat',
        'fix',
        'perf',
        'refactor',
        'revert',
        'style',
        'test',
        'a11y',
        'security',
      ],
    ],
    // Historical commits and merge subjects vary in length; keep the header
    // bound generous rather than rejecting otherwise-valid work.
    'header-max-length': [2, 'always', 100],
    // Body / footer line length is advisory only.
    'body-max-line-length': [1, 'always', 100],
    'footer-max-line-length': [1, 'always', 100],
  },
  // Don't lint merge commits, reverts, or dependabot/release-bot subjects.
  ignores: [
    (message) =>
      /^Merge (branch|pull request|remote-tracking branch)/.test(message) ||
      /^Revert /.test(message) ||
      /^\d+\.\d+\.\d+/.test(message),
  ],
};
