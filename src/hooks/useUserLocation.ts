import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';

export type LocationPermission = 'undetermined' | 'granted' | 'denied';

export interface UserCoords {
  latitude: number;
  longitude: number;
}

export interface UseUserLocation {
  coords: UserCoords | null;
  permission: LocationPermission;
  locating: boolean;
  /** Request permission if needed, then fetch the current position. */
  locate: () => Promise<UserCoords | null>;
}

/**
 * Foreground location for the "near me" flow. Never prompts on mount — if the
 * user already granted access on a past visit we read their position silently,
 * otherwise we wait for an explicit `locate()` (a button tap) before asking.
 */
export function useUserLocation(): UseUserLocation {
  const [coords, setCoords] = useState<UserCoords | null>(null);
  const [permission, setPermission] =
    useState<LocationPermission>('undetermined');
  const [locating, setLocating] = useState(false);

  const fetchPosition = useCallback(async (): Promise<UserCoords | null> => {
    setLocating(true);
    try {
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const next = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      };
      setCoords(next);
      return next;
    } catch {
      return null;
    } finally {
      setLocating(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (!active) return;
      if (status === 'granted') {
        setPermission('granted');
        void fetchPosition();
      } else if (status === 'denied') {
        setPermission('denied');
      }
    })();
    return () => {
      active = false;
    };
  }, [fetchPosition]);

  const locate = useCallback(async (): Promise<UserCoords | null> => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      setPermission('granted');
      return fetchPosition();
    }
    setPermission('denied');
    return null;
  }, [fetchPosition]);

  return { coords, permission, locating, locate };
}
