// Quotation pricing engine.
//
// Deterministic: the same inputs always produce the same quote, which is what
// makes a quotation defensible in front of a customer. Every rate is named and
// exported so commercial can tune them without touching the calculation.

import { commodities, ports, borders, transportModes, marketSignals } from '../data/seed';

/**
 * Origin nodes, with road distance to the Harare hub.
 * `coastal` marks a node sitting at a seaport — the only place a standalone
 * ocean leg can actually start.
 */
export const origins = [
  { code: 'HRE', name: 'Harare (Msasa Depot)', hubKm: 0, country: 'Zimbabwe', coastal: false },
  { code: 'NGZ', name: 'Ngezi Mine, Mhondoro', hubKm: 128, country: 'Zimbabwe', coastal: false },
  { code: 'ARC', name: 'Arcadia Mine, Goromonzi', hubKm: 38, country: 'Zimbabwe', coastal: false },
  { code: 'KWK', name: 'Kwekwe Industrial', hubKm: 215, country: 'Zimbabwe', coastal: false },
  { code: 'BYO', name: 'Bulawayo Depot', hubKm: 440, country: 'Zimbabwe', coastal: false },
  { code: 'MTK', name: 'Mutoko Quarry', hubKm: 143, country: 'Zimbabwe', coastal: false },
  { code: 'HWG', name: 'Hwange Colliery', hubKm: 780, country: 'Zimbabwe', coastal: false },
  { code: 'MUT', name: 'Mutare Depot', hubKm: 263, country: 'Zimbabwe', coastal: false },
  { code: 'PTL', name: 'Port Louis Warehouse', hubKm: 0, country: 'Mauritius', coastal: true },
];

/**
 * Can this mode actually serve this lane?
 * Returns null when it can, or the reason it cannot — shown to the user rather
 * than silently dropped, so nobody wonders where an option went.
 */
export function modeFeasibility(modeCode, origin, port) {
  if (!origin || !port) return null;

  // Zimbabwe is landlocked: a standalone ocean leg cannot start at a mine.
  if (modeCode === 'SEA' && !origin.coastal) {
    return 'No sea access at origin — ocean freight only forms the onward leg from a port.';
  }
  if (modeCode === 'SEA' && origin.coastal && port.code === 'MRU') {
    return 'Origin and destination are the same port.';
  }
  // NRZ has no rail into or out of Mauritius.
  if ((modeCode === 'RAIL' || modeCode === 'MULTI') && origin.country === 'Mauritius') {
    return 'No rail network on this island lane.';
  }
  return null;
}

/** Which border a lane crosses, given the destination port. */
export const PORT_BORDER = {
  BEW: 'FBS',
  NLA: 'NYA',
  DUR: 'BBR',
  WVB: 'PLB',
  DAR: 'CHR',
  MRU: null,
};

export const RATES = {
  fuelSurchargePct: 0.18, // road and multimodal only
  hazardousSurchargePct: 0.12,
  documentationFee: 180,
  clearanceFee: { ROAD: 850, MULTI: 980, RAIL: 1200, SEA: 640, AIR: 420 },
  portHandlingPerTon: { BEW: 14.5, DUR: 21.0, WVB: 12.0, NLA: 15.5, MRU: 9.5, DAR: 23.0 },
  insuranceRate: 0.0035, // of declared value
  insuranceMinimum: 120,
  permitFee: 240,
  escortPerKm: 0.9, // hazardous road movements
  targetMargin: { ROAD: 0.24, RAIL: 0.19, MULTI: 0.26, SEA: 0.22, AIR: 0.31 },
  demurrageProvisionPerTon: 3.2, // scaled by port congestion
  loadingHoursPerDay: 10,
};

/** Latest observed value from a rolling series. */
const latest = (series) => series[series.length - 1];

/**
 * Price a lane.
 * Returns cost lines, sell price, margin, transit estimate and the document
 * pack the movement will need.
 */
export function priceQuotation(input) {
  const {
    originCode,
    portCode,
    commodityCode,
    weightTons,
    modeCode,
    insurance,
    insuredValue = 0,
  } = input;

  const origin = origins.find((o) => o.code === originCode);
  const port = ports.find((p) => p.code === portCode);
  const commodity = commodities.find((c) => c.code === commodityCode);
  const mode = transportModes.find((m) => m.code === modeCode);
  const tons = Number(weightTons) || 0;

  if (!origin || !port || !commodity || !mode || tons <= 0) return null;

  const border = borders.find((b) => b.code === PORT_BORDER[portCode]) || null;
  const distanceKm = origin.hubKm + port.distanceKmFromHarare;

  // Bulky cargo fills the deck before it reaches the axle limit, so it is
  // charged on volume. Uplift is capped at 1.6× — beyond that the customer is
  // better served by a dedicated load and a bespoke rate.
  const volumetricFactor = Math.max(1, Math.min(1.6, 1 / commodity.densityFactor));
  const chargeableTons = tons * volumetricFactor;

  /* ---- Cost build-up ---- */
  const lines = [];

  const lineHaul = chargeableTons * distanceKm * mode.ratePerTonKm;
  lines.push({
    key: 'lineHaul',
    label: `Line haul — ${mode.name}`,
    detail:
      volumetricFactor > 1
        ? `${chargeableTons.toFixed(1)}t chargeable (${tons}t × ${volumetricFactor.toFixed(2)} volumetric) × ${distanceKm.toLocaleString()}km`
        : `${tons}t × ${distanceKm.toLocaleString()}km × $${mode.ratePerTonKm}/t·km`,
    amount: lineHaul,
  });

  if (modeCode === 'ROAD' || modeCode === 'MULTI') {
    const fuel = lineHaul * RATES.fuelSurchargePct;
    lines.push({
      key: 'fuel',
      label: 'Fuel surcharge',
      detail: `${(RATES.fuelSurchargePct * 100).toFixed(0)}% of line haul`,
      amount: fuel,
    });
  }

  if (commodity.hazard) {
    lines.push({
      key: 'hazard',
      label: 'Hazardous handling',
      detail: `${(RATES.hazardousSurchargePct * 100).toFixed(0)}% surcharge — ${commodity.name}`,
      amount: lineHaul * RATES.hazardousSurchargePct,
    });
    if (modeCode === 'ROAD' || modeCode === 'MULTI') {
      lines.push({
        key: 'escort',
        label: 'Escort & route compliance',
        detail: `${distanceKm.toLocaleString()}km × $${RATES.escortPerKm}/km`,
        amount: distanceKm * RATES.escortPerKm,
      });
    }
  }

  if (border) {
    lines.push({
      key: 'clearance',
      label: `Customs clearance — ${border.name}`,
      detail: `${border.route} · agency and gate fees`,
      amount: RATES.clearanceFee[modeCode] || RATES.clearanceFee.ROAD,
    });
  }

  const handling = (RATES.portHandlingPerTon[portCode] || 15) * tons;
  lines.push({
    key: 'handling',
    label: `Port handling — ${port.name}`,
    detail: `${tons}t × $${RATES.portHandlingPerTon[portCode] || 15}/t`,
    amount: handling,
  });

  const congestion = latest(marketSignals.portDwellDays[portCode] || [3]);
  const demurrage = tons * RATES.demurrageProvisionPerTon * port.congestionIndex;
  lines.push({
    key: 'demurrage',
    label: 'Demurrage provision',
    detail: `${port.name} dwell running at ${congestion.toFixed(1)} days`,
    amount: demurrage,
  });

  lines.push({
    key: 'documentation',
    label: 'Documentation & filing',
    detail: 'Entry lodgement, manifest, release',
    amount: RATES.documentationFee,
  });

  if (commodity.permit) {
    lines.push({
      key: 'permit',
      label: commodity.permit,
      detail: 'Application and regulator fees',
      amount: RATES.permitFee,
    });
  }

  let insuranceCost = 0;
  if (insurance) {
    insuranceCost = Math.max(Number(insuredValue) * RATES.insuranceRate, RATES.insuranceMinimum);
    lines.push({
      key: 'insurance',
      label: 'Marine / goods-in-transit cover',
      detail: `${(RATES.insuranceRate * 100).toFixed(2)}% of $${Number(insuredValue).toLocaleString()} declared`,
      amount: insuranceCost,
    });
  }

  const totalCost = lines.reduce((sum, line) => sum + line.amount, 0);
  const targetMargin = RATES.targetMargin[modeCode] ?? 0.22;
  const sellPrice = totalCost / (1 - targetMargin);
  const grossProfit = sellPrice - totalCost;

  /* ---- Transit estimate ---- */
  const drivingHours = distanceKm / mode.avgSpeedKmh;
  const travelDays = drivingHours / (modeCode === 'SEA' || modeCode === 'RAIL' ? 24 : RATES.loadingHoursPerDay);
  const borderDays = border ? latest(marketSignals.borderWaitHours[border.code] || [border.baselineHours]) / 24 : 0;
  const portDays = congestion;
  const loadingDays = 0.5;
  const transitDays = travelDays + borderDays + portDays + loadingDays;

  /* ---- Document pack ---- */
  const documents = buildDocumentPack({ commodity, mode: modeCode, border, port, insurance });

  return {
    inputs: {
      origin, port, commodity, mode, tons, border, distanceKm,
      insurance, insuredValue, chargeableTons, volumetricFactor,
    },
    lines,
    totalCost,
    sellPrice,
    grossProfit,
    marginPct: (grossProfit / sellPrice) * 100,
    ratePerTon: sellPrice / tons,
    transit: {
      totalDays: transitDays,
      travelDays,
      borderDays,
      portDays,
      loadingDays,
    },
    documents,
  };
}

/**
 * The document pack a shipment on the books needs, derived from the same rules
 * the quotation uses — so what was promised at quote time is what compliance
 * checks against later.
 */
export function requiredDocumentsForShipment(shipment) {
  const commodity = commodities.find((c) => c.code === shipment.commodity);
  const port = ports.find((p) => p.code === shipment.port);
  const border = borders.find((b) => b.code === shipment.border) || null;
  if (!commodity || !port) return [];

  return buildDocumentPack({
    commodity,
    mode: shipment.mode,
    border,
    port,
    // Insurance is not held on the shipment record, so the certificate is
    // treated as optional rather than being wrongly reported as missing.
    insurance: false,
  });
}

function buildDocumentPack({ commodity, mode, border, port, insurance }) {
  const docs = [
    { name: 'Commercial Invoice', who: 'Shipper', mandatory: true },
    { name: 'Packing List', who: 'Shipper', mandatory: true },
    { name: 'Transport Order / Consignment Note', who: 'Silvergill', mandatory: true },
  ];

  if (border) {
    docs.push(
      { name: 'Bill of Entry (SAD 500)', who: 'Clearing Agent', mandatory: true },
      { name: 'Certificate of Origin', who: 'Shipper', mandatory: true },
      { name: 'Road Manifest', who: 'Silvergill', mandatory: mode !== 'RAIL' }
    );
  }

  if (border && border.route.startsWith('ZW')) {
    docs.push({ name: 'CD1 Form (Exchange Control)', who: 'Exporter & Bank', mandatory: true });
  }

  if (commodity.permit) {
    docs.push({ name: commodity.permit, who: 'Exporter', mandatory: true });
  }

  if (commodity.hazard) {
    docs.push(
      { name: 'Dangerous Goods Declaration', who: 'Shipper', mandatory: true },
      { name: 'Material Safety Data Sheet', who: 'Shipper', mandatory: true }
    );
  }

  if (mode === 'SEA' || port.code !== 'MRU') {
    docs.push({ name: 'Bill of Lading', who: 'Carrier', mandatory: mode === 'SEA' });
  }

  if (mode === 'RAIL' || mode === 'MULTI') {
    docs.push({ name: 'Rail Waybill (NRZ)', who: 'Rail Operator', mandatory: true });
  }

  if (insurance) {
    docs.push({ name: 'Insurance Certificate', who: 'Silvergill', mandatory: true });
  }

  return docs;
}

/** Human-readable transit window, e.g. "9–12 days". */
export function transitWindow(days) {
  const low = Math.max(1, Math.floor(days * 0.9));
  const high = Math.ceil(days * 1.25);
  return `${low}–${high} days`;
}

/**
 * Price the same lane on every mode at once.
 *
 * This is the question a customer actually asks — "is rail worth the extra
 * week?" — and it is impossible to answer from a single quote. Returns each
 * viable mode with its price, transit and the trade-off against the cheapest
 * and the fastest option.
 */
export function compareModes(input) {
  const origin = origins.find((o) => o.code === input.originCode);
  const port = ports.find((p) => p.code === input.portCode);

  const all = transportModes
    .map((mode) => {
      const unavailableReason = modeFeasibility(mode.code, origin, port);
      if (unavailableReason) return { mode, available: false, unavailableReason };

      const quote = priceQuotation({ ...input, modeCode: mode.code });
      if (!quote) return null;
      return {
        mode,
        available: true,
        quote,
        price: quote.sellPrice,
        days: quote.transit.totalDays,
        margin: quote.marginPct,
      };
    })
    .filter(Boolean);

  const priced = all.filter((o) => o.available);
  if (!priced.length) return all;

  const cheapest = Math.min(...priced.map((p) => p.price));
  const fastest = Math.min(...priced.map((p) => p.days));
  const cheapestDays = priced.find((p) => p.price === cheapest).days;

  const ranked = priced
    .map((option) => ({
      ...option,
      isCheapest: option.price === cheapest,
      isFastest: option.days === fastest,
      priceDeltaPct: ((option.price - cheapest) / cheapest) * 100,
      daysDelta: option.days - fastest,
      /** Extra dollars per day saved, versus the cheapest option. */
      costOfSpeed:
        option.price === cheapest || option.days >= cheapestDays
          ? null
          : (option.price - cheapest) / (cheapestDays - option.days),
    }))
    .sort((a, b) => a.price - b.price);

  // Unavailable modes sort to the bottom, still visible with their reason.
  return [...ranked, ...all.filter((o) => !o.available)];
}

/**
 * Margin guardrail. Commercial wants to know before a quote leaves the
 * building, not after the job is costed.
 */
export function marginVerdict(marginPct, modeCode) {
  const target = (RATES.targetMargin[modeCode] ?? 0.22) * 100;
  if (marginPct >= target) return { band: 'good', label: 'On target', detail: `At or above the ${target.toFixed(0)}% target for this mode.` };
  if (marginPct >= target - 5) return { band: 'warning', label: 'Below target', detail: `${(target - marginPct).toFixed(1)} points under the ${target.toFixed(0)}% target.` };
  return { band: 'critical', label: 'Needs approval', detail: `More than 5 points under target — management sign-off required.` };
}
