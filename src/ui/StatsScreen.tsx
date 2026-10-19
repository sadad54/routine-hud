import { motion } from 'motion/react';
import {
  Award,
  BrainCircuit,
  Check,
  Crown,
  Dumbbell,
  Hexagon,
  Lock,
  Mail,
  MoonStar,
  PenLine,
  ShieldHalf,
  Star,
  Sun,
  Sunrise,
  Target,
  type LucideIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { evaluateDay } from '../game/days';
import { averagePillars, COMPOUND, compoundSeries, dayPillars, PILLARS, rankFor, type PillarScores } from '../game/identity';
import { QUEST_KEYS, QUEST_LABEL, recentWeeks, weekNumbers, type QuestKey } from '../game/quests';
import { ACHIEVEMENTS, firstDate, makeDayEvaluator } from '../game/summary';
import { STREAKS, STREAK_LABEL } from '../game/streaks';
import type { Pillar } from '../game/types';
import { addDays, fromDate, weekStart } from '../schedule/time';
import type { Category } from '../schedule/types';
import { useApp, useResolver } from '../store/app';
import { AnimatedNumber } from './fx/AnimatedNumber';
import { EASE_OUT, fadeUp, stagger } from './fx/motion';
import { useGame, useToday } from './hooks';
import { MiniRing } from './NorthStar';
import { CATEGORY, PILLAR } from './theme';

const QUEST_COLOR: Record<QuestKey, string> = {
  applications: '#fb923c',
  supervisorEmails: '#fdba74',
  deepWorkHours: '#8b9cff',
  exerciseDays: '#fb7185',
};

const ACH_ICON: Record<string, LucideIcon> = {
  first_checkin: Check,
  first_full_day: Sun,
  first_mvd: ShieldHalf,
  wake_7: Sunrise,
  exercise_7: Dumbbell,
  sleep_14: MoonStar,
  fullday_30: Star,
  apps_100: Mail,
  emails_25: PenLine,
  deep_100h: BrainCircuit,
  quests_week: Target,
  quests_4_weeks: Crown,
  level_10: Hexagon,
};

const TICK = { fontSize: 11, fill: '#71717a', fontFamily: 'Geist Mono Variable, monospace' };

export default function GrowthScreen() {
  const today = useToday();
  const game = useGame();
  const checkIns = useApp((s) => s.checkIns);
  const prayers = useApp((s) => s.prayers);
  const days = useApp((s) => s.days);
  const targets = useApp((s) => s.settings.questTargets);
  const north = useApp((s) => s.settings.northStar);
  const achievements = useApp((s) => s.achievements);
  const resolve = useResolver();
  const [filter, setFilter] = useState<Category | 'all'>('all');

  const first = useMemo(() => firstDate({ checkIns, prayers, days }), [checkIns, prayers, days]);

  // Pillar scores per day, from the first record to today.
  const pillarDays = useMemo(() => {
    const m = new Map<string, PillarScores>();
    if (!first) return m;
    const byDate = new Map(days.map((d) => [d.date, d]));
    for (let d = first; d <= today; d = addDays(d, 1)) m.set(d, dayPillars(d, resolve(d), checkIns, prayers, byDate.get(d)));
    return m;
  }, [first, today, resolve, checkIns, prayers, days]);

  const range = (from: string, to: string) => {
    const out: PillarScores[] = [];
    for (let d = from; d <= to; d = addDays(d, 1)) {
      const s = pillarDays.get(d);
      if (s) out.push(s);
    }
    return out;
  };
  const thisWeek = averagePillars(range(addDays(today, -6), today));
  const lastWeek = averagePillars(range(addDays(today, -13), addDays(today, -7)));

  const compound = useMemo(() => {
    const ev = makeDayEvaluator({ checkIns, prayers, days }, resolve);
    return compoundSeries(first, today, (d) => ev(d).dayType);
  }, [first, today, checkIns, prayers, days, resolve]);
  const index = compound.at(-1)?.value ?? 1;
  // Daily growth over the last 7 tracked days, projected over a year.
  const paceDays = Math.min(7, compound.length);
  const paceBase = compound.length > 7 ? compound.at(-8)!.value : 1;
  const yearAtPace = paceDays ? Math.pow(Math.pow(index / paceBase, 1 / paceDays), 365) : 1;

  const weeks = useMemo(
    () =>
      recentWeeks(today, 8).map((w) => ({
        ...weekNumbers(w, checkIns),
        label: fromDate(w).toFormat('d LLL'),
        pillars: averagePillars(range(w, addDays(w, 6) < today ? addDays(w, 6) : today)),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [today, checkIns, pillarDays],
  );

  // 8 weeks × 7 days adherence grid.
  const heat = useMemo(() => {
    const start = addDays(weekStart(today), -7 * 7);
    return Array.from({ length: 56 }, (_, i) => {
      const date = addDays(start, i);
      if (date > today) return { date, value: null as number | null, future: true };
      if (!first || date < first) return { date, value: null as number | null, future: false };
      const ev = evaluateDay(date, resolve(date), checkIns, prayers);
      return { date, value: ev.answered === 0 && date !== today ? 0 : ev.adherence, future: false };
    });
  }, [today, checkIns, prayers, resolve, first]);

  const notes = useMemo(
    () => checkIns.filter((c) => c.note && (filter === 'all' || c.category === filter)).sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)),
    [checkIns, filter],
  );
  const noteCats = [...new Set(checkIns.filter((c) => c.note).map((c) => c.category as Category))];
  const unlocked = new Map(achievements.map((a) => [a.id, a.unlockedAt]));
  const rank = rankFor(game.level.level);

  return (
    <motion.div
      className="mx-auto grid max-w-7xl gap-4 px-4 pb-10 pt-5 sm:px-6 lg:grid-cols-6 lg:pt-8"
      initial="hidden"
      animate="show"
      variants={stagger(0.06)}
    >
      {/* ── Compound index ───────────────────────────────────── */}
      <motion.section variants={fadeUp} className="card relative overflow-hidden p-6 lg:col-span-4" aria-labelledby="compound-title">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 id="compound-title" className="label">
              Compound index
            </h1>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-gradient text-6xl font-extralight tracking-[-0.04em] tabular sm:text-7xl">
                <AnimatedNumber value={index} format={(v) => v.toFixed(3)} />
              </span>
              <span className="text-2xl font-light text-zinc-500">×</span>
            </div>
            <p className="mt-2 max-w-md text-sm text-zinc-400">
              Each Full day multiplies you by {COMPOUND.full}, a Minimum viable day by {COMPOUND.mvd}, a missed day by {COMPOUND.none}.{' '}
              <span className="serif text-[15px] italic text-zinc-300">1.01³⁶⁵ = 37.8. 0.99³⁶⁵ = 0.03.</span>
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-right">
            <Stat label="Days tracked" value={String(compound.length)} />
            <Stat label="Year at this pace" value={`${yearAtPace >= 100 ? Math.round(yearAtPace) : yearAtPace >= 1 ? yearAtPace.toFixed(1) : yearAtPace.toFixed(2)}×`} accent={yearAtPace >= 1} />
            <Stat label="Full days" value={String(game.dayTypeCounts.full)} />
            <Stat label="MVD days" value={String(game.dayTypeCounts.mvd)} />
          </div>
        </div>
        <Spark series={compound.map((c) => c.value)} />
      </motion.section>

      {/* ── Rank ─────────────────────────────────────────────── */}
      <motion.section variants={fadeUp} className="card flex flex-col items-center justify-center p-6 text-center lg:col-span-2" aria-labelledby="rank-title">
        <h2 id="rank-title" className="label mb-4">
          Rank
        </h2>
        <MiniRing value={game.level.progress} color="var(--accent)" size={132} stroke={6}>
          <span className="flex flex-col items-center">
            <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">Level</span>
            <span className="text-5xl font-extralight tracking-tight text-white tabular">{game.level.level}</span>
          </span>
        </MiniRing>
        <p className="mt-4 text-xl font-semibold tracking-tight text-white">{rank.title}</p>
        <p className="font-mono text-[11px] text-zinc-500 tabular">
          {game.totalXp.toLocaleString()} XP · {(game.level.nextAt - game.totalXp).toLocaleString()} to Lv {game.level.level + 1}
        </p>
        {rank.next ? (
          <p className="mt-2 text-xs text-zinc-400">
            {rank.next.title} at level {rank.next.level}
          </p>
        ) : null}
      </motion.section>

      {/* ── Identity radar ───────────────────────────────────── */}
      <motion.section variants={fadeUp} className="card p-6 lg:col-span-3" aria-labelledby="radar-title">
        <div className="flex items-baseline justify-between">
          <h2 id="radar-title" className="label">
            Identity balance
          </h2>
          <span className="flex items-center gap-3 font-mono text-[10.5px] text-zinc-500">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[color:var(--accent)]" /> last 7 days
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full border border-zinc-500" /> week before
            </span>
          </span>
        </div>
        <Radar now={thisWeek} prev={lastWeek} />
        <ul className="mt-2 grid grid-cols-5 gap-1 text-center">
          {PILLARS.map((p) => {
            const a = thisWeek[p];
            const b = lastWeek[p];
            const d = a != null && b != null ? Math.round((a - b) * 100) : null;
            return (
              <li key={p}>
                <div className="font-mono text-sm text-white tabular">{a == null ? '–' : `${Math.round(a * 100)}%`}</div>
                <div className={`font-mono text-[10.5px] tabular ${d == null || d === 0 ? 'text-zinc-600' : d > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {d == null ? '—' : d > 0 ? `▲ ${d}` : d < 0 ? `▼ ${-d}` : '='}
                </div>
              </li>
            );
          })}
        </ul>
      </motion.section>

      {/* ── Roadmap ──────────────────────────────────────────── */}
      <motion.section variants={fadeUp} className="card p-6 lg:col-span-3" aria-labelledby="road-title">
        <h2 id="road-title" className="label">
          Reverse-engineered
        </h2>
        <p className="serif mb-5 mt-1 text-lg italic text-zinc-400">Start from the end. Work back to today.</p>
        <ol className="relative space-y-5 pl-7">
          <span className="absolute bottom-2 left-[7px] top-2 w-px bg-gradient-to-b from-[color:var(--accent)] via-white/15 to-white/5" aria-hidden="true" />
          {north.milestones.map((m, i) => (
            <li key={`${m.when}-${i}`} className="relative">
              <span
                className={`absolute -left-7 top-1 flex h-[15px] w-[15px] items-center justify-center rounded-full border ${i === 0 ? 'border-transparent bg-[color:var(--accent)] shadow-[0_0_14px_var(--accent)]' : 'border-white/25 bg-ink-900'}`}
                aria-hidden="true"
              >
                {i === 0 ? <Star className="h-2 w-2 fill-ink-950 text-ink-950" /> : null}
              </span>
              <div className="font-mono text-[11px] text-zinc-500">{m.when}</div>
              <div className={`text-sm ${i === 0 ? 'font-medium text-white' : 'text-zinc-300'}`}>{m.text}</div>
            </li>
          ))}
          <li className="relative">
            <span className="absolute -left-7 top-1 h-[15px] w-[15px] rounded-full border border-emerald-400/60 bg-emerald-400/20" aria-hidden="true" />
            <div className="font-mono text-[11px] text-emerald-400">This week</div>
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2.5">
              {QUEST_KEYS.map((k) => {
                const v = game.week[k];
                const t = targets[k];
                const pct = t > 0 ? Math.min(1, v / t) : 0;
                return (
                  <div key={k}>
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-zinc-400">{QUEST_LABEL[k]}</span>
                      <span className="font-mono text-zinc-200 tabular">
                        {Math.round(v * 10) / 10}/{t}
                      </span>
                    </div>
                    <div
                      className="mt-1 h-1 overflow-hidden rounded-full bg-white/[0.07]"
                      role="progressbar"
                      aria-label={QUEST_LABEL[k]}
                      aria-valuemin={0}
                      aria-valuemax={t}
                      aria-valuenow={v}
                    >
                      <motion.div className="h-full origin-left rounded-full" style={{ background: QUEST_COLOR[k] }} initial={{ scaleX: 0 }} animate={{ scaleX: pct }} transition={{ duration: 1, ease: EASE_OUT }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </li>
          <li className="relative">
            <span className="absolute -left-7 top-1 h-[15px] w-[15px] animate-pulse rounded-full bg-white" aria-hidden="true" />
            <div className="font-mono text-[11px] text-white">Today · you are here</div>
            <div className="text-sm text-zinc-400">
              {game.today.doneOrPartial}/{game.today.scheduled.length} blocks checked in. Every one is a vote.
            </div>
          </li>
        </ol>
      </motion.section>

      {/* ── Pillar trends ────────────────────────────────────── */}
      <motion.section variants={fadeUp} className="card p-6 lg:col-span-6" aria-labelledby="trend-title">
        <h2 id="trend-title" className="label mb-4">
          Pillars · 8 weeks
        </h2>
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
          {PILLARS.map((p) => {
            const meta = PILLAR[p];
            const Icon = meta.icon;
            return (
              <div key={p}>
                <div className="mb-2 flex items-center gap-2 text-sm text-zinc-300">
                  <Icon className="h-4 w-4" style={{ color: meta.color }} strokeWidth={1.75} /> {meta.become}
                </div>
                <div className="flex h-16 items-end gap-1" role="img" aria-label={`${meta.become}, weekly score for the last 8 weeks`}>
                  {weeks.map((w, i) => {
                    const v = w.pillars[p];
                    return (
                      <motion.div
                        key={w.weekStart}
                        className="flex-1 origin-bottom rounded-t-[3px]"
                        style={{ height: `${Math.max(4, (v ?? 0) * 100)}%`, background: v == null ? 'rgba(255,255,255,.06)' : meta.color, opacity: v == null ? 1 : 0.35 + 0.65 * (i / 7) }}
                        initial={{ scaleY: 0 }}
                        animate={{ scaleY: 1 }}
                        transition={{ delay: 0.03 * i, duration: 0.7, ease: EASE_OUT }}
                        title={`Week of ${w.label}: ${v == null ? 'no data' : `${Math.round(v * 100)}%`}`}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </motion.section>

      {/* ── Quest charts ─────────────────────────────────────── */}
      {QUEST_KEYS.map((k) => (
        <motion.section variants={fadeUp} key={k} className="card p-5 lg:col-span-3" aria-label={`${QUEST_LABEL[k]}, last 8 weeks`}>
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="label">{QUEST_LABEL[k]} · 8 weeks</h2>
            {game.week.completed.includes(k) ? <span className="font-mono text-[11px] text-emerald-400">✓ quest done</span> : null}
          </div>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeks} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id={`q-${k}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={QUEST_COLOR[k]} stopOpacity={1} />
                    <stop offset="100%" stopColor={QUEST_COLOR[k]} stopOpacity={0.25} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 6" vertical={false} stroke="rgba(255,255,255,0.07)" />
                <XAxis dataKey="label" tick={TICK} tickLine={false} axisLine={false} />
                <YAxis tick={TICK} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  contentStyle={{ borderRadius: 12, fontSize: 12, background: '#0d1017', border: '1px solid rgba(255,255,255,.1)', color: '#e4e4e7' }}
                  formatter={(v) => [String(v), QUEST_LABEL[k]]}
                  labelFormatter={(l) => `Week of ${l}`}
                />
                <ReferenceLine y={targets[k]} stroke="#34d399" strokeDasharray="4 4" label={{ value: `target ${targets[k]}`, fontSize: 10, fill: '#34d399', position: 'insideTopRight' }} />
                <Bar dataKey={k} fill={`url(#q-${k})`} radius={[6, 6, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.section>
      ))}

      {/* ── Heatmap ──────────────────────────────────────────── */}
      <motion.section variants={fadeUp} className="card p-5 lg:col-span-3" aria-labelledby="heat-title">
        <h2 id="heat-title" className="label mb-3">
          Daily adherence · 8 weeks
        </h2>
        <div className="flex gap-2">
          <div className="grid grid-rows-7 gap-1 font-mono text-[10px] text-zinc-600" aria-hidden="true">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
              <span key={i} className="flex h-6 items-center">
                {d}
              </span>
            ))}
          </div>
          <div className="grid flex-1 grid-flow-col grid-rows-7 gap-1" role="list" aria-label="Share of check-ins Done or Partial per day">
            {heat.map((h, i) => (
              <motion.div
                key={h.date}
                role="listitem"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.006, duration: 0.4, ease: EASE_OUT }}
                title={h.future ? h.date : `${h.date}: ${h.value == null ? 'no data' : `${Math.round(h.value * 100)}%`}`}
                aria-label={h.future ? `${h.date} future` : `${h.date} ${h.value == null ? 'none' : `${Math.round(h.value * 100)} percent`}`}
                className="flex h-6 items-center justify-center rounded-[5px] font-mono text-[9px] font-medium tabular"
                style={{
                  background: h.future ? 'transparent' : h.value == null ? 'rgba(255,255,255,.04)' : `rgba(52,211,153,${0.1 + h.value * 0.8})`,
                  color: h.value != null && h.value > 0.55 ? '#05060a' : '#a1a1aa',
                  boxShadow: h.date === today ? '0 0 0 1.5px var(--accent)' : h.value != null && h.value >= 0.99 ? '0 0 10px rgba(52,211,153,.45)' : undefined,
                }}
              >
                {h.future || h.value == null ? '' : Math.round(h.value * 100)}
              </motion.div>
            ))}
          </div>
        </div>
        <p className="mt-2 text-xs text-zinc-600">Numbers are % of check-ins Done or Partial.</p>
      </motion.section>

      {/* ── Streaks ──────────────────────────────────────────── */}
      <motion.section variants={fadeUp} className="card p-5 lg:col-span-3" aria-labelledby="streaks-title">
        <h2 id="streaks-title" className="label mb-4">
          Streaks & totals
        </h2>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-5 text-sm">
          {STREAKS.map((s) => (
            <div key={s}>
              <dt className="text-zinc-500">{STREAK_LABEL[s]}</dt>
              <dd className="font-mono text-3xl font-extralight text-white tabular">
                {game.streaks[s].current} <span className="text-[11px] text-zinc-500">best {game.streaks[s].best}</span>
              </dd>
            </div>
          ))}
          <div>
            <dt className="text-zinc-500">Applications · emails</dt>
            <dd className="font-mono text-3xl font-extralight text-white tabular">
              {game.totals.applications} <span className="text-zinc-600">·</span> {game.totals.supervisorEmails}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Deep-work hours</dt>
            <dd className="font-mono text-3xl font-extralight text-white tabular">{game.totals.deepWorkHours}</dd>
          </div>
        </dl>
      </motion.section>

      {/* ── Achievements ─────────────────────────────────────── */}
      <motion.section variants={fadeUp} className="card p-5 lg:col-span-6" aria-labelledby="ach-title">
        <h2 id="ach-title" className="label mb-4 inline-flex items-center gap-1.5">
          <Award className="h-3.5 w-3.5" /> Achievements · {unlocked.size}/{ACHIEVEMENTS.length}
        </h2>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {ACHIEVEMENTS.map((a) => {
            const at = unlocked.get(a.id);
            const I = ACH_ICON[a.id] ?? Award;
            return (
              <li
                key={a.id}
                className={`flex items-center gap-3 rounded-2xl border p-3 transition-colors ${
                  at ? 'border-amber-300/25 bg-gradient-to-br from-amber-300/[0.08] to-transparent' : 'border-white/[0.06] opacity-50'
                }`}
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${at ? 'bg-amber-300 text-ink-950 shadow-[0_0_20px_-4px_rgba(252,211,77,.7)]' : 'bg-white/[0.05] text-zinc-500'}`}
                  aria-hidden="true"
                >
                  {at ? <I className="h-5 w-5" strokeWidth={2} /> : <Lock className="h-4 w-4" />}
                </span>
                <span className="min-w-0">
                  <span className="block font-medium text-zinc-100">{a.title}</span>
                  <span className="block text-xs text-zinc-400">{a.description}</span>
                  <span className="block font-mono text-[10.5px] text-zinc-600">{at ? `Unlocked ${at.slice(0, 10)}` : 'Locked'}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </motion.section>

      {/* ── Ship log ─────────────────────────────────────────── */}
      <motion.section variants={fadeUp} className="card p-5 lg:col-span-6" aria-labelledby="notes-title">
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
          <p className="text-sm text-zinc-500">No notes yet. Add one when you check in a block.</p>
        ) : (
          <ul className="max-h-96 divide-y divide-white/[0.05] overflow-auto">
            {notes.map((n) => (
              <li key={n.id} className="flex items-baseline gap-3 py-2.5 text-sm">
                <span className="w-20 shrink-0 font-mono text-[11px] text-zinc-600 tabular">{n.date}</span>
                <span className="mt-1 h-2 w-2 shrink-0 self-start rounded-full" style={{ background: CATEGORY[n.category as Category]?.color }} aria-hidden="true" />
                <span className="flex-1 text-zinc-200">{n.note}</span>
                <span className="hidden shrink-0 text-xs text-zinc-500 sm:inline">{CATEGORY[n.category as Category]?.label}</span>
              </li>
            ))}
          </ul>
        )}
      </motion.section>
    </motion.div>
  );
}

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className={`font-mono text-xl font-light tabular ${accent ? 'text-emerald-300' : 'text-white'}`}>{value}</div>
    </div>
  );
}

/** Area sparkline for the compound index. */
function Spark({ series }: { series: number[] }) {
  const W = 600;
  const H = 90;
  if (series.length < 2) {
    return <p className="mt-6 text-sm text-zinc-500">Check in a few days and your curve will appear here.</p>;
  }
  const min = Math.min(1, ...series);
  const max = Math.max(1, ...series);
  const span = max - min || 1;
  const pts = series.map((v, i) => [(i / (series.length - 1)) * W, H - 6 - ((v - min) / span) * (H - 16)] as const);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const baseY = H - 6 - ((1 - min) / span) * (H - 16);
  const last = pts.at(-1)!;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="mt-6 h-24 w-full overflow-visible" aria-hidden="true">
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
        </linearGradient>
      </defs>
      <line x1={0} x2={W} y1={baseY} y2={baseY} stroke="#fff" strokeOpacity={0.12} strokeDasharray="3 6" vectorEffect="non-scaling-stroke" />
      <motion.path d={`${line} L${W} ${H} L0 ${H} Z`} fill="url(#spark-fill)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.2, delay: 0.3 }} />
      <motion.path
        d={line}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.4, ease: EASE_OUT }}
      />
      <circle cx={last[0]} cy={last[1]} r={4} fill="#fff" style={{ filter: 'drop-shadow(0 0 6px var(--accent))' }} />
    </svg>
  );
}

/** Five-axis radar: this week (filled) over the week before (outline). */
function Radar({ now, prev }: { now: Record<Pillar, number | null>; prev: Record<Pillar, number | null> }) {
  const S = 300;
  const c = S / 2;
  const R = 104;
  const at = (i: number, v: number) => {
    const a = ((-90 + i * 72) * Math.PI) / 180;
    return [c + R * v * Math.cos(a), c + R * v * Math.sin(a)] as const;
  };
  const shape = (vals: Record<Pillar, number | null>) =>
    PILLARS.map((p, i) => at(i, Math.max(0.03, vals[p] ?? 0)))
      .map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`)
      .join(' ') + ' Z';
  return (
    <svg viewBox={`0 0 ${S} ${S}`} className="mx-auto mt-2 w-full max-w-[320px] overflow-visible" role="img" aria-label="Identity balance radar">
      {[0.25, 0.5, 0.75, 1].map((r) => (
        <path
          key={r}
          d={PILLARS.map((_, i) => at(i, r))
            .map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`)
            .join(' ') + ' Z'}
          fill="none"
          stroke="#fff"
          strokeOpacity={r === 1 ? 0.12 : 0.05}
        />
      ))}
      {PILLARS.map((p, i) => {
        const [x, y] = at(i, 1);
        const [lx, ly] = at(i, 1.24);
        const meta = PILLAR[p];
        return (
          <g key={p}>
            <line x1={c} y1={c} x2={x} y2={y} stroke="#fff" strokeOpacity={0.06} />
            <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fill={meta.color} fontSize={11} fontFamily="Geist Variable, sans-serif" fontWeight={500}>
              {meta.become}
            </text>
          </g>
        );
      })}
      <path d={shape(prev)} fill="none" stroke="#a1a1aa" strokeOpacity={0.5} strokeDasharray="3 4" />
      <motion.path
        initial={false}
        animate={{ d: shape(now) }}
        transition={{ duration: 1, ease: EASE_OUT }}
        fill="color-mix(in oklab, var(--accent) 22%, transparent)"
        stroke="var(--accent)"
        strokeWidth={1.75}
        style={{ filter: 'drop-shadow(0 0 12px color-mix(in oklab, var(--accent) 50%, transparent))' }}
      />
      {PILLARS.map((p, i) => {
        const [x, y] = at(i, Math.max(0.03, now[p] ?? 0));
        return <circle key={p} cx={x} cy={y} r={3.5} fill={PILLAR[p].color} />;
      })}
    </svg>
  );
}
