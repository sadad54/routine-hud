import type { PrayerTimesMonth } from '../game/types';
import { calendarUrl, parseCalendar } from './aladhan';

/** Fetch one month of JAKIM prayer times. Throws on network or parse failure. */
export async function fetchMonth(monthId: string, fetchedAt: string, signal?: AbortSignal): Promise<PrayerTimesMonth> {
  const [y, m] = monthId.split('-').map(Number);
  const res = await fetch(calendarUrl(y!, m!), { signal });
  if (!res.ok) throw new Error(`Aladhan HTTP ${res.status}`);
  return parseCalendar(await res.json(), monthId, fetchedAt);
}
