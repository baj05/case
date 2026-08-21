# REVIEW_RESEARCH

Research basis for the Review Trust Engine, drawn from publicly known product patterns on
Glassdoor, G2 and Practo — general knowledge of their published design and (for G2) their
publicly documented review-authenticity methodology, not a scrape of their current UI. No
branding, layout, or proprietary code from any of the three is reproduced anywhere in this
codebase; what's borrowed is the underlying UX *principle*, adapted for legal services.

| Site | Feature | Why it works | What we borrowed | What we deliberately did NOT copy |
|---|---|---|---|---|
| Glassdoor | Anonymous reviews, identity known internally but not shown publicly | Lets people be honest about a real experience without fear of retaliation, while the platform can still act against abuse | `display_mode = 'anonymous'` — the reviewer's real `app_user` row is always what's stored; there is no separate "anonymous identity." Public copy states plainly that anonymity is not absolute (fraud/legal exceptions) | Glassdoor's employer-review specific framing, its response-moderation copy, its exact visual layout |
| Glassdoor | Company response, with explicit rules against identifying the reviewer | Gives the reviewed party a voice without letting them retaliate | `review_response` with its own moderation queue; the professional cannot edit or delete the original review, and nothing in the response flow ever surfaces the reviewer's identity | Any of Glassdoor's actual response UI or copy |
| G2 | Structured multi-dimension questions instead of one star rating | A single number hides *why* — dimension breakdown is what makes a review actionable | Communication / responsiveness / professionalism / process-clarity / overall-satisfaction as five separate stored ratings, never collapsed into one published "score" | G2's exact question wording, category taxonomy, or scoring weights (not published by G2 in enough detail to copy even if we wanted to) |
| G2 | Review volume + recency + quality feed into how prominently a review counts | Ten fresh, detailed reviews should carry more weight than one old one-liner | The band system (none/new/early/established) gates what's shown by volume; the fraud-risk model penalizes low-effort/duplicate/rapid-fire reviews | G2's specific published-but-undisclosed weighting formula — we don't have it and didn't try to reverse-engineer it |
| G2 | Pros/cons derived from real review text | Faster to scan than reading every review, if the themes are genuine | `extractThemes()` — deliberately dumb keyword matching over real published bodies only, gated behind a minimum-mentions threshold, never AI-generated or inferred | Any AI-generated summary — we do not run an LLM over review text at all, precisely to avoid the "never fabricate" risk the brief calls out |
| Practo | Recommendation percentage kept separate from the star rating | A "would you recommend" answer measures something different from a 1-5 scale, and conflating them hides information | `wouldRecommend` is its own field with its own denominator (excludes "maybe"), reported as `recommendPercent`, never derived from the star average | Practo's specific verified-visit mechanics or its exact appointment-experience taxonomy |
| Practo | Minimum feedback threshold before showing an aggregate | A "5.0" from one review is not a rating, it's noise | The four-band system (0 / 1-4 / 5-9 / 10+) — extended beyond a single threshold into four levels of disclosure, so confidence scales gradually rather than flipping on/off | — |
| Practo | Distinguishing feedback about the *experience* from the *outcome/skill* | Reviewing "communication was clear" is defensible; reviewing "won my case" invites people to rate lawyers on outcomes they don't control | Every rating dimension is experience-shaped (communication, responsiveness, professionalism, process clarity) — there is no "legal skill" or "case outcome" field anywhere in the schema, and the trust-centre page (`/trust/reviews`) says so explicitly | — |

## What we added that none of the three publicly do (as far as this research could establish)

- **A privacy-pattern filter** (`detectPrivacyRisk`) that screens submitted text for phone
  numbers, emails, money figures and case-number-like strings, routing any hit straight to human
  moderation. This is specific to the legal-privilege risk a client review can carry that an
  employer or software review cannot.
- **A no-fee-sharing constraint enforced at the database level**, not just as a policy —
  `referral` has no commission column, `booking.platform_fee_minor` is `CHECK`-constrained to 0.
  Neither Glassdoor nor G2 has an analogous "we structurally cannot take a cut" requirement,
  because neither operates under India's advocate conduct rules.
- **Organisation verification via matching email domain** (for law firms/LPOs, which have no
  booking record the way an individual advocate consultation does) — closer to how G2 verifies a
  reviewer's employer via work email/LinkedIn than to how Glassdoor or Practo verify anything.

## Honest limitation of this research pass

This was general-knowledge research, not a fresh site audit with screenshots, for two reasons:
reproducing another product's current UI as a stored reference asset risks crossing from
"studying UX principles" into "copying proprietary design," which the brief itself says not to
do; and general knowledge of these three products' well-known, long-standing patterns (anonymous
reviews, structured dimensions, recommendation-vs-rating separation, minimum thresholds) is
sufficient to justify every design decision above without needing a literal screenshot. If a
pixel-accurate visual audit is wanted later, that's a separate, scoped task.
