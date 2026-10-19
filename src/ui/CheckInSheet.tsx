import { AnimatePresence, motion } from 'motion/react';
import { Check, CircleDashed, Lock, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { countLabel, isEditable } from '../game/checkin';
import { PILLAR_OF } from '../game/identity';
import type { CheckInStatus } from '../game/types';
import { scheduledMinutes } from '../schedule/resolve';
import { fmtTime } from '../schedule/time';
import { useApp, useResolver } from '../store/app';
import { spring } from './fx/motion';
import { findBlock, useNow } from './hooks';
import { CATEGORY, PILLAR, STATUS_META } from './theme';
import { xpForCheckIn } from '../game/xp';

const STATUS_ICON = { done: Check, partial: CircleDashed, skipped: X } as const;

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
    requestAnimationFrame(() => firstBtn.current?.focus());
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

  if (sheet && !block) {
    // The key went stale (e.g. prayer times moved a block); skip it.
    queueMicrotask(() => setIndex(sheet.index + 1));
  }

  const open = sheet && block;
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="sheet"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="sheet-title"
            className="safe-bottom relative w-full max-w-md overflow-hidden rounded-t-[28px] border border-white/10 bg-ink-850/95 p-5 shadow-2xl shadow-black/70 sm:rounded-[28px] sm:p-6"
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0, scale: 0.98 }}
            transition={spring}
            onClick={(e) => e.stopPropagation()}
          >
            <SheetBody
              key={block.key}
              blockKey={block.key}
              now={now}
              note={note}
              count={count}
              setNote={setNote}
              setCount={setCount}
              firstBtn={firstBtn}
              onSubmit={async (status) => {
                if (!isEditable(block.date, now)) return;
                await save(block, { status, note, count: count === '' ? undefined : Number(count) });
                setIndex(sheet.index + 1);
              }}
            />
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function SheetBody({
  blockKey,
  now,
  note,
  count,
  setNote,
  setCount,
  firstBtn,
  onSubmit,
}: {
  blockKey: string;
  now: number;
  note: string;
  count: string;
  setNote: (v: string) => void;
  setCount: (v: string) => void;
  firstBtn: React.RefObject<HTMLButtonElement>;
  onSubmit: (s: CheckInStatus) => Promise<void>;
}) {
  const sheet = useApp((s) => s.sheet)!;
  const close = useApp((s) => s.closeSheet);
  const resolve = useResolver();
  const checkIns = useApp((s) => s.checkIns);
  const block = findBlock(blockKey, resolve)!;
  const existing = checkIns.find((c) => c.id === blockKey);
  const locked = !isEditable(block.date, now);
  const meta = CATEGORY[block.category];
  const Icon = meta.icon;
  const label = countLabel(block.category);
  const minutes = scheduledMinutes(block);
  const pillar = PILLAR_OF[block.category];

  return (
    <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={spring}>
      <div className="absolute inset-x-0 top-0 h-32 opacity-60" style={{ background: `radial-gradient(ellipse at 50% -20%, ${meta.color}40, transparent 70%)` }} aria-hidden="true" />
      <div className="relative mx-auto mb-4 h-1 w-10 rounded-full bg-white/15 sm:hidden" aria-hidden="true" />
      <div className="relative mb-4 flex items-center justify-between">
        <span className="label">
          Check-in {sheet.keys.length > 1 ? `· ${sheet.index + 1} of ${sheet.keys.length}` : ''}
        </span>
        <button className="text-sm text-zinc-500 transition-colors hover:text-zinc-200" onClick={close}>
          Later
        </button>
      </div>
      {sheet.keys.length > 1 ? (
        <div className="relative mb-4 flex gap-1" aria-hidden="true">
          {sheet.keys.map((k, i) => (
            <span key={k} className="h-0.5 flex-1 rounded-full transition-colors" style={{ background: i <= sheet.index ? meta.color : 'rgba(255,255,255,.1)' }} />
          ))}
        </div>
      ) : null}

      <div className="relative flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl" style={{ background: meta.color, color: '#05060a', boxShadow: `0 8px 30px -8px ${meta.color}` }}>
          <Icon className="h-5 w-5" strokeWidth={2} />
        </span>
        <div className="min-w-0">
          <h2 id="sheet-title" className="text-xl font-semibold tracking-tight text-white">
            {block.title}
          </h2>
          <p className="font-mono text-[11.5px] text-zinc-500 tabular">
            {block.date} · {fmtTime(block.start)}–{fmtTime(block.end)} · {minutes} min
            {existing ? ` · currently ${STATUS_META[existing.status].label}` : ''}
          </p>
        </div>
      </div>
      {pillar ? (
        <p className="serif relative mb-5 mt-3 text-[17px] italic text-zinc-400">
          Did this cast a vote for <span style={{ color: PILLAR[pillar].color }}>{PILLAR[pillar].become}</span>?
        </p>
      ) : (
        <div className="mb-5" />
      )}

      {locked ? (
        <p className="mb-3 flex items-center gap-2 rounded-xl bg-white/[0.04] p-3 text-sm text-zinc-400">
          <Lock className="h-4 w-4" /> This check-in is locked (editable until the end of the next day).
        </p>
      ) : null}

      {label ? (
        <label className="mb-3 block">
          <span className="mb-1.5 block text-sm font-medium text-zinc-300">{label}</span>
          <input className="input font-mono tabular" type="number" inputMode="numeric" min={0} max={99} value={count} onChange={(e) => setCount(e.target.value)} disabled={locked} />
        </label>
      ) : null}

      <label className="mb-5 block">
        <span className="mb-1.5 block text-sm font-medium text-zinc-300">What I shipped (optional)</span>
        <input
          className="input"
          type="text"
          maxLength={140}
          placeholder={block.category === 'career_jobs' ? 'e.g. Applied to 2 ML roles' : block.category === 'career_scholarship' ? 'e.g. Emailed 2 supervisors at UNSW' : 'One line you’ll be proud to read later'}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void onSubmit('done');
          }}
          disabled={locked}
        />
      </label>

      <div className="grid grid-cols-3 gap-2">
        {(['done', 'partial', 'skipped'] as const).map((s, i) => {
          const SI = STATUS_ICON[s];
          return (
            <motion.button
              key={s}
              ref={i === 0 ? firstBtn : undefined}
              disabled={locked}
              whileTap={{ scale: 0.95 }}
              onClick={() => void onSubmit(s)}
              className={`flex flex-col items-center gap-1 rounded-2xl border px-2 py-3.5 text-sm font-semibold transition-colors disabled:opacity-40 ${
                s === 'done'
                  ? 'border-transparent text-ink-950'
                  : s === 'partial'
                    ? 'border-amber-300/25 bg-amber-300/[0.06] text-amber-200 hover:bg-amber-300/10'
                    : 'border-white/10 bg-white/[0.03] text-zinc-400 hover:bg-white/[0.06]'
              } ${existing?.status === s ? 'ring-2 ring-white/70 ring-offset-2 ring-offset-ink-850' : ''}`}
              style={s === 'done' ? { background: `linear-gradient(180deg, ${meta.color}, color-mix(in oklab, ${meta.color} 80%, black))`, boxShadow: `0 10px 30px -10px ${meta.color}` } : undefined}
            >
              <SI className="h-5 w-5" strokeWidth={2.25} aria-hidden="true" />
              {STATUS_META[s].label}
              <span className="font-mono text-[10.5px] font-normal opacity-75 tabular">+{xpForCheckIn(block.category, s, minutes)} XP</span>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}
