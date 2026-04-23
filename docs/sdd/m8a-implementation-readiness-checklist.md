# M8A Implementation Readiness Checklist

Source note: this file is the pre-implementation gate for `M8A`. Its job is to
stop the repo from starting nearby-second-endpoint code work before the new
expansion planning surface has fully converged.

Related M8A spine: see
[./m8a-nearby-second-endpoint-expansion-plan.md](./m8a-nearby-second-endpoint-expansion-plan.md).
Related expansion authority: see
[../../../itri/multi-orbit/m8-expansion-authority.md](../../../itri/multi-orbit/m8-expansion-authority.md).
Related program skeleton: see
[./multi-orbit-program-skeleton.md](./multi-orbit-program-skeleton.md).

## Status

- Closed planning gate reference
- No implementation authority by itself
- Applies only to the first `M8A` reopen path
- Gates `M8A.2+` runtime work, not `M8A.1` package curation

## Gate Scope

`M8A.1` is the pre-runtime second-endpoint package curation slice.

This checklist is intentionally **not** the gate for starting `M8A.1`.

This checklist is the gate that must pass before any `M8A.2+` runtime /
expression / satcom-info implementation begins.

## Gate Questions

Before any `M8A.2+` implementation begins, all of the following must be true.

### A. Expansion Boundary

- [ ] `M8A` is still defined as `nearby-second-endpoint expansion`, not
      arbitrary global endpoint selection
- [ ] the first-case north-star guardrails remain unchanged
- [ ] no second operator pair or `MEO` exploratory work has been mixed into the
      same reopen

### B. Second-Endpoint Authority Package

- [ ] one accepted second-endpoint package exists under
      `itri/multi-orbit/download/nearby-second-endpoints/<package_id>/`
- [ ] the package clearly ties the endpoint to the accepted first-corridor
      geography
- [ ] the package provides machine-readable identity + precision
- [ ] the package contains explicit non-claims

### C. Runtime Ownership

- [ ] the runtime ownership plan is explicit about keeping endpoint B as
      `provider-managed-anchor`
- [ ] the nearby second endpoint is defined as an additional runtime seam, not
      a rewrite of first-case seed semantics
- [ ] the future seam is still first-case-only and not a global registry

### D. Viewer Expression

- [ ] the expression plan names what is animated and what stays static
- [ ] the relation cue is explicitly bounded presentation only
- [ ] no planned expression implies active gateway, GEO teleport, or sat-path
      truth

### E. Satcom Info

- [ ] the satcom-info widening is supplemental, not a generic multi-case control
      UI
- [ ] the allowed facts are explicitly listed
- [ ] the forbidden facts are explicitly listed

## Stop Conditions

Do not start `M8A.2+` implementation if any of the following is true:

- the second endpoint is still only a verbal idea with no accepted package
- the runtime plan silently repurposes endpoint B
- the expression plan depends on generic arbitrary endpoint selection
- the satcom-info plan depends on measurement-style claims
- `MEO` language has already entered the first `M8A` reopen lane

## Exit Condition

`M8A` is ready to start `M8A.2+` runtime implementation only when every
checklist item above can be answered `yes`.

At that point, the repo may open the first `M8A.2` implementation slice.
