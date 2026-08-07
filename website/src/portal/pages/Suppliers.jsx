import React, { useMemo, useState } from 'react';
import * as Icons from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '../auth/AuthContext';
import { useCollection } from '../hooks';
import * as db from '../data/db';
import { post } from '../data/api';
import { enqueue, BC_ENDPOINTS } from '../data/bcClient';
import { record, notify } from '../data/activity';

import {
  Badge, Button, Card, DataTable, Drawer, EmptyState, Field, Input, ProgressBar, Select,
  TextArea, SectionHeading, StatCard, Tabs, money, statusTone, dateLabel, timeLabel,
} from '../components/ui';
import { BarChart, ChartCard, SERIES } from '../components/charts';
import PhotoCapture from '../components/PhotoCapture';
import ModuleHeader from '../components/ModuleHeader';
import RecordLink, { RowActions } from '../components/RecordLink';

/* ===========================================================================
   Module 8 — Supplier & Contractor Portal
   One screen, two audiences. A rail operator or clearing agent signs in and
   sees only their own work; operations sees the whole board and issues it.
   =========================================================================== */

const SHIPMENT_STATUSES = [
  'Planned', 'In Transit', 'At Border', 'Awaiting Rail', 'On Water', 'Delivered', 'Delayed',
];

const Suppliers = () => {
  const { user } = useAuth();
  const isSupplier = user?.role === 'supplier';

  const suppliers = useCollection('suppliers');
  const jobs = useCollection('jobs');
  const shipments = useCollection('shipments');
  const invoices = useCollection('supplierInvoices');
  const rateRequests = useCollection('rateRequests');

  const [tab, setTab] = useState('jobs');

  // A supplier account is pinned to its own vendor record.
  const myJobs = useMemo(
    () => (isSupplier ? jobs.filter((j) => j.supplierId === user.supplierId) : jobs),
    [jobs, isSupplier, user]
  );
  const myInvoices = useMemo(
    () => (isSupplier ? invoices.filter((i) => i.supplierId === user.supplierId) : invoices),
    [invoices, isSupplier, user]
  );
  // A contractor only sees the rate requests they were actually invited to.
  const myRfqs = useMemo(
    () => (isSupplier ? rateRequests.filter((r) => r.invited?.includes(user.supplierId)) : rateRequests),
    [rateRequests, isSupplier, user]
  );

  const offered = myJobs.filter((j) => j.status === 'Offered');
  const awaitingPayment = myInvoices.filter((i) => i.status !== 'Paid');

  return (
    <div className="space-y-6 max-w-[1400px]">
      <ModuleHeader
        number={8}
        title={isSupplier ? 'Contractor Portal' : 'Supplier & Contractor Portal'}
        blurb={
          isSupplier
            ? 'Your work orders, documents, invoices and status updates — no email chain.'
            : 'Issue work orders to rail operators, transporters, warehouses and clearing agents, and see what they send back.'
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={isSupplier ? 'Offers awaiting you' : 'Offers out'}
          value={offered.length}
          icon={Icons.Inbox}
          tone={offered.length ? 'warning' : 'good'}
        />
        <StatCard
          label="Jobs in progress"
          value={myJobs.filter((j) => ['Accepted', 'In Progress'].includes(j.status)).length}
          icon={Icons.Activity}
        />
        <StatCard
          label="Invoices outstanding"
          value={money(awaitingPayment.reduce((sum, i) => sum + i.amount, 0))}
          icon={Icons.ReceiptText}
          deltaLabel={`${awaitingPayment.length} document${awaitingPayment.length === 1 ? '' : 's'}`}
        />
        <StatCard
          label={isSupplier ? 'Your rating' : 'Active contractors'}
          value={
            isSupplier
              ? (suppliers.find((s) => s.id === user.supplierId)?.rating ?? '—')
              : suppliers.length
          }
          icon={isSupplier ? Icons.Star : Icons.Handshake}
        />
      </div>

      <Tabs
        tabs={[
          { key: 'jobs', label: isSupplier ? 'My work orders' : 'Work orders', count: myJobs.length },
          { key: 'rfq', label: isSupplier ? 'Rate requests' : 'Rate requests', count: myRfqs.filter((r) => r.status === 'Open').length },
          { key: 'invoices', label: 'Invoices', count: myInvoices.length },
          ...(isSupplier ? [] : [{ key: 'directory', label: 'Contractor scorecard', count: suppliers.length }]),
          ...(isSupplier ? [] : [{ key: 'issue', label: 'Issue a work order' }]),
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'jobs' && (
        <JobBoard jobs={myJobs} suppliers={suppliers} shipments={shipments} isSupplier={isSupplier} />
      )}
      {tab === 'rfq' && (
        <RateRequests rfqs={myRfqs} suppliers={suppliers} isSupplier={isSupplier} user={user} />
      )}
      {tab === 'invoices' && (
        <Invoices invoices={myInvoices} jobs={myJobs} suppliers={suppliers} isSupplier={isSupplier} user={user} />
      )}
      {tab === 'directory' && <Directory suppliers={suppliers} jobs={jobs} />}
      {tab === 'issue' && <IssueOrder suppliers={suppliers} shipments={shipments} />}
    </div>
  );
};

/* ===== Work orders ===== */

const JobBoard = ({ jobs, suppliers, shipments, isSupplier }) => {
  const [open, setOpen] = useState(null);
  const [statusUpdate, setStatusUpdate] = useState('');
  const [note, setNote] = useState('');
  const [docs, setDocs] = useState([]);

  const supplierName = (id) => suppliers.find((s) => s.id === id)?.name || '—';

  const openJob = (job) => {
    setOpen(job);
    setStatusUpdate(shipments.find((s) => s.id === job.shipmentId)?.status || '');
    setNote('');
    setDocs([]);
  };

  const respond = async (job, accept) => {
    try {
      await post(`/api/jobs/${encodeURIComponent(job.id)}/respond`, { accept });
    } catch (err) {
      toast.error('That response was not recorded', { description: err.message });
      return;
    }
    await db.refresh('jobs');
    enqueue({
      entity: 'jobStatus',
      endpoint: BC_ENDPOINTS.jobStatus.replace('{no}', job.id),
      recordId: job.id,
      label: `${job.id} ${accept ? 'accepted' : 'declined'}`,
      payload: { orderNo: job.id, status: accept ? 'Accepted' : 'Declined' },
    });
    toast.success(accept ? `${job.id} accepted` : `${job.id} declined`, {
      description: accept ? 'Operations has been notified.' : 'The job has gone back to operations.',
    });
    setOpen(null);
  };

  // A contractor reports; operations decides. The note reaches operations
  // immediately, but it does not move the consignment on its own — that
  // judgement belongs to the people who answer to the customer for it.
  const pushUpdate = async () => {
    const body = note || (statusUpdate ? `Reporting status as ${statusUpdate}` : '');
    if (!body) {
      toast.error('Nothing to send', { description: 'Write a note or pick a status.' });
      return;
    }
    try {
      await post(`/api/jobs/${encodeURIComponent(open.id)}/update`, { note: body });
    } catch (err) {
      toast.error('Update not sent', { description: err.message });
      return;
    }
    await db.refresh('jobs');
    toast.success('Update sent', {
      description: 'Operations can see it now and will publish anything the customer needs.',
    });
    setOpen(null);
  };

  if (!jobs.length) {
    return (
      <Card>
        <EmptyState icon={Icons.ClipboardList} title="No work orders" description="Nothing has been issued yet." />
      </Card>
    );
  }

  return (
    <>
      <Card padded={false} className="mb-5">
        <div className="table-card-head">
          <SectionHeading
            title={isSupplier ? 'Your work orders' : 'Work orders'}
            description="Click a row to respond or post an update."
          />
        </div>
        <DataTable
          onRowClick={openJob}
          searchable
          searchKeys={['id', 'description', 'status']}
          filters={[
            { key: 'status', label: 'Status' },
            ...(isSupplier ? [] : [{ key: 'supplierId', label: 'Contractor', filterValue: (r) => supplierName(r.supplierId) }]),
          ]}
          pageSize={15}
          showTotals
          minWidth={860}
          initialSort={{ key: 'dueAt', dir: 'asc' }}
          columns={[
            { key: 'id', label: 'Work order', render: (r) => <RecordLink entity="jobs" id={r.id} className="tabular-nums" /> },
            ...(isSupplier
              ? []
              : [{
                  key: 'supplierId',
                  label: 'Contractor',
                  maxWidth: '14rem',
                  sortValue: (r) => supplierName(r.supplierId),
                  render: (r) => <RecordLink entity="suppliers" id={r.supplierId} />,
                }]),
            {
              key: 'shipmentId',
              label: 'Consignment',
              render: (r) => <RecordLink entity="shipments" id={r.shipmentId} />,
            },
            { key: 'description', label: 'Scope', maxWidth: '22rem' },
            { key: 'dueAt', label: 'Due', render: (r) => dateLabel(r.dueAt) },
            {
              key: 'value',
              label: 'Value',
              align: 'right',
              render: (r) => money(r.value, r.currency),
              total: (r) => r.value,
              totalRender: (sum) => money(sum),
            },
            { key: 'status', label: 'Status', render: (r) => <Badge tone={statusTone(r.status)}>{r.status}</Badge> },
            ...(isSupplier
              ? [{
                  key: 'act',
                  label: '',
                  align: 'right',
                  sortable: false,
                  render: (r) =>
                    r.status === 'Offered' ? (
                      <RowActions>
                        <Button size="xs" icon={Icons.Check} onClick={() => respond(r, true)}>Accept</Button>
                        <Button size="xs" variant="secondary" onClick={() => respond(r, false)}>Decline</Button>
                      </RowActions>
                    ) : null,
                }]
              : []),
          ]}
          rows={jobs}
          empty="No work orders"
          emptyDescription={isSupplier ? 'You will see offers here as we issue them.' : 'Issue one from the tab above.'}
        />
      </Card>


      <Drawer
        open={Boolean(open)}
        onClose={() => setOpen(null)}
        title={open?.id}
        subtitle={open ? supplierName(open.supplierId) : ''}
        footer={
          open?.status !== 'Offered' && (
            <Button className="w-full" icon={Icons.Send} onClick={pushUpdate}>
              Send update
            </Button>
          )
        }
      >
        {open && (
          <div className="space-y-5">
            <div className="p-4 rounded-xl bg-silver-50 border border-silver-200">
              <p className="text-sm text-silver-700">{open.description}</p>
              <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-silver-200">
                <div>
                  <p className="text-xs text-silver-400 uppercase tracking-wider">Value</p>
                  <p className="font-semibold text-silver-900 tabular-nums">{money(open.value, open.currency)}</p>
                </div>
                <div>
                  <p className="text-xs text-silver-400 uppercase tracking-wider">Issued</p>
                  <p className="text-sm text-silver-700">{dateLabel(open.issuedAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-silver-400 uppercase tracking-wider">Due</p>
                  <p className="text-sm text-silver-700">{dateLabel(open.dueAt)}</p>
                </div>
              </div>
            </div>

            {open.lastUpdate && (
              <div className="p-3.5 rounded-xl border border-silver-200">
                <p className="text-xs font-semibold uppercase tracking-wider text-silver-400 mb-1.5">
                  Last update
                </p>
                <p className="text-sm text-silver-700">{open.lastUpdate}</p>
                <p className="text-xs text-silver-400 mt-1">{timeLabel(open.lastUpdateAt)}</p>
              </div>
            )}

            {open.status === 'Offered' ? (
              <div className="flex gap-3">
                <Button className="flex-1" icon={Icons.Check} onClick={() => respond(open, true)}>
                  Accept this job
                </Button>
                <Button variant="secondary" onClick={() => respond(open, false)}>
                  Decline
                </Button>
              </div>
            ) : (
              <>
                <Field label="Update shipment status" hint="This is what operations and the customer see.">
                  <Select value={statusUpdate} onChange={(e) => setStatusUpdate(e.target.value)}>
                    <option value="">No change</option>
                    {SHIPMENT_STATUSES.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </Select>
                </Field>

                <Field label="Note">
                  <TextArea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Wagons allocated, cleared customs, held for inspection…"
                  />
                </Field>

                <Field label="Supporting documents" hint="Rail waybill, gate pass, weighbridge ticket.">
                  <PhotoCapture photos={docs} onChange={setDocs} label="Upload" />
                </Field>
              </>
            )}
          </div>
        )}
      </Drawer>
    </>
  );
};

/* ===== Invoices ===== */

const Invoices = ({ invoices, jobs, suppliers, isSupplier, user }) => {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ jobId: '', invoiceNumber: '', amount: '', notes: '' });
  const [docs, setDocs] = useState([]);

  const billable = jobs.filter((j) => ['Accepted', 'In Progress', 'Completed'].includes(j.status));

  const submit = (event) => {
    event.preventDefault();
    const record = db.insert('supplierInvoices', {
      supplierId: isSupplier ? user.supplierId : jobs.find((j) => j.id === form.jobId)?.supplierId,
      jobId: form.jobId,
      invoiceNumber: form.invoiceNumber,
      amount: Number(form.amount),
      currency: 'USD',
      status: 'Submitted',
      submittedAt: new Date().toISOString(),
      documents: docs,
      notes: form.notes,
      bcRef: null,
    });

    enqueue({
      entity: 'supplierInvoice',
      endpoint: BC_ENDPOINTS.supplierInvoice,
      recordId: record.id,
      label: `Invoice ${form.invoiceNumber}`,
      payload: {
        vendorNo: suppliers.find((s) => s.id === record.supplierId)?.bcNo,
        externalDocumentNo: form.invoiceNumber,
        amount: Number(form.amount),
        purchaseOrderNo: form.jobId,
      },
    });

    setForm({ jobId: '', invoiceNumber: '', amount: '', notes: '' });
    setDocs([]);
    setShowForm(false);
    toast.success('Invoice submitted', { description: 'Queued as a purchase invoice for Business Central.' });
  };

  const approve = (invoice) => {
    db.update('supplierInvoices', invoice.id, { status: 'Approved' });
    toast.success(`${invoice.invoiceNumber} approved for payment`);
  };

  return (
    <div className="space-y-6">
      <Card padded={false}>
        <div className="table-card-head">
          <SectionHeading
            title="Invoices"
            description={isSupplier ? 'What you have billed and where it stands.' : 'Submitted by contractors, awaiting approval.'}
            action={
              isSupplier && (
                <Button size="sm" icon={Icons.Plus} onClick={() => setShowForm((v) => !v)}>
                  {showForm ? 'Cancel' : 'Submit an invoice'}
                </Button>
              )
            }
          />
        </div>

        {showForm && (
          <form onSubmit={submit} className="px-5 md:px-6 pb-6 space-y-4 border-b border-silver-200">
            <div className="grid sm:grid-cols-3 gap-4">
              <Field label="Against work order" required>
                <Select
                  value={form.jobId}
                  onChange={(e) => setForm((f) => ({ ...f, jobId: e.target.value }))}
                  required
                >
                  <option value="">Select…</option>
                  {billable.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.id}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Your invoice number" required>
                <Input
                  value={form.invoiceNumber}
                  onChange={(e) => setForm((f) => ({ ...f, invoiceNumber: e.target.value }))}
                  placeholder="INV-0001"
                  required
                />
              </Field>
              <Field label="Amount (USD)" required>
                <Input
                  type="number"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  required
                />
              </Field>
            </div>
            <Field label="Notes">
              <TextArea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </Field>
            <Field label="Attach the invoice" hint="A photo or scan is fine.">
              <PhotoCapture photos={docs} onChange={setDocs} label="Attach" max={3} />
            </Field>
            <Button type="submit" icon={Icons.Send}>
              Submit invoice
            </Button>
          </form>
        )}

        <DataTable
          columns={[
            {
              key: 'invoiceNumber',
              label: 'Invoice',
              render: (r) => <span className="font-medium text-silver-900">{r.invoiceNumber}</span>,
            },
            ...(isSupplier
              ? []
              : [
                  {
                    key: 'supplier',
                    label: 'Contractor',
                    render: (r) => suppliers.find((s) => s.id === r.supplierId)?.name || '—',
                  },
                ]),
            { key: 'jobId', label: 'Work order', mono: true },
            { key: 'submittedAt', label: 'Submitted', render: (r) => dateLabel(r.submittedAt) },
            { key: 'bcRef', label: 'BC reference', render: (r) => r.bcRef || '—' },
            { key: 'amount', label: 'Amount', align: 'right', render: (r) => money(r.amount, r.currency) },
            { key: 'status', label: 'Status', render: (r) => <Badge tone={statusTone(r.status)}>{r.status}</Badge> },
            ...(isSupplier
              ? []
              : [
                  {
                    key: 'action',
                    label: '',
                    render: (r) =>
                      r.status === 'Submitted' ? (
                        <Button size="sm" variant="secondary" onClick={() => approve(r)}>
                          Approve
                        </Button>
                      ) : null,
                  },
                ]),
          ]}
          rows={invoices}
          empty="No invoices submitted."
        />
      </Card>
    </div>
  );
};

/* ===========================================================================
   Rate requests — put one lane out to several contractors and compare what
   comes back on price AND transit, not price alone.
   =========================================================================== */

const RateRequests = ({ rfqs, suppliers, isSupplier, user }) => {
  const [open, setOpen] = useState(null);
  const [bid, setBid] = useState({ amount: '', transitDays: '', note: '' });

  const supplierName = (id) => suppliers.find((s) => s.id === id)?.name || '—';

  const submitBid = (event) => {
    event.preventDefault();
    const existing = (open.responses || []).filter((r) => r.supplierId !== user.supplierId);
    db.update('rateRequests', open.id, {
      responses: [
        ...existing,
        {
          supplierId: user.supplierId,
          amount: Number(bid.amount),
          currency: 'USD',
          transitDays: Number(bid.transitDays),
          note: bid.note,
          respondedAt: new Date().toISOString(),
        },
      ],
    });
    record(user, 'rfq.respond', open.id, `${supplierName(user.supplierId)} quoted ${money(Number(bid.amount))} on ${open.id}`);
    notify({
      forRoles: ['ops'],
      severity: 'info',
      title: `Rate received on ${open.id}`,
      body: `${supplierName(user.supplierId)} quoted ${money(Number(bid.amount))} over ${bid.transitDays} days.`,
      link: '/portal/suppliers',
    });
    setBid({ amount: '', transitDays: '', note: '' });
    setOpen(null);
    toast.success('Rate submitted', { description: 'Operations can see it immediately.' });
  };

  const award = (rfq, response) => {
    db.update('rateRequests', rfq.id, { status: 'Awarded', awardedTo: response.supplierId });
    const job = db.insert('jobs', {
      shipmentId: null,
      supplierId: response.supplierId,
      description: `${rfq.lane} — ${rfq.weightTons}t (awarded from ${rfq.id})`,
      status: 'Offered',
      value: response.amount,
      currency: response.currency,
      issuedAt: new Date().toISOString().slice(0, 10),
      dueAt: rfq.neededBy,
    });
    record(user, 'rfq.award', rfq.id, `Awarded ${rfq.id} to ${supplierName(response.supplierId)} at ${money(response.amount)}`);
    toast.success(`${rfq.id} awarded`, {
      description: `${supplierName(response.supplierId)} — work order ${job.id} issued.`,
    });
    setOpen(null);
  };

  if (!rfqs.length) {
    return (
      <Card>
        <EmptyState
          icon={Icons.Gavel}
          title="No rate requests"
          description={isSupplier ? 'You will see requests here when we invite you to quote.' : 'Put a lane out to tender to compare contractors.'}
        />
      </Card>
    );
  }

  return (
    <>
      <div className="grid md:grid-cols-2 gap-5">
        {rfqs.map((rfq) => {
          const responses = rfq.responses || [];
          const best = responses.length ? responses.reduce((a, b) => (b.amount < a.amount ? b : a)) : null;
          const mine = isSupplier ? responses.find((r) => r.supplierId === user.supplierId) : null;

          return (
            <Card key={rfq.id} className="cursor-pointer card-hover" onClick={() => setOpen(rfq)}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="font-display font-bold text-silver-900 tabular-nums">{rfq.id}</p>
                  <p className="text-sm text-silver-600 mt-0.5">{rfq.lane}</p>
                </div>
                <Badge tone={rfq.status === 'Awarded' ? 'good' : 'warning'}>{rfq.status}</Badge>
              </div>

              <div className="grid grid-cols-3 gap-3 py-3 border-y border-silver-100">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-silver-400">Weight</p>
                  <p className="text-sm font-medium text-silver-800">{rfq.weightTons}t</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-silver-400">Needed by</p>
                  <p className="text-sm font-medium text-silver-800">{dateLabel(rfq.neededBy)}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-silver-400">Invited</p>
                  <p className="text-sm font-medium text-silver-800">{rfq.invited?.length || 0}</p>
                </div>
              </div>

              <div className="mt-3">
                {isSupplier ? (
                  mine ? (
                    <p className="text-sm text-silver-600">
                      You quoted{' '}
                      <span className="font-semibold text-silver-900">{money(mine.amount)}</span> over{' '}
                      {mine.transitDays} days.
                    </p>
                  ) : (
                    <p className="text-sm text-primary-600 font-medium">Awaiting your rate — tap to quote.</p>
                  )
                ) : (
                  <p className="text-sm text-silver-600">
                    {responses.length} of {rfq.invited?.length || 0} responded
                    {best && (
                      <>
                        {' · best '}
                        <span className="font-semibold text-silver-900">{money(best.amount)}</span>
                      </>
                    )}
                  </p>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <Drawer
        open={Boolean(open)}
        onClose={() => setOpen(null)}
        title={open?.id}
        subtitle={open?.lane}
        width="max-w-2xl"
      >
        {open && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Weight', value: `${open.weightTons}t` },
                { label: 'Mode', value: open.modeCode },
                { label: 'Needed by', value: dateLabel(open.neededBy) },
                { label: 'Status', value: open.status },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-[11px] uppercase tracking-wider text-silver-400">{item.label}</p>
                  <p className="text-sm font-medium text-silver-800 mt-0.5">{item.value}</p>
                </div>
              ))}
            </div>

            {isSupplier ? (
              open.status === 'Awarded' ? (
                <div className="p-4 rounded-xl bg-silver-50 border border-silver-200 text-sm text-silver-600">
                  This request has been awarded
                  {open.awardedTo === user.supplierId ? ' to you.' : ' elsewhere. Thank you for quoting.'}
                </div>
              ) : (
                <form onSubmit={submitBid} className="space-y-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-silver-400">
                    Submit your rate
                  </p>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field label="All-in rate (USD)" required>
                      <Input
                        type="number"
                        step="0.01"
                        value={bid.amount}
                        onChange={(e) => setBid((b) => ({ ...b, amount: e.target.value }))}
                        required
                      />
                    </Field>
                    <Field label="Transit (days)" required>
                      <Input
                        type="number"
                        min="1"
                        value={bid.transitDays}
                        onChange={(e) => setBid((b) => ({ ...b, transitDays: e.target.value }))}
                        required
                      />
                    </Field>
                  </div>
                  <Field label="Notes">
                    <TextArea
                      value={bid.note}
                      onChange={(e) => setBid((b) => ({ ...b, note: e.target.value }))}
                      placeholder="Equipment available, conditions, validity…"
                    />
                  </Field>
                  <Button type="submit" className="w-full" icon={Icons.Send}>
                    Submit rate
                  </Button>
                </form>
              )
            ) : (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-silver-400 mb-3">
                  Responses
                </p>
                {(open.responses || []).length === 0 ? (
                  <p className="text-sm text-silver-500">Nothing back yet.</p>
                ) : (
                  <div className="space-y-3">
                    {[...open.responses]
                      .sort((a, b) => a.amount - b.amount)
                      .map((response, i) => {
                        const fastest = Math.min(...open.responses.map((r) => r.transitDays));
                        return (
                          <div
                            key={response.supplierId}
                            className={`p-4 rounded-xl border ${
                              open.awardedTo === response.supplierId
                                ? 'border-emerald-300 bg-emerald-50/50'
                                : 'border-silver-200'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div>
                                <p className="font-medium text-silver-900">{supplierName(response.supplierId)}</p>
                                <p className="text-xs text-silver-400 mt-0.5">
                                  Responded {timeLabel(response.respondedAt)}
                                </p>
                              </div>
                              <div className="flex gap-1.5 flex-wrap justify-end">
                                {i === 0 && <Badge tone="good">Lowest</Badge>}
                                {response.transitDays === fastest && <Badge tone="info">Fastest</Badge>}
                                {open.awardedTo === response.supplierId && <Badge tone="good">Awarded</Badge>}
                              </div>
                            </div>
                            <div className="flex gap-6 text-sm">
                              <span>
                                <span className="text-silver-400">Rate </span>
                                <span className="font-semibold text-silver-900 tabular-nums">
                                  {money(response.amount)}
                                </span>
                              </span>
                              <span>
                                <span className="text-silver-400">Transit </span>
                                <span className="font-semibold text-silver-900 tabular-nums">
                                  {response.transitDays} days
                                </span>
                              </span>
                            </div>
                            {response.note && (
                              <p className="text-xs text-silver-500 mt-2 italic">“{response.note}”</p>
                            )}
                            {open.status !== 'Awarded' && (
                              <Button
                                size="sm"
                                className="mt-3"
                                icon={Icons.Award}
                                onClick={() => award(open, response)}
                              >
                                Award to this contractor
                              </Button>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Drawer>
    </>
  );
};

/* ===========================================================================
   Contractor scorecard — performance computed from what they actually did,
   not just the star rating somebody typed in.
   =========================================================================== */

const Directory = ({ suppliers, jobs }) => {
  const invoices = useCollection('supplierInvoices');
  const rfqs = useCollection('rateRequests');

  const scored = suppliers
    .map((supplier) => {
      const theirJobs = jobs.filter((j) => j.supplierId === supplier.id);
      const completed = theirJobs.filter((j) => j.status === 'Completed').length;
      const declined = theirJobs.filter((j) => j.status === 'Declined').length;
      const offered = theirJobs.filter((j) => ['Offered', 'Accepted', 'In Progress', 'Completed', 'Declined'].includes(j.status)).length;
      const acceptance = offered ? ((offered - declined) / offered) * 100 : null;

      const theirRfqs = rfqs.filter((r) => r.invited?.includes(supplier.id));
      const responded = theirRfqs.filter((r) => (r.responses || []).some((x) => x.supplierId === supplier.id)).length;
      const responseRate = theirRfqs.length ? (responded / theirRfqs.length) * 100 : null;
      const wins = rfqs.filter((r) => r.awardedTo === supplier.id).length;

      const spend = theirJobs.reduce((sum, j) => sum + j.value, 0);
      const billed = invoices.filter((i) => i.supplierId === supplier.id).reduce((sum, i) => sum + i.amount, 0);

      // Blend of what we can actually measure, falling back to the manual
      // rating where there is no history to go on.
      const measured = [acceptance, responseRate].filter((v) => v !== null);
      const performance = measured.length
        ? measured.reduce((a, b) => a + b, 0) / measured.length
        : supplier.rating * 20;

      return {
        ...supplier,
        theirJobs, completed, declined, acceptance, responseRate,
        wins, spend, billed, performance,
        band: performance >= 85 ? 'good' : performance >= 65 ? 'info' : performance >= 45 ? 'warning' : 'critical',
      };
    })
    .sort((a, b) => b.performance - a.performance);

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
        {scored.map((supplier) => (
          <Card key={supplier.id}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0">
                <p className="font-display font-semibold text-silver-900 truncate">{supplier.name}</p>
                <p className="text-sm text-silver-500">{supplier.type}</p>
              </div>
              <Badge tone="neutral">{supplier.entity}</Badge>
            </div>

            <div className="flex items-center gap-1 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <Icons.Star
                  key={star}
                  size={14}
                  className={star <= Math.round(supplier.rating) ? 'text-amber-400 fill-amber-400' : 'text-silver-200'}
                />
              ))}
              <span className="text-sm text-silver-600 ml-1.5 tabular-nums">{supplier.rating.toFixed(1)}</span>
              <Badge tone={supplier.band} className="ml-auto">
                {Math.round(supplier.performance)}% performance
              </Badge>
            </div>

            <div className="space-y-2.5 mb-4">
              {supplier.acceptance !== null && (
                <ProgressBar value={supplier.acceptance} label="Job acceptance" tone={supplier.acceptance >= 80 ? 'good' : 'warning'} />
              )}
              {supplier.responseRate !== null && (
                <ProgressBar value={supplier.responseRate} label="Quote response rate" tone={supplier.responseRate >= 70 ? 'good' : 'warning'} />
              )}
            </div>

            <div className="grid grid-cols-4 gap-2 pt-4 border-t border-silver-100 text-center">
              {[
                { value: supplier.theirJobs.length, label: 'Jobs' },
                { value: supplier.completed, label: 'Done' },
                { value: supplier.wins, label: 'Tenders' },
                { value: money(supplier.spend), label: 'Spend', small: true },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className={`font-display font-bold text-silver-900 tabular-nums ${stat.small ? 'text-xs' : 'text-lg'}`}>
                    {stat.value}
                  </p>
                  <p className="text-[11px] text-silver-400">{stat.label}</p>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <ChartCard
        title="Contractor spend"
        subtitle="Total value of work orders issued, by contractor"
        tableView={
          <DataTable
            dense
            columns={[
              { key: 'name', label: 'Contractor' },
              { key: 'spend', label: 'Spend', align: 'right', render: (r) => money(r.spend) },
              { key: 'performance', label: 'Performance', align: 'right', render: (r) => `${Math.round(r.performance)}%` },
            ]}
            rows={scored}
          />
        }
      >
        <BarChart
          data={scored
            .filter((s) => s.spend > 0)
            .map((s) => ({
              label: s.name.length > 26 ? `${s.name.slice(0, 25)}…` : s.name,
              value: Math.round(s.spend),
              color: SERIES[0],
              note: `${s.theirJobs.length} job(s) · ${Math.round(s.performance)}% performance`,
            }))}
          formatValue={(v) => money(v)}
          labelWidth={200}
        />
      </ChartCard>
    </div>
  );
};

/* ===== Issue a work order ===== */

const IssueOrder = ({ suppliers, shipments }) => {
  const [form, setForm] = useState({
    supplierId: '', shipmentId: '', description: '', value: '', dueAt: '',
  });

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = (event) => {
    event.preventDefault();
    const record = db.insert('jobs', {
      ...form,
      value: Number(form.value),
      currency: 'USD',
      status: 'Offered',
      issuedAt: new Date().toISOString().slice(0, 10),
    });

    enqueue({
      entity: 'jobStatus',
      endpoint: BC_ENDPOINTS.jobStatus.replace('{no}', record.id),
      recordId: record.id,
      label: `Work order ${record.id}`,
      payload: {
        vendorNo: suppliers.find((s) => s.id === form.supplierId)?.bcNo,
        description: form.description,
        amount: Number(form.value),
      },
    });

    setForm({ supplierId: '', shipmentId: '', description: '', value: '', dueAt: '' });
    toast.success(`Work order ${record.id} issued`, {
      description: 'The contractor sees it in their portal immediately.',
    });
  };

  return (
    <Card className="max-w-2xl">
      <SectionHeading title="Issue a work order" description="It appears in the contractor's portal the moment you send it." />
      <form onSubmit={submit} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Contractor" required>
            <Select value={form.supplierId} onChange={set('supplierId')} required>
              <option value="">Select…</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — {s.type}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Shipment">
            <Select value={form.shipmentId} onChange={set('shipmentId')}>
              <option value="">Not linked</option>
              {shipments.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id} — {s.destination}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Scope of work" required>
          <TextArea
            value={form.description}
            onChange={set('description')}
            placeholder="e.g. Rail haulage — Beira to Kwekwe, 28t fertiliser, 2 wagons"
            required
          />
        </Field>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Agreed value (USD)" required>
            <Input type="number" step="0.01" value={form.value} onChange={set('value')} required />
          </Field>
          <Field label="Due date" required>
            <Input type="date" value={form.dueAt} onChange={set('dueAt')} required />
          </Field>
        </div>

        <Button type="submit" size="lg" icon={Icons.Send}>
          Issue work order
        </Button>
      </form>
    </Card>
  );
};

export default Suppliers;
