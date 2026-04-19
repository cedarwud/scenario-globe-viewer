import {
  buildReplayClockEvaluation,
  runReplayClockValidation
} from "./verify-phase3.3-replay-clock-real-time.mjs";

await runReplayClockValidation({
  phaseLabel: "Phase 6.4 bootstrap handover decision",
  evaluationExpression: buildReplayClockEvaluation(`
    const readRect = (selector) => {
      const element = document.querySelector(selector);
      if (!(element instanceof HTMLElement)) {
        return null;
      }

      const rect = element.getBoundingClientRect();
      return {
        width: rect.width,
        height: rect.height,
        display: getComputedStyle(element).display
      };
    };

    const readText = (selector) => {
      const element = document.querySelector(selector);
      return element instanceof HTMLElement ? element.innerText.trim() : "";
    };

    const readDecisionSnapshot = () => {
      const root = document.querySelector('[data-handover-decision-panel="bootstrap"]');

      return {
        rootPresent: root instanceof HTMLElement,
        rootText: root instanceof HTMLElement ? root.innerText : "",
        statusPanel: readRect(".hud-panel--status"),
        decisionPanel: readRect('[data-handover-decision-panel="bootstrap"]'),
        rootScenarioId:
          root instanceof HTMLElement ? root.dataset.handoverScenarioId || null : null,
        rootEvaluatedAt:
          root instanceof HTMLElement ? root.dataset.handoverEvaluatedAt || null : null,
        rootDecisionKind:
          root instanceof HTMLElement ? root.dataset.handoverDecisionKind || null : null,
        rootServingCandidateId:
          root instanceof HTMLElement ? root.dataset.handoverServingCandidateId || null : null,
        rootTruthState:
          root instanceof HTMLElement ? root.dataset.handoverTruthState || null : null,
        rootPolicyId:
          root instanceof HTMLElement ? root.dataset.handoverPolicyId || null : null,
        rootProvenance:
          root instanceof HTMLElement ? root.dataset.handoverProvenance || null : null,
        rootReasonSignals:
          root instanceof HTMLElement ? root.dataset.handoverReasonSignals || null : null,
        rootSchemaVersion:
          root instanceof HTMLElement ? root.dataset.handoverSchemaVersion || null : null,
        rootProvenanceDetail:
          root instanceof HTMLElement ? root.dataset.handoverProvenanceDetail || null : null,
        heading: readText('[data-handover-field="heading"]'),
        note: readText('[data-handover-field="note"]'),
        decisionKind: readText('[data-handover-field="decisionKind"]'),
        servingCandidate: readText('[data-handover-field="servingCandidate"]'),
        servingOrbitClass: readText('[data-handover-field="servingOrbitClass"]'),
        previousCandidate: readText('[data-handover-field="previousCandidate"]'),
        reasons: readText('[data-handover-field="reasons"]'),
        provenance: readText('[data-handover-field="provenance"]'),
        provenanceTitle: (() => {
          const element = document.querySelector('[data-handover-field="provenance"]');
          return element instanceof HTMLElement ? element.title : "";
        })(),
        documentScenarioId: document.documentElement.dataset.handoverScenarioId || null,
        documentDecisionKind: document.documentElement.dataset.handoverDecisionKind || null,
        documentServingCandidateId:
          document.documentElement.dataset.handoverServingCandidateId || null,
        documentTruthState: document.documentElement.dataset.handoverTruthState || null,
        documentPolicyId: document.documentElement.dataset.handoverPolicyId || null,
        documentProvenance: document.documentElement.dataset.handoverProvenance || null,
        documentReasonSignals:
          document.documentElement.dataset.handoverReasonSignals || null,
        documentSchemaVersion:
          document.documentElement.dataset.handoverSchemaVersion || null,
        documentProvenanceDetail:
          document.documentElement.dataset.handoverProvenanceDetail || null
      };
    };

    const assertDecisionStateMatchesCapture = (label) => {
      const snapshot = readDecisionSnapshot();
      const selectedScenario = capture.scenarioSession.getCurrentScenario();
      const decisionState = capture.handoverDecision.getState();
      const replayState = capture.replayClock.getState();

      assert(snapshot.rootPresent, label + ": handover decision panel must exist.");
      assert(
        snapshot.statusPanel && snapshot.statusPanel.width > 0 && snapshot.statusPanel.height > 0,
        label + ": status panel must remain visible."
      );
      assert(
        snapshot.decisionPanel &&
          snapshot.decisionPanel.width > 0 &&
          snapshot.decisionPanel.height > 0,
        label + ": handover decision panel must remain visible."
      );
      assert(
        snapshot.rootScenarioId === selectedScenario.scenarioId &&
          snapshot.documentScenarioId === selectedScenario.scenarioId,
        label + ": handover decision UI must stay aligned with the active scenario id."
      );
      assert(
        snapshot.rootEvaluatedAt === decisionState.snapshot.evaluatedAt,
        label + ": handover decision evaluatedAt dataset must stay aligned with repo-owned state."
      );
      assert(
        snapshot.rootDecisionKind === decisionState.result.decisionKind &&
          snapshot.documentDecisionKind === decisionState.result.decisionKind,
        label + ": handover decision kind datasets must stay aligned with repo-owned state."
      );
      assert(
        snapshot.rootTruthState === decisionState.result.semanticsBridge.truthState &&
          snapshot.documentTruthState === decisionState.result.semanticsBridge.truthState,
        label + ": truth-state bridge datasets must stay aligned with repo-owned state."
      );
      assert(
        snapshot.rootServingCandidateId === (decisionState.result.servingCandidateId ?? "") &&
          snapshot.documentServingCandidateId ===
            (decisionState.result.servingCandidateId ?? ""),
        label + ": serving candidate datasets must stay aligned with repo-owned state."
      );
      assert(
        snapshot.rootPolicyId === decisionState.snapshot.policyId &&
          snapshot.documentPolicyId === decisionState.snapshot.policyId,
        label + ": policy id datasets must stay aligned with repo-owned state."
      );
      assert(
        snapshot.rootProvenance === "bounded-proxy" &&
          snapshot.documentProvenance === "bounded-proxy" &&
          snapshot.provenance === "bounded-proxy",
        label + ": bounded proxy provenance must stay explicit."
      );
      assert(
        snapshot.rootProvenanceDetail === decisionState.provenance.detail &&
          snapshot.documentProvenanceDetail === decisionState.provenance.detail &&
          snapshot.provenanceTitle === decisionState.provenance.detail &&
          /bounded proxy inputs; not final network truth/i.test(snapshot.note) &&
          /not measured latency, jitter, or throughput truth/i.test(
            decisionState.provenance.detail
          ),
        label + ": bounded proxy disclaimer must stay explicit about the non-truth boundary."
      );
      assert(
        snapshot.rootSchemaVersion === "phase6.4-bootstrap-handover-decision-report.v1" &&
          snapshot.documentSchemaVersion ===
            "phase6.4-bootstrap-handover-decision-report.v1",
        label + ": handover decision report schema must stay stable and visible."
      );
      assert(
        snapshot.heading === "Decision State",
        label + ": decision heading must stay repo-owned."
      );
      assert(
        !/itu|rain|antenna|validation|nat|tunnel|measured/i.test(snapshot.rootText),
        label + ": first Phase 6.4 slice must not imply 6.5+/6.6 live integrations."
      );
      assert(
        normalizeTimestampMs(decisionState.snapshot.activeRange.start) ===
          normalizeTimestampMs(replayState.startTime) &&
          normalizeTimestampMs(decisionState.snapshot.activeRange.stop) ===
            normalizeTimestampMs(replayState.stopTime),
        label + ": decision snapshot range must stay aligned with the replay-clock range."
      );
      JSON.stringify(decisionState);

      return {
        snapshot,
        decisionState
      };
    };

    const click = async (selector) => {
      const element = document.querySelector(selector);
      assert(element instanceof HTMLElement, "Missing control: " + selector);
      element.click();
      await sleep(200);
    };

    const setScenario = async (value) => {
      const select = document.querySelector('[data-operator-control="scenario"]');
      assert(select instanceof HTMLSelectElement, "Missing scenario select.");
      select.value = value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      await sleep(220);
    };

    const seekIso = async (value) => {
      capture.replayClock.seek(value);
      await sleep(180);
    };

    const initial = assertDecisionStateMatchesCapture("initial");
    assert(
      initial.decisionState.result.decisionKind === "hold" &&
        initial.snapshot.decisionKind === "Hold",
      "Initial handover decision must hold the seeded serving candidate."
    );
    assert(
      initial.decisionState.result.reasonSignals.some(
        (signal) => signal.code === "policy-hold"
      ) && /Hold/.test(initial.snapshot.reasons),
      "Initial handover decision must expose a visible hold reason without leaking policy wording."
    );

    await seekIso("2026-04-19T08:32:00.000Z");
    const switched = assertDecisionStateMatchesCapture("after mid-range seek");
    assert(
      switched.decisionState.result.decisionKind === "switch" &&
        switched.snapshot.rootTruthState === "switching" &&
        switched.snapshot.rootReasonSignals ===
          "latency-better,jitter-better,network-speed-better",
      "Mid-range seek must expose a deterministic switch with explicit better-metric reasons."
    );

    await seekIso("2026-04-19T08:51:00.000Z");
    const missingCurrent = assertDecisionStateMatchesCapture("after late-range seek");
    assert(
      missingCurrent.snapshot.rootReasonSignals === "current-link-unavailable",
      "Late-range seek must expose the missing current-link reason when the serving candidate drops out."
    );

    await click('[data-operator-control="mode"][data-operator-mode="prerecorded"]');
    await setScenario("site");

    const switchedScenario = assertDecisionStateMatchesCapture(
      "after site prerecorded switch"
    );
    assert(
      switchedScenario.decisionState.snapshot.scenarioId === "bootstrap-site-prerecorded",
      "Handover decision snapshot must follow bootstrap scenario selection changes."
    );
    assert(
      switchedScenario.decisionState.snapshot.policyId === "bootstrap-balanced-v1",
      "Handover decision snapshot must keep the fixed repo-owned policy id."
    );

    return {
      initialKind: initial.decisionState.result.decisionKind,
      switchKind: switched.decisionState.result.decisionKind,
      lateReasons: missingCurrent.snapshot.rootReasonSignals,
      switchedScenarioId: switchedScenario.decisionState.snapshot.scenarioId
    };
  `)
});
