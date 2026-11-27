import {
  OnboardingSubmitError,
  type OnboardingResult,
  type OnboardingService,
  type OnboardingSubmission,
} from './onboarding.service';

export interface MockOnboardingServiceOptions {
  /** Simulated network latency in ms. */
  delayMs?: number;
}

/**
 * In-memory mock of the future backend onboarding endpoint.
 *
 * - Records every submission so tests can assert call counts (duplicate
 *   submission prevention is verified against `calls`).
 * - `failNext(n)` injects n deterministic failures before succeeding.
 * - Always reports `persistedRemotely: false` so the UI can be honest that
 *   nothing reached a server.
 */
export class MockOnboardingService implements OnboardingService {
  readonly calls: OnboardingSubmission[] = [];
  private failuresRemaining = 0;
  private readonly delayMs: number;

  constructor(options: MockOnboardingServiceOptions = {}) {
    this.delayMs = options.delayMs ?? 900;
  }

  /** Queue n deterministic submission failures (for error-path testing). */
  failNext(n = 1): void {
    this.failuresRemaining += n;
  }

  async submit(input: OnboardingSubmission): Promise<OnboardingResult> {
    this.calls.push(input);
    await new Promise((resolve) => setTimeout(resolve, this.delayMs));

    if (this.failuresRemaining > 0) {
      this.failuresRemaining -= 1;
      throw new OnboardingSubmitError('Mock submission failed');
    }

    return {
      businessId: `biz-mock-${this.calls.length}`,
      branchId: `br-mock-${this.calls.length}`,
      industry: input.industry,
      submittedAt: new Date().toISOString(),
      persistedRemotely: false,
    };
  }
}

/** Shared default instance used by the application route. */
export const defaultOnboardingService: OnboardingService = new MockOnboardingService();
