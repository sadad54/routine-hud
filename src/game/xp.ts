import type { Category } from '../schedule/types';
import type { CheckInStatus } from './types';

/** Base XP for a Done check-in. deep_work is per scheduled hour. */
export const BASE_XP: Record<Category, number> = {
  deep_work: 20,
  career_jobs: 40,
  career_scholarship: 40,
  research: 25,
  exercise: 30,
  review: 10,
  wind_down: 15,
  prayer: 0,
  meal: 0,
  rest: 0,
};

export const DAILY_BONUS_XP = 50;
export const QUEST_XP = 100;
/** XP per prayer when the "Prayer XP" setting is on. */
export const PRAYER_XP = 10;

const MULT: Record<CheckInStatus, number> = { done: 1, partial: 0.5, skipped: 0 };

export function xpForCheckIn(category: string, status: CheckInStatus, scheduledMinutes: number): number {
  const base = BASE_XP[category as Category] ?? 0;
  const full = category === 'deep_work' ? (base * scheduledMinutes) / 60 : base;
  return Math.round(full * MULT[status]);
}

/** Total XP needed to reach level n: round(100 × n^1.5). Level 0 starts at 0. */
export function levelThreshold(n: number): number {
  return n <= 0 ? 0 : Math.round(100 * Math.pow(n, 1.5));
}

export interface LevelInfo {
  level: number;
  /** XP at which the current level started. */
  floor: number;
  /** XP needed for the next level. */
  nextAt: number;
  /** 0..1 progress toward the next level. */
  progress: number;
}

export function levelFor(totalXp: number): LevelInfo {
  let level = 0;
  while (totalXp >= levelThreshold(level + 1)) level++;
  const floor = levelThreshold(level);
  const nextAt = levelThreshold(level + 1);
  return { level, floor, nextAt, progress: (totalXp - floor) / (nextAt - floor) };
}
