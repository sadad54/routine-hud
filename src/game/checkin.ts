import { scheduledMinutes } from '../schedule/resolve';
import { addDays, startOfDayMs } from '../schedule/time';
import type { ResolvedBlock } from '../schedule/types';
import type { CheckIn, CheckInStatus } from './types';
import { xpForCheckIn } from './xp';

export function isCareer(category: string): boolean {
  return category === 'career_jobs' || category === 'career_scholarship';
}

export function countLabel(category: string): string | null {
  if (category === 'career_jobs') return 'Applications sent';
  if (category === 'career_scholarship') return 'Supervisor emails sent';
  return null;
}

/** Build (or update) a check-in for a block. XP is computed now and stored. */
export function buildCheckIn(
  block: Pick<ResolvedBlock, 'date' | 'id' | 'category' | 'start' | 'end'>,
  input: { status: CheckInStatus; note?: string; count?: number },
  nowIso: string,
  existing?: CheckIn,
): CheckIn {
  const minutes = existing?.scheduledMinutes ?? scheduledMinutes(block as ResolvedBlock);
  const note = input.note?.trim() || undefined;
  const count = isCareer(block.category) ? Math.max(0, Math.floor(input.count ?? 0)) : undefined;
  return {
    id: `${block.date}:${block.id}`,
    date: block.date,
    blockId: block.id,
    category: block.category,
    status: input.status,
    note,
    count,
    scheduledMinutes: minutes,
    xpAwarded: xpForCheckIn(block.category, input.status, minutes),
    createdAt: existing?.createdAt ?? nowIso,
    updatedAt: nowIso,
  };
}

/** Check-ins stay editable until the end of the next day (KL), then lock. */
export function isEditable(date: string, now: number): boolean {
  return now < startOfDayMs(addDays(date, 2));
}

/**
 * Blocks that ended, need a check-in, are still editable, and have none yet.
 * Oldest first — this is the check-in queue.
 */
export function pendingCheckIns(blocks: ResolvedBlock[], checkIns: CheckIn[], now: number): ResolvedBlock[] {
  const answered = new Set(checkIns.map((c) => c.id));
  return blocks
    .filter((b) => b.checkIn && b.end <= now && isEditable(b.date, now) && !answered.has(b.key))
    .sort((a, b) => a.end - b.end);
}
