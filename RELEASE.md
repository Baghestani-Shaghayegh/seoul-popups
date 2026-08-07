# Shipping to the App Store

Target: **iPhone first**. Android follows later — Google Play makes new
individual accounts run a 14-day closed test with 12+ testers before a public
listing, so starting that clock is worth doing early but it does not block iOS.

Identifiers are in [`app.json`](app.json) (`com.mgnradar.seoulpopups`); build
profiles are in [`eas.json`](eas.json). For dev builds see [BUILD.md](BUILD.md) —
this file is about the store.

---

## 1. Apple Developer account — do this first

<https://developer.apple.com/programs/> · **$99/year** · usually approved in
1–2 days, sometimes longer if they ask for ID. Everything below waits on it, so
start it before anything else.

Enroll as an **individual** unless MGN RADAR is a registered company — an
organization enrollment additionally needs a D-U-N-S number, which adds days.

## 2. Publish the legal pages (5 minutes, no account needed)

App Store Connect will not accept a submission without a reachable privacy
policy URL, and both pages are already written in [`docs/`](docs/).

GitHub → **Settings → Pages → Source: Deploy from a branch → `main` / `/docs`**.

Two minutes later these must load:

- <https://baghestani-shaghayegh.github.io/seoul-popups/> — support URL
- <https://baghestani-shaghayegh.github.io/seoul-popups/privacy.html> — privacy policy

They are also linked from My Page in the app via
[`src/constants/legal.ts`](src/constants/legal.ts). If the repo is private,
Pages needs a paid plan — make it public or host the two files anywhere else and
update that file.

## 3. Deploy the account-deletion function

Guideline 5.1.1(v): an app with accounts must let you delete the account from
inside the app. The UI is on My Page; the server half needs deploying.

```sh
npx supabase functions deploy delete-account
```

Then **test it once on a real build** — sign in with a throwaway account, delete
it, and confirm you land back on the home screen as a guest and the row is gone
from `auth.users`. This is the single most common cause of a first rejection,
and reviewers do check it.

## 4. Sign in with Apple — required, not optional

Guideline 4.8: an app offering third-party sign-in (we offer Google, and Kakao /
Naver once enabled) **must** also offer Sign in with Apple. Rejection here is
automatic. The wiring already anticipates it —
[`useAuth.tsx`](src/hooks/useAuth.tsx) types `apple` as a provider — so the work
is credentials plus a button.

1. Apple Developer → **Certificates, IDs & Profiles**: create a **Services ID**
   and enable Sign in with Apple, with return URL
   `https://xkykpcjbnlihreikqonu.supabase.co/auth/v1/callback`.
2. Create a **Sign in with Apple key** (`.p8`); note the Key ID and Team ID.
3. Supabase → **Authentication → Providers → Apple** → paste the Services ID,
   Team ID, Key ID, and key contents.
4. Add the Apple button to [`app/auth.tsx`](app/auth.tsx) alongside Google —
   `signInWithOAuth('apple')` already handles it. Apple requires it be shown at
   least as prominently as the others.

## 5. Production secrets in EAS

Cloud builds never see your local `.env`. Without these the production build
ships with no backend at all.

```sh
eas env:create --name EXPO_PUBLIC_SUPABASE_URL --value "https://xkykpcjbnlihreikqonu.supabase.co" --environment production --visibility plaintext
```

```sh
eas env:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "<anon key>" --environment production --visibility sensitive
```

Add `EXPO_PUBLIC_NAVER_CLIENT_ID` the same way if the Naver button should
appear. `GOOGLE_MAPS_ANDROID_KEY` is Android-only — skip it for now.

## 6. Config to settle before building

- **Display name.** `"name": "seoul-popups"` in [`app.json`](app.json) is what
  appears under the icon. Change it to what users should see (`MGN RADAR`).
- **iPad.** `"supportsTablet": true` means Apple reviews the app on iPad *and*
  requires iPad screenshots. Setting it to `false` removes a whole class of
  layout bugs and a screenshot set from the critical path. Recommended for v1.
- **Push notifications.** iOS production push needs an APNs key from your Apple
  account uploaded to Expo — `eas credentials` walks through it. Only needed if
  the ending-soon alerts ship in v1.
- **Reel tab.** It renders "coming soon" until the Instagram token is
  connected. A visibly non-functional tab invites a Guideline 2.1 rejection —
  either connect the token or hide the tab for v1.

## 7. Build and get it onto phones

```sh
eas build --profile production --platform ios
```

The `production` profile has `autoIncrement`, so build numbers take care of
themselves. First run asks to create the App Store Connect app and signing
credentials — say yes to all of it.

```sh
eas submit --profile production --platform ios
```

Once it finishes processing (~15 min), TestFlight **internal testing** puts it
on your own devices immediately, no review. **External testing** — a public link
for up to 10,000 people — needs a one-time beta review, usually about a day.
This is the fastest route to a real user downloading it.

## 8. App Store listing

In App Store Connect, before you can submit for review:

- **Screenshots** — 6.9" iPhone display (1320 × 2868). Simulator screenshots are
  fine. Five or six: map, discover, a pop-up detail, saved, plan.
- **Description, subtitle, keywords, category** (Travel or Lifestyle).
- **Support URL** and **Privacy Policy URL** from step 2.
- **App Privacy** labels. Declare, matching `docs/privacy.html`: Email Address
  (account), Name and Photos (account), Coarse Location (app functionality),
  User Content, and Identifiers for the push token. Answer **no** to tracking —
  the app has no analytics or ad SDKs.
- **Age rating** questionnaire.
- **Demo account** in the review notes. Reviewers will not sign up with Kakao or
  Naver; give them an email/password login that works, or they reject for
  "unable to review".

Then submit. Review is typically 1–3 days for a first submission.

---

## Rough timeline

| Day | What |
| --- | --- |
| 0 | Apple enrollment submitted, GitHub Pages live, function deployed |
| 1–2 | Account approved; Sign in with Apple wired; EAS secrets set |
| 2 | Production build → TestFlight internal; real devices running it |
| 3 | External TestFlight approved → public link you can share |
| 4–7 | Listing filled in, submitted, App Store review |
