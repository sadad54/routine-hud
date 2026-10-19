import { AnimatePresence, motion } from 'motion/react';
import { BookOpen, Code2, Landmark, Shuffle, Sparkles } from 'lucide-react';
import { KIND_LABEL, pickWisdom, WISDOM_ROTATE_MS, type WisdomKind } from '../content/wisdom';
import type { Category } from '../schedule/types';
import { useClock } from '../clock/clock';
import { useApp } from '../store/app';
import { EASE_OUT } from './fx/motion';

const KIND_ICON: Record<WisdomKind, typeof BookOpen> = { book: BookOpen, ml: Code2, deen: Sparkles, stoic: Landmark };

/** Current wisdom line for a block, rotating every 20 minutes. */
export function useWisdom(category: Category) {
  const bucket = useClock((s) => Math.floor(s.now / WISDOM_ROTATE_MS));
  const shuffle = useApp((s) => s.shuffle);
  return pickWisdom(category, bucket * WISDOM_ROTATE_MS, shuffle);
}

export function WisdomCard({ category }: { category: Category }) {
  const w = useWisdom(category);
  const next = useApp((s) => s.nextWisdom);
  const Kind = KIND_ICON[w.kind];
  return (
    <figure className="card group overflow-hidden p-5 sm:p-6">
      <div className="mb-3 flex items-center justify-between">
        <span className="label inline-flex items-center gap-1.5">
          <Kind className="h-3.5 w-3.5" strokeWidth={1.75} /> {KIND_LABEL[w.kind]}
        </span>
        <button
          className="-mr-1.5 rounded-lg p-1.5 text-zinc-500 transition hover:bg-white/5 hover:text-zinc-200 active:rotate-180"
          style={{ transition: 'transform .5s cubic-bezier(.16,1,.3,1), color .2s' }}
          onClick={next}
          aria-label="Show another line"
          title="Another one"
        >
          <Shuffle className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={w.text}
          initial={{ opacity: 0, y: 10, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -8, filter: 'blur(8px)' }}
          transition={{ duration: 0.55, ease: EASE_OUT }}
        >
          <blockquote className="serif relative text-[1.45rem] leading-[1.25] text-zinc-100 sm:text-[1.6rem]">
            <span className="absolute -left-1 -top-3 select-none text-5xl leading-none text-[color:var(--accent)] opacity-40" aria-hidden="true">
              “
            </span>
            <span className="relative italic">{w.text}</span>
          </blockquote>
          <figcaption className="mt-4 flex flex-wrap items-baseline gap-x-2 text-sm">
            <span className="font-medium text-zinc-300">{w.by}</span>
            {w.source ? <span className="font-mono text-[11px] text-zinc-500">{w.source}</span> : null}
          </figcaption>
        </motion.div>
      </AnimatePresence>
    </figure>
  );
}
