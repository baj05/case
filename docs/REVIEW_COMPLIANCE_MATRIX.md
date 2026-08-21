# REVIEW_COMPLIANCE_MATRIX

**Status: NOT LEGAL ADVICE.** An engineer's risk register for the review system specifically —
`docs/COMPLIANCE_MATRIX.md` rows C-09 and C-10 already state the headline position; this document
expands them into the full surface the product brief asked for (BCI rules, Advocates Act,
defamation, privacy, data protection, confidentiality/privilege, consumer law, platform
liability), and records exactly what the Review Trust Engine's code does about each one.

The engine (`packages/db/src/repositories/reviews.ts`, schema in `003_platform.sql` +
`009_review_trust_engine.sql` + `010_review_booking_link.sql`) is **built and tested**, gated
behind `FEATURE_REVIEWS` (off) and `FEATURE_ANONYMOUS_REVIEWS` (off, not yet wired as a separate
gate from display_mode — see open item below). Nothing here is enabled until a named advocate
signs off each row.

## Legend

| Verdict | Meaning |
|---|---|
| ✅ Built, defensible | Implemented, with controls described, ready to enable |
| ⚠️ Built, gated | Code exists; stays off pending sign-off |
| ⛔ Not built by design | Deliberately absent — the product brief itself ruled it out |
| ❓ Open question | Needs counsel's answer before the row above it can move to ✅ |

## 1. Bar Council of India Rules / Advocates Act, 1961

| # | Question | Verdict | What the code does |
|---|---|---|---|
| R-01 | Does a third-party review of a named advocate constitute the advocate "advertising" or "soliciting" work, prohibited under BCI Rules Ch. II Part VI r.36? | ❓ | The platform does not write reviews, generate review text, or invite a specific rating — a user who had a real interaction may write one. No comparison ranking is derived from reviews ("Top Lawyer", "#1 in Mumbai" do not exist anywhere in the codebase — grepped, absent). |
| R-02 | Can a review platform legally rank or filter advocates by review score at all? | ❓ | `listReviewsForProfessional`'s `sort` param supports `highest`/`lowest` sorting of an individual advocate's *own* reviews — it does **not** rank advocates against each other by review score anywhere in search (`search.ts` ranking has no review-score factor; confirmed by the existing unit test asserting no commercial/vanity key exists in ranking weights, C-13). |
| R-03 | Does inviting "would you recommend?" cross into solicitation-adjacent territory? | ❓ | Framed as a private experience signal aggregated into "X% would recommend" — never as an endorsement banner, never pushed to the advocate's own marketing. |

## 2. Defamation (civil, and Bharatiya Nyaya Sanhita provisions on criminal defamation)

| # | Question | Verdict | What the code does |
|---|---|---|---|
| R-04 | Is the platform an "intermediary" under IT Act s.79, and what does that require? | ❓ | Architecture assumes intermediary status is NOT unconditional — moderation exists specifically because relying on safe-harbour alone was judged insufficient. Every review passes through `moderation_status` before publishing; nothing is auto-published (`createReview` sets `pending` or `auto_flagged`, never `published`). |
| R-05 | What happens when a professional disputes a review as false/defamatory? | ✅ | `content_report` (reason `defamatory` already modeled) + `reportReview()` immediately moves a published review back to `in_review` — never silently removed, never silently kept up; a human decides via `moderateReview()`. Full audit trail: `moderation_note`, `moderated_by_user_id`, `moderated_at`. |
| R-06 | Do we need a formal takedown/counter-notice process (IT Rules 2021 intermediary due diligence)? | ❓ | Not built. The `content_report` → `in_review` path is the mechanism, but there is no documented SLA or counter-notice flow yet. **Must be written before launch**, per `docs/IMPLEMENTATION_ROADMAP.md` P0#5 (named Grievance Officer). |
| R-07 | Fraudulent/coordinated reviews used to defame competitively | ✅ | Internal fraud scoring (`assessFraudRisk`): review velocity (≥3/24h), duplicate text across reviews, low-effort short bodies, unverified basis. High-risk reviews auto-flag rather than auto-publish. Score/signals are never exposed publicly (§16 of the brief) — verified: `listReviewsForProfessional`'s public shape has no trust field; only `listModerationQueue` (admin-only route) carries it. |

## 3. DPDP Act 2023 (data protection)

| # | Question | Verdict | What the code does |
|---|---|---|---|
| R-08 | Lawful basis for publishing the *professional's* name against a review? | ✅ | Same basis as C-03 in the main matrix — publicly available register data. |
| R-09 | Lawful basis for publishing the *reviewer's* identity or pseudonym? | ❓ | Reviewer consents explicitly per review via the `displayMode` choice in the submission form (attributed/pseudonymous/anonymous) — but there is no separate, generic platform Terms clause covering this yet; the form's own copy ("Your identity is always retained internally...") is the only current disclosure. |
| R-10 | Right to erasure vs. right of the professional to a defensible record | ❓ | `withdrawReview()` sets `moderation_status='withdrawn'` (unpublishes) rather than deleting the row — deliberately, matching the existing C-19 pattern (erasure is a separate, deliberate act, not automatic on withdrawal). Whether a reviewer can demand full erasure of a *published* review (as opposed to withdrawal) is unresolved. |
| R-11 | Security of reviewer identity against a data breach | ✅ | Pseudonymous/anonymous display never persists a separate "anonymous" identity table — the real `app_user` row is always what's stored; there is nothing extra to breach beyond the existing user table's own protections (password hashing, httpOnly session cookies). |

## 4. Confidentiality / Privilege (BSA 2023, successor to Evidence Act s.126)

| # | Question | Verdict | What the code does |
|---|---|---|---|
| R-12 | Reviewer disclosing privileged matter detail (case facts, opposing party, strategy) in review text | ⚠️ Built, gated | `detectPrivacyRisk()` pattern-matches phone numbers, email addresses, money figures (₹/Rs/lakh/crore — a plausible settlement amount) and case-number-like strings (`Crl. 4521/2023`, `W.P. 12/2024`). Any hit forces `moderation_status='in_review'` regardless of the fraud tier — verified by test ("a review containing a phone number / case-number is routed to human review"). This is a screening net, not proof of sufficiency — see the open question below. |
| R-13 | Same risk in the professional's *response* to a review | ❓ | `respondToReview` has no content filter yet — the same function should be applied there before this row can move to ⚠️. |

**Residual gap:** pattern matching catches phone numbers, emails, money figures and case-number
shapes — it does not catch a party's *name*, a *narrative* description of confidential facts, or
privileged strategy discussion in prose with no matching pattern. Counsel needs to say whether
this level of automated screening plus human moderation of every review (not just flagged ones,
per the moderation workflow already in place) is sufficient due diligence, or whether every
review needs mandatory human pre-publication review regardless of any automated signal.

## 5. Consumer law

| # | Question | Verdict | What the code does |
|---|---|---|---|
| R-14 | Is a review a "consumer complaint" and does the Consumer Protection Act's e-commerce/review rules (fake-review disclosure norms) apply? | ❓ | The engine's transparency fields (verified badge, basis, display mode, date, edited flag) already satisfy the *spirit* of disclosure norms — each displayed review states its type plainly (§43 of the brief). No formal legal mapping to the Consumer Protection (E-Commerce) Rules has been done. |

## 6. Platform liability / commercial independence

| # | Question | Verdict | What the code does |
|---|---|---|---|
| R-15 | Can a paying professional buy review removal, suppression, or a boosted score? | ✅ **Structural, not just policy** | No code path connects `plan`/`subscription`/`ledger_entry` to anything in `reviews.ts`. `moderateReview` takes no payment-related input. This mirrors C-13's `CHECK (grants_ranking_boost = 0)` pattern in spirit, though not (yet) as a literal DB constraint — worth adding a `CHECK` or trigger if this ever becomes a real worry. |
| R-16 | Can a professional edit or delete a user's review directly? | ✅ | No such function exists. `respondToReview` only ever inserts a new `review_response` row; there is no code path that mutates `review.body`. |
| R-17 | Does "one review per verified experience" hold even under a race condition or a bug? | ✅ | Enforced by partial UNIQUE indexes (`uq_review_one_per_booking` etc.) at the database level, not just application logic — a bug in `createReview` cannot bypass it. |

## Flags and what gates them

| Flag | Default | Gate | This pass |
|---|---|---|---|
| `FEATURE_REVIEWS` | off | Needs sign-off on R-01–R-07, R-12–R-14 | Built, tested end-to-end in this session, left off |
| `FEATURE_ANONYMOUS_REVIEWS` | off | Needs sign-off on R-09, R-10 specifically | **Open item:** the code currently gates all three display modes behind the single `FEATURE_REVIEWS` flag via the submission form, not behind a second flag. Wire `displayMode==='anonymous'` to check `FEATURE_ANONYMOUS_REVIEWS` separately before enabling attributed/pseudonymous reviews without also enabling anonymous ones. |

## Open questions for counsel (additive to the six already listed in `COMPLIANCE_MATRIX.md`)

7. **R-06** — what does a compliant takedown/counter-notice SLA look like for this platform specifically?
8. **R-12/R-13** — is a keyword/pattern content filter sufficient due diligence for privileged-content leakage, or does every review need human pre-publication review regardless of the fraud score?
9. **R-10** — does "withdraw" (unpublish, retain internally) satisfy DPDP erasure rights, or must a withdrawn review's content be purged after some retention period?
10. **R-01/R-02** — the fundamental question underneath all of this: can a review platform for Indian advocates operate at all, in what form, and does that answer differ for law firms and LPO providers (who are not "advocates" under the Advocates Act and may sit outside BCI's rule-making entirely)?
