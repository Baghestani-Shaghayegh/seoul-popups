import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

const STORAGE_KEY = 'visited:v1';

interface VisitedValue {
  visitedIds: string[];
  isVisited: (id: string) => boolean;
  toggleVisited: (id: string) => void;
}

const VisitedContext = createContext<VisitedValue | null>(null);

/**
 * Locally persisted "been there" marks (phase 2). Mirrors FavoritesProvider —
 * when accounts land, swap AsyncStorage for a per-user Supabase table and the
 * hook API stays the same so screens won't change.
 */
export function VisitedProvider({ children }: { children: React.ReactNode }) {
  const [visitedIds, setVisitedIds] = useState<string[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (!raw) return;
      try {
        const ids = JSON.parse(raw);
        if (Array.isArray(ids))
          setVisitedIds(ids.filter((x) => typeof x === 'string'));
      } catch {
        // Corrupt payload — start fresh rather than crash.
      }
    });
  }, []);

  const toggleVisited = useCallback((id: string) => {
    setVisitedIds((prev) => {
      const next = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id];
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const value = useMemo<VisitedValue>(
    () => ({
      visitedIds,
      isVisited: (id) => visitedIds.includes(id),
      toggleVisited,
    }),
    [visitedIds, toggleVisited],
  );

  return (
    <VisitedContext.Provider value={value}>{children}</VisitedContext.Provider>
  );
}

export function useVisited(): VisitedValue {
  const ctx = useContext(VisitedContext);
  if (!ctx) {
    throw new Error('useVisited must be used inside VisitedProvider');
  }
  return ctx;
}
