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
