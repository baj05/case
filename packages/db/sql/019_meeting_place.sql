-- ===========================================================================
-- WHERE a meeting happens.
--
-- `booking.mode` has always recorded HOW people meet — video, phone,
-- in_person — but nothing recorded WHERE. An in-person booking therefore
-- said "in person" and left both sides to work out the address by other
-- means, which for the one format that requires a physical place is the
-- detail that matters most.
--
-- Additive and nullable: every existing booking is a video call and stays
-- valid with both columns NULL.
-- ===========================================================================

-- 'chamber'      — the professional's own office. Offered only when they have
--                  published an address, or with an explicit "they will
--                  confirm it" note when they have not. We never invent an
--                  address for a real named person (ADR-008, ADR-012).
-- 'client_place'  — an address the client gives.
-- 'court'         — meet at the court, typically before a listing.
-- 'other'         — anywhere else, described in meeting_address.
ALTER TABLE booking ADD COLUMN meeting_kind TEXT;

-- CONFIDENTIAL. A client's home or office address is personal data under the
-- DPDP Act and gets the same treatment as booking.brief: never indexed,
-- never in an analytics payload, never in a URL.
ALTER TABLE booking ADD COLUMN meeting_address TEXT;

-- The same pair on the enquiry path, so someone who asks for an in-person
-- meeting before any slot exists can say so at the point they ask.
ALTER TABLE consultation_request ADD COLUMN preferred_place TEXT;
ALTER TABLE consultation_request ADD COLUMN preferred_address TEXT;

-- Deliberately NOT indexed. There is no query that finds bookings by
-- address, and an index would put client addresses in a second structure to
-- forget about when honouring an erasure request.
