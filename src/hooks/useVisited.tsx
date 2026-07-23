import { createContext, useContext, useMemo } from 'react';

import { useSyncedIdSet } from '@/hooks/useSyncedIdSet';

interface VisitedValue {
  visitedIds: string[];
  isVisited: (id: string) => boolean;
  toggleVisited: (id: string) => void;
}

const VisitedContext = createContext<VisitedValue | null>(null);

/**
 * "Been there" marks: local for guests, synced to `user_visited` when signed in
 * (merged on sign-in). Backed by the shared useSyncedIdSet.
 */
export function VisitedProvider({ children }: { children: React.ReactNode }) {
  const { ids, has, toggle } = useSyncedIdSet('visited:v1', 'user_visited');

  const value = useMemo<VisitedValue>(
    () => ({ visitedIds: ids, isVisited: has, toggleVisited: toggle }),
    [ids, has, toggle],
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
