import {
  BedDouble,
  BrainCircuit,
  Briefcase,
  Dumbbell,
  FlaskConical,
  GraduationCap,
  HeartHandshake,
  HeartPulse,
  MoonStar,
  NotebookPen,
  Sparkles,
  Sunset,
  TrendingUp,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react';
import type { Pillar } from '../game/types';
import type { Category } from '../schedule/types';

/**
 * Category colours keep the Google Calendar hue families (so the HUD still
 * matches the calendar) but are tuned to glow on the dark canvas.
 */
export const CATEGORY: Record<Category, { label: string; color: string; icon: LucideIcon }> = {
  prayer: { label: 'Prayer', color: '#34d399', icon: MoonStar }, // sage
  deep_work: { label: 'Deep work', color: '#8b9cff', icon: BrainCircuit }, // blueberry
  career_jobs: { label: 'Career · jobs', color: '#fb923c', icon: Briefcase }, // tangerine
  career_scholarship: { label: 'Career · scholarships', color: '#fdba74', icon: GraduationCap }, // tangerine
  research: { label: 'Research', color: '#c084fc', icon: FlaskConical }, // grape
  exercise: { label: 'Exercise', color: '#fb7185', icon: Dumbbell }, // tomato
  meal: { label: 'Meal', color: '#facc15', icon: UtensilsCrossed }, // banana
  rest: { label: 'Rest', color: '#94a3b8', icon: BedDouble }, // graphite
  wind_down: { label: 'Wind down', color: '#a5b4fc', icon: Sunset }, // graphite
  review: { label: 'Review', color: '#67e8f9', icon: NotebookPen }, // lavender
};

/** The five identity pillars from the North Star. */
export const PILLAR: Record<Pillar, { label: string; become: string; color: string; icon: LucideIcon }> = {
  craft: { label: 'Craft', become: 'AI Engineer', color: '#8b9cff', icon: BrainCircuit },
  deen: { label: 'Deen', become: 'Spiritually centred', color: '#34d399', icon: Sparkles },
  body: { label: 'Body', become: 'Healthy', color: '#fb7185', icon: HeartPulse },
  wealth: { label: 'Wealth', become: 'Wealthy', color: '#fbbf24', icon: TrendingUp },
  love: { label: 'Love', become: 'Loved', color: '#f0abfc', icon: HeartHandshake },
};

export const ALERT_COLOR = {
  normal: null,
  amber: '#fbbf24',
  'amber-pulse': '#fbbf24',
  red: '#f43f5e',
} as const;

export const STATUS_META = {
  done: { label: 'Done', glyph: '✓', className: 'text-emerald-300' },
  partial: { label: 'Partial', glyph: '◐', className: 'text-amber-300' },
  skipped: { label: 'Skipped', glyph: '✕', className: 'text-zinc-500' },
} as const;

/** Hex colour with alpha (0..1). */
export function alpha(hex: string, a: number): string {
  return `${hex}${Math.round(a * 255)
    .toString(16)
    .padStart(2, '0')}`;
}
