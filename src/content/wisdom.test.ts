import { describe, expect, it } from 'vitest';
import { CATEGORIES } from '../schedule/types';
import { pickWisdom, poolFor, WISDOM, WISDOM_ROTATE_MS } from './wisdom';

describe('wisdom', () => {
  it('has a non-empty pool for every category', () => {
    for (const c of CATEGORIES) expect(poolFor(c).length).toBeGreaterThan(0);
  });
  it('prayer blocks only get Islamic reminders', () => {
    expect(poolFor('prayer').every((w) => w.kind === 'deen')).toBe(true);
  });
  it('is stable within a 20-minute window and changes with shuffle', () => {
    const t = Date.UTC(2026, 9, 19, 0, 0);
    expect(pickWisdom('deep_work', t)).toBe(pickWisdom('deep_work', t + WISDOM_ROTATE_MS - 1));
    expect(pickWisdom('deep_work', t, 1)).not.toBe(pickWisdom('deep_work', t, 0));
  });
  it('has no duplicate lines', () => {
    expect(new Set(WISDOM.map((w) => w.text)).size).toBe(WISDOM.length);
  });
});
