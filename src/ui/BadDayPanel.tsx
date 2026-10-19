import { PRAYER_LABEL } from '../alerts/engine';
import type { DayEval } from '../game/days';
import { useApp } from '../store/app';

/** Bad-day mode: only the Minimum viable day checklist (FR6.3). */
export function BadDayPanel({ day }: { day: DayEval }) {
  const togglePrayer = useApp((s) => s.togglePrayer);
  const c = day.checklist;
  const items = [
    { label: 'One deep-work sprint (Done or Partial)', ok: c.deepWork },
    { label: 'One application or supervisor email logged', ok: c.outreach },
    { label: 'Exercise (Done or Partial)', ok: c.exercise },
  ];
  const doneCount = [c.allPrayers, c.deepWork, c.outreach, c.exercise].filter(Boolean).length;
  return (
    <section className="card p-4" aria-labelledby="mvd-title">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 id="mvd-title" className="text-lg font-semibold">
          Minimum viable day
        </h2>
        <span className="text-sm text-slate-500 tabular dark:text-slate-400">{doneCount}/4</span>
      </div>
      <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
        Rough day? Hit these four and every streak survives (except exercise if you skip it).
      </p>
      <div className="mb-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium">
          <Mark ok={c.allPrayers} /> All prayers
        </div>
        <div className="flex flex-wrap gap-2">
          {c.prayers.map((p) => (
            <button
              key={p.name}
              className={`btn !rounded-full ${p.prayed ? '!border-emerald-600 !bg-emerald-50 !text-emerald-800 dark:!bg-emerald-950/50 dark:!text-emerald-300' : ''}`}
              aria-pressed={p.prayed}
              onClick={() => void togglePrayer(day.date, p.name)}
            >
              <span aria-hidden="true">{p.prayed ? '✓' : '○'}</span> {PRAYER_LABEL[p.name]}
            </button>
          ))}
        </div>
      </div>
      <ul className="space-y-2">
        {items.map((it) => (
          <li key={it.label} className="flex items-center gap-2 text-sm">
            <Mark ok={it.ok} />
            {it.label}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">The last three tick themselves when you check in those blocks.</p>
    </section>
  );
}

function Mark({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${
        ok ? 'bg-emerald-600 text-white' : 'border border-slate-400 text-transparent'
      }`}
    >
      {ok ? '✓' : '·'}
      <span className="sr-only">{ok ? 'done' : 'not yet'}</span>
    </span>
  );
}
