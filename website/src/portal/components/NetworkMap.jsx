import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Maximize2, Minimize2 } from 'lucide-react';

import { GEO, GEO_LABEL, shipmentProgress } from '../engine/geo';
import { MAP_CSS } from './RouteMap';

/* ===========================================================================
   Network map — every live consignment on one board.

   Corridors in use are drawn once; each consignment gets a marker at its last
   known position, coloured by delay risk. Clicking one selects it.
   =========================================================================== */

const TONE = { good: '#0ca30c', warning: '#fab219', critical: '#d03b3b', neutral: '#0284c7' };

/** Fixed nodes worth showing even when nothing is moving through them. */
const NODES = [
  { key: 'harare', type: 'hub', sub: 'Head office' },
  { key: 'bulawayo', type: 'office', sub: 'Branch' },
  { key: 'mutare', type: 'office', sub: 'Branch' },
  { key: 'portlouis', type: 'office', sub: 'Mauritius branch' },
  { key: 'beitbridge', type: 'border', sub: 'Border · South Africa' },
  { key: 'forbes', type: 'border', sub: 'Border · Mozambique' },
  { key: 'chirundu', type: 'border', sub: 'Border · Zambia' },
  { key: 'plumtree', type: 'border', sub: 'Border · Botswana' },
  { key: 'nyamapanda', type: 'border', sub: 'Border · Mozambique' },
  { key: 'beira', type: 'port', sub: 'Sea port · Mozambique' },
  { key: 'durban', type: 'port', sub: 'Sea port · South Africa' },
  { key: 'walvisbay', type: 'port', sub: 'Sea port · Namibia' },
];

const nodeIcon = (type) => {
  const hub = type === 'hub';
  const size = hub ? 20 : 14;
  const colour = '#475569';
  const inner =
    type === 'port'
      ? `<span style="display:block;width:9px;height:9px;border-radius:2px;background:${colour}"></span>`
      : type === 'border'
      ? `<span style="display:block;width:8px;height:8px;transform:rotate(45deg);border:2px solid ${colour}"></span>`
      : `<span style="display:block;width:9px;height:9px;border-radius:50%;background:${hub ? '#0284c7' : colour}"></span>`;
  return L.divIcon({
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<div style="display:grid;place-items:center;width:${size}px;height:${size}px">
      ${hub ? `<span style="position:absolute;width:${size + 8}px;height:${size + 8}px;border-radius:50%;border:1.5px solid #0284c7;opacity:.5"></span>` : ''}
      ${inner}
    </div>`,
  });
};

const shipIcon = (colour, selected) => L.divIcon({
  className: '',
  iconSize: [selected ? 32 : 24, selected ? 32 : 24],
  iconAnchor: [selected ? 16 : 12, selected ? 16 : 12],
  html: `<div style="position:relative;display:grid;place-items:center;width:${selected ? 32 : 24}px;height:${selected ? 32 : 24}px">
    ${selected ? `<span style="position:absolute;inset:0;border-radius:50%;background:${colour};opacity:.25;animation:sgPulse 2s ease-out infinite"></span>` : ''}
    <span style="display:grid;place-items:center;width:${selected ? 26 : 20}px;height:${selected ? 26 : 20}px;border-radius:50%;background:${colour};box-shadow:0 2px 6px rgba(15,23,42,.3),0 0 0 3px rgba(255,255,255,.9)">
      <svg width="${selected ? 13 : 11}" height="${selected ? 13 : 11}" viewBox="0 0 256 256" fill="#fff"><path d="M247.4 144.9 219 99.5A16 16 0 0 0 205.4 92H176V72a16 16 0 0 0-16-16H24A16 16 0 0 0 8 72v112a16 16 0 0 0 16 16h11a32 32 0 0 0 62 0h50a32 32 0 0 0 62 0h11a16 16 0 0 0 16-16v-31.5a16 16 0 0 0-1.6-6.6ZM176 108h29.4l20 32H176Z"/></svg>
    </span>
  </div>`,
});

const NetworkMap = ({ shipments = [], height = 460, selectedId = null, onSelect, className = '' }) => {
  const hostRef = useRef(null);
  const mapRef = useRef(null);
  const routeLayer = useRef(null);
  const shipLayer = useRef(null);
  const [full, setFull] = useState(false);

  // Resolve each consignment's position once per data change.
  const positioned = useMemo(
    () =>
      shipments
        .map((s) => {
          try {
            return { shipment: s, rp: shipmentProgress(s) };
          } catch {
            return null;
          }
        })
        .filter(Boolean),
    [shipments]
  );

  useEffect(() => {
    if (mapRef.current || !hostRef.current) return undefined;
    const map = L.map(hostRef.current, {
      center: [-20.5, 30.5],
      zoom: 5,
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: false,
    });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap &copy; CARTO',
    }).addTo(map);

    // Static nodes are drawn once and never redrawn.
    const nodeLayer = L.layerGroup().addTo(map);
    NODES.forEach((node) => {
      const coord = GEO[node.key];
      if (!coord) return;
      L.marker(coord, { icon: nodeIcon(node.type) })
        .addTo(nodeLayer)
        .bindPopup(`<strong>${GEO_LABEL[node.key]}</strong><br><span style="color:#64748b">${node.sub}</span>`);
    });

    routeLayer.current = L.layerGroup().addTo(map);
    shipLayer.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !routeLayer.current || !shipLayer.current) return;

    routeLayer.current.clearLayers();
    shipLayer.current.clearLayers();

    const drawn = new Set();
    const allPoints = [];

    positioned.forEach(({ shipment, rp }) => {
      const laneKey = `${rp.from}>${rp.to}`;
      if (!drawn.has(laneKey)) {
        drawn.add(laneKey);
        L.polyline(rp.line, {
          color: '#94a3b8', weight: 2, opacity: 0.4, dashArray: '3 7', lineCap: 'round',
        }).addTo(routeLayer.current);
      }
      if (rp.traveled.length > 1) {
        L.polyline(rp.traveled, {
          color: '#0284c7', weight: 3, opacity: 0.7, lineCap: 'round',
        }).addTo(routeLayer.current);
      }
      allPoints.push(...rp.line);

      const colour = TONE[shipment.risk?.band] || TONE.neutral;
      const selected = shipment.id === selectedId;
      const marker = L.marker(rp.pos, {
        icon: shipIcon(colour, selected),
        zIndexOffset: selected ? 1200 : 800,
      })
        .addTo(shipLayer.current)
        .bindPopup(
          `<strong>${shipment.id}</strong><br>` +
          `<span style="color:#64748b">${shipment.origin} → ${shipment.destination}</span><br>` +
          `<span style="color:#0f172a;font-weight:600">${shipment.status}</span>` +
          (shipment.risk ? ` · <span style="color:#64748b">${shipment.risk.label}</span>` : '')
        );
      if (onSelect) marker.on('click', () => onSelect(shipment));
    });

    if (allPoints.length) {
      try {
        map.fitBounds(L.latLngBounds(allPoints).pad(0.1));
      } catch {
        /* keep the default view */
      }
    }
  }, [positioned, selectedId, onSelect]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return undefined;
    const timer = setTimeout(() => map.invalidateSize(), 260);
    const onKey = (e) => e.key === 'Escape' && setFull(false);
    if (full) window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', onKey);
    };
  }, [full]);

  return (
    <div
      className={`sg-map ${
        full
          ? 'fixed inset-0 z-[1000] bg-white'
          : `relative overflow-hidden rounded-2xl border border-silver-200 ${className}`
      }`}
    >
      <style>{MAP_CSS}</style>
      <div ref={hostRef} style={{ height: full ? '100vh' : height, width: '100%', zIndex: 1 }} />

      <button
        type="button"
        onClick={() => setFull((f) => !f)}
        title={full ? 'Exit full screen (Esc)' : 'Full screen'}
        className="absolute right-2.5 top-2.5 z-[500] w-9 h-9 grid place-items-center rounded-lg bg-white/95 border border-silver-200 text-silver-600 hover:text-primary-600 shadow-sm backdrop-blur"
      >
        {full ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
      </button>

      <div className="absolute bottom-2.5 left-2.5 z-[500] flex flex-wrap items-center gap-3 rounded-xl bg-white/95 border border-silver-200 px-3 py-2 backdrop-blur shadow-sm">
        {[
          { colour: TONE.good, label: 'On track' },
          { colour: TONE.warning, label: 'At risk' },
          { colour: TONE.critical, label: 'Will slip' },
        ].map((item) => (
          <span key={item.label} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: item.colour }} />
            <span className="text-[10px] font-medium uppercase tracking-wider text-silver-500">{item.label}</span>
          </span>
        ))}
      </div>

      <div className="absolute right-2.5 bottom-2.5 z-[500] flex items-center gap-2 rounded-full bg-white/95 border border-silver-200 px-3 py-1.5 backdrop-blur shadow-sm">
        <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-silver-600">
          {positioned.length} live
        </span>
      </div>
    </div>
  );
};

export default NetworkMap;
