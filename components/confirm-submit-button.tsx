"use client";

import type { ComponentPropsWithoutRef, MouseEvent, ReactNode } from "react";

type ConfirmSubmitButtonProps = {
  children: ReactNode;
  message: string;
} & Omit<ComponentPropsWithoutRef<"button">, "type">;

export function ConfirmSubmitButton({
  children,
  message,
  onClick,
  ...buttonProps
}: ConfirmSubmitButtonProps) {
  return (
    <button
      onClick={(event) => {
        onClick?.(event as MouseEvent<HTMLButtonElement>);

        if (event.defaultPrevented) {
          return;
        }

        if (!window.confirm(message)) {
          event.preventDefault();
        }
      }}
      type="submit"
      {...buttonProps}
    >
      {children}
    </button>
  );
}
