"use client";

import { useEffect, useRef, useState } from "react";

export function HomepageSigilArt() {
  const artworkRef = useRef<HTMLDivElement>(null);
  const [speechLoaded, setSpeechLoaded] = useState(false);
  const [speaking, setSpeaking] = useState<boolean | null>(null);

  useEffect(() => {
    const artwork = artworkRef.current;
    if (!artwork || !speechLoaded) return;

    let interval: ReturnType<typeof setInterval>;
    function showSpeech() {
      setSpeaking(true);
      interval = setInterval(() => setSpeaking((current) => !current), 4000);
    }

    if (typeof IntersectionObserver === "undefined") {
      showSpeech();
      return () => clearInterval(interval);
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        showSpeech();
        observer.disconnect();
      }
    }, { threshold: 0.35 });
    observer.observe(artwork);

    return () => {
      observer.disconnect();
      clearInterval(interval);
    };
  }, [speechLoaded]);

  return (
    <div className="homepage-sigil-art" ref={artworkRef}>
      <img
        alt="City of Sigil"
        className="homepage-sigil-image"
        height="683"
        src="/city%20of%20sigil.png"
        width="1198"
      />
      <img
        alt=""
        aria-hidden="true"
        className="homepage-dabus-speech"
        data-speaking={speaking}
        height="887"
        src="/dabus%20speech.png"
        width="1774"
        ref={(image) => {
          if (image?.complete && image.naturalWidth > 0) setSpeechLoaded(true);
        }}
        onLoad={() => setSpeechLoaded(true)}
      />
    </div>
  );
}
