# Seoul Popups — Feature Roadmap

A living planning doc. Priorities: build the read-only **discover → navigate**
loop first, then ship differentiators cheapest-first, then reservations.

⭐ = a core differentiator vs existing Korean apps.

---

## 🟢 Phase 0 — MVP (core loop, no accounts)

Goal: a foreigner can discover a popup and physically get there. All read-only.

- [ ] **Supabase wired** — `popups` table; replace mock data behind `usePopups()`
- [x] **Discover list** + neighborhood filter + date filter _(on mock data)_
- [ ] Connect Discover to live data
- [ ] **Search** — by name / brand / keyword
- [ ] **Categories & tags** — fashion, beauty, food, art, character/IP + filter
- [ ] **Status badges** — "Open now", "Ending soon", "Free"
- [x] **Detail screen** — photos, dates, hours, description _(on mock data)_
- [x] **Subway directions** ⭐ — line, exit, walk time _(on mock data)_
- [ ] **Address → open in external maps** — deep-link Naver / Kakao / Google
- [ ] **External links** — Instagram / website
- [ ] **Map screen** — pins + clustering + tap→detail + "near me" _(placeholder)_

## 🔵 Phase 1 — Differentiators (light personalization)

- [ ] **Save / favorites** ⭐ — start local-only (no login required)
- [ ] **Accounts / auth** — Apple + Google + email; **guest mode**; enables sync
- [ ] **Plan my day** ⭐ — pick neighborhood + date → select popups →
      optimized walking route + total time _(headline differentiator)_
- [ ] **Push notifications** — saved popup ending soon, new popups in an area

## 🟡 Phase 2 — Reservations & engagement

- [ ] **Reserve (external link)** ⭐ — button → brand/Naver booking (ships fast)
- [ ] **Reserve (native)** — time slots, manage/cancel, reminders
- [ ] **Curated collections** — editorial ("This weekend in Seoul")
- [ ] **Visited / been-there** — mark + history
- [ ] **Share** — popups and itineraries (growth lever)

## ⚪ Phase 3 — Growth & scale

- [ ] Reviews & ratings
- [ ] Personalized recommendations
- [ ] Partner / brand submission portal
- [ ] Analytics
- [ ] More neighborhoods
- [ ] (later) Multi-city

---

## 🔑 Key decisions

1. **Content pipeline (do this early):** how popups enter the DB. Start with
   manual admin entry (Supabase dashboard / simple form); partner submissions
   later. Nothing works without content.
2. **Defer accounts:** make Save work with local storage first so the app isn't
   gated behind login. Add auth only when sync/reservations need it.
3. **Reservations start external:** link out to brand/Naver booking first; build
   native booking once brand partnerships exist.

## Recommended next step

Wire Supabase and move Discover off mock data — it unblocks every other Phase 0
feature (search, filters, map all read the same table).
