/// <reference lib="webworker" />
// Posts the real wall-clock time on every tick. Dedicated workers are not
// throttled like background-tab main-thread timers, so ticks keep arriving.
// Ticks are aligned just after each whole second so the HUD flips cleanly.

let timer: ReturnType<typeof setTimeout> | undefined;
let interval = 1000;

function schedule() {
  const now = Date.now();
  const delay = interval >= 1000 ? interval - (now % 1000) + 5 : interval;
  timer = setTimeout(() => {
    postMessage(Date.now());
    schedule();
  }, delay);
}

self.onmessage = (e: MessageEvent<{ interval?: number }>) => {
  interval = Math.max(20, e.data?.interval ?? 1000);
  if (timer) clearTimeout(timer);
  postMessage(Date.now());
  schedule();
};
