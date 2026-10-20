import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import AccountMenu from '@/components/auth/AccountMenu';

const AccountMenuHarness = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <AccountMenu
      email="listener@example.com"
      initial="L"
      isOpen={isOpen}
      variant="desktop"
      onLogout={() => undefined}
      onOpenChange={setIsOpen}
    />
  );
};

describe('AccountMenu', () => {
  it('opens with focus in the menu and supports arrow, Home, and End navigation', async () => {
    render(<AccountMenuHarness />);

    const trigger = screen.getByRole('button', { name: 'Account menu' });
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false, pointerType: 'mouse' });

    const menu = screen.getByRole('menu', { name: 'Account menu' });
    const profile = screen.getByRole('menuitem', { name: 'Profile' });
    const logOut = screen.getByRole('menuitem', { name: 'Log out' });
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await waitFor(() => expect(menu).toHaveFocus());

    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    await waitFor(() => expect(profile).toHaveFocus());
    fireEvent.keyDown(profile, { key: 'End' });
    await waitFor(() => expect(logOut).toHaveFocus());
    fireEvent.keyDown(logOut, { key: 'Home' });
    await waitFor(() => expect(profile).toHaveFocus());
  });

  it('closes on Escape and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    render(<AccountMenuHarness />);

    const trigger = screen.getByRole('button', { name: 'Account menu' });
    await user.click(trigger);
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes on Tab', async () => {
    const user = userEvent.setup();
    render(<AccountMenuHarness />);

    const trigger = screen.getByRole('button', { name: 'Account menu' });
    await user.click(trigger);
    const menu = screen.getByRole('menu', { name: 'Account menu' });
    const profile = screen.getByRole('menuitem', { name: 'Profile' });
    await waitFor(() => expect(menu).toHaveFocus());
    await user.keyboard('{ArrowDown}');
    fireEvent.keyDown(profile, { key: 'Tab' });
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
  });
});
