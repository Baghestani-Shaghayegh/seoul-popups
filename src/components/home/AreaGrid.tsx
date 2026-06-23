import { Pressable, Text, View } from 'react-native';
import { NEIGHBORHOOD_META } from '@/constants/neighborhoods';
import { NEIGHBORHOODS, type Neighborhood } from '@/types/popup';

interface AreaGridProps {
  counts: Record<Neighborhood, number>;
  onSelect: (neighborhood: Neighborhood) => void;
}

/** Row of neighborhood quick-entry cards with live counts. */
export function AreaGrid({ counts, onSelect }: AreaGridProps) {
  return (
    <View className="flex-row gap-2 px-4">
      {NEIGHBORHOODS.map((n) => (
        <Pressable
          key={n}
          onPress={() => onSelect(n)}
          style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
          className="flex-1 justify-between rounded-2xl bg-gray-100 px-3.5 py-4"
        >
          <Text className="text-base font-semibold text-ink">
            {NEIGHBORHOOD_META[n].label}
          </Text>
          <Text className="mt-2 text-xs text-muted">{counts[n]} live</Text>
        </Pressable>
      ))}
    </View>
  );
}
