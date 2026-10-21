import { ExternalLink } from 'lucide-react';
import {
  getIpfsUrl,
  getStellarContractUrl,
  shortenId,
  type StellarNetwork,
} from '@/lib/stellarExplorer';

export type MintStatus = 'not_minted' | 'pending' | 'minted';

export interface OnChainInfoProps {
  mintStatus: MintStatus;
  onChainSongId?: string;
  onChainTokenId?: string;
  contractId?: string;
  metadataCid?: string;
  /** Royalty share in basis points (250 = 2.5%). */
  royaltyBps?: number;
  network?: StellarNetwork;
  className?: string;
}

const linkClassName =
  'inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 hover:underline break-all';

function formatRoyalty(bps: number): string {
  return `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 2)}%`;
}

/**
 * Provenance details for a song minted on Stellar. Renders a status line for
 * unminted and in-progress songs, and a verifiable summary (explorer and
 * IPFS links) once the song is minted.
 */
export function OnChainInfo({
  mintStatus,
  onChainSongId,
  onChainTokenId,
  contractId,
  metadataCid,
  royaltyBps,
  network = 'testnet',
  className = '',
}: OnChainInfoProps) {
  if (mintStatus === 'not_minted') {
    return (
      <p className={`text-sm text-gray-400 ${className}`} data-testid="on-chain-status">
        Not minted
      </p>
    );
  }

  if (mintStatus === 'pending') {
    return (
      <p
        aria-live="polite"
        className={`text-sm text-gray-400 ${className}`}
        data-testid="on-chain-status"
        role="status"
      >
        Minting…
      </p>
    );
  }

  const contractUrl = contractId ? getStellarContractUrl(contractId, network) : null;
  const metadataUrl = metadataCid ? getIpfsUrl(metadataCid) : null;

  return (
    <section aria-labelledby="on-chain-heading" className={`space-y-2 ${className}`}>
      <h3 className="text-sm font-semibold text-white" id="on-chain-heading">
        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-400 border border-emerald-500/30">
          Minted on Stellar
        </span>
      </h3>

      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs text-gray-300">
        {onChainSongId && (
          <>
            <dt className="text-gray-500">Song ID</dt>
            <dd className="font-mono">{onChainSongId}</dd>
          </>
        )}

        {onChainTokenId && (
          <>
            <dt className="text-gray-500">Token ID</dt>
            <dd className="font-mono">{onChainTokenId}</dd>
          </>
        )}

        {contractId && (
          <>
            <dt className="text-gray-500">Contract</dt>
            <dd>
              {contractUrl ? (
                <a
                  className={linkClassName}
                  href={contractUrl}
                  rel="noopener noreferrer"
                  target="_blank"
                  aria-label={`View contract ${contractId} on Stellar Expert (opens in new tab)`}
                >
                  <code className="font-mono">{shortenId(contractId)}</code>
                  <ExternalLink aria-hidden="true" className="h-3 w-3" />
                </a>
              ) : (
                <code className="font-mono">{shortenId(contractId)}</code>
              )}
            </dd>
          </>
        )}

        {metadataCid && (
          <>
            <dt className="text-gray-500">Metadata</dt>
            <dd>
              {metadataUrl ? (
                <a
                  className={linkClassName}
                  href={metadataUrl}
                  rel="noopener noreferrer"
                  target="_blank"
                  aria-label="View token metadata on IPFS (opens in new tab)"
                >
                  <span className="font-mono">{shortenId(metadataCid)}</span>
                  <ExternalLink aria-hidden="true" className="h-3 w-3" />
                </a>
              ) : (
                <span className="font-mono">{shortenId(metadataCid)}</span>
              )}
            </dd>
          </>
        )}

        {typeof royaltyBps === 'number' && (
          <>
            <dt className="text-gray-500">Royalty</dt>
            <dd>{formatRoyalty(royaltyBps)} on resale</dd>
          </>
        )}
      </dl>
    </section>
  );
}
