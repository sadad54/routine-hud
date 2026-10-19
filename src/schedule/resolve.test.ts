import { describe, expect, it, afterEach } from 'vitest';
import { Settings } from 'luxon';
import { checklistPrayers, reflowRun, resolveDay } from './resolve';
import { computeNow } from './now';
import { atTime, dateKey, fmtTime, parseNowParam } from './time';
import type { PrayerDay, ResolvedBlock } from './types';

// 2026-10-19 is a Monday.
const WEEK = {
  mon: '2026-10-19',
  tue: '2026-10-20',
  wed: '2026-10-21',
  thu: '2026-10-22',
  fri: '2026-10-23',
  sat: '2026-10-24',
  sun: '2026-10-25',
};

const times = (blocks: ResolvedBlock[]) =>
  blocks.map((b) => `${b.id} ${fmtTime(b.start)}-${fmtTime(b.end)}`);

const resolver = (date: string) => resolveDay(date).blocks;

function expectContiguous(blocks: ResolvedBlock[]) {
  for (let i = 1; i < blocks.length; i++) {
    expect(blocks[i]!.start, `${blocks[i - 1]!.id} -> ${blocks[i]!.id}`).toBe(blocks[i - 1]!.end);
  }
}

describe('resolver — fixed times', () => {
  it.each([
    ['mon', 'career_jobs'],
    ['tue', 'career_scholarship'],
    ['wed', 'career_jobs'],
    ['thu', 'career_scholarship'],
    ['sat', 'career_scholarship'],
  ] as const)('%s uses the standard template with %s', (day, career) => {
    const { blocks, conflicts } = resolveDay(WEEK[day]);
    expect(conflicts).toEqual([]);
    expect(blocks.map((b) => b.id)).toEqual([
      'tahajjud', 'fajr', 'dw1', 'breakfast', 'career', 'lunch', 'zuhr', 'qailulah', 'buffer1',
      'dw2', 'asr', 'research', 'exercise', 'maghrib', 'dinner', 'isha', 'review', 'winddown', 'sleep',
    ]);
    expect(blocks.find((b) => b.id === 'career')!.category).toBe(career);
    expectContiguous(blocks);
    expect(fmtTime(blocks[0]!.start)).toBe('05:30');
  });

  it('standard day has the exact fixed times from schedule.json', () => {
    expect(times(resolveDay(WEEK.mon).blocks)).toEqual([
      'tahajjud 05:30-05:50', 'fajr 05:50-06:30', 'dw1 06:30-09:30', 'breakfast 09:30-10:00',
      'career 10:00-12:00', 'lunch 12:00-13:05', 'zuhr 13:05-13:30', 'qailulah 13:30-13:50',
      'buffer1 13:50-14:00', 'dw2 14:00-16:20', 'asr 16:20-16:45', 'research 16:45-17:45',
      'exercise 17:45-19:10', 'maghrib 19:10-19:30', 'dinner 19:30-20:20', 'isha 20:20-20:35',
      'review 20:35-21:30', 'winddown 21:30-22:00', 'sleep 22:00-05:30',
    ]);
  });

  it('friday template: short lunch, fixed Jumu’ah, no qailulah', () => {
    const { blocks, conflicts } = resolveDay(WEEK.fri);
    expect(conflicts).toEqual([]);
    expectContiguous(blocks);
    const t = times(blocks);
    expect(t).toContain('lunch 12:00-12:40');
    expect(t).toContain('jumuah 12:45-13:45');
    expect(t).toContain('buffer1 13:45-14:00');
    expect(blocks.find((b) => b.id === 'zuhr')).toBeUndefined();
    expect(blocks.find((b) => b.id === 'qailulah')).toBeUndefined();
    const jumuah = blocks.find((b) => b.id === 'jumuah')!;
    expect(jumuah.anchored).toBe(false);
    expect(jumuah.prayer).toBe('jumuah');
    expect(blocks.find((b) => b.id === 'career')!.category).toBe('career_jobs');
    expect(checklistPrayers(blocks)).toEqual(['fajr', 'jumuah', 'asr', 'maghrib', 'isha']);
  });

  it('sunday template: rest day with weekly review and free time', () => {
    const { blocks } = resolveDay(WEEK.sun);
    expectContiguous(blocks);
    const ids = blocks.map((b) => b.id);
    for (const gone of ['dw1', 'career', 'dw2', 'research', 'review']) expect(ids).not.toContain(gone);
    expect(times(blocks)).toContain('weekly_review 10:00-10:30');
    const free = blocks.filter((b) => b.title === 'Free time');
    expect(free.length).toBeGreaterThanOrEqual(4);
    expect(free.every((b) => !b.checkIn)).toBe(true);
    expect(blocks.filter((b) => b.checkIn).map((b) => b.id)).toEqual(['weekly_review', 'exercise', 'winddown']);
    expect(checklistPrayers(blocks)).toEqual(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']);
  });

  it('reused block ids line up across templates', () => {
    const std = new Set(resolveDay(WEEK.mon).blocks.map((b) => b.id));
    for (const d of [WEEK.fri, WEEK.sun]) {
      for (const id of ['tahajjud', 'fajr', 'breakfast', 'lunch', 'asr', 'exercise', 'maghrib', 'isha', 'winddown', 'sleep']) {
        expect(std.has(id)).toBe(true);
        expect(resolveDay(d).blocks.some((b) => b.id === id)).toBe(true);
      }
    }
  });

  it('only work blocks get end-of-block check-ins', () => {
    const checkIns = resolveDay(WEEK.mon).blocks.filter((b) => b.checkIn).map((b) => b.id);
    expect(checkIns).toEqual(['dw1', 'career', 'dw2', 'research', 'exercise', 'review', 'winddown']);
  });
});

describe('overnight sleep and midnight rollover', () => {
  it('sleep spans 22:00 to 05:30 on the next date', () => {
    const sleep = resolveDay(WEEK.mon).blocks.find((b) => b.id === 'sleep')!;
    expect(sleep.start).toBe(atTime(WEEK.mon, '22:00'));
    expect(sleep.end).toBe(atTime(WEEK.tue, '05:30'));
    expect(sleep.overnight).toBe(true);
    expect(sleep.checkIn).toBe(false);
  });

  it('at 01:00 the current block is the previous night’s sleep', () => {
    const now = parseNowParam('2026-10-20T01:00')!;
    const s = computeNow(now, resolver);
    expect(s.today).toBe(WEEK.tue);
    expect(s.current.key).toBe(`${WEEK.mon}:sleep`);
    expect(s.next.key).toBe(`${WEEK.tue}:tahajjud`);
    expect(s.remainingMs).toBe(4.5 * 3600_000);
  });

  it('rolls over at 00:00 KL without changing the current block', () => {
    const before = computeNow(parseNowParam('2026-10-19T23:59:59')!, resolver);
    const after = computeNow(parseNowParam('2026-10-20T00:00:00')!, resolver);
    expect(before.today).toBe(WEEK.mon);
    expect(after.today).toBe(WEEK.tue);
    expect(before.current.key).toBe(after.current.key);
    expect(after.remainingMs).toBe(before.remainingMs - 1000);
  });

  it('sunday night sleep leads into monday', () => {
    const s = computeNow(parseNowParam('2026-10-25T23:00')!, resolver);
    expect(s.current.key).toBe(`${WEEK.sun}:sleep`);
    expect(s.next.key).toBe('2026-10-26:tahajjud');
  });
});

describe('computeNow', () => {
  it('?now=2026-10-23T12:50 (Friday) shows Jumu’ah', () => {
    const s = computeNow(parseNowParam('2026-10-23T12:50')!, resolver);
    expect(s.current.id).toBe('jumuah');
    expect(s.next.id).toBe('buffer1');
    expect(s.remainingMs).toBe(55 * 60_000);
  });

  it.each([
    ['2026-10-19T05:30', 'tahajjud'],
    ['2026-10-19T06:29:59', 'fajr'],
    ['2026-10-19T06:30', 'dw1'],
    ['2026-10-19T11:59', 'career'],
    ['2026-10-19T16:20', 'asr'],
    ['2026-10-19T21:45', 'winddown'],
    ['2026-10-19T22:00', 'sleep'],
    ['2026-10-25T07:00', 'free_morning'],
  ])('%s -> %s', (iso, id) => {
    expect(computeNow(parseNowParam(iso)!, resolver).current.id).toBe(id);
  });

  it('derives remaining time from the wall clock only', () => {
    const t = parseNowParam('2026-10-19T07:00')!;
    const a = computeNow(t, resolver);
    const b = computeNow(t + 37_000, resolver); // a "missed" tick self-corrects
    expect(a.remainingMs - b.remainingMs).toBe(37_000);
  });

  it('sprint sub-countdown inside deep work', () => {
    const s1 = computeNow(parseNowParam('2026-10-19T07:00')!, resolver);
    expect(s1.sprint).toMatchObject({ kind: 'sprint', sprintNumber: 1, sprintCount: 2 });
    expect(s1.sprint!.remainingMs).toBe(55 * 60_000);
    const br = computeNow(parseNowParam('2026-10-19T08:00')!, resolver);
    expect(br.sprint).toMatchObject({ kind: 'break' });
    const s2 = computeNow(parseNowParam('2026-10-19T08:10')!, resolver);
    expect(s2.sprint).toMatchObject({ kind: 'sprint', sprintNumber: 2 });
  });
});

describe('timezone independence', () => {
  const original = Settings.defaultZone;
  afterEach(() => {
    Settings.defaultZone = original;
  });

  it.each(['America/New_York', 'Europe/London', 'Pacific/Auckland', 'UTC'])(
    'device zone %s does not move any block',
    (zone) => {
      const reference = times(resolveDay(WEEK.mon).blocks);
      const refStarts = resolveDay(WEEK.mon).blocks.map((b) => b.start);
      Settings.defaultZone = zone;
      expect(times(resolveDay(WEEK.mon).blocks)).toEqual(reference);
      expect(resolveDay(WEEK.mon).blocks.map((b) => b.start)).toEqual(refStarts);
      expect(dateKey(parseNowParam('2026-10-20T00:30')!)).toBe(WEEK.tue);
    },
  );

  it('parses ?now with or without an offset', () => {
    expect(parseNowParam('2026-10-23T12:50')).toBe(Date.parse('2026-10-23T12:50:00+08:00'));
    expect(parseNowParam('2026-10-23T04:50Z')).toBe(Date.parse('2026-10-23T12:50:00+08:00'));
    expect(parseNowParam('nonsense')).toBeNull();
  });
});

describe('prayer anchoring and flex reflow (Phase 4)', () => {
  const base: PrayerDay = { fajr: '05:50', dhuhr: '13:05', asr: '16:20', maghrib: '19:10', isha: '20:20' };

  it('with prayer times equal to the fallbacks nothing moves', () => {
    const r = resolveDay(WEEK.mon, { prayerTimes: base });
    expect(r.usedPrayerTimes).toBe(true);
    expect(times(r.blocks)).toEqual(times(resolveDay(WEEK.mon).blocks));
  });

  it('Zuhr at 12:55: lunch shrinks, qailulah stretches to meet it', () => {
    const r = resolveDay(WEEK.mon, { prayerTimes: { ...base, dhuhr: '12:55' } });
    const t = times(r.blocks);
    expect(t).toContain('lunch 12:00-12:55');
    expect(t).toContain('zuhr 12:55-13:20');
    expect(t).toContain('qailulah 13:20-13:50');
    expect(t).toContain('buffer1 13:50-14:00');
    expect(t).toContain('dw2 14:00-16:20');
    expect(r.conflicts).toEqual([]);
    expectContiguous(r.blocks);
  });

  it('Zuhr at 13:20: lunch stretches, qailulah keeps its 10-min floor', () => {
    const r = resolveDay(WEEK.mon, { prayerTimes: { ...base, dhuhr: '13:20' } });
    const t = times(r.blocks);
    expect(t).toContain('lunch 12:00-13:20');
    expect(t).toContain('zuhr 13:20-13:45');
    expect(t).toContain('qailulah 13:45-13:55');
    expect(t).toContain('buffer1 13:55-14:00');
    expect(t).toContain('dw2 14:00-16:20');
    expect(r.conflicts).toEqual([]);
    expectContiguous(r.blocks);
  });

  it('flex blocks stretch to meet a later Fajr, Asr, Maghrib and Isha', () => {
    const r = resolveDay(WEEK.mon, {
      prayerTimes: { fajr: '06:02', dhuhr: '13:10', asr: '16:31', maghrib: '19:18', isha: '20:31' },
    });
    const t = times(r.blocks);
    expect(t).toContain('tahajjud 05:30-06:02');
    expect(t).toContain('fajr 06:02-06:30');
    expect(t).toContain('dw2 14:00-16:31');
    expect(t).toContain('asr 16:31-16:56');
    expect(t).toContain('research 16:56-17:45');
    expect(t).toContain('exercise 17:45-19:18');
    expect(t).toContain('isha 20:31-20:46');
    expect(t).toContain('review 20:46-21:30');
    expectContiguous(r.blocks);
  });

  it('minMin floor: an infeasible run keeps minMin and logs a conflict', () => {
    // Zuhr at 12:30 leaves lunch 30 min but it needs 45.
    const r = resolveDay(WEEK.mon, { prayerTimes: { ...base, dhuhr: '12:30' } });
    const lunch = r.blocks.find((b) => b.id === 'lunch')!;
    expect(lunch.plannedEnd - lunch.start).toBe(45 * 60_000); // kept its floor
    expect(fmtTime(lunch.end)).toBe('12:30'); // the anchored prayer wins on the HUD
    expect(r.conflicts.length).toBeGreaterThan(0);
    expect(r.conflicts.join(' ')).toMatch(/lunch/);
  });

  it('a late Zuhr pushes the transition but never squeezes qailulah below 10 min', () => {
    const r = resolveDay(WEEK.mon, { prayerTimes: { ...base, dhuhr: '13:30' } });
    const t = times(r.blocks);
    expect(t).toContain('zuhr 13:30-13:55');
    expect(t).toContain('qailulah 13:55-14:05');
    expect(t).toContain('dw2 14:05-16:20');
  });

  it('reflowRun keeps interior boundaries when there is room', () => {
    expect(reflowRun(0, 100, [10, 50, 90], [10, 10])).toEqual({ bounds: [0, 50, 100], conflict: false });
    expect(reflowRun(0, 100, [0, 95, 100], [10, 20])).toEqual({ bounds: [0, 80, 100], conflict: false });
    expect(reflowRun(0, 25, [0, 10, 20], [10, 20])).toEqual({ bounds: [0, 10, 30], conflict: true });
  });

  it('missing prayer times fall back to fixed starts', () => {
    const r = resolveDay(WEEK.mon, { prayerTimes: null });
    expect(r.usedPrayerTimes).toBe(false);
    expect(times(r.blocks)).toContain('zuhr 13:05-13:30');
  });
});
