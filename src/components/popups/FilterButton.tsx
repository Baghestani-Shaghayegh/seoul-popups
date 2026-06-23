import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text } from 'react-native';
import { colors } from '@/constants/theme';

interface FilterButtonProps {
  label: string;
  /** Number of selected options; shown as a badge and drives the active state. */
  count?: number;
  /** Whether this button's sheet is currently open (flips the chevron). */
  open?: boolean;
  onPress: () => void;
}

/** A multi-select dropdown trigger that shows how many options are selected. */
export function FilterButton({
  label,
  count = 0,
  open,
  onPress,
}: FilterButtonProps) {
  const active = count > 0;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
      className={`flex-row items-center gap-1.5 rounded-full border px-4 py-2 ${
        active ? 'border-brand bg-brand-light/30' : 'border-gray-300 bg-white'
      }`}
    >
      <Text
        className={`text-sm font-semibold ${active ? 'text-brand-dark' : 'text-ink'}`}
      >
        {label}
        {active ? ` ${count}` : ''}
      </Text>
      <Ionicons
        name={open ? 'chevron-up' : 'chevron-down'}
        size={14}
        color={active ? colors.brand.dark : colors.muted}
      />
    </Pressable>
  );
}
