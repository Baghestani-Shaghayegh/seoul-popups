import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
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
 * Guests go to /auth, not /profile: My Page is for people with an account.
 * The guest half of the profile (a local nickname, merged up on sign-in) was
 * built and then removed rather than left unreachable — see the screen.
 */
export function HomeGreeting() {
  const router = useRouter();
  const { user } = useAuth();
  const { greetingName, avatarUrl, displayName } = useProfile();
  const isGuest = !user;

  return (
    <View className="flex-row items-center justify-between px-4">
      <Pressable
        onPress={() => router.push(isGuest ? '/auth' : '/profile')}
        accessibilityRole="button"
        accessibilityLabel={isGuest ? 'Sign in' : 'Your profile'}
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
          <Text className="text-lg font-extrabold text-ink">
            {isGuest ? 'Hi there' : `Hi, ${greetingName}`}
          </Text>
          <Text className="text-xs text-muted">
            {isGuest ? 'Sign in to sync your day' : 'Let’s plan your day'}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}
