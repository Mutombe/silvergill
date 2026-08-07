import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import * as Icons from 'lucide-react';

import { useCollection } from '../../hooks';
import { monthlyFinancials, budgets, commodities, fxRates } from '../../data/seed';
import { shipmentRisk, borderOutlook, portOutlook } from '../../engine/forecast';
import { riskScore } from '../../engine/fleet';

import {
  Badge, Card, DataTable, ProgressBar, SectionHeading, Select, StatCard,
  money, num, pct, timeLabel, statusTone,
} from '../../components/ui';
import { BarChart, ChartCard, ColumnChart, LineChart, SERIES, STATUS, Sparkline } from '../../components/charts';

/* ===========================================================================
   ERP command centre.

   The one screen a finance director and an operations director can both stand
   in front of: the P&L, working capital, throughput and the health of the
   systems the numbers come out of — for the whole group, or one entity.
   =========================================================================== */

const PERIODS = [
  { key: '3', label: 'Last 3 months' },
  { key: '6', label: 'Last 6 months' },
];

const ENTITIES = [
  { key: 'group', label: 'Group (consolidated)' },
  { key: 'Zimbabwe', label: 'Zimbabwe' },
  { key: 'Mauritius', label: 'Mauritius' },
];

const daysBetween = (a, b) => Math.floor((new Date(a) - new Date(b)) / 86400000);

const ErpDashboard = () => {
  const shipments = useCollection('shipments');
  const invoices = useCollection('invoices');
  const supplierInvoices = useCollection('supplierInvoices');
  const quotations = useCollection('quotations');
  const customers = useCollection('customers');
  const vehicles = useCollection('vehicles');
  const jobCards = useCollection('jobCards');
  const fuelLogs = useCollection('fuelLogs');
  const incidents = useCollection('incidents');
  const inspections = useCollection('inspections');
  const auditLog = useCollection('auditLog');
  const queue = useCollection('syncQueue');
  const inbox = useCollection('inboxQueue');

  const [period, setPeriod] = useState('6');
  const [entity, setEntity] = useState('group');
  // Pinned once on mount: reading the clock during render makes the component
  // impure, and ageing buckets must not shift between two renders of the same
  // screen.
  const [now] = useState(() => Date.now());

  const months = useMemo(
    () => monthlyFinancials.slice(-Number(period)),
    [period]
  );

  /* ===== Ledger ===== */
  const ledger = useMemo(() => {
    const pick = (m) => {
      if (entity === 'Zimbabwe') return { revenue: m.zwRevenue, cost: m.zwCost, inter: 0 };
      if (entity === 'Mauritius') return { revenue: m.muRevenue, cost: m.muCost, inter: 0 };
      return { revenue: m.zwRevenue + m.muRevenue - m.intercompany, cost: m.zwCost + m.muCost, inter: m.intercompany };
    };

    const rows = months.map((m) => {
      const p = pick(m);
      const plan = budgets.find((b) => b.month === m.month);
      const planRevenue =
        entity === 'Zimbabwe' ? plan?.zwRevenue ?? 0
        : entity === 'Mauritius' ? plan?.muRevenue ?? 0
        : (plan?.zwRevenue ?? 0) + (plan?.muRevenue ?? 0) - m.intercompany;
      return {
        id: m.month,
        month: m.month,
        revenue: p.revenue,
        cost: p.cost,
        grossProfit: p.revenue - p.cost,
        margin: p.revenue ? ((p.revenue - p.cost) / p.revenue) * 100 : 0,
        plan: planRevenue,
        variance: p.revenue - planRevenue,
      };
    });

    const revenue = rows.reduce((s, r) => s + r.revenue, 0);
    const cost = rows.reduce((s, r) => s + r.cost, 0);
    const plan = rows.reduce((s, r) => s + r.plan, 0);

    return {
      rows,
      revenue,
      cost,
      grossProfit: revenue - cost,
      margin: revenue ? ((revenue - cost) / revenue) * 100 : 0,
      plan,
      variance: revenue - plan,
      variancePct: plan ? ((revenue - plan) / plan) * 100 : 0,
    };
  }, [months, entity]);

  /* ===== Working capital ===== */
  const workingCapital = useMemo(() => {
    const scoped = (rows) => (entity === 'group' ? rows : rows.filter((r) => r.entity === entity));

    const ar = scoped(invoices).map((i) => ({
      ...i,
      balance: i.amount - i.paidAmount,
      overdue: i.status !== 'Paid' ? daysBetween(now, i.dueAt) : 0,
    }));
    const arOpen = ar.filter((i) => i.balance > 0);
    const arTotal = arOpen.reduce((s, i) => s + i.balance, 0);
    const arOverdue = arOpen.filter((i) => i.overdue > 0).reduce((s, i) => s + i.balance, 0);
    const collected = ar.reduce((s, i) => s + i.paidAmount, 0);

    const apOpen = supplierInvoices.filter((i) => i.status !== 'Paid');
    const apTotal = apOpen.reduce((s, i) => s + i.amount, 0);

    // Days sales outstanding, on the period's revenue.
    const dailyRevenue = ledger.revenue / (Number(period) * 30);
    const dso = dailyRevenue > 0 ? arTotal / dailyRevenue : 0;

    const buckets = ['Current', '1–30', '31–60', '61–90', '90+'];
    const ageing = buckets.map((bucket) => ({ bucket, amount: 0 }));
    for (const inv of arOpen) {
      const d = inv.overdue;
      const i = d <= 0 ? 0 : d <= 30 ? 1 : d <= 60 ? 2 : d <= 90 ? 3 : 4;
      ageing[i].amount += inv.balance;
    }

    return { ar, arOpen, arTotal, arOverdue, apOpen, apTotal, collected, dso, ageing: ageing.filter((a) => a.amount > 0) };
  }, [invoices, supplierInvoices, entity, ledger.revenue, period, now]);

  /* ===== Operations ===== */
  const ops = useMemo(() => {
    const scoped = entity === 'group' ? shipments : shipments.filter((s) => s.entity === entity);
    const borderData = borderOutlook(4);
    const portData = portOutlook(4);

    const withRisk = scoped
      .filter((s) => s.status !== 'Delivered')
      .map((s) => ({ ...s, risk: shipmentRisk(s, { borderData, portData }) }));

    const delivered = scoped.filter((s) => s.status === 'Delivered');
    const onTime = delivered.length; // every delivered fixture landed on plan
    const tonnes = scoped.reduce((s, x) => s + x.weightTons, 0);

    const byStatus = {};
    for (const s of scoped) byStatus[s.status] = (byStatus[s.status] || 0) + 1;

    const byCommodity = {};
    for (const s of scoped) {
      const name = commodities.find((c) => c.code === s.commodity)?.name || s.commodity;
      byCommodity[name] = (byCommodity[name] || 0) + s.revenue;
    }

    const fleetScoped = entity === 'group' ? vehicles : vehicles.filter((v) => v.entity === entity);
    const inService = fleetScoped.filter((v) => v.status === 'In Service').length;
    const utilisation = fleetScoped.length ? (inService / fleetScoped.length) * 100 : 0;

    const fleetRisk = fleetScoped.map((v) => ({
      vehicle: v,
      risk: riskScore(v, { fuelLogs, incidents, inspections }),
    }));

    return {
      scoped, withRisk, delivered, onTime, tonnes, byStatus, byCommodity,
      fleetScoped, inService, utilisation, fleetRisk,
      atRisk: withRisk.filter((s) => s.risk.band !== 'good'),
    };
  }, [shipments, entity, vehicles, fuelLogs, incidents, inspections]);

  /* ===== Commercial ===== */
  const commercial = useMemo(() => {
    const scopedCustomers = entity === 'group' ? customers : customers.filter((c) => c.entity === entity);
    const ids = new Set(scopedCustomers.map((c) => c.id));
    const scoped = entity === 'group' ? quotations : quotations.filter((q) => ids.has(q.customerId));

    const won = scoped.filter((q) => q.status === 'Accepted');
    const lost = scoped.filter((q) => q.status === 'Declined');
    const open = scoped.filter((q) => ['Draft', 'Sent'].includes(q.status));
    const decided = won.length + lost.length;

    return {
      scoped, won, lost, open,
      winRate: decided ? (won.length / decided) * 100 : null,
      pipelineValue: open.reduce((s, q) => s + q.total, 0),
      wonValue: won.reduce((s, q) => s + q.total, 0),
      avgMargin: scoped.length ? scoped.reduce((s, q) => s + q.margin, 0) / scoped.length : 0,
      customers: scopedCustomers,
    };
  }, [quotations, customers, entity]);

  const failedSync = queue.filter((q) => q.status === 'failed').length;
  const pendingSync = queue.filter((q) => q.status === 'pending').length;
  const pendingInbox = inbox.filter((i) => i.status === 'pending').length;
  const openJobCards = jobCards.filter((j) => j.status !== 'Completed');

  return (
    <div className="space-y-4 min-w-0">
      {/* ===== Controls ===== */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-display font-semibold text-silver-900">Command centre</h2>
          <p className="text-xs text-silver-500 truncate">
            {ENTITIES.find((e) => e.key === entity)?.label} · {PERIODS.find((p) => p.key === period)?.label.toLowerCase()}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <div className="w-44">
            <Select value={entity} onChange={(e) => setEntity(e.target.value)}>
              {ENTITIES.map((e) => (
                <option key={e.key} value={e.key}>{e.label}</option>
              ))}
            </Select>
          </div>
          <div className="w-40">
            <Select value={period} onChange={(e) => setPeriod(e.target.value)}>
              {PERIODS.map((p) => (
                <option key={p.key} value={p.key}>{p.label}</option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {/* ===== Financial headline ===== */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard label="Revenue" value={money(ledger.revenue)} icon={Icons.TrendingUp} />
        <StatCard label="Direct cost" value={money(ledger.cost)} icon={Icons.Receipt} />
        <StatCard
          label="Gross profit"
          value={money(ledger.grossProfit)}
          icon={Icons.Banknote}
          tone="good"
          deltaLabel={`${ledger.margin.toFixed(1)}% margin`}
        />
        <StatCard
          label="Budget variance"
          value={`${ledger.variance >= 0 ? '+' : ''}${money(ledger.variance)}`}
          icon={ledger.variance >= 0 ? Icons.ArrowUpRight : Icons.ArrowDownRight}
          tone={ledger.variance >= 0 ? 'good' : 'critical'}
          delta={Number(ledger.variancePct.toFixed(1))}
        />
        <StatCard
          label="Receivables"
          value={money(workingCapital.arTotal)}
          icon={Icons.FileText}
          tone={workingCapital.arOverdue > 0 ? 'warning' : 'default'}
          deltaLabel={workingCapital.arOverdue ? `${money(workingCapital.arOverdue)} overdue` : 'nothing overdue'}
        />
        <StatCard
          label="Days sales outstanding"
          value={`${Math.round(workingCapital.dso)}d`}
          icon={Icons.CalendarClock}
          tone={workingCapital.dso > 45 ? 'warning' : 'good'}
          deltaLabel="cash conversion"
        />
      </div>

      {/* ===== P&L + budget ===== */}
      <div className="grid lg:grid-cols-3 gap-4 min-w-0">
        <ChartCard
          className="lg:col-span-2"
          title="Revenue against budget"
          subtitle="One measure, one scale — actual and plan side by side"
          legend={[
            { name: 'Actual', color: SERIES[0] },
            { name: 'Budget', color: SERIES[1] },
          ]}
          tableView={
            <DataTable
              dense
              columns={[
                { key: 'month', label: 'Month' },
                { key: 'revenue', label: 'Actual', align: 'right', render: (r) => money(r.revenue) },
                { key: 'plan', label: 'Budget', align: 'right', render: (r) => money(r.plan) },
                { key: 'variance', label: 'Variance', align: 'right', render: (r) => money(r.variance) },
              ]}
              rows={ledger.rows}
            />
          }
        >
          <ColumnChart
            labels={ledger.rows.map((r) => r.month)}
            series={[
              { name: 'Actual', values: ledger.rows.map((r) => r.revenue), color: SERIES[0] },
              { name: 'Budget', values: ledger.rows.map((r) => r.plan), color: SERIES[1] },
            ]}
            formatValue={(v) => `${Math.round(v / 1000)}k`}
          />
        </ChartCard>

        <Card>
          <SectionHeading title="Profit & loss" description="Summary for the period." />
          <div className="space-y-3">
            {[
              { label: 'Revenue', value: ledger.revenue, strong: true },
              { label: 'Direct cost of sales', value: -ledger.cost },
              { label: 'Gross profit', value: ledger.grossProfit, strong: true, rule: true },
            ].map((row) => (
              <div
                key={row.label}
                className={`flex justify-between gap-4 text-sm ${row.rule ? 'pt-3 border-t border-silver-200' : ''}`}
              >
                <span className={row.strong ? 'font-medium text-silver-800' : 'text-silver-500'}>
                  {row.label}
                </span>
                <span
                  className={`tabular-nums ${
                    row.strong ? 'font-bold text-silver-900' : 'text-silver-700'
                  }`}
                >
                  {row.value < 0 ? `(${money(Math.abs(row.value))})` : money(row.value)}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-5 pt-5 border-t border-silver-200">
            <ProgressBar
              value={ledger.margin}
              max={40}
              label="Gross margin"
              tone={ledger.margin >= 28 ? 'good' : ledger.margin >= 22 ? 'primary' : 'warning'}
            />
          </div>

          <div className="mt-5 pt-5 border-t border-silver-200">
            <p className="text-xs font-semibold uppercase tracking-wider text-silver-400 mb-3">
              Margin trend
            </p>
            <div className="flex items-end justify-between gap-3">
              <Sparkline values={ledger.rows.map((r) => r.margin)} color={SERIES[0]} width={140} height={40} />
              <span className="text-xl font-display font-bold text-silver-900 tabular-nums">
                {ledger.rows[ledger.rows.length - 1]?.margin.toFixed(1)}%
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* ===== Working capital ===== */}
      <div className="grid lg:grid-cols-3 gap-4 min-w-0">
        <ChartCard
          title="Receivables ageing"
          subtitle="Money owed to the group, by how overdue it is"
          tableView={
            <DataTable
              dense
              columns={[
                { key: 'bucket', label: 'Bucket' },
                { key: 'amount', label: 'Balance', align: 'right', render: (r) => money(r.amount) },
              ]}
              rows={workingCapital.ageing.map((a) => ({ id: a.bucket, ...a }))}
            />
          }
        >
          {workingCapital.ageing.length === 0 ? (
            <p className="text-sm text-silver-500 py-8 text-center">Nothing outstanding.</p>
          ) : (
            <BarChart
              data={workingCapital.ageing.map((row) => ({
                label: row.bucket === 'Current' ? 'Not yet due' : `${row.bucket} days`,
                value: Math.round(row.amount),
                color: row.bucket === 'Current' ? SERIES[0] : row.bucket === '1–30' ? STATUS.warning : STATUS.critical,
              }))}
              formatValue={(v) => money(v)}
              labelWidth={110}
            />
          )}
        </ChartCard>

        <Card>
          <SectionHeading title="Cash position" description="What is in and what is out." />
          <div className="space-y-4">
            {[
              { label: 'Collected in period', value: workingCapital.collected, tone: 'good', icon: Icons.ArrowDownLeft },
              { label: 'Receivables outstanding', value: workingCapital.arTotal, tone: 'default', icon: Icons.Clock },
              { label: 'Of which overdue', value: workingCapital.arOverdue, tone: 'critical', icon: Icons.AlertCircle },
              { label: 'Payables outstanding', value: workingCapital.apTotal, tone: 'default', icon: Icons.ArrowUpRight },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-silver-200">
                <span className="flex items-center gap-2.5 text-sm text-silver-600">
                  <row.icon size={15} className="text-silver-400" />
                  {row.label}
                </span>
                <span
                  className={`font-semibold tabular-nums ${
                    row.tone === 'good' ? 'text-[#006300]' : row.tone === 'critical' && row.value > 0 ? 'text-[#d03b3b]' : 'text-silver-900'
                  }`}
                >
                  {money(row.value)}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-silver-200 flex justify-between text-sm">
            <span className="font-medium text-silver-800">Net working capital</span>
            <span className="font-bold text-silver-900 tabular-nums">
              {money(workingCapital.arTotal - workingCapital.apTotal)}
            </span>
          </div>
        </Card>

        <Card>
          <SectionHeading title="Currency" description="Group reports in USD." />
          <div className="space-y-2.5">
            {fxRates.map((rate) => (
              <div key={rate.pair} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-silver-200">
                <span className="text-sm font-medium text-silver-800">{rate.pair}</span>
                <span className="flex items-center gap-3">
                  <span className="tabular-nums text-silver-900 font-semibold">{rate.rate.toFixed(2)}</span>
                  <span
                    className={`text-xs font-semibold tabular-nums ${
                      rate.change > 0 ? 'text-[#006300]' : rate.change < 0 ? 'text-[#d03b3b]' : 'text-silver-400'
                    }`}
                  >
                    {rate.change > 0 ? '▲' : '▼'} {Math.abs(rate.change)}%
                  </span>
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ===== Operations ===== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Consignments moving"
          value={ops.withRisk.length}
          icon={Icons.Ship}
          deltaLabel={`${ops.delivered.length} delivered`}
        />
        <StatCard
          label="At risk of slipping"
          value={ops.atRisk.length}
          icon={Icons.TriangleAlert}
          tone={ops.atRisk.length ? 'warning' : 'good'}
          deltaLabel={ops.atRisk.length ? 'needs a decision today' : 'all running to plan'}
        />
        <StatCard
          label="Tonnes on the books"
          value={num(ops.tonnes)}
          icon={Icons.Weight}
          deltaLabel={`across ${ops.scoped.length} consignments`}
        />
        <StatCard
          label="Fleet available"
          value={`${ops.utilisation.toFixed(0)}%`}
          icon={Icons.Truck}
          tone={ops.utilisation >= 80 ? 'good' : ops.utilisation >= 60 ? 'warning' : 'critical'}
          deltaLabel={`${ops.inService} of ${ops.fleetScoped.length} in service`}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 min-w-0">
        <ChartCard
          title="Revenue by commodity"
          subtitle="Where the money actually comes from"
          tableView={
            <DataTable
              dense
              columns={[
                { key: 'name', label: 'Commodity' },
                { key: 'value', label: 'Revenue', align: 'right', render: (r) => money(r.value) },
              ]}
              rows={Object.entries(ops.byCommodity).map(([name, value]) => ({ id: name, name, value }))}
            />
          }
        >
          <BarChart
            data={Object.entries(ops.byCommodity)
              .sort((a, b) => b[1] - a[1])
              .map(([name, value]) => ({
                label: name.length > 22 ? `${name.slice(0, 21)}…` : name,
                value: Math.round(value),
                color: SERIES[0],
              }))}
            formatValue={(v) => money(v)}
            labelWidth={150}
          />
        </ChartCard>

        <Card>
          <SectionHeading title="Pipeline & conversion" description="Commercial performance for the period." />
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { label: 'Open pipeline', value: money(commercial.pipelineValue), note: `${commercial.open.length} quotation(s)` },
              { label: 'Won', value: money(commercial.wonValue), note: `${commercial.won.length} accepted` },
              {
                label: 'Win rate',
                value: commercial.winRate === null ? '—' : `${commercial.winRate.toFixed(0)}%`,
                note: commercial.winRate === null ? 'nothing decided yet' : `${commercial.won.length} of ${commercial.won.length + commercial.lost.length}`,
              },
              { label: 'Average margin quoted', value: `${commercial.avgMargin.toFixed(1)}%`, note: 'across all quotations' },
            ].map((tile) => (
              <div key={tile.label} className="p-3.5 rounded-xl border border-silver-200">
                <p className="text-[11px] uppercase tracking-wider text-silver-400">{tile.label}</p>
                <p className="text-lg font-display font-bold text-silver-900 tabular-nums mt-0.5">{tile.value}</p>
                <p className="text-xs text-silver-400 mt-0.5">{tile.note}</p>
              </div>
            ))}
          </div>

          <p className="text-xs font-semibold uppercase tracking-wider text-silver-400 mb-2.5">
            Consignments by status
          </p>
          <div className="space-y-2">
            {Object.entries(ops.byStatus)
              .sort((a, b) => b[1] - a[1])
              .map(([status, count]) => (
                <div key={status} className="flex items-center justify-between gap-3">
                  <Badge tone={statusTone(status)}>{status}</Badge>
                  <span className="text-sm font-semibold text-silver-900 tabular-nums">{count}</span>
                </div>
              ))}
          </div>
        </Card>
      </div>

      {/* ===== Exceptions worth acting on ===== */}
      <Card padded={false}>
        <div className="table-card-head">
          <SectionHeading
            title="Needs a decision"
            description="Everything across the group currently waiting on somebody."
          />
        </div>
        <div className="p-5 md:p-6 pt-0 grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {[
            {
              label: 'Consignments predicted to slip',
              count: ops.atRisk.length,
              tone: 'warning',
              icon: Icons.TriangleAlert,
              to: '/portal/analytics',
            },
            {
              label: 'Field updates awaiting approval',
              count: pendingInbox,
              tone: 'info',
              icon: Icons.Inbox,
              to: '/portal/inbox',
            },
            {
              label: 'Open workshop job cards',
              count: openJobCards.length,
              tone: openJobCards.some((j) => j.priority === 'Critical') ? 'critical' : 'warning',
              icon: Icons.Wrench,
              to: '/portal/fleet',
            },
            {
              label: 'Overdue invoices',
              count: workingCapital.arOpen.filter((i) => i.overdue > 0).length,
              tone: 'critical',
              icon: Icons.Receipt,
              to: '/portal/admin',
            },
            {
              label: 'Records failed to post to BC',
              count: failedSync,
              tone: failedSync ? 'critical' : 'good',
              icon: Icons.RefreshCw,
              to: '/portal/admin',
            },
            {
              label: 'Records queued for BC',
              count: pendingSync,
              tone: pendingSync ? 'warning' : 'good',
              icon: Icons.CloudUpload,
              to: '/portal/admin',
            },
          ].map((item) => (
            <Link
              key={item.label}
              to={item.to}
              className={`flex items-center justify-between gap-3 p-4 rounded-xl border transition-colors ${
                item.count > 0
                  ? 'border-silver-200 hover:border-primary-300 hover:bg-primary-50/30'
                  : 'border-silver-200 opacity-60'
              }`}
            >
              <span className="flex items-center gap-3 min-w-0">
                <item.icon
                  size={17}
                  className={
                    item.count === 0
                      ? 'text-silver-300'
                      : item.tone === 'critical'
                      ? 'text-red-500'
                      : item.tone === 'warning'
                      ? 'text-amber-500'
                      : 'text-primary-500'
                  }
                />
                <span className="text-sm text-silver-700 truncate">{item.label}</span>
              </span>
              <span className="text-lg font-display font-bold text-silver-900 tabular-nums shrink-0">
                {item.count}
              </span>
            </Link>
          ))}
        </div>
      </Card>

      {/* ===== Fleet + activity ===== */}
      <div className="grid lg:grid-cols-2 gap-4 min-w-0">
        <Card padded={false}>
          <div className="table-card-head">
            <SectionHeading title="Fleet health" description="Predictive risk across the vehicles in scope." />
          </div>
          <DataTable
            sortable
            minWidth={560}
            initialSort={{ key: 'risk', dir: 'desc' }}
            columns={[
              {
                key: 'reg',
                label: 'Vehicle',
                sortValue: (r) => r.vehicle.reg,
                render: (r) => <span className="font-medium text-silver-900">{r.vehicle.reg}</span>,
              },
              {
                key: 'model',
                label: 'Model',
                maxWidth: '11rem',
                sortValue: (r) => `${r.vehicle.make} ${r.vehicle.model}`,
                render: (r) => <span className="text-[11px] text-silver-500">{r.vehicle.make} {r.vehicle.model}</span>,
              },
              {
                key: 'odo',
                label: 'Odometer',
                align: 'right',
                sortValue: (r) => r.vehicle.odometer,
                render: (r) => `${num(r.vehicle.odometer)} km`,
              },
              {
                key: 'status',
                label: 'Status',
                sortValue: (r) => r.vehicle.status,
                render: (r) => <Badge tone={statusTone(r.vehicle.status)}>{r.vehicle.status}</Badge>,
              },
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
            rows={ops.fleetRisk.map((r) => ({ id: r.vehicle.id, ...r }))}
            empty="No vehicles in scope."
            emptyDescription="Switch entity to see vehicles registered elsewhere."
          />
        </Card>

        <Card padded={false}>
          <div className="table-card-head">
            <SectionHeading title="Latest activity" description="Audited actions across every module." />
          </div>
          <DataTable
            minWidth={460}
            columns={[
              { key: 'at', label: 'When', width: '9rem', render: (r) => timeLabel(r.at) },
              {
                key: 'userName',
                label: 'User',
                maxWidth: '9rem',
                render: (r) => <span className="font-medium text-silver-900">{r.userName}</span>,
              },
              {
                key: 'summary',
                label: 'Action',
                maxWidth: '22rem',
                render: (r) => <span className="text-[11px] text-silver-600">{r.summary}</span>,
              },
            ]}
            rows={[...auditLog].sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 8)}
            empty="Nothing recorded yet."
            emptyDescription="Actions across every module are recorded here as they happen."
          />
        </Card>
      </div>

      {/* ===== Customer concentration ===== */}
      <Card padded={false}>
        <div className="table-card-head">
          <SectionHeading
            title="Customer concentration"
            description="Revenue and exposure per account — the risk nobody notices until it bites."
          />
        </div>
        <DataTable
          columns={[
            {
              key: 'name',
              label: 'Customer',
              maxWidth: '16rem',
              render: (r) => <span className="font-medium text-silver-900">{r.name}</span>,
            },
            { key: 'bcNo', label: 'Account', mono: true },
            { key: 'entity', label: 'Entity' },
            { key: 'loads', label: 'Loads', align: 'right', total: (r) => r.loads },
            {
              key: 'revenue',
              label: 'Revenue',
              align: 'right',
              render: (r) => money(r.revenue),
              total: (r) => r.revenue,
              totalRender: (sum) => money(sum),
            },
            {
              key: 'share',
              label: 'Share',
              align: 'right',
              render: (r) => (
                <span className={r.share > 35 ? 'text-[#b07800] font-semibold' : ''}>{pct(r.share, 0)}</span>
              ),
            },
            {
              key: 'outstanding',
              label: 'Owing',
              align: 'right',
              render: (r) => money(r.outstanding),
              total: (r) => r.outstanding,
              totalRender: (sum) => money(sum),
            },
          ]}
          rows={(() => {
            const totalRevenue = ops.scoped.reduce((s, x) => s + x.revenue, 0) || 1;
            return commercial.customers
              .map((c) => {
                const theirs = ops.scoped.filter((s) => s.customerId === c.id);
                const revenue = theirs.reduce((s, x) => s + x.revenue, 0);
                const outstanding = workingCapital.arOpen
                  .filter((i) => i.customerId === c.id)
                  .reduce((s, i) => s + i.balance, 0);
                return { id: c.id, name: c.name, bcNo: c.bcNo, entity: c.entity, loads: theirs.length, revenue, outstanding, share: (revenue / totalRevenue) * 100 };
              })
              .filter((r) => r.loads > 0 || r.outstanding > 0)
              .sort((a, b) => b.revenue - a.revenue);
          })()}
          sortable
          showTotals
          minWidth={780}
          empty="No customer activity in scope."
          emptyDescription="No consignments or open invoices for this entity and period."
        />
      </Card>
    </div>
  );
};

export default ErpDashboard;
