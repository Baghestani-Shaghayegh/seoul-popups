import { useMemo } from 'react';
import { usePopups } from './usePopups';
import { todayIso } from '@/lib/format';
import { isActiveOn, isActiveToday, isEndingSoon } from '@/lib/popupStatus';
import type { Popup } from '@/types/popup';

const RAIL_LIMIT = 6;
// "Ending soon" should mean actually soon — a pop-up with weeks left isn't
// urgent. Two weeks is the window; the rail hides itself when nothing qualifies.
const ENDING_SOON_DAYS = 14;

export interface HomeSections {
  liveCount: number;
  featured: Popup | null;
  /** Pop-ups running on the day picked in the day strip. */
  dayPicks: Popup[];
  endingSoon: Popup[];
  /** Passed through from usePopups so Home can show loading/error/retry. */
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/**
 * Derives the curated Home screen sections from the popup list.
 * Same data source as everything else (usePopups), so it goes live with Supabase
 * automatically.
 */
export function useHomeSections(
  selectedDateIso: string = todayIso(),
): HomeSections {
  const { popups, loading, error, reload } = usePopups({});

  const sections = useMemo(() => {
    const live = popups.filter(isActiveToday);

    const dayPicks = popups
      .filter((p) => isActiveOn(p, selectedDateIso))
      .slice(0, RAIL_LIMIT);

    const endingSoon = live
      .filter((p) => isEndingSoon(p, ENDING_SOON_DAYS))
      .sort((a, b) => a.endDate.localeCompare(b.endDate))
      .slice(0, RAIL_LIMIT);

    return {
      liveCount: live.length,
      featured: live[0] ?? null,
      dayPicks,
      endingSoon,
    };
  }, [popups, selectedDateIso]);

  return { ...sections, loading, error, reload };
}
