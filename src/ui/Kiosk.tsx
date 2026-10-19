import { useEffect } from 'react';
import { visualState } from '../alerts/engine';
import { enterKiosk, exitKiosk } from '../platform/wakelock';
import { fmtCountdown, fmtTime } from '../schedule/time';
import { useApp } from '../store/app';
import { useHud } from './hooks';
import { Icon } from './Icon';
import { Ring } from './Ring';
import { CATEGORY } from './theme';

/** Full-screen, always-dark kiosk: ring, title, time left, next block. */
export function Kiosk() {
  const kiosk = useApp((s) => s.kiosk);
  const setKiosk = useApp((s) => s.setKiosk);
  const thresholds = useApp((s) => s.settings.thresholdsByCategory);
  const hud = useHud();

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

  if (!kiosk) return null;
  const meta = CATEGORY[hud.current.category];
  const state = visualState(hud.remainingMs, thresholds[hud.current.category]);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-[3vmin] bg-[#05070b] p-6 text-slate-100" role="dialog" aria-label="Kiosk mode">
      <button
        className="absolute right-4 top-4 rounded-full p-2 text-slate-500 hover:bg-white/10 hover:text-slate-200"
        onClick={() => setKiosk(false)}
        aria-label="Exit kiosk mode"
      >
        <Icon name="close" className="h-6 w-6" />
      </button>
      <h1 className="text-center text-[clamp(28px,6vmin,64px)] font-bold tracking-tight">{hud.current.title}</h1>
      <div className="w-[min(78vmin,720px)]">
        <Ring progress={hud.progress} color={meta.color} state={state} size={720} stroke={26}>
          <div className="countdown countdown-kiosk" role="timer">
            {fmtCountdown(hud.remainingMs)}
          </div>
          {hud.sprint ? (
            <div className="mt-[2vmin] text-[clamp(16px,3vmin,32px)] text-slate-300 tabular">
              {hud.sprint.kind === 'sprint' ? `Sprint ${hud.sprint.sprintNumber}` : 'Break'} · {fmtCountdown(hud.sprint.remainingMs)}
            </div>
          ) : null}
        </Ring>
      </div>
      <p className="text-[clamp(18px,3.5vmin,40px)] text-slate-300">
        Next · <span className="font-semibold text-slate-100">{hud.next.title}</span> <span className="tabular">{fmtTime(hud.next.start)}</span>
      </p>
    </div>
  );
}
