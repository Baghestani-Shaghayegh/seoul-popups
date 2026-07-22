import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/theme';
import type { PopupMapViewProps } from './PopupMapView';

/**
 * Web fallback for the native map. react-native-maps has no web
 * implementation, so on web (and the Expo web preview) we render a styled
 * placeholder instead of crashing. The real pins live in PopupMapView.tsx.
 */
export function PopupMapView(_props: PopupMapViewProps) {
  return (
    <View style={StyleSheet.absoluteFill} className="bg-[#DCEBFC]">
      <View className="absolute -left-10 top-24 h-40 w-56 rounded-full bg-[#D8F1E6]" />
      <View className="absolute -right-12 bottom-64 h-44 w-60 rounded-full bg-[#D8F1E6]" />
      <View className="absolute left-1/4 top-1/2 h-24 w-72 -rotate-12 rounded-full bg-white/60" />
      <View className="flex-1 items-center justify-center px-10">
        <View className="items-center rounded-3xl bg-white/80 px-6 py-5">
          <Ionicons
            name="map-outline"
            size={30}
            color={colors.purple.DEFAULT}
          />
          <Text className="mt-2 text-base font-extrabold text-ink">
            Map is mobile-only
          </Text>
          <Text className="mt-1 text-center text-xs text-muted">
            The live pin map runs in the iOS / Android app. Use list view on
            web.
          </Text>
        </View>
      </View>
    </View>
  );
}
