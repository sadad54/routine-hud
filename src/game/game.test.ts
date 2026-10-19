import { describe, expect, it } from 'vitest';
import { resolveDay } from '../schedule/resolve';
import { memoResolver } from '../schedule/now';
import { addDays, parseNowParam } from '../schedule/time';
import { buildCheckIn, isEditable, pendingCheckIns } from './checkin';
import { evaluateDay } from './days';
import { computeStreak } from './streaks';
import { weekProgress, recentWeeks, DEFAULT_TARGETS } from './quests';
import { makeDayEvaluator, summarize, totalXpOf } from './summary';
import { levelFor, levelThreshold, xpForCheckIn } from './xp';
import type { CheckIn, CheckInStatus, DayRecord, GameData, PrayerCheck } from './types';
import { generateSeed } from '../dev/seed';

const resolve = memoResolver((d: string) => resolveDay(d).blocks);
const MON = '2026-10-19';
const TS = '2026-10-19T12:00:00.000+08:00';

function ci(date: string, blockId: string, status: CheckInStatus, count?: number): CheckIn {
  const block = resolve(date).find((b) => b.id === blockId);
  if (!block) throw new Error(`${blockId} not on ${date}`);
  return buildCheckIn(block, { status, count }, TS);
}

function allPrayers(date: string, prayed = true): PrayerCheck[] {
  const names = date === '2026-10-23' || new Date(`${date}T00:00:00Z`).getUTCDay() === 5
    ? ['fajr', 'jumuah', 'asr', 'maghrib', 'isha']
    : ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
  return names.map((p) => ({ id: `${date}:${p}`, date, prayer: p as PrayerCheck['prayer'], prayed }));
}

/** A day where every check-in is done. */
function fullDay(date: string, status: CheckInStatus = 'done'): CheckIn[] {
  return resolve(date)
    .filter((b) => b.checkIn && b.date === date)
    .map((b) => ci(date, b.id, status, b.category.startsWith('career') ? 2 : undefined));
}

/** A minimum viable day: prayers + 1 deep work + 1 outreach + exercise, rest skipped. */
function mvdDay(date: string): CheckIn[] {
  return [ci(date, 'dw1', 'partial'), ci(date, 'career', 'done', 1), ci(date, 'exercise', 'partial'), ci(date, 'review', 'skipped')];
}

function dayRecords(data: Omit<GameData, 'days'>): DayRecord[] {
  const dates = [...new Set([...data.checkIns.map((c) => c.date), ...data.prayers.map((p) => p.date)])];
  return dates.map((date) => {
    const ev = evaluateDay(date, resolve(date), data.checkIns, data.prayers);
    return { date, badDayMode: false, dayType: ev.dayType, bonusXp: ev.bonusXp };
  });
}

describe('XP', () => {
  it('uses the category table; partial is 50%, skipped 0', () => {
    expect(xpForCheckIn('deep_work', 'done', 180)).toBe(60); // 20 per scheduled hour
    expect(xpForCheckIn('deep_work', 'partial', 140)).toBe(23); // 46.67 / 2 → 23
    expect(xpForCheckIn('career_jobs', 'done', 120)).toBe(40);
    expect(xpForCheckIn('career_scholarship', 'partial', 120)).toBe(20);
    expect(xpForCheckIn('research', 'done', 60)).toBe(25);
    expect(xpForCheckIn('exercise', 'done', 85)).toBe(30);
    expect(xpForCheckIn('review', 'done', 55)).toBe(10);
    expect(xpForCheckIn('wind_down', 'done', 30)).toBe(15);
    expect(xpForCheckIn('meal', 'done', 30)).toBe(0);
    expect(xpForCheckIn('exercise', 'skipped', 85)).toBe(0);
  });

  it('a perfect standard day totals check-ins + daily bonus', () => {
    const checkIns = fullDay(MON);
    // dw1 60 + career 40 + dw2 (140 min) 47 + research 25 + exercise 30 + review 10 + wind_down 15
    expect(checkIns.reduce((s, c) => s + c.xpAwarded, 0)).toBe(227);
    const data: GameData = { checkIns, prayers: [], days: [] };
    data.days = dayRecords(data);
    expect(data.days[0]!.bonusXp).toBe(50);
    expect(totalXpOf(data, { prayerXp: false, targets: DEFAULT_TARGETS })).toBe(277);
  });

  it('daily bonus needs every scheduled check-in Done or Partial', () => {
    const checkIns = fullDay(MON, 'partial');
    expect(evaluateDay(MON, resolve(MON), checkIns, []).bonusXp).toBe(50);
    checkIns[0] = ci(MON, 'dw1', 'skipped');
    expect(evaluateDay(MON, resolve(MON), checkIns, []).bonusXp).toBe(0);
    expect(evaluateDay(MON, resolve(MON), checkIns.slice(1), []).bonusXp).toBe(0); // unanswered
  });

  it('prayer XP only when enabled', () => {
    const data: GameData = { checkIns: [], prayers: allPrayers(MON), days: [] };
    expect(totalXpOf(data, { prayerXp: false, targets: DEFAULT_TARGETS })).toBe(0);
    expect(totalXpOf(data, { prayerXp: true, targets: DEFAULT_TARGETS })).toBe(50);
  });

  it('stored xpAwarded is not rewritten by later rule changes', () => {
    const c = { ...ci(MON, 'career', 'done', 1), xpAwarded: 999 };
    expect(totalXpOf({ checkIns: [c], prayers: [], days: [] }, { prayerXp: false, targets: DEFAULT_TARGETS })).toBe(999);
  });
});

describe('levels', () => {
  it('level n needs round(100 × n^1.5) total XP', () => {
    expect([1, 2, 3, 4, 5, 10].map(levelThreshold)).toEqual([100, 283, 520, 800, 1118, 3162]);
  });
  it('level boundaries', () => {
    expect(levelFor(0).level).toBe(0);
    expect(levelFor(99).level).toBe(0);
    expect(levelFor(100).level).toBe(1);
    expect(levelFor(282).level).toBe(1);
    expect(levelFor(283).level).toBe(2);
    expect(levelFor(3162).level).toBe(10);
    const l = levelFor(191);
    expect(l.floor).toBe(100);
    expect(l.nextAt).toBe(283);
    expect(l.progress).toBeCloseTo(91 / 183);
  });
});

describe('Minimum viable day', () => {
  it('detects an MVD', () => {
    const ev = evaluateDay(MON, resolve(MON), mvdDay(MON), allPrayers(MON));
    expect(ev.checklist).toMatchObject({ allPrayers: true, deepWork: true, outreach: true, exercise: true });
    expect(ev.mvd).toBe(true);
    expect(ev.dayType).toBe('mvd');
    expect(ev.bonusXp).toBe(0);
  });

  it.each([
    ['a missed prayer', (c: CheckIn[], p: PrayerCheck[]) => [c, p.map((x, i) => (i === 2 ? { ...x, prayed: false } : x))]],
    ['no deep work', (c: CheckIn[], p: PrayerCheck[]) => [c.map((x) => (x.blockId === 'dw1' ? { ...x, status: 'skipped' } : x)), p]],
    ['zero outreach count', (c: CheckIn[], p: PrayerCheck[]) => [c.map((x) => (x.blockId === 'career' ? { ...x, count: 0 } : x)), p]],
    ['exercise skipped', (c: CheckIn[], p: PrayerCheck[]) => [c.map((x) => (x.blockId === 'exercise' ? { ...x, status: 'skipped' } : x)), p]],
  ] as const)('is not an MVD with %s', (_label, mutate) => {
    const [c, p] = mutate(mvdDay(MON), allPrayers(MON)) as [CheckIn[], PrayerCheck[]];
    expect(evaluateDay(MON, resolve(MON), c, p).mvd).toBe(false);
  });

  it('a full day outranks an MVD', () => {
    expect(evaluateDay(MON, resolve(MON), fullDay(MON), allPrayers(MON)).dayType).toBe('full');
  });
});

describe('streaks', () => {
  function streakOf(name: Parameters<typeof computeStreak>[0], data: GameData, today: string) {
    const first = [...data.checkIns, ...data.prayers].map((x) => x.date).sort()[0] ?? null;
    return computeStreak(name, today, first, makeDayEvaluator(data, resolve));
  }

  const days = (n: number) => Array.from({ length: n }, (_, i) => addDays(MON, i));

  it('wake: continues with Fajr prayed, breaks without', () => {
    const prayers = days(5).flatMap((d) => allPrayers(d).filter((p) => p.prayer === 'fajr'));
    const data: GameData = { checkIns: [], prayers, days: [] };
    expect(streakOf('wake', data, addDays(MON, 4)).current).toBe(5);
    prayers[2]!.prayed = false;
    expect(streakOf('wake', data, addDays(MON, 4))).toMatchObject({ current: 2, best: 2 });
  });

  it('today in progress does not break a streak', () => {
    const prayers = days(3).flatMap((d) => allPrayers(d).filter((p) => p.prayer === 'fajr'));
    const data: GameData = { checkIns: [], prayers, days: [] };
    expect(streakOf('wake', data, addDays(MON, 3))).toMatchObject({ current: 3, todayCounted: false });
  });

  it('exercise: Done or Partial continues, Sunday counts, skip breaks', () => {
    const d = days(7); // Mon..Sun
    const checkIns = d.map((date, i) => ci(date, 'exercise', i % 2 ? 'partial' : 'done'));
    const data: GameData = { checkIns, prayers: [], days: [] };
    expect(streakOf('exercise', data, d[6]!).current).toBe(7);
    checkIns[3] = ci(d[3]!, 'exercise', 'skipped');
    expect(streakOf('exercise', data, d[6]!)).toMatchObject({ current: 3, best: 3 });
  });

  it('sleep: Wind Down Done continues; Partial alone breaks', () => {
    const d = days(4);
    const checkIns = d.map((date) => ci(date, 'winddown', 'done'));
    checkIns[1] = ci(d[1]!, 'winddown', 'partial');
    const data: GameData = { checkIns, prayers: [], days: [] };
    expect(streakOf('sleep', data, d[3]!)).toMatchObject({ current: 2, best: 2 });
  });

  it('full day: Full or MVD days continue; anything else breaks', () => {
    const d = days(3); // Mon, Tue, Wed
    const checkIns = [...fullDay(d[0]!), ...mvdDay(d[1]!), ...fullDay(d[2]!)];
    const prayers = d.flatMap((x) => allPrayers(x));
    const data: GameData = { checkIns, prayers, days: [] };
    expect(streakOf('fullDay', data, d[2]!).current).toBe(3);
    const broken: GameData = { checkIns: [...fullDay(d[0]!), ...fullDay(d[2]!)], prayers, days: [] };
    expect(streakOf('fullDay', broken, d[2]!)).toMatchObject({ current: 1, best: 1 });
  });

  it('an MVD keeps wake and sleep alive but not a skipped exercise', () => {
    const d = days(3);
    // Day 2 is an MVD where Fajr counts (all prayers) but Wind Down is skipped.
    const checkIns = [
      ci(d[0]!, 'winddown', 'done'), ci(d[0]!, 'exercise', 'done'),
      ...mvdDay(d[1]!), ci(d[1]!, 'winddown', 'skipped'),
      ci(d[2]!, 'winddown', 'done'), ci(d[2]!, 'exercise', 'done'),
    ];
    const prayers = d.flatMap((x) => allPrayers(x));
    const data: GameData = { checkIns, prayers, days: [] };
    expect(streakOf('sleep', data, d[2]!).current).toBe(3);
    expect(streakOf('wake', data, d[2]!).current).toBe(3);
    expect(streakOf('exercise', data, d[2]!).current).toBe(3); // MVD had exercise partial
    // Without exercise the day isn't an MVD at all, and exercise breaks.
    const noEx = checkIns.map((c) => (c.date === d[1] && c.blockId === 'exercise' ? { ...c, status: 'skipped' as const } : c));
    expect(streakOf('exercise', { ...data, checkIns: noEx }, d[2]!).current).toBe(1);
  });
});

describe('weekly quests', () => {
  it('sums the four numbers and awards 100 XP per completed quest', () => {
    const week = Array.from({ length: 6 }, (_, i) => addDays(MON, i)); // Mon..Sat
    const checkIns = week.flatMap((d) => fullDay(d));
    const p = weekProgress(MON, checkIns, DEFAULT_TARGETS);
    // career_jobs Mon/Wed/Fri ×2 = 6; scholarship Tue/Thu/Sat ×2 = 6
    expect(p.applications).toBe(6);
    expect(p.supervisorEmails).toBe(6);
    expect(p.exerciseDays).toBe(6);
    // Mon–Thu & Sat: 3 + 2.33 + 1 h; Fri the same → 6.33 h × 6 days = 38 h
    expect(p.deepWorkHours).toBeCloseTo(38, 0);
    expect(p.completed.sort()).toEqual(['deepWorkHours', 'exerciseDays', 'supervisorEmails']);
    expect(p.xp).toBe(300);
    expect(p.allMet).toBe(false);
  });

  it('resets on Monday 00:00 KL', () => {
    const sun = '2026-10-25';
    const nextMon = '2026-10-26';
    const checkIns = [ci(sun, 'exercise', 'done'), ci(nextMon, 'exercise', 'done')];
    expect(weekProgress(MON, checkIns, DEFAULT_TARGETS).exerciseDays).toBe(1);
    expect(weekProgress(nextMon, checkIns, DEFAULT_TARGETS).exerciseDays).toBe(1);
    const sundayNight = summarize({ checkIns, prayers: [], days: [] }, {
      today: sun, resolve, prayerXp: false, targets: DEFAULT_TARGETS,
    });
    expect(sundayNight.week.weekStart).toBe(MON);
    const mondayMorning = summarize({ checkIns, prayers: [], days: [] }, {
      today: nextMon, resolve, prayerXp: false, targets: DEFAULT_TARGETS,
    });
    expect(mondayMorning.week.weekStart).toBe(nextMon);
    expect(mondayMorning.week.exerciseDays).toBe(1);
  });

  it('recent weeks are Mondays, oldest first', () => {
    expect(recentWeeks('2026-10-21', 3)).toEqual(['2026-10-05', '2026-10-12', '2026-10-19']);
  });
});

describe('check-ins', () => {
  it('stay editable until the end of the next day', () => {
    expect(isEditable(MON, parseNowParam('2026-10-20T23:59:59')!)).toBe(true);
    expect(isEditable(MON, parseNowParam('2026-10-21T00:00')!)).toBe(false);
  });

  it('career count is stored; other blocks have none', () => {
    expect(ci(MON, 'career', 'done', 3).count).toBe(3);
    expect(ci(MON, 'dw1', 'done').count).toBeUndefined();
  });

  it('queue: ended, unanswered, editable blocks oldest first', () => {
    const now = parseNowParam('2026-10-19T14:30')!;
    const blocks = [...resolve('2026-10-18'), ...resolve(MON)];
    const queue = pendingCheckIns(blocks, [ci(MON, 'dw1', 'done')], now);
    expect(queue.map((b) => b.key)).toEqual([
      '2026-10-18:weekly_review', '2026-10-18:exercise', '2026-10-18:winddown', '2026-10-19:career',
    ]);
  });
});

describe('summary, achievements and seed', () => {
  it('3-week seed produces sane stats', () => {
    const today = '2026-10-20';
    const data = generateSeed(today, 21, 7);
    expect(new Set(data.checkIns.map((c) => c.date)).size).toBeGreaterThanOrEqual(20);
    const s = summarize(data, { today, resolve, prayerXp: false, targets: DEFAULT_TARGETS });
    expect(s.totalXp).toBeGreaterThan(1000);
    expect(s.level.level).toBeGreaterThanOrEqual(4);
    expect(s.eligibleAchievements).toContain('first_checkin');
    expect(s.totals.applications).toBeGreaterThan(0);
  });

  it('achievements fire from config rules', () => {
    const data: GameData = { checkIns: fullDay(MON), prayers: allPrayers(MON), days: [] };
    data.days = dayRecords(data);
    const s = summarize(data, { today: MON, resolve, prayerXp: false, targets: DEFAULT_TARGETS });
    expect(s.eligibleAchievements).toEqual(expect.arrayContaining(['first_checkin', 'first_full_day']));
    expect(s.eligibleAchievements).not.toContain('wake_7');
  });
});
