import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PopupImage } from '@/components/popups/PopupImage';
import { colors } from '@/constants/theme';
import { usePopups } from '@/hooks/usePopups';
import { endingLabel, isActiveToday } from '@/lib/popupStatus';

/**
 * Map screen, mgn radar style. The real map (react-native-maps, clustered
 * purple/pink pins) still lands here next — for now this is the styled shell:
 * pastel canvas, search field, and the nearby-events sheet wired to live data.
 */
export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { popups } = usePopups({});
  const nearby = popups.filter(isActiveToday);

  return (
    <View className="flex-1 bg-[#DCEBFC]">
      {/* Pastel placeholder canvas */}
      <View className="absolute -left-10 top-24 h-40 w-56 rounded-full bg-[#D8F1E6]" />
      <View className="absolute -right-12 bottom-64 h-44 w-60 rounded-full bg-[#D8F1E6]" />
      <View className="absolute left-1/4 top-1/2 h-24 w-72 -rotate-12 rounded-full bg-white/60" />
      <View className="flex-1 items-center justify-center px-10">
        <View className="items-center rounded-3xl bg-white/80 px-6 py-5">
          <Ionicons
            name="map-outline"
            size={30}
            color={colors.purple.DEFAULT}
          />
          <Text className="mt-2 text-base font-extrabold text-ink">
            Live map coming soon
          </Text>
          <Text className="mt-1 text-center text-xs text-muted">
            Purple & pink pins with the “Plan my day” walking route.
          </Text>
        </View>
      </View>

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
            {nearby.length} pop-ups nearby
          </Text>
          <Pressable onPress={() => router.push('/discover')} hitSlop={8}>
            <Text className="text-xs font-bold text-brand">List view</Text>
          </Pressable>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-3 px-4 pb-1"
        >
          {nearby.map((p) => (
            <Pressable
              key={p.id}
              onPress={() =>
                router.push({ pathname: '/popup/[id]', params: { id: p.id } })
              }
              style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
              className="w-56 flex-row items-center gap-3 rounded-2xl bg-well p-2.5"
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
          ))}
        </ScrollView>
      </View>
    </View>
  );
}
