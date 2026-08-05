import '../global.css';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '@/hooks/useAuth';
import { FavoritesProvider } from '@/hooks/useFavorites';
import { NotificationsProvider } from '@/hooks/useNotifications';
import { ProfileProvider } from '@/hooks/useProfile';
import { VisitedProvider } from '@/hooks/useVisited';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          {/* Auth-derived state first: the profile depends only on the session. */}
          <ProfileProvider>
            <NotificationsProvider>
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
                      name="auth"
                      options={{ presentation: 'modal' }}
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
                    {/* Reached by deep link from the recovery email, so it is
                      modal like auth rather than a card you back out of. */}
                    <Stack.Screen
                      name="reset-password"
                      options={{ presentation: 'modal' }}
                    />
                    <Stack.Screen
                      name="notifications"
                      options={{
                        headerShown: true,
                        title: 'Notifications',
                        headerBackTitle: 'Back',
                        presentation: 'card',
                      }}
                    />
                    <Stack.Screen
                      name="profile"
                      options={{
                        headerShown: true,
                        title: 'My Page',
                        headerBackTitle: 'Back',
                        presentation: 'card',
                      }}
                    />
                  </Stack>
                </VisitedProvider>
              </FavoritesProvider>
            </NotificationsProvider>
          </ProfileProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
