import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

/** Brand-colored CTA promoting the "Plan my day" trip planner. */
export function PlanMyDayCard({ onPress }: { onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
      className="mx-4 flex-row items-center gap-3 rounded-2xl bg-brand p-4"
    >
      <Ionicons name="map-outline" size={24} color="#fff" />
      <View className="flex-1">
        <Text className="text-base font-bold text-white">Plan my day</Text>
        <Text className="text-xs text-brand-light">
          Pick an area, get a walking route
        </Text>
      </View>
      <Ionicons name="arrow-forward" size={20} color="#fff" />
    </Pressable>
  );
}
