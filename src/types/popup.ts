/**
 * Core domain types for Seoul Popups.
 * These mirror the shape we'll eventually fetch from Supabase, so screens and
 * components can be built against them now and swapped from mock -> live later.
 */

export type Neighborhood = 'Seongsu' | 'Hongdae' | 'Gangnam';

export const NEIGHBORHOODS: Neighborhood[] = ['Seongsu', 'Hongdae', 'Gangnam'];

export type Category = 'Fashion' | 'Beauty' | 'Food' | 'Art' | 'Lifestyle';

export const CATEGORIES: Category[] = [
  'Fashion',
  'Beauty',
  'Food',
  'Art',
  'Lifestyle',
];

/** Subway directions — a key differentiator for foreign visitors. */
export interface SubwayDirection {
  /** e.g. "Line 2", "Suin-Bundang Line" */
  line: string;
  /** Station name in English, e.g. "Seongsu" */
  station: string;
  /** Exit number, e.g. "3" */
  exit: string;
  /** Walking time from the exit in minutes */
  walkMinutes: number;
}

export interface Popup {
  id: string;
  name: string;
  /** One-line hook shown on cards. */
  tagline: string;
  description: string;
  neighborhood: Neighborhood;
  category: Category;
  /** Hero image URL. */
  imageUrl: string;

  /** ISO date strings (YYYY-MM-DD). */
  startDate: string;
  endDate: string;
  /** Human-readable opening hours, e.g. "11:00 – 20:00". */
  hours: string;

  subway: SubwayDirection;

  /** Map coordinates for the Map screen. */
  latitude: number;
  longitude: number;

  /** Whether in-app reservation is available. */
  reservable: boolean;

  /** Optional outbound links shown on the detail screen (https only). */
  instagramUrl?: string;
  websiteUrl?: string;
}
