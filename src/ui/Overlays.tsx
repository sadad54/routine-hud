import { useEffect, useMemo, useState } from 'react';
import { unlockAudio } from '../platform/audio';
import { notificationPermission, requestNotifications } from '../platform/notify';
import { useApp } from '../store/app';
import { Icon } from './Icon';

export function Toasts() {
  const toasts = useApp((s) => s.toasts);
  const dismiss = useApp((s) => s.dismissToast);
  useEffect(() => {
    if (!toasts.length) return;
    const t = setTimeout(() => dismiss(toasts[0]!.id), 5000);
    return () => clearTimeout(t);
  }, [toasts, dismiss]);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-14 z-[70] flex flex-col items-center gap-2 px-4" aria-live="polite" role="status">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast-in pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border p-3 shadow-lg ${
            t.kind === 'error'
              ? 'border-red-300 bg-red-50 text-red-950 dark:border-red-900 dark:bg-red-950 dark:text-red-100'
              : t.kind === 'level' || t.kind === 'achievement'
                ? 'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-50'
                : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'
          }`}
        >
          <div className="min-w-0 flex-1">
            <div className="font-semibold">{t.title}</div>
            {t.body ? <div className="text-sm opacity-80">{t.body}</div> : null}
          </div>
          <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="rounded p-1 opacity-60 hover:opacity-100">
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>
      ))}
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
          className="flex w-full items-center justify-center gap-2 bg-indigo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-800"
          onClick={() => void unlockAudio().then((ok) => ok && setUnlocked())}
        >
          <Icon name="volume" className="h-4 w-4" /> Tap to enable sound
        </button>
      ) : null}
      {perm === 'default' && !hideNotif ? (
        <div className="flex w-full items-center justify-center gap-3 bg-slate-200 px-4 py-2 text-sm dark:bg-slate-800">
          <span>Get desktop notifications at block boundaries?</span>
          <button className="btn !py-1" onClick={async () => setPerm(await requestNotifications())}>
            Enable
          </button>
          <button
            className="text-xs underline"
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
  return <div key={flashAt} className="flash pointer-events-none fixed inset-0 z-[55] bg-[var(--accent)]" aria-hidden="true" />;
}

const CONFETTI_COLORS = ['#3F51B5', '#33B679', '#F4511E', '#8E24AA', '#F6BF26', '#D50000', '#7986CB'];

/** Level-up only. */
export function Confetti() {
  const at = useApp((s) => s.confettiAt);
  const pieces = useMemo(
    () =>
      Array.from({ length: 80 }, (_, i) => ({
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
