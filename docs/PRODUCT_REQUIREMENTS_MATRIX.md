# PRODUCT_REQUIREMENTS_MATRIX

Every capability originally intended for Lexhall, grouped by area, with each
requirement mapped to a stable ID used by GAP_ANALYSIS and RECTIFICATION_TASKS.

Source columns: **PM** = master product/engineering briefs;
**MT** = legal matter taxonomy brief; **RL** = legal resource library brief;
**AR** = autonomous recovery brief; **UX** = this reconciliation brief.

## A · Discovery

| ID | Requirement | Source |
|---|---|---|
| A-01 | Search advocates, senior advocates, firms and chambers | PM |
| A-02 | Natural-language query understanding | PM, MT |
| A-03 | Filter by location (state, city, jurisdiction) | PM |
| A-04 | Filter by court and court tier | PM |
| A-05 | Filter by practice area | PM |
| A-06 | Filter by legal matter (level 3 taxonomy) | MT |
| A-07 | Filter by verification level | PM |
| A-08 | Filter by consultation mode and availability | PM |
| A-09 | Fee range and years-in-practice filters | PM |
| A-10 | Advo AI as a side chat, never a whole page | PM |
| A-11 | Sort by fee, experience, verification, relevance | PM |
| A-12 | Empty state with real recovery links | PM, UX |

## B · Professional profiles

| ID | Requirement | Source |
|---|---|---|
| B-01 | Identity, credentials, court associations, jurisdictions | PM |
| B-02 | Fee schedule (consult / draft / filing / appearance) with statutory disclosures | PM |
| B-03 | Availability rules and bookable slots | PM |
| B-04 | Claim-my-profile with match-scored verification | PM |
| B-05 | Verification levels 0..5 with plain-language copy | PM |
| B-06 | Related / similar professionals | PM |
| B-07 | Free resources for the matters this professional handles | UX |
| B-08 | Referral / local-counsel signal | PM |

## C · User services

| ID | Requirement | Source |
|---|---|---|
| C-01 | Consultation request (no payment) | PM |
| C-02 | Bookable appointment with fee summary and slot lock | PM |
| C-03 | Booking confirmation with reference and next steps | PM |
| C-04 | Matter creation and document upload | PM |
| C-05 | Follow-ups and reminders | PM |
| C-06 | Saved professionals (auth required) | PM |
| C-07 | Booking cancellation and rescheduling | PM |

## D · Lawyer network

| ID | Requirement | Source |
|---|---|---|
| D-01 | Lawyer-to-lawyer discovery for referral / local counsel | PM |
| D-02 | Send / accept / decline referral | PM |
| D-03 | Multi-lawyer matter management | PM |

## E · Corporate legal workspace

| ID | Requirement | Source |
|---|---|---|
| E-01 | Company workspace, roles, seats | PM |
| E-02 | Legal request → engagement → matter chain | PM |
| E-03 | Contract management and expiry alerts | PM |
| E-04 | Compliance calendar (PF, ESI, GST, RoC) | PM |
| E-05 | External counsel panel | PM |
| E-06 | Reporting and analytics | PM |

## F · LPO

| ID | Requirement | Source |
|---|---|---|
| F-01 | LPO project workspace | PM |
| F-02 | Legal research, contract abstraction, bulk review | PM |
| F-03 | QA and delivery workflow | PM |

## G · Legal resources

| ID | Requirement | Source |
|---|---|---|
| G-01 | Free templates, notices, applications, agreements, affidavits | RL |
| G-02 | Official government / court forms linked (never rehosted) | RL |
| G-03 | Jurisdiction-aware content (state-specific stamp, registration, notes) | RL |
| G-04 | Preview in browser, download as .docx or .txt | RL |
| G-05 | Situation-led kits ("I am renting a house") | RL |
| G-06 | Audience centres (consumer, employee, tenant, etc.) | RL |
| G-07 | Cross-links: resource ↔ matter ↔ professional | RL, UX |
| G-08 | Admin review queue and link/hash monitors | RL |
| G-09 | Ingestion pipeline: seed → verify → harvest → promote (no auto-publish) | RL |
| G-10 | Cookie-scoped bookmarks (auth: real bookmarks) | RL |

## H · Legal knowledge

| ID | Requirement | Source |
|---|---|---|
| H-01 | Court browse with tier, seat, benches | PM |
| H-02 | Judge browse (no rating column ever) | PM |
| H-03 | Judgment library with practice-area links | PM |
| H-04 | Legal matter taxonomy: 6-level browse (domain → matter → forum) | MT |
| H-05 | Forums / tribunals / authorities index with escalation chains | MT |

## I · Platform

| ID | Requirement | Source |
|---|---|---|
| I-01 | Authentication (email, OTP, OAuth) | PM |
| I-02 | Roles: public, lawyer, firm-admin, firm-member, corporate, LPO, admin | PM |
| I-03 | RBAC on /admin and /admin/resources | PM, AR |
| I-04 | Rate limiting on public APIs | PM, AR |
| I-05 | Payments (bookings, subscriptions) with ledger | PM |
| I-06 | Notifications (in-app, email, SMS) tied to real backend events | PM |
| I-07 | Audit log for sensitive actions | PM |
| I-08 | Health, degraded-vs-ok contract, integrity check | AR |
| I-09 | CI pipeline: typecheck, tests, smoke, build | AR |
| I-10 | Analytics: search-event, resource-event, aggregate only | PM |

## J · UX (Practo-style simplicity)

| ID | Requirement | Source |
|---|---|---|
| J-01 | Homepage: ONE search bar visible above the fold | UX |
| J-02 | Header: five top-level items maximum | UX |
| J-03 | No dead controls, no dead ends | UX |
| J-04 | Back navigation preserves search filters | UX |
| J-05 | Every empty state offers three next actions | UX |
| J-06 | Consistent primary-CTA hierarchy per screen | UX |
| J-07 | Mobile-first responsive; no horizontal overflow at any breakpoint | UX |
| J-08 | 5-second test: first-time visitor understands the product | UX |
| J-09 | 1-minute test: "labour lawyer in Delhi" reachable in under a minute | UX |

Total: 90 discrete requirements across 10 areas.
