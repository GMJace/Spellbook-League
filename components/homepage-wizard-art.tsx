"use client";

import { useState } from "react";

// Spark origins are in the artwork's viewBox coordinates.
const bladeSparks = [
  [354, 16, 0.9],
  [371, 42, 1.1],
  [403, 64, 0.85],
  [439, 33, 0.85],
  [471, 16, 1.1],
  [513, 44, 0.65],
  [552, 26, 1.05],
  [592, 45, 0.85],
  [626, 38, 0.75],
  [654, 61, 1.05],
  [690, 71, 0.9],
  [731, 99, 0.8],
] as const;

const staffSparks = [
  [276, 32, 0.75],
  [231, 61, 0.85],
  [215, 113, 1.05],
  [183, 152, 1.15],
  [199, 189, 0.85],
  [228, 220, 1.05],
  [254, 252, 0.8],
  [321, 226, 0.65],
  [389, 161, 0.9],
  [391, 205, 0.8],
  [428, 463, 0.7],
  [444, 506, 0.65],
] as const;

const eyeSparks = [
  [524, 148, 0.38],
  [561, 154, 0.38],
] as const;

export function HomepageWizardArt() {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="homepage-banner-art">
      <img
        alt="SPELLBOOK homepage banner"
        className="homepage-banner-image"
        src="/wizard_large.png"
        width="1536"
        height="1024"
        style={{ height: "auto" }}
        ref={(image) => {
          if (image?.complete && image.naturalWidth > 0) setLoaded(true);
        }}
        onLoad={() => setLoaded(true)}
      />
      {loaded && (
        <svg
          aria-hidden="true"
          className="homepage-wizard-sparks"
          viewBox="0 0 960 640.05"
          preserveAspectRatio="xMidYMid slice"
        >
          {[...bladeSparks, ...staffSparks, ...eyeSparks].map(([x, y, scale], index) => (
            <g key={x} transform={`translate(${x} ${y}) scale(${scale})`}>
              <path
                d="m-7 3 10 -7 -2 8 11 -4"
                style={{ animationDelay: `${(index * 0.19).toFixed(2)}s` }}
              />
            </g>
          ))}
        </svg>
      )}
    </div>
  );
}
