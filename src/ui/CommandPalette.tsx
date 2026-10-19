import { AnimatePresence, motion } from 'motion/react';
import {
  ChartNoAxesCombined,
  CornerDownLeft,
  HeartHandshake,
  House,
  Inbox,
  ListTodo,
  Maximize2,
  Search,
  Settings2,
  ShieldHalf,
  Shuffle,
  Volume2,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp, type Tab } from '../store/app';
import { spring } from './fx/motion';
import { usePending, useToday } from './hooks';

interface Cmd {
  id: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  keys?: string;
  run: () => void;
}

/** ⌘K / Ctrl+K command menu. */
export function CommandPalette() {
  const open = useApp((s) => s.palette);
  const setOpen = useApp((s) => s.setPalette);
  const setTab = useApp((s) => s.setTab);
  const today = useToday();
  const pending = usePending();
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands = useMemo<Cmd[]>(() => {
    const app = () => useApp.getState();
    const go = (tab: Tab) => () => setTab(tab);
    const badDay = () => app().days.find((d) => d.date === today)?.badDayMode ?? false;
    return [
      { id: 'now', label: 'Go to Now', icon: House, keys: '1', run: go('now') },
      { id: 'today', label: 'Go to Today', icon: ListTodo, keys: '2', run: go('today') },
      { id: 'growth', label: 'Go to Growth', icon: ChartNoAxesCombined, keys: '3', run: go('growth') },
      { id: 'settings', label: 'Go to Settings', icon: Settings2, keys: '4', run: go('settings') },
      { id: 'kiosk', label: 'Enter focus mode', hint: 'Full-screen dial', icon: Maximize2, keys: 'F', run: () => app().setKiosk(true) },
      { id: 'queue', label: `Open check-in queue`, hint: pending.length ? `${pending.length} waiting` : 'Nothing waiting', icon: Inbox, run: () => app().openSheet(pending.map((b) => b.key)) },
      { id: 'love', label: 'Showed up for someone today', hint: 'Love pillar', icon: HeartHandshake, run: () => void app().toggleConnected(today) },
      { id: 'wisdom', label: 'Another wisdom line', icon: Shuffle, keys: 'Q', run: () => app().nextWisdom() },
      { id: 'mute', label: 'Toggle sound', icon: Volume2, keys: 'M', run: () => void app().updateSettings({ mute: !app().settings.mute }) },
      { id: 'badday', label: badDay() ? 'Exit bad-day mode' : 'Bad day: show the Minimum viable day', icon: ShieldHalf, run: () => void app().setBadDay(today, !badDay()) },
    ];
  }, [setTab, today, pending]);

  const list = commands.filter((c) => (c.label + ' ' + (c.hint ?? '')).toLowerCase().includes(q.trim().toLowerCase()));

  useEffect(() => {
    if (open) {
      setQ('');
      setSel(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const run = (c: Cmd | undefined) => {
    if (!c) return;
    setOpen(false);
    c.run();
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[75] flex items-start justify-center bg-black/50 px-4 pt-[14vh] backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setOpen(false)}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Command menu"
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-ink-850/95 shadow-2xl shadow-black/60"
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -6 }}
            transition={spring}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setOpen(false);
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSel((s) => Math.min(list.length - 1, s + 1));
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSel((s) => Math.max(0, s - 1));
              }
              if (e.key === 'Enter') run(list[sel]);
            }}
          >
            <div className="flex items-center gap-3 border-b border-white/[0.07] px-4">
              <Search className="h-4 w-4 text-zinc-500" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setSel(0);
                }}
                placeholder="Type a command…"
                className="h-12 flex-1 bg-transparent text-[15px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
                aria-label="Search commands"
              />
              <span className="kbd">esc</span>
            </div>
            <ul className="max-h-[50vh] overflow-auto p-2" role="listbox">
              {list.map((c, i) => {
                const Icon = c.icon;
                return (
                  <li key={c.id} role="option" aria-selected={i === sel}>
                    <button
                      className="relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm"
                      onMouseMove={() => setSel(i)}
                      onClick={() => run(c)}
                    >
                      {i === sel ? (
                        <motion.span layoutId="cmd-sel" className="absolute inset-0 rounded-xl bg-white/[0.07]" transition={spring} />
                      ) : null}
                      <Icon className="relative h-4 w-4 text-zinc-400" strokeWidth={1.75} />
                      <span className="relative flex-1 text-zinc-100">{c.label}</span>
                      {c.hint ? <span className="relative text-xs text-zinc-500">{c.hint}</span> : null}
                      {c.keys ? <span className="kbd relative">{c.keys}</span> : null}
                      {i === sel ? <CornerDownLeft className="relative h-3.5 w-3.5 text-zinc-500" /> : null}
                    </button>
                  </li>
                );
              })}
              {list.length === 0 ? <li className="px-3 py-6 text-center text-sm text-zinc-500">No matches</li> : null}
            </ul>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
