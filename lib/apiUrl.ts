/** Accept both documented API origins and bases ending in /api. */
export function getApiUrl(path: string): string {
  const base = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/api\/?$/, '').replace(/\/$/, '');
  return `${base}/api/${path.replace(/^\/?api\//, '').replace(/^\//, '')}`;
}
export function getStreamUrl(id: string): string {
  return getApiUrl(`song/stream/${encodeURIComponent(id)}`);
}
