"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { SearchIcon } from "@/components/search-icon";
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
// Keep this breakpoint in sync with the single-column DM grid in globals.css.
const dmRosterMobileQuery = "(max-width: 860px)";

function subscribeToDmRosterWidth(onChange: () => void) {
  const media = window.matchMedia(dmRosterMobileQuery);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function RosterPagination({
  label,
  page,
  totalPages,
  onPageChange,
}: {
  label: string;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <nav className="inline-actions" aria-label={label}>
      <button
        className="button button-secondary button-small"
        type="button"
        disabled={page === 1}
        onClick={() => onPageChange(page - 1)}
      >
        Previous
      </button>
      <span aria-live="polite">Page {page} of {totalPages}</span>
      <button
        className="button button-secondary button-small"
        type="button"
        disabled={page === totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Next
      </button>
    </nav>
  );
}

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
        <h2 style={{ margin: 0 }}>Agent roster</h2>
      </div>

      <CharacterRosterGrid playerRoster={playerRoster} pageSize={12} />
    </section>
  );
}

export function CharacterRosterGrid({
  emptyMessage = "No character activity matches your search.",
  pageSize,
  playerRoster,
  scrollable = false,
  showDivider = true,
  visibleRows = 2,
}: {
  emptyMessage?: string;
  pageSize?: number;
  playerRoster: PlayerRow[];
  scrollable?: boolean;
  showDivider?: boolean;
  visibleRows?: number;
}) {
  const [playerSearch, setPlayerSearch] = useState("");
  const [playerSearchDraft, setPlayerSearchDraft] = useState("");
  const [page, setPage] = useState(1);

  const filteredPlayers = useMemo(
    () => filterPlayerRows(playerRoster, playerSearch),
    [playerRoster, playerSearch]
  );
  const totalPages = pageSize ? Math.max(1, Math.ceil(filteredPlayers.length / pageSize)) : 1;
  const currentPage = Math.min(page, totalPages);
  const visiblePlayers = pageSize
    ? filteredPlayers.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : filteredPlayers;

  return (
    <div className="list-card stack">
      <form
        className="search-row"
        onSubmit={(event) => {
          event.preventDefault();
          setPlayerSearch(playerSearchDraft);
          setPage(1);
        }}
      >
        <input
          aria-label="Search character roster"
          className="input"
          onChange={(event) => setPlayerSearchDraft(event.target.value)}
          placeholder="Search players, characters, or builds"
          type="search"
          value={playerSearchDraft}
        />
        <button className="button secondary search-icon-button" type="submit" aria-label="Search character roster">
          <SearchIcon />
        </button>
      </form>

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
          {visiblePlayers.length ? (
          visiblePlayers.map((row) => {
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

      <RosterPagination
        label="Agent roster pagination"
        page={currentPage}
        totalPages={totalPages}
        onPageChange={setPage}
      />

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
  const [dmSearchDraft, setDmSearchDraft] = useState("");
  const [page, setPage] = useState(1);
  const singleColumn = useSyncExternalStore(
    subscribeToDmRosterWidth,
    () => window.matchMedia(dmRosterMobileQuery).matches,
    () => true,
  );

  const filteredDms = useMemo(
    () => filterDmRows(dmRoster, dmSearch),
    [dmRoster, dmSearch]
  );
  const pageSize = singleColumn ? 2 : 6;
  const totalPages = Math.max(1, Math.ceil(filteredDms.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleDms = filteredDms.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <section className="card ledger-panel stack homepage-dm-activity-card">
      <div className="inline-actions" style={{ justifyContent: "space-between" }}>
        <h2 style={{ margin: 0 }}>SPELLBOOK DM Roster</h2>
      </div>

      <div className="list-card stack">
        <form
          className="search-row"
          onSubmit={(event) => {
            event.preventDefault();
            setDmSearch(dmSearchDraft);
            setPage(1);
          }}
        >
          <input
            aria-label="Search DM roster"
            className="input"
            onChange={(event) => setDmSearchDraft(event.target.value)}
            placeholder="Search dungeon masters"
            type="search"
            value={dmSearchDraft}
          />
          <button className="button secondary search-icon-button" type="submit" aria-label="Search DM roster">
            <SearchIcon />
          </button>
        </form>

        <div className="homepage-dm-roster-grid">
          {visibleDms.length ? (
            visibleDms.map((row) => (
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
        <RosterPagination
          label="DM roster pagination"
          page={currentPage}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </div>
    </section>
  );
}
