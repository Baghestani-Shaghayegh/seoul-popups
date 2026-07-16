# Pending Figma Home sync (blocked by Figma Starter MCP rate limit)

The prototype (`mgn-radar.html`) is ahead of the Figma `mgn2 · Home` frame.
When the Figma MCP limit resets (or the plan is upgraded), run ONE `use_figma`
call on file `Z5fRYglyLx4lh7zz8z3sEq` that makes the Home frame match the prototype:

## Target Home order (top → bottom)
header · location · **Plan my day** (smaller hero) · **Feature** (renamed from
"Happening near you") · **Pick a day** (calendar) · **This month's pop-ups** (new
rail) · **Ending soon** (rail) · tab bar.

## What the sync must do to `mgn2 · Home`
1. `S.itemSpacing = 8` (tighter section spacing).
2. Restyle hero `hero · Plan my day` to the FLAT one-color style + shrink:
   - Background: solid **#6A4BD1** (flat, no gradient); radius 22; padding 16/18.
   - Title "Plan my day" → 21px **white**; eyebrow → **#D8CBFF**; sub → white ~80% opacity.
   - CTA pill "Build my plan" → **pink #EE5D8C bg, white text**; goRow paddingTop 10; cta padding 9/14 + text 12px.
   - Also (color-role rule): day-strip **selected day = purple #6A4BD1**; Discover **selected filter = purple #6A4BD1**
     (they were dark ink). Pink stays for tabs/links/save/badges.
   - Graphic (replaces the heart): **two flat almond EYES stacked vertically**, ~66×92, bottom-right.
     Each = cream almond lens (#F3E9D6, ~58 wide × 32 tall, pointed corners) + **pink iris** #EE5D8C
     (r11.5) + black pupil #141018 (r7.4). Flat, no shadow. Almond eye shape per the client's second
     reference; stacked one-on-top-one-below like the Albers card.
3. Rename `featHdr` text "Happening near you" → **"Feature"**; set its paddingTop 6.
4. Set paddingTop 6 on `moodHdr` (now titled "Pick a day") and `endHdr`.
5. Reorder: move `featHdr` + `featWrap` to just before `moodHdr`
   (so order becomes hero → Feature → Pick a day).
6. Build a **"This month's pop-ups"** header + horizontal rail of 3 event cards
   (Olive Young Pop-up 1d/blue, Tamburins Flagship 14d/purple, Nike Style Seoul 6d/pink)
   and insert both just before `endHdr`.

The full JS for this is in the session transcript (label "HOME_SYNC_DONE"). Re-run it verbatim.

## Note
The other 5 Figma frames (Detail, Discover, Reel, Map, Saved) are already up to date
with the 5-tab menu. Only Home needs this sync.
