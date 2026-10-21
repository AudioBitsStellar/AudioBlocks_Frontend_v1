/**
 * Lightweight, dependency-free sanitizer for user-generated text fields
 * (profile bio, display name, comments, etc.) — see issue #274.
 *
 * Strips HTML tags entirely rather than escaping them, so the resulting
 * string is safe to store and to render as plain text anywhere in the
 * app (including any future `dangerouslySetInnerHTML` usage), not just
 * inside JSX text nodes that React already auto-escapes.
 *
 * Once the tags are gone the remaining text is plain data, so we no longer
 * need to also hunt for inline event-handler or `javascript:` fragments —
 * those patterns used to false-positive on ordinary words (e.g. "online =",
 * "I love javascript: it's fun"). No caller renders the output as a URL, so
 * there is nothing left for those patterns to protect. If a future caller
 * does render sanitized output into an `href`, add a dedicated
 * `sanitizeUrl()` that only allows `http:`, `https:` and `mailto:`.
 */
export function sanitizeUserInput(value: string): string {
  if (!value) return value;

  return value
    // Drop script/style blocks and their contents outright.
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '')
    // Strip all remaining HTML tags.
    .replace(/<\/?[a-z][^>]*>/gi, '')
    .trim();
}
