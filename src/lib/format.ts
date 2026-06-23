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

/** "2026-06-24" -> "Tue 24" (compact label for a date chip). */
export function formatDayChip(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const weekday = WEEKDAYS[new Date(y, m - 1, d).getDay()];
  return `${weekday} ${d}`;
}

/** ISO dates for the next `count` days starting today (local time). */
export function upcomingIsoDates(count: number): string[] {
  const base = new Date();
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    out.push(`${y}-${m}-${day}`);
  }
  return out;
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
