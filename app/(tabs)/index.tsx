import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DayStrip } from '@/components/home/DayStrip';
import { PlanMyDayCard } from '@/components/home/PlanMyDayCard';
import { SectionHeader } from '@/components/home/SectionHeader';
import { FeatureCard } from '@/components/popups/FeatureCard';
import { RailCard } from '@/components/popups/RailCard';
import { ErrorState, LoadingState } from '@/components/ui/StateViews';
import { colors } from '@/constants/theme';
import { useHomeSections } from '@/hooks/useHomeSections';
import { formatWeekdayDate, todayIso } from '@/lib/format';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [selectedDay, setSelectedDay] = useState(todayIso());
  const { liveCount, featured, dayPicks, endingSoon, loading, error, reload } =
    useHomeSections(selectedDay);

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
      <View className="flex-row items-center justify-between px-4">
        <View className="flex-row items-center gap-3">
          <View className="h-11 w-11 items-center justify-center rounded-2xl bg-brand-light">
            <Text className="text-base font-extrabold text-brand-dark">S</Text>
          </View>
          <View>
            <Text className="text-lg font-extrabold text-ink">Hi, Sara</Text>
            <Text className="text-xs text-muted">Let’s plan your day</Text>
          </View>
        </View>
        <View className="h-11 w-11 items-center justify-center rounded-2xl border border-line-strong bg-surface">
          <Ionicons name="notifications-outline" size={19} color={colors.ink} />
          <View className="absolute right-3 top-3 h-2 w-2 rounded-full border-2 border-surface bg-brand" />
        </View>
      </View>

      {/* Location pill */}
      <View className="mt-3.5 flex-row px-4">
        <Pressable
          onPress={openDiscover}
          style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
          className="flex-row items-center gap-2 rounded-full border border-line-strong bg-surface py-2 pl-2 pr-3.5"
        >
          <View className="h-6 w-6 items-center justify-center rounded-full bg-brand-light">
            <Ionicons name="location" size={13} color={colors.brand.DEFAULT} />
          </View>
          <Text className="text-[13px] font-bold text-ink">
            Seongsu <Text className="text-faint">· Seoul ▾</Text>
          </Text>
        </Pressable>
      </View>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState onRetry={reload} />
      ) : (
        <>
          {/* Plan my day hero */}
          <View className="mt-3.5">
            <PlanMyDayCard
              eyebrow={`${liveCount} picks near you today`}
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
