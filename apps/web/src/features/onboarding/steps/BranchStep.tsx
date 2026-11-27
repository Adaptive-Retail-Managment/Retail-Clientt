import type { BranchInfo } from '../api/onboarding.service';
import type { FieldErrors } from '../lib/validation';
import type { BranchField } from '../lib/validation';
import { useTranslation } from '../../../lib/i18n/i18n';
import { Badge, TextField } from '../../../components/ui';

interface BranchStepProps {
  value: BranchInfo;
  errors: FieldErrors<BranchField>;
  onChange: (patch: Partial<BranchInfo>) => void;
}

export function BranchStep({ value, errors, onChange }: BranchStepProps) {
  const { t } = useTranslation();

  return (
    <form className="onboarding-form" onSubmit={(event) => event.preventDefault()} noValidate>
      <h2>{t('onboarding.branch.title')}</h2>
      <p className="lede">{t('onboarding.branch.lede')}</p>

      <div className="onboarding-branch-heading">
        <Badge tone="info">{t('onboarding.branch.defaultBadge')}</Badge>
      </div>

      <TextField
        label={t('onboarding.branch.name')}
        hint={t('onboarding.branch.name.hint')}
        error={errors.name ? t(errors.name) : undefined}
        value={value.name}
        onChange={(e) => onChange({ name: e.target.value })}
        required
        maxLength={120}
        autoComplete="organization"
      />
      <TextField
        label={t('onboarding.branch.address')}
        value={value.address}
        onChange={(e) => onChange({ address: e.target.value })}
        maxLength={200}
      />
      <TextField
        label={t('onboarding.branch.phone')}
        error={errors.phone ? t(errors.phone) : undefined}
        value={value.phone}
        onChange={(e) => onChange({ phone: e.target.value })}
        type="tel"
        autoComplete="tel"
      />
    </form>
  );
}
