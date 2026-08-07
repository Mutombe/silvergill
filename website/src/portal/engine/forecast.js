// Forecasting and risk scoring for the predictive analytics module.
//
// Ordinary least squares on the rolling weekly series, plus a residual-based
// confidence band. It is deliberately simple and inspectable: management should
// be able to see that a border prediction is a trend line through observed wait
// times, not an oracle. Swap in a fitted model later — every consumer of these
// functions takes the same shape.

import { marketSignals, borders, ports } from '../data/seed';

/** Least-squares fit. Returns slope, intercept and R². */
export function fit(series) {
  const n = series.length;
  const xs = Array.from({ length: n }, (_, i) => i);
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = series.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i += 1) {
    num += (xs[i] - meanX) * (series[i] - meanY);
    den += (xs[i] - meanX) ** 2;
  }

  const slope = den === 0 ? 0 : num / den;
  const intercept = meanY - slope * meanX;

  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i += 1) {
    const predicted = intercept + slope * i;
    ssRes += (series[i] - predicted) ** 2;
    ssTot += (series[i] - meanY) ** 2;
  }

  return {
    slope,
    intercept,
    r2: ssTot === 0 ? 0 : 1 - ssRes / ssTot,
    stdError: Math.sqrt(ssRes / Math.max(1, n - 2)),
  };
}

/**
 * Project a series forward.
 * Returns the historical values padded with nulls, plus the forecast arm and
 * a ± band, so a chart can draw both on one axis.
 */
export function project(series, periods = 4) {
  const model = fit(series);
  const n = series.length;

  const forecast = Array.from({ length: periods }, (_, i) =>
    Math.max(0, Number((model.intercept + model.slope * (n + i)).toFixed(2)))
  );

  // Widen the band the further out we go — uncertainty compounds.
  const band = forecast.map((_, i) => Number((model.stdError * (1 + i * 0.35) * 1.96).toFixed(2)));

  return {
    model,
    forecast,
    band,
    // Padded so history and forecast share one x axis, joined at the last actual.
    historySeries: [...series, ...Array(periods).fill(null)],
    forecastSeries: [...Array(n - 1).fill(null), series[n - 1], ...forecast],
    upperSeries: [...Array(n - 1).fill(null), series[n - 1], ...forecast.map((v, i) => Number((v + band[i]).toFixed(2)))],
    trend: model.slope > 0.05 ? 'rising' : model.slope < -0.05 ? 'falling' : 'flat',
    confidence: Math.max(0.35, Math.min(0.95, model.r2)),
  };
}

/** Forward weekly labels beyond the observed series. */
export function forwardLabels(count) {
  const last = marketSignals.weeks[marketSignals.weeks.length - 1];
  const lastNo = Number(last.replace('W', ''));
  return Array.from({ length: count }, (_, i) => `W${lastNo + i + 1}`);
}

/** Border delay outlook for every crossing. */
export function borderOutlook(periods = 4) {
  return borders
    .map((border) => {
      const series = marketSignals.borderWaitHours[border.code] || [];
      if (!series.length) return null;
      const projection = project(series, periods);
      const current = series[series.length - 1];
      const predicted = projection.forecast[periods - 1];
      return {
        ...border,
        series,
        projection,
        current,
        predicted,
        changePct: ((predicted - current) / current) * 100,
        vsBaseline: ((current - border.baselineHours) / border.baselineHours) * 100,
        // How far above its own normal this crossing is projected to sit. A
        // quiet border drifting 5h → 6h is not "worse" than Beitbridge at 24h,
        // so rank on pressure against baseline rather than on percent change.
        pressure: predicted / border.baselineHours,
        severity: predicted >= border.baselineHours * 1.6 ? 'critical' : predicted >= border.baselineHours * 1.25 ? 'warning' : 'good',
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.pressure - a.pressure);
}

/** Port congestion outlook, measured in dwell days. */
export function portOutlook(periods = 4) {
  return ports
    .map((port) => {
      const series = marketSignals.portDwellDays[port.code] || [];
      if (!series.length) return null;
      const projection = project(series, periods);
      const current = series[series.length - 1];
      const predicted = projection.forecast[periods - 1];
      return {
        ...port,
        series,
        projection,
        current,
        predicted,
        changePct: ((predicted - current) / current) * 100,
        severity: predicted >= 7 ? 'critical' : predicted >= 4.5 ? 'warning' : 'good',
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.predicted - a.predicted);
}

export function railOutlook(periods = 4) {
  const series = marketSignals.railWagonAvailability;
  const projection = project(series, periods);
  const current = series[series.length - 1];
  const predicted = projection.forecast[periods - 1];
  return {
    series,
    projection,
    current,
    predicted,
    changePct: ((predicted - current) / current) * 100,
    severity: predicted < 40 ? 'critical' : predicted < 55 ? 'warning' : 'good',
  };
}

export function demandOutlook(periods = 4) {
  const series = marketSignals.demandTons;
  const projection = project(series, periods);
  const current = series[series.length - 1];
  const predicted = projection.forecast[periods - 1];
  return {
    series,
    projection,
    current,
    predicted,
    changePct: ((predicted - current) / current) * 100,
  };
}

/**
 * Per-shipment risk.
 * Combines corridor conditions with where the load actually is and how much of
 * its planned transit it has already consumed.
 */
export function shipmentRisk(shipment, { borderData, portData }) {
  const drivers = [];

  if (shipment.border) {
    const border = borderData.find((b) => b.code === shipment.border);
    if (border && border.vsBaseline > 15) {
      drivers.push({
        label: `${border.name} congestion`,
        detail: `${border.current}h wait, ${border.vsBaseline.toFixed(0)}% above baseline`,
        points: Math.min(30, Math.round(border.vsBaseline * 0.5)),
      });
    }
  }

  const port = portData.find((p) => p.code === shipment.port);
  if (port && port.current > 4) {
    drivers.push({
      label: `${port.name} dwell`,
      detail: `${port.current.toFixed(1)} days and ${port.changePct > 0 ? 'rising' : 'easing'}`,
      points: Math.min(28, Math.round((port.current - 3) * 7)),
    });
  }

  if (shipment.mode === 'RAIL' || shipment.mode === 'MULTI') {
    const rail = railOutlook();
    if (rail.current < 60) {
      drivers.push({
        label: 'Rail wagon availability',
        detail: `${rail.current}% available, trending ${rail.changePct < 0 ? 'down' : 'up'}`,
        points: Math.min(25, Math.round((60 - rail.current) * 0.9)),
      });
    }
  }

  // Schedule pressure: how much of the planned window is already gone.
  if (shipment.dispatchedAt && shipment.etaAt) {
    const dispatched = new Date(shipment.dispatchedAt);
    const eta = new Date(shipment.etaAt);
    const planned = (eta - dispatched) / 86400000;
    const elapsed = (Date.now() - dispatched) / 86400000;
    const consumed = planned > 0 ? elapsed / planned : 0;

    if (consumed > 0.75 && shipment.status !== 'Delivered') {
      drivers.push({
        label: 'Schedule pressure',
        detail:
          consumed >= 1
            ? `${Math.round((consumed - 1) * planned)} days past ETA`
            : `${Math.round(consumed * 100)}% of the window used`,
        points: Math.min(30, Math.round((consumed - 0.7) * 60)),
      });
    }
  }

  if (shipment.status === 'At Border') {
    drivers.push({ label: 'Currently held at a border post', detail: 'Not moving', points: 12 });
  }

  const score = Math.min(100, drivers.reduce((sum, d) => sum + d.points, 0));

  return {
    score,
    band: score >= 55 ? 'critical' : score >= 30 ? 'warning' : 'good',
    label: score >= 55 ? 'Will likely slip' : score >= 30 ? 'At risk' : 'On track',
    drivers: drivers.sort((a, b) => b.points - a.points),
    predictedEta: predictEta(shipment, score),
  };
}

/** Push the ETA out in proportion to risk. */
function predictEta(shipment, score) {
  if (!shipment.etaAt || shipment.status === 'Delivered') return null;
  const eta = new Date(shipment.etaAt);
  const slipDays = Math.round((score / 100) * 6);
  eta.setDate(eta.getDate() + slipDays);
  return { date: eta.toISOString().slice(0, 10), slipDays };
}
