// Data model (PRD "Data model and storage"). Dates are 'YYYY-MM-DD' in
// Asia/Kuala_Lumpur; times are ISO strings with +08:00.
import type { PrayerName } from '../schedule/types';

export type CheckInStatus = 'done' | 'partial' | 'skipped';

export interface CheckIn {
  id: string; // `${date}:${blockId}`
  date: string;
  blockId: string;
  category: string;
  status: CheckInStatus;
  note?: string;
  count?: number;
  scheduledMinutes: number;
  xpAwarded: number;
  createdAt: string;
  updatedAt: string;
}

export interface PrayerCheck {
  id: string; // `${date}:${prayer}`
  date: string;
  prayer: PrayerName;
  prayed: boolean;
}

export interface PrayerTimesMonth {
  id: string; // 'YYYY-MM'
  fetchedAt: string;
  days: Record<string, { fajr: string; dhuhr: string; asr: string; maghrib: string; isha: string }>;
}

export interface FiredAlert {
  id: string; // `${date}:${blockId}:${threshold}`
  firedAt: string;
}

export type DayType = 'full' | 'mvd' | 'none';

export interface DayRecord {
  date: string;
  badDayMode: boolean;
  dayType: DayType;
  bonusXp: number;
  /** "Showed up for someone I love today" (the Love pillar's daily tick). */
  connected?: boolean;
}

export interface Achievement {
  id: string;
  unlockedAt: string;
}

export interface QuestTargets {
  applications: number;
  supervisorEmails: number;
  deepWorkHours: number;
  exerciseDays: number;
}

/** The five identity pillars, reverse-engineered from the end goal. */
export type Pillar = 'craft' | 'deen' | 'body' | 'wealth' | 'love';

export interface NorthStar {
  /** Used in the greeting; empty for none. */
  name: string;
  /** The year the vision describes. */
  year: number;
  /** "I am…" statement per pillar. */
  statements: Record<Pillar, string>;
  /** Milestones from the vision back to now, newest goal first: "2027 | MRes in Australia". */
  milestones: { when: string; text: string }[];
}

export interface Settings {
  id: 'singleton';
  mute: boolean;
  quietHours: { start: string; end: string };
  thresholdsByCategory: Record<string, number[]>;
  prayerXp: boolean;
  questTargets: QuestTargets;
  northStar: NorthStar;
}

export interface GameData {
  checkIns: CheckIn[];
  prayers: PrayerCheck[];
  days: DayRecord[];
}
