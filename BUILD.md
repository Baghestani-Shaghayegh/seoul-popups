# Development builds (EAS)

Some features use native modules that **Expo Go can't load** — the Map screen
(`react-native-maps`), and later push notifications. To run those you need a
**development build**: a custom version of the app (with `expo-dev-client`) that
you install once on a device or simulator, then drive from the Metro dev server
just like Expo Go. It replaces Expo Go _for this app_.

Config lives in [`eas.json`](eas.json); the identifiers are in
[`app.json`](app.json) (`com.mgnradar.seoulpopups`).

## One-time setup (needs your Expo account)

These steps sign in / create cloud resources, so **you** run them (I can't
authenticate as you):

```sh
npm i -g eas-cli          # or use npx eas-cli@latest below
eas login                 # your Expo account (free)
eas init                  # links the project, writes extra.eas.projectId + owner
```

`eas init` will add the project id to `app.json` — commit that.

### Android Maps key (Android builds only)

Cloud builds don't see your local `.env`, so store the Google Maps Android key
as an EAS env var (it gets injected as `GOOGLE_MAPS_ANDROID_KEY`, which
[`app.config.js`](app.config.js) reads):

```sh
eas env:create --name GOOGLE_MAPS_ANDROID_KEY --value "<your-key>" \
  --environment development --visibility sensitive
```

Get the key from Google Cloud Console → **Maps SDK for Android** → an API key
restricted to the `com.mgnradar.seoulpopups` package. iOS uses Apple Maps and
needs no key.

## Build

```sh
# iOS Simulator — FREE, no Apple Developer account, runs on your Mac:
eas build --profile development-simulator --platform ios

# Android APK — sideload on a phone or emulator (needs the Maps key above):
eas build --profile development --platform android

# Physical iPhone — requires a paid Apple Developer account:
eas build --profile development --platform ios
```

Each finishes with a link to download the build. Install it:

- **iOS Simulator:** drag the `.app` (or `.tar.gz`) onto the running simulator.
- **Android:** open the `.apk` link on the device, or `adb install <file>`.
- **Physical iPhone:** install via the QR/link (device must be registered on
  your Apple Developer account).

## Run

Start Metro in dev-client mode and open the installed build:

```sh
npx expo start --dev-client
```

Scan the QR from the dev build (not Expo Go). The Map tab now renders real
pins; everything else works as before.

## Profiles at a glance

| Profile                 | Use                                             |
| ----------------------- | ----------------------------------------------- |
| `development`           | dev build (dev-client) for physical devices     |
| `development-simulator` | dev build for the iOS Simulator (free)          |
| `preview`               | standalone internal build to share with testers |
| `production`            | store builds                                    |
