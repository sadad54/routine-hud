import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { RoutineDB } from './db';
import { exportAll, importAll, validateExport, wipeAll } from './backup';
import { generateSeed } from '../dev/seed';
import { defaultSettings } from './defaults';

describe('export / wipe / import', () => {
  it('round-trips with no data lost', async () => {
    const db = new RoutineDB(`test-${Math.random()}`);
    const seed = generateSeed('2026-10-20', 21, 3);
    await db.checkIns.bulkAdd(seed.checkIns);
    await db.prayerChecks.bulkAdd(seed.prayers);
    await db.days.bulkAdd(seed.days);
    await db.settings.put({ ...defaultSettings(), mute: true });
    await db.achievements.put({ id: 'first_checkin', unlockedAt: '2026-10-01T10:00:00.000+08:00' });
    await db.firedAlerts.put({ id: '2026-10-20:career:5', firedAt: '2026-10-20T11:55:00.000+08:00' });
    await db.prayerMonths.put({ id: '2026-10', fetchedAt: '2026-10-20T00:00:00.000+08:00', days: { '2026-10-20': { fajr: '05:40', dhuhr: '12:59', asr: '16:16', maghrib: '19:00', isha: '20:09' } } });

    const before = await exportAll(db, 'fixed');
    const text = JSON.stringify(before);
    await wipeAll(db);
    expect(await db.checkIns.count()).toBe(0);
    await importAll(db, JSON.parse(text));
    const after = await exportAll(db, 'fixed');
    expect(after).toEqual(before);
    expect(after.tables.checkIns.length).toBe(seed.checkIns.length);
    db.close();
  });

  it('rejects bad files without touching data', async () => {
    const db = new RoutineDB(`test-${Math.random()}`);
    await db.checkIns.bulkAdd(generateSeed('2026-10-20', 2, 1).checkIns);
    const n = await db.checkIns.count();
    await expect(importAll(db, { schemaVersion: 99, tables: {} })).rejects.toThrow(/newer/);
    await expect(importAll(db, { tables: {} })).rejects.toThrow(/schemaVersion/);
    expect(await db.checkIns.count()).toBe(n);
    expect(validateExport({ schemaVersion: 1, tables: { bogus: [] } })).toMatch(/Unknown table/);
    db.close();
  });
});
