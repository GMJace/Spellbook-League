import Link from "next/link";
import { notFound } from "next/navigation";

import { updateCharacterDowntimeEntry } from "@/app/player/characters/[id]/downtime/actions";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const DOWNTIME_ACTIVITY_OPTIONS = [
  "Catching Up",
  "Copying Spells",
  "Crafting Equipment",
  "Scribing Spell Scrolls",
  "Other downtime activity",
];

function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default async function EditCharacterDowntimePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; entryId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireRole("PLAYER");
  const { id, entryId } = await params;
  const query = await searchParams;

  const [character, entry] = await Promise.all([
    prisma.character.findFirst({
      where: {
        id,
        userId: user.id,
      },
      select: {
        id: true,
        name: true,
      },
    }),
    prisma.characterDowntimeEntry.findFirst({
      where: {
        id: entryId,
        characterId: id,
        userId: user.id,
      },
      select: {
        id: true,
        activity: true,
        downtimeDaysSpent: true,
        relatedAdventureCode: true,
        notes: true,
        spentAt: true,
      },
    }),
  ]);

  if (!character || !entry) {
    notFound();
  }

  return (
    <main className="stack">
      <section className="panel stack">
        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          <div>
            <p className="eyebrow">Character logsheet</p>
            <h1>Edit downtime for {character.name}</h1>
            <p className="muted">
              Update this downtime entry whenever you need to correct the days, notes, or other
              activity details.
            </p>
          </div>
          <Link className="button button-secondary" href={`/player/characters/${character.id}`}>
            Back
          </Link>
        </div>

        {query.error === "invalid" ? (
          <p style={{ color: "#ffffff", margin: 0 }}>
            Please complete the downtime details and use a valid date.
          </p>
        ) : null}

        <form action={updateCharacterDowntimeEntry} className="list-card form-stack">
          <input name="characterId" type="hidden" value={character.id} />
          <input name="entryId" type="hidden" value={entry.id} />

          <div
            style={{
              display: "grid",
              gap: "0.9rem",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            }}
          >
            <label className="stack" style={{ gap: "0.35rem" }}>
              <span>Downtime date</span>
              <input
                defaultValue={formatDateInput(entry.spentAt)}
                name="spentAt"
                required
                type="date"
              />
            </label>
            <label className="stack" style={{ gap: "0.35rem" }}>
              <span>Downtime days spent</span>
              <input
                defaultValue={String(entry.downtimeDaysSpent)}
                min="1"
                name="downtimeDaysSpent"
                required
                type="number"
              />
            </label>
            <label className="stack" style={{ gap: "0.35rem" }}>
              <span>Activity</span>
              <select defaultValue={entry.activity} name="activity" required>
                {DOWNTIME_ACTIVITY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="stack" style={{ gap: "0.35rem" }}>
              <span>Related adventure code</span>
              <input defaultValue={entry.relatedAdventureCode} name="relatedAdventureCode" type="text" />
            </label>
          </div>

          <label className="stack" style={{ gap: "0.35rem" }}>
            <span>Notes</span>
            <textarea
              defaultValue={entry.notes}
              name="notes"
              rows={6}
              placeholder="Add spell levels copied, crafted items, catch-up details, or any other downtime notes."
            />
          </label>

          <div>
            <button className="button" type="submit">
              Save downtime changes
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
