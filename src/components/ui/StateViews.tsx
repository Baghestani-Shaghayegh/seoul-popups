import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { colors } from '@/constants/theme';

/** Centered "we're fetching" state. */
export function LoadingState({
  label = 'Loading pop-ups…',
}: {
  label?: string;
}) {
  return (
    <View className="items-center px-8 py-20">
      <ActivityIndicator color={colors.brand.DEFAULT} />
      <Text className="mt-3 text-sm text-muted">{label}</Text>
    </View>
  );
}

/** Centered load-failure state with a retry button. */
export function ErrorState({
  onRetry,
  message = 'Check your connection and try again.',
}: {
  onRetry?: () => void;
  message?: string;
}) {
  return (
    <View className="items-center px-8 py-20">
      <Ionicons name="cloud-offline-outline" size={36} color={colors.muted} />
      <Text className="mt-3 text-base font-semibold text-ink">
        Couldn’t load pop-ups
      </Text>
      <Text className="mt-1 text-center text-sm text-muted">{message}</Text>
      {onRetry && (
        <Pressable
          onPress={onRetry}
          style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
          className="mt-4 rounded-full bg-brand px-5 py-2.5"
        >
          <Text className="text-sm font-bold text-white">Try again</Text>
        </Pressable>
      )}
    </View>
  );
}

/** Centered "nothing to show" state, with an optional call to action. */
export function EmptyState({
  icon = 'sparkles-outline',
  title,
  subtitle,
  action,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View className="items-center px-8 py-20">
      <Ionicons name={icon} size={36} color={colors.muted} />
      <Text className="mt-3 text-base font-semibold text-ink">{title}</Text>
      {subtitle && (
        <Text className="mt-1 text-center text-sm text-muted">{subtitle}</Text>
      )}
      {action && (
        <Pressable
          onPress={action.onPress}
          style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
          className="mt-4 rounded-full bg-brand px-5 py-2.5"
        >
          <Text className="text-sm font-bold text-white">{action.label}</Text>
        </Pressable>
      )}
    </View>
  );
}
