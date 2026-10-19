/**
 * Identity layer, reverse-engineered from the end goal: an AI engineer who is
 * spiritually centred, healthy, wealthy and loved. Every check-in, prayer and
 * "showed up for someone" tick is a vote for one of five pillars. Pure.
 */
import { checklistPrayers } from '../schedule/resolve';
import { addDays } from '../schedule/time';
import type { Category, ResolvedBlock } from '../schedule/types';
import type { CheckIn, DayRecord, DayType, NorthStar, Pillar, PrayerCheck } from './types';

export const PILLARS: Pillar[] = ['craft', 'deen', 'body', 'wealth', 'love'];

/** Which pillar a check-in category votes for. Meals and rest vote for nothing. */
export const PILLAR_OF: Partial<Record<Category, Pillar>> = {
  deep_work: 'craft',
  research: 'craft',
  review: 'craft',
  prayer: 'deen',
  exercise: 'body',
  wind_down: 'body',
  career_jobs: 'wealth',
  career_scholarship: 'wealth',
};

const WEIGHT = { done: 1, partial: 0.5, skipped: 0 } as const;

export interface PillarDay {
  /** Weighted actions taken (Done = 1, Partial = 0.5, prayer = 1). */
  earned: number;
  /** Actions available that day. */
  possible: number;
  /** Count of actions that cast a vote (Done or Partial, prayed, connected). */
  votes: number;
  /** earned / possible, or null when nothing was scheduled for the pillar. */
  score: number | null;
}

export type PillarScores = Record<Pillar, PillarDay>;

function empty(): PillarScores {
  return Object.fromEntries(PILLARS.map((p) => [p, { earned: 0, possible: 0, votes: 0, score: null }])) as PillarScores;
}

/** Pillar scores for one day from its blocks, check-ins, prayer ticks and day record. */
export function dayPillars(
  date: string,
  blocks: ResolvedBlock[],
  checkIns: CheckIn[],
  prayers: PrayerCheck[],
  record: DayRecord | undefined,
): PillarScores {
  const out = empty();
  const dayBlocks = blocks.filter((b) => b.date === date);
  const byBlock = new Map(checkIns.filter((c) => c.date === date).map((c) => [c.blockId, c]));

  for (const b of dayBlocks) {
    const p = PILLAR_OF[b.category];
    if (!b.checkIn || !p || p === 'deen') continue;
    const ci = byBlock.get(b.id);
    const w = ci ? WEIGHT[ci.status] : 0;
    out[p].possible += 1;
    out[p].earned += w;
    if (w > 0) out[p].votes += 1;
  }

  const prayed = new Set(prayers.filter((x) => x.date === date && x.prayed).map((x) => x.prayer));
  for (const name of checklistPrayers(dayBlocks)) {
    out.deen.possible += 1;
    if (prayed.has(name)) {
      out.deen.earned += 1;
      out.deen.votes += 1;
    }
  }

  out.love.possible = 1;
  if (record?.connected) {
    out.love.earned = 1;
    out.love.votes = 1;
  }

  for (const p of PILLARS) out[p].score = out[p].possible ? out[p].earned / out[p].possible : null;
  return out;
}

export function totalVotes(s: PillarScores): number {
  return PILLARS.reduce((n, p) => n + s[p].votes, 0);
}

/** Mean score per pillar over several days, skipping days where a pillar had nothing scheduled. */
export function averagePillars(days: PillarScores[]): Record<Pillar, number | null> {
  return Object.fromEntries(
    PILLARS.map((p) => {
      const scores = days.map((d) => d[p].score).filter((v): v is number => v != null);
      return [p, scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null];
    }),
  ) as Record<Pillar, number | null>;
}

/** Daily growth factors behind the compound index (Atomic Habits' 1% rule). */
export const COMPOUND = { full: 1.01, mvd: 1.005, none: 0.99 } as const;

/**
 * The compound index: start at 1.0 on the first recorded day and multiply by
 * 1.01 for a Full day, 1.005 for a Minimum viable day and 0.99 otherwise.
 * Today only counts once it qualifies, so an unfinished day never drags it down.
 */
export function compoundSeries(
  first: string | null,
  today: string,
  dayType: (date: string) => DayType,
): { date: string; value: number }[] {
  if (!first || first > today) return [];
  const out: { date: string; value: number }[] = [];
  let v = 1;
  for (let d = first; d <= today; d = addDays(d, 1)) {
    const t = dayType(d);
    if (d === today && t === 'none') break;
    v *= COMPOUND[t];
    out.push({ date: d, value: v });
  }
  return out;
}

/** Career-ladder ranks, ending at the vision. */
const RANKS: [number, string][] = [
  [0, 'Apprentice'],
  [3, 'Junior'],
  [6, 'Engineer'],
  [10, 'Senior'],
  [15, 'Staff'],
  [22, 'Principal'],
  [30, 'Distinguished'],
  [40, 'Fellow'],
];

export function rankFor(level: number): { title: string; next: { title: string; level: number } | null } {
  let i = 0;
  while (i + 1 < RANKS.length && level >= RANKS[i + 1]![0]) i++;
  const nxt = RANKS[i + 1];
  return { title: RANKS[i]![1], next: nxt ? { title: nxt[1], level: nxt[0] } : null };
}

export const DEFAULT_NORTH_STAR: NorthStar = {
  name: '',
  year: 2031,
  statements: {
    craft: 'An AI engineer who ships models people rely on.',
    deen: 'Centred in remembrance. Five prayers, on time, every day.',
    body: 'Strong, rested and full of energy. The body is an amanah.',
    wealth: 'Financially free, with assets that work while I sleep.',
    love: 'Present for family and friends. Loved, and loving well.',
  },
  milestones: [
    { when: '2031', text: 'Staff AI engineer. Spiritually centred, healthy, wealthy and loved.' },
    { when: '2029', text: 'Shipping ML systems in production. First paper published. Investing every month.' },
    { when: '2027', text: 'Master’s by Research in Australia on a full scholarship and stipend.' },
    { when: '2026', text: 'An offer on the table: a funded MRes place or an AI/ML role with visa sponsorship.' },
  ],
};
