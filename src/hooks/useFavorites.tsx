import { createContext, useContext, useMemo } from 'react';

import { useSyncedIdSet } from '@/hooks/useSyncedIdSet';

interface FavoritesValue {
  favoriteIds: string[];
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
}

const FavoritesContext = createContext<FavoritesValue | null>(null);

/**
 * Favorites: local for guests, synced to `user_favorites` when signed in
 * (merged on sign-in). Backed by the shared useSyncedIdSet.
 */
export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { ids, has, toggle } = useSyncedIdSet('favorites:v1', 'user_favorites');

  const value = useMemo<FavoritesValue>(
    () => ({ favoriteIds: ids, isFavorite: has, toggleFavorite: toggle }),
    [ids, has, toggle],
  );

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites(): FavoritesValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) {
    throw new Error('useFavorites must be used inside FavoritesProvider');
  }
  return ctx;
}
