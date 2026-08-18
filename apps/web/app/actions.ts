'use server';

/**
 * Server actions. Every one of these is a trust boundary:
 *   * input is validated here, on the server, never trusted from the client
 *   * the target professional's existence and eligibility are re-checked
 *   * nothing relies on a hidden field or a client-side guard (spec §99)
 */
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
  createConsultationRequest, createClaim, createDataRequest,
  getProfessionalBySlug,
} from '@lexhall/db';

export interface ActionResult {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

function str(form: FormData, key: string, max = 2000): string {
  const raw = form.get(key);
  return typeof raw === 'string' ? raw.trim().slice(0, max) : '';
}

/**
 * Keep whatever the user typed so a validation error never wipes the form.
 *
 * Returns a record keyed by the literal names passed in, rather than a broad
 * index signature, so `noUncheckedIndexedAccess` does not widen every read to
 * `string | undefined`.
 */
function keep<const K extends readonly string[]>(form: FormData, keys: K): Record<K[number], string> {
  return Object.fromEntries(keys.map((k) => [k, str(form, k)])) as Record<K[number], string>;
}

// -------------------------------------------------------------- consultation
export async function submitConsultation(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const slug = str(form, 'slug', 120);
  const values = keep(form, ['requesterName', 'requesterEmail', 'requesterPhone', 'summary', 'preferredMode', 'urgency', 'practiceAreaId', 'matterTypeId'] as const);
  const fieldErrors: Record<string, string> = {};

  const professional = getProfessionalBySlug(slug);
  if (!professional) return { ok: false, message: 'That profile is no longer available.', values };
  if (!professional.acceptsConsultations) {
    return { ok: false, message: 'This professional is not currently accepting consultation requests.', values };
  }

  if (values.requesterName.length < 2) fieldErrors.requesterName = 'Please give the name we should use.';
  if (!EMAIL_RE.test(values.requesterEmail)) fieldErrors.requesterEmail = 'Enter a valid email address.';
  if (values.requesterPhone && !/^[+\d][\d\s-]{6,19}$/.test(values.requesterPhone)) {
    fieldErrors.requesterPhone = 'Enter a valid phone number, or leave this blank.';
  }
  if (values.summary.length < 30) {
    fieldErrors.summary = 'Please describe the matter in at least a couple of sentences so the professional can assess it.';
  }
  if (!form.get('conflictAck')) {
    fieldErrors.conflictAck = 'Please confirm you have read this before sending.';
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: 'Please correct the highlighted fields.', fieldErrors, values };
  }

  const urgency = ['normal', 'urgent', 'emergency'].includes(values.urgency)
    ? (values.urgency as 'normal' | 'urgent' | 'emergency') : 'normal';
  const mode = ['video', 'audio', 'phone', 'chat', 'in_person'].includes(values.preferredMode)
    ? values.preferredMode : 'video';

  try {
    const { reference } = createConsultationRequest({
      professionalId: professional.id,
      requesterName: values.requesterName,
      requesterEmail: values.requesterEmail,
      requesterPhone: values.requesterPhone || null,
      practiceAreaId: Number(values.practiceAreaId) || null,
      matterTypeId: Number(values.matterTypeId) || null,
      summary: values.summary,
      preferredMode: mode,
      urgency,
      conflictCheckAck: true,
    });
    revalidatePath(`/advocates/${slug}`);
    redirect(`/requests/${reference}`);
  } catch (error) {
    // `redirect` throws by design; let it through.
    if ((error as { digest?: string }).digest?.startsWith('NEXT_REDIRECT')) throw error;
    const code = (error as Error).message;
    return {
      ok: false,
      values,
      message: code === 'PROFESSIONAL_NOT_AVAILABLE'
        ? 'That profile is no longer available.'
        : 'We could not send the request. Nothing has been submitted — please try again.',
    };
  }
}

// --------------------------------------------------------------------- claim
export async function submitClaim(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const slug = str(form, 'slug', 120);
  const values = keep(form, ['contactEmail', 'contactPhone', 'enrolmentNumber', 'statement'] as const);
  const fieldErrors: Record<string, string> = {};

  const professional = getProfessionalBySlug(slug);
  if (!professional) return { ok: false, message: 'That profile is no longer available.', values };

  if (!EMAIL_RE.test(values.contactEmail)) fieldErrors.contactEmail = 'Enter a valid email address.';
  if (values.contactPhone && !/^[+\d][\d\s-]{6,19}$/.test(values.contactPhone)) {
    fieldErrors.contactPhone = 'Enter a valid phone number, or leave this blank.';
  }
  if (values.statement.length < 20) {
    fieldErrors.statement = 'Please tell us briefly how we can confirm this is you.';
  }
  if (!form.get('declaration')) {
    fieldErrors.declaration = 'You must confirm the declaration to submit a claim.';
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: 'Please correct the highlighted fields.', fieldErrors, values };
  }

  try {
    const result = createClaim({
      professionalId: professional.id,
      userId: null,
      contactEmail: values.contactEmail,
      contactPhone: values.contactPhone || null,
      claimedEnrolmentNumber: values.enrolmentNumber || null,
      statement: values.statement,
    });
    revalidatePath(`/advocates/${slug}`);
    redirect(`/advocates/${slug}/claim?submitted=1&score=${result.matchScore}&status=${result.status}`);
  } catch (error) {
    if ((error as { digest?: string }).digest?.startsWith('NEXT_REDIRECT')) throw error;
    const code = (error as Error).message;
    return {
      ok: false,
      values,
      message: code === 'ALREADY_CLAIMED'
        ? 'This profile has already been claimed. If you believe that is wrong, please use the correction form.'
        : 'We could not submit the claim. Please try again.',
    };
  }
}

// -------------------------------------------------------------- data request
export async function submitDataRequest(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const values = keep(form, ['kind', 'requesterName', 'requesterEmail', 'requesterRelation', 'detail', 'profile'] as const);
  const fieldErrors: Record<string, string> = {};

  const KINDS = ['correction', 'erasure', 'opt_out_listing', 'access', 'export', 'contact_removal', 'grievance'];
  if (!KINDS.includes(values.kind)) fieldErrors.kind = 'Choose what you would like us to do.';
  if (values.requesterName.length < 2) fieldErrors.requesterName = 'Please give your name.';
  if (!EMAIL_RE.test(values.requesterEmail)) fieldErrors.requesterEmail = 'Enter a valid email address.';
  if (values.detail.length < 20) fieldErrors.detail = 'Please give us enough detail to act on this.';
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: 'Please correct the highlighted fields.', fieldErrors, values };
  }

  const professional = values.profile ? getProfessionalBySlug(values.profile) : null;

  try {
    createDataRequest({
      professionalId: professional?.id ?? null,
      kind: values.kind,
      requesterName: values.requesterName,
      requesterEmail: values.requesterEmail,
      requesterRelation: values.requesterRelation || 'self',
      detail: values.detail,
    });
    return {
      ok: true,
      message:
        'Received. We log every request with a 30-day response clock and will reply to the address you gave. '
        + 'If you asked for removal, the listing is withheld from public pages while we verify the request.',
    };
  } catch {
    return { ok: false, values, message: 'We could not record that request. Please try again.' };
  }
}
