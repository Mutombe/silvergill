// Geography and corridor routing — the single source of truth for map
// coordinates, place→key resolution, and where a consignment sits on its road.
//
// Used by the in-portal maps AND the public tracker, so it stays free of any
// heavy data imports and holds no React.

import { CORRIDORS } from '../data/corridors';

export { CORRIDORS };

/** Canonical waypoints. Keys match the corridor stop keys exactly. */
export const GEO = {
  harare: [-17.8252, 31.0335],
  bulawayo: [-20.153, 28.582],
  beitbridge: [-22.2167, 30.0008],
  forbes: [-18.99, 32.69],
  mutare: [-18.9707, 32.6709],
  beira: [-19.8436, 34.8389],
  durban: [-29.8587, 31.0218],
  joburg: [-26.2041, 28.0473],
  lusaka: [-15.3875, 28.3228],
  musina: [-22.349, 30.043],
  masvingo: [-20.0637, 30.8277],
  gweru: [-19.45, 29.8167],
  kwekwe: [-18.9281, 29.8149],
  walvisbay: [-22.9576, 14.5053],
  plumtree: [-20.4833, 27.8167],
  chirundu: [-16.0419, 28.8487],
  nyamapanda: [-16.78, 32.83],
  nacala: [-14.5428, 40.6728],
  dar: [-6.7924, 39.2083],
  portlouis: [-20.1609, 57.5012],
  curepipe: [-20.3188, 57.5262],
  ngezi: [-18.1667, 30.2333],
  arcadia: [-17.8, 31.45],
  mutoko: [-17.4167, 32.2167],
  hwange: [-18.3647, 26.4981],
};

/** Human labels for the waypoints, used in map popups. */
export const GEO_LABEL = {
  harare: 'Harare', bulawayo: 'Bulawayo', beitbridge: 'Beitbridge Border',
  forbes: 'Forbes Border', mutare: 'Mutare', beira: 'Beira Port',
  durban: 'Durban Port', joburg: 'Johannesburg', lusaka: 'Lusaka',
  musina: 'Musina', masvingo: 'Masvingo', gweru: 'Gweru', kwekwe: 'Kwekwe',
  walvisbay: 'Walvis Bay', plumtree: 'Plumtree Border', chirundu: 'Chirundu Border',
  nyamapanda: 'Nyamapanda Border', nacala: 'Nacala Port', dar: 'Dar es Salaam',
  portlouis: 'Port Louis', curepipe: 'Curepipe', ngezi: 'Ngezi Mine',
  arcadia: 'Arcadia Mine', mutoko: 'Mutoko Quarry', hwange: 'Hwange Colliery',
};

/**
 * Resolve free text ("Beitbridge Border Post", "Ngezi Mine, Mhondoro") to a
 * waypoint key. Order matters — the most specific match wins.
 */
export function geoKeyFor(place) {
  const k = String(place || '').toLowerCase();
  if (!k.trim()) return null;

  const rules = [
    ['ngezi', 'ngezi'], ['arcadia', 'arcadia'], ['goromonzi', 'arcadia'],
    ['mutoko', 'mutoko'], ['hwange', 'hwange'], ['kwekwe', 'kwekwe'],
    ['curepipe', 'curepipe'], ['port louis', 'portlouis'], ['portlouis', 'portlouis'],
    ['walvis', 'walvisbay'], ['plumtree', 'plumtree'], ['chirundu', 'chirundu'],
    ['nyamapanda', 'nyamapanda'], ['nacala', 'nacala'], ['dar es salaam', 'dar'],
    ['beitbridge', 'beitbridge'], ['musina', 'musina'],
    ['forbes', 'forbes'], ['machipanda', 'forbes'],
    ['mutare', 'mutare'], ['beira', 'beira'],
    ['durban', 'durban'], ['johannesburg', 'joburg'], ['joburg', 'joburg'],
    ['lusaka', 'lusaka'], ['masvingo', 'masvingo'], ['gweru', 'gweru'],
    ['bulawayo', 'bulawayo'], ['harare', 'harare'],
  ];

  for (const [needle, key] of rules) {
    if (k.includes(needle)) return key;
  }
  return null;
}

/** Port codes used by the shipment records map onto waypoints. */
export const PORT_GEO = {
  BEW: 'beira', DUR: 'durban', WVB: 'walvisbay',
  NLA: 'nacala', MRU: 'portlouis', DAR: 'dar',
};

const dist2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;

/** Every waypoint that actually has baked road geometry attached to it. */
const CORRIDOR_NODES = [...new Set(Object.keys(CORRIDORS).flatMap((k) => k.split('>')))];

/** How far a real origin may sit from a corridor node and still use its road. */
const SNAP_RADIUS_KM = 400;

/** Look a lane up in either direction, mirroring the geometry when reversed. */
function lookupCorridor(a, b) {
  const direct = CORRIDORS[`${a}>${b}`];
  if (direct) return { ...direct, from: a, to: b, synthetic: false, reversed: false };

  // A corridor is a road: it works in both directions.
  const reverse = CORRIDORS[`${b}>${a}`];
  if (reverse) {
    const line = [...reverse.line].reverse();
    const last = line.length - 1;
    return {
      km: reverse.km,
      line,
      stops: [...reverse.stops].map((s) => ({ ...s, i: last - s.i })).sort((x, y) => x.i - y.i),
      from: a,
      to: b,
      synthetic: false,
      reversed: true,
    };
  }
  return null;
}

/** The nearest waypoint with real road geometry, if one is close enough. */
function snapToCorridorNode(key) {
  if (CORRIDOR_NODES.includes(key)) return key;
  const coord = GEO[key];
  if (!coord) return key;

  let best = key;
  let bestKm = Infinity;
  for (const candidate of CORRIDOR_NODES) {
    const km = haversineKm(coord, GEO[candidate]);
    if (km < bestKm) { bestKm = km; best = candidate; }
  }
  return bestKm <= SNAP_RADIUS_KM ? best : key;
}

/**
 * Stitch the true endpoints back onto a snapped corridor, so a load leaving a
 * mine 40 km outside Harare still follows the Harare road rather than a
 * straight line across the veld.
 */
function stitch(base, trueFrom, trueTo) {
  let line = [...base.line];
  let stops = base.stops.map((s) => ({ ...s }));

  if (trueFrom !== base.from && GEO[trueFrom]) {
    line = [GEO[trueFrom], ...line];
    stops = stops.map((s) => ({ ...s, i: s.i + 1 }));
    stops.unshift({ key: trueFrom, name: GEO_LABEL[trueFrom] || trueFrom, coord: GEO[trueFrom], i: 0 });
  }
  if (trueTo !== base.to && GEO[trueTo]) {
    line = [...line, GEO[trueTo]];
    stops.push({ key: trueTo, name: GEO_LABEL[trueTo] || trueTo, coord: GEO[trueTo], i: line.length - 1 });
  }

  return {
    ...base,
    line,
    stops,
    from: trueFrom,
    to: trueTo,
    // The stitched legs are short relative to the corridor, so the baked
    // distance stays the honest headline figure.
    km: base.km,
    stitched: true,
  };
}

/**
 * The corridor for a from→to pair.
 *
 * Tries the exact lane, then the same lane reversed, then the nearest lane with
 * the true endpoints stitched on. Only when none of that works does it fall
 * back to a straight two-point line — a map that draws something honest beats
 * a map that draws nothing.
 */
export function routeFor(fromKey, toKey) {
  const a = GEO[fromKey] ? fromKey : 'durban';
  const b = GEO[toKey] ? toKey : 'harare';

  const exact = lookupCorridor(a, b);
  if (exact) return { ...exact, stitched: false };

  const sa = snapToCorridorNode(a);
  const sb = snapToCorridorNode(b);
  if ((sa !== a || sb !== b) && sa !== sb) {
    const base = lookupCorridor(sa, sb);
    if (base) return stitch(base, a, b);
  }

  const line = [GEO[a], GEO[b]];
  return {
    from: a, to: b, synthetic: true, reversed: false, stitched: false, km: null, line,
    stops: [
      { key: a, name: GEO_LABEL[a] || a, coord: GEO[a], i: 0 },
      { key: b, name: GEO_LABEL[b] || b, coord: GEO[b], i: 1 },
    ],
  };
}

function nearestIndex(line, coord) {
  let best = 0;
  let bd = Infinity;
  for (let i = 0; i < line.length; i += 1) {
    const d = dist2(line[i], coord);
    if (d < bd) { bd = d; best = i; }
  }
  return best;
}

/**
 * Where a consignment sits on its corridor.
 *
 * `current` may be a location string ("Beitbridge Border"), a [lat,lng] pair,
 * or nothing — in which case `statusFrac` positions it by status alone.
 * Returns the route plus { idx, frac, pos, traveled, remaining }.
 */
export function routeProgress(fromKey, toKey, current, statusFrac = null) {
  const route = routeFor(fromKey, toKey);
  const { line } = route;
  let idx = 0;

  if (Array.isArray(current) && current.length === 2) {
    idx = nearestIndex(line, current);
  } else if (typeof current === 'string' && current.trim()) {
    const key = geoKeyFor(current);
    if (key && GEO[key]) idx = nearestIndex(line, GEO[key]);
    else if (statusFrac != null) idx = Math.round(statusFrac * (line.length - 1));
  } else if (statusFrac != null) {
    idx = Math.round(statusFrac * (line.length - 1));
  }

  idx = Math.max(0, Math.min(line.length - 1, idx));

  return {
    ...route,
    idx,
    frac: line.length > 1 ? idx / (line.length - 1) : 0,
    pos: line[idx],
    traveled: line.slice(0, idx + 1),
    remaining: line.slice(idx),
  };
}

/** How far along the corridor each status sits, when nothing better is known. */
export const STATUS_FRAC = {
  Planned: 0,
  'In Transit': 0.55,
  'At Border': 0.45,
  'Awaiting Rail': 0.15,
  'On Water': 0.7,
  Delayed: 0.5,
  Delivered: 1,
  Cancelled: 0,
};

/**
 * Resolve a shipment record to its corridor endpoints, preferring the named
 * origin, then falling back to the port code.
 */
export function shipmentRoute(shipment) {
  const fromKey = geoKeyFor(shipment.origin) || 'harare';
  const toKey =
    geoKeyFor(shipment.destination) || PORT_GEO[shipment.port] || 'harare';
  return { fromKey, toKey };
}

/** Full progress for a shipment record, ready to hand to the map. */
export function shipmentProgress(shipment) {
  const { fromKey, toKey } = shipmentRoute(shipment);
  return routeProgress(
    fromKey,
    toKey,
    shipment.currentLocation || null,
    STATUS_FRAC[shipment.status] ?? 0
  );
}

/** Great-circle distance in km — used for "x km remaining" readouts. */
export function haversineKm(a, b) {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLon = ((b[1] - a[1]) * Math.PI) / 180;
  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Length of a polyline in km. */
export function lineKm(line) {
  let total = 0;
  for (let i = 1; i < line.length; i += 1) total += haversineKm(line[i - 1], line[i]);
  return total;
}

/** Clean a place string for display; never returns a bare dash. */
export const placeLabel = (s, fallback = 'Origin') => {
  const v = String(s || '').trim();
  return v && v !== '—' ? v : fallback;
};

export const laneLabel = (origin, dest) =>
  `${placeLabel(origin, 'Origin')} → ${placeLabel(dest, 'Destination')}`;
