import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { colors } from '@/constants/theme';
import type { FilterOption } from '@/components/popups/FilterSheet';

interface MultiFilterSheetProps<T extends string> {
  visible: boolean;
  title: string;
  options: FilterOption<T>[];
  selectedKeys: T[];
  /** Commit the chosen keys (called on Apply). */
  onApply: (keys: T[]) => void;
  onClose: () => void;
}

/**
 * Bottom-sheet multi-select shown as a grid of chips, with Reset / Apply.
 * Selections are held in a local draft and only committed when Apply is tapped.
 */
export function MultiFilterSheet<T extends string>({
  visible,
  title,
  options,
  selectedKeys,
  onApply,
  onClose,
}: MultiFilterSheetProps<T>) {
  const [draft, setDraft] = useState<T[]>(selectedKeys);

  // Re-seed the draft from committed state each time the sheet opens.
  useEffect(() => {
    if (visible) setDraft(selectedKeys);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const toggle = (key: T) =>
    setDraft((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );

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
            <Text className="text-lg font-bold text-ink">{title}</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.ink} />
            </Pressable>
          </View>

          <View className="flex-row flex-wrap gap-2.5 px-5 py-2">
            {options.map((o) => {
              const selected = draft.includes(o.key);
              return (
                <Pressable
                  key={o.key}
                  onPress={() => toggle(o.key)}
                  style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
                  className={`rounded-full border px-4 py-2.5 ${
                    selected
                      ? 'border-brand bg-brand'
                      : 'border-gray-300 bg-white'
                  }`}
                >
                  <Text
                    className={`text-sm font-semibold ${
                      selected ? 'text-white' : 'text-ink'
                    }`}
                  >
                    {o.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View className="mt-3 flex-row items-center gap-4 px-5 pt-2">
            <Pressable
              onPress={() => setDraft([])}
              hitSlop={6}
              className="py-2"
            >
              <Text className="text-base font-semibold text-muted underline">
                Reset
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                onApply(draft);
                onClose();
              }}
              style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
              className="flex-1 items-center rounded-2xl bg-brand py-3.5"
            >
              <Text className="text-base font-bold text-white">Apply</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
