import { NextResponse } from "next/server";
import { normalizeAdventureLookupValue } from "@/lib/adventure-catalog";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const query = normalizeAdventureLookupValue(new URL(request.url).searchParams.get("q") ?? "").slice(0, 160);
  if (query.length < 2) return NextResponse.json({ matches: [] });
  try {
    const matches = await prisma.adventureCatalog.findMany({
      where: { isActive: true, OR: [{ lookupCode: { contains: query } }, { lookupTitle: { contains: query } }] },
      select: { id: true, adventureCode: true, title: true, tier: true },
      orderBy: [{ title: "asc" }, { adventureCode: "asc" }, { tier: "asc" }],
      take: 20,
    });
    return NextResponse.json({ matches });
  } catch {
    return NextResponse.json({ error: "Unable to search the module catalog. Please try again." }, { status: 500 });
  }
}
