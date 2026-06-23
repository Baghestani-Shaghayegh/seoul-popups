import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip } from '@/components/ui/Chip';
import { SelectablePopupRow } from '@/components/plan/SelectablePopupRow';
import { usePopups } from '@/hooks/usePopups';
import { buildRoute, totalWalkMinutes, type RouteStop } from '@/lib/route';
import {
  formatDayChip,
  formatWeekdayDate,
  todayIso,
  upcomingIsoDates,
} from '@/lib/format';
import { colors } from '@/constants/theme';
import { NEIGHBORHOODS, type Neighborhood } from '@/types/popup';

export default function PlanScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const dates = useMemo(() => upcomingIsoDates(14), []);
  const [date, setDate] = useState<string>(todayIso());
  const [neighborhood, setNeighborhood] = useState<Neighborhood | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [route, setRoute] = useState<RouteStop[] | null>(null);

  // Popups running on the chosen date in the chosen area.
  const { popups } = usePopups({
    neighborhoods: neighborhood ? [neighborhood] : [],
    dateRange: { start: date, end: date },
  });
  const areaPopups = neighborhood ? popups : [];

  const selectedPopups = useMemo(
    () => areaPopups.filter((p) => selectedIds.includes(p.id)),
    [areaPopups, selectedIds],
  );

  const pickDate = (d: string) => {
    setDate(d);
    setSelectedIds([]);
    setRoute(null);
  };

  const pickNeighborhood = (n: Neighborhood) => {
    setNeighborhood(n);
    setSelectedIds([]);
    setRoute(null);
  };

  const toggle = (id: string) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  // ---- Route results view ----
  if (route) {
    const totalWalk = totalWalkMinutes(route);
    const first = route[0].popup;
    return (
      <View className="flex-1 bg-gray-50">
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
          <View className="mb-4 rounded-2xl bg-brand p-4">
            <Text className="text-xs font-semibold uppercase tracking-wide text-brand-light">
              Your day in {neighborhood} · {formatWeekdayDate(date)}
            </Text>
            <Text className="mt-1 text-xl font-extrabold text-white">
              {route.length} stops · ~{totalWalk} min walking
            </Text>
          </View>

          {/* Getting there */}
          <View className="mb-4 flex-row items-center gap-2 rounded-2xl bg-white p-4">
            <Ionicons name="train" size={20} color={colors.brand.DEFAULT} />
            <Text className="flex-1 text-sm text-ink">
              Start at {first.subway.station} Station ({first.subway.line}),
              Exit {first.subway.exit}
            </Text>
          </View>

          {/* Timeline of stops */}
          {route.map((stop, i) => {
            const isLast = i === route.length - 1;
            return (
              <View key={stop.popup.id} className="flex-row">
                {/* Rail: number + connecting line */}
                <View className="mr-3 items-center" style={{ width: 28 }}>
                  <View className="h-7 w-7 items-center justify-center rounded-full bg-brand">
                    <Text className="text-sm font-bold text-white">
                      {i + 1}
                    </Text>
                  </View>
                  {!isLast && (
                    <View className="my-1 w-0.5 flex-1 bg-brand-light" />
                  )}
                </View>

                {/* Content */}
                <View className="flex-1 pb-4">
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: '/popup/[id]',
                        params: { id: stop.popup.id },
                      })
                    }
                    style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
                    className="flex-row items-center gap-3 rounded-2xl bg-white p-3"
                  >
                    <View className="flex-1">
                      <Text
                        className="text-sm font-bold text-ink"
                        numberOfLines={1}
                      >
                        {stop.popup.name}
                      </Text>
                      <Text className="text-xs text-muted">
                        {stop.popup.category} · {stop.popup.hours}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={colors.muted}
                    />
                  </Pressable>

                  {!isLast && (
                    <View className="mt-2 flex-row items-center gap-1.5">
                      <Ionicons name="walk" size={15} color={colors.muted} />
                      <Text className="text-xs text-muted">
                        ~{route[i + 1].walkFromPrevMin} min walk
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}

          <Text className="mt-2 text-center text-xs text-muted">
            Walking times are estimates and will improve with live routing.
          </Text>
        </ScrollView>

        <View
          className="border-t border-gray-100 bg-white px-4 pt-3"
          style={{ paddingBottom: insets.bottom + 12 }}
        >
          <Pressable
            onPress={() => setRoute(null)}
            style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
            className="items-center rounded-2xl border border-gray-300 py-3.5"
          >
            <Text className="text-base font-semibold text-ink">
              Edit selection
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ---- Selection view ----
  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        <Text className="text-base text-ink">
          Pick a day and area, choose the pop-ups you want to visit, and we’ll
          order them into a walking route.
        </Text>

        {/* 1. Date */}
        <Text className="mb-2 mt-5 text-sm font-bold text-ink">
          1. Choose a day
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-2 pr-2"
        >
          {dates.map((d) => (
            <Chip
              key={d}
              label={d === todayIso() ? 'Today' : formatDayChip(d)}
              selected={date === d}
              onPress={() => pickDate(d)}
            />
          ))}
        </ScrollView>

        {/* 2. Area */}
        <Text className="mb-2 mt-5 text-sm font-bold text-ink">
          2. Choose an area
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {NEIGHBORHOODS.map((n) => (
            <Chip
              key={n}
              label={n}
              selected={neighborhood === n}
              onPress={() => pickNeighborhood(n)}
            />
          ))}
        </View>

        {/* 3. Pop-ups */}
        {neighborhood && (
          <>
            <Text className="mb-2 mt-5 text-sm font-bold text-ink">
              3. Choose pop-ups ({selectedIds.length} selected)
            </Text>
            {areaPopups.length === 0 ? (
              <Text className="text-sm text-muted">
                No pop-ups running in {neighborhood} on{' '}
                {formatWeekdayDate(date)}.
              </Text>
            ) : (
              areaPopups.map((p) => (
                <SelectablePopupRow
                  key={p.id}
                  popup={p}
                  selected={selectedIds.includes(p.id)}
                  onToggle={() => toggle(p.id)}
                />
              ))
            )}
          </>
        )}
      </ScrollView>

      <View
        className="border-t border-gray-100 bg-white px-4 pt-3"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <Pressable
          disabled={selectedPopups.length < 2}
          onPress={() => setRoute(buildRoute(selectedPopups))}
          style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
          className={`items-center rounded-2xl py-4 ${
            selectedPopups.length < 2 ? 'bg-gray-300' : 'bg-brand'
          }`}
        >
          <Text className="text-base font-bold text-white">
            {selectedPopups.length < 2
              ? 'Select at least 2 pop-ups'
              : `Plan my route (${selectedPopups.length})`}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
