import { animate, useMotionValue, useTransform, motion } from 'motion/react';
import { useEffect } from 'react';

export function AnimatedNumber({ value, format = (v) => String(Math.round(v)), className }: { value: number; format?: (v: number) => string; className?: string }) {
  const mv = useMotionValue(value);
  const text = useTransform(mv, format);
  useEffect(() => {
    const c = animate(mv, value, { duration: 0.9, ease: [0.16, 1, 0.3, 1] });
    return () => c.stop();
  }, [mv, value]);
  return <motion.span className={className}>{text}</motion.span>;
}
