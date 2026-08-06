import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CollectionCard } from '@/components/home/CollectionCard';
import { DayStrip } from '@/components/home/DayStrip';
import { HomeGreeting } from '@/components/home/HomeGreeting';
import { PlanMyDayCard } from '@/components/home/PlanMyDayCard';
import { SectionHeader } from '@/components/home/SectionHeader';
import { FeatureCard } from '@/components/popups/FeatureCard';
import { RailCard } from '@/components/popups/RailCard';
import { ErrorState, LoadingState } from '@/components/ui/StateViews';
import { useCollections } from '@/hooks/useCollections';
import { useHomeSections } from '@/hooks/useHomeSections';
import { usePopups } from '@/hooks/usePopups';
import { formatWeekdayDate, todayIso } from '@/lib/format';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [selectedDay, setSelectedDay] = useState(todayIso());
  const { liveCount, featured, dayPicks, endingSoon, loading, error, reload } =
    useHomeSections(selectedDay);
  const { collections } = useCollections();
  // Shared module-level cache, already warm from useHomeSections — the
  // collection cards resolve their own popup ids against it.
  const { popups } = usePopups({});

  const openPopup = (id: string) =>
    router.push({ pathname: '/popup/[id]', params: { id } });

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
              {/* No "See all": this is one hand-picked pop-up, so there is no
                  set of features to see. It used to push to Discover, which
                  the rails below already do. */}
              <SectionHeader title="Feature" />
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
                    popups={popups}
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
            {/* Carries the chosen day through, so "See all" continues the same
                list instead of resetting to the whole catalogue. */}
            <SectionHeader
              title={dayPicksTitle}
              onSeeAll={() =>
                router.push({
                  pathname: '/discover',
                  params: { date: selectedDay },
                })
              }
            />
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
