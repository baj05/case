# SYSTEM_RELATIONSHIPS

The relationships that actually exist in the database and the UI today, plus
the ones that are intended and still missing.

Each edge lists: the **DB link** that stores it, the **UI surface** where the
user sees it, and the **API/service** that serves it.

## Core entity graph

```
LEGAL_DOMAIN ─┬─ PRACTICE_AREA ─┬─ LEGAL_MATTER ─┬─ LEGAL_ISSUE
              │                 │                ├─ LEGAL_MATTER_SERVICE ── MATTER_TYPE
              │                 │                ├─ LEGAL_MATTER_FORUM ─── FORUM ── (escalates_to) ── FORUM
              │                 │                └─ LEGAL_MATTER_SYNONYM
              │                 └─ PROFESSIONAL_PRACTICE_AREA ── PROFESSIONAL
              │
COURT ── PROFESSIONAL_COURT ── PROFESSIONAL
       └─ FORUM.court_id

PROFESSIONAL ─┬─ ENROLMENT ── PROFESSIONAL_BODY
              ├─ VERIFICATION
              ├─ PROFESSIONAL_LOCATION ── LOCATION
              ├─ PROFESSIONAL_LEGAL_MATTER ── LEGAL_MATTER
              ├─ FEE_SCHEDULE
              ├─ AVAILABILITY_RULE
              ├─ CONSULTATION_REQUEST
              ├─ BOOKING ── BOOKING_EVENT
              └─ CLAIM

RESOURCE ─┬─ RESOURCE_SOURCE
          ├─ LEGAL_DOMAIN
          ├─ PRACTICE_AREA
          ├─ LEGAL_MATTER
          ├─ FORUM / COURT
          ├─ JURISDICTION / LOCATION
          ├─ RESOURCE_FILE (with SHA-256 content_hash)
          ├─ RESOURCE_VERSION
          ├─ RESOURCE_VERIFICATION
          ├─ RESOURCE_RELATION (related / see_also / part_of_kit)
          └─ RESOURCE_COLLECTION_ITEM ── RESOURCE_COLLECTION (kits + centres)
```

## Edge inventory

| From → To | DB link | UI surface | Service | Status |
|---|---|---|---|---|
| LEGAL_DOMAIN → PRACTICE_AREA | practice_area.legal_domain_id | /matters, /matters/[domain] | listDomains, listMatters | LIVE |
| PRACTICE_AREA → LEGAL_MATTER | legal_matter.practice_area_id | /matters/[domain] | listMatters | LIVE |
| LEGAL_MATTER → LEGAL_ISSUE | legal_issue.legal_matter_id | /matters/[domain]/[matter] | getMatter | LIVE |
| LEGAL_MATTER → MATTER_TYPE (services) | legal_matter_service | matter detail "What a lawyer does" | getMatter | LIVE |
| LEGAL_MATTER → FORUM | legal_matter_forum | matter detail "Where it is heard" | getMatter | LIVE |
| FORUM → FORUM (escalation) | forum.escalates_to_id | matter + /forums | getMatter, listForums | LIVE |
| LEGAL_MATTER → PROFESSIONAL | professional_legal_matter | matter detail "Professionals listing …" | searchProfessionals(legalMatter) | LIVE |
| LEGAL_MATTER → RESOURCE | resource.legal_matter_id | matter detail "Documents and forms" | resourcesForMatter | LIVE |
| PROFESSIONAL → LEGAL_MATTER | professional_legal_matter | *pending* — profile section | (needs UI) | **MISSING → RT-005** |
| PROFESSIONAL → RESOURCE | via declared matters | *pending* — profile section | resourcesForMatter | **MISSING → RT-005** |
| PROFESSIONAL → COURT | professional_court | profile "Courts" | getProfileDetail | LIVE |
| PROFESSIONAL → PRACTICE_AREA | professional_practice_area | profile + search facets | getProfileDetail | LIVE |
| PROFESSIONAL → FEE_SCHEDULE | fee_schedule | profile fee card | listFees | LIVE |
| PROFESSIONAL → AVAILABILITY | availability_rule | profile calendar | generateSlots | LIVE |
| PROFESSIONAL → BOOKING | booking | /advocates/[slug]/book, /bookings/[ref] | createBooking | LIVE |
| PROFESSIONAL → CLAIM | claim | /advocates/[slug]/claim | createClaim | LIVE |
| RESOURCE → LEGAL_MATTER | resource.legal_matter_id | resource card badge, matter list | resourcesForMatter | LIVE |
| RESOURCE → PROFESSIONAL | *via matter* | resource detail could show "Get help" | derived | **PARTIAL → RT-017** |
| RESOURCE → RESOURCE_COLLECTION | resource_collection_item | /resources/kits/[slug] | getKit | LIVE |
| RESOURCE → RESOURCE_SOURCE | resource.resource_source_id | detail "Published by" | getResource | LIVE |
| USER → SAVED_ITEM / BOOKMARK | app_user / resource_bookmark | cookie today | — | **BLOCKED on auth I-01** |
| USER → MATTER | matter.owner_user_id | — | — | BLOCKED on auth |
| REFERRAL → MATTER | referral.matter_id | — | — | BLOCKED on auth |
| CORPORATE → PROFESSIONAL panel | organisation → org_member | — | — | BLOCKED on auth |
| JUDGE → JUDGMENT → PRACTICE_AREA | judgment_practice_area | /judges partial | listJudges | PARTIAL |
| ADMIN → ANY | audit_log.actor_user_id | /admin | — | BLOCKED on auth for real actor |

## The intent-to-resolution chain (the platform's spine)

```
User's own words
      │
      ▼
INTAKE CLASSIFIER (deterministic — intake.ts + taxonomy synonyms)
      │
      ├── detects LEGAL_MATTER  ─── legal_matter_synonym rows (943 total)
      ├── detects PRACTICE_AREA ─── practice_area_synonym rows
      ├── detects LOCATION       ─── location_alias rows
      ├── detects COURT          ─── court name/aliases
      └── detects URGENCY        ─── URGENT / EMERGENCY markers
      │
      ▼
SEARCH SERVICE
      │
      ├── shortlists PROFESSIONALs (bm25 + explainable ranking, 0 commercial factors)
      ├── filters by declared LEGAL_MATTERs when someone has claimed the matter
      ├── else broadens to declared PRACTICE_AREA
      └── surfaces RESOURCES for the same matter alongside
      │
      ▼
PROFILE
      │
      ├── shows COURTs, PRACTICE_AREAs, FEE, AVAILABILITY
      ├── shows related PROFESSIONALs
      └── (pending RT-005) shows RESOURCES for declared matters
      │
      ▼
ACTION
      │
      ├── CONSULTATION_REQUEST  → confirmation
      └── BOOKING              → BOOKING_EVENT + confirmation
```

This is the spine. Every screen the user sees should be a station on this path,
never a dead-end sibling.

## What is not-yet-connected but should be

- **Judgment ↔ practice area ↔ matter.** Schema exists; UI is thin. RT-008.
- **Referral graph.** Whole feature blocked on auth. Once auth lands, wire
  matter → find-counsel → search(legalMatter+not-me) → referral.
- **Corporate legal request → matter → engagement.** Same block.
- **Real bookmarks / saved searches.** Same block.
