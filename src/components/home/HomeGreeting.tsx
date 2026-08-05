import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { colors } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';

/**
 * The home header: who you are, and the way in to My Page.
 *
 * This block used to be hardcoded to "Hi, Sara" with a literal "S" avatar, so
 * every user on every install was greeted as Sara. Three real states now:
 * a guest is invited to sign in, a signed-in user without a chosen name gets
 * their email local part, and anyone with a profile gets their own name and
 * photo.
 *
 * Everyone lands on /profile, guests included. Sending guests straight to
 * /auth instead was tempting — they have no email, avatar or sign-out — but
 * this is the ONLY route to /profile, so it made the whole guest half of the
 * feature unreachable: the nickname field, its local storage, and the
 * merge-up-on-sign-in rule could never run. My Page is worth a guest's time
 * anyway (nickname, saved/visited counts) and carries its own sign-in CTA.
 */
export function HomeGreeting() {
  const router = useRouter();
  const { user } = useAuth();
  const { greetingName, avatarUrl, displayName } = useProfile();
  const isGuest = !user;

  return (
    <View className="flex-row items-center justify-between px-4">
      <Pressable
        onPress={() => router.push('/profile')}
        accessibilityRole="button"
        accessibilityLabel="Your profile"
        style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
        className="flex-row items-center gap-3"
      >
        <Avatar
          uri={avatarUrl}
          name={displayName}
          email={user?.email}
          size={44}
          guest={isGuest}
        />
        <View>
          {/* A guest who has set a nickname must see it — otherwise saving one
              changes nothing on screen and the field looks broken. */}
          <Text className="text-lg font-extrabold text-ink">
            {isGuest && !displayName?.trim()
              ? 'Hi there'
              : `Hi, ${greetingName}`}
          </Text>
          <Text className="text-xs text-muted">
            {isGuest ? 'Sign in to sync your day' : 'Let’s plan your day'}
          </Text>
        </View>
      </Pressable>

      <Pressable
        onPress={() => router.push('/saved')}
        accessibilityRole="button"
        accessibilityLabel="Alerts and saved pop-ups"
        style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
        className="h-11 w-11 items-center justify-center rounded-2xl border border-line-strong bg-surface"
      >
        <Ionicons name="notifications-outline" size={19} color={colors.ink} />
      </Pressable>
    </View>
  );
}
