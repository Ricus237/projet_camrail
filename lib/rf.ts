export type Coordinate = {
  latitude: number;
  longitude: number;
};

export type LinkBudgetInput = {
  distanceKm: number;
  frequencyGhz: number;
  txPowerDbm: number;
  antennaGainDbi: number;
  cableLossDb: number;
};

export type LinkBudgetResult = {
  fsplDb: number;
  rslDbm: number;
  fadeMarginDb: number;
};

export function calculateDistanceKm(a: Coordinate, b: Coordinate) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const haversine =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return round(2 * earthRadiusKm * Math.asin(Math.sqrt(haversine)), 2);
}

export function calculateLinkBudget(input: LinkBudgetInput): LinkBudgetResult {
  const safeDistance = Math.max(input.distanceKm, 0.001);
  const fsplDb =
    92.45 +
    20 * Math.log10(safeDistance) +
    20 * Math.log10(input.frequencyGhz);
  const rslDbm =
    input.txPowerDbm +
    input.antennaGainDbi * 2 -
    input.cableLossDb * 2 -
    fsplDb;

  return {
    fsplDb: round(fsplDb, 1),
    rslDbm: round(rslDbm, 1),
    fadeMarginDb: round(Math.max(0, rslDbm + 80), 1),
  };
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function round(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
