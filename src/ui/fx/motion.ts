import type { Transition, Variants } from 'motion/react';

/** Shared motion language: quick, physical, never bouncy for its own sake. */
export const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];
export const spring: Transition = { type: 'spring', stiffness: 420, damping: 34, mass: 0.8 };
export const softSpring: Transition = { type: 'spring', stiffness: 160, damping: 24 };

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12, filter: 'blur(6px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.6, ease: EASE_OUT } },
};

export const stagger = (step = 0.05, delay = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: step, delayChildren: delay } },
});
