import { useMemo } from 'react';
import { MOCK_POPUPS } from '@/data/mockPopups';
import type { DateRange } from '@/lib/dateRanges';
import { matchesStatus, type PopupStatus } from '@/lib/popupStatus';
import type { Category, Neighborhood, Popup } from '@/types/popup';

export interface PopupFilters {
  /** empty/undefined = all neighborhoods */
  neighborhoods?: Neighborhood[];
  /** empty/undefined = all categories */
  categories?: Category[];
  /** empty/undefined = any status; matches if ANY selected status matches */
  statuses?: PopupStatus[];
  /** show popups whose run overlaps this range. null/undefined = any date */
  dateRange?: DateRange | null;
  /** free-text search over name / tagline / neighborhood / category. '' = none */
  query?: string;
}

interface UsePopupsResult {
  popups: Popup[];
  loading: boolean;
  error: string | null;
}

function matchesQuery(popup: Popup, q: string): boolean {
  const haystack =
    `${popup.name} ${popup.tagline} ${popup.neighborhood} ${popup.category}`.toLowerCase();
  return haystack.includes(q);
}

function overlapsRange(popup: Popup, range: DateRange): boolean {
  return popup.startDate <= range.end && popup.endDate >= range.start;
}

/**
 * Returns popups filtered by neighborhoods, categories, statuses, date range,
 * and a text query. Each facet is OR within itself, AND across facets.
 *
 * Currently backed by MOCK_POPUPS. To go live, swap the source for a Supabase
 * query (see src/lib/supabase.ts) — keep this same return shape and the
 * screens won't need to change.
 */
export function usePopups(filters: PopupFilters): UsePopupsResult {
  const query = filters.query?.trim().toLowerCase() ?? '';
  const neighborhoods = filters.neighborhoods ?? [];
  const categories = filters.categories ?? [];
  const statuses = filters.statuses ?? [];
  const dateRange = filters.dateRange ?? null;

  // Stable primitive keys so the memo only recomputes when selections change.
  const neighborhoodsKey = neighborhoods.join(',');
  const categoriesKey = categories.join(',');
  const statusesKey = statuses.join(',');
  const rangeKey = dateRange ? `${dateRange.start}:${dateRange.end}` : '';

  const popups = useMemo(() => {
    return MOCK_POPUPS.filter((p) => {
      if (neighborhoods.length && !neighborhoods.includes(p.neighborhood)) {
        return false;
      }
      if (categories.length && !categories.includes(p.category)) {
        return false;
      }
      if (statuses.length && !statuses.some((s) => matchesStatus(p, s))) {
        return false;
      }
      if (dateRange && !overlapsRange(p, dateRange)) {
        return false;
      }
      if (query && !matchesQuery(p, query)) {
        return false;
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [neighborhoodsKey, categoriesKey, statusesKey, rangeKey, query]);

  return { popups, loading: false, error: null };
}
