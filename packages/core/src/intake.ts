/**
 * Legal intake classifier.
 *
 * Turns a sentence a worried non-lawyer would actually type into a structured
 * brief: practice area, matter type, location, court, urgency.
 *
 * Deliberately DETERMINISTIC — a scored keyword/synonym matcher, not an LLM.
 * Three reasons: it is explainable (we can show the user why we routed them),
 * it cannot hallucinate legal advice, and it runs in under a millisecond with
 * no API dependency. An LLM may later ENRICH this, never replace the audit
 * trail. See docs/DECISIONS.md ADR-006 and COMPLIANCE_MATRIX.md C-17.
 */
import { fold } from './text.ts';

export interface IntakeVocabulary {
  practiceAreas: Array<{ id: number; code: string; name: string; slug: string; synonyms: Array<{ phrase: string; weight: number }> }>;
  locations: Array<{ id: number; name: string; slug: string; level: number; aliases: string[] }>;
  courts: Array<{ id: number; name: string; shortName: string | null; slug: string; tier: number; aliases: string[] }>;
  matterTypes: Array<{ id: number; code: string; name: string; slug: string; synonyms: string[] }>;
}

export interface IntakeMatch<T> { value: T; confidence: number; matchedOn: string }

export interface IntakeResult {
  rawQuery: string;
  practiceArea: IntakeMatch<{ id: number; code: string; name: string; slug: string }> | null;
  alternativePracticeAreas: Array<IntakeMatch<{ id: number; code: string; name: string; slug: string }>>;
  location: IntakeMatch<{ id: number; name: string; slug: string; level: number }> | null;
  court: IntakeMatch<{ id: number; name: string; slug: string; tier: number }> | null;
  matterType: IntakeMatch<{ id: number; code: string; name: string; slug: string }> | null;
  urgency: 'normal' | 'urgent' | 'emergency';
  /** True when the text reads like a described problem rather than a keyword. */
  isNaturalLanguage: boolean;
  /** Plain-language restatement shown back to the user for confirmation. */
  interpretation: string;
  residualTerms: string[];
}

const URGENT_MARKERS = ['urgent', 'urgently', 'immediately', 'asap', 'tomorrow', 'deadline', 'last date', 'time barred', 'limitation'];
const EMERGENCY_MARKERS = ['arrested', 'in custody', 'detained', 'police station', 'today', 'raid', 'sealed', 'eviction notice', 'bail'];
const MATTER_HINTS: Array<[string, string[]]> = [
  ['CONSULT', ['consult', 'consultation', 'advice', 'talk to', 'speak to', 'guidance']],
  ['REVIEW', ['review', 'check my', 'look at my', 'vet']],
  ['DRAFT', ['draft', 'prepare', 'make an agreement', 'write a']],
  ['NOTICE', ['legal notice', 'send notice', 'notice to']],
  ['REPRESENT', ['represent', 'appear', 'court case', 'hearing', 'file a case', 'fight my case']],
  ['LOCAL_COUNSEL', ['local counsel', 'local advocate', 'on my behalf in', 'appearance in']],
  ['OPINION', ['opinion', 'written opinion']],
  ['COMPLIANCE', ['compliance', 'registration', 'returns', 'filing']],
  ['AUDIT', ['audit']],
  ['RESEARCH', ['research', 'case law', 'precedent']],
];

/** Longer phrases score higher: matching "pf not deposited" beats "pf". */
function phraseScore(haystack: string, phrase: string, weight: number): number {
  const p = fold(phrase);
  if (!p) return 0;
  const isWordish = p.includes(' ');
  const hit = isWordish
    ? haystack.includes(p)
    : new RegExp(`(^|\\s)${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s|$)`).test(haystack);
  if (!hit) return 0;
  const lengthBonus = Math.min(6, p.split(' ').length * 2);
  return weight + lengthBonus;
}

export function classifyIntake(rawQuery: string, vocab: IntakeVocabulary): IntakeResult {
  const q = fold(rawQuery);
  const words = q.split(' ').filter(Boolean);

  // ---- practice area -------------------------------------------------------
  const paScores = new Map<number, { score: number; matchedOn: string; ref: IntakeVocabulary['practiceAreas'][number] }>();
  for (const pa of vocab.practiceAreas) {
    let best = 0;
    let matchedOn = '';
    for (const syn of pa.synonyms) {
      const s = phraseScore(q, syn.phrase, syn.weight);
      if (s > best) { best = s; matchedOn = syn.phrase; }
    }
    const nameScore = phraseScore(q, pa.name, 8);
    if (nameScore > best) { best = nameScore; matchedOn = pa.name; }
    if (best > 0) paScores.set(pa.id, { score: best, matchedOn, ref: pa });
  }
  const ranked = [...paScores.values()].sort((a, b) => b.score - a.score);
  const topScore = ranked[0]?.score ?? 0;
  const toMatch = (e: (typeof ranked)[number]) => ({
    value: { id: e.ref.id, code: e.ref.code, name: e.ref.name, slug: e.ref.slug },
    confidence: Math.min(1, e.score / 16),
    matchedOn: e.matchedOn,
  });
  const practiceArea = ranked[0] ? toMatch(ranked[0]) : null;
  // Show alternatives only when they are genuinely competitive.
  const alternativePracticeAreas = ranked
    .slice(1, 4)
    .filter((e) => e.score >= topScore * 0.55)
    .map(toMatch);

  // ---- court (before location: "jabalpur high court" must not be eaten by
  //      the location matcher grabbing "jabalpur") --------------------------
  let court: IntakeResult['court'] = null;
  let courtSpan = '';
  {
    let best = 0;
    for (const c of vocab.courts) {
      for (const cand of [c.name, c.shortName ?? '', ...c.aliases]) {
        const s = phraseScore(q, cand, 10);
        if (s > best) {
          best = s;
          courtSpan = fold(cand);
          court = { value: { id: c.id, name: c.name, slug: c.slug, tier: c.tier }, confidence: Math.min(1, s / 18), matchedOn: cand };
        }
      }
    }
  }

  // ---- location -----------------------------------------------------------
  // Remove the matched court phrase so "advocate for Jabalpur High Court"
  // still resolves the city, but a court name never wins twice.
  const locHaystack = courtSpan ? q.replace(courtSpan, ' ') : q;
  let location: IntakeResult['location'] = null;
  {
    let best = 0;
    for (const l of vocab.locations) {
      for (const cand of [l.name, ...l.aliases]) {
        // Deeper (more specific) locations win ties: a city beats its state.
        const s = phraseScore(locHaystack, cand, 8 + l.level);
        if (s > best) {
          best = s;
          location = { value: { id: l.id, name: l.name, slug: l.slug, level: l.level }, confidence: Math.min(1, s / 16), matchedOn: cand };
        }
      }
    }
  }
  // A court implies its own seat when the user named no other place.
  if (!location && court) {
    const seat = vocab.locations.find((l) => fold(court.value.name).includes(fold(l.name)) && l.level >= 4);
    if (seat) location = { value: { id: seat.id, name: seat.name, slug: seat.slug, level: seat.level }, confidence: 0.5, matchedOn: `implied by ${court.value.name}` };
  }

  // ---- matter type --------------------------------------------------------
  let matterType: IntakeResult['matterType'] = null;
  {
    let best = 0;
    for (const [code, hints] of MATTER_HINTS) {
      for (const h of hints) {
        const s = phraseScore(q, h, 8);
        if (s > best) {
          const mt = vocab.matterTypes.find((m) => m.code === code);
          if (mt) {
            best = s;
            matterType = { value: { id: mt.id, code: mt.code, name: mt.name, slug: mt.slug }, confidence: Math.min(1, s / 14), matchedOn: h };
          }
        }
      }
    }
  }

  // ---- urgency ------------------------------------------------------------
  let urgency: IntakeResult['urgency'] = 'normal';
  if (EMERGENCY_MARKERS.some((m) => q.includes(fold(m)))) urgency = 'emergency';
  else if (URGENT_MARKERS.some((m) => q.includes(fold(m)))) urgency = 'urgent';

  // ---- shape --------------------------------------------------------------
  // Pronouns and verbs signal a described problem rather than a keyword search.
  const isNaturalLanguage =
    words.length >= 4 &&
    /\b(my|i|me|we|our|has|have|is|are|not|didn t|won t|cannot|can t|need|want|should)\b/.test(q);

  const consumed = new Set<string>();
  for (const phrase of [practiceArea?.matchedOn, location?.matchedOn, court?.matchedOn, matterType?.matchedOn]) {
    if (phrase) for (const w of fold(phrase).split(' ')) consumed.add(w);
  }
  const STOP = new Set(['a','an','the','in','at','for','of','to','my','me','i','we','our','is','are','has','have','need','want','with','and','or','near','who','that','from','on','be','it','not','do','does']);
  const residualTerms = [...new Set(words.filter((w) => w.length > 2 && !consumed.has(w) && !STOP.has(w)))];

  return {
    rawQuery,
    practiceArea,
    alternativePracticeAreas,
    location,
    court,
    matterType,
    urgency,
    isNaturalLanguage,
    interpretation: describe(practiceArea, location, court, matterType, urgency),
    residualTerms,
  };
}

function describe(
  pa: IntakeResult['practiceArea'],
  loc: IntakeResult['location'],
  court: IntakeResult['court'],
  mt: IntakeResult['matterType'],
  urgency: IntakeResult['urgency'],
): string {
  if (!pa && !loc && !court) return 'Showing all listed legal professionals.';
  const bits: string[] = [];
  bits.push(pa ? `${pa.value.name} professionals` : 'Legal professionals');
  if (mt) bits.push(`for ${mt.value.name.toLowerCase()}`);
  if (court) bits.push(`practising before ${court.value.name}`);
  else if (loc) bits.push(`in ${loc.value.name}`);
  if (urgency === 'emergency') bits.push('— treated as urgent');
  else if (urgency === 'urgent') bits.push('— time-sensitive');
  return `${bits.join(' ')}.`;
}
