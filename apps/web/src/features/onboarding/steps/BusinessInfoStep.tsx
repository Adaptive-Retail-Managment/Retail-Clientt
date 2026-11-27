import type { BusinessInfo } from '../api/onboarding.service';
import type { FieldErrors } from '../lib/validation';
import type { BusinessField } from '../lib/validation';
import { useTranslation } from '../../../lib/i18n/i18n';
import { TextField } from '../../../components/ui';

interface BusinessInfoStepProps {
  value: BusinessInfo;
  errors: FieldErrors<BusinessField>;
  onChange: (patch: Partial<BusinessInfo>) => void;
}

export function BusinessInfoStep({ value, errors, onChange }: BusinessInfoStepProps) {
  const { t } = useTranslation();

  return (
    <form className="onboarding-form" onSubmit={(event) => event.preventDefault()} noValidate>
      <h2>{t('onboarding.business.title')}</h2>
      <p className="lede">{t('onboarding.business.lede')}</p>

      <TextField
        label={t('onboarding.business.name')}
        hint={t('onboarding.business.name.hint')}
        error={errors.name ? t(errors.name) : undefined}
        value={value.name}
        onChange={(e) => onChange({ name: e.target.value })}
        required
        maxLength={120}
        autoComplete="organization"
      />
      <TextField
        label={t('onboarding.business.description')}
        value={value.description}
        onChange={(e) => onChange({ description: e.target.value })}
        maxLength={500}
      />
      <TextField
        label={t('onboarding.business.phone')}
        error={errors.phone ? t(errors.phone) : undefined}
        value={value.phone}
        onChange={(e) => onChange({ phone: e.target.value })}
        type="tel"
        autoComplete="tel"
      />
      <TextField
        label={t('onboarding.business.email')}
        error={errors.email ? t(errors.email) : undefined}
        value={value.email}
        onChange={(e) => onChange({ email: e.target.value })}
        type="email"
        autoComplete="email"
      />
      <TextField
        label={t('onboarding.business.address')}
        value={value.address}
        onChange={(e) => onChange({ address: e.target.value })}
        maxLength={200}
      />
    </form>
  );
}
