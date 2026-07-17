"use client";

import type { ChangeEvent, ComponentPropsWithoutRef } from "react";

type ConfirmCheckboxProps = {
  message: string;
} & Omit<ComponentPropsWithoutRef<"input">, "type">;

export function ConfirmCheckbox({
  message,
  onChange,
  ...inputProps
}: ConfirmCheckboxProps) {
  return (
    <input
      {...inputProps}
      onChange={(event) => {
        if (event.currentTarget.checked && !window.confirm(message)) {
          event.currentTarget.checked = false;
          return;
        }

        onChange?.(event as ChangeEvent<HTMLInputElement>);
      }}
      type="checkbox"
    />
  );
}
