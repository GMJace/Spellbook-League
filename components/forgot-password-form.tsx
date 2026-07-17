"use client";

import { useActionState } from "react";
import { requestPasswordReset } from "@/app/forgot-password/actions";

const initialState = {
  error: "",
  success: "",
  devResetPath: "",
};

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(
    requestPasswordReset,
    initialState
  );

  return (
    <form action={formAction} className="form-stack">
      <label>
        Email
        <input name="email" type="email" required />
      </label>

      <p className="muted" style={{ margin: 0 }}>
        Enter the address on the account and we&apos;ll prepare a one-time reset link.
      </p>

      {state.error ? <p style={{ color: "#ffffff", margin: 0 }}>{state.error}</p> : null}
      {state.success ? <p style={{ color: "#ffffff", margin: 0 }}>{state.success}</p> : null}
      {state.devResetPath ? (
        <p style={{ color: "#ffffff", margin: 0 }}>
          Local development reset link:{" "}
          <a href={state.devResetPath} className="ledger-link">
            Open password reset
          </a>
        </p>
      ) : null}

      <button type="submit" disabled={pending}>
        {pending ? "Preparing reset..." : "Send reset link"}
      </button>
    </form>
  );
}
