"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginUser } from "@/app/login/actions";
import { OAuthSignInButton } from "@/components/oauth-sign-in-button";

export function LoginForm({
  allowDiscord = false,
  allowGoogle = false,
}: {
  allowDiscord?: boolean;
  allowGoogle?: boolean;
}) {
  const [state, formAction, pending] = useActionState(loginUser, { error: "" });

  return (
    <form action={formAction} className="form-stack">
      <div className="form-grid">
        <OAuthSignInButton
          enabled={allowGoogle}
          label="Sign in with Google"
          provider="google"
        />
        <OAuthSignInButton
          enabled={allowDiscord}
          label="Sign in with Discord"
          provider="discord"
        />
      </div>
      <p className="muted" style={{ margin: 0 }}>
        Or sign in with email and password.
      </p>
      <label>
        Email
        <input name="email" type="email" required />
      </label>
      <label>
        Password
        <input name="password" type="password" minLength={8} required />
      </label>
      <p style={{ margin: 0 }}>
        <Link href="/forgot-password" className="ledger-link">
          Forgot password?
        </Link>
      </p>
      {state?.error ? <p style={{ color: "#ffffff" }}>{state.error}</p> : null}
      <button type="submit" disabled={pending}>
        {pending ? "Signing in..." : "Login"}
      </button>
    </form>
  );
}
