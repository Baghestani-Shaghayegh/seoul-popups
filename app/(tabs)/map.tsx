import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PopupMapView } from '@/components/map/PopupMapView';
import { PopupImage } from '@/components/popups/PopupImage';
import { colors } from '@/constants/theme';
import { usePopups } from '@/hooks/usePopups';
import { endingLabel, isActiveToday } from '@/lib/popupStatus';

// Nearby card geometry, so tapping a pin can scroll its card into view.
const CARD_WIDTH = 224; // w-56
const CARD_GAP = 12; // gap-3

/**
 * Map screen: live pin map (native) with a synced "nearby" rail. Pins and cards
 * share one selection — tap a pin to highlight+scroll its card; tap a card to
 * open the popup. On web the map falls back to a styled placeholder.
 */
export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { popups, loading, error, reload } = usePopups({});
  const nearby = popups.filter(isActiveToday);

  const headerLabel = loading
    ? 'Finding pop-ups…'
    : error
      ? 'Couldn’t load pop-ups'
      : `${nearby.length} pop-ups nearby`;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const railRef = useRef<ScrollView>(null);

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
        popups={nearby}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />

      {/* Search this area */}
      <View
        className="absolute inset-x-4 flex-row gap-2.5"
        style={{ top: insets.top + 8 }}
      >
        <Pressable
          onPress={() => router.push('/discover')}
          style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
          className="h-12 flex-1 flex-row items-center gap-2.5 rounded-2xl border border-line-strong bg-surface px-4 shadow-sm"
        >
          <Ionicons name="search" size={18} color={colors.faint} />
          <Text className="text-sm text-faint">Search this area</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push('/discover')}
          style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
          className="h-12 w-12 items-center justify-center rounded-2xl border border-line-strong bg-surface shadow-sm"
        >
          <Ionicons name="options-outline" size={19} color={colors.ink} />
        </Pressable>
      </View>

      {/* Nearby events sheet */}
      <View
        className="absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-line-strong bg-surface pt-2.5"
        style={{ paddingBottom: insets.bottom + 96 }}
      >
        <View className="mb-3 h-[5px] w-10 self-center rounded-full bg-line-strong" />
        <View className="mb-3 flex-row items-baseline justify-between px-4">
          <Text className="text-base font-extrabold text-ink">
            {headerLabel}
          </Text>
          <Pressable onPress={() => router.push('/discover')} hitSlop={8}>
            <Text className="text-xs font-bold text-brand">List view</Text>
          </Pressable>
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
          <Text className="px-4 py-6 text-sm text-muted">
            No pop-ups nearby right now.
          </Text>
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
                      {p.neighborhood} · Exit {p.subway.exit}
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
    </View>
  );
}
