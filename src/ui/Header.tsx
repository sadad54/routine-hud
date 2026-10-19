import { useApp } from '../store/app';
import { useGame, usePending } from './hooks';
import { Icon } from './Icon';

export function Header({ onOpenQueue }: { onOpenQueue: () => void }) {
  const game = useGame();
  const pending = usePending();
  const mute = useApp((s) => s.settings.mute);
  const updateSettings = useApp((s) => s.updateSettings);
  const streak = game.streaks.fullDay.current;

  return (
    <header className="safe-top sticky top-0 z-30 border-b border-slate-200 bg-slate-50/90 backdrop-blur dark:border-slate-800 dark:bg-[#0b0d12]/90">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5 sm:gap-5">
        <div className="hidden text-sm font-bold tracking-tight sm:block">Routine HUD</div>

        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex shrink-0 items-baseline gap-1 tabular" title="XP earned today">
            <span className="text-base font-bold">+{game.todayXp}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">XP today</span>
          </div>

          <div className="flex min-w-0 flex-1 items-center gap-2 sm:max-w-xs">
            <span className="shrink-0 rounded-md bg-slate-900 px-1.5 py-0.5 text-xs font-bold text-white dark:bg-slate-100 dark:text-slate-900">
              Lv {game.level.level}
            </span>
            <div
              className="h-2 min-w-[3rem] flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
              role="progressbar"
              aria-label={`Level ${game.level.level} progress`}
              aria-valuemin={game.level.floor}
              aria-valuemax={game.level.nextAt}
              aria-valuenow={game.totalXp}
              aria-valuetext={`${game.totalXp} of ${game.level.nextAt} XP`}
            >
              <div className="h-full origin-left rounded-full bg-[var(--accent)]" style={{ transform: `scaleX(${game.level.progress})` }} />
            </div>
            <span className="hidden shrink-0 text-xs text-slate-500 tabular dark:text-slate-400 md:inline">
              {game.totalXp}/{game.level.nextAt}
            </span>
          </div>

          <div
            className="flex shrink-0 items-center gap-1 text-orange-600 dark:text-orange-400"
            title={`Full-day streak: ${streak} day${streak === 1 ? '' : 's'}`}
          >
            <Icon name="flame" className="h-5 w-5" />
            <span className="font-bold tabular">{streak}</span>
            <span className="sr-only">day full-day streak</span>
          </div>
        </div>

        {pending.length > 0 ? (
          <button className="btn !px-2.5 !py-1.5" onClick={onOpenQueue} aria-label={`${pending.length} check-ins waiting`}>
            <Icon name="inbox" className="h-4 w-4" />
            <span className="rounded-full bg-red-600 px-1.5 text-xs font-bold text-white tabular">{pending.length}</span>
          </button>
        ) : null}

        <button
          className="btn !px-2.5 !py-1.5"
          onClick={() => void updateSettings({ mute: !mute })}
          aria-pressed={mute}
          aria-label={mute ? 'Unmute sounds' : 'Mute sounds'}
          title={mute ? 'Sounds muted' : 'Sounds on'}
        >
          <Icon name={mute ? 'mute' : 'volume'} className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
