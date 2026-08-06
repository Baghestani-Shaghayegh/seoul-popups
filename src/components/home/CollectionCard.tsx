import { Pressable, Text, View } from 'react-native';

import { PopupImage } from '@/components/popups/PopupImage';
import type { Collection } from '@/hooks/useCollections';
import type { Popup } from '@/types/popup';

/** Enough to read as "several places" without shrinking any tile to a stamp. */
const MAX_TILES = 4;

/**
 * A curated collection, shown as the pop-ups it actually contains.
 *
 * It used to be a big emoji on a flat lavender rectangle — the only card on
 * Home without a photograph, while Feature and every rail around it lead with
 * one. A collection IS a bundle of pop-ups and their images are already
 * loaded, so the card shows them the way a playlist shows its album art. The
 * emoji stays as a small accent beside the title rather than as the artwork.
 *
 * Tiles use PopupImage, so a pop-up with no photo we're entitled to use falls
 * back to its branded card instead of a hole in the grid (CONTENT.md §4).
 */
export function CollectionCard({
  collection,
  popups,
  onPress,
}: {
  collection: Collection;
  /** The loaded catalogue; ids not in it are silently skipped. */
  popups: Popup[];
  onPress: () => void;
}) {
  const items = collection.popupIds
    .map((id) => popups.find((p) => p.id === id))
    .filter((p): p is Popup => !!p)
    .slice(0, MAX_TILES);

  const count = collection.popupIds.length;
  // Two per row, so 3 items give a full-width tile underneath a pair rather
  // than an empty quarter.
  const rows = [items.slice(0, 2), items.slice(2, 4)].filter((r) => r.length);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.92 : 1 })}
      className="w-60 overflow-hidden rounded-3xl border border-line-strong bg-surface shadow-sm"
    >
      <View className="h-32 w-full flex-col gap-0.5 bg-line">
        {rows.length ? (
          rows.map((row, i) => (
            <View key={i} className="min-h-0 flex-1 flex-row gap-0.5">
              {row.map((p) => (
                <PopupImage
                  key={p.id}
                  uri={p.imageUrl}
                  name={p.name}
                  category={p.category}
                  neighborhood={p.neighborhood}
                  className="h-full flex-1"
                  iconSize={16}
                />
              ))}
            </View>
          ))
        ) : (
          <View className="flex-1 items-center justify-center bg-purple-light">
            <Text className="text-3xl">{collection.emoji ?? '✨'}</Text>
          </View>
        )}
      </View>

      <View className="p-3.5">
        <Text className="text-base font-extrabold text-ink" numberOfLines={1}>
          {collection.emoji ? `${collection.emoji} ` : ''}
          {collection.title}
        </Text>
        {collection.subtitle ? (
          <Text className="mt-0.5 text-xs text-muted" numberOfLines={2}>
            {collection.subtitle}
          </Text>
        ) : null}
        <Text className="mt-2 text-[11px] font-bold text-purple">
          {count} {count === 1 ? 'spot' : 'spots'} →
        </Text>
      </View>
    </Pressable>
  );
}
