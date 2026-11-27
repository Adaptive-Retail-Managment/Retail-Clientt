/**
 * Business onboarding domain types.
 *
 * These mirror the planned backend onboarding contract closely enough that
 * the mock service can be replaced by a real API client without changing
 * UI code (see docs/web/BACKEND_DEPENDENCIES.md once the endpoint exists).
 */

export type IndustryId = 'grocery' | 'fashion' | 'pharmacy' | 'cosmetics';

export interface BusinessInfo {
  name: string;
  description: string;
  phone: string;
  email: string;
  address: string;
}

export interface BranchInfo {
  name: string;
  address: string;
  phone: string;
}

export interface OnboardingSubmission {
  business: BusinessInfo;
  industry: IndustryId;
  /** The first branch is always the business's default branch. */
  defaultBranch: BranchInfo;
}

export interface OnboardingResult {
  businessId: string;
  branchId: string;
  industry: IndustryId;
  submittedAt: string;
  /** True while the service is a mock — the UI must say so honestly. */
  persistedRemotely: boolean;
}

export class OnboardingSubmitError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'OnboardingSubmitError';
  }
}

/**
 * Replaceable service boundary. The production implementation will call the
 * backend onboarding endpoint; the mock simulates latency and failure so the
 * UI's loading/error/retry behavior is real, not theatrical.
 */
export interface OnboardingService {
  submit(input: OnboardingSubmission): Promise<OnboardingResult>;
}
