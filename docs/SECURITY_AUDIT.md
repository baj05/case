# Security audit

Cross-reference: [COMPLIANCE_MATRIX](COMPLIANCE_MATRIX.md) for the legal dimension, [DATABASE_AUDIT](DATABASE_AUDIT.md) for storage-layer constraints.

## Implemented

| Control | State |
|---|---|
| Dependency vulnerabilities | **0** (`npm audit`). Next was upgraded 15.5.7 → 16.3.1 specifically to clear 27 advisories rather than ship them. |
| SQL injection | Parameterised statements throughout. **No string interpolation of user input into SQL** anywhere — verified by scan. |
| Server-side validation | Every server action validates independently of the client; `noValidate` on forms means the server path is the one actually exercised. |
| Server-side authorisation re-check | Actions re-verify the target's existence and eligibility (published, accepting) rather than trusting a hidden field. |
| Booking contention | Re-checked **inside** the transaction, plus a unique partial index — a race cannot double-book. |
| Private data separation | Explicit `PUBLIC_COLUMNS` projection; no `SELECT *` on public paths. Verified by query that no `private_*` value reaches the search index. |
| Matter confidentiality | Consultation summaries and matter briefs excluded from every index **by construction**. Never sent to analytics. |
| Security headers | `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera/mic/geo off), `poweredByHeader: false` |
| Remote image hosts | `remotePatterns: []` — portraits are copied to our origin, so a remote-image SSRF surface does not exist |
| Container hardening | Non-root user, no compiler in the runtime stage, dev dependencies omitted, healthcheck |
| Audit trail | Append-only `audit_log` on claims, approvals, opt-outs and verification, recording before/after state and reason |
| Secrets | No secrets in the repo; `.env` gitignored, `.env.example` documents every key |
| Error handling | Route-level error boundary; no stack trace or internal exception reaches a visitor |

## Not implemented — and the honest consequence

| Gap | Severity | Consequence |
|---|---|---|
| **No authentication** | **P0** | There are no accounts. Everything below follows from this. |
| `/admin` unauthenticated | **P0 — top release blocker** | Anyone reaching the URL sees the ingestion workbench, claim queue and privacy requests. The page says so in a banner, but that is disclosure, not mitigation. |
| No RBAC enforcement | P0 | Roles exist in the schema (`platform_role`, `org_member.role`) and are unused. |
| Tenant isolation untested | P0 | Schema supports it (`organisation_id` on every tenant-scoped table); no tenants exist yet, and no automated isolation test. |
| No rate limiting | P1 | Search, suggest, claim, booking and the Advo AI endpoint are all unthrottled. |
| No CSRF tokens | P1 | Next server actions carry some inherent protection; explicit tokens still wanted. |
| No CSP / HSTS | P1 | Headers present but incomplete. |
| No document upload | n/a | Not built, so no upload attack surface — but also no malware scanning to review. |
| No MFA, session management, device management | P1 | Follows from no auth. |

## Deliberate structural safeguards

Worth separating from ordinary controls, because these cannot be undone by a configuration change:

- `plan.grants_ranking_boost CHECK (= 0)` — paid ranking needs a migration, not a toggle.
- `booking.platform_fee_minor CHECK (= 0)` — the platform cannot take a fee share.
- `judge` has no rating column — judge scoring is impossible.
- Personal contact fields are omitted from the public projection, not merely hidden in the UI.

## Priority order to close

1. Authentication (sessions, password hashing, MFA) → 2. RBAC on `/admin` + audit per action → 3. Rate limiting → 4. Tenant isolation tests → 5. CSP + HSTS → 6. Postgres migration → 7. Dependency and secret scanning in CI.
