import { useEffect, useState } from 'react';
import type { BusinessContextService, BusinessProfile } from '../api/business-context.service';
import type {
  ActivityItem,
  DashboardService,
  DashboardSummary,
  ModuleDescriptor,
  SalesPoint,
} from '../api/dashboard.service';

export type DashboardStatus = 'loading' | 'ready' | 'error';

export interface DashboardData {
  status: DashboardStatus;
  profile: BusinessProfile | null;
  profiles: BusinessProfile[];
  summary: DashboardSummary | null;
  salesSeries: SalesPoint[];
  activity: ActivityItem[];
  modules: ModuleDescriptor[];
  /** True when any section returned no data (distinct from hard failure). */
  hasEmptySections: boolean;
}

interface UseDashboardOptions {
  businessContext: BusinessContextService;
  dashboard: DashboardService;
  /** Currently selected business profile id (demo switching). */
  businessId: string | null;
  /** Increment to force a reload (retry button). */
  reloadToken?: number;
}

/**
 * Loads the full dashboard for the selected business context. All data comes
 * from the injected services — components never see hardcoded figures.
 * Sections load independently so one failure doesn't blank the page; a total
 * failure surfaces as status 'error'.
 */
export function useDashboard({
  businessContext,
  dashboard,
  businessId,
  reloadToken = 0,
}: UseDashboardOptions): DashboardData {
  const [profiles, setProfiles] = useState<BusinessProfile[]>([]);
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [salesSeries, setSalesSeries] = useState<SalesPoint[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [modules, setModules] = useState<ModuleDescriptor[]>([]);
  const [status, setStatus] = useState<DashboardStatus>('loading');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setStatus('loading');
      try {
        const list = await businessContext.listProfiles();
        if (cancelled) return;
        setProfiles(list);

        const selectedId = businessId ?? list[0]?.businessId ?? null;
        const ctx = selectedId ? await businessContext.getContext(selectedId) : null;
        if (cancelled) return;
        setProfile(ctx);

        const [sum, series, acts, mods] = await Promise.allSettled([
          ctx ? dashboard.getSummary(ctx) : Promise.resolve(null),
          ctx ? dashboard.getSalesSeries(ctx, 14) : Promise.resolve([]),
          ctx ? dashboard.getRecentActivity(ctx) : Promise.resolve([]),
          dashboard.getModules(),
        ]);
        if (cancelled) return;

        setSummary(sum.status === 'fulfilled' ? sum.value : null);
        setSalesSeries(series.status === 'fulfilled' ? series.value : []);
        setActivity(acts.status === 'fulfilled' ? acts.value : []);
        setModules(mods.status === 'fulfilled' ? mods.value : []);

        const allFailed = [sum, series, acts].every((r) => r.status === 'rejected');
        setStatus(allFailed ? 'error' : 'ready');
      } catch {
        if (!cancelled) setStatus('error');
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [businessContext, dashboard, businessId, reloadToken]);

  const hasEmptySections =
    status === 'ready' &&
    (summary === null || salesSeries.length === 0 || activity.length === 0 || modules.length === 0);

  return { status, profile, profiles, summary, salesSeries, activity, modules, hasEmptySections };
}
