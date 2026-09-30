import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines conditional class names and merges conflicting Tailwind classes.
 *
 * @example
 * ```ts
 * cn('px-2', isActive && 'text-brand', 'px-4');
 * // Returns: 'text-brand px-4' when isActive is true.
 * ```
 *
 * @param inputs - Class names, conditional values, arrays, or class name maps.
 * @returns A normalized class-name string with Tailwind conflicts resolved.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Formats a raw count into a compact, human-readable string.
 *
 * @example
 * ```ts
 * formatCount(1500); // '1.5k'
 * formatCount(2_000_000); // '2M'
 * ```
 *
 * @param num - The raw count to format.
 * @returns `'0'` for zero, otherwise the count abbreviated with a `k`/`M`
 *   suffix past 1,000/1,000,000, or the plain number below that.
 */
export function formatCount(num: number): string {
  if (num === 0) return '0';
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
  return num.toString();
}
