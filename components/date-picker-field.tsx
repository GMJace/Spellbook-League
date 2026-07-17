"use client";

import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { useRef } from "react";

type DatePickerFieldProps = Omit<ComponentPropsWithoutRef<"input">, "type"> & {
  buttonClassName?: string;
  buttonLabel?: string;
  label: ReactNode;
  labelClassName?: string;
  type?: "date" | "datetime-local";
  wrapperClassName?: string;
};

export function DatePickerField({
  buttonClassName = "button button-secondary",
  buttonLabel = "Open calendar",
  disabled,
  label,
  labelClassName,
  type = "date",
  wrapperClassName = "form-stack",
  ...props
}: DatePickerFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className={wrapperClassName}>
      <label className={labelClassName}>
        {label}
        <input {...props} disabled={disabled} ref={inputRef} type={type} />
      </label>
      <button
        className={buttonClassName}
        disabled={disabled}
        onClick={() => {
          const input = inputRef.current as
            | (HTMLInputElement & { showPicker?: () => void })
            | null;

          if (!input) {
            return;
          }

          input.focus();
          input.showPicker?.();
        }}
        type="button"
      >
        {buttonLabel}
      </button>
    </div>
  );
}
