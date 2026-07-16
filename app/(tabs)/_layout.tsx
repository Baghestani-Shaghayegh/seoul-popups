import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/constants/theme';

/** Icon-only tab: the focused tab sits in a pink pill (mgn radar design). */
function TabIcon({
  name,
  focused,
}: {
  name: keyof typeof Ionicons.glyphMap;
  focused: boolean;
}) {
  return (
    <View
      style={{
        width: 52,
        height: 44,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: focused ? colors.brand.DEFAULT : 'transparent',
      }}
    >
      <Ionicons name={name} size={22} color={focused ? '#fff' : colors.faint} />
    </View>
  );
}

/** Floating pill bottom bar: Home · Discover · Reel · Map · Saved. */
export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: Math.max(insets.bottom, 14) + 8,
          marginHorizontal: 42,
          height: 62,
          borderRadius: 999,
          backgroundColor: colors.surface,
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: colors.line.strong,
          paddingTop: 4,
          shadowColor: '#462846',
          shadowOpacity: 0.22,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 14 },
          elevation: 10,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name={focused ? 'home' : 'home-outline'}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="search" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="reel"
        options={{
          title: 'Reel',
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name={focused ? 'play-circle' : 'play-circle-outline'}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'map' : 'map-outline'} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: 'Saved',
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name={focused ? 'heart' : 'heart-outline'}
              focused={focused}
            />
          ),
        }}
      />
    </Tabs>
  );
}
