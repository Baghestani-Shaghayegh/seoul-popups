import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';

/**
 * Placeholder for the Saved screen.
 * Phase 1: persist favorites locally, then sync once accounts land.
 */
export default function SavedScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View
      className="flex-1 items-center justify-center bg-gray-50 px-8"
      style={{ paddingTop: insets.top }}
    >
      <Ionicons name="heart-outline" size={40} color={colors.brand.DEFAULT} />
      <Text className="mt-3 text-xl font-extrabold text-ink">No saves yet</Text>
      <Text className="mt-1 text-center text-sm text-muted">
        Tap the heart on a pop-up to keep it here for your trip.
      </Text>
    </View>
  );
}
