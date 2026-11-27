import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type {
  BranchInfo,
  BusinessInfo,
  IndustryId,
  OnboardingResult,
  OnboardingService,
  OnboardingSubmission,
} from '../api/onboarding.service';
import { defaultOnboardingService } from '../api/mock-onboarding.service';
import { validateBranchInfo, validateBusinessInfo, type FieldErrors } from '../lib/validation';
import type { BranchField, BusinessField } from '../lib/validation';
import { useTranslation } from '../../../lib/i18n/i18n';
import { LanguageSwitcher } from '../../../components/LanguageSwitcher';
import { Button } from '../../../components/ui';
import { IntroStep } from '../steps/IntroStep';
import { BusinessInfoStep } from '../steps/BusinessInfoStep';
import { IndustryStep } from '../steps/IndustryStep';
import { BranchStep } from '../steps/BranchStep';
import { ReviewStep, CompleteStep } from '../steps/ReviewStep';
import '../../../styles/onboarding.css';

type StepId = 'intro' | 'business' | 'industry' | 'branch' | 'review' | 'complete';

const STEP_ORDER: readonly StepId[] = [
  'intro',
  'business',
  'industry',
  'branch',
  'review',
  'complete',
];

const STEP_LABEL_KEY = {
  intro: 'onboarding.step.intro',
  business: 'onboarding.step.business',
  industry: 'onboarding.step.industry',
  branch: 'onboarding.step.branch',
  review: 'onboarding.step.review',
  complete: 'onboarding.step.complete',
} as const;

/** Steps that show the Back/Continue footer (intro and complete have their own CTAs). */
const NAV_STEPS = new Set<StepId>(['business', 'industry', 'branch', 'review']);

const EMPTY_BUSINESS: BusinessInfo = {
  name: '',
  description: '',
  phone: '',
  email: '',
  address: '',
};

const EMPTY_BRANCH: BranchInfo = { name: '', address: '', phone: '' };

export interface OnboardingPageProps {
  /** Injectable for tests; defaults to the shared mock service. */
  service?: OnboardingService;
}

export function OnboardingPage({ service = defaultOnboardingService }: OnboardingPageProps) {
  const { t } = useTranslation();

  const [step, setStep] = useState<StepId>('intro');
  const [business, setBusiness] = useState<BusinessInfo>(EMPTY_BUSINESS);
  const [industry, setIndustry] = useState<IndustryId | null>(null);
  const [branch, setBranch] = useState<BranchInfo>(EMPTY_BRANCH);

  // Validation errors are only displayed after the user attempts to continue;
  // afterwards they update live as the user fixes fields.
  const [businessAttempted, setBusinessAttempted] = useState(false);
  const [industryAttempted, setIndustryAttempted] = useState(false);
  const [branchAttempted, setBranchAttempted] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const [result, setResult] = useState<OnboardingResult | null>(null);
  // Synchronous guard: state updates are async, a double-click could fire two
  // submits before `submitting` renders.
  const inFlight = useRef(false);

  const businessErrors: FieldErrors<BusinessField> = businessAttempted
    ? validateBusinessInfo(business)
    : {};
  const branchErrors: FieldErrors<BranchField> = branchAttempted ? validateBranchInfo(branch) : {};

  const stepIndex = STEP_ORDER.indexOf(step);

  const goTo = (next: StepId) => {
    setStep(next);
    setSubmitError(false);
  };

  const handleContinue = () => {
    switch (step) {
      case 'intro':
        goTo('business');
        break;
      case 'business':
        setBusinessAttempted(true);
        if (Object.keys(validateBusinessInfo(business)).length === 0) goTo('industry');
        break;
      case 'industry':
        setIndustryAttempted(true);
        if (industry) goTo('branch');
        break;
      case 'branch':
        setBranchAttempted(true);
        if (Object.keys(validateBranchInfo(branch)).length === 0) goTo('review');
        break;
      case 'review':
        void handleSubmit();
        break;
      default:
        break;
    }
  };

  const handleBack = () => {
    const prev = STEP_ORDER[stepIndex - 1];
    if (prev) goTo(prev);
  };

  const handleSubmit = async () => {
    if (!industry || inFlight.current) return;
    inFlight.current = true;
    setSubmitting(true);
    setSubmitError(false);

    const submission: OnboardingSubmission = {
      business: { ...business, name: business.name.trim() },
      industry,
      defaultBranch: { ...branch, name: branch.name.trim() },
    };

    try {
      const outcome = await service.submit(submission);
      setResult(outcome);
      goTo('complete');
    } catch {
      setSubmitError(true);
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  };

  const patchBusiness = (patch: Partial<BusinessInfo>) => setBusiness((b) => ({ ...b, ...patch }));
  const patchBranch = (patch: Partial<BranchInfo>) => setBranch((b) => ({ ...b, ...patch }));

  const showFooter = NAV_STEPS.has(step);
  const isReview = step === 'review';

  return (
    <main className="status-page onboarding-page">
      <header className="status-page__header">
        <div className="status-page__topbar">
          <p className="eyebrow">
            <Link to="/" className="onboarding-home-link">
              {t('app.name')}
            </Link>
          </p>
          <LanguageSwitcher />
        </div>
        <h1>{t('onboarding.title')}</h1>

        {step !== 'complete' ? (
          <>
            <ol className="onboarding-steps" aria-label={t('onboarding.title')}>
              {STEP_ORDER.slice(0, 5).map((s, i) => (
                <li
                  key={s}
                  className="onboarding-steps__item"
                  data-active={s === step || undefined}
                  data-done={i < stepIndex || undefined}
                  aria-current={s === step ? 'step' : undefined}
                >
                  <span className="onboarding-steps__dot" aria-hidden="true">
                    {i + 1}
                  </span>
                  <span className="onboarding-steps__label">{t(STEP_LABEL_KEY[s])}</span>
                </li>
              ))}
            </ol>
            <p className="onboarding-progress">
              {t('onboarding.progress', { current: stepIndex + 1, total: 5 })}
            </p>
          </>
        ) : null}
      </header>

      <section className="onboarding-card ui-card" aria-live="polite">
        {step === 'intro' ? <IntroStep onStart={handleContinue} /> : null}
        {step === 'business' ? (
          <BusinessInfoStep value={business} errors={businessErrors} onChange={patchBusiness} />
        ) : null}
        {step === 'industry' ? (
          <IndustryStep
            value={industry}
            error={industryAttempted && !industry}
            onSelect={(id) => {
              setIndustry(id);
              setIndustryAttempted(false);
            }}
          />
        ) : null}
        {step === 'branch' ? (
          <BranchStep value={branch} errors={branchErrors} onChange={patchBranch} />
        ) : null}
        {step === 'review' && industry ? (
          <ReviewStep
            data={{ business, industry, defaultBranch: branch }}
            onEdit={(target) => {
              setBusinessAttempted(false);
              setIndustryAttempted(false);
              setBranchAttempted(false);
              goTo(target);
            }}
            onConfirm={() => void handleSubmit()}
            submitting={submitting}
            submitError={submitError}
          />
        ) : null}
        {step === 'complete' && result ? (
          <CompleteStep
            result={result}
            businessName={business.name}
            industry={industry ?? 'grocery'}
            branchName={branch.name}
          />
        ) : null}
      </section>

      {showFooter ? (
        <footer className="onboarding-actions">
          {step !== 'business' ? (
            <Button variant="secondary" onClick={handleBack} disabled={submitting}>
              {t('onboarding.back')}
            </Button>
          ) : null}
          {!isReview ? (
            <Button variant="primary" onClick={handleContinue}>
              {t('onboarding.continue')}
            </Button>
          ) : null}
        </footer>
      ) : null}
    </main>
  );
}
