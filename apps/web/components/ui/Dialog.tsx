'use client';

import { Dialog as RadixDialog } from 'radix-ui';
import type { ReactNode } from 'react';

/**
 * Modal dialog.
 *
 * This exists because the hand-rolled full-screen overlay it replaces had
 * no focus trap, no scroll lock and no focus restore — a keyboard user
 * could Tab straight out of the "modal" into the page behind it, and a
 * screen reader was never told the rest of the page was inert. Those are
 * the parts of a dialog that are genuinely hard to get right by hand, and
 * Radix provides all of them.
 *
 * Note that Radix does NOT set `aria-modal` on the content. It marks every
 * sibling of the portalled dialog `aria-hidden` instead, which achieves the
 * same outcome — verified in the browser: with the dialog open, every
 * content element outside it carries aria-hidden="true". That approach is
 * deliberate on Radix's part; `aria-modal` alone is unreliable across
 * screen readers. Do not "fix" the missing attribute by adding it by hand.
 *
 * `title` is a required prop, not an optional one: Radix warns at runtime
 * when `Dialog.Title` is missing, and a dialog with no accessible name is
 * the single most common way this component gets built wrong. Making it
 * required moves that from a console warning to a type error.
 *
 * Controlled only. Every caller here already holds the open state (it is
 * usually tied to other UI), and offering both controlled and uncontrolled
 * modes would double the surface for no current need.
 */
export function Dialog({
  open, onOpenChange, title, description, children, footer, wide = false, hideTitle = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Required — this is the dialog's accessible name. */
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Sized for large content (a document, a table) rather than a prompt. */
  wide?: boolean;
  /** Keep the accessible name but do not render it visibly — for a dialog
   * whose content carries its own heading. */
  hideTitle?: boolean;
}) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="ui-overlay" />
        <RadixDialog.Content className={`ui-dialog${wide ? ' ui-dialog-wide' : ''}`}>
          <div className="ui-dialog-head">
            {hideTitle ? (
              <RadixDialog.Title asChild>
                <span className="sr-only">{title}</span>
              </RadixDialog.Title>
            ) : (
              <RadixDialog.Title className="ui-dialog-title">{title}</RadixDialog.Title>
            )}
            <RadixDialog.Close asChild>
              <button type="button" className="btn btn-ghost btn-sm">Close</button>
            </RadixDialog.Close>
          </div>

          {description && (
            <RadixDialog.Description className="ui-dialog-desc">{description}</RadixDialog.Description>
          )}

          <div className="ui-dialog-body">{children}</div>

          {footer && <div className="ui-dialog-head" style={{ borderBottom: 0, borderTop: '1px solid var(--outline-variant)' }}>{footer}</div>}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

/**
 * Variant whose body does its own padding and scrolling — for content that
 * already has a pinned toolbar and an internal scroll area, such as
 * DocumentViewer. Kept as a separate component rather than a `flush` prop
 * on Dialog so the two body layouts stay obvious at the call site.
 */
export function DialogFlush({
  open, onOpenChange, title, children, wide = true,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="ui-overlay" />
        <RadixDialog.Content className={`ui-dialog${wide ? ' ui-dialog-wide' : ''}`}>
          <div className="ui-dialog-head">
            <RadixDialog.Title className="ui-dialog-title">{title}</RadixDialog.Title>
            <RadixDialog.Close asChild>
              <button type="button" className="btn btn-ghost btn-sm">Close</button>
            </RadixDialog.Close>
          </div>
          <div className="ui-dialog-body-flush">{children}</div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
