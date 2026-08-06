import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DayStrip } from '@/components/home/DayStrip';
import { HomeGreeting } from '@/components/home/HomeGreeting';
import { PlanMyDayCard } from '@/components/home/PlanMyDayCard';
import { SectionHeader } from '@/components/home/SectionHeader';
import { FeatureCard } from '@/components/popups/FeatureCard';
import { RailCard } from '@/components/popups/RailCard';
import { ErrorState, LoadingState } from '@/components/ui/StateViews';
import { useCollections, type Collection } from '@/hooks/useCollections';
import { useHomeSections } from '@/hooks/useHomeSections';
import { formatWeekdayDate, todayIso } from '@/lib/format';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [selectedDay, setSelectedDay] = useState(todayIso());
  const { liveCount, featured, dayPicks, endingSoon, loading, error, reload } =
    useHomeSections(selectedDay);
  const { collections } = useCollections();

  const openPopup = (id: string) =>
    router.push({ pathname: '/popup/[id]', params: { id } });

  const openDiscover = () => router.push('/discover');

  const dayPicksTitle =
    selectedDay === todayIso()
      ? 'Happening today'
      : `On ${formatWeekdayDate(selectedDay)}`;

  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerStyle={{
        paddingTop: insets.top + 8,
        paddingBottom: insets.bottom + 120, // clear the floating tab bar
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header: greeting + notification bell */}
      <HomeGreeting />

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState onRetry={reload} />
      ) : (
        <>
          {/* Plan my day hero */}
          <View className="mt-3.5">
            <PlanMyDayCard
              // "near you" would be a lie: liveCount is every published pop-up
              // running today, with no distance filter — the Map screen is the
              // only place that knows where you are.
              eyebrow={`${liveCount} ${
                liveCount === 1 ? 'pop-up' : 'pop-ups'
              } happening today`}
              onPress={() => router.push('/plan')}
            />
          </View>

          {/* Feature */}
          {featured && (
            <View className="mt-5">
              <SectionHeader title="Feature" onSeeAll={openDiscover} />
              <FeatureCard
                popup={featured}
                onPress={() => openPopup(featured.id)}
              />
            </View>
          )}

          {/* Collections */}
          {collections.length > 0 && (
            <View className="mt-5">
              <SectionHeader title="Collections" />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerClassName="gap-3.5 px-4"
              >
                {collections.map((c) => (
                  <CollectionCard
                    key={c.id}
                    collection={c}
                    onPress={() =>
                      router.push({
                        pathname: '/collection/[id]',
                        params: { id: c.id },
                      })
                    }
                  />
                ))}
              </ScrollView>
            </View>
          )}

          {/* Pick a day */}
          <View className="mt-5">
            <SectionHeader title="Pick a day" />
            <DayStrip selectedIso={selectedDay} onSelect={setSelectedDay} />
          </View>

          {/* Pop-ups on the selected day */}
          <View className="mt-4">
            <SectionHeader title={dayPicksTitle} onSeeAll={openDiscover} />
            {dayPicks.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerClassName="gap-3.5 px-4"
              >
                {dayPicks.map((p) => (
                  <RailCard
                    key={p.id}
                    popup={p}
                    onPress={() => openPopup(p.id)}
                  />
                ))}
              </ScrollView>
            ) : (
              <Text className="px-4 text-sm text-muted">
                Nothing on that day yet — try another one.
              </Text>
            )}
          </View>

          {/* Ending soon */}
          {endingSoon.length > 0 && (
            <View className="mt-5">
              <SectionHeader
                title="Ending soon"
                actionLabel="Saved"
                onSeeAll={() => router.push('/saved')}
              />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerClassName="gap-3.5 px-4"
              >
                {endingSoon.map((p) => (
                  <RailCard
                    key={p.id}
                    popup={p}
                    onPress={() => openPopup(p.id)}
                  />
                ))}
              </ScrollView>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

function CollectionCard({
  collection,
  onPress,
}: {
  collection: Collection;
  onPress: () => void;
}) {
  const count = collection.popupIds.length;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.92 : 1 })}
      className="w-60 rounded-3xl bg-purple-light p-4"
    >
      <Text className="text-3xl">{collection.emoji ?? '✨'}</Text>
      <Text
        className="mt-2 text-base font-extrabold text-ink"
        numberOfLines={1}
      >
        {collection.title}
      </Text>
      {collection.subtitle ? (
        <Text className="mt-0.5 text-xs text-muted" numberOfLines={2}>
          {collection.subtitle}
        </Text>
      ) : null}
      <Text className="mt-2 text-[11px] font-bold text-purple">
        {count} {count === 1 ? 'spot' : 'spots'} →
      </Text>
    </Pressable>
  );
}
