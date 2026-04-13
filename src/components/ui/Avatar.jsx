import { cn } from '../../lib/utils';

const COLORS = [
  'bg-indigo-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-rose-500', 'bg-sky-500', 'bg-teal-500', 'bg-orange-500',
];

function colorFor(name = '') {
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) % COLORS.length;
  return COLORS[hash];
}

const sizes = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-11 h-11 text-base', xl: 'w-14 h-14 text-lg' };

export default function Avatar({ name, src, size = 'md', online, className }) {
  const initials = name ? name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() : '?';

  return (
    <div className={cn('relative inline-flex flex-shrink-0', className)}>
      <div className={cn('rounded-full flex items-center justify-center font-semibold text-white select-none', sizes[size], src ? 'bg-surface-muted' : colorFor(name))}>
        {src ? <img src={src} alt={name} className="w-full h-full rounded-full object-cover" /> : initials}
      </div>
      {online != null && (
        <span className={cn(
          'absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-surface-subtle',
          online ? 'bg-success animate-pulse' : 'bg-zinc-500'
        )} />
      )}
    </div>
  );
}

export function AvatarGroup({ users, max = 4, size = 'md' }) {
  const shown = users.slice(0, max);
  const extra = users.length - max;
  return (
    <div className="flex -space-x-2">
      {shown.map((u, i) => <Avatar key={i} name={u.name} src={u.src} size={size} className="ring-2 ring-surface-subtle" />)}
      {extra > 0 && (
        <div className={cn('rounded-full flex items-center justify-center font-semibold text-zinc-400 bg-surface-muted ring-2 ring-surface-subtle text-xs', sizes[size])}>
          +{extra}
        </div>
      )}
    </div>
  );
}
