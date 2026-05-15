# M8A-V4.11 Follow-up Smoke Regression Diagnosis

Date: 2026-05-05
Status: diagnosis only; no runtime, smoke, or handoff fix applied

## Scope

This report records the post-commit regression check requested after commits
`40dcdf1`, `a93876f`, and `591e9c6`.

Target repo: `scenario-globe-viewer`.

Committed HEAD during the re-run:

```text
591e9c6 Sync VNext planning control after M8A V4.10 + V4.11 closeout
a93876f Close M8A V4.11 storyboard rewrite + Correction A reviewer gate
40dcdf1 Close M8A V4.10 product experience redesign
42d13f5 Record M8A V4.9 Slice 5 closeout hash
837ddc5 Close M8A V4.9 Slice 5 validation matrix
```

Before stashing, the repo-local working tree contained only the V4.7 fix
surface:

```text
 M tests/smoke/verify-m8a-v4.7-handover-product-ux-runtime.mjs
?? docs/sdd/m8a-v4.11-followup-v4.7-smoke-disposition-handoff.md
```

Those two paths were stashed before running the regression checks. The re-run
therefore used the committed post-`591e9c6` tree, which includes `a93876f`.

## Classification

Classification: **A**.

All six requested `npm run ...` commands still failed after the V4.7 fix was
stashed. V4.7 is therefore not the source of these failures.

Important split:

- V4.8, V4.9, V4.10 Slice 1, and V4.10 Slice 2 fail runtime assertions.
- V4.11 Conv 3 and Conv 4 fail before runtime because the requested npm
  aliases do not exist in `package.json`.

## Re-run Results

| Command | Result | First failure message |
| --- | --- | --- |
| `npm run test:m8a-v4.8` | fail | `Error: Browser Runtime.evaluate threw (line 4, column 11): Error: Every visible V4.8 product text node must have a valid info class: [{"text":"Current: W1 LEO primary review","parent":"div","infoClass":null}, ...]` |
| `npm run test:m8a-v4.9` | fail | `Error: V4.9 default-visible product text exposed denied metadata or long badges: {"visibleProductText":"13-satellite simulation view · Scale evidence (≥500 LEO) lives in Phase 7.1; this route remains a 13-actor bounded demo ...` |
| `npm run test:m8a-v4.10:slice1` | fail | `Error: Default desktop screenshot must visibly differ from the accepted V4.9 baseline: {"baselineStrip":{"left":736.96875,...},"currentStrip":{"left":340,...},"currentText":"focus · LEO"}` |
| `npm run test:m8a-v4.10:slice2` | fail | `Error: Default desktop screenshot must visibly differ from the accepted V4.9 baseline: {"baselineStrip":{"left":736.96875,...},"currentStrip":{"left":340,...},"currentText":"focus · LEO"}` |
| `npm run test:m8a-v4.11:conv3` | fail | `npm error Missing script: "test:m8a-v4.11:conv3"` |
| `npm run test:m8a-v4.11:conv4` | fail | `npm error Missing script: "test:m8a-v4.11:conv4"` |

## Failure Type

V4.8 is a DOM structural assertion failure, not a screenshot pixel diff and not
a setup/timing failure. The route reaches runtime and fails because visible text
nodes under the product UX root are not classified with
`data-m8a-v48-info-class`.

V4.9 is also a DOM/content-policy assertion failure. The route reaches runtime
and exposes default-visible product text that the V4.9 smoke still denies.

V4.10 Slice 1 and Slice 2 are geometry/visual-contract assertions, not pixel
diffs. The smokes compare current DOM rectangles against the accepted V4.9
baseline metadata. Both runs report the current strip at `left: 340`, while the
assertion expects the V4.10 controls to be much farther left
(`< 8%` of a 1440px viewport).

Conv 3 and Conv 4 are package-script drift failures. The smoke files exist and
the handoff docs cite direct `node tests/smoke/...` invocations, but the
requested npm aliases are absent.

## Root Cause Hypothesis

The V4.11 runtime introduced new first-read surfaces that were not reconciled
with older V4.8/V4.9/V4.10 regression contracts before the Slice 6 handoff
claimed the full matrix as green.

Observed evidence:

- The V4.11 left handover rail slots render visible text such as
  `Current: W1 LEO primary review`, `Candidate: none promoted in W1`, and
  `Time/Quality: simulated remaining time; modeled quality strong`.
- Those rail slot `<div>` elements do not carry `data-m8a-v48-info-class`,
  causing the V4.8 all-visible-text classification gate to fail.
- V4.9's default-visible text policy still rejects phrases such as
  `operator-family precision` and `Sim replay`, while V4.11 top/footer chips
  intentionally expose those strings as ambient disclosure.
- V4.10 Slice 1/2 still assert the V4.10 accepted first-viewport geometry
  delta from V4.9. Current V4.11 geometry uses the micro-cue `focus · LEO` and
  places the control strip at `left: 340`, so it no longer satisfies that
  legacy V4.10 visual contract.
- `package.json` has V4.11 slice and correction scripts, but no
  `test:m8a-v4.11:conv3` or `test:m8a-v4.11:conv4` aliases. The Conv 3/4
  handoffs list direct `node tests/smoke/...` checks instead.

This points to handoff/validation drift rather than a V4.7 regression.

## Fix Options

1. **Minimal backward-compat smoke repair**

   Add or update package aliases for Conv 3/4, add missing info-class
   attributes to V4.11 rail slots, and adjust V4.9 visible-text allowances for
   accepted V4.11 ambient footer/top-strip disclosures.

   Estimated cost: 0.5-1 day, plus full re-run of V4.8, V4.9, V4.10 Slice 1-5,
   V4.11 Conv 1-4, and V4.11 Slice 1-6.

2. **Restore V4.10 visual geometry contract**

   If V4.10 first-viewport geometry remains authoritative after V4.11, adjust
   runtime layout so the V4.10 strip and annotation geometry still satisfy the
   old baseline-difference assertion while preserving V4.11 reviewer changes.

   Estimated cost: 1-2 days because it risks V4.11 reviewer screenshots and
   should include visual/browser validation.

3. **Promote V4.11 design evolution and rewrite older smokes**

   If V4.11 intentionally supersedes V4.8/V4.9/V4.10 first-read layout, update
   older regression smokes to assert compatibility with the accepted V4.11
   successor surface instead of the old visible-text and geometry assumptions.

   Estimated cost: about 1 day, but requires an explicit control decision
   because it changes what "V4.8/V4.9/V4.10 pass" means.

4. **Full correction pass**

   Combine the package alias repair, smoke/runtime reconciliation, screenshot
   artifact cleanup, and a fresh validation matrix handoff.

   Estimated cost: 1-2 days depending on whether the V4.10 geometry contract is
   preserved or superseded.

## Handoff Claim Handling

The `a93876f` Slice 6 handoff claim that V4.8, V4.9, V4.10 Slice 1-5,
V4.11 Conv 1-4, and V4.11 Slice 1-6 were all PASS is not reproducible from
the requested npm-command re-run.

The honest path is to correct or qualify the all-green claim before continuing:

- If history is already shared, prefer an additive corrective commit that
  references this diagnosis, withdraws the unqualified all-green claim, applies
  the chosen fix, and records a fresh full-matrix re-run.
- If control owns the branch history and wants clean closeout commits, amend
  `a93876f` and any dependent `591e9c6` planning summary only after the fixes
  are made and the full matrix is re-run.

`591e9c6` is docs/planning-only by file scope; the reproducible mismatch lives
in the `a93876f` handoff claim plus the committed package/runtime/test state.

## Cleanup Notes

The V4.10 Slice 1/2 smokes rewrote `output/m8a-v4.10-slice1/` and
`output/m8a-v4.10-slice2/` artifacts before failing. Those generated changes
were restored after diagnosis so this report is the only intended new
diagnosis artifact.

No smoke, runtime, package script, or prior handoff file was fixed in this
diagnosis pass.
