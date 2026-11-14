"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function HomepageSpeechBubble({ children }: { children: ReactNode }) {
  const bubbleRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const bubble = bubbleRef.current;
    if (!bubble || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        delete bubble.dataset.awaitingReveal;
        observer.disconnect();
      }
    }, { threshold: 0.15 });

    bubble.dataset.awaitingReveal = "";
    observer.observe(bubble);

    return () => {
      observer.disconnect();
      delete bubble.dataset.awaitingReveal;
    };
  }, []);

  return <p ref={bubbleRef} className="homepage-intro">{children}</p>;
}
