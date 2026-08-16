"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { CharacterBuildDisplay } from "@/components/character-build-display";
import { formatClassSummary } from "@/lib/character";

export type DmPlayerRosterRow = {
  id: string;
  playerName: string;
  discordHandle: string | null;
  characterName: string;
  class1Name: string;
  class1Subclass: string | null;
  class1Level: number;
  class2Name: string | null;
  class2Subclass: string | null;
  class2Level: number | null;
  class3Name: string | null;
  class3Subclass: string | null;
  class3Level: number | null;
  games: number;
};

type ColumnFilters = {
  player: string;
  discord: string;
  character: string;
  build: string;
  games: string;
};

function matchesFilter(value: string, query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  return value.toLowerCase().includes(normalizedQuery);
}

function filterRows(rows: DmPlayerRosterRow[], globalSearch: string, filters: ColumnFilters) {
  const normalizedGlobalSearch = globalSearch.trim().toLowerCase();

  return rows.filter((row) => {
    const buildSummary = formatClassSummary(row);
    const discordHandle = row.discordHandle ?? "Not provided";
    const matchesGlobal =
      !normalizedGlobalSearch ||
      row.playerName.toLowerCase().includes(normalizedGlobalSearch) ||
      discordHandle.toLowerCase().includes(normalizedGlobalSearch) ||
      row.characterName.toLowerCase().includes(normalizedGlobalSearch) ||
      buildSummary.toLowerCase().includes(normalizedGlobalSearch) ||
      String(row.games).includes(normalizedGlobalSearch);

    return (
      matchesGlobal &&
      matchesFilter(row.playerName, filters.player) &&
      matchesFilter(discordHandle, filters.discord) &&
      matchesFilter(row.characterName, filters.character) &&
      matchesFilter(buildSummary, filters.build) &&
      matchesFilter(String(row.games), filters.games)
    );
  });
}

export function DmPlayerRosterTable({
  initialSearch = "",
  rows,
}: {
  initialSearch?: string;
  rows: DmPlayerRosterRow[];
}) {
  const [globalSearch, setGlobalSearch] = useState(initialSearch);
  const [filters, setFilters] = useState<ColumnFilters>({
    player: "",
    discord: "",
    character: "",
    build: "",
    games: "",
  });

  const filteredRows = useMemo(
    () => filterRows(rows, globalSearch, filters),
    [rows, globalSearch, filters]
  );

  function updateFilter(key: keyof ColumnFilters, value: string) {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  }

  return (
    <div className="stack" style={{ gap: "0.8rem" }}>
      <div className="search-row">
        <input
          aria-label="Search players"
          className="input"
          onChange={(event) => setGlobalSearch(event.target.value)}
          placeholder="Search players, characters, classes, or game counts"
          type="search"
          value={globalSearch}
        />
      </div>

      <div className="table-wrap dm-player-roster-table-wrap">
        <table className="ledger-table">
          <thead>
            <tr>
              <th>Player</th>
              <th>Discord Handle</th>
              <th>Character</th>
              <th>Build</th>
              <th>Games</th>
              <th>Record</th>
            </tr>
            <tr className="table-filter-row">
              <th>
                <input
                  aria-label="Filter by player"
                  className="input table-filter-input"
                  onChange={(event) => updateFilter("player", event.target.value)}
                  placeholder="Filter player"
                  type="search"
                  value={filters.player}
                />
              </th>
              <th>
                <input
                  aria-label="Filter by Discord handle"
                  className="input table-filter-input"
                  onChange={(event) => updateFilter("discord", event.target.value)}
                  placeholder="Filter Discord"
                  type="search"
                  value={filters.discord}
                />
              </th>
              <th>
                <input
                  aria-label="Filter by character"
                  className="input table-filter-input"
                  onChange={(event) => updateFilter("character", event.target.value)}
                  placeholder="Filter character"
                  type="search"
                  value={filters.character}
                />
              </th>
              <th>
                <input
                  aria-label="Filter by build"
                  className="input table-filter-input"
                  onChange={(event) => updateFilter("build", event.target.value)}
                  placeholder="Filter build"
                  type="search"
                  value={filters.build}
                />
              </th>
              <th>
                <input
                  aria-label="Filter by games"
                  className="input table-filter-input"
                  inputMode="numeric"
                  onChange={(event) => updateFilter("games", event.target.value)}
                  placeholder="Filter games"
                  type="search"
                  value={filters.games}
                />
              </th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filteredRows.length ? (
              filteredRows.map((character) => (
                <tr key={character.id}>
                  <td>{character.playerName}</td>
                  <td>{character.discordHandle || "Not provided"}</td>
                  <td>{character.characterName}</td>
                  <td>
                    <CharacterBuildDisplay character={character} compact />
                  </td>
                  <td>{character.games}</td>
                  <td>
                    <Link
                      className="button button-secondary button-small"
                      href={`/player/characters/${character.id}`}
                    >
                      View record
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="muted" colSpan={6}>
                  No matching players found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
