import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { colors } from '@/constants/theme';

interface SectionHeaderProps {
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onSeeAll?: () => void;
}

/** Row title for a Home section, with an optional "See all" action. */
export function SectionHeader({ title, icon, onSeeAll }: SectionHeaderProps) {
  return (
    <View className="mb-2 flex-row items-center justify-between px-4">
      <View className="flex-row items-center gap-1.5">
        {icon && (
          <Ionicons name={icon} size={16} color={colors.brand.DEFAULT} />
        )}
        <Text className="text-base font-bold text-ink">{title}</Text>
      </View>
      {onSeeAll && (
        <Pressable onPress={onSeeAll}>
          <Text className="text-xs font-semibold text-muted">See all</Text>
        </Pressable>
      )}
    </View>
  );
}
