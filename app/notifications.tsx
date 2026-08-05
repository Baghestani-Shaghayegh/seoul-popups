import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PopupImage } from '@/components/popups/PopupImage';
import { EmptyState, LoadingState } from '@/components/ui/StateViews';
import { useAuth } from '@/hooks/useAuth';
import {
  useNotifications,
  type AppNotification,
} from '@/hooks/useNotifications';
import { usePopups } from '@/hooks/usePopups';
import { formatShortDate } from '@/lib/format';
import { daysUntilEnd, endingLabel } from '@/lib/popupStatus';
import type { Popup } from '@/types/popup';

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
 *
 * Rows are built from the POP-UP, not from the notification text: every other
 * list in the app leads with the photo, the name and the countdown, and a
 * generic title/body card read like someone else's notification screen dropped
 * into ours. The stored title/body is still the fallback for a pop-up that has
 * since been unpublished.
 */
export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { notifications, loading, reload, markAllRead } = useNotifications();
  const { popups } = usePopups({});

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
              popup={popups.find((p) => p.id === item.popupId)}
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
  popup,
  onPress,
}: {
  notification: AppNotification;
  popup?: Popup;
  onPress?: () => void;
}) {
  // Same treatment as the Saved tab: pink once it is genuinely urgent, peach
  // while there is still time.
  const urgent = popup ? daysUntilEnd(popup) <= 2 : false;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => ({ opacity: pressed && onPress ? 0.92 : 1 })}
      className="mb-3.5 flex-row items-center gap-3.5 rounded-3xl border border-line-strong bg-surface p-3 shadow-sm"
    >
      {popup ? (
        <PopupImage
          uri={popup.imageUrl}
          name={popup.name}
          category={popup.category}
          neighborhood={popup.neighborhood}
          className="h-[70px] w-[70px] rounded-2xl"
          iconSize={20}
        />
      ) : null}

      <View className="min-w-0 flex-1">
        <Text className="text-[15px] font-extrabold text-ink" numberOfLines={1}>
          {popup ? popup.name : notification.title}
        </Text>
        {popup ? (
          <>
            <Text className="mt-0.5 text-xs text-muted" numberOfLines={1}>
              {popup.neighborhood} · {popup.subway.station} Station
            </Text>
            <Text
              className={`mt-1.5 text-[11px] font-bold ${
                urgent ? 'text-brand' : 'text-peach-ink'
              }`}
            >
              {endingLabel(popup)} · ends {formatShortDate(popup.endDate)}
            </Text>
          </>
        ) : (
          <Text className="mt-0.5 text-xs text-muted" numberOfLines={2}>
            {notification.body}
          </Text>
        )}
        <Text className="mt-1 text-[11px] text-faint">
          {ago(notification.createdAt)}
        </Text>
      </View>
    </Pressable>
  );
}
