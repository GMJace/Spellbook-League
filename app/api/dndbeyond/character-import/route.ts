import { requireRole } from "@/lib/auth";
import { importCharacterFromDndBeyondPdf } from "@/lib/dnd-beyond-character-pdf-import";
import { importCharacterFromDndBeyondLink } from "@/lib/dnd-beyond-character-import";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  await requireRole("PLAYER");

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return jsonError("Upload a D&D Beyond exported PDF first.", 400);
  }

  const file = formData.get("characterPdfFile");
  const link = formData.get("characterSheetLink");

  if (typeof link === "string" && link.trim()) {
    try {
      return NextResponse.json({ character: await importCharacterFromDndBeyondLink(link) });
    } catch (error) {
      return jsonError(error instanceof Error ? error.message : "The character link could not be imported.", 400);
    }
  }

  if (!(file instanceof File)) {
    return jsonError("Choose a D&D Beyond exported PDF first.", 400);
  }

  try {
    const character = await importCharacterFromDndBeyondPdf(file);
    return NextResponse.json({ character });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "The D&D Beyond PDF import could not be completed.",
      400,
    );
  }
}
