# Daily Routine PWA — PRD

Oct 20, 2026 · @Adnan Mashrur Sadad

## Overview

Build a single-user, installable web app (PWA) that shows which block of a fixed daily routine is running right now, counts it down, warns before every block boundary, and turns the routine into a game with XP, streaks and weekly quests. Working name: **Routine HUD**.

**Problem.** The routine already lives in Google Calendar, which handles reminders. What it lacks is a live, always-visible view of the current block and a feedback loop that rewards sticking to it.

**Goals**

- Answer "what should I be doing right now, and how long is left?" at a glance from across the room.
- Warn before each block ends so transitions happen on time.
- Track adherence per block and roll it up into four weekly numbers: deep-work hours, job applications, supervisor emails, exercise days.
- Reward consistency with XP, levels, streaks and quests, without punishing a bad day.
- Keep prayer blocks aligned to real daily prayer times in Kuala Lumpur.

**Success metrics (after 4 weeks of use)**

- App opened on at least 6 of 7 days each week.
- At least 80% of blocks receive a check-in.
- Boundary alerts fire within 5 seconds of the scheduled time on desktop Chrome.

## Users and platform constraints

There is one user, the owner. No accounts, no backend, no multi-user features.

**Devices**

| Device | How it's used | What must work |
| --- | --- | --- |
| Laptop, Chrome (primary) | Installed as a desktop PWA, kept open beside work | Live HUD, sound alerts, desktop notifications, works in a background tab |
| iPhone, Safari | Added to Home Screen | Live HUD, check-ins, stats; alerts only while the app is open |
| Spare phone or tablet (optional) | Propped on the desk, full-screen | Kiosk mode with screen kept awake |

**Hard constraints**

- No App Store or Play Store. Hosted free as a static site on GitHub Pages.
- Works fully offline after first load, except the daily prayer-time fetch, which falls back to cache.
- A web app cannot reliably ring alarms when closed, especially on iOS. Google Calendar already handles closed-app reminders. The app must not promise background alarms and should say so in Settings.
- Timezone is always Asia/Kuala\_Lumpur, regardless of the device's timezone setting.

## Tech stack and architecture

| Concern | Choice | Why |
| --- | --- | --- |
| Build | Vite + React 18 + TypeScript (strict) | Fast, static output for GitHub Pages |
| Styling | Tailwind CSS | Quick theming, light and dark modes |
| PWA | vite-plugin-pwa (Workbox) | Installable, offline caching, service worker for notifications |
| Time and zones | Luxon | Explicit Asia/Kuala\_Lumpur handling |
| State | Zustand | Small, no boilerplate |
| Storage | IndexedDB via Dexie | Durable logs; localStorage only for UI prefs |
| Charts | Recharts | Weekly stats |
| Tests | Vitest + React Testing Library | Unit tests for the schedule and scoring engines |
| Deploy | GitHub Actions to GitHub Pages | Free, push to deploy |

**Core modules**

1. `schedule/` resolves the block list for any date: base template, weekday variants, then live prayer times applied on top.
2. `clock/` is the single source of time. A Web Worker posts a tick every second, because Chrome heavily throttles main-thread timers in background tabs. Every tick recomputes state from the wall clock, never by decrementing a counter, so missed ticks self-correct.
3. `alerts/` compares each tick against the boundary thresholds and fires each alert exactly once per block per threshold. It drives sound (Web Audio), notifications (service worker `showNotification`) and visual state.
4. `prayer/` fetches and caches a month of prayer times at a time.
5. `game/` is pure functions: check-ins in, XP, levels, streaks and quest progress out. No UI or storage inside it.
6. `store/` holds Dexie tables and Zustand slices.
7. `ui/` holds the screens.

Keep `schedule/`, `alerts/` and `game/` as pure, framework-free TypeScript with unit tests. All bugs that matter will live there.

## Schedule model

The whole schedule lives in one editable file, `src/schedule/schedule.json`. It has three day templates: `standard` (Mon to Thu and Sat), `friday` and `sunday` (rest day). It must match the routine already in Google Calendar.

**Block categories and base XP**

| Category | Examples | XP on Done | Counts toward |
| --- | --- | --- | --- |
| `deep_work` | Deep Work 1, Deep Work 2 | 20 per scheduled hour | Deep-work hours |
| `career_jobs` | Job applications | 40 | Applications (user enters a count) |
| `career_scholarship` | Scholarships and supervisor outreach | 40 | Supervisor emails (user enters a count) |
| `research` | Papers and writing | 25 | Deep-work hours |
| `exercise` | Exercise and shower | 30 | Exercise days |
| `review` | Review and plan, weekly review | 10 | none |
| `wind_down` | Screens off, sleep at 10 | 15 | Sleep streak |
| `prayer` | Fajr, Zuhr, Asr, Maghrib, Isha, Jumu'ah | 0 by default (toggle) | Prayer checklist |
| `meal`, `rest` | Breakfast, lunch, dinner, qailulah | 0 | none |

Partial earns 50% of a block's XP. Skipped earns 0.

**Anchoring rules**

- Blocks with an `anchor` are prayer blocks. Their start comes from that day's real prayer time plus `offsetMin`, and they keep their `durationMin`.
- Blocks marked `flex: true` stretch or shrink so they meet an anchored neighbor with no gap or overlap.
- Every other block keeps its fixed time.
- If a flex block would drop below `minMin` minutes, it keeps `minMin` and the conflict is logged to the console. It is not shown to the user.
- If prayer times can't load, use the fallback start `start` written on each anchored block.

**schedule.json**

```json
{
  "timezone": "Asia/Kuala_Lumpur",
  "weekdayTemplate": { "mon": "standard", "tue": "standard", "wed": "standard", "thu": "standard", "fri": "friday", "sat": "standard", "sun": "sunday" },
  "careerByDay": { "mon": "career_jobs", "tue": "career_scholarship", "wed": "career_jobs", "thu": "career_scholarship", "fri": "career_jobs", "sat": "career_scholarship" },
  "templates": {
    "standard": [
      { "id": "tahajjud", "title": "Tahajjud", "category": "prayer", "start": "05:30", "end": "05:50", "flex": true, "minMin": 10 },
      { "id": "fajr", "title": "Fajr + Quran + Dhikr", "category": "prayer", "start": "05:50", "end": "06:30", "anchor": { "prayer": "fajr", "offsetMin": 0 }, "endFixed": "06:30" },
      { "id": "dw1", "title": "Deep Work 1 — hardest task", "category": "deep_work", "start": "06:30", "end": "09:30", "sprints": [85, 10, 85] },
      { "id": "breakfast", "title": "Breakfast + Email (30 min cap)", "category": "meal", "start": "09:30", "end": "10:00" },
      { "id": "career", "title": "Career", "category": "$careerByDay", "start": "10:00", "end": "12:00" },
      { "id": "lunch", "title": "Lunch + Call Mom", "category": "meal", "start": "12:00", "end": "13:05", "flex": true, "minMin": 45 },
      { "id": "zuhr", "title": "Zuhr + Quran", "category": "prayer", "start": "13:05", "anchor": { "prayer": "dhuhr", "offsetMin": 0 }, "durationMin": 25 },
      { "id": "qailulah", "title": "Qailulah (20 min)", "category": "rest", "start": "13:30", "end": "13:50", "flex": true, "minMin": 10 },
      { "id": "buffer1", "title": "Transition", "category": "rest", "start": "13:50", "end": "14:00", "flex": true, "minMin": 0 },
      { "id": "dw2", "title": "Deep Work 2 — build & ship", "category": "deep_work", "start": "14:00", "end": "16:20", "flex": true, "minMin": 105 },
      { "id": "asr", "title": "Asr + short break", "category": "prayer", "start": "16:20", "anchor": { "prayer": "asr", "offsetMin": 0 }, "durationMin": 25 },
      { "id": "research", "title": "Research — papers & writing", "category": "research", "start": "16:45", "end": "17:45", "flex": true, "minMin": 45 },
      { "id": "exercise", "title": "Exercise + Shower", "category": "exercise", "start": "17:45", "end": "19:10", "flex": true, "minMin": 50 },
      { "id": "maghrib", "title": "Maghrib + Dhikr", "category": "prayer", "start": "19:10", "anchor": { "prayer": "maghrib", "offsetMin": 0 }, "durationMin": 20 },
      { "id": "dinner", "title": "Dinner", "category": "meal", "start": "19:30", "end": "20:20", "flex": true, "minMin": 30 },
      { "id": "isha", "title": "Isha", "category": "prayer", "start": "20:20", "anchor": { "prayer": "isha", "offsetMin": 0 }, "durationMin": 15 },
      { "id": "review", "title": "Review + Plan Tomorrow", "category": "review", "start": "20:35", "end": "21:30", "flex": true, "minMin": 30 },
      { "id": "winddown", "title": "Wind Down — screens off", "category": "wind_down", "start": "21:30", "end": "22:00" },
      { "id": "sleep", "title": "Sleep", "category": "rest", "start": "22:00", "end": "05:30", "overnight": true, "noCheckIn": true }
    ],
    "friday": "standard with: lunch 12:00–12:40 'Lunch (Friday)'; replace zuhr with { id: 'jumuah', title: 'Jumu\u2019ah', category: 'prayer', start: '12:45', end: '13:45' } (fixed, not anchored); remove qailulah; buffer1 13:45–14:00",
    "sunday": "standard minus dw1, career, dw2, research, review; add { id: 'weekly_review', title: 'Weekly Review', category: 'review', start: '10:00', end: '10:30' }; gaps become 'Free time' (category rest, no check-in)"
  }
}
```

The `friday` and `sunday` entries are written as instructions. Expand them into full block arrays in the real file. Use the same block shape and keep the `standard` blocks' ids where they are reused, so stats line up across days.

## Functional requirements

### FR1 — Now/Next HUD

- FR1.1 Show the current block's title, category color and time range in large type.
- FR1.2 Show a countdown ring and an `MM:SS` (or `H:MM:SS`) time remaining, both recomputed from the wall clock every second.
- FR1.3 Show the next block's title and start time.
- FR1.4 For deep-work blocks with `sprints`, show the current sprint or break as a sub-countdown under the main ring.
- FR1.5 Show today's XP, the current level with progress bar, and the active streak count in a compact header.
- FR1.6 Show a vertical timeline of today's blocks with past blocks dimmed and check-in status icons.

### FR2 — Boundary alerts

Default thresholds before a block ends, configurable per category:

| Time left | Visual | Sound | Notification |
| --- | --- | --- | --- |
| 10 min | Ring and accent turn amber | none | none |
| 5 min | Amber, gentle pulse | Soft chime | "5 min left: {block}. Next: {next}" |
| 1 min | Red, stronger pulse | Double chime | "1 min left. Next: {next}" |
| 0 (transition) | Flash, then the new block's color | Transition tone | "{next} starts now" |

- FR2.1 Each alert fires at most once per block instance per threshold, including after reloads. Persist fired alert keys as `{date}:{blockId}:{threshold}`.
- FR2.2 Sprint boundaries inside deep work get a single soft chime and a notification, with no 10-min or 5-min warnings.
- FR2.3 Prayer blocks get one extra alert at their start: "Time for {prayer}".
- FR2.4 Sound needs one user tap per session to unlock audio. Until then, show a persistent "Tap to enable sound" banner.
- FR2.5 A global mute toggle, plus quiet hours (default 22:00 to 05:25) when no sounds play.
- FR2.6 If the app was closed during a boundary, don't replay missed alerts on reopen. Show the current state only.

### FR3 — Live prayer times

- FR3.1 Fetch a month of timings from the Aladhan API (`calendarByCity`, city Kuala Lumpur, country Malaysia) using its JAKIM calculation method. Verify the method id against Aladhan's docs before hard-coding it.
- FR3.2 Cache by month in IndexedDB. Refetch when the month changes or when the cache is more than 7 days old and the app is online.
- FR3.3 Apply the anchoring rules from the Schedule model section.
- FR3.4 Show today's five prayer times in Settings and in a small strip on the HUD.

### FR4 — Check-ins

- FR4.1 When a block ends, open a check-in sheet for it with Done, Partial and Skipped buttons and an optional one-line note ("what I shipped").
- FR4.2 Career blocks also ask for a number: applications sent, or supervisor emails sent.
- FR4.3 Unanswered check-ins queue up. The HUD shows a badge, and the queue can be cleared in one pass.
- FR4.4 Check-ins stay editable until the end of the next day, then lock.
- FR4.5 Prayers use a separate quick checklist of five taps (six on Friday with Jumu'ah replacing Zuhr) rather than the end-of-block sheet.

### FR5 — Gamification

- FR5.1 XP comes from check-ins using the table in the Schedule model section.
- FR5.2 Daily bonus: +50 XP when every scheduled check-in for the day is Done or Partial.
- FR5.3 Levels: level n needs `100 × n^1.5` total XP, rounded. Show a level-up animation and toast.
- FR5.4 Streaks:
  - **Wake streak:** Fajr block checked in as Done.
  - **Exercise streak:** exercise Done or Partial. Sunday counts.
  - **Full day streak:** the day qualifies as a Full day or a Minimum viable day (FR6).
  - **Sleep streak:** Wind Down Done.
- FR5.5 Weekly quests reset Monday 00:00 KL:
  - 10 job applications
  - 3 supervisor emails
  - 30 deep-work hours
  - 5 exercise days
  - Each quest awards 100 XP on completion. Targets are editable in Settings.
- FR5.6 Achievements as one-time badges, for example: first 7-day wake streak, first 100 applications, 4 weeks of all quests met. Start with about 10 and keep them in a config file.
- FR5.7 Prayer XP is off by default, with a toggle in Settings.

### FR6 — Minimum viable day

- FR6.1 A day is a **Minimum viable day** if all five prayers are checked, at least one deep-work sprint is Done or Partial, at least one application or supervisor email is logged, and exercise is Done or Partial.
- FR6.2 A Minimum viable day keeps every streak alive except the exercise streak when exercise is skipped.
- FR6.3 A one-tap "Bad day" mode on the HUD hides the full timeline and shows only the minimum checklist.

### FR7 — Stats

- FR7.1 A weekly view of the four numbers against quest targets, with the current week and the previous 7 weeks.
- FR7.2 A daily adherence heatmap: share of check-ins Done or Partial per day.
- FR7.3 A notes log: all "what I shipped" notes, newest first, filterable by category.

### FR8 — Settings and data

- FR8.1 Alert thresholds per category, mute, quiet hours, prayer XP toggle, quest targets.
- FR8.2 Export all data to a JSON file, and import from one.
- FR8.3 A note explaining that alerts only fire while the app is open and that Google Calendar covers the closed-app case.

### FR9 — Kiosk mode

- FR9.1 One button enters full-screen, requests a screen Wake Lock, and hides everything except the ring, the block title and the next block.
- FR9.2 Re-request the Wake Lock when the page becomes visible again, since browsers release it on tab switch.

## Data model and storage

All durable data lives in IndexedDB through Dexie, in a database named `routine-hud` with a numbered schema version. UI-only preferences such as theme and last-open tab may use localStorage.

```ts
// Dates are 'YYYY-MM-DD' in Asia/Kuala_Lumpur; times are ISO strings with +08:00.

type CheckInStatus = 'done' | 'partial' | 'skipped';

interface CheckIn {
  id: string;            // `${date}:${blockId}`
  date: string;
  blockId: string;
  category: string;
  status: CheckInStatus;
  note?: string;         // "what I shipped"
  count?: number;        // applications or supervisor emails
  scheduledMinutes: number;
  xpAwarded: number;     // stored, so later rule changes don't rewrite history
  createdAt: string;
  updatedAt: string;
}

interface PrayerCheck { id: string; date: string; prayer: 'fajr'|'dhuhr'|'jumuah'|'asr'|'maghrib'|'isha'; prayed: boolean; }

interface PrayerTimesMonth { id: string; /* 'YYYY-MM' */ fetchedAt: string; days: Record<string, { fajr: string; dhuhr: string; asr: string; maghrib: string; isha: string }>; }

interface FiredAlert { id: string; /* `${date}:${blockId}:${threshold}` */ firedAt: string; }

interface DayRecord { date: string; badDayMode: boolean; dayType: 'full'|'mvd'|'none'; bonusXp: number; }

interface Achievement { id: string; unlockedAt: string; }

interface Settings {
  id: 'singleton';
  mute: boolean;
  quietHours: { start: string; end: string };
  thresholdsByCategory: Record<string, number[]>; // minutes before end, e.g. [10, 5, 1]
  prayerXp: boolean;
  questTargets: { applications: number; supervisorEmails: number; deepWorkHours: number; exerciseDays: number };
}
```

Derived values are never stored. Compute total XP, level, streaks and quest progress from `CheckIn`, `PrayerCheck` and `DayRecord` with pure functions in `game/`.

The JSON export is `{ schemaVersion, exportedAt, tables: { ... } }`. Import validates `schemaVersion`, then replaces all tables inside one transaction.

## Screens and UI

The app has four tabs plus two overlays. Desktop uses a two-column layout; phone uses a single column with a bottom tab bar.

| Screen | Contents |
| --- | --- |
| **Now** (default) | Header with XP, level bar and streak flame. Large countdown ring with block title. Sprint sub-timer. Next block. Prayer-times strip. Check-in queue badge. Kiosk and Bad-day buttons. Today's timeline (right column on desktop, below on phone). |
| **Today** | Full timeline for the day with check-in status, notes, and the prayer checklist. Tap a past block to edit its check-in. |
| **Stats** | Weekly quest progress bars, 8-week charts of the four numbers, adherence heatmap, notes log. |
| **Settings** | Alert thresholds, mute, quiet hours, quest targets, prayer XP toggle, today's prayer times, export and import, the closed-app alerts note. |
| Check-in sheet (overlay) | Done, Partial, Skipped buttons, note field, count field for career blocks. Opens at each block end. |
| Kiosk mode (overlay) | Full-screen ring, title, time left, next block. Nothing else. |

**Visual rules**

- Category colors match Google Calendar: prayer sage green, deep work blueberry, career tangerine, research grape, exercise tomato, meals banana, rest and wind-down graphite, review lavender.
- Light and dark themes follow the system setting. Kiosk mode defaults to dark.
- The countdown must be readable from about 3 metres: at least 96px on desktop and 64px on phone.
- Alert states change the ring and page accent color as well as using sound, so a muted user still sees them.
- Respect `prefers-reduced-motion` by replacing pulses with static color changes.
- Plain, calm design. No confetti except on level-up.

## Non-functional requirements

| Area | Requirement |
| --- | --- |
| Timing accuracy | Alerts fire within 5 seconds of the threshold on desktop Chrome, including in a background tab, while the app is open. |
| Time correctness | All schedule math runs in Asia/Kuala\_Lumpur through Luxon. Changing the device timezone must not move any block. |
| Midnight rollover | At 00:00 KL, the day's state rolls over without a reload. The overnight Sleep block spans two dates correctly. |
| Offline | After first load, every feature works offline. Prayer times fall back to cache, then to the fixed `start` times. |
| Performance | First load under 2 seconds on a mid-range phone over 4G. Production bundle under 300 KB gzipped, excluding charts, which load lazily on the Stats tab. |
| Battery | One worker tick per second, no other polling. Animations use CSS transforms only. |
| Accessibility | All controls work by keyboard. Status is never shown by color alone. Contrast meets WCAG AA in both themes. |
| Privacy | No analytics, no tracking, no network calls except prayer times and static assets. |
| Reliability | A failure in prayer fetching, notifications or audio is caught and logged. It must never break the HUD. |

## Build phases

Build in four phases. Stop at the end of each one, run the tests, and show the acceptance checks passing before starting the next.

1. **Phase 1: Schedule engine and HUD**
   - Scaffold Vite, React, TypeScript, Tailwind, Zustand and Dexie, with a GitHub Pages deploy workflow.
   - Write `schedule.json` with all three templates in full.
   - Build the resolver, using fixed times only.
   - Build the worker clock and the Now screen: ring, countdown, next block, timeline.
   - Acceptance:
     - Unit tests cover the resolver for each weekday, the Friday and Sunday templates, the overnight Sleep block and the midnight rollover.
     - A `?now=2026-10-23T12:50` query param fakes the clock, and the HUD shows the correct block for any time it's given.
2. **Phase 2: Alerts and kiosk**
   - Thresholds, Web Audio chimes, service-worker notifications, and the sound-unlock banner.
   - Fired-alert persistence, mute and quiet hours.
   - Sprint sub-timer and sprint alerts.
   - Kiosk mode with Wake Lock.
   - Acceptance:
     - Unit tests show each threshold fires exactly once, including across a reload.
     - A dev panel with a `?speed=60` option runs time at 60x so a full block's alerts can be watched in about a minute.
     - With the tab in the background for 10 minutes, the 5-min and 1-min alerts arrive on time.
3. **Phase 3: Check-ins and game**
   - Check-in sheet and queue, prayer checklist.
   - XP, levels, streaks, weekly quests, Minimum viable day logic and Bad-day mode.
   - Achievements config.
   - Acceptance:
     - Unit tests cover XP totals, level thresholds, each streak's break and continue rules, Minimum viable day detection and the Monday quest reset.
     - A seed script generates 3 weeks of fake check-ins for manual testing.
4. **Phase 4: Prayer times, stats, PWA polish**
   - Aladhan fetch and cache, plus anchoring and flex reflow.
   - Stats tab, Settings tab, export and import.
   - PWA manifest and icons, offline caching.
   - Acceptance:
     - Unit tests cover flex reflow when Zuhr is at 12:55 and at 13:20, and the `minMin` floor.
     - The app installs on desktop Chrome and on iPhone through Add to Home Screen, and it works in airplane mode.
     - Export, wipe and import round-trips with no data lost.
     - Lighthouse PWA and accessibility scores are 90 or higher.

## Out of scope and instructions for Claude Code

**Out of scope for v1**

- Accounts, sync between devices, or any backend.
- Background alarms when the app is closed. Google Calendar covers this.
- Two-way Google Calendar sync. The schedule is maintained in `schedule.json`.
- Native iOS or Android builds and app-store releases.
- Social features or leaderboards.

**Instructions for Claude Code**

- Read this whole PRD before writing code. Then post a short plan for Phase 1 and wait for approval.
- Work one phase at a time. At the end of each phase, list which acceptance checks pass, with test output, and stop.
- Keep `schedule/`, `alerts/` and `game/` free of React and browser APIs so they can be unit-tested.
- Never compute remaining time by decrementing a counter. Always derive it from the current wall-clock time.
- Pin every dependency to an exact version.
- Where this PRD is ambiguous, pick the simplest option that meets the stated requirement, note it in `DECISIONS.md`, and keep going.
- Write a `README.md` covering local dev, the `?now=` and `?speed=` dev params, how to edit `schedule.json`, and how to deploy to GitHub Pages.
