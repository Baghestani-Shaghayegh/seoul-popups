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
        selected ? 'border-brand bg-brand' : 'border-gray-300 bg-white'
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
