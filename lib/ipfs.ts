/**
 * IPFS → HTTP gateway resolution for cover art (#595).
 *
 * Accepts `ipfs://` URIs, bare CIDs (optionally followed by a sub-path) and full
 * gateway URLs (path style `/ipfs/<cid>` or subdomain style `<cid>.ipfs.<host>`),
 * and rewrites them onto the configured gateway. Every result is built from a
 * validated CID and checked to stay under `/ipfs/<cid>`, so a crafted value
 * cannot change the host or escape the IPFS path. All functions are O(n) in the
 * input length.
 */

/** Public fallback gateway. Its host is always allowed in `next.config.ts`. */
export const PUBLIC_IPFS_GATEWAY = 'https://ipfs.io';

// CIDv0: base58btc multihash, 46 chars starting with "Qm" (CID spec §6.2).
// CIDv1: the multibases the spec says implementations SHOULD support (§3):
// base32 "b" (what Pinata returns), base58btc "z", base16 "f".
const CID_PATTERN =
  /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[a-z2-7]{50,}|z[1-9A-HJ-NP-Za-km-z]{40,}|f[0-9a-f]{60,})$/;

/**
 * Reduces a configured gateway (`https://x.mypinata.cloud/ipfs/` or a bare host)
 * to its origin, matching how `next.config.ts` builds the allowed image pattern.
 */
export function toGatewayOrigin(value: string | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  try {
    const url = new URL(/^[a-z]+:\/\//i.test(raw) ? raw : `https://${raw}`);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.origin : null;
  } catch {
    return null;
  }
}

/** Primary gateway: `NEXT_PUBLIC_IPFS_GATEWAY` (e.g. a Pinata dedicated gateway) or the public one. */
export const IPFS_GATEWAY =
  toGatewayOrigin(process.env.NEXT_PUBLIC_IPFS_GATEWAY) ?? PUBLIC_IPFS_GATEWAY;

/** Splits `<cid>[/sub/path]` into a validated CID and its remaining path. */
function splitContentPath(contentPath: string): { cid: string; rest: string } | null {
  const slash = contentPath.indexOf('/');
  const cid = slash === -1 ? contentPath : contentPath.slice(0, slash);
  if (!CID_PATTERN.test(cid)) return null;
  return { cid, rest: slash === -1 ? '' : contentPath.slice(slash) };
}

/** Extracts `<cid>[/sub/path]` from any supported IPFS reference, or `null` if it is not one. */
function extractContentPath(value: string): { cid: string; rest: string } | null {
  const input = value.trim();

  if (input.toLowerCase().startsWith('ipfs://')) {
    // Tolerate the legacy `ipfs://ipfs/<cid>` form.
    return splitContentPath(input.slice('ipfs://'.length).replace(/^ipfs\//, ''));
  }

  if (!/^https?:\/\//i.test(input)) return splitContentPath(input);

  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return null;
  }

  if (url.pathname.startsWith('/ipfs/')) {
    return splitContentPath(url.pathname.slice('/ipfs/'.length));
  }

  // Subdomain gateways: https://<cid>.ipfs.<host>/<path>
  const [subdomain, namespace] = url.hostname.split('.');
  if (namespace === 'ipfs' && CID_PATTERN.test(subdomain)) {
    return { cid: subdomain, rest: url.pathname === '/' ? '' : url.pathname };
  }

  return null;
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
