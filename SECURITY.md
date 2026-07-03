# Security Playbook

Security rules for Seoul Popups (Expo + Supabase). Read the **threat model**
once; apply the **checklists** on every relevant change.

## Threat model in one paragraph

The app ships to untrusted devices, so **everything in the client is public**:
the JS bundle, every `EXPO_PUBLIC_*` env var, and every request it makes.
Anyone can extract the Supabase URL + anon key and call our API directly with
curl, skipping the app entirely. Therefore the client can never be the thing
that enforces a rule — all real security lives server-side in Supabase
**Row Level Security (RLS)** policies. The client's job is only to (a) not
leak secrets that were never meant to be public, and (b) not act as a bridge
for malicious input (deep links, URLs, data from the DB).

---

## 1. Secrets & environment variables

- `EXPO_PUBLIC_*` vars are **compiled into the public bundle**. Only ever put
  values there that are safe to publish: the Supabase URL and **anon** key
  qualify; nothing else does.
- The Supabase **`service_role` key must never appear anywhere in this repo
  or app** — not in `.env`, not in code, not in CI logs. It bypasses RLS
  entirely. It is only for trusted servers (Edge Functions, admin scripts run
  locally).
- Real values live in `.env` (gitignored). Only `.env.example` with
  placeholders is committed. Never paste real keys into code, comments,
  commit messages, or README.
- Third-party API keys (Google Maps, routing APIs) that bill per request:
  prefer calling them from a Supabase Edge Function so the key stays
  server-side. If a key _must_ ship in the client (e.g. native Maps SDK key),
  restrict it in the provider console (bundle ID / package name + API
  restrictions).
- If a secret ever lands in git: **rotate it first**, then clean history.
  Rotation is the fix; history-scrubbing is cosmetic.

## 2. Supabase rules (apply when wiring the backend — Phase 0)

- **Enable RLS on every table before inserting real data.** A table without
  RLS is world-readable _and world-writable_ via the anon key. This is the
  single most important rule in this document.
- Baseline policies for launch:
  - `popups`: `SELECT` allowed for `anon` (public content); no
    `INSERT/UPDATE/DELETE` for anon — content entry happens via the Supabase
    dashboard (owner only).
  - Any future user-owned table (saves, reservations, profiles):
    `auth.uid() = user_id` on every operation, including `SELECT`.
- **Test policies from the outside**: after writing them, try to read/write
  with only the anon key (curl or the SQL editor's role switcher) and confirm
  writes fail. Do this for every new table.
- Keep policies + schema as SQL files in the repo (`supabase/` dir) so they're
  reviewable and reproducible, not dashboard-only state.
- Never build filter strings by interpolating user input into
  `.or(...)`/`.filter(...)` PostgREST syntax. Pass user text as _values_ to
  `.eq()/.ilike()` params, and validate enums (neighborhood, category)
  against the known lists first.
- Don't select `*` on tables that will ever hold private columns; select the
  columns the screen needs.

## 3. Input validation (deep links, params, data)

- The app has a URL scheme (`seoulpopups://`), so **any screen can be opened
  by any other app with arbitrary params**. Treat route params as untrusted:
  validate against known values before use — the pattern in `discover.tsx`
  (`NEIGHBORHOODS.includes(param)`) is the template. IDs: look them up and
  handle the not-found path (detail screen already does).
- Once data comes from Supabase, treat DB rows as untrusted too (a compromised
  or partner-submitted row shouldn't be able to break the app): the app's
  content pipeline is an input.

## 4. Outbound links & webviews

When we add "open in Instagram / website / Naver booking" (Phase 0–2):

- Before `Linking.openURL(url)`, **validate the scheme**: allow only
  `https:` (plus the specific `nmap:`/`kakaomap:` schemes for map deep-links).
  Never open `javascript:`, `file:`, or arbitrary schemes from DB data.
- Show/keep the real destination. Don't wrap partner URLs in redirectors.
- Prefer opening the system browser over an in-app WebView. If a WebView ever
  becomes necessary, no `injectedJavaScript` with dynamic content, and lock it
  to the expected origin.
- Image URLs: `https` only (iOS ATS blocks `http` anyway; keep Android
  matching — `usesCleartextTraffic` stays off).

## 5. Auth & user data (Phase 1+)

- Use Supabase Auth's built-in flows (Apple/Google/email + PKCE). Never
  hand-roll token handling or password storage.
- Session tokens: AsyncStorage is **unencrypted** on device. When auth lands,
  move the Supabase auth storage adapter to `expo-secure-store`
  (Keychain/Keystore-backed).
- Collect the minimum: for launch, saves/reservations need an ID and little
  else. No precise-location storage server-side; "near me" can stay
  client-side.
- Keep **guest mode** first-class — features shouldn't force account creation
  (also our product decision in FEATURES.md).
- Never log tokens, emails, or user IDs to `console.log` in code that ships.
- Plan for deletion: when accounts exist, a user must be able to delete their
  account + data (App Store requirement, not just good practice).

## 6. Dependencies & supply chain

- `package-lock.json` is committed and installs use it (`npm ci` in CI later).
- Run `npm audit` before each release. Fix what's fixable without breaking the
  SDK pin; record what's accepted below.
- Be suspicious of tiny/unmaintained packages; prefer `expo-*` official
  modules (see PLAYBOOK.md §8).

**Accepted risk (2026-07-03):** 13 moderate advisories, all in _dev-time_
transitive deps of the Expo SDK 54 CLI (`postcss`, `uuid` via `xcode`, etc.).
They run on the dev machine during builds, not in the shipped app. The fix
requires `expo@57`, which the Expo Go SDK 54 pin rules out. Revisit at the
next SDK upgrade.

## 7. Release hygiene

- Obfuscation is not security — assume the bundle is readable; keep secrets
  out instead.
- Before each release: `git grep` for `console.log` of data, real keys, and
  leftover test endpoints; re-run `npm audit`; re-test RLS on new tables.
- Rotate the anon key if you ever suspect abuse (Supabase dashboard), and add
  Supabase's rate limiting / captcha to auth endpoints when accounts launch.

---

## Checklist: touching data or adding a table

- [ ] RLS enabled on the new table before real data
- [ ] Policies written for _every_ operation, tested with anon key from outside
- [ ] Schema + policies committed as SQL in `supabase/`
- [ ] User input passed as query _values_, enums validated against known lists
- [ ] Screen handles loading / error / empty for the new query

## Checklist: adding a link-out or deep link

- [ ] Scheme allowlist (`https:` + named map schemes) before `openURL`
- [ ] New route params validated against known values
- [ ] Not-found / invalid-param path renders something sane

## Checklist: adding a dependency

- [ ] Needed? Could `expo-*` or existing code do it?
- [ ] Installed via `npx expo install`, `npm audit` re-run, `expo-doctor` 18/18
