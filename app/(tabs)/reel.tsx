import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useHomeSections } from '@/hooks/useHomeSections';
import { formatShortDate } from '@/lib/format';

/**
 * Reel tab, mgn radar style. Placeholder feed — the real version pulls
 * vertical video from the @mgn.radar Instagram account. The event chip taps
 * through to the featured pop-up's detail screen.
 */
export default function ReelScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { featured } = useHomeSections();

  return (
    <View className="flex-1">
      <LinearGradient
        colors={['#7C5CD8', '#B57BE0', '#EE5D8C']}
        locations={[0, 0.4, 1]}
        style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
      />
      <LinearGradient
        colors={['rgba(0,0,0,0.28)', 'transparent', 'rgba(0,0,0,0.55)']}
        locations={[0, 0.3, 1]}
        style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
      />

      {/* Progress bars */}
      <View
        className="flex-row gap-1 px-5"
        style={{ paddingTop: insets.top + 6 }}
      >
        <View className="h-[3px] flex-1 rounded-full bg-white" />
        <View className="h-[3px] flex-1 rounded-full bg-white/35" />
        <View className="h-[3px] flex-1 rounded-full bg-white/35" />
      </View>

      {/* Title + Instagram badge */}
      <View className="mt-3 flex-row items-center justify-between px-5">
        <Text className="text-[21px] font-extrabold text-white">Reels</Text>
        <View className="flex-row items-center gap-1.5 rounded-full border border-white/30 bg-white/15 px-3 py-1.5">
          <Ionicons name="logo-instagram" size={14} color="#fff" />
          <Text className="text-xs font-bold text-white">@mgn.radar</Text>
        </View>
      </View>

      <View className="flex-1 items-center justify-center px-12">
        <Ionicons name="play-circle-outline" size={52} color="#fff" />
        <Text className="mt-3 text-center text-sm text-white/85">
          Reels from our Instagram land here — event clips you can tap straight
          through to tickets and directions.
        </Text>
      </View>

      {/* Action rail */}
      <View
        className="absolute right-4 items-center gap-5"
        style={{ bottom: insets.bottom + 210 }}
      >
        <ReelAction icon="heart-outline" label="2.4k" />
        <ReelAction icon="chatbubble-outline" label="128" />
        <ReelAction icon="paper-plane-outline" label="Share" />
        <ReelAction icon="bookmark-outline" label="Save" />
      </View>

      {/* Account + caption + event chip */}
      <View
        className="absolute left-5 right-20"
        style={{ bottom: insets.bottom + 120 }}
      >
        <View className="mb-2.5 flex-row items-center gap-2.5">
          <View className="h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-brand">
            <Ionicons name="heart" size={16} color="#fff" />
          </View>
          <Text className="text-sm font-extrabold text-white">mgn.radar</Text>
          <View className="rounded-full border border-white/90 px-3 py-1">
            <Text className="text-[11.5px] font-bold text-white">Follow</Text>
          </View>
        </View>
        {featured && (
          <>
            <Text className="mb-3 text-[13px] leading-5 text-white/95">
              {featured.name} is open in {featured.neighborhood}. Tap through
              for hours, dates and directions.
            </Text>
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/popup/[id]',
                  params: { id: featured.id },
                })
              }
              style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
              className="flex-row items-center gap-2 self-start rounded-2xl bg-white px-4 py-3"
            >
              <Ionicons name="calendar-outline" size={15} color="#C43C6B" />
              <Text className="text-[13px] font-extrabold text-brand-dark">
                {featured.name} · ends {formatShortDate(featured.endDate)} →
              </Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

function ReelAction({
  icon,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  return (
    <View className="items-center gap-1">
      <View className="h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-white/15">
        <Ionicons name={icon} size={21} color="#fff" />
      </View>
      <Text className="text-[11px] font-bold text-white">{label}</Text>
    </View>
  );
}
