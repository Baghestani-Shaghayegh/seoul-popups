import { Calendar } from 'react-native-calendars';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { colors } from '@/constants/theme';
import { todayIso } from '@/lib/format';

interface DatePickerSheetProps {
  visible: boolean;
  /** Currently selected date (ISO YYYY-MM-DD). */
  selected: string;
  onSelect: (iso: string) => void;
  onClose: () => void;
}

/** Bottom-sheet month calendar for picking any upcoming date. */
export function DatePickerSheet({
  visible,
  selected,
  onSelect,
  onClose,
}: DatePickerSheetProps) {
  return (
    <BottomSheet visible={visible} title="Pick a date" onClose={onClose}>
      <Calendar
        minDate={todayIso()}
        current={selected}
        markedDates={{
          [selected]: {
            selected: true,
            selectedColor: colors.brand.DEFAULT,
          },
        }}
        onDayPress={(day) => {
          onSelect(day.dateString);
          onClose();
        }}
        theme={{
          todayTextColor: colors.brand.DEFAULT,
          arrowColor: colors.brand.DEFAULT,
          selectedDayBackgroundColor: colors.brand.DEFAULT,
          textDayFontWeight: '400',
          textMonthFontWeight: '500',
        }}
      />
    </BottomSheet>
  );
}
