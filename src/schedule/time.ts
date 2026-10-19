import { DateTime } from 'luxon';
import type { Weekday } from './types';

export const ZONE = 'Asia/Kuala_Lumpur';
export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY_MS = 24 * HOUR;

const WEEKDAYS: Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export function kl(ms: number): DateTime {
  return DateTime.fromMillis(ms, { zone: ZONE });
}

export function fromDate(date: string): DateTime {
  return DateTime.fromISO(date, { zone: ZONE }).startOf('day');
}

// Small caches: these run on every clock tick and for every block.
let dateKeyCache: { minute: number; key: string } | null = null;
const dayStartCache = new Map<string, number>();

/** 'YYYY-MM-DD' for the KL calendar day containing ms. */
export function dateKey(ms: number): string {
  const minute = Math.floor(ms / MINUTE);
  if (dateKeyCache?.minute === minute) return dateKeyCache.key;
  const key = kl(ms).toISODate() as string;
  dateKeyCache = { minute, key };
  return key;
}

/** Epoch ms of KL midnight for a date (Luxon, cached). */
export function startOfDayMs(date: string): number {
  let v = dayStartCache.get(date);
  if (v == null) {
    v = fromDate(date).toMillis();
    dayStartCache.set(date, v);
    if (dayStartCache.size > 512) dayStartCache.delete(dayStartCache.keys().next().value as string);
  }
  return v;
}

/**
 * Epoch ms for a KL wall-clock time on a date. Asia/Kuala_Lumpur has had a fixed
 * +08:00 offset with no DST since 1982, so wall-clock minutes add linearly to
 * the Luxon-computed midnight.
 */
export function atTime(date: string, hhmm: string, dayOffset = 0): number {
  const base = dayOffset ? startOfDayMs(addDays(date, dayOffset)) : startOfDayMs(date);
  return base + hhmmToMin(hhmm) * MINUTE;
}

// Calendar-date arithmetic on 'YYYY-MM-DD' strings is timezone-free, so plain
// UTC date math is exact here (and far cheaper than building zoned DateTimes).
function utcDate(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

export function addDays(date: string, n: number): string {
  if (n === 0) return date;
  const d = utcDate(date);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function weekdayOf(date: string): Weekday {
  return WEEKDAYS[(utcDate(date).getUTCDay() + 6) % 7] as Weekday;
}

/** Monday 'YYYY-MM-DD' of the KL week containing the date. */
export function weekStart(date: string): string {
  return addDays(date, -((utcDate(date).getUTCDay() + 6) % 7));
}

export function fmtTime(ms: number): string {
  return kl(ms).toFormat('HH:mm');
}

export function fmtTime12(ms: number): string {
  return kl(ms).toFormat('h:mm a');
}

/** ISO string with +08:00 offset. */
export function isoKL(ms: number): string {
  return kl(ms).toISO() as string;
}

/** Days between two date keys (b - a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((utcDate(b).getTime() - utcDate(a).getTime()) / DAY_MS);
}

/**
 * Parse a `?now=` value. Strings without an offset are read as KL wall-clock time.
 * Returns null when unparseable.
 */
export function parseNowParam(value: string | null | undefined): number | null {
  if (!value) return null;
  const hasOffset = /([zZ]|[+-]\d\d:?\d\d)$/.test(value);
  const dt = hasOffset
    ? DateTime.fromISO(value, { setZone: true })
    : DateTime.fromISO(value, { zone: ZONE });
  return dt.isValid ? dt.toMillis() : null;
}

/** Format a duration as MM:SS or H:MM:SS. */
export function fmtCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Minutes since midnight for 'HH:mm'. */
export function hhmmToMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}
