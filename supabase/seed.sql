-- Seed — first REAL catalogue (researched 2026-07-21). Five popups actually
-- running in Seongsu / Hongdae / Gangnam this month, sourced per CONTENT.md.
--
-- ⚠️ NOT fully verified — see content/popups-todo.md. Two classes of field are
-- best-effort and need a human pass before this is "clean":
--   • image_url  — interim Unsplash stock. Replace with official announcement
--                  photos uploaded to the popup-images bucket (CONTENT.md §4).
--   • latitude/longitude + subway_walk_minutes — geocoded from the venue
--                  address / estimated. Confirm the pin + walk time in Naver or
--                  Kakao Map (exits marked ✓ in the TODO are source-confirmed).
-- Dates, hours, venue and subway station are from the sources in source_url.
--
-- Re-running inserts duplicates (UUID ids). To reseed: truncate first.
--   truncate table public.popups;

truncate table public.popups;

-- published + last_verified_at are set so the app serves these immediately;
-- in the normal pipeline a row is inserted as a draft (published = false) and a
-- human flips it after verifying the pin + photo (see CONTENT.md §3.5).
insert into public.popups
  (name, tagline, description, neighborhood, category, image_url,
   start_date, end_date, hours,
   subway_line, subway_station, subway_exit, subway_walk_minutes,
   latitude, longitude, reservable, source_url,
   source_name, published, last_verified_at)
values
  ($$Toy Story × PEACEMINUSONE — The First Fan$$,
   $$G-Dragon's label meets Pixar's Toy Story$$,
   $$Disney and G-Dragon's fashion label PEACEMINUSONE turn Woody and Buzz into a two-floor fashion story. The ground level recreates a childhood bedroom with life-size character silhouettes; upstairs holds 70+ exclusive figures, apparel and accessories you can buy. Photo booths and a "write your childhood dream" zone make the queue worth it.$$,
   'Seongsu', 'Fashion', 'https://images.unsplash.com/photo-1558877385-8c1b8e6e6d3a?w=800&q=80',
   '2026-07-01', '2026-08-30', '11:00 – 20:00',
   'Line 2', 'Seongsu', '3', 5, 37.5437, 127.0561, false,
   'https://www.koreaherald.com/article/10783859',
   'The Korea Herald', true, '2026-07-21'),

  ($$WIND BREAKER 5th Anniversary Exhibition$$,
   $$Five years of the hit webtoon, walk-through$$,
   $$The popular action webtoon WIND BREAKER marks its fifth anniversary with a gallery-style show inside AK Plaza at Hongik Univ. Station. Expect original art, life-size character setups and anniversary-only merch. It reads visually, so non-Korean fans can enjoy it too.$$,
   'Hongdae', 'Art', 'https://images.unsplash.com/photo-1545989253-02cc26577f88?w=800&q=80',
   '2026-07-09', '2026-08-23', 'Mon–Fri 11:00–22:00 · Sat–Sun 10:30–22:00',
   'Line 2', 'Hongik Univ.', '2', 2, 37.5568, 126.9243, false,
   'https://dayforyou.com/getDetail?scheduleSeq=26122',
   'dayforyou', true, '2026-07-21'),

  ($$Demon Slayer: Full Focus Exhibition$$,
   $$A 500-pyeong immersive Demon Slayer world$$,
   $$The global anime hit gets a huge walk-through exhibition at S-Factory in Seongsu. Key scenes — the Demon Slayer Corps HQ, the Mount Natagumo battle, the Mugen Train — are rebuilt as sets you step inside, alongside original-art and photo zones. Timed tickets via Fever.$$,
   'Seongsu', 'Art', 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&q=80',
   '2026-06-27', '2026-09-27', '11:00 – 20:00',
   'Line 2', 'Seongsu', '3', 5, 37.5417, 127.0566, false,
   'https://popga.co.kr/popup/7102',
   'Popga', true, '2026-07-21'),

  ($$T1 — Counting the Stars$$,
   $$Step inside T1's championship history$$,
   $$Esports giant T1 (Faker's team) turns its trophy cabinet into a story-driven experience at T-Factory Seongsu. You're cast as a new astronomer in a royal secret bureau, tracing the team's title runs past championship trophies and players' match-worn jerseys. A must for League of Legends fans.$$,
   'Seongsu', 'Lifestyle', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80',
   '2026-07-02', '2026-09-13', '11:00 – 20:00',
   'Line 2', 'Seongsu', '4', 6, 37.5443, 127.0559, false,
   'https://popga.co.kr/popup/7499',
   'Popga', true, '2026-07-21'),

  ($$A Shop for Killers — MurderHelp Gangnam$$,
   $$Enter the world of the Disney+ thriller$$,
   $$An immersive popup for the Disney+ series A Shop for Killers, staged as the show's "MurderHelp" storefront steps from Gangnam Station. Walk through set recreations and interactive rooms from the series. Adults only (19+); timed reservations recommended.$$,
   'Gangnam', 'Art', 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&q=80',
   '2026-07-10', '2026-08-08', 'Weekdays 16:00–21:00 · Weekends 12:00–21:00',
   'Line 2', 'Gangnam', '11', 2, 37.4995, 127.0276, false,
   'https://popply.co.kr/popup/5431',
   'Popply', true, '2026-07-21');
