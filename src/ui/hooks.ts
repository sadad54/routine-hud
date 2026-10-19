import { useMemo } from 'react';
import { useClock } from '../clock/clock';
import { pendingCheckIns } from '../game/checkin';
import { summarize, type GameSummary } from '../game/summary';
import { computeNow, type NowState } from '../schedule/now';
import { addDays, dateKey } from '../schedule/time';
import type { ResolvedBlock } from '../schedule/types';
import { useApp, useResolver } from '../store/app';

export function useNow(): number {
  return useClock((s) => s.now);
}

/** KL date; only re-renders when the date changes (midnight rollover). */
export function useToday(): string {
  return useClock((s) => dateKey(s.now));
}

export function useHud(): NowState {
  const now = useNow();
  const resolve = useResolver();
  return useMemo(() => computeNow(now, resolve), [now, resolve]);
}

export function useDayBlocks(date: string): ResolvedBlock[] {
  const resolve = useResolver();
  return useMemo(() => resolve(date), [resolve, date]);
}

export function useGame(): GameSummary {
  const today = useToday();
  const resolve = useResolver();
  const checkIns = useApp((s) => s.checkIns);
  const prayers = useApp((s) => s.prayers);
  const days = useApp((s) => s.days);
  const prayerXp = useApp((s) => s.settings.prayerXp);
  const targets = useApp((s) => s.settings.questTargets);
  return useMemo(
    () => summarize({ checkIns, prayers, days }, { today, resolve, prayerXp, targets }),
    [checkIns, prayers, days, today, resolve, prayerXp, targets],
  );
}

/** The check-in queue: ended blocks from yesterday and today without a check-in. */
export function usePending(): ResolvedBlock[] {
  // Re-evaluate at most once per 15 s of virtual time.
  const bucket = useClock((s) => Math.floor(s.now / 15_000));
  const today = useToday();
  const resolve = useResolver();
  const checkIns = useApp((s) => s.checkIns);
  return useMemo(() => {
    const now = useClock.getState().now;
    const blocks = [...resolve(addDays(today, -1)), ...resolve(today)];
    return pendingCheckIns(blocks, checkIns, now);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bucket, today, resolve, checkIns]);
}

export function findBlock(key: string, resolve: (d: string) => ResolvedBlock[]): ResolvedBlock | undefined {
  const date = key.slice(0, 10);
  return resolve(date).find((b) => b.key === key);
}
