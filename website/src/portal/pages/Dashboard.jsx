import React from 'react';
import { Link } from 'react-router-dom';
import * as Icons from 'lucide-react';

import { useAuth } from '../auth/AuthContext';
import { modulesForRole } from '../modules';
import { useCollection, usePendingSync } from '../hooks';
import { Badge, Card, DataTable, SectionHeading, StatCard, money, statusTone, dateLabel } from '../components/ui';
import { ChartCard, ColumnChart, SERIES } from '../components/charts';
import { monthlyFinancials } from '../data/seed';

const Dashboard = () => {
  const { user, roleLabel } = useAuth();
  const shipments = useCollection('shipments');
  const customers = useCollection('customers');
  const incidents = useCollection('incidents');
  const pending = usePendingSync();

  const items = modulesForRole(user?.role).filter((m) => m.key !== 'dashboard');

  const active = shipments.filter((s) => !['Delivered', 'Cancelled'].includes(s.status));
  const revenue = shipments.reduce((sum, s) => sum + s.revenue, 0);
  const cost = shipments.reduce((sum, s) => sum + s.cost, 0);
  const margin = revenue ? ((revenue - cost) / revenue) * 100 : 0;
  const openIncidents = incidents.filter((i) => i.status === 'Open');

  const customerName = (id) => customers.find((c) => c.id === id)?.name || '—';

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* ===== Greeting ===== */}
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold text-silver-900">
          {greeting}, {user?.name?.split(' ')[0]}
        </h1>
        <p className="text-silver-500 mt-1">
          {roleLabel} · {user?.entity}
          {pending > 0 && (
            <>
              {' · '}
              <span className="text-amber-700 font-medium">
                {pending} record{pending === 1 ? '' : 's'} waiting to post
              </span>
            </>
          )}
        </p>
      </div>

      {/* ===== Headline numbers ===== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active shipments"
          value={active.length}
          icon={Icons.Ship}
          deltaLabel={`${shipments.length} on the books`}
        />
        <StatCard
          label="Booked revenue"
          value={money(revenue)}
          icon={Icons.Banknote}
          delta={8.4}
          deltaLabel="vs last month"
        />
        <StatCard
          label="Gross margin"
          value={`${margin.toFixed(1)}%`}
          icon={Icons.TrendingUp}
          tone={margin > 25 ? 'good' : margin > 18 ? 'default' : 'warning'}
          deltaLabel="across all live jobs"
        />
        <StatCard
          label="Open incidents"
          value={openIncidents.length}
          icon={Icons.TriangleAlert}
          tone={openIncidents.length ? 'warning' : 'good'}
          deltaLabel={openIncidents.length ? 'needs attention' : 'nothing outstanding'}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* ===== Revenue by entity ===== */}
        <ChartCard
          className="lg:col-span-2"
          title="Revenue by entity"
          subtitle="Zimbabwe and Mauritius on one scale, last six months"
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
              ]}
              rows={monthlyFinancials.map((m) => ({ id: m.month, ...m }))}
            />
          }
        >
          <ColumnChart
            labels={monthlyFinancials.map((m) => m.month)}
            series={[
              { name: 'Zimbabwe', values: monthlyFinancials.map((m) => m.zwRevenue), color: SERIES[0] },
              { name: 'Mauritius', values: monthlyFinancials.map((m) => m.muRevenue), color: SERIES[1] },
            ]}
            formatValue={(v) => `${Math.round(v / 1000)}k`}
          />
        </ChartCard>

        {/* ===== Your modules ===== */}
        <Card>
          <SectionHeading title="Your modules" description="What your role can open." />
          <div className="space-y-2">
            {items.map((item) => {
              const Icon = Icons[item.icon] || Icons.Circle;
              return (
                <Link
                  key={item.key}
                  to={item.path}
                  className="flex items-start gap-3 p-3 rounded-xl border border-silver-200 hover:border-primary-300 hover:bg-primary-50/30 transition-all group"
                >
                  <span className="w-9 h-9 rounded-lg bg-silver-100 group-hover:bg-primary-100 flex items-center justify-center shrink-0 transition-colors">
                    <Icon size={16} className="text-silver-500 group-hover:text-primary-600" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-silver-800">{item.short}</span>
                    <span className="block text-xs text-silver-500 mt-0.5 line-clamp-2">{item.blurb}</span>
                  </span>
                  <Icons.ChevronRight size={16} className="text-silver-300 shrink-0 mt-2" />
                </Link>
              );
            })}
          </div>
        </Card>
      </div>

      {/* ===== Live shipments ===== */}
      <Card padded={false}>
        <div className="table-card-head">
          <SectionHeading
            title="Live shipments"
            description="Everything currently moving or awaiting dispatch."
          />
        </div>
        <DataTable
          columns={[
            {
              key: 'id',
              label: 'Reference',
              render: (r) => (
                <span className="font-medium text-silver-900 tabular-nums">{r.id}</span>
              ),
            },
            { key: 'customer', label: 'Customer', render: (r) => customerName(r.customerId) },
            {
              key: 'route',
              label: 'Route',
              render: (r) => (
                <span className="text-xs text-silver-500">
                  {r.origin} <Icons.ArrowRight size={11} className="inline mx-1" /> {r.destination}
                </span>
              ),
            },
            { key: 'entity', label: 'Entity' },
            { key: 'eta', label: 'ETA', render: (r) => dateLabel(r.etaAt) },
            {
              key: 'status',
              label: 'Status',
              render: (r) => <Badge tone={statusTone(r.status)}>{r.status}</Badge>,
            },
            { key: 'revenue', label: 'Value', align: 'right', render: (r) => money(r.revenue) },
          ]}
          rows={shipments}
          empty="No shipments on the books."
        />
      </Card>
    </div>
  );
};

export default Dashboard;
