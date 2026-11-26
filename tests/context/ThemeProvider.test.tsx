import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ThemeProvider, useTheme, THEME_STORAGE_KEY } from '@/context/ThemeProvider';

function ThemeConsumer() {
  const { theme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="current-theme">{theme}</span>
      <button onClick={() => setTheme('dark')}>Set Dark</button>
      <button onClick={() => setTheme('light')}>Set Light</button>
      <button onClick={() => setTheme('system')}>Set System</button>
    </div>
  );
}

describe('ThemeProvider', () => {
  let listeners: Array<(e: any) => void> = [];
  let mediaMatches = false;

  beforeEach(() => {
    listeners = [];
    mediaMatches = false;
    localStorage.clear();
    document.documentElement.className = '';

    vi.stubGlobal('matchMedia', vi.fn((query: string) => ({
      matches: mediaMatches,
      media: query,
      onchange: null,
      addEventListener: vi.fn((event: string, listener: any) => {
        if (event === 'change') listeners.push(listener);
      }),
      removeEventListener: vi.fn((event: string, listener: any) => {
        listeners = listeners.filter((l) => l !== listener);
      }),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('provides default theme and applies system preference to document root', () => {
    mediaMatches = true; // prefers dark
    render(
      <ThemeProvider defaultTheme="system">
        <ThemeConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId('current-theme').textContent).toBe('system');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('updates theme, changes class on documentElement, and saves to localStorage', () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByText('Set Light'));
    expect(screen.getByTestId('current-theme').textContent).toBe('light');
    expect(document.documentElement.classList.contains('light')).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');

    fireEvent.click(screen.getByText('Set Dark'));
    expect(screen.getByTestId('current-theme').textContent).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.classList.contains('light')).toBe(false);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('syncs theme with audioblocks_user_preferences in localStorage', () => {
    localStorage.setItem(
      'audioblocks_user_preferences',
      JSON.stringify({ colorScheme: 'system', language: 'en' })
    );

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByText('Set Dark'));
    const prefs = JSON.parse(localStorage.getItem('audioblocks_user_preferences') || '{}');
    expect(prefs.colorScheme).toBe('dark');
  });

  it('responds to OS matchMedia changes live when theme is system', () => {
    render(
      <ThemeProvider defaultTheme="system">
        <ThemeConsumer />
      </ThemeProvider>
    );

    expect(document.documentElement.classList.contains('light')).toBe(true);

    // Simulate OS toggling to dark mode
    act(() => {
      mediaMatches = true;
      listeners.forEach((listener) => listener({ matches: true }));
    });

    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('throws error when useTheme is used outside of ThemeProvider', () => {
    expect(() => render(<ThemeConsumer />)).toThrow(
      'useTheme must be used within a ThemeProvider'
    );
  });
});
