import type { ReactElement, SVGProps } from 'react';
import type { IndustryId } from '../api/onboarding.service';

type IconProps = SVGProps<SVGSVGElement>;

function base(props: IconProps) {
  return {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    focusable: false,
    ...props,
  };
}

export function GroceryIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 9l1.5-5h13L20 9" />
      <path d="M4 9h16v2a3 3 0 0 1-3 3h-1a3 3 0 0 1-3-3v-1a3 3 0 0 1-3-3v1a3 3 0 0 1-3 3h-1a3 3 0 0 1-3-3z" />
      <path d="M5.5 14v7h13v-7" />
    </svg>
  );
}

export function FashionIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M9 4 4 7l2 3 2-1v11h8V9l2 1 2-3-5-3a3 3 0 0 1-6 0z" />
    </svg>
  );
}

export function PharmacyIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="8" width="18" height="12" rx="2" />
      <path d="M12 8v12" />
      <path d="M3 13h18" />
      <path d="M12 8V5" />
      <path d="M9.5 5h5" />
    </svg>
  );
}

export function CosmeticsIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3c3.5 3.8 5.5 6.6 5.5 9.3A5.5 5.5 0 0 1 12 17.8a5.5 5.5 0 0 1-5.5-5.5C6.5 9.6 8.5 6.8 12 3z" />
      <path d="M9 13.5c1 .8 2 1.2 3 1.2s2-.4 3-1.2" />
    </svg>
  );
}

export const INDUSTRY_ICONS: Record<IndustryId, (props: IconProps) => ReactElement> = {
  grocery: GroceryIcon,
  fashion: FashionIcon,
  pharmacy: PharmacyIcon,
  cosmetics: CosmeticsIcon,
};
