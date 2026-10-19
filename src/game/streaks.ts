import { addDays } from '../schedule/time';
import type { DayEval } from './days';

export type StreakName = 'wake' | 'exercise' | 'fullDay' | 'sleep';
export const STREAKS: StreakName[] = ['wake', 'exercise', 'fullDay', 'sleep'];

export const STREAK_LABEL: Record<StreakName, string> = {
  wake: 'Wake',
  exercise: 'Exercise',
  fullDay: 'Full day',
  sleep: 'Sleep',
};

const good = (s: string | null) => s === 'done' || s === 'partial';

/**
 * Whether a day keeps a streak alive.
 * A Full day or Minimum viable day keeps every streak alive except exercise,
 * which needs exercise itself to be Done or Partial (FR6.2).
 */
export function dayKeeps(streak: StreakName, d: DayEval): boolean {
  const viable = d.dayType !== 'none';
  switch (streak) {
    case 'wake':
      return d.fajrPrayed || viable;
    case 'exercise':
      return good(d.exerciseStatus);
    case 'fullDay':
      return viable;
    case 'sleep':
      return d.windDownStatus === 'done' || viable;
  }
}

export interface StreakInfo {
  current: number;
  best: number;
  /** Today already counts toward `current`. */
  todayCounted: boolean;
}

/**
 * Streaks from evaluated days. `evalDay(date)` must work for any date.
 * Today never breaks a streak while it's still in progress: if today doesn't
 * qualify yet, the current streak counts back from yesterday.
 */
export function computeStreak(
  streak: StreakName,
  today: string,
  firstDate: string | null,
  evalDay: (date: string) => DayEval,
): StreakInfo {
  if (!firstDate || firstDate > today) return { current: 0, best: 0, todayCounted: false };
  // Best: scan forward from the first date.
  let best = 0;
  let run = 0;
  for (let d = firstDate; d <= today; d = addDays(d, 1)) {
    if (dayKeeps(streak, evalDay(d))) {
      run++;
      best = Math.max(best, run);
    } else if (d !== today) {
      run = 0;
    }
  }
  // Current: walk back from today (or yesterday if today isn't in yet).
  const todayCounted = dayKeeps(streak, evalDay(today));
  let current = 0;
  for (let d = todayCounted ? today : addDays(today, -1); d >= firstDate; d = addDays(d, -1)) {
    if (!dayKeeps(streak, evalDay(d))) break;
    current++;
  }
  return { current, best: Math.max(best, current), todayCounted };
}
