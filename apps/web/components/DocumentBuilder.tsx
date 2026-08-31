'use client';

import { useMemo, useState } from 'react';
import { groupFields, fillTemplate } from '@lexhall/core';
import type { TemplateField } from '@lexhall/core';
import { Field } from './Forms';
import { DocumentViewer } from './DocumentViewer';

/**
 * The corporate document builder: pick values for a template's declared
 * fields, preview the result, then download the real file.
 *
 * Deliberately not a Server Action. The final step is a plain HTML form
 * POSTing to `/api/resources/[slug]/fill` (see that route for why), so this
 * component works with JavaScript off — only the live preview and the
 * step-to-step navigation need it.
 *
 * Every declared field gets exactly one hidden input, rendered unconditionally
 * regardless of which step is showing. That is the fix for a real bug found
 * while building this: a wizard that only mounts the current step's input
 * elements loses every earlier step's value the moment the DOM node for it is
 * unmounted, because FormData is read from whatever is in the DOM at submit
 * time, not from React state history.
 *
 * Nothing here is persisted server-side between steps — values live only in
 * this component's state and the form's own hidden inputs, matching the
 * plan's explicit choice not to store a half-completed contract in the
 * database for no benefit.
 */
export function DocumentBuilder({
  slug, title, fields, body, aiExtractEnabled = false,
}: {
  slug: string; title: string; fields: TemplateField[]; body: string;
  /** FEATURE_AI_FIELD_EXTRACT. Off by default; see ADR-013. */
  aiExtractEnabled?: boolean;
}) {
  const groups = useMemo(() => groupFields(fields), [fields]);
  const steps = useMemo(
    () => [
      ...(aiExtractEnabled ? ['Describe it'] : []),
      ...groups.map((g) => g.label),
      'Review & download',
    ],
    [groups, aiExtractEnabled],
  );
  /** Group N is at step N + this offset, once the optional first step exists. */
  const groupOffset = aiExtractEnabled ? 1 : 0;
  const reviewStep = groups.length + groupOffset;

  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Record<string, string>>({});

  const setValue = (key: string, v: string) => setValues((prev) => ({ ...prev, [key]: v }));

  const preview = useMemo(() => fillTemplate(body, fields, values, { mode: 'draft' }), [body, fields, values]);
  const strict = useMemo(() => fillTemplate(body, fields, values, { mode: 'strict' }), [body, fields, values]);
  const canDownload = strict.text !== '';

  const missingOnStep = (groupIndex: number) =>
    (groups[groupIndex]?.fields ?? []).some((f) => f.required && !(values[f.key] ?? '').trim());

  return (
    <div className="stack gap-5">
      <div className="stepper" role="group" aria-label={`${title} progress`}>
        {steps.map((label, i) => (
          <div key={label} style={{ display: 'contents' }}>
            {i > 0 && <span className="stepper-line" data-on={step >= i} aria-hidden="true" />}
            <div className="stepper-node">
              <span className="stepper-dot" data-state={step > i ? 'done' : step === i ? 'current' : 'todo'} aria-hidden="true" />
              <span className="stepper-label">{label}</span>
            </div>
          </div>
        ))}
      </div>
      <p className="sr-only" role="status">Step {step + 1} of {steps.length}: {steps[step]}</p>

      <form method="post" action={`/api/resources/${slug}/fill`} className="stack gap-5" noValidate>
        {/* Every declared field, always present exactly once — see the note
            above on why this must not be conditional on the current step. */}
        {fields.map((f) => (
          <input key={f.key} type="hidden" name={f.key} value={values[f.key] ?? ''} />
        ))}

        {aiExtractEnabled && step === 0 && (
          <DescribeStep
            slug={slug}
            fields={fields}
            onAccept={(accepted) => setValues((prev) => ({ ...prev, ...accepted }))}
            onContinue={() => setStep(1)}
          />
        )}

        {groups.map((g, i) => step === i + groupOffset && (
          <section key={g.id} className="stack gap-4">
            <h2 className="t-headline-md">{g.label}</h2>
            <div className="form-grid">
              {g.fields.map((f) => (
                <FieldInput key={f.key} field={f} value={values[f.key] ?? ''} onChange={(v) => setValue(f.key, v)} />
              ))}
            </div>
            <div className="row wrap gap-2">
              <button type="button" className="btn btn-primary" disabled={missingOnStep(i)} onClick={() => setStep(i + groupOffset + 1)}>
                Continue
              </button>
              {(i + groupOffset) > 0 && (
                <button type="button" className="btn btn-ghost" onClick={() => setStep(i + groupOffset - 1)}>Back</button>
              )}
            </div>
          </section>
        ))}

        {step === reviewStep && (
          <section className="stack gap-4">
            <h2 className="t-headline-md">Review &amp; download</h2>

            {preview.missingRequired.length > 0 && (
              <div className="notice notice-error" role="alert">
                <span className="notice-icon" aria-hidden="true">!</span>
                <span>Still blank: {preview.missingRequired.map((f) => f.label).join(', ')}.</span>
              </div>
            )}
            {Object.keys(preview.fieldErrors).length > 0 && (
              <div className="notice notice-error" role="alert">
                <span className="notice-icon" aria-hidden="true">!</span>
                <span>{Object.values(preview.fieldErrors).join(' ')}</span>
              </div>
            )}

            {/* Only the fields that did not receive a real value — once
                everything is filled this is empty, so DocumentViewer's own
                "Nothing to fill in" caption shows instead of a stale count
                of the template's total field count. */}
            <DocumentViewer
              title={title}
              body={preview.text}
              fields={fields.filter((f) => !preview.filled.includes(f.key))}
            />

            <div className="notice notice-legal">
              <span className="notice-icon" aria-hidden="true">ⓘ</span>
              <span className="t-body-sm">
                caseADVO has not reviewed these details — this is a fill of the template you started from, not
                legal advice. Have it checked before you rely on it for anything material.
              </span>
            </div>

            <div className="stack gap-2">
              <span className="t-label-mono ink-variant">Download as</span>
              <div className="row wrap gap-2">
                <button type="submit" name="format" value="docx" className="btn btn-primary" disabled={!canDownload}>
                  Word (.docx)
                </button>
                <button type="submit" name="format" value="txt" className="btn btn-secondary" disabled={!canDownload}>
                  Plain text (.txt)
                </button>
              </div>
            </div>

            <button type="button" className="btn btn-ghost" style={{ alignSelf: 'flex-start' }} onClick={() => setStep(Math.max(0, reviewStep - 1))}>
              Back
            </button>
          </section>
        )}
      </form>
    </div>
  );
}

function FieldInput({
  field, value, onChange,
}: { field: TemplateField; value: string; onChange: (v: string) => void }) {
  const id = `f-${field.key}`;
  const common = {
    id, className: field.type === 'multiline' ? 'textarea' : field.type === 'select' ? 'select' : 'input',
    value, required: field.required, maxLength: field.maxLength,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => onChange(e.target.value),
  };

  return (
    <Field name={id} label={field.label} hint={field.hint} required={field.required}>
      {field.type === 'multiline' ? (
        <textarea {...common} rows={4} />
      ) : field.type === 'select' ? (
        <select {...common}>
          <option value="">Choose one</option>
          {(field.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input
          {...common}
          type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : field.type === 'money' ? 'text' : 'text'}
          inputMode={field.type === 'money' ? 'numeric' : undefined}
          placeholder={field.type === 'money' ? 'e.g. 25000' : undefined}
        />
      )}
    </Field>
  );
}

interface Proposal {
  key: string; label: string; value: string;
  confidence: 'high' | 'low'; evidence: string; problem?: string;
}

/**
 * The optional AI step: describe the arrangement in your own words, get
 * proposed field values, accept or ignore each one.
 *
 * CONFIRMATION IS MANDATORY AND STRUCTURAL, not a nicety. Nothing here
 * writes to the form until the user presses "Use the ticked values", and
 * only ticked rows are written. Low-confidence rows — and anything the
 * server could not validate — start UNticked, so an unreviewed value cannot
 * reach the document by inaction.
 *
 * See ADR-013 and COMPLIANCE_MATRIX C-17a. The model reads values out of
 * the user's own sentence; it never writes document text.
 */
function DescribeStep({
  slug, fields, onAccept, onContinue,
}: {
  slug: string;
  fields: TemplateField[];
  onAccept: (values: Record<string, string>) => void;
  onContinue: () => void;
}) {
  const [prose, setProse] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proposals, setProposals] = useState<Proposal[] | null>(null);
  const [ticked, setTicked] = useState<Record<string, boolean>>({});
  const [edited, setEdited] = useState<Record<string, string>>({});

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/corporate/${slug}/extract`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ prose }),
      });
      if (!res.ok) { setError('We could not read that. Fill the fields in yourself below.'); return; }
      const data = await res.json() as { items: Proposal[]; outcome: string };
      setProposals(data.items);
      // High-confidence rows are ticked; low-confidence and rejected rows are
      // not. An unreviewed value must never reach the document by inaction.
      setTicked(Object.fromEntries(data.items.map((i) => [i.key, i.confidence === 'high' && !i.problem])));
      setEdited(Object.fromEntries(data.items.map((i) => [i.key, i.value])));
      if (data.items.length === 0) setError('Nothing could be read from that. Fill the fields in yourself below.');
    } catch {
      setError('We could not reach the reader. Fill the fields in yourself below.');
    } finally {
      setBusy(false);
    }
  }

  function useTicked() {
    if (!proposals) { onContinue(); return; }
    const accepted: Record<string, string> = {};
    for (const p of proposals) {
      if (ticked[p.key]) accepted[p.key] = edited[p.key] ?? p.value;
    }
    onAccept(accepted);
    onContinue();
  }

  const tickedCount = Object.values(ticked).filter(Boolean).length;

  return (
    <section className="stack gap-4">
      <h2 className="t-headline-md">Describe it in your own words</h2>
      <p className="t-body-sm ink-variant" style={{ maxWidth: '68ch' }}>
        Optional. Write what you are arranging and we will suggest values for the fields — you check each
        one before it goes anywhere near the document. You can skip this and fill the fields in yourself.
      </p>

      <div className="field">
        <label className="label" htmlFor="ai-prose">What are you arranging?</label>
        <span className="hint" id="ai-prose-hint">
          Leave out anything confidential you would not want to send over the internet.
        </span>
        <textarea
          id="ai-prose" className="textarea" rows={5} value={prose} maxLength={6000}
          aria-describedby="ai-prose-hint"
          onChange={(e) => setProse(e.target.value)}
          placeholder="For example: We are hiring Priya Nair as a Senior Software Engineer in Hyderabad from 15 September 2026, ₹18 lakh a year, three months probation, 30 days' notice."
        />
      </div>

      {error && (
        <div className="notice notice-warn" role="alert">
          <span className="notice-icon" aria-hidden="true">!</span>
          <span>{error}</span>
        </div>
      )}

      <div className="row wrap gap-2">
        <button type="button" className="btn btn-secondary" data-loading={busy} disabled={busy || prose.trim().length < 20} onClick={run}>
          {busy ? 'Reading…' : 'Suggest values'}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onContinue}>
          Skip and fill it in myself
        </button>
      </div>

      {proposals && proposals.length > 0 && (
        <div className="stack gap-3">
          <h3 className="t-title">Suggested values</h3>
          <p className="t-body-sm ink-variant">
            Nothing is used until you press the button below. Untick anything you would rather type yourself.
          </p>

          <div className="stack gap-2">
            {proposals.map((p) => (
              <div key={p.key} className="result-card" style={{ gridTemplateColumns: 'minmax(0, 1fr)' }}>
                <div className="stack gap-2" style={{ minWidth: 0 }}>
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={Boolean(ticked[p.key])}
                      onChange={(e) => setTicked((t) => ({ ...t, [p.key]: e.target.checked }))}
                    />
                    <span className="stack gap-1" style={{ minWidth: 0 }}>
                      <strong>{p.label}</strong>
                      {p.problem
                        ? <span className="error-text"><span aria-hidden="true">!</span>{p.problem} Please check it.</span>
                        : p.confidence === 'low' && (
                          <span className="t-caption">Couldn’t read this confidently — please check it.</span>
                        )}
                    </span>
                  </label>

                  <input
                    className="input"
                    value={edited[p.key] ?? p.value}
                    aria-label={`${p.label} — suggested value, editable`}
                    onChange={(e) => setEdited((v) => ({ ...v, [p.key]: e.target.value }))}
                  />

                  {p.evidence && (
                    <span className="t-caption">From your words: “{p.evidence}”</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="notice notice-legal">
            <span className="notice-icon" aria-hidden="true">ⓘ</span>
            <span className="t-body-sm">
              These are readings of your own words, not advice, and no wording of ours has been added to the
              document. Check each value — you are the one signing it.
            </span>
          </div>

          <div className="row wrap gap-2">
            <button type="button" className="btn btn-primary" onClick={useTicked}>
              Use the {tickedCount} ticked {tickedCount === 1 ? 'value' : 'values'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={onContinue}>Ignore all and continue</button>
          </div>
        </div>
      )}

      {/* Field count, so the user knows what the step is worth skipping. */}
      <p className="t-caption">This document has {fields.length} fields.</p>
    </section>
  );
}
