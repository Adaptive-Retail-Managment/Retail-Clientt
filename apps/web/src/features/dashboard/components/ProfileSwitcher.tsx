import type { BusinessProfile } from '../api/business-context.service';
import { useTranslation } from '../../../lib/i18n/i18n';

interface ProfileSwitcherProps {
  profiles: BusinessProfile[];
  selectedId: string | null;
  onSelect: (businessId: string) => void;
}

/**
 * DEV-ONLY demo profile picker. Lets developers cycle through the four demo
 * businesses to verify the adaptive dashboard. This is NOT real business
 * switching — it only selects which mock profile feeds the page.
 */
export function ProfileSwitcher({ profiles, selectedId, onSelect }: ProfileSwitcherProps) {
  const { t } = useTranslation();
  if (profiles.length === 0) return null;

  return (
    <div className="profile-switcher">
      <label htmlFor="demo-profile-select">{t('dashboard.demoProfile.label')}</label>
      <select
        id="demo-profile-select"
        className="profile-switcher__select"
        value={selectedId ?? ''}
        onChange={(e) => onSelect(e.target.value)}
      >
        {profiles.map((p) => (
          <option key={p.businessId} value={p.businessId}>
            {p.businessName} ({t(`onboarding.industry.${p.industry}.name` as never)})
          </option>
        ))}
      </select>
    </div>
  );
}
