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

/**
 * Order the selected popups into a walking route using a nearest-neighbor
 * heuristic (start at the first popup, repeatedly hop to the closest unvisited
 * one). Good enough for a handful of nearby stops; distances are straight-line
 * estimates until we wire in a real routing API.
 */
export function buildRoute(popups: Popup[]): RouteStop[] {
  if (popups.length === 0) return [];

  const remaining = [...popups];
  const ordered: Popup[] = [remaining.shift()!];

  while (remaining.length > 0) {
    const last = ordered[ordered.length - 1];
    let bestIdx = 0;
    let bestDist = Infinity;
    remaining.forEach((p, i) => {
      const d = haversineMeters(last, p);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    });
    ordered.push(remaining.splice(bestIdx, 1)[0]);
  }

  return ordered.map((popup, i) => {
    const prev = i > 0 ? ordered[i - 1] : null;
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
