# Compliance matrix — India

**Status: NOT LEGAL ADVICE.** This is an engineer's risk register, written to make the legal questions explicit
and to record which product features are gated on which answer. Every row marked *requires review* must be signed
off by an Indian advocate before the corresponding feature flag is enabled.

The architecture assumption throughout: **compliance posture must be changeable without rebuilding the system.**
Every gated feature is behind a flag whose gate note is stored in the database and rendered in `/admin`.

## Legend

| Verdict | Meaning |
|---|---|
| ✅ Built, defensible | Implemented, with controls described |
| ⚠️ Built, gated | Code and schema exist, flag OFF pending review |
| ⛔ Not built by design | Deliberately absent; enabling requires a migration, not a config change |

---

| # | Feature | Legal question | Verdict | Controls implemented |
|---|---|---|---|---|
| C-01 | Listing advocates from public registers | Advocates Act 1961; BCI Rules Ch. II Part VI r.36 constrains **advocates** advertising/soliciting. A third-party directory compiling an official register is not the advocate advertising. Risk is that the platform is characterised as soliciting on their behalf. | ✅ | No superlatives, no "top/best", no rankings for sale, no comparison claims. Every listing states its source and that inclusion is not endorsement. Opt-out honoured immediately. |
| C-02 | Crawling barcouncilofindia.org | Contract (terms of use), CFAA-equivalents, IT Act s.43. | ✅ | robots.txt fetched, parsed and obeyed per request; only `/info/sbc` and `/info/sbc-members/*`, both permitted. Rate limited to 1 req/host with ≥2 s delay. Identifying UA with contact address. 403 treated as stop. Internal/admin API routes never touched. Terms review note stored on the source row. |
| C-03 | Republishing names, roles, Bar Council | DPDP Act 2023 s.3(c)(ii) excludes personal data the data principal has made publicly available, or that is published under a legal obligation. A statutory register is a strong fit. | ✅ | Provenance on every field; freshness dates; correction and erasure routes; audit log. |
| C-04 | Republishing **residential addresses** | Publicly accessible ≠ proportionate to republish. Elevated harm (safety, doxxing). | ⛔ | Stored in `private_residence`, admin-only, never rendered. Excluded from search index and from `PUBLIC_COLUMNS`. |
| C-05 | Republishing **personal mobile / personal email** | As C-04. Also nuisance-contact risk. | ⛔ | `private_phone` / `private_email`. Used solely to score claim authenticity. Never rendered. |
| C-06 | Publishing chamber / office address | Professional, not domestic. | ✅ | Rendered as `public_office`. |
| C-07 | Public/private field discipline | Data minimisation, DPDP s.6(1). | ✅ | Enforced at the query layer: `profile.ts` selects an explicit `PUBLIC_COLUMNS` list. A private field cannot reach a page by accident. |
| C-08 | Advocate photographs | Copyright in the photograph; personality rights. | ⚠️ | Official portraits published by the regulator, copied to our origin (avoids leaking visitor IPs to the source), original URL retained. **Requires review**: licence to republish is not established. Withdraw on request. |
| C-09 | **Reviews of named advocates** | Defamation (civil and BNS); BCI conduct rules on comparison/solicitation; DPDP basis for publishing reviewer data; risk of reviewer disclosing privileged matter detail. | ⚠️ **OFF** | Schema complete: review binds to a verified interaction (`consultation_request_id`/`appointment_id`/`matter_id`), carries `moderation_status`, grants right of reply via `review_response`, reportable via `content_report`. Flag `FEATURE_REVIEWS=false`. |
| C-10 | **Anonymous / pseudonymous reviews** | Materially higher risk than attributed: intermediary may be compelled to identify the author; no accountability. | ⚠️ **OFF** | `display_mode` supports pseudonymous display while **always** retaining identity internally. Separate flag `FEATURE_ANONYMOUS_REVIEWS`, off. Should not be enabled before C-09. |
| C-11 | **Lawyer-to-lawyer referral** | Fee-sharing with non-advocates and touting are constrained. A platform taking a cut of a referred matter is the dangerous shape. | ⚠️ **OFF** | `referral` table has **no fee, commission or percentage column** — deliberately. Modelled as professional collaboration. Requires `client_consent_at` before full brief is disclosed; only a redacted `teaser` is visible pre-acceptance. |
| C-12 | Collecting consultation fees | Whether the platform holds client money; fee-sharing analysis; PA/PSP rules. | ⚠️ **OFF** | `FEATURE_PAYMENTS=false`. Site states fees are set and collected by the professional directly. Ledger schema exists (`ledger_entry`, append-only, minor units). |
| C-13 | **Paid ranking / featured placement** | Even if lawful, it corrodes the trust the product depends on and edges toward soliciting for advocates. | ⛔ **Permanent** | `plan.grants_ranking_boost` is `CHECK (grants_ranking_boost = 0)`. Ranking weights contain no commercial factor and are published at `/how-it-works`. A unit test asserts no commercial key exists. Enabling requires a migration + code change, both reviewable. |
| C-14 | **Rating or scoring judges** | Contempt exposure; judicial independence; the brief itself rules it out. | ⛔ | `judge` table has no rating/score/sentiment column, with a comment saying why. Factual fields only. |
| C-15 | Judgment database | Government works — s.52(1)(q) Copyright Act permits reproduction of judgments. | ⚠️ Not populated | Schema present; no ingestion adapter yet. Cite neutral citation and link the source. |
| C-16 | Matter/enquiry confidentiality | Privilege (BSA 2023 s.132 equivalents of Evidence Act s.126); DPDP security obligation. | ✅ | `consultation_request.summary` and `matter.brief` are excluded from every search index by construction, and from analytics by an explicit allowlist. Site warns users not to send privileged detail. |
| C-17 | Plain-language intake routing | Risk of the platform appearing to give legal advice, or an LLM hallucinating advice. | ✅ | Deterministic weighted-synonym classifier — **not** a language model. Output is a category and a jurisdiction, never guidance. Interpretation shown to the user for correction. **No generative document or advisory text anywhere in the product — absolute, and unchanged.** |
| C-17a | AI extraction of document field values from a user's own free text | Same risk as C-17, but the act is different: reading values out of text the user wrote, not composing text for them. | ⚠️ Flag-gated, **off by default** | `FEATURE_AI_FIELD_EXTRACT`. Extraction only: the JSON schema handed to the model is generated from the template's own declared fields, with `additionalProperties: false` and no field for clause or document text, so there is no channel by which model-authored prose can reach a document. Every returned value is re-validated server-side by the same `normaliseFieldValue` a typed value goes through, and anything containing placeholder syntax is dropped. **Confirmation is mandatory** — extraction never writes the form; it proposes values the user accepts, edits or ignores one at a time, and only accepted values are substituted. Low-confidence rows default to unchecked. Telemetry stores counts only, never the prose or the extracted values. See ADR-013. |
| C-18 | Grievance redressal | DPDP s.13 requires a mechanism; IT Rules require a Grievance Officer. | ⚠️ Partial | `data_request` table with 30-day clock and admin queue. **Named officer required before launch.** |
| C-19 | Erasure vs withholding | Erasure is irreversible; withholding is instant and reversible. | ✅ | `applyOptOut` unpublishes, deletes the search doc and the suggest entry, and writes an audit entry — immediately. Erasure is a separate, deliberate admin act. |
| C-20 | Editorial imagery | Copyright. | ✅ | Openly licensed works only, filtered to licences permitting commercial use **and modification** (no ND, since CSS cropping is arguably a derivative). Attribution rendered at `/credits`. |
| C-21 | International expansion | Each jurisdiction has its own advertising/referral regime (SRA, ABA Model Rules 7.2, etc.). | ✅ Architecture ready | `country.is_launched` gates public pages; `jurisdiction`, `professional_body` and `court` are all data, not code. Only India is launched. |

---

## Flags and their gates

Mirrored into the `feature_flag` table and rendered in `/admin`, so the legal position is visible to whoever is
operating the platform rather than buried in a `.env` file.

| Flag | Default | Gate |
|---|---|---|
| `FEATURE_REVIEWS` | off | C-09 |
| `FEATURE_ANONYMOUS_REVIEWS` | off | C-10, after C-09 |
| `FEATURE_PAYMENTS` | off | C-12 |
| `FEATURE_REFERRALS` | off | C-11 |
| `FEATURE_PAID_RANKING` | **permanently off** | C-13 — schema-constrained |
| `FEATURE_AI_INTAKE` | on | C-17 — deterministic only |
| `FEATURE_AI_FIELD_EXTRACT` | **off** | C-17a — extraction only, human-confirmed |
| `FEATURE_CORPORATE` | on | Document builder and corporate tenants |
| `FEATURE_INGEST_LIVE` | on | C-02 |
| `FEATURE_MEDIATION` / `ARBITRATION` / `CONTRACT_SAAS` | off | Phase 3 |

## Open questions for counsel

1. **C-08** — is republishing the regulator's official portraits licensed? If not, monograms only.
2. **C-09** — can a review platform for advocates operate in India at all, and if so must reviews be attributed?
3. **C-11** — can a no-fee referral network operate without being characterised as touting?
4. **C-12** — does routing a consultation fee through the platform constitute fee-sharing?
5. **C-01** — does a directory that lets an advocate configure availability cross from information into solicitation?
6. Is a DPDP **Significant Data Fiduciary** designation plausible at scale, and what would it add?
