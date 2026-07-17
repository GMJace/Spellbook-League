"use client";

import { useActionState, useState } from "react";
import { registerUser } from "@/app/register/actions";
import { OAuthSignInButton } from "@/components/oauth-sign-in-button";
import { RainbowSpellbook } from "@/components/rainbow-spellbook";
import { TermsOfServiceDialog } from "@/components/terms-of-service-dialog";

const initialState = { error: "" };

export function RegisterForm({
  allowDiscord = false,
  allowGoogle = false,
}: {
  allowDiscord?: boolean;
  allowGoogle?: boolean;
}) {
  const [state, formAction, pending] = useActionState(registerUser, initialState);
  const [wantsDmRole, setWantsDmRole] = useState(false);

  return (
    <form action={formAction} className="form-stack">
      <div className="form-grid">
        <OAuthSignInButton
          enabled={allowGoogle}
          label="Continue with Google"
          provider="google"
        />
        <OAuthSignInButton
          enabled={allowDiscord}
          label="Continue with Discord"
          provider="discord"
        />
      </div>
      <p className="muted" style={{ margin: 0 }}>
        Or register with email and password.
      </p>
      <div className="list-card form-stack">
        <div>
          <h2 style={{ margin: 0 }}>Registered profile</h2>
          <p className="muted" style={{ margin: "0.35rem 0 0" }}>
            Set up the account details for this registration.
          </p>
        </div>
        <div className="stack" style={{ gap: "0.45rem" }}>
          <span className="muted">Roles</span>
          <label className="checkbox-row compact-checkbox-row">
            <input type="checkbox" name="roles" value="PLAYER" />
            Player
          </label>
          <label className="checkbox-row compact-checkbox-row">
            <input
              type="checkbox"
              name="roles"
              value="DM"
              onChange={(event) => setWantsDmRole(event.target.checked)}
            />
            Dungeon Master
          </label>
        </div>
        <label>
          Name
          <input name="name" type="text" required />
        </label>
        <label>
          Profile picture
          <input
            accept="image/png,image/jpeg,image/webp,image/gif"
            name="profileImage"
            type="file"
          />
        </label>
        <p className="muted" style={{ margin: 0 }}>
          Optional. Displays on player and DM profiles. PNG, JPG, WEBP, or GIF up
          to 5 MB.
        </p>
        <label>
          Discord Handle
          <input
            name="discordHandle"
            type="text"
            placeholder="@spellbookdm"
            required={wantsDmRole}
          />
        </label>
        {wantsDmRole ? (
          <p className="muted" style={{ margin: 0 }}>
            Required when registering as a Dungeon Master.
          </p>
        ) : null}
        <label>
          Email
          <input name="email" type="email" required />
        </label>
        <label>
          Password
          <input name="password" type="password" minLength={8} required />
        </label>
      </div>
      <div className="list-card form-stack">
        <TermsOfServiceDialog />
        <label className="checkbox-row" style={{ alignItems: "flex-start" }}>
          <input name="acceptTerms" type="checkbox" value="true" />
          <span>
            I have read and agree to the <RainbowSpellbook /> Terms of Service,
            Community Agreement, Code of Conduct, and Privacy Policy. I
            understand that <RainbowSpellbook /> may remove, suspend, or ban
            players or Dungeon Masters who violate these rules or disrupt the
            community. If under the age of 18; I confirm that I am of legal
            age to agree to these terms, or that I have permission from my
            parent or legal guardian to create this account and participate in{" "}
            <RainbowSpellbook /> events.
          </span>
        </label>
      </div>
      {state?.error ? <p style={{ color: "#ffffff" }}>{state.error}</p> : null}
      <button type="submit" disabled={pending}>
        {pending ? "Creating account..." : "Create account"}
      </button>
    </form>
  );
}
