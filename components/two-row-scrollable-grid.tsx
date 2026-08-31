"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

const ITEM_SELECTOR = "[data-two-row-grid-item]";

export function TwoRowScrollableGrid({
  children,
  className,
}: {
  children: ReactNode;
  className: string;
}) {
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [maxHeight, setMaxHeight] = useState<number | null>(null);

  useEffect(() => {
    const gridElement = gridRef.current;

    if (!gridElement) {
      return;
    }

    function updateVisibleRows() {
      const grid = gridElement!;
      const items = Array.from(grid.querySelectorAll<HTMLElement>(ITEM_SELECTOR));
      const rowOffsets = [...new Set(items.map((item) => item.offsetTop))].sort(
        (left, right) => left - right,
      );

      if (rowOffsets.length <= 2) {
        setMaxHeight(null);
        return;
      }

      const secondRowOffset = rowOffsets[1];
      const secondRowBottom = Math.max(
        ...items
          .filter((item) => item.offsetTop === secondRowOffset)
          .map((item) => item.offsetTop + item.offsetHeight),
      );

      setMaxHeight(secondRowBottom);
    }

    updateVisibleRows();

    const resizeObserver = new ResizeObserver(updateVisibleRows);
    resizeObserver.observe(gridElement);
    window.addEventListener("resize", updateVisibleRows);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateVisibleRows);
    };
  }, [children]);

  return (
    <div
      className={`${className} two-row-scrollable-grid`}
      ref={gridRef}
      style={maxHeight === null ? undefined : { maxHeight }}
    >
      {children}
    </div>
  );
}
