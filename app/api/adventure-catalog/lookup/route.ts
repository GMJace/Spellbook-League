import { NextResponse } from "next/server";

import { findAdventureCatalogAutofill } from "@/lib/adventure-catalog-server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const adventureCode = searchParams.get("adventureCode") ?? "";
  const title = searchParams.get("title") ?? "";
  const tier = searchParams.get("tier") ?? "";

  try {
    const match = await findAdventureCatalogAutofill({
      adventureCode,
      title,
      tier,
    });

    return NextResponse.json({ match });
  } catch {
    return NextResponse.json(
      {
        error: "Unable to look up that adventure right now.",
      },
      { status: 500 }
    );
  }
}
