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
  getProfessionalBySlug, createBooking, getBooking, setBookingStatus, BookingRejectedError,
  saveIntakeSession,
  createUser, authenticate, createSession, deleteSession, AuthError,
  createReview, editReview, withdrawReview, respondToReview, isAuthorizedToRespond, voteHelpful, reportReview, moderateReview, deleteReview, normaliseHandle,
  createOrganisationReview, getOrganisationBySlug, REVIEWABLE_ORG_KINDS, submitSiteFeedback, getReviewSubjectPath,
  createCorporateOrganisation, createOrgInvite, revokeInvite, setMemberRole, removeMember,
  acceptInvite, peekInvite, INVITABLE_ROLES, listOrgsForUser,
} from '@lexhall/db';
import type { OrgRole } from '@lexhall/db';
import { setSessionCookie, clearSessionCookie, sessionCookieValue, currentUser } from '@/lib/auth';
import { orgActionContext, can } from '@/lib/org';
import { sessionOwnsBooking } from '@/lib/booking-entitlement';
import { getFlags } from '@/lib/data';
import { resolveMeetingPlace } from '@lexhall/core';

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

/** A 1-5 star rating field, or undefined if absent/out of range — shared so
 * the three review-submission actions can't drift on what counts as valid. */
function rating(form: FormData, key: string): number | undefined {
  const n = Number(form.get(key));
  return n >= 1 && n <= 5 ? n : undefined;
}

/**
 * A form field restricted to a known set of values, or a fallback.
 *
 * Several fields here used to be read with `str(form, key) as SomeUnion` —
 * a cast, not a check, so a POST could send `basePath=https://evil.example`
 * or `reviewerType=` anything at all and it sailed straight through to
 * `redirect()`/`revalidatePath()`/a repository call as if it had been
 * validated. `as never` is worse still: it defeats the type checker
 * entirely rather than merely asserting a specific shape. This is the one
 * place that actually checks.
 */
function oneOf<const T extends readonly string[]>(form: FormData, key: string, allowed: T, fallback: T[number]): T[number] {
  const raw = str(form, key, 40);
  return (allowed as readonly string[]).includes(raw) ? (raw as T[number]) : fallback;
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

/**
 * A `next` destination this server may redirect to after sign-in, or the
 * given fallback.
 *
 * `values.next` comes straight from a form field an attacker fully
 * controls — `?next=https://evil.example` or the protocol-relative
 * `//evil.example` sail through a bare `redirect(values.next || fallback)`
 * unchanged, sending a user who just typed their password to a page of the
 * attacker's choosing. A destination is safe only when it is a single
 * leading slash not followed by a second slash or a backslash — both of
 * those are read as "go to another host" by a browser even though they
 * pass a naive `startsWith('/')` check.
 */
function safeNext(next: string | undefined, fallback: string): string {
  if (next && /^\/(?!\/|\\)/.test(next)) return next;
  return fallback;
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

// ------------------------------------------------------------------- booking
/**
 * Confirm a booking. Re-validates everything server-side: the professional must
 * still be accepting, the slot must still be free, and the quote is recomputed
 * from the fee schedule rather than trusted from the form.
 */
export async function submitBooking(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const slug = str(form, 'slug', 120);
  const values = keep(form, [
    'clientName', 'clientEmail', 'clientPhone', 'startsAtUtc', 'endsAtUtc',
    'mode', 'feeScheduleId', 'practiceAreaId', 'matterTypeId', 'brief', 'urgency', 'clientTimezone',
    'meetingKind', 'meetingAddress',
  ] as const);
  const fieldErrors: Record<string, string> = {};

  const professional = getProfessionalBySlug(slug);
  if (!professional) return { ok: false, message: 'That profile is no longer available.', values };
  if (!professional.acceptsConsultations) {
    return { ok: false, message: 'This professional is no longer accepting bookings.', values };
  }

  if (values.clientName.length < 2) fieldErrors.clientName = 'Please give the name for the appointment.';
  if (!EMAIL_RE.test(values.clientEmail)) fieldErrors.clientEmail = 'Enter a valid email address.';
  if (values.clientPhone && !/^[+\d][\d\s-]{6,19}$/.test(values.clientPhone)) {
    fieldErrors.clientPhone = 'Enter a valid phone number, or leave this blank.';
  }
  if (values.brief.length < 30) fieldErrors.brief = 'Please describe the matter in a couple of sentences.';
  if (!values.startsAtUtc || !values.endsAtUtc) fieldErrors.startsAtUtc = 'Choose a time slot.';
  if (!form.get('feeAck')) fieldErrors.feeAck = 'Please confirm you have read the fee note.';

  /*
   * WHERE, for an in-person booking. Resolved by the same `resolveMeetingPlace`
   * the form uses, so the client and the server cannot disagree about what
   * counts as a valid place — and so a mode switched to video after an address
   * was typed drops that address instead of storing it.
   */
  const place = resolveMeetingPlace({ mode: values.mode || 'video', kind: values.meetingKind, address: values.meetingAddress });
  Object.assign(fieldErrors, place.errors);

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: 'Please correct the highlighted fields.', fieldErrors, values };
  }

  /*
   * Attribution is derived here, from the session and from the org slug in
   * the form — and the org is then re-checked against the signed-in user's
   * real memberships. A submitted `orgSlug` alone proves nothing: without
   * that check, anyone could file a booking into any company's account by
   * editing one field.
   */
  const user = await currentUser();
  const orgSlug = str(form, 'orgSlug', 120);
  let organisationId: number | null = null;
  if (user && orgSlug) {
    const membership = listOrgsForUser(user.id)
      .find((m) => m.slug === orgSlug && can(m.role, 'booking.create'));
    organisationId = membership?.organisationId ?? null;
  }

  try {
    const booking = createBooking({
      professionalId: professional.id,
      clientUserId: user?.id ?? null,
      organisationId,
      feeScheduleId: Number(values.feeScheduleId) || null,
      clientName: values.clientName,
      clientEmail: values.clientEmail,
      clientPhone: values.clientPhone || null,
      startsAtUtc: values.startsAtUtc,
      endsAtUtc: values.endsAtUtc,
      clientTimezone: values.clientTimezone || 'Asia/Kolkata',
      mode: values.mode || 'video',
      meetingKind: place.kind,
      meetingAddress: place.address,
      practiceAreaId: Number(values.practiceAreaId) || null,
      matterTypeId: Number(values.matterTypeId) || null,
      brief: values.brief,
      urgency: (['normal', 'urgent', 'emergency'].includes(values.urgency)
        ? values.urgency : 'normal') as 'normal' | 'urgent' | 'emergency',
      feeDisclosureAck: true,
    });
    revalidatePath(`/advocates/${slug}`);
    redirect(`/bookings/${booking.reference}`);
  } catch (error) {
    if ((error as { digest?: string }).digest?.startsWith('NEXT_REDIRECT')) throw error;
    const code = (error as Error).message;
    // Slot contention is the common, expected failure. Say so precisely and
    // send the user back to pick again rather than losing their brief.
    if (code === 'SLOT_TAKEN') {
      return {
        ok: false, values,
        message: 'That slot was taken while you were filling this in. Nothing has been booked — choose another time and your details will be kept.',
        fieldErrors: { startsAtUtc: 'Pick a different time.' },
      };
    }
    if (code === 'NOT_ACCEPTING') return { ok: false, values, message: 'This professional has stopped accepting bookings.' };
    // BookingRejectedError: the slot passed client-side checks but failed
    // the server's own re-derivation of what is actually bookable — a
    // tampered or stale request, not something a real user did by picking
    // from the list they were shown. One message covers every sub-code:
    // none of them is something the client should get to distinguish.
    if (error instanceof BookingRejectedError) {
      return {
        ok: false, values,
        message: 'That time is no longer available. Nothing has been booked — choose another time and your details will be kept.',
        fieldErrors: { startsAtUtc: 'Pick a different time.' },
      };
    }
    return { ok: false, values, message: 'We could not complete the booking. Nothing has been charged or reserved — please try again.' };
  }
}

/** Client-side cancellation of their own booking, keyed on the reference. */
export async function cancelBooking(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const reference = str(form, 'reference', 40);
  const email = str(form, 'email', 200);
  const reason = str(form, 'reason', 500);

  // One message for "no such reference" and "wrong email" alike — telling
  // them apart turns this action into an oracle an unauthenticated caller
  // could use to check which booking references are real.
  const CANNOT_CANCEL = { ok: false, message: 'We could not cancel that booking. Check the reference and the email you booked with.' };

  const booking = getBooking(reference);
  if (!booking) return CANNOT_CANCEL;

  /*
   * Three ways to be entitled to cancel, checked strongest first.
   *
   * The email fallback MUST STAY. Bookings can be made without an account
   * at all, and every booking made before accounts existed has a NULL
   * client_user_id. Removing it would strand all of them with no way for
   * the person who made them to cancel.
   */
  const user = await currentUser();
  let entitled = sessionOwnsBooking(booking, user);

  if (!entitled) {
    if (String(booking.client_email).toLowerCase() !== email.toLowerCase()) return CANNOT_CANCEL;
    entitled = true;
  }

  const done = setBookingStatus(reference, 'cancelled_by_client', reason || 'Cancelled by the client.', 'client');
  if (!done) return { ok: false, message: 'That booking can no longer be cancelled.' };
  revalidatePath(`/bookings/${reference}`);
  return { ok: true, message: 'Your booking has been cancelled and the slot released.' };
}

/**
 * Reveal a booking's confidential fields (the matter brief and any meeting
 * address) to an anonymous visitor who knows the email it was made with.
 *
 * The booking page never renders these fields for a request it cannot
 * attribute to a session — see lib/booking-entitlement.ts for why the
 * reference alone was not enough. This is the fallback for the no-account
 * booking flow: the email is not derivable from the reference, so knowing
 * both is a real (if modest) proof of having made the booking, unlike
 * knowing the reference on its own.
 */
export interface BookingRevealResult {
  ok: boolean;
  message?: string;
  brief?: string;
  meetingKind?: string | null;
  meetingAddress?: string | null;
}

export async function revealBookingDetailsAction(_prev: BookingRevealResult | null, form: FormData): Promise<BookingRevealResult> {
  const reference = str(form, 'reference', 40);
  const email = str(form, 'email', 200);
  const NOT_FOUND = { ok: false, message: 'We could not find that booking with that email.' };

  const booking = getBooking(reference);
  if (!booking) return NOT_FOUND;

  const user = await currentUser();
  const entitled = sessionOwnsBooking(booking, user)
    || String(booking.client_email).toLowerCase() === email.toLowerCase();
  if (!entitled) return NOT_FOUND;

  return {
    ok: true,
    brief: booking.brief,
    meetingKind: booking.meeting_kind,
    meetingAddress: booking.meeting_address,
  };
}

// ------------------------------------------------------------------------ auth
export async function signupAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const values = keep(form, ['fullName', 'email', 'password', 'next'] as const);
  const fieldErrors: Record<string, string> = {};

  if (values.fullName.length < 2) fieldErrors.fullName = 'Enter your name.';
  if (!EMAIL_RE.test(values.email)) fieldErrors.email = 'Enter a valid email address.';
  if (values.password.length < 8) fieldErrors.password = 'Use at least 8 characters.';
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: 'Please correct the highlighted fields.', fieldErrors, values };
  }

  try {
    const user = createUser({ email: values.email, fullName: values.fullName, password: values.password });
    const session = createSession(user.id);
    await setSessionCookie(session.id, session.expiresAt);
  } catch (error) {
    if (error instanceof AuthError && error.code === 'EMAIL_TAKEN') {
      return { ok: false, values, fieldErrors: { email: 'An account with this email already exists.' }, message: 'Please correct the highlighted fields.' };
    }
    return { ok: false, values, message: 'We could not create your account. Please try again.' };
  }
  redirect(safeNext(values.next, '/dashboard'));
}

export async function loginAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const values = keep(form, ['email', 'password', 'next'] as const);
  try {
    const user = authenticate(values.email, values.password);
    const session = createSession(user.id);
    await setSessionCookie(session.id, session.expiresAt);
  } catch (error) {
    if (error instanceof AuthError && error.code === 'ACCOUNT_LOCKED') {
      return { ok: false, values, message: 'Too many failed attempts. Try again in 15 minutes.' };
    }
    return { ok: false, values, message: 'Incorrect email or password.' };
  }
  redirect(safeNext(values.next, '/dashboard'));
}

export async function logoutAction(): Promise<void> {
  const sessionId = await sessionCookieValue();
  if (sessionId) deleteSession(sessionId);
  await clearSessionCookie();
  redirect('/');
}

// ---------------------------------------------------------------------- reviews
/** Every review action re-derives the author from the session cookie — never
 * from a hidden form field — so a signed-out or wrong-account request cannot
 * submit, edit or vote as someone else. */
export async function submitReviewAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const user = await currentUser();
  if (!user) return { ok: false, message: 'Please sign in to leave a review.' };

  const slug = str(form, 'slug', 120);
  const bookingId = Number(form.get('bookingId')) || undefined;
  const consultationRequestId = Number(form.get('consultationRequestId')) || undefined;
  const displayMode = oneOf(form, 'displayMode', ['attributed', 'pseudonymous', 'anonymous'] as const, 'attributed');
  const reviewerType = oneOf(form, 'reviewerType', ['client', 'former_client', 'current_client', 'lawyer', 'referring_lawyer', 'corporate_legal_team', 'vendor', 'other'] as const, 'client');
  const wouldRecommendRaw = str(form, 'wouldRecommend');
  const wouldRecommend = wouldRecommendRaw ? oneOf(form, 'wouldRecommend', ['yes', 'no', 'maybe'] as const, 'maybe') : undefined;
  const body = str(form, 'body', 4000);
  // Not str() — a data-URL avatar can run to ~150k chars, and str() trims to
  // a 2000-char default meant for text fields. createReview re-validates
  // the exact shape server-side regardless (sanitizeAvatarUrl).
  const avatarUrlRaw = form.get('avatarUrl');
  const avatarUrl = typeof avatarUrlRaw === 'string' && avatarUrlRaw.length > 0 ? avatarUrlRaw : undefined;
  const handleRaw = str(form, 'handle', 24);
  let handle: string | null;
  try {
    handle = normaliseHandle(handleRaw);
  } catch {
    return { ok: false, message: 'Please correct the highlighted field.', fieldErrors: { handle: 'Usernames are 3–20 characters: letters, numbers and underscores only.' } };
  }

  const professional = getProfessionalBySlug(slug);
  if (!professional) return { ok: false, message: 'That profile is no longer available.' };
  if (body.trim().length < 15) return { ok: false, message: 'Please write a little more about your experience (at least 15 characters).' };

  try {
    createReview({
      professionalId: professional.id, authorUserId: user.id,
      bookingId, consultationRequestId, displayMode, reviewerType,
      ratings: {
        communication: rating(form, 'communication'), responsiveness: rating(form, 'responsiveness'),
        professionalism: rating(form, 'professionalism'), processClarity: rating(form, 'processClarity'),
        overallSatisfaction: rating(form, 'overallSatisfaction'),
      },
      wouldRecommend, body, avatarUrl, handle,
    });
  } catch (error) {
    const code = (error as Error).message;
    if (code === 'REVIEW_REQUIRES_AT_MOST_ONE_INTERACTION' || code === 'INELIGIBLE_INTERACTION') {
      return { ok: false, message: 'We could not verify a completed experience with this professional to review.' };
    }
    return { ok: false, message: 'You have already reviewed this experience.' };
  }
  revalidatePath(`/advocates/${slug}`);
  redirect(`/advocates/${slug}?reviewed=1`);
}

export async function submitOrganisationReviewAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const user = await currentUser();
  if (!user) return { ok: false, message: 'Please sign in to leave a review.' };

  const slug = str(form, 'slug', 120);
  // basePath used to be an unvalidated cast fed straight into redirect() —
  // a POST could send an absolute URL and be sent off-site after review. Now checked.
  const basePath = oneOf(form, 'basePath', ['/firms', '/lpo'] as const, '/firms');
  const displayMode = oneOf(form, 'displayMode', ['attributed', 'pseudonymous', 'anonymous'] as const, 'attributed');
  const reviewerType = oneOf(form, 'reviewerType', ['client', 'former_client', 'current_client', 'lawyer', 'referring_lawyer', 'corporate_legal_team', 'vendor', 'other'] as const, 'corporate_legal_team');
  const experienceCategory = oneOf(form, 'experienceCategory', ['consultation', 'booking', 'appointment', 'legal_matter'] as const, 'legal_matter');
  const wouldRecommendRaw = str(form, 'wouldRecommend');
  const wouldRecommend = wouldRecommendRaw ? oneOf(form, 'wouldRecommend', ['yes', 'no', 'maybe'] as const, 'maybe') : undefined;
  const body = str(form, 'body', 4000);
  const avatarUrlRaw = form.get('avatarUrl');
  const avatarUrl = typeof avatarUrlRaw === 'string' && avatarUrlRaw.length > 0 ? avatarUrlRaw : undefined;
  const handleRaw = str(form, 'handle', 24);
  let handle: string | null;
  try {
    handle = normaliseHandle(handleRaw);
  } catch {
    return { ok: false, message: 'Please correct the highlighted field.', fieldErrors: { handle: 'Usernames are 3–20 characters: letters, numbers and underscores only.' } };
  }

  // Restricted to reviewable kinds: slugs share one namespace across every
  // organisation kind, and a Server Action is invocable directly without the
  // page ever rendering — so the notFound() guards on the review PAGES do not
  // protect this path. Without the filter a POST naming a corporate tenant's
  // slug would create a public review of a private client company.
  const org = getOrganisationBySlug(slug, REVIEWABLE_ORG_KINDS);
  if (!org) return { ok: false, message: 'That organisation is no longer available.' };
  if (body.trim().length < 15) return { ok: false, message: 'Please write a little more about your experience (at least 15 characters).' };

  try {
    createOrganisationReview({
      organisationId: org.id, authorUserId: user.id, displayMode, reviewerType, experienceCategory,
      ratings: {
        communication: rating(form, 'communication'), responsiveness: rating(form, 'responsiveness'),
        professionalism: rating(form, 'professionalism'), processClarity: rating(form, 'processClarity'),
        overallSatisfaction: rating(form, 'overallSatisfaction'),
      },
      wouldRecommend, body, avatarUrl, handle,
    });
  } catch (error) {
    if ((error as Error).message === 'ALREADY_REVIEWED') {
      return { ok: false, message: 'You have already reviewed this organisation.' };
    }
    return { ok: false, message: 'We could not submit your review. Please try again.' };
  }
  revalidatePath(`${basePath}/${slug}`);
  redirect(`${basePath}/${slug}?reviewed=1`);
}

/** Resolves from the review row itself which page to revalidate — a review
 * can belong to an advocate, a firm or an LPO, and trusting a client-
 * supplied slug/basePath here would revalidate the wrong (or a fabricated)
 * path. Falls back to the advocate route with the caller's slug only if
 * the review can't be resolved (e.g. it no longer exists). */
function revalidateReviewSubject(reviewId: number, fallbackSlug: string): void {
  const resolved = getReviewSubjectPath(reviewId);
  revalidatePath(resolved ? `${resolved.basePath}/${resolved.slug}` : `/advocates/${fallbackSlug}`);
}

export async function editReviewAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const user = await currentUser();
  if (!user) return { ok: false, message: 'Please sign in.' };
  const reviewId = Number(form.get('reviewId'));
  const slug = str(form, 'slug', 120);
  const body = str(form, 'body', 4000);
  if (body.trim().length < 15) return { ok: false, message: 'Please write a little more about your experience.' };
  try {
    editReview(reviewId, user.id, { body });
  } catch {
    return { ok: false, message: 'We could not update that review.' };
  }
  revalidateReviewSubject(reviewId, slug);
  return { ok: true, message: 'Your review has been updated and will be re-moderated before it republishes.' };
}

export async function withdrawReviewAction(form: FormData): Promise<void> {
  const user = await currentUser();
  const reviewId = Number(form.get('reviewId'));
  const slug = str(form, 'slug', 120);
  if (user) withdrawReview(reviewId, user.id);
  revalidateReviewSubject(reviewId, slug);
}

export async function respondToReviewAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const user = await currentUser();
  if (!user) return { ok: false, message: 'Please sign in as the professional to respond.' };
  const reviewId = Number(form.get('reviewId'));
  // No platform_admin bypass. isAuthorizedToRespond checks that this user IS
  // the claimed professional, or a member of the reviewed organisation —
  // an admin posting AS one of them, with nothing to say the real
  // professional ever saw or approved the wording, is not the same act as
  // moderating content and does not belong on this path.
  if (!isAuthorizedToRespond(reviewId, user.id)) {
    return { ok: false, message: 'Only the reviewed professional or organisation can respond.' };
  }
  const slug = str(form, 'slug', 120);
  const body = str(form, 'body', 2000);
  if (body.trim().length < 5) return { ok: false, message: 'Write a short response.' };
  try {
    respondToReview(reviewId, user.id, body);
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === 'RESPONSE_ALREADY_PENDING') {
      return { ok: false, message: 'You already have a response awaiting moderation on this review.' };
    }
    return { ok: false, message: 'That review could not be found.' };
  }
  revalidateReviewSubject(reviewId, slug);
  return { ok: true, message: 'Your response has been submitted for moderation.' };
}

export async function voteReviewHelpfulAction(form: FormData): Promise<void> {
  const user = await currentUser();
  if (!user) return;
  const reviewId = Number(form.get('reviewId'));
  const vote = Number(form.get('vote')) === -1 ? -1 : 1;
  const slug = str(form, 'slug', 120);
  voteHelpful(reviewId, user.id, vote);
  revalidateReviewSubject(reviewId, slug);
}

export async function reportReviewAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const user = await currentUser();
  if (!user) return { ok: false, message: 'Please sign in to report a review.' };
  const reviewId = Number(form.get('reviewId'));
  const slug = str(form, 'slug', 120);
  const reason = str(form, 'reason', 60) || 'other';
  const detail = str(form, 'detail', 1000);
  if (detail.trim().length < 5) return { ok: false, message: 'Tell us briefly what the issue is.' };
  try {
    reportReview(reviewId, { reporterUserId: user.id, reason, detail });
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === 'ALREADY_REPORTED') return { ok: false, message: 'You have already reported this review.' };
    return { ok: false, message: 'That review could not be found.' };
  }
  revalidateReviewSubject(reviewId, slug);
  return { ok: true, message: 'Thank you — this review has been sent for moderation review.' };
}

export async function moderateReviewAction(form: FormData): Promise<void> {
  const user = await currentUser();
  if (!user || user.platformRole !== 'platform_admin') return;
  const reviewId = Number(form.get('reviewId'));
  const decision = str(form, 'decision') as 'published' | 'rejected' | 'in_review';
  const note = str(form, 'note', 500);
  moderateReview(reviewId, user.id, decision, note || undefined);
  revalidatePath('/admin/reviews');
}

/** Hard-removes a review — reserved for upheld reports, not routine
 * moderation (that's moderateReviewAction's 'rejected' decision). Also
 * revalidates the review's own subject page so the removal is immediate,
 * not just in the admin queue. */
export async function deleteReviewAction(form: FormData): Promise<void> {
  const user = await currentUser();
  if (!user || user.platformRole !== 'platform_admin') return;
  const reviewId = Number(form.get('reviewId'));
  const note = str(form, 'note', 500);
  const path = getReviewSubjectPath(reviewId);
  deleteReview(reviewId, user.id, note || undefined);
  revalidatePath('/admin/reviews');
  revalidatePath('/reviews');
  if (path) revalidatePath(`${path.basePath}/${path.slug}`);
}

// -------------------------------------------------------------- site feedback
/** "Rate CaseADVO" — deliberately independent of submitReviewAction/
 * submitOrganisationReviewAction. Never mixes into the advocate/firm/LPO
 * review dataset. Open to signed-out visitors, unlike a professional review. */
export async function submitSiteFeedbackAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const user = await currentUser();
  const displayMode = oneOf(form, 'displayMode', ['attributed', 'anonymous'] as const, 'anonymous');
  const recommendRaw = form.get('recommendScore');
  const recommendScore = recommendRaw != null && recommendRaw !== '' ? Number(recommendRaw) : undefined;
  const improvementArea = (str(form, 'improvementArea') || undefined) as never;
  const comment = str(form, 'comment', 2000);

  submitSiteFeedback({
    authorUserId: displayMode === 'attributed' ? user?.id : undefined,
    displayMode,
    ratings: {
      website: rating(form, 'website'), search: rating(form, 'search'), discovery: rating(form, 'discovery'),
      booking: rating(form, 'booking'), resources: rating(form, 'resources'), speed: rating(form, 'speed'), design: rating(form, 'design'),
    },
    recommendScore, improvementArea, comment,
  });
  return { ok: true, message: 'Thank you — your feedback helps us make CaseADVO better.' };
}

// ------------------------------------------------------------------- advo ai
/** Persist a routed Advo AI session so routing accuracy can be audited. */
export async function recordAdvoSession(facts: unknown, transcript: unknown, resultCount: number): Promise<string> {
  try {
    return saveIntakeSession({
      facts: facts as never,
      transcript: transcript as never,
      resultCount,
    });
  } catch {
    return '';
  }
}

// -------------------------------------------------------------------- corporate
/**
 * Corporate tenant actions.
 *
 * Every one of these derives the actor from the session cookie and the
 * organisation from the submitted slug, then checks the pair through
 * `orgActionContext`. None of them trusts an organisation id from the form:
 * a hidden `organisationId` field would let anyone act on any tenant by
 * editing it, and these actions are addressable directly whether or not the
 * page that renders them was ever loaded.
 *
 * `platform_role` stays 'public' throughout. An org role is tenant-scoped by
 * design and has nothing to say about platform privileges; repurposing
 * 'professional' to mean "belongs to a company" would conflate the two.
 */
export async function createOrganisationAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  // Creation has no existing membership for orgActionContext to gate, so the
  // flag is checked directly — otherwise, with FEATURE_CORPORATE off, a
  // direct POST here still created a real tenant for a feature every page
  // reports as not existing.
  if (!getFlags().FEATURE_CORPORATE) return { ok: false, message: 'This feature is not available.' };
  const user = await currentUser();
  if (!user) return { ok: false, message: 'Please sign in first.' };

  const values = keep(form, ['name', 'billingEmail'] as const);
  const fieldErrors: Record<string, string> = {};
  if (values.name.length < 2) fieldErrors.name = 'Enter the company name.';
  if (values.billingEmail && !EMAIL_RE.test(values.billingEmail)) {
    fieldErrors.billingEmail = 'Enter a valid email address, or leave this blank.';
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: 'Please correct the highlighted fields.', fieldErrors, values };
  }

  let slug: string;
  try {
    const org = createCorporateOrganisation({
      name: values.name,
      ownerUserId: user.id,
      billingEmail: values.billingEmail || null,
    });
    slug = org.slug;
  } catch (error) {
    if ((error as { digest?: string }).digest?.startsWith('NEXT_REDIRECT')) throw error;
    return { ok: false, values, message: 'We could not create the account. Please try again.' };
  }
  redirect(`/corporate/o/${slug}`);
}

/** Sign up and create the company in one step, for someone with no account. */
export async function corporateSignupAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  if (!getFlags().FEATURE_CORPORATE) return { ok: false, message: 'This feature is not available.' };
  const values = keep(form, ['fullName', 'email', 'password', 'companyName'] as const);
  const fieldErrors: Record<string, string> = {};
  if (values.fullName.length < 2) fieldErrors.fullName = 'Enter your name.';
  if (!EMAIL_RE.test(values.email)) fieldErrors.email = 'Enter a valid email address.';
  if (values.password.length < 8) fieldErrors.password = 'Use at least 8 characters.';
  if (values.companyName.length < 2) fieldErrors.companyName = 'Enter the company name.';
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: 'Please correct the highlighted fields.', fieldErrors, values };
  }

  let slug: string;
  try {
    const user = createUser({ email: values.email, fullName: values.fullName, password: values.password });
    const session = createSession(user.id);
    await setSessionCookie(session.id, session.expiresAt);
    slug = createCorporateOrganisation({ name: values.companyName, ownerUserId: user.id }).slug;
  } catch (error) {
    if ((error as { digest?: string }).digest?.startsWith('NEXT_REDIRECT')) throw error;
    if (error instanceof AuthError && error.code === 'EMAIL_TAKEN') {
      return {
        ok: false, values, message: 'Please correct the highlighted fields.',
        fieldErrors: { email: 'An account with this email already exists. Sign in, then create the company.' },
      };
    }
    return { ok: false, values, message: 'We could not create the account. Please try again.' };
  }
  redirect(`/corporate/o/${slug}`);
}

export async function inviteMemberAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const slug = str(form, 'slug', 120);
  const values = keep(form, ['email', 'role'] as const);

  const gate = await orgActionContext(slug, 'member.invite');
  if ('error' in gate) return { ...gate.error, values };

  if (!EMAIL_RE.test(values.email)) {
    return { ok: false, values, message: 'Please correct the highlighted fields.', fieldErrors: { email: 'Enter a valid email address.' } };
  }
  if (!(INVITABLE_ROLES as readonly string[]).includes(values.role)) {
    return { ok: false, values, message: 'Please correct the highlighted fields.', fieldErrors: { role: 'Choose a role.' } };
  }

  const user = await currentUser();
  if (!user) return { ok: false, message: 'Please sign in first.' };

  try {
    const invite = createOrgInvite({
      orgId: gate.ctx.membership.organisationId,
      email: values.email,
      role: values.role as OrgRole,
      actorUserId: user.id,
      seatLimit: gate.ctx.entitlements.seatLimit,
    });
    revalidatePath(`/corporate/o/${slug}/team`);
    // There is no mailer in this build, so the link is surfaced here for the
    // inviter to pass on. This is the ONLY moment the raw token exists —
    // only its hash is stored, so it cannot be shown again later.
    return {
      ok: true,
      message: `Invitation created. Send this link to ${values.email} — it will not be shown again: /corporate/join/${invite.token}`,
    };
  } catch (error) {
    if ((error as { digest?: string }).digest?.startsWith('NEXT_REDIRECT')) throw error;
    const code = (error as { code?: string }).code;
    if (code === 'SEAT_LIMIT') return { ok: false, values, message: `This account is limited to ${gate.ctx.entitlements.seatLimit} seats, including open invitations.` };
    if (code === 'ALREADY_A_MEMBER') return { ok: false, values, message: 'That person is already in this account.' };
    if (code === 'INVITE_ALREADY_OPEN') return { ok: false, values, message: 'There is already an open invitation for that address.' };
    return { ok: false, values, message: 'We could not create the invitation. Please try again.' };
  }
}

export async function revokeInviteAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const slug = str(form, 'slug', 120);
  const inviteId = Number(form.get('inviteId'));

  const gate = await orgActionContext(slug, 'member.invite');
  if ('error' in gate) return gate.error;

  const user = await currentUser();
  if (!user) return { ok: false, message: 'Please sign in first.' };

  try {
    revokeInvite({ orgId: gate.ctx.membership.organisationId, inviteId, actorUserId: user.id });
  } catch (error) {
    if ((error as { digest?: string }).digest?.startsWith('NEXT_REDIRECT')) throw error;
    return { ok: false, message: 'That invitation is no longer open.' };
  }
  revalidatePath(`/corporate/o/${slug}/team`);
  return { ok: true, message: 'Invitation revoked.' };
}

export async function setMemberRoleAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const slug = str(form, 'slug', 120);
  const targetUserId = Number(form.get('targetUserId'));
  const role = str(form, 'role', 20);

  const gate = await orgActionContext(slug, 'member.manage');
  if ('error' in gate) return gate.error;

  const user = await currentUser();
  if (!user) return { ok: false, message: 'Please sign in first.' };

  try {
    setMemberRole({
      orgId: gate.ctx.membership.organisationId,
      targetUserId, role: role as OrgRole, actorUserId: user.id,
    });
  } catch (error) {
    if ((error as { digest?: string }).digest?.startsWith('NEXT_REDIRECT')) throw error;
    const code = (error as { code?: string }).code;
    if (code === 'LAST_OWNER') return { ok: false, message: 'This account must keep at least one owner. Make someone else an owner first.' };
    if (code === 'OWNER_ONLY') return { ok: false, message: 'Only an owner can change another owner’s role, or grant ownership.' };
    if (code === 'INVALID_ROLE') return { ok: false, message: 'That is not a valid role.' };
    if (code === 'NOT_A_MEMBER') return { ok: false, message: 'That person is not in this account.' };
    return { ok: false, message: 'We could not change that role. Please try again.' };
  }
  revalidatePath(`/corporate/o/${slug}/team`);
  return { ok: true, message: 'Role updated.' };
}

export async function removeMemberAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const slug = str(form, 'slug', 120);
  const targetUserId = Number(form.get('targetUserId'));

  const gate = await orgActionContext(slug, 'member.manage');
  if ('error' in gate) return gate.error;

  const user = await currentUser();
  if (!user) return { ok: false, message: 'Please sign in first.' };

  try {
    removeMember({ orgId: gate.ctx.membership.organisationId, targetUserId, actorUserId: user.id });
  } catch (error) {
    if ((error as { digest?: string }).digest?.startsWith('NEXT_REDIRECT')) throw error;
    const code = (error as { code?: string }).code;
    if (code === 'LAST_OWNER') return { ok: false, message: 'This account must keep at least one owner.' };
    if (code === 'OWNER_ONLY') return { ok: false, message: 'Only an owner can remove another owner.' };
    if (code === 'NOT_A_MEMBER') return { ok: false, message: 'That person is not in this account.' };
    return { ok: false, message: 'We could not remove that person. Please try again.' };
  }
  revalidatePath(`/corporate/o/${slug}/team`);
  return { ok: true, message: 'Removed from the account.' };
}

/** Accept an invitation as the signed-in user. */
export async function acceptInviteAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const token = str(form, 'token', 200);
  const user = await currentUser();
  if (!user) return { ok: false, message: 'Please sign in to accept this invitation.' };

  let slug: string;
  try {
    slug = acceptInvite({ token, userId: user.id }).orgSlug;
  } catch (error) {
    if ((error as { digest?: string }).digest?.startsWith('NEXT_REDIRECT')) throw error;
    // Deliberately one message for expired / revoked / already-used /
    // unknown: telling them apart helps someone guessing tokens.
    return { ok: false, message: 'This invitation is no longer valid. Ask for a new one.' };
  }
  redirect(`/corporate/o/${slug}`);
}

/** Accept an invitation by creating an account at the same time. */
export async function acceptInviteSignupAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const token = str(form, 'token', 200);
  const values = keep(form, ['fullName', 'email', 'password'] as const);
  const fieldErrors: Record<string, string> = {};
  if (values.fullName.length < 2) fieldErrors.fullName = 'Enter your name.';
  if (!EMAIL_RE.test(values.email)) fieldErrors.email = 'Enter a valid email address.';
  if (values.password.length < 8) fieldErrors.password = 'Use at least 8 characters.';
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: 'Please correct the highlighted fields.', fieldErrors, values };
  }

  // Check the invite before creating anything, so a dead token does not
  // leave a stranded account behind.
  if (!peekInvite(token)) {
    return { ok: false, values, message: 'This invitation is no longer valid. Ask for a new one.' };
  }

  let slug: string;
  try {
    const user = createUser({ email: values.email, fullName: values.fullName, password: values.password });
    const session = createSession(user.id);
    await setSessionCookie(session.id, session.expiresAt);
    slug = acceptInvite({ token, userId: user.id }).orgSlug;
  } catch (error) {
    if ((error as { digest?: string }).digest?.startsWith('NEXT_REDIRECT')) throw error;
    if (error instanceof AuthError && error.code === 'EMAIL_TAKEN') {
      return {
        ok: false, values, message: 'Please correct the highlighted fields.',
        fieldErrors: { email: 'An account with this email already exists. Sign in, then open the invitation link again.' },
      };
    }
    return { ok: false, values, message: 'We could not complete that. Please try again.' };
  }
  redirect(`/corporate/o/${slug}`);
}
