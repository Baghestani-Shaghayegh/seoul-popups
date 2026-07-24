import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Share,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  PopupMapView,
  type PopupMapHandle,
} from '@/components/map/PopupMapView';
import { Chip } from '@/components/ui/Chip';
import { DatePickerSheet } from '@/components/plan/DatePickerSheet';
import { SelectablePopupRow } from '@/components/plan/SelectablePopupRow';
import { usePopups } from '@/hooks/usePopups';
import { useUserLocation } from '@/hooks/useUserLocation';
import { useWalkingRoute } from '@/hooks/useWalkingRoute';
import { buildRoute, totalWalkMinutes, type RouteStop } from '@/lib/route';
import { formatWeekdayDate, todayIso } from '@/lib/format';
import { colors } from '@/constants/theme';
import { NEIGHBORHOODS, type Neighborhood } from '@/types/popup';

// Nearby-rail card geometry (Map mode), so tapping a pin can scroll to its card.
const STOP_CARD_WIDTH = 224; // w-56
const STOP_CARD_GAP = 12; // gap-3

export default function PlanScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [date, setDate] = useState<string>(todayIso());
  const [neighborhood, setNeighborhood] = useState<Neighborhood | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [route, setRoute] = useState<RouteStop[] | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const railRef = useRef<ScrollView>(null);
  const mapRef = useRef<PopupMapHandle>(null);
  const { permission, locating, locate } = useUserLocation();

  const isToday = date === todayIso();

  // Popups running on the chosen date in the chosen area.
  const { popups } = usePopups({
    neighborhoods: neighborhood ? [neighborhood] : [],
    dateRange: { start: date, end: date },
  });
  const areaPopups = useMemo(
    () => (neighborhood ? popups : []),
    [neighborhood, popups],
  );

  const selectedPopups = useMemo(
    () => areaPopups.filter((p) => selectedIds.includes(p.id)),
    [areaPopups, selectedIds],
  );

  const pickDate = (d: string) => {
    setDate(d);
    setSelectedIds([]);
    setRoute(null);
  };

  const pickNeighborhood = (n: Neighborhood) => {
    setNeighborhood(n);
    setSelectedIds([]);
    setRoute(null);
  };

  const toggle = (id: string) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const planRoute = () => {
    setRoute(buildRoute(selectedPopups));
    setViewMode('list');
    setFocusedId(null);
  };

  const editSelection = () => {
    setRoute(null);
    setViewMode('list');
    setFocusedId(null);
  };

  // Enhances `route` with real walking legs + a road-following polyline when a
  // routing key is configured; falls back to the straight-line v1 estimates
  // otherwise. Hooks can't be conditional, so this runs every render.
  const enhanced = useWalkingRoute(route ?? []);

  const onLocate = async () => {
    const c = await locate();
    if (c) {
      mapRef.current?.centerOn(c);
    } else {
      Alert.alert(
        'Location unavailable',
        'Enable location access in Settings to see yourself on the map.',
      );
    }
  };

  // When a pin is tapped in full-map mode, bring its card to the front of the rail.
  useEffect(() => {
    if (!focusedId || viewMode !== 'map') return;
    const index = enhanced.stops.findIndex((s) => s.popup.id === focusedId);
    if (index < 0) return;
    railRef.current?.scrollTo({
      x: index * (STOP_CARD_WIDTH + STOP_CARD_GAP),
      animated: true,
    });
  }, [focusedId, viewMode, enhanced.stops]);

  const shareItinerary = async () => {
    if (!route) return;
    const lines = [
      `My Seoul Popups day — ${neighborhood}, ${formatWeekdayDate(date)}`,
      ...enhanced.stops.map(
        (s, i) =>
          `${i + 1}. ${s.popup.name}` +
          (i > 0 ? ` (${s.walkFromPrevMin} min walk)` : ''),
      ),
      `${enhanced.stops.length} stops · ~${totalWalkMinutes(enhanced.stops)} min walking total`,
      'Planned on Seoul Popups',
    ];
    try {
      await Share.share({ message: lines.join('\n') });
    } catch {
      // dismissed or unavailable — nothing to do
    }
  };

  // ---- Route results view ----
  if (route && route.length > 0) {
    const totalWalk = totalWalkMinutes(enhanced.stops);
    const first = enhanced.stops[0].popup;
    const stopOrder = Object.fromEntries(
      enhanced.stops.map((s, i) => [s.popup.id, i + 1]),
    );
    // Always draw a route line: the real road-following polyline once live
    // directions load, otherwise a straight-line fallback between the stops
    // (dashed, so it reads as an estimate rather than an actual path).
    const liveCoords =
      enhanced.polyline && enhanced.polyline.length > 1
        ? enhanced.polyline
        : null;
    const fallbackCoords = enhanced.stops.map((s) => ({
      latitude: s.popup.latitude,
      longitude: s.popup.longitude,
    }));
    const mapRouteCoords = liveCoords ?? fallbackCoords;
    const routeDashed = !enhanced.live;

    // One map instance for both modes. It stays mounted at the same position
    // in the tree — only its height and the surrounding overlays change.
    // (A separate full-screen return would unmount this MapView and mount a
    // new one; remounting a react-native-maps view mid-session crashes on
    // native, so we never do it — 'map' just grows the same map to fill the
    // screen and swaps the itinerary for a bottom rail.)
    const fullMap = viewMode === 'map';
    return (
      <View className="flex-1 bg-bg">
        {/* Persistent map — same tree slot in both modes. */}
        <View
          className={fullMap ? '' : 'mx-4 mt-4 overflow-hidden rounded-3xl'}
          style={fullMap ? { flex: 1 } : { height: 240 }}
        >
          <PopupMapView
            ref={mapRef}
            popups={enhanced.stops.map((s) => s.popup)}
            selectedId={focusedId}
            onSelect={setFocusedId}
            showUser={permission === 'granted'}
            routeCoords={mapRouteCoords}
            routeDashed={routeDashed}
            stopOrder={stopOrder}
          />

          {/* Expand / collapse (+ locate when full-screen) */}
          <View
            className="absolute right-3 flex-row items-center gap-2"
            style={{ top: fullMap ? insets.top + 8 : 12 }}
          >
            {fullMap && (
              <Pressable
                onPress={onLocate}
                style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
                accessibilityRole="button"
                accessibilityLabel="Show my location"
                className="h-11 w-11 items-center justify-center rounded-2xl border border-line-strong bg-surface shadow-sm"
              >
                {locating ? (
                  <ActivityIndicator
                    size="small"
                    color={colors.brand.DEFAULT}
                  />
                ) : (
                  <Ionicons
                    name="locate"
                    size={19}
                    color={
                      permission === 'granted'
                        ? colors.brand.DEFAULT
                        : colors.ink
                    }
                  />
                )}
              </Pressable>
            )}
            <Pressable
              onPress={() => setViewMode(fullMap ? 'list' : 'map')}
              style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
              accessibilityRole="button"
              accessibilityLabel={fullMap ? 'Back to list' : 'Show full map'}
              className="flex-row items-center gap-1.5 rounded-2xl border border-line-strong bg-surface px-3 py-2.5 shadow-sm"
            >
              <Ionicons
                name={fullMap ? 'list' : 'expand'}
                size={15}
                color={colors.ink}
              />
              <Text className="text-xs font-bold text-ink">
                {fullMap ? 'List' : 'Full map'}
              </Text>
            </Pressable>
          </View>
        </View>

        {fullMap ? (
          // ---- Full-map mode: itinerary collapses into a bottom rail ----
          <View
            className="absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-line-strong bg-surface pt-2.5"
            style={{ paddingBottom: insets.bottom + 12 }}
          >
            <View className="mb-3 h-[5px] w-10 self-center rounded-full bg-line-strong" />
            <Text className="mb-2 px-4 text-xs font-bold text-muted">
              {enhanced.loading
                ? 'Fetching live walking directions…'
                : enhanced.live
                  ? 'Live walking times · tap a pin or card'
                  : 'Estimated walking times · tap a pin or card'}
            </Text>
            <ScrollView
              ref={railRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="gap-3 px-4 pb-1"
            >
              {enhanced.stops.map((stop, i) => {
                const selected = stop.popup.id === focusedId;
                return (
                  <Pressable
                    key={stop.popup.id}
                    onPress={() => {
                      setFocusedId(stop.popup.id);
                      router.push({
                        pathname: '/popup/[id]',
                        params: { id: stop.popup.id },
                      });
                    }}
                    style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
                    className={`w-56 flex-row items-center gap-3 rounded-2xl p-2.5 ${
                      selected ? 'bg-purple-light' : 'bg-well'
                    }`}
                  >
                    <View className="h-7 w-7 items-center justify-center rounded-full bg-purple">
                      <Text className="text-xs font-bold text-white">
                        {i + 1}
                      </Text>
                    </View>
                    <View className="min-w-0 flex-1">
                      <Text
                        className="text-[13px] font-extrabold leading-4 text-ink"
                        numberOfLines={1}
                      >
                        {stop.popup.name}
                      </Text>
                      <Text
                        className="mt-0.5 text-[11px] text-muted"
                        numberOfLines={1}
                      >
                        {i === 0
                          ? 'Start here'
                          : `~${stop.walkFromPrevMin} min walk`}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={colors.muted}
                    />
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : (
          // ---- List mode: full itinerary scrolls below the map ----
          <>
            <ScrollView
              className="flex-1"
              contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
            >
              <View className="mb-4 flex-row items-center justify-between rounded-2xl bg-purple p-4">
                <View className="flex-1">
                  <Text className="text-xs font-semibold uppercase tracking-wide text-[#D8CBFF]">
                    Your day in {neighborhood} · {formatWeekdayDate(date)}
                  </Text>
                  <Text className="mt-1 text-xl font-extrabold text-white">
                    {route.length} stops · ~{totalWalk} min walking
                  </Text>
                </View>
                <Pressable
                  onPress={shareItinerary}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Share itinerary"
                  style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
                  className="h-10 w-10 items-center justify-center rounded-2xl bg-white/15"
                >
                  <Ionicons name="share-outline" size={19} color="#fff" />
                </Pressable>
              </View>

              {/* Getting there */}
              <View className="mb-4 flex-row items-center gap-2 rounded-2xl bg-surface p-4">
                <Ionicons name="train" size={20} color={colors.brand.DEFAULT} />
                <Text className="flex-1 text-sm text-ink">
                  Start at {first.subway.station} Station ({first.subway.line}),
                  Exit {first.subway.exit}
                </Text>
              </View>

              {/* Timeline of stops */}
              {enhanced.stops.map((stop, i) => {
                const isLast = i === enhanced.stops.length - 1;
                return (
                  <View key={stop.popup.id} className="flex-row">
                    {/* Rail: number + connecting line */}
                    <View className="mr-3 items-center" style={{ width: 28 }}>
                      <View className="h-7 w-7 items-center justify-center rounded-full bg-purple">
                        <Text className="text-sm font-bold text-white">
                          {i + 1}
                        </Text>
                      </View>
                      {!isLast && (
                        <View className="my-1 w-0.5 flex-1 bg-purple-light" />
                      )}
                    </View>

                    {/* Content */}
                    <View className="flex-1 pb-4">
                      <Pressable
                        onPress={() =>
                          router.push({
                            pathname: '/popup/[id]',
                            params: { id: stop.popup.id },
                          })
                        }
                        style={({ pressed }) => ({
                          opacity: pressed ? 0.9 : 1,
                        })}
                        className="flex-row items-center gap-3 rounded-2xl bg-surface p-3"
                      >
                        <View className="flex-1">
                          <Text
                            className="text-sm font-bold text-ink"
                            numberOfLines={1}
                          >
                            {stop.popup.name}
                          </Text>
                          <Text className="text-xs text-muted">
                            {stop.popup.category} · {stop.popup.hours}
                          </Text>
                        </View>
                        <Ionicons
                          name="chevron-forward"
                          size={18}
                          color={colors.muted}
                        />
                      </Pressable>

                      {!isLast && (
                        <View className="mt-2 flex-row items-center gap-1.5">
                          <Ionicons
                            name="walk"
                            size={15}
                            color={colors.muted}
                          />
                          <Text className="text-xs text-muted">
                            ~{enhanced.stops[i + 1].walkFromPrevMin} min walk
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}

              <Text className="mt-2 text-center text-xs text-muted">
                {enhanced.loading
                  ? 'Fetching live walking directions…'
                  : enhanced.live
                    ? 'Live walking times from Google Directions.'
                    : 'Estimated walking times (straight-line).'}
              </Text>
            </ScrollView>

            <View
              className="border-t border-line bg-surface px-4 pt-3"
              style={{ paddingBottom: insets.bottom + 12 }}
            >
              <Pressable
                onPress={editSelection}
                style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
                className="items-center rounded-2xl border border-line-strong py-3.5"
              >
                <Text className="text-base font-semibold text-ink">
                  Edit selection
                </Text>
              </Pressable>
            </View>
          </>
        )}
      </View>
    );
  }

  // ---- Selection view ----
  return (
    <View className="flex-1 bg-bg">
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        <Text className="text-base text-ink">
          Pick a day and area, choose the pop-ups you want to visit, and we’ll
          order them into a walking route.
        </Text>

        {/* 1. Date */}
        <Text className="mb-2 mt-5 text-sm font-bold text-ink">
          1. Choose a day
        </Text>
        <View className="flex-row flex-wrap items-center gap-2">
          <Chip
            label="Today"
            selected={isToday}
            onPress={() => pickDate(todayIso())}
          />
          <Pressable
            onPress={() => setShowCalendar(true)}
            style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
            className={`flex-row items-center gap-1.5 rounded-full border px-3.5 py-2 ${
              isToday
                ? 'border-line-strong bg-surface'
                : 'border-purple bg-purple-light'
            }`}
          >
            <Ionicons
              name="calendar-outline"
              size={16}
              color={isToday ? colors.muted : colors.purple.DEFAULT}
            />
            <Text
              className={`text-sm font-semibold ${
                isToday ? 'text-ink' : 'text-purple'
              }`}
            >
              {isToday ? 'Pick a date' : formatWeekdayDate(date)}
            </Text>
          </Pressable>
        </View>

        {/* 2. Area */}
        <Text className="mb-2 mt-5 text-sm font-bold text-ink">
          2. Choose an area
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {NEIGHBORHOODS.map((n) => (
            <Chip
              key={n}
              label={n}
              selected={neighborhood === n}
              onPress={() => pickNeighborhood(n)}
            />
          ))}
        </View>

        {/* 3. Pop-ups */}
        {neighborhood && (
          <>
            <Text className="mb-2 mt-5 text-sm font-bold text-ink">
              3. Choose pop-ups ({selectedIds.length} selected)
            </Text>
            {areaPopups.length === 0 ? (
              <Text className="text-sm text-muted">
                No pop-ups running in {neighborhood} on{' '}
                {formatWeekdayDate(date)}.
              </Text>
            ) : (
              areaPopups.map((p) => (
                <SelectablePopupRow
                  key={p.id}
                  popup={p}
                  selected={selectedIds.includes(p.id)}
                  onToggle={() => toggle(p.id)}
                />
              ))
            )}
          </>
        )}
      </ScrollView>

      <View
        className="border-t border-line bg-surface px-4 pt-3"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <Pressable
          disabled={selectedPopups.length < 2}
          onPress={planRoute}
          style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
          className={`items-center rounded-2xl py-4 ${
            selectedPopups.length < 2 ? 'bg-line-strong' : 'bg-brand'
          }`}
        >
          <Text className="text-base font-bold text-white">
            {selectedPopups.length < 2
              ? 'Select at least 2 pop-ups'
              : `Plan my route (${selectedPopups.length})`}
          </Text>
        </Pressable>
      </View>

      <DatePickerSheet
        visible={showCalendar}
        selected={date}
        onSelect={pickDate}
        onClose={() => setShowCalendar(false)}
      />
    </View>
  );
}
