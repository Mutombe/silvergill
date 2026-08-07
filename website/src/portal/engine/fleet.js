// Fleet health scoring.
//
// A single risk number per vehicle, built from signals the business already
// collects: distance since service, tread depth, incident history, age and
// fuel-consumption drift. Every contributing factor is returned alongside the
// score so a workshop manager can see WHY a truck is flagged, not just that it is.

export const TREAD_LIMIT_MM = 3.0; // legal minimum
export const TREAD_WARN_MM = 4.5;

/** Litres per 100km for a vehicle's most recent pair of fills. */
export function consumption(vehicleId, fuelLogs) {
  const logs = fuelLogs
    .filter((f) => f.vehicleId === vehicleId)
    .sort((a, b) => new Date(a.loggedAt) - new Date(b.loggedAt));

  if (logs.length < 2) return null;

  const recent = logs.slice(-2);
  const distance = recent[1].odometer - recent[0].odometer;
  if (distance <= 0) return null;

  return (recent[1].litres / distance) * 100;
}

/** Whole-period average, used as the baseline the latest figure drifts from. */
export function averageConsumption(vehicleId, fuelLogs) {
  const logs = fuelLogs
    .filter((f) => f.vehicleId === vehicleId)
    .sort((a, b) => a.odometer - b.odometer);

  if (logs.length < 2) return null;

  const distance = logs[logs.length - 1].odometer - logs[0].odometer;
  const litres = logs.slice(1).reduce((sum, log) => sum + log.litres, 0);
  if (distance <= 0) return null;

  return (litres / distance) * 100;
}

export function costPerKm(vehicleId, fuelLogs, serviceRecords) {
  const logs = fuelLogs.filter((f) => f.vehicleId === vehicleId).sort((a, b) => a.odometer - b.odometer);
  if (logs.length < 2) return null;

  const distance = logs[logs.length - 1].odometer - logs[0].odometer;
  if (distance <= 0) return null;

  const fuelCost = logs.slice(1).reduce((sum, log) => sum + log.cost, 0);
  const serviceCost = serviceRecords
    .filter((s) => s.vehicleId === vehicleId && s.odometer >= logs[0].odometer)
    .reduce((sum, s) => sum + s.cost, 0);

  return (fuelCost + serviceCost) / distance;
}

/**
 * Composite maintenance risk, 0 (healthy) to 100 (ground it).
 * Weights are deliberately blunt and visible — a workshop manager should be
 * able to argue with them.
 */
export function riskScore(vehicle, { fuelLogs, incidents, inspections }) {
  const factors = [];

  /* --- Service interval --- */
  const sinceService = vehicle.odometer - vehicle.lastServiceKm;
  const serviceUsage = sinceService / vehicle.serviceIntervalKm;
  const servicePoints = Math.min(35, Math.max(0, (serviceUsage - 0.7) * 100));
  if (servicePoints > 0) {
    factors.push({
      label: 'Service interval',
      detail:
        serviceUsage >= 1
          ? `${Math.round(sinceService - vehicle.serviceIntervalKm).toLocaleString()} km overdue`
          : `${Math.round((1 - serviceUsage) * 100)}% of interval remaining`,
      points: Math.round(servicePoints),
    });
  }

  /* --- Tyres --- */
  const worst = vehicle.tyres?.reduce((min, t) => (t.treadMm < min.treadMm ? t : min), vehicle.tyres[0]);
  if (worst) {
    const treadPoints =
      worst.treadMm <= TREAD_LIMIT_MM ? 30 : worst.treadMm <= TREAD_WARN_MM ? 16 : 0;
    if (treadPoints) {
      factors.push({
        label: 'Tyre tread',
        detail: `${worst.pos} at ${worst.treadMm.toFixed(1)}mm${
          worst.treadMm <= TREAD_LIMIT_MM ? ' — below the legal limit' : ''
        }`,
        points: treadPoints,
      });
    }
  }

  /* --- Failed inspection items --- */
  const latestInspection = inspections
    .filter((i) => i.vehicleId === vehicle.id)
    .sort((a, b) => new Date(b.inspectedAt) - new Date(a.inspectedAt))[0];
  if (latestInspection) {
    const fails = Object.values(latestInspection.checks).filter((v) => v === 'fail').length;
    const advisories = Object.values(latestInspection.checks).filter((v) => v === 'advisory').length;
    const points = fails * 12 + advisories * 3;
    if (points) {
      factors.push({
        label: 'Last inspection',
        detail: `${fails} failed, ${advisories} advisory`,
        points: Math.min(30, points),
      });
    }
  }

  /* --- Breakdown history --- */
  const breakdowns = incidents.filter(
    (i) => i.vehicleId === vehicle.id && ['Breakdown', 'Accident'].includes(i.type)
  );
  if (breakdowns.length) {
    factors.push({
      label: 'Breakdown history',
      detail: `${breakdowns.length} recorded`,
      points: Math.min(20, breakdowns.length * 10),
    });
  }

  /* --- Fuel drift: creeping consumption is an early mechanical warning --- */
  const latest = consumption(vehicle.id, fuelLogs);
  const baseline = averageConsumption(vehicle.id, fuelLogs);
  if (latest && baseline && latest > baseline * 1.1) {
    const drift = ((latest - baseline) / baseline) * 100;
    factors.push({
      label: 'Fuel consumption drift',
      detail: `${drift.toFixed(0)}% above this vehicle's own average`,
      points: Math.min(15, Math.round(drift)),
    });
  }

  /* --- Age & distance --- */
  const age = new Date().getFullYear() - vehicle.year;
  if (age >= 6 || vehicle.odometer > 750000) {
    factors.push({
      label: 'Age & distance',
      detail: `${age} years · ${Math.round(vehicle.odometer / 1000)}k km`,
      points: Math.min(12, Math.round(age * 1.2 + vehicle.odometer / 150000)),
    });
  }

  const score = Math.min(100, factors.reduce((sum, f) => sum + f.points, 0));

  return {
    score,
    band: score >= 60 ? 'critical' : score >= 35 ? 'warning' : 'good',
    label: score >= 60 ? 'Ground for inspection' : score >= 35 ? 'Schedule soon' : 'Healthy',
    factors: factors.sort((a, b) => b.points - a.points),
    nextServiceKm: vehicle.lastServiceKm + vehicle.serviceIntervalKm,
    kmToService: vehicle.lastServiceKm + vehicle.serviceIntervalKm - vehicle.odometer,
  };
}

/** Estimated remaining life of a tyre, from wear rate since fitting. */
export function tyreProjection(tyre, vehicle) {
  const kmRun = vehicle.odometer - tyre.fittedKm;
  if (kmRun <= 0) return { kmRemaining: null, wearPerKm: null };

  const NEW_TREAD_MM = 14;
  const worn = NEW_TREAD_MM - tyre.treadMm;
  if (worn <= 0) return { kmRemaining: null, wearPerKm: null };

  const wearPerKm = worn / kmRun;
  const usable = Math.max(0, tyre.treadMm - TREAD_LIMIT_MM);

  return {
    kmRemaining: Math.round(usable / wearPerKm),
    wearPerKm,
    pctWorn: Math.min(100, Math.round((worn / (NEW_TREAD_MM - TREAD_LIMIT_MM)) * 100)),
  };
}

/** Driver behaviour banding — the score itself comes from telematics. */
export function driverBand(score) {
  if (score >= 85) return { band: 'good', label: 'Exemplary' };
  if (score >= 70) return { band: 'info', label: 'Acceptable' };
  if (score >= 55) return { band: 'warning', label: 'Coaching needed' };
  return { band: 'critical', label: 'Intervention required' };
}
