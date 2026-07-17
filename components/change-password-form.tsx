"use client";

import { useActionState } from "react";
import { updatePassword } from "@/app/profile/actions";

const initialState = {
  error: "",
  success: "",
};

export function ChangePasswordForm({
  hasPassword,
}: {
  hasPassword: boolean;
}) {
  const [state, formAction, pending] = useActionState(updatePassword, initialState);

  return (
    <form action={formAction} className="form-stack">
      <img
        alt="Change password divider"
        className="ggcon-table-divider"
        src="/divider4.png"
      />
      <div>
        <h2 style={{ margin: 0 }}>
          {hasPassword ? "Change password" : "Create a password"}
        </h2>
        <p className="muted" style={{ margin: "0.35rem 0 0" }}>
          {hasPassword
            ? "Update the password you use for email sign-in."
            : "This account does not have an email password yet. Set one here so you can also sign in without Google."}
        </p>
      </div>

      {hasPassword ? (
        <label>
          Current password
          <input name="currentPassword" type="password" minLength={8} required />
        </label>
      ) : null}

      <label>
        New password
        <input name="newPassword" type="password" minLength={8} required />
      </label>

      <label>
        Confirm new password
        <input name="confirmPassword" type="password" minLength={8} required />
      </label>

      {state.error ? <p style={{ color: "#ffffff", margin: 0 }}>{state.error}</p> : null}
      {state.success ? <p style={{ color: "#ffffff", margin: 0 }}>{state.success}</p> : null}

      <button type="submit" disabled={pending}>
        {pending
          ? hasPassword
            ? "Updating..."
            : "Saving..."
          : hasPassword
            ? "Update password"
            : "Create password"}
      </button>
    </form>
  );
}
