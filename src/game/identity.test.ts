import { describe, expect, it } from 'vitest';
import { resolveDay } from '../schedule/resolve';
import { memoResolver } from '../schedule/now';
import { buildCheckIn } from './checkin';
import { averagePillars, compoundSeries, dayPillars, rankFor, totalVotes } from './identity';
import type { CheckInStatus, DayType, PrayerCheck } from './types';

const resolve = memoResolver((d: string) => resolveDay(d).blocks);
const MON = '2026-10-19';
const TS = '2026-10-19T12:00:00.000+08:00';

function ci(date: string, blockId: string, status: CheckInStatus) {
  const block = resolve(date).find((b) => b.id === blockId)!;
  return buildCheckIn(block, { status }, TS);
}

describe('dayPillars', () => {
  it('starts every pillar empty except the love tick and prayers that are possible', () => {
    const s = dayPillars(MON, resolve(MON), [], [], undefined);
    expect(s.craft).toMatchObject({ earned: 0, possible: 4, votes: 0, score: 0 }); // dw1, dw2, research, review
    expect(s.deen.possible).toBe(5);
    expect(s.body.possible).toBe(2); // exercise, wind_down
    expect(s.wealth.possible).toBe(1);
    expect(s.love).toMatchObject({ possible: 1, earned: 0, score: 0 });
    expect(totalVotes(s)).toBe(0);
  });

  it('weights Done 1, Partial 0.5, Skipped 0 and counts votes', () => {
    const checkIns = [ci(MON, 'dw1', 'done'), ci(MON, 'dw2', 'partial'), ci(MON, 'research', 'skipped'), ci(MON, 'career', 'done')];
    const prayers: PrayerCheck[] = [
      { id: `${MON}:fajr`, date: MON, prayer: 'fajr', prayed: true },
      { id: `${MON}:asr`, date: MON, prayer: 'asr', prayed: false },
    ];
    const s = dayPillars(MON, resolve(MON), checkIns, prayers, { date: MON, badDayMode: false, dayType: 'none', bonusXp: 0, connected: true });
    expect(s.craft).toMatchObject({ earned: 1.5, votes: 2, score: 1.5 / 4 });
    expect(s.wealth.score).toBe(1);
    expect(s.deen).toMatchObject({ earned: 1, votes: 1, score: 1 / 5 });
    expect(s.love.score).toBe(1);
    expect(totalVotes(s)).toBe(5);
  });

  it('gives Sunday no wealth pillar (nothing scheduled)', () => {
    const sun = '2026-10-25';
    expect(dayPillars(sun, resolve(sun), [], [], undefined).wealth.score).toBeNull();
  });
});

describe('averagePillars', () => {
  it('skips days where the pillar had nothing scheduled', () => {
    const sun = '2026-10-25';
    const a = dayPillars(MON, resolve(MON), [ci(MON, 'career', 'done')], [], undefined);
    const b = dayPillars(sun, resolve(sun), [], [], undefined);
    expect(averagePillars([a, b]).wealth).toBe(1);
  });
});

describe('compoundSeries', () => {
  const types: Record<string, DayType> = { '2026-10-19': 'full', '2026-10-20': 'none', '2026-10-21': 'mvd', '2026-10-22': 'none' };
  it('multiplies 1.01 / 1.005 / 0.99 per day', () => {
    const s = compoundSeries('2026-10-19', '2026-10-21', (d) => types[d] ?? 'none');
    expect(s.map((x) => x.date)).toEqual(['2026-10-19', '2026-10-20', '2026-10-21']);
    expect(s.at(-1)!.value).toBeCloseTo(1.01 * 0.99 * 1.005, 10);
  });
  it('does not let an unfinished today pull it down', () => {
    const s = compoundSeries('2026-10-19', '2026-10-22', (d) => types[d] ?? 'none');
    expect(s.at(-1)!.date).toBe('2026-10-21');
  });
  it('is empty without data', () => {
    expect(compoundSeries(null, MON, () => 'none')).toEqual([]);
  });
});

describe('rankFor', () => {
  it('climbs the ladder toward the vision', () => {
    expect(rankFor(0)).toEqual({ title: 'Apprentice', next: { title: 'Junior', level: 3 } });
    expect(rankFor(10).title).toBe('Senior');
    expect(rankFor(45)).toEqual({ title: 'Fellow', next: null });
  });
});
