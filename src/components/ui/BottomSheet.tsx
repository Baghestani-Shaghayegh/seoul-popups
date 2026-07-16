import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, Text, View } from 'react-native';
import { colors } from '@/constants/theme';

interface BottomSheetProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

/**
 * Shared bottom-sheet chrome: dimmed tap-to-dismiss backdrop, drag handle,
 * and a title row with a close button. Sheets provide their own content.
 */
export function BottomSheet({
  visible,
  title,
  onClose,
  children,
}: BottomSheetProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end">
        <Pressable className="absolute inset-0 bg-black/40" onPress={onClose} />
        <View className="rounded-t-3xl bg-surface pb-9 pt-3">
          <View className="mb-1 h-1 w-10 self-center rounded-full bg-line-strong" />
          <View className="flex-row items-center justify-between px-5 py-2">
            <Text className="text-lg font-bold text-ink">{title}</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.ink} />
            </Pressable>
          </View>
          {children}
        </View>
      </View>
    </Modal>
  );
}
