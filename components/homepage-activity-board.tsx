"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { TwoRowScrollableGrid } from "@/components/two-row-scrollable-grid";

import {
  formatClassSummary,
  getCharacterTier,
  getCharacterTotalLevel,
} from "@/lib/character";

export type PlayerRow = {
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
  tokenImagePath: string | null;
  totalGold: number;
  gamesPlayed: number;
};

type DmRow = {
  id: string;
  name: string;
  gamesLogged: number;
  profileImagePath: string | null;
};

const MIN_VISIBLE_ACTIVITY_ROWS = 10;

function filterPlayerRows(rows: PlayerRow[], query: string) {
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

    return globalMatch;
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
  return (
    <section className="card ledger-panel stack homepage-player-activity-card">
      <div className="inline-actions" style={{ justifyContent: "space-between" }}>
        <h2 style={{ margin: 0 }}>Character roster</h2>
      </div>

      <CharacterRosterGrid playerRoster={playerRoster} scrollable visibleRows={4} />
    </section>
  );
}

export function CharacterRosterGrid({
  emptyMessage = "No character activity matches your search.",
  playerRoster,
  scrollable = false,
  showDivider = true,
  visibleRows = 2,
}: {
  emptyMessage?: string;
  playerRoster: PlayerRow[];
  scrollable?: boolean;
  showDivider?: boolean;
  visibleRows?: number;
}) {
  const [playerSearch, setPlayerSearch] = useState("");

  const filteredPlayers = useMemo(
    () => filterPlayerRows(playerRoster, playerSearch),
    [playerRoster, playerSearch]
  );

  return (
    <div className="list-card stack">
      <div className="stack" style={{ gap: "0.55rem" }}>
        <input
          aria-label="Search character roster"
          className="input"
          onChange={(event) => setPlayerSearch(event.target.value)}
          placeholder="Search players, characters, or builds"
          type="search"
          value={playerSearch}
        />
      </div>

      {scrollable ? (
        <TwoRowScrollableGrid
          className="homepage-character-roster-grid"
          visibleRows={visibleRows}
        >
          {filteredPlayers.length ? (
            filteredPlayers.map((row) => {
              return (
                <article
                  data-two-row-grid-item
                  key={row.id}
                  className="homepage-character-roster-card"
                >
                  {row.tokenImagePath ? (
                    <img
                      alt={`${row.characterName} token`}
                      className="homepage-character-roster-token"
                      src={row.tokenImagePath}
                    />
                  ) : (
                    <div className="homepage-character-roster-token homepage-character-roster-token-placeholder">
                      <span>{row.characterName.slice(0, 1).toUpperCase()}</span>
                    </div>
                  )}

                  <div className="homepage-character-roster-header">
                    <strong>{row.characterName}</strong>
                    <span className="muted homepage-character-roster-games">
                      {row.gamesPlayed} game{row.gamesPlayed === 1 ? "" : "s"}
                    </span>
                  </div>

                  <div className="stack" style={{ gap: "0.25rem" }}>
                    <span className="muted">{row.playerName}</span>
                  </div>

                  <dl className="homepage-character-roster-details">
                    <div>
                      <dt>Build</dt>
                      <dd>{formatClassSummary(row)}</dd>
                    </div>
                  </dl>

                  <div className="homepage-character-roster-actions">
                    <Link
                      className="button button-secondary button-small"
                      href={`/player/characters/${row.id}`}
                    >
                      View
                    </Link>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="empty">{emptyMessage}</div>
          )}
        </TwoRowScrollableGrid>
      ) : (
        <div className="homepage-character-roster-grid">
          {filteredPlayers.length ? (
          filteredPlayers.map((row) => {
            return (
              <article key={row.id} className="homepage-character-roster-card">
                {row.tokenImagePath ? (
                  <img
                    alt={`${row.characterName} token`}
                    className="homepage-character-roster-token"
                    src={row.tokenImagePath}
                  />
                ) : (
                  <div className="homepage-character-roster-token homepage-character-roster-token-placeholder">
                    <span>{row.characterName.slice(0, 1).toUpperCase()}</span>
                  </div>
                )}

                <div className="homepage-character-roster-header">
                  <strong>{row.characterName}</strong>
                  <span className="muted homepage-character-roster-games">
                    {row.gamesPlayed} game{row.gamesPlayed === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="stack" style={{ gap: "0.25rem" }}>
                  <span className="muted">{row.playerName}</span>
                </div>

                <dl className="homepage-character-roster-details">
                  <div>
                    <dt>Build</dt>
                    <dd>{formatClassSummary(row)}</dd>
                  </div>
                </dl>

                <div className="homepage-character-roster-actions">
                  <Link
                    className="button button-secondary button-small"
                    href={`/player/characters/${row.id}`}
                  >
                    View
                  </Link>
                </div>
              </article>
            );
          })
        ) : (
          <div className="empty">{emptyMessage}</div>
        )}
        </div>
      )}

      {showDivider ? (
        <img
          alt="Character roster divider"
          className="homepage-roster-divider"
          src="/divider4.png"
        />
      ) : null}
    </div>
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

        <div className="homepage-dm-roster-grid">
          {filteredDms.length ? (
            filteredDms.map((row) => (
              <article key={row.id} className="homepage-dm-roster-card">
                {row.profileImagePath ? (
                  <img
                    alt={`${row.name} profile`}
                    className="homepage-dm-roster-image"
                    src={row.profileImagePath}
                  />
                ) : (
                  <div className="homepage-dm-roster-image homepage-dm-roster-image-placeholder">
                    <span>{row.name.slice(0, 1).toUpperCase()}</span>
                  </div>
                )}

                <div className="stack" style={{ gap: "0.25rem" }}>
                  <strong>{row.name}</strong>
                </div>

                <dl className="homepage-dm-roster-details">
                  <div>
                    <dt>Games</dt>
                    <dd>{row.gamesLogged}</dd>
                  </div>
                </dl>

                <div className="homepage-dm-roster-actions">
                  <Link
                    className="button button-secondary button-small"
                    href={`/dm/${row.id}`}
                  >
                    View profile
                  </Link>
                </div>
              </article>
            ))
          ) : (
            <div className="empty">No dungeon masters match your search.</div>
          )}
        </div>
      </div>
    </section>
  );
}
