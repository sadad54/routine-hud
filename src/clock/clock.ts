import { create } from 'zustand';
import { parseNowParam } from '../schedule/time';
import { parseSpeed, reanchor, tickInterval, virtualNow, type ClockAnchor } from './virtual';

/**
 * The single source of time. A Web Worker ticks every second (faster under
 * ?speed); every tick recomputes virtual time from the real wall clock, so
 * missed or late ticks self-correct.
 */

const params = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();
const fakeNow = parseNowParam(params.get('now'));
const initialSpeed = parseSpeed(params.get('speed'));

export const devMode = fakeNow != null || initialSpeed !== 1 || params.has('dev');

interface ClockState {
  now: number;
  /** Real time of the previous tick's virtual time (for alert windows). */
  prevNow: number | null;
  anchor: ClockAnchor;
  faked: boolean;
  setSpeed: (speed: number) => void;
  jump: (ms: number) => void;
  setVirtual: (ms: number) => void;
  resetToReal: () => void;
}

const startReal = Date.now();
const startAnchor: ClockAnchor = { real: startReal, virtual: fakeNow ?? startReal, speed: initialSpeed };

export const useClock = create<ClockState>((set, get) => ({
  now: startAnchor.virtual,
  prevNow: null,
  anchor: startAnchor,
  faked: fakeNow != null || initialSpeed !== 1,
  setSpeed: (speed) => {
    set({ anchor: reanchor(get().anchor, Date.now(), { speed }), faked: true, prevNow: null });
    restartWorker(speed);
  },
  // Jumps reset prevNow so skipped-over alerts are not replayed (like a reopen).
  jump: (ms) => {
    const anchor = reanchor(get().anchor, Date.now(), { jumpMs: ms });
    set({ anchor, faked: true, prevNow: null, now: anchor.virtual });
  },
  setVirtual: (ms) => {
    const anchor = reanchor(get().anchor, Date.now(), { virtual: ms });
    set({ anchor, faked: true, prevNow: null, now: ms });
  },
  resetToReal: () => {
    const real = Date.now();
    set({ anchor: { real, virtual: real, speed: 1 }, faked: false, prevNow: null, now: real });
    restartWorker(1);
  },
}));

function onTick(realNow: number) {
  const { anchor, now } = useClock.getState();
  const next = virtualNow(anchor, realNow);
  useClock.setState({ prevNow: now, now: next });
}

let worker: Worker | null = null;
let fallbackTimer: ReturnType<typeof setInterval> | undefined;

function restartWorker(speed: number) {
  const interval = tickInterval(speed);
  if (worker) {
    worker.postMessage({ interval });
    return;
  }
  if (fallbackTimer) clearInterval(fallbackTimer);
  fallbackTimer = setInterval(() => onTick(Date.now()), interval);
}

export function startClock() {
  if (worker || fallbackTimer) return;
  try {
    worker = new Worker(new URL('./clock.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<number>) => onTick(e.data);
    worker.onerror = (err) => {
      console.error('[clock] worker failed, falling back to main-thread timer', err);
      worker?.terminate();
      worker = null;
      restartWorker(useClock.getState().anchor.speed);
    };
    worker.postMessage({ interval: tickInterval(useClock.getState().anchor.speed) });
  } catch (err) {
    console.error('[clock] could not start worker', err);
    restartWorker(useClock.getState().anchor.speed);
  }
  // A tab returning from sleep gets an immediate recompute.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') onTick(Date.now());
  });
}
