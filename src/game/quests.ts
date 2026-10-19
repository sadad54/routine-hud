import { addDays, weekStart } from '../schedule/time';
import type { CheckIn, QuestTargets } from './types';
import { QUEST_XP } from './xp';

export type QuestKey = keyof QuestTargets;
export const QUEST_KEYS: QuestKey[] = ['applications', 'supervisorEmails', 'deepWorkHours', 'exerciseDays'];

export const QUEST_LABEL: Record<QuestKey, string> = {
  applications: 'Job applications',
  supervisorEmails: 'Supervisor emails',
  deepWorkHours: 'Deep-work hours',
  exerciseDays: 'Exercise days',
};

export const DEFAULT_TARGETS: QuestTargets = {
  applications: 10,
  supervisorEmails: 3,
  deepWorkHours: 30,
  exerciseDays: 5,
};

export interface WeekNumbers {
  weekStart: string;
  applications: number;
  supervisorEmails: number;
  deepWorkHours: number;
  exerciseDays: number;
}

export interface WeekProgress extends WeekNumbers {
  completed: QuestKey[];
  xp: number;
  allMet: boolean;
}

const MULT = { done: 1, partial: 0.5, skipped: 0 } as const;

/** The four weekly numbers for the Monday-based KL week starting `start`. */
export function weekNumbers(start: string, checkIns: CheckIn[]): WeekNumbers {
  const end = addDays(start, 7);
  const inWeek = checkIns.filter((c) => c.date >= start && c.date < end);
  let applications = 0;
  let supervisorEmails = 0;
  let deepMinutes = 0;
  const exerciseDates = new Set<string>();
  for (const c of inWeek) {
    if (c.category === 'career_jobs' && c.status !== 'skipped') applications += c.count ?? 0;
    if (c.category === 'career_scholarship' && c.status !== 'skipped') supervisorEmails += c.count ?? 0;
    if (c.category === 'deep_work' || c.category === 'research') deepMinutes += c.scheduledMinutes * MULT[c.status];
    if (c.category === 'exercise' && c.status !== 'skipped') exerciseDates.add(c.date);
  }
  return {
    weekStart: start,
    applications,
    supervisorEmails,
    deepWorkHours: Math.round((deepMinutes / 60) * 10) / 10,
    exerciseDays: exerciseDates.size,
  };
}

export function weekProgress(start: string, checkIns: CheckIn[], targets: QuestTargets): WeekProgress {
  const n = weekNumbers(start, checkIns);
  const completed = QUEST_KEYS.filter((k) => targets[k] > 0 && n[k] >= targets[k]);
  return { ...n, completed, xp: completed.length * QUEST_XP, allMet: completed.length === QUEST_KEYS.length };
}

/** Week starts (Mondays) of every week that has at least one check-in. */
export function weeksWithData(checkIns: CheckIn[]): string[] {
  return [...new Set(checkIns.map((c) => weekStart(c.date)))].sort();
}

/** The current week and the previous `count - 1` weeks, oldest first. */
export function recentWeeks(today: string, count: number): string[] {
  const current = weekStart(today);
  return Array.from({ length: count }, (_, i) => addDays(current, -7 * (count - 1 - i)));
}
