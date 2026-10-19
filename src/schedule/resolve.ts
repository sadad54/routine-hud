import scheduleJson from './schedule.json';
import { atTime, fmtTime, MINUTE, weekdayOf } from './time';
import type {
  BlockDef,
  Category,
  PrayerDay,
  PrayerName,
  ResolveResult,
  ResolvedBlock,
  ScheduleFile,
} from './types';

export const SCHEDULE = scheduleJson as unknown as ScheduleFile;

/** Categories that never get an end-of-block check-in sheet. */
const NO_SHEET: Category[] = ['meal', 'rest', 'prayer'];

const ANCHOR_BY_ID: Record<string, PrayerName> = {
  fajr: 'fajr',
  zuhr: 'dhuhr',
  asr: 'asr',
  maghrib: 'maghrib',
  isha: 'isha',
  jumuah: 'jumuah',
};

export interface ResolveOptions {
  schedule?: ScheduleFile;
  /** Real prayer times for this date, or null to use fixed fallback starts. */
  prayerTimes?: PrayerDay | null;
}

interface Working {
  def: BlockDef;
  category: Category;
  title: string;
  start: number;
  end: number;
  pinned: boolean;
  anchored: boolean;
}

export function templateFor(date: string, schedule: ScheduleFile = SCHEDULE): BlockDef[] {
  const name = schedule.weekdayTemplate[weekdayOf(date)];
  const tpl = schedule.templates[name];
  if (!Array.isArray(tpl)) throw new Error(`Template "${name}" is missing or not expanded`);
  return tpl;
}

/**
 * Reflow a run of consecutive flex blocks so it exactly fills [L, R].
 * `nominal` has k+1 boundaries; interior boundaries keep their nominal times
 * unless a block would fall below its minimum. Returns the new boundaries and
 * whether the run was infeasible (in which case every block keeps its minimum
 * and the run overflows R).
 */
export function reflowRun(
  L: number,
  R: number,
  nominal: number[],
  mins: number[],
): { bounds: number[]; conflict: boolean } {
  const k = mins.length;
  const p = nominal.slice();
  p[0] = L;
  p[k] = R;
  const total = mins.reduce((a, b) => a + b, 0);
  if (R - L < total) {
    for (let i = 1; i <= k; i++) p[i] = (p[i - 1] as number) + (mins[i - 1] as number);
    return { bounds: p, conflict: true };
  }
  for (let i = 1; i < k; i++) {
    p[i] = Math.max(p[i] as number, (p[i - 1] as number) + (mins[i - 1] as number));
  }
  for (let i = k - 1; i >= 1; i--) {
    p[i] = Math.min(p[i] as number, (p[i + 1] as number) - (mins[i] as number));
  }
  return { bounds: p, conflict: false };
}

function resolveCategory(def: BlockDef, date: string, schedule: ScheduleFile): Category {
  if (def.category !== '$careerByDay') return def.category;
  return schedule.careerByDay[weekdayOf(date)] ?? 'career_jobs';
}

/** Resolve the block list for a KL date: template → weekday variant → prayer anchors → flex reflow. */
export function resolveDay(date: string, opts: ResolveOptions = {}): ResolveResult {
  const schedule = opts.schedule ?? SCHEDULE;
  const prayerTimes = opts.prayerTimes ?? null;
  const defs = templateFor(date, schedule);
  const conflicts: string[] = [];
  const conflicted = new Set<string>();
  let usedPrayerTimes = false;

  // 1. Nominal / anchored placement.
  const items: Working[] = defs.map((def) => {
    const category = resolveCategory(def, date, schedule);
    const title =
      def.category === '$careerByDay' ? (schedule.careerTitles?.[category] ?? def.title) : def.title;
    let start = atTime(date, def.start);
    const anchored = Boolean(def.anchor);
    if (def.anchor && prayerTimes?.[def.anchor.prayer]) {
      start = atTime(date, prayerTimes[def.anchor.prayer]) + def.anchor.offsetMin * MINUTE;
      usedPrayerTimes = true;
    }
    let end: number;
    if (def.durationMin != null) end = start + def.durationMin * MINUTE;
    else if (def.endFixed) end = atTime(date, def.endFixed);
    else if (def.end) {
      end = atTime(date, def.end);
      if (def.overnight || end <= start) end = atTime(date, def.end, 1);
    } else end = start;
    return { def, category, title, start, end, pinned: !def.flex, anchored };
  });

  // 2. Reflow each run of flex blocks between pinned neighbours.
  let i = 0;
  while (i < items.length) {
    if (items[i]!.pinned) {
      i++;
      continue;
    }
    let j = i;
    while (j + 1 < items.length && !items[j + 1]!.pinned) j++;
    const run = items.slice(i, j + 1);
    const prev = items[i - 1];
    const next = items[j + 1];
    const L = prev ? prev.end : run[0]!.start;
    const R = next ? next.start : run[run.length - 1]!.end;
    const nominal = [run[0]!.start, ...run.map((b) => b.end)];
    const mins = run.map((b) => (b.def.minMin ?? 0) * MINUTE);
    const { bounds, conflict } = reflowRun(L, R, nominal, mins);
    run.forEach((b, idx) => {
      b.start = bounds[idx] as number;
      b.end = bounds[idx + 1] as number;
    });
    if (conflict) {
      run.forEach((b) => conflicted.add(b.def.id));
      conflicts.push(
        `${date}: flex run [${run.map((b) => b.def.id).join(', ')}] needs ${
          mins.reduce((a, b) => a + b, 0) / MINUTE
        } min but only ${(R - L) / MINUTE} min fit between ${fmtTime(L)} and ${fmtTime(R)}; kept minMin`,
      );
    }
    i = j + 1;
  }

  // 3. Build resolved blocks, trimming overlaps (the later-starting block wins) and filling gaps.
  // Flex blocks squeezed to zero length disappear for the day.
  const sorted = items
    .filter((w) => !(w.def.flex && w.end <= w.start))
    .sort((a, b) => a.start - b.start);
  const blocks: ResolvedBlock[] = [];
  sorted.forEach((w, idx) => {
    const nextStart = sorted[idx + 1]?.start;
    let end = w.end;
    if (nextStart != null && end > nextStart) {
      if (!conflicted.has(w.def.id)) {
        conflicts.push(`${date}: "${w.def.id}" overlaps the next block; ends at ${fmtTime(nextStart)} on the HUD`);
      }
      end = nextStart;
    }
    const prayer = w.def.prayer ?? w.def.anchor?.prayer ?? ANCHOR_BY_ID[w.def.id];
    blocks.push({
      key: `${date}:${w.def.id}`,
      id: w.def.id,
      title: w.title,
      category: w.category,
      date,
      start: w.start,
      end,
      plannedEnd: w.end,
      sprints: w.def.sprints,
      checkIn: !w.def.noCheckIn && !NO_SHEET.includes(w.category),
      prayer: w.category === 'prayer' ? prayer : undefined,
      anchored: w.anchored,
      flex: Boolean(w.def.flex),
      overnight: Boolean(w.def.overnight),
      synthetic: false,
    });
    if (nextStart != null && end < nextStart) {
      blocks.push({
        key: `${date}:gap_${fmtTime(end).replace(':', '')}`,
        id: `gap_${fmtTime(end).replace(':', '')}`,
        title: 'Free time',
        category: 'rest',
        date,
        start: end,
        end: nextStart,
        plannedEnd: nextStart,
        checkIn: false,
        anchored: false,
        flex: false,
        overnight: false,
        synthetic: true,
      });
    }
  });

  return { blocks, conflicts, usedPrayerTimes };
}

export function scheduledMinutes(b: ResolvedBlock): number {
  return Math.round((b.end - b.start) / MINUTE);
}

/** The prayers in the day's checklist, in order. Friday has Jumu'ah instead of Zuhr. */
export function checklistPrayers(blocks: ResolvedBlock[]): PrayerName[] {
  const order: PrayerName[] = ['fajr', 'dhuhr', 'jumuah', 'asr', 'maghrib', 'isha'];
  const present = new Set(blocks.map((b) => b.prayer).filter(Boolean) as PrayerName[]);
  return order.filter((p) => present.has(p));
}
