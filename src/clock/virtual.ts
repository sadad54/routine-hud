/** Pure helpers for the virtual (dev) clock. */

export interface ClockAnchor {
  /** Real epoch ms when the anchor was taken. */
  real: number;
  /** Virtual epoch ms at that moment. */
  virtual: number;
  speed: number;
}

export function virtualNow(anchor: ClockAnchor, realNow: number): number {
  return anchor.virtual + (realNow - anchor.real) * anchor.speed;
}

/** Re-anchor so the virtual clock is continuous when speed or offset changes. */
export function reanchor(anchor: ClockAnchor, realNow: number, patch: { speed?: number; jumpMs?: number; virtual?: number }): ClockAnchor {
  const v = patch.virtual ?? virtualNow(anchor, realNow) + (patch.jumpMs ?? 0);
  return { real: realNow, virtual: v, speed: patch.speed ?? anchor.speed };
}

/** Worker tick interval: 1 s normally, faster under ?speed so each tick advances ≤ ~1 virtual second where possible. */
export function tickInterval(speed: number): number {
  if (speed <= 1) return 1000;
  return Math.max(50, Math.round(1000 / speed));
}

export function parseSpeed(value: string | null | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 && n <= 3600 ? n : 1;
}
