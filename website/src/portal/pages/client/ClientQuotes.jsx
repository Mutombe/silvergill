import React, { useMemo, useState } from 'react';
import * as Icons from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '../../auth/AuthContext';
import { useCollection } from '../../hooks';
import * as db from '../../data/db';
import { post } from '../../data/api';
import { record, notify } from '../../data/activity';
import { priceQuotation, transitWindow, origins } from '../../engine/pricing';
import { commodities, ports, transportModes } from '../../data/seed';

import {
  Badge, Button, Card, DataTable, Drawer, EmptyState, Field, Input, Select,
  TextArea, SectionHeading, Tabs, money, statusTone, dateLabel, num,
} from '../../components/ui';

/* ===========================================================================
   Customer quotations and bookings.
   Read-only on price — the customer accepts or declines what sales issued, and
   can raise a booking request that lands in the operations queue.
   =========================================================================== */

const ClientQuotes = () => {
  const { user, scope } = useAuth();
  const quotations = useCollection('quotations');
  const bookings = useCollection('bookings');

  const [tab, setTab] = useState('quotes');

  const myQuotes = useMemo(
    () => quotations.filter((q) => q.customerId === scope.customerId),
    [quotations, scope.customerId]
  );
  const myBookings = useMemo(
    () => bookings.filter((b) => b.customerId === scope.customerId),
    [bookings, scope.customerId]
  );

  const awaiting = myQuotes.filter((q) => q.status === 'Sent');

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold text-silver-900">
          Quotations & Bookings
        </h1>
        <p className="text-silver-500 mt-1.5 max-w-2xl">
          Review what we have quoted, accept it, and book your next movement.
        </p>
      </div>

      <Tabs
        tabs={[
          { key: 'quotes', label: 'Quotations', count: myQuotes.length },
          { key: 'bookings', label: 'Bookings', count: myBookings.length },
          { key: 'new', label: 'Request a booking' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'quotes' && <QuoteList quotes={myQuotes} awaiting={awaiting} user={user} />}
      {tab === 'bookings' && <BookingList bookings={myBookings} />}
      {tab === 'new' && <BookingForm user={user} scope={scope} onDone={() => setTab('bookings')} />}
    </div>
  );
};

/* ===== Quotations ===== */

const QuoteList = ({ quotes, awaiting, user }) => {
  const [open, setOpen] = useState(null);

  // Accepting a quotation is a commercial commitment, so it is recorded by the
  // server against the account that made it — not by a status flag the browser
  // sets on a row it happens to be holding.
  const respond = async (quote, accept) => {
    try {
      await post(`/api/quotations/${encodeURIComponent(quote.id)}/respond`, { accept });
    } catch (err) {
      toast.error('That response was not recorded', { description: err.message });
      return;
    }
    await db.refresh('quotations');
    notify({
      forRoles: ['sales', 'management'],
      severity: accept ? 'info' : 'warning',
      title: `Quotation ${quote.id} ${accept ? 'accepted' : 'declined'}`,
      body: `${user.title} responded — ${money(quote.total)}.`,
      link: '/portal/quotations',
    });
    toast.success(accept ? 'Quotation accepted' : 'Quotation declined', {
      description: accept ? 'Our team will confirm the booking shortly.' : 'Thank you for letting us know.',
    });
    setOpen(null);
  };

  if (!quotes.length) {
    return (
      <Card>
        <EmptyState
          icon={Icons.FileSignature}
          title="No quotations yet"
          description="Raise a booking request and our commercial team will price it for you."
        />
      </Card>
    );
  }

  return (
    <>
      {awaiting.length > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-primary-50 border border-primary-200 text-primary-900 mb-6">
          <Icons.Clock size={18} className="mt-0.5 shrink-0" />
          <p className="text-sm">
            <span className="font-semibold">
              {awaiting.length} quotation{awaiting.length === 1 ? '' : 's'} awaiting your response.
            </span>{' '}
            Rates are held for 14 days from issue.
          </p>
        </div>
      )}

      <Card padded={false}>
        <DataTable
          onRowClick={setOpen}
          columns={[
            { key: 'id', label: 'Quotation', render: (r) => <span className="font-medium tabular-nums">{r.id}</span> },
            {
              key: 'lane',
              label: 'Lane',
              render: (r) => <span className="text-xs text-silver-500">{r.origin} → {r.destination}</span>,
            },
            { key: 'weightTons', label: 'Tonnes', align: 'right' },
            { key: 'createdAt', label: 'Issued', render: (r) => dateLabel(r.createdAt) },
            { key: 'total', label: 'Price', align: 'right', render: (r) => money(r.total) },
            { key: 'status', label: 'Status', render: (r) => <Badge tone={statusTone(r.status)}>{r.status}</Badge> },
            { key: 'action', label: '', render: () => <Icons.ChevronRight size={16} className="text-silver-300" /> },
          ]}
          rows={quotes}
        />
      </Card>

      <Drawer
        open={Boolean(open)}
        onClose={() => setOpen(null)}
        title={open?.id}
        subtitle={open ? `${open.origin} → ${open.destination}` : ''}
        footer={
          open?.status === 'Sent' && (
            <div className="flex gap-3">
              <Button className="flex-1" icon={Icons.Check} onClick={() => respond(open, true)}>
                Accept quotation
              </Button>
              <Button variant="secondary" onClick={() => respond(open, false)}>
                Decline
              </Button>
            </div>
          )
        }
      >
        {open && (
          <div className="space-y-6">
            <div className="p-5 rounded-2xl bg-gradient-to-br from-silver-900 to-primary-900 text-white">
              <p className="text-xs uppercase tracking-widest text-white/50 mb-2">All-inclusive price</p>
              <p className="text-4xl font-display font-bold tabular-nums">{money(open.total)}</p>
              <p className="text-white/60 text-sm mt-2 tabular-nums">
                {money(open.total / open.weightTons)} per tonne · {open.weightTons}t
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Commodity', value: commodities.find((c) => c.code === open.commodity)?.name },
                { label: 'Transport mode', value: transportModes.find((m) => m.code === open.mode)?.name },
                { label: 'Issued', value: dateLabel(open.createdAt) },
                { label: 'Insurance', value: open.insurance ? `Included — ${money(open.insuredValue)} declared` : 'Not included' },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-[11px] uppercase tracking-wider text-silver-400">{item.label}</p>
                  <p className="text-sm font-medium text-silver-800 mt-0.5">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-xl bg-silver-50 border border-silver-200">
              <p className="text-xs font-semibold uppercase tracking-wider text-silver-400 mb-2">
                What is included
              </p>
              <ul className="text-sm text-silver-600 space-y-1.5">
                <li className="flex gap-2"><Icons.Check size={14} className="text-emerald-600 mt-0.5 shrink-0" /> Line haul and fuel</li>
                <li className="flex gap-2"><Icons.Check size={14} className="text-emerald-600 mt-0.5 shrink-0" /> Customs clearance and border fees</li>
                <li className="flex gap-2"><Icons.Check size={14} className="text-emerald-600 mt-0.5 shrink-0" /> Port handling and documentation</li>
                {open.insurance && (
                  <li className="flex gap-2"><Icons.Check size={14} className="text-emerald-600 mt-0.5 shrink-0" /> Goods-in-transit cover</li>
                )}
              </ul>
            </div>

            {open.status !== 'Sent' && (
              <p className="text-sm text-silver-500">
                This quotation is marked <span className="font-medium text-silver-800">{open.status}</span>
                {open.respondedAt ? ` — responded ${dateLabel(open.respondedAt)}.` : '.'}
              </p>
            )}
          </div>
        )}
      </Drawer>
    </>
  );
};

/* ===== Bookings ===== */

const BookingList = ({ bookings }) => {
  if (!bookings.length) {
    return (
      <Card>
        <EmptyState icon={Icons.CalendarPlus} title="No bookings raised" description="Use the tab above to request one." />
      </Card>
    );
  }

  return (
    <Card padded={false}>
      <DataTable
        columns={[
          { key: 'id', label: 'Booking', render: (r) => <span className="font-medium tabular-nums">{r.id}</span> },
          { key: 'reference', label: 'Your reference' },
          {
            key: 'commodity',
            label: 'Commodity',
            render: (r) => commodities.find((c) => c.code === r.commodity)?.name || r.commodity,
          },
          { key: 'weightTons', label: 'Tonnes', align: 'right' },
          { key: 'readyDate', label: 'Ready', render: (r) => dateLabel(r.readyDate) },
          {
            key: 'shipmentId',
            label: 'Consignment',
            render: (r) =>
              r.shipmentId ? (
                <span className="tabular-nums text-silver-700">{r.shipmentId}</span>
              ) : (
                <span className="text-silver-400">Not yet allocated</span>
              ),
          },
          { key: 'status', label: 'Status', render: (r) => <Badge tone={statusTone(r.status)}>{r.status}</Badge> },
        ]}
        rows={bookings}
      />
    </Card>
  );
};

/* ===== New booking ===== */

const BookingForm = ({ user, scope, onDone }) => {
  const [form, setForm] = useState({
    commodity: 'CHR',
    weightTons: 30,
    originCode: 'NGZ',
    portCode: 'BEW',
    modeCode: 'ROAD',
    readyDate: '',
    reference: '',
    notes: '',
  });

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  // Customers see an indicative price immediately — the same engine sales uses,
  // shown as a guide so the number cannot be mistaken for a firm quotation.
  const estimate = useMemo(
    () =>
      priceQuotation({
        originCode: form.originCode,
        portCode: form.portCode,
        commodityCode: form.commodity,
        weightTons: Number(form.weightTons),
        modeCode: form.modeCode,
        insurance: false,
      }),
    [form]
  );

  const submit = (event) => {
    event.preventDefault();
    const booking = db.insert('bookings', {
      customerId: scope.customerId,
      commodity: form.commodity,
      weightTons: Number(form.weightTons),
      originCode: form.originCode,
      portCode: form.portCode,
      modeCode: form.modeCode,
      readyDate: form.readyDate,
      reference: form.reference,
      notes: form.notes,
      status: 'Requested',
      raisedBy: user.id,
      raisedAt: new Date().toISOString(),
      shipmentId: null,
    });

    record(user, 'booking.create', booking.id, `${user.name} requested booking ${booking.id}`);
    notify({
      forRoles: ['ops', 'sales'],
      severity: 'info',
      title: `New booking request ${booking.id}`,
      body: `${form.weightTons}t ${commodities.find((c) => c.code === form.commodity)?.name}, ready ${form.readyDate}.`,
      link: '/portal',
    });

    toast.success(`Booking ${booking.id} requested`, {
      description: 'Our operations team will confirm within one working day.',
    });
    onDone();
  };

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      <Card className="lg:col-span-3">
        <SectionHeading title="Request a booking" description="Tell us what is moving and when it is ready." />
        <form onSubmit={submit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Commodity" required>
              <Select value={form.commodity} onChange={set('commodity')}>
                {commodities.map((c) => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Weight (tonnes)" required>
              <Input type="number" min="1" step="0.5" value={form.weightTons} onChange={set('weightTons')} required />
            </Field>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Collection point" required>
              <Select value={form.originCode} onChange={set('originCode')}>
                {origins.map((o) => (
                  <option key={o.code} value={o.code}>{o.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Destination" required>
              <Select value={form.portCode} onChange={set('portCode')}>
                {ports.map((p) => (
                  <option key={p.code} value={p.code}>{p.name}, {p.country}</option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Preferred mode" required>
              <Select value={form.modeCode} onChange={set('modeCode')}>
                {transportModes.map((m) => (
                  <option key={m.code} value={m.code}>{m.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Cargo ready date" required>
              <Input type="date" value={form.readyDate} onChange={set('readyDate')} required />
            </Field>
          </div>

          <Field label="Your reference" hint="Purchase order or internal job number.">
            <Input value={form.reference} onChange={set('reference')} placeholder="e.g. PO-88412" />
          </Field>

          <Field label="Anything we should know?">
            <TextArea
              value={form.notes}
              onChange={set('notes')}
              placeholder="Loading restrictions, site contact, special handling…"
            />
          </Field>

          <Button type="submit" size="lg" className="w-full" icon={Icons.Send}>
            Submit booking request
          </Button>
        </form>
      </Card>

      <div className="lg:col-span-2">
        <Card className="sticky top-24">
          <SectionHeading title="Indicative price" description="A guide only — we will confirm in writing." />
          {!estimate ? (
            <p className="text-sm text-silver-500">Complete the form to see an estimate.</p>
          ) : (
            <>
              <p className="text-3xl font-display font-bold text-silver-900 tabular-nums">
                {money(estimate.sellPrice)}
              </p>
              <p className="text-sm text-silver-500 mt-1 tabular-nums">
                {money(estimate.ratePerTon)} per tonne · {num(estimate.inputs.distanceKm)} km
              </p>

              <div className="grid grid-cols-2 gap-4 mt-5 pt-5 border-t border-silver-200">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-silver-400">Transit</p>
                  <p className="text-lg font-display font-semibold text-silver-900">
                    {transitWindow(estimate.transit.totalDays)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-silver-400">Via</p>
                  <p className="text-sm font-medium text-silver-800 mt-1">
                    {estimate.inputs.border ? `${estimate.inputs.border.name}, ` : ''}
                    {estimate.inputs.port.name}
                  </p>
                </div>
              </div>

              <div className="mt-5 pt-5 border-t border-silver-200">
                <p className="text-xs font-semibold uppercase tracking-wider text-silver-400 mb-2.5">
                  Documents you will need
                </p>
                <ul className="space-y-1.5">
                  {estimate.documents.filter((d) => d.mandatory).slice(0, 6).map((doc) => (
                    <li key={doc.name} className="text-sm text-silver-600 flex gap-2">
                      <Icons.FileText size={13} className="text-silver-400 mt-0.5 shrink-0" />
                      <span>
                        {doc.name}
                        <span className="text-silver-400 text-xs"> · {doc.who}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <p className="text-xs text-silver-400 mt-5">
                Excludes demurrage, detention and any duty payable. Firm rates are issued as a
                formal quotation.
              </p>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ClientQuotes;
