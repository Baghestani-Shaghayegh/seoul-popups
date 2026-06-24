import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, Text, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
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
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end">
        <Pressable className="absolute inset-0 bg-black/40" onPress={onClose} />
        <View className="rounded-t-3xl bg-white pb-9 pt-3">
          <View className="mb-1 h-1 w-10 self-center rounded-full bg-gray-300" />
          <View className="flex-row items-center justify-between px-5 py-2">
            <Text className="text-lg font-bold text-ink">Pick a date</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.ink} />
            </Pressable>
          </View>
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
        </View>
      </View>
    </Modal>
  );
}
