import { useMemo } from 'react';

import { usePopups } from './usePopups';
import { isActiveOn } from '@/lib/popupStatus';
import { todayIso } from '@/lib/format';
import { NEIGHBORHOODS, type Neighborhood } from '@/types/popup';

export interface NeighborhoodCounts {
  /** Live pop-ups per neighbourhood on `dateIso`. Always has every key. */
  counts: Record<Neighborhood, number>;
  /** Neighbourhoods with at least one — for suggesting somewhere that isn't empty. */
  nonEmpty: Neighborhood[];
  loading: boolean;
}

/**
 * How many pop-ups each neighbourhood actually has on a given day.
 *
 * A neighbourhood running dry is a normal state, not a bug: Seoul's pop-up
 * scene is concentrated in Seongsu, and Gangnam in particular goes empty
 * between runs. Surfacing the count on the filter itself means a visitor never
 * taps into a dead end and wonders whether the app is broken.
 */
export function useNeighborhoodCounts(
  dateIso: string = todayIso(),
): NeighborhoodCounts {
  const { popups, loading } = usePopups({});

  return useMemo(() => {
    const counts = Object.fromEntries(
      NEIGHBORHOODS.map((n) => [n, 0]),
    ) as Record<Neighborhood, number>;

    for (const p of popups) {
      if (isActiveOn(p, dateIso)) counts[p.neighborhood] += 1;
    }

    return {
      counts,
      nonEmpty: NEIGHBORHOODS.filter((n) => counts[n] > 0),
      loading,
    };
  }, [popups, dateIso, loading]);
}
