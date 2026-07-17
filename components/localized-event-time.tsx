"use client";

import { useEffect, useState } from "react";

function formatEventTime(isoString: string, timeZone?: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
    timeZoneName: "short",
  }).format(new Date(isoString));
}

export function LocalizedEventTime({
  isoString,
  className,
}: {
  isoString: string;
  className?: string;
}) {
  const [label, setLabel] = useState(() =>
    formatEventTime(isoString, "America/Edmonton"),
  );

  useEffect(() => {
    setLabel(formatEventTime(isoString));
  }, [isoString]);

  return (
    <time className={className} dateTime={isoString} suppressHydrationWarning>
      {label}
    </time>
  );
}
