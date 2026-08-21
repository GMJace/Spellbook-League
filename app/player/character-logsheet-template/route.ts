import { buildCharacterLogsheetTemplateCsv } from "@/lib/character-logsheet-import";

export const dynamic = "force-dynamic";

export async function GET() {
  return new Response(`\uFEFF${buildCharacterLogsheetTemplateCsv()}`, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": 'attachment; filename="spellbook-character-logsheet-template.csv"',
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
}
