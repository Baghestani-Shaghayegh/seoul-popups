import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useReels, type Reel } from '@/hooks/useReels';
import { openExternalUrl } from '@/lib/links';

/**
 * Reel tab — a vertical feed of @mgn.radar's Instagram, fetched live via the
 * `instagram-reels` Edge Function (token stays server-side). Tapping a reel
 * opens it in Instagram. Until the Instagram token is connected the screen
 * shows a "coming soon" state.
 */
export default function ReelScreen() {
  const { height } = useWindowDimensions();
  const { reels, loading, error, configured, reload } = useReels();

  if (loading || error || reels.length === 0) {
    return (
      <ReelBackdrop>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : error ? (
          <Centered
            title="Couldn’t load reels"
            body="Check your connection and try again."
            action={{ label: 'Try again', onPress: reload }}
          />
        ) : configured ? (
          <Centered
            title="No reels yet"
            body="@mgn.radar hasn’t posted anything we can show here yet."
          />
        ) : (
          <Centered
            title="Reels are coming soon"
            body="Clips from @mgn.radar will play here — event highlights you can tap straight through to Instagram."
          />
        )}
      </ReelBackdrop>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <FlatList
        data={reels}
        keyExtractor={(r) => r.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={height}
        decelerationRate="fast"
        getItemLayout={(_, index) => ({
          length: height,
          offset: height * index,
          index,
        })}
        renderItem={({ item }) => <ReelItem reel={item} height={height} />}
      />
    </View>
  );
}

function ReelItem({ reel, height }: { reel: Reel; height: number }) {
  const insets = useSafeAreaInsets();
  const isVideo = reel.mediaType === 'VIDEO';
  const open = () => openExternalUrl(reel.permalink);

  return (
    <View style={{ height }} className="bg-black">
      {reel.imageUrl ? (
        <Image
          source={{ uri: reel.imageUrl }}
          resizeMode="cover"
          style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
        />
      ) : (
        <LinearGradient
          colors={['#7C5CD8', '#B57BE0', '#EE5D8C']}
          style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
        />
      )}
      <LinearGradient
        colors={['rgba(0,0,0,0.45)', 'transparent', 'rgba(0,0,0,0.75)']}
        locations={[0, 0.35, 1]}
        style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
      />

      {/* Header */}
      <View
        className="flex-row items-center justify-between px-5"
        style={{ paddingTop: insets.top + 8 }}
      >
        <Text className="text-[21px] font-extrabold text-white">Reels</Text>
        <View className="flex-row items-center gap-1.5 rounded-full border border-white/30 bg-white/15 px-3 py-1.5">
          <Ionicons name="logo-instagram" size={14} color="#fff" />
          <Text className="text-xs font-bold text-white">@mgn.radar</Text>
        </View>
      </View>

      {/* Video affordance */}
      {isVideo && (
        <Pressable
          onPress={open}
          className="flex-1 items-center justify-center"
          style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
        >
          <View className="h-16 w-16 items-center justify-center rounded-full bg-black/35">
            <Ionicons name="play" size={30} color="#fff" />
          </View>
        </Pressable>
      )}

      {/* Caption + open */}
      <View
        className="absolute inset-x-0 px-5"
        style={{ bottom: insets.bottom + 110 }}
      >
        <View className="mb-2.5 flex-row items-center gap-2.5">
          <View className="h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-brand">
            <Ionicons name="heart" size={16} color="#fff" />
          </View>
          <Text className="text-sm font-extrabold text-white">mgn.radar</Text>
        </View>
        {reel.caption ? (
          <Text
            className="mb-3 text-[13px] leading-5 text-white/95"
            numberOfLines={3}
          >
            {reel.caption}
          </Text>
        ) : null}
        <Pressable
          onPress={open}
          style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
          className="flex-row items-center gap-2 self-start rounded-2xl bg-white px-4 py-3"
        >
          <Ionicons name="logo-instagram" size={15} color="#C43C6B" />
          <Text className="text-[13px] font-extrabold text-brand-dark">
            Watch on Instagram
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

/** Full-screen gradient backdrop used by the non-feed states. */
function ReelBackdrop({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1">
      <LinearGradient
        colors={['#7C5CD8', '#B57BE0', '#EE5D8C']}
        locations={[0, 0.4, 1]}
        style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
      />
      <View
        className="flex-row items-center justify-between px-5"
        style={{ paddingTop: insets.top + 8 }}
      >
        <Text className="text-[21px] font-extrabold text-white">Reels</Text>
        <View className="flex-row items-center gap-1.5 rounded-full border border-white/30 bg-white/15 px-3 py-1.5">
          <Ionicons name="logo-instagram" size={14} color="#fff" />
          <Text className="text-xs font-bold text-white">@mgn.radar</Text>
        </View>
      </View>
      <View className="flex-1 items-center justify-center px-10">
        {children}
      </View>
    </View>
  );
}

function Centered({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: { label: string; onPress: () => void };
}) {
  const router = useRouter();
  return (
    <View className="items-center">
      <Ionicons name="play-circle-outline" size={52} color="#fff" />
      <Text className="mt-3 text-center text-lg font-extrabold text-white">
        {title}
      </Text>
      <Text className="mt-1.5 text-center text-sm text-white/85">{body}</Text>
      {action ? (
        <Pressable
          onPress={action.onPress}
          style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
          className="mt-4 rounded-full bg-white px-5 py-2.5"
        >
          <Text className="text-sm font-bold text-brand-dark">
            {action.label}
          </Text>
        </Pressable>
      ) : (
        <Pressable
          onPress={() => router.push('/discover')}
          style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
          className="mt-4 rounded-full border border-white/60 px-5 py-2.5"
        >
          <Text className="text-sm font-bold text-white">Discover pop-ups</Text>
        </Pressable>
      )}
    </View>
  );
}
