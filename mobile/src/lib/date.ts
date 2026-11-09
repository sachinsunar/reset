export const APP_TIMEZONE = 'Asia/Kathmandu';

const KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** The calendar date for a given instant in the app timezone (not the device timezone). */
export function dateKeyInTz(date: Date = new Date(), timeZone: string = APP_TIMEZONE): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function todayKey(date: Date = new Date(), timeZone: string = APP_TIMEZONE): string {
  return dateKeyInTz(date, timeZone);
}

export function isValidDateKey(key: string): boolean {
  if (!KEY_RE.test(key)) return false;
  const d = new Date(`${key}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === key;
}

export function parseDateKey(key: string): Date {
  return new Date(`${key}T12:00:00Z`);
}

export function addDays(key: string, days: number): string {
  const d = parseDateKey(key);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function diffDays(from: string, to: string): number {
  return Math.round((parseDateKey(to).getTime() - parseDateKey(from).getTime()) / 86_400_000);
}

export function datesBetween(start: string, end: string): string[] {
  const out: string[] = [];
  let cursor = start;
  let guard = 0;
  while (cursor <= end && guard < 2000) {
    out.push(cursor);
    cursor = addDays(cursor, 1);
    guard++;
  }
  return out;
}

export function weekdayOfKey(key: string): number {
  return parseDateKey(key).getUTCDay();
}

export function startOfWeekKey(key: string, weekStartsOn = 1): string {
  const day = weekdayOfKey(key);
  const delta = (day - weekStartsOn + 7) % 7;
  return addDays(key, -delta);
}

export function endOfWeekKey(key: string, weekStartsOn = 1): string {
  return addDays(startOfWeekKey(key, weekStartsOn), 6);
}

export function startOfMonthKey(key: string): string {
  return `${key.slice(0, 7)}-01`;
}

export function endOfMonthKey(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0, 12)).toISOString().slice(0, 10);
}

export function monthGridRange(key: string): { start: string; end: string } {
  const start = startOfWeekKey(startOfMonthKey(key));
  const end = endOfWeekKey(endOfMonthKey(key));
  return { start, end };
}

export function tzTimeParts(date: Date = new Date(), timeZone: string = APP_TIMEZONE) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return { hour: get('hour') % 24, minute: get('minute') };
}

export function nowMinutesInTz(date: Date = new Date(), timeZone: string = APP_TIMEZONE): number {
  const { hour, minute } = tzTimeParts(date, timeZone);
  return hour * 60 + minute;
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function minutesToTime(minutes: number): string {
  const normalized = ((Math.round(minutes) % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatTime12h(time: string | null): string {
  if (!time) return '';
  const [rawH, rawM] = time.split(':').map(Number);
  const h = rawH % 24;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}:${String(rawM || 0).padStart(2, '0')} ${suffix}`;
}

export function formatDateKey(
  key: string,
  options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric' },
): string {
  return new Intl.DateTimeFormat('en-US', {
    ...options,
    timeZone: 'UTC',
  }).format(parseDateKey(key));
}

export function formatMonth(key: string): string {
  return formatDateKey(`${key.slice(0, 7)}-01`, { month: 'long', year: 'numeric' });
}

export function relativeDayLabel(key: string, today: string): string {
  const diff = diffDays(today, key);
  if (diff === 0) return 'Today';
  if (diff === -1) return 'Yesterday';
  if (diff === 1) return 'Tomorrow';
  return formatDateKey(key, { weekday: 'short', month: 'short', day: 'numeric' });
}

export function greetingFor(date: Date = new Date(), timeZone: string = APP_TIMEZONE): string {
  const hour = tzTimeParts(date, timeZone).hour;
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function formatDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return '0m';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatDurationLong(minutes: number): string {
  if (!minutes || minutes <= 0) return '0 minutes';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  const parts: string[] = [];
  if (h) parts.push(`${h} hour${h === 1 ? '' : 's'}`);
  if (m) parts.push(`${m} minute${m === 1 ? '' : 's'}`);
  return parts.join(' ');
}

export function formatMinutesClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function weekRangeLabel(today: string): string {
  const start = startOfWeekKey(today);
  const end = endOfWeekKey(today);
  const startLabel = formatDateKey(start, { month: 'short', day: 'numeric' });
  const endLabel = formatDateKey(end, { month: 'short', day: 'numeric' });
  return `${startLabel} – ${endLabel}`;
}

export function isTimeWithinQuietHours(time: string, quietStart: string, quietEnd: string): boolean {
  const t = timeToMinutes(time);
  const s = timeToMinutes(quietStart);
  const e = timeToMinutes(quietEnd);
  if (s === e) return false;
  if (s < e) return t >= s && t < e;
  return t >= s || t < e;
}

export function formatDateTimeLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: APP_TIMEZONE,
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
