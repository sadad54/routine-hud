import { useId, type ReactNode } from 'react';
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
  /** Hide the tick dial (small rings). */
  ticks?: boolean;
}

const TICKS = 120;

/**
 * Countdown dial. The remaining arc shrinks back toward 12 o'clock; a glowing
 * head marks "now", and a 120-tick bezel lights the time still left.
 * Alert states recolour it.
 */
export function Ring({ progress, color, state, size = 360, stroke = 14, children, subProgress, ticks = true }: Props) {
  const uid = useId().replace(/:/g, '');
  const ringColor = ALERT_COLOR[state] ?? color;
  const c = size / 2;
  const r = c - (ticks ? 30 : stroke);
  const circ = 2 * Math.PI * r;
  const remaining = Math.max(0, Math.min(1, 1 - progress));
  const sr = r - stroke - 8;
  const sc = 2 * Math.PI * sr;
  const pulse = state === 'amber-pulse' ? 'ring-pulse-soft' : state === 'red' ? 'ring-pulse-strong' : '';
  const headDeg = remaining * 360;
  const smooth = { transition: 'stroke-dashoffset 1s linear, stroke 1.2s ease' };

  return (
    <div className={`relative mx-auto aspect-square w-full ${pulse}`} style={{ maxWidth: size }}>
      {/* Ambient glow inside the dial */}
      <div
        className="breathe absolute inset-[18%] rounded-full blur-3xl"
        style={{ background: `radial-gradient(circle, ${ringColor}55, transparent 70%)`, transition: 'background 1.2s ease' }}
        aria-hidden="true"
      />
      <svg viewBox={`0 0 ${size} ${size}`} className="relative h-full w-full overflow-visible" aria-hidden="true">
        <defs>
          <linearGradient id={`g-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity={0.95} />
            <stop offset="35%" stopColor={ringColor} />
            <stop offset="100%" stopColor={ringColor} stopOpacity={0.75} />
          </linearGradient>
          <filter id={`b-${uid}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={stroke * 0.9} />
          </filter>
        </defs>

        {ticks
          ? Array.from({ length: TICKS }, (_, i) => {
              const f = i / TICKS;
              const major = i % 10 === 0;
              const lit = f < remaining;
              const a = (f * 360 - 90) * (Math.PI / 180);
              const r1 = r + stroke / 2 + 7;
              const r2 = r1 + (major ? 9 : 5);
              return (
                <line
                  key={i}
                  x1={c + r1 * Math.cos(a)}
                  y1={c + r1 * Math.sin(a)}
                  x2={c + r2 * Math.cos(a)}
                  y2={c + r2 * Math.sin(a)}
                  stroke={lit ? ringColor : '#ffffff'}
                  strokeOpacity={lit ? (major ? 0.9 : 0.5) : major ? 0.16 : 0.07}
                  strokeWidth={major ? 2 : 1.25}
                  strokeLinecap="round"
                  style={{ transition: 'stroke 1.2s ease, stroke-opacity 0.6s ease' }}
                />
              );
            })
          : null}

        <g transform={`rotate(-90 ${c} ${c})`}>
          <circle cx={c} cy={c} r={r} fill="none" stroke="#ffffff" strokeOpacity={0.06} strokeWidth={stroke} />
          {/* Bloom */}
          <circle
            cx={c}
            cy={c}
            r={r}
            fill="none"
            stroke={ringColor}
            strokeOpacity={0.55}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - remaining)}
            filter={`url(#b-${uid})`}
            style={smooth}
          />
          <circle
            cx={c}
            cy={c}
            r={r}
            fill="none"
            stroke={`url(#g-${uid})`}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - remaining)}
            style={smooth}
          />
          {subProgress != null ? (
            <>
              <circle cx={c} cy={c} r={sr} fill="none" stroke="#ffffff" strokeOpacity={0.05} strokeWidth={3} />
              <circle
                cx={c}
                cy={c}
                r={sr}
                fill="none"
                stroke={ringColor}
                strokeOpacity={0.6}
                strokeWidth={3}
                strokeLinecap="round"
                strokeDasharray={sc}
                strokeDashoffset={sc * subProgress}
                style={smooth}
              />
            </>
          ) : null}
        </g>

        {/* Head: a bright point riding the end of the arc */}
        {remaining > 0.002 ? (
          <g style={{ transform: `rotate(${headDeg}deg)`, transformOrigin: `${c}px ${c}px`, transition: 'transform 1s linear' }}>
            <circle cx={c} cy={c - r} r={stroke * 0.95} fill={ringColor} opacity={0.35} filter={`url(#b-${uid})`} />
            <circle cx={c} cy={c - r} r={stroke * 0.32} fill="#fff" />
          </g>
        ) : null}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">{children}</div>
    </div>
  );
}
