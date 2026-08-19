'use client';

import Link from 'next/link';
import { useActionState, useMemo, useState } from 'react';
import { submitBooking } from '@/app/actions';
import { Field, FormError, SubmitButton } from './Forms';

export interface SlotDTO { startUtc: string; endUtc: string; mode: string; feeScheduleId: number | null; durationMinutes: number }
export interface FeeDTO {
  id: number; kind: string; label: string; mode: string | null; durationMinutes: number | null;
  currencyCode: string; amountMinor: number; basis: string; includes: string | null;
  excludes: string | null; isStatutoryPassthrough: number; taxNote: string | null;
}
export interface AreaDTO { id: number; name: string; parentName: string | null }

const MODE_LABEL: Record<string, string> = {
  video: 'Video call', audio: 'Audio call', phone: 'Telephone',
  chat: 'Secure chat', in_person: 'In person',
};

const STEPS = ['Service', 'Date', 'Time', 'Your matter', 'Review'] as const;

function money(minor: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(minor / 100);
  } catch { return `${currency} ${(minor / 100).toFixed(0)}`; }
}

/**
 * Six-step booking flow, following the reference kit's stepper composition.
 *
 * The client's local timezone is read from the browser and sent explicitly, and
 * every slot is rendered in that zone with the offset stated — a booking that
 * silently assumes a timezone is a booking someone will miss.
 *
 * Fees are shown before the user commits, with the professional's fee and any
 * statutory court charges itemised separately so the quoted figure is never
 * mistaken for the total.
 */
export function BookingFlow({
  slug, professionalName, slots, fees, areas,
}: {
  slug: string; professionalName: string;
  slots: SlotDTO[]; fees: FeeDTO[]; areas: AreaDTO[];
}) {
  const [state, formAction] = useActionState(submitBooking, null);
  const err = state?.fieldErrors ?? {};
  const val = state?.values ?? {};

  const timezone = useMemo(
    () => (typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'Asia/Kolkata'),
    [],
  );

  const consultFees = fees.filter((f) => f.kind === 'consultation' && f.basis !== 'on_request');
  const [feeId, setFeeId] = useState<number | null>(consultFees[0]?.id ?? null);
  const chosenFee = consultFees.find((f) => f.id === feeId) ?? null;

  // Only offer slots whose mode matches the chosen service.
  const eligible = useMemo(
    () => (chosenFee?.mode ? slots.filter((s) => s.mode === chosenFee.mode) : slots),
    [slots, chosenFee],
  );

  const byDay = useMemo(() => {
    const map = new Map<string, SlotDTO[]>();
    for (const s of eligible) {
      const key = new Date(s.startUtc).toLocaleDateString('en-CA', { timeZone: timezone });
      const list = map.get(key) ?? [];
      list.push(s);
      map.set(key, list);
    }
    return map;
  }, [eligible, timezone]);

  const days = [...byDay.keys()].sort();
  const [day, setDay] = useState<string | null>(days[0] ?? null);
  const [slot, setSlot] = useState<SlotDTO | null>(null);
  const [step, setStep] = useState(0);

  const daySlots = day ? byDay.get(day) ?? [] : [];

  const statutory = fees.filter((f) => f.isStatutoryPassthrough === 1);
  const totalMinor = chosenFee?.isStatutoryPassthrough ? chosenFee.amountMinor : chosenFee?.amountMinor ?? 0;

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-IN', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: true });
  const fmtDay = (key: string) =>
    new Date(`${key}T12:00:00Z`).toLocaleDateString('en-IN', { timeZone: timezone, weekday: 'short', day: 'numeric', month: 'short' });

  if (slots.length === 0) {
    return (
      <div className="notice notice-info">
        <span className="notice-icon" aria-hidden="true">ⓘ</span>
        <div className="stack gap-2">
          <strong>No bookable times in the next two weeks</strong>
          <span className="t-body-sm">
            {professionalName} has not published availability for this period. You can still send an
            enquiry and they can propose a time.
          </span>
          <Link href={`/advocates/${slug}/consult`} className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-start' }}>
            Send an enquiry instead
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="stack gap-5">
      {/* ------------------------------------------------------------ stepper */}
      <div className="stepper" role="group" aria-label="Booking progress">
        {STEPS.map((label, i) => (
          <div key={label} style={{ display: 'contents' }}>
            {i > 0 && <span className="stepper-line" data-on={step >= i} aria-hidden="true" />}
            <div className="stepper-node">
              <span
                className="stepper-dot"
                data-state={step > i ? 'done' : step === i ? 'current' : 'todo'}
                aria-hidden="true"
              />
              <span className="stepper-label">{label}</span>
            </div>
          </div>
        ))}
      </div>
      <p className="sr-only" role="status">Step {step + 1} of {STEPS.length}: {STEPS[step]}</p>

      <FormError message={state?.ok ? undefined : state?.message} />

      <form action={formAction} className="stack gap-5" noValidate>
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="clientTimezone" value={timezone} />
        <input type="hidden" name="feeScheduleId" value={feeId ?? ''} />
        <input type="hidden" name="startsAtUtc" value={slot?.startUtc ?? ''} />
        <input type="hidden" name="endsAtUtc" value={slot?.endUtc ?? ''} />
        <input type="hidden" name="mode" value={slot?.mode ?? chosenFee?.mode ?? 'video'} />

        {/* ----------------------------------------------------- 1. service */}
        {step === 0 && (
          <section className="stack gap-3">
            <h2 className="t-headline-md">Which service do you need?</h2>
            <div className="stack gap-2">
              {consultFees.map((f) => (
                <label key={f.id} className={`fee-option ${feeId === f.id ? 'is-on' : ''}`}>
                  <input
                    type="radio" name="feeChoice" value={f.id} checked={feeId === f.id}
                    onChange={() => { setFeeId(f.id); setSlot(null); }}
                  />
                  <span className="stack gap-1" style={{ minWidth: 0, flex: 1 }}>
                    <span className="row wrap gap-2" style={{ justifyContent: 'space-between' }}>
                      <strong>{f.label}</strong>
                      <strong className="mono">{money(f.amountMinor, f.currencyCode)}</strong>
                    </span>
                    <span className="t-caption">
                      {f.mode ? MODE_LABEL[f.mode] ?? f.mode : 'Any format'}
                      {f.durationMinutes ? ` · ${f.durationMinutes} minutes` : ''}
                      {f.basis === 'from' ? ' · from' : ''}
                    </span>
                    {f.includes && <span className="t-caption">Includes: {f.includes}</span>}
                    {f.excludes && <span className="t-caption">Not included: {f.excludes}</span>}
                  </span>
                </label>
              ))}
            </div>
            <div className="row wrap gap-2">
              <button type="button" className="btn btn-primary" disabled={!feeId} onClick={() => setStep(1)}>
                Continue
              </button>
              <Link href={`/advocates/${slug}`} className="btn btn-ghost">Back to profile</Link>
            </div>
          </section>
        )}

        {/* -------------------------------------------------------- 2. date */}
        {step === 1 && (
          <section className="stack gap-3">
            <h2 className="t-headline-md">Choose a date</h2>
            <p className="t-caption">Times are shown in your timezone ({timezone}).</p>
            <div className="day-grid" role="group" aria-label="Available dates">
              {days.map((d) => (
                <button
                  key={d} type="button"
                  className={`day-cell ${day === d ? 'is-on' : ''}`}
                  aria-pressed={day === d}
                  onClick={() => { setDay(d); setSlot(null); }}
                >
                  <span className="day-label">{fmtDay(d)}</span>
                  <span className="day-count">{(byDay.get(d) ?? []).length} slots</span>
                </button>
              ))}
            </div>
            <div className="row wrap gap-2">
              <button type="button" className="btn btn-primary" disabled={!day} onClick={() => setStep(2)}>Continue</button>
              <button type="button" className="btn btn-ghost" onClick={() => setStep(0)}>Back</button>
            </div>
          </section>
        )}

        {/* -------------------------------------------------------- 3. time */}
        {step === 2 && (
          <section className="stack gap-3">
            <h2 className="t-headline-md">Choose a time</h2>
            <p className="t-caption">{day ? fmtDay(day) : ''} · {timezone}</p>
            {err.startsAtUtc && <span className="error-text" role="alert"><span aria-hidden="true">!</span>{err.startsAtUtc}</span>}
            <div className="slot-grid" role="group" aria-label="Available times">
              {daySlots.map((s) => (
                <button
                  key={s.startUtc} type="button"
                  className={`slot-cell ${slot?.startUtc === s.startUtc ? 'is-on' : ''}`}
                  aria-pressed={slot?.startUtc === s.startUtc}
                  onClick={() => setSlot(s)}
                >
                  {fmtTime(s.startUtc)}
                </button>
              ))}
            </div>
            <div className="row wrap gap-2">
              <button type="button" className="btn btn-primary" disabled={!slot} onClick={() => setStep(3)}>Continue</button>
              <button type="button" className="btn btn-ghost" onClick={() => setStep(1)}>Back</button>
            </div>
          </section>
        )}

        {/* ------------------------------------------------------ 4. matter */}
        {step === 3 && (
          <section className="stack gap-4">
            <h2 className="t-headline-md">About you and the matter</h2>
            <div className="form-grid">
              <Field name="clientName" label="Your name" required error={err.clientName}>
                <input id="clientName" name="clientName" className="input" autoComplete="name" required
                  defaultValue={val.clientName ?? ''} aria-invalid={Boolean(err.clientName)} />
              </Field>
              <Field name="clientEmail" label="Email" required hint="Your confirmation goes here." error={err.clientEmail}>
                <input id="clientEmail" name="clientEmail" type="email" className="input" autoComplete="email" required
                  defaultValue={val.clientEmail ?? ''} aria-invalid={Boolean(err.clientEmail)} />
              </Field>
              <Field name="clientPhone" label="Phone" hint="Optional." error={err.clientPhone}>
                <input id="clientPhone" name="clientPhone" type="tel" className="input" autoComplete="tel"
                  defaultValue={val.clientPhone ?? ''} aria-invalid={Boolean(err.clientPhone)} />
              </Field>
              <Field name="urgency" label="Is there a deadline?">
                <select id="urgency" name="urgency" className="select" defaultValue={val.urgency ?? 'normal'}>
                  <option value="normal">No fixed deadline</option>
                  <option value="urgent">There is a deadline soon</option>
                  <option value="emergency">Urgent — today or tomorrow</option>
                </select>
              </Field>
              <Field name="practiceAreaId" label="What is this about?" hint="Your best guess is fine.">
                <select id="practiceAreaId" name="practiceAreaId" className="select" defaultValue={val.practiceAreaId ?? ''}>
                  <option value="">Not sure</option>
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>{a.parentName ? `${a.parentName} › ${a.name}` : a.name}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field name="brief" label="What has happened?" required
              hint="A few sentences in your own words. Leave out anything confidential or privileged."
              error={err.brief}>
              <textarea id="brief" name="brief" className="textarea" required minLength={30} maxLength={2000}
                defaultValue={val.brief ?? ''} aria-invalid={Boolean(err.brief)}
                placeholder="For example: My employer has not deposited my PF contributions for eight months. I raised it with HR twice in writing and had no reply." />
            </Field>
            <div className="row wrap gap-2">
              <button type="button" className="btn btn-primary" onClick={() => setStep(4)}>Review</button>
              <button type="button" className="btn btn-ghost" onClick={() => setStep(2)}>Back</button>
            </div>
          </section>
        )}

        {/* ------------------------------------------------------ 5. review */}
        {step === 4 && (
          <section className="stack gap-4">
            <h2 className="t-headline-md">Check and confirm</h2>

            <div className="card stack gap-3" style={{ padding: 18 }}>
              <dl className="fact-grid">
                <div><dt>Professional</dt><dd>{professionalName}</dd></div>
                <div><dt>Service</dt><dd>{chosenFee?.label ?? '—'}</dd></div>
                <div><dt>Format</dt><dd>{MODE_LABEL[slot?.mode ?? ''] ?? slot?.mode ?? '—'}</dd></div>
                <div><dt>When</dt><dd>{slot ? `${fmtDay(new Date(slot.startUtc).toLocaleDateString('en-CA', { timeZone: timezone }))}, ${fmtTime(slot.startUtc)}` : '—'}</dd></div>
                <div><dt>Timezone</dt><dd>{timezone}</dd></div>
                <div><dt>Duration</dt><dd>{slot?.durationMinutes ?? '—'} minutes</dd></div>
              </dl>

              <hr className="divider" />

              {/* Itemised, so a quoted fee is never read as the total cost. */}
              <div className="stack gap-2">
                <span className="t-label-mono ink-variant">What this costs</span>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <span className="t-body-sm">{chosenFee?.label ?? 'Consultation'}</span>
                  <strong className="mono">{chosenFee ? money(chosenFee.amountMinor, chosenFee.currencyCode) : '—'}</strong>
                </div>
                {chosenFee?.taxNote && <span className="t-caption">{chosenFee.taxNote}</span>}
                <div className="row" style={{ justifyContent: 'space-between', borderTop: '1px solid var(--outline-variant)', paddingTop: 8 }}>
                  <strong>Payable to the advocate</strong>
                  <strong className="mono">{chosenFee ? money(totalMinor, chosenFee.currencyCode) : '—'}</strong>
                </div>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <span className="t-body-sm">Platform charge</span>
                  <strong className="mono">Nil</strong>
                </div>
              </div>

              {statutory.length > 0 && (
                <div className="notice notice-info">
                  <span className="notice-icon" aria-hidden="true">ⓘ</span>
                  <div className="stack gap-1">
                    <strong>Court and statutory charges are separate</strong>
                    {statutory.map((f) => (
                      <span key={f.id} className="t-caption">
                        {f.label}: from {money(f.amountMinor, f.currencyCode)} — {f.includes ?? 'payable to the court, not the advocate'}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="notice notice-legal">
              <span className="notice-icon" aria-hidden="true">ⓘ</span>
              <span className="t-body-sm">
                The fee above is set by the professional and collected by them directly. This platform
                does not process the payment and takes no share of it. Booking a consultation is not
                legal advice and does not by itself create a lawyer–client relationship — the
                professional may still decline, for example because of a conflict of interest.
              </span>
            </div>

            <div className="stack gap-2">
              <label className="checkbox-row">
                <input type="checkbox" name="feeAck" value="1" required aria-invalid={Boolean(err.feeAck)} />
                <span className="t-body-sm">
                  I have read the fee note, I understand court and statutory charges are additional,
                  and I understand the professional may decline this request.
                </span>
              </label>
              {err.feeAck && <span className="error-text" role="alert"><span aria-hidden="true">!</span>{err.feeAck}</span>}
            </div>

            <div className="row wrap gap-2">
              <SubmitButton pendingLabel="Confirming…">Confirm booking</SubmitButton>
              <button type="button" className="btn btn-ghost" onClick={() => setStep(3)}>Back</button>
            </div>
          </section>
        )}
      </form>
    </div>
  );
}
