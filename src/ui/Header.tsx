import { motion } from 'motion/react';
import { Command, Flame, Inbox, Volume2, VolumeX } from 'lucide-react';
import { rankFor } from '../game/identity';
import { useApp } from '../store/app';
import { AnimatedNumber } from './fx/AnimatedNumber';
import { softSpring } from './fx/motion';
import { useGame, usePending } from './hooks';

/** The mark: a dial with a notch at twelve. */
export function Logo({ className = 'h-7 w-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="logo-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor="var(--accent)" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="11" fill="none" stroke="#fff" strokeOpacity=".12" strokeWidth="3" />
      <circle cx="16" cy="16" r="11" fill="none" stroke="url(#logo-g)" strokeWidth="3" strokeLinecap="round" strokeDasharray="69.1" strokeDashoffset="20" transform="rotate(-90 16 16)" />
      <circle cx="16" cy="16" r="2.5" fill="#fff" />
    </svg>
  );
}

export function Header({ onOpenQueue }: { onOpenQueue: () => void }) {
  const game = useGame();
  const pending = usePending();
  const mute = useApp((s) => s.settings.mute);
  const updateSettings = useApp((s) => s.updateSettings);
  const setPalette = useApp((s) => s.setPalette);
  const streak = game.streaks.fullDay.current;
  const rank = rankFor(game.level.level);

  return (
    <header className="safe-top sticky top-0 z-30 border-b border-white/[0.06] bg-ink-950/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 sm:gap-5 sm:px-6">
        <div className="hidden items-center gap-2 sm:flex">
          <Logo />
          <span className="text-[15px] font-semibold tracking-tight">
            Routine<span className="text-zinc-500">HUD</span>
          </span>
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:max-w-sm">
            <span className="shrink-0 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 leading-none" title={rank.next ? `Next rank: ${rank.next.title} at level ${rank.next.level}` : 'Top rank'}>
              <span className="font-mono text-[11px] font-semibold text-white tabular">Lv {game.level.level}</span>
              <span className="ml-1.5 hidden text-[11px] text-zinc-400 sm:inline">{rank.title}</span>
            </span>
            <div
              className="relative h-1.5 min-w-[3rem] flex-1 overflow-hidden rounded-full bg-white/[0.07]"
              role="progressbar"
              aria-label={`Level ${game.level.level} progress`}
              aria-valuemin={game.level.floor}
              aria-valuemax={game.level.nextAt}
              aria-valuenow={game.totalXp}
              aria-valuetext={`${game.totalXp} of ${game.level.nextAt} XP`}
            >
              <motion.div
                className="shimmer absolute inset-0 origin-left overflow-hidden rounded-full"
                style={{ background: 'linear-gradient(90deg, color-mix(in oklab, var(--accent) 50%, transparent), var(--accent))' }}
                initial={false}
                animate={{ scaleX: Math.max(0.02, game.level.progress) }}
                transition={softSpring}
              />
            </div>
            <span className="hidden shrink-0 font-mono text-[11px] text-zinc-500 tabular md:inline">
              {game.totalXp}/{game.level.nextAt}
            </span>
          </div>

          <div className="flex shrink-0 items-baseline gap-1 tabular" title="XP earned today">
            <span className="font-mono text-sm font-semibold text-white">
              +<AnimatedNumber value={game.todayXp} />
            </span>
            <span className="text-[11px] text-zinc-500">XP today</span>
          </div>

          <div
            className={`flex shrink-0 items-center gap-1 ${streak > 0 ? 'text-orange-400' : 'text-zinc-600'}`}
            title={`Full-day streak: ${streak} day${streak === 1 ? '' : 's'}`}
          >
            <Flame className={`h-[18px] w-[18px] ${streak > 0 ? 'flicker' : ''}`} strokeWidth={1.75} style={streak > 0 ? { filter: 'drop-shadow(0 0 6px rgba(251,146,60,.6))' } : undefined} />
            <span className="font-mono text-sm font-semibold tabular">{streak}</span>
            <span className="sr-only">day full-day streak</span>
          </div>
        </div>

        {pending.length > 0 ? (
          <button className="btn !px-2.5 !py-1.5" onClick={onOpenQueue} aria-label={`${pending.length} check-ins waiting`}>
            <Inbox className="h-4 w-4" strokeWidth={1.75} />
            <span className="rounded-full bg-rose-500 px-1.5 font-mono text-[11px] font-bold text-white tabular">{pending.length}</span>
          </button>
        ) : null}

        <button className="btn hidden !px-2.5 !py-1.5 sm:inline-flex" onClick={() => setPalette(true)} aria-label="Open command menu">
          <Command className="h-3.5 w-3.5" strokeWidth={1.75} />
          <span className="font-mono text-[11px] text-zinc-400">K</span>
        </button>

        <button
          className="btn !px-2.5 !py-1.5"
          onClick={() => void updateSettings({ mute: !mute })}
          aria-pressed={mute}
          aria-label={mute ? 'Unmute sounds' : 'Mute sounds'}
          title={mute ? 'Sounds muted' : 'Sounds on'}
        >
          {mute ? <VolumeX className="h-4 w-4" strokeWidth={1.75} /> : <Volume2 className="h-4 w-4" strokeWidth={1.75} />}
        </button>
      </div>
    </header>
  );
}
