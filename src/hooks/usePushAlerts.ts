import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useCallback, useState } from 'react';
import { Platform } from 'react-native';

import { useAuth } from '@/hooks/useAuth';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';

// How notifications appear while the app is foregrounded.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export type PushStatus =
  | 'idle'
  | 'working'
  | 'enabled'
  | 'denied'
  | 'unsupported';

/**
 * "Ending soon" push alerts for saved popups. Requires sign-in (the server
 * needs to know your saves) and a physical device (Expo push tokens aren't
 * issued on simulators/web). `enable()` asks permission, gets the Expo push
 * token, and stores it in `push_tokens`; the notify-ending-soon Edge Function
 * does the sending.
 */
export function usePushAlerts() {
  const { user } = useAuth();
  const [status, setStatus] = useState<PushStatus>('idle');

  const enable = useCallback(async () => {
    if (!Device.isDevice || !user || !isSupabaseConfigured) {
      setStatus('unsupported');
      return;
    }
    setStatus('working');
    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      }

      const existing = await Notifications.getPermissionsAsync();
      let granted = existing.granted;
      if (!granted) {
        granted = (await Notifications.requestPermissionsAsync()).granted;
      }
      if (!granted) {
        setStatus('denied');
        return;
      }

      const projectId = Constants.expoConfig?.extra?.eas?.projectId as
        | string
        | undefined;
      const { data: token } = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined,
      );

      await getSupabase()
        .from('push_tokens')
        .upsert(
          { user_id: user.id, token, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,token' },
        );
      setStatus('enabled');
    } catch {
      setStatus('unsupported');
    }
  }, [user]);

  return { status, enable, canEnable: Boolean(user) };
}
