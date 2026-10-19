import { lazy, Suspense, useEffect, useState } from 'react';
import { visualState } from './alerts/engine';
import { useApp } from './store/app';
import { CheckInSheet } from './ui/CheckInSheet';
import { DevPanel } from './ui/DevPanel';
import { Header } from './ui/Header';
import { useHud, usePending } from './ui/hooks';
import { Icon, type IconName } from './ui/Icon';
import { Kiosk } from './ui/Kiosk';
import { NowScreen } from './ui/NowScreen';
import { Banners, Confetti, Flash, Toasts } from './ui/Overlays';
import { AlertRunner, GameWatcher, PrayerWatcher } from './ui/runners';
import { SettingsScreen } from './ui/SettingsScreen';
import { TodayScreen } from './ui/TodayScreen';
import { ALERT_COLOR, CATEGORY } from './ui/theme';

// Charts load lazily, only on the Stats tab.
const StatsScreen = lazy(() => import('./ui/StatsScreen'));

type Tab = 'now' | 'today' | 'stats' | 'settings';
const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'now', label: 'Now', icon: 'home' },
  { id: 'today', label: 'Today', icon: 'list' },
  { id: 'stats', label: 'Stats', icon: 'chart' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

function initialTab(): Tab {
  try {
    const t = localStorage.getItem('rh.tab') as Tab | null;
    return t && TABS.some((x) => x.id === t) ? t : 'now';
  } catch {
    return 'now';
  }
}

/** Page accent follows the current block's colour, or the alert colour near a boundary. */
function AccentSync() {
  const hud = useHud();
  const thresholds = useApp((s) => s.settings.thresholdsByCategory);
  const state = visualState(hud.remainingMs, thresholds[hud.current.category]);
  const color = ALERT_COLOR[state] ?? CATEGORY[hud.current.category].color;
  useEffect(() => {
    document.documentElement.style.setProperty('--accent', color);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color);
  }, [color]);
  useEffect(() => {
    document.title = `${hud.current.title} · Routine HUD`;
  }, [hud.current.title]);
  return null;
}

export default function App() {
  const [tab, setTab] = useState<Tab>(initialTab);
  const ready = useApp((s) => s.ready);
  const openSheet = useApp((s) => s.openSheet);
  const pending = usePending();

  useEffect(() => {
    try {
      localStorage.setItem('rh.tab', tab);
    } catch {
      /* ignore */
    }
  }, [tab]);

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-[90] focus:rounded focus:bg-white focus:p-2">
        Skip to content
      </a>
      <Banners />
      <Header onOpenQueue={() => openSheet(pending.map((b) => b.key))} />

      <div className="mx-auto flex w-full max-w-6xl flex-1">
        <nav aria-label="Main" className="hidden w-full lg:block lg:w-auto">
          <ul className="sticky top-16 flex flex-col gap-1 p-3">
            {TABS.map((t) => (
              <li key={t.id}>
                <button
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium ${
                    tab === t.id ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
                  aria-current={tab === t.id ? 'page' : undefined}
                  onClick={() => setTab(t.id)}
                >
                  <Icon name={t.icon} className="h-4 w-4" />
                  {t.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <main id="main" className="min-w-0 flex-1 pb-24 lg:pb-6">
          {!ready ? (
            <p className="p-8 text-center text-slate-500">Loading…</p>
          ) : tab === 'now' ? (
            <NowScreen />
          ) : tab === 'today' ? (
            <TodayScreen />
          ) : tab === 'stats' ? (
            <Suspense fallback={<p className="p-8 text-center text-slate-500">Loading charts…</p>}>
              <StatsScreen />
            </Suspense>
          ) : (
            <SettingsScreen />
          )}
        </main>
      </div>

      <nav aria-label="Main" className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 lg:hidden">
        <ul className="mx-auto flex max-w-md">
          {TABS.map((t) => (
            <li key={t.id} className="flex-1">
              <button
                className={`flex w-full flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
                  tab === t.id ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'
                }`}
                aria-current={tab === t.id ? 'page' : undefined}
                onClick={() => setTab(t.id)}
              >
                <Icon name={t.icon} className="h-5 w-5" />
                {t.label}
                <span className={`h-0.5 w-6 rounded-full ${tab === t.id ? 'bg-[var(--accent)]' : 'bg-transparent'}`} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <AccentSync />
      <AlertRunner />
      <GameWatcher />
      <PrayerWatcher />
      <CheckInSheet />
      <Kiosk />
      <Flash />
      <Confetti />
      <Toasts />
      <DevPanel />
    </div>
  );
}
