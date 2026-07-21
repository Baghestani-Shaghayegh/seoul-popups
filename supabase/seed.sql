-- Seed — placeholder catalogue so the app runs against live Supabase before
-- real content is sourced. These 9 entries mirror the former mock data
-- (src/data/mockPopups.ts): recognizable brands, plausible details, but stock
-- Unsplash images and invented dates. Replace with CONTENT.md-sourced real
-- popups (real photos in the popup-images bucket) as they are researched.
--
-- Safe to re-run against a fresh DB. Ids are DB-generated UUIDs (not fixed), so
-- running this twice inserts duplicates — truncate first if reseeding:
--   truncate table public.popups;

insert into public.popups
  (name, tagline, description, neighborhood, category, image_url,
   start_date, end_date, hours,
   subway_line, subway_station, subway_exit, subway_walk_minutes,
   latitude, longitude, reservable)
values
  ('Tamburins Flagship', 'Sculptural perfume & hand cream pop-up',
   'A moody, gallery-like space showcasing Tamburins'' latest fragrance line, with installations you can actually touch and sample.',
   'Seongsu', 'Beauty', 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&q=80',
   '2026-06-01', '2026-07-15', '11:00 – 20:00', 'Line 2', 'Seongsu', '3', 6, 37.5447, 127.0557, true),
  ('Gentle Monster x Jentle Garden', 'Surreal eyewear experience with robotics',
   'Part retail, part art exhibition. Giant kinetic sculptures and the newest eyewear drops in an immersive garden set.',
   'Hongdae', 'Fashion', 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&q=80',
   '2026-06-10', '2026-08-01', '12:00 – 21:00', 'Line 2', 'Hongik Univ.', '9', 8, 37.5561, 126.9244, false),
  ('Nike Style Seoul', 'Limited sneaker drops & customization bar',
   'Reserve a slot at the customization bar, grab member-exclusive releases, and join daily styling sessions.',
   'Gangnam', 'Fashion', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80',
   '2026-05-20', '2026-06-30', '10:30 – 22:00', 'Line 9', 'Sinnonhyeon', '6', 4, 37.5045, 127.025, true),
  ('Matin Kim Concept Store', 'K-fashion it-brand seasonal showcase',
   'The hyped Korean label takes over a two-floor space with the full fall collection and a members-only café upstairs.',
   'Seongsu', 'Fashion', 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80',
   '2026-06-15', '2026-09-01', '11:00 – 21:00', 'Line 2', 'Seongsu', '4', 3, 37.5443, 127.056, false),
  ('Olive Young Beauty Lab', 'Try-before-you-buy K-beauty playground',
   'Hands-on testing stations, AI skin analysis, and a curated wall of trending K-beauty products with English staff.',
   'Hongdae', 'Beauty', 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&q=80',
   '2026-06-05', '2026-07-20', '10:00 – 22:00', 'Line 2', 'Hongik Univ.', '8', 5, 37.5558, 126.924, true),
  ('Nudake Dessert Lab', 'Avant-garde cakes & art-piece pastries',
   'Gentle Monster''s dessert house serves sculptural cakes and a limited matcha croissant you can only get here.',
   'Seongsu', 'Food', 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=800&q=80',
   '2026-06-01', '2026-07-31', '11:00 – 21:00', 'Line 2', 'Seongsu', '2', 7, 37.5449, 127.0558, false),
  ('Kakao Friends Summer House', 'Character goods & photo zones galore',
   'A playful pop-up packed with Ryan and friends — exclusive summer merch, giant plushies, and Instagram-ready sets.',
   'Hongdae', 'Lifestyle', 'https://images.unsplash.com/photo-1558877385-8c1b8e6e6d3a?w=800&q=80',
   '2026-06-12', '2026-08-15', '11:00 – 20:00', 'Line 2', 'Hongik Univ.', '1', 6, 37.5565, 126.9235, false),
  ('Light & Space Art Pop-up', 'Immersive digital art coming this summer',
   'A walk-through light installation by a Seoul media-art collective. Timed-entry tickets, opening early July.',
   'Gangnam', 'Art', 'https://images.unsplash.com/photo-1545989253-02cc26577f88?w=800&q=80',
   '2026-07-05', '2026-08-10', '10:00 – 20:00', 'Line 9', 'Sinnonhyeon', '5', 5, 37.5048, 127.0245, true),
  ('Jellycat Café Seoul', 'Plush-toy themed café (now closed)',
   'A whimsical café where the menu came to life as plush characters. This run has wrapped up — check back for the next one.',
   'Seongsu', 'Lifestyle', 'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=800&q=80',
   '2026-05-01', '2026-06-15', '11:00 – 20:00', 'Line 2', 'Seongsu', '1', 5, 37.5451, 127.0562, false);
