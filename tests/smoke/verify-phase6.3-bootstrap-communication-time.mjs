import {
  buildReplayClockEvaluation,
  runReplayClockValidation
} from "./verify-phase3.3-replay-clock-real-time.mjs";

await runReplayClockValidation({
  phaseLabel: "Phase 6.3 bootstrap communication-time",
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

    const readCommunicationSnapshot = () => {
      const root = document.querySelector('[data-communication-panel="bootstrap"]');

      return {
        rootPresent: root instanceof HTMLElement,
        rootText: root instanceof HTMLElement ? root.innerText : "",
        statusPanel: readRect(".hud-panel--status"),
        communicationPanel: readRect('[data-communication-panel="bootstrap"]'),
        rootScenarioId:
          root instanceof HTMLElement ? root.dataset.communicationScenarioId || null : null,
        rootStatus:
          root instanceof HTMLElement ? root.dataset.communicationStatus || null : null,
        rootSourceKind:
          root instanceof HTMLElement ? root.dataset.communicationSourceKind || null : null,
        rootSchemaVersion:
          root instanceof HTMLElement ? root.dataset.communicationSchemaVersion || null : null,
        rootProvenanceDetail:
          root instanceof HTMLElement ? root.dataset.communicationProvenanceDetail || null : null,
        summaryLabel: readText('[data-communication-field="heading"]'),
        note: readText('[data-communication-field="note"]'),
        status: readText('[data-communication-field="status"]'),
        available: readText('[data-communication-field="available"]'),
        unavailable: readText('[data-communication-field="unavailable"]'),
        remaining: readText('[data-communication-field="remaining"]'),
        provenance: readText('[data-communication-field="provenance"]'),
        provenanceTitle: (() => {
          const element = document.querySelector('[data-communication-field="provenance"]');
          return element instanceof HTMLElement ? element.title : "";
        })(),
        documentScenarioId: document.documentElement.dataset.communicationScenarioId || null,
        documentStatus: document.documentElement.dataset.communicationStatus || null,
        documentSourceKind: document.documentElement.dataset.communicationSourceKind || null,
        documentSchemaVersion:
          document.documentElement.dataset.communicationReportSchemaVersion || null,
        documentProvenanceDetail:
          document.documentElement.dataset.communicationProvenanceDetail || null
      };
    };

    const assertCommunicationStateMatchesCapture = (label) => {
      const snapshot = readCommunicationSnapshot();
      const selectedScenario = capture.scenarioSession.getCurrentScenario();
      const communicationState = capture.communicationTime.getState();
      const replayState = capture.replayClock.getState();

      assert(snapshot.rootPresent, label + ": communication-time panel must exist.");
      assert(
        snapshot.statusPanel && snapshot.statusPanel.width > 0 && snapshot.statusPanel.height > 0,
        label + ": status panel must remain visible."
      );
      assert(
        snapshot.communicationPanel &&
          snapshot.communicationPanel.width > 0 &&
          snapshot.communicationPanel.height > 0,
        label + ": communication-time panel must remain visible."
      );
      assert(
        snapshot.rootScenarioId === selectedScenario.scenarioId &&
          snapshot.documentScenarioId === selectedScenario.scenarioId,
        label + ": communication-time UI must stay aligned with the active scenario id."
      );
      assert(
        snapshot.rootStatus === communicationState.currentStatus.kind &&
          snapshot.documentStatus === communicationState.currentStatus.kind,
        label + ": communication-time UI datasets must stay aligned with repo-owned state."
      );
      assert(
        snapshot.rootSourceKind === "bootstrap-proxy" &&
          snapshot.documentSourceKind === "bootstrap-proxy" &&
          snapshot.provenance === "bootstrap-proxy",
        label + ": bootstrap proxy provenance must stay explicit."
      );
      assert(
        snapshot.rootProvenanceDetail === communicationState.provenance.detail &&
          snapshot.documentProvenanceDetail === communicationState.provenance.detail &&
          snapshot.provenanceTitle === communicationState.provenance.detail &&
          /proxy only; not measured/i.test(snapshot.note) &&
          /not a real network measurement/i.test(communicationState.provenance.detail),
        label + ": bootstrap proxy provenance detail must stay explicit about the non-measurement boundary."
      );
      assert(
        snapshot.rootSchemaVersion === "phase6.3-bootstrap-communication-time-report.v1" &&
          snapshot.documentSchemaVersion === "phase6.3-bootstrap-communication-time-report.v1",
        label + ": communication-time report schema must stay stable and visible."
      );
      assert(
        snapshot.summaryLabel.includes(selectedScenario.scenarioLabel),
        label + ": scenario-bounded summary label must name the active scenario."
      );
      assert(
        !/iperf|ping|latency|jitter|validation|nat|tunnel/i.test(snapshot.rootText),
        label + ": first Phase 6.3 slice must not imply real measurements or 6.4+/6.6 integration."
      );
      assert(
        communicationState.report.scenario.id === selectedScenario.scenarioId,
        label + ": export-ready report must stay aligned with active scenario id."
      );
      assert(
        normalizeTimestampMs(communicationState.report.activeRange.start) ===
          normalizeTimestampMs(replayState.startTime) &&
          normalizeTimestampMs(communicationState.report.activeRange.stop) ===
            normalizeTimestampMs(replayState.stopTime),
        label + ": export-ready report must stay aligned with the active replay range."
      );
      assert(
        communicationState.report.sourceKind === "bootstrap-proxy",
        label + ": export-ready report must preserve proxy provenance."
      );
      JSON.stringify(communicationState);

      return {
        snapshot,
        communicationState
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

    const initial = assertCommunicationStateMatchesCapture("initial");
    assert(
      initial.communicationState.report.windows.length > 1,
      "Communication-time report must expose bounded projected windows."
    );

    const firstWindow = initial.communicationState.report.windows[0];
    const secondWindow = initial.communicationState.report.windows[1];
    const firstWindowMidMs =
      normalizeTimestampMs(firstWindow.start) + Math.floor(firstWindow.durationMs / 2);
    await seekIso(new Date(firstWindowMidMs).toISOString());

    const communicating = assertCommunicationStateMatchesCapture("after seek into window");
    assert(
      communicating.communicationState.currentStatus.kind === "communicating" &&
        communicating.snapshot.status === "Communicating",
      "Seeking into a projected communication window must update the live status readout."
    );

    const gapMidMs = secondWindow
      ? normalizeTimestampMs(firstWindow.stop) +
        Math.floor(
          (normalizeTimestampMs(secondWindow.start) - normalizeTimestampMs(firstWindow.stop)) / 2
        )
      : normalizeTimestampMs(initial.communicationState.report.activeRange.stop) - 1000;
    await seekIso(new Date(gapMidMs).toISOString());

    const unavailable = assertCommunicationStateMatchesCapture("after seek into gap");
    assert(
      unavailable.communicationState.currentStatus.kind === "unavailable" &&
        unavailable.snapshot.status === "Unavailable",
      "Seeking into a non-communication gap must update the live status readout."
    );

    await click('[data-operator-control="mode"][data-operator-mode="prerecorded"]');
    await setScenario("site");

    const switched = assertCommunicationStateMatchesCapture("after site prerecorded switch");
    assert(
      switched.communicationState.report.scenario.mode === "prerecorded",
      "Communication-time report must follow replay mode changes."
    );
    assert(
      switched.communicationState.report.scenario.id === "bootstrap-site-prerecorded",
      "Communication-time report must follow bootstrap scenario selection changes."
    );

    return {
      initialStatus: initial.communicationState.currentStatus.kind,
      communicatingStatus: communicating.communicationState.currentStatus.kind,
      unavailableStatus: unavailable.communicationState.currentStatus.kind,
      switchedScenarioId: switched.communicationState.report.scenario.id,
      provenance: switched.communicationState.report.sourceKind
    };
  `)
});
