/**
 * Generates 3 weeks of fake check-ins as an importable export file.
 *
 *   npm run seed                      → seed-export.json ending yesterday (KL)
 *   npm run seed -- 2026-10-20 28 7   → end date, number of days, PRNG seed
 *
 * Import it in the app: Settings → Data → Import JSON.
 * (In dev you can also use the dev panel's "Seed 3 weeks" button.)
 */
import { writeFileSync } from 'node:fs';
import { generateSeed } from '../src/dev/seed';
import { defaultSettings } from '../src/store/defaults';
import { SCHEMA_VERSION } from '../src/store/db';
import { addDays, dateKey, isoKL } from '../src/schedule/time';

const [endArg, daysArg, seedArg] = process.argv.slice(2);
const end = endArg ?? addDays(dateKey(Date.now()), -1);
const days = Number(daysArg ?? 21);
const seed = Number(seedArg ?? 42);

const data = generateSeed(end, days, seed);
const file = {
  schemaVersion: SCHEMA_VERSION,
  exportedAt: isoKL(Date.now()),
  app: 'routine-hud',
  tables: {
    checkIns: data.checkIns,
    prayerChecks: data.prayers,
    prayerMonths: [],
    firedAlerts: [],
    days: data.days,
    achievements: [],
    settings: [defaultSettings()],
  },
};
writeFileSync('seed-export.json', JSON.stringify(file, null, 2));
console.log(
  `seed-export.json: ${data.checkIns.length} check-ins, ${data.prayers.length} prayer checks, ${data.days.length} days (${addDays(end, -(days - 1))} → ${end})`,
);
