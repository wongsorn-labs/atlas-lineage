import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-blue-600 text-white',
        secondary: 'border-transparent bg-slate-100 text-slate-900',
        destructive: 'border-transparent bg-red-500 text-white',
        outline: 'border-slate-200 text-slate-900',
        parent: 'border-transparent bg-green-100 text-green-800',
        child: 'border-transparent bg-blue-100 text-blue-800',
        sibling: 'border-transparent bg-yellow-100 text-yellow-800',
        spouse: 'border-transparent bg-pink-100 text-pink-800',
        partner: 'border-transparent bg-purple-100 text-purple-800',
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
