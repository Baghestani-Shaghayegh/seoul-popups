import { useEffect, useMemo, useState } from 'react';
import { MOCK_POPUPS } from '@/data/mockPopups';
import type { DateRange } from '@/lib/dateRanges';
import { matchesStatus, type PopupStatus } from '@/lib/popupStatus';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import type {
  Category,
  Neighborhood,
  Popup,
} from '@/types/popup';

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

interface UsePopupResult {
  popup: Popup | null;
  loading: boolean;
  error: string | null;
}

/**
 * Explicit column list — never `select('*')` (SECURITY.md §2). Editorial /
 * provenance columns (source_url, link-out URLs not yet in the Popup type) are
 * deliberately omitted; add them here when a screen needs them.
 */
const POPUP_COLUMNS =
  'id,name,tagline,description,neighborhood,category,image_url,' +
  'start_date,end_date,hours,' +
  'subway_line,subway_station,subway_exit,subway_walk_minutes,' +
  'latitude,longitude,reservable';

/** A raw `popups` row as PostgREST returns it (snake_case). */
interface PopupRow {
  id: string;
  name: string;
  tagline: string;
  description: string;
  neighborhood: Neighborhood;
  category: Category;
  image_url: string;
  start_date: string;
  end_date: string;
  hours: string;
  subway_line: string;
  subway_station: string;
  subway_exit: string;
  subway_walk_minutes: number;
  latitude: number;
  longitude: number;
  reservable: boolean;
}

/** Map a DB row (snake_case) to the camelCase domain `Popup` the UI consumes. */
function rowToPopup(row: PopupRow): Popup {
  return {
    id: row.id,
    name: row.name,
    tagline: row.tagline,
    description: row.description,
    neighborhood: row.neighborhood,
    category: row.category,
    imageUrl: row.image_url,
    startDate: row.start_date,
    endDate: row.end_date,
    hours: row.hours,
    subway: {
      line: row.subway_line,
      station: row.subway_station,
      exit: row.subway_exit,
      walkMinutes: row.subway_walk_minutes,
    },
    latitude: row.latitude,
    longitude: row.longitude,
    reservable: row.reservable,
  };
}

// ---------------------------------------------------------------------------
// Shared fetch: the whole catalogue is small (tens of rows), so we fetch it
// once and filter in memory — this keeps the exact filter semantics below
// (status depends on "today", which is awkward in SQL) and means the 5 call
// sites share a single network request instead of each firing their own.
// ---------------------------------------------------------------------------

let cache: Popup[] | null = null;
let inflight: Promise<Popup[]> | null = null;

function fetchAllPopups(): Promise<Popup[]> {
  if (cache) return Promise.resolve(cache);
  if (inflight) return inflight;

  inflight = (async () => {
    const { data, error } = await getSupabase()
      .from('popups')
      .select(POPUP_COLUMNS)
      .order('end_date', { ascending: true });
    if (error) throw new Error(error.message);
    cache = (data as unknown as PopupRow[]).map(rowToPopup);
    return cache;
  })();

  // Clear the in-flight handle whether it resolves or rejects, so a failed
  // load can be retried on the next mount instead of being stuck.
  inflight.finally(() => {
    inflight = null;
  });

  return inflight;
}

/**
 * Loads the full popup catalogue once (shared cache). When Supabase isn't
 * configured (no `.env`), falls back to bundled mock data so the app still
 * runs in development.
 */
function useAllPopups(): UsePopupsResult {
  const [state, setState] = useState<UsePopupsResult>(() =>
    cache
      ? { popups: cache, loading: false, error: null }
      : { popups: [], loading: isSupabaseConfigured, error: null },
  );

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setState({ popups: MOCK_POPUPS, loading: false, error: null });
      return;
    }
    if (cache) {
      setState({ popups: cache, loading: false, error: null });
      return;
    }

    let active = true;
    setState({ popups: [], loading: true, error: null });
    fetchAllPopups()
      .then((popups) => {
        if (active) setState({ popups, loading: false, error: null });
      })
      .catch((e: unknown) => {
        if (active) {
          setState({
            popups: [],
            loading: false,
            error: e instanceof Error ? e.message : 'Failed to load popups',
          });
        }
      });
    return () => {
      active = false;
    };
  }, []);

  return state;
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
 * Data comes from Supabase (shared cache in useAllPopups); filtering stays
 * client-side so the screens' filter behaviour is unchanged from the mock era.
 */
export function usePopups(filters: PopupFilters): UsePopupsResult {
  const { popups: all, loading, error } = useAllPopups();

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
    return all.filter((p) => {
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
  }, [all, neighborhoodsKey, categoriesKey, statusesKey, rangeKey, query]);

  return { popups, loading, error };
}

/**
 * Returns a single popup by id (null if unknown), sourced from the same shared
 * catalogue as usePopups so opening a detail screen reuses the cached fetch.
 */
export function usePopup(id: string | undefined): UsePopupResult {
  const { popups, loading, error } = useAllPopups();
  const popup = useMemo(
    () => popups.find((p) => p.id === id) ?? null,
    [popups, id],
  );
  return { popup, loading, error };
}
