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
  /** Straight-line distance from the previous stop (0 for the first, and for
   *  the first stop of a new neighbourhood — you take the subway, not walk). */
  walkFromPrevMeters: number;
  /** Estimated walking minutes from the previous stop (0 for the first). */
  walkFromPrevMin: number;
  /**
   * First stop in a new neighbourhood, reached by subway rather than on foot.
   * Without this a Seongsu -> Hongdae hop rendered as a ~150 minute walk,
   * which is why the planner used to refuse to cross areas at all.
   */
  startsNewArea?: boolean;
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

/** Mean position of a group — good enough to order neighbourhoods sensibly. */
function centroid(popups: Popup[]): LatLng {
  const n = popups.length;
  return {
    latitude: popups.reduce((s, p) => s + p.latitude, 0) / n,
    longitude: popups.reduce((s, p) => s + p.longitude, 0) / n,
  };
}

/**
 * Shortest walking order we can cheaply find: a nearest-neighbor pass from
 * *every* possible start, keeping the smallest total distance. Avoids the
 * back-and-forth a single fixed start causes. Straight-line estimates until a
 * real routing API is wired in.
 */
function bestWalkingOrder(popups: Popup[]): Popup[] {
  if (popups.length < 2) return popups;
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
  return best;
}

/**
 * Order the selected popups into a day.
 *
 * Walking optimisation happens WITHIN a neighbourhood only. Seoul's areas are
 * kilometres apart, so treating the whole selection as one walk produced
 * routes like "Seongsu -> Hongdae, 150 min walk". Areas are visited in
 * nearest-centroid order and the first stop in each new one is marked
 * `startsNewArea`, for the UI to show as a subway leg rather than a walk.
 */
export function buildRoute(popups: Popup[]): RouteStop[] {
  if (popups.length === 0) return [];

  // Group by neighbourhood, preserving first-seen order as the tie-break.
  const groups = new Map<string, Popup[]>();
  for (const p of popups) {
    const g = groups.get(p.neighborhood);
    if (g) g.push(p);
    else groups.set(p.neighborhood, [p]);
  }

  // Visit areas nearest-first from the largest one, so the bulk of the day
  // anchors the route rather than a single outlying stop.
  const areas = [...groups.values()].sort((a, b) => b.length - a.length);
  const ordered: Popup[][] = [];
  const remaining = areas.slice(1);
  let current = areas[0];
  ordered.push(current);
  while (remaining.length) {
    const from = centroid(current);
    let bestPos = 0;
    let bestDist = Infinity;
    remaining.forEach((g, i) => {
      const d = haversineMeters(from, centroid(g));
      if (d < bestDist) {
        bestDist = d;
        bestPos = i;
      }
    });
    current = remaining[bestPos];
    ordered.push(current);
    remaining.splice(bestPos, 1);
  }

  const stops: RouteStop[] = [];
  ordered.forEach((group, gi) => {
    bestWalkingOrder(group).forEach((popup, i) => {
      const newArea = gi > 0 && i === 0;
      const prev = i > 0 ? stops[stops.length - 1].popup : null;
      const meters = prev ? haversineMeters(prev, popup) : 0;
      stops.push({
        popup,
        walkFromPrevMeters: meters,
        walkFromPrevMin: prev ? walkingMinutes(meters) : 0,
        ...(newArea ? { startsNewArea: true } : {}),
      });
    });
  });
  return stops;
}

/** Total estimated walking minutes across all hops in a route. */
export function totalWalkMinutes(stops: RouteStop[]): number {
  return stops.reduce((sum, s) => sum + s.walkFromPrevMin, 0);
}
