import { PRAYER_LABEL } from '../alerts/engine';
import { checklistPrayers } from '../schedule/resolve';
import { fmtTime } from '../schedule/time';
import type { ResolvedBlock } from '../schedule/types';
import { prayerSourceFor, useApp } from '../store/app';
import { fmtIn } from './format';

const W = 320;
const H = 74;
const PAD = 14;

/** Point on the sun's arc for t in 0..1. */
function arc(t: number): [number, number] {
  return [PAD + t * (W - 2 * PAD), H - 8 - Math.sin(Math.PI * t) * (H - 22)];
}
const PATH = Array.from({ length: 49 }, (_, i) => arc(i / 48))
  .map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`)
  .join(' ');

/** Today's prayers on the sun's path from Fajr to Isha; the next one is highlighted. */
export function PrayerStrip({ blocks, now, date }: { blocks: ResolvedBlock[]; now: number; date: string }) {
  useApp((s) => s.prayerMonths);
  const source = prayerSourceFor(date);
  const names = checklistPrayers(blocks);
  const times = names.map((n) => ({ n, b: blocks.find((b) => b.prayer === n)! }));
  const nextIdx = times.findIndex((t) => t.b.start > now);
  if (!times.length) return null;

  const from = times[0]!.b.start - 45 * 60_000;
  const to = times[times.length - 1]!.b.start + 45 * 60_000;
  const tOf = (ms: number) => Math.max(0, Math.min(1, (ms - from) / (to - from)));
  const tNow = tOf(now);
  const [nx, ny] = arc(tNow);
  const next = nextIdx >= 0 ? times[nextIdx] : null;

  return (
    <section className="card px-4 pb-3 pt-4" aria-label="Prayer times">
      <div className="flex items-center justify-between">
        <span className="label">Prayer times</span>
        <span className="font-mono text-[10.5px] text-zinc-500">
          {source === 'live' ? 'JAKIM · live' : source === 'cache' ? 'JAKIM · cached' : 'Fixed times (offline)'}
        </span>
      </div>
      {next ? (
        <p className="mt-1 text-sm text-zinc-400">
          <span className="font-medium text-emerald-300">{PRAYER_LABEL[next.n]}</span> {fmtIn(next.b.start - now)}
        </p>
      ) : null}

      <svg viewBox={`0 0 ${W} ${H}`} className="mt-1 w-full overflow-visible" aria-hidden="true">
        <defs>
          <linearGradient id="sunpath" x1="0" x2="1">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
        </defs>
        <line x1={0} x2={W} y1={H - 8} y2={H - 8} stroke="#fff" strokeOpacity={0.06} />
        <path d={PATH} fill="none" stroke="#fff" strokeOpacity={0.1} strokeWidth={1.5} strokeDasharray="2 5" />
        <path
          d={PATH}
          fill="none"
          stroke="url(#sunpath)"
          strokeWidth={2}
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={`${tNow} 1`}
          style={{ transition: 'stroke-dasharray 1s linear' }}
        />
        {times.map(({ n, b }, i) => {
          const [x, y] = arc(tOf(b.start));
          const past = b.start <= now;
          return (
            <g key={n}>
              {i === nextIdx ? <circle cx={x} cy={y} r={8} fill="#34d399" opacity={0.18} /> : null}
              <circle cx={x} cy={y} r={3.5} fill={past ? '#34d399' : '#0d1017'} stroke="#34d399" strokeOpacity={past ? 1 : 0.6} strokeWidth={1.5} />
            </g>
          );
        })}
        <circle cx={nx} cy={ny} r={10} fill="#fde68a" opacity={0.18} />
        <circle cx={nx} cy={ny} r={4.5} fill="#fde68a" style={{ filter: 'drop-shadow(0 0 6px #fde68a)' }} />
      </svg>

      <ul className="mt-2 grid grid-cols-5 gap-1 text-center">
        {times.map(({ n, b }, i) => (
          <li
            key={n}
            className={`rounded-lg px-1 py-1.5 transition-colors ${i === nextIdx ? 'bg-emerald-400/10 ring-1 ring-emerald-400/30' : ''}`}
            aria-current={i === nextIdx ? 'time' : undefined}
          >
            <div className={`text-[11px] ${i === nextIdx ? 'text-emerald-300' : 'text-zinc-500'}`}>{PRAYER_LABEL[n]}</div>
            <div className={`font-mono text-[13px] tabular ${i === nextIdx ? 'font-semibold text-zinc-50' : b.end <= now ? 'text-zinc-600' : 'text-zinc-300'}`}>
              {fmtTime(b.start)}
            </div>
            {i === nextIdx ? <span className="sr-only">next prayer</span> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
