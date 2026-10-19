import { create } from 'zustand';
import { useClock } from '../clock/clock';
import { buildCheckIn } from '../game/checkin';
import { evaluateDay } from '../game/days';
import { PILLAR_OF } from '../game/identity';
import { PRAYER_XP } from '../game/xp';
import type {
  Achievement,
  CheckIn,
  CheckInStatus,
  DayRecord,
  Pillar,
  PrayerCheck,
  PrayerTimesMonth,
  Settings,
} from '../game/types';
import { isPrunable } from '../alerts/engine';
import { needsFetch, prayerDayFrom, type PrayerSource } from '../prayer/aladhan';
import { fetchMonth } from '../prayer/fetch';
import { memoResolver, type DayResolver } from '../schedule/now';
import { resolveDay } from '../schedule/resolve';
import { addDays, dateKey, isoKL, kl } from '../schedule/time';
import type { PrayerName, ResolvedBlock } from '../schedule/types';
import { exportAll, importAll, wipeAll, type ExportFile } from './backup';
import { getDb } from './db';
import { withDefaults } from './defaults';

export interface Toast {
  id: number;
  title: string;
  body?: string;
  kind: 'info' | 'achievement' | 'level' | 'quest' | 'error';
}

export type Tab = 'now' | 'today' | 'growth' | 'settings';
export const TAB_IDS: Tab[] = ['now', 'today', 'growth', 'settings'];

/** A short "+XP" burst after a check-in. */
export interface Reward {
  id: number;
  xp: number;
  pillar: Pillar | null;
}

export interface SheetState {
  /** Block keys to check in, in order. */
  keys: string[];
  index: number;
}

interface AppState {
  ready: boolean;
  settings: Settings;
  checkIns: CheckIn[];
  prayers: PrayerCheck[];
  days: DayRecord[];
  achievements: Achievement[];
  prayerMonths: Record<string, PrayerTimesMonth>;
  prayerFetchedThisSession: Set<string>;
  prayerError: string | null;
  fired: Set<string>;
  soundUnlocked: boolean;
  sheet: SheetState | null;
  kiosk: boolean;
  flashAt: number;
  confettiAt: number;
  toasts: Toast[];
  tab: Tab;
  palette: boolean;
  /** Bumped by "shuffle" to show a different wisdom line. */
  shuffle: number;
  reward: Reward | null;

  init: () => Promise<void>;
  saveCheckIn: (block: ResolvedBlock, input: { status: CheckInStatus; note?: string; count?: number }) => Promise<void>;
  togglePrayer: (date: string, prayer: PrayerName) => Promise<void>;
  setBadDay: (date: string, on: boolean) => Promise<void>;
  toggleConnected: (date: string) => Promise<void>;
  setTab: (tab: Tab) => void;
  setPalette: (open: boolean) => void;
  nextWisdom: () => void;
  updateSettings: (patch: Partial<Omit<Settings, 'id'>>) => Promise<void>;
  markFired: (ids: string[]) => Promise<void>;
  unlockAchievements: (ids: string[]) => Promise<void>;
  loadPrayerTimes: (force?: boolean) => Promise<void>;
  openSheet: (keys: string[]) => void;
  closeSheet: () => void;
  setSheetIndex: (i: number) => void;
  setKiosk: (on: boolean) => void;
  setSoundUnlocked: () => void;
  flash: () => void;
  celebrate: () => void;
  toast: (t: Omit<Toast, 'id'>) => void;
  dismissToast: (id: number) => void;
  exportData: () => Promise<ExportFile>;
  importData: (json: unknown) => Promise<void>;
  wipeData: () => Promise<void>;
  seed: (days?: number) => Promise<void>;
}

let toastId = 1;
let rewardId = 1;

function initialTab(): Tab {
  try {
    const t = localStorage.getItem('rh.tab');
    if (t === 'stats') return 'growth';
    return TAB_IDS.includes(t as Tab) ? (t as Tab) : 'now';
  } catch {
    return 'now';
  }
}
const virtualIso = () => isoKL(useClock.getState().now);

export const useApp = create<AppState>((set, get) => ({
  ready: false,
  settings: withDefaults(undefined),
  checkIns: [],
  prayers: [],
  days: [],
  achievements: [],
  prayerMonths: {},
  prayerFetchedThisSession: new Set(),
  prayerError: null,
  fired: new Set(),
  soundUnlocked: false,
  sheet: null,
  kiosk: false,
  flashAt: 0,
  confettiAt: 0,
  toasts: [],
  tab: initialTab(),
  palette: false,
  shuffle: 0,
  reward: null,

  init: async () => {
    const db = getDb();
    try {
      const [settings, checkIns, prayers, days, achievements, months, fired] = await Promise.all([
        db.settings.get('singleton'),
        db.checkIns.toArray(),
        db.prayerChecks.toArray(),
        db.days.toArray(),
        db.achievements.toArray(),
        db.prayerMonths.toArray(),
        db.firedAlerts.toArray(),
      ]);
      const today = dateKey(useClock.getState().now);
      const stale = fired.filter((f) => isPrunable(f.id, today)).map((f) => f.id);
      if (stale.length) void db.firedAlerts.bulkDelete(stale);
      set({
        ready: true,
        settings: withDefaults(settings),
        checkIns,
        prayers,
        days,
        achievements,
        prayerMonths: Object.fromEntries(months.map((m) => [m.id, m])),
        fired: new Set(fired.filter((f) => !stale.includes(f.id)).map((f) => f.id)),
      });
    } catch (err) {
      console.error('[store] failed to load IndexedDB; running in memory', err);
      set({ ready: true });
      get().toast({ kind: 'error', title: 'Storage unavailable', body: 'Data will not be saved this session.' });
    }
    void get().loadPrayerTimes();
  },

  saveCheckIn: async (block, input) => {
    const existing = get().checkIns.find((c) => c.id === block.key);
    const rec = buildCheckIn(block, input, virtualIso(), existing);
    set({ checkIns: [...get().checkIns.filter((c) => c.id !== rec.id), rec] });
    if (input.status !== 'skipped') set({ reward: { id: rewardId++, xp: rec.xpAwarded, pillar: PILLAR_OF[block.category] ?? null } });
    await safe(() => getDb().checkIns.put(rec));
    await refreshDay(block.date);
  },

  togglePrayer: async (date, prayer) => {
    const id = `${date}:${prayer}`;
    const existing = get().prayers.find((p) => p.id === id);
    const rec: PrayerCheck = { id, date, prayer, prayed: !existing?.prayed };
    set({ prayers: [...get().prayers.filter((p) => p.id !== id), rec] });
    if (rec.prayed) set({ reward: { id: rewardId++, xp: get().settings.prayerXp ? PRAYER_XP : 0, pillar: 'deen' } });
    await safe(() => getDb().prayerChecks.put(rec));
    await refreshDay(date);
  },

  setBadDay: async (date, on) => {
    const rec = { ...dayRecordFor(date), badDayMode: on };
    set({ days: [...get().days.filter((d) => d.date !== date), rec] });
    await safe(() => getDb().days.put(rec));
  },

  toggleConnected: async (date) => {
    const prev = dayRecordFor(date);
    const rec = { ...prev, connected: !prev.connected };
    set({ days: [...get().days.filter((d) => d.date !== date), rec] });
    if (rec.connected) set({ reward: { id: rewardId++, xp: 0, pillar: 'love' } });
    await safe(() => getDb().days.put(rec));
  },

  setTab: (tab) => {
    set({ tab });
    try {
      localStorage.setItem('rh.tab', tab);
    } catch {
      /* ignore */
    }
  },
  setPalette: (palette) => set({ palette }),
  nextWisdom: () => set({ shuffle: get().shuffle + 1 }),

  updateSettings: async (patch) => {
    const settings = { ...get().settings, ...patch, id: 'singleton' as const };
    set({ settings });
    await safe(() => getDb().settings.put(settings));
  },

  markFired: async (ids) => {
    if (!ids.length) return;
    const fired = new Set(get().fired);
    ids.forEach((id) => fired.add(id));
    set({ fired });
    const firedAt = virtualIso();
    await safe(() => getDb().firedAlerts.bulkPut(ids.map((id) => ({ id, firedAt }))));
  },

  unlockAchievements: async (ids) => {
    const have = new Set(get().achievements.map((a) => a.id));
    const fresh = ids.filter((id) => !have.has(id)).map((id) => ({ id, unlockedAt: virtualIso() }));
    if (!fresh.length) return;
    set({ achievements: [...get().achievements, ...fresh] });
    await safe(() => getDb().achievements.bulkPut(fresh));
  },

  loadPrayerTimes: async (force = false) => {
    const now = useClock.getState().now;
    const t = kl(now);
    const months = [t.toFormat('yyyy-MM')];
    if (t.daysInMonth! - t.day < 3) months.push(t.plus({ months: 1 }).toFormat('yyyy-MM')); // prefetch for offline
    const online = typeof navigator === 'undefined' ? true : navigator.onLine;
    for (const id of months) {
      const cached = get().prayerMonths[id];
      if (!(force && online) && !needsFetch(cached, Date.now(), online)) continue;
      try {
        const month = await fetchMonth(id, isoKL(Date.now()));
        set({
          prayerMonths: { ...get().prayerMonths, [id]: month },
          prayerFetchedThisSession: new Set([...get().prayerFetchedThisSession, id]),
          prayerError: null,
        });
        await safe(() => getDb().prayerMonths.put(month));
      } catch (err) {
        console.error('[prayer] fetch failed; using cache or fixed times', err);
        set({ prayerError: err instanceof Error ? err.message : String(err) });
      }
    }
  },

  openSheet: (keys) => {
    if (!keys.length) return;
    const cur = get().sheet;
    if (cur) {
      // Append to an open queue instead of interrupting it.
      const merged = [...cur.keys, ...keys.filter((k) => !cur.keys.includes(k))];
      set({ sheet: { ...cur, keys: merged } });
    } else set({ sheet: { keys, index: 0 } });
  },
  closeSheet: () => set({ sheet: null }),
  setSheetIndex: (index) => {
    const s = get().sheet;
    if (!s) return;
    if (index >= s.keys.length) set({ sheet: null });
    else set({ sheet: { ...s, index } });
  },
  setKiosk: (kiosk) => set({ kiosk }),
  setSoundUnlocked: () => set({ soundUnlocked: true }),
  flash: () => set({ flashAt: Date.now() }),
  celebrate: () => set({ confettiAt: Date.now() }),
  toast: (t) => set({ toasts: [...get().toasts, { ...t, id: toastId++ }].slice(-4) }),
  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),

  exportData: () => exportAll(getDb(), virtualIso()),
  importData: async (json) => {
    await importAll(getDb(), json);
    await get().init();
  },
  wipeData: async () => {
    await wipeAll(getDb());
    set({ checkIns: [], prayers: [], days: [], achievements: [], fired: new Set(), prayerMonths: {} });
    await get().init();
  },
  seed: async (n = 21) => {
    const { generateSeed } = await import('../dev/seed');
    const today = dateKey(useClock.getState().now);
    const data = generateSeed(addDays(today, -1), n, Date.now() % 100000);
    const db = getDb();
    await db.transaction('rw', [db.checkIns, db.prayerChecks, db.days], async () => {
      await db.checkIns.bulkPut(data.checkIns);
      await db.prayerChecks.bulkPut(data.prayers);
      await db.days.bulkPut(data.days);
    });
    await get().init();
    get().toast({ kind: 'info', title: `Seeded ${n} days of fake check-ins` });
  },
}));

/* ---------- helpers ---------- */

async function safe<T>(fn: () => Promise<T>): Promise<T | undefined> {
  try {
    return await fn();
  } catch (err) {
    console.error('[store] write failed', err);
    return undefined;
  }
}

function dayRecordFor(date: string): DayRecord {
  return useApp.getState().days.find((d) => d.date === date) ?? { date, badDayMode: false, dayType: 'none', bonusXp: 0 };
}

/** Recompute and store the day's type and bonus snapshot after its records change. */
async function refreshDay(date: string) {
  const { checkIns, prayers } = useApp.getState();
  const ev = evaluateDay(date, getResolver()(date), checkIns, prayers);
  const prev = dayRecordFor(date);
  const rec: DayRecord = { ...prev, dayType: ev.dayType, bonusXp: ev.bonusXp };
  useApp.setState({ days: [...useApp.getState().days.filter((d) => d.date !== date), rec] });
  await safe(() => getDb().days.put(rec));
}

/* ---------- resolver bound to the cached prayer months ---------- */

let resolverFor: Record<string, PrayerTimesMonth> | null = null;
let resolver: DayResolver = memoResolver((d) => resolveDay(d).blocks);
const loggedConflicts = new Set<string>();

export function getResolver(): DayResolver {
  const months = useApp.getState().prayerMonths;
  if (months !== resolverFor) {
    resolverFor = months;
    resolver = memoResolver((date) => {
      const r = resolveDay(date, { prayerTimes: prayerDayFrom(months, date) });
      for (const c of r.conflicts) {
        if (!loggedConflicts.has(c)) {
          loggedConflicts.add(c);
          console.warn('[schedule]', c);
        }
      }
      return r.blocks;
    });
  }
  return resolver;
}

export function useResolver(): DayResolver {
  useApp((s) => s.prayerMonths); // re-render when prayer times change
  return getResolver();
}

export function prayerSourceFor(date: string): PrayerSource {
  const { prayerMonths, prayerFetchedThisSession } = useApp.getState();
  const id = date.slice(0, 7);
  if (!prayerDayFrom(prayerMonths, date)) return 'fallback';
  return prayerFetchedThisSession.has(id) ? 'live' : 'cache';
}
