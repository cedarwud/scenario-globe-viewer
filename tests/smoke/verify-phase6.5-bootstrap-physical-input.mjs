import {
  buildReplayClockEvaluation,
  runReplayClockValidation
} from "./verify-phase3.3-replay-clock-real-time.mjs";

await runReplayClockValidation({
  phaseLabel: "Phase 6.5 bootstrap physical input projection",
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

    const readPhysicalSnapshot = () => {
      const root = document.querySelector('[data-physical-input-panel="bootstrap"]');

      return {
        rootPresent: root instanceof HTMLElement,
        rootText: root instanceof HTMLElement ? root.innerText : "",
        statusPanel: readRect(".hud-panel--status"),
        physicalPanel: readRect('[data-physical-input-panel="bootstrap"]'),
        rootScenarioId:
          root instanceof HTMLElement ? root.dataset.physicalScenarioId || null : null,
        rootEvaluatedAt:
          root instanceof HTMLElement ? root.dataset.physicalEvaluatedAt || null : null,
        rootContextLabel:
          root instanceof HTMLElement ? root.dataset.physicalContextLabel || null : null,
        rootFamilies:
          root instanceof HTMLElement ? root.dataset.physicalFamilies || null : null,
        rootSchemaVersion:
          root instanceof HTMLElement ? root.dataset.physicalSchemaVersion || null : null,
        rootProjectionTarget:
          root instanceof HTMLElement ? root.dataset.physicalProjectionTarget || null : null,
        rootDisclaimer:
          root instanceof HTMLElement ? root.dataset.physicalDisclaimer || null : null,
        heading: readText('[data-physical-field="heading"]'),
        note: readText('[data-physical-field="note"]'),
        context: readText('[data-physical-field="context"]'),
        families: readText('[data-physical-field="families"]'),
        projection: readText('[data-physical-field="projection"]'),
        provenance: readText('[data-physical-field="provenance"]'),
        provenanceTitle: (() => {
          const element = document.querySelector('[data-physical-field="provenance"]');
          return element instanceof HTMLElement ? element.title : "";
        })(),
        documentScenarioId: document.documentElement.dataset.physicalScenarioId || null,
        documentEvaluatedAt: document.documentElement.dataset.physicalEvaluatedAt || null,
        documentContextLabel:
          document.documentElement.dataset.physicalContextLabel || null,
        documentFamilies: document.documentElement.dataset.physicalFamilies || null,
        documentSchemaVersion:
          document.documentElement.dataset.physicalSchemaVersion || null,
        documentProjectionTarget:
          document.documentElement.dataset.physicalProjectionTarget || null,
        documentDisclaimer: document.documentElement.dataset.physicalDisclaimer || null
      };
    };

    const assertProjectedMetricsFlow = (label) => {
      const snapshot = readPhysicalSnapshot();
      const physicalState = capture.physicalInput.getState();
      const decisionState = capture.handoverDecision.getState();

      assert(snapshot.rootPresent, label + ": physical-input panel must exist.");
      assert(
        snapshot.statusPanel && snapshot.statusPanel.width > 0 && snapshot.statusPanel.height > 0,
        label + ": status panel must remain visible."
      );
      assert(
        snapshot.physicalPanel &&
          snapshot.physicalPanel.width > 0 &&
          snapshot.physicalPanel.height > 0,
        label + ": physical-input panel must remain visible."
      );
      assert(
        snapshot.rootScenarioId === physicalState.scenario.id &&
          snapshot.documentScenarioId === physicalState.scenario.id,
        label + ": physical-input UI must stay aligned with repo-owned scenario state."
      );
      assert(
        snapshot.rootEvaluatedAt === physicalState.evaluatedAt &&
          snapshot.documentEvaluatedAt === physicalState.evaluatedAt,
        label + ": physical-input evaluatedAt datasets must stay aligned with repo-owned state."
      );
      assert(
        snapshot.rootContextLabel === physicalState.activeWindow.contextLabel &&
          snapshot.documentContextLabel === physicalState.activeWindow.contextLabel,
        label + ": active physical context datasets must stay aligned with repo-owned state."
      );
      assert(
        snapshot.rootFamilies === physicalState.provenance.map((entry) => entry.family).join(",") &&
          snapshot.documentFamilies ===
            physicalState.provenance.map((entry) => entry.family).join(","),
        label + ": family provenance datasets must stay aligned with repo-owned state."
      );
      assert(
        snapshot.rootSchemaVersion === "phase6.5-bootstrap-physical-input-report.v1" &&
          snapshot.documentSchemaVersion ===
            "phase6.5-bootstrap-physical-input-report.v1",
        label + ": physical-input report schema must stay stable and visible."
      );
      assert(
        /latencyMs \\/ jitterMs \\/ networkSpeedMbps/i.test(snapshot.rootProjectionTarget) &&
          /latencyMs \\/ jitterMs \\/ networkSpeedMbps/i.test(
            snapshot.documentProjectionTarget
          ),
        label + ": projection target datasets must stay explicit."
      );
      assert(
        /bounded proxy physical inputs; not final physical-layer truth/i.test(snapshot.note) &&
          /bounded proxy physical inputs; not final physical-layer truth/i.test(
            snapshot.rootDisclaimer
          ) &&
          /bounded proxy physical inputs; not final physical-layer truth/i.test(
            snapshot.documentDisclaimer
          ),
        label + ": physical-input disclaimer must stay explicit about the non-final boundary."
      );
      assert(
        /antenna/i.test(snapshot.rootText) &&
          /rain/i.test(snapshot.rootText) &&
          /itu-style/i.test(snapshot.rootText) &&
          /antenna/i.test(snapshot.provenanceTitle) &&
          /rain/i.test(snapshot.provenanceTitle) &&
          /itu-style/i.test(snapshot.provenanceTitle),
        label + ": family-level provenance must stay visible and inspectable."
      );

      const projectionDiffers = physicalState.report.candidates.some((candidate) => {
        return (
          candidate.baseMetrics.latencyMs !== candidate.projectedMetrics.latencyMs ||
          candidate.baseMetrics.jitterMs !== candidate.projectedMetrics.jitterMs ||
          candidate.baseMetrics.networkSpeedMbps !==
            candidate.projectedMetrics.networkSpeedMbps
        );
      });
      assert(
        projectionDiffers,
        label + ": projected metrics must materially differ from bounded proxy baselines."
      );

      const projectedMetrics = physicalState.projectedMetrics.map((candidate) => ({
        candidateId: candidate.candidateId,
        latencyMs: candidate.latencyMs,
        jitterMs: candidate.jitterMs,
        networkSpeedMbps: candidate.networkSpeedMbps
      }));
      const decisionMetrics = decisionState.snapshot.candidates.map((candidate) => ({
        candidateId: candidate.candidateId,
        latencyMs: candidate.latencyMs,
        jitterMs: candidate.jitterMs,
        networkSpeedMbps: candidate.networkSpeedMbps
      }));

      assert(
        JSON.stringify(projectedMetrics) === JSON.stringify(decisionMetrics),
        label + ": handover decision snapshot must consume the projected physical metrics."
      );

      JSON.stringify(physicalState.report);

      return {
        snapshot,
        physicalState,
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

    const initial = assertProjectedMetricsFlow("initial");
    assert(
      initial.snapshot.heading === "Bootstrap Global physical context",
      "Physical-input heading must stay repo-owned."
    );

    await seekIso("2026-04-19T08:32:00.000Z");
    const bridged = assertProjectedMetricsFlow("after bridge seek");
    assert(
      /bridge/i.test(bridged.snapshot.context),
      "Mid-range seek must expose the bridge physical context label."
    );
    assert(
      bridged.decisionState.result.decisionKind === "switch",
      "Bridge physical context must still drive the deterministic switch outcome."
    );

    await click('[data-operator-control="mode"][data-operator-mode="prerecorded"]');
    await setScenario("site");

    const switchedScenario = assertProjectedMetricsFlow(
      "after site prerecorded switch"
    );
    assert(
      switchedScenario.physicalState.scenario.id === "bootstrap-site-prerecorded",
      "Physical-input state must follow bootstrap scenario switching."
    );
    assert(
      /site/i.test(switchedScenario.snapshot.heading),
      "Physical-input heading must follow the active scenario label."
    );

    return {
      initialContext: initial.physicalState.activeWindow.contextLabel,
      bridgeContext: bridged.physicalState.activeWindow.contextLabel,
      switchedScenarioId: switchedScenario.physicalState.scenario.id
    };
  `)
});
