"use client";

import { useId, useRef, useState } from "react";

const mapImage = "/783e75bf1986fd4479e20fd4df341edc.jpg";

export function SigilMapViewer() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const [zoom, setZoom] = useState(1);

  function resetView() {
    setZoom(1);
    viewportRef.current?.scrollTo(0, 0);
  }

  return (
    <figure className="sigil-map">
      <button
        className="sigil-map-preview"
        type="button"
        aria-label="Open a zoomable map of Sigil"
        onClick={() => {
          resetView();
          dialogRef.current?.showModal();
        }}
      >
        <img alt="Map of Sigil, the City of Doors" src={mapImage} width="6400" height="4400" loading="lazy" />
      </button>
      <figcaption>Select the map to zoom in and explore Sigil.</figcaption>

      <dialog className="sigil-map-dialog" ref={dialogRef} aria-labelledby={titleId}>
        <div className="sigil-map-toolbar">
          <h2 id={titleId}>Map of Sigil</h2>
          <div className="inline-actions">
            <button type="button" className="button-secondary button-small" disabled={zoom === 1} onClick={() => setZoom((value) => Math.max(1, value - 0.5))}>
              Zoom out
            </button>
            <span aria-live="polite">{zoom * 100}%</span>
            <button type="button" className="button-secondary button-small" disabled={zoom === 5} onClick={() => setZoom((value) => Math.min(5, value + 0.5))}>
              Zoom in
            </button>
            <button type="button" className="button-secondary button-small" onClick={resetView}>Reset</button>
            <button type="button" className="button-secondary button-small" onClick={() => dialogRef.current?.close()}>Close</button>
          </div>
        </div>
        <p className="sigil-map-help">Zoom in, then scroll to explore the map.</p>
        <div className="sigil-map-viewport" ref={viewportRef} tabIndex={0} role="region" aria-label="Zoomed Sigil map">
          <img
            alt="Map of Sigil, the City of Doors"
            src={mapImage}
            width="6400"
            height="4400"
            style={{ width: `${zoom * 100}%` }}
          />
        </div>
      </dialog>
    </figure>
  );
}
