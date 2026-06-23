import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Placeholder for the Map screen.
 * Next up: react-native-maps with clustered pins per neighborhood +
 * the "Plan my day" optimized walking route.
 */
export default function MapScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View
      className="flex-1 items-center justify-center bg-gray-50 px-8"
      style={{ paddingTop: insets.top }}
    >
      <Text className="mb-2 text-2xl font-extrabold text-ink">🗺️ Map</Text>
      <Text className="text-center text-sm text-muted">
        Clustered pins and the “Plan my day” route planner land here next.
      </Text>
    </View>
  );
}
