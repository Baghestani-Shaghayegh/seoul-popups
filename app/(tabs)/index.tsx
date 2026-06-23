import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AreaGrid } from '@/components/home/AreaGrid';
import { PlanMyDayCard } from '@/components/home/PlanMyDayCard';
import { SearchBar } from '@/components/home/SearchBar';
import { SectionHeader } from '@/components/home/SectionHeader';
import { EndingSoonCard } from '@/components/popups/EndingSoonCard';
import { PopupCard } from '@/components/popups/PopupCard';
import { useHomeSections } from '@/hooks/useHomeSections';
import { formatWeekdayDate, todayIso } from '@/lib/format';
import { colors } from '@/constants/theme';
import type { Neighborhood } from '@/types/popup';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { liveCount, featured, endingSoon, countsByArea } = useHomeSections();

  const openPopup = (id: string) =>
    router.push({ pathname: '/popup/[id]', params: { id } });

  const openDiscover = (neighborhood?: Neighborhood) =>
    router.push(
      neighborhood
        ? { pathname: '/discover', params: { neighborhood } }
        : '/discover',
    );

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 24 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View className="mb-3.5 flex-row items-start justify-between px-4">
        <View>
          <View className="flex-row items-center gap-1">
            <Ionicons name="location" size={18} color={colors.brand.DEFAULT} />
            <Text className="text-2xl font-extrabold text-ink">Seoul</Text>
          </View>
          <Text className="mt-0.5 text-xs text-muted">
            {formatWeekdayDate(todayIso())} · {liveCount} pop-ups live
          </Text>
        </View>
        <View className="h-9 w-9 items-center justify-center rounded-full bg-gray-100">
          <Ionicons
            name="notifications-outline"
            size={19}
            color={colors.muted}
          />
        </View>
      </View>

      {/* Search */}
      <SearchBar
        onPress={() =>
          router.push({ pathname: '/discover', params: { focus: '1' } })
        }
      />

      {/* Plan my day */}
      <View className="mt-3.5">
        <PlanMyDayCard
          onPress={() =>
            Alert.alert('Plan my day', 'Trip planner coming soon!')
          }
        />
      </View>

      {/* Explore by area */}
      <View className="mt-5">
        <SectionHeader title="Explore by area" />
        <AreaGrid counts={countsByArea} onSelect={openDiscover} />
      </View>

      {/* Ending soon */}
      {endingSoon.length > 0 && (
        <View className="mt-5">
          <SectionHeader
            title="Ending soon"
            icon="time-outline"
            onSeeAll={() => openDiscover()}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-2.5 px-4"
          >
            {endingSoon.map((p) => (
              <EndingSoonCard
                key={p.id}
                popup={p}
                onPress={() => openPopup(p.id)}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Featured */}
      {featured && (
        <View className="mt-5">
          <SectionHeader title="Featured today" />
          <View className="px-4">
            <PopupCard
              popup={featured}
              onPress={() => openPopup(featured.id)}
            />
          </View>
        </View>
      )}
    </ScrollView>
  );
}
