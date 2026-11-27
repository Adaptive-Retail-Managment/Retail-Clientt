import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { I18nProvider } from '../../../lib/i18n/i18n';
import { MockOnboardingService } from '../api/mock-onboarding.service';
import { OnboardingPage } from './OnboardingPage';

function renderPage(service = new MockOnboardingService({ delayMs: 10 })) {
  return render(
    <MemoryRouter>
      <I18nProvider>
        <OnboardingPage service={service} />
      </I18nProvider>
    </MemoryRouter>,
  );
}

function continueButton() {
  return screen.getByRole('button', { name: /continue/i });
}

function fill(label: RegExp | string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

/** Walk intro → business → industry → branch → review with valid data. */
async function reachReview(service?: MockOnboardingService) {
  renderPage(service);

  fireEvent.click(screen.getByRole('button', { name: /start setup/i }));
  fill(/business name/i, 'Addis Fresh Market');
  fireEvent.click(continueButton());

  fireEvent.click(screen.getByRole('button', { name: /grocery & food/i }));
  fireEvent.click(continueButton());

  fill(/branch name/i, 'Main Store');
  fireEvent.click(continueButton());
}

afterEach(cleanup);

describe('OnboardingPage', () => {
  it('requires a business name before advancing', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /start setup/i }));
    fireEvent.click(continueButton());

    expect(await screen.findByText('This field is required')).toBeInTheDocument();
    expect(screen.getByLabelText(/business name/i)).toHaveAttribute('aria-invalid', 'true');
    // Still on the business step — industry cards are not shown.
    expect(screen.queryByRole('button', { name: /fashion & clothing/i })).not.toBeInTheDocument();
  });

  it('validates email format on the business step', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /start setup/i }));
    fill(/business name/i, 'Valid Name');
    fill(/business email/i, 'not-an-email');
    fireEvent.click(continueButton());

    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
  });

  it('accepts a valid optional phone and email', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /start setup/i }));
    fill(/business name/i, 'Valid Name');
    fill(/contact phone/i, '+251 911 234 567');
    fill(/business email/i, 'owner@example.com');
    fireEvent.click(continueButton());

    expect(await screen.findByRole('button', { name: /grocery & food/i })).toBeInTheDocument();
  });

  it('requires exactly one industry selection', async () => {
    const service = new MockOnboardingService({ delayMs: 0 });
    renderPage(service);
    fireEvent.click(screen.getByRole('button', { name: /start setup/i }));
    fill(/business name/i, 'Biz');
    fireEvent.click(continueButton());

    fireEvent.click(continueButton()); // no selection yet
    expect(await screen.findByText('Please select one industry to continue.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /pharmacy & medicine/i }));
    fireEvent.click(continueButton());

    expect(await screen.findByLabelText(/branch name/i)).toBeInTheDocument();
  });

  it('requires a branch name and preserves entered data across Back navigation', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /start setup/i }));
    fill(/business name/i, 'Data Keeper');
    fill(/business email/i, 'dk@example.com');
    fireEvent.click(continueButton());

    fireEvent.click(screen.getByRole('button', { name: /fashion & clothing/i }));
    fireEvent.click(continueButton());

    // Branch step: try to continue empty → error.
    fireEvent.click(continueButton());
    expect(await screen.findByText('This field is required')).toBeInTheDocument();

    fill(/branch name/i, 'Summit Branch');
    fireEvent.click(continueButton());

    // Now on review; go Back to the business step (review → branch →
    // industry → business) and confirm values survived.
    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(screen.getByLabelText(/business name/i)).toHaveValue('Data Keeper');
    expect(screen.getByLabelText(/business email/i)).toHaveValue('dk@example.com');
  });

  it('shows all entered data on the review step with edit shortcuts', async () => {
    const service = new MockOnboardingService({ delayMs: 0 });
    await reachReview(service);

    expect(screen.getByText('Addis Fresh Market')).toBeInTheDocument();
    expect(screen.getByText('Grocery & Food')).toBeInTheDocument();
    expect(screen.getByText('Main Store')).toBeInTheDocument();
    // Edit shortcut jumps back to the right step.
    fireEvent.click(screen.getAllByRole('button', { name: /edit/i })[1]!);
    expect(await screen.findByRole('button', { name: /pharmacy & medicine/i })).toBeInTheDocument();
  });

  it('completes successfully through the mock service and shows the honest demo notice', async () => {
    const service = new MockOnboardingService({ delayMs: 5 });
    await reachReview(service);

    fireEvent.click(screen.getByRole('button', { name: /confirm & finish setup/i }));

    expect(await screen.findByText('Your business is ready')).toBeInTheDocument();
    expect(screen.getByText(/frontend-only submission/i)).toBeInTheDocument();
    expect(service.calls).toHaveLength(1);
    expect(service.calls[0]).toMatchObject({
      business: { name: 'Addis Fresh Market' },
      industry: 'grocery',
      defaultBranch: { name: 'Main Store' },
    });
  });

  it('shows an error on failed submission and allows retry', async () => {
    const service = new MockOnboardingService({ delayMs: 0 });
    service.failNext(1);
    await reachReview(service);

    fireEvent.click(screen.getByRole('button', { name: /confirm & finish setup/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/setup failed/i);
    expect(screen.queryByText('Your business is ready')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /confirm & finish setup/i }));
    expect(await screen.findByText('Your business is ready')).toBeInTheDocument();
    expect(service.calls).toHaveLength(2);
  });

  it('prevent duplicate submissions while one is in flight', async () => {
    const service = new MockOnboardingService({ delayMs: 60 });
    await reachReview(service);

    const confirm = screen.getByRole('button', { name: /confirm & finish setup/i });
    fireEvent.click(confirm);
    fireEvent.click(confirm); // second click while the first is still in flight

    await waitFor(() => expect(service.calls).toHaveLength(1));
    expect(await screen.findByText('Your business is ready')).toBeInTheDocument();
  });

  it('renders the flow in Amharic when the locale is switched', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'አማርኛ' }));

    expect(document.documentElement.lang).toBe('am');
    expect(await screen.findByText(/ንግድዎን ያስጀምሩ/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /ማዋቀርን ጀምር/ }));
    expect(await screen.findByLabelText(/የንግድ ስም/)).toBeInTheDocument();
  });
});
