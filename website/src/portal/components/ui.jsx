import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AlignJustify, ChevronDown, ChevronLeft, ChevronRight, ChevronsUpDown, ChevronUp,
  Inbox, List, Search, StretchHorizontal, X,
} from 'lucide-react';

/* ===========================================================================
   Density
   One scale, set once per area. The admin runs compact so a finance director
   sees more rows without scrolling; operational screens run comfortable.
   Every padding in this file comes from here — nothing hard-codes its own.
   =========================================================================== */

export const DENSITY = {
  compact: {
    cell: 'px-3 py-1.5',
    head: 'px-3 py-2',
    text: 'text-xs',
    card: 'p-3.5',
    stat: 'p-3.5',
    stack: 'space-y-3',
    grid: 'gap-3',
    heading: 'mb-3',
    title: 'text-base',
  },
  comfortable: {
    cell: 'px-4 py-3',
    head: 'px-4 py-2.5',
    text: 'text-sm',
    card: 'p-5 md:p-6',
    stat: 'p-5',
    stack: 'space-y-5',
    grid: 'gap-4',
    heading: 'mb-4',
    title: 'text-lg',
  },
  spacious: {
    cell: 'px-6 py-4',
    head: 'px-6 py-3.5',
    text: 'text-sm',
    card: 'p-6 md:p-8',
    stat: 'p-6',
    stack: 'space-y-6',
    grid: 'gap-6',
    heading: 'mb-5',
    title: 'text-lg',
  },
};

const DENSITY_ORDER = ['compact', 'comfortable', 'spacious'];
const DENSITY_ICON = { compact: AlignJustify, comfortable: List, spacious: StretchHorizontal };

const DensityContext = createContext('comfortable');

/** Horizontal padding per density, exposed as a CSS variable so a card header
    can line its text up with the first column of the table beneath it. */
const DENSITY_PAD_X = { compact: '0.75rem', comfortable: '1rem', spacious: '1.5rem' };

/**
 * Wrap an area to set its density. Admin wraps itself in `compact`.
 * Renders a real element so the padding variable has somewhere to live.
 */
export const DensityProvider = ({ value = 'comfortable', children, className = '' }) => {
  const key = DENSITY_ORDER.includes(value) ? value : 'comfortable';
  return (
    <DensityContext.Provider value={key}>
      <div
        className={`sg-density sg-density-${key} min-w-0 ${className}`}
        style={{ '--sg-pad-x': DENSITY_PAD_X[key] }}
      >
        {children}
      </div>
    </DensityContext.Provider>
  );
};

export const useDensity = () => {
  const key = useContext(DensityContext);
  return DENSITY[key] ? { key, ...DENSITY[key] } : { key: 'comfortable', ...DENSITY.comfortable };
};

/* ===========================================================================
   Formatting guardrails
   Nothing in this app is allowed to print "NaN", "undefined", "Invalid Date"
   or "$NaN" into a table cell. Every formatter takes anything and returns a
   string a person can read.
   =========================================================================== */

export const EMPTY = '—';

/** Anything → a finite number, or null. Zero survives; empty string does not. */
export const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'boolean') return null;
  const n = typeof value === 'number' ? value : Number(String(value).replace(/[\s,]/g, ''));
  return Number.isFinite(n) ? n : null;
};

export const money = (value, currency = 'USD') => {
  const n = toNumber(value);
  if (n === null) return EMPTY;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    // An unknown currency code must not take the page down.
    return `${currency} ${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  }
};

export const num = (value, digits = 0) => {
  const n = toNumber(value);
  if (n === null) return EMPTY;
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(n);
};

export const pct = (value, digits = 1) => {
  const n = toNumber(value);
  if (n === null) return EMPTY;
  return `${n.toFixed(digits)}%`;
};

const parseDate = (value) => {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const dateLabel = (value) => {
  const d = parseDate(value);
  if (!d) return EMPTY;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const timeLabel = (value) => {
  const d = parseDate(value);
  if (!d) return EMPTY;
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
};

/** Clip a string to a sane length; the full value stays in the title attribute. */
export const clip = (value, max = 60) => {
  const s = value === null || value === undefined ? '' : String(value);
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
};

const DASH = <span className="text-silver-300">{EMPTY}</span>;

/**
 * Anything → something React can actually render.
 *
 * React throws on a plain object child, and happily prints "NaN" or "Infinity"
 * for a number. Both have to be caught before they reach the DOM, so every
 * component that accepts caller-supplied content routes through here.
 */
export const safeNode = (value, fallback = DASH) => {
  if (value === null || value === undefined) return fallback;
  if (React.isValidElement(value)) return value;

  const type = typeof value;
  if (type === 'number') return Number.isFinite(value) ? value : fallback;
  if (type === 'string') return value.trim() === '' ? fallback : value;
  if (type === 'bigint') return String(value);
  if (type === 'boolean' || type === 'function' || type === 'symbol') return fallback;

  if (Array.isArray(value)) {
    return value.length && value.every((v) => React.isValidElement(v) || typeof v === 'string' || typeof v === 'number')
      ? value
      : fallback;
  }
  // A plain object would throw "Objects are not valid as a React child".
  return fallback;
};

/** Is this value one a reader would consider blank? Used by the sort. */
const isMissing = (v) =>
  v === null || v === undefined || (typeof v === 'string' && v.trim() === '') ||
  (typeof v === 'number' && !Number.isFinite(v));

/* ===========================================================================
   Surfaces
   =========================================================================== */

export const Card = ({ children, className = '', padded = true, density: densityProp, ...rest }) => {
  const ctx = useDensity();
  const d = densityProp ? DENSITY[densityProp] || DENSITY.comfortable : ctx;
  return (
    <div
      // min-w-0 lets the card shrink inside a grid track instead of forcing
      // the whole row wider than the viewport.
      className={`bg-white rounded-2xl border border-silver-200/70 shadow-[0_1px_2px_rgba(15,23,42,0.04)] min-w-0 ${
        padded ? d.card : ''
      } ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
};

export const SectionHeading = ({ title, description, action }) => {
  const d = useDensity();
  return (
    <div className={`flex flex-wrap items-end justify-between gap-3 ${d.heading}`}>
      <div className="min-w-0">
        <h2 className={`${d.title} font-display font-semibold text-silver-900 truncate`}>{title}</h2>
        {description && <p className="text-sm text-silver-500 mt-0.5">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};

/* ===== Stat tile ===== */

export const StatCard = ({ label, value, unit, delta, deltaLabel, icon: Icon, tone = 'default' }) => {
  const d = useDensity();
  const compact = d.key === 'compact';
  const tones = {
    default: 'text-silver-900',
    good: 'text-[#0ca30c]',
    warning: 'text-[#b07800]',
    critical: 'text-[#d03b3b]',
  };
  const deltaNum = toNumber(delta);

  return (
    <div className={`bg-white rounded-2xl border border-silver-200/70 ${d.stat} relative overflow-hidden min-w-0`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p
            className={`font-medium uppercase tracking-wider text-silver-500 truncate ${
              compact ? 'text-[10px] mb-1' : 'text-xs mb-2'
            }`}
            title={label}
          >
            {label}
          </p>
          <p
            className={`font-display font-bold leading-none truncate ${tones[tone]} ${
              compact ? 'text-xl' : 'text-2xl md:text-3xl'
            }`}
            title={typeof value === 'string' || Number.isFinite(value) ? String(value) : undefined}
          >
            {safeNode(value, EMPTY)}
            {unit && <span className="text-base font-medium text-silver-400 ml-1">{safeNode(unit, '')}</span>}
          </p>
          {(deltaNum !== null || deltaLabel) && (
            <p className={`text-silver-500 truncate ${compact ? 'mt-1 text-[11px]' : 'mt-2 text-xs'}`} title={deltaLabel}>
              {deltaNum !== null && (
                <span
                  className={`font-semibold mr-1.5 ${
                    deltaNum > 0 ? 'text-[#006300]' : deltaNum < 0 ? 'text-[#d03b3b]' : 'text-silver-500'
                  }`}
                >
                  {deltaNum > 0 ? '▲' : deltaNum < 0 ? '▼' : '■'} {Math.abs(deltaNum)}%
                </span>
              )}
              {deltaLabel}
            </p>
          )}
        </div>
        {Icon && (
          <div
            className={`rounded-xl bg-primary-50 flex items-center justify-center shrink-0 ${
              compact ? 'w-8 h-8' : 'w-10 h-10'
            }`}
          >
            <Icon size={compact ? 15 : 18} className="text-primary-600" />
          </div>
        )}
      </div>
    </div>
  );
};

/* ===== Badges ===== */

const BADGE_TONES = {
  neutral: 'bg-silver-100 text-silver-700 border-silver-200',
  info: 'bg-primary-50 text-primary-700 border-primary-200',
  good: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-800 border-amber-200',
  critical: 'bg-red-50 text-red-700 border-red-200',
  violet: 'bg-violet-50 text-violet-700 border-violet-200',
};

export const Badge = ({ children, tone = 'neutral', icon: Icon, className = '' }) => (
  <span
    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-medium border whitespace-nowrap max-w-full ${
      BADGE_TONES[tone] || BADGE_TONES.neutral
    } ${className}`}
  >
    {Icon && <Icon size={12} className="shrink-0" />}
    <span className="truncate">{safeNode(children, EMPTY)}</span>
  </span>
);

export const statusTone = (status) => {
  const map = {
    Delivered: 'good', Completed: 'good', Accepted: 'good', Posted: 'good', Paid: 'good',
    Approved: 'good', 'In Transit': 'info', 'On Water': 'info', 'In Progress': 'info',
    Sent: 'info', Submitted: 'info', Planned: 'neutral', Draft: 'neutral',
    Offered: 'warning', 'At Border': 'warning', 'Awaiting Rail': 'warning',
    'Needs Review': 'warning', Open: 'warning', Requested: 'warning', Outstanding: 'warning',
    Pending: 'warning', Confirmed: 'good', Delayed: 'critical', Declined: 'critical',
    Failed: 'critical', Workshop: 'critical', Overdue: 'critical', Rejected: 'critical',
  };
  return map[status] || 'neutral';
};

/* ===== Form controls ===== */

export const Field = ({ label, hint, error, children, required }) => (
  <label className="block min-w-0">
    <span className="block text-sm font-medium text-silver-700 mb-1.5">
      {label}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </span>
    {children}
    {error ? (
      <span className="block text-xs text-red-600 mt-1.5">{error}</span>
    ) : hint ? (
      <span className="block text-xs text-silver-400 mt-1.5">{hint}</span>
    ) : null}
  </label>
);

export const Input = (props) => <input className="input-field" {...props} />;

export const TextArea = (props) => <textarea rows={3} className="input-field resize-y" {...props} />;

export const Select = ({ children, ...props }) => (
  <div className="relative min-w-0">
    <select className="input-field appearance-none pr-10 cursor-pointer truncate" {...props}>
      {children}
    </select>
    <ChevronDown
      size={16}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-silver-400 pointer-events-none"
    />
  </div>
);

export const Toggle = ({ checked, onChange, label, description }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className="flex items-start gap-3 text-left w-full group min-w-0"
  >
    <span
      className={`mt-0.5 w-10 h-6 rounded-full shrink-0 transition-colors relative ${
        checked ? 'bg-primary-500' : 'bg-silver-300'
      }`}
    >
      <span
        className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
          checked ? 'left-[1.125rem]' : 'left-0.5'
        }`}
      />
    </span>
    <span className="min-w-0">
      <span className="block text-sm font-medium text-silver-800">{label}</span>
      {description && <span className="block text-xs text-silver-500 mt-0.5">{description}</span>}
    </span>
  </button>
);

export const Button = ({ variant = 'primary', size = 'md', className = '', icon: Icon, children, ...rest }) => {
  const base =
    'inline-flex items-center justify-center gap-2 font-display font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0';
  const sizes = { xs: 'px-2.5 py-1 text-xs', sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2.5 text-sm', lg: 'px-6 py-3 text-base' };
  const variants = {
    primary:
      'bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30 hover:-translate-y-px',
    secondary: 'bg-white text-silver-800 border border-silver-200 hover:border-primary-300 hover:text-primary-600',
    ghost: 'text-silver-600 hover:bg-silver-100 hover:text-primary-600',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    dark: 'bg-silver-900 text-white hover:bg-silver-800',
  };
  return (
    <button className={`${base} ${sizes[size] || sizes.md} ${variants[variant]} ${className}`} {...rest}>
      {Icon && <Icon size={size === 'lg' ? 18 : 14} className="shrink-0" />}
      {children}
    </button>
  );
};

/* ===== Tabs ===== */

export const Tabs = ({ tabs, active, onChange }) => (
  <div className="flex gap-1 p-1 bg-silver-100 rounded-xl overflow-x-auto custom-scroll">
    {tabs.map((tab) => (
      <button
        key={tab.key}
        onClick={() => onChange(tab.key)}
        className={`px-3.5 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-all shrink-0 ${
          active === tab.key
            ? 'bg-white text-primary-700 shadow-sm'
            : 'text-silver-600 hover:text-silver-900'
        }`}
      >
        {tab.label}
        {tab.count !== undefined && tab.count !== null && (
          <span className="ml-2 text-xs text-silver-400 tabular-nums">{tab.count}</span>
        )}
      </button>
    ))}
  </div>
);

/* ===========================================================================
   DataTable

   Guardrails, all of them enforced here rather than at each of the ~30 call
   sites: every cell survives null/undefined/NaN, long values truncate with the
   full text on hover, the table scrolls inside its own box so it can never
   widen the page, and large sets paginate instead of rendering 5,000 rows.

   Optional: sortable columns, a totals footer, and a density toggle.
   =========================================================================== */

const alignClass = (align) =>
  align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';

/** Compare two present values. Blanks are handled by the caller, not here. */
const compareValues = (a, b) => {
  const an = toNumber(a);
  const bn = toNumber(b);
  if (an !== null && bn !== null) return an - bn;

  const ad = parseDate(a);
  const bd = parseDate(b);
  if (ad && bd) return ad - bd;

  return String(a).localeCompare(String(b), 'en', { numeric: true, sensitivity: 'base' });
};

export const DataTable = ({
  columns,
  rows,
  onRowClick,
  /** (row) => path. Makes the whole row a link to that record's detail page. */
  rowLink,
  empty = 'Nothing here yet.',
  emptyDescription,
  dense = false,
  density: densityProp,
  sortable = true,
  initialSort = null,
  showTotals = false,
  showDensityToggle = false,
  /** Rows per page. Pagination is on by default; pass 0 to render everything. */
  pageSize = 15,
  /** Free-text search across `searchKeys`, or every string field if omitted. */
  searchable = false,
  searchKeys = null,
  searchPlaceholder = 'Search…',
  /** [{ key, label, options?, filterValue? }] — dropdowns above the table. */
  filters = null,
  toolbar = null,
  /** Optional (row) => void, called on hover to warm a row's destination. */
  prefetchRow = null,
  maxHeight,
  minWidth = 640,
}) => {
  const ctx = useDensity();
  const navigate = useNavigate();
  const [override, setOverride] = useState(null);
  const densityKey = override || densityProp || (dense ? 'compact' : ctx.key);
  const d = DENSITY[densityKey] || DENSITY.comfortable;

  const [sortKey, setSortKey] = useState(initialSort?.key ?? null);
  const [sortDir, setSortDir] = useState(initialSort?.dir ?? 'asc');
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState({});

  // Memoised so the derived arrays below keep a stable identity between renders.
  const safeRows = useMemo(() => (Array.isArray(rows) ? rows : []), [rows]);
  const safeColumns = useMemo(
    () => (Array.isArray(columns) ? columns.filter(Boolean) : []),
    [columns]
  );

  /* ---- Filtering, before sorting and paging ---- */
  const filterDefs = useMemo(() => {
    if (!Array.isArray(filters)) return [];
    return filters.filter(Boolean).map((f) => {
      const valueOf = f.filterValue || ((row) => row?.[f.key]);
      const options = f.options
        || [...new Set(safeRows.map((row) => valueOf(row)).filter((v) => v !== null && v !== undefined && v !== ''))]
          .sort((a, b) => String(a).localeCompare(String(b)));
      return { ...f, valueOf, options };
    });
  }, [filters, safeRows]);

  const filtered = useMemo(() => {
    let out = safeRows;

    for (const f of filterDefs) {
      const selected = active[f.key];
      if (selected) out = out.filter((row) => String(f.valueOf(row)) === selected);
    }

    const q = query.trim().toLowerCase();
    if (q) {
      out = out.filter((row) => {
        if (!row) return false;
        const values = searchKeys
          ? searchKeys.map((k) => row[k])
          : Object.values(row).filter((v) => typeof v === 'string' || typeof v === 'number');
        return values.some((v) => String(v ?? '').toLowerCase().includes(q));
      });
    }
    return out;
  }, [safeRows, filterDefs, active, query, searchKeys]);

  // Any change to the underlying set must not strand the reader on page 9.
  // Adjusted during render rather than in an effect — React re-runs this
  // component immediately without committing the stale page to the DOM.
  const signature = `${filtered.length}|${sortKey ?? ''}|${sortDir}|${query}|${JSON.stringify(active)}`;
  const [lastSignature, setLastSignature] = useState(signature);
  if (signature !== lastSignature) {
    setLastSignature(signature);
    setPage(1);
  }

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const col = safeColumns.find((c) => c.key === sortKey);
    const valueOf = col?.sortValue || ((row) => row?.[sortKey]);
    return [...filtered].sort((a, b) => {
      const av = valueOf(a);
      const bv = valueOf(b);
      // Blanks sink to the bottom in BOTH directions — negating the whole
      // comparison would float them to the top on a descending sort, which
      // is never what someone scanning a column wants.
      const aMissing = isMissing(av);
      const bMissing = isMissing(bv);
      if (aMissing && bMissing) return 0;
      if (aMissing) return 1;
      if (bMissing) return -1;

      const result = compareValues(av, bv);
      return sortDir === 'asc' ? result : -result;
    });
  }, [filtered, safeColumns, sortKey, sortDir]);

  const totalPages = pageSize > 0 ? Math.max(1, Math.ceil(sorted.length / pageSize)) : 1;
  const currentPage = Math.min(page, totalPages);
  const visible = pageSize > 0
    ? sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : sorted;

  const hasToolbar = searchable || filterDefs.length > 0 || toolbar || showDensityToggle;
  const anyFilterActive = query.trim() !== '' || Object.values(active).some(Boolean);

  const clearFilters = () => { setQuery(''); setActive({}); };

  const handleRowActivate = (row) => {
    if (onRowClick) { onRowClick(row); return; }
    if (rowLink) {
      const path = rowLink(row);
      if (path) navigate(path);
    }
  };

  const totals = useMemo(() => {
    if (!showTotals) return null;
    const result = {};
    for (const col of safeColumns) {
      if (typeof col.total === 'function') {
        result[col.key] = safeRows.reduce((sum, row) => sum + (toNumber(col.total(row)) ?? 0), 0);
      }
    }
    return Object.keys(result).length ? result : null;
  }, [showTotals, safeColumns, safeRows]);

  const toggleSort = (col) => {
    if (!sortable || col.sortable === false) return;
    if (sortKey === col.key) setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(col.key); setSortDir('asc'); }
  };

  const cycleDensity = () => {
    const next = DENSITY_ORDER[(DENSITY_ORDER.indexOf(densityKey) + 1) % DENSITY_ORDER.length];
    setOverride(next);
    try { localStorage.setItem('silvergill.table.density', next); } catch { /* private mode */ }
  };

  const DensityIcon = DENSITY_ICON[densityKey];

  const Toolbar = hasToolbar ? (
    <div className="flex flex-wrap items-center gap-2 px-[var(--sg-pad-x,1rem)] pb-3 min-w-0">
      {searchable && (
        <div className="relative flex-1 min-w-[12rem] max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-silver-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-silver-200 rounded-lg text-silver-800 placeholder:text-silver-400 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
          />
        </div>
      )}

      {filterDefs.map((f) => (
        <div key={f.key} className="relative shrink-0">
          <select
            value={active[f.key] || ''}
            onChange={(e) => setActive((prev) => ({ ...prev, [f.key]: e.target.value }))}
            className={`appearance-none pl-2.5 pr-7 py-1.5 text-xs rounded-lg border cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-100 ${
              active[f.key]
                ? 'bg-primary-50 border-primary-300 text-primary-700 font-medium'
                : 'bg-white border-silver-200 text-silver-600'
            }`}
          >
            <option value="">{f.label}: all</option>
            {f.options.map((opt) => (
              <option key={String(opt)} value={String(opt)}>{String(opt)}</option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-silver-400 pointer-events-none" />
        </div>
      ))}

      {anyFilterActive && (
        <button
          onClick={clearFilters}
          className="inline-flex items-center gap-1 text-xs font-medium text-silver-500 hover:text-primary-600 px-2 py-1.5 shrink-0"
        >
          <X size={12} />
          Clear
        </button>
      )}

      <div className="flex-1" />

      {toolbar}

      {showDensityToggle && (
        <button
          onClick={cycleDensity}
          title={`Row height: ${densityKey}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-silver-500 hover:text-primary-600 border border-silver-200 rounded-lg px-2 py-1 transition-colors shrink-0"
        >
          <DensityIcon size={13} />
          <span className="capitalize hidden sm:inline">{densityKey}</span>
        </button>
      )}
    </div>
  ) : null;

  if (!safeRows.length) {
    return <EmptyState title={empty} description={emptyDescription} />;
  }

  // Filtered everything away — that is a different situation from "no data",
  // and needs a way back rather than a dead end.
  if (!sorted.length) {
    return (
      <div className="min-w-0">
        {Toolbar}
        <EmptyState
          title="Nothing matches those filters"
          description={`${safeRows.length} record${safeRows.length === 1 ? '' : 's'} are hidden by the current search or filters.`}
          icon={Search}
          action={
            <Button size="sm" variant="secondary" icon={X} onClick={clearFilters}>
              Clear filters
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="min-w-0">
      {Toolbar}

      {/* The scroll box: the table may be wider than the card, never the page. */}
      <div
        className="overflow-x-auto overflow-y-auto custom-scroll"
        style={maxHeight ? { maxHeight } : undefined}
      >
        <table className="w-full border-collapse" style={{ minWidth }}>
          <thead className={maxHeight ? 'sticky top-0 z-10 bg-white' : ''}>
            <tr className="border-b border-silver-200">
              {safeColumns.map((col) => {
                const isSorted = sortKey === col.key;
                const canSort = sortable && col.sortable !== false;
                return (
                  <th
                    key={col.key}
                    onClick={() => toggleSort(col)}
                    style={col.width ? { width: col.width } : undefined}
                    className={`${d.head} text-[11px] font-semibold uppercase tracking-wider text-silver-500 whitespace-nowrap ${alignClass(col.align)} ${
                      canSort ? 'cursor-pointer select-none hover:text-silver-800' : ''
                    }`}
                  >
                    <span
                      className={`inline-flex items-center gap-1.5 ${
                        col.align === 'right' ? 'flex-row-reverse' : ''
                      }`}
                    >
                      {col.label ?? col.header ?? ''}
                      {canSort && (
                        isSorted
                          ? (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)
                          : <ChevronsUpDown size={12} className="text-silver-300" />
                      )}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {visible.map((row, i) => (
              <tr
                key={row?.id ?? `row-${i}`}
                onClick={onRowClick || rowLink ? () => handleRowActivate(row) : undefined}
                // Hovering a navigable row warms its detail data, so the jump
                // feels free by the time the click lands.
                onMouseEnter={rowLink ? () => prefetchRow?.(row) : undefined}
                onKeyDown={
                  onRowClick || rowLink
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleRowActivate(row);
                        }
                      }
                    : undefined
                }
                tabIndex={onRowClick || rowLink ? 0 : undefined}
                role={rowLink ? 'link' : undefined}
                className={`border-b border-silver-100 last:border-0 transition-colors ${
                  onRowClick || rowLink
                    ? 'cursor-pointer hover:bg-primary-50/40 focus:bg-primary-50/60 focus:outline-none'
                    : 'hover:bg-silver-50/60'
                }`}
              >
                {safeColumns.map((col) => {
                  let content;
                  try {
                    content = col.render ? col.render(row) : row?.[col.key];
                  } catch {
                    // A bad row must lose one cell, never the whole screen.
                    content = null;
                  }
                  const raw = row?.[col.key];
                  const title =
                    col.title === false
                      ? undefined
                      : typeof content === 'string' || typeof content === 'number'
                      ? String(content)
                      : typeof raw === 'string' || typeof raw === 'number'
                      ? String(raw)
                      : undefined;

                  return (
                    <td
                      key={col.key}
                      title={title}
                      style={col.maxWidth ? { maxWidth: col.maxWidth } : undefined}
                      className={`${d.cell} ${d.text} text-silver-700 align-middle ${alignClass(col.align)} ${
                        col.align === 'right' || col.mono ? 'tabular-nums' : ''
                      } ${col.nowrap !== false ? 'whitespace-nowrap' : ''} ${
                        col.maxWidth ? 'truncate' : ''
                      }`}
                    >
                      {safeNode(content)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>

          {totals && (
            <tfoot>
              <tr className="border-t-2 border-silver-300 bg-silver-50">
                {safeColumns.map((col, i) => (
                  <td
                    key={col.key}
                    className={`${d.cell} ${d.text} font-semibold text-silver-900 whitespace-nowrap ${alignClass(col.align)} ${
                      col.align === 'right' ? 'tabular-nums' : ''
                    }`}
                  >
                    {totals[col.key] !== undefined
                      ? (col.totalRender ? col.totalRender(totals[col.key]) : num(totals[col.key]))
                      : i === 0
                      ? 'Total'
                      : ''}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {pageSize > 0 && sorted.length > pageSize && (
        <div className={`${d.cell} border-t border-silver-200 flex items-center justify-between gap-3 flex-wrap`}>
          <p className="text-xs text-silver-500 tabular-nums">
            {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, sorted.length)} of{' '}
            {sorted.length}
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage(currentPage - 1)}
              disabled={currentPage <= 1}
              className="p-1.5 rounded-lg border border-silver-200 text-silver-600 hover:text-primary-600 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Previous page"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs text-silver-600 tabular-nums px-1">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setPage(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded-lg border border-silver-200 text-silver-600 hover:text-primary-600 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Next page"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const EmptyState = ({ title, description, action, icon: Icon = Inbox }) => (
  <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
    <div className="w-12 h-12 rounded-2xl bg-silver-100 flex items-center justify-center mb-3.5">
      <Icon size={22} className="text-silver-400" />
    </div>
    <p className="font-display font-semibold text-silver-800">{title}</p>
    {description && <p className="text-sm text-silver-500 mt-1.5 max-w-sm">{description}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

/* ===== Search ===== */

export const SearchInput = ({ value, onChange, placeholder = 'Search…' }) => (
  <div className="relative min-w-0">
    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-silver-400" />
    <input
      className="input-field pl-10"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  </div>
);

/* ===== Drawer ===== */

export const Drawer = ({ open, onClose, title, subtitle, children, footer, width = 'max-w-xl' }) => {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex justify-end">
      <div className="absolute inset-0 bg-silver-950/40 modal-backdrop" onClick={onClose} aria-hidden />
      <motion.div
        initial={{ x: 40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.25 }}
        className={`relative w-full ${width} bg-white h-full shadow-2xl flex flex-col min-w-0`}
        role="dialog"
        aria-modal="true"
      >
        <div className="px-6 py-4 border-b border-silver-200 flex items-start justify-between gap-4 shrink-0">
          <div className="min-w-0">
            <h3 className="font-display font-semibold text-lg text-silver-900 truncate">{title}</h3>
            {subtitle && <p className="text-sm text-silver-500 mt-0.5 truncate" title={subtitle}>{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="text-silver-400 hover:text-silver-700 text-2xl leading-none px-1 shrink-0"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scroll px-6 py-5 min-w-0">
          {children}
        </div>
        {footer && <div className="px-6 py-3.5 border-t border-silver-200 bg-silver-50 shrink-0">{footer}</div>}
      </motion.div>
    </div>
  );
};

/* ===== Progress ===== */

export const ProgressBar = ({ value, max = 100, tone = 'primary', label }) => {
  const n = toNumber(value) ?? 0;
  const cap = toNumber(max) || 100;
  const percent = Math.max(0, Math.min(100, (n / cap) * 100));
  const tones = {
    primary: 'bg-primary-500',
    good: 'bg-[#0ca30c]',
    warning: 'bg-[#fab219]',
    critical: 'bg-[#d03b3b]',
  };
  return (
    <div className="min-w-0">
      {label && (
        <div className="flex justify-between gap-3 text-xs text-silver-500 mb-1.5">
          <span className="truncate" title={label}>{label}</span>
          <span className="tabular-nums font-medium text-silver-700 shrink-0">{Math.round(percent)}%</span>
        </div>
      )}
      <div className="h-2 rounded-full bg-silver-200 overflow-hidden">
        <div className={`h-full rounded-full ${tones[tone] || tones.primary}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
};

/* ===== Key/value list — replaces ad-hoc two-column grids ===== */

export const DetailList = ({ items, columns = 2 }) => (
  <dl className={`grid gap-x-5 gap-y-3 ${columns === 1 ? '' : 'sm:grid-cols-2'}`}>
    {items
      .filter(([, value]) => value !== undefined)
      .map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-[11px] uppercase tracking-wider text-silver-400 truncate">{label}</dt>
          <dd className="text-sm font-medium text-silver-800 mt-0.5 truncate" title={typeof value === 'string' ? value : undefined}>
            {safeNode(value, EMPTY)}
          </dd>
        </div>
      ))}
  </dl>
);
