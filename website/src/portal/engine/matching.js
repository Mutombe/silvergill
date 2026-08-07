// Deterministic shipment matching.
//
// This runs BEFORE any extraction. Working out *which* consignment an update
// belongs to is a lookup problem with reliable keys — a reference number, a
// phone, a container, a registration plate. Handing that to a language model
// would be slower, more expensive and less correct.
//
// The extractor only ever interprets *what happened*, never *what it happened to*.

const digits = (s) => String(s || '').replace(/\D/g, '');
const flatten = (s) => String(s || '').toUpperCase().replace(/[\s-]/g, '');

/** Ordered strongest-first; the first hit wins and reports how it was found. */
export const MATCH_METHODS = {
  selected: 'Chosen by the operator',
  reference: 'Shipment reference in the text',
  container: 'Container number in the text',
  truck_reg: 'Vehicle registration in the text',
  phone: "Sender's number matches the assigned driver",
};

/**
 * Resolve an update to a shipment.
 * Returns { shipment, by, candidates } — `candidates` is populated when the
 * text is ambiguous, so the UI can ask rather than guess.
 */
export function matchShipment({ text = '', shipmentId = null, phone = null, shipments = [], drivers = [], vehicles = [] }) {
  // 1. The operator picked one explicitly. Nothing beats that.
  if (shipmentId) {
    const chosen = shipments.find((s) => s.id === shipmentId);
    if (chosen) return { shipment: chosen, by: 'selected', candidates: [] };
  }

  const upper = String(text || '').toUpperCase();
  const flat = flatten(text);
  const active = shipments.filter((s) => !['Delivered', 'Cancelled'].includes(s.status));

  // 2. An explicit shipment reference.
  const refMatch = upper.match(/\bSHP-\d{3,}\b/);
  if (refMatch) {
    const hit = shipments.find((s) => s.id.toUpperCase() === refMatch[0]);
    if (hit) return { shipment: hit, by: 'reference', candidates: [] };
  }

  // 3. A container number appearing anywhere in the text.
  for (const shipment of active) {
    const container = flatten(shipment.containerNo);
    if (container && container.length >= 8 && flat.includes(container)) {
      return { shipment, by: 'container', candidates: [] };
    }
  }

  // 4. A vehicle registration — either on the shipment or on its assigned truck.
  for (const shipment of active) {
    const regs = [shipment.truckReg, vehicles.find((v) => v.id === shipment.vehicleId)?.reg]
      .map(flatten)
      .filter((r) => r && r.length >= 6);
    if (regs.some((reg) => flat.includes(reg))) {
      return { shipment, by: 'truck_reg', candidates: [] };
    }
  }

  // 5. The sender's phone against the assigned driver. Compare the last nine
  //    digits so country-code and leading-zero variations still match.
  const tail = digits(phone).slice(-9);
  if (tail.length === 9) {
    const byPhone = active.filter((shipment) => {
      const onShipment = digits(shipment.driverPhone).slice(-9);
      const driver = drivers.find((d) => d.id === shipment.driverId);
      const onDriver = digits(driver?.phone).slice(-9);
      return onShipment === tail || onDriver === tail;
    });
    if (byPhone.length === 1) return { shipment: byPhone[0], by: 'phone', candidates: [] };
    // A driver running two loads is a real situation — ask, do not guess.
    if (byPhone.length > 1) return { shipment: null, by: null, candidates: byPhone };
  }

  return { shipment: null, by: null, candidates: [] };
}

/**
 * Everything an update needs to become a queued event.
 * Deliberately mirrors the server-side ingest pipeline: match, extract, score,
 * queue as unapproved. Nothing reaches a customer without a human.
 */
export function buildIngestResult({ text, source, match, extraction, confidence }) {
  return {
    matched: Boolean(match.shipment),
    shipmentId: match.shipment?.id ?? null,
    matchedBy: match.by,
    candidates: match.candidates ?? [],
    extraction,
    confidence,
    source,
    rawText: text,
  };
}
