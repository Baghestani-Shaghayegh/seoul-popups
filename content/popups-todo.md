# Popup content — verification TODO

The first real catalogue (`supabase/seed.sql`, seeded 2026-07-21) is live but
**not fully verified**. Dates, hours, venue and subway station come from the
listed sources; the fields below are best-effort and need a human pass with map
tools + official photos, per [CONTENT.md](../CONTENT.md) §3–§4.

Legend: ✓ = source-confirmed · ⚠️ = estimated, verify

| Popup | Coords | Subway exit | Walk min | Hours | Image |
|---|---|---|---|---|---|
| Toy Story × PEACEMINUSONE | ⚠️ from "Yeonmujang-gil 27" | ⚠️ Seongsu 3 | ⚠️ 5 | ✓ 11–20 | ⚠️ placeholder |
| WIND BREAKER 5th | ⚠️ AK Plaza Hongdae | ⚠️ Hongik Univ. 2 | ⚠️ 2 | ✓ split hrs | ⚠️ placeholder |
| Demon Slayer: Full Focus | ⚠️ S-Factory D, Yeonmujang15-gil 11 | ✓ Seongsu 3 | ✓ 5 | ⚠️ est 11–20 | ⚠️ placeholder |
| T1 — Counting the Stars | ⚠️ T-Factory Seongsu | ⚠️ Seongsu 4 | ⚠️ 6 | ⚠️ est 11–20 | ⚠️ placeholder |
| A Shop for Killers (MurderHelp) | ⚠️ Gangnam-daero 420 | ✓ Gangnam 11 | ✓ 2 | ✓ split hrs | ⚠️ placeholder |

## To finalize each row (Supabase → Table Editor → `popups`)

1. **Pin** — find the venue in Naver/Kakao Map, copy exact lat/lng into
   `latitude` / `longitude`.
2. **Walk time** — Naver/Kakao walking directions from the station exit → round
   up into `subway_walk_minutes`.
3. **Photo** — grab the brand's official announcement image, upload to the
   `popup-images` Storage bucket (public read), put that URL in `image_url`.
   The bucket does not exist yet — create it first (supabase/README.md §1.3).

## Researched but NOT seeded (need venue/confirmation before they can go in)

- **Waterside Night** — Hongdae, Food, Jul 2–Aug 16 (no venue address yet)
- **Studio Assistant × Aniplus Cafe** — Hongdae, Food, Jun 25–Aug 9 (venue ambiguous)
- **Tashiro × Toonique Cafe** — Hongdae, Food, Jul 15–Aug 9 (no venue yet)
- **Cellfusion C "Heat Control Center"** — Seongsu, Beauty — **dropped**, ended
  Jul 13 (no meaningful run left as of 2026-07-21).
