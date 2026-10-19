import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Maximize2, ShieldHalf, TriangleAlert } from 'lucide-react';
import { visualState } from '../alerts/engine';
import { fmtCountdown, fmtTime } from '../schedule/time';
import { useApp } from '../store/app';
import { BadDayPanel } from './BadDayPanel';
import { EASE_OUT } from './fx/motion';
import { Rolling } from './fx/Rolling';
import { fmtDur, fmtIn, greeting, hijri } from './format';
import { useDayBlocks, useGame, useHud } from './hooks';
import { NorthStarCard } from './NorthStar';
import { PrayerStrip } from './PrayerStrip';
import { Ring } from './Ring';
import { Timeline } from './Timeline';
import { CATEGORY } from './theme';
import { WisdomCard } from './Wisdom';
import { kl } from '../schedule/time';

const STATE_TEXT = {
  normal: null,
  amber: 'Wrapping up soon',
  'amber-pulse': 'Five minutes — start wrapping up',
  red: 'Final minute',
} as const;

/** Title that reveals word by word whenever the block changes. */
function BlockTitle({ id, title }: { id: string; title: string }) {
  const words = title.split(' ');
  return (
    <h1 id="now-title" className="text-balance text-[2rem] font-semibold leading-[1.05] tracking-[-0.03em] text-white sm:text-5xl">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={id} className="inline" initial="hidden" animate="show" exit="hidden" variants={{ show: { transition: { staggerChildren: 0.045 } } }}>
          {words.map((w, i) => (
            <motion.span
              key={i}
              className="inline-block"
              variants={{
                hidden: { opacity: 0, y: '0.35em', filter: 'blur(8px)' },
                show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.6, ease: EASE_OUT } },
              }}
            >
              {w}
              {i < words.length - 1 ? ' ' : ''}
            </motion.span>
          ))}
        </motion.span>
      </AnimatePresence>
    </h1>
  );
}

export function NowScreen() {
  const hud = useHud();
  const game = useGame();
  const blocks = useDayBlocks(hud.today);
  const thresholds = useApp((s) => s.settings.thresholdsByCategory);
  const name = useApp((s) => s.settings.northStar.name);
  const days = useApp((s) => s.days);
  const setBadDay = useApp((s) => s.setBadDay);
  const setKiosk = useApp((s) => s.setKiosk);
  const badDay = days.find((d) => d.date === hud.today)?.badDayMode ?? false;

  const { current, next, sprint } = hud;
  const meta = CATEGORY[current.category];
  const CatIcon = meta.icon;
  const NextIcon = CATEGORY[next.category].icon;
  const state = visualState(hud.remainingMs, thresholds[current.category]);
  const sprintProgress = sprint ? 1 - sprint.remainingMs / (sprint.end - sprint.start) : null;
  const idx = blocks.findIndex((b) => b.key === current.key);
  const dayDone = blocks.length ? blocks.filter((b) => b.end <= hud.now).length / blocks.length : 0;
  const t = kl(hud.now);

  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 pb-10 pt-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-10 lg:pt-8">
      <section aria-labelledby="now-title" className="flex flex-col gap-5">
        {/* Greeting + date strip */}
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
          <p className="serif text-2xl italic text-zinc-300 sm:text-[1.7rem]">
            {greeting(hud.now)}
            {name ? `, ${name}` : ''}.
          </p>
          <p className="font-mono text-[11px] text-zinc-500">
            {t.toFormat('cccc d LLL')} · {hijri(hud.now)}
          </p>
        </div>

        {/* Day progress */}
        <div className="flex items-center gap-3" aria-hidden="true">
          <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{ width: `${dayDone * 100}%`, background: 'linear-gradient(90deg, transparent, var(--accent))', transition: 'width 1s linear' }}
            />
          </div>
          <span className="font-mono text-[10.5px] text-zinc-500 tabular">{Math.round(dayDone * 100)}% of today</span>
        </div>

        <div className="mt-2 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] py-1 pl-1 pr-3 text-[13px] font-medium text-zinc-300">
            <span className="flex h-6 w-6 items-center justify-center rounded-full" style={{ background: meta.color, color: '#05060a' }}>
              <CatIcon className="h-3.5 w-3.5" strokeWidth={2.25} />
            </span>
            {meta.label}
            {idx >= 0 ? <span className="font-mono text-[10.5px] text-zinc-500 tabular">{`${idx + 1}/${blocks.length}`}</span> : null}
          </div>
          <BlockTitle id={current.key} title={current.title} />
          <p className="mt-2 font-mono text-sm text-zinc-400 tabular">
            {fmtTime(current.start)} – {fmtTime(current.end)}
          </p>
        </div>

        <Ring progress={hud.progress} color={meta.color} state={state} size={440} stroke={14} subProgress={sprintProgress}>
          <div className={`countdown ${hud.remainingMs >= 3_600_000 ? 'countdown-long' : ''}`} role="timer" aria-live="off" aria-label={`${fmtCountdown(hud.remainingMs)} remaining`}>
            <Rolling text={fmtCountdown(hud.remainingMs)} />
          </div>
          <div className="mt-3 font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-500">remaining</div>
          {sprint ? (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 font-mono text-[12.5px] text-zinc-200 tabular">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: sprint.kind === 'sprint' ? meta.color : '#94a3b8' }} aria-hidden="true" />
              {sprint.kind === 'sprint' ? `Sprint ${sprint.sprintNumber}/${sprint.sprintCount}` : 'Break'} · {fmtCountdown(sprint.remainingMs)}
            </div>
          ) : null}
        </Ring>

        <p className="min-h-[1.5rem] text-center text-sm font-medium" aria-live="polite">
          <AnimatePresence>
            {STATE_TEXT[state] ? (
              <motion.span
                key={state}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`inline-flex items-center gap-1.5 ${state === 'red' ? 'text-rose-400' : 'text-amber-300'}`}
              >
                <TriangleAlert className="h-4 w-4" /> {STATE_TEXT[state]}
              </motion.span>
            ) : null}
          </AnimatePresence>
        </p>

        <div className="card group flex items-center gap-3 px-4 py-3.5">
          <span className="label shrink-0">Next</span>
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
            style={{ background: `${CATEGORY[next.category].color}1a`, color: CATEGORY[next.category].color }}
            aria-hidden="true"
          >
            <NextIcon className="h-3.5 w-3.5" strokeWidth={2} />
          </span>
          <span className="min-w-0 flex-1 truncate font-medium text-zinc-100">{next.title}</span>
          <span className="hidden shrink-0 text-xs text-zinc-500 sm:inline">{fmtIn(next.start - hud.now)}</span>
          <span className="shrink-0 font-mono text-sm text-zinc-300 tabular">{fmtTime(next.start)}</span>
          <ArrowRight className="h-4 w-4 shrink-0 text-zinc-600 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          <button className="btn" onClick={() => setKiosk(true)}>
            <Maximize2 className="h-4 w-4" strokeWidth={1.75} /> Focus mode
            <span className="kbd ml-1 hidden sm:inline-flex">F</span>
          </button>
          <button className={`btn ${badDay ? '!border-amber-300/40 !text-amber-200' : ''}`} aria-pressed={badDay} onClick={() => void setBadDay(hud.today, !badDay)}>
            <ShieldHalf className="h-4 w-4" strokeWidth={1.75} /> {badDay ? 'Exit bad-day mode' : 'Bad day'}
          </button>
        </div>
        <p className="-mt-2 text-center text-xs text-zinc-600">
          {fmtDur(hud.elapsedMs)} in · {game.today.doneOrPartial}/{game.today.scheduled.length} blocks checked in today
        </p>
      </section>

      <aside aria-label={badDay ? 'Minimum viable day' : 'Today'} className="flex flex-col gap-4">
        <WisdomCard category={current.category} />
        {badDay ? <BadDayPanel day={game.today} /> : <NorthStarCard date={hud.today} />}
        <PrayerStrip blocks={blocks} now={hud.now} date={hud.today} />
        {!badDay ? (
          <div className="card p-2">
            <div className="flex items-center justify-between px-2 pb-1 pt-2">
              <h2 className="label">Today</h2>
              <span className="font-mono text-[11px] text-zinc-500 tabular">
                {game.today.doneOrPartial}/{game.today.scheduled.length} checked in
              </span>
            </div>
            <Timeline blocks={blocks} now={hud.now} currentKey={hud.current.key} compact />
          </div>
        ) : null}
      </aside>
    </div>
  );
}
