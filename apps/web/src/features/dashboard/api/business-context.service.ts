import type { IndustryId } from '../../onboarding/api/onboarding.service';

/**
 * Business-context boundary.
 *
 * The dashboard must never hardcode which business/branch it shows — all
 * identity comes through this service. The mock implementation serves four
 * clearly-labeled DEMO profiles for development and testing; a real
 * implementation will resolve the owner's actual businesses/branches from
 * the backend once that contract exists.
 */

export interface BusinessProfile {
  /** Mock-only identifier — NOT a database id. */
  businessId: string;
  businessName: string;
  industry: IndustryId;
  /** Mock-only identifier — NOT a database id. */
  branchId: string;
  branchName: string;
  contactPhone?: string;
  contactEmail?: string;
  /** Marks the profile as demonstration data for the UI. */
  isDemo: true;
}

export interface BusinessContextService {
  /** All selectable business profiles (demo profiles in the mock). */
  listProfiles(): Promise<BusinessProfile[]>;
  /** Resolve the display context for one business. */
  getContext(businessId: string): Promise<BusinessProfile>;
}
