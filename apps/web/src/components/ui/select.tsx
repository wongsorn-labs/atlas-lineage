import * as React from 'react';
import { Combobox } from '@base-ui/react/combobox';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

// Combobox, not Select: same floating-ui-powered positioning (flip/shift/
// size middleware, auto-capped height via --available-height), but its
// popup/positioner/list primitives are the actively developed ones in
// base-ui — Select is the thinner, button-only sibling. We only use the
// Trigger (not Input), so this still behaves as a plain button-triggered
// dropdown rather than a searchable combobox.
const Select = Combobox.Root;
const SelectGroup = Combobox.Group;
const SelectValue = Combobox.Value;

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof Combobox.Trigger>,
  React.ComponentPropsWithoutRef<typeof Combobox.Trigger>
>(({ className, children, ...props }, ref) => (
  <Combobox.Trigger
    ref={ref}
    className={cn(
      'flex h-10 w-full items-center justify-between rounded-md border border-(--border) bg-(--bg-elevated) px-3 py-2 text-sm text-(--text-primary) ring-offset-(--bg-elevated) placeholder:text-(--text-muted) focus:outline-none focus:ring-2 focus:ring-(--gold) focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
      className
    )}
    {...props}
  >
    {children}
    <Combobox.Icon>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </Combobox.Icon>
  </Combobox.Trigger>
));
SelectTrigger.displayName = 'SelectTrigger';

const SelectContent = React.forwardRef<
  React.ElementRef<typeof Combobox.Popup>,
  React.ComponentPropsWithoutRef<typeof Combobox.Popup>
>(({ className, children, ...props }, ref) => (
  <Combobox.Portal>
    <Combobox.Positioner sideOffset={4} className="z-(--z-popover) outline-none">
      <Combobox.Popup
        ref={ref}
        className={cn(
          'max-h-(--available-height) w-(--anchor-width) min-w-[8rem] overflow-y-auto rounded-md border border-(--border) bg-(--bg-card) p-1 text-(--text-primary) shadow-md outline-none',
          className
        )}
        {...props}
      >
        <Combobox.List>{children}</Combobox.List>
      </Combobox.Popup>
    </Combobox.Positioner>
  </Combobox.Portal>
));
SelectContent.displayName = 'SelectContent';

const SelectItem = React.forwardRef<
  React.ElementRef<typeof Combobox.Item>,
  React.ComponentPropsWithoutRef<typeof Combobox.Item>
>(({ className, children, ...props }, ref) => (
  <Combobox.Item
    ref={ref}
    className={cn(
      'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none data-[highlighted]:bg-(--gold-muted) data-[highlighted]:text-(--gold) data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <Combobox.ItemIndicator>
        <Check className="h-4 w-4" />
      </Combobox.ItemIndicator>
    </span>
    {children}
  </Combobox.Item>
));
SelectItem.displayName = 'SelectItem';

export { Select, SelectGroup, SelectValue, SelectTrigger, SelectContent, SelectItem };
