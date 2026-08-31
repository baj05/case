'use client';

import { Popover as RadixPopover } from 'radix-ui';
import type { ReactNode } from 'react';

/**
 * Popover — for new surfaces only.
 *
 * Not a retrofit for anything that already works. In particular the
 * search combobox in SearchInput is NOT a popover: a combobox has its own
 * ARIA contract (`role="combobox"`, `aria-activedescendant`, arrow-key
 * navigation over options while focus stays in the input) that a popover's
 * focus-moving behaviour actively breaks. Likewise the header mega-menu
 * and the `<details>`-based filter panels work with JavaScript off, which
 * a popover does not.
 */
export function Popover({
  trigger, children, label, align = 'start',
}: {
  trigger: ReactNode;
  children: ReactNode;
  /** Accessible name for the popover surface. */
  label: string;
  align?: 'start' | 'center' | 'end';
}) {
  return (
    <RadixPopover.Root>
      <RadixPopover.Trigger asChild>{trigger}</RadixPopover.Trigger>
      <RadixPopover.Portal>
        <RadixPopover.Content className="ui-popover" sideOffset={8} align={align} aria-label={label} collisionPadding={16}>
          {children}
          <RadixPopover.Arrow className="ui-popover-arrow" width={12} height={6} />
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  );
}
