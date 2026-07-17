import Link from "next/link";

import { updateProfile } from "@/app/profile/actions";
import { ChangePasswordForm } from "@/components/change-password-form";
import { ConfirmCheckbox } from "@/components/confirm-checkbox";
import { ProfileAvatar } from "@/components/profile-avatar";
import { RainbowSpellbook } from "@/components/rainbow-spellbook";
import { requireUser } from "@/lib/auth";
import { getProDmRosterEntry } from "@/lib/pro-dm-roster";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ updated?: string; error?: string; missingDiscord?: string }>;
}) {
  const user = await requireUser({ allowMissingDiscord: true });
  const params = await searchParams;
  const dmProfile = await getProDmRosterEntry(user.id);
  const isDiscordRequired =
    user.roles.includes("PLAYER") || user.roles.includes("DM");
  const shouldShowDmProfileSection = user.roles.includes("DM");

  return (
    <main className="stack">
      <section className="card ledger-panel stack">
        {params.missingDiscord === "1" ? (
          <p style={{ color: "#ffffff", margin: 0 }}>
            Add a Discord handle before continuing. <RainbowSpellbook /> uses
            it to coordinate players, DMs, and event scheduling.
          </p>
        ) : null}
        {params.error === "invalid" ? (
          <p style={{ color: "#ffffff", margin: 0 }}>
            Please review your profile details, keep at least one role selected,
            add a Discord handle for active league roles, and make sure any public
            DM profile text stays within the limits.
          </p>
        ) : null}
        {params.error === "email-in-use" ? (
          <p style={{ color: "#ffffff", margin: 0 }}>
            That email address is already in use by another account.
          </p>
        ) : null}
        {params.error && params.error !== "invalid" && params.error !== "email-in-use" ? (
          <p style={{ color: "#ffffff", margin: 0 }}>
            {params.error}
          </p>
        ) : null}
        {params.updated === "1" ? (
          <p style={{ color: "#ffffff", margin: 0 }}>Profile updated.</p>
        ) : null}

        <form action={updateProfile} className="form-stack">
          <div className="list-card stack">
            <div>
              <h2 style={{ margin: 0 }}>Registered profile</h2>
              <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                Edit the account details attached to this registration.
              </p>
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
                name={user.name ?? "User"}
                src={user.profileImagePath}
                size={96}
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
                  Displays on player and DM profiles. PNG, JPG, WEBP, or GIF up to
                  5 MB.
                </p>
                {user.profileImagePath ? (
                  <label className="checkbox-row compact-checkbox-row">
                    <ConfirmCheckbox
                      message="Remove your current profile picture?"
                      name="removeProfileImage"
                      value="true"
                    />
                    Remove current picture
                  </label>
                ) : null}
              </div>
            </div>

            <label>
              Display name
              <input
                name="name"
                type="text"
                required
                defaultValue={user.name ?? ""}
              />
            </label>

            <label>
              Email
              <input
                name="email"
                type="email"
                required
                defaultValue={user.email ?? ""}
              />
            </label>

            <label>
              Discord handle
              <input
                name="discordHandle"
                type="text"
                placeholder="@spellbookdm"
                defaultValue={user.discordHandle ?? ""}
                required={isDiscordRequired}
                autoFocus={params.missingDiscord === "1"}
              />
            </label>
            {isDiscordRequired ? (
              <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                Required for player and DM coordination.
              </p>
            ) : null}

            <div className="stack" style={{ gap: "0.45rem" }}>
              <span className="muted">Roles</span>
              <label className="checkbox-row compact-checkbox-row">
                <input
                  type="checkbox"
                  name="roles"
                  value="PLAYER"
                  defaultChecked={user.roles.includes("PLAYER")}
                />
                Player
              </label>
              <label className="checkbox-row compact-checkbox-row">
                <input
                  type="checkbox"
                  name="roles"
                  value="DM"
                  defaultChecked={user.roles.includes("DM")}
                />
                Dungeon Master
              </label>
            </div>
          </div>

          {shouldShowDmProfileSection ? (
            <div className="list-card stack">
              <img
                alt="Professional DM profile divider"
                className="ggcon-table-divider"
                src="/divider4.png"
              />
              <div>
                <h2 style={{ margin: 0 }}>Professional DM public profile</h2>
                <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                  Admins control the public Hire a DM roster. Save your public copy
                  here now, and it will appear automatically if you are promoted into
                  the Professional <RainbowSpellbook /> DM lineup.
                </p>
              </div>

              <label>
                Public headline
                <input
                  name="dmProfileHeadline"
                  type="text"
                  maxLength={80}
                  placeholder="Story-first horror specialist"
                  defaultValue={dmProfile?.headline ?? ""}
                />
              </label>

              <label>
                Specialties
                <input
                  name="dmProfileSpecialties"
                  type="text"
                  maxLength={140}
                  placeholder="Gothic horror, beginner-friendly tables, convention play"
                  defaultValue={dmProfile?.specialties ?? ""}
                />
              </label>

              <label>
                Public bio
                <textarea
                  name="dmProfileBio"
                  rows={6}
                  maxLength={1200}
                  placeholder="Tell players what kind of table experience you run, what systems or tones you excel at, and why they should book you."
                  defaultValue={dmProfile?.bio ?? ""}
                />
              </label>

              <div>
                <Link className="button button-secondary button-small" href={`/hire-a-dm/${user.id}`}>
                  Preview public page
                </Link>
              </div>
            </div>
          ) : null}

          <button type="submit">Save profile</button>
        </form>
      </section>

      <section className="card ledger-panel">
        <div className="list-card stack">
          <ChangePasswordForm hasPassword={user.hasPassword} />
        </div>
      </section>
    </main>
  );
}
