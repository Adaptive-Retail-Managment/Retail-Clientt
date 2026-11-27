import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { I18nProvider } from '../../../lib/i18n/i18n';
import { MockBusinessContextService } from '../api/mock-business-context.service';
import { MockDashboardService } from '../api/mock-dashboard.service';
import type { DashboardService } from '../api/dashboard.service';
import { DashboardPage } from './DashboardPage';

function renderPage(
  dashboard: DashboardService = new MockDashboardService({ delayMs: 5 }),
  businessContext = new MockBusinessContextService({ delayMs: 5 }),
) {
  return render(
    <MemoryRouter>
      <I18nProvider>
        <DashboardPage businessContext={businessContext} dashboard={dashboard} />
      </I18nProvider>
    </MemoryRouter>,
  );
}

async function waitForDashboard() {
  await screen.findByRole('heading', { name: 'Demo Grocery Store' }, { timeout: 3000 });
}

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe('DashboardPage', () => {
  it('renders the default demo business context', async () => {
    renderPage();
    await waitForDashboard();

    expect(screen.getByRole('heading', { name: 'Demo Grocery Store' })).toBeInTheDocument();
    expect(screen.getAllByText('Grocery & Food').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Main Branch').length).toBeGreaterThan(0);
    // Demo data is clearly labeled.
    expect(screen.getAllByText('Demo data').length).toBeGreaterThan(0);
  });

  it('renders all four summary cards', async () => {
    renderPage();
    await waitForDashboard();

    expect(screen.getByText("Today's sales")).toBeInTheDocument();
    expect(screen.getByText('Transactions')).toBeInTheDocument();
    // "Inventory" appears both as a summary card and a module name.
    expect(screen.getAllByText('Inventory').length).toBeGreaterThan(0);
    expect(screen.getByText('Low stock')).toBeInTheDocument();
    // ETB-formatted sales value.
    expect(screen.getByText(/ETB [\d,]+\.\d{2}/)).toBeInTheDocument();
  });

  it('renders the sales chart, recent activity, and module grid', async () => {
    renderPage();
    await waitForDashboard();

    expect(screen.getByRole('img', { name: 'Daily sales' })).toBeInTheDocument();
    expect(screen.getByText('Business profile configured')).toBeInTheDocument();
    expect(screen.getByText('Default branch configured')).toBeInTheDocument();
    expect(screen.getByText('Product setup awaiting completion')).toBeInTheDocument();

    for (const name of [
      'Products',
      'Sales / POS',
      'Purchasing',
      'Suppliers',
      'Reports',
      'Employees',
      'Business settings',
    ]) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
    expect(screen.getAllByText('Inventory').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('Coming soon')).toHaveLength(8);
  });

  it('does not navigate to nonexistent module routes', async () => {
    renderPage();
    await waitForDashboard();

    // Unavailable modules render as disabled cards, not links.
    const links = screen.queryAllByRole('link');
    const moduleLinks = links.filter((l) =>
      /products|inventory|pos|purchasing|suppliers|reports|employees|settings/i.test(
        l.textContent ?? '',
      ),
    );
    expect(moduleLinks).toHaveLength(0);
    expect(screen.getAllByText('Coming soon').length).toBeGreaterThan(0);
  });

  it.each([
    ['biz-demo-grocery', 'Demo Grocery Store', 'grocery'],
    ['biz-demo-fashion', 'Demo Fashion Store', 'fashion'],
    ['biz-demo-pharmacy', 'Demo Pharmacy', 'pharmacy'],
    ['biz-demo-cosmetics', 'Demo Cosmetics Store', 'cosmetics'],
  ])('renders the %s demo profile', async (businessId, businessName) => {
    renderPage();
    await waitForDashboard();

    fireEvent.change(screen.getByLabelText('Demo business'), { target: { value: businessId } });
    await screen.findByRole('heading', { name: businessName }, { timeout: 3000 });
  });

  it('updates dashboard data when switching demo profiles', async () => {
    const service = new MockDashboardService({ delayMs: 1 });
    renderPage(service);
    await waitForDashboard();

    const salesBefore = screen.getByText(/ETB [\d,]+\.\d{2}/).textContent;

    fireEvent.change(screen.getByLabelText('Demo business'), {
      target: { value: 'biz-demo-pharmacy' },
    });
    await screen.findByRole('heading', { name: 'Demo Pharmacy' }, { timeout: 3000 });

    await waitFor(() => {
      expect(screen.getByText(/ETB [\d,]+\.\d{2}/).textContent).not.toBe(salesBefore);
    });
    expect(screen.getAllByText('Central Branch').length).toBeGreaterThan(0);
  });

  it('shows a loading state while data is fetched', async () => {
    renderPage(new MockDashboardService({ delayMs: 80 }));
    expect(screen.getByRole('status')).toBeInTheDocument();
    await waitForDashboard();
  });

  it('shows an error state with retry when all services fail', async () => {
    const failing = new MockDashboardService({ delayMs: 1, failNext: 999 });
    renderPage(failing);

    expect(
      await screen.findByText('Dashboard unavailable', {}, { timeout: 3000 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('shows empty states for sections with no data', async () => {
    const empty: DashboardService = {
      getSummary: async () => ({
        todaySales: 0,
        transactionsToday: 0,
        inventory: { totalSkus: 0, inStock: 0, lowStock: 0, outOfStock: 0 },
        lowStockItems: [],
      }),
      getSalesSeries: async () => [],
      getRecentActivity: async () => [],
      getModules: async () => [],
    };
    renderPage(empty);
    await waitForDashboard();

    expect(screen.getByText('Nothing to show yet')).toBeInTheDocument();
    expect(screen.getByText('No sales data for this period yet.')).toBeInTheDocument();
    expect(screen.getByText('No recent activity to show.')).toBeInTheDocument();
  });

  it('renders in Amharic', async () => {
    renderPage();
    await waitForDashboard();

    fireEvent.click(screen.getByRole('button', { name: /አማርኛ|amharic/i }));

    expect(await screen.findByText('እንኳን ደህና መጡ')).toBeInTheDocument();
    expect(screen.getByText('የዛሬ ሽያጭ')).toBeInTheDocument();
    expect(screen.getByText('የቅርብ ጊዜ እንቅስቃሴዎች')).toBeInTheDocument();
    // Amharic is a left-to-right script; only RTL locales get dir="rtl".
    expect(document.documentElement.dir).toBe('ltr');
  });
});
