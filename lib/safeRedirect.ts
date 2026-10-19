/**
 * Validates and returns a safe redirect URL.
 * Only allows same-origin relative paths to prevent open redirect attacks.
 */
export function safeReturnTo(value: string | null, fallback = '/dashboard'): string {
  if (!value) return fallback;

  const trimmed = value.trim();

  // Must be a relative path starting with single /
  if (!trimmed.startsWith('/')) return fallback;

  // Reject protocol-relative URLs (//evil.com)
  if (trimmed.startsWith('//')) return fallback;

  // Reject backslash paths (/\evil.com)
  if (trimmed.startsWith('/\\')) return fallback;

  // Reject URLs with schemes (http:, https:, javascript:, etc)
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return fallback;

  // Reject encoded variants
  if (/%/i.test(trimmed)) {
    try {
      const decoded = decodeURIComponent(trimmed);
      // Check decoded value for dangerous patterns
      if (decoded.startsWith('//') || decoded.startsWith('/\\') || /^[a-z][a-z0-9+.-]*:/i.test(decoded)) {
        return fallback;
      }
    } catch {
      return fallback;
    }
  }

  // Valid relative path
  return trimmed;
}
