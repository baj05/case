/**
 * State/UT emblem ticker data.
 *
 * Most emblems are the actual state seals, sourced from Wikimedia Commons via
 * https://en.wikipedia.org/wiki/List_of_Indian_state_emblems (2026-08-21) and
 * saved under public/img/emblems/<jurisdiction-code>.png|jpg. Shown here purely
 * factually — next to the name of the state a document on this page actually
 * comes from — never as a certification, partnership or endorsement badge.
 *
 * Arunachal Pradesh, Goa and Nagaland have no distinct seal on that Wikipedia
 * page, but each state's own official portal displays its own crest (pulled
 * directly from arunachalpradesh.gov.in, goa.gov.in and nagaland.gov.in) — used
 * here instead of a text fallback. Lakshadweep's own portal uses the plain
 * National Emblem of India as its logo, so that is what is shown for it.
 */
export interface StateEmblem {
  code: string;   // matches INDIA_STATES / jurisdiction code, e.g. 'IN-MH'
  name: string;
  file: string; // filename under /img/emblems/
}

export const STATE_EMBLEMS: StateEmblem[] = [
  { code: 'IN-AP', name: 'Andhra Pradesh', file: 'IN-AP.png' },
  { code: 'IN-AR', name: 'Arunachal Pradesh', file: 'IN-AR.png' },
  { code: 'IN-AS', name: 'Assam', file: 'IN-AS.png' },
  { code: 'IN-BR', name: 'Bihar', file: 'IN-BR.png' },
  { code: 'IN-CT', name: 'Chhattisgarh', file: 'IN-CT.png' },
  { code: 'IN-GA', name: 'Goa', file: 'IN-GA.png' },
  { code: 'IN-GJ', name: 'Gujarat', file: 'IN-GJ.png' },
  { code: 'IN-HR', name: 'Haryana', file: 'IN-HR.png' },
  { code: 'IN-HP', name: 'Himachal Pradesh', file: 'IN-HP.png' },
  { code: 'IN-JH', name: 'Jharkhand', file: 'IN-JH.png' },
  { code: 'IN-KA', name: 'Karnataka', file: 'IN-KA.png' },
  { code: 'IN-KL', name: 'Kerala', file: 'IN-KL.png' },
  { code: 'IN-MP', name: 'Madhya Pradesh', file: 'IN-MP.png' },
  { code: 'IN-MH', name: 'Maharashtra', file: 'IN-MH.png' },
  { code: 'IN-MN', name: 'Manipur', file: 'IN-MN.png' },
  { code: 'IN-ML', name: 'Meghalaya', file: 'IN-ML.png' },
  { code: 'IN-MZ', name: 'Mizoram', file: 'IN-MZ.png' },
  { code: 'IN-NL', name: 'Nagaland', file: 'IN-NL.png' },
  { code: 'IN-OR', name: 'Odisha', file: 'IN-OR.png' },
  { code: 'IN-PB', name: 'Punjab', file: 'IN-PB.png' },
  { code: 'IN-RJ', name: 'Rajasthan', file: 'IN-RJ.png' },
  { code: 'IN-SK', name: 'Sikkim', file: 'IN-SK.png' },
  { code: 'IN-TN', name: 'Tamil Nadu', file: 'IN-TN.png' },
  { code: 'IN-TG', name: 'Telangana', file: 'IN-TG.png' },
  { code: 'IN-TR', name: 'Tripura', file: 'IN-TR.png' },
  { code: 'IN-UP', name: 'Uttar Pradesh', file: 'IN-UP.png' },
  { code: 'IN-UK', name: 'Uttarakhand', file: 'IN-UK.png' },
  { code: 'IN-WB', name: 'West Bengal', file: 'IN-WB.png' },
  { code: 'IN-AN', name: 'Andaman & Nicobar Islands', file: 'IN-AN.png' },
  { code: 'IN-CH', name: 'Chandigarh', file: 'IN-CH.png' },
  { code: 'IN-DH', name: 'Dadra & Nagar Haveli and Daman & Diu', file: 'IN-DH.png' },
  { code: 'IN-DL', name: 'Delhi', file: 'IN-DL.png' },
  { code: 'IN-JK', name: 'Jammu & Kashmir', file: 'IN-JK.png' },
  { code: 'IN-LA', name: 'Ladakh', file: 'IN-LA.png' },
  { code: 'IN-LD', name: 'Lakshadweep', file: 'IN-LD.png' },
  { code: 'IN-PY', name: 'Puducherry', file: 'IN-PY.png' },
];
