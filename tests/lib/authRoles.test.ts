import { describe, expect, it } from 'vitest';
import {
  AUTH_ROLE_SELECTED_EVENT,
  AUTH_ROLES,
  CONNECT_WALLET_PROMPT_COPY,
  isAuthRole,
} from '@/lib/authRoles';

describe('authRoles (#476)', () => {
  it('exposes listener and artist roles', () => {
    expect(AUTH_ROLES.LISTENER).toBe('listener');
    expect(AUTH_ROLES.ARTIST).toBe('artist');
  });

  it('narrows only valid roles', () => {
    expect(isAuthRole('listener')).toBe(true);
    expect(isAuthRole('artist')).toBe(true);
    expect(isAuthRole('admin')).toBe(false);
    expect(isAuthRole(undefined)).toBe(false);
    expect(isAuthRole(null)).toBe(false);
  });

  it('uses one shared event name for prompt → auth communication', () => {
    expect(AUTH_ROLE_SELECTED_EVENT).toBe('audioblocks:select-auth-role');
  });

  it('provides differentiated copy for the two roles', () => {
    expect(CONNECT_WALLET_PROMPT_COPY.listener.title).not.toBe(
      CONNECT_WALLET_PROMPT_COPY.artist.title
    );
    expect(CONNECT_WALLET_PROMPT_COPY.listener.description).toBeTruthy();
    expect(CONNECT_WALLET_PROMPT_COPY.artist.description).toBeTruthy();
  });
});
