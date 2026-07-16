import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native';

import { colors } from '@/constants/theme';
import { useFavorites } from '@/hooks/useFavorites';

interface SaveButtonProps {
  popupId: string;
  /** Diameter in px (default 32). */
  size?: number;
}

/**
 * Round white save-heart used as an overlay on cards. Pink when saved.
 * Swallows the tap so the parent card doesn't navigate.
 */
export function SaveButton({ popupId, size = 32 }: SaveButtonProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const saved = isFavorite(popupId);

  return (
    <Pressable
      onPress={() => toggleFavorite(popupId)}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={saved ? 'Remove from saved' : 'Save'}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: 'rgba(255,255,255,0.92)',
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ scale: pressed ? 0.9 : 1 }],
      })}
    >
      <Ionicons
        name={saved ? 'heart' : 'heart-outline'}
        size={size * 0.55}
        color={saved ? colors.brand.DEFAULT : colors.muted}
      />
    </Pressable>
  );
}
