import { test } from "node:test";
import { strict as assert } from "node:assert";

import {
  classifyLiteral,
  scanText,
  extractStringLiterals,
  isNegated,
} from "../../scripts/helpers/over-claim-scan.mjs";

// --- The gate must FLAG genuine asserting over-claims (proves it is not vacuous) ---

test("asserting over-claim literals are flagged", () => {
  assert.deepEqual(classifyLiteral("Operator-validated link to OneWeb"), {
    term: "operator-validated",
  });
  assert.deepEqual(classifyLiteral("Measured throughput 184 Mbps"), {
    term: "measured",
  });
  assert.deepEqual(classifyLiteral("Active serving satellite over Taiwan"), {
    term: "active serving",
  });
  assert.deepEqual(classifyLiteral("Field-tested RF link margin"), {
    term: "field-tested",
  });
});

// --- The gate must ALLOW honest negation / disclosure text ---

test("negated / disclosure literals are allowed", () => {
  assert.equal(classifyLiteral("Source-lineaged actors, not active serving satellites."), null);
  assert.equal(classifyLiteral("No measured latency, jitter, or throughput is shown."), null);
  assert.equal(classifyLiteral("Measured communication time is not claimed."), null);
  assert.equal(classifyLiteral("Needs measured local weather for the link."), null);
  assert.equal(classifyLiteral("measured-for-link/R0.01 still missing"), null);
});

test("source-citation URLs are allowed even with a term in the path", () => {
  assert.equal(
    classifyLiteral("https://www.speedcast.com/.../tier-4-certified-teleports/"),
    null
  );
});

test("non-matching literals return null", () => {
  assert.equal(classifyLiteral("Connected . Stable route"), null); // phrasing, not a hard term (documented gate limit)
  assert.equal(classifyLiteral("modeled-precision link budget"), null);
  assert.equal(classifyLiteral("measurement-grade clock"), null); // 'measurement' != 'measured'
});

// --- String-literal extraction excludes comments + identifiers ---

test("scanText only sees quoted string literals, not comments or identifiers", () => {
  // term in a comment -> no string literal -> not flagged
  assert.equal(scanText("// this is measured data from the operator").length, 0);
  // term in an identifier (not quoted) -> not flagged
  assert.equal(scanText("const measuredThroughputClaimed = false;").length, 0);
  // term in a rendered string literal -> flagged
  const hits = scanText('el.textContent = "Measured throughput for this pair";');
  assert.equal(hits.length, 1);
  assert.equal(hits[0].term, "measured");
});

test("extractStringLiterals handles single, double, backtick", () => {
  assert.deepEqual(extractStringLiterals(`a = "x"; b = 'y'; c = \`z\`;`), ["x", "y", "z"]);
});

test("isNegated detects word-boundary cues without false positives", () => {
  assert.equal(isNegated("not measured"), true);
  assert.equal(isNegated("no active serving"), true);
  assert.equal(isNegated("now measured live"), false); // 'now' must not match 'no'
  assert.equal(isNegated("note: measured"), false); // 'note' must not match 'not'
});
