import type { IndustryId } from '../../onboarding/api/onboarding.service';
import type {
  ActivityItem,
  DashboardService,
  DashboardSummary,
  ModuleDescriptor,
  SalesPoint,
} from './dashboard.service';
import { INDUSTRY_DEMO_DATA } from './dashboard.service';
import type { BusinessProfile } from './business-context.service';

export interface MockDashboardServiceOptions {
  delayMs?: number;
  /** Deterministic failure injection for tests. */
  failNext?: number;
}

/** Platform modules — none have real routes yet, so all are "coming soon". */
const MODULES: readonly ModuleDescriptor[] = [
  {
    id: 'products',
    nameKey: 'dashboard.module.products',
    descKey: 'dashboard.module.products.desc',
    available: false,
  },
  {
    id: 'inventory',
    nameKey: 'dashboard.module.inventory',
    descKey: 'dashboard.module.inventory.desc',
    available: false,
  },
  {
    id: 'pos',
    nameKey: 'dashboard.module.pos',
    descKey: 'dashboard.module.pos.desc',
    available: false,
  },
  {
    id: 'purchasing',
    nameKey: 'dashboard.module.purchasing',
    descKey: 'dashboard.module.purchasing.desc',
    available: false,
  },
  {
    id: 'suppliers',
    nameKey: 'dashboard.module.suppliers',
    descKey: 'dashboard.module.suppliers.desc',
    available: false,
  },
  {
    id: 'reports',
    nameKey: 'dashboard.module.reports',
    descKey: 'dashboard.module.reports.desc',
    available: false,
  },
  {
    id: 'employees',
    nameKey: 'dashboard.module.employees',
    descKey: 'dashboard.module.employees.desc',
    available: false,
  },
  {
    id: 'settings',
    nameKey: 'dashboard.module.settings',
    descKey: 'dashboard.module.settings.desc',
    available: false,
  },
];

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function isoHoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 3600_000).toISOString();
}

/** Deterministic per-industry demo data — stable across renders/tests. */
function demoFor(industry: IndustryId) {
  const data = INDUSTRY_DEMO_DATA[industry];
  const rand = seededRandom(industry.length * 7919 + industry.charCodeAt(0) * 131);
  const lowStockItems = data.lowStockNames.map((name, i) => ({
    name,
    quantity: Math.max(0, Math.floor(rand() * 8)),
    unit: data.lowStockUnits[i % data.lowStockUnits.length]!,
  }));
  return { data, rand, lowStockItems };
}

function buildSummary(profile: BusinessProfile): DashboardSummary {
  const { data, rand, lowStockItems } = demoFor(profile.industry);
  const base = 4200 * data.scale;
  return {
    todaySales: Math.round(base * (0.6 + rand() * 0.9) * 100) / 100,
    transactionsToday: Math.floor(18 + rand() * 60 * data.scale + 12),
    inventory: {
      totalSkus: Math.floor(140 + rand() * 260),
      inStock: 0, // filled below
      lowStock:
        lowStockItems.filter((i) => i.quantity > 0 && i.quantity <= 5).length ||
        lowStockItems.length,
      outOfStock: Math.floor(rand() * 6),
    },
    lowStockItems,
  };
}

function buildSeries(profile: BusinessProfile, days: number): SalesPoint[] {
  const { data, rand } = demoFor(profile.industry);
  const base = 3800 * data.scale;
  const points: SalesPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const dow = (new Date().getDay() - i + 7) % 7;
    const weekendBoost = dow === 5 || dow === 6 ? 1.35 : 1;
    points.push({
      date: isoDaysAgo(i),
      total: Math.round(base * weekendBoost * (0.55 + rand() * 0.9) * 100) / 100,
    });
  }
  return points;
}

const ACTIVITY_LABEL_KEYS: Record<IndustryId, { done: string[]; pending: string[] }> = {
  grocery: {
    done: ['dashboard.activity.businessConfigured', 'dashboard.activity.branchConfigured'],
    pending: ['dashboard.activity.productsSetup', 'dashboard.activity.inventorySetup'],
  },
  fashion: {
    done: ['dashboard.activity.businessConfigured', 'dashboard.activity.branchConfigured'],
    pending: ['dashboard.activity.productsSetup', 'dashboard.activity.inventorySetup'],
  },
  pharmacy: {
    done: ['dashboard.activity.businessConfigured', 'dashboard.activity.branchConfigured'],
    pending: ['dashboard.activity.productsSetup', 'dashboard.activity.inventorySetup'],
  },
  cosmetics: {
    done: ['dashboard.activity.businessConfigured', 'dashboard.activity.branchConfigured'],
    pending: ['dashboard.activity.productsSetup', 'dashboard.activity.inventorySetup'],
  },
};

function buildActivity(profile: BusinessProfile): ActivityItem[] {
  const keys = ACTIVITY_LABEL_KEYS[profile.industry];
  return [
    { id: 'act-1', labelKey: keys.done[0]!, status: 'done', at: isoHoursAgo(30) },
    { id: 'act-2', labelKey: keys.done[1]!, status: 'done', at: isoHoursAgo(29) },
    { id: 'act-3', labelKey: keys.pending[0]!, status: 'pending', at: isoHoursAgo(2) },
    { id: 'act-4', labelKey: keys.pending[1]!, status: 'info', at: isoHoursAgo(1) },
  ];
}

export class MockDashboardService implements DashboardService {
  private failuresRemaining: number;
  private readonly delayMs: number;

  constructor(options: MockDashboardServiceOptions = {}) {
    this.delayMs = options.delayMs ?? 0;
    this.failuresRemaining = options.failNext ?? 0;
  }

  private async gate(): Promise<void> {
    if (this.delayMs > 0) await new Promise((r) => setTimeout(r, this.delayMs));
    if (this.failuresRemaining > 0) {
      this.failuresRemaining -= 1;
      throw new Error('Mock dashboard service failure');
    }
  }

  async getSummary(profile: BusinessProfile): Promise<DashboardSummary> {
    await this.gate();
    const summary = buildSummary(profile);
    summary.inventory.inStock =
      summary.inventory.totalSkus - summary.inventory.lowStock - summary.inventory.outOfStock;
    return summary;
  }

  async getSalesSeries(profile: BusinessProfile, days: number): Promise<SalesPoint[]> {
    await this.gate();
    return buildSeries(profile, days);
  }

  async getRecentActivity(profile: BusinessProfile): Promise<ActivityItem[]> {
    await this.gate();
    return buildActivity(profile);
  }

  async getModules(): Promise<ModuleDescriptor[]> {
    await this.gate();
    return [...MODULES];
  }
}

export const defaultDashboardService: DashboardService = new MockDashboardService();
