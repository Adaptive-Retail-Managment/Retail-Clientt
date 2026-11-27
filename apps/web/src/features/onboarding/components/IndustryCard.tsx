import type { IndustryId } from '../api/onboarding.service';
import type { TranslationKey } from '../../../lib/i18n/en';
import { useTranslation } from '../../../lib/i18n/i18n';
import { INDUSTRY_ICONS } from './industry-icons';

export const INDUSTRIES: readonly IndustryId[] = ['grocery', 'fashion', 'pharmacy', 'cosmetics'];

const NAME_KEY: Record<IndustryId, TranslationKey> = {
  grocery: 'onboarding.industry.grocery.name',
  fashion: 'onboarding.industry.fashion.name',
  pharmacy: 'onboarding.industry.pharmacy.name',
  cosmetics: 'onboarding.industry.cosmetics.name',
};

const DESC_KEY: Record<IndustryId, TranslationKey> = {
  grocery: 'onboarding.industry.grocery.desc',
  fashion: 'onboarding.industry.fashion.desc',
  pharmacy: 'onboarding.industry.pharmacy.desc',
  cosmetics: 'onboarding.industry.cosmetics.desc',
};

interface IndustryCardProps {
  industry: IndustryId;
  selected: boolean;
  onSelect: (industry: IndustryId) => void;
}

export function IndustryCard({ industry, selected, onSelect }: IndustryCardProps) {
  const { t } = useTranslation();
  const Icon = INDUSTRY_ICONS[industry];

  return (
    <button
      type="button"
      className="industry-card"
      data-selected={selected || undefined}
      aria-pressed={selected}
      onClick={() => onSelect(industry)}
    >
      <span className="industry-card__icon" aria-hidden="true">
        <Icon width={28} height={28} />
      </span>
      <span className="industry-card__name">{t(NAME_KEY[industry])}</span>
      <span className="industry-card__desc">{t(DESC_KEY[industry])}</span>
      {selected ? (
        <span className="industry-card__check" aria-hidden="true">
          ✓
        </span>
      ) : null}
    </button>
  );
}
