import type { IndustryId } from '../../onboarding/api/onboarding.service';
import type { BusinessProfile } from './business-context.service';

/**
 * Dashboard data boundary. Every figure returned here is DEMO data shaped
 * per industry — never real calculations. A real implementation will call
 * backend endpoints; the interfaces stay stable.
 */

export interface DashboardSummary {
  /** Today's sales total in ETB (demo). */
  todaySales: number;
  /** Number of transactions today (demo). */
  transactionsToday: number;
  /** Inventory health overview (demo counts). */
  inventory: {
    totalSkus: number;
    inStock: number;
    lowStock: number;
    outOfStock: number;
  };
  /** Low-stock sample entries for the overview card. */
  lowStockItems: { name: string; quantity: number; unit: string }[];
}

export interface SalesPoint {
  /** ISO date (YYYY-MM-DD). */
  date: string;
  /** Sales total for that day in ETB (demo). */
  total: number;
}

export type ActivityStatus = 'done' | 'pending' | 'info';

export interface ActivityItem {
  id: string;
  /** i18n key for the activity description. */
  labelKey: string;
  status: ActivityStatus;
  /** ISO timestamp. */
  at: string;
}

export interface ModuleDescriptor {
  id: string;
  /** i18n key for the module name. */
  nameKey: string;
  /** i18n key for the short description. */
  descKey: string;
  /** Only modules with a real route may be navigable. */
  available: boolean;
  /** Route to navigate to when available. */
  to?: string;
}

export interface DashboardService {
  getSummary(profile: BusinessProfile): Promise<DashboardSummary>;
  getSalesSeries(profile: BusinessProfile, days: number): Promise<SalesPoint[]>;
  getRecentActivity(profile: BusinessProfile): Promise<ActivityItem[]>;
  getModules(): Promise<ModuleDescriptor[]>;
}

/** Per-industry demo-data profiles. Typed, isolated from components. */
export interface IndustryDemoData {
  /** Product/category vocabulary used in demo activity + low-stock rows. */
  lowStockNames: string[];
  lowStockUnits: string[];
  /** Multiplier shaping demo magnitudes per industry. */
  scale: number;
}

export const INDUSTRY_DEMO_DATA: Record<IndustryId, IndustryDemoData> = {
  grocery: {
    lowStockNames: ['Teff 25kg', 'Cooking Oil 1L', 'Tomato Paste', 'Rice 5kg', 'Sugar 1kg'],
    lowStockUnits: ['bag', 'bottle', 'tin', 'bag', 'pack'],
    scale: 1,
  },
  fashion: {
    lowStockNames: [
      'Cotton T-Shirt M',
      'Denim Jeans 32',
      'Running Shoes',
      'Winter Jacket L',
      'Canvas Bag',
    ],
    lowStockUnits: ['piece', 'piece', 'pair', 'piece', 'piece'],
    scale: 0.7,
  },
  pharmacy: {
    lowStockNames: [
      'Amoxicillin 500mg',
      'ORS Sachets',
      'Paracetamol 500mg',
      'Insulin Pens',
      'Vitamin C 1000mg',
    ],
    lowStockUnits: ['strip', 'box', 'strip', 'pen', 'bottle'],
    scale: 0.55,
  },
  cosmetics: {
    lowStockNames: [
      'Hydrating Serum 30ml',
      'Matte Lipstick',
      'Sunscreen SPF50',
      'Hair Oil 200ml',
      'Face Mask Pack',
    ],
    lowStockUnits: ['bottle', 'piece', 'tube', 'bottle', 'pack'],
    scale: 0.45,
  },
};
