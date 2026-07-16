import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, Text, View } from 'react-native';

import { PopupImage } from '@/components/popups/PopupImage';
import { SaveButton } from '@/components/popups/SaveButton';
import { formatDateRange } from '@/lib/format';
import type { Popup } from '@/types/popup';

interface FeatureCardProps {
  popup: Popup;
  onPress?: () => void;
}

/**
 * Big photo card for the Home "Feature" section: category tag + save heart
 * on top, title and meta over a dark fade at the bottom.
 */
export function FeatureCard({ popup, onPress }: FeatureCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        transform: [{ scale: pressed ? 0.99 : 1 }],
      })}
      className="mx-4 overflow-hidden rounded-3xl bg-surface shadow-sm"
    >
      <PopupImage uri={popup.imageUrl} className="h-64 w-full" iconSize={32} />
      <LinearGradient
        colors={['transparent', 'rgba(22,11,26,0.78)']}
        locations={[0.35, 1]}
        style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
      />

      {/* Top row: category tag + save */}
      <View className="absolute left-3.5 right-3.5 top-3.5 flex-row items-center justify-between">
        <View className="rounded-full bg-brand px-3 py-1.5">
          <Text className="text-[11px] font-bold text-white">
            {popup.category}
          </Text>
        </View>
        <SaveButton popupId={popup.id} size={36} />
      </View>

      {/* Caption */}
      <View className="absolute inset-x-4 bottom-4">
        <Text className="text-xl font-extrabold text-white" numberOfLines={2}>
          {popup.name}
        </Text>
        <View className="mt-2 flex-row items-center gap-3">
          <View className="flex-row items-center gap-1">
            <Ionicons name="calendar-outline" size={13} color="#fff" />
            <Text className="text-xs text-white">
              {formatDateRange(popup.startDate, popup.endDate)}
            </Text>
          </View>
          <View className="flex-row items-center gap-1">
            <Ionicons name="walk-outline" size={13} color="#fff" />
            <Text className="text-xs text-white">
              {popup.subway.station} · {popup.subway.walkMinutes} min
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
