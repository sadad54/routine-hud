/**
 * Everything derived from the stored records: total XP, level, streaks, quests
 * and achievement eligibility. Pure — nothing here is stored.
 */
import achievementsJson from './achievements.json';
import type { DayResolver } from '../schedule/now';
import { addDays, weekStart } from '../schedule/time';
import { evaluateDay, type DayEval } from './days';
import { computeStreak, STREAKS, type StreakInfo, type StreakName } from './streaks';
import { QUEST_KEYS, weekNumbers, weekProgress, weeksWithData, type WeekProgress } from './quests';
import type { GameData, QuestTargets } from './types';
import { levelFor, PRAYER_XP, type LevelInfo } from './xp';

export type AchievementRule =
  | { type: 'checkIns'; value: number }
  | { type: 'dayTypeCount'; dayType: 'full' | 'mvd'; value: number }
  | { type: 'bestStreak'; streak: StreakName; value: number }
  | { type: 'total'; metric: 'applications' | 'supervisorEmails' | 'deepWorkHours' | 'exerciseDays'; value: number }
  | { type: 'allQuestWeeks'; value: number }
  | { type: 'level'; value: number };

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  icon: string;
  rule: AchievementRule;
}

export const ACHIEVEMENTS = achievementsJson as AchievementDef[];

export interface GameOptions {
  today: string;
  resolve: DayResolver;
  prayerXp: boolean;
  targets: QuestTargets;
}

export interface GameSummary {
  totalXp: number;
  todayXp: number;
  level: LevelInfo;
  streaks: Record<StreakName, StreakInfo>;
  week: WeekProgress;
  questXp: number;
  allQuestWeeks: number;
  totals: { applications: number; supervisorEmails: number; deepWorkHours: number; exerciseDays: number };
  dayTypeCounts: { full: number; mvd: number };
  today: DayEval;
  /** Achievement ids whose rule is met now. */
  eligibleAchievements: string[];
}

/** Earliest date with any record. */
export function firstDate(data: GameData): string | null {
  const dates = [...data.checkIns.map((c) => c.date), ...data.prayers.map((p) => p.date), ...data.days.map((d) => d.date)];
  return dates.length ? dates.reduce((a, b) => (a < b ? a : b)) : null;
}

export function makeDayEvaluator(data: GameData, resolve: DayResolver): (date: string) => DayEval {
  const cache = new Map<string, DayEval>();
  const ciByDate = groupBy(data.checkIns, (c) => c.date);
  const prByDate = groupBy(data.prayers, (p) => p.date);
  return (date) => {
    let e = cache.get(date);
    if (!e) {
      e = evaluateDay(date, resolve(date), ciByDate.get(date) ?? [], prByDate.get(date) ?? []);
      cache.set(date, e);
    }
    return e;
  };
}

/** Total XP: stored check-in XP + stored daily bonuses + quest XP (+ prayer XP when enabled). */
export function totalXpOf(data: GameData, opts: { prayerXp: boolean; targets: QuestTargets }, until?: string): number {
  const inRange = (d: string) => until == null || d <= until;
  const checkInXp = data.checkIns.filter((c) => inRange(c.date)).reduce((s, c) => s + c.xpAwarded, 0);
  const bonusXp = data.days.filter((d) => inRange(d.date)).reduce((s, d) => s + d.bonusXp, 0);
  const prayerXp = opts.prayerXp ? data.prayers.filter((p) => p.prayed && inRange(p.date)).length * PRAYER_XP : 0;
  const questXp = weeksWithData(data.checkIns.filter((c) => inRange(c.date)))
    .map((w) => weekProgress(w, data.checkIns.filter((c) => inRange(c.date)), opts.targets).xp)
    .reduce((a, b) => a + b, 0);
  return checkInXp + bonusXp + prayerXp + questXp;
}

export function summarize(data: GameData, opts: GameOptions): GameSummary {
  const { today, resolve, targets } = opts;
  const evalDay = makeDayEvaluator(data, resolve);
  const first = firstDate(data);

  const totalXp = totalXpOf(data, opts);
  const xpBeforeToday = totalXpOf(data, opts, addDays(today, -1));
  const level = levelFor(totalXp);

  const streaks = Object.fromEntries(
    STREAKS.map((s) => [s, computeStreak(s, today, first, evalDay)]),
  ) as Record<StreakName, StreakInfo>;

  const weeks = weeksWithData(data.checkIns);
  const progresses = weeks.map((w) => weekProgress(w, data.checkIns, targets));
  const questXp = progresses.reduce((s, p) => s + p.xp, 0);
  const allQuestWeeks = progresses.filter((p) => p.allMet).length;

  const totals = { applications: 0, supervisorEmails: 0, deepWorkHours: 0, exerciseDays: 0 };
  for (const w of weeks) {
    const n = weekNumbers(w, data.checkIns);
    for (const k of QUEST_KEYS) totals[k] += n[k];
  }
  totals.deepWorkHours = Math.round(totals.deepWorkHours * 10) / 10;

  const dayTypeCounts = { full: 0, mvd: 0 };
  if (first) {
    for (let d = first; d <= today; d = addDays(d, 1)) {
      const t = evalDay(d).dayType;
      if (t !== 'none') dayTypeCounts[t]++;
    }
  }

  const summary: GameSummary = {
    totalXp,
    todayXp: totalXp - xpBeforeToday,
    level,
    streaks,
    week: weekProgress(weekStart(today), data.checkIns, targets),
    questXp,
    allQuestWeeks,
    totals,
    dayTypeCounts,
    today: evalDay(today),
    eligibleAchievements: [],
  };
  summary.eligibleAchievements = ACHIEVEMENTS.filter((a) => ruleMet(a.rule, summary, data)).map((a) => a.id);
  return summary;
}

export function ruleMet(rule: AchievementRule, s: GameSummary, data: GameData): boolean {
  switch (rule.type) {
    case 'checkIns':
      return data.checkIns.length >= rule.value;
    case 'dayTypeCount':
      return s.dayTypeCounts[rule.dayType] >= rule.value;
    case 'bestStreak':
      return s.streaks[rule.streak].best >= rule.value;
    case 'total':
      return s.totals[rule.metric] >= rule.value;
    case 'allQuestWeeks':
      return s.allQuestWeeks >= rule.value;
    case 'level':
      return s.level.level >= rule.value;
  }
}

function groupBy<T>(items: T[], key: (t: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const it of items) {
    const k = key(it);
    const list = m.get(k);
    if (list) list.push(it);
    else m.set(k, [it]);
  }
  return m;
}
