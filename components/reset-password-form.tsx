"use client";

import Link from "next/link";
import { useActionState } from "react";
import { resetPassword } from "@/app/reset-password/actions";

const initialState = {
  error: "",
  success: "",
};

export function ResetPasswordForm({
  token,
}: {
  token: string;
}) {
  const [state, formAction, pending] = useActionState(resetPassword, initialState);

  return (
    <form action={formAction} className="form-stack">
      <input type="hidden" name="token" value={token} />

      <label>
        New password
        <input name="password" type="password" minLength={8} required />
      </label>

      <label>
        Confirm new password
        <input name="confirmPassword" type="password" minLength={8} required />
      </label>

      {state.error ? <p style={{ color: "#ffffff", margin: 0 }}>{state.error}</p> : null}
      {state.success ? (
        <p style={{ color: "#ffffff", margin: 0 }}>
          {state.success}{" "}
          <Link href="/login?reset=1" className="ledger-link">
            Return to login
          </Link>
        </p>
      ) : null}

      <button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Reset password"}
      </button>
    </form>
  );
}
