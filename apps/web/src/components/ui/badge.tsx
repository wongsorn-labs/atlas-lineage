import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex h-5 w-fit items-center gap-1 rounded-4xl border px-2 text-xs font-medium whitespace-nowrap transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-destructive/10 text-destructive dark:bg-destructive/20',
        outline: 'border-border text-foreground',
        parent: 'border-transparent bg-chart-2/15 text-chart-4 dark:text-chart-2',
        child: 'border-transparent bg-chart-3/15 text-chart-3',
        sibling: 'border-transparent bg-chart-1/20 text-muted-foreground',
        spouse: 'border-transparent bg-chart-4/15 text-chart-4 dark:text-chart-2',
        partner: 'border-transparent bg-chart-5/10 text-foreground',
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
