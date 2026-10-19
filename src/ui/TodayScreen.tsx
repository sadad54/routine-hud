import { useMemo, useState } from 'react';
import { PRAYER_LABEL } from '../alerts/engine';
import { evaluateDay } from '../game/days';
import { isEditable } from '../game/checkin';
import { STREAKS, STREAK_LABEL } from '../game/streaks';
import { addDays, fmtTime, fromDate } from '../schedule/time';
import { useApp } from '../store/app';
import { useDayBlocks, useGame, useHud, useToday } from './hooks';
import { Icon } from './Icon';
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
  const ev = useMemo(() => evaluateDay(date, blocks, checkIns, prayers), [date, blocks, checkIns, prayers]);
  const editable = isEditable(date, now);
  const label = offset === 0 ? 'Today' : offset === -1 ? 'Yesterday' : fromDate(date).toFormat('ccc d LLL');

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section className="card p-3" aria-labelledby="day-title">
        <div className="mb-2 flex items-center justify-between gap-2 px-1">
          <button className="btn !p-2" onClick={() => setOffset(offset - 1)} aria-label="Previous day">
            <Icon name="chevronLeft" className="h-4 w-4" />
          </button>
          <div className="text-center">
            <h1 id="day-title" className="text-lg font-bold">
              {label}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {fromDate(date).toFormat('cccc, d LLLL yyyy')}
              {!editable ? ' · locked' : ''}
            </p>
          </div>
          <button className="btn !p-2" onClick={() => setOffset(Math.min(0, offset + 1))} disabled={offset === 0} aria-label="Next day">
            <Icon name="chevronRight" className="h-4 w-4" />
          </button>
        </div>
        <Timeline blocks={blocks} now={now} currentKey={offset === 0 ? hud.current.key : undefined} detailed />
      </section>

      <aside className="flex flex-col gap-4">
        <section className="card p-4" aria-labelledby="prayer-title">
          <h2 id="prayer-title" className="label mb-3">
            Prayer checklist
          </h2>
          <ul className="space-y-2">
            {ev.checklist.prayers.map((p) => {
              const b = blocks.find((x) => x.prayer === p.name);
              return (
                <li key={p.name}>
                  <button
                    className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                      p.prayed
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40'
                        : 'border-slate-200 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800'
                    }`}
                    aria-pressed={p.prayed}
                    disabled={!editable}
                    onClick={() => void togglePrayer(date, p.name)}
                  >
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-sm font-bold ${
                        p.prayed ? 'bg-emerald-600 text-white' : 'border-2 border-slate-300 dark:border-slate-600'
                      }`}
                      aria-hidden="true"
                    >
                      {p.prayed ? '✓' : ''}
                    </span>
                    <span className="flex-1 font-medium">{PRAYER_LABEL[p.name]}</span>
                    <span className="text-sm text-slate-500 tabular dark:text-slate-400">{b ? fmtTime(b.start) : ''}</span>
                    <span className="sr-only">{p.prayed ? 'prayed' : 'not yet'}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="card p-4" aria-labelledby="day-summary">
          <h2 id="day-summary" className="label mb-3">
            Day summary
          </h2>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-slate-500 dark:text-slate-400">Checked in</dt>
              <dd className="text-lg font-bold tabular">
                {ev.doneOrPartial}/{ev.scheduled.length}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500 dark:text-slate-400">Day type</dt>
              <dd className="text-lg font-bold">{ev.dayType === 'full' ? 'Full day' : ev.dayType === 'mvd' ? 'Minimum viable' : '—'}</dd>
            </div>
            {offset === 0
              ? STREAKS.map((s) => (
                  <div key={s}>
                    <dt className="text-slate-500 dark:text-slate-400">{STREAK_LABEL[s]} streak</dt>
                    <dd className="text-lg font-bold tabular">
                      {game.streaks[s].current}
                      <span className="ml-1 text-xs font-normal text-slate-500">best {game.streaks[s].best}</span>
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
