import { useApp } from '../store/app';
import { isEditable } from '../game/checkin';
import { fmtTime } from '../schedule/time';
import type { ResolvedBlock } from '../schedule/types';
import { CATEGORY, STATUS_META } from './theme';
import { Icon } from './Icon';

interface Props {
  blocks: ResolvedBlock[];
  now: number;
  currentKey?: string;
  /** Show notes and allow tapping past blocks to edit. */
  detailed?: boolean;
  compact?: boolean;
}

export function Timeline({ blocks, now, currentKey, detailed = false, compact = false }: Props) {
  const checkIns = useApp((s) => s.checkIns);
  const openSheet = useApp((s) => s.openSheet);
  const byId = new Map(checkIns.map((c) => [c.id, c]));

  return (
    <ol className="relative space-y-1" aria-label="Today's timeline">
      {blocks.map((b) => {
        const meta = CATEGORY[b.category];
        const past = b.end <= now;
        const current = b.key === currentKey;
        const ci = byId.get(b.key);
        const editable = b.checkIn && past && isEditable(b.date, now);
        const status = ci ? STATUS_META[ci.status] : null;
        const minutes = Math.round((b.end - b.start) / 60_000);
        const body = (
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <span className="w-11 shrink-0 pt-0.5 text-xs text-slate-500 tabular dark:text-slate-400">{fmtTime(b.start)}</span>
            <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${past && !current ? 'opacity-40' : ''}`} style={{ background: meta.color }} aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span
                className={`block truncate ${current ? 'font-semibold' : ''} ${compact ? 'text-sm' : ''} ${
                  past && !current ? 'text-slate-500 dark:text-slate-400' : ''
                }`}
              >
                {b.title}
                {past && !current ? <span className="sr-only"> (past)</span> : null}
              </span>
              {!compact ? (
                <span className="block text-xs text-slate-500 dark:text-slate-400">
                  {meta.label} · {minutes} min{b.anchored ? ' · prayer time' : ''}
                </span>
              ) : null}
              {detailed && ci?.note ? <span className="mt-0.5 block text-xs italic text-slate-600 dark:text-slate-300">“{ci.note}”</span> : null}
              {detailed && ci?.count != null ? (
                <span className="block text-xs text-slate-600 dark:text-slate-300">
                  {ci.count} {b.category === 'career_jobs' ? 'applications' : 'supervisor emails'}
                </span>
              ) : null}
            </span>
            <span className="shrink-0 text-right text-xs">
              {current ? <span className="rounded-full bg-slate-900 px-2 py-0.5 font-semibold text-white dark:bg-white dark:text-slate-900">Now</span> : null}
              {status ? (
                <span className={`inline-flex items-center gap-1 font-medium ${status.className}`}>
                  <span aria-hidden="true">{status.glyph}</span>
                  {status.label}
                </span>
              ) : b.checkIn && past ? (
                editable ? (
                  <span className="font-medium text-red-700 dark:text-red-400">Check in</span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-slate-500">
                    <Icon name="lock" className="h-3 w-3" /> Missed
                  </span>
                )
              ) : null}
              {ci && !editable && past && detailed ? <Icon name="lock" className="ml-1 inline h-3 w-3 text-slate-400" title="Locked" /> : null}
            </span>
          </div>
        );
        return (
          <li
            key={b.key}
            className={`rounded-xl ${
              current ? 'bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700' : ''
            }`}
          >
            {editable ? (
              <button
                className="flex w-full rounded-xl px-2 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800/60"
                onClick={() => openSheet([b.key])}
                title={`${ci ? 'Edit' : 'Add'} check-in`}
              >
                {body}
              </button>
            ) : (
              <div className="flex px-2 py-2">{body}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
