/**
 * Generates realistic fake data for manual testing (Phase 3 acceptance).
 * Pure: returns records; the caller writes them to IndexedDB or to a JSON export.
 */
import { buildCheckIn } from '../game/checkin';
import { evaluateDay } from '../game/days';
import type { CheckIn, CheckInStatus, DayRecord, GameData, PrayerCheck } from '../game/types';
import { checklistPrayers, resolveDay } from '../schedule/resolve';
import { addDays, isoKL } from '../schedule/time';

/** Small deterministic PRNG so seeds are reproducible. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NOTES: Record<string, string[]> = {
  deep_work: ['Shipped the auth refactor', 'Fixed the flaky sync test', 'Drafted the API spec', 'Wrote the migration', 'Profiled and cut load time 30%'],
  career_jobs: ['Tailored CV for two ML roles', 'Applied via referrals', 'Followed up on last week'],
  career_scholarship: ['Emailed two supervisors at NUS', 'Refined research proposal', 'Scholarship form drafted'],
  research: ['Read 2 papers on retrieval', 'Wrote related-work section', 'Annotated survey paper'],
  exercise: ['5 km run', 'Gym — push day', 'Swim 30 min'],
  review: ['Planned tomorrow', 'Weekly retro done'],
  wind_down: [],
};

export function generateSeed(endDate: string, days = 21, seed = 42): GameData {
  const rnd = mulberry32(seed);
  const checkIns: CheckIn[] = [];
  const prayers: PrayerCheck[] = [];
  const dayRecords: DayRecord[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(endDate, -i);
    const blocks = resolveDay(date).blocks;
    const quality = rnd(); // some days great, some rough
    const dayCheckIns: CheckIn[] = [];
    for (const b of blocks.filter((x) => x.checkIn && x.date === date)) {
      if (rnd() < 0.08) continue; // unanswered
      const r = rnd();
      const status: CheckInStatus = r < 0.55 + quality * 0.35 ? 'done' : r < 0.9 ? 'partial' : 'skipped';
      const pool = NOTES[b.category] ?? [];
      const note = pool.length && rnd() < 0.6 ? pool[Math.floor(rnd() * pool.length)] : undefined;
      const count =
        b.category === 'career_jobs' ? Math.floor(rnd() * 4) : b.category === 'career_scholarship' ? Math.floor(rnd() * 2) + (rnd() < 0.5 ? 1 : 0) : undefined;
      const ts = isoKL(b.end + 5 * 60_000);
      dayCheckIns.push(buildCheckIn(b, { status, note, count }, ts));
    }
    checkIns.push(...dayCheckIns);
    const dayPrayers: PrayerCheck[] = checklistPrayers(blocks).map((p) => ({
      id: `${date}:${p}`,
      date,
      prayer: p,
      prayed: rnd() < 0.85 + quality * 0.15,
    }));
    prayers.push(...dayPrayers);
    const ev = evaluateDay(date, blocks, dayCheckIns, dayPrayers);
    dayRecords.push({ date, badDayMode: quality < 0.1, dayType: ev.dayType, bonusXp: ev.bonusXp });
  }
  return { checkIns, prayers, days: dayRecords };
}
