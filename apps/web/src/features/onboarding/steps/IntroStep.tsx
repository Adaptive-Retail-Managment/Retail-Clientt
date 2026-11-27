import { useTranslation } from '../../../lib/i18n/i18n';
import { Button } from '../../../components/ui';

export function IntroStep({ onStart }: { onStart: () => void }) {
  const { t } = useTranslation();

  return (
    <div className="onboarding-intro">
      <h2>{t('onboarding.intro.title')}</h2>
      <p className="lede">{t('onboarding.intro.lede')}</p>
      <p>{t('onboarding.intro.body')}</p>
      <p className="onboarding-intro__steps">{t('onboarding.intro.guided')}</p>
      <Button variant="primary" onClick={onStart}>
        {t('onboarding.intro.start')}
      </Button>
    </div>
  );
}
