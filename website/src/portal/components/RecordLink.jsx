import React, { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';

import { recordPath, recordLabel, resolveRecord } from '../entities';

/* ===========================================================================
   Cross-linking primitives.

   Anywhere a screen mentions another record — a consignment number, a customer
   name, a vehicle registration — it renders one of these rather than dead text.
   =========================================================================== */

/**
 * Warm a record on hover.
 *
 * Against the local store this resolves in microseconds, so today it mostly
 * proves the wiring. Point `resolveRecord` at an API and this becomes a real
 * prefetch: by the time the click lands, the detail data is already in hand.
 */
const prefetched = new Set();

export function prefetchRecord(entity, id) {
  const key = `${entity}:${id}`;
  if (!entity || !id || prefetched.has(key)) return;
  prefetched.add(key);
  // Off the interaction path so hovering never costs a frame.
  const run = () => { try { resolveRecord(entity, id); } catch { /* ignore */ } };
  if (typeof requestIdleCallback === 'function') requestIdleCallback(run, { timeout: 200 });
  else setTimeout(run, 0);
}

/** Props to spread onto anything that navigates to a record. */
export const usePrefetchHandlers = (entity, id) => {
  const warm = useCallback(() => prefetchRecord(entity, id), [entity, id]);
  return { onMouseEnter: warm, onFocus: warm, onTouchStart: warm };
};

/**
 * A reference to another record, rendered as a link to its detail page.
 * Falls back to plain text when the record cannot be resolved, so a broken
 * foreign key shows the raw value rather than a link that goes nowhere.
 */
const RecordLink = ({
  entity,
  id,
  children,
  className = '',
  showIcon = false,
  fallback = null,
  stopPropagation = true,
}) => {
  const handlers = usePrefetchHandlers(entity, id);

  if (!entity || !id) return fallback ?? <span className="text-silver-300">—</span>;

  const path = recordPath(entity, id);
  const label = children ?? recordLabel(entity, id);

  if (!path) return <span>{label}</span>;

  return (
    <Link
      to={path}
      // Inside a clickable row, a link must not also trigger the row's own
      // navigation — one click, one destination.
      onClick={stopPropagation ? (e) => e.stopPropagation() : undefined}
      {...handlers}
      className={`text-primary-700 hover:text-primary-800 hover:underline underline-offset-2 decoration-primary-300 font-medium inline-flex items-center gap-1 max-w-full ${className}`}
      title={typeof label === 'string' ? label : undefined}
    >
      <span className="truncate">{label}</span>
      {showIcon && <ExternalLink size={11} className="shrink-0 opacity-60" />}
    </Link>
  );
};

/**
 * Wrap in-row controls so acting on them does not also follow the row link.
 * Rule 3 of the cross-linking standard: row navigation and in-row actions
 * coexist; neither hijacks the other.
 */
export const RowActions = ({ children, className = '' }) => (
  <span
    className={`inline-flex items-center gap-1.5 ${className}`}
    onClick={(e) => e.stopPropagation()}
    onKeyDown={(e) => e.stopPropagation()}
    role="presentation"
  >
    {children}
  </span>
);

export default RecordLink;
