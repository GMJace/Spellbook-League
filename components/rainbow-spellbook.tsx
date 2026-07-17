import { Fragment, type ReactNode } from "react";

const spellbookSpectrum = [
  "#FF0000",
  "#D100D8",
  "#8F34E8",
  "#8B2BE2",
  "#9700E8",
  "#5616FF",
  "#003BFF",
  "#005CFF",
  "#00A6E8",
  "#00E5E5",
  "#00D7C7",
  "#00E8B8",
  "#00D82F",
  "#00D814",
  "#A8E000",
  "#F3F000",
  "#D7B52C",
  "#E1AF22",
  "#DD9B00",
  "#E29B00",
  "#C3492E",
  "#F00000",
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
