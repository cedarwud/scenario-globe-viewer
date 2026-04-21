import {
  buildReplayClockEvaluation,
  runReplayClockValidation
} from "./verify-phase3.3-replay-clock-real-time.mjs";

await runReplayClockValidation({
  phaseLabel: "Phase 6.7 bootstrap scene starter",
  evaluationExpression: buildReplayClockEvaluation(`
    assert(capture.sceneStarter, "Missing sceneStarter capture seam.");

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

    const readStarterSnapshot = () => {
      const root = document.querySelector('[data-scene-starter-panel="bootstrap"]');

      return {
        rootPresent: root instanceof HTMLElement,
        rootText: root instanceof HTMLElement ? root.innerText : "",
        statusPanel: readRect(".hud-panel--status"),
        starterPanel: readRect('[data-scene-starter-panel="bootstrap"]'),
        rootScenarioId:
          root instanceof HTMLElement ? root.dataset.sceneStarterScenarioId || null : null,
        rootScenePreset:
          root instanceof HTMLElement ? root.dataset.sceneStarterScenePreset || null : null,
        rootReplayMode:
          root instanceof HTMLElement ? root.dataset.sceneStarterReplayMode || null : null,
        rootScopeActive:
          root instanceof HTMLElement ? root.dataset.sceneStarterScopeActive || null : null,
        rootDeterministicPathId:
          root instanceof HTMLElement
            ? root.dataset.sceneStarterDeterministicPathId || null
            : null,
        rootSourceMode:
          root instanceof HTMLElement ? root.dataset.sceneStarterSourceMode || null : null,
        rootSourceProfileId:
          root instanceof HTMLElement
            ? root.dataset.sceneStarterSourceProfileId || null
            : null,
        rootTruthSourceLabel:
          root instanceof HTMLElement
            ? root.dataset.sceneStarterTruthSourceLabel || null
            : null,
        rootSceneServingSatId:
          root instanceof HTMLElement
            ? root.dataset.sceneStarterSceneServingSatId || null
            : null,
        rootPublishedServingSatId:
          root instanceof HTMLElement
            ? root.dataset.sceneStarterPublishedServingSatId || null
            : null,
        rootSnapshotRelationship:
          root instanceof HTMLElement
            ? root.dataset.sceneStarterSnapshotRelationship || null
            : null,
        rootNativeServingTransitionKind:
          root instanceof HTMLElement
            ? root.dataset.sceneStarterNativeServingTransitionKind || null
            : null,
        rootBundleProducerHandoverKind:
          root instanceof HTMLElement
            ? root.dataset.sceneStarterBundleProducerHandoverKind || null
            : null,
        rootFocusMode:
          root instanceof HTMLElement
            ? root.dataset.sceneStarterPresentationFocusMode || null
            : null,
        rootNarrativePhase:
          root instanceof HTMLElement
            ? root.dataset.sceneStarterPresentationNarrativePhase || null
            : null,
        rootDisplaySatIds:
          root instanceof HTMLElement
            ? root.dataset.sceneStarterDisplaySatIds || null
            : null,
        rootBeamSatIds:
          root instanceof HTMLElement
            ? root.dataset.sceneStarterBeamSatIds || null
            : null,
        rootSourceLine:
          root instanceof HTMLElement ? root.dataset.sceneStarterSourceLine || null : null,
        rootTruthLine:
          root instanceof HTMLElement ? root.dataset.sceneStarterTruthLine || null : null,
        rootPresentationLine:
          root instanceof HTMLElement
            ? root.dataset.sceneStarterPresentationLine || null
            : null,
        rootSchemaVersion:
          root instanceof HTMLElement
            ? root.dataset.sceneStarterSchemaVersion || null
            : null,
        rootOwnershipNote:
          root instanceof HTMLElement
            ? root.dataset.sceneStarterOwnershipNote || null
            : null,
        heading: readText('[data-scene-starter-field="heading"]'),
        note: readText('[data-scene-starter-field="note"]'),
        path: readText('[data-scene-starter-field="path"]'),
        source: readText('[data-scene-starter-field="source"]'),
        truth: readText('[data-scene-starter-field="truth"]'),
        transition: readText('[data-scene-starter-field="transition"]'),
        focus: readText('[data-scene-starter-field="focus"]'),
        satellites: readText('[data-scene-starter-field="satellites"]'),
        documentScenarioId:
          document.documentElement.dataset.sceneStarterScenarioId || null,
        documentScopeActive:
          document.documentElement.dataset.sceneStarterScopeActive || null,
        documentDeterministicPathId:
          document.documentElement.dataset.sceneStarterDeterministicPathId || null,
        documentTruthSourceLabel:
          document.documentElement.dataset.sceneStarterTruthSourceLabel || null,
        documentSnapshotRelationship:
          document.documentElement.dataset.sceneStarterSnapshotRelationship || null,
        documentBundleProducerHandoverKind:
          document.documentElement.dataset.sceneStarterBundleProducerHandoverKind || null,
        documentDisplaySatIds:
          document.documentElement.dataset.sceneStarterDisplaySatIds || null,
        documentBeamSatIds:
          document.documentElement.dataset.sceneStarterBeamSatIds || null,
        documentSchemaVersion:
          document.documentElement.dataset.sceneStarterSchemaVersion || null,
        documentOwnershipNote:
          document.documentElement.dataset.sceneStarterOwnershipNote || null
      };
    };

    const assertStarterSurface = (label, expectedScopeActive) => {
      const snapshot = readStarterSnapshot();
      const state = capture.sceneStarter.getState();

      assert(snapshot.rootPresent, label + ": scene-starter panel must exist.");
      assert(
        snapshot.statusPanel &&
          snapshot.statusPanel.width > 0 &&
          snapshot.statusPanel.height > 0,
        label + ": status panel must remain visible."
      );
      assert(
        snapshot.starterPanel &&
          snapshot.starterPanel.width > 0 &&
          snapshot.starterPanel.height > 0,
        label + ": scene-starter panel must remain visible."
      );
      assert(
        snapshot.rootScenarioId === state.scenario.id &&
          snapshot.documentScenarioId === state.scenario.id,
        label + ": panel scenario datasets must stay aligned with repo-owned scenario state."
      );
      assert(
        snapshot.rootScenePreset === state.scenario.presetKey &&
          snapshot.rootReplayMode === state.scenario.replayMode,
        label + ": panel framing datasets must stay aligned with scenario preset/time."
      );
      assert(
        snapshot.rootScopeActive === (state.scenario.isScopeActive ? "true" : "false") &&
          snapshot.documentScopeActive ===
            (state.scenario.isScopeActive ? "true" : "false"),
        label + ": panel scope datasets must stay aligned with repo-owned scenario framing."
      );
      assert(
        snapshot.rootDeterministicPathId === state.entry.deterministicPathId &&
          snapshot.documentDeterministicPathId === state.entry.deterministicPathId,
        label + ": deterministic path id datasets must stay aligned with starter state."
      );
      assert(
        snapshot.rootTruthSourceLabel === state.source.truthSourceLabel &&
          snapshot.documentTruthSourceLabel === state.source.truthSourceLabel,
        label + ": truth-source label datasets must stay aligned with starter state."
      );
      assert(
        snapshot.rootSnapshotRelationship === state.truth.snapshotRelationship &&
          snapshot.documentSnapshotRelationship === state.truth.snapshotRelationship,
        label + ": snapshot relationship datasets must stay aligned with starter state."
      );
      assert(
        snapshot.rootBundleProducerHandoverKind ===
          (state.truth.bundleProducerHandoverKind ?? "") &&
          snapshot.documentBundleProducerHandoverKind ===
            (state.truth.bundleProducerHandoverKind ?? ""),
        label + ": bundle handover-kind datasets must stay aligned with starter state."
      );
      assert(
        snapshot.rootSchemaVersion === "phase6.7-bootstrap-scene-starter-report.v1" &&
          snapshot.documentSchemaVersion ===
            "phase6.7-bootstrap-scene-starter-report.v1",
        label + ": scene-starter schema version must stay stable and visible."
      );
      assert(
        snapshot.rootOwnershipNote === state.ownershipNote &&
          snapshot.documentOwnershipNote === state.ownershipNote,
        label + ": ownership note datasets must stay aligned with starter state."
      );
      assert(
        snapshot.heading === "Starter Consumer",
        label + ": scene-starter heading must stay repo-owned."
      );
      assert(
        JSON.stringify(JSON.parse(snapshot.rootDisplaySatIds ?? "[]")) ===
          JSON.stringify(state.presentation.displaySatIds) &&
          JSON.stringify(JSON.parse(snapshot.rootBeamSatIds ?? "[]")) ===
            JSON.stringify(state.presentation.beamSatIds) &&
          snapshot.documentDisplaySatIds === snapshot.rootDisplaySatIds &&
          snapshot.documentBeamSatIds === snapshot.rootBeamSatIds,
        label + ": scene-starter satellite emphasis datasets must stay aligned with starter state."
      );
      assert(
        /viewer repo owns/i.test(snapshot.note + " " + snapshot.rootOwnershipNote) &&
          /ntn-sim-core owns/i.test(snapshot.rootOwnershipNote),
        label + ": ownership wording must keep viewer and ntn-sim-core boundaries explicit."
      );
      assert(
        !/live|external-directory|reset to sample/i.test(snapshot.rootText),
        label + ": second deterministic slice must not widen into live or external-directory semantics."
      );

      if (expectedScopeActive !== undefined) {
        assert(
          state.scenario.isScopeActive === expectedScopeActive,
          label + ": scene-starter scope-active mismatch."
        );
      }

      return {
        snapshot,
        state
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

    const initial = assertStarterSurface("initial", false);
    assert(
      /scoped to the repo-owned site prerecorded/i.test(initial.snapshot.note),
      "Initial scene-starter panel must stay dormant outside the scoped scenario."
    );

    await click('[data-operator-control="mode"][data-operator-mode="prerecorded"]');
    await setScenario("site");

    const active = assertStarterSurface("site prerecorded", true);
    assert(
      active.state.scenario.id === "bootstrap-site-prerecorded",
      "Scene-starter state must follow the repo-owned site prerecorded scenario."
    );
    assert(
      active.state.entry.pathKind === "bundle-sample" &&
        active.state.entry.deterministicPathId === "bundle-sample:sample-bundle-v1",
      "Scene-starter entry must preserve the bundle-sample deterministic path identity."
    );
    assert(
      active.state.source.mode === "modqn-bundle" &&
        active.state.source.profileId === "modqn-bundle-replay" &&
        active.state.source.truthSourceLabel === "sample-bundle-v1",
      "Scene-starter source mapping must preserve bundle-sample mode/profile/source identity."
    );
    assert(
      active.state.truth.sceneServingSatId === "sat-a" &&
        active.state.truth.publishedServingSatId === "sat-a" &&
        active.state.truth.snapshotRelationship === "distinct-reference" &&
        active.state.truth.bundleProducerHandoverKind ===
          "intra-satellite-beam-switch",
      "Scene-starter truth mapping must preserve serving ids, snapshot relationship, and bundle handover kind."
    );
    assert(
      active.state.presentation.focusMode === "continuity-focus" &&
        active.state.presentation.narrativePhase === "prepared" &&
        JSON.stringify(active.state.presentation.displaySatIds) ===
          JSON.stringify(["sat-a", "sat-b"]) &&
        JSON.stringify(active.state.presentation.beamSatIds) ===
          JSON.stringify(["sat-a", "sat-b"]),
      "Scene-starter presentation mapping must preserve focus/narrative/display/beam cues."
    );
    assert(
      active.snapshot.rootSourceLine.includes("path=bundle-sample") &&
        active.snapshot.rootTruthLine.includes("snapshot=distinct-reference") &&
        active.snapshot.rootPresentationLine.includes("focus=continuity-focus"),
      "Scene-starter explainer lines must stay secondary but available for debugging."
    );

    return {
      scenarioId: active.state.scenario.id,
      deterministicPathId: active.state.entry.deterministicPathId,
      truthSourceLabel: active.state.source.truthSourceLabel,
      snapshotRelationship: active.state.truth.snapshotRelationship
    };
  `)
});
