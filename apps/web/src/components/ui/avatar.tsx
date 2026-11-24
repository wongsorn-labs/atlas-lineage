import { cn } from '@/lib/utils';
import { getAvatarColors, getInitials } from '@/lib/avatarStyle';

interface AvatarProps {
  name: string;
  photo?: string | null;
  className?: string;
}

export function Avatar({ name, photo, className }: AvatarProps) {
  const { bg, fg } = getAvatarColors(name);
  if (photo) {
    return (
      <img
        src={photo}
        alt=""
        className={cn('h-9 w-9 flex-shrink-0 rounded-full object-cover', className)}
        style={{ maxWidth: 150, maxHeight: 150 }}
      />
    );
  }
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
