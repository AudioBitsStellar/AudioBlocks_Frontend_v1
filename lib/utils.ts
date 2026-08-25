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

export function formatCount(num: number): string {
  if (num === 0) return '0';
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
  return num.toString();
}
