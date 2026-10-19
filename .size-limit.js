// Performance budget enforced via `size-limit` in CI (see .github/workflows/performance.yml).
//
// We measure the actual Next.js production output (`.next/static/...`) produced by
// `next build`, running size-limit against the built files directly (@size-limit/file).
// Budgets were chosen from a baseline `next build` and sit above current values so they
// catch large regressions (e.g. a heavy dependency added to a route, or the shared
// wallet/vendor bundle ballooning) without failing on routine churn:
//   - App route client JS (all routes):  ~92 kB now  -> 1 MB budget
//   - Shared client JS (framework/vendor): ~1.7 MB now (dominated by @dynamic-labs/wagmi) -> 2 MB budget
//   - Static assets in public/: 500 KB max per file to prevent mobile performance regressions
module.exports = [
  {
    name: 'App route client JS (all routes, raw)',
    path: '.next/static/chunks/app/**/*.js',
    limit: '1 MB',
  },
  {
    name: 'Shared client JS (framework + vendors, raw)',
    path: '.next/static/chunks/*.js',
    limit: '2 MB',
  },
  {
    name: 'Static assets (images, SVGs)',
    path: 'public/**/*.{svg,png,jpg,jpeg,webp}',
    limit: '500 KB',
  },
];
