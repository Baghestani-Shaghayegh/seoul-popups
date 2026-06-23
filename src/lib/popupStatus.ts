import { todayIso } from './format';
import type { Popup } from '@/types/popup';

/** True if `popup` is running on `dateIso` (inclusive of start/end). */
export function isActiveOn(popup: Popup, dateIso: string): boolean {
  return popup.startDate <= dateIso && popup.endDate >= dateIso;
}

/** True if `popup` is running today. */
export function isActiveToday(popup: Popup): boolean {
  return isActiveOn(popup, todayIso());
}

/** Whole days from `fromIso` until the popup ends (0 = ends today, negative = ended). */
export function daysUntilEnd(
  popup: Popup,
  fromIso: string = todayIso(),
): number {
  const ms = Date.parse(popup.endDate) - Date.parse(fromIso);
  return Math.round(ms / 86_400_000);
}

/** Short urgency label, e.g. "Last day", "Ends tomorrow", "5 days left". */
export function endingLabel(popup: Popup): string {
  const days = daysUntilEnd(popup);
  if (days <= 0) return 'Last day';
  if (days === 1) return 'Ends tomorrow';
  return `${days} days left`;
}

/** True if the popup hasn't started yet. */
export function isUpcoming(
  popup: Popup,
  fromIso: string = todayIso(),
): boolean {
  return popup.startDate > fromIso;
}

/** True if the popup is running and ends within `days`. */
export function isEndingSoon(popup: Popup, days = 7): boolean {
  const left = daysUntilEnd(popup);
  return isActiveToday(popup) && left >= 0 && left <= days;
}

/** True if the popup has already finished. */
export function isEnded(popup: Popup, fromIso: string = todayIso()): boolean {
  return popup.endDate < fromIso;
}

export type PopupStatus = 'open' | 'upcoming' | 'ended';

export const STATUS_OPTIONS: { key: PopupStatus; label: string }[] = [
  { key: 'open', label: 'Open now' },
  { key: 'upcoming', label: 'Coming soon' },
  { key: 'ended', label: 'Ended' },
];

/** Whether a popup matches a single status filter. */
export function matchesStatus(popup: Popup, status: PopupStatus): boolean {
  switch (status) {
    case 'open':
      return isActiveToday(popup);
    case 'upcoming':
      return isUpcoming(popup);
    case 'ended':
      return isEnded(popup);
  }
}
