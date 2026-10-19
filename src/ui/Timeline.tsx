import { Lock } from 'lucide-react';
import { useApp } from '../store/app';
import { isEditable } from '../game/checkin';
import { fmtTime } from '../schedule/time';
import type { ResolvedBlock } from '../schedule/types';
import { CATEGORY, STATUS_META } from './theme';

interface Props {
  blocks: ResolvedBlock[];
  now: number;
  currentKey?: string;
  /** Show notes and allow tapping past blocks to edit. */
  detailed?: boolean;
  compact?: boolean;
}

/** The day as a vertical rail: past blocks dim, the current one glows and fills. */
export function Timeline({ blocks, now, currentKey, detailed = false, compact = false }: Props) {
  const checkIns = useApp((s) => s.checkIns);
  const openSheet = useApp((s) => s.openSheet);
  const byId = new Map(checkIns.map((c) => [c.id, c]));

  return (
    <ol className="relative" aria-label="Today's timeline">
      <span className="absolute bottom-3 left-[4.875rem] top-3 w-px bg-gradient-to-b from-white/0 via-white/10 to-white/0" aria-hidden="true" />
      {blocks.map((b, i) => {
        const meta = CATEGORY[b.category];
        const Icon = meta.icon;
        const past = b.end <= now;
        const current = b.key === currentKey;
        const ci = byId.get(b.key);
        const editable = b.checkIn && past && isEditable(b.date, now);
        const status = ci ? STATUS_META[ci.status] : null;
        const minutes = Math.round((b.end - b.start) / 60_000);
        const progress = current ? Math.min(1, Math.max(0, (now - b.start) / (b.end - b.start))) : 0;
        const dim = past && !current;
        const body = (
          <div className="relative flex min-w-0 flex-1 items-center gap-3">
            <span className={`w-11 shrink-0 font-mono text-[11px] tabular ${current ? 'text-zinc-200' : 'text-zinc-500'}`}>{fmtTime(b.start)}</span>
            <span
              className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all ${dim ? 'opacity-40 grayscale-[40%]' : ''}`}
              style={{
                background: current ? meta.color : `${meta.color}14`,
                color: current ? '#05060a' : meta.color,
                boxShadow: current ? `0 0 20px -2px ${meta.color}` : `inset 0 0 0 1px ${meta.color}22`,
              }}
              aria-hidden="true"
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={2} />
            </span>
            <span className="min-w-0 flex-1">
              <span className={`block truncate ${compact ? 'text-[13px]' : 'text-sm'} ${current ? 'font-semibold text-white' : dim ? 'text-zinc-500' : 'text-zinc-200'}`}>
                {b.title}
                {dim ? <span className="sr-only"> (past)</span> : null}
              </span>
              {!compact ? (
                <span className="block text-xs text-zinc-500">
                  {meta.label} · {minutes} min{b.anchored ? ' · prayer time' : ''}
                </span>
              ) : null}
              {detailed && ci?.note ? <span className="serif mt-0.5 block text-[15px] italic text-zinc-300">“{ci.note}”</span> : null}
              {detailed && ci?.count != null ? (
                <span className="block font-mono text-[11px] text-zinc-400">
                  {ci.count} {b.category === 'career_jobs' ? 'applications' : 'supervisor emails'}
                </span>
              ) : null}
            </span>
            <span className="shrink-0 text-right text-xs">
              {current ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2 py-0.5 font-semibold text-ink-950">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ background: meta.color }} />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
                  </span>
                  Now
                </span>
              ) : null}
              {status ? (
                <span className={`inline-flex items-center gap-1 font-medium ${status.className}`}>
                  <span aria-hidden="true">{status.glyph}</span>
                  {status.label}
                </span>
              ) : b.checkIn && past ? (
                editable ? (
                  <span className="rounded-full border border-white/15 px-2 py-0.5 font-medium text-[color:var(--accent)]">Check in</span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-zinc-600">
                    <Lock className="h-3 w-3" /> Missed
                  </span>
                )
              ) : null}
              {ci && !editable && past && detailed ? <Lock className="ml-1 inline h-3 w-3 text-zinc-600" aria-label="Locked" /> : null}
            </span>
          </div>
        );
        return (
          <li
            key={b.key}
            className={`rise-in relative overflow-hidden rounded-xl ${current ? 'bg-white/[0.05] ring-1 ring-white/10' : ''}`}
            style={{ animationDelay: `${Math.min(i, 20) * 25}ms` }}
          >
            {current ? (
              <span
                className="absolute inset-y-0 left-0 origin-left"
                style={{ width: '100%', transform: `scaleX(${progress})`, background: `linear-gradient(90deg, ${meta.color}00, ${meta.color}1f)`, transition: 'transform 1s linear' }}
                aria-hidden="true"
              />
            ) : null}
            {editable ? (
              <button
                className="flex w-full rounded-xl px-2 py-2 text-left transition-colors hover:bg-white/[0.04]"
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
