"use client";

import { useEffect, useRef, useState } from "react";
import type { Tier } from "@prisma/client";
import { SearchIcon } from "@/components/search-icon";
import { formatTier } from "@/lib/utils";

type CatalogMatch = {
  id: string;
  adventureCode: string;
  title: string;
  tier: Tier;
};

export function DmModuleCatalog() {
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<CatalogMatch[]>([]);
  const [message, setMessage] = useState("Search by adventure code or module title.");
  const [loading, setLoading] = useState(false);
  const requestRef = useRef<AbortController | null>(null);

  useEffect(() => () => requestRef.current?.abort(), []);

  async function searchCatalog() {
    requestRef.current?.abort();
    setMatches([]);
    if (query.trim().length < 2) {
      setLoading(false);
      setMessage("Enter at least two characters to search the catalog.");
      return;
    }

    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);
    setMessage("Searching the module catalog…");
    try {
      const response = await fetch(`/api/adventure-catalog/search?q=${encodeURIComponent(query.trim())}`, {
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("Unable to search the module catalog. Please try again.");
      const data = await response.json() as { matches: CatalogMatch[] };
      if (controller.signal.aborted) return;
      setMatches(data.matches);
      setMessage(data.matches.length === 20
        ? "Showing the first 20 matches. Refine your search to find a specific module."
        : data.matches.length
          ? `${data.matches.length} module${data.matches.length === 1 ? "" : "s"} found.`
          : "No modules match that search. Try another title or adventure code.");
    } catch (error) {
      if (!controller.signal.aborted) {
        setMessage(error instanceof Error ? error.message : "Unable to search the module catalog. Please try again.");
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  return (
    <section className="card ledger-panel stack dm-dashboard-catalog" aria-labelledby="dm-module-catalog-heading">
      <h2 id="dm-module-catalog-heading" style={{ margin: 0 }}>Module catalog</h2>
      <form className="search-row" onSubmit={(event) => { event.preventDefault(); void searchCatalog(); }}>
        <input
          className="input"
          type="search"
          aria-label="Search module catalog"
          placeholder="Search by adventure code or module title"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <button className="button secondary search-icon-button" type="submit" aria-label="Search module catalog">
          <SearchIcon />
        </button>
      </form>
      <p className="muted" role="status" style={{ margin: 0 }}>{message}</p>
      <div className="stack" aria-busy={loading}>
        {matches.map((module) => (
          <article className="list-card stack" key={module.id} style={{ gap: "0.35rem", overflowWrap: "anywhere" }}>
            <h3 style={{ margin: 0 }}>{module.title}</h3>
            <div>Adventure code: <strong>{module.adventureCode}</strong></div>
            <div>Tier: <strong>{formatTier(module.tier)}</strong></div>
          </article>
        ))}
      </div>
    </section>
  );
}
