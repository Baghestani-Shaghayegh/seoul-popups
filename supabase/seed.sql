-- Seed — the live catalogue as of 2026-07-22 (9 popups, all published).
-- Regenerated from the production database so re-running reproduces the live
-- state exactly. (The earlier version only re-inserted the original 5 with
-- Unsplash stock images, so running it would have REGRESSED production.)
--
-- Content caveats — see content/popups-todo.md:
--   • image_url values are real but HOTLINKED to aggregator CDNs (popply
--     CloudFront, Popga, heypop), not yet uploaded to the popup-images bucket.
--     They render today; swap to official bucket URLs over time.
--   • latitude/longitude are best-effort (venue-geocoded / estimated) — confirm
--     each pin in Naver/Kakao Map. Subway station + exit are source-based.
--
-- Rows are inserted, then published in one shot (the UPDATE at the end) so a
-- fresh seed serves them immediately. In the normal pipeline a new row goes in
-- as a draft (published = false) and a human flips it after verifying the pin +
-- photo (CONTENT.md §3.5).
--
-- Re-running truncates first, so it's safe to re-run.

truncate table public.popups;

insert into public.popups
  (name, tagline, description, neighborhood, category, image_url,
   start_date, end_date, hours,
   subway_line, subway_station, subway_exit, subway_walk_minutes,
   latitude, longitude, reservable,
   source_url, source_name, last_verified_at,
   website_url, instagram_url)
values
  ($$A Shop for Killers — MurderHelp Gangnam$$,
   $$Enter the world of the Disney+ thriller$$,
   $$An immersive popup for the Disney+ series A Shop for Killers, staged as the show's "MurderHelp" storefront steps from Gangnam Station. Walk through set recreations and interactive rooms from the series. Adults only (19+); timed reservations recommended.$$,
   'Gangnam', 'Art', 'https://d8nffddmkwqeq.cloudfront.net/store/53a7cdfa%2Cd934%2C4815%2Ca764%2Cad4bd7bb3403',
   '2026-07-10', '2026-08-08', $$Weekdays 16:00–21:00 · Weekends 12:00–21:00$$,
   'Line 2', 'Gangnam', '11', 2, 37.4995, 127.0276, false,
   'https://popply.co.kr/popup/5431', 'Popply', '2026-07-21',
   'https://popply.co.kr/popup/5431', null),

  ($$Demon Slayer: Infinity Castle Arc Pop-up$$,
   $$Anime merch and photo zones for the Infinity Castle movie$$,
   $$AK Plaza Hongdae's 4th floor turns into a Demon Slayer photo trail tied to the Infinity Castle film arc, with new character art, life-size standees, and exclusive acrylic stands and can badges. Connected directly to Hongik Univ. Station, it's an easy add-on to a Hongdae shopping day.$$,
   'Hongdae', 'Art', 'https://d8nffddmkwqeq.cloudfront.net/store/fd875e77%2C6ecc%2C437b%2C990b%2Cca5a97bb4c0e',
   '2026-07-07', '2026-08-02', $$Mon–Fri 11:00–22:00 · Sat–Sun 10:30–22:00$$,
   'Line 2', 'Hongik Univ.', '2', 2, 37.5568, 126.9243, false,
   'https://popga.co.kr/content/magazine/352', 'Popga', '2026-07-22',
   null, null),

  ($$WIND BREAKER 5th Anniversary Exhibition$$,
   $$Five years of the hit webtoon, walk-through$$,
   $$The popular action webtoon WIND BREAKER marks its fifth anniversary with a gallery-style show inside AK Plaza at Hongik Univ. Station. Expect original art, life-size character setups and anniversary-only merch. It reads visually, so non-Korean fans can enjoy it too.$$,
   'Hongdae', 'Art', 'https://d8nffddmkwqeq.cloudfront.net/store/153df37d%2Cf2c4%2C4f8b%2Cafab%2C1330a20d8a33',
   '2026-07-09', '2026-08-23', $$Mon–Fri 11:00–22:00 · Sat–Sun 10:30–22:00$$,
   'Line 2', 'Hongik Univ.', '2', 2, 37.5568, 126.9243, false,
   'https://dayforyou.com/getDetail?scheduleSeq=26122', 'dayforyou', '2026-07-21',
   'https://dayforyou.com/getDetail?scheduleSeq=26122', null),

  ($$Tashiro, You Rascal! × Toonique Cafe$$,
   $$Anime café collab with character drinks and desserts$$,
   $$Cafe Toonique's Hongdae branch becomes a pop-up shrine to "Tashiro, You Rascal!" for four weeks, with character-themed drinks, desserts, and exclusive collab goods. A short walk from Hongik Univ. Station, it's a quieter alternative to the big-brand Hongdae popups.$$,
   'Hongdae', 'Food', 'https://cdn.popga.co.kr/spot/3095/main/b62a1fe7-f889-4431-9f2d-227161431fc4_1750406338167_thumbnail_MAIN_W480.webp',
   '2026-07-15', '2026-08-09', $$11:00 – 21:00$$,
   'Line 2', 'Hongik Univ.', '3', 3, 37.5558, 126.9235, false,
   'https://popga.co.kr/popup/3095', 'Popga', '2026-07-22',
   null, null),

  ($$Gintama — Korea's First Official Pop-up$$,
   $$The samurai-comedy anime's first-ever Korean popup$$,
   $$Gintama lands its first official Korea popup on the 4th floor of AK Plaza Hongdae, with Japan-imported merch, Korea-exclusive goods, and on-site purchase perks. Connected straight to Hongik Univ. Station, it runs on Naver pre-reservation before switching to walk-in entry in August.$$,
   'Hongdae', 'Art', 'https://cdn.popga.co.kr/spot/5013/main/ce6c04c5-308b-40cf-b687-9cd631171508_1765859229319_thumbnail_MAIN_W480.webp',
   '2026-07-31', '2026-08-27', $$10:00 – 19:00$$,
   'Line 2', 'Hongik Univ.', '2', 2, 37.5568, 126.9243, true,
   'https://www.popply.co.kr/popup/3040', 'Popply', '2026-07-22',
   null, null),

  ($$Demon Slayer: Full Focus Exhibition$$,
   $$A 500-pyeong immersive Demon Slayer world$$,
   $$The global anime hit gets a huge walk-through exhibition at S-Factory in Seongsu. Key scenes — the Demon Slayer Corps HQ, the Mount Natagumo battle, the Mugen Train — are rebuilt as sets you step inside, alongside original-art and photo zones. Timed tickets via Fever.$$,
   'Seongsu', 'Art', 'https://cdn.popga.co.kr/spot/7102/main/af3ce6f2-f6d2-40e2-be7e-e650d297290a_1779176392612_thumbnail_MAIN_W480.webp',
   '2026-06-27', '2026-09-27', $$11:00 – 20:00$$,
   'Line 2', 'Seongsu', '3', 5, 37.5417, 127.0566, false,
   'https://popga.co.kr/popup/7102', 'Popga', '2026-07-21',
   'https://popga.co.kr/popup/7102', null),

  ($$Toy Story × PEACEMINUSONE — The First Fan$$,
   $$G-Dragon's label meets Pixar's Toy Story$$,
   $$Disney and G-Dragon's fashion label PEACEMINUSONE turn Woody and Buzz into a two-floor fashion story. The ground level recreates a childhood bedroom with life-size character silhouettes; upstairs holds 70+ exclusive figures, apparel and accessories you can buy. Photo booths and a "write your childhood dream" zone make the queue worth it.$$,
   'Seongsu', 'Fashion', 'https://storage.heypop.kr/assets/2026/06/01004722/20260630_154721-collage_%EA%B0%80%EB%A1%9C.png',
   '2026-07-01', '2026-08-30', $$11:00 – 20:00$$,
   'Line 2', 'Seongsu', '3', 5, 37.5437, 127.0561, false,
   'https://www.koreaherald.com/article/10783859', 'The Korea Herald', '2026-07-21',
   null, null),

  ($$T1 — Counting the Stars$$,
   $$Step inside T1's championship history$$,
   $$Esports giant T1 (Faker's team) turns its trophy cabinet into a story-driven experience at T-Factory Seongsu. You're cast as a new astronomer in a royal secret bureau, tracing the team's title runs past championship trophies and players' match-worn jerseys. A must for League of Legends fans.$$,
   'Seongsu', 'Lifestyle', 'https://cdn.popga.co.kr/spot/7499/main/0d07019d-3da2-4e0f-a71f-01d63203da90_1781179299853_thumbnail_MAIN_W480.webp',
   '2026-07-02', '2026-09-13', $$11:00 – 20:00$$,
   'Line 2', 'Seongsu', '4', 6, 37.5443, 127.0559, false,
   'https://popga.co.kr/popup/7499', 'Popga', '2026-07-21',
   'https://popga.co.kr/popup/7499', null),

  ($$Park Ttuki Salt Bread × YoAJung$$,
   $$Summer-only churro salt bread meets YoAJung frozen yogurt$$,
   $$Park Ttuki's cult-favorite churro salt bread gets a limited collab menu with YoAJung's signature yogurt, honeycomb, and choco-shell toppings — only at the Seongsu flagship for the run of the promotion. Grab the honeycomb churro or choco-shell churro version before it's gone.$$,
   'Seongsu', 'Food', 'https://cdn.popga.co.kr/spot/7756/main/83f497e7-bc5f-42cd-afbd-501e390cecb7_1782715106445_thumbnail_MAIN_W480.webp',
   '2026-07-07', '2026-08-07', $$09:00 – 16:00$$,
   'Line 2', 'Seongsu', '3', 7, 37.5445, 127.0555, false,
   'https://popga.co.kr/popup/7756', 'Popga', '2026-07-22',
   null, null);

-- Seed rows go live immediately (see header note).
update public.popups set published = true;
