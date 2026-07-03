import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
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
    <BottomSheet visible={visible} title={title} onClose={onClose}>
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
    </BottomSheet>
  );
}
