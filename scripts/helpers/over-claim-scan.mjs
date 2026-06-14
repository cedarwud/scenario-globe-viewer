// Over-claim wording scanner (honesty regression guard).
//
// PURPOSE: the procurement acceptance demo ships under an honesty iron rule -- modeled /
// standard-derived / publicly-derived values must NOT be presented to a viewer as
// measured / operator-validated / field-tested / active-serving. The existing
// verify-phase0 neutral-wording gate only bans the literal customer name; it does
// NOT guard provenance over-claims. This module adds that guard.
//
// SCOPE + LIMITATION (deliberate, documented):
//  - It scans QUOTED STRING LITERALS only (single/double/backtick). That excludes
//    code comments and identifiers automatically -- only rendered-text candidates
//    are considered. Multi-line template literals split across physical lines are
//    matched per-line; a hard term + its negation must share one line to be paired.
//  - It catches HARD provenance TERMS (operator-validated, measured, active-serving,
//    field-tested, as-built, certified, guaranteed). It does NOT catch phrasing /
//    omitted-qualifier over-claims ("Connected . Stable route", bare "Available",
//    bare "Mbps", "strong link quality") -- those are semantic and need human review
//    / the inline-qualifier rule in the evidence-legibility SDD, not a term gate.
//  - A hard term inside a NEGATION/DISCLOSURE literal ("not measured", "no active
//    serving", "...is not claimed", "= false" flag identifiers are not quoted so are
//    skipped) is allowed -- that is honest disclosure text, which the demo uses
//    heavily and correctly.
//
// A genuinely honest asserting use (e.g. a contrast column header "Modeled vs
// Measured") must be added to scripts/over-claim-allowlist.json with a reason, which
// forces a human review rather than silently passing.

export const OVER_CLAIM_TERMS = [
  'operator-validated',
  'operator validated',
  'active serving',
  'active-serving',
  'actively serving',
  'field-tested',
  'field tested',
  'as-built',
  'as built',
  'certified',
  'guaranteed',
  'measured',
];

// Word-boundary negation / disclosure cues. If any appears in the same string
// literal as the over-claim term, the literal is treated as honest disclosure.
const NEGATION_CUE_PATTERNS = [
  /\bnot\b/i,
  /\bno\b/i,
  /\bnone\b/i,
  /\bnever\b/i,
  /\bwithout\b/i,
  /\bcannot\b/i,
  /\bneither\b/i,
  /\bnor\b/i,
  /\bexcludes?\b/i,
  /\blacks?\b/i,
  /\bpending\b/i,
  /\bunverified\b/i,
  /\bneeds?\b/i, // "Needs measured local weather..." = gap statement
  /\bmissing\b/i, // "...still missing" = gap statement
  /n't\b/i, // isn't / aren't / don't
  /\bnon-/i,
  /\bun-/i,
];

// Match a string literal: "...", '...', `...`. Captures the inner content.
// Greedy-safe per delimiter; backslash-escaped delimiters are tolerated loosely.
const STRING_LITERAL_PATTERN = /"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g;

export function extractStringLiterals(line) {
  const literals = [];
  let match;
  STRING_LITERAL_PATTERN.lastIndex = 0;
  while ((match = STRING_LITERAL_PATTERN.exec(line)) !== null) {
    const inner = match[1] ?? match[2] ?? match[3] ?? '';
    if (inner.length > 0) {
      literals.push(inner);
    }
  }
  return literals;
}

export function isNegated(literal) {
  return NEGATION_CUE_PATTERNS.some((pattern) => pattern.test(literal));
}

export function findOverClaimTerm(literal) {
  const lower = literal.toLowerCase();
  for (const term of OVER_CLAIM_TERMS) {
    if (term === 'measured') {
      // Word-boundary for the high-frequency term to avoid "measurement" etc.
      if (/\bmeasured\b/i.test(literal)) {
        return term;
      }
      continue;
    }
    if (lower.includes(term)) {
      return term;
    }
  }
  return null;
}

// Classify one string literal. Returns { term } for an asserting over-claim,
// or null for honest / non-matching literals.
export function classifyLiteral(literal) {
  const term = findOverClaimTerm(literal);
  if (term === null) {
    return null;
  }
  // URLs are source citations, not provenance prose -- a path segment like
  // "tier-4-certified-teleports" in a press-release link is not a viewer claim.
  const trimmed = literal.trim();
  if (/^https?:\/\//i.test(trimmed) || trimmed.includes('://')) {
    return null;
  }
  if (isNegated(literal)) {
    return null;
  }
  return { term };
}

// Scan a whole file's text. Returns array of { line, column, term, literal }.
export function scanText(text) {
  const findings = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    for (const literal of extractStringLiterals(line)) {
      const verdict = classifyLiteral(literal);
      if (verdict !== null) {
        findings.push({
          line: i + 1,
          term: verdict.term,
          literal: literal.length > 200 ? `${literal.slice(0, 200)}...` : literal,
        });
      }
    }
  }
  return findings;
}
