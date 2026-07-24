import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Share, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PopupMapView } from '@/components/map/PopupMapView';
import { Chip } from '@/components/ui/Chip';
import { DatePickerSheet } from '@/components/plan/DatePickerSheet';
import { SelectablePopupRow } from '@/components/plan/SelectablePopupRow';
import { usePopups } from '@/hooks/usePopups';
import { useWalkingRoute } from '@/hooks/useWalkingRoute';
import { buildRoute, totalWalkMinutes, type RouteStop } from '@/lib/route';
import { formatWeekdayDate, todayIso } from '@/lib/format';
import { colors } from '@/constants/theme';
import { NEIGHBORHOODS, type Neighborhood } from '@/types/popup';

export default function PlanScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [date, setDate] = useState<string>(todayIso());
  const [neighborhood, setNeighborhood] = useState<Neighborhood | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [route, setRoute] = useState<RouteStop[] | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);

  const isToday = date === todayIso();

  // Popups running on the chosen date in the chosen area.
  const { popups } = usePopups({
    neighborhoods: neighborhood ? [neighborhood] : [],
    dateRange: { start: date, end: date },
  });
  const areaPopups = useMemo(
    () => (neighborhood ? popups : []),
    [neighborhood, popups],
  );

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

  // Enhances `route` with real walking legs + a road-following polyline when a
  // routing key is configured; falls back to the straight-line v1 estimates
  // otherwise. Hooks can't be conditional, so this runs every render.
  const enhanced = useWalkingRoute(route ?? []);

  const shareItinerary = async () => {
    if (!route) return;
    const lines = [
      `My Seoul Popups day — ${neighborhood}, ${formatWeekdayDate(date)}`,
      ...enhanced.stops.map(
        (s, i) =>
          `${i + 1}. ${s.popup.name}` +
          (i > 0 ? ` (${s.walkFromPrevMin} min walk)` : ''),
      ),
      `${enhanced.stops.length} stops · ~${totalWalkMinutes(enhanced.stops)} min walking total`,
      'Planned on Seoul Popups',
    ];
    try {
      await Share.share({ message: lines.join('\n') });
    } catch {
      // dismissed or unavailable — nothing to do
    }
  };

  // ---- Route results view ----
  if (route && route.length > 0) {
    const totalWalk = totalWalkMinutes(enhanced.stops);
    const first = enhanced.stops[0].popup;
    const stopOrder = Object.fromEntries(
      enhanced.stops.map((s, i) => [s.popup.id, i + 1]),
    );
    return (
      <View className="flex-1 bg-bg">
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
          <View className="mb-4 h-56 overflow-hidden rounded-3xl">
            <PopupMapView
              popups={enhanced.stops.map((s) => s.popup)}
              selectedId={null}
              onSelect={() => {}}
              routeCoords={enhanced.polyline ?? undefined}
              stopOrder={stopOrder}
            />
          </View>

          <View className="mb-4 flex-row items-center justify-between rounded-2xl bg-purple p-4">
            <View className="flex-1">
              <Text className="text-xs font-semibold uppercase tracking-wide text-[#D8CBFF]">
                Your day in {neighborhood} · {formatWeekdayDate(date)}
              </Text>
              <Text className="mt-1 text-xl font-extrabold text-white">
                {route.length} stops · ~{totalWalk} min walking
              </Text>
            </View>
            <Pressable
              onPress={shareItinerary}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Share itinerary"
              style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
              className="h-10 w-10 items-center justify-center rounded-2xl bg-white/15"
            >
              <Ionicons name="share-outline" size={19} color="#fff" />
            </Pressable>
          </View>

          {/* Getting there */}
          <View className="mb-4 flex-row items-center gap-2 rounded-2xl bg-surface p-4">
            <Ionicons name="train" size={20} color={colors.brand.DEFAULT} />
            <Text className="flex-1 text-sm text-ink">
              Start at {first.subway.station} Station ({first.subway.line}),
              Exit {first.subway.exit}
            </Text>
          </View>

          {/* Timeline of stops */}
          {enhanced.stops.map((stop, i) => {
            const isLast = i === enhanced.stops.length - 1;
            return (
              <View key={stop.popup.id} className="flex-row">
                {/* Rail: number + connecting line */}
                <View className="mr-3 items-center" style={{ width: 28 }}>
                  <View className="h-7 w-7 items-center justify-center rounded-full bg-purple">
                    <Text className="text-sm font-bold text-white">
                      {i + 1}
                    </Text>
                  </View>
                  {!isLast && (
                    <View className="my-1 w-0.5 flex-1 bg-purple-light" />
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
                    className="flex-row items-center gap-3 rounded-2xl bg-surface p-3"
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
                        ~{enhanced.stops[i + 1].walkFromPrevMin} min walk
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}

          <Text className="mt-2 text-center text-xs text-muted">
            {enhanced.loading
              ? 'Fetching live walking directions…'
              : enhanced.live
                ? 'Live walking times from Google Directions.'
                : 'Estimated walking times (straight-line).'}
          </Text>
        </ScrollView>

        <View
          className="border-t border-line bg-surface px-4 pt-3"
          style={{ paddingBottom: insets.bottom + 12 }}
        >
          <Pressable
            onPress={() => setRoute(null)}
            style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
            className="items-center rounded-2xl border border-line-strong py-3.5"
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
    <View className="flex-1 bg-bg">
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        <Text className="text-base text-ink">
          Pick a day and area, choose the pop-ups you want to visit, and we’ll
          order them into a walking route.
        </Text>

        {/* 1. Date */}
        <Text className="mb-2 mt-5 text-sm font-bold text-ink">
          1. Choose a day
        </Text>
        <View className="flex-row flex-wrap items-center gap-2">
          <Chip
            label="Today"
            selected={isToday}
            onPress={() => pickDate(todayIso())}
          />
          <Pressable
            onPress={() => setShowCalendar(true)}
            style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
            className={`flex-row items-center gap-1.5 rounded-full border px-3.5 py-2 ${
              isToday
                ? 'border-line-strong bg-surface'
                : 'border-purple bg-purple-light'
            }`}
          >
            <Ionicons
              name="calendar-outline"
              size={16}
              color={isToday ? colors.muted : colors.purple.DEFAULT}
            />
            <Text
              className={`text-sm font-semibold ${
                isToday ? 'text-ink' : 'text-purple'
              }`}
            >
              {isToday ? 'Pick a date' : formatWeekdayDate(date)}
            </Text>
          </Pressable>
        </View>

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
        className="border-t border-line bg-surface px-4 pt-3"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <Pressable
          disabled={selectedPopups.length < 2}
          onPress={() => setRoute(buildRoute(selectedPopups))}
          style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
          className={`items-center rounded-2xl py-4 ${
            selectedPopups.length < 2 ? 'bg-line-strong' : 'bg-brand'
          }`}
        >
          <Text className="text-base font-bold text-white">
            {selectedPopups.length < 2
              ? 'Select at least 2 pop-ups'
              : `Plan my route (${selectedPopups.length})`}
          </Text>
        </Pressable>
      </View>

      <DatePickerSheet
        visible={showCalendar}
        selected={date}
        onSelect={pickDate}
        onClose={() => setShowCalendar(false)}
      />
    </View>
  );
}
