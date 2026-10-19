# Acceptance checklist

Status of every PRD build-phase acceptance check, with the evidence behind it. `npm test` runs 93 tests in 6 files (all passing at the time of writing).

## Phase 1: Schedule engine and HUD

- [x] Vite, React, TypeScript (strict), Tailwind, Zustand, Dexie scaffolded; every dependency pinned to an exact version (`package.json`).
- [x] GitHub Pages deploy workflow: `.github/workflows/deploy.yml` (tests, build with `BASE_PATH`, deploy). A sub-path build was checked locally: all asset URLs are prefixed with `/<repo>/`.
- [x] `schedule.json` has all three templates written out in full (`standard`, `friday`, `sunday`).
- [x] Resolver unit tests: each weekday (Mon–Thu, Sat standard with the right career category), the Friday and Sunday templates, the overnight Sleep block and the midnight rollover. See `src/schedule/resolve.test.ts`.
- [x] Worker clock (`src/clock/clock.worker.ts`) with every tick recomputed from the wall clock.
- [x] `?now=2026-10-23T12:50` shows Jumu'ah, 55:00 left, next Transition 13:45. Covered by unit tests and a React Testing Library render (`src/ui/now.test.tsx`), and checked in the browser.
- [x] Timezone independence: the resolver gives identical results under New York, London, Auckland and UTC device zones.

## Phase 2: Alerts and kiosk

- [x] Thresholds 10/5/1/0, configurable per category; Web Audio chimes (soft, double, transition); service-worker notifications; "Tap to enable sound" banner.
- [x] Unit tests show each threshold fires exactly once, including across a reload with persisted ids, with no replay on reopen and no stale alerts after a long gap. See `src/alerts/engine.test.ts`.
- [x] Fired-alert persistence as `{date}:{blockId}:{threshold}`. Checked in IndexedDB after a live 60× run: `jumuah:10`, `jumuah:5`, `jumuah:1`, `jumuah:0`, each once.
- [x] Mute, plus quiet hours 22:00–05:25 (wrap-around tested).
- [x] Sprint sub-timer and sprint chimes (no 10/5-min warnings for sprints); prayer "Time for …" alerts.
- [x] Dev panel with `?speed=60`: a full block's alerts watched in about a minute in the browser (amber at 10 min, then transition flash).
- [x] Kiosk mode: fullscreen, Wake Lock, re-requested on `visibilitychange`, dark.
- [~] **Background tab for 10 minutes: 5-min and 1-min alerts on time.** Headless Chrome 11-minute run against the production build, with `document.visibilityState === 'hidden'` the whole time: the 10/5/1/0-min alerts for Deep Work 1 fired 0.14–0.15 s after their times. *Caveat:* a main-thread 1 s control interval wasn't throttled in headless mode either (max gap 1 s), so this shows correctness in a hidden tab but not resilience to Chrome's intensive throttling. That's why the clock runs in a Web Worker. Confirm once in desktop Chrome with the app open in a background tab. (A separate foreground run: 5/1/0-min alerts 0.45 s late.)

## Phase 3: Check-ins and game

- [x] Check-in sheet (Done/Partial/Skipped, note, count for career blocks), queue badge, one-pass queue, editable until the end of the next day, then locked.
- [x] Prayer checklist (5 taps; Jumu'ah replaces Zuhr on Friday).
- [x] Unit tests: XP totals, level thresholds, each streak's break and continue rules, Minimum viable day detection, the Monday 00:00 KL quest reset. See `src/game/game.test.ts`.
- [x] Bad-day mode shows only the MVD checklist.
- [x] Achievements config: `src/game/achievements.json` (13 badges).
- [x] Seed script: `npm run seed` writes `seed-export.json`; the dev panel's "Seed 3 weeks" writes straight to IndexedDB.

## Phase 4: Prayer times, stats, PWA polish

- [x] Aladhan JAKIM (method id 17, verified) fetch, cached by month in IndexedDB, refetched on month change or when older than 7 days and online, next month prefetched near month end. Parser tested against a real October 2026 response.
- [x] Unit tests: flex reflow with Zuhr at 12:55 and at 13:20, the `minMin` floor (feasible and infeasible), and later Fajr, Asr, Maghrib and Isha.
- [x] Stats tab: weekly quest bars, 8-week charts against targets, adherence heatmap, achievements, notes log with category filter. Charts are lazy-loaded.
- [x] Settings: thresholds per category, mute, quiet hours, prayer XP, quest targets, today's prayer times and source, export/import/wipe, the closed-app note.
- [x] Export → wipe → import round-trips with no data lost (`src/store/backup.test.ts`, deep-equal on every table).
- [x] PWA manifest, icons (192, 512, maskable, apple-touch), service worker precache. Offline: reloaded with the server stopped; the app and cached prayer times loaded.
- [x] Lighthouse 13.5 (mobile): **Performance 98, Accessibility 100, Best Practices 100, SEO 100.** The PWA category no longer exists in Lighthouse (removed in v12); installability was checked directly instead.
- [ ] Install on a real iPhone via Add to Home Screen. **Needs you.** It can't be done from this machine.

## Non-functional

- [x] Main bundle 125 KB gzipped (budget 300 KB); charts load separately (107 KB gzipped) only on the Stats tab.
- [x] No network calls except prayer times and static assets.
- [x] Prayer-fetch, audio, notification and wake-lock failures are caught and logged; the HUD keeps running.
- [x] Reduced motion: pulses and confetti off; colour changes stay.

## Bugs found and fixed during the build

1. **Wake-up alert lost at 05:30.** `blocksAround` dropped yesterday's blocks once they had ended, so last night's Sleep was already gone on the tick that crossed 05:30, and its transition alert never fired. Caught by the overnight alert test. Fix: keep blocks that ended in the last 2 hours.
2. **Per-tick resolver cost.** Resolving 3 days on every tick made a 16-minute simulated run take over 5 s in tests. Fix: memoise the resolver per date.
3. **Total blocking time of 2.2 s in Lighthouse.** Luxon zone conversions dominated: about 5 ms per day resolved and 120 ms for a 21-day game summary. Fix: Luxon for KL midnight, then minute offsets (KL has no DST), plus UTC math for calendar dates. Results: 5× faster resolve, 25× faster summary, TBT 30 ms.
4. **Contrast failures.** Dimming past timeline rows with opacity dropped text below WCAG AA. Fix: muted text colours instead of opacity.
5. **Heatmap showed "0%" for days before any data.** Fix: those days now show blank, labelled "no data".
