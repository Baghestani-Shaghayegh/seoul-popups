import { Link, Stack } from 'expo-router';
import { Text, View } from 'react-native';

/** Shown for any route that doesn't match a file in app/. */
export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <View className="flex-1 items-center justify-center gap-4 bg-bg px-8">
        <Text className="text-2xl font-extrabold text-ink">
          This screen doesn’t exist.
        </Text>
        <Link href="/" className="text-base font-semibold text-brand">
          Go to Discover
        </Link>
      </View>
    </>
  );
}
