import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Image, View } from 'react-native';
import { colors } from '@/constants/theme';

interface PopupImageProps {
  uri: string;
  /** Sizing classes for the frame, e.g. "h-48 w-full". */
  className?: string;
  iconSize?: number;
}

/**
 * Image with a neutral placeholder shown while loading and a fallback icon if
 * the URL fails — so cards never flash blank or show a broken-image glyph.
 */
export function PopupImage({ uri, className, iconSize = 24 }: PopupImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <View className={`overflow-hidden bg-gray-200 ${className ?? ''}`}>
      {(!loaded || failed) && (
        <View className="absolute inset-0 items-center justify-center">
          <Ionicons name="image-outline" size={iconSize} color={colors.muted} />
        </View>
      )}
      {!failed && (
        <Image
          source={{ uri }}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          resizeMode="cover"
          style={{ opacity: loaded ? 1 : 0 }}
          className="h-full w-full"
        />
      )}
    </View>
  );
}
