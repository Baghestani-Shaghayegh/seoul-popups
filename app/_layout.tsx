import '../global.css';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { FavoritesProvider } from '@/hooks/useFavorites';
import { VisitedProvider } from '@/hooks/useVisited';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <FavoritesProvider>
          <VisitedProvider>
            <StatusBar style="dark" />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
              {/* Detail draws its own floating back/save buttons over the poster. */}
              <Stack.Screen
                name="popup/[id]"
                options={{ presentation: 'card' }}
              />
              <Stack.Screen
                name="collection/[id]"
                options={{ presentation: 'card' }}
              />
              <Stack.Screen
                name="plan"
                options={{
                  headerShown: true,
                  title: 'Plan my day',
                  headerBackTitle: 'Back',
                  presentation: 'card',
                }}
              />
            </Stack>
          </VisitedProvider>
        </FavoritesProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
