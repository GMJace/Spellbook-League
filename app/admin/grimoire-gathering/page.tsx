import Link from "next/link";

import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { AdminPageHeader } from "@/components/admin-page-header";
import { DatePickerField } from "@/components/date-picker-field";
import { LocalizedEventTime } from "@/components/localized-event-time";
import {
  createGrimoireEvent,
  deleteGrimoireCuratedGame,
  deleteGrimoireEvent,
  moderateGrimoireDmSubmission,
  updateGrimoireEvent,
} from "@/app/admin/grimoire-gathering/actions";
import { requireGrimoireAdminUser } from "@/lib/admin";
import { formatGrimoireTier } from "@/lib/grimoire";
import { prisma } from "@/lib/prisma";

const grimoireAdminTimeZone = "America/Edmonton";

function formatDateTime(date: Date | null) {
  if (!date) {
    return "Not reviewed yet";
  }

  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatDateTimeInput(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: grimoireAdminTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${getPart("year")}-${getPart("month")}-${getPart("day")}T${getPart("hour")}:${getPart("minute")}`;
}

function parseStringArray(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === "string") : [];
  } catch {
    return [];
  }
}

function formatSlotTextarea(
  slots: Array<{
    label: string;
    startAt: Date;
  }>,
) {
  return slots
    .map((slot) => `${slot.label} | ${formatDateTimeInput(slot.startAt)}`)
    .join("\n");
}

type SubmissionStatus = "PENDING" | "APPROVED" | "REJECTED";

type SubmissionRow = {
  id: string;
  name: string;
  email: string;
  discord: string | null;
  title: string;
  gameCode: string | null;
  eventId: string;
  slotStartAt: Date;
  tier: "TIER_1" | "TIER_2" | "TIER_3" | "TIER_4";
  seats: number;
  summary: string;
  notes: string | null;
  status: SubmissionStatus;
  createdAt: Date;
  reviewedAt: Date | null;
};

type EventRow = {
  id: string;
  label: string;
  subtitle: string;
  date: Date;
  displayDate: string;
  theme: string;
  themeDetails: string;
  focus: string;
  ticketLabel: string;
  ticketPrice: string;
  ticketPriceUsd: number;
  finale: boolean;
  slots: Array<{
    id: string;
    label: string;
    startAt: Date;
  }>;
  _count: {
    curatedGames: number;
    submissions: number;
  };
};

type CuratedGameRow = {
  id: string;
  eventId: string;
  slug: string;
  title: string;
  summary: string;
  details: string;
  adventureImagePath: string | null;
  startAt: Date;
  dm: string;
  tier: "TIER_1" | "TIER_2" | "TIER_3" | "TIER_4";
  ticketPrice: string;
  ticketPriceUsd: number;
  seatCapacity: number;
  gameCode: string | null;
};

function ModerationActionButton({
  decision,
  submissionId,
}: {
  decision: Exclude<SubmissionStatus, "PENDING">;
  submissionId: string;
}) {
  const isApprove = decision === "APPROVED";

  return (
    <form action={moderateGrimoireDmSubmission}>
      <input name="submissionId" type="hidden" value={submissionId} />
      <input name="decision" type="hidden" value={decision} />
      <button
        className={isApprove ? "button-secondary button-small" : "button-danger button-small"}
        type="submit"
      >
        {isApprove ? "Approve" : "Reject"}
      </button>
    </form>
  );
}

function SubmissionTable({
  emptyMessage,
  eventMap,
  submissions,
  title,
}: {
  emptyMessage: string;
  eventMap: Map<string, EventRow>;
  submissions: SubmissionRow[];
  title: string;
}) {
  return (
    <section className="list-card stack">
      <img
        alt="Grimoire divider"
        className="ggcon-table-divider"
        src="/divider4.png"
      />
      <div className="section-heading">
        <div>
          <h2 style={{ margin: 0 }}>{title}</h2>
          <p className="muted" style={{ margin: "0.35rem 0 0" }}>
            {submissions.length} submission{submissions.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <div className="table-wrap">
        <table className="ledger-table">
          <thead>
            <tr>
              <th>Game</th>
              <th>DM</th>
              <th>Event</th>
              <th>Slot</th>
              <th>Tier</th>
              <th>Seats</th>
              <th>Summary</th>
              <th>Staff Notes</th>
              <th>Submitted</th>
              <th>Reviewed</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {submissions.length ? (
              submissions.map((submission) => {
                const event = eventMap.get(submission.eventId);
                const dmDetails = [submission.name, submission.discord, submission.email]
                  .filter(Boolean)
                  .join(" | ");

                return (
                  <tr key={submission.id}>
                    <td style={{ minWidth: "14rem" }}>
                      <div className="stack" style={{ gap: "0.25rem" }}>
                        <strong>{submission.title}</strong>
                        {submission.gameCode ? (
                          <span className="muted ggcon-meta-note">{submission.gameCode}</span>
                        ) : null}
                        {submission.status === "APPROVED" ? (
                          <Link
                            className="button secondary ggcon-table-button"
                            href={`/grimoire-gathering/games/submission-${submission.id}`}
                          >
                            View public page
                          </Link>
                        ) : null}
                      </div>
                    </td>
                    <td style={{ minWidth: "14rem" }}>{dmDetails}</td>
                    <td>{event?.subtitle ?? submission.eventId}</td>
                    <td style={{ minWidth: "12rem" }}>
                      <LocalizedEventTime isoString={submission.slotStartAt.toISOString()} />
                    </td>
                    <td>{formatGrimoireTier(submission.tier)}</td>
                    <td>{submission.seats}</td>
                    <td style={{ minWidth: "16rem", whiteSpace: "pre-wrap" }}>
                      {submission.summary}
                    </td>
                    <td style={{ minWidth: "16rem", whiteSpace: "pre-wrap" }}>
                      {submission.notes || "No staff notes provided"}
                    </td>
                    <td>{formatDateTime(submission.createdAt)}</td>
                    <td>{formatDateTime(submission.reviewedAt)}</td>
                    <td>
                      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                        {submission.status !== "APPROVED" ? (
                          <ModerationActionButton
                            decision="APPROVED"
                            submissionId={submission.id}
                          />
                        ) : (
                          <span className="muted">Public</span>
                        )}
                        {submission.status !== "REJECTED" ? (
                          <ModerationActionButton
                            decision="REJECTED"
                            submissionId={submission.id}
                          />
                        ) : (
                          <span className="muted">Hidden</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td className="muted" colSpan={11}>
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default async function AdminGrimoireGatheringPage({
  searchParams,
}: {
  searchParams: Promise<{
    event?: string;
    eventDetails?: string;
    game?: string;
    gameDetails?: string;
    review?: string;
    editEvent?: string;
    editGame?: string;
  }>;
}) {
  const currentUser = await requireGrimoireAdminUser();

  const params = await searchParams;
  const [events, games, submissions] = await Promise.all([
    prisma.grimoireEvent.findMany({
      include: {
        slots: {
          orderBy: { startAt: "asc" },
        },
        _count: {
          select: {
            curatedGames: true,
            submissions: true,
          },
        },
      },
      orderBy: { date: "asc" },
    }),
    prisma.$queryRaw<CuratedGameRow[]>`
      SELECT
        id,
        eventId,
        slug,
        title,
        summary,
        details,
        adventureImagePath,
        startAt,
        dm,
        tier,
        ticketPrice,
        ticketPriceUsd,
        seatCapacity,
        gameCode
      FROM GrimoireCuratedGame
      ORDER BY startAt ASC, createdAt ASC
    `,
    prisma.grimoireDmSubmission.findMany({
      orderBy: [{ status: "asc" }, { slotStartAt: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  const eventRows = events as EventRow[];
  const curatedGameRows = games as CuratedGameRow[];
  const submissionRows = submissions as SubmissionRow[];
  const eventMap = new Map(eventRows.map((event) => [event.id, event]));
  const selectedEvent = params.editEvent
    ? eventRows.find((event) => event.id === params.editEvent) ?? null
    : null;
  const visibleCuratedGameRows = selectedEvent
    ? curatedGameRows.filter((game) => game.eventId === selectedEvent.id)
    : curatedGameRows;
  const selectedGame = params.editGame
    ? visibleCuratedGameRows.find((game) => game.id === params.editGame)
      ?? curatedGameRows.find((game) => game.id === params.editGame)
      ?? null
    : null;
  const isStandaloneCuratedGameEdit = Boolean(selectedGame && !selectedEvent);
  const selectedEventThemeDetails = selectedEvent
    ? parseStringArray(selectedEvent.themeDetails).join("\n")
    : "";
  const selectedEventSlots = selectedEvent
    ? formatSlotTextarea(selectedEvent.slots)
    : "";

  const pendingSubmissions = submissionRows.filter(
    (submission) => submission.status === "PENDING",
  );
  const approvedSubmissions = submissionRows.filter(
    (submission) => submission.status === "APPROVED",
  );
  const rejectedSubmissions = submissionRows.filter(
    (submission) => submission.status === "REJECTED",
  );

  const eventMessageMap: Record<string, string> = {
    created: "Grimoire event created.",
    updated: "Grimoire event updated.",
    deleted: "Grimoire event deleted.",
    invalid: "The requested Grimoire event change could not be completed.",
    "duplicate-id":
      "That event title is already in use. Choose a different event title before creating the event.",
    "duplicate-slots":
      "Two event slots use the same date and time. Give each slot a unique `YYYY-MM-DDTHH:MM` value.",
    "invalid-fields":
      "The event could not be saved because one or more fields are invalid. Shorten the text or check the required fields and try again.",
    "invalid-slots":
      "The event could not be saved because one or more slot lines are invalid. Use `Label | YYYY-MM-DDTHH:MM` for each slot.",
    "invalid-slot-count":
      "This event already has submissions, so you need to keep the same number of slot lines when editing it.",
    "invalid-save":
      "The requested Grimoire event change could not be completed because the event could not be saved.",
  };
  const gameMessageMap: Record<string, string> = {
    created: "Grimoire game created.",
    updated: "Grimoire game updated.",
    deleted: "Grimoire game deleted.",
    invalid: "The requested Grimoire game change could not be completed.",
  };
  const reviewMessageMap: Record<string, string> = {
    approved: "Submission approved and published to the public event board.",
    rejected: "Submission rejected and removed from public Grimoire listings.",
    invalid: "The requested moderation action could not be completed.",
  };

  const eventMessage = params.event ? eventMessageMap[params.event] : "";
  const eventDetails = params.eventDetails ?? "";
  const gameMessage = params.game ? gameMessageMap[params.game] : "";
  const gameDetails = params.gameDetails ?? "";
  const reviewMessage = params.review ? reviewMessageMap[params.review] : "";

  return (
    <main className="page-shell">
      <section className="stack">
        {!isStandaloneCuratedGameEdit && eventMessage ? (
          <div className="stack" style={{ gap: "0.35rem" }}>
            <p style={{ color: "#ffffff", margin: 0 }}>{eventMessage}</p>
            {eventDetails ? (
              <p style={{ color: "#d7d7d7", margin: 0 }}>{eventDetails}</p>
            ) : null}
          </div>
        ) : null}
        {!isStandaloneCuratedGameEdit && gameMessage ? (
          <div className="stack" style={{ gap: "0.35rem" }}>
            <p style={{ color: "#ffffff", margin: 0 }}>{gameMessage}</p>
            {gameDetails ? (
              <p style={{ color: "#d7d7d7", margin: 0 }}>{gameDetails}</p>
            ) : null}
          </div>
        ) : null}
        {!isStandaloneCuratedGameEdit && reviewMessage ? (
          <p style={{ color: "#ffffff", margin: 0 }}>{reviewMessage}</p>
        ) : null}

        {!isStandaloneCuratedGameEdit ? (
          <>
            <AdminPageHeader
              description="Create and delete season events, manage curated event games, and moderate public DM submissions from one place."
              extraActions={
                <>
                  <Link className="button secondary" href="/grimoire-gathering">
                    Public Grimoire page
                  </Link>
                  <Link className="button secondary" href="/grimoire-gathering/dm">
                    Public DM page
                  </Link>
                </>
              }
              navigationRole={
                currentUser.roles.includes("EVENT_ADMIN") && currentUser.roles.length === 1
                  ? "EVENT_ADMIN"
                  : "ADMIN"
              }
              title="Grimoire management"
            />

            <div className="list-card stack">
            <div className="ggcon-summary-metrics">
              <div className="list-card stack" style={{ gap: "0.35rem" }}>
                <span className="muted">Events</span>
                <strong>{eventRows.length}</strong>
              </div>
              <div className="list-card stack" style={{ gap: "0.35rem" }}>
                <span className="muted">Curated games</span>
                <strong>{visibleCuratedGameRows.length}</strong>
              </div>
              <div className="list-card stack" style={{ gap: "0.35rem" }}>
                <span className="muted">Pending submissions</span>
                <strong>{pendingSubmissions.length}</strong>
              </div>
            </div>
            </div>
          </>
        ) : null}

        {!selectedEvent && !isStandaloneCuratedGameEdit ? (
          <div className="stack">
            <section className="list-card stack">
              <img
                alt="Grimoire divider"
                className="ggcon-table-divider"
                src="/divider4.png"
              />
              <div>
                <h2 style={{ margin: 0 }}>Create event</h2>
                <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                  Add a new season schedule event, including its public card details
                  and DM submission slots.
                </p>
              </div>

              <form action={createGrimoireEvent} className="form-stack">
                <div className="form-grid">
                  <label>
                    Month label
                    <input name="label" placeholder="June" required type="text" />
                  </label>
                </div>

                <label>
                  Event title
                  <input name="subtitle" placeholder="Summer of Secrets" required type="text" />
                </label>

                <div className="form-grid">
                  <DatePickerField
                    label="Event date/time"
                    name="date"
                    required
                    type="datetime-local"
                  />
                  <label>
                    Display date
                    <input
                      name="displayDate"
                      placeholder="June 12-14, 2027"
                      required
                      type="text"
                    />
                  </label>
                </div>

                <label>
                  Theme
                  <input name="theme" placeholder="Summer of Secrets" required type="text" />
                </label>

                <label>
                  Theme details
                  <textarea
                    name="themeDetails"
                    placeholder="One public bullet per line."
                    required
                  />
                </label>

                <label>
                  Focus copy
                  <textarea
                    name="focus"
                    placeholder="Short public summary for the event."
                    required
                  />
                </label>

                <div className="form-grid">
                  <label>
                    Ticket label
                    <input name="ticketLabel" placeholder="Weekend Pass" required type="text" />
                  </label>
                  <label>
                    Ticket display price
                    <input name="ticketPrice" placeholder="$20 USD" required type="text" />
                  </label>
                  <label>
                    Ticket price USD
                    <input min="0" name="ticketPriceUsd" required step="0.01" type="number" />
                  </label>
                </div>

                <label>
                  Event slots
                  <textarea
                    name="slots"
                    placeholder={"Friday Evening | 2027-06-12T19:00\nSaturday Morning | 2027-06-13T10:00"}
                    required
                  />
                </label>
                <p className="muted" style={{ margin: 0 }}>
                  Enter one slot per line using `Label | YYYY-MM-DDTHH:MM`.
                </p>

                <button className="button-secondary" type="submit">
                  Create event
                </button>
              </form>
            </section>

            <img
              alt="Grimoire divider"
              className="ggcon-table-divider"
              src="/divider4.png"
            />

            <section className="list-card stack" id="create-curated-game">
              <div>
                <h2 style={{ margin: 0 }}>Create curated game</h2>
                <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                  Add a ticketed game directly to one of the current Grimoire events.
                </p>
              </div>

              {gameMessage ? (
                <div className="stack" style={{ gap: "0.35rem" }}>
                  <p style={{ color: "#ffffff", margin: 0 }}>{gameMessage}</p>
                  {gameDetails ? (
                    <p style={{ color: "#d7d7d7", margin: 0 }}>{gameDetails}</p>
                  ) : null}
                </div>
              ) : null}

              <form
                action="/admin/grimoire-gathering/curated-games/create"
                className="form-stack"
                encType="multipart/form-data"
                method="post"
              >
                <div className="form-grid">
                  <label>
                    Event
                    <select defaultValue={eventRows[0]?.id ?? ""} name="eventId" required>
                      {eventRows.map((event) => (
                        <option key={event.id} value={event.id}>
                          {event.label} - {event.subtitle}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label>
                  Adventure cover
                  <input accept="image/*" name="adventureImage" type="file" />
                </label>
                <p className="muted" style={{ margin: 0 }}>
                  Optional. Upload a portrait-style cover image up to 5 MB.
                </p>

                <label>
                  Game title
                  <input name="title" required type="text" />
                </label>

                <label>
                  Summary
                  <textarea name="summary" required />
                </label>

                <label>
                  Game details (Each line is a bullet point)
                  <textarea
                    name="details"
                    placeholder="One player-facing bullet per line."
                    required
                  />
                </label>

                <div className="form-grid">
                  <DatePickerField
                    label="Start time"
                    name="startAt"
                    required
                    type="datetime-local"
                  />
                  <label>
                    Dungeon Master
                    <input name="dm" required type="text" />
                  </label>
                  <label>
                    Tier
                    <select defaultValue="TIER_1" name="tier">
                      <option value="TIER_1">Tier 1</option>
                      <option value="TIER_2">Tier 2</option>
                      <option value="TIER_3">Tier 3</option>
                      <option value="TIER_4">Tier 4</option>
                    </select>
                  </label>
                  <label>
                    Seats
                    <input defaultValue="6" max="12" min="1" name="seatCapacity" type="number" />
                  </label>
                </div>

                <div className="form-grid">
                  <label>
                    Ticket display price
                    <input name="ticketPrice" placeholder="$10 USD" required type="text" />
                  </label>
                  <label>
                    Ticket price USD
                    <input min="0" name="ticketPriceUsd" required step="0.01" type="number" />
                  </label>
                  <label>
                    Game code
                    <input name="gameCode" type="text" />
                  </label>
                </div>

                {!eventRows.length ? (
                  <p className="muted" style={{ margin: 0 }}>
                    Create an event first to unlock curated game creation.
                  </p>
                ) : null}

                <button className="button-secondary" disabled={!eventRows.length} type="submit">
                  Create game
                </button>
              </form>
            </section>
          </div>
        ) : null}

        {selectedEvent ? (
          <section className="list-card stack">
            <div className="section-heading">
              <div>
                <h2 style={{ margin: 0 }}>Edit event</h2>
                <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                  Update season schedule details for <strong>{selectedEvent.subtitle}</strong>.
                </p>
              </div>
            </div>

            <form action={updateGrimoireEvent} className="form-stack">
              <input name="eventId" type="hidden" value={selectedEvent.id} />

              <label>
                Month label
                <input defaultValue={selectedEvent.label} name="label" required type="text" />
              </label>

              <label>
                Event title
                <input
                  defaultValue={selectedEvent.subtitle}
                  name="subtitle"
                  required
                  type="text"
                />
              </label>

              <div className="form-grid">
                <DatePickerField
                  defaultValue={formatDateTimeInput(selectedEvent.date)}
                  label="Event date/time"
                  name="date"
                  required
                  type="datetime-local"
                />
                <label>
                  Display date
                  <input
                    defaultValue={selectedEvent.displayDate}
                    name="displayDate"
                    required
                    type="text"
                  />
                </label>
              </div>

              <label>
                Theme
                <input defaultValue={selectedEvent.theme} name="theme" required type="text" />
              </label>

              <label>
                Theme details
                <textarea
                  defaultValue={selectedEventThemeDetails}
                  name="themeDetails"
                  required
                />
              </label>

              <label>
                Focus copy
                <textarea defaultValue={selectedEvent.focus} name="focus" required />
              </label>

              <div className="form-grid">
                <label>
                  Ticket label
                  <input
                    defaultValue={selectedEvent.ticketLabel}
                    name="ticketLabel"
                    required
                    type="text"
                  />
                </label>
                <label>
                  Ticket display price
                  <input
                    defaultValue={selectedEvent.ticketPrice}
                    name="ticketPrice"
                    required
                    type="text"
                  />
                </label>
                <label>
                  Ticket price USD
                  <input
                    defaultValue={selectedEvent.ticketPriceUsd}
                    min="0"
                    name="ticketPriceUsd"
                    required
                    step="0.01"
                    type="number"
                  />
                </label>
              </div>

              <label>
                Event slots
                <textarea
                  defaultValue={selectedEventSlots}
                  name="slots"
                  required
                />
              </label>
              <p className="muted" style={{ margin: 0 }}>
                Enter one slot per line using `Label | YYYY-MM-DDTHH:MM`.
              </p>
              {selectedEvent._count.submissions ? (
                <p className="muted" style={{ margin: 0 }}>
                  This event already has submissions. Keep the slot lines in the same order if
                  you need to adjust slot times so existing tables stay paired with the right slot.
                </p>
              ) : null}

              <div className="inline-actions" style={{ flexWrap: "wrap" }}>
                <button className="button-secondary" type="submit">
                  Save event changes
                </button>
              </div>
            </form>

            <form action={deleteGrimoireEvent}>
              <input name="eventId" type="hidden" value={selectedEvent.id} />
              <ConfirmSubmitButton
                className="button-danger"
                message={`Delete ${selectedEvent.subtitle}? This cannot be undone.`}
              >
                Delete event
              </ConfirmSubmitButton>
            </form>
          </section>
        ) : null}

        {selectedGame ? (
          <section className="list-card stack" id="edit-curated-game">
            <div className="section-heading">
              <div>
                <h2 style={{ margin: 0 }}>Edit curated game</h2>
                <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                  Update listing details for <strong>{selectedGame.title}</strong>.
                </p>
              </div>
            </div>

            {gameMessage ? (
              <div className="stack" style={{ gap: "0.35rem" }}>
                <p style={{ color: "#ffffff", margin: 0 }}>{gameMessage}</p>
                {gameDetails ? (
                  <p style={{ color: "#d7d7d7", margin: 0 }}>{gameDetails}</p>
                ) : null}
              </div>
            ) : null}

            <form
              action="/admin/grimoire-gathering/curated-games/update"
              className="form-stack"
              encType="multipart/form-data"
              method="post"
            >
              <input name="gameId" type="hidden" value={selectedGame.id} />

              <div className="form-grid">
                <label>
                  Event
                  <select defaultValue={selectedGame.eventId} name="eventId" required>
                    {eventRows.map((event) => (
                      <option key={event.id} value={event.id}>
                        {event.label} - {event.subtitle}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label>
                Game title
                <input defaultValue={selectedGame.title} name="title" required type="text" />
              </label>

              <label>
                Game code
                <input defaultValue={selectedGame.gameCode ?? ""} name="gameCode" type="text" />
              </label>

              <label>
                Adventure cover
                <input accept="image/*" name="adventureImage" type="file" />
              </label>
              {selectedGame.adventureImagePath ? (
                <div className="list-card stack" style={{ gap: "0.6rem" }}>
                  <span className="muted">Current adventure cover</span>
                  <img
                    alt={`${selectedGame.title} adventure cover`}
                    className="ggcon-game-cover-image ggcon-admin-cover-image"
                    src={selectedGame.adventureImagePath}
                  />
                  <span className="muted">
                    Upload a new image above only if you want to replace the current cover.
                  </span>
                </div>
              ) : (
                <p className="muted" style={{ margin: 0 }}>
                  Optional. Upload a portrait-style cover image up to 5 MB.
                </p>
              )}

              <label>
                Summary
                <textarea defaultValue={selectedGame.summary} name="summary" required />
              </label>

              <label>
                Game details (Each line is a bullet point)
                <textarea
                  defaultValue={parseStringArray(selectedGame.details).join("\n")}
                  name="details"
                  required
                />
              </label>

              <div className="form-grid">
                <DatePickerField
                  defaultValue={formatDateTimeInput(selectedGame.startAt)}
                  label="Start time"
                  name="startAt"
                  required
                  type="datetime-local"
                />
                <label>
                  Dungeon Master
                  <input defaultValue={selectedGame.dm} name="dm" required type="text" />
                </label>
                <label>
                  Tier
                  <select defaultValue={selectedGame.tier} name="tier">
                    <option value="TIER_1">Tier 1</option>
                    <option value="TIER_2">Tier 2</option>
                    <option value="TIER_3">Tier 3</option>
                    <option value="TIER_4">Tier 4</option>
                  </select>
                </label>
                <label>
                  Seats
                  <input
                    defaultValue={selectedGame.seatCapacity}
                    max="12"
                    min="1"
                    name="seatCapacity"
                    type="number"
                  />
                </label>
              </div>

              <div className="form-grid">
                <label>
                  Ticket display price
                  <input
                    defaultValue={selectedGame.ticketPrice}
                    name="ticketPrice"
                    required
                    type="text"
                  />
                </label>
                <label>
                  Ticket price USD
                  <input
                    defaultValue={selectedGame.ticketPriceUsd}
                    min="0"
                    name="ticketPriceUsd"
                    required
                    step="0.01"
                    type="number"
                  />
                </label>
              </div>

              <button className="button-secondary" type="submit">
                Save game changes
              </button>
            </form>
          </section>
        ) : null}

        {!selectedEvent && !isStandaloneCuratedGameEdit ? (
          <section className="list-card stack">
            <img
              alt="Grimoire divider"
              className="ggcon-table-divider"
              src="/divider4.png"
            />
            <div className="section-heading">
              <div>
                <h2 style={{ margin: 0 }}>Season events</h2>
                <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                  Existing Grimoire events, their submission slots, and delete controls.
                </p>
              </div>
            </div>

            <div className="table-wrap">
              <table className="ledger-table">
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>Display date</th>
                    <th>Theme</th>
                    <th>Ticket</th>
                    <th>Counts</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {eventRows.length ? (
                    eventRows.map((event) => (
                      <tr key={event.id}>
                        <td style={{ minWidth: "16rem" }}>
                          <div className="stack" style={{ gap: "0.25rem" }}>
                            <strong>{event.subtitle}</strong>
                          </div>
                        </td>
                        <td>{event.displayDate}</td>
                        <td style={{ minWidth: "16rem" }}>
                          <div className="stack" style={{ gap: "0.35rem" }}>
                            <strong>{event.theme}</strong>
                            <span className="muted">{event.focus}</span>
                          </div>
                        </td>
                        <td>
                          <div className="stack" style={{ gap: "0.25rem" }}>
                            <strong>{event.ticketPrice}</strong>
                            <span className="muted">{event.ticketLabel}</span>
                          </div>
                        </td>
                        <td>
                          <div className="stack" style={{ gap: "0.25rem" }}>
                            <span>{event._count.curatedGames} curated games</span>
                            <span>{event._count.submissions} submissions</span>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                            <Link
                              className="button secondary ggcon-table-button"
                              href={`/admin/grimoire-gathering?editEvent=${event.id}`}
                            >
                              Edit
                            </Link>
                            <Link
                              className="button secondary ggcon-table-button"
                              href={`/grimoire-gathering/events/${event.id}`}
                            >
                              View public page
                            </Link>
                            <form action={deleteGrimoireEvent}>
                              <input name="eventId" type="hidden" value={event.id} />
                              <ConfirmSubmitButton
                                className="button-danger button-small"
                                message={`Delete ${event.subtitle}? This cannot be undone.`}
                              >
                                Delete
                              </ConfirmSubmitButton>
                            </form>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="muted" colSpan={6}>
                        No Grimoire events exist yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {!isStandaloneCuratedGameEdit ? (
          <>
            <section className="list-card stack">
              <img
                alt="Grimoire divider"
                className="ggcon-table-divider"
                src="/divider4.png"
              />
              <div className="section-heading">
                <div>
                  <h2 style={{ margin: 0 }}>Curated games</h2>
                  <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                    {selectedEvent
                      ? `Ticketed games curated for ${selectedEvent.subtitle}.`
                      : "Ticketed games that appear on public Grimoire event pages."}
                  </p>
                </div>
              </div>

              <div className="table-wrap">
                <table className="ledger-table">
                  <thead>
                    <tr>
                      <th>Game</th>
                      <th>Event</th>
                      <th>Start</th>
                      <th>DM</th>
                      <th>Tier</th>
                      <th>Ticket</th>
                      <th>Seats</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleCuratedGameRows.length ? (
                      visibleCuratedGameRows.map((game) => (
                        <tr key={game.id}>
                          <td style={{ minWidth: "16rem" }}>
                            <div className="stack" style={{ gap: "0.25rem" }}>
                              <strong>{game.title}</strong>
                              {game.gameCode ? (
                                <span className="muted ggcon-meta-note">{game.gameCode}</span>
                              ) : null}
                            </div>
                          </td>
                          <td>{eventMap.get(game.eventId)?.subtitle ?? game.eventId}</td>
                          <td style={{ minWidth: "12rem" }}>
                            <LocalizedEventTime isoString={game.startAt.toISOString()} />
                          </td>
                          <td>{game.dm}</td>
                          <td>{formatGrimoireTier(game.tier)}</td>
                          <td>
                            <div className="stack" style={{ gap: "0.25rem" }}>
                              <strong>{game.ticketPrice}</strong>
                              <span className="muted">${game.ticketPriceUsd.toFixed(2)} USD</span>
                            </div>
                          </td>
                          <td>{game.seatCapacity}</td>
                          <td>
                            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                              <Link
                                className="button secondary ggcon-table-button"
                                href={
                                  selectedEvent
                                    ? `/admin/grimoire-gathering?editEvent=${selectedEvent.id}&editGame=${game.id}`
                                    : `/admin/grimoire-gathering?editGame=${game.id}`
                                }
                              >
                                Edit
                              </Link>
                              <Link
                                className="button secondary ggcon-table-button"
                                href={`/grimoire-gathering/games/${game.slug}`}
                              >
                                View public page
                              </Link>
                              <form action={deleteGrimoireCuratedGame}>
                                <input name="gameId" type="hidden" value={game.id} />
                                <ConfirmSubmitButton
                                  className="button-danger button-small"
                                  message={`Delete ${game.title}? This cannot be undone.`}
                                >
                                  Delete
                                </ConfirmSubmitButton>
                              </form>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="muted" colSpan={8}>
                          {selectedEvent
                            ? `No curated Grimoire games exist yet for ${selectedEvent.subtitle}.`
                            : "No curated Grimoire games exist yet."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="list-card stack">
              <img
                alt="Grimoire divider"
                className="ggcon-table-divider"
                src="/divider4.png"
              />
              <div className="section-heading">
                <div>
                  <h2 style={{ margin: 0 }}>Current event themes</h2>
                  <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                    Quick reference for the public theme details stored on each event.
                  </p>
                </div>
              </div>

              <div className="grid two">
                {eventRows.length ? (
                  eventRows.map((event) => (
                    <article className="admin-removal-summary stack" key={event.id}>
                      <strong>{event.subtitle}</strong>
                      <span className="muted">{event.displayDate}</span>
                      <ul className="contact-list ggcon-feature-list">
                        {parseStringArray(event.themeDetails).map((detail) => (
                          <li key={detail}>{detail}</li>
                        ))}
                      </ul>
                    </article>
                  ))
                ) : (
                  <p className="muted" style={{ margin: 0 }}>
                    No event themes are available yet.
                  </p>
                )}
              </div>
            </section>

            <SubmissionTable
              emptyMessage="No Grimoire DM submissions are waiting for review."
              eventMap={eventMap}
              submissions={pendingSubmissions}
              title="Pending review"
            />

            <SubmissionTable
              emptyMessage="No Grimoire DM submissions have been approved yet."
              eventMap={eventMap}
              submissions={approvedSubmissions}
              title="Approved submissions"
            />

            <SubmissionTable
              emptyMessage="No Grimoire DM submissions have been rejected."
              eventMap={eventMap}
              submissions={rejectedSubmissions}
              title="Rejected submissions"
            />
          </>
        ) : null}
      </section>
    </main>
  );
}
