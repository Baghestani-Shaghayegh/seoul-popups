import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PopupImage } from '@/components/popups/PopupImage';
import { colors } from '@/constants/theme';
import { useFavorites } from '@/hooks/useFavorites';
import { usePopups } from '@/hooks/usePopups';
import { formatShortDate } from '@/lib/format';
import { daysUntilEnd, endingLabel, isEndingSoon } from '@/lib/popupStatus';
import type { Popup } from '@/types/popup';

/** Saved pop-ups (locally persisted favorites) with end-date countdowns. */
export default function SavedScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { favoriteIds, toggleFavorite } = useFavorites();
  const { popups } = usePopups({});

  const saved = useMemo(
    () =>
      popups
        .filter((p) => favoriteIds.includes(p.id))
        .sort((a, b) => a.endDate.localeCompare(b.endDate)),
    [popups, favoriteIds],
  );
  const endingCount = saved.filter((p) => isEndingSoon(p)).length;

  return (
    <View className="flex-1 bg-bg" style={{ paddingTop: insets.top }}>
      <View className="px-4 pb-2 pt-2">
        <Text className="text-3xl font-extrabold text-ink">Saved</Text>
        <Text className="mt-0.5 text-sm text-muted">
          {saved.length} {saved.length === 1 ? 'pop-up' : 'pop-ups'}
          {endingCount > 0 && ` · ${endingCount} ending this week`}
        </Text>
      </View>

      <FlatList
        data={saved}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: insets.bottom + 120,
          flexGrow: 1,
        }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <SavedRow
            popup={item}
            onPress={() =>
              router.push({ pathname: '/popup/[id]', params: { id: item.id } })
            }
            onRemove={() => toggleFavorite(item.id)}
          />
        )}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center px-8">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-brand-light">
              <Ionicons name="heart" size={28} color={colors.brand.DEFAULT} />
            </View>
            <Text className="mt-4 text-xl font-extrabold text-ink">
              No saves yet
            </Text>
            <Text className="mt-1 text-center text-sm text-muted">
              Tap the heart on a pop-up to keep it here for your trip.
            </Text>
          </View>
        }
      />
    </View>
  );
}

function SavedRow({
  popup,
  onPress,
  onRemove,
}: {
  popup: Popup;
  onPress: () => void;
  onRemove: () => void;
}) {
  const urgent = daysUntilEnd(popup) <= 2;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.92 : 1 })}
      className="mb-3.5 flex-row items-center gap-3.5 rounded-3xl border border-line-strong bg-surface p-3 shadow-sm"
    >
      <PopupImage
        uri={popup.imageUrl}
        className="h-[70px] w-[70px] rounded-2xl"
        iconSize={20}
      />
      <View className="min-w-0 flex-1">
        <Text className="text-[15px] font-extrabold text-ink" numberOfLines={1}>
          {popup.name}
        </Text>
        <Text className="mt-0.5 text-xs text-muted" numberOfLines={1}>
          {popup.neighborhood} · {popup.subway.station} Station
        </Text>
        <Text
          className={`mt-1.5 text-[11px] font-bold ${
            urgent ? 'text-brand' : 'text-peach-ink'
          }`}
        >
          {endingLabel(popup)} · ends {formatShortDate(popup.endDate)}
        </Text>
      </View>
      <Pressable
        onPress={onRemove}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel="Remove from saved"
        className="h-10 w-10 items-center justify-center rounded-2xl bg-brand-light"
      >
        <Ionicons name="heart" size={19} color={colors.brand.DEFAULT} />
      </Pressable>
    </Pressable>
  );
}
