import { describe, expect, it } from 'vitest';
import fixture from './__fixtures__/aladhan-2026-10.json';
import { calendarUrl, cleanTime, needsFetch, parseCalendar, prayerDayFrom } from './aladhan';
import { resolveDay } from '../schedule/resolve';
import { fmtTime } from '../schedule/time';

describe('Aladhan parsing', () => {
  it('builds the JAKIM calendarByCity URL', () => {
    expect(calendarUrl(2026, 10)).toBe(
      'https://api.aladhan.com/v1/calendarByCity/2026/10?city=Kuala+Lumpur&country=Malaysia&method=17',
    );
  });

  it('cleans "05:44 (+08)"', () => {
    expect(cleanTime('05:44 (+08)')).toBe('05:44');
    expect(cleanTime('5:04')).toBe('05:04');
    expect(cleanTime(undefined)).toBeNull();
  });

  it('parses a real October 2026 response', () => {
    const m = parseCalendar(fixture, '2026-10', '2026-10-20T04:00:00.000+08:00');
    expect(Object.keys(m.days)).toHaveLength(31);
    expect(m.days['2026-10-23']).toEqual({ fajr: '05:39', dhuhr: '12:58', asr: '16:17', maghrib: '18:58', isha: '20:08' });
  });

  it('rejects malformed responses', () => {
    expect(() => parseCalendar({ code: 200, data: [] }, '2026-10', 'x')).toThrow();
    expect(() => parseCalendar(null, '2026-10', 'x')).toThrow();
  });

  it('real times reflow the schedule with no gaps', () => {
    const m = parseCalendar(fixture, '2026-10', '2026-10-20T04:00:00.000+08:00');
    const date = '2026-10-21'; // Wednesday
    const r = resolveDay(date, { prayerTimes: prayerDayFrom({ '2026-10': m }, date) });
    expect(r.usedPrayerTimes).toBe(true);
    const zuhr = r.blocks.find((b) => b.id === 'zuhr')!;
    expect(fmtTime(zuhr.start)).toBe(m.days[date]!.dhuhr);
    for (let i = 1; i < r.blocks.length; i++) expect(r.blocks[i]!.start).toBe(r.blocks[i - 1]!.end);
  });
});

describe('cache policy', () => {
  const now = Date.parse('2026-10-20T12:00:00+08:00');
  const month = (fetchedAt: string) => ({ id: '2026-10', fetchedAt, days: {} });

  it('fetches when missing and online', () => {
    expect(needsFetch(undefined, now, true)).toBe(true);
    expect(needsFetch(undefined, now, false)).toBe(false);
  });
  it('refetches when older than 7 days', () => {
    expect(needsFetch(month('2026-10-15T12:00:00+08:00'), now, true)).toBe(false);
    expect(needsFetch(month('2026-10-12T12:00:00+08:00'), now, true)).toBe(true);
    expect(needsFetch(month('2026-10-12T12:00:00+08:00'), now, false)).toBe(false);
  });
});
