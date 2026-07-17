"use client";

import type {
  ClipboardEvent,
  KeyboardEvent,
  TextareaHTMLAttributes,
} from "react";

const BULLET_PREFIX = "• ";

function stripBulletPrefix(value: string) {
  return value.replace(/^[-*•]\s*/, "").trim();
}

function normalizeBulletLines(value: string) {
  return value
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => {
      const cleaned = stripBulletPrefix(line);
      return cleaned ? `${BULLET_PREFIX}${cleaned}` : "";
    })
    .join("\n");
}

type BulletTextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "defaultValue"> & {
  defaultValue?: string;
};

export function BulletTextarea({
  defaultValue,
  onBlur,
  onKeyDown,
  onPaste,
  ...props
}: BulletTextareaProps) {
  return (
    <textarea
      {...props}
      defaultValue={normalizeBulletLines(defaultValue ?? "")}
      onBlur={(event) => {
        event.currentTarget.value = normalizeBulletLines(event.currentTarget.value);
        onBlur?.(event);
      }}
      onKeyDown={(event: KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();

          const textarea = event.currentTarget;
          const { selectionStart, selectionEnd, value } = textarea;
          const insertion = `\n${BULLET_PREFIX}`;
          const nextValue =
            value.slice(0, selectionStart) + insertion + value.slice(selectionEnd);

          textarea.value = nextValue;
          const nextCursor = selectionStart + insertion.length;
          textarea.setSelectionRange(nextCursor, nextCursor);
        }

        onKeyDown?.(event);
      }}
      onPaste={(event: ClipboardEvent<HTMLTextAreaElement>) => {
        const pastedText = event.clipboardData.getData("text");

        if (pastedText.includes("\n")) {
          event.preventDefault();

          const textarea = event.currentTarget;
          const { selectionStart, selectionEnd, value } = textarea;
          const normalizedPaste = normalizeBulletLines(pastedText);
          const nextValue =
            value.slice(0, selectionStart) + normalizedPaste + value.slice(selectionEnd);

          textarea.value = nextValue;
          const nextCursor = selectionStart + normalizedPaste.length;
          textarea.setSelectionRange(nextCursor, nextCursor);
        }

        onPaste?.(event);
      }}
    />
  );
}
