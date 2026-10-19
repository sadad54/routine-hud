import { AnimatePresence, motion } from 'motion/react';
import { EASE_OUT } from './motion';

/**
 * Odometer text: each character slides in from above when it changes, the old
 * one drops away. Characters are keyed from the right so digits stay aligned
 * when the string gets shorter (1:00:00 → 59:59).
 */
export function Rolling({ text, className }: { text: string; className?: string }) {
  const chars = [...text];
  return (
    <span className={`inline-flex ${className ?? ''}`}>
      {chars.map((ch, i) => {
        const pos = chars.length - i;
        return (
          <span key={pos} className="relative inline-block overflow-hidden" style={{ paddingBottom: '0.06em' }}>
            <AnimatePresence initial={false} mode="popLayout">
              <motion.span
                key={ch}
                className="inline-block"
                initial={{ y: '-70%', opacity: 0, filter: 'blur(6px)' }}
                animate={{ y: '0%', opacity: 1, filter: 'blur(0px)' }}
                exit={{ y: '70%', opacity: 0, filter: 'blur(6px)' }}
                transition={{ duration: 0.45, ease: EASE_OUT }}
              >
                {ch}
              </motion.span>
            </AnimatePresence>
          </span>
        );
      })}
    </span>
  );
}
