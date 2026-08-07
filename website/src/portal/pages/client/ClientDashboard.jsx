import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '../../auth/AuthContext';
import { useCollection } from '../../hooks';
import { borderOutlook, portOutlook, shipmentRisk } from '../../engine/forecast';
import { ports, borders } from '../../data/seed';

import {
  Badge, Card, DataTable, Drawer, EmptyState, SectionHeading, StatCard,
  money, statusTone, dateLabel, timeLabel,
} from '../../components/ui';
import { Gauge, STATUS } from '../../components/charts';
import RouteMap from '../../components/RouteMap';

/* ===========================================================================
   Customer dashboard — "where is my freight".
   Every query is filtered on the signed-in user's own customerId. A customer
   can never see another customer's rows, and there is no URL parameter that
   could be tampered with to try.
   =========================================================================== */

/** Milestones a consignment passes through, used for the progress rail. */
const MILESTONES = ['Planned', 'In Transit', 'At Border', 'On Water', 'Awaiting Rail', 'Delivered'];

const stageIndex = (status) => {
  if (status === 'Delivered') return MILESTONES.length - 1;
  const i = MILESTONES.indexOf(status);
  return i === -1 ? 1 : i;
};

const ClientDashboard = () => {
  const { user, scope } = useAuth();
  const shipments = useCollection('shipments');
  const invoices = useCollection('invoices');
  const documents = useCollection('documents');
  const pods = useCollection('pods');
  const customers = useCollection('customers');

  const [open, setOpen] = useState(null);

  const borderData = useMemo(() => borderOutlook(4), []);
  const portData = useMemo(() => portOutlook(4), []);

  const customer = customers.find((c) => c.id === scope.customerId);

  const mine = useMemo(
    () =>
      shipments
        .filter((s) => s.customerId === scope.customerId)
        .map((s) => ({ ...s, risk: shipmentRisk(s, { borderData, portData }) })),
    [shipments, scope.customerId, borderData, portData]
  );

  const active = mine.filter((s) => s.status !== 'Delivered');
  const delivered = mine.filter((s) => s.status === 'Delivered');
  const myInvoices = invoices.filter((i) => i.customerId === scope.customerId);
  const outstanding = myInvoices.filter((i) => i.status !== 'Paid');
  const outstandingValue = outstanding.reduce((sum, i) => sum + (i.amount - i.paidAmount), 0);
  const atRisk = active.filter((s) => s.risk.band !== 'good');

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const docsFor = (shipmentId) => documents.filter((d) => d.shipmentId === shipmentId);
  const podFor = (shipmentId) => pods.find((p) => p.shipmentId === shipmentId);

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-silver-900">
            {greeting}, {user?.name?.split(' ')[0]}
          </h1>
          <p className="text-silver-500 mt-1">
            {customer?.name} · account {customer?.bcNo} · {customer?.terms} terms
          </p>
        </div>
        <Link to="/portal/my/quotes" className="btn-primary text-sm">
          <Icons.Plus size={15} className="mr-1.5" />
          Request a booking
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Consignments moving"
          value={active.length}
          icon={Icons.Ship}
          deltaLabel={`${delivered.length} delivered to date`}
        />
        <StatCard
          label="Needing attention"
          value={atRisk.length}
          icon={Icons.TriangleAlert}
          tone={atRisk.length ? 'warning' : 'good'}
          deltaLabel={atRisk.length ? 'predicted to run late' : 'all running to plan'}
        />
        <StatCard
          label="Outstanding balance"
          value={money(outstandingValue)}
          icon={Icons.ReceiptText}
          tone={myInvoices.some((i) => i.status === 'Overdue') ? 'critical' : 'default'}
          deltaLabel={`${outstanding.length} open invoice${outstanding.length === 1 ? '' : 's'}`}
        />
        <StatCard
          label="Credit available"
          value={money(Math.max(0, (customer?.creditLimit || 0) - outstandingValue))}
          icon={Icons.Landmark}
          deltaLabel={`of ${money(customer?.creditLimit || 0)} limit`}
        />
      </div>

      {/* ===== Live tracking ===== */}
      <div>
        <SectionHeading
          title="Live tracking"
          description="Tap a consignment for its full history, documents and predicted arrival."
        />
        {active.length === 0 ? (
          <Card>
            <EmptyState
              icon={Icons.PackageCheck}
              title="Nothing in transit"
              description="All of your consignments have been delivered."
            />
          </Card>
        ) : active.length > 4 ? (
          // Past a handful, a table scales where a card wall does not.
          <Card padded={false}>
            <DataTable
              onRowClick={setOpen}
              searchable
              searchKeys={['id', 'origin', 'destination', 'trackingToken']}
              filters={[{ key: 'status', label: 'Status' }]}
              pageSize={15}
              minWidth={860}
              columns={[
                { key: 'id', label: 'Consignment', render: (r) => <span className="font-medium tabular-nums text-silver-900">{r.id}</span> },
                { key: 'trackingToken', label: 'Tracking ref', mono: true },
                {
                  key: 'route',
                  label: 'Route',
                  maxWidth: '20rem',
                  sortValue: (r) => r.origin,
                  render: (r) => <span className="text-xs text-silver-500">{r.origin} → {r.destination}</span>,
                },
                { key: 'currentLocation', label: 'Last reported' },
                { key: 'weightTons', label: 'Tonnes', align: 'right', total: (r) => r.weightTons },
                {
                  key: 'eta',
                  label: 'Expected',
                  sortValue: (r) => r.risk.predictedEta?.date || r.etaAt,
                  render: (r) => (
                    <span className={r.risk.predictedEta?.slipDays > 0 ? 'text-[#b07800] font-medium' : ''}>
                      {dateLabel(r.risk.predictedEta?.date || r.etaAt)}
                    </span>
                  ),
                },
                { key: 'status', label: 'Status', render: (r) => <Badge tone={statusTone(r.status)}>{r.status}</Badge> },
                { key: 'risk', label: 'Outlook', align: 'right', sortValue: (r) => r.risk.score, render: (r) => <Badge tone={r.risk.band}>{r.risk.label}</Badge> },
              ]}
              rows={active}
              showTotals
            />
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
            {active.map((shipment) => {
              const stage = stageIndex(shipment.status);
              const pct = (stage / (MILESTONES.length - 1)) * 100;
              return (
                <Card
                  key={shipment.id}
                  className="cursor-pointer card-hover flex flex-col"
                  onClick={() => setOpen(shipment)}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="font-display font-bold text-silver-900 tabular-nums">{shipment.id}</p>
                      <p className="text-xs text-silver-400 mt-0.5">{shipment.bcOrderNo}</p>
                    </div>
                    <Badge tone={statusTone(shipment.status)}>{shipment.status}</Badge>
                  </div>

                  <p className="text-sm text-silver-600 mb-1">
                    {shipment.origin}
                  </p>
                  <p className="text-sm text-silver-800 font-medium flex items-center gap-1.5 mb-4">
                    <Icons.ArrowDown size={13} className="text-silver-300" />
                    {shipment.destination}
                  </p>

                  {/* Progress rail */}
                  <div className="mb-4">
                    <div className="h-1.5 rounded-full bg-silver-200 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary-600 to-primary-400"
                        style={{ width: `${Math.max(6, pct)}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-1.5 text-[10px] text-silver-400">
                      <span>Collected</span>
                      <span>Delivered</span>
                    </div>
                  </div>

                  <div className="flex items-end justify-between gap-3 mt-auto pt-3 border-t border-silver-100">
                    <div>
                      <p className="text-[11px] text-silver-400 uppercase tracking-wider">Expected</p>
                      <p className="text-sm font-medium text-silver-800">
                        {dateLabel(shipment.risk.predictedEta?.date || shipment.etaAt)}
                      </p>
                      {shipment.risk.predictedEta?.slipDays > 0 && (
                        <p className="text-[11px] text-[#b07800] font-medium mt-0.5">
                          {shipment.risk.predictedEta.slipDays} day
                          {shipment.risk.predictedEta.slipDays === 1 ? '' : 's'} later than planned
                        </p>
                      )}
                    </div>
                    <Badge tone={shipment.risk.band}>{shipment.risk.label}</Badge>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ===== Delivered ===== */}
      {delivered.length > 0 && (
        <Card padded={false}>
          <div className="table-card-head">
            <SectionHeading title="Delivered" description="Proof of delivery is attached to each." />
          </div>
          <DataTable
            onRowClick={setOpen}
            columns={[
              { key: 'id', label: 'Reference', render: (r) => <span className="font-medium tabular-nums">{r.id}</span> },
              { key: 'route', label: 'Route', render: (r) => <span className="text-xs text-silver-500">{r.origin} → {r.destination}</span> },
              { key: 'weightTons', label: 'Tonnes', align: 'right' },
              { key: 'etaAt', label: 'Delivered', render: (r) => dateLabel(r.etaAt) },
              {
                key: 'pod',
                label: 'POD',
                render: (r) => (podFor(r.id) ? <Badge tone="good" icon={Icons.Check}>Signed</Badge> : <Badge tone="neutral">Pending</Badge>),
              },
              { key: 'revenue', label: 'Value', align: 'right', render: (r) => money(r.revenue) },
            ]}
            rows={delivered}
          />
        </Card>
      )}

      {/* ===== Shipment detail ===== */}
      <Drawer
        open={Boolean(open)}
        onClose={() => setOpen(null)}
        title={open?.id}
        subtitle={open ? `${open.origin} → ${open.destination}` : ''}
        width="max-w-2xl"
      >
        {open && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Status', value: open.status },
                { label: 'Weight', value: `${open.weightTons}t` },
                { label: 'Planned ETA', value: dateLabel(open.etaAt) },
                { label: 'Your reference', value: open.bcOrderNo },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-[11px] uppercase tracking-wider text-silver-400">{item.label}</p>
                  <p className="text-sm font-medium text-silver-800 mt-0.5">{item.value}</p>
                </div>
              ))}
            </div>

            {/* Predicted arrival */}
            {open.status !== 'Delivered' && (
              <div className="flex items-center gap-6 p-5 rounded-2xl bg-silver-50 border border-silver-200">
                <Gauge
                  value={open.risk.score}
                  label="delay risk"
                  color={
                    open.risk.band === 'critical'
                      ? STATUS.critical
                      : open.risk.band === 'warning'
                      ? STATUS.warning
                      : STATUS.good
                  }
                />
                <div>
                  <p className="font-display font-semibold text-silver-900">{open.risk.label}</p>
                  {open.risk.predictedEta && (
                    <p className="text-sm text-silver-500 mt-1">
                      Planned {dateLabel(open.etaAt)} · now expecting{' '}
                      <span className="font-medium text-silver-800">
                        {dateLabel(open.risk.predictedEta.date)}
                      </span>
                    </p>
                  )}
                  {open.risk.drivers.length > 0 && (
                    <ul className="mt-2.5 space-y-1">
                      {open.risk.drivers.slice(0, 3).map((d) => (
                        <li key={d.label} className="text-xs text-silver-500">
                          • {d.label} — {d.detail}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {/* Where it is, on the real road */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-silver-400 mb-3">
                Position
              </p>
              <RouteMap shipment={open} height={260} />
              {open.trackingToken && (
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(`${window.location.origin}/track/${open.trackingToken}`);
                    toast.success('Tracking link copied');
                  }}
                  className="mt-2.5 inline-flex items-center gap-2 text-xs text-silver-500 hover:text-primary-600"
                >
                  <Icons.Link2 size={13} />
                  Share this tracking link · {open.trackingToken}
                </button>
              )}
            </div>

            {/* Journey */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-silver-400 mb-3">Journey</p>
              <ol className="relative border-l-2 border-silver-200 ml-2 space-y-5">
                {MILESTONES.filter((m, i) => i <= stageIndex(open.status) || m === 'Delivered').map((milestone, i) => {
                  const reached = i <= stageIndex(open.status);
                  return (
                    <li key={milestone} className="ml-5">
                      <span
                        className={`absolute -left-[9px] w-4 h-4 rounded-full border-2 ${
                          reached ? 'bg-primary-600 border-primary-600' : 'bg-white border-silver-300'
                        }`}
                      />
                      <p className={`text-sm font-medium ${reached ? 'text-silver-900' : 'text-silver-400'}`}>
                        {milestone}
                      </p>
                      {reached && i === stageIndex(open.status) && (
                        <p className="text-xs text-silver-500 mt-0.5">Current position</p>
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>

            {/* Corridor conditions the customer can actually act on */}
            {open.status !== 'Delivered' && (
              <div className="grid sm:grid-cols-2 gap-3">
                {open.border && (
                  <div className="p-3.5 rounded-xl border border-silver-200">
                    <p className="text-[11px] uppercase tracking-wider text-silver-400">Border</p>
                    <p className="text-sm font-medium text-silver-800 mt-0.5">
                      {borders.find((b) => b.code === open.border)?.name}
                    </p>
                    <p className="text-xs text-silver-500 mt-0.5 tabular-nums">
                      {borderData.find((b) => b.code === open.border)?.current}h current wait
                    </p>
                  </div>
                )}
                <div className="p-3.5 rounded-xl border border-silver-200">
                  <p className="text-[11px] uppercase tracking-wider text-silver-400">Port</p>
                  <p className="text-sm font-medium text-silver-800 mt-0.5">
                    {ports.find((p) => p.code === open.port)?.name}
                  </p>
                  <p className="text-xs text-silver-500 mt-0.5 tabular-nums">
                    {portData.find((p) => p.code === open.port)?.current.toFixed(1)} days dwell
                  </p>
                </div>
              </div>
            )}

            {/* Documents */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-silver-400 mb-3">
                Documents
              </p>
              {docsFor(open.id).length === 0 && !podFor(open.id) ? (
                <p className="text-sm text-silver-500">Nothing filed against this consignment yet.</p>
              ) : (
                <div className="space-y-2">
                  {docsFor(open.id).map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-xl border border-silver-200"
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <Icons.FileText size={15} className="text-silver-400 shrink-0" />
                        <span className="min-w-0">
                          <span className="block text-sm text-silver-800 truncate">{doc.type}</span>
                          <span className="block text-xs text-silver-400 truncate">{doc.fileName}</span>
                        </span>
                      </span>
                      <Badge tone={statusTone(doc.status)}>{doc.status}</Badge>
                    </div>
                  ))}
                  {podFor(open.id) && (
                    <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/50">
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <span className="flex items-center gap-2.5">
                          <Icons.PenLine size={15} className="text-emerald-600" />
                          <span className="text-sm font-medium text-emerald-900">Proof of delivery</span>
                        </span>
                        <span className="text-xs text-emerald-700">
                          {timeLabel(podFor(open.id).capturedAt)}
                        </span>
                      </div>
                      <p className="text-xs text-emerald-800">
                        Received by {podFor(open.id).receivedBy}
                        {podFor(open.id).notes ? ` — ${podFor(open.id).notes}` : ''}
                      </p>
                      {podFor(open.id).signature && (
                        <img
                          src={podFor(open.id).signature}
                          alt="Consignee signature"
                          className="mt-2.5 h-14 bg-white rounded-lg border border-emerald-200 px-2"
                        />
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default ClientDashboard;
