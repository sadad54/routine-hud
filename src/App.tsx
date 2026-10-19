import { lazy, Suspense, useEffect } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { visualState } from './alerts/engine';
import { TAB_IDS, useApp, type Tab } from './store/app';
import { CheckInSheet } from './ui/CheckInSheet';
import { CommandPalette } from './ui/CommandPalette';
import { DevPanel } from './ui/DevPanel';
import { Backdrop } from './ui/fx/Backdrop';
import { EASE_OUT, spring } from './ui/fx/motion';
import { Header, Logo } from './ui/Header';
import { useHud, usePending } from './ui/hooks';
import { Icon, type IconName } from './ui/Icon';
import { Kiosk } from './ui/Kiosk';
import { NowScreen } from './ui/NowScreen';
import { Banners, Confetti, Flash, RewardBurst, Toasts } from './ui/Overlays';
import { AlertRunner, GameWatcher, PrayerWatcher } from './ui/runners';
import { SettingsScreen } from './ui/SettingsScreen';
import { TodayScreen } from './ui/TodayScreen';
import { ALERT_COLOR, CATEGORY } from './ui/theme';

// Charts load lazily, only on the Growth tab.
const GrowthScreen = lazy(() => import('./ui/StatsScreen'));

const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'now', label: 'Now', icon: 'home' },
  { id: 'today', label: 'Today', icon: 'list' },
  { id: 'growth', label: 'Growth', icon: 'growth' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

/** Page accent follows the current block's colour, or the alert colour near a boundary. */
function AccentSync() {
  const hud = useHud();
  const thresholds = useApp((s) => s.settings.thresholdsByCategory);
  const state = visualState(hud.remainingMs, thresholds[hud.current.category]);
  const color = ALERT_COLOR[state] ?? CATEGORY[hud.current.category].color;
  useEffect(() => {
    document.documentElement.style.setProperty('--accent', color);
  }, [color]);
  useEffect(() => {
    document.title = `${hud.current.title} · Routine HUD`;
  }, [hud.current.title]);
  return null;
}

/** 1–4 switch tabs, F focus mode, M mute, Q next quote, ⌘K / Ctrl+K / "/" command menu. */
function Shortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const app = useApp.getState();
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        app.setPalette(!app.palette);
        return;
      }
      const el = e.target as HTMLElement | null;
      if (e.metaKey || e.ctrlKey || e.altKey || app.palette || app.sheet || app.kiosk) return;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      const k = e.key.toLowerCase();
      if (k >= '1' && k <= '4') app.setTab(TAB_IDS[Number(k) - 1]!);
      else if (k === 'f') app.setKiosk(true);
      else if (k === 'm') void app.updateSettings({ mute: !app.settings.mute });
      else if (k === 'q') app.nextWisdom();
      else if (k === '/') {
        e.preventDefault();
        app.setPalette(true);
      } else return;
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return null;
}

export default function App() {
  const tab = useApp((s) => s.tab);
  const setTab = useApp((s) => s.setTab);
  const ready = useApp((s) => s.ready);
  const openSheet = useApp((s) => s.openSheet);
  const pending = usePending();

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative flex min-h-screen flex-col">
        <Backdrop />
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-[90] focus:rounded focus:bg-white focus:p-2 focus:text-ink-950">
          Skip to content
        </a>
        <Banners />
        <Header onOpenQueue={() => openSheet(pending.map((b) => b.key))} />

        <div className="mx-auto flex w-full max-w-7xl flex-1">
          <nav aria-label="Main" className="hidden lg:block">
            <ul className="sticky top-20 flex flex-col gap-1 py-6 pl-6 pr-2">
              {TABS.map((t, i) => (
                <li key={t.id}>
                  <button
                    className={`relative flex w-40 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                      tab === t.id ? 'text-white' : 'text-zinc-500 hover:text-zinc-200'
                    }`}
                    aria-current={tab === t.id ? 'page' : undefined}
                    onClick={() => setTab(t.id)}
                  >
                    {tab === t.id ? (
                      <motion.span
                        layoutId="rail-pill"
                        className="absolute inset-0 rounded-xl border border-white/10 bg-white/[0.06]"
                        transition={spring}
                      />
                    ) : null}
                    <Icon name={t.icon} className="relative h-4 w-4" />
                    <span className="relative flex-1 text-left">{t.label}</span>
                    <span className="kbd relative opacity-60">{i + 1}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <main id="main" className="min-w-0 flex-1 pb-28 lg:pb-8">
            {!ready ? (
              <div className="flex h-[60vh] flex-col items-center justify-center gap-3 text-zinc-500">
                <Logo className="h-10 w-10 animate-spin [animation-duration:2.4s]" />
                <span className="label">Loading</span>
              </div>
            ) : (
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={tab}
                  initial={{ opacity: 0, y: 10, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -6, filter: 'blur(4px)' }}
                  transition={{ duration: 0.35, ease: EASE_OUT }}
                >
                  {tab === 'now' ? (
                    <NowScreen />
                  ) : tab === 'today' ? (
                    <TodayScreen />
                  ) : tab === 'growth' ? (
                    <Suspense fallback={<p className="p-8 text-center text-zinc-500">Loading charts…</p>}>
                      <GrowthScreen />
                    </Suspense>
                  ) : (
                    <SettingsScreen />
                  )}
                </motion.div>
              </AnimatePresence>
            )}
          </main>
        </div>

        {/* Floating dock (phones and tablets) */}
        <nav aria-label="Main" className="safe-bottom fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-3 lg:hidden">
          <ul className="flex w-full max-w-sm items-center gap-1 rounded-2xl border border-white/10 bg-ink-850/80 p-1.5 shadow-2xl shadow-black/50 backdrop-blur-xl">
            {TABS.map((t) => (
              <li key={t.id} className="flex-1">
                <button
                  className={`relative flex w-full flex-col items-center gap-0.5 rounded-xl py-2 text-[10.5px] font-medium transition-colors ${
                    tab === t.id ? 'text-white' : 'text-zinc-500'
                  }`}
                  aria-current={tab === t.id ? 'page' : undefined}
                  onClick={() => setTab(t.id)}
                >
                  {tab === t.id ? (
                    <motion.span layoutId="dock-pill" className="absolute inset-0 rounded-xl bg-white/[0.08]" transition={spring}>
                      <span className="absolute -top-px left-1/2 h-px w-8 -translate-x-1/2 bg-[color:var(--accent)] shadow-[0_0_12px_var(--accent)]" />
                    </motion.span>
                  ) : null}
                  <Icon name={t.icon} className="relative h-5 w-5" />
                  <span className="relative">{t.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <AccentSync />
        <Shortcuts />
        <AlertRunner />
        <GameWatcher />
        <PrayerWatcher />
        <CheckInSheet />
        <CommandPalette />
        <Kiosk />
        <Flash />
        <Confetti />
        <RewardBurst />
        <Toasts />
        <DevPanel />
      </div>
    </MotionConfig>
  );
}
