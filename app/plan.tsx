import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip } from '@/components/ui/Chip';
import { SelectablePopupRow } from '@/components/plan/SelectablePopupRow';
import { usePopups } from '@/hooks/usePopups';
import { buildRoute, totalWalkMinutes, type RouteStop } from '@/lib/route';
import { colors } from '@/constants/theme';
import { NEIGHBORHOODS, type Neighborhood } from '@/types/popup';

export default function PlanScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [neighborhood, setNeighborhood] = useState<Neighborhood | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [route, setRoute] = useState<RouteStop[] | null>(null);

  // Popups open today in the chosen area.
  const { popups } = usePopups({
    neighborhoods: neighborhood ? [neighborhood] : [],
    statuses: ['open'],
  });
  const areaPopups = neighborhood ? popups : [];

  const selectedPopups = useMemo(
    () => areaPopups.filter((p) => selectedIds.includes(p.id)),
    [areaPopups, selectedIds],
  );

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
              Your day in {neighborhood}
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

          {/* Stops */}
          {route.map((stop, i) => (
            <View key={stop.popup.id}>
              {i > 0 && (
                <View className="my-1 flex-row items-center gap-2 pl-3">
                  <Ionicons name="walk" size={16} color={colors.muted} />
                  <Text className="text-xs text-muted">
                    ~{stop.walkFromPrevMin} min walk
                  </Text>
                </View>
              )}
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
                <View className="h-7 w-7 items-center justify-center rounded-full bg-brand">
                  <Text className="text-sm font-bold text-white">{i + 1}</Text>
                </View>
                <View className="flex-1">
                  <Text
                    className="text-sm font-bold text-ink"
                    numberOfLines={1}
                  >
                    {stop.popup.name}
                  </Text>
                  <Text className="text-xs text-muted">{stop.popup.hours}</Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.muted}
                />
              </Pressable>
            </View>
          ))}

          <Text className="mt-4 text-center text-xs text-muted">
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
          Pick an area, choose the pop-ups you want to visit, and we’ll order
          them into a walking route.
        </Text>

        <Text className="mb-2 mt-5 text-sm font-bold text-ink">
          1. Choose an area
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

        {neighborhood && (
          <>
            <Text className="mb-2 mt-5 text-sm font-bold text-ink">
              2. Choose pop-ups ({selectedIds.length} selected)
            </Text>
            {areaPopups.length === 0 ? (
              <Text className="text-sm text-muted">
                No pop-ups open in {neighborhood} today.
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
