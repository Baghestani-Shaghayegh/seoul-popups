import { Ionicons } from '@expo/vector-icons';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import MapView, {
  Marker,
  Polyline,
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

/** The visible map viewport: a centre plus the span it covers. */
export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

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

/**
 * Pop-ups at the same address stack pixel-perfect, so the map silently shows
 * fewer pins than the list (three Hongdae pop-ups share one coordinate). Group
 * them so one pin can stand for all of them and say how many. The ~11m bucket
 * only catches genuinely co-located pins — near neighbours stay separate.
 */
function groupByCoordinate(popups: Popup[]): Popup[][] {
  const groups = new Map<string, Popup[]>();
  for (const p of popups) {
    const key = `${p.latitude.toFixed(4)},${p.longitude.toFixed(4)}`;
    const existing = groups.get(key);
    if (existing) existing.push(p);
    else groups.set(key, [p]);
  }
  return [...groups.values()];
}

function PopupPin({
  popup,
  selected,
  onPress,
  orderNumber,
  count = 1,
}: {
  popup: Popup;
  selected: boolean;
  onPress: () => void;
  /** When set (Plan-my-day preview), shows the stop's position instead of a category icon. */
  orderNumber?: number;
  /** How many pop-ups this pin stands for; >1 draws a count badge. */
  count?: number;
}) {
  const tracking = useBriefTracking(`${selected}:${orderNumber ?? ''}:${count}`);
  const size = selected ? 42 : 34;
  const bg = selected ? colors.purple.DEFAULT : colors.brand.DEFAULT;
  return (
    <Marker
      coordinate={{ latitude: popup.latitude, longitude: popup.longitude }}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={tracking}
      onPress={onPress}
      // zIndex lifts the selected pin above neighbours (Seongsu popups overlap).
      zIndex={selected ? 10 : 1}
    >
      {/* Padded wrapper so the count badge sits inside the marker's measured
          bounds — overflowing it gets clipped on Android. */}
      <View
        style={{
          width: size + 14,
          height: size + 14,
          alignItems: 'center',
          justifyContent: 'center',
        }}
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
          {orderNumber ? (
            <Text
              style={{
                color: '#fff',
                fontWeight: '800',
                fontSize: selected ? 17 : 14,
              }}
            >
              {orderNumber}
            </Text>
          ) : (
            <Ionicons
              name={CATEGORY_ICON[popup.category]}
              size={selected ? 20 : 16}
              color="#fff"
            />
          )}
        </View>
        {count > 1 && (
          <View
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              minWidth: 19,
              height: 19,
              borderRadius: 9.5,
              paddingHorizontal: 3,
              backgroundColor: selected
                ? colors.brand.DEFAULT
                : colors.purple.DEFAULT,
              borderWidth: 2,
              borderColor: '#fff',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 10 }}>
              {count}
            </Text>
          </View>
        )}
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
  /** Plan-my-day preview: draws a walking route line under the pins. */
  routeCoords?: { latitude: number; longitude: number }[];
  /** Dashes the route line — used when routeCoords is a straight-line
   *  estimate rather than a real walking path, so the map is honest about
   *  which kind of line it's showing. */
  routeDashed?: boolean;
  /** Plan-my-day preview: popup id → stop number, shown on the pin instead
   *  of the category icon. */
  stopOrder?: Record<string, number>;
  /** Fires with the newly visible region after the *user* pans or zooms.
   *  Our own animations are filtered out — see `animate` below. */
  onUserRegionChange?: (region: MapRegion) => void;
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
  function PopupMapView(
    {
      popups,
      selectedId,
      onSelect,
      showUser,
      routeCoords,
      routeDashed,
      stopOrder,
      onUserRegionChange,
    },
    ref,
  ) {
    const mapRef = useRef<MapView>(null);
    const didAutoFit = useRef(false);
    const settledAt = useRef(0);

    const initialRegion = useMemo(() => regionForPopups(popups), [popups]);

    // Plan-my-day numbers each stop, so merging two stops into one pin would
    // lose a number — only stack pins on the plain map.
    const pinGroups = useMemo(
      () => (stopOrder ? popups.map((p) => [p]) : groupByCoordinate(popups)),
      [popups, stopOrder],
    );

    // Every move we make ourselves — auto-fit, recenter, select — also fires
    // onRegionChangeComplete, which would look exactly like the user panning.
    // `isGesture` would tell them apart but it's Google-Maps-only (so never on
    // iOS), hence the time window: ignore region reports until our animation
    // has finished settling.
    const animate = useCallback((region: Region, duration = 350) => {
      settledAt.current = Date.now() + duration + 400;
      mapRef.current?.animateToRegion(region, duration);
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        centerOn(coords) {
          animate({ ...coords, latitudeDelta: 0.02, longitudeDelta: 0.02 });
        },
      }),
      [animate],
    );

    // Frame all popups once. An animateToRegion too soon after mount is
    // dropped natively, and onMapReady isn't reliably called on iOS / Apple
    // Maps — the old fix was a blind 500ms timer, which still lost the race
    // and left the map zoomed out over the whole city on open. A settled
    // region report is proof the map is live, so fit from there instead, with
    // the timer kept as a fallback for the case where the map settles before
    // the popups have loaded. The ref guard keeps it to a single fit so it
    // never fights the user's panning; re-planning remounts the map.
    const fitOnce = useCallback(() => {
      if (didAutoFit.current || popups.length === 0) return;
      didAutoFit.current = true;

      // fitToCoordinates rather than a computed region: the popups spread
      // east-west (Hongdae to Seongsu) while the phone is tall and narrow, and
      // setting that wide region makes iOS expand the north-south span to match
      // the viewport's aspect — which zoomed out to the whole metro area and
      // left every pin a speck. fitToCoordinates does the aspect maths itself.
      // A single (or co-located) popup has no span to fit and would slam the
      // camera to street level, so that case keeps the floored region.
      const spread =
        Math.max(...popups.map((p) => p.latitude)) -
          Math.min(...popups.map((p) => p.latitude)) +
        (Math.max(...popups.map((p) => p.longitude)) -
          Math.min(...popups.map((p) => p.longitude)));
      if (spread < 0.005) {
        animate(regionForPopups(popups));
        return;
      }

      // Generous window: fitToCoordinates' animation runs longer than a plain
      // animateToRegion and reports its region more than once, and any report
      // that escapes this is read as a user pan — which pops "Search this
      // area" on open, before the map has been touched.
      settledAt.current = Date.now() + 1500;
      mapRef.current?.fitToCoordinates(
        popups.map((p) => ({ latitude: p.latitude, longitude: p.longitude })),
        {
          // mapPadding already reserves the search / sheet chrome, so this is
          // just breathing room so edge pins aren't flush to the bezel.
          edgePadding: { top: 48, right: 48, bottom: 48, left: 48 },
          animated: true,
        },
      );
    }, [popups, animate]);

    useEffect(() => {
      if (didAutoFit.current || popups.length === 0) return;
      const t = setTimeout(fitOnce, 500);
      return () => clearTimeout(t);
    }, [popups, fitOnce]);

    // Center on the selected popup (e.g. when picked from the list below).
    useEffect(() => {
      if (!selectedId) return;
      const p = popups.find((x) => x.id === selectedId);
      if (!p) return;
      animate({
        latitude: p.latitude,
        longitude: p.longitude,
        latitudeDelta: 0.012,
        longitudeDelta: 0.012,
      });
    }, [selectedId, popups, animate]);

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
        // The compass sat over the route sheet and rotated into view on any
        // stray two-finger twist; there is nothing here that needs a heading.
        showsCompass={false}
        // room for the search bar (top) and the nearby sheet (bottom)
        mapPadding={{ top: 80, right: 0, bottom: 220, left: 0 }}
        onRegionChangeComplete={(region, details) => {
          // First settled region = the map is live and will accept a move.
          if (!didAutoFit.current) {
            fitOnce();
            return;
          }
          if (details?.isGesture === false) return;
          if (Date.now() < settledAt.current) return;
          onUserRegionChange?.(region);
        }}
      >
        {routeCoords && routeCoords.length > 1 && (
          <Polyline
            coordinates={routeCoords}
            strokeColor={colors.purple.DEFAULT}
            strokeWidth={4}
            lineCap="round"
            lineJoin="round"
            lineDashPattern={routeDashed ? [10, 8] : undefined}
          />
        )}
        {pinGroups.map((group) => (
          <PopupPin
            key={group[0].id}
            popup={group[0]}
            count={group.length}
            selected={group.some((p) => p.id === selectedId)}
            // Tapping a stack walks through it, so every pop-up underneath is
            // reachable; for a lone pin this is just "select it".
            onPress={() => {
              const i = group.findIndex((p) => p.id === selectedId);
              onSelect(group[(i + 1) % group.length].id);
            }}
            orderNumber={stopOrder?.[group[0].id]}
          />
        ))}
      </MapView>
    );
  },
);
