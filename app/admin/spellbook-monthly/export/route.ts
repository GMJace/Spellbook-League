import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin-access";
import {
  buildSpellbookMonthlyCsv,
  getSpellbookMonthlySubscribers,
} from "@/lib/spellbook-monthly";

export async function GET() {
  const session = await auth();

  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    return new Response("Unauthorized", {
      status: 401,
    });
  }

  const subscribers = await getSpellbookMonthlySubscribers();
  const csv = buildSpellbookMonthlyCsv(subscribers);
  const exportDate = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="spellbook-monthly-subscribers-${exportDate}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
