'use client';

import { Toast as RadixToast } from 'radix-ui';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

/**
 * Transient notifications.
 *
 * DELIBERATELY NOT a replacement for FormError / FormSuccess. A validation
 * message belongs inline, next to the field it is about, where it stays put
 * while the user fixes the input; a legal notice belongs in the page where
 * it is crawlable and cannot be dismissed by a timer. A toast is for the
 * third case only: something happened elsewhere, or is already done, and
 * the user needs to know without being interrupted.
 *
 * The usual shape is to call `toast()` with an existing `ActionResult` —
 * so a server action's own message is what appears, rather than a second
 * copy of the same string maintained here.
 */

export interface ToastMessage {
  id: number;
  title: string;
  description?: string;
  tone: 'ok' | 'error' | 'neutral';
}

interface ToastApi {
  toast: (input: { title: string; description?: string; tone?: ToastMessage['tone'] }) => void;
  /** Convenience for the common case: hand it an ActionResult. */
  toastResult: (result: { ok: boolean; message?: string }, okTitle?: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const toast = useCallback((input: { title: string; description?: string; tone?: ToastMessage['tone'] }) => {
    setMessages((prev) => [
      ...prev,
      // Date.now() would collide for two toasts raised in the same
      // millisecond, which is exactly what a loop over results does.
      { id: prev.length === 0 ? 1 : (prev[prev.length - 1]!.id + 1), title: input.title, description: input.description, tone: input.tone ?? 'neutral' },
    ]);
  }, []);

  const toastResult = useCallback((result: { ok: boolean; message?: string }, okTitle = 'Done') => {
    toast({
      title: result.ok ? okTitle : 'That did not work',
      description: result.message,
      tone: result.ok ? 'ok' : 'error',
    });
  }, [toast]);

  const api = useMemo(() => ({ toast, toastResult }), [toast, toastResult]);

  const dismiss = useCallback((id: number) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={api}>
      <RadixToast.Provider swipeDirection="right" duration={6000}>
        {children}
        {messages.map((m) => (
          <RadixToast.Root
            key={m.id}
            className="ui-toast"
            data-tone={m.tone}
            onOpenChange={(open) => { if (!open) dismiss(m.id); }}
          >
            <div className="stack gap-1" style={{ minWidth: 0, flex: 1 }}>
              <RadixToast.Title className="ui-toast-title">{m.title}</RadixToast.Title>
              {m.description && (
                <RadixToast.Description className="ui-toast-desc">{m.description}</RadixToast.Description>
              )}
            </div>
            <RadixToast.Close asChild>
              <button type="button" className="btn btn-ghost btn-sm" aria-label="Dismiss">×</button>
            </RadixToast.Close>
          </RadixToast.Root>
        ))}
        <RadixToast.Viewport className="ui-toast-viewport" />
      </RadixToast.Provider>
    </ToastContext.Provider>
  );
}

/**
 * Throws when there is no provider above it. That is intentional: a toast
 * that silently does nothing because the provider was forgotten is a bug
 * that only shows up when something has already gone wrong and the user
 * needed to be told about it.
 */
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast requires <ToastProvider> above it in the tree.');
  return ctx;
}
