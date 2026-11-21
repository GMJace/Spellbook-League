"use client";

import { useEffect, useRef } from "react";

export function SigilSpireArt() {
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const image = imageRef.current;
    const section = image?.closest("section");
    if (!image || !section) return;

    let frame = 0;
    let previousWidth = 0;
    let active = true;

    function alignWithDivider() {
      if (!active) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const width = section!.getBoundingClientRect().width;
        if (width !== previousWidth) {
          image!.style.marginTop = "0px";
          previousWidth = width;
        }

        const imageBounds = image!.getBoundingClientRect();
        const sectionBounds = section!.getBoundingClientRect();
        const nextSection = section!.nextElementSibling;
        const dividerGap = nextSection ? parseFloat(getComputedStyle(nextSection).marginTop) : 0;
        const currentTop = parseFloat(getComputedStyle(image!).marginTop);
        const offset = sectionBounds.bottom + dividerGap - imageBounds.bottom;
        if (Math.abs(offset) > 1) {
          image!.style.marginTop = `${Math.max(0, currentTop + offset)}px`;
        }
      });
    }

    const observer = new ResizeObserver(alignWithDivider);
    observer.observe(section);
    observer.observe(image);
    image.addEventListener("load", alignWithDivider);
    document.fonts.ready.then(alignWithDivider);
    alignWithDivider();

    return () => {
      active = false;
      observer.disconnect();
      image.removeEventListener("load", alignWithDivider);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <img
      ref={imageRef}
      alt="Sigil suspended above the Spire in the Outlands"
      className="city-of-doors-spire"
      src="/sigil-art-large.png"
      width="965"
      height="1629"
    />
  );
}
