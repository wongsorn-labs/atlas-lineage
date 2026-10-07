import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-(--gold-muted) text-(--gold)',
        secondary: 'border-transparent bg-(--bg-elevated) text-(--text-primary)',
        destructive: 'border-transparent bg-(--color-error) text-white',
        outline: 'border-(--border) text-(--text-primary)',
        parent: 'border-transparent bg-green-500/15 text-green-700',
        child: 'border-transparent bg-blue-500/15 text-blue-700',
        sibling: 'border-transparent bg-yellow-500/20 text-yellow-700',
        spouse: 'border-transparent bg-pink-500/15 text-pink-700',
        partner: 'border-transparent bg-purple-500/15 text-purple-700',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
