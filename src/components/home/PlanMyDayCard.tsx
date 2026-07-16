import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

/** One almond "mgn eye": cream almond, pink iris, dark pupil. */
function Eye() {
  return (
    <View className="h-9 w-16 items-center justify-center rounded-full bg-[#F3E9D6]">
      <View className="h-6 w-6 items-center justify-center rounded-full bg-brand">
        <View className="h-3.5 w-3.5 rounded-full bg-[#141018]" />
      </View>
    </View>
  );
}

interface PlanMyDayCardProps {
  /** e.g. "6 picks near you today" */
  eyebrow: string;
  onPress?: () => void;
}

/**
 * "Plan my day" hero. Purple = "your plan / your day" surface, pink CTA —
 * the two brand colors meet here (mgn radar design).
 */
export function PlanMyDayCard({ eyebrow, onPress }: PlanMyDayCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.92 : 1 })}
      className="mx-4 flex-row items-center justify-between overflow-hidden rounded-3xl bg-purple px-5 py-4"
    >
      <View className="flex-1 pr-3">
        <Text className="text-[11px] font-bold text-[#D8CBFF]">{eyebrow}</Text>
        <Text className="mt-1 text-[22px] font-extrabold leading-6 text-white">
          Plan my day
        </Text>
        <Text className="mt-1 text-xs leading-4 text-white/80">
          We line up your evening around what you love.
        </Text>
        <View className="mt-3 flex-row">
          <View className="flex-row items-center gap-1.5 rounded-full bg-brand px-3.5 py-2">
            <Text className="text-xs font-bold text-white">Build my plan</Text>
            <Ionicons name="arrow-forward" size={13} color="#fff" />
          </View>
        </View>
      </View>
      <View className="gap-3 pr-1" aria-hidden>
        <Eye />
        <Eye />
      </View>
    </Pressable>
  );
}
