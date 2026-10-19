/** Headless components that react to the clock and data: alerts, achievements, prayer refresh. */
import { useEffect, useRef } from 'react';
import { useClock } from '../clock/clock';
import { dueAlerts, isQuietHours, type AlertEvent, type AlertSound } from '../alerts/engine';
import { ACHIEVEMENTS } from '../game/summary';
import { QUEST_LABEL } from '../game/quests';
import { playSound } from '../platform/audio';
import { showNotification } from '../platform/notify';
import { blocksAround } from '../schedule/now';
import { getResolver, useApp } from '../store/app';
import { useGame, useToday } from './hooks';

const SOUND_RANK: Record<AlertSound, number> = { none: 0, chime: 1, double: 2, transition: 3 };

function loudest(events: AlertEvent[]): AlertSound {
  return events.reduce<AlertSound>((s, e) => (SOUND_RANK[e.sound] > SOUND_RANK[s] ? e.sound : s), 'none');
}

/** Runs the alert engine on every clock tick. */
export function AlertRunner() {
  useEffect(
    () =>
      useClock.subscribe((s) => {
        try {
          if (s.prevNow == null) return;
          const app = useApp.getState();
          if (!app.ready) return;
          const blocks = blocksAround(s.now, getResolver());
          const step = Math.max(0, s.now - s.prevNow);
          const due = dueAlerts({
            prevNow: s.prevNow,
            now: s.now,
            blocks,
            thresholds: app.settings.thresholdsByCategory,
            fired: app.fired,
            graceMs: Math.max(60_000, 3 * step),
          });
          if (!due.length) return;
          void app.markFired(due.map((a) => a.id));

          const sounding = !app.settings.mute && !isQuietHours(s.now, app.settings.quietHours);
          if (sounding) playSound(loudest(due));
          // One notification per tick: the last one is the most relevant (e.g. "Time for Asr").
          const withNote = due.filter((a) => a.notification);
          const last = withNote[withNote.length - 1];
          if (last?.notification) {
            void showNotification(last.notification.title, last.notification.body, { tag: 'routine-boundary', silent: !sounding });
          }
          if (due.some((a) => a.kind === 'transition')) app.flash();

          const keys = due
            .filter((a) => a.kind === 'transition')
            .map((a) => a.blockKey)
            .filter((k) => blocks.find((b) => b.key === k)?.checkIn && !app.checkIns.some((c) => c.id === k));
          if (keys.length && !app.kiosk) app.openSheet(keys);
        } catch (err) {
          console.error('[alerts] tick failed', err);
        }
      }),
    [],
  );
  return null;
}

function readLS(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeLS(key: string, v: string) {
  try {
    localStorage.setItem(key, v);
  } catch {
    /* ignore */
  }
}

/** Unlocks achievements, celebrates level-ups and quest completions. */
export function GameWatcher() {
  const ready = useApp((s) => s.ready);
  const stored = useApp((s) => s.achievements);
  const game = useGame();
  const first = useRef(true);

  useEffect(() => {
    if (!ready) return;
    const app = useApp.getState();
    const have = new Set(stored.map((a) => a.id));
    const fresh = game.eligibleAchievements.filter((id) => !have.has(id));
    if (fresh.length) {
      void app.unlockAchievements(fresh);
      for (const id of fresh) {
        const def = ACHIEVEMENTS.find((a) => a.id === id);
        if (def) app.toast({ kind: 'achievement', title: `${def.icon} ${def.title}`, body: def.description });
      }
    }

    const prevLevel = Number(readLS('rh.level') ?? '-1');
    if (prevLevel >= 0 && game.level.level > prevLevel) {
      app.celebrate();
      app.toast({ kind: 'level', title: `Level ${game.level.level}!`, body: `${game.totalXp} XP total` });
    }
    writeLS('rh.level', String(game.level.level));

    const seen = new Set((readLS('rh.quests') ?? '').split(',').filter(Boolean));
    for (const q of game.week.completed) {
      const key = `${game.week.weekStart}:${q}`;
      if (!seen.has(key)) {
        if (!first.current || seen.size > 0) app.toast({ kind: 'quest', title: `Quest complete: ${QUEST_LABEL[q]}`, body: '+100 XP' });
        seen.add(key);
      }
    }
    writeLS('rh.quests', [...seen].slice(-40).join(','));
    first.current = false;
  }, [ready, game, stored]);
  return null;
}

/** Refetch prayer times when the month changes or the device comes back online. */
export function PrayerWatcher() {
  const today = useToday();
  const month = today.slice(0, 7);
  const ready = useApp((s) => s.ready);
  useEffect(() => {
    if (ready) void useApp.getState().loadPrayerTimes();
  }, [month, ready]);
  useEffect(() => {
    const on = () => void useApp.getState().loadPrayerTimes();
    window.addEventListener('online', on);
    return () => window.removeEventListener('online', on);
  }, []);
  return null;
}
