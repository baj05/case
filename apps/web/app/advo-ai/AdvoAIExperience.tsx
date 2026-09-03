'use client';

import { useState } from 'react';
import { AdvoChat } from '@/components/AdvoChat';

const QUICK_START_CARDS = [
  {
    title: 'Eviction & Tenant Rights',
    prompt: 'My landlord wants me to vacate without proper notice',
    description: 'Landlord disputes, notice periods, deposits',
    emoji: '🏠',
  },
  {
    title: 'Company Setup',
    prompt: 'I need to register a new company and understand compliance',
    description: 'Registration, compliance, structure',
    emoji: '🏢',
  },
  {
    title: 'Criminal Case',
    prompt: 'I have been named in an FIR and need to understand my rights',
    description: 'Rights, procedures, bail, defense',
    emoji: '⚖️',
  },
  {
    title: 'Contract Disputes',
    prompt: 'The other party has breached our agreement and is not responding',
    description: 'Agreements, breach, enforcement',
    emoji: '📋',
  },
] as const;

/**
 * The real Advo AI experience, embedded directly on its own page. Earlier
 * this page only linked out to the floating launcher — but the launcher
 * suppresses itself on this exact route (see AdvoLauncher's `suppressed`
 * check, to avoid two chats competing), so that link silently did nothing.
 * Embedding the conversation here is the fix, and it also matches how every
 * reference product in this space works: the chat *is* the page, not a
 * button that opens one.
 */
export function AdvoAIExperience() {
  const [pending, setPending] = useState<string | null>(null);

  return (
    <div className="stack gap-6">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '12px',
        }}
      >
        {QUICK_START_CARDS.map((card) => (
          <button
            key={card.title}
            type="button"
            className="card"
            style={{
              padding: '16px',
              textAlign: 'left',
              cursor: 'pointer',
              border: '1px solid var(--outline-variant)',
              background: 'var(--surface-lowest)',
            }}
            onClick={() => setPending(card.prompt)}
          >
            <div style={{ fontSize: '22px', marginBottom: '8px' }}>{card.emoji}</div>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '4px' }}>{card.title}</h3>
            <p className="t-caption ink-variant">{card.description}</p>
          </button>
        ))}
      </div>

      <AdvoChat pendingMessage={pending} onConsumePending={() => setPending(null)} />
    </div>
  );
}
