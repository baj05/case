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
  getProfessionalBySlug, createBooking, getBooking, setBookingStatus,
  saveIntakeSession,
  createUser, authenticate, createSession, deleteSession, AuthError,
  createReview, editReview, withdrawReview, respondToReview, voteHelpful, reportReview, moderateReview,
  createOrganisationReview, getOrganisationBySlug, submitSiteFeedback, getReviewSubjectPath,
} from '@lexhall/db';
import { setSessionCookie, clearSessionCookie, sessionCookieValue, currentUser } from '@/lib/auth';

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
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: 'Please correct the highlighted fields.', fieldErrors, values };
  }

  try {
    const booking = createBooking({
      professionalId: professional.id,
      feeScheduleId: Number(values.feeScheduleId) || null,
      clientName: values.clientName,
      clientEmail: values.clientEmail,
      clientPhone: values.clientPhone || null,
      startsAtUtc: values.startsAtUtc,
      endsAtUtc: values.endsAtUtc,
      clientTimezone: values.clientTimezone || 'Asia/Kolkata',
      mode: values.mode || 'video',
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
    return { ok: false, values, message: 'We could not complete the booking. Nothing has been charged or reserved — please try again.' };
  }
}

/** Client-side cancellation of their own booking, keyed on the reference. */
export async function cancelBooking(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const reference = str(form, 'reference', 40);
  const email = str(form, 'email', 200);
  const reason = str(form, 'reason', 500);

  const booking = getBooking(reference);
  if (!booking) return { ok: false, message: 'We could not find that booking.' };
  // Ownership check: the email on the booking must match. Weak without
  // accounts, but it is a real check rather than a hidden field.
  if (String(booking.client_email).toLowerCase() !== email.toLowerCase()) {
    return { ok: false, message: 'That email does not match the booking. Please use the address you booked with.' };
  }
  const done = setBookingStatus(reference, 'cancelled_by_client', reason || 'Cancelled by the client.', 'client');
  if (!done) return { ok: false, message: 'That booking can no longer be cancelled.' };
  revalidatePath(`/bookings/${reference}`);
  return { ok: true, message: 'Your booking has been cancelled and the slot released.' };
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
  redirect(values.next || '/dashboard');
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
  redirect(values.next || '/dashboard');
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
  const displayMode = (str(form, 'displayMode') || 'attributed') as 'attributed' | 'pseudonymous' | 'anonymous';
  const reviewerType = (str(form, 'reviewerType') || 'client') as never;
  const wouldRecommend = (str(form, 'wouldRecommend') || undefined) as 'yes' | 'no' | 'maybe' | undefined;
  const body = str(form, 'body', 4000);
  const rating = (key: string) => { const n = Number(form.get(key)); return n >= 1 && n <= 5 ? n : undefined; };

  const professional = getProfessionalBySlug(slug);
  if (!professional) return { ok: false, message: 'That profile is no longer available.' };
  if (body.trim().length < 15) return { ok: false, message: 'Please write a little more about your experience (at least 15 characters).' };

  try {
    createReview({
      professionalId: professional.id, authorUserId: user.id,
      bookingId, consultationRequestId, displayMode, reviewerType,
      ratings: {
        communication: rating('communication'), responsiveness: rating('responsiveness'),
        professionalism: rating('professionalism'), processClarity: rating('processClarity'),
        overallSatisfaction: rating('overallSatisfaction'),
      },
      wouldRecommend, body,
    });
  } catch (error) {
    const code = (error as Error).message;
    if (code === 'REVIEW_REQUIRES_EXACTLY_ONE_INTERACTION' || code === 'INELIGIBLE_INTERACTION') {
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
  const basePath = str(form, 'basePath', 20) as '/firms' | '/lpo';
  const displayMode = (str(form, 'displayMode') || 'attributed') as 'attributed' | 'pseudonymous' | 'anonymous';
  const reviewerType = (str(form, 'reviewerType') || 'corporate_legal_team') as never;
  const experienceCategory = (str(form, 'experienceCategory') || 'legal_matter') as never;
  const wouldRecommend = (str(form, 'wouldRecommend') || undefined) as 'yes' | 'no' | 'maybe' | undefined;
  const body = str(form, 'body', 4000);
  const rating = (key: string) => { const n = Number(form.get(key)); return n >= 1 && n <= 5 ? n : undefined; };

  const org = getOrganisationBySlug(slug);
  if (!org) return { ok: false, message: 'That organisation is no longer available.' };
  if (body.trim().length < 15) return { ok: false, message: 'Please write a little more about your experience (at least 15 characters).' };

  try {
    createOrganisationReview({
      organisationId: org.id, authorUserId: user.id, displayMode, reviewerType, experienceCategory,
      ratings: {
        communication: rating('communication'), responsiveness: rating('responsiveness'),
        professionalism: rating('professionalism'), processClarity: rating('processClarity'),
        overallSatisfaction: rating('overallSatisfaction'),
      },
      wouldRecommend, body,
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
  const slug = str(form, 'slug', 120);
  const body = str(form, 'body', 2000);
  if (body.trim().length < 5) return { ok: false, message: 'Write a short response.' };
  respondToReview(reviewId, user.id, body);
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
  const reviewId = Number(form.get('reviewId'));
  const slug = str(form, 'slug', 120);
  const reason = str(form, 'reason', 60) || 'other';
  const detail = str(form, 'detail', 1000);
  if (detail.trim().length < 5) return { ok: false, message: 'Tell us briefly what the issue is.' };
  reportReview(reviewId, { reporterUserId: user?.id, reason, detail });
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

// -------------------------------------------------------------- site feedback
/** "Rate CaseADVO" — deliberately independent of submitReviewAction/
 * submitOrganisationReviewAction. Never mixes into the advocate/firm/LPO
 * review dataset. Open to signed-out visitors, unlike a professional review. */
export async function submitSiteFeedbackAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const user = await currentUser();
  const displayMode = (str(form, 'displayMode') || 'anonymous') as 'attributed' | 'anonymous';
  const rating = (key: string) => { const n = Number(form.get(key)); return n >= 1 && n <= 5 ? n : undefined; };
  const recommendRaw = form.get('recommendScore');
  const recommendScore = recommendRaw != null && recommendRaw !== '' ? Number(recommendRaw) : undefined;
  const improvementArea = (str(form, 'improvementArea') || undefined) as never;
  const comment = str(form, 'comment', 2000);

  submitSiteFeedback({
    authorUserId: displayMode === 'attributed' ? user?.id : undefined,
    displayMode,
    ratings: {
      website: rating('website'), search: rating('search'), discovery: rating('discovery'),
      booking: rating('booking'), resources: rating('resources'), speed: rating('speed'), design: rating('design'),
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
