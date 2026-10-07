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
      'flex h-8 w-full items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent pl-2.5 pr-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50',
      className
    )}
    {...props}
  >
    {children}
    <Combobox.Icon>
      <ChevronDown className="size-4 opacity-50" />
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
          'max-h-(--available-height) w-(--anchor-width) min-w-[8rem] overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-none',
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
      'relative flex w-full cursor-default select-none items-center rounded-md py-1 pl-7 pr-2 text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <Combobox.ItemIndicator>
        <Check className="size-4" />
      </Combobox.ItemIndicator>
    </span>
    {children}
  </Combobox.Item>
));
SelectItem.displayName = 'SelectItem';

export { Select, SelectGroup, SelectValue, SelectTrigger, SelectContent, SelectItem };
