import { useId } from 'react';
import type { SalesPoint } from '../api/dashboard.service';
import { useTranslation } from '../../../lib/i18n/i18n';

const W = 560;
const H = 200;
const PAD_X = 8;
const PAD_Y = 24;

interface SalesChartProps {
  points: SalesPoint[];
}

/** Dependency-free SVG line chart — no chart library is installed. */
export function SalesChart({ points }: SalesChartProps) {
  const { t, locale } = useTranslation();
  const gradientId = useId();

  if (points.length === 0) {
    return <p className="dashboard-empty">{t('dashboard.chart.empty')}</p>;
  }

  const max = Math.max(...points.map((p) => p.total), 1);
  const min = Math.min(...points.map((p) => p.total), 0);
  const range = max - min || 1;

  const coords = points.map((p, i) => {
    const x = PAD_X + (i / Math.max(points.length - 1, 1)) * (W - PAD_X * 2);
    const y = PAD_Y + (1 - (p.total - min) / range) * (H - PAD_Y * 2 - 16);
    return { x, y, p };
  });

  const line = coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`)
    .join(' ');
  const area = `${line} L${coords[coords.length - 1]!.x.toFixed(1)},${H - 16} L${coords[0]!.x.toFixed(1)},${H - 16} Z`;

  const fmtDay = (iso: string) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString(locale === 'am' ? 'am-ET' : 'en-ET', {
      month: 'short',
      day: 'numeric',
    });

  return (
    <figure className="sales-chart">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={t('dashboard.chart.title')}
        preserveAspectRatio="none"
        className="sales-chart__svg"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${gradientId})`} />
        <path d={line} fill="none" stroke="var(--accent)" strokeWidth="2" />
        {coords.map((c) => (
          <circle key={c.p.date} cx={c.x} cy={c.y} r="3" fill="var(--accent)" />
        ))}
      </svg>
      <figcaption className="sales-chart__axis">
        <span>{fmtDay(points[0]!.date)}</span>
        <span>{t('dashboard.chart.range', { days: points.length })}</span>
        <span>{fmtDay(points[points.length - 1]!.date)}</span>
      </figcaption>
    </figure>
  );
}
