import { addDays, dateKey } from './time';
import type { ResolvedBlock } from './types';

export type DayResolver = (date: string) => ResolvedBlock[];

export interface SprintState {
  /** 0-based index into the block's sprints array. */
  index: number;
  kind: 'sprint' | 'break';
  /** 1-based sprint number (counting only work segments). */
  sprintNumber: number;
  sprintCount: number;
  start: number;
  end: number;
  remainingMs: number;
}

export interface NowState {
  now: number;
  /** KL calendar date of `now`. */
  today: string;
  current: ResolvedBlock;
  next: ResolvedBlock;
  remainingMs: number;
  elapsedMs: number;
  /** 0..1 share of the current block elapsed. */
  progress: number;
  sprint: SprintState | null;
}

/** Split a block into its sprint/break segments (epoch ms). The last segment absorbs any difference. */
export function sprintSegments(block: ResolvedBlock): { start: number; end: number; kind: 'sprint' | 'break' }[] {
  if (!block.sprints?.length) return [];
  const segs: { start: number; end: number; kind: 'sprint' | 'break' }[] = [];
  let t = block.start;
  block.sprints.forEach((min, i) => {
    if (t >= block.end) return;
    const end = Math.min(block.end, t + min * 60_000);
    segs.push({ start: t, end, kind: i % 2 === 0 ? 'sprint' : 'break' });
    t = end;
  });
  const last = segs[segs.length - 1];
  if (last && last.end < block.end) last.end = block.end;
  return segs;
}

export function sprintAt(block: ResolvedBlock, now: number): SprintState | null {
  const segs = sprintSegments(block);
  const idx = segs.findIndex((s) => now >= s.start && now < s.end);
  if (idx < 0) return null;
  const seg = segs[idx]!;
  const sprintCount = segs.filter((s) => s.kind === 'sprint').length;
  const sprintNumber = segs.slice(0, idx + 1).filter((s) => s.kind === 'sprint').length;
  return {
    index: idx,
    kind: seg.kind,
    sprintNumber: Math.max(1, sprintNumber),
    sprintCount,
    start: seg.start,
    end: seg.end,
    remainingMs: seg.end - now,
  };
}

/**
 * Blocks around `now`: yesterday's recent tail (the overnight sleep plus anything
 * that ended in the last two hours, so just-passed boundaries still alert), today,
 * and tomorrow. Sorted by start.
 */
export function blocksAround(now: number, resolve: DayResolver): ResolvedBlock[] {
  const today = dateKey(now);
  return [
    ...resolve(addDays(today, -1)).filter((b) => b.end > now - 2 * 3_600_000),
    ...resolve(today),
    ...resolve(addDays(today, 1)),
  ].sort((a, b) => a.start - b.start);
}

/** Derive the HUD state purely from the wall clock. Never decremented, always recomputed. */
export function computeNow(now: number, resolve: DayResolver): NowState {
  const all = blocksAround(now, resolve);
  let currentIdx = -1;
  for (let i = 0; i < all.length; i++) {
    const b = all[i]!;
    if (b.start <= now && now < b.end) currentIdx = i; // latest-starting containing block wins
  }
  if (currentIdx < 0) {
    // Should not happen (resolver fills gaps), but never break the HUD.
    const nextIdx = all.findIndex((b) => b.start > now);
    const next = all[nextIdx] ?? all[all.length - 1]!;
    const filler: ResolvedBlock = {
      ...next,
      key: `${dateKey(now)}:free`,
      id: 'free',
      title: 'Free time',
      category: 'rest',
      start: now,
      end: next.start > now ? next.start : now + 60_000,
      plannedEnd: next.start,
      checkIn: false,
      prayer: undefined,
      sprints: undefined,
      synthetic: true,
    };
    return finish(now, filler, next);
  }
  const current = all[currentIdx]!;
  const next = all.slice(currentIdx + 1).find((b) => b.start > current.start) ?? current;
  return finish(now, current, next);
}

function finish(now: number, current: ResolvedBlock, next: ResolvedBlock): NowState {
  const total = Math.max(1, current.end - current.start);
  const elapsedMs = now - current.start;
  return {
    now,
    today: dateKey(now),
    current,
    next,
    remainingMs: Math.max(0, current.end - now),
    elapsedMs,
    progress: Math.min(1, Math.max(0, elapsedMs / total)),
    sprint: current.sprints ? sprintAt(current, now) : null,
  };
}

/** Memoise a resolver per date (resolving is pure, ticks happen every second). */
export function memoResolver(resolve: DayResolver): DayResolver {
  const cache = new Map<string, ResolvedBlock[]>();
  return (date) => {
    let hit = cache.get(date);
    if (!hit) {
      hit = resolve(date);
      cache.set(date, hit);
      if (cache.size > 128) cache.delete(cache.keys().next().value as string);
    }
    return hit;
  };
}
