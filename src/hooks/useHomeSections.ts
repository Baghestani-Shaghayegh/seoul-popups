import { useMemo } from 'react';
import { usePopups } from './usePopups';
import { isActiveToday } from '@/lib/popupStatus';
import { NEIGHBORHOODS, type Neighborhood, type Popup } from '@/types/popup';

const ENDING_SOON_LIMIT = 6;

export interface HomeSections {
  liveCount: number;
  featured: Popup | null;
  endingSoon: Popup[];
  countsByArea: Record<Neighborhood, number>;
}

/**
 * Derives the curated Home screen sections from the popup list.
 * Same data source as everything else (usePopups), so it goes live with Supabase
 * automatically.
 */
export function useHomeSections(): HomeSections {
  const { popups } = usePopups({});

  return useMemo(() => {
    const live = popups.filter(isActiveToday);

    const endingSoon = [...live]
      .sort((a, b) => a.endDate.localeCompare(b.endDate))
      .slice(0, ENDING_SOON_LIMIT);

    const countsByArea = NEIGHBORHOODS.reduce(
      (acc, n) => {
        acc[n] = live.filter((p) => p.neighborhood === n).length;
        return acc;
      },
      {} as Record<Neighborhood, number>,
    );

    return {
      liveCount: live.length,
      featured: live[0] ?? null,
      endingSoon,
      countsByArea,
    };
  }, [popups]);
}
