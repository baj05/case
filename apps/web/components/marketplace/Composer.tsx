'use client';

/**
 * The service composer: an advocate writes the offer the way they would
 * describe it out loud, attaches a banner and optional audio, sets a price
 * and a delivery mode, and chooses how long it stays live.
 *
 * The pitch has both a floor and a ceiling. The floor exists because a
 * one-line offer ("Bail work, call me") tells a worried client nothing and
 * makes the feed useless; the ceiling exists because past ~500 characters
 * an offer stops being a pitch and becomes a brochure nobody reads.
 */
import { useEffect, useId, useRef, useState } from 'react';
import { CloseIcon, ImageIcon, MicIcon } from '@/components/Icons';
import { formatMinor } from '@/lib/format';
import { useModalDialog } from '@/lib/useModalDialog';

const PITCH_MIN = 280;
const PITCH_MAX = 500;

const DURATIONS = [
  { key: '24h', label: '24 hours' },
  { key: '7d', label: '7 days' },
  { key: '30d', label: '30 days' },
  { key: 'permanent', label: 'No expiry' },
];

const DELIVERY = [
  { key: 'doorstep', label: 'Doorstep' },
  { key: 'chambers', label: 'At chambers' },
  { key: 'virtual', label: 'Virtual' },
];

export interface ComposerDraft {
  pitch: string; category: string; priceRupees: string;
  priceBasis: string; delivery: string; duration: string;
  radiusKm: number; bannerAlt: string; podcastTitle: string;
}

const EMPTY: ComposerDraft = {
  pitch: '', category: '', priceRupees: '', priceBasis: 'fixed',
  delivery: 'chambers', duration: '7d', radiusKm: 25, bannerAlt: '', podcastTitle: '',
};

export function Composer({
  categories, onClose, onPublish,
}: {
  categories: Array<{ key: string; label: string }>;
  onClose: () => void;
  onPublish: (draft: ComposerDraft) => void;
}) {
  const [draft, setDraft] = useState<ComposerDraft>(EMPTY);
  const [attachBanner, setAttachBanner] = useState(false);
  const [attachPodcast, setAttachPodcast] = useState(false);
  const pitchRef = useRef<HTMLTextAreaElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const ids = useId();

  const set = <K extends keyof ComposerDraft>(key: K, value: ComposerDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const len = draft.pitch.trim().length;
  const countState = len > PITCH_MAX ? 'over' : len > PITCH_MAX - 60 ? 'near' : undefined;
  // A banner without a description is the accessibility failure this whole
  // field exists to prevent, so it blocks publishing rather than warning.
  const bannerNeedsAlt = attachBanner && draft.bannerAlt.trim().length === 0;
  const priceValid = /^\d+$/.test(draft.priceRupees) && Number(draft.priceRupees) > 0;
  const canPublish = len >= PITCH_MIN && len <= PITCH_MAX
    && draft.category !== '' && priceValid && !bannerNeedsAlt;

  useEffect(() => { pitchRef.current?.focus(); }, []);

  useModalDialog(dialogRef, onClose);

  return (
    <div
      className="composer-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="composer"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${ids}-title`}
        ref={dialogRef}
      >
        <header className="composer-head">
          <strong id={`${ids}-title`}>Post a service</strong>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close composer">
            <CloseIcon size={16} />
          </button>
        </header>

        <div className="composer-body">
          <textarea
            ref={pitchRef}
            className="composer-pitch"
            placeholder="What do you actually do for the client, what does it cost them, and what do you need from them to start? Write it the way you would say it on the phone."
            value={draft.pitch}
            onChange={(e) => set('pitch', e.target.value)}
            aria-label="Service pitch"
            aria-describedby={`${ids}-count`}
          />

          {attachBanner && (
            <div className="composer-field">
              <label className="label" htmlFor={`${ids}-alt`}>
                Describe the banner image <span className="ink-variant">(required)</span>
              </label>
              <input
                id={`${ids}-alt`}
                className="input"
                value={draft.bannerAlt}
                onChange={(e) => set('bannerAlt', e.target.value)}
                placeholder="e.g. A signed rent agreement on a desk beside a set of house keys"
                aria-invalid={bannerNeedsAlt}
              />
              <span className="hint">
                Read aloud to anyone using a screen reader. A banner without one is a blank
                space in your listing for them.
              </span>
            </div>
          )}

          {attachPodcast && (
            <div className="composer-field">
              <label className="label" htmlFor={`${ids}-pod`}>Audio explainer title</label>
              <input
                id={`${ids}-pod`}
                className="input"
                value={draft.podcastTitle}
                onChange={(e) => set('podcastTitle', e.target.value)}
                placeholder="e.g. What actually happens in the 24 hours after an FIR"
              />
            </div>
          )}

          <div className="composer-row">
            <div className="composer-field">
              <label className="label" htmlFor={`${ids}-cat`}>Category</label>
              <select
                id={`${ids}-cat`}
                className="input"
                value={draft.category}
                onChange={(e) => set('category', e.target.value)}
              >
                <option value="">Choose one…</option>
                {categories.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>
            <div className="composer-field">
              <label className="label" htmlFor={`${ids}-price`}>Price (₹)</label>
              <input
                id={`${ids}-price`}
                className="input"
                inputMode="numeric"
                value={draft.priceRupees}
                onChange={(e) => set('priceRupees', e.target.value.replace(/[^\d]/g, ''))}
                placeholder="7500"
              />
              {priceValid && (
                <span className="hint">
                  Shows as {formatMinor(Number(draft.priceRupees) * 100)}
                </span>
              )}
            </div>
            <div className="composer-field">
              <label className="label" htmlFor={`${ids}-basis`}>Basis</label>
              <select
                id={`${ids}-basis`}
                className="input"
                value={draft.priceBasis}
                onChange={(e) => set('priceBasis', e.target.value)}
              >
                <option value="fixed">Fixed fee</option>
                <option value="starting_at">Starting at</option>
                <option value="hourly">Per hour</option>
              </select>
            </div>
          </div>

          <div className="composer-field">
            <span className="label">How it reaches the client</span>
            <div className="row wrap gap-2">
              {DELIVERY.map((d) => (
                <button
                  key={d.key}
                  type="button"
                  className="chip chip-button"
                  aria-pressed={draft.delivery === d.key}
                  onClick={() => set('delivery', d.key)}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div className="composer-field">
            <label className="label" htmlFor={`${ids}-radius`}>
              How far you will travel — {draft.radiusKm} km
            </label>
            <input
              id={`${ids}-radius`}
              type="range"
              min={5}
              max={100}
              step={5}
              value={draft.radiusKm}
              onChange={(e) => set('radiusKm', Number(e.target.value))}
            />
            <span className="hint">
              Clients outside this radius will not see the listing in their results.
            </span>
          </div>

          <div className="composer-field">
            <span className="label">Keep it live for</span>
            <div className="row wrap gap-2">
              {DURATIONS.map((d) => (
                <button
                  key={d.key}
                  type="button"
                  className="chip chip-button"
                  aria-pressed={draft.duration === d.key}
                  onClick={() => set('duration', d.key)}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div className="row wrap gap-2">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              aria-pressed={attachBanner}
              onClick={() => setAttachBanner((v) => !v)}
            >
              <ImageIcon size={14} /> {attachBanner ? 'Remove banner' : 'Add banner'}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              aria-pressed={attachPodcast}
              onClick={() => setAttachPodcast((v) => !v)}
            >
              <MicIcon size={14} /> {attachPodcast ? 'Remove audio' : 'Attach audio'}
            </button>
          </div>
        </div>

        <footer className="composer-foot">
          <span className="char-count" data-state={countState} id={`${ids}-count`}>
            {len < PITCH_MIN
              ? `${PITCH_MIN - len} more characters needed`
              : `${len} / ${PITCH_MAX}`}
          </span>
          <span className="row gap-2">
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!canPublish}
              onClick={() => onPublish(draft)}
            >
              Publish service
            </button>
          </span>
        </footer>
      </div>
    </div>
  );
}
