import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';

import * as db from '../portal/data/db';
import { shipmentProgress, lineKm, haversineKm } from '../portal/engine/geo';
import { shipmentRisk } from '../portal/engine/forecast';
import { borderOutlook, portOutlook } from '../portal/engine/forecast';
import { EVENT_TYPE_LABEL } from '../portal/engine/events';
import RouteMap from '../portal/components/RouteMap';
import { siteConfig } from '../data/content';

/* ===========================================================================
   Public consignment tracker.

   No login. A customer follows a shareable link — /track/SGT-4A7F2C — or keys
   the reference in. Shows only what a consignee is entitled to see: where it
   is, when it should land, and the approved event history. No commercial
   figures, no customer names, no internal notes.
   =========================================================================== */

const STAGES = [
  { key: 'Planned', label: 'Booked', icon: Icons.ClipboardCheck },
  { key: 'In Transit', label: 'In transit', icon: Icons.Truck },
  { key: 'At Border', label: 'At border', icon: Icons.Stamp },
  { key: 'On Water', label: 'On water', icon: Icons.Ship },
  { key: 'Delivered', label: 'Delivered', icon: Icons.PackageCheck },
];

const STAGE_INDEX = {
  Planned: 0, 'Awaiting Rail': 0, 'In Transit': 1, Delayed: 1,
  'At Border': 2, 'On Water': 3, Delivered: 4, Cancelled: 0,
};

const EVENT_ICON = {
  border_cross: Icons.Stamp, departed: Icons.Truck, arrived: Icons.MapPin,
  delay: Icons.Clock, exception: Icons.TriangleAlert, delivered: Icons.PackageCheck,
  location: Icons.Navigation, update: Icons.Navigation, note: Icons.MessageSquare,
};

const dateOnly = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const dateTime = (iso) =>
  iso
    ? new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '';

/** Look a consignment up by tracking token, shipment id, or container number. */
function findShipment(reference) {
  const needle = String(reference || '').trim().toUpperCase();
  if (!needle) return null;
  const flat = needle.replace(/[\s-]/g, '');
  return (
    db.read('shipments').find(
      (s) =>
        (s.trackingToken || '').toUpperCase() === needle ||
        s.id.toUpperCase() === needle ||
        (s.containerNo || '').toUpperCase().replace(/[\s-]/g, '') === flat
    ) || null
  );
}

const Shell = ({ children }) => (
  <div className="min-h-screen bg-silver-50 flex flex-col">
    <header className="bg-white border-b border-silver-200">
      <div className="container-custom h-16 flex items-center justify-between">
        <Link to="/">
          <img src={siteConfig.logo} alt={siteConfig.name} className="h-8 w-auto" />
        </Link>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-primary-600">
          Consignment tracking
        </span>
      </div>
    </header>
    <main className="flex-1 container-custom py-8 md:py-12">{children}</main>
    <footer className="border-t border-silver-200 bg-white">
      <div className="container-custom py-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-silver-400">
          © {new Date().getFullYear()} {siteConfig.name}. Harare · Port Louis.
        </p>
        <Link to="/contact" className="text-xs text-primary-600 hover:text-primary-700 font-medium">
          Need help with a consignment?
        </Link>
      </div>
    </footer>
  </div>
);

const Track = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [query, setQuery] = useState(token || '');

  const shipment = useMemo(() => (token ? findShipment(token) : null), [token]);
  // Derived, not stored — a reference either resolves or it does not.
  const notFound = Boolean(token) && !shipment;

  const submit = (event) => {
    event.preventDefault();
    const value = query.trim();
    if (!value) return;
    navigate(`/track/${encodeURIComponent(value.toUpperCase())}`);
  };

  /* ===== Search form ===== */
  if (!token || notFound) {
    const samples = db.read('shipments').slice(0, 3);
    return (
      <Shell>
        <div className="max-w-xl mx-auto text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary-50 border border-primary-200 flex items-center justify-center mx-auto mb-6">
            <Icons.PackageSearch className="text-primary-600" size={26} />
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-silver-900 mb-3">
            Track your consignment
          </h1>
          <p className="text-silver-500 mb-8">
            Enter your tracking reference, consignment number or container number.
          </p>

          <form onSubmit={submit} className="flex gap-2 mb-6">
            <input
              className="input-field text-center font-medium tracking-wide"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="SGT-4A7F2C"
              autoFocus
            />
            <button type="submit" className="btn-primary shrink-0">
              <Icons.Search size={16} className="mr-1.5" />
              Track
            </button>
          </form>

          {notFound && (
            <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-900 text-left mb-6">
              <Icons.AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>
                Nothing matches <span className="font-semibold">{token}</span>. Check the reference on
                your booking confirmation, or contact us and we will look it up.
              </span>
            </div>
          )}

          <div className="pt-6 border-t border-silver-200">
            <p className="text-xs font-semibold uppercase tracking-wider text-silver-400 mb-3">
              Try a live consignment
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {samples.map((s) => (
                <Link
                  key={s.id}
                  to={`/track/${s.trackingToken}`}
                  className="text-xs px-3 py-2 rounded-lg border border-silver-200 bg-white text-silver-600 hover:border-primary-300 hover:text-primary-600 transition-colors"
                >
                  <span className="font-medium tabular-nums">{s.trackingToken}</span>
                  <span className="text-silver-400 ml-2">{s.destination.split(',')[0]}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  /* ===== Result ===== */
  const events = db
    .read('shipmentEvents')
    .filter((e) => e.shipmentId === shipment.id && e.approved)
    .sort((a, b) => new Date(b.at) - new Date(a.at));

  const borderData = borderOutlook(4);
  const portData = portOutlook(4);
  const risk = shipmentRisk(shipment, { borderData, portData });
  const progress = shipmentProgress(shipment);

  const totalKm = progress.km || Math.round(lineKm(progress.line));
  const remainingKm = Math.round(
    progress.remaining.reduce(
      (sum, point, i) => (i === 0 ? 0 : sum + haversineKm(progress.remaining[i - 1], point)),
      0
    )
  );
  const coveredPct = totalKm ? Math.round(((totalKm - remainingKm) / totalKm) * 100) : 0;
  const stageIdx = STAGE_INDEX[shipment.status] ?? 0;
  const delivered = shipment.status === 'Delivered';

  return (
    <Shell>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary-600 mb-1.5">
              {shipment.trackingToken}
            </p>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-silver-900">
              {shipment.origin}
              <Icons.ArrowRight size={20} className="inline mx-2.5 text-silver-300" />
              {shipment.destination}
            </h1>
          </div>
          <span
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border ${
              delivered
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : risk.band === 'critical'
                ? 'bg-red-50 text-red-700 border-red-200'
                : risk.band === 'warning'
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-primary-50 text-primary-700 border-primary-200'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${delivered ? 'bg-emerald-500' : 'bg-primary-500 animate-pulse'}`} />
            {shipment.status}
          </span>
        </div>

        {/* Headline */}
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            {
              label: delivered ? 'Delivered' : 'Expected arrival',
              value: dateOnly(delivered ? shipment.etaAt : risk.predictedEta?.date || shipment.etaAt),
              note:
                !delivered && risk.predictedEta?.slipDays > 0
                  ? `${risk.predictedEta.slipDays} day${risk.predictedEta.slipDays === 1 ? '' : 's'} later than planned`
                  : delivered
                  ? 'Signed for'
                  : 'On the planned date',
              tone: risk.predictedEta?.slipDays > 0 && !delivered ? 'warn' : 'ok',
            },
            {
              label: 'Journey covered',
              value: `${coveredPct}%`,
              note: delivered ? 'Complete' : `about ${remainingKm.toLocaleString()} km remaining`,
            },
            {
              label: 'Last reported',
              value: shipment.currentLocation || 'Awaiting first update',
              note: events[0] ? dateTime(events[0].at) : 'No updates yet',
            },
          ].map((tile) => (
            <div key={tile.label} className="bg-white rounded-2xl border border-silver-200 p-5">
              <p className="text-xs font-medium uppercase tracking-wider text-silver-500 mb-2">
                {tile.label}
              </p>
              <p className="text-xl font-display font-bold text-silver-900 leading-tight">{tile.value}</p>
              <p className={`text-xs mt-1.5 ${tile.tone === 'warn' ? 'text-[#b07800] font-medium' : 'text-silver-400'}`}>
                {tile.note}
              </p>
            </div>
          ))}
        </div>

        {/* Stage rail */}
        <div className="bg-white rounded-2xl border border-silver-200 p-5 md:p-6">
          <div className="flex items-center">
            {STAGES.map((stage, i) => {
              const reached = i <= stageIdx;
              const StageIcon = stage.icon;
              return (
                <React.Fragment key={stage.key}>
                  <div className="flex flex-col items-center gap-2 shrink-0">
                    <motion.span
                      initial={{ scale: 0.85, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: i * 0.07 }}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                        reached
                          ? 'bg-primary-600 border-primary-600 text-white'
                          : 'bg-white border-silver-200 text-silver-300'
                      }`}
                    >
                      <StageIcon size={17} />
                    </motion.span>
                    <span
                      className={`text-[11px] font-medium text-center ${
                        reached ? 'text-silver-800' : 'text-silver-400'
                      }`}
                    >
                      {stage.label}
                    </span>
                  </div>
                  {i < STAGES.length - 1 && (
                    <div className="flex-1 h-0.5 mx-1.5 sm:mx-3 -mt-6 rounded-full bg-silver-200 overflow-hidden">
                      <div
                        className="h-full bg-primary-500 rounded-full transition-all duration-700"
                        style={{ width: i < stageIdx ? '100%' : '0%' }}
                      />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Map */}
        <div>
          <h2 className="text-lg font-display font-semibold text-silver-900 mb-3">Where it is now</h2>
          <RouteMap shipment={shipment} height={360} />
        </div>

        {/* Detail + history */}
        <div className="grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-silver-200 p-5 md:p-6 h-fit">
            <h2 className="font-display font-semibold text-silver-900 mb-4">Consignment</h2>
            <dl className="space-y-3">
              {[
                ['Reference', shipment.trackingToken],
                ['Consignment', shipment.id],
                ['Container', shipment.containerNo],
                ['Weight', `${shipment.weightTons} tonnes`],
                ['Mode', { ROAD: 'Road freight', RAIL: 'Rail', MULTI: 'Road + rail', SEA: 'Ocean freight', AIR: 'Air freight' }[shipment.mode]],
                ['Collected', dateOnly(shipment.dispatchedAt)],
              ]
                .filter(([, value]) => value)
                .map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4 text-sm py-2 border-b border-silver-100 last:border-0">
                    <dt className="text-silver-500">{label}</dt>
                    <dd className="text-silver-900 font-medium text-right">{value}</dd>
                  </div>
                ))}
            </dl>

            {!delivered && risk.drivers.length > 0 && (
              <div className="mt-5 p-3.5 rounded-xl bg-amber-50 border border-amber-200">
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-800 mb-1.5">
                  Affecting this journey
                </p>
                <ul className="space-y-1">
                  {risk.drivers.slice(0, 3).map((d) => (
                    <li key={d.label} className="text-xs text-amber-900">
                      • {d.label} — {d.detail}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="lg:col-span-3 bg-white rounded-2xl border border-silver-200 p-5 md:p-6">
            <h2 className="font-display font-semibold text-silver-900 mb-4">History</h2>
            {events.length === 0 ? (
              <p className="text-sm text-silver-500">
                No updates published yet. The first will appear here as soon as the consignment moves.
              </p>
            ) : (
              <ol className="relative border-l-2 border-silver-200 ml-2 space-y-5">
                {events.map((event, i) => {
                  const EventIcon = EVENT_ICON[event.type] || Icons.Navigation;
                  return (
                    <motion.li
                      key={event.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="ml-5"
                    >
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
                        {dateTime(event.at)}
                        {event.locationText ? ` · ${event.locationText}` : ''}
                        {' · '}
                        {EVENT_TYPE_LABEL[event.type] || event.type}
                      </p>
                    </motion.li>
                  );
                })}
              </ol>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <Link to="/track" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
            ← Track another consignment
          </Link>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(window.location.href);
            }}
            className="inline-flex items-center gap-2 text-sm text-silver-500 hover:text-primary-600"
          >
            <Icons.Link2 size={15} />
            Copy this tracking link
          </button>
        </div>
      </div>
    </Shell>
  );
};

export default Track;
