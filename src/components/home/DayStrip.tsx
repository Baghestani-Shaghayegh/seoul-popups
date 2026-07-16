import { Pressable, ScrollView, Text, View } from 'react-native';

import { todayIso } from '@/lib/format';

const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const DAYS_SHOWN = 7;

function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d + days);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${mm}-${dd}`;
}

interface DayStripProps {
  selectedIso: string;
  onSelect: (iso: string) => void;
}

/**
 * "Pick a day" strip: the next 7 days as tappable pills. The selected day is
 * purple (= "your day" in the color-role rule); today carries a pink dot.
 */
export function DayStrip({ selectedIso, onSelect }: DayStripProps) {
  const today = todayIso();
  const days = Array.from({ length: DAYS_SHOWN }, (_, i) =>
    addDaysIso(today, i),
  );

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-2.5 px-4 py-0.5"
    >
      {days.map((iso) => {
        const selected = iso === selectedIso;
        const [y, m, d] = iso.split('-').map(Number);
        const weekday = DAY_NAMES[new Date(y, m - 1, d).getDay()];
        return (
          <Pressable
            key={iso}
            onPress={() => onSelect(iso)}
            style={({ pressed }) => ({
              transform: [{ scale: pressed ? 0.95 : 1 }],
            })}
            className={`h-[66px] w-[50px] items-center justify-center gap-1 rounded-2xl border ${
              selected
                ? 'border-purple bg-purple'
                : 'border-line-strong bg-surface'
            }`}
          >
            <Text
              className={`text-[11px] font-semibold ${
                selected ? 'text-white/70' : 'text-faint'
              }`}
            >
              {weekday}
            </Text>
            <Text
              className={`text-[17px] font-extrabold ${
                selected ? 'text-white' : 'text-ink'
              }`}
            >
              {d}
            </Text>
            {iso === today && (
              <View
                className={`h-[5px] w-[5px] rounded-full ${
                  selected ? 'bg-white' : 'bg-brand'
                }`}
              />
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
