import React, { useMemo, useState } from 'react';
import * as Icons from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '../../auth/AuthContext';
import { useCollection } from '../../hooks';

import {
  Badge, Button, Card, DataTable, Drawer, EmptyState, ProgressBar,
  SectionHeading, StatCard, money, statusTone, dateLabel,
} from '../../components/ui';
import { BarChart, ChartCard, SERIES, STATUS } from '../../components/charts';

/* ===========================================================================
   Customer billing — invoices, ageing and a statement of account.
   =========================================================================== */

const daysOverdue = (invoice) => {
  if (invoice.status === 'Paid') return 0;
  return Math.floor((Date.now() - new Date(invoice.dueAt)) / 86400000);
};

const ageingBucket = (days) => {
  if (days <= 0) return 'Current';
  if (days <= 30) return '1–30 days';
  if (days <= 60) return '31–60 days';
  if (days <= 90) return '61–90 days';
  return '90+ days';
};

const BUCKETS = ['Current', '1–30 days', '31–60 days', '61–90 days', '90+ days'];

const ClientBilling = () => {
  const { scope } = useAuth();
  const invoices = useCollection('invoices');
  const customers = useCollection('customers');
  const [open, setOpen] = useState(null);

  const customer = customers.find((c) => c.id === scope.customerId);

  const mine = useMemo(
    () =>
      invoices
        .filter((i) => i.customerId === scope.customerId)
        .map((i) => ({ ...i, balance: i.amount - i.paidAmount, overdueDays: daysOverdue(i) }))
        .sort((a, b) => new Date(b.issuedAt) - new Date(a.issuedAt)),
    [invoices, scope.customerId]
  );

  const outstanding = mine.filter((i) => i.balance > 0);
  const totalOutstanding = outstanding.reduce((sum, i) => sum + i.balance, 0);
  const overdue = outstanding.filter((i) => i.overdueDays > 0);
  const overdueValue = overdue.reduce((sum, i) => sum + i.balance, 0);
  const paidTotal = mine.reduce((sum, i) => sum + i.paidAmount, 0);

  // Derived straight from `mine` — keying this off the `outstanding` array
  // would rebuild it every render anyway, since that array is recreated above.
  const ageing = useMemo(() => {
    const totals = Object.fromEntries(BUCKETS.map((b) => [b, 0]));
    for (const invoice of mine) {
      if (invoice.balance > 0) totals[ageingBucket(invoice.overdueDays)] += invoice.balance;
    }
    return BUCKETS.map((bucket) => ({ bucket, amount: totals[bucket] })).filter((r) => r.amount > 0);
  }, [mine]);

  const creditUsed = customer?.creditLimit ? (totalOutstanding / customer.creditLimit) * 100 : 0;

  const downloadStatement = () => {
    const rows = [
      ['Invoice', 'Issued', 'Due', 'Amount', 'Paid', 'Balance', 'Status'],
      ...mine.map((i) => [i.id, i.issuedAt, i.dueAt, i.amount, i.paidAmount, i.balance, i.status]),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `silvergill-statement-${customer?.bcNo || 'account'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Statement downloaded');
  };

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-silver-900">
            Invoices & Statements
          </h1>
          <p className="text-silver-500 mt-1.5">
            {customer?.name} · account {customer?.bcNo} · {customer?.terms}
          </p>
        </div>
        <Button variant="secondary" icon={Icons.Download} onClick={downloadStatement}>
          Download statement
        </Button>
      </div>

      {overdue.length > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800">
          <Icons.AlertCircle size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-sm">
              {money(overdueValue)} is past its due date
            </p>
            <p className="text-sm mt-0.5">
              {overdue.map((i) => `${i.id} (${i.overdueDays} days)`).join(', ')}. Please contact
              accounts if this is in query.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Outstanding"
          value={money(totalOutstanding)}
          icon={Icons.ReceiptText}
          tone={overdueValue > 0 ? 'critical' : 'default'}
          deltaLabel={`${outstanding.length} open invoice${outstanding.length === 1 ? '' : 's'}`}
        />
        <StatCard
          label="Overdue"
          value={money(overdueValue)}
          icon={Icons.CalendarClock}
          tone={overdueValue > 0 ? 'critical' : 'good'}
          deltaLabel={overdue.length ? `${overdue.length} invoice(s)` : 'nothing past due'}
        />
        <StatCard label="Settled to date" value={money(paidTotal)} icon={Icons.CheckCheck} tone="good" />
        <StatCard
          label="Credit limit"
          value={money(customer?.creditLimit || 0)}
          icon={Icons.Landmark}
          deltaLabel={`${creditUsed.toFixed(0)}% utilised`}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <SectionHeading title="Credit position" />
          <ProgressBar
            value={creditUsed}
            label="Limit utilised"
            tone={creditUsed > 85 ? 'critical' : creditUsed > 65 ? 'warning' : 'good'}
          />
          <div className="mt-5 space-y-3">
            {[
              { label: 'Credit limit', value: customer?.creditLimit || 0 },
              { label: 'Currently outstanding', value: totalOutstanding },
              { label: 'Available to draw', value: Math.max(0, (customer?.creditLimit || 0) - totalOutstanding) },
            ].map((row) => (
              <div key={row.label} className="flex justify-between text-sm">
                <span className="text-silver-500">{row.label}</span>
                <span className="font-medium text-silver-900 tabular-nums">{money(row.value)}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-silver-400 mt-5 pt-4 border-t border-silver-200">
            Payment terms are {customer?.terms} from invoice date. Queries to{' '}
            <span className="text-silver-600">accounts@silvergill.com</span>.
          </p>
        </Card>

        <ChartCard
          className="lg:col-span-2"
          title="Ageing analysis"
          subtitle="Outstanding balance by how long it has been due"
          tableView={
            <DataTable
              dense
              columns={[
                { key: 'bucket', label: 'Bucket' },
                { key: 'amount', label: 'Balance', align: 'right', render: (r) => money(r.amount) },
              ]}
              rows={ageing.map((a) => ({ id: a.bucket, ...a }))}
            />
          }
        >
          {ageing.length === 0 ? (
            <EmptyState icon={Icons.CheckCheck} title="Nothing outstanding" description="Your account is fully settled." />
          ) : (
            <BarChart
              data={ageing.map((row) => ({
                label: row.bucket,
                value: Math.round(row.amount),
                color: row.bucket === 'Current' ? SERIES[0] : row.bucket === '1–30 days' ? STATUS.warning : STATUS.critical,
              }))}
              formatValue={(v) => money(v)}
              labelWidth={100}
            />
          )}
        </ChartCard>
      </div>

      <Card padded={false}>
        <div className="table-card-head">
          <SectionHeading title="All invoices" description="Tap one to see the charge breakdown." />
        </div>
        {mine.length === 0 ? (
          <EmptyState icon={Icons.ReceiptText} title="No invoices yet" />
        ) : (
          <DataTable
            onRowClick={setOpen}
            columns={[
              { key: 'id', label: 'Invoice', render: (r) => <span className="font-medium tabular-nums">{r.id}</span> },
              { key: 'shipmentId', label: 'Consignment', mono: true },
              { key: 'issuedAt', label: 'Issued', render: (r) => dateLabel(r.issuedAt) },
              {
                key: 'dueAt',
                label: 'Due',
                render: (r) => (
                  <span className={r.overdueDays > 0 ? 'text-[#d03b3b] font-medium' : ''}>
                    {dateLabel(r.dueAt)}
                    {r.overdueDays > 0 && <span className="text-xs ml-1.5">({r.overdueDays}d)</span>}
                  </span>
                ),
              },
              { key: 'amount', label: 'Amount', align: 'right', render: (r) => money(r.amount) },
              { key: 'balance', label: 'Balance', align: 'right', render: (r) => money(r.balance) },
              { key: 'status', label: 'Status', render: (r) => <Badge tone={statusTone(r.status)}>{r.status}</Badge> },
            ]}
            rows={mine}
          />
        )}
      </Card>

      <Drawer
        open={Boolean(open)}
        onClose={() => setOpen(null)}
        title={open?.id}
        subtitle={open ? `Consignment ${open.shipmentId}` : ''}
      >
        {open && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Issued', value: dateLabel(open.issuedAt) },
                { label: 'Due', value: dateLabel(open.dueAt) },
                { label: 'BC document', value: open.bcNo },
                { label: 'Entity', value: open.entity },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-[11px] uppercase tracking-wider text-silver-400">{item.label}</p>
                  <p className="text-sm font-medium text-silver-800 mt-0.5">{item.value}</p>
                </div>
              ))}
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-silver-400 mb-3">Charges</p>
              <div className="space-y-2.5">
                {open.lines.map((line) => (
                  <div key={line.description} className="flex justify-between gap-4 text-sm">
                    <span className="text-silver-600">{line.description}</span>
                    <span className="font-medium text-silver-900 tabular-nums shrink-0">{money(line.amount)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-silver-200 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-silver-600">Invoice total</span>
                  <span className="font-semibold text-silver-900 tabular-nums">{money(open.amount)}</span>
                </div>
                {open.paidAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-silver-600">Received</span>
                    <span className="font-medium text-[#006300] tabular-nums">−{money(open.paidAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base pt-2 border-t border-silver-200">
                  <span className="font-semibold text-silver-900">Balance due</span>
                  <span className="font-bold text-silver-900 tabular-nums">{money(open.balance)}</span>
                </div>
              </div>
            </div>

            {open.balance > 0 && (
              <div className="p-4 rounded-xl bg-silver-50 border border-silver-200">
                <p className="text-xs font-semibold uppercase tracking-wider text-silver-400 mb-2">
                  Remittance
                </p>
                <p className="text-sm text-silver-600">
                  Please quote <span className="font-medium text-silver-900">{open.id}</span> on your
                  payment. Banking details are on the invoice PDF.
                </p>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default ClientBilling;
