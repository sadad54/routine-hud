import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import { useMemo, useState } from 'react';
import { PRAYER_LABEL } from '../alerts/engine';
import { evaluateDay } from '../game/days';
import { isEditable } from '../game/checkin';
import { PILLARS } from '../game/identity';
import { STREAKS, STREAK_LABEL } from '../game/streaks';
import { addDays, fmtTime, fromDate } from '../schedule/time';
import { useApp } from '../store/app';
import { EASE_OUT, spring } from './fx/motion';
import { hijri } from './format';
import { useDayBlocks, useGame, useHud, usePillarDay, useToday } from './hooks';
import { PILLAR } from './theme';
import { Timeline } from './Timeline';

export function TodayScreen() {
  const today = useToday();
  const hud = useHud();
  const now = hud.now;
  const [offset, setOffset] = useState(0);
  const date = addDays(today, offset);
  const blocks = useDayBlocks(date);
  const checkIns = useApp((s) => s.checkIns);
  const prayers = useApp((s) => s.prayers);
  const togglePrayer = useApp((s) => s.togglePrayer);
  const game = useGame();
  const pillars = usePillarDay(date);
  const ev = useMemo(() => evaluateDay(date, blocks, checkIns, prayers), [date, blocks, checkIns, prayers]);
  const editable = isEditable(date, now);
  const label = offset === 0 ? 'Today' : offset === -1 ? 'Yesterday' : fromDate(date).toFormat('ccc d LLL');
  const dayMs = fromDate(date).toMillis() + 12 * 3_600_000;

  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 pb-10 pt-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:pt-8">
      <section className="card p-3 sm:p-4" aria-labelledby="day-title">
        <div className="mb-3 flex items-center justify-between gap-2 px-1">
          <button className="btn !p-2" onClick={() => setOffset(offset - 1)} aria-label="Previous day">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={date}
              className="text-center"
              initial={{ opacity: 0, y: 6, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -6, filter: 'blur(4px)' }}
              transition={{ duration: 0.3, ease: EASE_OUT }}
            >
              <h1 id="day-title" className="text-xl font-semibold tracking-tight text-white">
                {label}
              </h1>
              <p className="font-mono text-[11px] text-zinc-500">
                {fromDate(date).toFormat('cccc, d LLLL yyyy')} · {hijri(dayMs)}
                {!editable ? (
                  <span className="ml-1 inline-flex items-center gap-1">
                    · <Lock className="h-3 w-3" /> locked
                  </span>
                ) : null}
              </p>
            </motion.div>
          </AnimatePresence>
          <button className="btn !p-2" onClick={() => setOffset(Math.min(0, offset + 1))} disabled={offset === 0} aria-label="Next day">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <Timeline blocks={blocks} now={now} currentKey={offset === 0 ? hud.current.key : undefined} detailed />
      </section>

      <aside className="flex flex-col gap-4">
        <section className="card p-5" aria-labelledby="prayer-title">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="prayer-title" className="label">
              Prayer checklist
            </h2>
            <span className="font-mono text-[11px] text-zinc-500 tabular">
              {ev.checklist.prayers.filter((p) => p.prayed).length}/{ev.checklist.prayers.length}
            </span>
          </div>
          <ul className="space-y-2">
            {ev.checklist.prayers.map((p) => {
              const b = blocks.find((x) => x.prayer === p.name);
              return (
                <li key={p.name}>
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors disabled:opacity-50 ${
                      p.prayed ? 'border-emerald-400/30 bg-emerald-400/[0.08]' : 'border-white/[0.08] hover:border-white/15 hover:bg-white/[0.03]'
                    }`}
                    aria-pressed={p.prayed}
                    disabled={!editable}
                    onClick={() => void togglePrayer(date, p.name)}
                  >
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full transition-colors ${p.prayed ? 'bg-emerald-400' : 'border border-white/20'}`}
                      aria-hidden="true"
                    >
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5">
                        <motion.path
                          d="M5 12.5l4.5 4.5L19 7.5"
                          fill="none"
                          stroke="#05060a"
                          strokeWidth={3}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          initial={false}
                          animate={{ pathLength: p.prayed ? 1 : 0 }}
                          transition={{ duration: 0.35, ease: EASE_OUT }}
                        />
                      </svg>
                    </span>
                    <span className={`flex-1 font-medium ${p.prayed ? 'text-emerald-100' : 'text-zinc-200'}`}>{PRAYER_LABEL[p.name]}</span>
                    <span className="font-mono text-sm text-zinc-500 tabular">{b ? fmtTime(b.start) : ''}</span>
                    <span className="sr-only">{p.prayed ? 'prayed' : 'not yet'}</span>
                  </motion.button>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="card p-5" aria-labelledby="pillars-title">
          <h2 id="pillars-title" className="label mb-4">
            Votes by pillar
          </h2>
          <ul className="space-y-3">
            {PILLARS.map((p) => {
              const s = pillars[p];
              const meta = PILLAR[p];
              const v = s.possible ? s.earned / s.possible : 0;
              return (
                <li key={p}>
                  <div className="mb-1 flex items-baseline justify-between text-sm">
                    <span className="text-zinc-300">{meta.become}</span>
                    <span className="font-mono text-[11px] text-zinc-500 tabular">{s.possible ? `${s.votes} / ${s.possible}` : '—'}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                    <motion.div
                      className="h-full origin-left rounded-full"
                      style={{ background: meta.color, boxShadow: `0 0 10px ${meta.color}` }}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: v }}
                      transition={spring}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="card p-5" aria-labelledby="day-summary">
          <h2 id="day-summary" className="label mb-4">
            Day summary
          </h2>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-zinc-500">Checked in</dt>
              <dd className="font-mono text-2xl font-light text-white tabular">
                {ev.doneOrPartial}/{ev.scheduled.length}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Day type</dt>
              <dd className={`text-lg font-semibold ${ev.dayType === 'full' ? 'text-emerald-300' : ev.dayType === 'mvd' ? 'text-amber-300' : 'text-zinc-500'}`}>
                {ev.dayType === 'full' ? 'Full day' : ev.dayType === 'mvd' ? 'Minimum viable' : '—'}
              </dd>
            </div>
            {offset === 0
              ? STREAKS.map((s) => (
                  <div key={s}>
                    <dt className="text-zinc-500">{STREAK_LABEL[s]} streak</dt>
                    <dd className="font-mono text-2xl font-light text-white tabular">
                      {game.streaks[s].current}
                      <span className="ml-1.5 text-[11px] text-zinc-500">best {game.streaks[s].best}</span>
                    </dd>
                  </div>
                ))
              : null}
          </dl>
        </section>
      </aside>
    </div>
  );
}
