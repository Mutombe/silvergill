import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Maximize2, Minimize2, Crosshair } from 'lucide-react';

import { shipmentProgress, GEO_LABEL } from '../engine/geo';

/* ===========================================================================
   Route map for one consignment.

   Draws the real driving corridor: the road it will take in light grey, the
   distance already covered in brand blue, every stop on the way, and the truck
   at its last known position. Styled for the site's light theme rather than a
   default Leaflet look.
   =========================================================================== */

const BLUE = '#0284c7';
const CYAN = '#22d3ee';
const INK = '#0f172a';

const truckIcon = (moving) => L.divIcon({
  className: '',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
  html: `<div style="position:relative;display:grid;place-items:center;width:34px;height:34px">
    ${moving ? `<span style="position:absolute;inset:0;border-radius:50%;background:${BLUE};opacity:.25;animation:sgPulse 2s ease-out infinite"></span>` : ''}
    <span style="display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:${BLUE};box-shadow:0 2px 8px rgba(2,132,199,.45),0 0 0 4px rgba(2,132,199,.18)">
      <svg width="15" height="15" viewBox="0 0 256 256" fill="#fff"><path d="M247.4 144.9 219 99.5A16 16 0 0 0 205.4 92H176V72a16 16 0 0 0-16-16H24A16 16 0 0 0 8 72v112a16 16 0 0 0 16 16h11a32 32 0 0 0 62 0h50a32 32 0 0 0 62 0h11a16 16 0 0 0 16-16v-31.5a16 16 0 0 0-1.6-6.6ZM176 108h29.4l20 32H176Z"/></svg>
    </span>
  </div>`,
});

const stopIcon = (kind) => {
  const size = kind === 'end' ? 14 : kind === 'start' ? 13 : 9;
  const fill = kind === 'end' ? BLUE : kind === 'start' ? '#ffffff' : '#94a3b8';
  return L.divIcon({
    className: '',
    iconSize: [size + 4, size + 4],
    iconAnchor: [(size + 4) / 2, (size + 4) / 2],
    html: `<span style="display:block;width:${size}px;height:${size}px;border-radius:50%;background:${fill};border:2px solid ${INK};box-shadow:0 0 0 3px rgba(2,132,199,.15)"></span>`,
  });
};

const MAP_CSS = `
@keyframes sgPulse { 0% { transform: scale(1); opacity:.45 } 100% { transform: scale(2.4); opacity:0 } }
.sg-map .leaflet-container { background:#eef2f6; font-family: 'DM Sans', sans-serif; }
.sg-map .leaflet-popup-content-wrapper { border-radius:.75rem; box-shadow:0 8px 24px rgba(15,23,42,.14); border:1px solid #e2e8f0; }
.sg-map .leaflet-popup-content { margin:.65rem .85rem; font-size:.8rem; color:#334155; }
.sg-map .leaflet-bar a { border-color:#e2e8f0; color:#475569; }
.sg-map .leaflet-control-attribution { background:rgba(255,255,255,.82); color:#94a3b8; font-size:10px; }
.sg-map .leaflet-control-attribution a { color:#64748b; }
`;

const RouteMap = ({ shipment, height = 320, showFullscreen = true, className = '' }) => {
  const hostRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const boundsRef = useRef(null);
  const [full, setFull] = useState(false);

  // Create the map once.
  useEffect(() => {
    if (mapRef.current || !hostRef.current) return undefined;
    const map = L.map(hostRef.current, {
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: false,
      dragging: true,
    });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap &copy; CARTO',
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  // Redraw whenever the consignment moves.
  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer || !shipment) return;

    const rp = shipmentProgress(shipment);
    layer.clearLayers();

    // The whole road, faint.
    L.polyline(rp.line, {
      color: '#94a3b8', weight: 2.5, opacity: 0.45, dashArray: '3 7', lineCap: 'round',
    }).addTo(layer);

    // What has actually been covered.
    if (rp.traveled.length > 1) {
      L.polyline(rp.traveled, {
        color: BLUE, weight: 4, opacity: 0.95, lineCap: 'round', lineJoin: 'round',
      }).addTo(layer);
    }

    // Stops along the corridor.
    rp.stops.forEach((stop, i) => {
      const kind = i === 0 ? 'start' : i === rp.stops.length - 1 ? 'end' : 'via';
      const passed = stop.i <= rp.idx;
      L.marker(stop.coord, { icon: stopIcon(kind) })
        .addTo(layer)
        .bindPopup(
          `<strong>${stop.name || GEO_LABEL[stop.key] || stop.key}</strong><br>` +
          `<span style="color:#64748b">${kind === 'start' ? 'Origin' : kind === 'end' ? 'Destination' : 'En route'}` +
          `${passed ? ' · passed' : ''}</span>`
        );
    });

    // The consignment itself.
    const moving = !['Delivered', 'Planned', 'Cancelled'].includes(shipment.status);
    L.marker(rp.pos, { icon: truckIcon(moving), zIndexOffset: 1000 })
      .addTo(layer)
      .bindPopup(
        `<strong>${shipment.id}</strong><br>` +
        `<span style="color:#64748b">${shipment.status}</span>` +
        (shipment.currentLocation ? `<br>${shipment.currentLocation}` : '')
      );

    boundsRef.current = L.polyline(rp.line).getBounds();
    try {
      map.fitBounds(boundsRef.current.pad(0.16));
    } catch {
      map.setView(rp.pos, 6);
    }
  }, [shipment]);

  // Leaflet needs telling when its container resizes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return undefined;
    const timer = setTimeout(() => {
      map.invalidateSize();
      if (boundsRef.current) {
        try { map.fitBounds(boundsRef.current.pad(0.16)); } catch { /* keep current view */ }
      }
    }, 260);
    const onKey = (e) => e.key === 'Escape' && setFull(false);
    if (full) window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', onKey);
    };
  }, [full]);

  const recentre = () => {
    const map = mapRef.current;
    if (map && boundsRef.current) {
      try { map.fitBounds(boundsRef.current.pad(0.16)); } catch { /* ignore */ }
    }
  };

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

      <div className="absolute right-2.5 top-2.5 z-[500] flex flex-col gap-1.5">
        <button
          type="button"
          onClick={recentre}
          title="Re-centre on the route"
          className="w-9 h-9 grid place-items-center rounded-lg bg-white/95 border border-silver-200 text-silver-600 hover:text-primary-600 shadow-sm backdrop-blur"
        >
          <Crosshair size={15} />
        </button>
        {showFullscreen && (
          <button
            type="button"
            onClick={() => setFull((f) => !f)}
            title={full ? 'Exit full screen (Esc)' : 'Full screen'}
            className="w-9 h-9 grid place-items-center rounded-lg bg-white/95 border border-silver-200 text-silver-600 hover:text-primary-600 shadow-sm backdrop-blur"
          >
            {full ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        )}
      </div>

      {/* Legend — identity is never carried by colour alone. */}
      <div className="absolute bottom-2.5 left-2.5 z-[500] flex flex-wrap items-center gap-3 rounded-xl bg-white/95 border border-silver-200 px-3 py-2 backdrop-blur shadow-sm">
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-[3px] rounded-full" style={{ background: BLUE }} />
          <span className="text-[10px] font-medium uppercase tracking-wider text-silver-500">Covered</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-[3px] rounded-full border-t-2 border-dashed border-silver-400" />
          <span className="text-[10px] font-medium uppercase tracking-wider text-silver-500">Remaining</span>
        </span>
      </div>
    </div>
  );
};

export default RouteMap;
export { BLUE as MAP_BLUE, CYAN as MAP_CYAN, MAP_CSS };
