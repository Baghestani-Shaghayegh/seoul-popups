import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text } from 'react-native';
import { colors } from '@/constants/theme';

/**
 * A non-editable search affordance for the Home screen. Tapping it navigates
 * to Discover, where the real text input lives.
 */
export function SearchBar({ onPress }: { onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="search"
      className="mx-4 h-14 flex-row items-center gap-2.5 rounded-2xl border border-gray-200 bg-gray-100 px-4"
      style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
    >
      <Ionicons name="search" size={20} color={colors.muted} />
      <Text className="text-base text-muted">Search pop-ups, brands…</Text>
    </Pressable>
  );
}
