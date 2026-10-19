import { describe, expect, it } from 'vitest';
import { alertsForBlock, defaultThresholds, dueAlerts, isPrunable, isQuietHours, visualState, type AlertEvent } from './engine';
import { blocksAround, memoResolver } from '../schedule/now';
import { resolveDay } from '../schedule/resolve';
import { parseNowParam } from '../schedule/time';

const resolver = memoResolver((d: string) => resolveDay(d).blocks);
const T = (iso: string) => parseNowParam(iso)!;
const thresholds = defaultThresholds();
const GRACE = 60_000;

/** Simulate a session ticking from `from` to `to` every `step` ms, persisting fired ids in `fired`. */
function run(from: number, to: number, step: number, fired: Set<string>, firstTick = true): AlertEvent[] {
  const events: AlertEvent[] = [];
  let prev: number | null = firstTick ? null : from - step;
  for (let now = from; now <= to; now += step) {
    const due = dueAlerts({ prevNow: prev, now, blocks: blocksAround(now, resolver), thresholds, fired, graceMs: GRACE });
    for (const e of due) {
      fired.add(e.id);
      events.push(e);
    }
    prev = now;
  }
  return events;
}

describe('alert schedule for a block', () => {
  it('career block: 10/5/1/0 thresholds with the PRD wording', () => {
    const blocks = resolveDay('2026-10-19').blocks;
    const i = blocks.findIndex((b) => b.id === 'career');
    const alerts = alertsForBlock(blocks[i]!, blocks[i + 1]!, thresholds);
    expect(alerts.map((a) => a.id)).toEqual([
      '2026-10-19:career:10',
      '2026-10-19:career:5',
      '2026-10-19:career:1',
      '2026-10-19:career:0',
    ]);
    expect(alerts[0]!.sound).toBe('none');
    expect(alerts[0]!.notification).toBeNull();
    expect(alerts[1]!.sound).toBe('chime');
    expect(alerts[1]!.notification).toEqual({ title: '5 min left: Career — Job applications', body: 'Next: Lunch + Call Mom' });
    expect(alerts[2]!.sound).toBe('double');
    expect(alerts[2]!.notification).toEqual({ title: '1 min left', body: 'Next: Lunch + Call Mom' });
    expect(alerts[3]!.sound).toBe('transition');
    expect(alerts[3]!.notification!.title).toBe('Lunch + Call Mom starts now');
  });

  it('deep work sprints get one soft chime per boundary, no 10/5-min warnings', () => {
    const blocks = resolveDay('2026-10-19').blocks;
    const i = blocks.findIndex((b) => b.id === 'dw1');
    const sprint = alertsForBlock(blocks[i]!, blocks[i + 1]!, thresholds).filter((a) => a.kind === 'sprint');
    expect(sprint.map((a) => [a.id, a.sound, a.notification!.title])).toEqual([
      ['2026-10-19:dw1:sprint-1', 'chime', 'Sprint 1 done'],
      ['2026-10-19:dw1:sprint-2', 'chime', 'Sprint 2 starts'],
    ]);
    expect(sprint[0]!.at).toBe(T('2026-10-19T07:55'));
    expect(sprint[1]!.at).toBe(T('2026-10-19T08:05'));
  });

  it('prayer blocks get an extra “Time for …” alert at their start', () => {
    const blocks = resolveDay('2026-10-23').blocks; // Friday
    const i = blocks.findIndex((b) => b.id === 'jumuah');
    const start = alertsForBlock(blocks[i]!, blocks[i + 1]!, thresholds).find((a) => a.kind === 'prayer-start')!;
    expect(start.id).toBe('2026-10-23:jumuah:start');
    expect(start.notification!.title).toBe('Time for Jumu’ah');
    expect(start.at).toBe(T('2026-10-23T12:45'));
  });

  it('skips thresholds longer than the block', () => {
    const blocks = resolveDay('2026-10-19').blocks;
    const i = blocks.findIndex((b) => b.id === 'buffer1'); // 10 min
    const ids = alertsForBlock(blocks[i]!, blocks[i + 1]!, thresholds).map((a) => a.id);
    expect(ids).toEqual(['2026-10-19:buffer1:5', '2026-10-19:buffer1:1', '2026-10-19:buffer1:0']);
  });
});

describe('dueAlerts — exactly once', () => {
  it('each threshold fires exactly once across a block (1 s ticks)', () => {
    const fired = new Set<string>();
    const events = run(T('2026-10-19T11:45'), T('2026-10-19T12:01'), 1000, fired);
    const ids = events.map((e) => e.id);
    expect(ids).toEqual([
      '2026-10-19:career:10',
      '2026-10-19:career:5',
      '2026-10-19:career:1',
      '2026-10-19:career:0',
    ]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('fires within one tick of the threshold', () => {
    const fired = new Set<string>();
    const events = run(T('2026-10-19T11:54:30'), T('2026-10-19T11:55:30'), 1000, fired);
    expect(events).toHaveLength(1);
    expect(events[0]!.at).toBe(T('2026-10-19T11:55'));
  });

  it('never fires twice across a reload (persisted ids)', () => {
    const fired = new Set<string>();
    run(T('2026-10-19T11:54'), T('2026-10-19T11:56'), 1000, fired);
    expect(fired.has('2026-10-19:career:5')).toBe(true);
    // "Reload": a new session resumes just before the threshold with the same persisted set.
    const again = run(T('2026-10-19T11:54:58'), T('2026-10-19T11:56'), 1000, fired, false);
    expect(again.map((e) => e.id)).not.toContain('2026-10-19:career:5');
  });

  it('does not replay alerts missed while the app was closed', () => {
    const fired = new Set<string>();
    // First tick of the session is after the 5-min mark: nothing fires on reopen.
    const first = dueAlerts({
      prevNow: null,
      now: T('2026-10-19T11:57'),
      blocks: blocksAround(T('2026-10-19T11:57'), resolver),
      thresholds,
      fired,
      graceMs: GRACE,
    });
    expect(first).toEqual([]);
    // But the next threshold still fires normally.
    const rest = run(T('2026-10-19T11:57'), T('2026-10-19T12:00:05'), 1000, fired);
    expect(rest.map((e) => e.id)).toEqual(['2026-10-19:career:1', '2026-10-19:career:0']);
  });

  it('drops stale alerts after a long gap (laptop sleep)', () => {
    const due = dueAlerts({
      prevNow: T('2026-10-19T11:00'),
      now: T('2026-10-19T12:30'),
      blocks: blocksAround(T('2026-10-19T12:30'), resolver),
      thresholds,
      fired: new Set(),
      graceMs: GRACE,
    });
    expect(due).toEqual([]);
  });

  it('works with coarse 60x ticks (dev ?speed=60)', () => {
    const fired = new Set<string>();
    const events = run(T('2026-10-19T11:40'), T('2026-10-19T12:05'), 60_000 / 20, fired); // 50ms real ticks at 60x = 3s
    expect(events.map((e) => e.id)).toEqual([
      '2026-10-19:career:10',
      '2026-10-19:career:5',
      '2026-10-19:career:1',
      '2026-10-19:career:0',
    ]);
  });

  it('transition into a prayer fires the transition, then “Time for …”', () => {
    const fired = new Set<string>();
    const events = run(T('2026-10-19T13:04:58'), T('2026-10-19T13:05:02'), 1000, fired, false);
    expect(events.map((e) => e.id)).toEqual(['2026-10-19:lunch:0', '2026-10-19:zuhr:start']);
  });

  it('overnight: sleep alerts fire on the next calendar date with the sleep block’s date key', () => {
    const fired = new Set<string>();
    const events = run(T('2026-10-20T05:19'), T('2026-10-20T05:31'), 1000, fired);
    expect(events.map((e) => e.id)).toEqual([
      '2026-10-19:sleep:10',
      '2026-10-19:sleep:5',
      '2026-10-19:sleep:1',
      '2026-10-19:sleep:0',
    ]);
  });
});

describe('visual state, quiet hours, pruning', () => {
  it('visual state follows remaining time', () => {
    const th = [10, 5, 1];
    expect(visualState(11 * 60_000, th)).toBe('normal');
    expect(visualState(10 * 60_000, th)).toBe('amber');
    expect(visualState(5 * 60_000, th)).toBe('amber-pulse');
    expect(visualState(59_000, th)).toBe('red');
  });

  it('quiet hours wrap midnight', () => {
    const q = { start: '22:00', end: '05:25' };
    expect(isQuietHours(T('2026-10-19T21:59'), q)).toBe(false);
    expect(isQuietHours(T('2026-10-19T22:00'), q)).toBe(true);
    expect(isQuietHours(T('2026-10-20T03:00'), q)).toBe(true);
    expect(isQuietHours(T('2026-10-20T05:25'), q)).toBe(false);
    expect(isQuietHours(T('2026-10-20T12:00'), { start: '12:00', end: '13:00' })).toBe(true);
  });

  it('prunes old fired ids only', () => {
    expect(isPrunable('2026-10-10:career:5', '2026-10-20')).toBe(true);
    expect(isPrunable('2026-10-19:career:5', '2026-10-20')).toBe(false);
  });
});
