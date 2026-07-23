# Seoul Popups — Feature Roadmap

A living planning doc and the source of truth for what to build next.
Priorities: finish the read-only **discover → navigate** loop first, then ship
differentiators cheapest-first, then reservations.

How to work: pick the top unchecked item in the lowest open phase, build it
following [PLAYBOOK.md](PLAYBOOK.md), run the relevant
[SECURITY.md](SECURITY.md) checklist, commit, push.

⭐ = a core differentiator vs existing Korean apps.
_(mock)_ = UI complete, runs on mock data until Supabase is wired.

---

## 🟢 Phase 0 — MVP (core loop, no accounts)

Goal: a foreigner can discover a popup and physically get there. All read-only.

**UI already built (on mock data):**

- [x] **Discover list** — search + location/category/status/period filters + sort _(mock)_
- [x] **Search** — by name / tagline / area / category _(mock)_
- [x] **Categories** — fashion, beauty, food, art, lifestyle + filter _(mock)_
- [x] **Status** — Open now / Coming soon / Ended filter + "Ending soon" badges _(mock)_
- [x] **Detail screen** — photo, dates, hours, description _(mock)_
- [x] **Subway directions** ⭐ — line, exit, walk time _(mock)_
- [x] **Home** — curated landing: search, areas, ending-soon rail, featured _(mock)_
- [x] **mgn radar redesign** — pink/purple design system across Home, Discover,
      Detail; floating pill tab bar; Reel + Map styled shells _(2026-07-16)_

**To do — going live:**

- [x] **Supabase wired** _(2026-07-21)_ — `popups` table + read-only RLS live
      on project `xkykpcjbnlihreikqonu`. Applied via the Supabase MCP; RLS
      proven from outside (anon read 200, anon write 401). Advisor clean after
      hardening the `rls_auto_enable` function (`supabase/002-*.sql`).
- [x] **Draft → publish review gate** _(2026-07-21)_ — `supabase/003-*.sql`
      adds `published` (RLS exposes only published rows to the app/anon key),
      `source_name` / `last_verified_at` / auto-`updated_at`, and the
      `popups_needs_review` freshness view. `npm run validate:popup` gates a
      drafted row before publish. Loop documented in CONTENT.md §3.5–3.6.
- [x] **`popup-images` storage bucket** _(2026-07-21)_ — `supabase/004-*.sql`:
      public-read, image MIME only, 5 MB/file, no upload policy (dashboard /
      service-role writes only). Anon upload proven blocked (403 RLS).
- [ ] **Content pipeline** — **5 published** + **4 drafts** as of 2026-07-21
      (`supabase/seed.sql` + Popga source-scan). Still to do: confirm
      pins/walk-times + swap in official photos to publish the 4 drafts, and
      grow toward ~15 (`content/popups-todo.md`). Gangnam still thin (1 live) —
      re-scan early August.
- [x] **Swap hooks to live data** _(2026-07-21)_ — `usePopups` / `usePopup`
      now query Supabase (shared single-fetch cache, snake→camel mapping,
      graceful mock fallback when `.env` is absent).
- [x] **Loading / error / empty states** _(2026-07-22)_ — shared
      `LoadingState` / `ErrorState` / `EmptyState` (`src/components/ui/`)
      wired into Home, Discover, Map, and detail; `usePopups`/`usePopup` now
      expose a `reload` so the error state has a working "Try again". Detail no
      longer flashes "not found" while the catalogue is still loading.
- [x] **Directions button** — detail screen deep-links Apple / Google Maps
- [x] **Naver / Kakao Maps directions** _(2026-07-22)_ — detail-screen
      "Directions" opens a picker: Naver / Kakao (walking deep links via
      `nmap:` / `kakaomap:`), then Apple/Google as the always-works fallback.
      `src/lib/directions.ts` validates the scheme before every openURL and
      falls back app→web (SECURITY.md §4).
- [x] **External links** _(2026-07-22)_ — Instagram / Website chips on the
      detail screen when the popup has those URLs; opened via
      `src/lib/links.ts` (https-only, SECURITY.md §4). `instagramUrl` /
      `websiteUrl` now flow through the `Popup` type + hook. Seeded rows set
      `website_url` to their source popup page (Toy Story's news source left
      null); official brand IG/site links come with the content pass.
- [x] **Map screen** _(built + verified on an iOS dev build 2026-07-22)_ —
      `react-native-maps` (Apple Maps iOS / Google Android), branded
      category pins, tap-to-select synced with the nearby rail, auto-fits to
      the popups. Native only — web resolves `PopupMapView.web.tsx` (styled
      placeholder) so Expo Go/web don't crash. **"Near me"**:
      `useUserLocation` (expo-location) + a locate button that centers the map,
      shows the user dot, and re-sorts the rail by real distance; never prompts
      on mount. Pins/near-me confirmed working in the iOS Simulator.
      **Still to do:** set `GOOGLE_MAPS_ANDROID_KEY` for the Android map, and
      marker clustering (fine at ~5–15 pins for now).

## 🔵 Phase 1 — Differentiators (light personalization)

- [x] **Plan my day (v1)** ⭐ — pick date + area → select popups → optimized
      walking route with subway start + timeline _(mock; straight-line
      estimates)_
- [ ] **Plan my day (v2)** — real walking times/polylines via a routing API
      (server-side key, SECURITY.md §1); show route on the Map screen; share
      itinerary
- [x] **Save / favorites** ⭐ — done local-first: `useFavorites` context +
      AsyncStorage, save buttons on cards/detail, real Saved tab (no login)
- [ ] **Accounts / auth** — Apple + Google + email; **guest mode stays
      first-class**; token storage via expo-secure-store (SECURITY.md §5);
      syncs saves
- [ ] **Push notifications** — saved popup ending soon, new popups in an area

## 🟡 Phase 2 — Reservations & engagement

- [x] **Reserve (external link)** ⭐ _(2026-07-22)_ — the detail-screen Reserve
      button now opens the popup's `reservationUrl` (falls back to `websiteUrl`)
      via the https-only `openExternalUrl`. Active only when reservable AND a
      link exists; otherwise "Booking opens soon" / "No reservation needed".
      `reservation_url` flows through the `Popup` type + hook (Gintama seeded
      with its Naver-reservation page).
- [ ] **Reserve (native)** — time slots, manage/cancel, reminders (needs RLS
      user-owned tables)
- [ ] **Curated collections** — editorial ("This weekend in Seoul")
- [~] **Reel feed (live)** _(built 2026-07-22; needs the Meta token)_ — the
      Reel tab is now a live vertical feed from @mgn.radar via the
      `instagram-reels` Supabase Edge Function (token server-side, SECURITY.md
      §1); tap → opens the reel in Instagram. `useReels` handles
      loading/error/empty + a "coming soon" state until the token is set.
      **Remaining (yours):** the Meta setup + `INSTAGRAM_ACCESS_TOKEN` secret —
      see `supabase/functions/instagram-reels/README.md`.
- [x] **Visited / been-there** _(2026-07-22)_ — `useVisited` context
      (AsyncStorage, mirrors `useFavorites`); a "Mark as visited / Been here"
      toggle on the detail screen and a "Been there" history section on the
      Saved tab. Swaps to a per-user table when accounts land.
- [~] **Share** _(popups done 2026-07-22)_ — share button on the detail header
      opens the native share sheet with a self-contained blurb (name, dates,
      hours, subway directions, link). Itinerary sharing still to do (with Plan
      my day v2). No public web URL yet, so shares are text + the popup's link.

## ⚪ Phase 3 — Growth & scale

- [ ] Reviews & ratings
- [ ] Personalized recommendations
- [ ] Partner / brand submission portal (submissions = untrusted input)
- [ ] Analytics
- [ ] More neighborhoods
- [ ] (later) Multi-city

---

## 🔑 Key decisions

1. **Content pipeline (do this early):** manual admin entry via the Supabase
   dashboard first; partner submissions later. Nothing works without content.
2. **Defer accounts:** Save works with local storage first so the app isn't
   gated behind login. Add auth only when sync/reservations need it.
3. **Reservations start external:** link out to brand/Naver booking first;
   native booking once brand partnerships exist.
4. **RLS from day one:** policies land in the same PR that creates a table —
   never "later" (SECURITY.md §2).
5. **Expo Go / SDK 54 pin:** native-module features (maps, push) need a dev
   build; sequence them together to build that muscle once.

## Recommended next step

Supabase is wired and the UI runs on live data. The remaining Phase 0 gate is
the **Map screen** (pins + clustering + tap→detail + "near me") — the last core
piece of the discover→navigate loop, and it forces the dev build that push
(Phase 1) will also need, so sequence those native features together (key
decision #5). Lighter alternative if not ready for a dev build: **finish the
content pass** (publish the 4 drafts with real photos, grow toward ~15) and
**render the loading/error/empty states** so the built UI feels complete.
