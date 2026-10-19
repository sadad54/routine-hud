/**
 * Web Audio chimes. Browsers need one user gesture per session before audio can
 * play; `unlockAudio()` must be called from a tap/click handler.
 */
import type { AlertSound } from '../alerts/engine';

let ctx: AudioContext | null = null;

function context(): AudioContext | null {
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    return ctx;
  } catch (err) {
    console.error('[audio] unavailable', err);
    return null;
  }
}

export async function unlockAudio(): Promise<boolean> {
  const c = context();
  if (!c) return false;
  try {
    if (c.state !== 'running') await c.resume();
    // A silent blip finishes the unlock on iOS Safari.
    const o = c.createOscillator();
    const g = c.createGain();
    g.gain.value = 0;
    o.connect(g).connect(c.destination);
    o.start();
    o.stop(c.currentTime + 0.01);
    return c.state === 'running';
  } catch (err) {
    console.error('[audio] unlock failed', err);
    return false;
  }
}

export function audioUnlocked(): boolean {
  return ctx?.state === 'running';
}

function tone(c: AudioContext, freq: number, at: number, dur: number, peak = 0.22, type: OscillatorType = 'sine') {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, at);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(peak, at + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g).connect(c.destination);
  o.start(at);
  o.stop(at + dur + 0.05);
}

/** A soft bell: fundamental plus a quiet fifth. */
function chime(c: AudioContext, at: number, base = 880) {
  tone(c, base, at, 1.2, 0.2);
  tone(c, base * 1.5, at, 0.9, 0.06);
  tone(c, base * 2, at, 0.5, 0.03);
}

export function playSound(kind: AlertSound): void {
  if (kind === 'none') return;
  const c = context();
  if (!c || c.state !== 'running') return;
  try {
    const t = c.currentTime + 0.02;
    if (kind === 'chime') chime(c, t);
    else if (kind === 'double') {
      chime(c, t, 988);
      chime(c, t + 0.35, 988);
    } else if (kind === 'transition') {
      chime(c, t, 659);
      chime(c, t + 0.22, 784);
      chime(c, t + 0.44, 1047);
    }
  } catch (err) {
    console.error('[audio] play failed', err);
  }
}
