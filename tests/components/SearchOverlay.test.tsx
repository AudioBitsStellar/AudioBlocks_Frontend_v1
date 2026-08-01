import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import SearchOverlay from '@/components/common/SearchOverlay';

describe('SearchOverlay Integration Tests', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    // Render the component
    render(
      <div>
        <button data-testid="outside-button">Outside</button>
        <SearchOverlay />
      </div>
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const openOverlay = async () => {
    await user.keyboard('{Control>}k{/Control}');
  };

  it('Cmd+K opens the search overlay', async () => {
    expect(screen.queryByRole('dialog', { name: /search overlay/i })).not.toBeInTheDocument();
    
    await openOverlay();
    
    expect(screen.getByRole('dialog', { name: /search overlay/i })).toBeInTheDocument();
  });

  it('Focus moves to search input on open', async () => {
    await openOverlay();
    
    const searchInput = screen.getByRole('searchbox');
    expect(searchInput).toHaveFocus();
  });

  it('Down arrow moves to first result', async () => {
    await openOverlay();
    
    const searchInput = screen.getByRole('searchbox');
    
    // Type query to show results
    await user.type(searchInput, 'the');
    
    // Results should appear
    const listbox = screen.getByRole('listbox');
    expect(listbox).toBeInTheDocument();
    
    const options = screen.getAllByRole('option');
    expect(options.length).toBeGreaterThan(0);
    
    // Initially, none are selected
    options.forEach(opt => {
      expect(opt).toHaveAttribute('aria-selected', 'false');
    });
    
    // Press down arrow
    await user.keyboard('{ArrowDown}');
    
    // First option should be selected
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    expect(options[1]).toHaveAttribute('aria-selected', 'false');
  });

  it('Up/Down arrows navigate between results', async () => {
    await openOverlay();
    const searchInput = screen.getByRole('searchbox');
    await user.type(searchInput, 'the');
    
    const options = screen.getAllByRole('option');
    
    // Navigate down
    await user.keyboard('{ArrowDown}');
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    
    // Navigate down again
    await user.keyboard('{ArrowDown}');
    expect(options[0]).toHaveAttribute('aria-selected', 'false');
    expect(options[1]).toHaveAttribute('aria-selected', 'true');
    
    // Navigate up
    await user.keyboard('{ArrowUp}');
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    expect(options[1]).toHaveAttribute('aria-selected', 'false');
  });

  it('Enter on result triggers selection and closes overlay', async () => {
    await openOverlay();
    const searchInput = screen.getByRole('searchbox');
    await user.type(searchInput, 'the');
    
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{Enter}');
    
    // The overlay should close
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /search overlay/i })).not.toBeInTheDocument();
    });
  });

  it('Escape closes overlay and restores focus', async () => {
    // Focus the outside button first
    const outsideBtn = screen.getByTestId('outside-button');
    outsideBtn.focus();
    expect(outsideBtn).toHaveFocus();
    
    // Open overlay
    await openOverlay();
    
    const searchInput = screen.getByRole('searchbox');
    expect(searchInput).toHaveFocus();
    
    // Escape to close
    await user.keyboard('{Escape}');
    
    expect(screen.queryByRole('dialog', { name: /search overlay/i })).not.toBeInTheDocument();
    
    // Focus should be restored
    await waitFor(() => {
      expect(outsideBtn).toHaveFocus();
    });
  });

  it('Focus trap prevents Tab from leaving overlay', async () => {
    await openOverlay();
    
    const searchInput = screen.getByRole('searchbox');
    expect(searchInput).toHaveFocus();
    
    // Press Tab
    await user.keyboard('{Tab}');
    
    // Focus should remain on the search input
    expect(searchInput).toHaveFocus();
  });
});
