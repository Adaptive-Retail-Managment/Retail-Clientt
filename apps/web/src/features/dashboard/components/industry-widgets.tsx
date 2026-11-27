import type { ComponentType } from 'react';
import type { IndustryId } from '../../onboarding/api/onboarding.service';
import type { BusinessProfile } from '../api/business-context.service';

/**
 * Industry extension point.
 *
 * Industry-specific widgets register here WITHOUT modifying the shared
 * dashboard page/layout. Each entry receives the resolved business profile
 * (industry, branch, contacts) and returns a rendered widget. Currently all
 * four industries register an empty list — the shared dashboard covers
 * everything for now. Future work (perishables for grocery, sizes/colors for
 * fashion, expiry monitoring for pharmacy, category summaries for cosmetics)
 * adds entries to this map only.
 */
export type IndustryWidget = ComponentType<{ profile: BusinessProfile }>;

const EMPTY: IndustryWidget[] = [];

export const INDUSTRY_WIDGETS: Record<IndustryId, IndustryWidget[]> = {
  grocery: EMPTY,
  fashion: EMPTY,
  pharmacy: EMPTY,
  cosmetics: EMPTY,
};
