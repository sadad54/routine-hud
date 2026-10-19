/** Screen Wake Lock + fullscreen for kiosk mode. Every failure is caught. */

let sentinel: WakeLockSentinel | null = null;
let wanted = false;

async function acquire() {
  if (!wanted || !('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
  try {
    sentinel = await navigator.wakeLock.request('screen');
    sentinel.addEventListener('release', () => {
      sentinel = null;
    });
  } catch (err) {
    console.error('[wakelock] request failed', err);
  }
}

// Browsers release the lock on tab switch; re-request when visible again (FR9.2).
function onVisibility() {
  if (document.visibilityState === 'visible' && wanted && !sentinel) void acquire();
}

export async function enterKiosk(): Promise<void> {
  wanted = true;
  document.addEventListener('visibilitychange', onVisibility);
  try {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    }
  } catch (err) {
    console.error('[kiosk] fullscreen failed', err);
  }
  await acquire();
}

export async function exitKiosk(): Promise<void> {
  wanted = false;
  document.removeEventListener('visibilitychange', onVisibility);
  try {
    await sentinel?.release();
  } catch (err) {
    console.error('[wakelock] release failed', err);
  }
  sentinel = null;
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
  } catch (err) {
    console.error('[kiosk] exit fullscreen failed', err);
  }
}

export function wakeLockSupported(): boolean {
  return typeof navigator !== 'undefined' && 'wakeLock' in navigator;
}

export function wakeLockActive(): boolean {
  return sentinel != null;
}
