# M8A-V4.11 Slice 0 Reviewer-Comprehension Protocol

Use this protocol cold against the V4.10 baseline route, then against the
current V4.11 route:
`/?scenePreset=regional&m8aV4GroundStationScene=1`.

Conv 4 revision: the current V4.11 route has no standalone Truth button.
Disclosure is the footer `[模擬展示]` chip, W5
`不是實際備援切換證據`, and the State Evidence truth tail. Reviewers should
not open Details for the five cold questions; Sources is an advanced
source-provenance toggle inside Details, not a first-read affordance.

## Reviewer Profile Self-Check

- [ ] I have not previously seen this route.
- [ ] I have not read any V4 SDD before this session.
- [ ] I know what "satellite handover" means at a layperson level.
- [ ] I can read the visible Chinese chips and the retained terms
      `TLE / CelesTrak NORAD GP`.
- [ ] I agree to think aloud during the session.

## Session Format

- Viewport: 1440×900 desktop, full Cesium UI shown.
- Replay: starts at default load, then plays at 60× through all five windows.
- Duration: ≤6 minutes per reviewer.
- Moderator: silent except for reading the questions.
- Recording: text transcript only; no audio/video required.
- Privacy: no PII recorded.

## Question Order

Ask the five questions in order for each window before moving to the next
window.

| Window | Ask in this order |
| --- | --- |
| W1 `leo-acquisition-context` | 1. What is happening right now?<br>2. Which satellite or orbit should I be looking at?<br>3. Where does the next moment go?<br>4. Is this real operator data or simulation?<br>5. Where do the satellite positions come from? |
| W2 `leo-aging-pressure` | 1. What is happening right now?<br>2. Which satellite or orbit should I be looking at?<br>3. Where does the next moment go?<br>4. Is this real operator data or simulation?<br>5. Where do the satellite positions come from? |
| W3 `meo-continuity-hold` | 1. What is happening right now?<br>2. Which satellite or orbit should I be looking at?<br>3. Where does the next moment go?<br>4. Is this real operator data or simulation?<br>5. Where do the satellite positions come from? |
| W4 `leo-reentry-candidate` | 1. What is happening right now?<br>2. Which satellite or orbit should I be looking at?<br>3. Where does the next moment go?<br>4. Is this real operator data or simulation?<br>5. Where do the satellite positions come from? |
| W5 `geo-continuity-guard` | 1. What is happening right now?<br>2. Which satellite or orbit should I be looking at?<br>3. Where does the next moment go?<br>4. Is this real operator data or simulation?<br>5. Where do the satellite positions come from? |

## Scoring Rubric

- 5 / 5: reviewer answered all five within 30s without opening Details.
- 4 / 5: reviewer needed one prompt or got one question wrong but answered the others quickly.
- ≤3 / 5: window failed for that reviewer.

## Answer Examples From SDD

Q1. What is happening right now?

- Acceptable: "現在看這顆 LEO", "位置條件變差", "MEO 暫時接住",
  "新的 LEO 是候選", "GEO 是保底覆蓋"
- Unacceptable: silence ≥10s, "I don't know", or asking the moderator for context

Q2. Which satellite or orbit should I be looking at?

- Acceptable: pointing at the active satellite, its orbit chip, or saying
  "現在看這顆"
- Unacceptable: pointing at the wrong orbit, pointing at a control panel, or asking moderator

Q3. Where does the next moment go?

- Acceptable: reading the "Next:" line or the next sequence-rail mark
- Unacceptable: "I don't know", referring to time only ("in a minute")

Q4. Is this real operator data or simulation?

- Acceptable: reading `[模擬展示]`, saying "這是模擬展示", or on W5
  reading "不是實際備援切換證據"
- Unacceptable: "I think it's real" / unsure

Q5. Where do the satellite positions come from?

- Acceptable: reading `TLE / CelesTrak NORAD GP` or `CelesTrak NORAD GP`
  out loud from the footer chip
- Unacceptable: opening Details to look it up, "I don't know"

## Session Record

- Reviewer signature: ______________________________
- Session start time: ______________________________
- Session end time: ________________________________
