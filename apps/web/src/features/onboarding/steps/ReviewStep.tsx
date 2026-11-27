import { Link } from 'react-router-dom';
import type { OnboardingResult, OnboardingSubmission } from '../api/onboarding.service';
import type { TranslationKey } from '../../../lib/i18n/en';
import { INDUSTRY_ICONS } from '../components/industry-icons';
import { useTranslation } from '../../../lib/i18n/i18n';
import { Button } from '../../../components/ui';

const INDUSTRY_NAME_KEY: Record<string, TranslationKey> = {
  grocery: 'onboarding.industry.grocery.name',
  fashion: 'onboarding.industry.fashion.name',
  pharmacy: 'onboarding.industry.pharmacy.name',
  cosmetics: 'onboarding.industry.cosmetics.name',
};

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="review-row">
      <dt>{label}</dt>
      <dd>{value || '—'}</dd>
    </div>
  );
}

interface ReviewStepProps {
  data: OnboardingSubmission;
  onEdit: (step: 'business' | 'industry' | 'branch') => void;
  onConfirm: () => void;
  submitting: boolean;
  submitError: boolean;
}

export function ReviewStep({ data, onEdit, onConfirm, submitting, submitError }: ReviewStepProps) {
  const { t } = useTranslation();
  const IndustryIcon = INDUSTRY_ICONS[data.industry];

  return (
    <div className="onboarding-form">
      <h2>{t('onboarding.review.title')}</h2>
      <p className="lede">{t('onboarding.review.lede')}</p>

      <section className="ui-card review-card">
        <header className="review-card__header">
          <h3>{t('onboarding.review.business')}</h3>
          <Button variant="ghost" onClick={() => onEdit('business')} disabled={submitting}>
            {t('onboarding.review.edit')}
          </Button>
        </header>
        <dl>
          <SummaryRow label={t('onboarding.business.name')} value={data.business.name} />
          <SummaryRow
            label={t('onboarding.business.description')}
            value={data.business.description}
          />
          <SummaryRow label={t('onboarding.business.phone')} value={data.business.phone} />
          <SummaryRow label={t('onboarding.business.email')} value={data.business.email} />
          <SummaryRow label={t('onboarding.business.address')} value={data.business.address} />
        </dl>
      </section>

      <section className="ui-card review-card">
        <header className="review-card__header">
          <h3>{t('onboarding.review.industry')}</h3>
          <Button variant="ghost" onClick={() => onEdit('industry')} disabled={submitting}>
            {t('onboarding.review.edit')}
          </Button>
        </header>
        <p className="review-industry">
          <IndustryIcon width={22} height={22} aria-hidden="true" />
          {t(INDUSTRY_NAME_KEY[data.industry] ?? 'onboarding.industry.grocery.name')}
        </p>
      </section>

      <section className="ui-card review-card">
        <header className="review-card__header">
          <h3>{t('onboarding.review.branch')}</h3>
          <Button variant="ghost" onClick={() => onEdit('branch')} disabled={submitting}>
            {t('onboarding.review.edit')}
          </Button>
        </header>
        <dl>
          <SummaryRow label={t('onboarding.branch.name')} value={data.defaultBranch.name} />
          <SummaryRow label={t('onboarding.branch.address')} value={data.defaultBranch.address} />
          <SummaryRow label={t('onboarding.branch.phone')} value={data.defaultBranch.phone} />
        </dl>
      </section>

      {submitError ? (
        <p className="error" role="alert">
          {t('onboarding.submitError')}
        </p>
      ) : null}

      <div className="onboarding-actions">
        <Button variant="primary" onClick={onConfirm} loading={submitting}>
          {submitting ? t('onboarding.submitting') : t('onboarding.review.confirm')}
        </Button>
      </div>
    </div>
  );
}

interface CompleteStepProps {
  result: OnboardingResult;
  businessName: string;
  industry: OnboardingSubmission['industry'];
  branchName: string;
}

export function CompleteStep({ result, businessName, industry, branchName }: CompleteStepProps) {
  const { t } = useTranslation();
  const industryName = t(INDUSTRY_NAME_KEY[industry] ?? 'onboarding.industry.grocery.name');

  return (
    <div className="onboarding-complete">
      <div className="onboarding-complete__badge" aria-hidden="true">
        ✓
      </div>
      <h2>{t('onboarding.complete.title')}</h2>
      <p>
        {t('onboarding.complete.body', {
          name: businessName,
          industry: industryName,
          branch: branchName,
        })}
      </p>
      <p className="onboarding-complete__mock">{t('onboarding.complete.mockNotice')}</p>
      <p className="onboarding-complete__id">
        {result.businessId} · {result.branchId}
      </p>
      <Link to="/" className="btn btn--secondary">
        {t('onboarding.complete.next')}
      </Link>
    </div>
  );
}
