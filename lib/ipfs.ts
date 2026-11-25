/**
 * Centralized IPFS gateway utilities.
 */


/** Public fallback gateway. Its host is always allowed in `next.config.ts`. */
export const PUBLIC_IPFS_GATEWAY = 'https://ipfs.io';

/** Splits `<cid>[/sub/path]` into a validated CID and its remaining path. */
function splitContentPath(contentPath: string): { cid: string; rest: string } | null {
  const slash = contentPath.indexOf('/');
  const cid = slash === -1 ? contentPath : contentPath.slice(0, slash);
  if (!CID_PATTERN.test(cid)) return null;
  return { cid, rest: slash === -1 ? '' : contentPath.slice(slash) };
}

/**
 * Converts an IPFS reference to an HTTP URL on `gateway`.
 *
 * @param cidOrUri - `ipfs://<cid>[/path]`, a bare CID, or a gateway URL.
 * @param gateway - Gateway origin; defaults to the configured primary gateway.
 * @returns The gateway URL, or `null` when the value is not a valid IPFS reference.
 */
export function ipfsToHttp(cidOrUri: string, gateway: string = IPFS_GATEWAY): string | null {
  const content = extractContentPath(cidOrUri);
  if (!content) return null;

  const base = `/ipfs/${content.cid}`;
  const url = new URL(`${base}${content.rest}`, gateway);
  // `..` segments are resolved by URL; reject anything that left the CID root.
  if (url.pathname !== base && !url.pathname.startsWith(`${base}/`)) return null;
  return url.toString();
}

/**
 * Ordered gateway URLs to try for an IPFS reference: the primary gateway, then the
 * public gateway when it differs. Empty when the value is not an IPFS reference.
 */
export function ipfsGatewayUrls(cidOrUri: string): string[] {
  const primary = ipfsToHttp(cidOrUri, IPFS_GATEWAY);
  if (!primary) return [];
  const secondary = ipfsToHttp(cidOrUri, PUBLIC_IPFS_GATEWAY);
  return secondary && secondary !== primary ? [primary, secondary] : [primary];
}
export const IPFS_GATEWAY = process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://ipfs.io/ipfs/';

/**
 * Converts an IPFS CID, ipfs:// URI, or HTTP URL into a resolved gateway URL.
 * Passes through https:// and http:// URLs directly.
 */
export function ipfsUrl(cidOrUri: string | null | undefined): string {
  if (!cidOrUri) return '';
  const trimmed = cidOrUri.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
    return trimmed;
  }

  let cleaned = trimmed;
  if (cleaned.startsWith('ipfs://')) {
    cleaned = cleaned.replace('ipfs://', '');
  }
  if (cleaned.startsWith('ipfs/')) {
    cleaned = cleaned.replace('ipfs/', '');
  }

  const base = IPFS_GATEWAY.endsWith('/') ? IPFS_GATEWAY : `${IPFS_GATEWAY}/`;
  return `${base}${cleaned}`;
}
