import { motion } from 'motion/react';
import { Check } from 'lucide-react';
import { PRAYER_LABEL } from '../alerts/engine';
import type { DayEval } from '../game/days';
import { useApp } from '../store/app';
import { EASE_OUT } from './fx/motion';
import { MiniRing } from './NorthStar';

/** Bad-day mode: only the Minimum viable day checklist (FR6.3). */
export function BadDayPanel({ day }: { day: DayEval }) {
  const togglePrayer = useApp((s) => s.togglePrayer);
  const c = day.checklist;
  const items = [
    { label: 'One deep-work sprint (Done or Partial)', ok: c.deepWork },
    { label: 'One application or supervisor email logged', ok: c.outreach },
    { label: 'Exercise (Done or Partial)', ok: c.exercise },
  ];
  const doneCount = [c.allPrayers, c.deepWork, c.outreach, c.exercise].filter(Boolean).length;
  return (
    <section className="card p-5" aria-labelledby="mvd-title">
      <div className="mb-2 flex items-center justify-between">
        <h2 id="mvd-title" className="text-lg font-semibold tracking-tight text-white">
          Minimum viable day
        </h2>
        <MiniRing value={doneCount / 4} color="#fbbf24" size={40}>
          <span className="font-mono text-[11px] text-zinc-200 tabular">{doneCount}/4</span>
        </MiniRing>
      </div>
      <p className="serif mb-4 text-[17px] italic leading-snug text-zinc-400">
        Rough day? Hit these four and every streak survives (except exercise if you skip it). Allah does not burden a soul beyond what it can bear.
      </p>
      <div className="mb-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-200">
          <Mark ok={c.allPrayers} /> All prayers
        </div>
        <div className="flex flex-wrap gap-2">
          {c.prayers.map((p) => (
            <motion.button
              key={p.name}
              whileTap={{ scale: 0.94 }}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                p.prayed ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200' : 'border-white/10 text-zinc-400 hover:border-white/20 hover:text-zinc-200'
              }`}
              aria-pressed={p.prayed}
              onClick={() => void togglePrayer(day.date, p.name)}
            >
              <span aria-hidden="true">{p.prayed ? '✓' : '○'}</span> {PRAYER_LABEL[p.name]}
            </motion.button>
          ))}
        </div>
      </div>
      <ul className="space-y-2.5">
        {items.map((it) => (
          <li key={it.label} className={`flex items-center gap-2.5 text-sm ${it.ok ? 'text-zinc-200' : 'text-zinc-400'}`}>
            <Mark ok={it.ok} />
            {it.label}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-zinc-600">The last three tick themselves when you check in those blocks.</p>
    </section>
  );
}

function Mark({ ok }: { ok: boolean }) {
  return (
    <motion.span
      initial={false}
      animate={{ scale: ok ? [1, 1.25, 1] : 1 }}
      transition={{ duration: 0.4, ease: EASE_OUT }}
      className={`inline-flex h-5 w-5 items-center justify-center rounded-full ${ok ? 'bg-emerald-400 text-ink-950' : 'border border-white/20 text-transparent'}`}
    >
      <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
      <span className="sr-only">{ok ? 'done' : 'not yet'}</span>
    </motion.span>
  );
}
