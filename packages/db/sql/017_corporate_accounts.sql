-- ===========================================================================
-- CORPORATE ACCOUNTS — a company as a tenant, with a real member roster.
--
-- `organisation` and `org_member` have existed since 003_platform.sql but
-- nothing has ever written an `org_member` row: organisations were only ever
-- read, as public law-firm and LPO listings. This migration adds what a
-- company signing itself up actually needs — invitations, a domain claim,
-- and a way for a booking to belong to the company rather than to one
-- employee's email address.
--
-- Additive only. Every column added here is nullable or defaulted, so
-- existing rows stay valid and no backfill runs.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Attribute a booking / enquiry to a company.
--
-- Nullable, and deliberately never backfilled. Matching an existing row's
-- client_email against app_user.email would hand a stranger's booking to
-- whoever registers that address next — an ex-employee, a typo, a squatter —
-- and those emails were never verified in the first place. Old rows stay
-- NULL and remain reachable by the existing email path.
-- ---------------------------------------------------------------------------
ALTER TABLE booking ADD COLUMN organisation_id INTEGER REFERENCES organisation(id);
ALTER TABLE consultation_request ADD COLUMN organisation_id INTEGER REFERENCES organisation(id);

CREATE INDEX idx_booking_org ON booking(organisation_id, starts_at_utc DESC);
-- Not strictly needed by this migration, but every "my bookings" query filters
-- on client_user_id and there was no index for it.
CREATE INDEX idx_booking_client_user ON booking(client_user_id, starts_at_utc DESC);
CREATE INDEX idx_creq_org ON consultation_request(organisation_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Invitations.
--
-- Only the SHA-256 of the token is stored. The raw token exists once, in the
-- link handed to the invitee; a database copy would make the invite table a
-- list of working credentials.
-- ---------------------------------------------------------------------------
CREATE TABLE org_invite (
  id                 INTEGER PRIMARY KEY,
  organisation_id    INTEGER NOT NULL REFERENCES organisation(id) ON DELETE CASCADE,
  email              TEXT NOT NULL,                  -- lowercased by the repository
  -- Never 'owner'. Ownership transfer is a separate, deliberate act, not
  -- something an invite link should be able to confer.
  role               TEXT NOT NULL CHECK (role IN ('admin','member','billing','read_only')),
  token_hash         TEXT NOT NULL UNIQUE,
  invited_by_user_id INTEGER NOT NULL REFERENCES app_user(id),
  expires_at         TEXT NOT NULL,
  accepted_at        TEXT,
  accepted_user_id   INTEGER REFERENCES app_user(id),
  revoked_at         TEXT,
  created_at         TEXT NOT NULL
);
-- One live invite per address per organisation. Partial, so a revoked or
-- accepted invite does not block re-inviting the same person later.
CREATE UNIQUE INDEX idx_org_invite_open ON org_invite(organisation_id, email)
  WHERE accepted_at IS NULL AND revoked_at IS NULL;
CREATE INDEX idx_org_invite_org ON org_invite(organisation_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Domain claims — staging, deliberately NOT `organisation.email_domain`.
--
-- reviews.ts grants an organisation review the 'verified_engagement' basis
-- when the author's email domain matches organisation.email_domain and
-- domain_verified_at is set. Writing those two columns for a corporate
-- tenant would therefore let a company's own staff post trust-badged
-- reviews of their own company. A claim proven here is only ever copied
-- onto `organisation` for kinds that are legitimately review subjects; see
-- promoteVerifiedDomain, which refuses kind='corporate'.
-- ---------------------------------------------------------------------------
CREATE TABLE org_domain_claim (
  id                  INTEGER PRIMARY KEY,
  organisation_id     INTEGER NOT NULL REFERENCES organisation(id) ON DELETE CASCADE,
  domain              TEXT NOT NULL,                 -- lowercased, no scheme, no www.
  method              TEXT NOT NULL DEFAULT 'dns_txt',
  challenge           TEXT NOT NULL,                 -- the TXT value to publish
  verified_at         TEXT,
  last_checked_at     TEXT,
  created_by_user_id  INTEGER NOT NULL REFERENCES app_user(id),
  created_at          TEXT NOT NULL,
  UNIQUE (organisation_id, domain)
);
CREATE INDEX idx_org_domain_claim_domain ON org_domain_claim(domain);
