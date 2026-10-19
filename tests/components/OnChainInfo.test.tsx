import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OnChainInfo } from '@/components/common/OnChainInfo';

const CONTRACT_ID = 'C' + 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.repeat(2).slice(0, 55);
const CID = 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi';

describe('OnChainInfo', () => {
  it('shows "Not minted" for songs that have not been minted', () => {
    render(<OnChainInfo mintStatus="not_minted" />);

    expect(screen.getByTestId('on-chain-status')).toHaveTextContent('Not minted');
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('shows a live "Minting…" status while the mint is pending', () => {
    render(<OnChainInfo mintStatus="pending" />);

    expect(screen.getByRole('status')).toHaveTextContent('Minting…');
    expect(screen.queryByText('Minted on Stellar')).not.toBeInTheDocument();
  });

  it('shows verifiable provenance with explorer and IPFS links once minted', () => {
    render(
      <OnChainInfo
        contractId={CONTRACT_ID}
        mintStatus="minted"
        metadataCid={CID}
        onChainSongId="42"
        onChainTokenId="7"
        royaltyBps={250}
      />
    );

    expect(screen.getByText('Minted on Stellar')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('2.5% on resale')).toBeInTheDocument();

    expect(
      screen.getByRole('link', {
        name: `View contract ${CONTRACT_ID} on Stellar Expert (opens in new tab)`,
      })
    ).toHaveAttribute('href', `https://stellar.expert/explorer/testnet/contract/${CONTRACT_ID}`);

    expect(
      screen.getByRole('link', { name: 'View token metadata on IPFS (opens in new tab)' })
    ).toHaveAttribute('href', `https://ipfs.io/ipfs/${CID}`);
  });

  it('omits the links and keeps the text when identifiers are malformed', () => {
    render(<OnChainInfo contractId="bad" mintStatus="minted" metadataCid="a/b" />);

    expect(screen.getByText('Minted on Stellar')).toBeInTheDocument();
    expect(screen.getByText('bad')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('omits the royalty row when no royalty is set', () => {
    render(<OnChainInfo mintStatus="minted" />);

    expect(screen.queryByText('Royalty')).not.toBeInTheDocument();
  });
});
