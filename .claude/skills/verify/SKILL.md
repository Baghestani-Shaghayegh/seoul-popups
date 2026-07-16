---
name: verify
description: Build, launch, and drive Seoul Popups (Expo) to verify changes at the running app.
---

# Verifying Seoul Popups

Expo SDK 54 + expo-router + NativeWind. Fastest runtime surface is **Expo web**
(react-native-web is installed); native behavior is close enough for UI/logic
checks. For native-only concerns (maps, gestures), use Expo Go on a device.

## Launch

Use the Claude Preview tools with `.claude/launch.json` (config name
`expo-web`, port 8081):

1. `preview_start expo-web` — first bundle takes ~15s; a black screenshot
   means Metro is still bundling (check `preview_logs`).
2. `preview_resize` to the `mobile` preset (375×812) — the UI is phone-first.

## Drive

- Tab bar renders as `<a href="/">`, `/discover`, `/reel`, `/map`, `/saved` —
  click those selectors to switch tabs.
- Cards/pressables are divs with `tabindex`; find by text then walk up to the
  nearest `[tabindex]` ancestor before clicking.
- **Beware synthetic clicks through modals**: `.click()` bypasses hit-testing,
  so with a bottom sheet open you can "tap" cards under the backdrop — a real
  finger can't. Scope queries to `[aria-modal="true"]` when a sheet is open.
- Favorites persist in `localStorage['favorites:v1']` on web (AsyncStorage on
  native) — reload the page to prove persistence.

## Known noise

Web console warns `"shadow*" style props are deprecated` and
`props.pointerEvents is deprecated` — react-native-web deprecations from
shadow utility classes; not errors, native unaffected.
