import type { ReactNode } from 'react';
import type { VisualState } from '../alerts/engine';
import { ALERT_COLOR } from './theme';

interface Props {
  /** 0..1 elapsed */
  progress: number;
  color: string;
  state: VisualState;
  size?: number;
  stroke?: number;
  children?: ReactNode;
  /** Sub-progress ring (sprint), 0..1 elapsed */
  subProgress?: number | null;
}

/** Countdown ring. The remaining arc shrinks clockwise; alert states recolour it. */
export function Ring({ progress, color, state, size = 360, stroke = 16, children, subProgress }: Props) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const ringColor = ALERT_COLOR[state] ?? color;
  const sr = r - stroke - 6;
  const sc = 2 * Math.PI * sr;
  const pulse = state === 'amber-pulse' ? 'ring-pulse-soft' : state === 'red' ? 'ring-pulse-strong' : '';
  return (
    <div className={`relative mx-auto aspect-square w-full ${pulse}`} style={{ maxWidth: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-slate-200 dark:text-slate-800" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={ringColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * progress}
        />
        {subProgress != null ? (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={sr}
            fill="none"
            stroke={ringColor}
            strokeOpacity={0.45}
            strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray={sc}
            strokeDashoffset={sc * subProgress}
          />
        ) : null}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">{children}</div>
    </div>
  );
}
