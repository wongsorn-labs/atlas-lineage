import * as React from 'react';
import { Dialog as BaseDialog } from '@base-ui/react/dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

// Base UI, not Radix: a Select/Combobox nested inside a Radix Dialog closes
// the dialog on item-click, because Radix's outside-press detection doesn't
// recognize a Base UI portal as "inside". Both overlays need to come from
// the same library so their portal/outside-click registries agree.
const Dialog = BaseDialog.Root;
const DialogPortal = BaseDialog.Portal;
const DialogClose = BaseDialog.Close;

const DialogTrigger = BaseDialog.Trigger;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof BaseDialog.Backdrop>,
  React.ComponentPropsWithoutRef<typeof BaseDialog.Backdrop>
>(({ className, ...props }, ref) => (
  <BaseDialog.Backdrop
    ref={ref}
    className={cn('fixed inset-0 z-(--z-overlay) bg-black/50', className)}
    {...props}
  />
));
DialogOverlay.displayName = 'DialogOverlay';

const DialogContent = React.forwardRef<
  React.ElementRef<typeof BaseDialog.Popup>,
  React.ComponentPropsWithoutRef<typeof BaseDialog.Popup>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <BaseDialog.Popup
      ref={ref}
      className={cn(
        'fixed left-[50%] top-[50%] z-(--z-dialog) grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 rounded-xl bg-popover text-popover-foreground p-4 ring-1 ring-foreground/10 outline-none',
        className
      )}
      {...props}
    >
      {children}
      <DialogClose className="absolute right-3 top-3 rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogClose>
    </BaseDialog.Popup>
  </DialogPortal>
));
DialogContent.displayName = 'DialogContent';

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col gap-1 text-left', className)} {...props} />
);
DialogHeader.displayName = 'DialogHeader';

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof BaseDialog.Title>,
  React.ComponentPropsWithoutRef<typeof BaseDialog.Title>
>(({ className, ...props }, ref) => (
  <BaseDialog.Title
    ref={ref}
    className={cn('text-base font-medium leading-snug', className)}
    {...props}
  />
));
DialogTitle.displayName = 'DialogTitle';

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
};
