import React, { useCallback, useMemo, useReducer, useRef, useState } from "react";
import { RIGS, CHAINS, URL_ORDER } from "./rig/rigs.js";
import { describePose } from "./rig/describe.js";
import { muscleInstances, activationMap } from "./data/muscles.js";
import BottomSheet from "./panel/BottomSheet.jsx";
import { makeReducer, initialState, canUndo, canRedo } from "./state/poseReducer.js";
import { useMediaQuery } from "./hooks/useMediaQuery.js";
import { useUrlState } from "./hooks/useUrlState.js";
import { useMeasurements } from "./hooks/useMeasurements.js";
import { useKeyboardPosing } from "./hooks/useKeyboardPosing.js";
import Stage from "./stage/Stage.jsx";
import Panel from "./panel/Panel.jsx";
import Summary from "./panel/Summary.jsx";

const reducer = makeReducer(RIGS);

export default function App() {
  const [state, dispatch] = useReducer(reducer, RIGS, initialState);
  const isNarrow = useMediaQuery("(max-width: 720px)");
  const sheet = useMeasurements();
  const { plane, selected, layer, fingerCurl } = state;
  const rig = RIGS[plane], otherPlane = plane === "coronal" ? "sagittal" : "coronal", otherRig = RIGS[otherPlane];
  const angles = state.angles[plane];

  const { pos, dir } = useMemo(() => rig.fk(angles), [rig, angles]);
  const descs = useMemo(() => describePose(rig, angles, plane), [rig, angles, plane]);
  const otherDescs = useMemo(() => describePose(otherRig, state.angles[otherPlane], otherPlane), [otherRig, state.angles, otherPlane]);
  const activation = useMemo(() => (layer === "bones" ? null : activationMap(descs, muscleInstances(plane))), [descs, plane, layer]);
  const svgRef = useRef(null);
  const selectedJointId = selected && (selected.kind === "joint" || selected.kind === "bone") && rig.byId[selected.id] && rig.byId[selected.id].ik ? selected.id : null;

  const onLoadMeasurements = useCallback((m) => sheet.replaceAll(m), [sheet.replaceAll]); // eslint-disable-line react-hooks/exhaustive-deps
  useUrlState({ state, rigs: RIGS, measurements: sheet.records, dispatch, onLoadMeasurements });
  useKeyboardPosing({ dispatch, selectedJointId, jointOrder: URL_ORDER[plane], rig });

  // Row hover in the panel highlights the bone on the figure through the same focus channel.
  const [panelHover, setPanelHover] = useState(null);
  const stageSelected = panelHover || selected;

  const panel = (
    <Panel state={state} dispatch={dispatch} rig={rig} otherRig={otherRig} descs={descs} otherDescs={otherDescs}
      selectedJointId={selectedJointId} canUndo={canUndo(state)} canRedo={canRedo(state)} sheet={sheet} onHover={setPanelHover} svgRef={svgRef} />
  );

  return (
    <>
      <div className={"ap-root" + (isNarrow ? " is-narrow" : "")}>
        <Stage rig={rig} plane={plane} angles={angles} pos={pos} dir={dir} descs={descs} layer={layer} activation={activation}
          selected={stageSelected} selectedJointId={selectedJointId} chains={CHAINS[plane]} fingerCurl={fingerCurl}
          dispatch={dispatch} isNarrow={isNarrow} svgRef={svgRef} />
        {isNarrow ? <BottomSheet>{panel}</BottomSheet> : panel}
      </div>
      <Summary rig={rig} pos={pos} dir={dir} plane={plane} fingerCurl={fingerCurl} rows={sheet.rows} />
    </>
  );
}
