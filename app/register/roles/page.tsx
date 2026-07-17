import { redirect } from "next/navigation";
import { RoleSelectionForm } from "@/components/role-selection-form";
import { RainbowSpellbook } from "@/components/rainbow-spellbook";
import { requireUser } from "@/lib/auth";

export default async function RegisterRolesPage() {
  const user = await requireUser({ allowMissingDiscord: true });
  const requireDiscordHandle = !user.discordHandle?.trim();

  if (user.roles.includes("PLAYER")) {
    redirect("/player");
  }

  if (user.roles.includes("DM")) {
    redirect("/dm");
  }

  return (
    <main className="grid two">
      <section className="panel stack">
        <div>
          <p className="eyebrow">Finish registration</p>
          <h1>Choose your roles</h1>
          <p className="muted">
            Your account is connected. Pick one or more roles so we can set up
            your access inside <RainbowSpellbook />.
          </p>
          {requireDiscordHandle ? (
            <p className="muted">
              Add the Discord handle the league should use to coordinate with you
              before we finish registration.
            </p>
          ) : null}
        </div>
      </section>
      <section className="panel">
        <RoleSelectionForm
          initialDiscordHandle={user.discordHandle ?? ""}
          initialName={user.name ?? "User"}
          initialProfileImagePath={user.profileImagePath ?? ""}
          requireDiscordHandle={requireDiscordHandle}
        />
      </section>
    </main>
  );
}
