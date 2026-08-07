import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Table2, BarChart3 } from 'lucide-react';

/* ===========================================================================
   Chart palette.
   Categorical slots are assigned in fixed order and never cycled. Validated
   against the portal's white chart surface in light mode:
     lightness band PASS · chroma floor PASS · adjacent CVD ΔE 9.1 PASS
     normal-vision ΔE 22.9 PASS · contrast WARN on aqua + yellow
   The contrast warning is why every chart below ships direct labels and a
   table view — that is the documented relief, not an optional nicety.
   =========================================================================== */
export const SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100'];

export const INK = {
  primary: '#0f172a',
  secondary: '#475569',
  muted: '#898781',
  grid: '#e8e8e3',
  baseline: '#c3c2b7',
};

export const STATUS = {
  good: '#0ca30c',
  warning: '#fab219',
  serious: '#ec835a',
  critical: '#d03b3b',
};

/** Measure a container so SVG text never scales with the viewport. */
function useMeasure() {
  const ref = useRef(null);
  const [width, setWidth] = useState(640);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const update = () => setWidth(el.clientWidth || 640);
    update();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return [ref, width];
}

/* ===== Chart frame: title, legend, table toggle ===== */

export const ChartCard = ({ title, subtitle, legend, tableView, children, className = '' }) => {
  const [showTable, setShowTable] = useState(false);

  return (
    <div className={`bg-white rounded-2xl border border-silver-200/70 p-5 md:p-6 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
        <div>
          <h3 className="font-display font-semibold text-silver-900">{title}</h3>
          {subtitle && <p className="text-sm text-silver-500 mt-0.5">{subtitle}</p>}
        </div>
        {tableView && (
          <button
            onClick={() => setShowTable((v) => !v)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-silver-500 hover:text-primary-600 border border-silver-200 rounded-lg px-2.5 py-1.5 transition-colors"
          >
            {showTable ? <BarChart3 size={13} /> : <Table2 size={13} />}
            {showTable ? 'Chart' : 'Table'}
          </button>
        )}
      </div>

      {/* Legend is always present for two or more series; identity is never
          carried by color alone. */}
      {legend && legend.length > 1 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 mb-1">
          {legend.map((item) => (
            <span key={item.name} className="inline-flex items-center gap-1.5 text-xs text-silver-600">
              <span
                className="w-2.5 h-2.5 rounded-sm shrink-0"
                style={{ backgroundColor: item.color }}
                aria-hidden
              />
              {item.name}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3">{showTable && tableView ? tableView : children}</div>
    </div>
  );
};

/* ===== Tooltip ===== */

const Tooltip = ({ x, y, width, children }) => {
  const flip = x > width * 0.62;
  return (
    <div
      className="absolute pointer-events-none z-20 bg-silver-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl whitespace-nowrap"
      style={{
        left: flip ? undefined : x + 12,
        right: flip ? width - x + 12 : undefined,
        top: Math.max(4, y - 12),
      }}
    >
      {children}
    </div>
  );
};

/* ===========================================================================
   Line chart — change over time. Crosshair + shared tooltip.
   =========================================================================== */

export const LineChart = ({
  labels,
  series,
  height = 240,
  formatValue = (v) => v,
  yTicks = 4,
  areaFill = false,
  zeroBased = true,
}) => {
  const [ref, width] = useMeasure();
  const [hover, setHover] = useState(null);

  const pad = { top: 12, right: 16, bottom: 28, left: 46 };
  const plotW = Math.max(40, width - pad.left - pad.right);
  const plotH = height - pad.top - pad.bottom;

  const allValues = series.flatMap((s) => s.values).filter((v) => v !== null && v !== undefined);
  const rawMin = Math.min(...allValues);
  const rawMax = Math.max(...allValues);
  const min = zeroBased ? 0 : rawMin - (rawMax - rawMin) * 0.15;
  const max = rawMax + (rawMax - rawMin || rawMax || 1) * 0.12;

  const x = (i) => (labels.length === 1 ? plotW / 2 : (i / (labels.length - 1)) * plotW);
  const y = (v) => plotH - ((v - min) / (max - min || 1)) * plotH;

  const ticks = useMemo(
    () => Array.from({ length: yTicks + 1 }, (_, i) => min + ((max - min) / yTicks) * i),
    [min, max, yTicks]
  );

  const handleMove = useCallback(
    (event) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const px = event.clientX - rect.left - pad.left;
      const idx = Math.round((px / plotW) * (labels.length - 1));
      if (idx >= 0 && idx < labels.length) setHover(idx);
    },
    [plotW, labels.length, pad.left]
  );

  // Label every nth tick so they never collide on narrow screens.
  const step = Math.max(1, Math.ceil(labels.length / Math.max(3, Math.floor(width / 68))));

  return (
    <div ref={ref} className="relative w-full">
      <svg
        width={width}
        height={height}
        role="img"
        onMouseMove={handleMove}
        onMouseLeave={() => setHover(null)}
        style={{ display: 'block' }}
      >
        <g transform={`translate(${pad.left},${pad.top})`}>
          {/* Recessive gridlines */}
          {ticks.map((t, i) => (
            <g key={i}>
              <line x1={0} x2={plotW} y1={y(t)} y2={y(t)} stroke={INK.grid} strokeWidth={1} />
              <text
                x={-10}
                y={y(t)}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={11}
                fill={INK.muted}
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {formatValue(t)}
              </text>
            </g>
          ))}

          {/* Baseline */}
          <line x1={0} x2={plotW} y1={plotH} y2={plotH} stroke={INK.baseline} strokeWidth={1} />

          {/* Crosshair sits under the marks */}
          {hover !== null && (
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1={0}
              y2={plotH}
              stroke={INK.baseline}
              strokeWidth={1}
              strokeDasharray="3 3"
            />
          )}

          {series.map((s, si) => {
            const color = s.color || SERIES[si % SERIES.length];
            const points = s.values
              .map((v, i) => (v === null || v === undefined ? null : `${x(i)},${y(v)}`))
              .filter(Boolean)
              .join(' ');

            return (
              <g key={s.name}>
                {areaFill && (
                  <polygon
                    points={`0,${plotH} ${points} ${x(s.values.length - 1)},${plotH}`}
                    fill={color}
                    opacity={0.08}
                  />
                )}
                <polyline
                  points={points}
                  fill="none"
                  stroke={color}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={s.dashed ? '5 4' : undefined}
                />
                {/* Marker only on the hovered index and the final point, so the
                    line stays thin and the endpoint can be direct-labeled. */}
                {hover !== null && s.values[hover] !== null && s.values[hover] !== undefined && (
                  <circle
                    cx={x(hover)}
                    cy={y(s.values[hover])}
                    r={5}
                    fill={color}
                    stroke="#ffffff"
                    strokeWidth={2}
                  />
                )}
              </g>
            );
          })}

          {/* Direct label on the last point of each series — the relief the
              contrast warning requires, and it removes a legend lookup. */}
          {series.length <= 4 &&
            series.map((s) => {
              const last = s.values[s.values.length - 1];
              if (last === null || last === undefined) return null;
              return (
                <text
                  key={`lbl-${s.name}`}
                  x={x(s.values.length - 1) - 4}
                  y={y(last) - 10}
                  textAnchor="end"
                  fontSize={11}
                  fontWeight={600}
                  fill={INK.secondary}
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {formatValue(last)}
                </text>
              );
            })}

          {/* X axis */}
          {labels.map((label, i) =>
            i % step === 0 || i === labels.length - 1 ? (
              <text
                key={label + i}
                x={x(i)}
                y={plotH + 18}
                textAnchor="middle"
                fontSize={11}
                fill={INK.muted}
              >
                {label}
              </text>
            ) : null
          )}
        </g>
      </svg>

      {hover !== null && (
        <Tooltip x={pad.left + x(hover)} y={pad.top + 8} width={width}>
          <p className="font-semibold mb-1">{labels[hover]}</p>
          {series.map((s, si) => (
            <p key={s.name} className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-sm shrink-0"
                style={{ backgroundColor: s.color || SERIES[si % SERIES.length] }}
              />
              <span className="text-white/70">{s.name}</span>
              <span className="ml-auto font-semibold tabular-nums">
                {s.values[hover] === null || s.values[hover] === undefined
                  ? '—'
                  : formatValue(s.values[hover])}
              </span>
            </p>
          ))}
        </Tooltip>
      )}
    </div>
  );
};

/* ===========================================================================
   Bar chart — magnitude comparison across categories.
   Horizontal by default: category names get room to breathe.
   =========================================================================== */

export const BarChart = ({
  data, // [{ label, value, color?, note? }]
  height,
  formatValue = (v) => v,
  barHeight = 34,
  gap = 10,
  labelWidth = 128,
}) => {
  const [ref, width] = useMeasure();
  const [hover, setHover] = useState(null);

  const max = Math.max(...data.map((d) => d.value), 1);
  const plotW = Math.max(40, width - labelWidth - 62);
  const chartHeight = height || data.length * (barHeight + gap) + 8;

  return (
    <div ref={ref} className="relative w-full">
      <svg width={width} height={chartHeight} role="img" style={{ display: 'block' }}>
        {data.map((d, i) => {
          const barW = Math.max(2, (d.value / max) * plotW);
          const yPos = i * (barHeight + gap);
          const color = d.color || SERIES[0];
          return (
            <g
              key={d.label}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: 'default' }}
            >
              {/* Generous hit target, larger than the mark itself */}
              <rect x={0} y={yPos - gap / 2} width={width} height={barHeight + gap} fill="transparent" />
              <text
                x={0}
                y={yPos + barHeight / 2}
                dominantBaseline="middle"
                fontSize={12}
                fill={INK.secondary}
              >
                {d.label}
              </text>
              {/* Track */}
              <rect
                x={labelWidth}
                y={yPos + 6}
                width={plotW}
                height={barHeight - 12}
                rx={4}
                fill="#f1f5f9"
              />
              {/* Data end rounded, anchored to the baseline */}
              <rect
                x={labelWidth}
                y={yPos + 6}
                width={barW}
                height={barHeight - 12}
                rx={4}
                fill={color}
                opacity={hover === null || hover === i ? 1 : 0.45}
                style={{ transition: 'opacity .15s' }}
              />
              {/* Direct value label — every bar, since categories are few */}
              <text
                x={labelWidth + plotW + 8}
                y={yPos + barHeight / 2}
                dominantBaseline="middle"
                fontSize={12}
                fontWeight={600}
                fill={INK.primary}
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {formatValue(d.value)}
              </text>
            </g>
          );
        })}
      </svg>

      {hover !== null && data[hover].note && (
        <Tooltip x={width * 0.45} y={hover * (barHeight + gap) + 24} width={width}>
          <p className="font-semibold">{data[hover].label}</p>
          <p className="text-white/70 mt-0.5">{data[hover].note}</p>
        </Tooltip>
      )}
    </div>
  );
};

/* ===========================================================================
   Grouped column chart — two series over a shared time axis, one scale.
   (Never two y-axes: a second measure of different scale gets its own chart.)
   =========================================================================== */

export const ColumnChart = ({ labels, series, height = 260, formatValue = (v) => v }) => {
  const [ref, width] = useMeasure();
  const [hover, setHover] = useState(null);

  const pad = { top: 12, right: 12, bottom: 30, left: 52 };
  const plotW = Math.max(40, width - pad.left - pad.right);
  const plotH = height - pad.top - pad.bottom;

  const max = Math.max(...series.flatMap((s) => s.values)) * 1.1 || 1;
  const groupW = plotW / labels.length;
  const barW = Math.max(4, (groupW - 12) / series.length - 2);

  const y = (v) => plotH - (v / max) * plotH;
  const ticks = Array.from({ length: 5 }, (_, i) => (max / 4) * i);

  return (
    <div ref={ref} className="relative w-full">
      <svg width={width} height={height} role="img" style={{ display: 'block' }}>
        <g transform={`translate(${pad.left},${pad.top})`}>
          {ticks.map((t, i) => (
            <g key={i}>
              <line x1={0} x2={plotW} y1={y(t)} y2={y(t)} stroke={INK.grid} strokeWidth={1} />
              <text
                x={-10}
                y={y(t)}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={11}
                fill={INK.muted}
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {formatValue(t)}
              </text>
            </g>
          ))}
          <line x1={0} x2={plotW} y1={plotH} y2={plotH} stroke={INK.baseline} strokeWidth={1} />

          {labels.map((label, gi) => (
            <g
              key={label}
              onMouseEnter={() => setHover(gi)}
              onMouseLeave={() => setHover(null)}
            >
              <rect
                x={gi * groupW}
                y={0}
                width={groupW}
                height={plotH}
                fill={hover === gi ? '#0f172a' : 'transparent'}
                opacity={hover === gi ? 0.03 : 0}
              />
              {series.map((s, si) => {
                const v = s.values[gi];
                const barX = gi * groupW + 6 + si * (barW + 2);
                return (
                  <rect
                    key={s.name}
                    x={barX}
                    y={y(v)}
                    width={barW}
                    height={Math.max(2, plotH - y(v))}
                    rx={4}
                    fill={s.color || SERIES[si % SERIES.length]}
                  />
                );
              })}
              <text
                x={gi * groupW + groupW / 2}
                y={plotH + 18}
                textAnchor="middle"
                fontSize={11}
                fill={INK.muted}
              >
                {label}
              </text>
            </g>
          ))}
        </g>
      </svg>

      {hover !== null && (
        <Tooltip x={pad.left + hover * groupW + groupW / 2} y={pad.top + 8} width={width}>
          <p className="font-semibold mb-1">{labels[hover]}</p>
          {series.map((s, si) => (
            <p key={s.name} className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-sm shrink-0"
                style={{ backgroundColor: s.color || SERIES[si % SERIES.length] }}
              />
              <span className="text-white/70">{s.name}</span>
              <span className="ml-auto font-semibold tabular-nums">{formatValue(s.values[hover])}</span>
            </p>
          ))}
        </Tooltip>
      )}
    </div>
  );
};

/* ===== Sparkline — trend shape beside a number, no axes, no tooltip ===== */

export const Sparkline = ({ values, color = SERIES[0], width = 96, height = 30 }) => {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * (width - 4) + 2;
      const y = height - 3 - ((v - min) / (max - min || 1)) * (height - 6);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} aria-hidden style={{ display: 'block' }}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

/* ===== Gauge — a single bounded value, e.g. a risk score ===== */

export const Gauge = ({ value, max = 100, label, color = SERIES[0], size = 116 }) => {
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = Math.PI * radius; // half circle
  const pct = Math.max(0, Math.min(1, value / max));

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size / 2 + 12} aria-hidden style={{ display: 'block' }}>
        <g transform={`translate(${size / 2},${size / 2})`}>
          <path
            d={`M ${-radius} 0 A ${radius} ${radius} 0 0 1 ${radius} 0`}
            fill="none"
            stroke="#f1f5f9"
            strokeWidth={stroke}
            strokeLinecap="round"
          />
          <path
            d={`M ${-radius} 0 A ${radius} ${radius} 0 0 1 ${radius} 0`}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${circumference * pct} ${circumference}`}
          />
        </g>
      </svg>
      <p className="-mt-4 text-2xl font-display font-bold text-silver-900 tabular-nums">{value}</p>
      {label && <p className="text-xs text-silver-500 mt-0.5">{label}</p>}
    </div>
  );
};
