'use client';

import { useState } from 'react';

const QUICK_START_CARDS = [
  {
    title: 'Eviction & Tenant Rights',
    description: 'Landlord disputes, notice periods, deposits',
    emoji: '🏠',
  },
  {
    title: 'Company Setup',
    description: 'Registration, compliance, structure',
    emoji: '🏢',
  },
  {
    title: 'Criminal Case',
    description: 'Rights, procedures, bail, defense',
    emoji: '⚖️',
  },
  {
    title: 'Contract Disputes',
    description: 'Agreements, breach, enforcement',
    emoji: '📋',
  },
];

export function QuickStartCards() {
  const handleQuickStart = (title: string) => {
    // Trigger the chat launcher with pre-filled content
    // The FAB launcher will be initialized with this topic
    setTimeout(() => {
      document.querySelector<HTMLButtonElement>('.advo-fab')?.click();
    }, 100);
  };

  return (
    <div
      className="container"
      style={{
        paddingBottom: '40px',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '16px',
          maxWidth: 1000,
          margin: '0 auto',
        }}
      >
        {QUICK_START_CARDS.map((card) => (
          <button
            key={card.title}
            onClick={() => handleQuickStart(card.title)}
            style={{
              padding: '20px',
              border: '1px solid var(--outline-variant)',
              borderRadius: 'var(--r-md)',
              background: 'var(--surface-lowest)',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--surface-low)';
              e.currentTarget.style.borderColor = 'var(--outline)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--surface-lowest)';
              e.currentTarget.style.borderColor = 'var(--outline-variant)';
            }}
          >
            <div style={{ fontSize: '24px', marginBottom: '12px' }}>
              {card.emoji}
            </div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '6px' }}>
              {card.title}
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant)' }}>
              {card.description}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
