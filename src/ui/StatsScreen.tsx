import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { evaluateDay } from '../game/days';
import { QUEST_KEYS, QUEST_LABEL, recentWeeks, weekNumbers, type QuestKey } from '../game/quests';
import { ACHIEVEMENTS, firstDate } from '../game/summary';
import { STREAKS, STREAK_LABEL } from '../game/streaks';
import { addDays, fromDate, weekStart } from '../schedule/time';
import type { Category } from '../schedule/types';
import { useApp, useResolver } from '../store/app';
import { useGame, useToday } from './hooks';
import { CATEGORY } from './theme';

const QUEST_COLOR: Record<QuestKey, string> = {
  applications: '#F4511E',
  supervisorEmails: '#E67C73',
  deepWorkHours: '#3F51B5',
  exerciseDays: '#D50000',
};

export default function StatsScreen() {
  const today = useToday();
  const game = useGame();
  const checkIns = useApp((s) => s.checkIns);
  const prayers = useApp((s) => s.prayers);
  const targets = useApp((s) => s.settings.questTargets);
  const achievements = useApp((s) => s.achievements);
  const resolve = useResolver();
  const [filter, setFilter] = useState<Category | 'all'>('all');

  const weeks = useMemo(
    () =>
      recentWeeks(today, 8).map((w) => ({
        ...weekNumbers(w, checkIns),
        label: fromDate(w).toFormat('d LLL'),
      })),
    [today, checkIns],
  );

  // 8 weeks × 7 days adherence grid.
  const heat = useMemo(() => {
    const start = addDays(weekStart(today), -7 * 7);
    const first = firstDate({ checkIns, prayers, days: [] });
    return Array.from({ length: 56 }, (_, i) => {
      const date = addDays(start, i);
      if (date > today) return { date, value: null as number | null, future: true };
      if (!first || date < first) return { date, value: null as number | null, future: false };
      const ev = evaluateDay(date, resolve(date), checkIns, prayers);
      return { date, value: ev.answered === 0 && date !== today ? 0 : ev.adherence, future: false };
    });
  }, [today, checkIns, prayers, resolve]);

  const notes = useMemo(
    () =>
      checkIns
        .filter((c) => c.note && (filter === 'all' || c.category === filter))
        .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)),
    [checkIns, filter],
  );
  const noteCats = [...new Set(checkIns.filter((c) => c.note).map((c) => c.category as Category))];
  const unlocked = new Map(achievements.map((a) => [a.id, a.unlockedAt]));

  return (
    <div className="mx-auto grid max-w-6xl gap-4 px-4 py-5 lg:grid-cols-2">
      <section className="card p-4 lg:col-span-2" aria-labelledby="quests-title">
        <div className="mb-3 flex items-baseline justify-between">
          <h1 id="quests-title" className="text-lg font-bold">
            This week’s quests
          </h1>
          <span className="text-sm text-slate-500 dark:text-slate-400">Resets Monday 00:00 · +100 XP each</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {QUEST_KEYS.map((k) => {
            const v = game.week[k];
            const t = targets[k];
            const pct = t > 0 ? Math.min(1, v / t) : 0;
            const done = game.week.completed.includes(k);
            return (
              <div key={k}>
                <div className="mb-1 flex items-baseline justify-between text-sm">
                  <span className="font-medium">{QUEST_LABEL[k]}</span>
                  <span className="tabular">
                    <strong>{Math.round(v * 10) / 10}</strong> / {t} {done ? <span className="text-emerald-700 dark:text-emerald-400">✓ done</span> : null}
                  </span>
                </div>
                <div
                  className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
                  role="progressbar"
                  aria-label={QUEST_LABEL[k]}
                  aria-valuemin={0}
                  aria-valuemax={t}
                  aria-valuenow={v}
                >
                  <div className="h-full origin-left rounded-full" style={{ background: QUEST_COLOR[k], transform: `scaleX(${pct})` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {QUEST_KEYS.map((k) => (
        <section key={k} className="card p-4" aria-label={`${QUEST_LABEL[k]}, last 8 weeks`}>
          <h2 className="label mb-2">{QUEST_LABEL[k]} · 8 weeks</h2>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeks} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-200 dark:text-slate-800" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'currentColor' }} className="text-slate-500" tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'currentColor' }} className="text-slate-500" tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(127,127,127,0.12)' }}
                  contentStyle={{ borderRadius: 12, fontSize: 12 }}
                  formatter={(v) => [String(v), QUEST_LABEL[k]]}
                  labelFormatter={(l) => `Week of ${l}`}
                />
                <ReferenceLine y={targets[k]} stroke="#16a34a" strokeDasharray="4 4" label={{ value: `target ${targets[k]}`, fontSize: 10, fill: '#16a34a', position: 'insideTopRight' }} />
                <Bar dataKey={k} fill={QUEST_COLOR[k]} radius={[6, 6, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      ))}

      <section className="card p-4" aria-labelledby="heat-title">
        <h2 id="heat-title" className="label mb-3">
          Daily adherence · 8 weeks
        </h2>
        <div className="flex gap-2">
          <div className="grid grid-rows-7 gap-1 pt-0 text-[10px] text-slate-500" aria-hidden="true">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
              <span key={i} className="flex h-6 items-center">
                {d}
              </span>
            ))}
          </div>
          <div className="grid flex-1 grid-flow-col grid-rows-7 gap-1" role="list" aria-label="Share of check-ins Done or Partial per day">
            {heat.map((h) => (
              <div
                key={h.date}
                role="listitem"
                title={h.future ? h.date : `${h.date}: ${h.value == null ? 'no data' : `${Math.round(h.value * 100)}%`}`}
                aria-label={h.future ? `${h.date} future` : `${h.date} ${h.value == null ? 'none' : `${Math.round(h.value * 100)} percent`}`}
                className="flex h-6 items-center justify-center rounded text-[9px] font-semibold tabular"
                style={{
                  background: h.future ? 'transparent' : h.value == null ? 'rgba(127,127,127,0.15)' : `rgba(51,182,121,${0.12 + h.value * 0.88})`,
                  color: h.value != null && h.value > 0.6 ? 'white' : undefined,
                  border: h.date === today ? '2px solid var(--accent)' : undefined,
                }}
              >
                {h.future || h.value == null ? '' : Math.round(h.value * 100)}
              </div>
            ))}
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Numbers are % of check-ins Done or Partial.</p>
      </section>

      <section className="card p-4" aria-labelledby="streaks-title">
        <h2 id="streaks-title" className="label mb-3">
          Streaks & totals
        </h2>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          {STREAKS.map((s) => (
            <div key={s}>
              <dt className="text-slate-500 dark:text-slate-400">{STREAK_LABEL[s]}</dt>
              <dd className="text-xl font-bold tabular">
                {game.streaks[s].current} <span className="text-xs font-normal text-slate-500">best {game.streaks[s].best}</span>
              </dd>
            </div>
          ))}
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Total XP</dt>
            <dd className="text-xl font-bold tabular">{game.totalXp}</dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Full / MVD days</dt>
            <dd className="text-xl font-bold tabular">
              {game.dayTypeCounts.full} / {game.dayTypeCounts.mvd}
            </dd>
          </div>
        </dl>
      </section>

      <section className="card p-4 lg:col-span-2" aria-labelledby="ach-title">
        <h2 id="ach-title" className="label mb-3">
          Achievements · {unlocked.size}/{ACHIEVEMENTS.length}
        </h2>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {ACHIEVEMENTS.map((a) => {
            const at = unlocked.get(a.id);
            return (
              <li
                key={a.id}
                className={`flex items-center gap-3 rounded-xl border p-3 ${at ? 'border-amber-400 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30' : 'border-slate-200 opacity-60 dark:border-slate-800'}`}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-lg dark:bg-slate-800" aria-hidden="true">
                  {a.icon}
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold">{a.title}</span>
                  <span className="block text-xs text-slate-600 dark:text-slate-300">{a.description}</span>
                  <span className="block text-[11px] text-slate-500">{at ? `Unlocked ${at.slice(0, 10)}` : 'Locked'}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card p-4 lg:col-span-2" aria-labelledby="notes-title">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 id="notes-title" className="label">
            What I shipped
          </h2>
          <label className="flex items-center gap-2 text-sm">
            <span className="sr-only">Filter by category</span>
            <select className="input !w-auto !py-1" value={filter} onChange={(e) => setFilter(e.target.value as Category | 'all')}>
              <option value="all">All categories</option>
              {noteCats.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY[c]?.label ?? c}
                </option>
              ))}
            </select>
          </label>
        </div>
        {notes.length === 0 ? (
          <p className="text-sm text-slate-500">No notes yet. Add one when you check in a block.</p>
        ) : (
          <ul className="max-h-96 divide-y divide-slate-100 overflow-auto dark:divide-slate-800">
            {notes.map((n) => (
              <li key={n.id} className="flex gap-3 py-2 text-sm">
                <span className="w-20 shrink-0 text-xs text-slate-500 tabular">{n.date}</span>
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: CATEGORY[n.category as Category]?.color }} aria-hidden="true" />
                <span className="flex-1">{n.note}</span>
                <span className="shrink-0 text-xs text-slate-500">{CATEGORY[n.category as Category]?.label}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
