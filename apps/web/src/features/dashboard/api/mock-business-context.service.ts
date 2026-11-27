import type { BusinessContextService, BusinessProfile } from './business-context.service';

export interface MockBusinessContextOptions {
  delayMs?: number;
}

/**
 * Demo business profiles — one per supported industry.
 *
 * These are explicitly DEMO data (`isDemo: true`, `biz-demo-*`/`br-demo-*`
 * ids). They exist so every industry can be exercised before the backend
 * onboarding/business APIs exist. They are not real businesses and their ids
 * must never be treated as database identifiers.
 */
const DEMO_PROFILES: readonly BusinessProfile[] = [
  {
    businessId: 'biz-demo-grocery',
    businessName: 'Demo Grocery Store',
    industry: 'grocery',
    branchId: 'br-demo-grocery-main',
    branchName: 'Main Branch',
    contactPhone: '+251 11 000 0001',
    contactEmail: 'hello@demogrocery.example',
    isDemo: true,
  },
  {
    businessId: 'biz-demo-fashion',
    businessName: 'Demo Fashion Store',
    industry: 'fashion',
    branchId: 'br-demo-fashion-main',
    branchName: 'Bole Branch',
    contactPhone: '+251 11 000 0002',
    contactEmail: 'hello@demofashion.example',
    isDemo: true,
  },
  {
    businessId: 'biz-demo-pharmacy',
    businessName: 'Demo Pharmacy',
    industry: 'pharmacy',
    branchId: 'br-demo-pharmacy-main',
    branchName: 'Central Branch',
    contactPhone: '+251 11 000 0003',
    contactEmail: 'hello@demopharmacy.example',
    isDemo: true,
  },
  {
    businessId: 'biz-demo-cosmetics',
    businessName: 'Demo Cosmetics Store',
    industry: 'cosmetics',
    branchId: 'br-demo-cosmetics-main',
    branchName: 'Mexico Branch',
    contactPhone: '+251 11 000 0004',
    contactEmail: 'hello@democosmetics.example',
    isDemo: true,
  },
];

export class MockBusinessContextService implements BusinessContextService {
  private readonly delayMs: number;

  constructor(options: MockBusinessContextOptions = {}) {
    this.delayMs = options.delayMs ?? 0;
  }

  async listProfiles(): Promise<BusinessProfile[]> {
    await this.delay(this.delayMs);
    return [...DEMO_PROFILES];
  }

  async getContext(businessId: string): Promise<BusinessProfile> {
    await this.delay(this.delayMs);
    const profile = DEMO_PROFILES.find((p) => p.businessId === businessId);
    if (!profile) {
      throw new Error(`Unknown demo business profile: ${businessId}`);
    }
    return profile;
  }

  private delay(ms: number): Promise<void> {
    return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
  }
}

export const defaultBusinessContextService: BusinessContextService =
  new MockBusinessContextService();
