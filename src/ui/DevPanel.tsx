import { useState } from 'react';
import { devMode, useClock } from '../clock/clock';
import { kl } from '../schedule/time';
import { useApp } from '../store/app';
import { useHud } from './hooks';
import { Icon } from './Icon';

/** Dev panel: fake time, run at 60×, jump to just before a boundary, seed data. */
export function DevPanel() {
  const [open, setOpen] = useState(() => devMode && window.innerWidth >= 1024);
  const anchor = useClock((s) => s.anchor);
  const faked = useClock((s) => s.faked);
  const { setSpeed, jump, resetToReal } = useClock.getState();
  const hud = useHud();
  const seed = useApp((s) => s.seed);
  const app = useApp();

  if (!devMode) return null;
  if (!open) {
    return (
      <button className="btn fixed bottom-20 right-3 z-40 !px-2 lg:bottom-3" onClick={() => setOpen(true)} aria-label="Open dev panel">
        <Icon name="bug" className="h-4 w-4" />
      </button>
    );
  }
  const t = kl(hud.now);
  return (
    <aside
      className="fixed bottom-20 right-3 z-40 w-72 rounded-2xl border border-slate-300 bg-white/95 p-3 text-xs shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 lg:bottom-3"
      aria-label="Developer panel"
    >
      <div className="mb-2 flex items-center justify-between">
        <strong className="text-sm">Dev clock</strong>
        <button onClick={() => setOpen(false)} aria-label="Close dev panel" className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800">
          <Icon name="close" className="h-4 w-4" />
        </button>
      </div>
      <div className="mb-2 font-mono tabular">
        {t.toFormat('ccc yyyy-MM-dd HH:mm:ss')} KL · {anchor.speed}×{faked ? ' · fake' : ''}
      </div>
      <div className="mb-2 flex flex-wrap gap-1">
        {[1, 10, 60, 300].map((s) => (
          <button key={s} className={`btn !px-2 !py-1 !text-xs ${anchor.speed === s ? 'btn-primary' : ''}`} onClick={() => setSpeed(s)}>
            {s}×
          </button>
        ))}
      </div>
      <div className="mb-2 flex flex-wrap gap-1">
        <button className="btn !px-2 !py-1 !text-xs" onClick={() => jump(60_000)}>
          +1 min
        </button>
        <button className="btn !px-2 !py-1 !text-xs" onClick={() => jump(10 * 60_000)}>
          +10 min
        </button>
        <button
          className="btn !px-2 !py-1 !text-xs"
          title="Jump to 11 minutes before the current block ends"
          onClick={() => jump(Math.max(0, hud.remainingMs - 11 * 60_000))}
        >
          → end −11m
        </button>
        <button className="btn !px-2 !py-1 !text-xs" onClick={resetToReal}>
          Real time
        </button>
      </div>
      <div className="flex flex-wrap gap-1">
        <button className="btn !px-2 !py-1 !text-xs" onClick={() => void seed(21)}>
          Seed 3 weeks
        </button>
        <span className="self-center text-slate-500">
          {app.checkIns.length} check-ins · {app.fired.size} fired
        </span>
      </div>
      <p className="mt-2 text-[11px] text-slate-500">Tip: “→ end −11m” then 60× shows a full block’s alerts in about a minute.</p>
    </aside>
  );
}
