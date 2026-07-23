import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RailCard } from '@/components/popups/RailCard';
import { ErrorState, LoadingState } from '@/components/ui/StateViews';
import { colors } from '@/constants/theme';
import { useCollections } from '@/hooks/useCollections';
import { usePopups } from '@/hooks/usePopups';

/** A curated collection: its popups resolved from the shared catalogue. */
export default function CollectionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { collections, loading: cLoading, error: cError } = useCollections();
  const { popups, loading: pLoading, error: pError, reload } = usePopups({});

  const collection = collections.find((c) => c.id === id) ?? null;

  const items = useMemo(() => {
    if (!collection) return [];
    const byId = new Map(popups.map((p) => [p.id, p]));
    return collection.popupIds
      .map((pid) => byId.get(pid))
      .filter((p): p is NonNullable<typeof p> => Boolean(p));
  }, [collection, popups]);

  const loading = cLoading || pLoading;
  const error = cError ?? pError;

  return (
    <View className="flex-1 bg-bg" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center gap-3 px-4 pb-1 pt-2">
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
          className="h-11 w-11 items-center justify-center rounded-2xl border border-line-strong bg-surface"
        >
          <Ionicons name="chevron-back" size={22} color={colors.ink} />
        </Pressable>
        <Text className="text-2xl font-extrabold text-ink" numberOfLines={1}>
          {collection ? `${collection.emoji ?? ''} ${collection.title}` : ' '}
        </Text>
      </View>

      {!collection ? (
        <View className="flex-1 justify-center">
          {loading ? (
            <LoadingState label="Loading collection…" />
          ) : error ? (
            <ErrorState onRetry={reload} />
          ) : (
            <Text className="text-center text-muted">
              Collection not found.
            </Text>
          )}
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperClassName="justify-between px-4"
          contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            collection.subtitle ? (
              <Text className="mb-2 px-4 pt-1 text-sm text-muted">
                {collection.subtitle} · {items.length}{' '}
                {items.length === 1 ? 'pop-up' : 'pop-ups'}
              </Text>
            ) : null
          }
          renderItem={({ item }) => (
            <View className="mb-4 w-[48%]">
              <RailCard
                popup={item}
                grid
                onPress={() =>
                  router.push({
                    pathname: '/popup/[id]',
                    params: { id: item.id },
                  })
                }
              />
            </View>
          )}
          ListEmptyComponent={
            loading ? (
              <LoadingState />
            ) : (
              <Text className="px-4 text-sm text-muted">
                These pop-ups have wrapped up.
              </Text>
            )
          }
        />
      )}
    </View>
  );
}
