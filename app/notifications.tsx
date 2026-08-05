import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState, LoadingState } from '@/components/ui/StateViews';
import { colors } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import {
  useNotifications,
  type AppNotification,
} from '@/hooks/useNotifications';

/** "3 days ago" beats a timestamp for something this ephemeral. */
function ago(iso: string): string {
  const mins = Math.floor((Date.now() - Date.parse(iso)) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'yesterday' : `${days}d ago`;
}

/**
 * The inbox behind the home-screen bell.
 *
 * Pushes are ephemeral — dismiss one and it is gone — so notify-ending-soon
 * records every one it sends and this reads them back.
 */
export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { notifications, loading, reload, markAllRead } = useNotifications();

  useEffect(() => {
    if (!authLoading && !user) router.replace('/auth');
  }, [authLoading, user, router]);

  // Opening the inbox IS reading it, so clear the badge on arrival rather than
  // making the user tap each row.
  useEffect(() => {
    if (!user) return;
    reload();
    markAllRead();
    // Only on mount: re-running when `notifications` changes would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (!user) return <View className="flex-1 bg-bg" />;

  return (
    <View className="flex-1 bg-bg">
      {loading && notifications.length === 0 ? (
        <LoadingState label="Loading notifications" />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(n) => n.id}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: insets.bottom + 24,
            flexGrow: 1,
          }}
          ListEmptyComponent={
            <EmptyState
              icon="notifications-outline"
              title="Nothing yet"
              subtitle="Save a pop-up and we'll tell you before it ends."
              action={{
                label: 'Find pop-ups',
                onPress: () => router.push('/discover'),
              }}
            />
          }
          renderItem={({ item }) => (
            <NotificationRow
              notification={item}
              onPress={
                item.popupId
                  ? () =>
                      router.push({
                        pathname: '/popup/[id]',
                        params: { id: item.popupId! },
                      })
                  : undefined
              }
            />
          )}
        />
      )}
    </View>
  );
}

function NotificationRow({
  notification,
  onPress,
}: {
  notification: AppNotification;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => ({ opacity: pressed && onPress ? 0.92 : 1 })}
      className="mb-3 flex-row items-start gap-3 rounded-3xl border border-line-strong bg-surface p-3.5 shadow-sm"
    >
      <View className="h-10 w-10 items-center justify-center rounded-2xl bg-peach">
        <Ionicons name="time-outline" size={20} color={colors.peach.ink} />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-[15px] font-extrabold text-ink">
          {notification.title}
        </Text>
        <Text className="mt-0.5 text-sm text-muted">{notification.body}</Text>
        <Text className="mt-1.5 text-[11px] font-semibold text-faint">
          {ago(notification.createdAt)}
        </Text>
      </View>
      {onPress ? (
        <Ionicons name="chevron-forward" size={18} color={colors.faint} />
      ) : null}
    </Pressable>
  );
}
