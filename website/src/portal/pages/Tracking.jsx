import React, { useMemo, useState } from 'react';
import * as Icons from 'lucide-react';
import { toast } from 'sonner';

import { useCollection } from '../hooks';
import { borderOutlook, portOutlook, shipmentRisk } from '../engine/forecast';
import { shipmentProgress, lineKm, haversineKm } from '../engine/geo';
import { EVENT_TYPE_LABEL } from '../engine/events';

import {
  Badge, Button, Card, DataTable, EmptyState, ProgressBar, SearchInput,
  SectionHeading, Select, StatCard, num, dateLabel, timeLabel, statusTone,
} from '../components/ui';
import NetworkMap from '../components/NetworkMap';
import RouteMap from '../components/RouteMap';
import ModuleHeader from '../components/ModuleHeader';

/* ===========================================================================
   Live tracking board — the operations wall.

   Every consignment on one map, positioned on its real driving corridor, with
   the board on the left and the selected journey on the right.
   =========================================================================== */

const EVENT_ICON = {
  border_cross: Icons.Stamp, departed: Icons.Truck, arrived: Icons.MapPin,
  delay: Icons.Clock, exception: Icons.TriangleAlert, delivered: Icons.PackageCheck,
  location: Icons.Navigation, update: Icons.Navigation, note: Icons.MessageSquare,
};

const Tracking = () => {
  const shipments = useCollection('shipments');
  const customers = useCollection('customers');
  const drivers = useCollection('drivers');
  const vehicles = useCollection('vehicles');
  const events = useCollection('shipmentEvents');

  const [query, setQuery] = useState('');
  const [entity, setEntity] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  const borderData = useMemo(() => borderOutlook(4), []);
  const portData = useMemo(() => portOutlook(4), []);

  const live = useMemo(() => {
    const q = query.trim().toLowerCase();
    return shipments
      .filter((s) => s.status !== 'Cancelled')
      .filter((s) => !entity || s.entity === entity)
      .filter(
        (s) =>
          !q ||
          s.id.toLowerCase().includes(q) ||
          (s.trackingToken || '').toLowerCase().includes(q) ||
          (s.containerNo || '').toLowerCase().includes(q) ||
          (s.truckReg || '').toLowerCase().includes(q) ||
          s.destination.toLowerCase().includes(q) ||
          s.origin.toLowerCase().includes(q)
      )
      .map((s) => ({ ...s, risk: shipmentRisk(s, { borderData, portData }) }))
      .sort((a, b) => b.risk.score - a.risk.score);
  }, [shipments, query, entity, borderData, portData]);

  const moving = live.filter((s) => s.status !== 'Delivered');
  const selected = live.find((s) => s.id === selectedId) || moving[0] || live[0] || null;

  const customerName = (id) => customers.find((c) => c.id === id)?.name || '—';
  const driverFor = (s) => drivers.find((d) => d.id === s.driverId);
  const vehicleFor = (s) => vehicles.find((v) => v.id === s.vehicleId);

  const selectedEvents = selected
    ? events
        .filter((e) => e.shipmentId === selected.id && e.approved)
        .sort((a, b) => new Date(b.at) - new Date(a.at))
    : [];

  // Computed straight through: `selected` is derived from a mapped array and so
  // is a fresh object each render, which would defeat a memo anyway. Measuring
  // a 160-point polyline is cheap.
  const journey = (() => {
    if (!selected) return null;
    const rp = shipmentProgress(selected);
    const totalKm = rp.km || Math.round(lineKm(rp.line));
    const remainingKm = Math.round(
      rp.remaining.reduce((sum, p, i) => (i === 0 ? 0 : sum + haversineKm(rp.remaining[i - 1], p)), 0)
    );
    return { rp, totalKm, remainingKm, coveredPct: totalKm ? ((totalKm - remainingKm) / totalKm) * 100 : 0 };
  })();

  const copyLink = (shipment) => {
    const url = `${window.location.origin}/track/${shipment.trackingToken}`;
    navigator.clipboard?.writeText(url);
    toast.success('Tracking link copied', { description: 'Safe to send to the customer — no login needed.' });
  };

  return (
    <div className="space-y-6 max-w-[1600px]">
      <ModuleHeader
        title="Live Tracking"
        blurb="Every consignment positioned on its real driving corridor, with the conditions ahead of it and a shareable link for the customer."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="On the move" value={moving.length} icon={Icons.Radar} />
        <StatCard
          label="At a border"
          value={moving.filter((s) => s.status === 'At Border').length}
          icon={Icons.Stamp}
          tone={moving.some((s) => s.status === 'At Border') ? 'warning' : 'good'}
        />
        <StatCard
          label="Predicted to slip"
          value={moving.filter((s) => s.risk.band !== 'good').length}
          icon={Icons.TriangleAlert}
          tone={moving.some((s) => s.risk.band !== 'good') ? 'warning' : 'good'}
        />
        <StatCard
          label="Tonnes in motion"
          value={num(moving.reduce((s, x) => s + x.weightTons, 0))}
          icon={Icons.Weight}
        />
      </div>

      {/* ===== Map ===== */}
      <NetworkMap
        shipments={moving}
        selectedId={selected?.id}
        onSelect={(s) => setSelectedId(s.id)}
        height={480}
      />

      <div className="grid xl:grid-cols-5 gap-6">
        {/* ===== Board ===== */}
        <Card className="xl:col-span-3" padded={false}>
          <div className="table-card-head">
            <SectionHeading
              title="Consignment board"
              description="Sorted by delay risk — the ones needing a decision are at the top."
            />
            <div className="flex flex-wrap gap-3 mb-5">
              <div className="flex-1 min-w-[14rem]">
                <SearchInput
                  value={query}
                  onChange={setQuery}
                  placeholder="Reference, container, registration or town…"
                />
              </div>
              <div className="w-44">
                <Select value={entity} onChange={(e) => setEntity(e.target.value)}>
                  <option value="">Both entities</option>
                  <option>Zimbabwe</option>
                  <option>Mauritius</option>
                </Select>
              </div>
            </div>
          </div>

          <DataTable
            onRowClick={(row) => setSelectedId(row.id)}
            columns={[
              {
                key: 'id',
                label: 'Consignment',
                render: (r) => (
                  <span>
                    <span className={`block font-medium tabular-nums ${r.id === selected?.id ? 'text-primary-700' : 'text-silver-900'}`}>
                      {r.id}
                    </span>
                    <span className="block text-[11px] text-silver-400 tabular-nums">{r.trackingToken}</span>
                  </span>
                ),
              },
              { key: 'customer', label: 'Customer', render: (r) => customerName(r.customerId) },
              {
                key: 'position',
                label: 'Last reported',
                render: (r) => (
                  <span className="text-xs">
                    <span className="block text-silver-700">{r.currentLocation || 'Not yet reported'}</span>
                    <span className="block text-silver-400">{r.origin.split(',')[0]} → {r.destination.split(',')[0]}</span>
                  </span>
                ),
              },
              { key: 'status', label: 'Status', render: (r) => <Badge tone={statusTone(r.status)}>{r.status}</Badge> },
              {
                key: 'eta',
                label: 'Arrival',
                render: (r) =>
                  r.status === 'Delivered' ? (
                    <span className="text-silver-500">{dateLabel(r.etaAt)}</span>
                  ) : (
                    <span className={r.risk.predictedEta?.slipDays > 0 ? 'text-[#b07800] font-medium' : ''}>
                      {dateLabel(r.risk.predictedEta?.date || r.etaAt)}
                      {r.risk.predictedEta?.slipDays > 0 && (
                        <span className="text-xs ml-1.5">+{r.risk.predictedEta.slipDays}d</span>
                      )}
                    </span>
                  ),
              },
              {
                key: 'risk',
                label: 'Risk',
                align: 'right',
                render: (r) => <Badge tone={r.risk.band}>{r.risk.label}</Badge>,
              },
            ]}
            rows={live}
            empty="Nothing matches that search."
          />
        </Card>

        {/* ===== Selected journey ===== */}
        <div className="xl:col-span-2 space-y-6">
          {!selected ? (
            <Card>
              <EmptyState icon={Icons.Radar} title="Nothing selected" description="Pick a consignment from the board." />
            </Card>
          ) : (
            <>
              <Card>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="min-w-0">
                    <p className="font-display font-bold text-lg text-silver-900 tabular-nums">{selected.id}</p>
                    <p className="text-sm text-silver-500">{customerName(selected.customerId)}</p>
                  </div>
                  <Badge tone={statusTone(selected.status)}>{selected.status}</Badge>
                </div>

                <RouteMap shipment={selected} height={240} />

                {journey && (
                  <div className="mt-4">
                    <ProgressBar
                      value={journey.coveredPct}
                      label={`Journey covered · ${num(journey.totalKm)} km total`}
                      tone={selected.status === 'Delivered' ? 'good' : 'primary'}
                    />
                    {selected.status !== 'Delivered' && (
                      <p className="text-xs text-silver-400 mt-1.5 tabular-nums">
                        about {num(journey.remainingKm)} km remaining
                      </p>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 mt-5 pt-5 border-t border-silver-200">
                  {[
                    ['Container', selected.containerNo],
                    ['Vehicle', vehicleFor(selected)?.reg || selected.truckReg],
                    ['Driver', driverFor(selected)?.name],
                    ['Driver phone', selected.driverPhone],
                  ]
                    .filter(([, v]) => v)
                    .map(([label, value]) => (
                      <div key={label}>
                        <p className="text-[11px] uppercase tracking-wider text-silver-400">{label}</p>
                        <p className="text-sm font-medium text-silver-800 mt-0.5">{value}</p>
                      </div>
                    ))}
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full mt-5"
                  icon={Icons.Link2}
                  onClick={() => copyLink(selected)}
                >
                  Copy the customer's tracking link
                </Button>
              </Card>

              {selected.risk.drivers.length > 0 && (
                <Card>
                  <SectionHeading title="What is slowing it down" />
                  <div className="space-y-2.5">
                    {selected.risk.drivers.map((d) => (
                      <div key={d.label} className="flex items-start justify-between gap-3 p-3 rounded-xl border border-silver-200">
                        <div>
                          <p className="text-sm font-medium text-silver-800">{d.label}</p>
                          <p className="text-xs text-silver-500 mt-0.5">{d.detail}</p>
                        </div>
                        <span className="text-sm font-bold text-silver-900 tabular-nums shrink-0">+{d.points}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              <Card>
                <SectionHeading title="History" description="Published events on this consignment." />
                {selectedEvents.length === 0 ? (
                  <p className="text-sm text-silver-500">Nothing published yet.</p>
                ) : (
                  <ol className="relative border-l-2 border-silver-200 ml-2 space-y-4">
                    {selectedEvents.map((event, i) => {
                      const EventIcon = EVENT_ICON[event.type] || Icons.Navigation;
                      return (
                        <li key={event.id} className="ml-5">
                          <span
                            className={`absolute -left-[13px] w-6 h-6 rounded-lg flex items-center justify-center border ${
                              i === 0
                                ? 'bg-primary-600 border-primary-600 text-white'
                                : 'bg-white border-silver-200 text-silver-400'
                            }`}
                          >
                            <EventIcon size={12} />
                          </span>
                          <p className="text-sm font-medium text-silver-900">{event.label}</p>
                          <p className="text-xs text-silver-400 mt-0.5">
                            {timeLabel(event.at)} · {EVENT_TYPE_LABEL[event.type] || event.type}
                            {event.locationText ? ` · ${event.locationText}` : ''}
                          </p>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Tracking;
