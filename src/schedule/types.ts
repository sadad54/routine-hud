export type Category =
  | 'deep_work'
  | 'career_jobs'
  | 'career_scholarship'
  | 'research'
  | 'exercise'
  | 'review'
  | 'wind_down'
  | 'prayer'
  | 'meal'
  | 'rest';

export const CATEGORIES: Category[] = [
  'deep_work',
  'career_jobs',
  'career_scholarship',
  'research',
  'exercise',
  'review',
  'wind_down',
  'prayer',
  'meal',
  'rest',
];

/** Prayers that can anchor a block (Aladhan names). */
export type AnchorPrayer = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
/** Prayers that appear in the daily checklist. */
export type PrayerName = AnchorPrayer | 'jumuah';

export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface BlockDef {
  id: string;
  title: string;
  category: Category | '$careerByDay';
  /** 'HH:mm'. For anchored blocks this is the fallback start. */
  start: string;
  end?: string;
  durationMin?: number;
  flex?: boolean;
  minMin?: number;
  anchor?: { prayer: AnchorPrayer; offsetMin: number };
  /** Anchored block whose end stays at a fixed clock time. */
  endFixed?: string;
  /** Alternating work / break lengths in minutes, starting with work. */
  sprints?: number[];
  overnight?: boolean;
  noCheckIn?: boolean;
  /** Explicit prayer key for non-anchored prayer blocks (e.g. Jumu'ah). */
  prayer?: PrayerName;
}

export interface ScheduleFile {
  timezone: string;
  weekdayTemplate: Record<Weekday, string>;
  careerByDay: Partial<Record<Weekday, Category>>;
  careerTitles?: Partial<Record<Category, string>>;
  templates: Record<string, BlockDef[]>;
}

/** One day's prayer start times, 'HH:mm' in Asia/Kuala_Lumpur. */
export type PrayerDay = Record<AnchorPrayer, string>;

export interface ResolvedBlock {
  /** `${date}:${id}` — unique per block instance. */
  key: string;
  id: string;
  title: string;
  category: Category;
  /** Routine date the block belongs to ('YYYY-MM-DD', KL). */
  date: string;
  /** Epoch ms. */
  start: number;
  /** Effective end in epoch ms (never overlaps the next block). */
  end: number;
  /** End as planned by the reflow (keeps minMin; may overlap the next block on conflict). */
  plannedEnd: number;
  sprints?: number[];
  /** Whether this block gets an end-of-block check-in sheet. */
  checkIn: boolean;
  prayer?: PrayerName;
  anchored: boolean;
  flex: boolean;
  overnight: boolean;
  synthetic: boolean;
}

export interface ResolveResult {
  blocks: ResolvedBlock[];
  conflicts: string[];
  usedPrayerTimes: boolean;
}
