/** Small formatting helpers shared across screens. */

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "2026-06-22" -> "Jun 22" */
export function formatShortDate(iso: string): string {
  const [, m, d] = iso.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}`;
}

/** "2026-06-23" -> "Tue, Jun 23" */
export function formatWeekdayDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const weekday = WEEKDAYS[new Date(y, m - 1, d).getDay()];
  return `${weekday}, ${MONTHS[m - 1]} ${d}`;
}

/** "2026-06-01" + "2026-07-15" -> "Jun 1 – Jul 15" */
export function formatDateRange(startIso: string, endIso: string): string {
  return `${formatShortDate(startIso)} – ${formatShortDate(endIso)}`;
}

/** Today's date as an ISO YYYY-MM-DD string in local time. */
export function todayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ---------------------------------------------------------------------------
// Honest labels for fields that may legitimately be unknown.
//
// `subway_exit`, `subway_walk_minutes` and `hours` are nullable (migration
// 008): they used to be NOT NULL, which meant a row with no confirmed value
// got a guessed one — 5 of the first 9 pop-ups carry estimated exits and walk
// times as a result. These render absence as absence instead of inventing a
// number, so the ⭐ subway detail is trustworthy when it IS shown.
// ---------------------------------------------------------------------------

/** "Exit 3", or an honest prompt when the exit was never confirmed. */
export function formatExit(exit?: string): string {
  return exit ? `Exit ${exit}` : 'Exit — check map';
}

/** "6 min walk" / "~6 min from exit"-style value, or a dash when unknown. */
export function formatWalkMinutes(minutes?: number, suffix = 'min'): string {
  return typeof minutes === 'number' ? `${minutes} ${suffix}` : '—';
}

/** Opening hours, or a pointer to the official source when we don't have them. */
export function formatHours(hours?: string): string {
  return hours ?? 'Hours — check official page';
}
