/**
 * Meeting-place tests.
 *
 * The rule that matters most is the one in the middle: a non-physical mode
 * must DISCARD any address it was sent. A video call that quietly stores the
 * client's home address is personal data retained for no purpose, and the
 * form is perfectly capable of sending one if the user switches mode after
 * typing.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  isPhysicalMode, resolveMeetingPlace, meetingKindMeta, chamberAddressNotice,
  MEETING_KINDS, MEETING_MODE_LABEL,
} from '../src/meeting-place.ts';

test('only in_person counts as a physical mode', () => {
  assert.equal(isPhysicalMode('in_person'), true);
  for (const mode of ['video', 'audio', 'phone', 'chat']) {
    assert.equal(isPhysicalMode(mode), false, `${mode} should not need a place`);
  }
});

test('every mode has a label, so the UI never renders a raw enum', () => {
  for (const mode of ['video', 'audio', 'phone', 'chat', 'in_person'] as const) {
    assert.ok(MEETING_MODE_LABEL[mode]);
  }
});

test('PRIVACY: a non-physical mode discards both the kind and the address it was sent', () => {
  const r = resolveMeetingPlace({
    mode: 'video',
    kind: 'client_place',
    address: '12-3-45 Banjara Hills, Hyderabad 500034',
  });
  assert.equal(r.kind, null);
  assert.equal(r.address, null, 'a video call must not retain a home address');
  assert.deepEqual(r.errors, {});
});

test('an in-person booking with no kind chosen is a field error, not a silent default', () => {
  const r = resolveMeetingPlace({ mode: 'in_person' });
  assert.equal(r.kind, null);
  assert.ok(r.errors.meetingKind);
});

test('an unrecognised kind is rejected rather than passed through', () => {
  const r = resolveMeetingPlace({ mode: 'in_person', kind: 'my-house' });
  assert.equal(r.kind, null);
  assert.ok(r.errors.meetingKind);
});

test('chamber needs no address', () => {
  const r = resolveMeetingPlace({ mode: 'in_person', kind: 'chamber' });
  assert.equal(r.kind, 'chamber');
  assert.equal(r.address, null);
  assert.deepEqual(r.errors, {});
});

test('chamber keeps an optional note when one is given', () => {
  const r = resolveMeetingPlace({ mode: 'in_person', kind: 'chamber', address: 'Second floor, ask at reception' });
  assert.equal(r.kind, 'chamber');
  assert.equal(r.address, 'Second floor, ask at reception');
});

test('a client address is required, and a too-short one is a field error', () => {
  const short = resolveMeetingPlace({ mode: 'in_person', kind: 'client_place', address: 'home' });
  assert.ok(short.errors.meetingAddress);
  assert.equal(short.address, null, 'an invalid address is never stored');

  const ok = resolveMeetingPlace({
    mode: 'in_person', kind: 'client_place',
    address: '12-3-45 Banjara Hills, Hyderabad 500034',
  });
  assert.deepEqual(ok.errors, {});
  assert.equal(ok.address, '12-3-45 Banjara Hills, Hyderabad 500034');
});

test('the court error names what is actually needed, rather than saying "invalid"', () => {
  const r = resolveMeetingPlace({ mode: 'in_person', kind: 'court', address: 'court' });
  assert.match(r.errors.meetingAddress ?? '', /court/i);
});

test('an address keeps its line breaks but loses control characters and runs of spaces', () => {
  const r = resolveMeetingPlace({
    mode: 'in_person', kind: 'client_place',
    address: '  Flat 4B,   Sunrise\x00 Apartments\n\n\n\nMG Road,    Bengaluru 560001  ',
  });
  assert.equal(r.address, 'Flat 4B, Sunrise Apartments\n\nMG Road, Bengaluru 560001');
});

test('an address is capped, so one field cannot be used as free storage', () => {
  const r = resolveMeetingPlace({
    mode: 'in_person', kind: 'other', address: 'x'.repeat(2000),
  });
  assert.ok((r.address?.length ?? 0) <= 400);
});

test('every kind declares whether it needs an address, and only chamber does not', () => {
  const needing = MEETING_KINDS.filter((k) => k.needsAddress).map((k) => k.kind);
  assert.deepEqual(needing.sort(), ['client_place', 'court', 'other']);
  assert.equal(meetingKindMeta('chamber')?.needsAddress, false);
});

test('meetingKindMeta returns null for an unknown kind', () => {
  assert.equal(meetingKindMeta('nowhere'), null);
});

test('an unpublished chamber address produces an honest notice, never an invented address', () => {
  const notice = chamberAddressNotice(false);
  assert.ok(notice);
  assert.match(notice, /confirm/i);
  assert.equal(chamberAddressNotice(true), null);
});
