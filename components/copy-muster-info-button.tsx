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

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function isDataUrl(value: string) {
  return value.startsWith("data:");
}

async function buildClipboardImageBlob(tokenImageUrl: string) {
  if (!tokenImageUrl) {
    return null;
  }

  if (isDataUrl(tokenImageUrl)) {
    const response = await fetch(tokenImageUrl);
    return response.blob();
  }

  const response = await fetch(tokenImageUrl);

  if (!response.ok) {
    throw new Error("Could not load token image.");
  }

  return response.blob();
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

export function CopyPlayerTokenButton({
  tokenImagePath,
  className,
}: {
  tokenImagePath?: string | null;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const tokenImageUrl = tokenImagePath
      ? new URL(tokenImagePath, window.location.origin).toString()
      : "";

    if (!tokenImageUrl) {
      return;
    }

    const fallbackText = isDataUrl(tokenImageUrl)
      ? "**Player Token:** Embedded image copied when supported"
      : ["**Player Token:**", tokenImageUrl].join("\n");

    try {
      if (navigator.clipboard?.write && typeof ClipboardItem !== "undefined") {
        const imageBlob = await buildClipboardImageBlob(tokenImageUrl);
        const html = [
          "<div>",
          "<p style=\"margin:0 0 12px;\"><strong>Player Token:</strong></p>",
          `<img src="${escapeHtml(tokenImageUrl)}" alt="Player token" style="display:block;width:112px;height:112px;object-fit:cover;border-radius:999px;margin:0;" />`,
          "</div>",
        ].join("");
        const clipboardItemData: Record<string, Blob> = {
          "text/plain": new Blob([fallbackText], { type: "text/plain" }),
          "text/html": new Blob([html], { type: "text/html" }),
        };

        if (imageBlob && imageBlob.type.startsWith("image/")) {
          clipboardItemData[imageBlob.type] = imageBlob;
        }

        await navigator.clipboard.write([new ClipboardItem(clipboardItemData)]);
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(fallbackText);
      } else {
        fallbackCopyText(fallbackText);
      }

      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      fallbackCopyText(fallbackText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <button
      className={className ?? "button button-secondary"}
      disabled={!tokenImagePath}
      onClick={handleCopy}
      type="button"
    >
      {copied ? "Copied player token" : "Copy player token"}
    </button>
  );
}
