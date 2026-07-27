import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium ring-offset-(--bg-base) transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--gold) focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:active:scale-100',
  {
    variants: {
      variant: {
        default: 'bg-(--gold) text-(--text-primary) font-bold shadow-(--shadow-gold-glow) hover:opacity-90',
        destructive: 'bg-(--color-error) text-white hover:opacity-90',
        outline: 'border border-(--border) bg-transparent text-(--text-primary) hover:bg-(--bg-elevated) hover:border-(--border-gold)',
        secondary: 'bg-(--bg-elevated) text-(--text-primary) hover:bg-(--bg-surface)',
        ghost: 'text-(--text-secondary) hover:bg-(--gold-muted) hover:text-(--text-primary)',
        link: 'text-(--gold-dark) underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 px-3',
        lg: 'h-11 px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
