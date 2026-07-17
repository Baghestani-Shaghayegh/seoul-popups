# Content Playbook — where popup data comes from

How we find popups and get them into the app. This is the "data part" of the
product: there is **no public Seoul-popups API** — every listing app runs on
human curation, and for tourists the curation _is_ the product. Budget ~30
minutes a week once the routine settles.

Companion docs: [FEATURES.md](FEATURES.md) (when to build what),
[SECURITY.md](SECURITY.md) (rules for data + links),
[supabase/README.md](supabase/README.md) (how to apply the schema and test it).

---

## 1. Sources — the weekly scan

Check these once or twice a week; new popups announce 1–3 weeks ahead:

- **Instagram aggregators** — Korean accounts that post every notable popup.
  Search 팝업스토어 ("popup store") and follow the big ones (e.g.
  @pops.official) plus Seongsu-focused accounts.
- **Popply** — <https://popply.co.kr>, a Korean site dedicated to popup
  listings. Best for cross-checking dates and addresses.
- **Host venues** (they run popups back-to-back — following them is a steady
  feed): Project Rent and LCDC Seoul in Seongsu, The Hyundai Seoul's basement
  popup floor, Musinsa Terrace in Hongdae.
- **The brand's own Instagram** — once you know a popup exists, the brand's
  announcement post is the official source for dates, hours, and photos.
- **@mgn.radar scouting** — whatever gets scouted for the account is seed
  content for the app; the app is the structured home for the same research.

English sources (Visit Seoul, Time Out Seoul) are sparse and slow — that gap
is why this app exists. Don't rely on them; do check them occasionally for
tourist-angle framing.

## 2. What makes the cut

Guidelines, not laws — editorial judgment is the moat:

- In one of our neighborhoods (Seongsu / Hongdae / Gangnam for launch).
- Still has a meaningful run left when published (roughly a week or more).
- Works for a visitor who doesn't read Korean: visual, self-explanatory, or
  English-friendly.
- Real dates and location confirmed from the brand's own announcement, not
  just a repost.

## 3. Per-popup research form

Collect this while researching (matches `src/types/popup.ts` and the
`supabase/schema.sql` columns). Copy-paste per popup:

```yaml
name: # official English name (romanize if needed)
tagline: # one line, our words — the hook on cards
description: # 2–4 sentences, our words, English. Never paste brand copy.
neighborhood: # Seongsu | Hongdae | Gangnam
category: # Fashion | Beauty | Food | Art | Lifestyle
start_date: # YYYY-MM-DD
end_date: # YYYY-MM-DD
hours: # e.g. "11:00 – 20:00"
image_url: # https URL from our popup-images bucket (see §4)
latitude: # right-click the spot in Google Maps → copy coords
longitude:
subway_line: # e.g. "Line 2" — English line name
subway_station: # e.g. "Seongsu"
subway_exit: # e.g. "3"
subway_walk_minutes: # walking directions in Naver/Kakao Map from the exit
reservable: # false for now (reservations are Phase 2)
instagram_url: # brand/popup account, https (optional)
website_url: # official page, https (optional)
reservation_url: # Naver booking / brand form, https (optional)
source_url: # where YOU found it — never shown in app, for re-checking
```

Field tips:

- **Coordinates:** in Google Maps, right-click the exact storefront → the
  lat/lng shows at the top of the menu; click to copy.
- **Subway:** Naver Map or Kakao Map → walking directions from the station to
  the venue. They give the exit number and minutes — this ⭐ differentiator
  comes straight from the tools locals use. Round minutes up.
- **Descriptions are written by us, in our voice.** Don't translate-paste the
  brand's marketing text (copyright + it reads like an ad). Say what it is,
  what you can do/buy there, and why a visitor would care.
- **Dates drive everything.** Status ("Open now", "Ending soon", "Ended") is
  derived from `start_date`/`end_date` — a wrong date is a wrong app.

## 4. Photos

- Use the brand's official announcement photos (credit by linking
  `instagram_url`) or your own shots. Only owner-published promo images — no
  random visitors' photos.
- **Never hot-link Instagram image URLs** — they're signed and expire. Upload
  the image to our Supabase Storage bucket (`popup-images`, public read) and
  put that permanent URL in `image_url`. Steps in
  [supabase/README.md](supabase/README.md).
- `https` only (the schema enforces it). Landscape-ish images look best on
  the cards.

## 5. Entering + maintaining data

Entry happens in the **Supabase dashboard → Table Editor → `popups`** — it
works like a spreadsheet, one row per popup. No code, no anon-key writes
(RLS blocks those; see SECURITY.md §2). Prefer drafting many at once? Keep a
Google Sheet with the §3 columns and use the Table Editor's CSV import.

Weekly maintenance (same session as the scan):

- Re-check `source_url` for popups still listed — extensions and early
  closures are common; update `end_date` when they happen.
- Ended popups disappear from default views on their own (status is derived);
  leave the rows in place as history.
- After entering, open the app and pull the list fresh — confirm the new
  popup renders, the map pin lands on the right building, and the subway
  directions read sanely.

## 6. Scaling later (don't build yet)

- **Phase 2 — Reel feed:** @mgn.radar clips pulled automatically; the
  Instagram token stays server-side (FEATURES.md, SECURITY.md §1).
- **Phase 3 — partner portal:** brands submit their own popups; submissions
  are untrusted input and get reviewed before publish.
- If weekly entry ever feels heavy, the fix is a nicer admin form — not
  opening up table writes to the app.
