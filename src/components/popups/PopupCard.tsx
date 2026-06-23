import { Pressable, Text, View } from 'react-native';
import { PopupImage } from '@/components/popups/PopupImage';
import { formatDateRange } from '@/lib/format';
import { daysUntilEnd, endingLabel } from '@/lib/popupStatus';
import type { Popup } from '@/types/popup';

interface PopupCardProps {
  popup: Popup;
  onPress?: () => void;
}

const ENDING_SOON_DAYS = 7;

/** A tappable card summarizing a single popup in the Discover list. */
export function PopupCard({ popup, onPress }: PopupCardProps) {
  const daysLeft = daysUntilEnd(popup);
  const endingSoon = daysLeft >= 0 && daysLeft <= ENDING_SOON_DAYS;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.92 : 1 })}
      className="mb-4 overflow-hidden rounded-2xl bg-white shadow-sm"
    >
      <PopupImage uri={popup.imageUrl} className="h-48 w-full" iconSize={28} />

      <View className="p-4">
        <View className="mb-1 flex-row items-center justify-between">
          <Text className="text-xs font-semibold uppercase tracking-wide text-brand">
            {popup.neighborhood}
          </Text>
          {popup.reservable && (
            <View className="rounded-full bg-brand-light/40 px-2 py-0.5">
              <Text className="text-[10px] font-bold uppercase text-brand-dark">
                Reservable
              </Text>
            </View>
          )}
        </View>

        <Text className="text-lg font-bold text-ink" numberOfLines={1}>
          {popup.name}
        </Text>
        <Text className="mt-0.5 text-sm text-muted" numberOfLines={1}>
          {popup.tagline}
        </Text>

        <View className="mt-3 flex-row flex-wrap items-center gap-x-3 gap-y-1.5">
          <Text className="text-xs text-muted">
            📅 {formatDateRange(popup.startDate, popup.endDate)}
          </Text>
          <Text className="text-xs text-muted">
            🚇 {popup.subway.line} · Exit {popup.subway.exit} ·{' '}
            {popup.subway.walkMinutes} min
          </Text>
          {endingSoon && (
            <View className="rounded-md bg-brand-light/40 px-2 py-0.5">
              <Text className="text-[10px] font-bold text-brand-dark">
                {endingLabel(popup)}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}
