# Device test plan

Everything in this file is a code path the **simulator has never executed**.
It is not a "look at it on a phone" pass — these are untested branches, and two
of them are core to the product.

Written 2026-08-03. Nothing here has been run yet.

---

## Why the simulator wasn't enough

| Area | Simulator behaviour | What that hides |
|---|---|---|
| **Naver / Kakao Map walking directions** ⭐ | Neither app exists, so `canOpenURL` always fails and `src/lib/directions.ts` silently falls back to Apple/Google | The `nmap://` and `kakaomap://` branches **have never once run.** This is the differentiator the whole app is built around. |
| **Push notifications** | `usePushAlerts.ts:39` returns early on `!Device.isDevice` | Token registration, the `push_tokens` write, and delivery have never executed at all |
| **GPS** | Fixed fake coordinate | "Near me" sorting, distance accuracy, the blue dot moving, permission prompt copy |
| **Share sheet** | No KakaoTalk / Instagram installed | Where users would actually share to |
| **Performance** | Mac-speed | Real scroll/list behaviour, map pan with many pins, cold start |

---

## Getting a build onto a device

### iOS — blocked on an Apple Developer account

`eas device:list` → **"No Apple teams found for account sarah97."** A dev build
on a physical iPhone needs a provisioning profile, which needs an Apple
Developer account ($99/yr). Once you have one:

```sh
npx eas-cli device:create        # register the iPhone (scan the QR)
npx eas-cli build --profile development --platform ios
```

A free Apple ID can also sign a 7-day build directly from Xcode if you'd rather
not pay yet — that route needs the phone plugged in and Xcode's signing UI.

### Android — no developer account needed, but the map is blank

Android sideloads freely, so this is the cheaper path *except* that
`GOOGLE_MAPS_ANDROID_KEY` is unset, so the Map tab renders empty. That key needs
billing on the Google Cloud project — the same approval currently queued for
walking directions. Everything **except** the map can be tested today:

```sh
npx eas-cli build --profile development --platform android   # produces an APK
```

---

## The checklist

### 1. Naver / Kakao directions ⭐ — highest value, never tested

Install **Naver Map** and **KakaoMap** first, or you're re-testing the fallback.

- [ ] Detail screen → **Directions** → picker lists Naver and Kakao
- [ ] **Naver** opens the Naver Map app (not a browser) on a *walking* route to the pop-up
- [ ] **Kakao** opens KakaoMap on a walking route
- [ ] The destination is the actual venue, not the neighbourhood centre
- [ ] Now uninstall one and re-test → falls back to Apple/Google without an error
- [ ] Confirm no crash when neither app is installed

### 2. Push notifications — never executed

- [ ] Saved tab → enable alerts → OS permission prompt appears
- [ ] A row lands in `push_tokens` for your user (check in Supabase)
- [ ] Trigger `notify-ending-soon` and confirm the notification arrives
- [ ] Tapping it opens the app (and ideally the right pop-up)
- [ ] Denying permission degrades quietly — no crash, no stuck spinner

### 3. Location

- [ ] Map tab → locate button → prompt copy reads correctly
- [ ] Blue dot lands on your real position
- [ ] Nearby rail re-sorts by genuine distance
- [ ] Walk-time estimates look sane from where you're standing
- [ ] Deny permission → app still works, no crash

### 4. Plan my day

- [ ] Build a 3-stop route; the map draws a **dashed** line (straight-line
      estimate — solid only once the Google Directions key is live)
- [ ] Drag the itinerary sheet up/down; it snaps and doesn't fight scrolling
- [ ] Locate button stays reachable at every sheet position
- [ ] Tapping a pin highlights the matching row

### 5. The rest

- [ ] House cards (`PopupPlaceholder`) render crisply — no blur, text fits at
      every size from the 52px rail thumbnail to the feature card
- [ ] Share sheet offers KakaoTalk / Instagram and the text reads well
- [ ] Google sign-in completes in the real in-app browser
- [ ] Reserve on the Gucci pop-up opens gucci.com
- [ ] Cold start time is acceptable
- [ ] App icon and name read **"Seoul Popups"** on the home screen

---

## Known-broken before you start

Don't file these:

- **Walking route is a dashed straight line** — Google billing quota still
  pending, falls back by design with an "Estimated" label
- **Reel tab shows "coming soon"** — needs the Meta token
- **Kakao login fails** — needs Biz App conversion
- **Android Map tab is blank** — needs `GOOGLE_MAPS_ANDROID_KEY`
- **Most pop-ups show a house card, not a photo** — deliberate (migration 010);
  real photos land per pop-up as brand permission arrives
- **Gangnam is empty from Aug 10** — see `content/popups-todo.md`
