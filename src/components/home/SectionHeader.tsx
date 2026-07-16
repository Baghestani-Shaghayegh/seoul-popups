import { Pressable, Text, View } from 'react-native';

interface SectionHeaderProps {
  title: string;
  /** Label for the pink action link, defaults to "See all". */
  actionLabel?: string;
  onSeeAll?: () => void;
}

/** Row title for a Home section, with an optional pink action link. */
export function SectionHeader({
  title,
  actionLabel = 'See all',
  onSeeAll,
}: SectionHeaderProps) {
  return (
    <View className="mb-2 flex-row items-baseline justify-between px-4">
      <Text className="text-[17px] font-extrabold text-ink">{title}</Text>
      {onSeeAll && (
        <Pressable onPress={onSeeAll} hitSlop={8}>
          <Text className="text-xs font-bold text-brand">{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}
