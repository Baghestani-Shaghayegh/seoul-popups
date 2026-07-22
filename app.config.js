// Dynamic Expo config. Everything static still lives in app.json — Expo passes
// it in as `config` and this file layers on values that must come from the
// environment, never the repo (SECURITY.md §1).
//
// GOOGLE_MAPS_ANDROID_KEY: the Android build's Google Maps key, used by
// react-native-maps on Android (iOS uses Apple Maps, no key). It's a client
// key restricted by app signature, but we still keep it out of git. Set it in
// `.env` for local dev builds and in EAS secrets for cloud builds. Without it,
// the Android map renders blank tiles; iOS is unaffected.
export default ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    config: {
      ...config.android?.config,
      googleMaps: {
        apiKey: process.env.GOOGLE_MAPS_ANDROID_KEY,
      },
    },
  },
});
