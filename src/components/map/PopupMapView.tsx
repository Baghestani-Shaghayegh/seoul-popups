import { Ionicons } from '@expo/vector-icons';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import MapView, {
  Marker,
  PROVIDER_DEFAULT,
  PROVIDER_GOOGLE,
  type Region,
} from 'react-native-maps';

import { colors } from '@/constants/theme';
import type { UserCoords } from '@/hooks/useUserLocation';
import type { Category, Popup } from '@/types/popup';

/** Category → pin glyph. A small differentiator: pins read at a glance. */
const CATEGORY_ICON: Record<Category, keyof typeof Ionicons.glyphMap> = {
  Fashion: 'shirt',
  Beauty: 'sparkles',
  Food: 'restaurant',
  Art: 'color-palette',
  Lifestyle: 'bag-handle',
};

/** Fallback view over central Seoul when there are no popups to frame. */
const SEOUL_REGION: Region = {
  latitude: 37.5442,
  longitude: 127.0557,
  latitudeDelta: 0.16,
  longitudeDelta: 0.16,
};

/** A region that frames every popup with a little breathing room. */
function regionForPopups(popups: Popup[]): Region {
  if (popups.length === 0) return SEOUL_REGION;
  const lats = popups.map((p) => p.latitude);
  const lngs = popups.map((p) => p.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    // pad the span; floor it so a single/co-located point still zooms sanely
    latitudeDelta: Math.max((maxLat - minLat) * 1.6, 0.02),
    longitudeDelta: Math.max((maxLng - minLng) * 1.6, 0.02),
  };
}

/**
 * react-native-maps only repaints a custom marker view while
 * `tracksViewChanges` is true, but leaving it on tanks frame rate. Turn it on
 * for a beat whenever the pin's appearance (`dep`) changes, then back off.
 */
function useBriefTracking(dep: unknown): boolean {
  const [tracking, setTracking] = useState(true);
  useEffect(() => {
    setTracking(true);
    const t = setTimeout(() => setTracking(false), 400);
    return () => clearTimeout(t);
  }, [dep]);
  return tracking;
}

function PopupPin({
  popup,
  selected,
  onPress,
}: {
  popup: Popup;
  selected: boolean;
  onPress: (id: string) => void;
}) {
  const tracking = useBriefTracking(selected);
  const size = selected ? 42 : 34;
  const bg = selected ? colors.purple.DEFAULT : colors.brand.DEFAULT;
  return (
    <Marker
      coordinate={{ latitude: popup.latitude, longitude: popup.longitude }}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={tracking}
      onPress={() => onPress(popup.id)}
      // zIndex lifts the selected pin above neighbours (Seongsu popups overlap).
      zIndex={selected ? 10 : 1}
    >
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
          borderWidth: 3,
          borderColor: '#fff',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#462846',
          shadowOpacity: 0.3,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 2 },
          elevation: 5,
        }}
      >
        <Ionicons
          name={CATEGORY_ICON[popup.category]}
          size={selected ? 20 : 16}
          color="#fff"
        />
      </View>
    </Marker>
  );
}

export interface PopupMapViewProps {
  popups: Popup[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Show the device's blue location dot (only once permission is granted). */
  showUser?: boolean;
}

/** Imperative handle so the screen can recenter the map on "near me". */
export interface PopupMapHandle {
  centerOn: (coords: UserCoords) => void;
}

/**
 * The live map: branded category pins for each popup, tap-to-select. iOS uses
 * Apple Maps (English labels, no key); Android uses Google (key via
 * app.config.js). Native only — the web build resolves PopupMapView.web.tsx.
 */
export const PopupMapView = forwardRef<PopupMapHandle, PopupMapViewProps>(
  function PopupMapView({ popups, selectedId, onSelect, showUser }, ref) {
    const mapRef = useRef<MapView>(null);
    const didAutoFit = useRef(false);

    const initialRegion = useMemo(() => regionForPopups(popups), [popups]);

    useImperativeHandle(
      ref,
      () => ({
        centerOn(coords) {
          mapRef.current?.animateToRegion(
            { ...coords, latitudeDelta: 0.02, longitudeDelta: 0.02 },
            350,
          );
        },
      }),
      [],
    );

    // Frame all popups once they've loaded (they may arrive after first render).
    useEffect(() => {
      if (didAutoFit.current || popups.length === 0) return;
      didAutoFit.current = true;
      mapRef.current?.animateToRegion(regionForPopups(popups), 350);
    }, [popups]);

    // Center on the selected popup (e.g. when picked from the list below).
    useEffect(() => {
      if (!selectedId) return;
      const p = popups.find((x) => x.id === selectedId);
      if (!p) return;
      mapRef.current?.animateToRegion(
        {
          latitude: p.latitude,
          longitude: p.longitude,
          latitudeDelta: 0.012,
          longitudeDelta: 0.012,
        },
        350,
      );
    }, [selectedId, popups]);

    return (
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        // Google on Android; Apple on iOS (English Korea labels, no key)
        provider={
          Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT
        }
        initialRegion={initialRegion}
        showsUserLocation={showUser}
        showsMyLocationButton={false}
        // room for the search bar (top) and the nearby sheet (bottom)
        mapPadding={{ top: 80, right: 0, bottom: 220, left: 0 }}
      >
        {popups.map((p) => (
          <PopupPin
            key={p.id}
            popup={p}
            selected={p.id === selectedId}
            onPress={onSelect}
          />
        ))}
      </MapView>
    );
  },
);
