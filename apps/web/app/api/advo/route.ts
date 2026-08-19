import { NextResponse } from 'next/server';
import { loadIntakeVocabulary, shortlist, saveIntakeSession, formatMinor } from '@lexhall/db';
import { startSession, advance, type AdvoState, type ShortlistSort } from '@lexhall/core';
import { databaseReady } from '@/lib/data';

/**
 * Advo AI turn endpoint.
 *
 * Stateless by design: the client sends the state back each turn. The engine is
 * deterministic (ADR-006), so the same state plus the same message always yields
 * the same next question — which is what makes the routing auditable.
 */
export async function POST(request: Request) {
  if (!databaseReady()) {
    return NextResponse.json({ error: 'Database not initialised.' }, { status: 503 });
  }

  let body: {
    state?: AdvoState; message?: string; answering?: string; display?: string;
    sort?: ShortlistSort; action?: 'start' | 'turn' | 'sort';
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 });
  }

  const vocab = loadIntakeVocabulary();

  try {
    // ---- start a fresh conversation ---------------------------------------
    if (body.action === 'start' || !body.state) {
      return NextResponse.json({ state: startSession(), results: [], sort: 'match' });
    }

    // ---- re-sort an existing shortlist without re-asking anything ---------
    if (body.action === 'sort') {
      const sort = (body.sort ?? 'match') as ShortlistSort;
      const results = shortlist(body.state.facts, sort, 12);
      return NextResponse.json({ state: body.state, results: decorate(results), sort });
    }

    // ---- advance the conversation by one message --------------------------
    const message = (body.message ?? '').slice(0, 600);
    if (!message.trim()) return NextResponse.json({ error: 'Empty message.' }, { status: 400 });

    const next = advance(
      body.state, message, vocab, body.answering as never,
      typeof body.display === 'string' ? body.display.slice(0, 600) : undefined,
    );

    let results: ReturnType<typeof decorate> = [];
    if (next.done) {
      const raw = shortlist(next.facts, (body.sort ?? 'match') as ShortlistSort, 12);
      results = decorate(raw);
      // Store the routed session so accuracy can be measured against real
      // transcripts rather than guessed at.
      try { saveIntakeSession({ facts: next.facts, transcript: next.transcript, resultCount: raw.length }); } catch { /* telemetry must not break the turn */ }
    }

    return NextResponse.json({ state: next, results, sort: body.sort ?? 'match' });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

/** Format money server-side so the client never invents a currency format. */
function decorate(entries: ReturnType<typeof shortlist>) {
  return entries.map((e) => ({
    ...e,
    feeLabel: e.minConsultMinor === null
      ? 'Fee not published'
      : e.maxConsultMinor && e.maxConsultMinor !== e.minConsultMinor
        ? `${formatMinor(e.minConsultMinor, e.currencyCode)}–${formatMinor(e.maxConsultMinor, e.currencyCode)}`
        : formatMinor(e.minConsultMinor, e.currencyCode),
  }));
}
