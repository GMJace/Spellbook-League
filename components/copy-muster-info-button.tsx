"use client";

import { useState } from "react";

function fallbackCopyText(text: string) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "absolute";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

export function CopyMusterInfoButton({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        fallbackCopyText(text);
      }

      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      fallbackCopyText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <button
      className={className ?? "button button-secondary"}
      onClick={handleCopy}
      type="button"
    >
      {copied ? "Copied muster info" : "Copy muster info"}
    </button>
  );
}
