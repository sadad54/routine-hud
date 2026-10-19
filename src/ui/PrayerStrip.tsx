import { PRAYER_LABEL } from '../alerts/engine';
import { checklistPrayers } from '../schedule/resolve';
import { fmtTime } from '../schedule/time';
import type { ResolvedBlock } from '../schedule/types';
import { prayerSourceFor, useApp } from '../store/app';

/** Today's five prayer times; the next one is highlighted. */
export function PrayerStrip({ blocks, now, date }: { blocks: ResolvedBlock[]; now: number; date: string }) {
  useApp((s) => s.prayerMonths);
  const source = prayerSourceFor(date);
  const names = checklistPrayers(blocks);
  const times = names.map((n) => ({ n, b: blocks.find((b) => b.prayer === n)! }));
  const nextIdx = times.findIndex((t) => t.b.start > now);
  return (
    <div className="card px-3 py-2.5">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="label">Prayer times</span>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">
          {source === 'live' ? 'JAKIM · live' : source === 'cache' ? 'JAKIM · cached' : 'Fixed times (offline)'}
        </span>
      </div>
      <ul className="grid grid-cols-5 gap-1 text-center">
        {times.map(({ n, b }, i) => (
          <li
            key={n}
            className={`rounded-lg px-1 py-1 ${i === nextIdx ? 'bg-emerald-50 ring-1 ring-emerald-600/40 dark:bg-emerald-950/40' : ''}`}
            aria-current={i === nextIdx ? 'time' : undefined}
          >
            <div className="text-[11px] font-medium text-slate-600 dark:text-slate-300">{PRAYER_LABEL[n]}</div>
            <div className={`text-sm tabular ${i === nextIdx ? 'font-bold' : ''} ${b.end <= now ? 'text-slate-500 dark:text-slate-400' : ''}`}>{fmtTime(b.start)}</div>
            {i === nextIdx ? <span className="sr-only">next prayer</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
