import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AgeGateModal } from '@/components/common/AgeGateModal';

describe('AgeGateModal (#855)', () => {
  it('renders nothing when closed', () => {
    render(<AgeGateModal open={false} onClose={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.queryByText(/18 years of age/i)).not.toBeInTheDocument();
  });

  it('confirms the age gate', () => {
    const onConfirm = vi.fn();
    render(<AgeGateModal open onClose={vi.fn()} onConfirm={onConfirm} />);

    expect(screen.getByText(/18 years of age/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /18 or older/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('cancels without confirming', () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(<AgeGateModal open onClose={onClose} onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
