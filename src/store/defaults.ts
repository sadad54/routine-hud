import { defaultThresholds } from '../alerts/engine';
import { DEFAULT_TARGETS } from '../game/quests';
import type { Settings } from '../game/types';

export function defaultSettings(): Settings {
  return {
    id: 'singleton',
    mute: false,
    quietHours: { start: '22:00', end: '05:25' },
    thresholdsByCategory: defaultThresholds(),
    prayerXp: false,
    questTargets: { ...DEFAULT_TARGETS },
  };
}

/** Fill in any fields missing from an older stored settings object. */
export function withDefaults(s: Partial<Settings> | undefined): Settings {
  const d = defaultSettings();
  if (!s) return d;
  return {
    ...d,
    ...s,
    id: 'singleton',
    quietHours: { ...d.quietHours, ...s.quietHours },
    thresholdsByCategory: { ...d.thresholdsByCategory, ...s.thresholdsByCategory },
    questTargets: { ...d.questTargets, ...s.questTargets },
  };
}
