# Phase 2 execution plan — booking, fees, Advo AI

Written 18 Aug 2026. Ordered by dependency, not by ambition.

## What changes about the compliance posture

You have now twice asked for **fee display and on-platform booking**. My compliance
matrix flagged that as C-12 (requires review). You have reaffirmed it, so that is your
call and I am building it. Two design choices keep it as defensible as possible:

1. **Fees are advocate-declared, never invented and never platform-set.** A fee only
   appears once an advocate has claimed their profile and entered a fee schedule.
2. **The platform takes no share.** `platform_fee_minor` exists in the schema and is
   hard-defaulted to 0, mirroring the ADR-009 treatment of paid ranking. No commission,
   no lead fee, no percentage — which is the part of C-12 that carries real risk.

`FEATURE_PAYMENTS` moves from off to **`collect_offline`**: the platform shows the fee,
takes the booking, and the advocate collects directly. A true payment-gateway capture
stays behind a separate flag pending sign-off.

## Order of work

| # | Item | Why it is first / blocked by |
|---|---|---|
| 1 | **Fee schedule model** — consultation fee per mode/duration, filing charges, appearance fee, drafting fee; currency-aware, integer minor units | Everything about booking depends on it |
| 2 | **Claim approval loop** — admin approves a claim, advocate then sets practice areas, courts, availability and fees | Without this no advocate has fees, so booking has nothing to price. This is what makes the whole thing real rather than mocked |
| 3 | **Booking flow, 6 steps** — consultation type → date → slot → matter brief → documents → review & confirm. Real slot generation from availability rules, real double-book prevention (the unique index already exists), timezone-explicit | The headline ask |
| 4 | **Booking edge cases** — slot taken mid-flow, advocate withdrew, duplicate request, timezone mismatch, cancel, reschedule, decline | Spec §60. A happy-path-only booking is a mockup |
| 5 | **Advo AI** — conversational intake that asks follow-ups, then returns a ranked shortlist with sort by fee (high→low / low→high), years in practice, verification. Deterministic and explainable, per ADR-006 | Depends on fees existing to sort by them |
| 6 | **Advocate portfolio** — richer profile: fee card, availability preview, credentials, publications, related professionals | Depends on 1 and 2 |
| 7 | **Remaining kit sections** — testimonial-shaped section replaced with an honest equivalent, timeline, authority strip | Visual parity with the references |
| 8 | **Responsive + a11y + route sweep** at 320/375/768/1024/1440/1920 | Always last, always done |

## What I am explicitly not doing in this pass

- Real payment capture (needs your gateway account and C-12 sign-off)
- Reviews (C-09, still gated)
- Referrals (C-11, still gated)
- Corporate / LPO / contract SaaS / mediation / arbitration (Phase 3, schema already in place)
- Authentication. The claim-approval loop runs through the admin surface, which is
  itself still the top release blocker in PROJECT_AUDIT.md

## Honest note on "replicate ditto"

I can match the reference layouts — composition, type scale, colour blocking, card
motifs, stepper, collage grid — and I have. I cannot reproduce their photography, because
the figures in those screenshots are 141×158px regions of a composite. Where the
references use a stock model, I use either high-resolution licensed court photography or
a real ingested advocate portrait from the Bar Council register. That is a deliberate
substitution, not an oversight.
