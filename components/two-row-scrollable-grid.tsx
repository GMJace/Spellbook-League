"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

const ITEM_SELECTOR = "[data-two-row-grid-item]";

export function TwoRowScrollableGrid({
  children,
  className,
  visibleRows = 2,
}: {
  children: ReactNode;
  className: string;
  visibleRows?: number;
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

      if (rowOffsets.length <= visibleRows) {
        setMaxHeight(null);
        return;
      }

      const finalVisibleRowOffset = rowOffsets[visibleRows - 1];
      const finalVisibleRowBottom = Math.max(
        ...items
          .filter((item) => item.offsetTop === finalVisibleRowOffset)
          .map((item) => item.getBoundingClientRect().bottom),
      );

      setMaxHeight(finalVisibleRowBottom - grid.getBoundingClientRect().top);
    }

    updateVisibleRows();

    const resizeObserver = new ResizeObserver(updateVisibleRows);
    resizeObserver.observe(gridElement);
    window.addEventListener("resize", updateVisibleRows);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateVisibleRows);
    };
  }, [children, visibleRows]);

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
