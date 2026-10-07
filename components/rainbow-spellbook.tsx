import { Fragment, type ReactNode } from "react";

const spellbookSpectrum = [
  "#FF0000",
  "#FF8C00",
  "#FFEE00",
  "#4DE94C",
  "#3783FF",
  "#4815AA",
] as const;

const spellbookLetters = "SPELLBOOK".split("");
const spellbookColors = spellbookLetters.map((_, index) => {
  const spectrumIndex = Math.round(
    (index / (spellbookLetters.length - 1)) * (spellbookSpectrum.length - 1)
  );

  return spellbookSpectrum[spectrumIndex];
});

export function RainbowSpellbook({ className }: { className?: string }) {
  const combinedClassName = ["rainbow-spellbook", className]
    .filter(Boolean)
    .join(" ");

  return (
    <span aria-label="SPELLBOOK" className={combinedClassName} role="text">
      <span aria-hidden="true" className="rainbow-spellbook-inner">
        {spellbookLetters.map((letter, index) => (
          <span
            key={`${letter}-${index}`}
            className="rainbow-spellbook-letter"
            style={{ color: spellbookColors[index] }}
          >
            {letter}
          </span>
        ))}
      </span>
    </span>
  );
}

export function renderRainbowSpellbookText(text: string): ReactNode {
  const segments = text.split("SPELLBOOK");

  return segments.map((segment, index) => (
    <Fragment key={`spellbook-segment-${index}`}>
      {segment}
      {index < segments.length - 1 ? <RainbowSpellbook /> : null}
    </Fragment>
  ));
}
