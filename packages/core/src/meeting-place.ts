/**
 * Where a meeting happens.
 *
 * `mode` says HOW people meet — video, phone, in person. This module covers
 * WHERE, which only has to be answered when the mode is physical. Keeping
 * the rules here rather than in the booking form means the server can apply
 * exactly the same ones, and a test can check them without a browser.
 */

export type MeetingMode = 'video' | 'audio' | 'phone' | 'chat' | 'in_person';

export type MeetingKind = 'chamber' | 'client_place' | 'court' | 'other';

/** Modes that happen in a physical place and therefore need one. */
export const PHYSICAL_MODES: readonly MeetingMode[] = Object.freeze(['in_person'] as const);

export function isPhysicalMode(mode: string): boolean {
  return (PHYSICAL_MODES as readonly string[]).includes(mode);
}

export const MEETING_MODE_LABEL: Record<MeetingMode, string> = {
  video: 'Video call',
  audio: 'Audio call',
  phone: 'Telephone',
  chat: 'Secure chat',
  in_person: 'In person',
};

export interface MeetingKindMeta {
  kind: MeetingKind;
  label: string;
  /** Shown under the option. */
  hint: string;
  /** Does the client have to type an address for this choice? */
  needsAddress: boolean;
}

export const MEETING_KINDS: readonly MeetingKindMeta[] = Object.freeze([
  {
    kind: 'chamber',
    label: 'At the advocate’s chamber or office',
    hint: 'You travel to them.',
    needsAddress: false,
  },
  {
    kind: 'client_place',
    label: 'At an address I give',
    hint: 'Your home, your office, or a hospital or prison visit. The advocate may decline or charge for travel.',
    needsAddress: true,
  },
  {
    kind: 'court',
    label: 'At the court',
    hint: 'Usually before a listing. Say which court and where to meet.',
    needsAddress: true,
  },
  {
    kind: 'other',
    label: 'Somewhere else',
    hint: 'Describe the place and how to find it.',
    needsAddress: true,
  },
] as const);

export function meetingKindMeta(kind: string): MeetingKindMeta | null {
  return MEETING_KINDS.find((k) => k.kind === kind) ?? null;
}

export interface MeetingPlaceInput {
  mode: string;
  kind?: string | null;
  address?: string | null;
  /** Whether the professional has actually published a chamber address. */
  chamberAddressKnown?: boolean;
}

export interface MeetingPlaceResult {
  kind: MeetingKind | null;
  address: string | null;
  /** Field-keyed errors, matching the ActionResult contract. */
  errors: Record<string, string>;
}

const MAX_ADDRESS = 400;
const MIN_ADDRESS = 10;

/**
 * Validate and normalise a chosen place.
 *
 * For a non-physical mode both values are discarded rather than stored: a
 * video call with an address attached is a video call with a stray home
 * address in the database, and that is personal data held for no purpose.
 */
export function resolveMeetingPlace(input: MeetingPlaceInput): MeetingPlaceResult {
  const errors: Record<string, string> = {};

  if (!isPhysicalMode(input.mode)) {
    return { kind: null, address: null, errors };
  }

  const meta = input.kind ? meetingKindMeta(input.kind) : null;
  if (!meta) {
    errors.meetingKind = 'Choose where you would like to meet.';
    return { kind: null, address: null, errors };
  }

  // Collapse whitespace but keep line breaks: an address is written over
  // several lines and flattening it makes it harder to read back.
  const address = (input.address ?? '')
    // eslint-disable-next-line no-control-regex -- deliberately stripping control chars
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, MAX_ADDRESS);

  if (meta.needsAddress && address.length < MIN_ADDRESS) {
    errors.meetingAddress = meta.kind === 'court'
      ? 'Name the court and where to meet — a room or gate number if you have one.'
      : 'Enter the full address, including the city and a landmark if it helps.';
    return { kind: meta.kind, address: null, errors };
  }

  // 'chamber' keeps whatever the client added as a note (a floor, a
  // reception instruction) but never requires it.
  return { kind: meta.kind, address: address.length > 0 ? address : null, errors };
}

/**
 * What to tell the client about a chamber visit when the professional has
 * not published an address.
 *
 * Returned as a message rather than papered over with a placeholder: the
 * honest answer is that the address is coming, and an invented one would be
 * an invented fact about a real person's premises.
 */
export function chamberAddressNotice(chamberAddressKnown: boolean): string | null {
  if (chamberAddressKnown) return null;
  return 'This advocate has not published an office address. They will confirm exactly where to come when they accept the booking.';
}
