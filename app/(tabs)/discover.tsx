import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FilterButton } from '@/components/popups/FilterButton';
import {
  FilterSheet,
  type FilterOption,
} from '@/components/popups/FilterSheet';
import { MultiFilterSheet } from '@/components/popups/MultiFilterSheet';
import { RailCard } from '@/components/popups/RailCard';
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '@/components/ui/StateViews';
import { usePopups } from '@/hooks/usePopups';
import { colors } from '@/constants/theme';
import { DATE_PRESETS, presetToRange, type DatePreset } from '@/lib/dateRanges';
import { STATUS_OPTIONS, type PopupStatus } from '@/lib/popupStatus';
import {
  CATEGORIES,
  NEIGHBORHOODS,
  type Category,
  type Neighborhood,
} from '@/types/popup';

type SortKey = 'newest' | 'starting' | 'ending';

const SORT_OPTIONS: FilterOption<SortKey>[] = [
  { key: 'newest', label: 'Newest' },
  { key: 'starting', label: 'Starting soon' },
  { key: 'ending', label: 'Ending soon' },
];

type SheetName = 'location' | 'category' | 'status' | 'period' | 'sort';

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const searchRef = useRef<TextInput>(null);

  // Route params are validated before use (they can arrive via deep links)
  // and cleared once consumed — this tab stays mounted, so a later tap on a
  // Home area card / search bar updates params on the existing screen.
  const { neighborhood, focus } = useLocalSearchParams<{
    neighborhood?: string;
    focus?: string;
  }>();
  const paramNeighborhood = NEIGHBORHOODS.includes(neighborhood as Neighborhood)
    ? (neighborhood as Neighborhood)
    : null;

  // When arriving from the Home search bar (?focus=1), open the keyboard once.
  useFocusEffect(
    useCallback(() => {
      if (focus) {
        searchRef.current?.focus();
        router.setParams({ focus: '' });
      }
    }, [focus, router]),
  );

  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>(
    paramNeighborhood ? [paramNeighborhood] : [],
  );

  // Apply ?neighborhood= whenever it changes (e.g. tapping an area on Home).
  useEffect(() => {
    if (paramNeighborhood) {
      setNeighborhoods([paramNeighborhood]);
      router.setParams({ neighborhood: '' });
    }
  }, [paramNeighborhood, router]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [statuses, setStatuses] = useState<PopupStatus[]>([]);
  const [datePreset, setDatePreset] = useState<DatePreset>('anytime');
  const [sort, setSort] = useState<SortKey>('newest');
  const [query, setQuery] = useState('');
  const [openSheet, setOpenSheet] = useState<SheetName | null>(null);

  const dateRange = useMemo(() => presetToRange(datePreset), [datePreset]);
  const { popups, loading, error, reload } = usePopups({
    neighborhoods,
    categories,
    statuses,
    dateRange,
    query,
  });

  const sorted = useMemo(() => {
    const arr = [...popups];
    if (sort === 'ending') {
      arr.sort((a, b) => a.endDate.localeCompare(b.endDate));
    } else if (sort === 'starting') {
      arr.sort((a, b) => a.startDate.localeCompare(b.startDate));
    } else {
      arr.sort((a, b) => b.startDate.localeCompare(a.startDate)); // newest
    }
    return arr;
  }, [popups, sort]);

  const filtersActive =
    neighborhoods.length > 0 ||
    categories.length > 0 ||
    statuses.length > 0 ||
    datePreset !== 'anytime' ||
    query !== '';

  const clearFilters = () => {
    setNeighborhoods([]);
    setCategories([]);
    setStatuses([]);
    setDatePreset('anytime');
    setQuery('');
  };

  const periodLabel =
    DATE_PRESETS.find((p) => p.key === datePreset)?.label ?? 'All';
  const sortLabel = SORT_OPTIONS.find((o) => o.key === sort)?.label ?? 'Newest';

  const neighborhoodOptions: FilterOption<Neighborhood>[] = NEIGHBORHOODS.map(
    (n) => ({ key: n, label: n }),
  );
  const categoryOptions: FilterOption<Category>[] = CATEGORIES.map((c) => ({
    key: c,
    label: c,
  }));

  return (
    <View className="flex-1 bg-bg" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="px-4 pb-2 pt-2">
        <Text className="text-3xl font-extrabold text-ink">Discover</Text>
        <Text className="mt-0.5 text-sm text-muted">
          {loading
            ? 'Finding pop-ups…'
            : error
              ? 'Couldn’t load pop-ups'
              : `${sorted.length} ${
                  sorted.length === 1 ? 'pop-up' : 'pop-ups'
                } happening near you`}
        </Text>
      </View>

      {/* Search */}
      <View className="mx-4 mb-3 h-14 flex-row items-center gap-2.5 rounded-2xl border border-line-strong bg-surface px-4 shadow-sm">
        <Ionicons name="search" size={20} color={colors.muted} />
        <TextInput
          ref={searchRef}
          value={query}
          onChangeText={setQuery}
          placeholder="Search pop-ups, brands…"
          placeholderTextColor={colors.muted}
          className="h-full flex-1 text-base text-ink"
          returnKeyType="search"
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={20} color={colors.muted} />
          </Pressable>
        )}
      </View>

      {/* Multi-select filter buttons */}
      <View className="flex-row flex-wrap items-center gap-2 px-4">
        <FilterButton
          label="Location"
          count={neighborhoods.length}
          open={openSheet === 'location'}
          onPress={() => setOpenSheet('location')}
        />
        <FilterButton
          label="Category"
          count={categories.length}
          open={openSheet === 'category'}
          onPress={() => setOpenSheet('category')}
        />
        <FilterButton
          label="Status"
          count={statuses.length}
          open={openSheet === 'status'}
          onPress={() => setOpenSheet('status')}
        />
      </View>

      {/* Period (left) + Sort (right) */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <Pressable
          onPress={() => setOpenSheet('period')}
          style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
          className="flex-row items-center gap-1 rounded-lg bg-well px-3 py-1.5"
        >
          <Text className="text-sm text-ink">Period: {periodLabel}</Text>
          <Ionicons name="chevron-down" size={14} color={colors.muted} />
        </Pressable>

        <Pressable
          onPress={() => setOpenSheet('sort')}
          style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
          className="flex-row items-center gap-1"
        >
          <Text className="text-sm font-semibold text-ink">{sortLabel}</Text>
          <Ionicons name="chevron-down" size={16} color={colors.ink} />
        </Pressable>
      </View>

      {/* Results grid */}
      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperClassName="justify-between px-4"
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
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
          ) : error ? (
            <ErrorState onRetry={reload} />
          ) : (
            <EmptyState
              icon="search"
              title="No pop-ups found"
              subtitle="Try a different location, category, or search term."
              action={
                filtersActive
                  ? { label: 'Clear filters', onPress: clearFilters }
                  : undefined
              }
            />
          )
        }
      />

      {/* Sheets */}
      <MultiFilterSheet
        visible={openSheet === 'location'}
        title="Location"
        options={neighborhoodOptions}
        selectedKeys={neighborhoods}
        onApply={setNeighborhoods}
        onClose={() => setOpenSheet(null)}
      />
      <MultiFilterSheet
        visible={openSheet === 'category'}
        title="Category"
        options={categoryOptions}
        selectedKeys={categories}
        onApply={setCategories}
        onClose={() => setOpenSheet(null)}
      />
      <MultiFilterSheet
        visible={openSheet === 'status'}
        title="Status"
        options={STATUS_OPTIONS}
        selectedKeys={statuses}
        onApply={setStatuses}
        onClose={() => setOpenSheet(null)}
      />
      <FilterSheet
        visible={openSheet === 'period'}
        title="Period"
        options={DATE_PRESETS}
        selectedKey={datePreset}
        onSelect={setDatePreset}
        onClose={() => setOpenSheet(null)}
      />
      <FilterSheet
        visible={openSheet === 'sort'}
        title="Sort by"
        options={SORT_OPTIONS}
        selectedKey={sort}
        onSelect={setSort}
        onClose={() => setOpenSheet(null)}
      />
    </View>
  );
}
