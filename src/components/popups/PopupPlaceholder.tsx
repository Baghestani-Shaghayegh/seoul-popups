import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { colors } from '@/constants/theme';
import type { Category } from '@/types/popup';

/**
 * The house card we show when a pop-up has no photo we are entitled to use.
 *
 * This is a legitimate state, not a failure state. Every pop-up seeded before
 * 2026-08-03 carried an image lifted from a competitor's CDN (CONTENT.md §4),
 * which is the project's largest live legal exposure — the brand owns the
 * photo, and the aggregator owns their crop of it. A generated card owes
 * nobody: it is on-brand, always available, and never expires.
 *
 * Swap in a real photo per pop-up as brand press kits / permission arrive.
 */

const CATEGORY_ICON: Record<Category, keyof typeof Ionicons.glyphMap> = {
  Fashion: 'shirt',
  Beauty: 'sparkles',
  Food: 'restaurant',
  Art: 'color-palette',
  Lifestyle: 'bag-handle',
};

/** Tints drawn from the existing palette so cards read as one family. */
const CATEGORY_TINT: Record<Category, { bg: string; ink: string }> = {
  Fashion: { bg: colors.brand.light, ink: colors.brand.dark },
  Beauty: { bg: colors.peach.DEFAULT, ink: colors.peach.ink },
  Art: { bg: colors.purple.light, ink: colors.purple.DEFAULT },
  Food: { bg: '#E4F0E6', ink: '#3F7A52' },
  Lifestyle: { bg: '#E2EFF5', ink: '#3C6C85' },
};

interface PopupPlaceholderProps {
  name: string;
  category: Category;
  neighborhood?: string;
}

export function PopupPlaceholder({
  name,
  category,
  neighborhood,
}: PopupPlaceholderProps) {
  // The same component backs a 52px rail thumbnail and a 256px feature card,
  // so decide what fits from the measured box rather than a prop every caller
  // would have to keep in sync.
  const [width, setWidth] = useState(0);
  const tint = CATEGORY_TINT[category];
  const showText = width >= 130;
  const iconSize = width >= 200 ? 44 : width >= 130 ? 30 : 20;

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      className="h-full w-full items-center justify-center overflow-hidden px-3"
      style={{ backgroundColor: tint.bg }}
    >
      {/* Oversized, very low-contrast glyph as the backdrop texture. */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          right: -width * 0.12,
          bottom: -width * 0.12,
          opacity: 0.16,
        }}
      >
        <Ionicons
          name={CATEGORY_ICON[category]}
          size={Math.max(64, width * 0.62)}
          color={tint.ink}
        />
      </View>

      <Ionicons
        name={CATEGORY_ICON[category]}
        size={iconSize}
        color={tint.ink}
      />

      {showText && (
        <>
          <Text
            numberOfLines={2}
            className="mt-2 text-center text-[13px] font-extrabold leading-4"
            style={{ color: tint.ink }}
          >
            {name}
          </Text>
          {neighborhood ? (
            <Text
              numberOfLines={1}
              className="mt-1 text-center text-[11px] font-semibold uppercase tracking-wide"
              style={{ color: tint.ink, opacity: 0.75 }}
            >
              {neighborhood}
            </Text>
          ) : null}
        </>
      )}
    </View>
  );
}
