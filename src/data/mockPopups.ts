import type { Popup } from '@/types/popup';

/**
 * Mock data so the UI can be built and demoed before Supabase is wired up.
 * Replace with a real query in src/hooks/usePopups.ts when the backend is ready.
 */
export const MOCK_POPUPS: Popup[] = [
  {
    id: '1',
    name: 'Tamburins Flagship',
    tagline: 'Sculptural perfume & hand cream pop-up',
    description:
      'A moody, gallery-like space showcasing Tamburins’ latest fragrance line, with installations you can actually touch and sample.',
    neighborhood: 'Seongsu',
    category: 'Beauty',
    imageUrl:
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&q=80',
    startDate: '2026-06-01',
    endDate: '2026-07-15',
    hours: '11:00 – 20:00',
    subway: { line: 'Line 2', station: 'Seongsu', exit: '3', walkMinutes: 6 },
    latitude: 37.5447,
    longitude: 127.0557,
    reservable: true,
  },
  {
    id: '2',
    name: 'Gentle Monster x Jentle Garden',
    tagline: 'Surreal eyewear experience with robotics',
    description:
      'Part retail, part art exhibition. Giant kinetic sculptures and the newest eyewear drops in an immersive garden set.',
    neighborhood: 'Hongdae',
    category: 'Fashion',
    imageUrl:
      'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&q=80',
    startDate: '2026-06-10',
    endDate: '2026-08-01',
    hours: '12:00 – 21:00',
    subway: {
      line: 'Line 2',
      station: 'Hongik Univ.',
      exit: '9',
      walkMinutes: 8,
    },
    latitude: 37.5561,
    longitude: 126.9244,
    reservable: false,
  },
  {
    id: '3',
    name: 'Nike Style Seoul',
    tagline: 'Limited sneaker drops & customization bar',
    description:
      'Reserve a slot at the customization bar, grab member-exclusive releases, and join daily styling sessions.',
    neighborhood: 'Gangnam',
    category: 'Fashion',
    imageUrl:
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80',
    startDate: '2026-05-20',
    endDate: '2026-06-30',
    hours: '10:30 – 22:00',
    subway: {
      line: 'Line 9',
      station: 'Sinnonhyeon',
      exit: '6',
      walkMinutes: 4,
    },
    latitude: 37.5045,
    longitude: 127.025,
    reservable: true,
  },
  {
    id: '4',
    name: 'Matin Kim Concept Store',
    tagline: 'K-fashion it-brand seasonal showcase',
    description:
      'The hyped Korean label takes over a two-floor space with the full fall collection and a members-only café upstairs.',
    neighborhood: 'Seongsu',
    category: 'Fashion',
    imageUrl:
      'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80',
    startDate: '2026-06-15',
    endDate: '2026-09-01',
    hours: '11:00 – 21:00',
    subway: { line: 'Line 2', station: 'Seongsu', exit: '4', walkMinutes: 3 },
    latitude: 37.5443,
    longitude: 127.056,
    reservable: false,
  },
  {
    id: '5',
    name: 'Olive Young Beauty Lab',
    tagline: 'Try-before-you-buy K-beauty playground',
    description:
      'Hands-on testing stations, AI skin analysis, and a curated wall of trending K-beauty products with English staff.',
    neighborhood: 'Hongdae',
    category: 'Beauty',
    imageUrl:
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&q=80',
    startDate: '2026-06-05',
    endDate: '2026-07-20',
    hours: '10:00 – 22:00',
    subway: {
      line: 'Line 2',
      station: 'Hongik Univ.',
      exit: '8',
      walkMinutes: 5,
    },
    latitude: 37.5558,
    longitude: 126.924,
    reservable: true,
  },
  {
    id: '6',
    name: 'Nudake Dessert Lab',
    tagline: 'Avant-garde cakes & art-piece pastries',
    description:
      'Gentle Monster’s dessert house serves sculptural cakes and a limited matcha croissant you can only get here.',
    neighborhood: 'Seongsu',
    category: 'Food',
    imageUrl:
      'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=800&q=80',
    startDate: '2026-06-01',
    endDate: '2026-07-31',
    hours: '11:00 – 21:00',
    subway: { line: 'Line 2', station: 'Seongsu', exit: '2', walkMinutes: 7 },
    latitude: 37.5449,
    longitude: 127.0558,
    reservable: false,
  },
  {
    id: '7',
    name: 'Kakao Friends Summer House',
    tagline: 'Character goods & photo zones galore',
    description:
      'A playful pop-up packed with Ryan and friends — exclusive summer merch, giant plushies, and Instagram-ready sets.',
    neighborhood: 'Hongdae',
    category: 'Lifestyle',
    imageUrl:
      'https://images.unsplash.com/photo-1558877385-8c1b8e6e6d3a?w=800&q=80',
    startDate: '2026-06-12',
    endDate: '2026-08-15',
    hours: '11:00 – 20:00',
    subway: {
      line: 'Line 2',
      station: 'Hongik Univ.',
      exit: '1',
      walkMinutes: 6,
    },
    latitude: 37.5565,
    longitude: 126.9235,
    reservable: false,
  },
  {
    id: '8',
    name: 'Light & Space Art Pop-up',
    tagline: 'Immersive digital art coming this summer',
    description:
      'A walk-through light installation by a Seoul media-art collective. Timed-entry tickets, opening early July.',
    neighborhood: 'Gangnam',
    category: 'Art',
    imageUrl:
      'https://images.unsplash.com/photo-1545989253-02cc26577f88?w=800&q=80',
    startDate: '2026-07-05',
    endDate: '2026-08-10',
    hours: '10:00 – 20:00',
    subway: {
      line: 'Line 9',
      station: 'Sinnonhyeon',
      exit: '5',
      walkMinutes: 5,
    },
    latitude: 37.5048,
    longitude: 127.0245,
    reservable: true,
  },
  {
    id: '9',
    name: 'Jellycat Café Seoul',
    tagline: 'Plush-toy themed café (now closed)',
    description:
      'A whimsical café where the menu came to life as plush characters. This run has wrapped up — check back for the next one.',
    neighborhood: 'Seongsu',
    category: 'Lifestyle',
    imageUrl:
      'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=800&q=80',
    startDate: '2026-05-01',
    endDate: '2026-06-15',
    hours: '11:00 – 20:00',
    subway: { line: 'Line 2', station: 'Seongsu', exit: '1', walkMinutes: 5 },
    latitude: 37.5451,
    longitude: 127.0562,
    reservable: false,
  },
];
