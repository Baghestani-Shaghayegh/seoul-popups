import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useAuth } from '@/hooks/useAuth';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';

export interface AppNotification {
  id: string;
  kind: 'ending_soon';
  popupId: string | null;
  title: string;
  body: string;
  createdAt: string;
  readAt: string | null;
}

interface NotificationsValue {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  /** Re-reads from the server — used when the inbox is opened. */
  reload: () => void;
  /** Awaitable so callers can refetch only once the write has landed. */
  markAllRead: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsValue | null>(null);

/** Nothing older than this is worth an inbox row on a pop-up app. */
const MAX_ROWS = 50;

/**
 * The in-app notification inbox.
 *
 * Notifications are written server-side by notify-ending-soon; the client only
 * reads them and marks them read. There is deliberately no local/guest store:
 * a notification is about a specific account's saved pop-ups, so signed out
 * there is genuinely nothing to show.
 */
export function NotificationsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let active = true;
    if (!userId || !isSupabaseConfigured) {
      setNotifications([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    void (async () => {
      const { data } = await getSupabase()
        .from('notifications')
        .select('id, kind, popup_id, title, body, created_at, read_at')
        .order('created_at', { ascending: false })
        .limit(MAX_ROWS);
      if (!active) return;
      setNotifications(
        (data ?? []).map((r) => {
          const row = r as {
            id: string;
            kind: 'ending_soon';
            popup_id: string | null;
            title: string;
            body: string;
            created_at: string;
            read_at: string | null;
          };
          return {
            id: row.id,
            kind: row.kind,
            popupId: row.popup_id,
            title: row.title,
            body: row.body,
            createdAt: row.created_at,
            readAt: row.read_at,
          };
        }),
      );
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [userId, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  const markAllRead = useCallback(async () => {
    if (!userId || !isSupabaseConfigured) return;
    const now = new Date().toISOString();
    // Optimistic: the badge should clear the moment the inbox is opened.
    setNotifications((prev) =>
      prev.map((n) => (n.readAt ? n : { ...n, readAt: now })),
    );
    // Awaited, and that matters: a supabase-js builder is a PromiseLike, not a
    // Promise — it only sends the request from inside `then()`. `void builder`
    // built this update and threw it away without ever calling the server, so
    // read_at stayed null and the dot came back on every reload.
    await getSupabase()
      .from('notifications')
      .update({ read_at: now })
      .eq('user_id', userId)
      .is('read_at', null);
  }, [userId]);

  const value = useMemo<NotificationsValue>(
    () => ({
      notifications,
      unreadCount: notifications.filter((n) => !n.readAt).length,
      loading,
      reload,
      markAllRead,
    }),
    [notifications, loading, reload, markAllRead],
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications(): NotificationsValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error(
      'useNotifications must be used inside NotificationsProvider',
    );
  }
  return ctx;
}
