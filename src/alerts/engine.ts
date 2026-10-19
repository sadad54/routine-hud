/**
 * Boundary alert engine. Pure: no React, no browser APIs.
 * Each alert has a stable id `${date}:${blockId}:${threshold}` and fires at most
 * once — the caller persists fired ids so reloads never replay them.
 */
import { sprintSegments } from '../schedule/now';
import { hhmmToMin, kl, MINUTE } from '../schedule/time';
import type { Category, PrayerName, ResolvedBlock } from '../schedule/types';

export type AlertSound = 'none' | 'chime' | 'double' | 'transition';
export type AlertKind = 'threshold' | 'transition' | 'sprint' | 'prayer-start';
export type VisualState = 'normal' | 'amber' | 'amber-pulse' | 'red';

export interface AlertEvent {
  id: string;
  kind: AlertKind;
  at: number;
  blockKey: string;
  blockTitle: string;
  nextTitle: string;
  minutes: number | null;
  sound: AlertSound;
  notification: { title: string; body: string } | null;
}

export const DEFAULT_THRESHOLDS = [10, 5, 1];

export type ThresholdMap = Partial<Record<Category, number[]>>;

/** Default thresholds for every category. */
export function defaultThresholds(): Record<Category, number[]> {
  const cats: Category[] = [
    'deep_work', 'career_jobs', 'career_scholarship', 'research', 'exercise',
    'review', 'wind_down', 'prayer', 'meal', 'rest',
  ];
  return Object.fromEntries(cats.map((c) => [c, [...DEFAULT_THRESHOLDS]])) as Record<Category, number[]>;
}

export const PRAYER_LABEL: Record<PrayerName, string> = {
  fajr: 'Fajr',
  dhuhr: 'Zuhr',
  jumuah: 'Jumu’ah',
  asr: 'Asr',
  maghrib: 'Maghrib',
  isha: 'Isha',
};

/** How a threshold behaves, by minutes before the end. */
export function thresholdLevel(min: number): { sound: AlertSound; visual: VisualState; notify: boolean } {
  if (min <= 1) return { sound: 'double', visual: 'red', notify: true };
  if (min <= 5) return { sound: 'chime', visual: 'amber-pulse', notify: true };
  return { sound: 'none', visual: 'amber', notify: false };
}

function cleanThresholds(list: number[] | undefined): number[] {
  const src = list ?? DEFAULT_THRESHOLDS;
  return [...new Set(src.filter((n) => Number.isFinite(n) && n > 0))].sort((a, b) => b - a);
}

/** Every alert a block instance can produce, in time order. */
export function alertsForBlock(block: ResolvedBlock, next: ResolvedBlock, thresholds: ThresholdMap): AlertEvent[] {
  const base = { blockKey: block.key, blockTitle: block.title, nextTitle: next.title };
  const out: AlertEvent[] = [];

  if (block.prayer) {
    out.push({
      ...base,
      id: `${block.key}:start`,
      kind: 'prayer-start',
      at: block.start,
      minutes: null,
      sound: 'none', // the previous block's transition tone already plays at this moment
      notification: { title: `Time for ${PRAYER_LABEL[block.prayer]}`, body: block.title },
    });
  }

  if (block.sprints?.length) {
    const segs = sprintSegments(block);
    let sprintNo = 1;
    segs.slice(0, -1).forEach((seg, i) => {
      const nextSeg = segs[i + 1]!;
      if (seg.kind === 'sprint') {
        const breakMin = Math.round((nextSeg.end - nextSeg.start) / MINUTE);
        out.push({
          ...base,
          id: `${block.key}:sprint-${i + 1}`,
          kind: 'sprint',
          at: seg.end,
          minutes: null,
          sound: 'chime',
          notification: { title: `Sprint ${sprintNo} done`, body: `Take a ${breakMin} min break.` },
        });
      } else {
        sprintNo++;
        out.push({
          ...base,
          id: `${block.key}:sprint-${i + 1}`,
          kind: 'sprint',
          at: seg.end,
          minutes: null,
          sound: 'chime',
          notification: { title: `Sprint ${sprintNo} starts`, body: block.title },
        });
      }
    });
  }

  for (const min of cleanThresholds(thresholds[block.category])) {
    const at = block.end - min * MINUTE;
    if (at <= block.start) continue; // block shorter than this threshold
    const lvl = thresholdLevel(min);
    out.push({
      ...base,
      id: `${block.key}:${min}`,
      kind: 'threshold',
      at,
      minutes: min,
      sound: lvl.sound,
      notification: lvl.notify
        ? min <= 1
          ? { title: `${min} min left`, body: `Next: ${next.title}` }
          : { title: `${min} min left: ${block.title}`, body: `Next: ${next.title}` }
        : null,
    });
  }

  out.push({
    ...base,
    id: `${block.key}:0`,
    kind: 'transition',
    at: block.end,
    minutes: 0,
    sound: 'transition',
    notification: { title: `${next.title} starts now`, body: `${block.title} is over.` },
  });

  return out.sort((a, b) => a.at - b.at || order(a.kind) - order(b.kind));
}

function order(k: AlertKind): number {
  return k === 'transition' ? 0 : k === 'prayer-start' ? 1 : 2;
}

export interface DueInput {
  /** Virtual time of the previous tick in this session, or null on the first tick. */
  prevNow: number | null;
  now: number;
  /** Blocks around now, sorted by start. */
  blocks: ResolvedBlock[];
  thresholds: ThresholdMap;
  fired: ReadonlySet<string>;
  /** Alerts older than this are never fired (sleep/resume, jumps). */
  graceMs: number;
}

/**
 * Alerts whose time falls in (prevNow, now], not yet fired, and not stale.
 * On the first tick of a session nothing fires (missed alerts are not replayed).
 */
export function dueAlerts({ prevNow, now, blocks, thresholds, fired, graceMs }: DueInput): AlertEvent[] {
  if (prevNow == null || now <= prevNow) return [];
  const due: AlertEvent[] = [];
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]!;
    const next = blocks[i + 1];
    if (!next) continue; // need to know what's next to word the alert
    if (block.end < prevNow - graceMs || block.start > now) continue;
    for (const a of alertsForBlock(block, next, thresholds)) {
      if (a.at > prevNow && a.at <= now && now - a.at <= graceMs && !fired.has(a.id)) due.push(a);
    }
  }
  return due.sort((a, b) => a.at - b.at || order(a.kind) - order(b.kind));
}

/** Continuous visual state from time remaining, so muted users still see alerts. */
export function visualState(remainingMs: number, thresholds: number[] | undefined): VisualState {
  const list = cleanThresholds(thresholds);
  let state: VisualState = 'normal';
  for (const min of list) {
    if (remainingMs <= min * MINUTE) state = thresholdLevel(min).visual;
  }
  return state;
}

/** Quiet hours, e.g. 22:00 → 05:25 (may wrap midnight). Evaluated in KL time. */
export function isQuietHours(now: number, quiet: { start: string; end: string }): boolean {
  const t = kl(now);
  const m = t.hour * 60 + t.minute;
  const s = hhmmToMin(quiet.start);
  const e = hhmmToMin(quiet.end);
  if (s === e) return false;
  return s < e ? m >= s && m < e : m >= s || m < e;
}

/** Fired-alert ids older than `keepDays` can be pruned; ids start with the date. */
export function isPrunable(id: string, todayDate: string, keepDays = 3): boolean {
  const date = id.slice(0, 10);
  return date < shiftDate(todayDate, -keepDays);
}

function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
