import { checklistPrayers } from '../schedule/resolve';
import type { PrayerName, ResolvedBlock } from '../schedule/types';
import type { CheckIn, DayType, PrayerCheck } from './types';
import { DAILY_BONUS_XP } from './xp';

export interface MvdChecklist {
  prayers: { name: PrayerName; prayed: boolean }[];
  allPrayers: boolean;
  deepWork: boolean;
  outreach: boolean;
  exercise: boolean;
}

export interface DayEval {
  date: string;
  /** Blocks that get a check-in sheet. */
  scheduled: ResolvedBlock[];
  answered: number;
  doneOrPartial: number;
  /** Every scheduled check-in is Done or Partial. */
  full: boolean;
  mvd: boolean;
  dayType: DayType;
  bonusXp: number;
  checklist: MvdChecklist;
  /** Status of specific streak inputs. */
  fajrPrayed: boolean;
  exerciseStatus: CheckIn['status'] | null;
  windDownStatus: CheckIn['status'] | null;
  /** Share of scheduled check-ins Done or Partial (0..1); null if none scheduled. */
  adherence: number | null;
}

const good = (c: CheckIn | undefined) => c?.status === 'done' || c?.status === 'partial';

/** Evaluate one day from its blocks, check-ins and prayer checks. Pure. */
export function evaluateDay(
  date: string,
  blocks: ResolvedBlock[],
  checkIns: CheckIn[],
  prayers: PrayerCheck[],
): DayEval {
  const dayCheckIns = checkIns.filter((c) => c.date === date);
  const byBlock = new Map(dayCheckIns.map((c) => [c.blockId, c]));
  const scheduled = blocks.filter((b) => b.date === date && b.checkIn);
  const answered = scheduled.filter((b) => byBlock.has(b.id)).length;
  const doneOrPartial = scheduled.filter((b) => good(byBlock.get(b.id))).length;
  const full = scheduled.length > 0 && doneOrPartial === scheduled.length;

  const prayed = new Set(prayers.filter((p) => p.date === date && p.prayed).map((p) => p.prayer));
  const names = checklistPrayers(blocks.filter((b) => b.date === date));
  const checklist: MvdChecklist = {
    prayers: names.map((name) => ({ name, prayed: prayed.has(name) })),
    allPrayers: names.length > 0 && names.every((n) => prayed.has(n)),
    deepWork: dayCheckIns.some((c) => c.category === 'deep_work' && good(c)),
    outreach: dayCheckIns.some(
      (c) => (c.category === 'career_jobs' || c.category === 'career_scholarship') && (c.count ?? 0) >= 1,
    ),
    exercise: dayCheckIns.some((c) => c.category === 'exercise' && good(c)),
  };
  const mvd = checklist.allPrayers && checklist.deepWork && checklist.outreach && checklist.exercise;
  const dayType: DayType = full ? 'full' : mvd ? 'mvd' : 'none';

  const exercise = dayCheckIns.find((c) => c.category === 'exercise');
  const windDown = dayCheckIns.find((c) => c.category === 'wind_down');

  return {
    date,
    scheduled,
    answered,
    doneOrPartial,
    full,
    mvd,
    dayType,
    bonusXp: full ? DAILY_BONUS_XP : 0,
    checklist,
    fajrPrayed: prayed.has('fajr'),
    exerciseStatus: exercise?.status ?? null,
    windDownStatus: windDown?.status ?? null,
    adherence: scheduled.length ? doneOrPartial / scheduled.length : null,
  };
}
