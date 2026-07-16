import { Pressable, Text } from 'react-native';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}

/** A pill-shaped selectable filter chip. */
export function Chip({ label, selected = false, onPress }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
      className={`rounded-full border px-4 py-2 ${
        selected ? 'border-purple bg-purple' : 'border-line-strong bg-surface'
      }`}
    >
      <Text
        className={`text-sm font-semibold ${
          selected ? 'text-white' : 'text-ink'
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
