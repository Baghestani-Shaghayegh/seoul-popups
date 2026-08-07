import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  PopupMapView,
  type MapRegion,
  type PopupMapHandle,
} from '@/components/map/PopupMapView';
import type { FilterOption } from '@/components/popups/FilterSheet';
import { MultiFilterSheet } from '@/components/popups/MultiFilterSheet';
import { PopupImage } from '@/components/popups/PopupImage';
import { colors } from '@/constants/theme';
import { usePopups } from '@/hooks/usePopups';
import { useUserLocation } from '@/hooks/useUserLocation';
import { formatExit } from '@/lib/format';
import { endingLabel, isActiveToday } from '@/lib/popupStatus';
import { haversineMeters } from '@/lib/route';
import { CATEGORIES, type Category } from '@/types/popup';

// Nearby card geometry, so tapping a pin can scroll its card into view.
const CARD_WIDTH = 224; // w-56
const CARD_GAP = 12; // gap-3

const CATEGORY_OPTIONS: FilterOption<Category>[] = CATEGORIES.map((c) => ({
  key: c,
  label: c,
}));

/** Is this popup inside the box the map is showing? */
function withinRegion(
  region: MapRegion,
  p: { latitude: number; longitude: number },
): boolean {
  return (
    Math.abs(p.latitude - region.latitude) <= region.latitudeDelta / 2 &&
    Math.abs(p.longitude - region.longitude) <= region.longitudeDelta / 2
  );
}

/**
 * Has the viewport moved far enough from the area we last searched to be worth
 * offering a re-search? A quarter-span pan or a real zoom step counts; smaller
 * drifts don't, so the button doesn't flicker on every nudge of the map.
 */
function isDifferentArea(searched: MapRegion, current: MapRegion): boolean {
  const zoom = current.latitudeDelta / searched.latitudeDelta;
  return (
    Math.abs(current.latitude - searched.latitude) >
      searched.latitudeDelta * 0.25 ||
    Math.abs(current.longitude - searched.longitude) >
      searched.longitudeDelta * 0.25 ||
    zoom > 1.4 ||
    zoom < 0.7
  );
}

/**
 * Map screen: live pin map (native) with a synced "nearby" rail. Pins and cards
 * share one selection — tap a pin to highlight+scroll its card; tap a card to
 * open the popup. On web the map falls back to a styled placeholder.
 */
export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const { popups, loading, error, reload } = usePopups({ categories });
  const { coords, permission, locating, locate } = useUserLocation();

  // `region` is what the map is showing right now; `searchedArea` is the box
  // the results are pinned to, and only changes when "Search this area" is
  // tapped. Keeping them separate is what lets the button know it has
  // something to offer.
  const [region, setRegion] = useState<MapRegion | null>(null);
  const [searchedArea, setSearchedArea] = useState<MapRegion | null>(null);

  // Once we know where the user is, "nearby" becomes literal — sort by
  // straight-line distance. Until then, keep the fetch order (soonest to end).
  const nearby = useMemo(() => {
    const active = popups
      .filter(isActiveToday)
      .filter((p) => !searchedArea || withinRegion(searchedArea, p));
    if (!coords) return active;
    return [...active].sort(
      (a, b) => haversineMeters(coords, a) - haversineMeters(coords, b),
    );
  }, [popups, coords, searchedArea]);

  const headerLabel = loading
    ? 'Finding pop-ups…'
    : error
      ? 'Couldn’t load pop-ups'
      : searchedArea
        ? `${nearby.length} pop-ups in this area`
        : coords
          ? `${nearby.length} pop-ups near you`
          : `${nearby.length} pop-ups nearby`;

  // Offer a re-search once the map has been moved off the searched area.
  const canSearchArea =
    region !== null && (!searchedArea || isDifferentArea(searchedArea, region));

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const railRef = useRef<ScrollView>(null);
  const mapRef = useRef<PopupMapHandle>(null);

  // The locate button sits just above the nearby sheet, whose height varies
  // with its content (loading / error / empty / rail). Measure it rather than
  // hardcoding an offset, with an estimate for the first frame.
  const [sheetHeight, setSheetHeight] = useState(insets.bottom + 232);

  const onLocate = async () => {
    const c = await locate();
    if (c) {
      mapRef.current?.centerOn(c);
    } else {
      Alert.alert(
        'Location unavailable',
        'Enable location access in Settings to see pop-ups near you.',
      );
    }
  };

  // When a pin is selected, bring its card to the front of the rail.
  useEffect(() => {
    if (!selectedId) return;
    const index = nearby.findIndex((p) => p.id === selectedId);
    if (index < 0) return;
    railRef.current?.scrollTo({
      x: index * (CARD_WIDTH + CARD_GAP),
      animated: true,
    });
  }, [selectedId, nearby]);

  return (
    <View className="flex-1 bg-bg">
      <PopupMapView
        ref={mapRef}
        popups={nearby}
        selectedId={selectedId}
        onSelect={setSelectedId}
        showUser={permission === 'granted'}
        onUserRegionChange={setRegion}
      />

      {/* Locate me — the offset lives on this wrapper because a Pressable's
          function style is dropped by NativeWind on web. */}
      <View className="absolute right-4" style={{ bottom: sheetHeight + 12 }}>
        <Pressable
          onPress={onLocate}
          style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
          accessibilityRole="button"
          accessibilityLabel="Find pop-ups near me"
          className="h-12 w-12 items-center justify-center rounded-2xl border border-line-strong bg-surface shadow-sm"
        >
          {locating ? (
            <ActivityIndicator size="small" color={colors.brand.DEFAULT} />
          ) : (
            <Ionicons
              name="locate"
              size={20}
              color={
                permission === 'granted' ? colors.brand.DEFAULT : colors.ink
              }
            />
          )}
        </Pressable>
      </View>

      {/* Category filter — narrows the pins in place, no navigation. */}
      <View className="absolute right-4" style={{ top: insets.top + 8 }}>
        <Pressable
          onPress={() => setFilterOpen(true)}
          style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
          accessibilityRole="button"
          accessibilityLabel={
            categories.length
              ? `Filter by category, ${categories.length} selected`
              : 'Filter by category'
          }
          className={`h-12 w-12 items-center justify-center rounded-2xl border shadow-sm ${
            categories.length
              ? 'border-brand bg-brand'
              : 'border-line-strong bg-surface'
          }`}
        >
          <Ionicons
            name="options-outline"
            size={19}
            color={categories.length ? '#fff' : colors.ink}
          />
        </Pressable>
      </View>

      {/* Search this area — only offered once the map has actually moved. */}
      {canSearchArea && (
        <View
          className="absolute inset-x-0 items-center"
          style={{ top: insets.top + 8 }}
        >
          <Pressable
            onPress={() => {
              setSearchedArea(region);
              setSelectedId(null);
            }}
            style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
            accessibilityRole="button"
            className="h-12 flex-row items-center gap-2 rounded-2xl border border-line-strong bg-surface px-4 shadow-sm"
          >
            <Ionicons name="search" size={17} color={colors.brand.DEFAULT} />
            <Text className="text-sm font-bold text-brand">
              Search this area
            </Text>
          </Pressable>
        </View>
      )}

      {/* Nearby events sheet */}
      <View
        className="absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-line-strong bg-surface pt-2.5"
        style={{ paddingBottom: insets.bottom + 96 }}
        onLayout={(e) => setSheetHeight(e.nativeEvent.layout.height)}
      >
        <View className="mb-3 h-[5px] w-10 self-center rounded-full bg-line-strong" />
        <View className="mb-3 flex-row items-baseline justify-between px-4">
          <Text className="text-base font-extrabold text-ink">
            {headerLabel}
          </Text>
          <View className="flex-row items-baseline gap-3.5">
            {/* Without this, panning away from a searched area shows an empty
                map with no obvious way back to the full set. */}
            {searchedArea && (
              <Pressable onPress={() => setSearchedArea(null)} hitSlop={8}>
                <Text className="text-xs font-bold text-muted">Clear area</Text>
              </Pressable>
            )}
            <Pressable onPress={() => router.push('/discover')} hitSlop={8}>
              <Text className="text-xs font-bold text-brand">List view</Text>
            </Pressable>
          </View>
        </View>
        {loading ? (
          <View className="flex-row items-center gap-2 px-4 py-6">
            <ActivityIndicator color={colors.brand.DEFAULT} />
            <Text className="text-sm text-muted">Finding pop-ups nearby…</Text>
          </View>
        ) : error ? (
          <View className="flex-row items-center justify-between px-4 py-6">
            <Text className="text-sm text-muted">Couldn’t load pop-ups.</Text>
            <Pressable onPress={reload} hitSlop={8}>
              <Text className="text-sm font-bold text-brand">Try again</Text>
            </Pressable>
          </View>
        ) : nearby.length === 0 ? (
          <View className="flex-row items-center justify-between px-4 py-6">
            <Text className="flex-1 text-sm text-muted">
              {searchedArea || categories.length
                ? 'No pop-ups match here.'
                : 'No pop-ups nearby right now.'}
            </Text>
            {(searchedArea || categories.length > 0) && (
              <Pressable
                onPress={() => {
                  setSearchedArea(null);
                  setCategories([]);
                }}
                hitSlop={8}
              >
                <Text className="text-sm font-bold text-brand">Show all</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <ScrollView
            ref={railRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-3 px-4 pb-1"
          >
            {nearby.map((p) => {
              const selected = p.id === selectedId;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => {
                    setSelectedId(p.id);
                    router.push({
                      pathname: '/popup/[id]',
                      params: { id: p.id },
                    });
                  }}
                  style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
                  className={`w-56 flex-row items-center gap-3 rounded-2xl p-2.5 ${
                    selected ? 'bg-purple-light' : 'bg-well'
                  }`}
                >
                  <PopupImage
                    uri={p.imageUrl}
                    name={p.name}
                    category={p.category}
                    neighborhood={p.neighborhood}
                    className="h-[52px] w-[52px] rounded-xl"
                    iconSize={16}
                  />
                  <View className="min-w-0 flex-1">
                    <Text
                      className="text-[13px] font-extrabold leading-4 text-ink"
                      numberOfLines={1}
                    >
                      {p.name}
                    </Text>
                    <Text
                      className="mt-0.5 text-[11px] text-muted"
                      numberOfLines={1}
                    >
                      {p.neighborhood} · {formatExit(p.subway.exit)}
                    </Text>
                    <Text className="mt-0.5 text-[11px] font-bold text-brand">
                      {endingLabel(p)}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </View>

      <MultiFilterSheet
        visible={filterOpen}
        title="Category"
        options={CATEGORY_OPTIONS}
        selectedKeys={categories}
        onApply={(keys) => {
          setCategories(keys);
          // The selected pin may no longer be on the map.
          setSelectedId(null);
        }}
        onClose={() => setFilterOpen(false)}
      />
    </View>
  );
}
