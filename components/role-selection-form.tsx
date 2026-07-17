"use client";

import { useState } from "react";
import { completeOAuthRegistration } from "@/app/register/roles/actions";
import { ProfileAvatar } from "@/components/profile-avatar";

export function RoleSelectionForm({
  initialDiscordHandle = "",
  initialName = "User",
  initialProfileImagePath = "",
  requireDiscordHandle = false,
}: {
  initialDiscordHandle?: string;
  initialName?: string;
  initialProfileImagePath?: string;
  requireDiscordHandle?: boolean;
}) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const showDiscordField = requireDiscordHandle || Boolean(initialDiscordHandle);

  return (
    <form
      action={async (formData) => {
        setPending(true);
        setError("");
        const result = await completeOAuthRegistration(formData);
        if (result?.error) {
          setError(result.error);
          setPending(false);
        }
      }}
      className="form-stack"
    >
      <div className="list-card form-stack">
        <div>
          <h2 style={{ margin: 0 }}>Registered profile</h2>
          <p className="muted" style={{ margin: "0.35rem 0 0" }}>
            Finish setting up the account details for this registration.
          </p>
        </div>
        <div className="stack" style={{ gap: "0.45rem" }}>
          <span className="muted">Roles</span>
          <label className="checkbox-row compact-checkbox-row">
            <input type="checkbox" name="roles" value="PLAYER" />
            Player
          </label>
          <label className="checkbox-row compact-checkbox-row">
            <input type="checkbox" name="roles" value="DM" />
            Dungeon Master
          </label>
        </div>
        <div
          style={{
            display: "flex",
            gap: "1rem",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <ProfileAvatar
            name={initialName}
            src={initialProfileImagePath || null}
            size={88}
          />
          <div className="stack" style={{ gap: "0.5rem", flex: "1 1 280px" }}>
            <label>
              Profile picture
              <input
                accept="image/png,image/jpeg,image/webp,image/gif"
                name="profileImage"
                type="file"
              />
            </label>
            <p className="muted" style={{ margin: 0 }}>
              Optional. Displays on player and DM profiles. PNG, JPG, WEBP, or GIF
              up to 5 MB.
            </p>
          </div>
        </div>
        {showDiscordField ? (
          <label>
            Discord handle
            <input
              name="discordHandle"
              type="text"
              placeholder="@spellbookdm"
              defaultValue={initialDiscordHandle}
              required={requireDiscordHandle}
            />
          </label>
        ) : null}
        {requireDiscordHandle ? (
          <p className="muted" style={{ margin: 0 }}>
            Add the Discord handle organizers and players should use to reach you.
          </p>
        ) : null}
      </div>
      {error ? <p style={{ color: "#8f341b" }}>{error}</p> : null}
      <button type="submit" disabled={pending}>
        {pending ? "Saving roles..." : "Continue"}
      </button>
    </form>
  );
}
