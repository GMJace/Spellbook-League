import { Fragment, type ReactNode } from "react";

const grimoireGatheringColor = "#0cff00";
const grimoireGatheringSingular = "Grimoire Gathering";
const grimoireGatheringPlural = "Grimoire Gatherings";

function GrimoireGatheringLabel({
  className,
  text,
}: {
  className?: string;
  text: string;
}) {
  const combinedClassName = ["grimoire-gathering-text", className]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={combinedClassName} style={{ color: grimoireGatheringColor }}>
      {text}
    </span>
  );
}

export function GrimoireGatheringText({ className }: { className?: string }) {
  return (
    <GrimoireGatheringLabel
      className={className}
      text={grimoireGatheringSingular}
    />
  );
}

export function GrimoireGatheringsText({ className }: { className?: string }) {
  return (
    <GrimoireGatheringLabel
      className={className}
      text={grimoireGatheringPlural}
    />
  );
}

export function renderGrimoireGatheringText(text: string): ReactNode[] {
  const tokenPattern = /(Grimoire Gatherings|Grimoire Gathering)/g;
  const segments = text.split(tokenPattern);

  return segments.map((segment, index) => {
    if (segment === grimoireGatheringPlural) {
      return <GrimoireGatheringsText key={`grimoire-gathering-${index}`} />;
    }

    if (segment === grimoireGatheringSingular) {
      return <GrimoireGatheringText key={`grimoire-gathering-${index}`} />;
    }

    return <Fragment key={`grimoire-gathering-${index}`}>{segment}</Fragment>;
  });
}
