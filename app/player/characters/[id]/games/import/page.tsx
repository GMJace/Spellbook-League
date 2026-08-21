import Link from "next/link";
import { notFound } from "next/navigation";
import { importPlayerGameLogsheet } from "@/app/player/characters/[id]/games/actions";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ details?: string; error?: string }>;
};

const IMPORT_ERROR_MESSAGES: Record<string, string> = {
  "empty-file": "That file did not include any rows to import.",
  "file-too-large": "That file is too large. Please keep it under 2 MB.",
  "invalid-file": "Please upload the completed CSV or spreadsheet template.",
  "invalid-headers": "The uploaded file is missing one or more required columns.",
  "invalid-rows": "Some rows could not be imported.",
  "missing-file": "Choose a completed logsheet spreadsheet before importing.",
  "no-rows": "No completed game rows were found in that file.",
};

function getImportErrorMessage(error?: string, details?: string) {
  if (!error) {
    return null;
  }

  const baseMessage = IMPORT_ERROR_MESSAGES[error] ?? "The logsheet could not be imported.";

  if (!details?.trim()) {
    return baseMessage;
  }

  return `${baseMessage} ${details.trim()}`;
}

export default async function ImportPlayerGameLogsheetPage({
  params,
  searchParams,
}: PageProps) {
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

  const errorMessage = getImportErrorMessage(query.error, query.details);

  return (
    <main className="stack">
      <section className="panel stack">
        <div>
          <p className="eyebrow">Character logsheet</p>
          <h1>Import a logsheet for {character.name}</h1>
          <p className="muted">
            Download the template, fill in one completed game per row, then upload the completed
            CSV or spreadsheet to add those entries to this character&apos;s adventure log.
          </p>
        </div>

        {errorMessage ? (
          <p style={{ color: "#ffffff", margin: 0 }}>{errorMessage}</p>
        ) : null}

        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            flexWrap: "wrap",
          }}
        >
          <Link className="button button-secondary" href="/player/logsheet-template">
            Download template
          </Link>
          <Link className="button button-secondary" href={`/player/characters/${character.id}`}>
            Back to character
          </Link>
        </div>

        <div className="list-card stack">
          <div className="section-heading">
            <h2 style={{ margin: 0 }}>What the template supports</h2>
          </div>
          <p className="muted" style={{ margin: 0 }}>
            The template works in Excel, Google Sheets, and similar spreadsheet apps. Keep the
            header row as-is and use a new row for each completed game log.
          </p>
          <div
            style={{
              display: "grid",
              gap: "1rem",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            }}
          >
            <div className="list-card stack">
              <h3 style={{ margin: 0 }}>Required game details</h3>
              <p className="muted" style={{ margin: 0 }}>
                Date, Game Title, Adventure Code, DM, and Tier are required for each imported row.
              </p>
            </div>
            <div className="list-card stack">
              <h3 style={{ margin: 0 }}>Magic reward blocks</h3>
              <p className="muted" style={{ margin: 0 }}>
                The template supports Uncommon+ and Common magic item selections with counts-as,
                item name, minor property, and flavor notes.
              </p>
            </div>
            <div className="list-card stack">
              <h3 style={{ margin: 0 }}>Other rewards</h3>
              <p className="muted" style={{ margin: 0 }}>
                Consumables, Spellbooks, spell rewards, Boons, Blessings, Charms, and extra notes
                are all imported into the logged game.
              </p>
            </div>
            <div className="list-card stack">
              <h3 style={{ margin: 0 }}>Extra row details</h3>
              <p className="muted" style={{ margin: 0 }}>
                Downtime Days Awarded and Leveled Up are preserved in the session notes when they
                are filled in.
              </p>
            </div>
          </div>
        </div>

        <form action={importPlayerGameLogsheet} className="list-card form-stack">
          <input name="characterId" type="hidden" value={character.id} />

          <label>
            Completed logsheet spreadsheet
            <input
              accept=".csv,text/csv,.xls,application/vnd.ms-excel,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              name="logsheetFile"
              required
              type="file"
            />
          </label>

          <p className="muted" style={{ margin: 0 }}>
            Tip: spreadsheet line breaks inside a single cell are preserved, so notes and reward
            lists can stay grouped on one row.
          </p>

          <button type="submit">Import logsheet</button>
        </form>
      </section>
    </main>
  );
}
