import { useEffect } from 'react';

/**
 * Fixed ambient backdrop: three slow aurora blobs (one follows the current
 * block's accent), a faint engineering grid and film grain. Transforms only.
 */
export function Backdrop() {
  // One pointer listener drives the spotlight on every .card.
  useEffect(() => {
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      const card = (e.target as Element | null)?.closest?.('.card') as HTMLElement | null;
      if (!card) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${e.clientX - r.left}px`);
        card.style.setProperty('--my', `${e.clientY - r.top}px`);
      });
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-ink-950" aria-hidden="true">
      <div className="aurora-blob drift-a -left-[10vw] -top-[20vh] h-[60vh] w-[60vw]" style={{ background: 'var(--accent)' }} />
      <div className="aurora-blob drift-b right-[-15vw] top-[10vh] h-[50vh] w-[45vw] !opacity-20" style={{ background: '#6d28d9' }} />
      <div className="aurora-blob drift-c bottom-[-25vh] left-[20vw] h-[55vh] w-[55vw] !opacity-[0.14]" style={{ background: '#0ea5e9' }} />
      <div className="grid-lines absolute inset-0" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,transparent_0%,rgba(5,6,10,0.6)_60%,#05060a_100%)]" />
      <div className="grain absolute inset-0" />
    </div>
  );
}
