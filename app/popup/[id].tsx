import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DirectionsSheet } from '@/components/popups/DirectionsSheet';
import { PopupImage } from '@/components/popups/PopupImage';
import { SaveButton } from '@/components/popups/SaveButton';
import { colors } from '@/constants/theme';
import { usePopup } from '@/hooks/usePopups';
import { formatDateRange } from '@/lib/format';
import { endingLabel } from '@/lib/popupStatus';

/** Popup detail screen. Data comes from usePopup (mock → Supabase swap point). */
export default function PopupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { popup } = usePopup(id);
  const [directionsOpen, setDirectionsOpen] = useState(false);

  if (!popup) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <Text className="text-muted">Pop-up not found.</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg">
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 6,
          paddingBottom: insets.bottom + 110,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Poster */}
        <View className="mx-4 overflow-hidden rounded-3xl">
          <PopupImage
            uri={popup.imageUrl}
            className="aspect-square w-full"
            iconSize={32}
          />
          <LinearGradient
            colors={[
              'rgba(30,15,30,0.15)',
              'transparent',
              'rgba(30,15,30,0.6)',
            ]}
            locations={[0, 0.4, 1]}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
            }}
          />

          {/* Floating back + save */}
          <View className="absolute left-3.5 right-3.5 top-3.5 flex-row items-center justify-between">
            <Pressable
              onPress={() => router.back()}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="Back"
              style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
              className="h-11 w-11 items-center justify-center rounded-2xl bg-white/95 shadow-sm"
            >
              <Ionicons name="chevron-back" size={22} color={colors.ink} />
            </Pressable>
            <SaveButton popupId={popup.id} size={44} />
          </View>

          {/* Overlaid tags + title */}
          <View className="absolute inset-x-4 bottom-4">
            <View className="mb-2 flex-row gap-1.5">
              <View className="rounded-full bg-brand px-3 py-1.5">
                <Text className="text-[11px] font-bold text-white">
                  {popup.category}
                </Text>
              </View>
              <View className="rounded-full bg-white/90 px-3 py-1.5">
                <Text className="text-[11px] font-bold text-ink">
                  {popup.neighborhood}
                </Text>
              </View>
            </View>
            <Text className="text-[27px] font-extrabold leading-8 text-white">
              {popup.name}
            </Text>
          </View>
        </View>

        <View className="px-5 pt-5">
          {/* Fact pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-2.5"
          >
            <FactPill
              label="Dates"
              value={formatDateRange(popup.startDate, popup.endDate)}
            />
            <FactPill label="Hours" value={popup.hours} />
            <FactPill label="Ends" value={endingLabel(popup)} />
            <FactPill
              label="Station"
              value={`${popup.subway.station} · ${popup.subway.walkMinutes} min`}
            />
          </ScrollView>

          {/* About */}
          <Text className="mt-6 text-base font-extrabold text-ink">
            About this pop-up
          </Text>
          <Text className="mt-1.5 text-sm text-muted">{popup.tagline}</Text>
          <Text className="mt-3 text-[13.5px] leading-6 text-muted">
            {popup.description}
          </Text>

          {/* Subway directions — the differentiator */}
          <Text className="mb-2 mt-6 text-base font-extrabold text-ink">
            Getting there
          </Text>
          <View className="rounded-3xl bg-surface p-4 shadow-sm">
            <Row
              label="Subway"
              value={`${popup.subway.line} → ${popup.subway.station} Station`}
            />
            <Row label="Exit" value={`Exit ${popup.subway.exit}`} />
            <Row
              label="Walk"
              value={`~${popup.subway.walkMinutes} min from exit`}
            />
          </View>
        </View>
      </ScrollView>

      {/* Sticky actions: Directions (ghost) + Reserve (primary) */}
      <View
        className="absolute inset-x-0 bottom-0 flex-row gap-3 border-t border-line bg-surface px-5 pt-3"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <Pressable
          onPress={() => setDirectionsOpen(true)}
          style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
          className="flex-row items-center gap-2 rounded-2xl border border-line-strong bg-surface px-5 py-4"
        >
          <Ionicons name="navigate-outline" size={17} color={colors.ink} />
          <Text className="text-sm font-extrabold text-ink">Directions</Text>
        </Pressable>
        <Pressable
          disabled={!popup.reservable}
          style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
          className={`flex-1 items-center justify-center rounded-2xl py-4 ${
            popup.reservable ? 'bg-brand' : 'bg-line-strong'
          }`}
        >
          <Text
            className={`text-base font-bold ${
              popup.reservable ? 'text-white' : 'text-muted'
            }`}
          >
            {popup.reservable ? 'Reserve a spot' : 'No reservation needed'}
          </Text>
        </Pressable>
      </View>

      <DirectionsSheet
        visible={directionsOpen}
        onClose={() => setDirectionsOpen(false)}
        target={{
          latitude: popup.latitude,
          longitude: popup.longitude,
          name: popup.name,
        }}
      />
    </View>
  );
}

function FactPill({ label, value }: { label: string; value: string }) {
  return (
    <View className="min-w-[96px] rounded-2xl bg-well px-4 py-3">
      <Text className="text-[10.5px] font-semibold uppercase tracking-wide text-faint">
        {label}
      </Text>
      <Text className="mt-1 text-sm font-extrabold text-ink">{value}</Text>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between py-1.5">
      <Text className="text-sm text-muted">{label}</Text>
      <Text className="text-sm font-semibold text-ink">{value}</Text>
    </View>
  );
}
