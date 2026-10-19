import type { Category } from '../schedule/types';

/** Google Calendar colours. */
export const CATEGORY: Record<Category, { label: string; color: string; glyph: string }> = {
  prayer: { label: 'Prayer', color: '#33B679', glyph: '☾' }, // sage
  deep_work: { label: 'Deep work', color: '#3F51B5', glyph: '◆' }, // blueberry
  career_jobs: { label: 'Career · jobs', color: '#F4511E', glyph: '✉' }, // tangerine
  career_scholarship: { label: 'Career · scholarships', color: '#F4511E', glyph: '✎' }, // tangerine
  research: { label: 'Research', color: '#8E24AA', glyph: '❖' }, // grape
  exercise: { label: 'Exercise', color: '#D50000', glyph: '♥' }, // tomato
  meal: { label: 'Meal', color: '#F6BF26', glyph: '◒' }, // banana
  rest: { label: 'Rest', color: '#616161', glyph: '○' }, // graphite
  wind_down: { label: 'Wind down', color: '#616161', glyph: '☽' }, // graphite
  review: { label: 'Review', color: '#7986CB', glyph: '✓' }, // lavender
};

export const ALERT_COLOR = {
  normal: null,
  amber: '#F59E0B',
  'amber-pulse': '#F59E0B',
  red: '#DC2626',
} as const;

export const STATUS_META = {
  done: { label: 'Done', glyph: '✓', className: 'text-emerald-700 dark:text-emerald-400' },
  partial: { label: 'Partial', glyph: '◐', className: 'text-amber-700 dark:text-amber-400' },
  skipped: { label: 'Skipped', glyph: '✕', className: 'text-slate-500 dark:text-slate-400' },
} as const;
