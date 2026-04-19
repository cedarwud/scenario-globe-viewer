import {
  buildReplayClockEvaluation,
  runReplayClockValidation
} from "./verify-phase3.3-replay-clock-real-time.mjs";

await runReplayClockValidation({
  phaseLabel: "Phase 6.6 bootstrap validation-state",
  evaluationExpression: buildReplayClockEvaluation(`
    assert(capture.validationState, "Missing validationState capture seam.");
    assert(capture.handoverDecision, "Missing handoverDecision capture seam.");

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

    const toIsoAtRatio = (state, ratio) => {
      const startMs = normalizeTimestampMs(state.startTime);
      const stopMs = normalizeTimestampMs(state.stopTime);
      return new Date(startMs + Math.round((stopMs - startMs) * ratio)).toISOString();
    };

    const readValidationSnapshot = () => {
      const root = document.querySelector('[data-validation-state-panel="bootstrap"]');

      return {
        rootPresent: root instanceof HTMLElement,
        rootText: root instanceof HTMLElement ? root.innerText : "",
        statusPanel: readRect(".hud-panel--status"),
        validationPanel: readRect('[data-validation-state-panel="bootstrap"]'),
        rootScenarioId:
          root instanceof HTMLElement ? root.dataset.validationScenarioId || null : null,
        rootEvaluatedAt:
          root instanceof HTMLElement ? root.dataset.validationEvaluatedAt || null : null,
        rootEnvironmentMode:
          root instanceof HTMLElement ? root.dataset.validationEnvironmentMode || null : null,
        rootTransportKind:
          root instanceof HTMLElement ? root.dataset.validationTransportKind || null : null,
        rootDutKind:
          root instanceof HTMLElement ? root.dataset.validationDutKind || null : null,
        rootAttachState:
          root instanceof HTMLElement ? root.dataset.validationAttachState || null : null,
        rootServingCandidateId:
          root instanceof HTMLElement ? root.dataset.validationServingCandidateId || null : null,
        rootSchemaVersion:
          root instanceof HTMLElement ? root.dataset.validationSchemaVersion || null : null,
        rootOwnershipNote:
          root instanceof HTMLElement ? root.dataset.validationOwnershipNote || null : null,
        rootProvenanceKind:
          root instanceof HTMLElement ? root.dataset.validationProvenanceKind || null : null,
        rootProvenanceDetail:
          root instanceof HTMLElement ? root.dataset.validationProvenanceDetail || null : null,
        heading: readText('[data-validation-field="heading"]'),
        note: readText('[data-validation-field="note"]'),
        environmentMode: readText('[data-validation-field="environmentMode"]'),
        transportKind: readText('[data-validation-field="transportKind"]'),
        dutKind: readText('[data-validation-field="dutKind"]'),
        attachState: readText('[data-validation-field="attachState"]'),
        servingCandidate: readText('[data-validation-field="servingCandidate"]'),
        provenance: readText('[data-validation-field="provenance"]'),
        provenanceTitle: (() => {
          const element = document.querySelector('[data-validation-field="provenance"]');
          return element instanceof HTMLElement ? element.title : "";
        })(),
        documentScenarioId:
          document.documentElement.dataset.validationScenarioId || null,
        documentEvaluatedAt:
          document.documentElement.dataset.validationEvaluatedAt || null,
        documentEnvironmentMode:
          document.documentElement.dataset.validationEnvironmentMode || null,
        documentTransportKind:
          document.documentElement.dataset.validationTransportKind || null,
        documentDutKind: document.documentElement.dataset.validationDutKind || null,
        documentAttachState:
          document.documentElement.dataset.validationAttachState || null,
        documentServingCandidateId:
          document.documentElement.dataset.validationServingCandidateId || null,
        documentSchemaVersion:
          document.documentElement.dataset.validationSchemaVersion || null,
        documentOwnershipNote:
          document.documentElement.dataset.validationOwnershipNote || null,
        documentProvenanceKind:
          document.documentElement.dataset.validationProvenanceKind || null,
        documentProvenanceDetail:
          document.documentElement.dataset.validationProvenanceDetail || null
      };
    };

    const assertValidationSurface = (label, expected) => {
      const snapshot = readValidationSnapshot();
      const validationState = capture.validationState.getState();
      const handoverState = capture.handoverDecision.getState();

      assert(snapshot.rootPresent, label + ": validation-state panel must exist.");
      assert(
        snapshot.statusPanel &&
          snapshot.statusPanel.width > 0 &&
          snapshot.statusPanel.height > 0,
        label + ": status panel must remain visible."
      );
      assert(
        snapshot.validationPanel &&
          snapshot.validationPanel.width > 0 &&
          snapshot.validationPanel.height > 0,
        label + ": validation-state panel must remain visible."
      );
      assert(
        snapshot.rootScenarioId === validationState.scenarioId &&
          snapshot.documentScenarioId === validationState.scenarioId,
        label + ": validation-state UI must stay aligned with repo-owned scenario state."
      );
      assert(
        snapshot.rootEvaluatedAt === validationState.evaluatedAt &&
          snapshot.documentEvaluatedAt === validationState.evaluatedAt,
        label + ": evaluatedAt datasets must stay aligned with repo-owned validation state."
      );
      assert(
        snapshot.rootEnvironmentMode === validationState.environmentMode &&
          snapshot.documentEnvironmentMode === validationState.environmentMode,
        label + ": environment mode datasets must stay aligned with repo-owned validation state."
      );
      assert(
        snapshot.rootTransportKind === validationState.transportKind &&
          snapshot.documentTransportKind === validationState.transportKind,
        label + ": transport kind datasets must stay aligned with repo-owned validation state."
      );
      assert(
        snapshot.rootDutKind === validationState.dutKind &&
          snapshot.documentDutKind === validationState.dutKind,
        label + ": DUT kind datasets must stay aligned with repo-owned validation state."
      );
      assert(
        snapshot.rootAttachState === validationState.attachState &&
          snapshot.documentAttachState === validationState.attachState,
        label + ": attach state datasets must stay aligned with repo-owned validation state."
      );
      assert(
        snapshot.rootSchemaVersion === "phase6.6-bootstrap-validation-state-report.v1" &&
          snapshot.documentSchemaVersion ===
            "phase6.6-bootstrap-validation-state-report.v1",
        label + ": validation-state schema version must stay stable and visible."
      );
      assert(
        snapshot.rootOwnershipNote === validationState.ownershipNote &&
          snapshot.documentOwnershipNote === validationState.ownershipNote,
        label + ": ownership notes must stay aligned with repo-owned validation state."
      );
      assert(
        snapshot.rootProvenanceKind === validationState.provenance.kind &&
          snapshot.documentProvenanceKind === validationState.provenance.kind,
        label + ": provenance kind datasets must stay aligned with repo-owned validation state."
      );
      assert(
        snapshot.rootProvenanceDetail === validationState.provenance.detail &&
          snapshot.documentProvenanceDetail === validationState.provenance.detail,
        label + ": provenance detail datasets must stay aligned with repo-owned validation state."
      );
      assert(
        snapshot.heading === "Validation Boundary",
        label + ": validation heading must stay repo-owned."
      );
      assert(
        /viewer repo owns/i.test(snapshot.note) &&
          /external validation stack owns/i.test(snapshot.note),
        label + ": ownership note must keep viewer vs external ownership explicit."
      );
      assert(
        /bounded proxy/i.test(snapshot.provenance) &&
          /scenario-bounded validation state/i.test(snapshot.provenanceTitle),
        label + ": provenance must stay explicit about the bounded proxy boundary."
      );

      if (expected) {
        assert(
          validationState.scenarioId === expected.scenarioId,
          label + ": validation state must follow scenario switching."
        );
        assert(
          validationState.environmentMode === expected.environmentMode,
          label + ": validation environment mode mismatch."
        );
        assert(
          validationState.transportKind === expected.transportKind,
          label + ": validation transport kind mismatch."
        );
        assert(
          validationState.dutKind === expected.dutKind,
          label + ": validation DUT kind mismatch."
        );
        assert(
          validationState.attachState === expected.attachState,
          label + ": validation attach state mismatch."
        );
      }

      if (validationState.attachState === "detached") {
        assert(
          validationState.servingCandidateId === undefined,
          label + ": detached validation state must not expose a serving candidate."
        );
        assert(
          snapshot.rootServingCandidateId === "" &&
            snapshot.documentServingCandidateId === "",
          label + ": detached serving candidate datasets must stay empty."
        );
      } else {
        assert(
          validationState.servingCandidateId === handoverState.result.servingCandidateId,
          label + ": attached/bridged validation state must stay aligned with the serving candidate context."
        );
      }

      JSON.stringify(validationState.report);

      return {
        snapshot,
        validationState
      };
    };

    const click = async (selector) => {
      const element = document.querySelector(selector);
      assert(element instanceof HTMLElement, "Missing control: " + selector);
      element.click();
      await sleep(220);
    };

    const setScenario = async (value) => {
      const select = document.querySelector('[data-operator-control="scenario"]');
      assert(select instanceof HTMLSelectElement, "Missing scenario select.");
      select.value = value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      await sleep(240);
    };

    const seekRatio = async (ratio) => {
      const state = capture.replayClock.getState();
      capture.replayClock.seek(toIsoAtRatio(state, ratio));
      await sleep(180);
    };

    await seekRatio(0.5);
    const globalState = assertValidationSurface("global attached", {
      scenarioId: "bootstrap-global-real-time",
      environmentMode: "linux-direct",
      transportKind: "direct",
      dutKind: "virtual",
      attachState: "attached"
    });

    await setScenario("regional");
    await seekRatio(0.5);
    const regionalState = assertValidationSurface("regional attached", {
      scenarioId: "bootstrap-regional-real-time",
      environmentMode: "windows-wsl-tunnel",
      transportKind: "tunnel",
      dutKind: "virtual",
      attachState: "attached"
    });

    await click('[data-operator-control="mode"][data-operator-mode="prerecorded"]');
    await setScenario("site");
    await seekRatio(0.5);
    const siteState = assertValidationSurface("site bridged", {
      scenarioId: "bootstrap-site-prerecorded",
      environmentMode: "inet-nat-bridge",
      transportKind: "nat-bridge",
      dutKind: "physical",
      attachState: "bridged"
    });

    await seekRatio(0.02);
    const detachedSiteState = assertValidationSurface("site detached", {
      scenarioId: "bootstrap-site-prerecorded",
      environmentMode: "inet-nat-bridge",
      transportKind: "nat-bridge",
      dutKind: "physical",
      attachState: "detached"
    });

    return {
      globalMode: globalState.validationState.environmentMode,
      regionalMode: regionalState.validationState.environmentMode,
      siteMode: siteState.validationState.environmentMode,
      detachedAttachState: detachedSiteState.validationState.attachState
    };
  `)
});
