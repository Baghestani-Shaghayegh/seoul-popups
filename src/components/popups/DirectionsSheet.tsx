import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { colors } from '@/constants/theme';
import {
  openDirections,
  SYSTEM_MAP_LABEL,
  type DirectionsProvider,
  type DirectionsTarget,
} from '@/lib/directions';

interface DirectionsSheetProps {
  visible: boolean;
  onClose: () => void;
  target: DirectionsTarget;
}

interface Option {
  provider: DirectionsProvider;
  label: string;
  hint: string;
  accent: string;
}

/**
 * Directions picker. Naver / Kakao come first because they're the only apps
 * with real walking routes in Korea; the system map (Apple/Google) is the
 * always-works fallback for visitors who don't have a Korean map app.
 */
export function DirectionsSheet({
  visible,
  onClose,
  target,
}: DirectionsSheetProps) {
  const options: Option[] = [
    {
      provider: 'naver',
      label: 'Naver Map',
      hint: 'Best walking routes in Korea',
      accent: '#03C75A',
    },
    {
      provider: 'kakao',
      label: 'Kakao Map',
      hint: 'Best walking routes in Korea',
      accent: '#3C1E1E',
    },
    {
      provider: 'system',
      label: SYSTEM_MAP_LABEL,
      hint: 'Works without a Korean app',
      accent: colors.ink,
    },
  ];

  const pick = (provider: DirectionsProvider) => {
    onClose();
    void openDirections(provider, target);
  };

  return (
    <BottomSheet visible={visible} title="Get directions" onClose={onClose}>
      <View className="gap-2.5 px-5 pt-1">
        {options.map((o) => (
          <Pressable
            key={o.provider}
            onPress={() => pick(o.provider)}
            style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
            className="flex-row items-center gap-3 rounded-2xl bg-well p-3"
          >
            <View
              className="h-10 w-10 items-center justify-center rounded-xl"
              style={{ backgroundColor: o.accent }}
            >
              <Ionicons name="walk" size={20} color="#fff" />
            </View>
            <View className="flex-1">
              <Text className="text-[15px] font-extrabold text-ink">
                {o.label}
              </Text>
              <Text className="text-xs text-muted">{o.hint}</Text>
            </View>
            <Ionicons name="open-outline" size={18} color={colors.faint} />
          </Pressable>
        ))}
      </View>
    </BottomSheet>
  );
}
