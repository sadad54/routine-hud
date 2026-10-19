/** Aladhan API parsing and cache policy. Pure — the network call lives in fetch.ts. */
import type { PrayerTimesMonth } from '../game/types';
import type { PrayerDay } from '../schedule/types';

/**
 * JAKIM (Jabatan Kemajuan Islam Malaysia). Verified against
 * https://api.aladhan.com/v1/methods on 2026-10-20: "JAKIM": { "id": 17 }.
 */
export const JAKIM_METHOD_ID = 17;
export const CACHE_MAX_AGE_DAYS = 7;

export function calendarUrl(year: number, month: number): string {
  const q = new URLSearchParams({ city: 'Kuala Lumpur', country: 'Malaysia', method: String(JAKIM_METHOD_ID) });
  return `https://api.aladhan.com/v1/calendarByCity/${year}/${month}?${q.toString()}`;
}

/** "05:44 (+08)" → "05:44" */
export function cleanTime(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const m = raw.match(/(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return `${m[1]!.padStart(2, '0')}:${m[2]}`;
}

interface AladhanDay {
  timings?: Record<string, string>;
  date?: { gregorian?: { date?: string } };
}

/** Parse a calendarByCity response into a PrayerTimesMonth. Throws on malformed data. */
export function parseCalendar(json: unknown, monthId: string, fetchedAt: string): PrayerTimesMonth {
  const data = (json as { code?: number; data?: AladhanDay[] })?.data;
  if (!Array.isArray(data) || data.length === 0) throw new Error('Aladhan: empty or malformed response');
  const days: PrayerTimesMonth['days'] = {};
  for (const d of data) {
    const g = d.date?.gregorian?.date; // DD-MM-YYYY
    const t = d.timings;
    if (!g || !t) continue;
    const [dd, mm, yyyy] = g.split('-');
    const key = `${yyyy}-${mm}-${dd}`;
    const fajr = cleanTime(t.Fajr);
    const dhuhr = cleanTime(t.Dhuhr);
    const asr = cleanTime(t.Asr);
    const maghrib = cleanTime(t.Maghrib);
    const isha = cleanTime(t.Isha);
    if (fajr && dhuhr && asr && maghrib && isha) days[key] = { fajr, dhuhr, asr, maghrib, isha };
  }
  if (Object.keys(days).length === 0) throw new Error('Aladhan: no usable days');
  return { id: monthId, fetchedAt, days };
}

/** Whether to (re)fetch a month: missing, or older than 7 days while online. */
export function needsFetch(cached: PrayerTimesMonth | undefined, now: number, online: boolean): boolean {
  if (!online) return false;
  if (!cached) return true;
  const age = now - Date.parse(cached.fetchedAt);
  return !(age >= 0 && age < CACHE_MAX_AGE_DAYS * 86_400_000);
}

export type PrayerSource = 'live' | 'cache' | 'fallback';

/** Today's times from cached months, or null → fixed fallback starts. */
export function prayerDayFrom(months: Record<string, PrayerTimesMonth | undefined>, date: string): PrayerDay | null {
  return months[date.slice(0, 7)]?.days[date] ?? null;
}
