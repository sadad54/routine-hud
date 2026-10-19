import {
  Bell,
  Bug,
  ChevronLeft,
  ChevronRight,
  Command,
  Compass,
  Download,
  Flame,
  House,
  Inbox,
  ListTodo,
  Lock,
  Maximize2,
  RefreshCw,
  Settings2,
  ShieldHalf,
  Sprout,
  Trash2,
  Upload,
  Volume2,
  VolumeX,
  X,
  type LucideIcon,
} from 'lucide-react';

const ICONS = {
  flame: Flame,
  bell: Bell,
  volume: Volume2,
  mute: VolumeX,
  expand: Maximize2,
  close: X,
  lock: Lock,
  home: House,
  list: ListTodo,
  growth: Sprout,
  settings: Settings2,
  inbox: Inbox,
  shield: ShieldHalf,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  download: Download,
  upload: Upload,
  trash: Trash2,
  bug: Bug,
  refresh: RefreshCw,
  command: Command,
  compass: Compass,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

export function Icon({ name, className = 'h-5 w-5', title }: { name: IconName; className?: string; title?: string }) {
  const C = ICONS[name];
  return (
    <C
      className={className}
      strokeWidth={1.75}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      aria-label={title}
    />
  );
}
