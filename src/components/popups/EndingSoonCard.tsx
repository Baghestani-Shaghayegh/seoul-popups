import { Pressable, Text, View } from 'react-native';
import { PopupImage } from '@/components/popups/PopupImage';
import { endingLabel } from '@/lib/popupStatus';
import type { Popup } from '@/types/popup';

interface EndingSoonCardProps {
  popup: Popup;
  onPress?: () => void;
}

/** Compact, fixed-width card for the horizontal "Ending soon" rail. */
export function EndingSoonCard({ popup, onPress }: EndingSoonCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.92 : 1 })}
      className="w-40 overflow-hidden rounded-xl border border-gray-200 bg-white"
    >
      <PopupImage uri={popup.imageUrl} className="h-20 w-full" iconSize={20} />
      <View className="p-2.5">
        <Text className="text-sm font-semibold text-ink" numberOfLines={1}>
          {popup.name}
        </Text>
        <Text className="text-[11px] text-muted">{popup.neighborhood}</Text>
        <View className="mt-1.5 self-start rounded-md bg-brand-light/40 px-2 py-0.5">
          <Text className="text-[10px] font-bold text-brand-dark">
            {endingLabel(popup)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
