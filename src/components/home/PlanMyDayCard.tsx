import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

/**
 * The pair of "mgn eyes".
 *
 * Path and geometry are lifted verbatim from the source design
 * (`app for sara/mgn-radar.html`, the `.heart` svg in the hero). An almond is
 * two quadratic curves meeting at a point on each side — React Native's
 * borderRadius cannot express that, and the previous approximation
 * (`rounded-full` on a 64×36 box) rendered them as capsules with no points at
 * all. Hence react-native-svg.
 */
function Eyes({ height = 96 }: { height?: number }) {
  return (
    <Svg width={(height * 68) / 102} height={height} viewBox="0 0 68 102">
      <Path d="M2 26 Q34 4 66 26 Q34 48 2 26 Z" fill="#F3E9D6" />
      <Circle cx="34" cy="26" r="11.5" fill="#EE5D8C" />
      <Circle cx="34" cy="26" r="7.4" fill="#141018" />
      <Path d="M2 76 Q34 54 66 76 Q34 98 2 76 Z" fill="#F3E9D6" />
      <Circle cx="34" cy="76" r="11.5" fill="#EE5D8C" />
      <Circle cx="34" cy="76" r="7.4" fill="#141018" />
    </Svg>
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
      <View className="pr-1" aria-hidden>
        <Eyes />
      </View>
    </Pressable>
  );
}
