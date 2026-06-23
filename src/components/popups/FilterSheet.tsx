import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, Text, View } from 'react-native';
import { colors } from '@/constants/theme';

export interface FilterOption<T extends string> {
  key: T;
  label: string;
}

interface FilterSheetProps<T extends string> {
  visible: boolean;
  title: string;
  options: FilterOption<T>[];
  selectedKey: T;
  onSelect: (key: T) => void;
  onClose: () => void;
}

/** Bottom-sheet single-select list used by the Discover filter buttons. */
export function FilterSheet<T extends string>({
  visible,
  title,
  options,
  selectedKey,
  onSelect,
  onClose,
}: FilterSheetProps<T>) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end">
        <Pressable className="absolute inset-0 bg-black/40" onPress={onClose} />
        <View className="rounded-t-3xl bg-white pb-9 pt-3">
          <View className="mb-1 h-1 w-10 self-center rounded-full bg-gray-300" />
          <View className="flex-row items-center justify-between px-5 py-2">
            <Text className="text-lg font-bold text-ink">{title}</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.ink} />
            </Pressable>
          </View>
          {options.map((o) => {
            const selected = o.key === selectedKey;
            return (
              <Pressable
                key={o.key}
                onPress={() => {
                  onSelect(o.key);
                  onClose();
                }}
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                className="flex-row items-center justify-between px-5 py-3.5"
              >
                <Text
                  className={`text-base ${selected ? 'font-bold text-brand' : 'text-ink'}`}
                >
                  {o.label}
                </Text>
                {selected && (
                  <Ionicons
                    name="checkmark"
                    size={20}
                    color={colors.brand.DEFAULT}
                  />
                )}
              </Pressable>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}
