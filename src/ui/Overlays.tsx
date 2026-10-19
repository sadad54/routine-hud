import { AnimatePresence, motion } from 'motion/react';
import { Award, Bell, CircleAlert, Crown, Info, Target, Volume2, X, type LucideIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { unlockAudio } from '../platform/audio';
import { notificationPermission, requestNotifications } from '../platform/notify';
import { useApp, type Toast } from '../store/app';
import { EASE_OUT, spring } from './fx/motion';
import { PILLAR } from './theme';

const TOAST_ICON: Record<Toast['kind'], { icon: LucideIcon; color: string }> = {
  info: { icon: Info, color: '#a1a1aa' },
  achievement: { icon: Award, color: '#fbbf24' },
  level: { icon: Crown, color: '#fbbf24' },
  quest: { icon: Target, color: '#34d399' },
  error: { icon: CircleAlert, color: '#f43f5e' },
};

export function Toasts() {
  const toasts = useApp((s) => s.toasts);
  const dismiss = useApp((s) => s.dismissToast);
  useEffect(() => {
    if (!toasts.length) return;
    const t = setTimeout(() => dismiss(toasts[0]!.id), 5000);
    return () => clearTimeout(t);
  }, [toasts, dismiss]);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-16 z-[70] flex flex-col items-center gap-2 px-4" aria-live="polite" role="status">
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const { icon: I, color } = TOAST_ICON[t.kind];
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: -16, scale: 0.96, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.2 } }}
              transition={spring}
              className="pointer-events-auto relative flex w-full max-w-sm items-start gap-3 overflow-hidden rounded-2xl border border-white/10 bg-ink-850/90 p-3.5 shadow-2xl shadow-black/50 backdrop-blur-xl"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl" style={{ background: `${color}1a`, color }}>
                <I className="h-4 w-4" strokeWidth={1.75} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-white">{t.title}</div>
                {t.body ? <div className="text-[13px] text-zinc-400">{t.body}</div> : null}
              </div>
              <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="rounded-lg p-1 text-zinc-500 hover:bg-white/5 hover:text-zinc-200">
                <X className="h-4 w-4" />
              </button>
              <motion.span
                className="absolute bottom-0 left-0 h-px origin-left"
                style={{ background: color, width: '100%' }}
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: 5, ease: 'linear' }}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

/** "Tap to enable sound" (FR2.4) and an optional notification prompt. */
export function Banners() {
  const unlocked = useApp((s) => s.soundUnlocked);
  const mute = useApp((s) => s.settings.mute);
  const setUnlocked = useApp((s) => s.setSoundUnlocked);
  const [perm, setPerm] = useState(notificationPermission());
  const [hideNotif, setHideNotif] = useState(() => {
    try {
      return localStorage.getItem('rh.hideNotifPrompt') === '1';
    } catch {
      return false;
    }
  });

  // Any tap anywhere unlocks audio for the session.
  useEffect(() => {
    if (unlocked) return;
    const handler = () => {
      void unlockAudio().then((ok) => ok && setUnlocked());
    };
    window.addEventListener('pointerdown', handler);
    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('pointerdown', handler);
      window.removeEventListener('keydown', handler);
    };
  }, [unlocked, setUnlocked]);

  return (
    <>
      {!unlocked && !mute ? (
        <button
          className="group relative flex w-full items-center justify-center gap-2 overflow-hidden border-b border-white/[0.06] px-4 py-2 text-[13px] font-medium text-zinc-200"
          style={{ background: 'linear-gradient(90deg, transparent, color-mix(in oklab, var(--accent) 22%, transparent), transparent)' }}
          onClick={() => void unlockAudio().then((ok) => ok && setUnlocked())}
        >
          <Volume2 className="h-4 w-4" strokeWidth={1.75} /> Tap to enable sound
        </button>
      ) : null}
      {perm === 'default' && !hideNotif ? (
        <div className="flex w-full flex-wrap items-center justify-center gap-3 border-b border-white/[0.06] bg-white/[0.02] px-4 py-2 text-[13px] text-zinc-300">
          <Bell className="h-4 w-4 text-zinc-500" strokeWidth={1.75} />
          <span>Get desktop notifications at block boundaries?</span>
          <button className="btn !py-1 !text-xs" onClick={async () => setPerm(await requestNotifications())}>
            Enable
          </button>
          <button
            className="text-xs text-zinc-500 underline-offset-2 hover:text-zinc-300 hover:underline"
            onClick={() => {
              setHideNotif(true);
              try {
                localStorage.setItem('rh.hideNotifPrompt', '1');
              } catch {
                /* ignore */
              }
            }}
          >
            Not now
          </button>
        </div>
      ) : null}
    </>
  );
}

export function Flash() {
  const flashAt = useApp((s) => s.flashAt);
  if (!flashAt) return null;
  return (
    <div
      key={flashAt}
      className="flash pointer-events-none fixed inset-0 z-[55]"
      style={{ background: 'radial-gradient(circle at 50% 40%, var(--accent), transparent 70%)' }}
      aria-hidden="true"
    />
  );
}

/** "+40 XP · vote for AI Engineer" after a check-in, prayer or love tick. */
export function RewardBurst() {
  const reward = useApp((s) => s.reward);
  const [shown, setShown] = useState<typeof reward>(null);
  useEffect(() => {
    if (!reward) return;
    setShown(reward);
    try {
      navigator.vibrate?.(12);
    } catch {
      /* ignore */
    }
    const t = setTimeout(() => setShown(null), 1800);
    return () => clearTimeout(t);
  }, [reward]);
  const pillar = shown?.pillar ? PILLAR[shown.pillar] : null;
  const color = pillar?.color ?? 'var(--accent)';
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-28 z-[72] flex justify-center lg:bottom-12" aria-live="polite">
      <AnimatePresence>
        {shown ? (
          <motion.div
            key={shown.id}
            initial={{ opacity: 0, y: 24, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.98, filter: 'blur(6px)', transition: { duration: 0.5, ease: EASE_OUT } }}
            transition={spring}
            className="relative flex items-center gap-3 rounded-full border border-white/10 bg-ink-850/90 py-2 pl-2 pr-4 shadow-2xl backdrop-blur-xl"
            style={{ boxShadow: `0 10px 40px -10px ${color}` }}
          >
            {/* Expanding ring */}
            <motion.span
              className="absolute inset-0 rounded-full border"
              style={{ borderColor: color }}
              initial={{ opacity: 0.8, scale: 1 }}
              animate={{ opacity: 0, scale: 1.35 }}
              transition={{ duration: 0.9, ease: EASE_OUT }}
            />
            {pillar ? (
              <span className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: color, color: '#05060a' }}>
                <pillar.icon className="h-4 w-4" strokeWidth={2.25} />
              </span>
            ) : null}
            {shown.xp > 0 ? <span className="font-mono text-sm font-semibold text-white">+{shown.xp} XP</span> : null}
            {pillar ? (
              <span className="text-[13px] text-zinc-300">
                vote for <span style={{ color }}>{pillar.become}</span>
              </span>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

const CONFETTI_COLORS = ['#8b9cff', '#34d399', '#fb7185', '#fbbf24', '#f0abfc', '#ffffff'];

/** Level-up only. */
export function Confetti() {
  const at = useApp((s) => s.confettiAt);
  const pieces = useMemo(
    () =>
      Array.from({ length: 90 }, (_, i) => ({
        left: Math.random() * 100,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        dx: `${(Math.random() - 0.5) * 30}vw`,
        rot: `${Math.random() * 720 - 360}deg`,
        dur: `${2.2 + Math.random() * 1.6}s`,
        delay: `${Math.random() * 0.4}s`,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [at],
  );
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!at) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 4200);
    return () => clearTimeout(t);
  }, [at]);
  if (!visible) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-[80] overflow-hidden" aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={
            {
              left: `${p.left}%`,
              background: p.color,
              boxShadow: `0 0 8px ${p.color}`,
              '--dx': p.dx,
              '--rot': p.rot,
              '--dur': p.dur,
              '--delay': p.delay,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
