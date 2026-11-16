"use client";

import { useEffect, useState } from "react";

function formatEventTime(isoString: string, compact: boolean, timeZone?: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: compact ? undefined : "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
    timeZoneName: compact ? undefined : "short",
  }).format(new Date(isoString));
}

export function LocalizedEventTime({
  isoString,
  className,
  compact = false,
}: {
  isoString: string;
  className?: string;
  compact?: boolean;
}) {
  const [label, setLabel] = useState(() =>
    compact ? "\u00a0" : formatEventTime(isoString, compact, "America/Edmonton"),
  );

  useEffect(() => {
    setLabel(formatEventTime(isoString, compact));
  }, [isoString, compact]);

  return (
    <time className={className} dateTime={isoString} suppressHydrationWarning>
      {label}
    </time>
  );
}
