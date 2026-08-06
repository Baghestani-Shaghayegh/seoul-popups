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
  /**
   * Exit number, e.g. "3". Undefined when nobody has confirmed it — the DB
   * dropped NOT NULL here precisely so a row can say "unknown" instead of
   * being given a plausible guess (migration 008).
   */
  exit?: string;
  /** Walking time from the exit in minutes. Undefined when unconfirmed. */
  walkMinutes?: number;
}

export interface Popup {
  id: string;
  name: string;
  /** One-line hook shown on cards. */
  tagline: string;
  description: string;
  neighborhood: Neighborhood;
  category: Category;
  /** Hero image URL. Undefined when we have no photo we're entitled to
   *  use (CONTENT.md §4) — the UI renders a branded card instead. */
  imageUrl?: string;

  /** Hand-picked Home hero. At most one pop-up has this (migration 020);
   *  when none does, Home falls back to the one ending soonest. */
  featured: boolean;

  /** ISO date strings (YYYY-MM-DD). */
  startDate: string;
  endDate: string;
  /** Human-readable opening hours, e.g. "11:00 – 20:00". Undefined if unknown. */
  hours?: string;

  subway: SubwayDirection;

  /** Map coordinates for the Map screen. */
  latitude: number;
  longitude: number;

  /** Whether in-app reservation is available. */
  reservable: boolean;

  /** Optional outbound links shown on the detail screen (https only). */
  instagramUrl?: string;
  websiteUrl?: string;
  /** External booking link opened by the Reserve button. */
  reservationUrl?: string;
}
