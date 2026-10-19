import { kl, ZONE } from '../schedule/time';

/** "1h 12m", "12m", "<1m". */
export function fmtDur(ms: number): string {
  const min = Math.round(ms / 60_000);
  if (min < 1) return '<1m';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? (m ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
}

/** "in 1h 12m", or "now". */
export function fmtIn(ms: number): string {
  return ms <= 30_000 ? 'now' : `in ${fmtDur(ms)}`;
}

/** Time-of-day greeting in KL. */
export function greeting(now: number): string {
  const h = kl(now).hour;
  if (h < 4) return 'Rest well';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Good night';
}

/** Islamic (Umm al-Qura) date, e.g. "9 Jumada I 1448". Empty if the runtime lacks the calendar. */
export function hijri(ms: number): string {
  try {
    const parts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { day: 'numeric', month: 'long', year: 'numeric', timeZone: ZONE }).formatToParts(ms);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
    return `${get('day')} ${get('month')} ${get('year')} AH`.trim();
  } catch {
    return '';
  }
}
