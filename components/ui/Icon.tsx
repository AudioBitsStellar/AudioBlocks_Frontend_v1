'use client';

import type { SVGProps } from 'react';
import { useEffect } from 'react';

export type IconName =
  | 'alert-triangle'
  | 'chevron-down'
  | 'chevron-up'
  | 'help-circle'
  | 'heart'
  | 'list-plus'
  | 'music'
  | 'play'
  | 'refresh-cw'
  | 'rotate-cw'
  | 'search'
  | 'share-2'
  | 'square-check'
  | 'user'
  | 'user-round'
  | 'x';

export type IconSize = 'sm' | 'md' | 'lg' | 'xl';

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name' | 'color'> {
  name: IconName;
  size?: IconSize;
}

const ICON_SIZES: Record<IconSize, number> = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
};

const ICON_NAMES = new Set<IconName>([
  'alert-triangle',
  'chevron-down',
  'chevron-up',
  'help-circle',
  'heart',
  'list-plus',
  'music',
  'play',
  'refresh-cw',
  'rotate-cw',
  'search',
  'share-2',
  'square-check',
  'user',
  'user-round',
  'x',
]);

export function Icon({
  name,
  size = 'md',
  className,
  ariaHidden = true,
  'aria-hidden': ariaHiddenAttribute,
  ...props
}: IconProps & { ariaHidden?: boolean }) {
  const iconSize = ICON_SIZES[size];
  const isKnownIcon = ICON_NAMES.has(name);

  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && !isKnownIcon) {
      console.warn(`[Icon] Missing icon name: ${String(name)}`);
    }
  }, [isKnownIcon, name]);

  return (
    <svg
      {...props}
      aria-hidden={ariaHiddenAttribute ?? ariaHidden}
      className={className}
      fill="none"
      focusable="false"
      height={iconSize}
      style={{ color: 'inherit', ...props.style }}
      viewBox="0 0 24 24"
      width={iconSize}
      xmlns="http://www.w3.org/2000/svg"
    >
      {isKnownIcon && <use href={`/icons/sprite.svg#${name}`} />}
    </svg>
  );
}

export default Icon;
