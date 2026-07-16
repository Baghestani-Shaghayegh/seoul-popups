import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { PopupImage } from '@/components/popups/PopupImage';
import { colors } from '@/constants/theme';
import type { Popup } from '@/types/popup';

interface SelectablePopupRowProps {
  popup: Popup;
  selected: boolean;
  onToggle: () => void;
}

/** Compact, selectable popup row used when building a "Plan my day" route. */
export function SelectablePopupRow({
  popup,
  selected,
  onToggle,
}: SelectablePopupRowProps) {
  return (
    <Pressable
      onPress={onToggle}
      style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
      className={`mb-2.5 flex-row items-center gap-3 rounded-2xl border bg-surface p-2.5 ${
        selected ? 'border-purple' : 'border-line-strong'
      }`}
    >
      <PopupImage
        uri={popup.imageUrl}
        className="h-14 w-14 rounded-xl"
        iconSize={18}
      />
      <View className="flex-1">
        <Text className="text-sm font-bold text-ink" numberOfLines={1}>
          {popup.name}
        </Text>
        <Text className="text-xs text-muted" numberOfLines={1}>
          {popup.category} · {popup.subway.station} · Exit {popup.subway.exit}
        </Text>
      </View>
      <Ionicons
        name={selected ? 'checkmark-circle' : 'ellipse-outline'}
        size={24}
        color={selected ? colors.purple.DEFAULT : colors.faint}
      />
    </Pressable>
  );
}
