import { Pressable, Text } from 'react-native';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  /**
   * How many pop-ups this option would return. Shown alongside the label, and
   * dims the chip at 0 — an area can legitimately run dry between pop-ups, so
   * it's better to say so up front than to let someone tap into an empty list
   * and assume the app is broken. Omit to show no count at all.
   */
  count?: number;
}

/** A pill-shaped selectable filter chip. */
export function Chip({ label, selected = false, onPress, count }: ChipProps) {
  const empty = count === 0;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        count === undefined ? label : `${label}, ${count} pop-ups`
      }
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
      className={`flex-row items-center gap-1.5 rounded-full border px-4 py-2 ${
        selected
          ? 'border-purple bg-purple'
          : empty
            ? 'border-line bg-surface'
            : 'border-line-strong bg-surface'
      }`}
    >
      <Text
        className={`text-sm font-semibold ${
          selected ? 'text-white' : empty ? 'text-faint' : 'text-ink'
        }`}
      >
        {label}
      </Text>
      {count !== undefined && (
        <Text
          className={`text-xs font-bold ${
            selected ? 'text-white/80' : empty ? 'text-faint' : 'text-muted'
          }`}
        >
          {count}
        </Text>
      )}
    </Pressable>
  );
}
