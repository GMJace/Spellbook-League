import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createCharacterDowntimeEntry } from "@/app/player/characters/[id]/downtime/actions";

export const dynamic = "force-dynamic";

const DOWNTIME_ACTIVITY_OPTIONS = [
  "Catching Up",
  "Copying Spells",
  "Crafting Equipment",
  "Scribing Spell Scrolls",
  "Other downtime activity",
];

function getTodayDateValue() {
  return new Date().toISOString().slice(0, 10);
}

export default async function NewCharacterDowntimePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireRole("PLAYER");
  const { id } = await params;
  const query = await searchParams;

  const character = await prisma.character.findFirst({
    where: {
      id,
      userId: user.id,
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (!character) {
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
            <h1>Log downtime for {character.name}</h1>
            <p className="muted">
              Track downtime spent between or during sessions. Trading Magic Items should stay in the
              Trade Log.
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

        <div className="list-card stack">
          <h2 style={{ margin: 0 }}>Downtime rules</h2>
          <p className="muted" style={{ margin: 0 }}>
            Use Downtime Days to take part in activities requiring time to complete between or
            during sessions. Use 1 DT for each day (8 hours) required.
          </p>
          <div className="stack" style={{ gap: "0.45rem" }}>
            <p style={{ margin: 0 }}>
              <strong>Catching Up.</strong> 10 DT to gain a level. With a newly-built level 5
              character, ask your DM when to catch up.
            </p>
            <p style={{ margin: 0 }}>
              <strong>Copying Spells.</strong> Copy spells found in adventures at 1 DT per spell
              up to level 4 and 2 DT per spell at levels 5-9.
            </p>
            <p style={{ margin: 0 }}>
              <strong>Crafting Equipment.</strong> Ammunition is crafted in quantities equal to how
              many are sold together.
            </p>
            <p style={{ margin: 0 }}>
              <strong>Scribing Spell Scrolls.</strong> A Spell Scroll may not be scribed at higher
              levels.
            </p>
            <p style={{ margin: 0 }}>
              <strong>Trading Magic Items.</strong> Each character involved in a trade spends 5 DT.
              Manage that in the Trade Log.
            </p>
          </div>
        </div>

        <form action={createCharacterDowntimeEntry} className="list-card form-stack">
          <input name="characterId" type="hidden" value={character.id} />

          <div
            style={{
              display: "grid",
              gap: "0.9rem",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            }}
          >
            <label className="stack" style={{ gap: "0.35rem" }}>
              <span>Downtime date</span>
              <input defaultValue={getTodayDateValue()} name="spentAt" required type="date" />
            </label>
            <label className="stack" style={{ gap: "0.35rem" }}>
              <span>Downtime days spent</span>
              <input defaultValue="1" min="1" name="downtimeDaysSpent" required type="number" />
            </label>
            <label className="stack" style={{ gap: "0.35rem" }}>
              <span>Activity</span>
              <select defaultValue={DOWNTIME_ACTIVITY_OPTIONS[0]} name="activity" required>
                {DOWNTIME_ACTIVITY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="stack" style={{ gap: "0.35rem" }}>
              <span>Related adventure code</span>
              <input name="relatedAdventureCode" type="text" />
            </label>
          </div>

          <label className="stack" style={{ gap: "0.35rem" }}>
            <span>Notes</span>
            <textarea
              name="notes"
              rows={6}
              placeholder="Add spell levels copied, crafted items, catch-up details, or any other downtime notes."
            />
          </label>

          <div>
            <button className="button" type="submit">
              Save downtime entry
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
