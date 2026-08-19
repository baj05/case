/**
 * Advo AI — conversational intake and shortlisting.
 *
 * Acts as the "ultimate filter": the user describes their situation in plain
 * words, Advo AI asks the few follow-up questions that actually change the
 * answer, then hands back a ranked shortlist that can be re-sorted by fee,
 * years in practice or verification.
 *
 * DELIBERATELY NOT A LANGUAGE MODEL (ADR-006). It is a deterministic state
 * machine over the same weighted-synonym vocabulary the search bar uses. Three
 * reasons that matters here more than anywhere else in the product:
 *   * it cannot invent legal advice, and an intake bot is exactly where a
 *     hallucination would do real harm
 *   * every question it asks and every conclusion it draws is auditable, and
 *     the transcript is stored so routing accuracy can be measured
 *   * it answers in under a millisecond with no API dependency or per-turn cost
 *
 * It never answers a legal question. It decides which questions to ask, and
 * which professionals match. That boundary is enforced by design: there is no
 * free-text generation anywhere in this file.
 */
import { classifyIntake, type IntakeVocabulary, type IntakeResult } from './intake.ts';

export type TurnRole = 'advo' | 'user';

export interface Turn {
  role: TurnRole;
  text: string;
  /** Which question this turn answered, for auditability. */
  questionKey?: QuestionKey;
}

export type QuestionKey =
  | 'problem' | 'location' | 'court' | 'urgency' | 'budget'
  | 'experience' | 'mode' | 'party_role' | 'stage';

export interface CollectedFacts {
  practiceAreaId: number | null;
  practiceAreaName: string | null;
  matterTypeId: number | null;
  locationId: number | null;
  locationName: string | null;
  courtId: number | null;
  courtName: string | null;
  urgency: 'normal' | 'urgent' | 'emergency';
  /** Maximum the user is willing to pay for a first consultation, in minor units. */
  budgetMaxMinor: number | null;
  minExperienceYears: number | null;
  preferredMode: string | null;
  partyRole: string | null;
  stage: string | null;
}

export interface Question {
  key: QuestionKey;
  prompt: string;
  /** Plain-language help, because the user may not know the terminology. */
  help?: string;
  /** Tappable answers. Free text is always allowed too. */
  options: Array<{ label: string; value: string }>;
  /** Skipping is always permitted — an intake bot must not hold anyone hostage. */
  skippable: boolean;
}

export interface AdvoState {
  facts: CollectedFacts;
  transcript: Turn[];
  /** The next question, or null when we have enough to route. */
  nextQuestion: Question | null;
  /** What Advo AI believes so far, in plain language, shown back for correction. */
  understanding: string;
  /** 0..1 — how confident we are that routing now would be useful. */
  readiness: number;
  done: boolean;
}

export const EMPTY_FACTS: CollectedFacts = {
  practiceAreaId: null, practiceAreaName: null, matterTypeId: null,
  locationId: null, locationName: null, courtId: null, courtName: null,
  urgency: 'normal', budgetMaxMinor: null, minExperienceYears: null,
  preferredMode: null, partyRole: null, stage: null,
};

/** Budget bands in rupees, expressed in paise. */
const BUDGET_OPTIONS = [
  { label: 'Up to ₹1,000', value: '100000' },
  { label: 'Up to ₹2,500', value: '250000' },
  { label: 'Up to ₹5,000', value: '500000' },
  { label: 'Up to ₹10,000', value: '1000000' },
  { label: 'No limit yet', value: 'any' },
];

const EXPERIENCE_OPTIONS = [
  { label: 'Any experience', value: '0' },
  { label: '5+ years', value: '5' },
  { label: '10+ years', value: '10' },
  { label: '20+ years', value: '20' },
];

const MODE_OPTIONS = [
  { label: 'Video call', value: 'video' },
  { label: 'Phone call', value: 'phone' },
  { label: 'In person', value: 'in_person' },
  { label: 'No preference', value: 'any' },
];

const STAGE_OPTIONS = [
  { label: 'Nothing has started yet', value: 'pre_dispute' },
  { label: 'I have received a notice', value: 'notice_received' },
  { label: 'A case is already filed', value: 'filed' },
  { label: 'There is a hearing date', value: 'hearing_scheduled' },
  { label: 'Not sure', value: 'unknown' },
];

/**
 * Advance the conversation by one user message.
 *
 * `answeringKey` says which question the message is answering. When absent the
 * message is treated as a free-text description and run through the classifier,
 * which is how the very first turn works.
 */
export function advance(
  state: AdvoState,
  userText: string,
  vocab: IntakeVocabulary,
  answeringKey?: QuestionKey,
  /**
   * What to show in the transcript, when it differs from the machine value.
   * Tapping "10+ years" must send the value `10` to the engine while the
   * conversation shows the human phrase. Conflating the two silently discarded
   * every structured answer.
   */
  displayText?: string,
): AdvoState {
  const facts: CollectedFacts = { ...state.facts };
  const transcript: Turn[] = [...state.transcript, { role: 'user', text: (displayText ?? userText).slice(0, 600), questionKey: answeringKey }];

  // Structured answers first.
  if (answeringKey === 'budget') {
    facts.budgetMaxMinor = userText === 'any' ? null : Number(userText) || null;
  } else if (answeringKey === 'experience') {
    const y = Number(userText) || 0;
    facts.minExperienceYears = y > 0 ? y : null;
  } else if (answeringKey === 'mode') {
    facts.preferredMode = userText === 'any' ? null : userText;
  } else if (answeringKey === 'stage') {
    facts.stage = userText;
  } else if (answeringKey === 'urgency') {
    // An explicit answer OVERRIDES an inferred value, including downwards. The
    // user correcting us must beat our reading of their sentence, exactly as an
    // explicit search filter beats an inferred one. Free-text mentions handled
    // in applyParse only ever escalate.
    facts.urgency = (['normal', 'urgent', 'emergency'] as const).includes(userText as never)
      ? (userText as CollectedFacts['urgency']) : facts.urgency;
  }

  // Every free-text turn is re-classified and used to fill any gap. A later
  // message can supply the location even if it was asked for the court.
  if (!answeringKey || !['budget', 'experience', 'mode', 'stage', 'urgency'].includes(answeringKey)) {
    const parsed = classifyIntake(displayText ?? userText, vocab);
    applyParse(facts, parsed);
  }

  return recompute(facts, transcript);
}

function applyParse(facts: CollectedFacts, parsed: IntakeResult): void {
  if (parsed.practiceArea && !facts.practiceAreaId) {
    facts.practiceAreaId = parsed.practiceArea.value.id;
    facts.practiceAreaName = parsed.practiceArea.value.name;
  }
  if (parsed.matterType && !facts.matterTypeId) facts.matterTypeId = parsed.matterType.value.id;
  if (parsed.location && !facts.locationId) {
    facts.locationId = parsed.location.value.id;
    facts.locationName = parsed.location.value.name;
  }
  if (parsed.court && !facts.courtId) {
    facts.courtId = parsed.court.value.id;
    facts.courtName = parsed.court.value.name;
  }
  // Urgency escalates but never de-escalates: "arrested" said once stands.
  const rank = { normal: 0, urgent: 1, emergency: 2 } as const;
  if (rank[parsed.urgency] > rank[facts.urgency]) facts.urgency = parsed.urgency;
}

/** Decide the next question and whether we have enough to route. */
function recompute(facts: CollectedFacts, transcript: Turn[]): AdvoState {
  const asked = new Set(transcript.filter((t) => t.role === 'user').map((t) => t.questionKey).filter(Boolean) as QuestionKey[]);

  const question = nextQuestion(facts, asked);
  const understanding = describe(facts);
  const readiness = score(facts);

  // Acknowledge before asking. A bot that only interrogates reads as a form;
  // reflecting back what it understood is what makes it a conversation, and it
  // also gives the user the chance to correct a misread early.
  const ack = acknowledge(facts, transcript);

  const next: AdvoState = {
    facts,
    transcript: question
      ? [...transcript, ...(ack ? [{ role: 'advo' as const, text: ack }] : []), { role: 'advo' as const, text: question.prompt }]
      : [...transcript, { role: 'advo' as const, text: `${ack ? `${ack} ` : ''}${understanding} Here is who can act on this.` }],
    nextQuestion: question,
    understanding,
    readiness,
    done: question === null,
  };
  return next;
}

function nextQuestion(facts: CollectedFacts, asked: Set<QuestionKey>): Question | null {
  // Order matters: ask the things that most change the shortlist, first.
  if (!facts.practiceAreaId && !asked.has('problem')) {
    return {
      key: 'problem',
      prompt: 'Tell me what has happened, in your own words.',
      help: 'You do not need legal terms. "My employer has not paid my PF for eight months" is perfect.',
      options: [],
      skippable: false,
    };
  }
  if (!facts.locationId && !facts.courtId && !asked.has('location')) {
    return {
      key: 'location',
      prompt: 'Which city or state is this happening in?',
      help: 'Where the matter has to be handled usually decides who can act for you.',
      options: [
        { label: 'Delhi', value: 'Delhi' }, { label: 'Mumbai', value: 'Mumbai' },
        { label: 'Bengaluru', value: 'Bengaluru' }, { label: 'Chennai', value: 'Chennai' },
        { label: 'Kolkata', value: 'Kolkata' }, { label: 'Hyderabad', value: 'Hyderabad' },
      ],
      skippable: true,
    };
  }
  if (!asked.has('stage')) {
    return {
      key: 'stage',
      prompt: 'How far along is it?',
      help: 'This changes whether you need advice, a notice drafted, or someone to appear for you.',
      options: STAGE_OPTIONS,
      skippable: true,
    };
  }
  if (facts.urgency === 'normal' && !asked.has('urgency')) {
    return {
      key: 'urgency',
      prompt: 'Is there a deadline?',
      options: [
        { label: 'No fixed deadline', value: 'normal' },
        { label: 'Within a few weeks', value: 'urgent' },
        { label: 'Today or tomorrow', value: 'emergency' },
      ],
      skippable: true,
    };
  }
  if (facts.budgetMaxMinor === null && !asked.has('budget')) {
    return {
      key: 'budget',
      prompt: 'What would you like to keep the first consultation under?',
      help: 'Advocates set their own fees. This only filters the shortlist — it is not a commitment.',
      options: BUDGET_OPTIONS,
      skippable: true,
    };
  }
  if (facts.minExperienceYears === null && !asked.has('experience')) {
    return {
      key: 'experience',
      prompt: 'How much experience would you prefer?',
      help: 'More years usually means a higher fee. Neither is automatically better for your matter.',
      options: EXPERIENCE_OPTIONS,
      skippable: true,
    };
  }
  if (!facts.preferredMode && !asked.has('mode')) {
    return {
      key: 'mode',
      prompt: 'How would you rather meet?',
      options: MODE_OPTIONS,
      skippable: true,
    };
  }
  return null;
}

/**
 * A short, factual acknowledgement of the most recent thing learned. Returns
 * null when there is nothing new worth reflecting, so the bot does not chirp
 * after every turn.
 */
function acknowledge(f: CollectedFacts, transcript: Turn[]): string | null {
  const lastUser = [...transcript].reverse().find((t) => t.role === 'user');
  if (!lastUser) return null;
  const key = lastUser.questionKey;

  if (!key || key === 'problem') {
    if (!f.practiceAreaName) {
      return 'I could not place that in a specific area of law yet — a little more detail will help.';
    }
    return `Understood — that reads as a ${f.practiceAreaName.toLowerCase()} matter.`;
  }
  if (key === 'location') {
    if (f.courtName) return `Noted, ${f.courtName}.`;
    return f.locationName ? `Noted, ${f.locationName}.` : 'Noted.';
  }
  if (key === 'stage') {
    if (f.stage === 'notice_received') return 'A notice already received usually means there is a clock running.';
    if (f.stage === 'filed') return 'Since a case is filed, you will likely need someone who can appear.';
    if (f.stage === 'hearing_scheduled') return 'A scheduled hearing narrows this considerably.';
    if (f.stage === 'pre_dispute') return 'Good — acting before it escalates gives you more options.';
    return 'That is fine, we can work without that.';
  }
  if (key === 'urgency') {
    if (f.urgency === 'emergency') return 'Treating this as urgent.';
    if (f.urgency === 'urgent') return 'Noted, there is a deadline.';
    return 'No deadline — that widens the choice.';
  }
  if (key === 'budget') {
    return f.budgetMaxMinor === null
      ? 'No ceiling then; I will show the full range.'
      : `I will keep the shortlist at or under \u20b9${Math.round(f.budgetMaxMinor / 100).toLocaleString('en-IN')} for a first consultation.`;
  }
  if (key === 'experience') {
    return f.minExperienceYears
      ? `Filtering to ${f.minExperienceYears}+ years in practice.`
      : 'I will not filter on experience.';
  }
  if (key === 'mode') {
    return f.preferredMode ? 'Noted.' : 'No preference on format.';
  }
  return null;
}

function describe(f: CollectedFacts): string {
  const bits: string[] = [];
  bits.push(f.practiceAreaName ? `This looks like a ${f.practiceAreaName.toLowerCase()} matter` : 'I do not have enough to categorise this yet');
  if (f.courtName) bits.push(`before ${f.courtName}`);
  else if (f.locationName) bits.push(`in ${f.locationName}`);
  if (f.stage === 'notice_received') bits.push('with a notice already received');
  else if (f.stage === 'filed') bits.push('with a case already filed');
  else if (f.stage === 'hearing_scheduled') bits.push('with a hearing scheduled');
  if (f.urgency === 'emergency') bits.push('and it is urgent');
  else if (f.urgency === 'urgent') bits.push('and it is time-sensitive');
  return `${bits.join(' ')}.`;
}

function score(f: CollectedFacts): number {
  let s = 0;
  if (f.practiceAreaId) s += 0.45;
  if (f.locationId || f.courtId) s += 0.3;
  if (f.stage) s += 0.1;
  if (f.budgetMaxMinor !== null || f.minExperienceYears !== null) s += 0.1;
  if (f.preferredMode) s += 0.05;
  return Math.min(1, s);
}

export function startSession(): AdvoState {
  const opening: Question = {
    key: 'problem',
    prompt: 'Tell me what has happened, in your own words.',
    help: 'No legal terms needed. I will work out the area of law, the jurisdiction and who can help.',
    options: [],
    skippable: false,
  };
  return {
    facts: { ...EMPTY_FACTS },
    transcript: [{ role: 'advo', text: opening.prompt }],
    nextQuestion: opening,
    understanding: 'I do not have enough to categorise this yet.',
    readiness: 0,
    done: false,
  };
}

/** Sort options offered on the shortlist. */
export type ShortlistSort = 'match' | 'fee_desc' | 'fee_asc' | 'experience_desc' | 'verification_desc';

export const SHORTLIST_SORTS: Array<{ value: ShortlistSort; label: string }> = [
  { value: 'match', label: 'Best match for your matter' },
  { value: 'fee_desc', label: 'Consultation fee: high to low' },
  { value: 'fee_asc', label: 'Consultation fee: low to high' },
  { value: 'experience_desc', label: 'Years in practice: most first' },
  { value: 'verification_desc', label: 'Verification level' },
];

/**
 * The disclaimer Advo AI must always carry. Kept here, next to the engine, so
 * it cannot drift away from the thing it describes.
 */
export const ADVO_DISCLAIMER =
  'Advo AI sorts and filters listed professionals. It does not give legal advice, it is not a '
  + 'lawyer, and nothing it says creates a lawyer–client relationship. It works from what you tell '
  + 'it and from what professionals have declared on their profiles.';
