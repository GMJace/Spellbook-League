import type { AdventureCatalogAutofillPayload } from "@/lib/adventure-catalog";

export async function lookupAdventureCatalogAutofill(params: {
  adventureCode?: string;
  title?: string;
  tier?: "TIER_1" | "TIER_2" | "TIER_3" | "TIER_4";
}) {
  const searchParams = new URLSearchParams();

  if (params.adventureCode?.trim()) {
    searchParams.set("adventureCode", params.adventureCode.trim());
  }

  if (params.title?.trim()) {
    searchParams.set("title", params.title.trim());
  }

  if (params.tier?.trim()) {
    searchParams.set("tier", params.tier.trim());
  }

  const response = await fetch(`/api/adventure-catalog/lookup?${searchParams.toString()}`, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Unable to look up that adventure right now.");
  }

  return (await response.json()) as {
    match: AdventureCatalogAutofillPayload | null;
  };
}
