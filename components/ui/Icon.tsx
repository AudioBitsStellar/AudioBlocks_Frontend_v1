'use client';

import type { SVGProps } from 'react';
import { useEffect } from 'react';

const ICON_NAMES = [
  'alert-triangle',
  'chevron-down',
  'chevron-up',
  'google',
  'help-circle',
  'heart',
  'instagram',
  'list-plus',
  'music',
  'play',
  'refresh-cw',
  'rotate-cw',
  'search',
  'share-2',
  'snapchat',
  'square-check',
  'telegram',
  'user',
  'user-round',
  'x',
  'x-brand',
] as const;

export type IconName = (typeof ICON_NAMES)[number];

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

const ICON_NAME_SET: ReadonlySet<string> = new Set(ICON_NAMES);

export function Icon({
  name,
  size = 'md',
  className,
  'aria-hidden': ariaHidden = true,
  ...props
}: IconProps) {
  const iconSize = ICON_SIZES[size];
  const isKnownIcon = ICON_NAME_SET.has(name);

  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && !isKnownIcon) {
      console.warn(`[Icon] Missing icon name: ${String(name)}`);
    }
  }, [isKnownIcon, name]);

  return (
    <svg
      {...props}
      aria-hidden={ariaHidden}
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
