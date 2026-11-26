import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { I18nProvider, useTranslation } from './i18n';

function Probe() {
  const { locale, setLocale, t } = useTranslation();
  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <span data-testid="label">{t('app.name')}</span>
      <button type="button" onClick={() => setLocale('am')}>
        switch
      </button>
    </div>
  );
}

describe('I18nProvider', () => {
  afterEach(cleanup);

  it('renders English by default and sets document language', () => {
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    );
    expect(screen.getByTestId('locale').textContent).toBe('en');
    expect(document.documentElement.lang).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');
  });

  it('switches to Amharic and updates document lang/dir', () => {
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    );
    fireEvent.click(screen.getByText('switch'));
    expect(screen.getByTestId('locale').textContent).toBe('am');
    expect(document.documentElement.lang).toBe('am');
    expect(document.documentElement.dir).toBe('ltr'); // Amharic is LTR
    expect(window.localStorage.getItem('arp.locale')).toBe('am');
  });
});
