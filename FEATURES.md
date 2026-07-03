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

**To do — going live:**

- [ ] **Supabase wired** — `popups` table + **RLS read-only policies from day
      one** (SECURITY.md §2); schema/policies committed as SQL in `supabase/`
- [ ] **Content pipeline** — seed ~15 real popups via dashboard; document the
      entry workflow. Nothing works without content.
- [ ] **Swap hooks to live data** — `usePopups` / `usePopup` only; add
      loading/error/empty states to screens
- [ ] **Address → open in external maps** — deep-link Naver / Kakao / Google
      (URL-scheme allowlist per SECURITY.md §4)
- [ ] **External links** — Instagram / website on detail screen (same allowlist)
- [ ] **Map screen** — pins + clustering + tap→detail + "near me"
      _(needs a dev build or map workaround — Expo Go constraint)_

## 🔵 Phase 1 — Differentiators (light personalization)

- [x] **Plan my day (v1)** ⭐ — pick date + area → select popups → optimized
      walking route with subway start + timeline _(mock; straight-line
      estimates)_
- [ ] **Plan my day (v2)** — real walking times/polylines via a routing API
      (server-side key, SECURITY.md §1); show route on the Map screen; share
      itinerary
- [ ] **Save / favorites** ⭐ — local-only first (AsyncStorage, no login);
      fills the Saved tab
- [ ] **Accounts / auth** — Apple + Google + email; **guest mode stays
      first-class**; token storage via expo-secure-store (SECURITY.md §5);
      syncs saves
- [ ] **Push notifications** — saved popup ending soon, new popups in an area

## 🟡 Phase 2 — Reservations & engagement

- [ ] **Reserve (external link)** ⭐ — detail-screen button → brand/Naver
      booking (ships fast; the button exists, currently dead)
- [ ] **Reserve (native)** — time slots, manage/cancel, reminders (needs RLS
      user-owned tables)
- [ ] **Curated collections** — editorial ("This weekend in Seoul")
- [ ] **Visited / been-there** — mark + history
- [ ] **Share** — popups and itineraries (growth lever)

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

**Wire Supabase** (table + RLS + seed content + swap the hooks). It unblocks
every remaining Phase 0 item and turns the whole built UI live at once.
