import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Image, Text, View } from 'react-native';

import { colors } from '@/constants/theme';

interface AvatarProps {
  /** Profile photo. Falls back to an initial if absent or if it fails to load. */
  uri?: string | null;
  name?: string | null;
  email?: string | null;
  size: number;
  /** Header/list avatars are squircles; the profile screen's is a circle. */
  rounded?: 'full' | '2xl';
  /** Guests have no identity to show — render a person glyph instead. */
  guest?: boolean;
}

function initial(name?: string | null, email?: string | null): string | null {
  const source = name?.trim() || email?.trim();
  return source ? source[0]!.toUpperCase() : null;
}

/**
 * A user's picture, or a tinted circle with their initial.
 *
 * The `onError` fallback is load-bearing, not polish: Google serves avatars
 * from lh3.googleusercontent.com URLs that rotate and eventually 404, so
 * without it a returning user gets a broken-image glyph in their header. Same
 * approach as PopupImage.
 */
export function Avatar({
  uri,
  name,
  email,
  size,
  rounded = '2xl',
  guest = false,
}: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const radius = rounded === 'full' ? size / 2 : size * 0.29;
  const letter = initial(name, email);
  const showImage = !!uri && !failed && !guest;

  return (
    <View
      className="items-center justify-center overflow-hidden bg-brand-light"
      style={{ width: size, height: size, borderRadius: radius }}
    >
      {showImage ? (
        <Image
          source={{ uri }}
          onError={() => setFailed(true)}
          resizeMode="cover"
          style={{ width: size, height: size }}
        />
      ) : guest || !letter ? (
        <Ionicons
          name="person"
          size={Math.round(size * 0.5)}
          color={colors.brand.dark}
        />
      ) : (
        <Text
          className="font-extrabold text-brand-dark"
          style={{ fontSize: Math.round(size * 0.4) }}
        >
          {letter}
        </Text>
      )}
    </View>
  );
}
