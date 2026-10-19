import { useRef, useState, type ReactNode } from 'react';
import { DEFAULT_THRESHOLDS, PRAYER_LABEL } from '../alerts/engine';
import { QUEST_KEYS, QUEST_LABEL } from '../game/quests';
import { notificationPermission, requestNotifications, showNotification } from '../platform/notify';
import { playSound, unlockAudio } from '../platform/audio';
import { wakeLockSupported } from '../platform/wakelock';
import { checklistPrayers } from '../schedule/resolve';
import { fmtTime } from '../schedule/time';
import { CATEGORIES, type Category } from '../schedule/types';
import { prayerSourceFor, useApp } from '../store/app';
import { useDayBlocks, useToday } from './hooks';
import { Icon } from './Icon';
import { DEFAULT_NORTH_STAR, PILLARS } from '../game/identity';
import type { NorthStar } from '../game/types';
import { CATEGORY, PILLAR } from './theme';

function Section({ title, children, id, className = '' }: { title: string; children: ReactNode; id: string; className?: string }) {
  return (
    <section className={`card p-5 ${className}`} aria-labelledby={id}>
      <h2 id={id} className="mb-4 text-[15px] font-semibold tracking-tight text-white">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Edit the vision the whole app is reverse-engineered from. */
function NorthStarEditor() {
  const north = useApp((s) => s.settings.northStar);
  const update = useApp((s) => s.updateSettings);
  const [milestones, setMilestones] = useState(() => north.milestones.map((m) => `${m.when} | ${m.text}`).join('\n'));
  const save = (patch: Partial<NorthStar>) => void update({ northStar: { ...north, ...patch } });
  return (
    <Section title="North Star" id="s-north" className="md:col-span-2">
      <p className="serif -mt-2 mb-4 text-[17px] italic text-zinc-400">
        Describe who you are in {north.year}. Every block, prayer and check-in is scored against this.
      </p>
      <div className="grid gap-4 md:grid-cols-[1fr_120px]">
        <label className="text-sm">
          <span className="mb-1.5 block font-medium text-zinc-300">Your name (for the greeting)</span>
          <input className="input" value={north.name} maxLength={40} placeholder="Optional" onChange={(e) => save({ name: e.target.value })} />
        </label>
        <label className="text-sm">
          <span className="mb-1.5 block font-medium text-zinc-300">Vision year</span>
          <input
            className="input font-mono tabular"
            type="number"
            min={2026}
            max={2100}
            value={north.year}
            onChange={(e) => save({ year: Math.max(2026, Math.min(2100, Math.round(Number(e.target.value) || north.year))) })}
          />
        </label>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {PILLARS.map((p) => {
          const meta = PILLAR[p];
          const PI = meta.icon;
          return (
            <label key={p} className="text-sm">
              <span className="mb-1.5 flex items-center gap-2 font-medium text-zinc-300">
                <PI className="h-4 w-4" style={{ color: meta.color }} strokeWidth={1.75} /> {meta.become}
              </span>
              <input className="input" value={north.statements[p]} maxLength={120} onChange={(e) => save({ statements: { ...north.statements, [p]: e.target.value } })} />
            </label>
          );
        })}
      </div>
      <label className="mt-4 block text-sm">
        <span className="mb-1.5 block font-medium text-zinc-300">Milestones, end goal first (one per line: “when | what”)</span>
        <textarea
          className="input min-h-[120px] font-mono text-[12.5px] leading-relaxed"
          value={milestones}
          onChange={(e) => setMilestones(e.target.value)}
          onBlur={() => {
            const list = milestones
              .split('\n')
              .map((l) => l.split('|'))
              .filter((parts) => parts.length >= 2 && parts[1]!.trim())
              .map(([when, ...rest]) => ({ when: when!.trim(), text: rest.join('|').trim() }));
            save({ milestones: list.length ? list : DEFAULT_NORTH_STAR.milestones });
          }}
        />
      </label>
    </Section>
  );
}

function parseList(v: string): number[] | null {
  const nums = v
    .split(/[,\s]+/)
    .filter(Boolean)
    .map(Number);
  if (nums.some((n) => !Number.isFinite(n) || n <= 0 || n > 180)) return null;
  return [...new Set(nums)].sort((a, b) => b - a);
}

export function SettingsScreen() {
  const settings = useApp((s) => s.settings);
  const update = useApp((s) => s.updateSettings);
  const exportData = useApp((s) => s.exportData);
  const importData = useApp((s) => s.importData);
  const wipeData = useApp((s) => s.wipeData);
  const loadPrayerTimes = useApp((s) => s.loadPrayerTimes);
  const prayerError = useApp((s) => s.prayerError);
  const toast = useApp((s) => s.toast);
  useApp((s) => s.prayerMonths);
  const today = useToday();
  const blocks = useDayBlocks(today);
  const [perm, setPerm] = useState(notificationPermission());
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const source = prayerSourceFor(today);

  const download = async () => {
    const data = await exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `routine-hud-${today}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const onImport = async (file: File) => {
    try {
      const json = JSON.parse(await file.text());
      if (!confirm('Replace ALL current data with this file?')) return;
      await importData(json);
      toast({ kind: 'info', title: 'Import complete' });
    } catch (err) {
      toast({ kind: 'error', title: 'Import failed', body: err instanceof Error ? err.message : String(err) });
    }
  };

  return (
    <div className="mx-auto grid max-w-5xl gap-4 px-4 pb-10 pt-5 sm:px-6 md:grid-cols-2 lg:pt-8">
      <div className="md:col-span-2">
        <h1 className="text-3xl font-semibold tracking-tight text-white">Settings</h1>
        <p className="text-sm text-zinc-500">Everything stays on this device.</p>
      </div>
      <div className="md:col-span-2">
        <div className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] p-4 text-sm text-amber-100/90" role="note">
          <strong className="font-semibold">Alerts only fire while this app is open.</strong> A web app can’t reliably ring alarms when it’s closed —
          especially on iPhone. Keep it open (a background tab is fine on desktop Chrome). Google Calendar covers reminders when the app is closed.
        </div>
      </div>

      <NorthStarEditor />

      <Section title="Sound & notifications" id="s-sound">
        <div className="space-y-3">
          <Toggle label="Mute all sounds" checked={settings.mute} onChange={(v) => void update({ mute: v })} />
          <div>
            <span className="mb-1 block text-sm font-medium">Quiet hours (no sounds)</span>
            <div className="flex items-center gap-2">
              <input
                className="input tabular"
                type="time"
                aria-label="Quiet hours start"
                value={settings.quietHours.start}
                onChange={(e) => void update({ quietHours: { ...settings.quietHours, start: e.target.value } })}
              />
              <span>to</span>
              <input
                className="input tabular"
                type="time"
                aria-label="Quiet hours end"
                value={settings.quietHours.end}
                onChange={(e) => void update({ quietHours: { ...settings.quietHours, end: e.target.value } })}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="btn"
              onClick={async () => {
                await unlockAudio();
                useApp.getState().setSoundUnlocked();
                playSound('chime');
              }}
            >
              <Icon name="volume" className="h-4 w-4" /> Test chime
            </button>
            {perm === 'granted' ? (
              <button className="btn" onClick={() => void showNotification('Routine HUD', 'Notifications are working.', { tag: 'test' })}>
                <Icon name="bell" className="h-4 w-4" /> Test notification
              </button>
            ) : perm === 'unsupported' ? (
              <span className="text-sm text-zinc-500">Notifications aren’t supported here.</span>
            ) : perm === 'denied' ? (
              <span className="text-sm text-zinc-600 dark:text-zinc-300">
                Notifications are blocked. Allow them in your browser’s site settings for this page.
              </span>
            ) : (
              <button className="btn btn-primary" onClick={async () => setPerm(await requestNotifications())}>
                <Icon name="bell" className="h-4 w-4" /> Enable notifications
              </button>
            )}
          </div>
        </div>
      </Section>

      <Section title="Today’s prayer times" id="s-prayer">
        <ul className="mb-3 divide-y divide-zinc-100 text-sm dark:divide-zinc-800">
          {checklistPrayers(blocks).map((p) => {
            const b = blocks.find((x) => x.prayer === p)!;
            return (
              <li key={p} className="flex justify-between py-1.5">
                <span>{PRAYER_LABEL[p]}</span>
                <span className="tabular">{fmtTime(b.start)}</span>
              </li>
            );
          })}
        </ul>
        <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
          Source: {source === 'live' ? 'Aladhan (JAKIM, method 17), fetched now' : source === 'cache' ? 'Aladhan (JAKIM), cached' : 'fixed fallback times — prayer times not loaded'}
          {prayerError ? ` · last error: ${prayerError}` : ''}
        </p>
        <button className="btn" onClick={() => void loadPrayerTimes(true)}>
          <Icon name="refresh" className="h-4 w-4" /> Refresh
        </button>
      </Section>

      <Section title="Game" id="s-game">
        <Toggle
          label="Prayer XP (10 XP per prayer)"
          checked={settings.prayerXp}
          onChange={(v) => void update({ prayerXp: v })}
        />
        <h3 className="label mb-2 mt-4">Weekly quest targets</h3>
        <div className="grid grid-cols-2 gap-3">
          {QUEST_KEYS.map((k) => (
            <label key={k} className="text-sm">
              <span className="mb-1 block font-medium">{QUEST_LABEL[k]}</span>
              <input
                className="input tabular"
                type="number"
                min={0}
                max={500}
                value={settings.questTargets[k]}
                onChange={(e) => {
                  const n = Math.max(0, Math.min(500, Math.round(Number(e.target.value) || 0)));
                  void update({ questTargets: { ...settings.questTargets, [k]: n } });
                }}
              />
            </label>
          ))}
        </div>
      </Section>

      <Section title="Alert thresholds (minutes before a block ends)" id="s-thresholds">
        <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
          Comma-separated. Over 5 min: colour only. 2–5 min: chime + notification. 1 min: double chime. Default {DEFAULT_THRESHOLDS.join(', ')}.
        </p>
        <div className="space-y-2">
          {CATEGORIES.map((c: Category) => {
            const value = drafts[c] ?? (settings.thresholdsByCategory[c] ?? DEFAULT_THRESHOLDS).join(', ');
            const invalid = parseList(value) == null && value.trim() !== '';
            return (
              <label key={c} className="flex items-center gap-3 text-sm">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: CATEGORY[c].color }} aria-hidden="true" />
                <span className="w-40 shrink-0">{CATEGORY[c].label}</span>
                <input
                  className={`input tabular ${invalid ? '!border-red-500' : ''}`}
                  value={value}
                  aria-invalid={invalid}
                  onChange={(e) => setDrafts({ ...drafts, [c]: e.target.value })}
                  onBlur={() => {
                    const list = value.trim() === '' ? [] : parseList(value);
                    if (list) void update({ thresholdsByCategory: { ...settings.thresholdsByCategory, [c]: list } });
                    setDrafts(({ [c]: _drop, ...rest }) => rest);
                  }}
                />
              </label>
            );
          })}
        </div>
      </Section>

      <Section title="Data" id="s-data">
        <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-300">Everything is stored on this device only. Export regularly to keep a backup.</p>
        <div className="flex flex-wrap gap-2">
          <button className="btn" onClick={() => void download()}>
            <Icon name="download" className="h-4 w-4" /> Export JSON
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            <Icon name="upload" className="h-4 w-4" /> Import JSON
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onImport(f);
              e.target.value = '';
            }}
          />
          <button
            className="btn !border-red-300 !text-red-700 dark:!border-red-900 dark:!text-red-400"
            onClick={() => {
              if (confirm('Delete ALL check-ins, prayers, achievements and settings on this device?')) void wipeData();
            }}
          >
            <Icon name="trash" className="h-4 w-4" /> Wipe all data
          </button>
        </div>
      </Section>

      <Section title="About" id="s-about">
        <ul className="space-y-1 text-sm text-zinc-600 dark:text-zinc-300">
          <li>Times are always Asia/Kuala_Lumpur, whatever this device’s time zone.</li>
          <li>
            Shortcuts: <span className="kbd">⌘K</span> command menu, <span className="kbd">1</span>–<span className="kbd">4</span> tabs, <span className="kbd">F</span> focus mode,{' '}
            <span className="kbd">M</span> mute, <span className="kbd">Q</span> another quote.
          </li>
          <li>Kiosk wake lock: {wakeLockSupported() ? 'supported' : 'not supported in this browser'}.</li>
          <li>
            Dev tools: add <code className="rounded bg-white/[0.06] px-1 font-mono text-[12px]">?dev=1</code>,{' '}
            <code className="rounded bg-white/[0.06] px-1 font-mono text-[12px]">?now=2026-10-23T12:50</code> or{' '}
            <code className="rounded bg-white/[0.06] px-1 font-mono text-[12px]">?speed=60</code> to the URL.
          </li>
        </ul>
      </Section>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 text-sm font-medium">
      {label}
      <span className="relative inline-flex">
        <input type="checkbox" role="switch" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="h-6 w-11 rounded-full bg-white/10 transition-colors duration-300 peer-checked:bg-[color:var(--accent)] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[color:var(--accent)]" />
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-lg transition-transform duration-300 ease-out-expo peer-checked:tranzinc-x-5" />
        <span className="sr-only">{checked ? 'on' : 'off'}</span>
      </span>
    </label>
  );
}
