# Routine HUD

A single-user, installable web app that answers **"what should I be doing right now, and how long is left?"** at a glance. It shows the current block of a fixed daily routine, counts it down, warns before every boundary, and turns sticking to the routine into a game with XP, levels, streaks and weekly quests. Prayer blocks follow the real JAKIM prayer times for Kuala Lumpur.

- Vite + React 18 + TypeScript (strict) · Tailwind · Motion · Lucide · Zustand · Dexie (IndexedDB) · Luxon · Recharts (lazy) · vite-plugin-pwa
- No backend, no accounts, no analytics. Works offline after the first load.
- All times are **Asia/Kuala_Lumpur**, whatever the device's time zone.

On top of the routine sits an **identity layer** reverse-engineered from the end goal (an AI engineer who is spiritually centred, healthy, wealthy and loved): every check-in, prayer and "showed up for someone" tick is a vote for one of five pillars, a compound index tracks the 1%-a-day curve, and a rotating line of wisdom (self-help, ML engineering, Qur'an and hadith) fits whatever block you're in. Press <kbd>⌘K</kbd> for the command menu; <kbd>1</kbd>–<kbd>4</kbd> switch tabs, <kbd>F</kbd> focus mode, <kbd>M</kbd> mute, <kbd>Q</kbd> another quote.

> **Alerts only fire while the app is open.** A web app can't reliably ring alarms when it's closed, especially on iPhone. Google Calendar covers closed-app reminders.

## Local development

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # unit + component tests (Vitest)
npm run build        # type-check + production build to dist/
npm run preview      # serve dist/ (service worker active) on :4173
```

Node 22.12+ is required.

## Dev URL parameters

| Param | Example | Effect |
| --- | --- | --- |
| `?now=` | `?now=2026-10-23T12:50` | Starts the clock at that moment. No offset means KL wall-clock time; `Z` or `+08:00` offsets also work. The clock then runs forward. |
| `?speed=` | `?speed=60` | Runs time at 60×. Combine with `?now=` to watch a block's alerts in about a minute. |
| `?dev=1` | | Shows the dev panel without changing time. |

The **dev panel** (bottom-right bug icon whenever any of these is set) can switch speed (1×/10×/60×/300×), jump +1/+10 min or to 11 minutes before the current block ends, return to real time, and **seed 3 weeks of fake check-ins**.

Example: watch every alert of the career block.

```
http://localhost:5173/?now=2026-10-19T11:48&speed=60
```

Tap once to enable sound. You'll see amber at 10 min, a chime at 5, a double chime at 1, then the transition tone, a flash, and the check-in sheet.

## Seed data

```bash
npm run seed                       # writes seed-export.json (21 days ending yesterday)
npm run seed -- 2026-10-20 28 7    # end date, days, PRNG seed
```

Import it via **Settings → Data → Import JSON**.

## Editing the schedule

Everything lives in [`src/schedule/schedule.json`](src/schedule/schedule.json):

- `weekdayTemplate` maps each weekday to a template (`standard`, `friday`, `sunday`).
- `careerByDay` decides whether the `career` block is `career_jobs` or `career_scholarship`.
- Each block: `id`, `title`, `category`, `start` (`HH:mm`), then `end` or `durationMin`, plus optional fields:
  - `anchor: { prayer, offsetMin }`: the start follows that day's real prayer time. `start` is the offline fallback.
  - `endFixed`: an anchored block whose end stays at a clock time (Fajr).
  - `flex: true` + `minMin`: stretches or shrinks to meet anchored neighbours, never below `minMin`.
  - `sprints: [85, 10, 85]`: work/break segments with their own sub-countdown and chimes.
  - `overnight: true`: the block ends on the next day (Sleep).
  - `noCheckIn: true`: no check-in sheet.
- Keep the same `id` for a block across templates so stats line up.

Run `npm test` after editing. The resolver tests check every day is contiguous.

## Deploying to GitHub Pages

1. Push this folder to a GitHub repository with `main` as the default branch.
2. In the repo, go to **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Push to `main`. [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) runs the tests, builds with `BASE_PATH=/<repo-name>/` and deploys.
4. Open `https://<user>.github.io/<repo-name>/`, then install it: Chrome's install icon in the address bar, or Safari → Share → Add to Home Screen on iPhone.

## Project layout

```
src/
  schedule/   schedule.json, resolver (templates → prayer anchors → flex reflow), now-state   [pure]
  clock/      Web Worker tick + virtual dev clock (?now / ?speed)
  alerts/     threshold/transition/sprint/prayer alert engine, quiet hours                   [pure]
  prayer/     Aladhan JAKIM parsing + cache policy [pure], fetch
  game/       XP, levels, streaks, quests, Minimum viable day, identity pillars, achievements [pure]
  content/    wisdom library (quotes, ML tips, reminders) and the block-aware picker         [pure]
  store/      Dexie DB, export/import, Zustand app store
  platform/   Web Audio chimes, notifications, wake lock
  ui/         screens and components
  dev/        seed generator
```

`schedule/`, `alerts/` and `game/` have no React or browser APIs and carry the unit tests. Remaining time is always derived from the wall clock, never decremented.

See [`DECISIONS.md`](DECISIONS.md) for every judgement call and [`TASKS.md`](TASKS.md) for the acceptance checklist.
