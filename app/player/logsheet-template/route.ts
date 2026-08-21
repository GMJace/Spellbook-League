import { buildPlayerLogsheetTemplateCsv } from "@/lib/player-logsheet-import";

export const dynamic = "force-dynamic";

export async function GET() {
  return new Response(`\uFEFF${buildPlayerLogsheetTemplateCsv()}`, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": 'attachment; filename="spellbook-logsheet-template.csv"',
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
}
