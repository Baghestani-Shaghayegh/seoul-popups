# Popup content — verification TODO

The first real catalogue (`supabase/seed.sql`, seeded 2026-07-21) is **live and
published**. Dates, hours, venue and subway station come from the listed
sources; the fields below are best-effort and need a human pass with map tools
+ official photos, per [CONTENT.md](../CONTENT.md) §3–§4.

Legend: ✓ = source-confirmed · ⚠️ = estimated, verify · 🔶 interim = real but hotlinked

| Popup | Coords | Subway exit | Walk min | Hours | Image |
|---|---|---|---|---|---|
| Toy Story × PEACEMINUSONE | ⚠️ 연무장길 27 (confirmed addr) | ⚠️ Seongsu 3 | ⚠️ 5 | ✓ 11–20 | 🔶 interim (heypop) |
| WIND BREAKER 5th | ⚠️ AK Plaza Hongdae 3F, 양화로 188 | ⚠️ Hongik Univ. 2 | ⚠️ 2 | ✓ split hrs | 🔶 interim (popply) |
| Demon Slayer: Full Focus | ⚠️ S-Factory D, Yeonmujang15-gil 11 | ✓ Seongsu 3 | ✓ 5 | ⚠️ est 11–20 | 🔶 interim (Popga) |
| T1 — Counting the Stars | ⚠️ T-Factory, 연무장1길 7-1 (confirmed addr) | ⚠️ Seongsu 4 | ⚠️ 6 | ✓ 11–20 | 🔶 interim (Popga) |
| A Shop for Killers (MurderHelp) | ⚠️ Gangnam-daero 420 | ✓ Gangnam 11 | ✓ 2 | ✓ split hrs | 🔶 interim (popply) |

**Photo pass 2026-07-22:** **all 9 popups now show real images — zero Unsplash
stock left.** Sources are hotlinked aggregator images (popply CloudFront 800×600,
Popga CDN, heypop) set directly on `image_url` — no bucket upload needed. These
render fine; for long-term durability + brand-official quality you can still
upload official photos to the `popup-images` bucket and swap the URLs over time.

## Drafted 2026-07-21 (in Supabase, `published = false` — not yet in the app)

Sourced from a Popga scan. All three passed `npm run validate:popup`; none are
publishable yet because coords are estimated and images are Unsplash
placeholders — that's expected, it's exactly what the draft gate (CONTENT.md
§3.5) is for.

| Popup | Neighborhood | Coords | Subway exit | Walk min | Hours | Image |
|---|---|---|---|---|---|---|
| Demon Slayer: Infinity Castle Arc | Hongdae | ⚠️ reused AK Plaza Hongdae pin | ⚠️ Hongik Univ. 2 | ⚠️ 2 | ✓ split hrs | 🔶 interim (popply) |
| Park Ttuki Salt Bread × YoAJung | Seongsu | ⚠️ est. from 왕십리로14길 19-7 | ✓ Seongsu 3 | ✓ 7 | ✓ 09–16 | 🔶 interim (Popga) |
| Tashiro, You Rascal! × Toonique Cafe | Hongdae | ⚠️ est. from 동교동 147-34 | ✓ Hongik Univ. 3 | ✓ 3 | ⚠️ est 11–21 | 🔶 interim (Popga) |
| Gintama — Korea's First Official Pop-up | Hongdae | ⚠️ reused AK Plaza Hongdae pin | ⚠️ Hongik Univ. 2 | ⚠️ 2 | ✓ 10–19 | 🔶 interim (Popga) |

**All 4 drafts now have real images** → the only thing between them and going
live is a publish flip (their pins are estimated, same bar as the live 5).

🔶 **interim (Popga)** = `image_url` currently hotlinks a 480px Popga CDN
thumbnail (`cdn.popga.co.kr/spot/…`). Good enough to preview the draft, but
**not publish-ready**: it's low-res, hotlinked (can break), and not the brand's
own photo. Before publishing, download an official announcement image, upload to
the `popup-images` bucket, and replace `image_url` with the bucket URL (§4).
Demon Slayer + Gintama still on Unsplash placeholders — no reliable Popga
single-popup image matched the current run.

To publish one: confirm its pin + swap the photo (steps below), then in the
Supabase Table Editor set `published = true` and `last_verified_at` to today.

## 📸 Photo upload shot-list (prepped 2026-07-22)

**6 of 9 popups now show real (interim, hotlinked) images.** Only these **3
still need an official photo** uploaded to the `popup-images` bucket:

**Upload workflow (once per image):**
1. Supabase dashboard → **Storage → `popup-images`** → drag the image in
   (≤5 MB; jpg / png / webp).
2. Click the file → **Copy URL** (public).
3. Paste the URLs back to Claude → it sets `image_url` (and publishes the draft).

| Popup | State | Where to grab the official image |
|---|---|---|
| **WIND BREAKER 5th Anniversary** | LIVE (stock) | Official exhibition poster — search IG "윈드브레이커 5주년 전시", or the [aniway listing](https://aniway.kr/popups/13901bcc-0121-480a-a1cc-9b4654657444) / [dayforyou](https://dayforyou.com/getDetail?scheduleSeq=26122) |
| **A Shop for Killers — MurderHelp** | LIVE (stock) | Disney+ Korea (**@disneypluskorea**) — S2 launched 2026-07-22; or the [popply page](https://popply.co.kr/popup/5431) |
| **Demon Slayer: Infinity Castle Arc** | DRAFT (stock) | Official popup IG **@kmt_popup_kr**, or [Popga July Hongdae roundup](https://popga.co.kr/content/magazine/352) |

**Interim images (fine to ship, optionally upgrade later):** Toy Story, Demon
Slayer Full Focus, T1 (live) and Park Ttuki, Tashiro, Gintama (draft) all use
real hotlinked aggregator images (Popga CDN / heypop). They render, but for
durability + quality you can replace them with official uploads over time.

## To finalize each row (Supabase → Table Editor → `popups`)

1. **Pin** — find the venue in Naver/Kakao Map, copy exact lat/lng into
   `latitude` / `longitude`.
2. **Walk time** — Naver/Kakao walking directions from the station exit → round
   up into `subway_walk_minutes`.
3. **Photo** — grab the brand's official announcement image, upload to the
   `popup-images` Storage bucket (public read; created via migration `004`),
   put that URL in `image_url`. Uploads are dashboard-only (drag-and-drop);
   the bucket accepts image files up to 5 MB.

## Researched but NOT seeded (need venue/confirmation before they can go in)

- **Waterside Night** — Hongdae, Food, Jul 2–Aug 16 (no venue address yet)
- **Studio Assistant × Aniplus Cafe** — Hongdae, Food, Jun 25–Aug 9 (venue ambiguous)
- **Cellfusion C "Heat Control Center"** — Seongsu, Beauty — **dropped**, ended
  Jul 13 (no meaningful run left as of 2026-07-21).

## Gangnam scan (2026-07-21) — nothing publishable

Gangnam is quiet for popups in late July; no *July* aggregator roundup exists
(only a stale June one). Candidates all failed the bar:

- **정서불안 김햄찌 "오늘도 출근햄니다"** — Shinsegae Gangnam Central 1F, Jul 9–**22**
  (ends immediately; also technically Seocho / Express Bus Terminal).
- **Metaglass** — Shinsegae Gangnam B1, **ended** Jul 9.
- **Character Licensing Fair 2026** — COEX, Jul 16–19: a trade fair, not a popup.

Re-scan Gangnam in early August — new launches usually land then. Gangnam
stays at 1 published for now.
