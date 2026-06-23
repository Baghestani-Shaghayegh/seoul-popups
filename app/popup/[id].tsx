import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';

import { PopupImage } from '@/components/popups/PopupImage';
import { MOCK_POPUPS } from '@/data/mockPopups';
import { formatDateRange } from '@/lib/format';

/**
 * Popup detail screen. Currently reads from mock data by id.
 * To go live, fetch the single popup from Supabase by `id`.
 */
export default function PopupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const popup = MOCK_POPUPS.find((p) => p.id === id);

  if (!popup) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-muted">Pop-up not found.</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}>
        <PopupImage
          uri={popup.imageUrl}
          className="h-72 w-full"
          iconSize={32}
        />

        <View className="p-5">
          <Text className="text-xs font-semibold uppercase tracking-wide text-brand">
            {popup.neighborhood}
          </Text>
          <Text className="mt-1 text-2xl font-extrabold text-ink">
            {popup.name}
          </Text>
          <Text className="mt-1 text-base text-muted">{popup.tagline}</Text>

          <Text className="mt-5 text-base leading-6 text-ink">
            {popup.description}
          </Text>

          {/* Dates & hours */}
          <Section title="When">
            <Row
              label="Dates"
              value={formatDateRange(popup.startDate, popup.endDate)}
            />
            <Row label="Hours" value={popup.hours} />
          </Section>

          {/* Subway directions — the differentiator */}
          <Section title="Getting there">
            <Row
              label="Subway"
              value={`${popup.subway.line} → ${popup.subway.station} Station`}
            />
            <Row label="Exit" value={`Exit ${popup.subway.exit}`} />
            <Row
              label="Walk"
              value={`~${popup.subway.walkMinutes} min from exit`}
            />
          </Section>
        </View>
      </ScrollView>

      {/* Sticky reserve button */}
      <View
        className="absolute inset-x-0 bottom-0 border-t border-gray-100 bg-white px-5 pt-3"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <Pressable
          disabled={!popup.reservable}
          style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
          className={`items-center rounded-2xl py-4 ${
            popup.reservable ? 'bg-brand' : 'bg-gray-300'
          }`}
        >
          <Text className="text-base font-bold text-white">
            {popup.reservable ? 'Reserve a spot' : 'No reservation needed'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View className="mt-6">
      <Text className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">
        {title}
      </Text>
      <View className="rounded-2xl bg-gray-50 p-4">{children}</View>
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
