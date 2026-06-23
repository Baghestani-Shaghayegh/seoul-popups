import type { Popup } from '@/types/popup';

/** Average walking pace in meters per minute (~4.8 km/h). */
const WALK_METERS_PER_MIN = 80;

interface LatLng {
  latitude: number;
  longitude: number;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Great-circle distance in meters between two coordinates. */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const R = 6_371_000;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Rough walking time for a straight-line distance (min 1 minute). */
export function walkingMinutes(meters: number): number {
  return Math.max(1, Math.round(meters / WALK_METERS_PER_MIN));
}

export interface RouteStop {
  popup: Popup;
  /** Straight-line distance from the previous stop (0 for the first). */
  walkFromPrevMeters: number;
  /** Estimated walking minutes from the previous stop (0 for the first). */
  walkFromPrevMin: number;
}

/** Nearest-neighbor ordering starting from a given index. */
function nearestNeighborOrder(popups: Popup[], startIdx: number): Popup[] {
  const remaining = popups.map((_, i) => i).filter((i) => i !== startIdx);
  const order: Popup[] = [popups[startIdx]];
  let current = startIdx;

  while (remaining.length > 0) {
    let bestPos = 0;
    let bestDist = Infinity;
    remaining.forEach((idx, pos) => {
      const d = haversineMeters(popups[current], popups[idx]);
      if (d < bestDist) {
        bestDist = d;
        bestPos = pos;
      }
    });
    current = remaining[bestPos];
    order.push(popups[current]);
    remaining.splice(bestPos, 1);
  }
  return order;
}

/** Total straight-line distance along an ordered list of stops. */
function totalDistance(order: Popup[]): number {
  let sum = 0;
  for (let i = 1; i < order.length; i++) {
    sum += haversineMeters(order[i - 1], order[i]);
  }
  return sum;
}

/**
 * Order the selected popups into the shortest walking route we can cheaply find:
 * run a nearest-neighbor pass from *every* possible starting popup and keep the
 * order with the smallest total distance. This avoids the back-and-forth a
 * single fixed start can cause. Distances are straight-line estimates until we
 * wire in a real routing API.
 */
export function buildRoute(popups: Popup[]): RouteStop[] {
  if (popups.length === 0) return [];

  let best = popups;
  let bestDist = Infinity;
  for (let s = 0; s < popups.length; s++) {
    const order = nearestNeighborOrder(popups, s);
    const d = totalDistance(order);
    if (d < bestDist) {
      bestDist = d;
      best = order;
    }
  }

  return best.map((popup, i) => {
    const prev = i > 0 ? best[i - 1] : null;
    const meters = prev ? haversineMeters(prev, popup) : 0;
    return {
      popup,
      walkFromPrevMeters: meters,
      walkFromPrevMin: prev ? walkingMinutes(meters) : 0,
    };
  });
}

/** Total estimated walking minutes across all hops in a route. */
export function totalWalkMinutes(stops: RouteStop[]): number {
  return stops.reduce((sum, s) => sum + s.walkFromPrevMin, 0);
}
