# Decisions

Where the PRD was ambiguous I picked the simplest option that meets the requirement and recorded it here.

## Process

- **All four phases were built in one pass.** The PRD asks to stop after each phase for approval, but the owner asked to "go all out" in chat, and chat instructions win. Each phase's acceptance checks were still run before moving on (see `TASKS.md`).

## Schedule

- **Friday gap 12:40–12:45** between the Friday lunch and Jumu'ah is filled with an explicit `to_mosque` block ("Head to the mosque", rest, no check-in). The resolver also fills any leftover gap with a synthetic "Free time" block, so the HUD always has a current block.
- **Sunday "gaps become Free time"** is written out as explicit `free_*` blocks in `schedule.json`. Free blocks between prayers are `flex` with `minMin: 0` so they stretch and shrink around real prayer times.
- **Reflow rule.** Pinned blocks (fixed or anchored) never move. Each run of consecutive flex blocks between two pinned neighbours is reflowed to fill the gap exactly. The run's outer edges meet the neighbours; interior boundaries keep their nominal times unless a block would drop below its `minMin`, in which case boundaries are pushed (forward pass, then backward pass). So with Zuhr at 12:55, lunch shrinks and qailulah stretches. With Zuhr at 13:20, qailulah keeps its 10-min floor and pushes into the transition buffer.
- **Infeasible runs.** If the minimums can't fit, every block in the run keeps `minMin` (stored as `plannedEnd`), the conflict is logged once to the console, and on the HUD the later-starting block wins: the flex block's effective `end` is trimmed to the next block's start. The prayer always starts on time.
- **Flex blocks squeezed to 0 minutes** are dropped for that day.
- **Check-in sheets** are only for work blocks (`deep_work`, `career_*`, `research`, `exercise`, `review`, `wind_down`). Meals, rest and free time have no XP and no check-in. Prayers use the separate checklist (FR4.5). The success metric "80% of blocks get a check-in" is measured over these blocks.
- **Prayer checklist on Friday** has five items: Fajr, Jumu'ah, Asr, Maghrib, Isha ("Jumu'ah replacing Zuhr"). The PRD's "six on Friday" contradicts "replacing", so I went with replacing. Tahajjud is not in the checklist.
- **Prayer block "start" alert.** The previous block's transition tone already plays at that moment, so "Time for {prayer}" is notification-only. Only one notification is shown per tick, and the prayer one wins.

## Time

- **Asia/Kuala_Lumpur everywhere.** Midnight for each date comes from Luxon in that zone. Wall-clock times are then added as minute offsets, because KL has had a fixed +08:00 offset with no DST since 1982. This made resolving a day ~5× faster (profiling found resolution dominated Lighthouse's blocking time). Pure calendar arithmetic (add days, weekday, week start) uses UTC date math on `YYYY-MM-DD` strings, which is timezone-free and exact. Tests run the resolver under four other device zones to prove nothing moves.
- **`?now=`** without an offset is read as KL wall-clock time and the clock then runs forward from it in real time. `?speed=N` multiplies the clock rate. With `?speed`, the worker ticks every `1000/N` ms (min 50 ms) so each tick advances about one virtual second.
- **Missed-alert window.** An alert fires only if its time lies in `(previous tick, this tick]` and is at most `max(60 s, 3 ticks)` old. The first tick of a session never fires anything (FR2.6), and sleep/resume or dev "jumps" don't replay stale alerts.

## Alerts

- **Threshold behaviour is by size,** so per-category lists stay meaningful. More than 5 min: colour only. 2–5 min: soft chime + notification "{m} min left: {block}. Next: {next}". 1 min or less: double chime + "{m} min left. Next: {next}". 0: transition tone + "{next} starts now".
- **Quiet hours mute sounds only.** Notifications still appear, marked silent.
- **Audio unlock.** Any tap or keypress anywhere unlocks audio for the session, as well as the banner itself.
- Fired alert ids older than 3 days are pruned on start-up.

## Game

- **Wake streak** uses the Fajr prayer checklist tick. The PRD says "Fajr block checked in as Done", but prayers use the checklist, not the sheet (FR4.5).
- **Full day** means every scheduled check-in (work blocks) is Done or Partial. Prayers are not required for a Full day; they are required for a Minimum viable day.
- **Deep-work sprint for an MVD** is approximated by "a `deep_work` check-in is Done or Partial". Check-ins are per block, not per sprint.
- **Streaks never break mid-day.** If today doesn't qualify yet, the current streak counts back from yesterday.
- **Stored vs derived.** `CheckIn.xpAwarded` and `DayRecord.bonusXp` are stored snapshots, so later rule changes don't rewrite history (per the data model). Everything else (levels, streaks, quest progress, quest XP, prayer XP) is derived. Quest XP uses the current targets, so changing a target changes past weeks' quest XP. Accepted for simplicity.
- **Prayer XP** (when enabled) is 10 XP per prayed checklist item.
- **Deep-work hours** count `deep_work` and `research` blocks, as in the category table. Partial counts half the scheduled minutes.
- **Level 0** is 0–99 XP. Level n starts at `round(100 × n^1.5)`.
- **"4 weeks of all quests met"** counts any 4 weeks, not necessarily consecutive.
- **The "Bad day" toggle** is stored on today's `DayRecord.badDayMode`.

## Prayer times

- Aladhan `calendarByCity` with **method 17 (JAKIM)**, verified against `https://api.aladhan.com/v1/methods` on 2026-10-20. A trimmed real October 2026 response is the test fixture.
- Near month end (≤3 days left) the next month is prefetched so the first days of a new month work offline.
- **Real-data finding:** in October 2026, JAKIM Fajr in KL is about 05:38–05:44, earlier than the 05:50 fallback. Tahajjud (05:30 → Fajr, `minMin` 10) therefore only gets 8–9 minutes, and the resolver logs a conflict every day this month. The schedule is unchanged. If you want Tahajjud's full 10+ minutes, move its start to 05:25 or lower `minMin` in `schedule.json`.

## Platform

- **Lighthouse "PWA" category** was removed in Lighthouse 12, so it can't be scored. Installability was verified directly instead: manifest, 192/512/maskable icons and an active service worker with precache, plus an offline reload with the server stopped. Lighthouse 13.5 scores: Performance 98, Accessibility 100, Best Practices 100, SEO 100.
- **jsdom pinned to 27.4.0** (not the latest, 30.x), because jsdom 30 requires Node ≥ 22.22 and the dev machine has 22.14.
- **Icons** are generated by a dependency-free script (`npm run icons`) instead of `@vite-pwa/assets-generator` (which needs `sharp`).
- **The service worker only registers in production builds.** Dev uses `new Notification()` as a fallback.
- **Kiosk mode** closes when fullscreen is exited (Esc). On iPhone, where the Fullscreen API isn't available, it's an overlay with a close button.

## Design refresh (identity layer)

- **Dark-first.** `<html class="dark">` is always set and Tailwind uses `darkMode: 'class'`. The app is a HUD that often runs full-screen at night, and one polished theme beats two average ones. Kiosk was already always dark.
- **Category colours** keep the Google Calendar hue families but are lightened to glow on the dark canvas. `--accent` is a registered `@property` colour, so the whole UI cross-fades when a block changes.
- **Fonts** are self-hosted through Fontsource (Geist, Geist Mono, Instrument Serif) so the app still works offline. Font files are runtime-cached (CacheFirst) rather than precached, because Fontsource ships every unicode-range subset and the browser only fetches the ones it needs.
- **Motion** uses the `motion` library under `<MotionConfig reducedMotion="user">`. CSS keyframes also stop under `prefers-reduced-motion`.
- **Five identity pillars** (`src/game/identity.ts`) are reverse-engineered from the end goal: AI engineer (Craft), spiritually centred (Deen), healthy (Body), wealthy (Wealth), loved (Love). Deep work, research and review → Craft. Prayers → Deen. Exercise and wind down → Body. Career blocks → Wealth. Meals and rest vote for nothing.
- **Love** has no block with a check-in, so it gets a one-tap daily "Showed up for someone" tick stored as `DayRecord.connected`. The field is optional, so there's no schema bump and old exports import unchanged.
- **Compound index** = 1.0 on the first recorded day, × 1.01 per Full day, × 1.005 per Minimum viable day, × 0.99 otherwise. Today only counts once it qualifies. It is derived, never stored. "Year at this pace" projects the last 7 tracked days over 365.
- **Ranks** map levels onto an engineering career ladder (Apprentice → Fellow).
- **North Star settings** (name, vision year, per-pillar statements, milestones) live in `Settings.northStar`. `withDefaults` fills it in for older stored settings.
- **Wisdom lines** rotate every 20 minutes and are chosen to fit the current block (prayer blocks only show Qur'an and hadith; deep work and research favour ML engineering tips). Unattributed tips name the practice, not an invented author.
- **"Stats" is now "Growth".** A stored `rh.tab = 'stats'` is migrated on load.
