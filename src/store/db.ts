import Dexie, { type Table } from 'dexie';
import type {
  Achievement,
  CheckIn,
  DayRecord,
  FiredAlert,
  PrayerCheck,
  PrayerTimesMonth,
  Settings,
} from '../game/types';

export const DB_NAME = 'routine-hud';
export const SCHEMA_VERSION = 1;

export class RoutineDB extends Dexie {
  checkIns!: Table<CheckIn, string>;
  prayerChecks!: Table<PrayerCheck, string>;
  prayerMonths!: Table<PrayerTimesMonth, string>;
  firedAlerts!: Table<FiredAlert, string>;
  days!: Table<DayRecord, string>;
  achievements!: Table<Achievement, string>;
  settings!: Table<Settings, string>;

  constructor(name = DB_NAME) {
    super(name);
    this.version(SCHEMA_VERSION).stores({
      checkIns: 'id, date, category',
      prayerChecks: 'id, date',
      prayerMonths: 'id',
      firedAlerts: 'id',
      days: 'date',
      achievements: 'id',
      settings: 'id',
    });
  }
}

export const TABLES = [
  'checkIns',
  'prayerChecks',
  'prayerMonths',
  'firedAlerts',
  'days',
  'achievements',
  'settings',
] as const;
export type TableName = (typeof TABLES)[number];

let instance: RoutineDB | null = null;
export function getDb(): RoutineDB {
  if (!instance) instance = new RoutineDB();
  return instance;
}
