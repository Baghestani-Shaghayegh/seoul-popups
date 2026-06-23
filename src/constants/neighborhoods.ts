import type { Neighborhood } from '@/types/popup';

/**
 * Display metadata for the three launch neighborhoods.
 * Coordinates are the rough center of each area, used to frame the Map screen.
 */
export const NEIGHBORHOOD_META: Record<
  Neighborhood,
  { label: string; blurb: string; latitude: number; longitude: number }
> = {
  Seongsu: {
    label: 'Seongsu',
    blurb: "Seoul's Brooklyn — cafes, concept stores, brand pop-ups",
    latitude: 37.5446,
    longitude: 127.0559,
  },
  Hongdae: {
    label: 'Hongdae',
    blurb: 'Youthful, artsy, indie fashion and street culture',
    latitude: 37.5563,
    longitude: 126.9236,
  },
  Gangnam: {
    label: 'Gangnam',
    blurb: 'Upscale flagship pop-ups and beauty brands',
    latitude: 37.4979,
    longitude: 127.0276,
  },
};
