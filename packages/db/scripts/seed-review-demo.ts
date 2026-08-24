#!/usr/bin/env node
/**
 * Demo data for the Review Trust Engine.
 *
 * Per the product brief's own rule (§46-49): dummy reviews are allowed for
 * development, but they must never be attached to a REAL Bar Council
 * advocate's record — that would put fabricated feedback next to a real
 * named professional. So this creates a clearly-marked, fictional set of
 * advocates, law firms and LPO providers of its own (source
 * 'demo-review-fixtures'), and only ever reviews those. Every ingested,
 * real professional in the database is untouched.
 *
 * Deliberately varied distribution — not everyone is 4.9/5.0 — because a
 * platform where every professional looks excellent looks fake (§48).
 *
 *   node packages/db/scripts/seed-review-demo.ts            seed
 *   node packages/db/scripts/seed-review-demo.ts --clear     remove
 */
import { parseArgs } from 'node:util';
import { db, now, transaction, isInitialised } from '../src/client.ts';
import { slugify } from '../src/ids.ts';
import { createUser, AuthError } from '../src/repositories/auth.ts';
import { createReview, createOrganisationReview, moderateReview, respondToReview, voteHelpful } from '../src/repositories/reviews.ts';

const { values } = parseArgs({ options: { clear: { type: 'boolean', default: false } } });

if (!isInitialised()) {
  process.stderr.write('Database not initialised. Run `npm run ingest` first.\n');
  process.exit(1);
}

const h = db();
const DEMO_SOURCE_CODE = 'demo-review-fixtures';

if (values.clear) {
  transaction(() => {
    const src = h.prepare(`SELECT id FROM source WHERE code = ?`).get(DEMO_SOURCE_CODE) as { id: number } | undefined;
    if (src) {
      const profIds = (h.prepare(`SELECT id FROM professional WHERE source_id = ?`).all(src.id) as Array<{ id: number }>).map((r) => r.id);
      for (const id of profIds) {
        h.prepare(`DELETE FROM review_edit_history WHERE review_id IN (SELECT id FROM review WHERE professional_id = ?)`).run(id);
        h.prepare(`DELETE FROM review_vote WHERE review_id IN (SELECT id FROM review WHERE professional_id = ?)`).run(id);
        h.prepare(`DELETE FROM review_response WHERE review_id IN (SELECT id FROM review WHERE professional_id = ?)`).run(id);
        h.prepare(`DELETE FROM review WHERE professional_id = ?`).run(id);
        h.prepare(`DELETE FROM booking WHERE professional_id = ?`).run(id);
      }
      h.prepare(`DELETE FROM professional WHERE source_id = ?`).run(src.id);
    }
    h.prepare(`DELETE FROM review_edit_history WHERE review_id IN (SELECT id FROM review WHERE organisation_id IN (SELECT id FROM organisation WHERE slug LIKE 'demo-%'))`).run();
    h.prepare(`DELETE FROM review_vote WHERE review_id IN (SELECT id FROM review WHERE organisation_id IN (SELECT id FROM organisation WHERE slug LIKE 'demo-%'))`).run();
    h.prepare(`DELETE FROM review_response WHERE review_id IN (SELECT id FROM review WHERE organisation_id IN (SELECT id FROM organisation WHERE slug LIKE 'demo-%'))`).run();
    h.prepare(`DELETE FROM review WHERE organisation_id IN (SELECT id FROM organisation WHERE slug LIKE 'demo-%')`).run();
    h.prepare(`DELETE FROM organisation WHERE slug LIKE 'demo-%'`).run();
    h.prepare(`DELETE FROM app_user WHERE email LIKE '%@demo-reviewer.example'`).run();
  });
  process.stdout.write('Demo review fixtures removed.\n');
  process.exit(0);
}

const ts = now();
let src = h.prepare(`SELECT id FROM source WHERE code = ?`).get(DEMO_SOURCE_CODE) as { id: number } | undefined;
if (!src) {
  const r = h.prepare(
    `INSERT INTO source (code, name, publisher, base_url, authority, coverage_note, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?)`,
  ).run(
    DEMO_SOURCE_CODE, 'Review system demo fixtures', 'CaseADVO (internal)', 'https://example.internal/demo',
    'self_declared',
    'Entirely fictional advocates created ONLY to demonstrate the review trust engine locally. '
    + 'Never a real Bar Council record — see docs/REVIEW_RESEARCH.md.',
    ts, ts,
  );
  src = { id: Number(r.lastInsertRowid) };
}

function reviewer(email: string, fullName: string) {
  try {
    return createUser({ email, fullName, password: 'demo-reviewer-pass-1' });
  } catch (e) {
    if (e instanceof AuthError && e.code === 'EMAIL_TAKEN') {
      return h.prepare(`SELECT id, email, full_name AS fullName, platform_role AS platformRole, email_verified_at AS emailVerifiedAt FROM app_user WHERE email = ?`).get(email) as never;
    }
    throw e;
  }
}

const admin = h.prepare(`SELECT id FROM app_user WHERE platform_role = 'platform_admin' LIMIT 1`).get() as { id: number } | undefined;
if (!admin) {
  process.stderr.write('No platform_admin account exists yet — run packages/db/scripts/create-admin.ts first.\n');
  process.exit(1);
}

const jurisdictionByCode = (code: string) => (h.prepare(`SELECT id FROM jurisdiction WHERE code = ?`).get(code) as { id: number }).id;
const practiceAreaBySlug = (slug: string) => (h.prepare(`SELECT id FROM practice_area WHERE slug = ?`).get(slug) as { id: number } | undefined)?.id ?? null;

const REVIEW_BODIES = {
  positive: [
    'Communication was clear throughout the consultation, and the process was explained clearly at every step.',
    'Very responsive — replied to messages quickly and the documentation was well organised.',
    'Professional approach from start to finish. The consultation started on time and next steps were explained clearly.',
    'Excellent experience overall. Clear communication and a genuinely professional manner throughout.',
    'Explained the process clearly and was responsive whenever I had questions. Would recommend for this kind of matter.',
  ],
  mixed: [
    'Good advice overall, but there were some response delays between messages that took longer than expected.',
    'The consultation itself was professional, though scheduling took a couple of attempts to sort out.',
    'Clear communication for the most part, though the documentation could have been a little more organised.',
  ],
  negative: [
    'Response delays were frustrating — took several days to hear back after the initial consultation.',
    'Scheduling was difficult and the appointment had to be rescheduled twice before it happened.',
  ],
  professional: [
    'Worked together on a cross-jurisdiction referral. Communication and coordination were smooth throughout.',
    'Handled the referral professionally — responsive and clear about next steps for the local counsel handover.',
  ],
  corporate: [
    'Handled our contract review matter with clear documentation and strong project management throughout.',
    'Good commercial understanding of our business and responsive communication during a tight deadline.',
  ],
  lpoBody: [
    'Turnaround on the PF compliance filings was within the agreed SLA and communication was clear throughout.',
    'Quality of the document review deliverables was strong, though a couple of files arrived a day later than planned.',
  ],
};

interface AdvocateSpec { name: string; jurisdictionCode: string; practiceAreaSlug: string; reviewCount: number; qualityMix: [number, number, number]; }
const ADVOCATES: AdvocateSpec[] = [
  { name: 'Meera Kapoor', jurisdictionCode: 'IN-DL', practiceAreaSlug: 'corporate-commercial', reviewCount: 14, qualityMix: [11, 2, 1] },
  { name: 'Rohan Vaidya', jurisdictionCode: 'IN-MH', practiceAreaSlug: 'labour-employment', reviewCount: 12, qualityMix: [8, 3, 1] },
  { name: 'Ananya Iyer', jurisdictionCode: 'IN-KA', practiceAreaSlug: 'insolvency-bankruptcy', reviewCount: 11, qualityMix: [7, 2, 2] },
  { name: 'Vikram Sethi', jurisdictionCode: 'IN-WB', practiceAreaSlug: 'contracts', reviewCount: 10, qualityMix: [6, 3, 1] },
  { name: 'Diya Bhatt', jurisdictionCode: 'IN-GJ', practiceAreaSlug: 'provident-fund', reviewCount: 10, qualityMix: [9, 1, 0] },
  { name: 'Karan Chowdhury', jurisdictionCode: 'IN-UP', practiceAreaSlug: 'employees-state-insurance', reviewCount: 8, qualityMix: [5, 2, 1] },
  { name: 'Ishaan Malhotra', jurisdictionCode: 'IN-RJ', practiceAreaSlug: 'labour-compliance', reviewCount: 6, qualityMix: [4, 2, 0] },
  { name: 'Tara Nair', jurisdictionCode: 'IN-TN', practiceAreaSlug: 'workplace-harassment-posh', reviewCount: 3, qualityMix: [3, 0, 0] },
  { name: 'Aditya Rao', jurisdictionCode: 'IN-PB', practiceAreaSlug: 'corporate-commercial', reviewCount: 1, qualityMix: [1, 0, 0] },
  { name: 'Simran Kaur', jurisdictionCode: 'IN-HR', practiceAreaSlug: 'contracts', reviewCount: 0, qualityMix: [0, 0, 0] },
  { name: 'Nikhil Bansal', jurisdictionCode: 'IN-DL', practiceAreaSlug: 'insolvency-bankruptcy', reviewCount: 13, qualityMix: [9, 3, 1] },
  { name: 'Priya Deshmukh', jurisdictionCode: 'IN-MH', practiceAreaSlug: 'contracts', reviewCount: 10, qualityMix: [6, 3, 1] },
  { name: 'Arnav Khanna', jurisdictionCode: 'IN-KA', practiceAreaSlug: 'labour-employment', reviewCount: 9, qualityMix: [5, 3, 1] },
  { name: 'Fatima Sheikh', jurisdictionCode: 'IN-TG', practiceAreaSlug: 'workplace-harassment-posh', reviewCount: 7, qualityMix: [6, 1, 0] },
  { name: 'Devansh Oberoi', jurisdictionCode: 'IN-RJ', practiceAreaSlug: 'provident-fund', reviewCount: 2, qualityMix: [2, 0, 0] },
];

let reviewerCounter = 0;
function nextReviewer(kind: 'client' | 'lawyer' | 'corporate') {
  reviewerCounter += 1;
  const email = `${kind}-${reviewerCounter}@demo-reviewer.example`;
  return reviewer(email, `${kind === 'client' ? 'Client' : kind === 'lawyer' ? 'Advocate' : 'Counsel'} Reviewer ${reviewerCounter}`);
}

let bookingCounter = 900000;
let published = 0, pending = 0, flagged = 0;

for (const spec of ADVOCATES) {
  const countryId = 1; // IN
  const jurisdictionId = jurisdictionByCode(spec.jurisdictionCode);
  const slug = `demo-${slugify(spec.name)}`;
  const fullName = spec.name;
  const existing = h.prepare(`SELECT id FROM professional WHERE slug = ?`).get(slug) as { id: number } | undefined;
  let professionalId: number;
  if (existing) {
    professionalId = existing.id;
  } else {
    const r = h.prepare(
      `INSERT INTO professional (
         kind, slug, full_name, normalised_name, display_name, country_id, primary_jurisdiction_id,
         body_role, verification_level, claim_status, is_published, data_confidence, accepts_consultations,
         source_id, created_at, updated_at
       ) VALUES ('advocate',?,?,?,?,?,?, 'advocate',2,'claimed',1,60,1, ?, ?,?)`,
    ).run(slug, fullName, fullName.toLowerCase(), fullName, countryId, jurisdictionId, src.id, ts, ts);
    professionalId = Number(r.lastInsertRowid);
    const paId = practiceAreaBySlug(spec.practiceAreaSlug);
    if (paId) {
      h.prepare(`INSERT INTO professional_practice_area (professional_id, practice_area_id, is_primary, is_self_declared, created_at) VALUES (?,?,1,1,?)`)
        .run(professionalId, paId, ts);
    }
  }

  const [good, mid, bad] = spec.qualityMix;
  const plan: Array<'positive' | 'mixed' | 'negative'> = [
    ...Array(good).fill('positive'), ...Array(mid).fill('mixed'), ...Array(bad).fill('negative'),
  ];

  plan.forEach((quality, i) => {
    bookingCounter += 1;
    const isLawyerReview = i === plan.length - 1 && plan.length >= 8; // one lawyer-to-lawyer review on well-reviewed profiles
    const rev = nextReviewer(isLawyerReview ? 'lawyer' : 'client');
    const bookingRef = `BK-DEMO${bookingCounter}`;
    h.prepare(
      `INSERT INTO booking (id, reference, professional_id, client_user_id, client_name, client_email,
         starts_at_utc, ends_at_utc, mode, brief, terms_ack_at, status, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    ).run(bookingCounter, bookingRef, professionalId, rev.id, rev.fullName, rev.email, ts, ts, 'video', 'demo fixture', ts, 'completed', ts, ts);

    const bodyPool = isLawyerReview ? REVIEW_BODIES.professional : REVIEW_BODIES[quality];
    const body = bodyPool[i % bodyPool.length];
    const overall = quality === 'positive' ? (4 + (i % 2)) : quality === 'mixed' ? 3 : 2;
    const displayMode = i % 5 === 0 ? 'anonymous' : i % 3 === 0 ? 'pseudonymous' : 'attributed';

    const result = createReview({
      professionalId, authorUserId: rev.id, bookingId: bookingCounter,
      displayMode, reviewerType: isLawyerReview ? 'lawyer' : 'client',
      ratings: {
        communication: Math.min(5, overall + (i % 2)), responsiveness: overall,
        professionalism: Math.min(5, overall + 1), processClarity: overall,
        overallSatisfaction: overall,
      },
      wouldRecommend: quality === 'negative' ? 'no' : quality === 'mixed' ? 'maybe' : 'yes',
      body,
    });

    if (result.moderationStatus === 'auto_flagged') { flagged += 1; return; }
    if (i === plan.length - 1 && quality !== 'positive') {
      // leave one non-glowing review pending, so the moderation queue has
      // real, varied content to demonstrate rather than everything pre-published.
      pending += 1;
      return;
    }
    moderateReview(result.id, admin.id, 'published', 'demo fixture — auto-published for local walkthrough');
    published += 1;
    if (quality === 'negative') {
      respondToReview(result.id, admin.id, 'Thank you for the feedback — we have taken steps to improve response times and will follow up directly.');
      h.exec(`UPDATE review_response SET moderation_status='published' WHERE review_id=${result.id}`);
    }
    if (i % 2 === 0) voteHelpful(result.id, admin.id, 1);
  });
}

// --- law firms and LPO providers ---------------------------------------
interface OrgSpec { name: string; kind: 'law_firm' | 'lpo'; reviewCount: number; verifiedShare: number; }
const ORGS: OrgSpec[] = [
  { name: 'Northbridge Legal Chambers', kind: 'law_firm', reviewCount: 9, verifiedShare: 0.6 },
  { name: 'Ashwell & Rao Partners', kind: 'law_firm', reviewCount: 6, verifiedShare: 0.5 },
  { name: 'Meridian Corporate Advisors', kind: 'law_firm', reviewCount: 2, verifiedShare: 1 },
  { name: 'ClearPath Compliance Services', kind: 'lpo', reviewCount: 11, verifiedShare: 0.7 },
  { name: 'Vantage Legal Process Solutions', kind: 'lpo', reviewCount: 5, verifiedShare: 0.4 },
  { name: 'Anchorline LPO', kind: 'lpo', reviewCount: 0, verifiedShare: 0 },
  { name: 'Fernhill Legal Group', kind: 'law_firm', reviewCount: 8, verifiedShare: 0.5 },
  { name: 'Bellweather LPO Services', kind: 'lpo', reviewCount: 7, verifiedShare: 0.6 },
  { name: 'Whitlock & Associates', kind: 'law_firm', reviewCount: 5, verifiedShare: 0.4 },
  { name: 'Ridgeline Process Outsourcing', kind: 'lpo', reviewCount: 4, verifiedShare: 0.5 },
];

let orgReviewCounter = 0;
for (const spec of ORGS) {
  const slug = `demo-${slugify(spec.name)}`;
  const existing = h.prepare(`SELECT id FROM organisation WHERE slug = ?`).get(slug) as { id: number } | undefined;
  let orgId: number;
  const emailDomain = `${slugify(spec.name)}.example`;
  if (existing) {
    orgId = existing.id;
  } else {
    const r = h.prepare(
      `INSERT INTO organisation (kind, name, slug, country_id, email_domain, domain_verified_at, verification_level, created_at, updated_at)
       VALUES (?,?,?,1,?,?,?,?,?)`,
    ).run(spec.kind, spec.name, slug, emailDomain, ts, 2, ts, ts);
    orgId = Number(r.lastInsertRowid);
  }

  for (let i = 0; i < spec.reviewCount; i += 1) {
    orgReviewCounter += 1;
    const isVerified = i < Math.round(spec.reviewCount * spec.verifiedShare);
    const rev = isVerified
      ? reviewer(`legal-${orgReviewCounter}@${emailDomain}`, `Corporate Counsel ${orgReviewCounter}`)
      : nextReviewer('corporate');
    const quality: 'positive' | 'mixed' = i % 4 === 3 ? 'mixed' : 'positive';
    const bodyPool = spec.kind === 'lpo' ? REVIEW_BODIES.lpoBody : REVIEW_BODIES.corporate;
    const overall = quality === 'positive' ? 4 + (i % 2) : 3;

    const result = createOrganisationReview({
      organisationId: orgId, authorUserId: rev.id,
      displayMode: i % 4 === 0 ? 'anonymous' : 'attributed', reviewerType: 'corporate_legal_team',
      experienceCategory: 'legal_matter',
      ratings: {
        communication: overall, responsiveness: Math.min(5, overall + (i % 2)),
        professionalism: Math.min(5, overall + 1), processClarity: overall, overallSatisfaction: overall,
      },
      wouldRecommend: quality === 'positive' ? 'yes' : 'maybe',
      body: bodyPool[i % bodyPool.length],
    });
    if (result.moderationStatus === 'auto_flagged') continue;
    moderateReview(result.id, admin.id, 'published', 'demo fixture — auto-published for local walkthrough');
  }
}

process.stdout.write(
  `Seeded ${ADVOCATES.length} demo advocates and ${ORGS.length} demo organisations.\n`
  + `Reviews: ${published} published, ${pending} pending, ${flagged} auto-flagged.\n`
  + `Advocate slugs: ${ADVOCATES.map((a) => `demo-${slugify(a.name)}`).join(', ')}\n`
  + `Organisation slugs: ${ORGS.map((o) => `demo-${slugify(o.name)}`).join(', ')}\n`,
);
