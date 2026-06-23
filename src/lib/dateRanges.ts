import { todayIso } from './format';

export interface DateRange {
  start: string;
  end: string;
}

export type DatePreset = 'anytime' | 'today' | 'weekend' | 'week';

export const DATE_PRESETS: { key: DatePreset; label: string }[] = [
  { key: 'anytime', label: 'All' },
  { key: 'today', label: 'Today' },
  { key: 'weekend', label: 'This weekend' },
  { key: 'week', label: 'This week' },
];

function iso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(base.getDate() + days);
  return d;
}

/**
 * Turn a preset into a concrete date range (inclusive), or null for "anytime".
 * A popup matches a range if its run overlaps it.
 */
export function presetToRange(preset: DatePreset): DateRange | null {
  if (preset === 'anytime') return null;

  const now = new Date();
  const today = todayIso();
  if (preset === 'today') return { start: today, end: today };

  const dow = now.getDay(); // 0 = Sun … 6 = Sat

  if (preset === 'week') {
    const daysToSunday = (7 - dow) % 7;
    return { start: today, end: iso(addDays(now, daysToSunday)) };
  }

  // weekend: this Sat–Sun, or the upcoming one on weekdays.
  if (dow === 6) return { start: today, end: iso(addDays(now, 1)) };
  if (dow === 0) return { start: today, end: today };
  const daysToSat = 6 - dow;
  return {
    start: iso(addDays(now, daysToSat)),
    end: iso(addDays(now, daysToSat + 1)),
  };
}
