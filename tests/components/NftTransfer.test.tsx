import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NftTransfer } from '@/components/NftTransfer';

vi.mock('@/hooks/useSorobanRelay', () => ({
  useSorobanRelay: () => ({
    relay: vi.fn().mockResolvedValue({}),
    isPending: false,
  }),
}));

describe('NftTransfer', () => {
  const mockOnSuccess = vi.fn();
  const mockSongId = BigInt(123);

  beforeEach(() => {
    mockOnSuccess.mockClear();
  });

  describe('Stellar address validation', () => {
    it('should validate Stellar addresses starting with G', () => {
      render(<NftTransfer songId={mockSongId} onSuccess={mockOnSuccess} />);

      const input = screen.getByPlaceholderText(/Recipient address/i);
      fireEvent.change(input, { target: { value: 'GBRPYHIL2CI3WHZKYCJ4IEVOLVCZJBbuckmmrv2W3ZVHTHUTSVSYAKZ7' } });

      const button = screen.getByRole('button', { name: /Transfer NFT/i });
      expect(button).not.toBeDisabled();
    });

    it('should reject addresses not starting with G', () => {
      render(<NftTransfer songId={mockSongId} onSuccess={mockOnSuccess} />);

      const input = screen.getByPlaceholderText(/Recipient address/i);
      fireEvent.change(input, { target: { value: 'CBRPYHIL2CI3WHZKYCJ4IEVOLVCZJBUCKMMRV2W3ZVHTHUTSVSYAKZ7' } });

      const button = screen.getByRole('button', { name: /Transfer NFT/i });
      expect(button).toBeDisabled();
    });

    it('should reject addresses with incorrect length', () => {
      render(<NftTransfer songId={mockSongId} onSuccess={mockOnSuccess} />);

      const input = screen.getByPlaceholderText(/Recipient address/i);
      fireEvent.change(input, { target: { value: 'GBRPYHIL2CI3WHZKYCJ4IEVOLVCZJBUCKMMRV2' } });

      const button = screen.getByRole('button', { name: /Transfer NFT/i });
      expect(button).toBeDisabled();
    });

    it('should display error for invalid address format', () => {
      render(<NftTransfer songId={mockSongId} onSuccess={mockOnSuccess} />);

      const input = screen.getByPlaceholderText(/Recipient address/i);
      fireEvent.change(input, { target: { value: 'invalid-address' } });

      expect(screen.getByText(/Invalid address format/i)).toBeInTheDocument();
    });
  });

  describe('Confirmation step', () => {
    it('should show confirmation dialog when transfer is initiated', async () => {
      render(<NftTransfer songId={mockSongId} onSuccess={mockOnSuccess} />);

      const input = screen.getByPlaceholderText(/Recipient address/i);
      fireEvent.change(input, { target: { value: 'GBRPYHIL2CI3WHZKYCJ4IEVOLVCZJBUCKMMRV2W3ZVHTHUTSVSYAKZ7' } });

      const button = screen.getByRole('button', { name: /Transfer NFT/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText(/Confirm Transfer/i)).toBeInTheDocument();
      });
    });

    it('should display irreversibility warning in confirmation', async () => {
      render(<NftTransfer songId={mockSongId} onSuccess={mockOnSuccess} />);

      const input = screen.getByPlaceholderText(/Recipient address/i);
      fireEvent.change(input, { target: { value: 'GBRPYHIL2CI3WHZKYCJ4IEVOLVCZJBUCKMMRV2W3ZVHTHUTSVSYAKZ7' } });

      const button = screen.getByRole('button', { name: /Transfer NFT/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText(/This action is permanent and cannot be undone/i)).toBeInTheDocument();
      });
    });

    it('should allow canceling the transfer', async () => {
      render(<NftTransfer songId={mockSongId} onSuccess={mockOnSuccess} />);

      const input = screen.getByPlaceholderText(/Recipient address/i);
      fireEvent.change(input, { target: { value: 'GBRPYHIL2CI3WHZKYCJ4IEVOLVCZJBUCKMMRV2W3ZVHTHUTSVSYAKZ7' } });

      fireEvent.click(screen.getByRole('button', { name: /Transfer NFT/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Recipient address/i)).toBeInTheDocument();
      });
    });

    it('should warn when transferring to self', async () => {
      localStorage.setItem('userStellarAddress', 'GBRPYHIL2CI3WHZKYCJ4IEVOLVCZJBUCKMMRV2W3ZVHTHUTSVSYAKZ7');

      render(<NftTransfer songId={mockSongId} onSuccess={mockOnSuccess} />);

      const input = screen.getByPlaceholderText(/Recipient address/i);
      fireEvent.change(input, { target: { value: 'GBRPYHIL2CI3WHZKYCJ4IEVOLVCZJBUCKMMRV2W3ZVHTHUTSVSYAKZ7' } });

      fireEvent.click(screen.getByRole('button', { name: /Transfer NFT/i }));

      await waitFor(() => {
        expect(screen.getByText(/transferring to your own account/i)).toBeInTheDocument();
      });

      localStorage.removeItem('userStellarAddress');
    });
  });
});
