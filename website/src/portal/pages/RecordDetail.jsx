import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import * as Icons from 'lucide-react';

import { useAuth } from '../auth/AuthContext';
import { useCollection } from '../hooks';
import {
  ENTITIES, entityDef, recordPath, canOpenRecord, recordLabel,
} from '../entities';

import {
  Badge, Button, Card, DataTable, EmptyState, SectionHeading,
  money, num, pct, dateLabel, timeLabel, statusTone, EMPTY,
} from '../components/ui';
import RecordLink from '../components/RecordLink';
import { RELATED_COLUMNS } from '../components/recordColumns';

/* ===========================================================================
   Generic record detail page — /portal/records/:entity/:id

   One route, one component, every entity. It reads the registry rather than
   hard-coding screens, so exposing a new relationship is one line in
   entities.js and no new UI at all.

   Three jobs, per the standard:
     · show the record in full
     · act as the hub for everything connected to it
     · be addressable, so the URL can be shared, bookmarked and deep-linked
   =========================================================================== */

const formatValue = (value, kind) => {
  if (value === null || value === undefined || value === '') return null;
  switch (kind) {
    case 'money': return money(value);
    case 'pct': return pct(value);
    case 'pct0': return `${num(value)}%`;
    case 'km': return `${num(value)} km`;
    case 'date': return dateLabel(value);
    case 'datetime': return timeLabel(value);
    default: return value;
  }
};

const Breadcrumbs = ({ def, entity, record }) => (
  <nav aria-label="Breadcrumb" className="mb-3">
    <ol className="flex items-center gap-1.5 text-xs text-silver-500 flex-wrap">
      <li>
        <Link to="/portal" className="hover:text-primary-600 transition-colors">Dashboard</Link>
      </li>
      <li aria-hidden><Icons.ChevronRight size={12} className="text-silver-300" /></li>
      <li>
        <Link to={def.listPath || '/portal'} className="hover:text-primary-600 transition-colors">
          {def.plural}
        </Link>
      </li>
      <li aria-hidden><Icons.ChevronRight size={12} className="text-silver-300" /></li>
      <li className="text-silver-800 font-medium truncate max-w-[18rem]">
        {safeTitle(def, record, entity)}
      </li>
    </ol>
  </nav>
);

const safeTitle = (def, record, entity) => {
  try { return def.title(record) ?? recordLabel(entity, record?.id); }
  catch { return record?.id ?? 'Record'; }
};

const NotFound = ({ entity, reason }) => {
  const def = entityDef(entity);
  return (
    <div className="max-w-xl mx-auto py-16">
      <EmptyState
        icon={reason === 'forbidden' ? Icons.ShieldAlert : Icons.SearchX}
        title={reason === 'forbidden' ? 'Not available on your profile' : 'Record not found'}
        description={
          reason === 'forbidden'
            ? 'This record exists but is outside what your account is allowed to see.'
            : 'It may have been deleted, or the link may be out of date.'
        }
        action={
          <Link to={def?.listPath || '/portal'} className="btn-primary text-sm">
            Back to {def?.plural || 'the portal'}
          </Link>
        }
      />
    </div>
  );
};

const RecordDetail = () => {
  const { entity, id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const def = entityDef(entity);
  // Subscribing to the collection keeps the page live as records change.
  const collection = useCollection(def?.collection || 'shipments');

  if (!def) return <NotFound entity={entity} reason="unknown" />;

  const record = collection.find((r) => String(r.id) === String(id));
  if (!record) return <NotFound entity={entity} reason="missing" />;

  const auth = { role: user?.role, customerId: user?.customerId, supplierId: user?.supplierId };
  if (!canOpenRecord(entity, record, auth)) return <NotFound entity={entity} reason="forbidden" />;

  const Icon = Icons[def.icon] || Icons.FileText;
  const title = safeTitle(def, record, entity);
  const subtitle = (() => { try { return def.subtitle?.(record); } catch { return null; } })();
  const status = (() => { try { return def.status?.(record); } catch { return null; } })();

  const fields = (() => { try { return def.fields(record) || []; } catch { return []; } })()
    .map(([label, value, linkTo, kind]) => ({ label, value, linkTo, kind }))
    .filter((f) => f.value !== null && f.value !== undefined && f.value !== '');

  const related = (() => { try { return def.related?.(record) || []; } catch { return []; } })()
    .filter((section) => section.rows?.length);

  const lines = (() => { try { return def.lines?.(record) || []; } catch { return []; } })();
  const extracted = (() => { try { return def.extracted?.(record) || {}; } catch { return {}; } })();
  const checks = (() => { try { return def.checks?.(record) || {}; } catch { return {}; } })();
  const signature = (() => { try { return def.signature?.(record); } catch { return null; } })();
  const photos = (() => { try { return def.photos?.(record) || []; } catch { return []; } })();

  return (
    <div className="space-y-5 max-w-[1400px] min-w-0">
      <Breadcrumbs def={def} entity={entity} record={record} />

      {/* ===== Header ===== */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex gap-3.5 min-w-0">
          <span className="w-11 h-11 rounded-xl bg-primary-50 border border-primary-100 flex items-center justify-center shrink-0">
            <Icon size={20} className="text-primary-600" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-primary-600 mb-0.5">
              {def.label}
            </p>
            <h1 className="text-2xl font-display font-bold text-silver-900 truncate" title={String(title)}>
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-silver-500 mt-0.5 truncate" title={String(subtitle)}>
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {status && <Badge tone={statusTone(status)}>{status}</Badge>}
          <Button variant="secondary" size="sm" icon={Icons.ArrowLeft} onClick={() => navigate(-1)}>
            Back
          </Button>
          <Link to={def.listPath || '/portal'} className="btn-secondary text-xs px-3 py-1.5">
            All {def.plural.toLowerCase()}
          </Link>
        </div>
      </div>

      {/* ===== The record in full ===== */}
      <Card>
        <SectionHeading title="Detail" description="Everything summarised elsewhere, shown complete here." />
        {fields.length === 0 ? (
          <p className="text-sm text-silver-500">This record carries no additional detail.</p>
        ) : (
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 xl:grid-cols-3">
            {fields.map((f) => (
              <div key={f.label} className="min-w-0 py-1.5 border-b border-silver-100 last:border-0">
                <dt className="text-[11px] uppercase tracking-wider text-silver-400">{f.label}</dt>
                <dd className="text-sm font-medium text-silver-800 mt-0.5 min-w-0">
                  {f.linkTo && f.linkTo[1] ? (
                    <RecordLink entity={f.linkTo[0]} id={f.linkTo[1]} showIcon>
                      {formatValue(f.value, f.kind)}
                    </RecordLink>
                  ) : (
                    <span className="block truncate" title={String(f.value)}>
                      {formatValue(f.value, f.kind) ?? EMPTY}
                    </span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </Card>

      {/* ===== Line items (invoices, job cards) ===== */}
      {lines.length > 0 && (
        <Card padded={false}>
          <div className="table-card-head">
            <SectionHeading title="Lines" description={`${lines.length} line item${lines.length === 1 ? '' : 's'}`} />
          </div>
          <DataTable
            pageSize={0}
            sortable={false}
            minWidth={420}
            showTotals
            columns={[
              { key: 'description', label: 'Description', nowrap: false, maxWidth: '30rem' },
              {
                key: 'amount', label: 'Amount', align: 'right',
                render: (r) => money(r.amount),
                total: (r) => r.amount,
                totalRender: (sum) => money(sum),
              },
            ]}
            rows={lines.map((l, i) => ({ id: `line-${i}`, ...l }))}
          />
        </Card>
      )}

      {/* ===== Extracted document fields ===== */}
      {Object.keys(extracted).length > 0 && (
        <Card>
          <SectionHeading title="Extracted fields" description="What the document reader pulled off this file." />
          <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
            {Object.entries(extracted).map(([key, value]) => (
              <div key={key} className="flex justify-between gap-4 text-sm py-1.5 border-b border-silver-100">
                <dt className="text-silver-500 truncate">{key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())}</dt>
                <dd className="text-silver-900 font-medium text-right truncate">
                  {typeof value === 'object' && value !== null ? value.value || EMPTY : value || EMPTY}
                </dd>
              </div>
            ))}
          </dl>
        </Card>
      )}

      {/* ===== Inspection checklist ===== */}
      {Object.keys(checks).length > 0 && (
        <Card>
          <SectionHeading title="Checklist" />
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {Object.entries(checks).map(([key, verdict]) => (
              <div key={key} className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-silver-200 min-w-0">
                <span className="text-xs text-silver-600 truncate capitalize">
                  {key.replace(/([A-Z])/g, ' $1')}
                </span>
                <Badge tone={verdict === 'fail' ? 'critical' : verdict === 'advisory' ? 'warning' : 'good'}>
                  {verdict}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ===== Attachments ===== */}
      {(signature || photos.length > 0) && (
        <Card>
          <SectionHeading title="Attachments" />
          {signature && (
            <img
              src={signature}
              alt="Signature"
              className="h-20 bg-silver-50 rounded-xl border border-silver-200 px-3 mb-3"
            />
          )}
          {photos.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {photos.map((photo, i) => (
                <img
                  key={i}
                  src={photo.dataUrl}
                  alt={photo.name || `Attachment ${i + 1}`}
                  className="aspect-square object-cover rounded-xl border border-silver-200"
                />
              ))}
            </div>
          )}
        </Card>
      )}

      {/* ===== The hub: everything connected to this record ===== */}
      {related.map((section) => {
        const sectionDef = entityDef(section.entity);
        const columns = RELATED_COLUMNS[section.entity];
        if (!sectionDef || !columns) return null;
        return (
          <Card key={section.title} padded={false}>
            <div className="table-card-head">
              <SectionHeading
                title={section.title}
                description={`${section.rows.length} ${section.rows.length === 1 ? sectionDef.label.toLowerCase() : sectionDef.plural.toLowerCase()}`}
                action={
                  <Link
                    to={sectionDef.listPath || '/portal'}
                    className="text-xs font-medium text-primary-600 hover:text-primary-700"
                  >
                    Open module →
                  </Link>
                }
              />
            </div>
            <DataTable
              columns={columns}
              rows={section.rows}
              rowLink={(row) => recordPath(section.entity, row.id)}
              pageSize={section.rows.length > 8 ? 8 : 0}
              searchable={section.rows.length > 8}
              minWidth={560}
              empty={`No ${sectionDef.plural.toLowerCase()} linked to this record.`}
            />
          </Card>
        );
      })}

      {related.length === 0 && (
        <p className="text-xs text-silver-400 px-1">
          Nothing else in the system currently links to this {def.label.toLowerCase()}.
        </p>
      )}
    </div>
  );
};

export default RecordDetail;
export { ENTITIES };
