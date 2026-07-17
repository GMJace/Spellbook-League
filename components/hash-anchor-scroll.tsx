"use client";

import { useEffect } from "react";

export function HashAnchorScroll({
  anchorId,
}: {
  anchorId: string;
}) {
  useEffect(() => {
    const expectedHash = `#${anchorId}`;

    if (window.location.hash !== expectedHash) {
      return;
    }

    const scrollToAnchor = () => {
      document.getElementById(anchorId)?.scrollIntoView({
        block: "start",
      });
    };

    scrollToAnchor();

    const animationFrameId = window.requestAnimationFrame(() => {
      scrollToAnchor();
    });
    const timeoutId = window.setTimeout(() => {
      scrollToAnchor();
    }, 120);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.clearTimeout(timeoutId);
    };
  }, [anchorId]);

  return null;
}
