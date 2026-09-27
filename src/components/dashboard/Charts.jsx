import React, { useLayoutEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { niceTicks, compact } from './analytics';

// Encre et chrome des graphiques (grille hairline pleine, axes discrets).
const INK = { primary: '#0f172a', secondary: '#475569', muted: '#64748b', grid: '#eef1f4', axis: '#cbd5e1', surface: '#ffffff' };
const EASE = [0.16, 1, 0.3, 1];

export function useMeasure() {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

// Navigation clavier sur un graphique : flèches gauche/droite pour parcourir les points.
function useIndexNav(count) {
  const [index, setIndex] = useState(null);
  const onKeyDown = (e) => {
    if (!count) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); setIndex((i) => (i === null ? 0 : Math.min(count - 1, i + 1))); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); setIndex((i) => (i === null ? count - 1 : Math.max(0, i - 1))); }
    if (e.key === 'Escape') setIndex(null);
  };
  return { index, setIndex, focusProps: { tabIndex: 0, onKeyDown, onFocus: () => setIndex(count - 1), onBlur: () => setIndex(null) } };
}

/* ------------------------------------------------------------------ */
/* Carte + bascule graphique / tableau                                 */
/* ------------------------------------------------------------------ */

export function ChartCard({ title, subtitle, table, children, className = '', right }) {
  const [view, setView] = useState('chart');
  return (
    <section className={`rounded-3xl border border-slate-200/70 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-16px_rgba(15,23,42,0.12)] md:p-6 ${className}`}>
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
          {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {right}
          {table && (
            <div className="flex rounded-xl bg-slate-100 p-0.5 text-xs font-semibold" role="group" aria-label="Affichage">
              {[['chart', 'Graphique'], ['table', 'Tableau']].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={view === id}
                  onClick={() => setView(id)}
                  className={`rounded-[10px] px-2.5 py-1 transition-colors ${view === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>
      {view === 'chart' || !table ? children : <DataTable {...table} />}
    </section>
  );
}

export function DataTable({ columns, rows }) {
  return (
    <div className="max-h-[300px] overflow-auto rounded-xl border border-slate-100">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={`px-4 py-2.5 font-semibold ${c.align === 'right' ? 'text-right' : ''}`}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r, i) => (
            <tr key={i} className="hover:bg-slate-50/60">
              {columns.map((c) => (
                <td key={c.key} className={`px-4 py-2 text-slate-700 ${c.align === 'right' ? 'text-right tabular-nums' : ''}`}>
                  {c.format ? c.format(r[c.key], r) : r[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Infobulle : la valeur d'abord, le libellé ensuite                   */
/* ------------------------------------------------------------------ */

function Tooltip({ x, y, width, title, rows }) {
  const flip = x > width - 180;
  return (
    <div
      className="pointer-events-none absolute z-20 min-w-[150px] rounded-xl border border-slate-200 bg-white/95 px-3 py-2.5 shadow-[0_12px_32px_-8px_rgba(15,23,42,0.25)] backdrop-blur"
      style={{ left: flip ? undefined : x + 14, right: flip ? width - x + 14 : undefined, top: Math.max(0, y - 20) }}
    >
      <p className="mb-1.5 text-xs font-medium text-slate-500">{title}</p>
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-2">
          <span className="h-0.5 w-3 rounded-full" style={{ background: r.color }} />
          <span className="text-sm font-bold text-slate-900">{r.value}</span>
          <span className="text-xs text-slate-500">{r.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Courbe (aire) avec réticule                                         */
/* ------------------------------------------------------------------ */

// Courbe monotone (Fritsch–Carlson) : lisse sans jamais passer sous zéro.
function monotonePath(pts) {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M${pts[0][0]},${pts[0][1]}`;
  const n = pts.length;
  const dx = [], dy = [], m = [];
  for (let i = 0; i < n - 1; i++) {
    dx.push(pts[i + 1][0] - pts[i][0]);
    dy.push(pts[i + 1][1] - pts[i][1]);
    m.push(dy[i] / dx[i]);
  }
  const t = [m[0]];
  for (let i = 1; i < n - 1; i++) t.push(m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2);
  t.push(m[n - 2]);
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) { t[i] = 0; t[i + 1] = 0; continue; }
    const a = t[i] / m[i], b = t[i + 1] / m[i], s = a * a + b * b;
    if (s > 9) { const k = 3 / Math.sqrt(s); t[i] = k * a * m[i]; t[i + 1] = k * b * m[i]; }
  }
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += `C${pts[i][0] + h},${pts[i][1] + t[i] * h} ${pts[i + 1][0] - h},${pts[i + 1][1] - t[i + 1] * h} ${pts[i + 1][0]},${pts[i + 1][1]}`;
  }
  return d;
}

export function AreaChart({ data, valueKey, color, formatValue, seriesLabel, extraRows, height: fullHeight = 260, animationKey }) {
  const [ref, width] = useMeasure();
  const height = width && width < 520 ? Math.min(fullHeight, 260) : fullHeight;
  const nav = useIndexNav(data.length);
  const m = { top: 12, right: 12, bottom: 30, left: 52 };
  const w = Math.max(0, width - m.left - m.right);
  const h = height - m.top - m.bottom;
  const ticks = niceTicks(Math.max(...data.map((d) => d[valueKey]), 0));
  const top = ticks[ticks.length - 1];
  const x = (i) => m.left + (data.length > 1 ? (i / (data.length - 1)) * w : w / 2);
  const y = (v) => m.top + h - (v / top) * h;
  const pts = data.map((d, i) => [x(i), y(d[valueKey])]);
  const line = monotonePath(pts);
  const area = pts.length ? `${line}L${pts[pts.length - 1][0]},${m.top + h}L${pts[0][0]},${m.top + h}Z` : '';
  const labelEvery = Math.max(1, Math.ceil(data.length / Math.max(2, Math.floor(w / 72))));
  const gradId = `area-${valueKey}`;

  const onPointerMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left - m.left;
    const i = data.length > 1 ? Math.round((px / w) * (data.length - 1)) : 0;
    nav.setIndex(Math.max(0, Math.min(data.length - 1, i)));
  };

  const active = nav.index !== null ? data[nav.index] : null;

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {width > 0 && (
        <svg
          width={width}
          height={height}
          className="overflow-visible outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 rounded-lg"
          role="img"
          aria-label={`${seriesLabel} — utilisez les flèches pour parcourir les valeurs`}
          {...nav.focusProps}
          onPointerMove={onPointerMove}
          onPointerLeave={() => nav.setIndex(null)}
        >
          <defs>
            <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.16" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={m.left} x2={m.left + w} y1={y(t)} y2={y(t)} stroke={t === 0 ? INK.axis : INK.grid} strokeWidth="1" />
              <text x={m.left - 10} y={y(t)} dy="0.32em" textAnchor="end" fontSize="11" fill={INK.muted} style={{ fontVariantNumeric: 'tabular-nums' }}>
                {compact(t)}
              </text>
            </g>
          ))}
          {data.map((d, i) => ((i % labelEvery === 0 && data.length - 1 - i >= labelEvery * 0.75) || i === data.length - 1) && (
            <text key={d.key} x={x(i)} y={height - 8} textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'} fontSize="11" fill={INK.muted}>
              {d.label}
            </text>
          ))}
          <motion.path
            key={`a-${animationKey}`}
            d={area}
            fill={`url(#${gradId})`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          />
          <motion.path
            key={`l-${animationKey}`}
            d={line}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.2, ease: EASE }}
          />
          {pts.length > 0 && nav.index === null && (
            <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="4" fill={color} stroke={INK.surface} strokeWidth="2" />
          )}
          {active && (
            <g pointerEvents="none">
              <line x1={x(nav.index)} x2={x(nav.index)} y1={m.top} y2={m.top + h} stroke={INK.axis} strokeWidth="1" />
              <circle cx={x(nav.index)} cy={y(active[valueKey])} r="5" fill={color} stroke={INK.surface} strokeWidth="2" />
            </g>
          )}
          <rect x={m.left} y={m.top} width={w} height={h} fill="transparent" />
        </svg>
      )}
      {active && (
        <Tooltip
          x={x(nav.index)}
          y={y(active[valueKey])}
          width={width}
          title={active.longLabel}
          rows={[{ label: seriesLabel, value: formatValue(active[valueKey]), color }, ...(extraRows ? extraRows(active) : [])]}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Colonnes (≤ 24 px, extrémité arrondie, base carrée)                 */
/* ------------------------------------------------------------------ */

const columnPath = (x, y, w, h, r) => {
  if (h <= 0) return '';
  const rr = Math.min(r, h, w / 2);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
};

export function ColumnChart({ data, valueKey, color, formatValue, seriesLabel, height: fullHeight = 240, animationKey }) {
  const [ref, width] = useMeasure();
  const height = width && width < 520 ? Math.min(fullHeight, 240) : fullHeight;
  const nav = useIndexNav(data.length);
  const m = { top: 20, right: 8, bottom: 30, left: 36 };
  const w = Math.max(0, width - m.left - m.right);
  const h = height - m.top - m.bottom;
  const max = Math.max(...data.map((d) => d[valueKey]), 0);
  const ticks = niceTicks(max, 3);
  const top = ticks[ticks.length - 1];
  const band = data.length ? w / data.length : 0;
  const barW = Math.max(2, Math.min(24, band * 0.62));
  const y = (v) => m.top + h - (v / top) * h;
  const maxIndex = data.findIndex((d) => d[valueKey] === max && max > 0);
  const labelEvery = Math.max(1, Math.ceil(data.length / Math.max(2, Math.floor(w / 64))));
  const active = nav.index !== null ? data[nav.index] : null;

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {width > 0 && (
        <svg
          width={width}
          height={height}
          className="overflow-visible rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
          role="img"
          aria-label={`${seriesLabel} — utilisez les flèches pour parcourir les valeurs`}
          {...nav.focusProps}
          onPointerLeave={() => nav.setIndex(null)}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line x1={m.left} x2={m.left + w} y1={y(t)} y2={y(t)} stroke={t === 0 ? INK.axis : INK.grid} strokeWidth="1" />
              <text x={m.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize="11" fill={INK.muted} style={{ fontVariantNumeric: 'tabular-nums' }}>
                {compact(t)}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const bx = m.left + i * band + (band - barW) / 2;
            const by = y(d[valueKey]);
            const dim = nav.index !== null && nav.index !== i;
            return (
              <g key={d.key}>
                <motion.path
                  key={`${animationKey}-${d.key}`}
                  d={columnPath(bx, by, barW, m.top + h - by, 4)}
                  fill={color}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1, opacity: dim ? 0.45 : 1 }}
                  transition={{ scaleY: { duration: 0.7, delay: i * (0.4 / data.length), ease: EASE }, opacity: { duration: 0.15 } }}
                  style={{ transformBox: 'fill-box', transformOrigin: '50% 100%' }}
                />
                {i === maxIndex && nav.index === null && (
                  <text x={bx + barW / 2} y={by - 6} textAnchor="middle" fontSize="11" fontWeight="600" fill={INK.secondary}>
                    {formatValue(d[valueKey])}
                  </text>
                )}
                {(i % labelEvery === 0) && (
                  <text x={m.left + i * band + band / 2} y={height - 8} textAnchor="middle" fontSize="11" fill={INK.muted}>{d.label}</text>
                )}
                {/* Zone de survol : toute la bande, bien plus grande que la barre */}
                <rect x={m.left + i * band} y={m.top} width={band} height={h} fill="transparent" onPointerEnter={() => nav.setIndex(i)} />
              </g>
            );
          })}
        </svg>
      )}
      {active && (
        <Tooltip
          x={m.left + nav.index * band + band / 2}
          y={y(active[valueKey])}
          width={width}
          title={active.longLabel}
          rows={[{ label: seriesLabel, value: formatValue(active[valueKey]), color }]}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Anneau (part du tout, ≤ 6 segments, écart de 2 px)                  */
/* ------------------------------------------------------------------ */

const polar = (cx, cy, r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
const arcPath = (cx, cy, r, a0, a1) => {
  const [x0, y0] = polar(cx, cy, r, a0);
  const [x1, y1] = polar(cx, cy, r, a1);
  return `M${x0},${y0}A${r},${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${x1},${y1}`;
};

export function DonutChart({ segments, centerLabel, size = 200, thickness = 20, animationKey }) {
  const [hover, setHover] = useState(null);
  const total = segments.reduce((a, s) => a + s.value, 0);
  const r = size / 2 - thickness / 2 - 2;
  const c = size / 2;
  const gap = total > 0 && segments.filter((s) => s.value > 0).length > 1 ? 2 / r : 0; // 2 px de surface entre segments

  const arcs = segments.map((s, i) => {
    const before = segments.slice(0, i).reduce((acc, p) => acc + p.value, 0);
    const start = -Math.PI / 2 + (total ? (before / total) * Math.PI * 2 : 0);
    const sweep = total ? (s.value / total) * Math.PI * 2 : 0;
    const a0 = start + gap / 2;
    const a1 = start + sweep - gap / 2;
    return { ...s, a0, a1, visible: s.value > 0 && a1 > a0 };
  });
  const focus = hover !== null ? segments[hover] : null;

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row lg:flex-col 2xl:flex-row">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} role="img" aria-label={`${centerLabel} : ${total}`}>
          <circle cx={c} cy={c} r={r} fill="none" stroke="#f1f5f9" strokeWidth={thickness} />
          {arcs.map((a, i) => a.visible && (
            <motion.path
              key={`${animationKey}-${a.id}`}
              d={a.a1 - a.a0 >= Math.PI * 2 - 0.001 ? `M${c},${c - r}a${r},${r} 0 1 1 -0.01,0` : arcPath(c, c, r, a.a0, a.a1)}
              fill="none"
              stroke={a.color}
              strokeWidth={hover === i ? thickness + 6 : thickness}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1, opacity: hover !== null && hover !== i ? 0.4 : 1 }}
              transition={{ pathLength: { duration: 0.9, delay: 0.15 * i, ease: EASE }, opacity: { duration: 0.15 } }}
              onPointerEnter={() => setHover(i)}
              onPointerLeave={() => setHover(null)}
              style={{ cursor: 'pointer', transition: 'stroke-width 0.2s' }}
            />
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-3xl font-extrabold text-slate-900">{focus ? focus.value : total}</span>
          <span className="max-w-[110px] text-xs font-medium text-slate-500">{focus ? focus.label : centerLabel}</span>
        </div>
      </div>
      {/* Légende = étiquettes directes (valeur + %), toujours visibles */}
      <ul className="w-full min-w-0 flex-1 space-y-1">
        {segments.map((s, i) => (
          <li
            key={s.id}
            tabIndex={0}
            onPointerEnter={() => setHover(i)}
            onPointerLeave={() => setHover(null)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
            className={`flex items-center gap-3 rounded-xl px-3 py-2 outline-none transition-colors ${hover === i ? 'bg-slate-50' : ''}`}
          >
            <span className="h-3 w-3 shrink-0 rounded-[3px]" style={{ background: s.color }} />
            <span className="flex-1 truncate text-sm text-slate-600">{s.label}</span>
            <span className="text-sm font-bold text-slate-900 tabular-nums">{s.value}</span>
            <span className="w-11 text-right text-xs text-slate-500 tabular-nums">{total ? Math.round((s.value / total) * 100) : 0} %</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Barres horizontales (classement)                                    */
/* ------------------------------------------------------------------ */

export function BarList({ items, color, formatValue, detail, emptyText, animationKey }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(...items.map((i) => i.value), 0);
  if (!items.length) {
    return <p className="py-10 text-center text-sm text-slate-500">{emptyText}</p>;
  }
  return (
    <ul className="space-y-4">
      {items.map((item, i) => (
        <li
          key={item.label}
          tabIndex={0}
          onPointerEnter={() => setHover(i)}
          onPointerLeave={() => setHover(null)}
          onFocus={() => setHover(i)}
          onBlur={() => setHover(null)}
          className="group rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
        >
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <span className="text-xs font-bold text-slate-400 tabular-nums">{i + 1}</span>
              <span className="truncate font-medium text-slate-700">{item.label}</span>
            </span>
            <span className="shrink-0 text-xs text-slate-500 transition-opacity" style={{ opacity: hover === i ? 1 : 0 }}>{detail(item)}</span>
          </div>
          {/* Valeur posée au bout de la barre ; la plus longue barre laisse 7rem pour son étiquette */}
          <div className="flex items-center gap-3">
            <motion.div
              key={`${animationKey}-${item.label}`}
              className="h-2.5 shrink-0 rounded-r-[4px]"
              style={{
                width: `calc((100% - 7rem) * ${max ? item.value / max : 0})`,
                background: color,
                transformOrigin: 'left',
                opacity: hover !== null && hover !== i ? 0.45 : 1,
                transition: 'opacity 0.15s',
              }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.8, delay: i * 0.08, ease: EASE }}
            />
            <span className="shrink-0 whitespace-nowrap text-sm font-bold text-slate-900">{formatValue(item.value)}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Sparkline (tendance discrète, point actuel en accent)               */
/* ------------------------------------------------------------------ */

export function Sparkline({ values, accent, height = 36, dark = false }) {
  const [ref, width] = useMeasure();
  const max = Math.max(...values, 0) || 1;
  const pts = values.map((v, i) => [values.length > 1 ? (i / (values.length - 1)) * (width - 8) + 4 : width / 2, height - 4 - (v / max) * (height - 8)]);
  const last = pts[pts.length - 1];
  return (
    <div ref={ref} className="w-full" style={{ height }}>
      {width > 0 && pts.length > 0 && (
        <svg width={width} height={height} aria-hidden="true">
          <path d={monotonePath(pts)} fill="none" stroke={dark ? 'rgba(255,255,255,0.35)' : '#cbd5e1'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={last[0]} cy={last[1]} r="4" fill={accent} stroke={dark ? '#0b2a1f' : '#fff'} strokeWidth="2" />
        </svg>
      )}
    </div>
  );
}
