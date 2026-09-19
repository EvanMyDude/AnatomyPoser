import React, { useState } from "react";

/** On phones the panel rides in a bottom sheet: peek (card height) or expanded. */
export default function BottomSheet({ children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={"ap-sheet-shell" + (open ? " is-open" : "")}>
      <button type="button" className="ap-sheet-grip" aria-expanded={open} aria-label={open ? "Collapse panel" : "Expand panel"} onClick={() => setOpen(!open)}>
        <span />
      </button>
      <div className="ap-sheet-body">{children}</div>
    </div>
  );
}
