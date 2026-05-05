# M8A-V4.11 Slice 6 Before/After Comparison

Status: comparison completed from existing V4.10 baseline screenshots and
Conv 1-4 / Slice 1-5 final artifacts. No runtime code, CSS, or product UI was
changed for this comparison.

## Evidence inventory

V4.10 baseline screenshots:

- `output/m8a-v4.10-slice5/v4.10-slice5-default-1440x900.png`
- `output/m8a-v4.10-slice5/v4.10-slice5-details-open-1440x900.png`
- `output/m8a-v4.10-slice5/v4.10-slice5-boundary-open-1440x900.png`
- `output/m8a-v4.10-slice5/v4.10-slice5-transition-leo-aging-pressure-1440x900.png`

V4.11 final screenshots and manifests:

- Conv 1 visual tokens: `output/m8a-v4.11-conv1/v4.11-conv1-w1-1440x900.png`
  through `v4.11-conv1-w5-1440x900.png`
- Conv 2 hover/countdown/inspector:
  `output/m8a-v4.11-conv2/*.png`
- Conv 3 footer/truth-removal:
  `output/m8a-v4.11-conv3/*.png`
- Conv 4 source demotion:
  `output/m8a-v4.11-conv4/conv4-smoke-manifest.json` (no Conv 4 PNG
  artifact was present)
- Slice 1 glance surface:
  `output/m8a-v4.11-slice1/v4.11-slice1-default-1440x900.png`
- Slice 2 hover:
  `output/m8a-v4.11-slice2/*.png`
- Slice 3 pinned inspector:
  `output/m8a-v4.11-slice3/v4.11-w1-pinned-1440x900.png`
- Slice 4 transition toasts:
  `output/m8a-v4.11-slice4/*.png`
- Slice 5 final Sources advanced path:
  `output/m8a-v4.11-slice5/v4.11-sources-advanced-toggle-1440x900.png`

## Reviewer first-read visible differences

This section records reviewer first-read differences only; it is not a
substitute for reviewer transcripts.

| Area | V4.10 baseline | Final V4.11 route after Conv 4 | Reviewer first-read impact |
| --- | --- | --- | --- |
| Primary scene cue | Large narrative/strip language competed with the satellite and made the screen read like a debug overlay. | Slice 1/Conv 1 reduce the satellite-near cue to short role chips and add window-specific visual tokens. | Reviewer has a smaller "what to watch" target and less long prose before answering Q1/Q2. |
| Focus actor | V4.10 relied mostly on narrative text and sequence state. | Conv 1 adds per-window visual tokens: W1 rising arc, W2 fading arc, W3 800km disk, W4 candidate pulse, W5 steady GEO ring. | The active orbit class is more visually separable for Q2. |
| Simulation disclosure | V4.10 hid important non-claim context behind a Truth button. | Conv 3 removes the Truth button and moves disclosure to footer `[模擬展示]`, with W5 `不是實際備援切換證據`. | Q4 can be answered from the first viewport without opening Details. |
| Source provenance | V4.10 kept source provenance inside Details/Truth paths. | Conv 3/4 make the footer `TLE: CelesTrak NORAD GP · 2026-04-26` chip the first-read source path; Sources is advanced evidence. | Q5 can be answered without opening Details. |
| Sources | V4.10/Slice 5-era paths exposed Sources through first-read provenance/ground chips. | Conv 4 demotes Sources to Details advanced `Source provenance`; glance chips are no longer source openers. | Reviewers are not trained to open Details for cold questions; evidence archive stays available after first-read. |
| Hover explanation | V4.10 had no real hover explanation path. | Conv 2 adds phase-specific 3-line hover copy for satellites, ground stations, and rail marks. | Optional hover helps exploration, but the Slice 6 cold questions cannot depend on it. |
| Countdown/next state | V4.10 depended on sequence rail movement and copy. | Conv 2 adds a simulated countdown with `~ 為模擬推演值`; Conv 3 footer retains disclosure. | Q3 has a stronger next-moment cue while preserving simulation boundaries. |
| Inspector | V4.10 split Details and Truth into separate competing controls. | Conv 2/3/4 converge on State Evidence plus truth tail; Sources is an advanced toggle. | First-read questions no longer require old Details + Truth concurrency. |
| Transition feedback | V4.10 transition was easy to miss if the reviewer did not watch the rail. | Slice 4 adds transient toasts and scene cues for W2-W5 transitions. | A reviewer following the 60x replay has a visible event cue for window changes. |
| Real-data surfacing | V4.10 buried much of the actor/source/evidence context. | Slice 1/Conv 1/Conv 3 expose orbit chips, ground `LEO MEO GEO ✓` chips, footer TLE chip, and actor count. | The route reads more like a product surface than a hidden evidence dump. |

## Comparison conclusion

The screenshot/artifact comparison supports that the final V4.11 route is
visibly different from the V4.10 baseline in the places the protocol asks
reviewers to read first: active state, focus orbit, next moment, simulation
boundary, and TLE source provenance.

This comparison is not reviewer evidence. Closeout still requires at least
three fresh protocol-valid reviewer transcripts.
