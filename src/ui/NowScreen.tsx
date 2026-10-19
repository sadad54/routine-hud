import { visualState } from '../alerts/engine';
import { fmtCountdown, fmtTime } from '../schedule/time';
import { useApp } from '../store/app';
import { BadDayPanel } from './BadDayPanel';
import { useDayBlocks, useGame, useHud } from './hooks';
import { Icon } from './Icon';
import { PrayerStrip } from './PrayerStrip';
import { Ring } from './Ring';
import { Timeline } from './Timeline';
import { CATEGORY } from './theme';

const STATE_TEXT = {
  normal: null,
  amber: 'Wrapping up soon',
  'amber-pulse': 'Five minutes — start wrapping up',
  red: 'Final minute',
} as const;

export function NowScreen() {
  const hud = useHud();
  const game = useGame();
  const blocks = useDayBlocks(hud.today);
  const thresholds = useApp((s) => s.settings.thresholdsByCategory);
  const days = useApp((s) => s.days);
  const setBadDay = useApp((s) => s.setBadDay);
  const setKiosk = useApp((s) => s.setKiosk);
  const badDay = days.find((d) => d.date === hud.today)?.badDayMode ?? false;

  const { current, next, sprint } = hud;
  const meta = CATEGORY[current.category];
  const state = visualState(hud.remainingMs, thresholds[current.category]);
  const sprintProgress = sprint ? 1 - sprint.remainingMs / (sprint.end - sprint.start) : null;

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-5 lg:grid-cols-[minmax(0,1fr)_380px]">
      <section aria-labelledby="now-title" className="flex flex-col gap-4">
        <div className="text-center">
          <div className="mb-1 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium" style={{ background: `${meta.color}1f` }}>
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: meta.color }} aria-hidden="true" />
            {meta.label}
          </div>
          <h1 id="now-title" className="text-balance text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            {current.title}
          </h1>
          <p className="mt-1 text-base text-slate-600 tabular dark:text-slate-300">
            {fmtTime(current.start)} – {fmtTime(current.end)}
          </p>
        </div>

        <Ring progress={hud.progress} color={meta.color} state={state} size={420} stroke={18} subProgress={sprintProgress}>
          <div className="countdown" role="timer" aria-live="off" aria-label={`${fmtCountdown(hud.remainingMs)} remaining`}>
            {fmtCountdown(hud.remainingMs)}
          </div>
          <div className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">remaining</div>
          {sprint ? (
            <div className="mt-3 rounded-full bg-slate-100 px-3 py-1 text-sm font-medium tabular dark:bg-slate-800">
              {sprint.kind === 'sprint' ? `Sprint ${sprint.sprintNumber}/${sprint.sprintCount}` : 'Break'} · {fmtCountdown(sprint.remainingMs)}
            </div>
          ) : null}
        </Ring>

        <p className="min-h-[1.5rem] text-center text-sm font-semibold" aria-live="polite">
          {STATE_TEXT[state] ? (
            <span className={state === 'red' ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'}>
              ⚠ {STATE_TEXT[state]}
            </span>
          ) : null}
        </p>

        <div className="card flex items-center gap-3 px-4 py-3">
          <span className="label shrink-0">Next</span>
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: CATEGORY[next.category].color }} aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate font-medium">{next.title}</span>
          <span className="shrink-0 text-slate-600 tabular dark:text-slate-300">{fmtTime(next.start)}</span>
        </div>

        <PrayerStrip blocks={blocks} now={hud.now} date={hud.today} />

        <div className="flex flex-wrap justify-center gap-2">
          <button className="btn" onClick={() => setKiosk(true)}>
            <Icon name="expand" className="h-4 w-4" /> Kiosk
          </button>
          <button className="btn" aria-pressed={badDay} onClick={() => void setBadDay(hud.today, !badDay)}>
            <Icon name="shield" className="h-4 w-4" /> {badDay ? 'Exit bad-day mode' : 'Bad day'}
          </button>
        </div>
      </section>

      <aside aria-label={badDay ? 'Minimum viable day' : 'Today'} className="flex flex-col gap-4">
        {badDay ? (
          <BadDayPanel day={game.today} />
        ) : (
          <div className="card p-2">
            <div className="flex items-center justify-between px-2 pb-1 pt-2">
              <h2 className="label">Today</h2>
              <span className="text-xs text-slate-500 tabular dark:text-slate-400">
                {game.today.doneOrPartial}/{game.today.scheduled.length} checked in
              </span>
            </div>
            <Timeline blocks={blocks} now={hud.now} currentKey={hud.current.key} compact />
          </div>
        )}
      </aside>
    </div>
  );
}
