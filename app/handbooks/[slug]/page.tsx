import Link from "next/link";
import { notFound } from "next/navigation";
import { getHandbookBySlug } from "@/lib/data";

const titleMap: Record<string, string> = {
  "players-guide": "Player's Guide",
  "dms-guide": "DM's Guide",
  "developers-guide": "Developer's Guide",
};

export default async function HandbookDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const handbook = await getHandbookBySlug(slug);

  if (!handbook) {
    notFound();
  }

  return (
    <main className="stack">
      <section className="panel ledger-panel stack">
        <div className="inline-actions" style={{ justifyContent: "space-between" }}>
          <div>
            <p className="eyebrow">Guide</p>
            <h1>{titleMap[slug] ?? handbook.title}</h1>
          </div>
          <Link href="/" className="button secondary">
            Back home
          </Link>
        </div>
      </section>

      <section className="card ledger-panel stack">
        <div className="guide-copy">
          <p>{handbook.content}</p>
        </div>
      </section>
    </main>
  );
}
