import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { useEffect } from 'react';
import { visualState } from '../alerts/engine';
import { enterKiosk, exitKiosk } from '../platform/wakelock';
import { fmtCountdown, fmtTime, kl } from '../schedule/time';
import { useApp } from '../store/app';
import { Backdrop } from './fx/Backdrop';
import { EASE_OUT } from './fx/motion';
import { Rolling } from './fx/Rolling';
import { useHud } from './hooks';
import { Ring } from './Ring';
import { CATEGORY } from './theme';
import { useWisdom } from './Wisdom';

/** Full-screen focus mode: dial, title, time left, next block and one line of wisdom. */
export function Kiosk() {
  const kiosk = useApp((s) => s.kiosk);
  const setKiosk = useApp((s) => s.setKiosk);
  const thresholds = useApp((s) => s.settings.thresholdsByCategory);
  const hud = useHud();
  const wisdom = useWisdom(hud.current.category);

  useEffect(() => {
    if (!kiosk) return;
    void enterKiosk();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setKiosk(false);
    const onFs = () => {
      if (!document.fullscreenElement) setKiosk(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('fullscreenchange', onFs);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('fullscreenchange', onFs);
      void exitKiosk();
    };
  }, [kiosk, setKiosk]);

  const meta = CATEGORY[hud.current.category];
  const state = visualState(hud.remainingMs, thresholds[hud.current.category]);

  return (
    <AnimatePresence>
      {kiosk ? (
        <motion.div
          className="fixed inset-0 z-[60] isolate flex flex-col items-center justify-center gap-[2.5vmin] overflow-hidden bg-ink-950 p-6 text-zinc-100"
          role="dialog"
          aria-label="Focus mode"
          initial={{ opacity: 0, scale: 1.02 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.5, ease: EASE_OUT }}
        >
          <Backdrop />
          <div className="absolute left-6 top-5 font-mono text-[clamp(12px,1.8vmin,16px)] text-zinc-500 tabular">{kl(hud.now).toFormat('HH:mm')} KL</div>
          <button
            className="absolute right-4 top-4 rounded-full p-2 text-zinc-500 transition-colors hover:bg-white/10 hover:text-zinc-200"
            onClick={() => setKiosk(false)}
            aria-label="Exit focus mode"
          >
            <X className="h-6 w-6" />
          </button>
          <div className="label !text-[clamp(11px,1.6vmin,14px)]" style={{ color: meta.color }}>
            {meta.label}
          </div>
          <h1 className="text-balance text-center text-[clamp(28px,5.5vmin,60px)] font-semibold tracking-[-0.03em]">{hud.current.title}</h1>
          <div className="w-[min(70vmin,680px)]">
            <Ring progress={hud.progress} color={meta.color} state={state} size={720} stroke={20}>
              <div className="countdown countdown-kiosk" role="timer">
                <Rolling text={fmtCountdown(hud.remainingMs)} />
              </div>
              {hud.sprint ? (
                <div className="mt-[2vmin] font-mono text-[clamp(14px,2.6vmin,28px)] text-zinc-400 tabular">
                  {hud.sprint.kind === 'sprint' ? `Sprint ${hud.sprint.sprintNumber}` : 'Break'} · {fmtCountdown(hud.sprint.remainingMs)}
                </div>
              ) : null}
            </Ring>
          </div>
          <p className="text-[clamp(16px,3vmin,32px)] text-zinc-400">
            Next · <span className="font-medium text-zinc-100">{hud.next.title}</span> <span className="font-mono tabular">{fmtTime(hud.next.start)}</span>
          </p>
          <AnimatePresence mode="wait">
            <motion.p
              key={wisdom.text}
              className="serif max-w-3xl text-balance text-center text-[clamp(16px,2.6vmin,28px)] italic text-zinc-500"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: EASE_OUT }}
            >
              “{wisdom.text}” <span className="not-italic text-zinc-600">— {wisdom.source ?? wisdom.by}</span>
            </motion.p>
          </AnimatePresence>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
