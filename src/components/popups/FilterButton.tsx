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

/**
 * A multi-select dropdown trigger that shows how many options are selected.
 * Active filters are purple (color-role rule: purple = your selection).
 */
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
      className={`flex-row items-center gap-1.5 rounded-full border px-4 py-2.5 ${
        active ? 'border-purple bg-purple' : 'border-line-strong bg-surface'
      }`}
    >
      <Text
        className={`text-[13px] font-bold ${active ? 'text-white' : 'text-muted'}`}
      >
        {label}
        {active ? ` ${count}` : ''}
      </Text>
      <Ionicons
        name={open ? 'chevron-up' : 'chevron-down'}
        size={14}
        color={active ? '#fff' : colors.faint}
      />
    </Pressable>
  );
}
