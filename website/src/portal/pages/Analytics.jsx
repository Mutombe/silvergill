import React, { useMemo, useState } from 'react';
import * as Icons from 'lucide-react';
import { toast } from 'sonner';

import { useCollection } from '../hooks';
import * as db from '../data/db';
import {
  borderOutlook, portOutlook, railOutlook, demandOutlook, shipmentRisk, forwardLabels,
} from '../engine/forecast';
import { marketSignals } from '../data/seed';

import {
  Badge, Card, DataTable, Drawer, SectionHeading, StatCard, Tabs, num, dateLabel,
} from '../components/ui';
import { BarChart, ChartCard, LineChart, SERIES, STATUS, Gauge } from '../components/charts';
import ModuleHeader from '../components/ModuleHeader';

/* ===========================================================================
   Module 10 — Predictive Logistics Analytics
   Four weeks ahead on border waits, port dwell, rail availability and demand,
   plus a per-shipment risk score so the prediction turns into an action.
   =========================================================================== */

const HORIZON = 4;

const Analytics = () => {
  const shipments = useCollection('shipments');
  const customers = useCollection('customers');
  const alertRules = useCollection('alertRules');
  const [tab, setTab] = useState('outlook');

  const borderData = useMemo(() => borderOutlook(HORIZON), []);
  const portData = useMemo(() => portOutlook(HORIZON), []);
  const rail = useMemo(() => railOutlook(HORIZON), []);
  const demand = useMemo(() => demandOutlook(HORIZON), []);

  const risks = useMemo(
    () =>
      shipments
        .filter((s) => s.status !== 'Delivered')
        .map((s) => ({ ...s, risk: shipmentRisk(s, { borderData, portData }) }))
        .sort((a, b) => b.risk.score - a.risk.score),
    [shipments, borderData, portData]
  );

  const atRisk = risks.filter((r) => r.risk.band !== 'good');
  const worstBorder = borderData[0];
  const worstPort = portData[0];

  // Alert rules are evaluated against the same outlook the charts draw, so a
  // breach on this screen always matches what the operator can see above.
  const evaluated = useMemo(
    () =>
      alertRules.map((rule) => {
        let observed = null;
        let unit = '';
        if (rule.metric === 'border') {
          observed = borderData.find((b) => b.code === rule.target)?.current ?? null;
          unit = 'h';
        } else if (rule.metric === 'port') {
          observed = portData.find((p) => p.code === rule.target)?.current ?? null;
          unit = ' days';
        } else if (rule.metric === 'rail') {
          observed = rail.current;
          unit = '%';
        } else if (rule.metric === 'demand') {
          observed = demand.current;
          unit = 't';
        }
        const breached =
          observed !== null &&
          rule.active &&
          (rule.comparator === 'above' ? observed > rule.threshold : observed < rule.threshold);
        return { ...rule, observed, unit, breached };
      }),
    [alertRules, borderData, portData, rail, demand]
  );

  const breached = evaluated.filter((r) => r.breached);

  return (
    <div className="space-y-6 max-w-[1400px]">
      <ModuleHeader
        number={10}
        title="Predictive Logistics Analytics"
        blurb={`Four weeks ahead on the conditions that actually move a delivery date — and which loads they put at risk.`}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Shipments at risk"
          value={atRisk.length}
          icon={Icons.TriangleAlert}
          tone={atRisk.length ? 'warning' : 'good'}
          deltaLabel={`of ${risks.length} in flight`}
        />
        <StatCard
          label="Worst border"
          value={worstBorder?.name}
          icon={Icons.Waypoints}
          tone={worstBorder?.severity === 'critical' ? 'critical' : 'warning'}
          deltaLabel={`${worstBorder?.current}h now → ${worstBorder?.predicted.toFixed(0)}h in ${HORIZON} weeks`}
        />
        <StatCard
          label="Worst port dwell"
          value={`${worstPort?.predicted.toFixed(1)}d`}
          icon={Icons.Anchor}
          tone={worstPort?.severity === 'critical' ? 'critical' : 'warning'}
          deltaLabel={`${worstPort?.name}, projected`}
        />
        <StatCard
          label="Rail availability"
          value={`${rail.predicted.toFixed(0)}%`}
          icon={Icons.TrainFront}
          tone={rail.severity === 'critical' ? 'critical' : rail.severity === 'warning' ? 'warning' : 'good'}
          delta={Number(rail.changePct.toFixed(1))}
          deltaLabel="projected change"
        />
      </div>

      <Tabs
        tabs={[
          { key: 'outlook', label: 'Corridor outlook' },
          { key: 'risk', label: 'Shipment risk', count: atRisk.length },
          { key: 'demand', label: 'Demand forecast' },
          { key: 'alerts', label: 'Alert rules', count: breached.length },
          { key: 'method', label: 'Method' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'outlook' && <Outlook borderData={borderData} portData={portData} rail={rail} />}
      {tab === 'risk' && <RiskBoard risks={risks} customers={customers} />}
      {tab === 'demand' && <Demand demand={demand} />}
      {tab === 'alerts' && <Alerts rules={evaluated} />}
      {tab === 'method' && <Method borderData={borderData} />}
    </div>
  );
};

/* ===== Corridor outlook ===== */

const Outlook = ({ borderData, portData, rail }) => {
  const labels = [...marketSignals.weeks, ...forwardLabels(HORIZON)];
  const [borderFocus, setBorderFocus] = useState(borderData[0]?.code);

  const focus = borderData.find((b) => b.code === borderFocus) || borderData[0];

  return (
    <div className="space-y-6">
      {/* Border */}
      <ChartCard
        title={`Border wait — ${focus.name}`}
        subtitle={`${focus.route} · observed 12 weeks, projected ${HORIZON}. Baseline ${focus.baselineHours}h.`}
        legend={[
          { name: 'Observed', color: SERIES[0] },
          { name: 'Projected', color: SERIES[1] },
        ]}
        tableView={
          <DataTable
            dense
            columns={[
              { key: 'week', label: 'Week' },
              { key: 'hours', label: 'Wait (hours)', align: 'right' },
              { key: 'kind', label: 'Type' },
            ]}
            rows={labels.map((week, i) => ({
              id: week,
              week,
              hours:
                i < focus.series.length
                  ? focus.series[i]
                  : focus.projection.forecast[i - focus.series.length]?.toFixed(1),
              kind: i < focus.series.length ? 'Observed' : 'Projected',
            }))}
          />
        }
      >
        <div className="flex flex-wrap gap-2 mb-4">
          {borderData.map((border) => (
            <button
              key={border.code}
              onClick={() => setBorderFocus(border.code)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                borderFocus === border.code
                  ? 'bg-primary-50 border-primary-300 text-primary-700'
                  : 'border-silver-200 text-silver-500 hover:border-silver-300'
              }`}
            >
              {border.name}
            </button>
          ))}
        </div>

        <LineChart
          labels={labels}
          height={260}
          series={[
            { name: 'Observed', color: SERIES[0], values: focus.projection.historySeries },
            { name: 'Projected', color: SERIES[1], values: focus.projection.forecastSeries, dashed: true },
          ]}
          formatValue={(v) => `${Number(v).toFixed(0)}h`}
        />

        <div className="grid sm:grid-cols-3 gap-4 mt-5 pt-5 border-t border-silver-200">
          <div>
            <p className="text-xs uppercase tracking-wider text-silver-400">Now</p>
            <p className="text-xl font-display font-bold text-silver-900 tabular-nums">{focus.current}h</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-silver-400">In {HORIZON} weeks</p>
            <p
              className={`text-xl font-display font-bold tabular-nums ${
                focus.severity === 'critical' ? 'text-[#d03b3b]' : focus.severity === 'warning' ? 'text-[#b07800]' : 'text-[#006300]'
              }`}
            >
              {focus.predicted.toFixed(0)}h
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-silver-400">Fit quality (R²)</p>
            <p className="text-xl font-display font-bold text-silver-900 tabular-nums">
              {focus.projection.model.r2.toFixed(2)}
            </p>
          </div>
        </div>
      </ChartCard>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Ports */}
        <ChartCard
          title="Port congestion — projected dwell"
          subtitle={`Days, ${HORIZON} weeks out`}
          tableView={
            <DataTable
              dense
              columns={[
                { key: 'name', label: 'Port' },
                { key: 'current', label: 'Now', align: 'right', render: (r) => `${r.current.toFixed(1)}d` },
                { key: 'predicted', label: 'Projected', align: 'right', render: (r) => `${r.predicted.toFixed(1)}d` },
              ]}
              rows={portData.map((p) => ({ id: p.code, ...p }))}
            />
          }
        >
          <BarChart
            data={portData.map((port) => ({
              label: port.name,
              value: Number(port.predicted.toFixed(1)),
              color:
                port.severity === 'critical' ? STATUS.critical : port.severity === 'warning' ? STATUS.warning : SERIES[0],
              note: `${port.current.toFixed(1)}d now · ${port.changePct > 0 ? '+' : ''}${port.changePct.toFixed(0)}%`,
            }))}
            formatValue={(v) => `${v}d`}
            labelWidth={110}
          />
        </ChartCard>

        {/* Rail */}
        <ChartCard
          title="Rail wagon availability (NRZ)"
          subtitle="Percent of requested wagons allocated"
          tableView={
            <DataTable
              dense
              columns={[
                { key: 'week', label: 'Week' },
                { key: 'value', label: 'Availability', align: 'right', render: (r) => `${r.value}%` },
              ]}
              rows={marketSignals.weeks.map((w, i) => ({ id: w, week: w, value: rail.series[i] }))}
            />
          }
          legend={[
            { name: 'Observed', color: SERIES[0] },
            { name: 'Projected', color: SERIES[1] },
          ]}
        >
          <LineChart
            labels={[...marketSignals.weeks, ...forwardLabels(HORIZON)]}
            height={220}
            series={[
              { name: 'Observed', color: SERIES[0], values: rail.projection.historySeries },
              { name: 'Projected', color: SERIES[1], values: rail.projection.forecastSeries, dashed: true },
            ]}
            formatValue={(v) => `${Number(v).toFixed(0)}%`}
          />
          <div className="mt-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-900 flex items-start gap-2.5">
            <Icons.TriangleAlert size={15} className="mt-0.5 shrink-0" />
            <span>
              Allocation has fallen every week for two months. Loads booked on rail past{' '}
              {forwardLabels(HORIZON)[1]} should carry a road contingency.
            </span>
          </div>
        </ChartCard>
      </div>
    </div>
  );
};

/* ===== Shipment risk ===== */

const RiskBoard = ({ risks, customers }) => {
  const [open, setOpen] = useState(null);
  const customerName = (id) => customers.find((c) => c.id === id)?.name || '—';

  return (
    <>
      <Card padded={false}>
        <div className="table-card-head">
          <SectionHeading
            title="Shipment risk board"
            description="Every load in flight, scored against current corridor conditions. Open one to see why."
          />
        </div>
        <DataTable
          onRowClick={setOpen}
          columns={[
            { key: 'id', label: 'Shipment', render: (r) => <span className="font-medium tabular-nums">{r.id}</span> },
            { key: 'customer', label: 'Customer', render: (r) => customerName(r.customerId) },
            {
              key: 'route',
              label: 'Route',
              render: (r) => <span className="text-xs text-silver-500">{r.origin} → {r.destination}</span>,
            },
            { key: 'status', label: 'Status' },
            { key: 'etaAt', label: 'Planned ETA', render: (r) => dateLabel(r.etaAt) },
            {
              key: 'predicted',
              label: 'Predicted',
              render: (r) =>
                r.risk.predictedEta ? (
                  <span className={r.risk.predictedEta.slipDays > 0 ? 'text-[#b07800] font-medium' : ''}>
                    {dateLabel(r.risk.predictedEta.date)}
                    {r.risk.predictedEta.slipDays > 0 && (
                      <span className="text-xs ml-1.5">+{r.risk.predictedEta.slipDays}d</span>
                    )}
                  </span>
                ) : (
                  '—'
                ),
            },
            {
              key: 'risk',
              label: 'Risk',
              align: 'right',
              render: (r) => (
                <span className="inline-flex items-center gap-2 justify-end">
                  <Badge tone={r.risk.band}>{r.risk.label}</Badge>
                  <span className="font-bold tabular-nums text-silver-900 w-7 text-right">{r.risk.score}</span>
                </span>
              ),
            },
          ]}
          rows={risks}
          empty="Nothing in flight."
        />
      </Card>

      <Drawer
        open={Boolean(open)}
        onClose={() => setOpen(null)}
        title={open?.id}
        subtitle={open ? `${open.origin} → ${open.destination}` : ''}
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
                {open.risk.predictedEta && (
                  <>
                    <p className="text-sm text-silver-500 mt-1">
                      Planned {dateLabel(open.etaAt)} · predicted {dateLabel(open.risk.predictedEta.date)}
                    </p>
                    {open.risk.predictedEta.slipDays > 0 && (
                      <p className="text-sm font-medium text-[#b07800] mt-1">
                        {open.risk.predictedEta.slipDays} day slip expected
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-silver-400 mb-3">
                What is driving the risk
              </p>
              {open.risk.drivers.length === 0 ? (
                <p className="text-sm text-silver-500">
                  No adverse corridor conditions. This load should run to plan.
                </p>
              ) : (
                <div className="space-y-3">
                  {open.risk.drivers.map((driver) => (
                    <div key={driver.label} className="p-3.5 rounded-xl border border-silver-200">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-silver-800">{driver.label}</p>
                          <p className="text-xs text-silver-500 mt-0.5">{driver.detail}</p>
                        </div>
                        <span className="text-sm font-bold text-silver-900 tabular-nums shrink-0">
                          +{driver.points}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {open.risk.band !== 'good' && (
              <div className="p-4 rounded-xl bg-primary-50 border border-primary-200">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary-700 mb-2">
                  Suggested action
                </p>
                <ul className="text-sm text-primary-900 space-y-1.5">
                  {open.risk.drivers.some((d) => d.label.includes('congestion')) && (
                    <li>• Re-route via an alternative crossing, or pre-lodge the entry.</li>
                  )}
                  {open.risk.drivers.some((d) => d.label.includes('dwell')) && (
                    <li>• Book the collection slot now — dwell is rising at this port.</li>
                  )}
                  {open.risk.drivers.some((d) => d.label.includes('Rail')) && (
                    <li>• Hold a road contingency; wagon allocation is falling.</li>
                  )}
                  <li>• Tell the customer today rather than on the planned ETA.</li>
                </ul>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </>
  );
};

/* ===== Demand ===== */

const Demand = ({ demand }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard label="Current weekly volume" value={`${num(demand.current)}t`} icon={Icons.Package} />
      <StatCard
        label={`Projected, ${HORIZON} weeks`}
        value={`${num(demand.predicted)}t`}
        icon={Icons.TrendingUp}
        delta={Number(demand.changePct.toFixed(1))}
        tone="good"
      />
      <StatCard
        label="Weekly growth"
        value={`${demand.projection.model.slope.toFixed(0)}t`}
        icon={Icons.ChartLine}
        deltaLabel="fitted trend"
      />
      <StatCard
        label="Fit quality"
        value={demand.projection.model.r2.toFixed(2)}
        icon={Icons.Target}
        deltaLabel="R² — 1.0 is a perfect fit"
      />
    </div>

    <ChartCard
      title="Demand forecast"
      subtitle={`Tonnes booked per week — observed 12 weeks, projected ${HORIZON}`}
      legend={[
        { name: 'Observed', color: SERIES[0] },
        { name: 'Projected', color: SERIES[1] },
      ]}
      tableView={
        <DataTable
          dense
          columns={[
            { key: 'week', label: 'Week' },
            { key: 'tons', label: 'Tonnes', align: 'right' },
            { key: 'kind', label: 'Type' },
          ]}
          rows={[...marketSignals.weeks, ...forwardLabels(HORIZON)].map((week, i) => ({
            id: week,
            week,
            tons:
              i < demand.series.length
                ? demand.series[i]
                : Math.round(demand.projection.forecast[i - demand.series.length]),
            kind: i < demand.series.length ? 'Observed' : 'Projected',
          }))}
        />
      }
    >
      <LineChart
        labels={[...marketSignals.weeks, ...forwardLabels(HORIZON)]}
        height={280}
        zeroBased={false}
        series={[
          { name: 'Observed', color: SERIES[0], values: demand.projection.historySeries },
          { name: 'Projected', color: SERIES[1], values: demand.projection.forecastSeries, dashed: true },
        ]}
        formatValue={(v) => `${Math.round(v)}t`}
        areaFill
      />
    </ChartCard>

    <Card>
      <SectionHeading title="What this means for capacity" />
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          {
            icon: Icons.Truck,
            title: 'Fleet',
            body: `Projected volume needs roughly ${Math.ceil(demand.predicted / 34)} loads a week at 34t average — ${
              Math.ceil(demand.predicted / 34) - Math.ceil(demand.current / 34)
            } more than today.`,
          },
          {
            icon: Icons.TrainFront,
            title: 'Rail',
            body: 'Wagon allocation is falling while demand rises. Book earlier or move the marginal tonnage onto road.',
          },
          {
            icon: Icons.Users,
            title: 'Contractors',
            body: 'Sub-contract capacity should be secured now, before the peak prices the spot market up.',
          },
        ].map((item) => (
          <div key={item.title} className="p-4 rounded-xl border border-silver-200">
            <item.icon size={18} className="text-primary-600 mb-2.5" />
            <p className="font-medium text-silver-900 mb-1">{item.title}</p>
            <p className="text-sm text-silver-600">{item.body}</p>
          </div>
        ))}
      </div>
    </Card>
  </div>
);

/* ===========================================================================
   Alert rules — a threshold on a corridor metric, evaluated live.
   =========================================================================== */

const Alerts = ({ rules }) => {
  const breached = rules.filter((r) => r.breached);

  const toggle = (rule) => {
    db.update('alertRules', rule.id, { active: !rule.active });
    toast.success(`${rule.name} ${rule.active ? 'paused' : 'activated'}`);
  };

  return (
    <div className="space-y-6">
      {breached.length > 0 ? (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800">
          <Icons.BellRing size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-sm">
              {breached.length} rule{breached.length === 1 ? '' : 's'} currently breached
            </p>
            <ul className="text-sm mt-1 space-y-0.5">
              {breached.map((rule) => (
                <li key={rule.id}>
                  {rule.name} — currently {rule.observed}{rule.unit} against a {rule.threshold}
                  {rule.unit} threshold
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800">
          <Icons.ShieldCheck size={18} className="mt-0.5 shrink-0" />
          <p className="text-sm">
            <span className="font-semibold">Nothing breached.</span> Every active rule is inside its
            threshold.
          </p>
        </div>
      )}

      <Card padded={false}>
        <div className="table-card-head">
          <SectionHeading
            title="Alert rules"
            description="Thresholds evaluated against the live corridor outlook. Pause one to stop it firing."
          />
        </div>
        <DataTable
          columns={[
            { key: 'name', label: 'Rule', render: (r) => <span className="font-medium text-silver-900">{r.name}</span> },
            { key: 'metric', label: 'Metric', render: (r) => <span className="capitalize">{r.metric}</span> },
            { key: 'target', label: 'Target' },
            {
              key: 'threshold',
              label: 'Threshold',
              align: 'right',
              render: (r) => `${r.comparator === 'above' ? '>' : '<'} ${r.threshold}${r.unit}`,
            },
            {
              key: 'observed',
              label: 'Now',
              align: 'right',
              render: (r) =>
                r.observed === null ? (
                  '—'
                ) : (
                  <span className={r.breached ? 'text-[#d03b3b] font-semibold' : 'text-silver-700'}>
                    {typeof r.observed === 'number' ? r.observed.toFixed(r.unit === '%' || r.unit === 'h' ? 0 : 1) : r.observed}
                    {r.unit}
                  </span>
                ),
            },
            { key: 'channel', label: 'Notify via', render: (r) => <span className="text-xs text-silver-500">{r.channel}</span> },
            {
              key: 'state',
              label: 'State',
              render: (r) => (
                <Badge tone={!r.active ? 'neutral' : r.breached ? 'critical' : 'good'}>
                  {!r.active ? 'Paused' : r.breached ? 'Breached' : 'Within limits'}
                </Badge>
              ),
            },
            {
              key: 'action',
              label: '',
              render: (r) => (
                <button
                  onClick={() => toggle(r)}
                  className="text-xs font-medium text-silver-500 hover:text-primary-600 border border-silver-200 rounded-lg px-2.5 py-1.5"
                >
                  {r.active ? 'Pause' : 'Activate'}
                </button>
              ),
            },
          ]}
          rows={rules}
          empty="No alert rules configured."
        />
      </Card>
    </div>
  );
};

/* ===== Method ===== */

const Method = ({ borderData }) => (
  <div className="grid lg:grid-cols-2 gap-6">
    <Card>
      <SectionHeading
        title="How the predictions are made"
        description="Deliberately simple, so you can argue with it."
      />
      <ol className="space-y-4">
        {[
          {
            title: 'Observed series',
            body: 'Twelve rolling weeks of border wait times, port dwell, wagon allocation and booked tonnage — all figures the business already records.',
          },
          {
            title: 'Least-squares trend',
            body: 'An ordinary linear fit through each series. Slope is the weekly rate of change; R² says how much of the movement the trend actually explains.',
          },
          {
            title: 'Confidence band',
            body: 'Built from the residual standard error and widened 35% per period out, because uncertainty compounds with distance.',
          },
          {
            title: 'Risk scoring',
            body: 'Each shipment picks up points from its own corridor conditions, its mode, and how much of its planned window it has already used.',
          },
        ].map((step, i) => (
          <li key={step.title} className="flex gap-4">
            <span className="w-7 h-7 rounded-lg bg-primary-50 text-primary-700 text-sm font-bold flex items-center justify-center shrink-0">
              {i + 1}
            </span>
            <div>
              <p className="font-medium text-silver-900">{step.title}</p>
              <p className="text-sm text-silver-600 mt-0.5">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-6 p-4 rounded-xl bg-silver-50 border border-silver-200 text-sm text-silver-600">
        <p className="font-medium text-silver-800 mb-1.5">Where it gets better</p>
        Feed it live ZIMRA and port-authority data and two years of your own transit history, and a
        fitted seasonal model will beat a straight line — particularly around the tobacco season and
        the December border peak.
      </div>
    </Card>

    <Card padded={false}>
      <div className="table-card-head">
        <SectionHeading title="Model fit by corridor" description="Low R² means treat that forecast with caution." />
      </div>
      <DataTable
        columns={[
          { key: 'name', label: 'Border', render: (r) => <span className="font-medium text-silver-900">{r.name}</span> },
          { key: 'route', label: 'Route' },
          { key: 'baselineHours', label: 'Baseline', align: 'right', render: (r) => `${r.baselineHours}h` },
          { key: 'current', label: 'Now', align: 'right', render: (r) => `${r.current}h` },
          { key: 'predicted', label: 'Projected', align: 'right', render: (r) => `${r.predicted.toFixed(0)}h` },
          {
            key: 'slope',
            label: 'Weekly change',
            align: 'right',
            render: (r) => `${r.projection.model.slope > 0 ? '+' : ''}${r.projection.model.slope.toFixed(2)}h`,
          },
          {
            key: 'r2',
            label: 'R²',
            align: 'right',
            render: (r) => (
              <span className={r.projection.model.r2 < 0.4 ? 'text-[#b07800]' : 'text-[#006300]'}>
                {r.projection.model.r2.toFixed(2)}
              </span>
            ),
          },
        ]}
        rows={borderData}
      />
    </Card>
  </div>
);

export default Analytics;
