import React, { useMemo, useState } from 'react';
import * as Icons from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '../auth/AuthContext';
import { useCollection } from '../hooks';
import * as db from '../data/db';
import { record, notify } from '../data/activity';
import {
  riskScore, tyreProjection, consumption, averageConsumption, costPerKm,
  driverBand, TREAD_LIMIT_MM, TREAD_WARN_MM,
} from '../engine/fleet';

import {
  Badge, Button, Card, DataTable, Drawer, EmptyState, Field, Input, ProgressBar,
  SectionHeading, Select, StatCard, Tabs, TextArea, money, num, dateLabel, timeLabel, statusTone,
} from '../components/ui';
import { BarChart, ChartCard, Gauge, SERIES, STATUS } from '../components/charts';
import ModuleHeader from '../components/ModuleHeader';
import RecordLink from '../components/RecordLink';

/* ===========================================================================
   Module 7 — Fleet Maintenance Platform
   =========================================================================== */

const Fleet = () => {
  const vehicles = useCollection('vehicles');
  const drivers = useCollection('drivers');
  const fuelLogs = useCollection('fuelLogs');
  const incidents = useCollection('incidents');
  const inspections = useCollection('inspections');
  const serviceRecords = useCollection('serviceRecords');
  const jobCards = useCollection('jobCards');

  const [tab, setTab] = useState('health');

  const context = { fuelLogs, incidents, inspections, serviceRecords };

  const scored = useMemo(
    () =>
      vehicles
        .map((v) => ({ ...v, risk: riskScore(v, context) }))
        .sort((a, b) => b.risk.score - a.risk.score),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [vehicles, fuelLogs, incidents, inspections, serviceRecords]
  );

  const dueSoon = scored.filter((v) => v.risk.kmToService <= 2000);
  const grounded = vehicles.filter((v) => v.status === 'Workshop');

  return (
    <div className="space-y-6 max-w-[1400px]">
      <ModuleHeader
        number={7}
        title="Fleet Maintenance Platform"
        blurb="Service schedules, tyre life, fuel analytics, driver behaviour and a predictive risk score built from what the fleet already reports."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Vehicles" value={vehicles.length} icon={Icons.Truck} deltaLabel={`${grounded.length} in the workshop`} />
        <StatCard
          label="Service due"
          value={dueSoon.length}
          icon={Icons.Wrench}
          tone={dueSoon.length ? 'warning' : 'good'}
          deltaLabel="within 2,000 km"
        />
        <StatCard
          label="Tyres below limit"
          value={vehicles.flatMap((v) => v.tyres || []).filter((t) => t.treadMm <= TREAD_LIMIT_MM).length}
          icon={Icons.CircleDot}
          tone={vehicles.flatMap((v) => v.tyres || []).some((t) => t.treadMm <= TREAD_LIMIT_MM) ? 'critical' : 'good'}
          deltaLabel={`${TREAD_LIMIT_MM}mm legal minimum`}
        />
        <StatCard
          label="Fuel spend logged"
          value={money(fuelLogs.reduce((sum, f) => sum + f.cost, 0))}
          icon={Icons.Fuel}
          deltaLabel={`${num(fuelLogs.reduce((s, f) => s + f.litres, 0))} litres`}
        />
      </div>

      <Tabs
        tabs={[
          { key: 'health', label: 'Predictive health', count: scored.filter((v) => v.risk.band !== 'good').length },
          { key: 'workshop', label: 'Workshop', count: jobCards.filter((j) => j.status !== 'Completed').length },
          { key: 'service', label: 'Service schedule' },
          { key: 'tyres', label: 'Tyres' },
          { key: 'fuel', label: 'Fuel analytics' },
          { key: 'drivers', label: 'Drivers' },
          { key: 'history', label: 'Breakdowns', count: incidents.filter((i) => ['Breakdown', 'Accident'].includes(i.type)).length },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'health' && <Health vehicles={scored} />}
      {tab === 'workshop' && <Workshop jobCards={jobCards} vehicles={vehicles} />}
      {tab === 'service' && <ServiceSchedule vehicles={scored} serviceRecords={serviceRecords} />}
      {tab === 'tyres' && <Tyres vehicles={vehicles} />}
      {tab === 'fuel' && <FuelAnalytics vehicles={vehicles} fuelLogs={fuelLogs} serviceRecords={serviceRecords} />}
      {tab === 'drivers' && <Drivers drivers={drivers} vehicles={vehicles} incidents={incidents} />}
      {tab === 'history' && <Breakdowns incidents={incidents} vehicles={vehicles} />}
    </div>
  );
};

/* ===== Predictive health ===== */

const Health = ({ vehicles }) => {
  const [open, setOpen] = useState(null);

  return (
    <>
      <Card padded={false}>
        <div className="table-card-head">
          <SectionHeading
            title="Predictive health"
            description="Every vehicle scored on what it has actually reported. Click a row for the full picture, or the registration to open its record."
          />
        </div>
        <DataTable
          onRowClick={setOpen}
          searchable
          searchKeys={['reg', 'make', 'model', 'entity']}
          filters={[
            { key: 'status', label: 'Status' },
            { key: 'entity', label: 'Entity' },
            { key: 'band', label: 'Risk', filterValue: (r) => r.risk.label },
          ]}
          pageSize={15}
          minWidth={900}
          initialSort={{ key: 'risk', dir: 'desc' }}
          columns={[
            {
              key: 'reg',
              label: 'Vehicle',
              render: (r) => <RecordLink entity="vehicles" id={r.id}>{r.reg}</RecordLink>,
            },
            {
              key: 'model',
              label: 'Make & model',
              maxWidth: '13rem',
              sortValue: (r) => `${r.make} ${r.model}`,
              render: (r) => (
                <span className="text-xs text-silver-500">{r.make} {r.model} · {r.year}</span>
              ),
            },
            {
              key: 'odometer',
              label: 'Odometer',
              align: 'right',
              render: (r) => `${num(r.odometer)} km`,
            },
            { key: 'entity', label: 'Entity' },
            {
              key: 'driverId',
              label: 'Driver',
              render: (r) => <RecordLink entity="drivers" id={r.driverId} />,
            },
            {
              key: 'nextService',
              label: 'To service',
              align: 'right',
              sortValue: (r) => r.risk.kmToService,
              render: (r) => (
                <span className={r.risk.kmToService <= 0 ? 'text-[#d03b3b] font-semibold' : ''}>
                  {r.risk.kmToService > 0 ? `${num(r.risk.kmToService)} km` : `${num(Math.abs(r.risk.kmToService))} km over`}
                </span>
              ),
            },
            {
              key: 'topFactor',
              label: 'Leading signal',
              maxWidth: '14rem',
              sortValue: (r) => r.risk.factors[0]?.label ?? '',
              render: (r) =>
                r.risk.factors.length ? (
                  <span className="text-xs text-silver-500">
                    {r.risk.factors[0].label} <span className="text-silver-400">+{r.risk.factors[0].points}</span>
                  </span>
                ) : (
                  <span className="text-xs text-silver-400">No adverse signals</span>
                ),
            },
            { key: 'status', label: 'Status', render: (r) => <Badge tone={statusTone(r.status)}>{r.status}</Badge> },
            {
              key: 'risk',
              label: 'Risk',
              align: 'right',
              sortValue: (r) => r.risk.score,
              render: (r) => (
                <span className="inline-flex items-center gap-2 justify-end">
                  <Badge tone={r.risk.band}>{r.risk.label}</Badge>
                  <span className="font-bold tabular-nums w-7 text-right">{r.risk.score}</span>
                </span>
              ),
            },
          ]}
          rows={vehicles}
          empty="No vehicles on the fleet."
        />
      </Card>

      <Drawer
        open={Boolean(open)}
        onClose={() => setOpen(null)}
        title={open?.reg}
        subtitle={open ? `${open.make} ${open.model} · ${num(open.odometer)} km` : ''}
      >
        {open && (
          <div className="space-y-6">
            <div className="flex items-center gap-6 p-5 rounded-2xl bg-silver-50 border border-silver-200">
              <Gauge
                value={open.risk.score}
                label="risk score"
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
                <p className="text-sm text-silver-500 mt-1">
                  {open.risk.kmToService > 0
                    ? `${num(open.risk.kmToService)} km to next service`
                    : `${num(Math.abs(open.risk.kmToService))} km past due`}
                </p>
                <p className="text-xs text-silver-400 mt-1 tabular-nums">
                  Next service at {num(open.risk.nextServiceKm)} km
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-silver-400 mb-3">
                What is driving the score
              </p>
              {open.risk.factors.length === 0 ? (
                <p className="text-sm text-silver-500">Nothing adverse. This vehicle is clean.</p>
              ) : (
                <div className="space-y-3">
                  {open.risk.factors.map((factor) => (
                    <div key={factor.label} className="p-3.5 rounded-xl border border-silver-200">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-silver-800">{factor.label}</p>
                          <p className="text-xs text-silver-500 mt-0.5">{factor.detail}</p>
                        </div>
                        <span className="text-sm font-bold text-silver-900 tabular-nums shrink-0">
                          +{factor.points}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-silver-400 mb-3">Tyres</p>
              <div className="space-y-2">
                {open.tyres?.map((tyre) => {
                  const projection = tyreProjection(tyre, open);
                  return (
                    <div key={tyre.serial} className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-silver-600">{tyre.pos}</span>
                      <span className="flex items-center gap-3">
                        <span
                          className={`tabular-nums font-medium ${
                            tyre.treadMm <= TREAD_LIMIT_MM
                              ? 'text-[#d03b3b]'
                              : tyre.treadMm <= TREAD_WARN_MM
                              ? 'text-[#b07800]'
                              : 'text-silver-700'
                          }`}
                        >
                          {tyre.treadMm.toFixed(1)}mm
                        </span>
                        {projection.kmRemaining !== null && (
                          <span className="text-xs text-silver-400 tabular-nums w-24 text-right">
                            ~{num(projection.kmRemaining)} km left
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <Button
              className="w-full"
              icon={Icons.Wrench}
              onClick={() => {
                db.update('vehicles', open.id, { status: 'Workshop' });
                toast.success(`${open.reg} booked into the workshop`);
                setOpen(null);
              }}
            >
              Book into the workshop
            </Button>
          </div>
        )}
      </Drawer>
    </>
  );
};

/* ===========================================================================
   Workshop — job cards with parts, labour and a running cost.
   A failed daily inspection raises one of these automatically.
   =========================================================================== */

const PRIORITY_TONE = { Critical: 'critical', High: 'critical', Medium: 'warning', Low: 'neutral' };

const jobCardCost = (card) => ({
  parts: (card.parts || []).reduce((sum, p) => sum + p.qty * p.unitCost, 0),
  labour: (card.labourHours || 0) * (card.labourRate || 0),
  get total() {
    return this.parts + this.labour;
  },
});

const Workshop = ({ jobCards, vehicles }) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ vehicleId: '', priority: 'Medium', fault: '', labourHours: 2, labourRate: 45 });

  const reg = (id) => vehicles.find((v) => v.id === id)?.reg || '—';
  const openCards = jobCards.filter((j) => j.status !== 'Completed');
  const totalOpenCost = openCards.reduce((sum, c) => sum + jobCardCost(c).total, 0);

  const advance = (card, status) => {
    db.update('jobCards', card.id, {
      status,
      completedAt: status === 'Completed' ? new Date().toISOString() : null,
    });

    if (status === 'Completed') {
      const cost = jobCardCost(card);
      // A completed card becomes part of the vehicle's service history, which
      // is what the cost-per-km figure is built from.
      db.insert('serviceRecords', {
        vehicleId: card.vehicleId,
        type: 'Repair',
        odometer: card.odometer,
        cost: Math.round(cost.total),
        performedAt: new Date().toISOString().slice(0, 10),
        notes: card.fault,
      });

      // Release the vehicle once nothing else is outstanding against it.
      const stillOpen = db
        .read('jobCards')
        .some((j) => j.vehicleId === card.vehicleId && j.status !== 'Completed' && j.id !== card.id);
      if (!stillOpen) {
        db.update('vehicles', card.vehicleId, { status: 'In Service' });
        toast.success(`${reg(card.vehicleId)} released back to service`);
      }
      record(user, 'jobcard.complete', card.id, `${card.id} completed on ${reg(card.vehicleId)} — ${money(cost.total)}`);
    } else {
      record(user, 'jobcard.update', card.id, `${card.id} moved to ${status}`);
    }

    toast.success(`${card.id} → ${status}`);
    setOpen(null);
  };

  const create = (event) => {
    event.preventDefault();
    const card = db.insert('jobCards', {
      vehicleId: form.vehicleId,
      status: 'Open',
      priority: form.priority,
      raisedAt: new Date().toISOString(),
      raisedBy: user.id,
      fault: form.fault,
      odometer: vehicles.find((v) => v.id === form.vehicleId)?.odometer || 0,
      parts: [],
      labourHours: Number(form.labourHours),
      labourRate: Number(form.labourRate),
      completedAt: null,
    });
    record(user, 'jobcard.create', card.id, `Raised ${card.id} on ${reg(form.vehicleId)}`);
    notify({
      forRoles: ['ops', 'management'],
      severity: form.priority === 'Critical' ? 'critical' : 'warning',
      title: `Job card ${card.id} raised`,
      body: `${reg(form.vehicleId)} — ${form.fault}`,
      link: '/portal/fleet',
    });
    setForm({ vehicleId: '', priority: 'Medium', fault: '', labourHours: 2, labourRate: 45 });
    setCreating(false);
    toast.success(`${card.id} raised`);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Open job cards" value={openCards.length} icon={Icons.ClipboardList} tone={openCards.length ? 'warning' : 'good'} />
        <StatCard
          label="Critical"
          value={openCards.filter((c) => c.priority === 'Critical').length}
          icon={Icons.TriangleAlert}
          tone={openCards.some((c) => c.priority === 'Critical') ? 'critical' : 'good'}
        />
        <StatCard label="Committed cost" value={money(totalOpenCost)} icon={Icons.Banknote} deltaLabel="parts and labour on open cards" />
        <StatCard
          label="Vehicles grounded"
          value={vehicles.filter((v) => v.status === 'Workshop').length}
          icon={Icons.Truck}
          tone={vehicles.some((v) => v.status === 'Workshop') ? 'critical' : 'good'}
        />
      </div>

      <Card padded={false}>
        <div className="table-card-head">
          <SectionHeading
            title="Job cards"
            description="Raised by hand, or automatically when a daily inspection fails."
            action={
              <Button size="sm" icon={Icons.Plus} onClick={() => setCreating((v) => !v)}>
                {creating ? 'Cancel' : 'Raise a job card'}
              </Button>
            }
          />
        </div>

        {creating && (
          <form onSubmit={create} className="px-5 md:px-6 pb-6 space-y-4 border-b border-silver-200">
            <div className="grid sm:grid-cols-3 gap-4">
              <Field label="Vehicle" required>
                <Select
                  value={form.vehicleId}
                  onChange={(e) => setForm((f) => ({ ...f, vehicleId: e.target.value }))}
                  required
                >
                  <option value="">Select…</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>{v.reg} — {v.make} {v.model}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Priority" required>
                <Select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}>
                  {['Critical', 'High', 'Medium', 'Low'].map((p) => <option key={p}>{p}</option>)}
                </Select>
              </Field>
              <Field label="Estimated hours" required>
                <Input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={form.labourHours}
                  onChange={(e) => setForm((f) => ({ ...f, labourHours: e.target.value }))}
                  required
                />
              </Field>
            </div>
            <Field label="Fault reported" required>
              <TextArea
                value={form.fault}
                onChange={(e) => setForm((f) => ({ ...f, fault: e.target.value }))}
                placeholder="What the driver reported, and what was found."
                required
              />
            </Field>
            <Button type="submit" icon={Icons.Wrench}>Raise job card</Button>
          </form>
        )}

        <DataTable
          onRowClick={setOpen}
          searchable
          searchKeys={['id', 'fault', 'priority', 'status']}
          filters={[{ key: 'status', label: 'Status' }, { key: 'priority', label: 'Priority' }]}
          pageSize={15}
          showTotals
          minWidth={880}
          initialSort={{ key: 'raisedAt', dir: 'desc' }}
          columns={[
            {
              key: 'id',
              label: 'Card',
              render: (r) => <RecordLink entity="jobCards" id={r.id} className="tabular-nums" />,
            },
            {
              key: 'vehicleId',
              label: 'Vehicle',
              sortValue: (r) => reg(r.vehicleId),
              render: (r) => <RecordLink entity="vehicles" id={r.vehicleId} />,
            },
            { key: 'priority', label: 'Priority', render: (r) => <Badge tone={PRIORITY_TONE[r.priority]}>{r.priority}</Badge> },
            { key: 'fault', label: 'Fault', maxWidth: '22rem', render: (r) => <span className="text-xs text-silver-500">{r.fault}</span> },
            { key: 'raisedAt', label: 'Raised', render: (r) => timeLabel(r.raisedAt) },
            {
              key: 'cost',
              label: 'Cost',
              align: 'right',
              sortValue: (r) => jobCardCost(r).total,
              render: (r) => money(jobCardCost(r).total),
              total: (r) => jobCardCost(r).total,
              totalRender: (sum) => money(sum),
            },
            { key: 'status', label: 'Status', render: (r) => <Badge tone={statusTone(r.status)}>{r.status}</Badge> },
          ]}
          rows={jobCards}
          empty="No job cards raised."
          emptyDescription="A failed daily inspection raises one automatically."
        />
      </Card>

      <Drawer
        open={Boolean(open)}
        onClose={() => setOpen(null)}
        title={open?.id}
        subtitle={open ? `${reg(open.vehicleId)} · ${num(open.odometer)} km` : ''}
        footer={
          open?.status !== 'Completed' && (
            <div className="flex gap-3">
              {open?.status === 'Open' && (
                <Button className="flex-1" icon={Icons.Play} onClick={() => advance(open, 'In Progress')}>
                  Start work
                </Button>
              )}
              <Button
                className="flex-1"
                variant={open?.status === 'Open' ? 'secondary' : 'primary'}
                icon={Icons.Check}
                onClick={() => advance(open, 'Completed')}
              >
                Mark complete
              </Button>
            </div>
          )
        }
      >
        {open && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge tone={PRIORITY_TONE[open.priority]}>{open.priority} priority</Badge>
              <Badge tone={statusTone(open.status)}>{open.status}</Badge>
            </div>

            <div className="p-4 rounded-xl bg-silver-50 border border-silver-200">
              <p className="text-xs font-semibold uppercase tracking-wider text-silver-400 mb-1.5">Fault</p>
              <p className="text-sm text-silver-700">{open.fault}</p>
              <p className="text-xs text-silver-400 mt-2">Raised {timeLabel(open.raisedAt)}</p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-silver-400 mb-3">Parts</p>
              {open.parts?.length === 0 ? (
                <p className="text-sm text-silver-500">No parts booked to this card.</p>
              ) : (
                <div className="space-y-2">
                  {open.parts.map((part) => (
                    <div key={part.name} className="flex justify-between gap-4 text-sm">
                      <span className="text-silver-600">
                        {part.name}
                        <span className="text-silver-400"> × {part.qty}</span>
                      </span>
                      <span className="font-medium text-silver-900 tabular-nums shrink-0">
                        {money(part.qty * part.unitCost)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-silver-200 space-y-2">
              {[
                { label: 'Parts', value: jobCardCost(open).parts },
                { label: `Labour — ${open.labourHours}h at $${open.labourRate}/h`, value: jobCardCost(open).labour },
              ].map((row) => (
                <div key={row.label} className="flex justify-between text-sm">
                  <span className="text-silver-500">{row.label}</span>
                  <span className="font-medium text-silver-900 tabular-nums">{money(row.value)}</span>
                </div>
              ))}
              <div className="flex justify-between text-base pt-2 border-t border-silver-200">
                <span className="font-semibold text-silver-900">Total</span>
                <span className="font-bold text-silver-900 tabular-nums">{money(jobCardCost(open).total)}</span>
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

/* ===== Service schedule ===== */

const ServiceSchedule = ({ vehicles, serviceRecords }) => (
  <div className="space-y-6">
    <Card padded={false}>
      <div className="table-card-head">
        <SectionHeading title="Upcoming services" description="Distance to the next scheduled service." />
      </div>
      <div className="p-5 md:p-6 space-y-4">
        {vehicles.map((vehicle) => {
          const used = vehicle.odometer - vehicle.lastServiceKm;
          const pct = (used / vehicle.serviceIntervalKm) * 100;
          return (
            <div key={vehicle.id}>
              <div className="flex justify-between items-baseline mb-1.5">
                <span className="text-sm font-medium text-silver-800">
                  {vehicle.reg}
                  <span className="text-silver-400 font-normal ml-2">
                    {vehicle.make} {vehicle.model}
                  </span>
                </span>
                <span
                  className={`text-xs tabular-nums font-medium ${
                    pct >= 100 ? 'text-[#d03b3b]' : pct >= 85 ? 'text-[#b07800]' : 'text-silver-500'
                  }`}
                >
                  {pct >= 100
                    ? `${num(used - vehicle.serviceIntervalKm)} km overdue`
                    : `${num(vehicle.serviceIntervalKm - used)} km remaining`}
                </span>
              </div>
              <ProgressBar
                value={Math.min(100, pct)}
                tone={pct >= 100 ? 'critical' : pct >= 85 ? 'warning' : 'primary'}
              />
            </div>
          );
        })}
      </div>
    </Card>

    <Card padded={false}>
      <div className="table-card-head">
        <SectionHeading title="Service history" />
      </div>
      <DataTable
        columns={[
          {
            key: 'vehicle',
            label: 'Vehicle',
            render: (r) => vehicles.find((v) => v.id === r.vehicleId)?.reg || '—',
          },
          { key: 'type', label: 'Type' },
          { key: 'odometer', label: 'Odometer', align: 'right', render: (r) => `${num(r.odometer)} km` },
          { key: 'performedAt', label: 'Date', render: (r) => dateLabel(r.performedAt) },
          { key: 'notes', label: 'Notes', render: (r) => <span className="text-xs text-silver-500">{r.notes}</span> },
          { key: 'cost', label: 'Cost', align: 'right', render: (r) => money(r.cost) },
        ]}
        rows={serviceRecords}
        empty="No services recorded."
      />
    </Card>
  </div>
);

/* ===== Tyres ===== */

const Tyres = ({ vehicles }) => {
  const rows = vehicles.flatMap((vehicle) =>
    (vehicle.tyres || []).map((tyre) => ({
      id: `${vehicle.id}-${tyre.serial}`,
      reg: vehicle.reg,
      ...tyre,
      projection: tyreProjection(tyre, vehicle),
      kmRun: vehicle.odometer - tyre.fittedKm,
    }))
  );

  const belowLimit = rows.filter((r) => r.treadMm <= TREAD_LIMIT_MM);

  return (
    <div className="space-y-6">
      {belowLimit.length > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800">
          <Icons.TriangleAlert size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-sm">
              {belowLimit.length} tyre{belowLimit.length === 1 ? '' : 's'} at or below the {TREAD_LIMIT_MM}mm legal limit
            </p>
            <p className="text-sm mt-0.5">
              {belowLimit.map((t) => `${t.reg} ${t.pos}`).join(', ')} — replace before the next dispatch.
            </p>
          </div>
        </div>
      )}

      <Card padded={false}>
        <div className="table-card-head">
          <SectionHeading
            title="Tyre register"
            description="Remaining life projected from wear rate since fitting."
          />
        </div>
        <DataTable
          columns={[
            { key: 'reg', label: 'Vehicle', render: (r) => <span className="font-medium text-silver-900">{r.reg}</span> },
            { key: 'pos', label: 'Position' },
            { key: 'serial', label: 'Serial', mono: true },
            { key: 'kmRun', label: 'Km run', align: 'right', render: (r) => num(r.kmRun) },
            {
              key: 'treadMm',
              label: 'Tread',
              align: 'right',
              render: (r) => (
                <span
                  className={
                    r.treadMm <= TREAD_LIMIT_MM
                      ? 'text-[#d03b3b] font-semibold'
                      : r.treadMm <= TREAD_WARN_MM
                      ? 'text-[#b07800] font-semibold'
                      : ''
                  }
                >
                  {r.treadMm.toFixed(1)}mm
                </span>
              ),
            },
            {
              key: 'remaining',
              label: 'Projected life',
              align: 'right',
              render: (r) => (r.projection.kmRemaining !== null ? `${num(r.projection.kmRemaining)} km` : '—'),
            },
            {
              key: 'status',
              label: 'Status',
              render: (r) => (
                <Badge tone={r.treadMm <= TREAD_LIMIT_MM ? 'critical' : r.treadMm <= TREAD_WARN_MM ? 'warning' : 'good'}>
                  {r.treadMm <= TREAD_LIMIT_MM ? 'Replace now' : r.treadMm <= TREAD_WARN_MM ? 'Monitor' : 'Serviceable'}
                </Badge>
              ),
            },
          ]}
          rows={rows}
          empty="No tyres registered."
        />
      </Card>
    </div>
  );
};

/* ===== Fuel analytics ===== */

const FuelAnalytics = ({ vehicles, fuelLogs, serviceRecords }) => {
  const perVehicle = vehicles
    .map((vehicle) => ({
      vehicle,
      latest: consumption(vehicle.id, fuelLogs),
      average: averageConsumption(vehicle.id, fuelLogs),
      cpk: costPerKm(vehicle.id, fuelLogs, serviceRecords),
    }))
    .filter((row) => row.average !== null);

  if (!perVehicle.length) {
    return (
      <Card>
        <EmptyState
          icon={Icons.Fuel}
          title="Not enough fills to analyse"
          description="Two fills on the same vehicle are needed before consumption can be calculated."
        />
      </Card>
    );
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <ChartCard
        title="Fuel consumption by vehicle"
        subtitle="Litres per 100 km, whole-period average"
        tableView={
          <DataTable
            dense
            columns={[
              { key: 'reg', label: 'Vehicle', render: (r) => r.vehicle.reg },
              { key: 'avg', label: 'L/100km', align: 'right', render: (r) => r.average.toFixed(1) },
              { key: 'cpk', label: 'Cost/km', align: 'right', render: (r) => (r.cpk ? `$${r.cpk.toFixed(2)}` : '—') },
            ]}
            rows={perVehicle.map((r) => ({ id: r.vehicle.id, ...r }))}
          />
        }
      >
        <BarChart
          data={perVehicle
            .slice()
            .sort((a, b) => b.average - a.average)
            .map((row) => ({
              label: `${row.vehicle.reg}`,
              value: Number(row.average.toFixed(1)),
              color: row.average > 45 ? STATUS.critical : SERIES[0],
              note: `${row.vehicle.make} ${row.vehicle.model} · ${row.cpk ? `$${row.cpk.toFixed(2)}/km` : ''}`,
            }))}
          formatValue={(v) => `${v} L`}
          labelWidth={90}
        />
      </ChartCard>

      <Card padded={false}>
        <div className="table-card-head">
          <SectionHeading
            title="Drift against own baseline"
            description="A vehicle burning more than its own average is the earliest mechanical warning you get."
          />
        </div>
        <DataTable
          columns={[
            { key: 'reg', label: 'Vehicle', render: (r) => <span className="font-medium">{r.vehicle.reg}</span> },
            { key: 'latest', label: 'Latest', align: 'right', render: (r) => (r.latest ? `${r.latest.toFixed(1)}` : '—') },
            { key: 'average', label: 'Baseline', align: 'right', render: (r) => r.average.toFixed(1) },
            {
              key: 'drift',
              label: 'Drift',
              align: 'right',
              render: (r) => {
                if (!r.latest) return '—';
                const drift = ((r.latest - r.average) / r.average) * 100;
                return (
                  <span className={drift > 10 ? 'text-[#d03b3b] font-semibold' : drift < -5 ? 'text-[#006300]' : ''}>
                    {drift > 0 ? '+' : ''}
                    {drift.toFixed(0)}%
                  </span>
                );
              },
            },
            { key: 'cpk', label: 'Cost / km', align: 'right', render: (r) => (r.cpk ? `$${r.cpk.toFixed(2)}` : '—') },
          ]}
          rows={perVehicle.map((r) => ({ id: r.vehicle.id, ...r }))}
        />
      </Card>
    </div>
  );
};

/* ===== Drivers ===== */

const Drivers = ({ drivers, vehicles, incidents }) => (
  <div className="grid lg:grid-cols-2 gap-6">
    <ChartCard
      title="Driver behaviour score"
      subtitle="Harsh braking, speeding, idling and cornering, from telematics"
      tableView={
        <DataTable
          dense
          columns={[
            { key: 'name', label: 'Driver' },
            { key: 'score', label: 'Score', align: 'right' },
            { key: 'band', label: 'Band', render: (r) => driverBand(r.score).label },
          ]}
          rows={drivers}
        />
      }
    >
      <BarChart
        data={drivers
          .slice()
          .sort((a, b) => b.score - a.score)
          .map((driver) => ({
            label: driver.name,
            value: driver.score,
            color:
              driver.score >= 85 ? STATUS.good : driver.score >= 70 ? SERIES[0] : driver.score >= 55 ? STATUS.warning : STATUS.critical,
            note: `${driverBand(driver.score).label} · ${vehicles.find((v) => v.id === driver.vehicleId)?.reg || 'unassigned'}`,
          }))}
        labelWidth={140}
      />
    </ChartCard>

    <Card padded={false}>
      <div className="table-card-head">
        <SectionHeading title="Driver register" description="Licence expiry is tracked — an expired licence grounds the driver." />
      </div>
      <DataTable
        columns={[
          { key: 'name', label: 'Driver', render: (r) => <span className="font-medium text-silver-900">{r.name}</span> },
          { key: 'licence', label: 'Licence', mono: true },
          {
            key: 'expiry',
            label: 'Expires',
            render: (r) => {
              const days = Math.round((new Date(r.expiry) - new Date()) / 86400000);
              return (
                <span className={days < 90 ? 'text-[#b07800] font-medium' : ''}>
                  {dateLabel(r.expiry)}
                  {days < 90 && <span className="text-xs ml-1.5">({days}d)</span>}
                </span>
              );
            },
          },
          { key: 'vehicle', label: 'Vehicle', render: (r) => vehicles.find((v) => v.id === r.vehicleId)?.reg || '—' },
          {
            key: 'incidents',
            label: 'Incidents',
            align: 'right',
            render: (r) => incidents.filter((i) => i.driverId === r.id).length,
          },
          {
            key: 'band',
            label: 'Behaviour',
            render: (r) => {
              const band = driverBand(r.score);
              return <Badge tone={band.band}>{band.label}</Badge>;
            },
          },
        ]}
        rows={drivers}
      />
    </Card>
  </div>
);

/* ===== Breakdowns ===== */

const Breakdowns = ({ incidents, vehicles }) => {
  const rows = incidents.filter((i) => ['Breakdown', 'Accident', 'Damage to Cargo'].includes(i.type));

  return (
    <Card padded={false}>
      <div className="table-card-head">
        <SectionHeading title="Breakdown & accident history" description="Feeds directly into the predictive risk score." />
      </div>
      <DataTable
        columns={[
          { key: 'reportedAt', label: 'When', render: (r) => timeLabel(r.reportedAt) },
          { key: 'vehicle', label: 'Vehicle', render: (r) => vehicles.find((v) => v.id === r.vehicleId)?.reg || '—' },
          { key: 'type', label: 'Type' },
          { key: 'severity', label: 'Severity', render: (r) => <Badge tone={r.severity === 'High' || r.severity === 'Critical' ? 'critical' : 'warning'}>{r.severity}</Badge> },
          { key: 'location', label: 'Location' },
          { key: 'description', label: 'Detail', render: (r) => <span className="text-xs text-silver-500">{r.description}</span> },
          { key: 'status', label: 'Status', render: (r) => <Badge tone={statusTone(r.status)}>{r.status}</Badge> },
        ]}
        rows={rows}
        empty="No breakdowns or accidents recorded."
      />
    </Card>
  );
};

export default Fleet;
