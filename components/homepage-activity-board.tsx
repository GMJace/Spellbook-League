"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { CharacterBuildDisplay } from "@/components/character-build-display";
import {
  formatClassSummary,
  getCharacterTier,
  getCharacterTotalLevel,
} from "@/lib/character";

type PlayerRow = {
  id: string;
  playerName: string;
  characterName: string;
  class1Name: string;
  class1Subclass?: string | null;
  class1Level: number;
  class2Name: string | null;
  class2Subclass?: string | null;
  class2Level: number | null;
  class3Name: string | null;
  class3Subclass?: string | null;
  class3Level: number | null;
  totalGold: number;
  gamesPlayed: number;
};

type PlayerColumnFilters = {
  player: string;
  character: string;
  build: string;
  tier: string;
};

type DmRow = {
  id: string;
  name: string;
  gamesLogged: number;
};

const MIN_VISIBLE_ACTIVITY_ROWS = 10;

function matchesFilter(value: string, query: string) {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return true;
  }

  return value.toLowerCase().includes(normalized);
}

function filterPlayerRows(rows: PlayerRow[], query: string, filters: PlayerColumnFilters) {
  const normalized = query.trim().toLowerCase();

  return rows.filter((row) => {
    const build = formatClassSummary(row);
    const totalLevel = getCharacterTotalLevel(row);
    const tierLabel = `Tier ${getCharacterTier(totalLevel)}`;
    const globalMatch =
      !normalized ||
      row.playerName.toLowerCase().includes(normalized) ||
      row.characterName.toLowerCase().includes(normalized) ||
      build.toLowerCase().includes(normalized) ||
      tierLabel.toLowerCase().includes(normalized) ||
      String(row.gamesPlayed).includes(normalized);

    return (
      globalMatch &&
      matchesFilter(row.playerName, filters.player) &&
      matchesFilter(row.characterName, filters.character) &&
      matchesFilter(build, filters.build) &&
      matchesFilter(tierLabel, filters.tier)
    );
  });
}

function filterDmRows(rows: DmRow[], query: string) {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return rows;
  }

  return rows.filter((row) => row.name.toLowerCase().includes(normalized));
}

export function HomepagePlayerActivityCard({
  playerRoster,
}: {
  playerRoster: PlayerRow[];
}) {
  const [playerSearch, setPlayerSearch] = useState("");
  const [playerFilters, setPlayerFilters] = useState<PlayerColumnFilters>({
    player: "",
    character: "",
    build: "",
    tier: "",
  });

  const filteredPlayers = useMemo(
    () => filterPlayerRows(playerRoster, playerSearch, playerFilters),
    [playerFilters, playerRoster, playerSearch]
  );
  const playerPlaceholderCount = Math.max(
    0,
    MIN_VISIBLE_ACTIVITY_ROWS - filteredPlayers.length
  );

  function updatePlayerFilter(key: keyof PlayerColumnFilters, value: string) {
    setPlayerFilters((current) => ({
      ...current,
      [key]: value,
    }));
  }

  return (
    <section className="card ledger-panel stack homepage-player-activity-card">
      <div className="inline-actions" style={{ justifyContent: "space-between" }}>
        <h2 style={{ margin: 0 }}>Player roster</h2>
      </div>

      <div className="list-card stack">
        <div className="stack" style={{ gap: "0.55rem" }}>
          <input
            aria-label="Search player roster"
            className="input"
            onChange={(event) => setPlayerSearch(event.target.value)}
            placeholder="Search players, characters, or builds"
            type="search"
            value={playerSearch}
          />
        </div>

        <div className="table-wrap ledger-table activity-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Player</th>
                <th>Character</th>
                <th>Build</th>
                <th>Tier</th>
                <th>Games</th>
                <th>Record</th>
              </tr>
              <tr className="table-filter-row">
                <th>
                  <input
                    aria-label="Filter player roster by player"
                    className="input table-filter-input"
                    onChange={(event) => updatePlayerFilter("player", event.target.value)}
                    placeholder="Filter player"
                    type="search"
                    value={playerFilters.player}
                  />
                </th>
                <th>
                  <input
                    aria-label="Filter player roster by character"
                    className="input table-filter-input"
                    onChange={(event) => updatePlayerFilter("character", event.target.value)}
                    placeholder="Filter character"
                    type="search"
                    value={playerFilters.character}
                  />
                </th>
                <th>
                  <input
                    aria-label="Filter player roster by build"
                    className="input table-filter-input"
                    onChange={(event) => updatePlayerFilter("build", event.target.value)}
                    placeholder="Filter build"
                    type="search"
                    value={playerFilters.build}
                  />
                </th>
                <th>
                  <input
                    aria-label="Filter player roster by tier"
                    className="input table-filter-input"
                    onChange={(event) => updatePlayerFilter("tier", event.target.value)}
                    placeholder="Filter tier"
                    type="search"
                    value={playerFilters.tier}
                  />
                </th>
                <th aria-hidden="true" />
                <th />
              </tr>
            </thead>
            <tbody>
              {filteredPlayers.length ? (
                [
                  ...filteredPlayers.map((row) => {
                    const totalLevel = getCharacterTotalLevel(row);

                    return (
                      <tr key={row.id}>
                        <td>{row.playerName}</td>
                        <td>{row.characterName}</td>
                        <td>
                          <CharacterBuildDisplay character={row} compact />
                        </td>
                        <td>Tier {getCharacterTier(totalLevel)}</td>
                        <td>{row.gamesPlayed}</td>
                        <td>
                          <Link
                            className="button button-secondary button-small"
                            href={`/player/characters/${row.id}`}
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  }),
                  ...Array.from({ length: playerPlaceholderCount }, (_, index) => (
                    <tr key={`player-placeholder-${index}`}>
                      <td>-</td>
                      <td>-</td>
                      <td>-</td>
                      <td>-</td>
                      <td>-</td>
                      <td>-</td>
                    </tr>
                  )),
                ]
              ) : (
                <tr>
                  <td className="muted" colSpan={6}>
                    No player activity matches your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <img
          alt="Player roster divider"
          className="homepage-roster-divider"
          src="/divider4.png"
        />
      </div>
    </section>
  );
}

export function HomepageDmActivityCard({
  dmRoster,
}: {
  dmRoster: DmRow[];
}) {
  const [dmSearch, setDmSearch] = useState("");

  const filteredDms = useMemo(
    () => filterDmRows(dmRoster, dmSearch),
    [dmRoster, dmSearch]
  );
  const dmPlaceholderCount = Math.max(
    0,
    MIN_VISIBLE_ACTIVITY_ROWS - filteredDms.length
  );

  return (
    <section className="card ledger-panel stack homepage-dm-activity-card">
      <div className="inline-actions" style={{ justifyContent: "space-between" }}>
        <h2 style={{ margin: 0 }}>DM Roster</h2>
      </div>

      <div className="list-card stack">
        <div className="stack" style={{ gap: "0.55rem" }}>
          <input
            aria-label="Search DM roster"
            className="input"
            onChange={(event) => setDmSearch(event.target.value)}
            placeholder="Search dungeon masters"
            type="search"
            value={dmSearch}
          />
        </div>

        <div className="table-wrap ledger-table activity-table-wrap dm-activity-table-wrap">
          <table className="dm-activity-table">
            <thead>
              <tr>
                <th>Dungeon Master</th>
                <th>Games Logged</th>
                <th>Record</th>
              </tr>
            </thead>
            <tbody>
              {[
                ...filteredDms.map((row) => (
                  <tr key={row.id}>
                    <td>{row.name}</td>
                    <td>{row.gamesLogged}</td>
                    <td>
                      <Link
                        className="button button-secondary button-small"
                        href={`/dm/${row.id}`}
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                )),
                ...Array.from({ length: dmPlaceholderCount }, (_, index) => (
                  <tr key={`dm-placeholder-${index}`}>
                    <td>-</td>
                    <td>-</td>
                    <td>-</td>
                  </tr>
                )),
              ]}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
