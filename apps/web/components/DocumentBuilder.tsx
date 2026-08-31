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
  slug, title, fields, body,
}: {
  slug: string; title: string; fields: TemplateField[]; body: string;
}) {
  const groups = useMemo(() => groupFields(fields), [fields]);
  const steps = useMemo(() => [...groups.map((g) => g.label), 'Review & download'], [groups]);
  const reviewStep = groups.length;

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

        {groups.map((g, i) => step === i && (
          <section key={g.id} className="stack gap-4">
            <h2 className="t-headline-md">{g.label}</h2>
            <div className="form-grid">
              {g.fields.map((f) => (
                <FieldInput key={f.key} field={f} value={values[f.key] ?? ''} onChange={(v) => setValue(f.key, v)} />
              ))}
            </div>
            <div className="row wrap gap-2">
              <button type="button" className="btn btn-primary" disabled={missingOnStep(i)} onClick={() => setStep(i + 1)}>
                Continue
              </button>
              {i > 0 && <button type="button" className="btn btn-ghost" onClick={() => setStep(i - 1)}>Back</button>}
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
