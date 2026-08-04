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

/**
 * Deterministic 32-bit FNV-1a. A pop-up must get the same card on every
 * render and every device, so the variant is derived, never random.
 */
function hash(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function hexToHsl(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l * 100];
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h =
    max === r
      ? ((g - b) / d + (g < b ? 6 : 0)) / 6
      : max === g
        ? ((b - r) / d + 2) / 6
        : ((r - g) / d + 4) / 6;
  return [h * 360, s * 100, l * 100];
}

function hslToHex(h: number, s: number, l: number): string {
  const hN = ((h % 360) + 360) % 360;
  const sN = clamp(s, 0, 100) / 100;
  const lN = clamp(l, 0, 100) / 100;
  const a = sN * Math.min(lN, 1 - lN);
  const channel = (n: number) => {
    const k = (n + hN / 30) % 12;
    const c = lN - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * c)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Two pop-ups in the same category used to render a byte-identical card. At
 * feature size the name carries the difference, but a 52px map thumbnail hides
 * the text (see `showText`) — so all six Art pop-ups looked like one repeated
 * image. Nudge hue/lightness inside the category's family and move the
 * backdrop glyph, which is what actually reads at thumbnail size.
 */
function variantFor(name: string, category: Category) {
  const base = CATEGORY_TINT[category];
  const h = hash(name);
  const [bh, bs, bl] = hexToHsl(base.bg);
  const [ih, is, il] = hexToHsl(base.ink);

  // Shift background and ink by the same hue delta so they stay harmonious.
  const hueShift = (h % 31) - 15;

  // Both channels are bounded relative to the category base: let lightness
  // drift freely and the tint washes out to near-white, let saturation drift
  // and it goes grey. Either way it stops reading as that category.
  const bg = hslToHex(
    bh + hueShift,
    clamp(bs + (((h >>> 5) % 19) - 9), bs * 0.65, bs * 1.35),
    clamp(bl + (((h >>> 9) % 9) - 4), 88, 96),
  );

  // The name renders in `ink` on `bg` at 13px — below the large-text cutoff,
  // so it owes WCAG AA (4.5:1). Hue rotation changes luminance on its own, so
  // darken until it clears the bar rather than assuming the shift was benign.
  let inkL = il;
  let ink = hslToHex(ih + hueShift, is, inkL);
  while (inkL > 18 && contrast(bg, ink) < 4.5) {
    inkL -= 2;
    ink = hslToHex(ih + hueShift, is, inkL);
  }

  return {
    bg,
    ink,
    rotate: `${((h >>> 17) % 45) - 22}deg`,
    corner: (h >>> 22) % 4,
    scale: 0.54 + ((h >>> 25) % 17) / 100,
  };
}

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
  const tint = variantFor(name, category);
  const showText = width >= 130;
  const iconSize = width >= 200 ? 44 : width >= 130 ? 30 : 20;

  const inset = -width * 0.12;
  const anchor =
    tint.corner === 0
      ? { right: inset, bottom: inset }
      : tint.corner === 1
        ? { left: inset, bottom: inset }
        : tint.corner === 2
          ? { right: inset, top: inset }
          : { left: inset, top: inset };

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
          ...anchor,
          opacity: 0.16,
          transform: [{ rotate: tint.rotate }],
        }}
      >
        <Ionicons
          name={CATEGORY_ICON[category]}
          size={Math.max(64, width * tint.scale)}
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
