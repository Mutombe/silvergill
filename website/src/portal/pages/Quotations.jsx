import React, { useMemo, useState } from 'react';
import * as Icons from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '../auth/AuthContext';
import { useCollection } from '../hooks';
import * as db from '../data/db';
import { enqueue, BC_ENDPOINTS } from '../data/bcClient';
import { priceQuotation, transitWindow, origins, compareModes, marginVerdict } from '../engine/pricing';
import { record, notify } from '../data/activity';
import { commodities, ports, transportModes } from '../data/seed';

import {
  Badge, Button, Card, DataTable, Field, Input, Select, SectionHeading,
  Tabs, Toggle, money, num,
} from '../components/ui';
import { BarChart, SERIES } from '../components/charts';
import ModuleHeader from '../components/ModuleHeader';
import { RELATED_COLUMNS } from '../components/recordColumns';
import { recordPath } from '../entities';

/* ===========================================================================
   Module 5 — Customer Quotation Engine
   Sales enters seven fields; everything to the right recalculates on the spot.
   The internal cost breakdown and margin are visible to sales but marked so
   they never end up in front of the customer by accident.
   =========================================================================== */

const Quotations = () => {
  const { user } = useAuth();
  const customers = useCollection('customers');
  const quotations = useCollection('quotations');

  const [form, setForm] = useState({
    customerId: '',
    commodityCode: 'CHR',
    originCode: 'NGZ',
    portCode: 'BEW',
    weightTons: 30,
    modeCode: 'ROAD',
    insurance: true,
    insuredValue: 500000,
  });

  const [showInternal, setShowInternal] = useState(true);

  const set = (key) => (event) => {
    const value = event?.target?.type === 'number' ? event.target.value : event?.target?.value ?? event;
    setForm((f) => ({ ...f, [key]: value }));
  };

  const [tab, setTab] = useState('price');
  const quote = useMemo(() => priceQuotation(form), [form]);
  const alternatives = useMemo(() => compareModes(form), [form]);
  const customer = customers.find((c) => c.id === form.customerId);
  const verdict = quote ? marginVerdict(quote.marginPct, form.modeCode) : null;

  /** `send` issues the quote straight to the customer's portal. */
  const save = (send = false) => {
    if (!form.customerId) {
      toast.error('Choose a customer first.');
      return;
    }

    const quotation = db.insert('quotations', {
      customerId: form.customerId,
      commodity: form.commodityCode,
      origin: quote.inputs.origin.name,
      destination: `${quote.inputs.port.name}, ${quote.inputs.port.country}`,
      weightTons: Number(form.weightTons),
      mode: form.modeCode,
      port: form.portCode,
      insurance: form.insurance,
      insuredValue: Number(form.insuredValue),
      status: send ? 'Sent' : 'Draft',
      createdAt: new Date().toISOString().slice(0, 10),
      createdBy: user.id,
      total: Math.round(quote.sellPrice),
      margin: Number(quote.marginPct.toFixed(1)),
    });

    enqueue({
      entity: 'quotation',
      endpoint: BC_ENDPOINTS.quotation,
      recordId: quotation.id,
      label: `Quote ${quotation.id} — ${customer?.name}`,
      payload: {
        customerNo: customer?.bcNo,
        currency: 'USD',
        lines: quote.lines.map((l) => ({ description: l.label, amount: Math.round(l.amount) })),
        totalExclVat: Math.round(quote.sellPrice),
      },
    });

    record(
      user,
      send ? 'quotation.send' : 'quotation.create',
      quotation.id,
      `${send ? 'Issued' : 'Drafted'} quotation ${quotation.id} for ${customer?.name} — ${money(quote.sellPrice)} at ${quote.marginPct.toFixed(1)}% margin`
    );

    if (send) {
      // The customer sees it in their own portal immediately.
      const clientUsers = db.read('users').filter((u) => u.role === 'client' && u.customerId === form.customerId);
      clientUsers.forEach((clientUser) =>
        notify({
          forUserId: clientUser.id,
          severity: 'info',
          title: `New quotation ${quotation.id}`,
          body: `${quote.inputs.origin.name} to ${quote.inputs.port.name} — ${money(quote.sellPrice)}. Held for 14 days.`,
          link: '/portal/my/quotes',
        })
      );
    }

    if (verdict.band === 'critical') {
      notify({
        forRoles: ['management'],
        severity: 'warning',
        title: `Quotation ${quotation.id} is below the margin floor`,
        body: `${quote.marginPct.toFixed(1)}% on ${customer?.name}. ${verdict.detail}`,
        link: '/portal/quotations',
      });
    }

    toast.success(`Quotation ${quotation.id} ${send ? 'issued' : 'created'}`, {
      description: send
        ? `${customer?.name} can see it in their portal now.`
        : 'Saved as a draft and queued for Business Central.',
    });
  };

  return (
    <div className="space-y-5 max-w-[1500px] min-w-0">
      <ModuleHeader
        number={5}
        title="Customer Quotation Engine"
        blurb="Seven inputs in, a priced and documented quotation out — with the internal cost build-up behind it."
      />

      {/* This screen holds five separate datasets. Each gets its own tab
          rather than stacking them into one long scroll. */}
      <Tabs
        tabs={[
          { key: 'price', label: 'Price a lane' },
          { key: 'modes', label: 'Compare modes', count: alternatives.filter((o) => o.available).length },
          { key: 'costs', label: 'Cost breakdown', count: quote?.lines.length ?? 0 },
          { key: 'docs', label: 'Documents', count: quote?.documents.length ?? 0 },
          { key: 'history', label: 'History', count: quotations.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      <div className={`grid xl:grid-cols-5 gap-5 min-w-0 ${tab === 'history' ? 'hidden' : ''}`}>
        {/* ===== Inputs ===== */}
        <Card className="xl:col-span-2 h-fit">
          <SectionHeading title="Enquiry" description="Everything recalculates as you type." />

          <div className="space-y-4">
            <Field label="Customer" required>
              <Select value={form.customerId} onChange={set('customerId')}>
                <option value="">Select a customer…</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.entity})
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Commodity" required>
              <Select value={form.commodityCode} onChange={set('commodityCode')}>
                {commodities.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                    {c.hazard ? ' — hazardous' : ''}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Origin" required>
              <Select value={form.originCode} onChange={set('originCode')}>
                {origins.map((o) => (
                  <option key={o.code} value={o.code}>
                    {o.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Destination port" required>
              <Select value={form.portCode} onChange={set('portCode')}>
                {ports.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.name}, {p.country}
                  </option>
                ))}
              </Select>
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Weight (tonnes)" required>
                <Input
                  type="number"
                  min="1"
                  step="0.5"
                  value={form.weightTons}
                  onChange={set('weightTons')}
                />
              </Field>
              <Field label="Transport mode" required>
                <Select value={form.modeCode} onChange={set('modeCode')}>
                  {transportModes.map((m) => (
                    <option key={m.code} value={m.code}>
                      {m.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <div className="pt-2 border-t border-silver-200 space-y-4">
              <Toggle
                checked={form.insurance}
                onChange={(v) => setForm((f) => ({ ...f, insurance: v }))}
                label="Include cargo insurance"
                description="Goods-in-transit / marine cover at 0.35% of declared value."
              />
              {form.insurance && (
                <Field label="Declared value (USD)">
                  <Input
                    type="number"
                    min="0"
                    step="1000"
                    value={form.insuredValue}
                    onChange={set('insuredValue')}
                  />
                </Field>
              )}
            </div>
          </div>
        </Card>

        {/* ===== Output ===== */}
        <div className="xl:col-span-3 space-y-6">
          {!quote ? (
            <Card>
              <p className="text-silver-500 text-sm">Complete the enquiry to generate a quotation.</p>
            </Card>
          ) : (
            <>
              {/* Headline */}
              <Card className="bg-gradient-to-br from-silver-900 to-primary-900 border-0 text-white">
                <div className="flex flex-wrap items-start justify-between gap-6">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-white/50 mb-2">
                      Quoted price · all inclusive
                    </p>
                    <p className="text-4xl md:text-5xl font-display font-bold tabular-nums">
                      {money(quote.sellPrice)}
                    </p>
                    <p className="text-white/60 text-sm mt-2 tabular-nums">
                      {money(quote.ratePerTon)} per tonne · {quote.inputs.tons}t ·{' '}
                      {num(quote.inputs.distanceKm)} km
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-widest text-white/50 mb-2">
                      Estimated transit
                    </p>
                    <p className="text-3xl font-display font-bold tabular-nums">
                      {transitWindow(quote.transit.totalDays)}
                    </p>
                    <p className="text-white/60 text-sm mt-2">
                      via {quote.inputs.border ? `${quote.inputs.border.name}, ` : ''}
                      {quote.inputs.port.name}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-7 pt-6 border-t border-white/15">
                  {[
                    { label: 'Line haul', value: `${quote.transit.travelDays.toFixed(1)}d` },
                    { label: 'Border', value: quote.inputs.border ? `${quote.transit.borderDays.toFixed(1)}d` : '—' },
                    { label: 'Port dwell', value: `${quote.transit.portDays.toFixed(1)}d` },
                    { label: 'Load / unload', value: `${quote.transit.loadingDays.toFixed(1)}d` },
                  ].map((item) => (
                    <div key={item.label}>
                      <p className="text-[11px] uppercase tracking-wider text-white/45">{item.label}</p>
                      <p className="text-lg font-display font-semibold tabular-nums mt-0.5">{item.value}</p>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-3 mt-7">
                  <Button variant="primary" icon={Icons.Send} onClick={() => save(true)}>
                    Issue to customer
                  </Button>
                  <Button
                    variant="secondary"
                    icon={Icons.FileCheck}
                    onClick={() => save(false)}
                    className="bg-white/10 text-white border-white/20 hover:bg-white/20 hover:text-white"
                  >
                    Save as draft
                  </Button>
                  <Button
                    variant="secondary"
                    icon={Icons.Printer}
                    onClick={() => window.print()}
                    className="bg-white/10 text-white border-white/20 hover:bg-white/20 hover:text-white"
                  >
                    Print / PDF
                  </Button>
                </div>
              </Card>

              {/* ===== Mode comparison ===== */}
              <Card className={tab === 'modes' ? '' : 'hidden'}>
                <SectionHeading
                  title="Compare every mode"
                  description="The same lane priced on all modes — so you can answer “is rail worth the extra week?”"
                />
                <div className="overflow-x-auto custom-scroll -mx-5 md:-mx-6">
                  <table className="w-full text-sm min-w-[620px]">
                    <thead>
                      <tr className="border-b border-silver-200">
                        {['Mode', 'Price', 'vs cheapest', 'Transit', 'vs fastest', 'Margin', ''].map((h, i) => (
                          <th
                            key={h + i}
                            className={`px-5 md:px-6 py-3 text-xs font-semibold uppercase tracking-wider text-silver-500 ${
                              i === 0 ? 'text-left' : 'text-right'
                            }`}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {alternatives.map((option) => {
                        const selected = option.mode.code === form.modeCode;

                        // Modes that cannot serve this lane stay on screen with
                        // the reason, rather than silently disappearing.
                        if (!option.available) {
                          return (
                            <tr key={option.mode.code} className="border-b border-silver-100 last:border-0">
                              <td className="px-5 md:px-6 py-3.5">
                                <span className="font-medium text-silver-400">{option.mode.name}</span>
                              </td>
                              <td colSpan={6} className="px-5 md:px-6 py-3.5 text-right text-xs text-silver-400">
                                {option.unavailableReason}
                              </td>
                            </tr>
                          );
                        }

                        return (
                          <tr
                            key={option.mode.code}
                            className={`border-b border-silver-100 last:border-0 transition-colors ${
                              selected ? 'bg-primary-50/50' : 'hover:bg-silver-50/60'
                            }`}
                          >
                            <td className="px-5 md:px-6 py-3.5">
                              <span className="flex items-center gap-2 flex-wrap">
                                <span className={`font-medium ${selected ? 'text-primary-700' : 'text-silver-900'}`}>
                                  {option.mode.name}
                                </span>
                                {option.isCheapest && <Badge tone="good">Cheapest</Badge>}
                                {option.isFastest && <Badge tone="info">Fastest</Badge>}
                              </span>
                            </td>
                            <td className="px-5 md:px-6 py-3.5 text-right tabular-nums font-medium text-silver-900">
                              {money(option.price)}
                            </td>
                            <td className="px-5 md:px-6 py-3.5 text-right tabular-nums text-silver-500">
                              {option.priceDeltaPct < 0.05 ? '—' : `+${option.priceDeltaPct.toFixed(0)}%`}
                            </td>
                            <td className="px-5 md:px-6 py-3.5 text-right tabular-nums text-silver-700">
                              {transitWindow(option.days)}
                            </td>
                            <td className="px-5 md:px-6 py-3.5 text-right tabular-nums text-silver-500">
                              {option.daysDelta < 0.05 ? '—' : `+${option.daysDelta.toFixed(1)}d`}
                            </td>
                            <td className="px-5 md:px-6 py-3.5 text-right tabular-nums text-silver-700">
                              {option.margin.toFixed(0)}%
                            </td>
                            <td className="px-5 md:px-6 py-3.5 text-right">
                              {!selected && (
                                <button
                                  onClick={() => setForm((f) => ({ ...f, modeCode: option.mode.code }))}
                                  className="text-xs font-medium text-primary-600 hover:text-primary-700 border border-silver-200 hover:border-primary-300 rounded-lg px-2.5 py-1.5"
                                >
                                  Use this
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {alternatives.filter((o) => o.available).length > 1 && (
                  <p className="text-xs text-silver-500 mt-4 pt-4 border-t border-silver-200">
                    {(() => {
                      const viable = alternatives.filter((o) => o.available);
                      const cheapest = viable[0];
                      const quickest = viable.reduce((a, b) => (b.days < a.days ? b : a));
                      if (cheapest.mode.code === quickest.mode.code) {
                        return `${cheapest.mode.name} is both the cheapest and the fastest on this lane.`;
                      }
                      const extra = quickest.price - cheapest.price;
                      const saved = cheapest.days - quickest.days;
                      return `${quickest.mode.name} saves ${saved.toFixed(1)} days over ${cheapest.mode.name}, for ${money(extra)} more — about ${money(extra / Math.max(0.1, saved))} per day saved.`;
                    })()}
                  </p>
                )}
              </Card>

              {/* Internal cost breakdown */}
              <Card className={tab === 'costs' ? '' : 'hidden'}>
                <SectionHeading
                  title="Internal cost breakdown"
                  description="Not shown to the customer."
                  action={
                    <button
                      onClick={() => setShowInternal((v) => !v)}
                      className="text-xs font-medium text-silver-500 hover:text-primary-600 border border-silver-200 rounded-lg px-2.5 py-1.5 inline-flex items-center gap-1.5"
                    >
                      {showInternal ? <Icons.EyeOff size={13} /> : <Icons.Eye size={13} />}
                      {showInternal ? 'Hide' : 'Show'}
                    </button>
                  }
                />

                {showInternal && (
                  <>
                    <div className="grid sm:grid-cols-3 gap-4 mb-6">
                      <div className="p-4 rounded-xl bg-silver-50 border border-silver-200">
                        <p className="text-xs uppercase tracking-wider text-silver-500">Total cost</p>
                        <p className="text-xl font-display font-bold text-silver-900 tabular-nums mt-1">
                          {money(quote.totalCost)}
                        </p>
                      </div>
                      <div className="p-4 rounded-xl bg-silver-50 border border-silver-200">
                        <p className="text-xs uppercase tracking-wider text-silver-500">Gross profit</p>
                        <p className="text-xl font-display font-bold text-[#006300] tabular-nums mt-1">
                          {money(quote.grossProfit)}
                        </p>
                      </div>
                      <div className="p-4 rounded-xl bg-silver-50 border border-silver-200">
                        <p className="text-xs uppercase tracking-wider text-silver-500">Margin</p>
                        <p
                          className={`text-xl font-display font-bold tabular-nums mt-1 ${
                            verdict.band === 'good'
                              ? 'text-[#006300]'
                              : verdict.band === 'warning'
                              ? 'text-[#b07800]'
                              : 'text-[#d03b3b]'
                          }`}
                        >
                          {quote.marginPct.toFixed(1)}%
                        </p>
                      </div>
                    </div>

                    {/* Margin guardrail — commercial finds out before the quote leaves. */}
                    <div
                      className={`flex items-start gap-2.5 p-3.5 rounded-xl border text-sm mb-6 ${
                        verdict.band === 'good'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                          : verdict.band === 'warning'
                          ? 'bg-amber-50 border-amber-200 text-amber-900'
                          : 'bg-red-50 border-red-200 text-red-800'
                      }`}
                    >
                      {verdict.band === 'good' ? (
                        <Icons.CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                      ) : (
                        <Icons.TriangleAlert size={16} className="mt-0.5 shrink-0" />
                      )}
                      <span>
                        <span className="font-semibold">{verdict.label}.</span> {verdict.detail}
                      </span>
                    </div>

                    <BarChart
                      data={quote.lines
                        .slice()
                        .sort((a, b) => b.amount - a.amount)
                        .map((line, i) => ({
                          label: line.label.length > 26 ? `${line.label.slice(0, 25)}…` : line.label,
                          value: Math.round(line.amount),
                          color: i === 0 ? SERIES[0] : '#94a3b8',
                          note: line.detail,
                        }))}
                      formatValue={(v) => `$${num(v)}`}
                      labelWidth={186}
                    />

                    <div className="mt-6 pt-5 border-t border-silver-200 space-y-2.5">
                      {quote.lines.map((line) => (
                        <div key={line.key} className="flex items-start justify-between gap-4 text-sm">
                          <div className="min-w-0">
                            <p className="text-silver-800 font-medium">{line.label}</p>
                            <p className="text-xs text-silver-400 mt-0.5">{line.detail}</p>
                          </div>
                          <p className="text-silver-900 font-semibold tabular-nums shrink-0">
                            {money(line.amount)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </Card>

              {/* Documents — a table, so it stays readable as the pack grows */}
              <Card padded={false} className={tab === 'docs' ? '' : 'hidden'}>
                <div className="table-card-head">
                  <SectionHeading
                    title="Required documentation"
                    description={`${quote.documents.filter((d) => d.mandatory).length} mandatory · ${
                      quote.documents.length
                    } total for this lane`}
                  />
                </div>
                <DataTable
                  minWidth={480}
                  pageSize={12}
                  searchable={quote.documents.length > 8}
                  searchPlaceholder="Search documents…"
                  filters={[{ key: 'responsibility', label: 'Responsible' }]}
                  columns={[
                    {
                      key: 'name',
                      label: 'Document',
                      maxWidth: '20rem',
                      render: (r) => <span className="font-medium text-silver-900">{r.name}</span>,
                    },
                    { key: 'responsibility', label: 'Provided by' },
                    {
                      key: 'mandatory',
                      label: 'Requirement',
                      align: 'right',
                      sortValue: (r) => (r.mandatory ? 0 : 1),
                      render: (r) => (
                        <Badge tone={r.mandatory ? 'critical' : 'neutral'}>
                          {r.mandatory ? 'Mandatory' : 'If applicable'}
                        </Badge>
                      ),
                    },
                  ]}
                  rows={quote.documents.map((doc) => ({
                    id: doc.name,
                    name: doc.name,
                    responsibility: doc.who,
                    mandatory: doc.mandatory,
                  }))}
                  empty="No documentation required for this lane."
                />
              </Card>
            </>
          )}
        </div>
      </div>

      {/* ===== History ===== */}
      <Card padded={false} className={tab === 'history' ? '' : 'hidden'}>
        <div className="table-card-head">
          <SectionHeading
            title="Quotation history"
            description="Every quotation raised. Click a row to open it."
          />
        </div>
        <DataTable
          columns={RELATED_COLUMNS.quotations}
          rows={quotations}
          rowLink={(r) => recordPath('quotations', r.id)}
          searchable
          searchKeys={['id', 'origin', 'destination', 'status']}
          filters={[
            { key: 'status', label: 'Status' },
            { key: 'customerId', label: 'Customer', filterValue: (r) => customers.find((c) => c.id === r.customerId)?.name },
          ]}
          pageSize={15}
          showTotals
          minWidth={900}
          initialSort={{ key: 'createdAt', dir: 'desc' }}
          empty="No quotations raised yet."
          emptyDescription="Price a lane on the first tab and issue it to a customer."
        />
      </Card>
    </div>
  );
};

export default Quotations;
