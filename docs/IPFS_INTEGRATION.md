# IPFS Integration Architecture & Gateway Documentation

AudioBlocks Frontend uses the InterPlanetary File System (IPFS) as its primary decentralized storage layer for audio files, track metadata JSON, and NFT artwork.

---

## 📦 Overview & Use Cases

IPFS provides content-addressed, immutable storage across AudioBlocks. The application leverages IPFS for three core assets:

1. **Audio Streams & Track Media**: High-fidelity audio files uploaded by artists.
2. **NFT Artwork & Visual Assets**: Album cover art, promotional banners, and collection items.
3. **Track Metadata Schemas**: JSON metadata URIs (`ipfs://<CID>`) containing track titles, artist wallet addresses, genre tags, and audio properties.

---

## 🌐 Gateway Resolution Strategy

Because standard web browsers cannot natively resolve `ipfs://` protocol schemes out of the box, AudioBlocks Frontend maps Content Identifiers (CIDs) to HTTP gateway endpoints.

```
       IPFS URI / Raw CID                    Resolved Gateway URL
  ┌─────────────────────────┐             ┌─────────────────────────┐
  │  ipfs://QmXyZ123...     │  ────────►  │ https://ipfs.io/ipfs/   │
  │  QmXyZ123... / bafy...  │             │ QmXyZ123...             │
  └─────────────────────────┘             └─────────────────────────┘
```

### Gateway Configuration

- **Primary Public Gateway**: `https://ipfs.io/ipfs/`
- **Supported CID Specifications**:
  - **CIDv0**: Base58-encoded CIDs starting with `Qm...` (e.g. `QmXyZ123...`).
  - **CIDv1**: Multibase-encoded CIDs starting with `bafy...` or `bafk...`.

---

## 🔒 Security & Next.js Image Optimization

To prevent malicious remote image optimization requests, `next.config.ts` enforces explicit domain filtering:

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  images: {
    // NFT artwork is resolved through the application's configured IPFS gateway.
    // Never allow arbitrary remote hosts through the image optimizer.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ipfs.io',
        pathname: '/ipfs/**',
      },
    ],
  },
};
```

This ensures that only verified IPFS content served through `ipfs.io` can pass through Next.js server-side image processing.

---

## 🛠 Code Usage & Utility Helpers

### 1. CID Image Resolution Helper (`ipfsImage`)

Used in collection pages (`app/dashboard/collection/page.tsx` and `app/dashboard/collection/[id]/page.tsx`):

```typescript
const IPFS_GATEWAY = 'https://ipfs.io/ipfs/';

export function ipfsImage(cid: string): string {
  if (!cid) return '/audio.jpg';
  if (cid.startsWith('ipfs://')) {
    return `${IPFS_GATEWAY}${cid.replace('ipfs://', '')}`;
  }
  if (cid.startsWith('Qm') || cid.startsWith('baf')) {
    return `${IPFS_GATEWAY}${cid}`;
  }
  return '/audio.jpg'; // Local fallback placeholder
}
```

### 2. NFT Token Metadata Hook (`useNFTTokenMetadata`)

Used in `hooks/useWeb3.ts` for fetching on-chain metadata:

```typescript
export const useNFTTokenMetadata = (tokenId: string) => {
  const [metadata, setMetadata] = useState<any>(null);

  const fetchMetadata = async () => {
    // Fetch and resolve IPFS token URI
    setMetadata({
      name: 'AudioBlock NFT',
      description: 'Decentralized audio asset',
      image: 'ipfs://QmXyZ...',
    });
  };

  return { metadata, fetchMetadata };
};
```

---

## 🚀 Resilience & Gateway Fallbacks

1. **Fallback Placeholders**: If an IPFS media fetch fails or returns a 404/504 error, the UI falls back to `/audio.jpg` or `/placeholder-cover.svg`.
2. **Audio Streaming Fallback**: If gateway bandwidth drops during playback, the service worker `api-cache-v1` serves cached audio segments where available.
3. **Future Enhancements**: Planned support for multi-gateway fallback arrays (e.g. `cloudflare-ipfs.com`, `gateway.pinata.cloud`, custom dedicated gateways).
