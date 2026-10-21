import { describe, expect, it } from 'vitest';
import { sanitizeUserInput } from '@/lib/sanitize';

/**
 * `sanitizeUserInput` strips HTML from free-text fields (bio, display name,
 * comments). The regression it had (issue #719): after the tags are already
 * gone, two extra patterns (`on…=` and `javascript:`) were still scrubbing the
 * surviving plain text, silently mangling ordinary words like "online =" and
 * "javascript:". Those patterns are gone, so ordinary text must pass through
 * untouched while genuine markup is still removed.
 */
describe('sanitizeUserInput', () => {
  it('leaves ordinary plain text (including the old false positives) unchanged', () => {
    expect(sanitizeUserInput('Producer | online = always')).toBe('Producer | online = always');
    expect(sanitizeUserInput('online = always')).toBe('online = always');
    // "javascript:" as a spoken word must survive, now that the URL is no longer
    // a concern for a plain-text field.
    expect(sanitizeUserInput("I love javascript: it's fun")).toBe("I love javascript: it's fun");
    expect(sanitizeUserInput('onboarding = 1, onion = 2')).toBe('onboarding = 1, onion = 2');
  });

  it('returns empty input as-is', () => {
    expect(sanitizeUserInput('')).toBe('');
  });

  it('removes script and style blocks and their contents', () => {
    expect(sanitizeUserInput('<script>evil()</script>hello')).toBe('hello');
    expect(sanitizeUserInput('<style>p{}</style>hi')).toBe('hi');
    expect(sanitizeUserInput('<script type="text/javascript">x()</script>')).toBe('');
  });

  it('strips plain HTML tags', () => {
    expect(sanitizeUserInput('<div><b>x</b></div>')).toBe('x');
    expect(sanitizeUserInput('<img src="x" onerror="alert(1)">ok')).toBe('ok');
    expect(sanitizeUserInput('<span>bold</span> text')).toBe('bold text');
  });

  it('strips nested tags down to the inner text', () => {
    expect(sanitizeUserInput('<div><span><em>y</em></span></div>')).toBe('y');
  });

  it('preserves non-tag entities as plain text', () => {
    // Entities carry no markup; they are surfaced literally, which is what we
    // want for stored plain text.
    expect(sanitizeUserInput('5 &amp; 6')).toBe('5 &amp; 6');
    expect(sanitizeUserInput('a &lt; b')).toBe('a &lt; b');
  });

  it('trims surrounding whitespace', () => {
    expect(sanitizeUserInput('  <b>x</b>  ')).toBe('x');
  });
});
