import { useEffect, useRef, useState } from 'react';
import { countLabel, isEditable } from '../game/checkin';
import type { CheckInStatus } from '../game/types';
import { scheduledMinutes } from '../schedule/resolve';
import { fmtTime } from '../schedule/time';
import { useApp, useResolver } from '../store/app';
import { findBlock, useNow } from './hooks';
import { CATEGORY, STATUS_META } from './theme';
import { xpForCheckIn } from '../game/xp';

/** End-of-block check-in sheet; steps through the queue. */
export function CheckInSheet() {
  const sheet = useApp((s) => s.sheet);
  const close = useApp((s) => s.closeSheet);
  const setIndex = useApp((s) => s.setSheetIndex);
  const save = useApp((s) => s.saveCheckIn);
  const checkIns = useApp((s) => s.checkIns);
  const resolve = useResolver();
  const now = useNow();
  const key = sheet?.keys[sheet.index];
  const block = key ? findBlock(key, resolve) : undefined;
  const existing = key ? checkIns.find((c) => c.id === key) : undefined;

  const [note, setNote] = useState('');
  const [count, setCount] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setNote(existing?.note ?? '');
    setCount(existing?.count != null ? String(existing.count) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (!sheet) return;
    const prev = document.activeElement as HTMLElement | null;
    firstBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'Tab' && dialogRef.current) {
        const f = dialogRef.current.querySelectorAll<HTMLElement>('button, input, textarea');
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [sheet !== null, close]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!sheet) return null;
  if (!block) {
    // The key went stale (e.g. prayer times moved a block); skip it.
    queueMicrotask(() => setIndex(sheet.index + 1));
    return null;
  }

  const locked = !isEditable(block.date, now);
  const meta = CATEGORY[block.category];
  const label = countLabel(block.category);
  const minutes = scheduledMinutes(block);

  const submit = async (status: CheckInStatus) => {
    if (locked) return;
    await save(block, { status, note, count: count === '' ? undefined : Number(count) });
    setIndex(sheet.index + 1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={close}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        className="sheet-in safe-bottom w-full max-w-md rounded-t-3xl bg-white p-5 shadow-xl dark:bg-slate-900 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between">
          <span className="label">
            Check-in {sheet.keys.length > 1 ? `· ${sheet.index + 1} of ${sheet.keys.length}` : ''}
          </span>
          <button className="text-sm text-slate-500 underline-offset-2 hover:underline" onClick={close}>
            Later
          </button>
        </div>
        <h2 id="sheet-title" className="flex items-center gap-2 text-xl font-bold">
          <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: meta.color }} aria-hidden="true" />
          {block.title}
        </h2>
        <p className="mb-4 text-sm text-slate-500 tabular dark:text-slate-400">
          {block.date} · {fmtTime(block.start)}–{fmtTime(block.end)} · {minutes} min
          {existing ? ` · currently ${STATUS_META[existing.status].label}` : ''}
        </p>

        {locked ? (
          <p className="mb-3 rounded-lg bg-slate-100 p-3 text-sm dark:bg-slate-800">This check-in is locked (editable until the end of the next day).</p>
        ) : null}

        {label ? (
          <label className="mb-3 block">
            <span className="mb-1 block text-sm font-medium">{label}</span>
            <input
              className="input tabular"
              type="number"
              inputMode="numeric"
              min={0}
              max={99}
              value={count}
              onChange={(e) => setCount(e.target.value)}
              disabled={locked}
            />
          </label>
        ) : null}

        <label className="mb-4 block">
          <span className="mb-1 block text-sm font-medium">What I shipped (optional)</span>
          <input
            className="input"
            type="text"
            maxLength={140}
            placeholder={block.category === 'career_jobs' ? 'e.g. Applied to 2 ML roles' : block.category === 'career_scholarship' ? 'e.g. Emailed 2 supervisors at NUS' : 'One line'}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void submit('done');
            }}
            disabled={locked}
          />
        </label>

        <div className="grid grid-cols-3 gap-2">
          {(['done', 'partial', 'skipped'] as const).map((s, i) => (
            <button
              key={s}
              ref={i === 0 ? firstBtn : undefined}
              disabled={locked}
              onClick={() => void submit(s)}
              className={`flex flex-col items-center gap-0.5 rounded-2xl border px-2 py-3 font-semibold transition-colors disabled:opacity-50 ${
                s === 'done'
                  ? 'border-emerald-700 bg-emerald-700 text-white hover:bg-emerald-800'
                  : s === 'partial'
                    ? 'border-amber-500 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-200'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
              } ${existing?.status === s ? 'ring-2 ring-offset-2 ring-[var(--accent)] dark:ring-offset-slate-900' : ''}`}
            >
              <span aria-hidden="true" className="text-lg leading-none">
                {STATUS_META[s].glyph}
              </span>
              {STATUS_META[s].label}
              <span className="text-[11px] font-normal opacity-80 tabular">+{xpForCheckIn(block.category, s, minutes)} XP</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
