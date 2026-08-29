/**
 * Lightweight, dependency-free sanitizer for user-generated text fields
 * (profile bio, display name, comments, etc.) — see issue #274.
 *
 * Strips HTML tags entirely rather than escaping them, so the resulting
 * string is safe to store and to render as plain text anywhere in the
 * app (including any future `dangerouslySetInnerHTML` usage), not just
 * inside JSX text nodes that React already auto-escapes.
 */
export function sanitizeUserInput(value: string): string {
  if (!value) return value;

  return value
    // Drop script/style blocks and their contents outright.
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '')
    // Strip all remaining HTML tags.
    .replace(/<\/?[a-z][^>]*>/gi, '')
    // Neutralize inline event-handler / javascript: URI patterns that
    // could survive as plain text and be reinterpreted elsewhere.
    .replace(/on\w+\s*=/gi, '')
    .replace(/javascript:/gi, '')
    .trim();
}
