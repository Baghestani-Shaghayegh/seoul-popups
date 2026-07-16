import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import { PopupImage } from '@/components/popups/PopupImage';
import { SaveButton } from '@/components/popups/SaveButton';
import { colors } from '@/constants/theme';
import { daysUntilEnd, endingLabel } from '@/lib/popupStatus';
import type { Popup } from '@/types/popup';

interface RailCardProps {
  popup: Popup;
  /** Fills the available column width (Discover grid) instead of a fixed rail width. */
  grid?: boolean;
  onPress?: () => void;
}

/**
 * Square photo card for horizontal rails ("This month's pop-ups",
 * "Ending soon") and the Discover grid: countdown pill + save heart over the
 * photo, name and neighborhood below.
 */
export function RailCard({ popup, grid = false, onPress }: RailCardProps) {
  const urgent = daysUntilEnd(popup) <= 2;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
      className={grid ? 'flex-1' : 'w-40'}
    >
      <View className="overflow-hidden rounded-3xl bg-surface shadow-sm">
        <PopupImage
          uri={popup.imageUrl}
          className={grid ? 'aspect-square w-full' : 'h-40 w-40'}
          iconSize={24}
        />
        <View className="absolute left-2.5 top-2.5 flex-row items-center gap-1 rounded-full bg-white/95 px-2.5 py-1">
          <Ionicons
            name="time-outline"
            size={11}
            color={urgent ? colors.brand.DEFAULT : colors.peach.ink}
          />
          <Text
            className={`text-[10.5px] font-bold ${
              urgent ? 'text-brand' : 'text-peach-ink'
            }`}
          >
            {endingLabel(popup)}
          </Text>
        </View>
        <View className="absolute right-2.5 top-2.5">
          <SaveButton popupId={popup.id} size={30} />
        </View>
      </View>
      <View className="px-1 pt-2">
        <Text className="text-sm font-extrabold text-ink" numberOfLines={1}>
          {popup.name}
        </Text>
        <Text className="mt-0.5 text-[11.5px] text-faint" numberOfLines={1}>
          {popup.neighborhood} · {popup.subway.station} Station
        </Text>
      </View>
    </Pressable>
  );
}
