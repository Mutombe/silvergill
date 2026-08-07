import React, { useMemo, useState } from 'react';
import * as Icons from 'lucide-react';

import { useCollection } from '../hooks';
import { monthlyFinancials, fxRates, budgets } from '../data/seed';

import {
  Badge, Card, DataTable, SectionHeading, StatCard, Tabs, money, num,
} from '../components/ui';
import { BarChart, ChartCard, ColumnChart, LineChart, SERIES, Sparkline } from '../components/charts';
import ModuleHeader from '../components/ModuleHeader';

/* ===========================================================================
   Module 9 — Mauritius–Zimbabwe Group Portal
   The consolidated view. Both entities on one scale, intercompany separated
   out so group revenue is not double counted.
   =========================================================================== */

const Group = () => {
  const shipments = useCollection('shipments');
  const customers = useCollection('customers');
  const [tab, setTab] = useState('consolidated');

  const totals = useMemo(() => {
    const sum = (key) => monthlyFinancials.reduce((acc, m) => acc + m[key], 0);
    const zwRevenue = sum('zwRevenue');
    const muRevenue = sum('muRevenue');
    const zwCost = sum('zwCost');
    const muCost = sum('muCost');
    const intercompany = sum('intercompany');

    return {
      zwRevenue,
      muRevenue,
      zwCost,
      muCost,
      intercompany,
      // Intercompany billing is eliminated so it is not counted twice at group.
      groupRevenue: zwRevenue + muRevenue - intercompany,
      groupCost: zwCost + muCost,
      zwMargin: ((zwRevenue - zwCost) / zwRevenue) * 100,
      muMargin: ((muRevenue - muCost) / muRevenue) * 100,
    };
  }, []);

  const groupMargin = ((totals.groupRevenue - totals.groupCost) / totals.groupRevenue) * 100;

  return (
    <div className="space-y-6 max-w-[1400px]">
      <ModuleHeader
        number={9}
        title="Mauritius–Zimbabwe Group Portal"
        blurb="One consolidated picture of both operating entities — revenue, margin, intercompany, currency exposure and shared customers."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Group revenue"
          value={money(totals.groupRevenue)}
          icon={Icons.Landmark}
          delta={9.2}
          deltaLabel="six months, after eliminations"
        />
        <StatCard
          label="Group margin"
          value={`${groupMargin.toFixed(1)}%`}
          icon={Icons.TrendingUp}
          tone={groupMargin > 28 ? 'good' : 'default'}
          deltaLabel={`ZW ${totals.zwMargin.toFixed(0)}% · MU ${totals.muMargin.toFixed(0)}%`}
        />
        <StatCard
          label="Intercompany"
          value={money(totals.intercompany)}
          icon={Icons.ArrowLeftRight}
          deltaLabel="eliminated on consolidation"
        />
        <StatCard
          label="Mauritius share"
          value={`${((totals.muRevenue / (totals.zwRevenue + totals.muRevenue)) * 100).toFixed(0)}%`}
          icon={Icons.Globe2}
          deltaLabel="of gross entity revenue"
        />
      </div>

      <Tabs
        tabs={[
          { key: 'consolidated', label: 'Consolidated' },
          { key: 'budget', label: 'Budget variance' },
          { key: 'profitability', label: 'Cross-border profitability' },
          { key: 'intercompany', label: 'Intercompany' },
          { key: 'currency', label: 'Currency' },
          { key: 'customers', label: 'Shared customers' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'consolidated' && <Consolidated totals={totals} />}
      {tab === 'budget' && <BudgetVariance />}
      {tab === 'profitability' && <Profitability shipments={shipments} />}
      {tab === 'intercompany' && <Intercompany />}
      {tab === 'currency' && <Currency />}
      {tab === 'customers' && <SharedCustomers customers={customers} shipments={shipments} />}
    </div>
  );
};

/* ===== Consolidated ===== */

const Consolidated = ({ totals }) => {
  const labels = monthlyFinancials.map((m) => m.month);

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-2 gap-6">
        <ChartCard
          title="Revenue by entity"
          subtitle="Gross, before intercompany eliminations"
          legend={[
            { name: 'Zimbabwe', color: SERIES[0] },
            { name: 'Mauritius', color: SERIES[1] },
          ]}
          tableView={
            <DataTable
              dense
              columns={[
                { key: 'month', label: 'Month' },
                { key: 'zw', label: 'Zimbabwe', align: 'right', render: (r) => money(r.zwRevenue) },
                { key: 'mu', label: 'Mauritius', align: 'right', render: (r) => money(r.muRevenue) },
                {
                  key: 'group',
                  label: 'Group',
                  align: 'right',
                  render: (r) => money(r.zwRevenue + r.muRevenue - r.intercompany),
                },
              ]}
              rows={monthlyFinancials.map((m) => ({ id: m.month, ...m }))}
            />
          }
        >
          <ColumnChart
            labels={labels}
            series={[
              { name: 'Zimbabwe', values: monthlyFinancials.map((m) => m.zwRevenue), color: SERIES[0] },
              { name: 'Mauritius', values: monthlyFinancials.map((m) => m.muRevenue), color: SERIES[1] },
            ]}
            formatValue={(v) => `${Math.round(v / 1000)}k`}
          />
        </ChartCard>

        <ChartCard
          title="Gross margin by entity"
          subtitle="Percent — a second measure gets its own chart, never a second axis"
          legend={[
            { name: 'Zimbabwe', color: SERIES[0] },
            { name: 'Mauritius', color: SERIES[1] },
          ]}
          tableView={
            <DataTable
              dense
              columns={[
                { key: 'month', label: 'Month' },
                {
                  key: 'zw',
                  label: 'Zimbabwe',
                  align: 'right',
                  render: (r) => `${(((r.zwRevenue - r.zwCost) / r.zwRevenue) * 100).toFixed(1)}%`,
                },
                {
                  key: 'mu',
                  label: 'Mauritius',
                  align: 'right',
                  render: (r) => `${(((r.muRevenue - r.muCost) / r.muRevenue) * 100).toFixed(1)}%`,
                },
              ]}
              rows={monthlyFinancials.map((m) => ({ id: m.month, ...m }))}
            />
          }
        >
          <LineChart
            labels={labels}
            zeroBased={false}
            series={[
              {
                name: 'Zimbabwe',
                color: SERIES[0],
                values: monthlyFinancials.map((m) => Number((((m.zwRevenue - m.zwCost) / m.zwRevenue) * 100).toFixed(1))),
              },
              {
                name: 'Mauritius',
                color: SERIES[1],
                values: monthlyFinancials.map((m) => Number((((m.muRevenue - m.muCost) / m.muRevenue) * 100).toFixed(1))),
              },
            ]}
            formatValue={(v) => `${Number(v).toFixed(0)}%`}
          />
        </ChartCard>
      </div>

      <Card padded={false}>
        <div className="table-card-head">
          <SectionHeading
            title="Group consolidation"
            description="Entity results, eliminations and the consolidated position."
          />
        </div>
        <DataTable
          columns={[
            { key: 'line', label: '', render: (r) => <span className="font-medium text-silver-900">{r.line}</span> },
            { key: 'zw', label: 'Zimbabwe', align: 'right', render: (r) => (r.zw === null ? '—' : money(r.zw)) },
            { key: 'mu', label: 'Mauritius', align: 'right', render: (r) => (r.mu === null ? '—' : money(r.mu)) },
            {
              key: 'elim',
              label: 'Eliminations',
              align: 'right',
              render: (r) => (r.elim ? <span className="text-[#d03b3b]">({money(r.elim)})</span> : '—'),
            },
            {
              key: 'group',
              label: 'Group',
              align: 'right',
              render: (r) => <span className="font-semibold text-silver-900">{money(r.group)}</span>,
            },
          ]}
          rows={[
            {
              id: 'rev',
              line: 'Revenue',
              zw: totals.zwRevenue,
              mu: totals.muRevenue,
              elim: totals.intercompany,
              group: totals.groupRevenue,
            },
            {
              id: 'cost',
              line: 'Direct cost',
              zw: totals.zwCost,
              mu: totals.muCost,
              elim: 0,
              group: totals.groupCost,
            },
            {
              id: 'gp',
              line: 'Gross profit',
              zw: totals.zwRevenue - totals.zwCost,
              mu: totals.muRevenue - totals.muCost,
              elim: totals.intercompany,
              group: totals.groupRevenue - totals.groupCost,
            },
          ]}
        />
      </Card>
    </div>
  );
};

/* ===========================================================================
   Budget variance — actual against plan, by entity and month.
   =========================================================================== */

const BudgetVariance = () => {
  const rows = monthlyFinancials.map((actual) => {
    const plan = budgets.find((b) => b.month === actual.month) || { zwRevenue: 0, muRevenue: 0 };
    const actualTotal = actual.zwRevenue + actual.muRevenue;
    const planTotal = plan.zwRevenue + plan.muRevenue;
    return {
      id: actual.month,
      month: actual.month,
      zwActual: actual.zwRevenue,
      zwPlan: plan.zwRevenue,
      zwVar: actual.zwRevenue - plan.zwRevenue,
      muActual: actual.muRevenue,
      muPlan: plan.muRevenue,
      muVar: actual.muRevenue - plan.muRevenue,
      total: actualTotal,
      planTotal,
      variance: actualTotal - planTotal,
      variancePct: planTotal ? ((actualTotal - planTotal) / planTotal) * 100 : 0,
    };
  });

  const ytdActual = rows.reduce((s, r) => s + r.total, 0);
  const ytdPlan = rows.reduce((s, r) => s + r.planTotal, 0);
  const ytdVar = ytdActual - ytdPlan;
  const monthsAhead = rows.filter((r) => r.variance > 0).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Actual to date" value={money(ytdActual)} icon={Icons.TrendingUp} />
        <StatCard label="Budget to date" value={money(ytdPlan)} icon={Icons.Target} />
        <StatCard
          label="Variance"
          value={`${ytdVar >= 0 ? '+' : ''}${money(ytdVar)}`}
          icon={ytdVar >= 0 ? Icons.ArrowUpRight : Icons.ArrowDownRight}
          tone={ytdVar >= 0 ? 'good' : 'critical'}
          delta={Number(((ytdVar / ytdPlan) * 100).toFixed(1))}
          deltaLabel="against plan"
        />
        <StatCard
          label="Months ahead of plan"
          value={`${monthsAhead} of ${rows.length}`}
          icon={Icons.CalendarCheck}
          tone={monthsAhead >= rows.length / 2 ? 'good' : 'warning'}
        />
      </div>

      <ChartCard
        title="Actual against budget"
        subtitle="Group revenue, both entities combined — one measure, one scale"
        legend={[
          { name: 'Actual', color: SERIES[0] },
          { name: 'Budget', color: SERIES[1] },
        ]}
        tableView={
          <DataTable
            dense
            columns={[
              { key: 'month', label: 'Month' },
              { key: 'total', label: 'Actual', align: 'right', render: (r) => money(r.total) },
              { key: 'planTotal', label: 'Budget', align: 'right', render: (r) => money(r.planTotal) },
              { key: 'variance', label: 'Variance', align: 'right', render: (r) => money(r.variance) },
            ]}
            rows={rows}
          />
        }
      >
        <ColumnChart
          labels={rows.map((r) => r.month)}
          series={[
            { name: 'Actual', values: rows.map((r) => r.total), color: SERIES[0] },
            { name: 'Budget', values: rows.map((r) => r.planTotal), color: SERIES[1] },
          ]}
          formatValue={(v) => `${Math.round(v / 1000)}k`}
        />
      </ChartCard>

      <Card padded={false}>
        <div className="table-card-head">
          <SectionHeading title="Variance by entity" description="Where the difference is actually coming from." />
        </div>
        <DataTable
          columns={[
            { key: 'month', label: 'Month', render: (r) => <span className="font-medium text-silver-900">{r.month}</span> },
            { key: 'zwActual', label: 'ZW actual', align: 'right', render: (r) => money(r.zwActual) },
            { key: 'zwPlan', label: 'ZW budget', align: 'right', render: (r) => money(r.zwPlan) },
            {
              key: 'zwVar',
              label: 'ZW var',
              align: 'right',
              render: (r) => (
                <span className={r.zwVar >= 0 ? 'text-[#006300] font-medium' : 'text-[#d03b3b] font-medium'}>
                  {r.zwVar >= 0 ? '+' : ''}{money(r.zwVar)}
                </span>
              ),
            },
            { key: 'muActual', label: 'MU actual', align: 'right', render: (r) => money(r.muActual) },
            { key: 'muPlan', label: 'MU budget', align: 'right', render: (r) => money(r.muPlan) },
            {
              key: 'muVar',
              label: 'MU var',
              align: 'right',
              render: (r) => (
                <span className={r.muVar >= 0 ? 'text-[#006300] font-medium' : 'text-[#d03b3b] font-medium'}>
                  {r.muVar >= 0 ? '+' : ''}{money(r.muVar)}
                </span>
              ),
            },
            {
              key: 'variancePct',
              label: 'Total',
              align: 'right',
              render: (r) => (
                <span className={r.variance >= 0 ? 'text-[#006300] font-semibold' : 'text-[#d03b3b] font-semibold'}>
                  {r.variancePct >= 0 ? '+' : ''}{r.variancePct.toFixed(1)}%
                </span>
              ),
            },
          ]}
          rows={rows}
        />
      </Card>
    </div>
  );
};

/* ===== Cross-border profitability ===== */

const Profitability = ({ shipments }) => {
  const lanes = useMemo(() => {
    const map = new Map();
    for (const shipment of shipments) {
      const key = `${shipment.origin.split(',')[0]} → ${shipment.destination.split(',')[0]}`;
      const existing = map.get(key) || { lane: key, revenue: 0, cost: 0, count: 0, entity: shipment.entity };
      existing.revenue += shipment.revenue;
      existing.cost += shipment.cost;
      existing.count += 1;
      map.set(key, existing);
    }
    return [...map.values()]
      .map((lane) => ({
        ...lane,
        id: lane.lane,
        profit: lane.revenue - lane.cost,
        margin: ((lane.revenue - lane.cost) / lane.revenue) * 100,
      }))
      .sort((a, b) => b.profit - a.profit);
  }, [shipments]);

  return (
    <div className="space-y-6">
      <ChartCard
        title="Profit by lane"
        subtitle="Gross profit per corridor across both entities"
        tableView={
          <DataTable
            dense
            columns={[
              { key: 'lane', label: 'Lane' },
              { key: 'count', label: 'Loads', align: 'right' },
              { key: 'revenue', label: 'Revenue', align: 'right', render: (r) => money(r.revenue) },
              { key: 'profit', label: 'Profit', align: 'right', render: (r) => money(r.profit) },
            ]}
            rows={lanes}
          />
        }
      >
        <BarChart
          data={lanes.map((lane) => ({
            label: lane.lane.length > 30 ? `${lane.lane.slice(0, 29)}…` : lane.lane,
            value: Math.round(lane.profit),
            color: lane.entity === 'Mauritius' ? SERIES[1] : SERIES[0],
            note: `${lane.count} load${lane.count === 1 ? '' : 's'} · ${lane.margin.toFixed(1)}% margin`,
          }))}
          formatValue={(v) => `$${num(v)}`}
          labelWidth={210}
        />
      </ChartCard>

      <Card padded={false}>
        <div className="table-card-head">
          <SectionHeading title="Lane detail" description="Sorted by contribution." />
        </div>
        <DataTable
          columns={[
            { key: 'lane', label: 'Lane', render: (r) => <span className="font-medium text-silver-900">{r.lane}</span> },
            { key: 'entity', label: 'Entity', render: (r) => <Badge tone="neutral">{r.entity}</Badge> },
            { key: 'count', label: 'Loads', align: 'right' },
            { key: 'revenue', label: 'Revenue', align: 'right', render: (r) => money(r.revenue) },
            { key: 'cost', label: 'Cost', align: 'right', render: (r) => money(r.cost) },
            { key: 'profit', label: 'Gross profit', align: 'right', render: (r) => money(r.profit) },
            {
              key: 'margin',
              label: 'Margin',
              align: 'right',
              render: (r) => (
                <span className={r.margin >= 25 ? 'text-[#006300] font-semibold' : r.margin < 18 ? 'text-[#b07800] font-semibold' : ''}>
                  {r.margin.toFixed(1)}%
                </span>
              ),
            },
          ]}
          rows={lanes}
        />
      </Card>
    </div>
  );
};

/* ===== Intercompany ===== */

const Intercompany = () => {
  const rows = monthlyFinancials.map((m) => ({
    id: m.month,
    month: m.month,
    amount: m.intercompany,
    direction: 'Mauritius → Zimbabwe',
    basis: 'Agency and port handling recharge',
    pctOfGroup: (m.intercompany / (m.zwRevenue + m.muRevenue)) * 100,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-primary-50 border border-primary-200 text-primary-900">
        <Icons.Info size={18} className="mt-0.5 shrink-0" />
        <p className="text-sm">
          Intercompany billing is eliminated on consolidation so group revenue is not counted twice.
          Each entity still carries its own side of the transaction for statutory reporting.
        </p>
      </div>

      <ChartCard
        title="Intercompany recharges"
        subtitle="Monthly, eliminated at group"
        tableView={
          <DataTable
            dense
            columns={[
              { key: 'month', label: 'Month' },
              { key: 'amount', label: 'Amount', align: 'right', render: (r) => money(r.amount) },
            ]}
            rows={rows}
          />
        }
      >
        <LineChart
          labels={rows.map((r) => r.month)}
          series={[{ name: 'Intercompany', color: SERIES[2], values: rows.map((r) => r.amount) }]}
          formatValue={(v) => `${Math.round(v / 1000)}k`}
          areaFill
        />
      </ChartCard>

      <Card padded={false}>
        <div className="table-card-head">
          <SectionHeading title="Transaction detail" />
        </div>
        <DataTable
          columns={[
            { key: 'month', label: 'Period', render: (r) => <span className="font-medium">{r.month} 2026</span> },
            { key: 'direction', label: 'Direction' },
            { key: 'basis', label: 'Basis' },
            { key: 'pctOfGroup', label: '% of gross', align: 'right', render: (r) => `${r.pctOfGroup.toFixed(1)}%` },
            { key: 'amount', label: 'Amount', align: 'right', render: (r) => money(r.amount) },
          ]}
          rows={rows}
        />
      </Card>
    </div>
  );
};

/* ===== Currency ===== */

const Currency = () => (
  <div className="grid lg:grid-cols-2 gap-6">
    <Card>
      <SectionHeading title="Exchange rates" description="Against the group reporting currency, USD." />
      <div className="space-y-3">
        {fxRates.map((rate) => (
          <div key={rate.pair} className="flex items-center justify-between gap-4 p-4 rounded-xl border border-silver-200">
            <div>
              <p className="font-display font-semibold text-silver-900">{rate.pair}</p>
              <p className="text-xs text-silver-400 mt-0.5">
                {rate.change > 0 ? 'Strengthened' : 'Weakened'} over 30 days
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Sparkline
                values={Array.from({ length: 12 }, (_, i) => rate.rate * (1 + (rate.change / 100) * (i / 12)))}
                color={rate.change >= 0 ? SERIES[2] : SERIES[1]}
              />
              <div className="text-right">
                <p className="font-display font-bold text-silver-900 tabular-nums">{rate.rate.toFixed(2)}</p>
                <p
                  className={`text-xs font-semibold tabular-nums ${
                    rate.change > 0 ? 'text-[#006300]' : rate.change < 0 ? 'text-[#d03b3b]' : 'text-silver-400'
                  }`}
                >
                  {rate.change > 0 ? '▲' : '▼'} {Math.abs(rate.change)}%
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>

    <Card>
      <SectionHeading
        title="Exposure"
        description="Where a rate move actually costs the group money."
      />
      <div className="space-y-4">
        {[
          {
            title: 'ZWG receivables',
            detail: 'Zimbabwe customers invoiced locally while costs settle in USD.',
            exposure: 186000,
            risk: 'High',
            tone: 'critical',
          },
          {
            title: 'MUR operating costs',
            detail: 'Mauritius payroll and warehousing in rupees against USD revenue.',
            exposure: 94000,
            risk: 'Medium',
            tone: 'warning',
          },
          {
            title: 'ZAR port charges',
            detail: 'Durban handling and demurrage billed in rand.',
            exposure: 62000,
            risk: 'Medium',
            tone: 'warning',
          },
          {
            title: 'EUR freight receipts',
            detail: 'European consignees settling in euro.',
            exposure: 28000,
            risk: 'Low',
            tone: 'good',
          },
        ].map((item) => (
          <div key={item.title} className="p-4 rounded-xl border border-silver-200">
            <div className="flex items-start justify-between gap-3 mb-1.5">
              <p className="font-medium text-silver-900">{item.title}</p>
              <Badge tone={item.tone}>{item.risk} risk</Badge>
            </div>
            <p className="text-sm text-silver-500">{item.detail}</p>
            <p className="text-lg font-display font-bold text-silver-900 tabular-nums mt-2">
              {money(item.exposure)}
            </p>
          </div>
        ))}
      </div>
    </Card>
  </div>
);

/* ===== Shared customers ===== */

const SharedCustomers = ({ customers, shipments }) => {
  const rows = customers.map((customer) => {
    const theirs = shipments.filter((s) => s.customerId === customer.id);
    const revenue = theirs.reduce((sum, s) => sum + s.revenue, 0);
    const cost = theirs.reduce((sum, s) => sum + s.cost, 0);
    const entities = [...new Set(theirs.map((s) => s.entity))];
    return {
      ...customer,
      loads: theirs.length,
      revenue,
      profit: revenue - cost,
      entities,
      utilisation: customer.creditLimit ? (revenue / customer.creditLimit) * 100 : 0,
    };
  });

  return (
    <Card padded={false}>
      <div className="table-card-head">
        <SectionHeading
          title="Shared customer record"
          description="One customer master across both entities — a Zimbabwe shipper billed in Mauritius is the same account."
        />
      </div>
      <DataTable
        columns={[
          { key: 'name', label: 'Customer', render: (r) => <span className="font-medium text-silver-900">{r.name}</span> },
          { key: 'bcNo', label: 'BC account', mono: true },
          {
            key: 'entities',
            label: 'Trades with',
            render: (r) => (
              <span className="flex gap-1.5 flex-wrap">
                {(r.entities.length ? r.entities : [r.entity]).map((e) => (
                  <Badge key={e} tone={e === 'Mauritius' ? 'violet' : 'info'}>
                    {e}
                  </Badge>
                ))}
              </span>
            ),
          },
          { key: 'loads', label: 'Loads', align: 'right' },
          { key: 'terms', label: 'Terms' },
          { key: 'creditLimit', label: 'Credit limit', align: 'right', render: (r) => money(r.creditLimit) },
          {
            key: 'utilisation',
            label: 'Utilised',
            align: 'right',
            render: (r) => (
              <span className={r.utilisation > 80 ? 'text-[#d03b3b] font-semibold' : ''}>
                {r.utilisation.toFixed(0)}%
              </span>
            ),
          },
          { key: 'profit', label: 'Gross profit', align: 'right', render: (r) => money(r.profit) },
        ]}
        rows={rows}
      />
    </Card>
  );
};

export default Group;
