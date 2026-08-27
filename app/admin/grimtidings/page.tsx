import { AdminTidingsAccountingSections } from "@/components/admin-tidings-accounting-sections";
import { AdminPageHeader } from "@/components/admin-page-header";
import { requireAdminUser } from "@/lib/admin";

export default async function AdminGrimTidingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    tidings?: string;
  }>;
}) {
  await requireAdminUser();
  const params = await searchParams;

  const tidingsMessageMap: Record<string, string> = {
    created: "Grim Tidings game created.",
  };
  const tidingsMessage = params.tidings ? tidingsMessageMap[params.tidings] : "";

  return (
    <main className="page-shell">
      <section className="stack">
        {tidingsMessage ? <p style={{ color: "#ffffff", margin: 0 }}>{tidingsMessage}</p> : null}

        <AdminPageHeader
          description="Create and manage Grim Tidings league games, then review how many Tidings each player or DM has earned, spent, and still has available."
          title="Grim Tidings"
        />

        <AdminTidingsAccountingSections />
      </section>
    </main>
  );
}
