import { motion } from 'motion/react';
import { ArrowUpRight, Check, Star } from 'lucide-react';
import { PILLARS, totalVotes } from '../game/identity';
import type { Pillar } from '../game/types';
import { useApp } from '../store/app';
import { usePillarDay } from './hooks';
import { EASE_OUT } from './fx/motion';
import { PILLAR } from './theme';

/** Small progress ring (0..1). */
export function MiniRing({ value, color, size = 36, stroke = 3, children }: { value: number; color: string; size?: number; stroke?: number; children?: React.ReactNode }) {
  const r = (size - stroke) / 2;
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#fff" strokeOpacity={0.08} strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          initial={false}
          animate={{ pathLength: Math.max(0.0001, Math.min(1, value)), opacity: value > 0 ? 1 : 0 }}
          transition={{ duration: 1, ease: EASE_OUT }}
          style={{ filter: `drop-shadow(0 0 4px ${color}88)` }}
        />
      </svg>
      {children}
    </span>
  );
}

/** "Every block is a vote": today's actions per identity pillar, framed by the North Star. */
export function NorthStarCard({ date }: { date: string }) {
  const north = useApp((s) => s.settings.northStar);
  const scores = usePillarDay(date);
  const connected = useApp((s) => s.days.find((d) => d.date === date)?.connected ?? false);
  const toggleConnected = useApp((s) => s.toggleConnected);
  const setTab = useApp((s) => s.setTab);
  const votes = totalVotes(scores);

  return (
    <section className="card p-5" aria-labelledby="ns-title">
      <div className="flex items-center justify-between">
        <h2 id="ns-title" className="label inline-flex items-center gap-1.5">
          <Star className="h-3.5 w-3.5" strokeWidth={1.75} /> North Star · {north.year}
        </h2>
        <span className="font-mono text-[11px] text-zinc-400 tabular">
          <span className="text-zinc-100">{votes}</span> votes today
        </span>
      </div>
      <p className="serif mt-2 text-lg italic leading-snug text-zinc-300">Every block is a vote for the person you’re becoming.</p>

      <ul className="mt-4 space-y-1">
        {PILLARS.map((p: Pillar, i) => {
          const meta = PILLAR[p];
          const s = scores[p];
          const Icon = meta.icon;
          const value = s.possible ? s.earned / s.possible : 0;
          return (
            <motion.li
              key={p}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 * i, duration: 0.5, ease: EASE_OUT }}
              className="group flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-white/[0.03]"
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                style={{ background: `${meta.color}14`, color: meta.color, boxShadow: `inset 0 0 0 1px ${meta.color}26` }}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-2">
                  <span className="text-sm font-medium text-zinc-100">{meta.become}</span>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">{meta.label}</span>
                </span>
                <span className="block truncate text-xs text-zinc-500">{north.statements[p]}</span>
              </span>
              {p === 'love' ? (
                <button
                  onClick={() => void toggleConnected(date)}
                  aria-pressed={connected}
                  className={`flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-medium transition-all active:scale-95 ${
                    connected ? 'border-transparent text-ink-950' : 'border-white/10 text-zinc-400 hover:border-white/20 hover:text-zinc-200'
                  }`}
                  style={connected ? { background: meta.color, boxShadow: `0 0 18px -4px ${meta.color}` } : undefined}
                  title="Called family, checked on a friend, showed up for someone"
                >
                  {connected ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : null}
                  {connected ? 'Showed up' : 'Showed up?'}
                </button>
              ) : (
                <MiniRing value={value} color={meta.color}>
                  <span className="font-mono text-[10px] text-zinc-300 tabular">{s.possible ? s.votes : '–'}</span>
                </MiniRing>
              )}
            </motion.li>
          );
        })}
      </ul>

      <button
        onClick={() => setTab('growth')}
        className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-zinc-400 transition-colors hover:text-[color:var(--accent)]"
      >
        See how you’re growing <ArrowUpRight className="h-3.5 w-3.5" />
      </button>
    </section>
  );
}
