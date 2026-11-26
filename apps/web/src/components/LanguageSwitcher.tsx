import { useTranslation, type Locale } from '../lib/i18n/i18n';

const LOCALES: { value: Locale; key: 'language.en' | 'language.am' }[] = [
  { value: 'en', key: 'language.en' },
  { value: 'am', key: 'language.am' },
];

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useTranslation();

  return (
    <div className="language-switcher" role="group" aria-label={t('language.label')}>
      {LOCALES.map(({ value, key }) => (
        <button
          key={value}
          type="button"
          className="language-switcher__option"
          aria-pressed={locale === value}
          onClick={() => setLocale(value)}
        >
          {t(key)}
        </button>
      ))}
    </div>
  );
}
