# REVIEW_SCORING_METHODOLOGY

How every number shown in the Legal Trust & Experience section is actually computed. Every
formula here is implemented in `packages/db/src/repositories/reviews.ts` — this document
describes real code, not an aspiration; where the code and this doc might drift, the code is
correct and this doc needs updating (which is a real, findable engineering task, not a
theoretical risk).

## 1. What is NOT calculated

There is no single formula that outputs a "lawyer rating." The five dimension ratings
(communication, responsiveness, professionalism, process clarity, overall satisfaction) are
stored and averaged **separately** — nothing multiplies or blends them into one published score.
The number shown as "4.2 / 5" is the average of `overall_satisfaction` alone, not a weighted
composite of the other four (unlike the weighted-composite model the original brief sketched —
that model was deliberately not built, because a hidden weighting formula is exactly the kind of
opaque "trust score" §29 of the brief warns against; showing each dimension's own honest average,
unweighted, is more defensible than inventing weights with no basis).

## 2. The four confidence bands

```
count == 0        → 'none'         no experiences yet
1  <= count < 5    → 'new'          raw count only, no numeric average shown
5  <= count < 10    → 'early'        overall score + recommend % shown; no dimension
                                     breakdown, no distributions, no themes
count >= 10         → 'established'  everything: dimension breakdown, star distribution,
                                     satisfaction distribution, "what people mention" themes
```

Implemented in `bandFor()`. This is the sample-size protection the brief calls for (§28/§30/§31):
the *display*, not just an internal flag, degrades gracefully as evidence accumulates, rather
than flipping a single "enough data" switch.

## 3. Overall satisfaction

`round(avg(overall_satisfaction), 1)` over all `moderation_status = 'published'` reviews for the
subject (professional or organisation), `deleted_at IS NULL`. Nothing else touches this number —
withdrawn, pending, rejected and flagged reviews are excluded by the `WHERE` clause, not by a
separate filter step that could be forgotten.

## 4. Dimension breakdown (established band only)

`avg(rating_communication)`, `avg(rating_responsiveness)`, `avg(rating_professionalism)`,
`avg(rating_process_clarity)` — each independently, each rounded to one decimal. A review that
didn't answer a given dimension (`NULL`) is excluded from that dimension's average only, not from
the others.

## 5. Recommendation percentage

```
recommendPercent = round(100 * count(would_recommend = 'yes') / count(would_recommend IN ('yes','no')))
```

`'maybe'` responses are excluded from both numerator and denominator — a "maybe" is neither a
recommendation nor a non-recommendation, and folding it into either would misrepresent it. This
is why `recommendPercent` is never derivable from the star average alone (§15 of the brief:
"this should NOT simply equal the star rating").

## 6. Star distribution (established band only)

`overall_satisfaction` values grouped and counted 1 through 5, each as a percentage of the total
count of reviews *that have a value in that field* (a review missing `overall_satisfaction`
contributes to `count` but not to the star distribution's denominator — this is a real, minor
inconsistency worth knowing about, not hidden: if every review has an overall rating, which the
submission form requires, the two denominators are equal in practice).

## 7. Satisfaction distribution

The same five buckets, relabelled: 5★ = "Very satisfied", 4★ = "Satisfied", 3★ = "Neutral", 2★ =
"Dissatisfied", 1★ = "Very dissatisfied." This is presentation, not a second calculation — see
§16 of the brief ("do not turn this into a fake mathematical trust score without a clear
methodology"); it is the same underlying number shown a second way because different people scan
percentages and plain-language labels differently.

## 8. "What people mention" (established band only)

`extractThemes()` runs eight fixed keyword/phrase patterns (communication clarity, responsiveness,
professionalism, process clarity, documentation quality, punctuality, response delays, scheduling
difficulty) against every published review body for the subject, counts matches, and surfaces
only themes with **at least 3 mentions**, sorted by mention count, capped at 6. No language model
touches this text. A theme is either present in the literal words of at least 3 reviews or it is
not shown — this is the strongest anti-fabrication guarantee available: the code cannot invent a
theme, because it can only report a regex match count.

## 9. Verification (`basis`)

| Subject | `verified_consultation` / `verified_engagement` | `unverified` |
|---|---|---|
| Individual professional | Reviewer's account is the `client_user_id`/`requester_user_id` on a `booking`/`consultation_request`/`appointment` row with `status = 'completed'`, or a `matter_participant` row | Anything else (not currently reachable through the UI — the submission form only offers eligible experiences) |
| Organisation (firm/LPO) | Reviewer's account email domain matches `organisation.email_domain`, and `organisation.domain_verified_at` is set | Any other signed-in reviewer |

The "verified" badge is never granted from "email verified" alone (§9 of the brief explicitly
rules this out) — it requires a specific interaction record or a domain match, both checked at
write time in `createReview`/`createOrganisationReview`, not computed later from looser signals.

## 10. Internal fraud/trust score — never public

`assessFraudRisk()` adds points for: ≥3 reviews by the same account in 24h (+40), identical body
text published for the same subject in the last 30 days (+30), a body under 15 characters (+20),
an `unverified` basis (+15). Tiers: `high` ≥ 50, `medium` ≥ 20, else `low`. `high` auto-routes to
`auto_flagged` instead of `pending`. This score and its component signals are stored in
`review.trust_signals`/`trust_score` and returned only by `listModerationQueue` (an
admin-authenticated function) — never by any function a public page calls.

## 11. Privacy filter — overrides everything else

`detectPrivacyRisk()` runs independently of the fraud score. Any match (phone number, email,
money figure, case-number-like string) forces `moderation_status = 'in_review'` regardless of how
low the fraud score is — because the risk here (accidental disclosure of confidential/privileged
content) is a different kind of risk than inauthenticity, and a "trustworthy-looking" review can
still leak a phone number.

## 12. What would change this document

Any of: adjusted band thresholds, a new rating dimension, a change to what counts toward
`recommendPercent`'s denominator, a new theme pattern, a change to the fraud-score weights. All
of these are single, findable edits in `reviews.ts` — there is no second copy of this logic
anywhere (no duplicated scoring in a frontend file), so this document staying in sync with the
code is a one-file diff, not an audit.
