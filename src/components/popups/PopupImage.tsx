import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Image, View } from 'react-native';
import { colors } from '@/constants/theme';
import { PopupPlaceholder } from './PopupPlaceholder';
import type { Category } from '@/types/popup';

interface PopupImageProps {
  /** Undefined when we have no photo we're entitled to use — see PopupPlaceholder. */
  uri?: string;
  /** Sizing classes for the frame, e.g. "h-48 w-full". */
  className?: string;
  iconSize?: number;
  /** Passed through to the branded card when there's no usable photo. */
  name?: string;
  category?: Category;
  neighborhood?: string;
}

/**
 * Image with a neutral placeholder while loading and a fallback if the URL
 * fails — so cards never flash blank or show a broken-image glyph.
 *
 * With no `uri` (or on load failure) it renders the branded `PopupPlaceholder`
 * card when given `name`/`category`, falling back to a plain glyph otherwise.
 * A missing photo is an expected state, not an error: CONTENT.md §4 only
 * permits brand/venue/own imagery, so a pop-up legitimately has none until
 * someone sources one.
 */
export function PopupImage({
  uri,
  className,
  iconSize = 24,
  name,
  category,
  neighborhood,
}: PopupImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  const noPhoto = !uri || failed;
  const canRenderCard = noPhoto && !!name && !!category;

  return (
    <View className={`overflow-hidden bg-well ${className ?? ''}`}>
      {canRenderCard ? (
        <PopupPlaceholder
          name={name}
          category={category}
          neighborhood={neighborhood}
        />
      ) : (
        <>
          {(!loaded || noPhoto) && (
            <View className="absolute inset-0 items-center justify-center">
              <Ionicons
                name="image-outline"
                size={iconSize}
                color={colors.muted}
              />
            </View>
          )}
          {uri && !failed && (
            <Image
              source={{ uri }}
              onLoad={() => setLoaded(true)}
              onError={() => setFailed(true)}
              resizeMode="cover"
              style={{ opacity: loaded ? 1 : 0 }}
              className="h-full w-full"
            />
          )}
        </>
      )}
    </View>
  );
}
