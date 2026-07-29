import { cn } from '@/lib/utils';
import { getAvatarColors, getInitials } from '@/lib/avatarStyle';

interface AvatarProps {
  name: string;
  className?: string;
}

export function Avatar({ name, className }: AvatarProps) {
  const { bg, fg } = getAvatarColors(name);
  return (
    <div
      className={cn(
        'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold',
        className
      )}
      style={{ background: bg, color: fg }}
      aria-hidden="true"
    >
      {getInitials(name)}
    </div>
  );
}
