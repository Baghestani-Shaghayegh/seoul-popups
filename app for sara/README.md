# mgn radar — app redesign

Local events / experiences discovery app for **Seoul (Seongsu district)**.
Brand: **mgn**, heart logo, **purple/pink**. We are redesigning rough Figma draft
frames into a clean, production-ready mobile UI.

---

## Files in this folder

| File | What it is |
|------|-----------|
| `mgn-radar.html` | The clean prototype — open in any browser. 5 screens, fully clickable, light + dark theme. |
| `README.md` | This handoff. |

Live Artifact (hosted, private): https://claude.ai/code/artifact/cca3acff-0891-43ae-ad9e-fb1a8d50a6e8

---

## Figma source

- File **mgn-radar** — key `Z5fRYglyLx4lh7zz8z3sEq`
- URL: https://www.figma.com/design/Z5fRYglyLx4lh7zz8z3sEq/mgn-radar
- Draft frames (375×812): mgn 1 `2:382` · mgn 2 `2:487` · mgn 3 `4:469` · mgn 4 `4:547` · mgn 5 `5:930` · mgn 6 `5:1109` · mgn 7 `5:1261` · mgn 8 `5:1496`
- Also contains: Login, Register, Profile, Search, Chats, Discover screens.

---

## Chosen direction — "Soft & friendly", ease of use first

### Palette (purple/pink only — no rainbow)
- Primary pink `#EE5D8C` (deep `#C43C6B`, soft tint `#FDE1EC`)
- Purple `#6A4BD1` / lavender fill `#ECE7FE`
- Warm background `#FAF6F3`, surface `#FFFFFF`, ink `#2B2532`, muted `#7C7488`
- Full **light + dark** themes via CSS custom properties (tokens at top of the HTML).

### Color-role rule (keep the two colors coherent)
- **Purple `#6A4BD1` = "your plan / your day"** → the Plan my day hero surface, the *selected day*
  in the day-strip, and the *selected filter* chip in Discover.
- **Pink `#EE5D8C` = navigation + actions + accents** → active bottom-nav tab, "See all" links,
  save hearts, category tags (e.g. K-pop), badges, and primary buttons (incl. hero "Build my plan").
- The two meet on the hero: purple card + pink CTA + pink-iris almond eyes.

### Type
- Display: `ui-rounded` / "SF Pro Rounded" (friendly rounded)
- Body: system sans stack
- Rounded corners 18–26px, soft shadows, lavender-tinted surfaces.

---

## Screens built (6) — all live/tappable

1. **Home** — greeting + notification bell, location pill,
   **"Plan my day" hero** (soft lavender→pink gradient, pink heart, dark "Build my plan" pill),
   **"Pick a day" day-strip calendar** (this replaced the old "Browse by mood" icon row),
   "Happening near you" featured card, "Ending soon" rail.
2. **Event detail** — poster header, save/back, fact pills, organiser + Follow, about, lineup, sticky "Get tickets".
3. **Discover (Research)** — search field, filter pills, results grid.
4. **Reel** — Instagram-linked vertical video feed: `@mgn.radar` badge, like/comment/share/save rail,
   account + Follow, caption, and an event chip that taps through to the detail. (Real reels pull from Instagram.)
5. **Map** — stylized pastel Seoul map (Han River, parks, roads), **purple/pink teardrop pins**
   (featured = pink, rest = purple), "you are here" dot, nearby-events bottom sheet.
6. **Favorites (Saved)** — list with countdowns.

Bottom menu (5 tabs): **Home · Research · Reel · Map · Favorites**.

---

## Decisions made (do NOT redo these)

- Rejected v1 rose/"radar" technical look → chose **soft & friendly**.
- Moods reduced from 5 colors → **purple/pink only**.
- Moods are **icon only** (no text labels).
- "Plan my day" hero = **soft gradient version**. We rejected BOTH the flashy
  orbs/sparkles/preview version AND the flat one-color version.
- Removed the meaningless "All" 4-dots mood icon.
- Target size for Figma rebuild: **393×812** (iPhone 15/16).

---

## Figma sync status

- **Home — ✅ SYNCED.** The `mgn2 · Home` frame now matches the app (flat purple hero + almond
  eyes, pink CTA, overlay Feature card with "12 going tonight", Pick a day (purple selected),
  This month's pop-ups, Ending soon, 5-tab bar).
- **Detail + Discover — ⏳ pending** (hit the Figma Starter rate limit, ~1 write per window).
  Run **`figma-detail-discover-sync.js`** once via the Figma `use_figma` tool
  (fileKey `Z5fRYglyLx4lh7zz8z3sEq`) when the limit clears. It makes Detail info-only
  (**Directions** + **Official page ↗** instead of price/Get tickets) and sets the Discover
  selected filter chip to **purple**.
- `figma-home-sync.js` is kept as a full Home rebuild script (already applied; re-runnable).

## Figma status — mostly DONE

All 6 screens are now built as native, editable frames in the `mgn-radar` file, in a
row to the right of the drafts, labeled `mgn2 · Home / Detail / Discover / Reel / Map / Saved`
(header label "mgn radar — redesign v2 · 393×812"). Every screen carries the 5-tab menu.
Event posters are gradient placeholders → swap in real event artwork.

## Possible next steps
- Swap gradient placeholders for real event images (Figma + prototype).
- Wire Reel to actually pull from the `@mgn.radar` Instagram feed.
- Add remaining screens (profile, chat, ticket/checkout, onboarding).

To resume in a new session, say:
> "Read README.md in mgncreatives and continue on the mgn radar redesign."
