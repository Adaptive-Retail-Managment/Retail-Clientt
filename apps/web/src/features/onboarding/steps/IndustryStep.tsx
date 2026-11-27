import type { IndustryId } from '../api/onboarding.service';
import { useTranslation } from '../../../lib/i18n/i18n';
import { IndustryCard, INDUSTRIES } from '../components/IndustryCard';

interface IndustryStepProps {
  value: IndustryId | null;
  error: boolean;
  onSelect: (industry: IndustryId) => void;
}

export function IndustryStep({ value, error, onSelect }: IndustryStepProps) {
  const { t } = useTranslation();

  return (
    <div className="onboarding-form">
      <h2>{t('onboarding.industry.title')}</h2>
      <p className="lede">{t('onboarding.industry.lede')}</p>

      <div className="industry-grid" role="radiogroup" aria-label={t('onboarding.industry.title')}>
        {INDUSTRIES.map((industry) => (
          <IndustryCard
            key={industry}
            industry={industry}
            selected={value === industry}
            onSelect={onSelect}
          />
        ))}
      </div>

      {error ? (
        <p className="field__error" role="alert">
          {t('onboarding.industry.required')}
        </p>
      ) : null}
    </div>
  );
}
